import {
  type AbilityDefinition,
  type ActorBlueprint,
  type CharacterDefinition,
  type ContentKey,
  type CreatureDefinition,
  characterKitBandAtLevel,
  characterSpellKeysAtLevel,
  formatSpawnSlotId,
  type GridPosition,
  type HuntDefinition,
  type HuntDiagnostic,
  huntRegionBorderCells,
  isHuntRegionBorderCell,
  type KernelScenario,
  type LootTableDefinition,
  type ScenarioConditionDefinition,
  type Seed,
  SIMULATION_SCHEMA_VERSION,
  type SimulationDiagnostic,
  type SimulationValidationResult,
  validateHuntDefinition,
  validateKernelScenario,
} from '@huntbound/contracts';
import type { ContentRegistry } from '../runtime/contentRegistry.ts';
import {
  NEXT_HUNT_BUFF_DAMAGE_DEALT_PERMILLE,
  scaleByDamageDealtPermille,
} from '../runtime/nextHuntBuff.ts';
import {
  abilityIdFromSpellKey,
  abilityShapeFromSpell,
  CANARY_VIEW_RANGE_TILES,
  CREATURE_FACTION_ID,
  combatElementFromDamageType,
  compareContentKeys,
  luaToInt32,
  MELEE_RANGE_TILES,
  PLAYER_FACTION_ID,
  playerAutoAttack,
  resolveSpellPower,
  stepCooldownTicksFromSpeed,
  ticksFromIntervalMs,
  vocationCombatNumbers,
} from './combatConversion.ts';
import type { KnightPostureDefinition } from './knightPostures.ts';

const SORCERER_VOCATION_KEY = 'vocation:tibia:sorcerer' as ContentKey;
const SORCERER_MAGIC_SHIELD_SPELL_KEY =
  'spell:tibia:magic-shield' as ContentKey;
const SORCERER_STANCE_SPELL_KEY = 'spell:tibia:arcane-stance' as ContentKey;
const SORCERER_GREAT_FIREBALL_SPELL_KEY =
  'spell:tibia:great-fireball' as ContentKey;
const SORCERER_SUDDEN_DEATH_SPELL_KEY =
  'spell:tibia:sudden-death' as ContentKey;

const CHALLENGE_SPELL_KEY = 'spell:tibia:challenge' as ContentKey;
const HASTE_SPELL_KEY = 'spell:tibia:haste' as ContentKey;
const SUPPORT_COOLDOWN_GROUP = 1;
const CHALLENGE_RESOURCE_COST = 30;
const CHALLENGE_COOLDOWN_TICKS = 40;
const CHALLENGE_RADIUS = 1;
const CHALLENGE_DURATION_TICKS = 40;
const HASTE_RESOURCE_COST = 60;
const HASTE_COOLDOWN_TICKS = 40;
const HASTE_DURATION_TICKS = 600;
/**
 * Playtest retune of Canary `ConditionSpeed::getFormulaValues`.
 * `setFormula(1.3, 40)` on Knight `baseSpeed` 110 yields formula speed 131 and
 * `speedPermille` 191, which the kernel turns into `effectiveStepCooldownTicks(11, 191) = 9`.
 * 11→9 (550 ms → 450 ms) failed the visible-acceleration criterion: the sprite
 * interpolated on the vocation base of 11, and even the logical 9-tick step is
 * only 18% faster. `600` yields 6 ticks (300 ms), Charge-class on this vocation.
 */
const HASTE_SPEED_PERMILLE = 600;

export interface HuntScenarioBuild {
  readonly scenario: KernelScenario;
  readonly itemKeys: readonly string[];
  readonly abilityKeys: readonly string[];
  readonly playerStart: GridPosition;
}

export interface HuntScenarioBuildOptions {
  readonly postures?: readonly KnightPostureDefinition[];
  /**
   * Applies the next-hunt blessing to the player. Off by default so existing
   * hunt fixtures keep the unbuffed sheet.
   */
  readonly preparedHunt?: boolean;
}

function publicFailure(
  diagnostics: readonly HuntDiagnostic[],
): SimulationValidationResult<HuntScenarioBuild> {
  return {
    ok: false,
    diagnostics: diagnostics as unknown as readonly SimulationDiagnostic[],
  };
}

function diagnostic(
  code: HuntDiagnostic['code'],
  message: string,
  path: readonly (string | number)[],
): HuntDiagnostic {
  return { code, message, path };
}

function positionKey(position: GridPosition): string {
  return `${position.x}:${position.y}:${position.z}`;
}

/**
 * Repairs starts from generated hunts that have no authored layout.
 *
 * The extracted Orc Fortress entry was anchored to the first spawn group: a
 * one-creature Orc Shaman pocket on floor 6. The actual fortress population
 * is the larger group on floor 7, so use the densest group as the presentation
 * anchor and then choose a free walkable cell beside it. Authored starts keep
 * their exact location unless they overlap a creature.
 */
function playerStartForScenario(hunt: HuntDefinition): GridPosition {
  const spawnPositions = new Set(
    hunt.spawns.groups.flatMap((group) =>
      group.slots.map((slot) =>
        positionKey({
          x: group.center.x + slot.offsetX,
          y: group.center.y + slot.offsetY,
          z: group.center.z + slot.offsetZ,
        }),
      ),
    ),
  );

  const firstSpawnGroup = hunt.spawns.groups[0];
  let densestSpawnGroup = firstSpawnGroup;
  for (const group of hunt.spawns.groups) {
    if (
      densestSpawnGroup === undefined ||
      group.slots.length > densestSpawnGroup.slots.length
    ) {
      densestSpawnGroup = group;
    }
  }
  const legacyStart =
    firstSpawnGroup !== undefined &&
    hunt.playerStart.x === firstSpawnGroup.center.x &&
    hunt.playerStart.y === firstSpawnGroup.center.y &&
    hunt.playerStart.z === firstSpawnGroup.center.z;
  const anchor =
    legacyStart && densestSpawnGroup !== undefined
      ? densestSpawnGroup.center
      : hunt.playerStart;

  if (!legacyStart && !spawnPositions.has(positionKey(hunt.playerStart))) {
    return hunt.playerStart;
  }

  const floor = hunt.region.floors.find(
    (candidate) => candidate.z === anchor.z,
  );
  if (floor === undefined) return hunt.playerStart;

  const blocked = new Set(floor.collision);
  let best: GridPosition | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < floor.ground.length; index += 1) {
    if (blocked.has(index)) continue;
    const candidate: GridPosition = {
      x: index % hunt.region.width,
      y: Math.floor(index / hunt.region.width),
      z: floor.z,
    };
    if (spawnPositions.has(positionKey(candidate))) continue;

    const distance = Math.max(
      Math.abs(candidate.x - anchor.x),
      Math.abs(candidate.y - anchor.y),
    );
    if (
      distance < bestDistance ||
      (distance === bestDistance &&
        (best === undefined ||
          candidate.y < best.y ||
          (candidate.y === best.y && candidate.x < best.x)))
    ) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best ?? hunt.playerStart;
}

/**
 * Terrain collision plus the region border ring.
 *
 * The extraction window cuts the Canary map mid-floor, so the outer cells hold
 * ground that leads nowhere. The kernel already refuses to step out of the
 * rectangle; blocking the ring moves that refusal one cell in, onto a cell the
 * presentation paints as rock, so the hunt stops looking like it has an exit
 * there.
 */
function blockedTilesOf(
  region: HuntDefinition['region'],
  collision: readonly number[],
): readonly (readonly [number, number])[] {
  const cells = new Set<number>(collision);
  for (const index of huntRegionBorderCells(region)) cells.add(index);

  return [...cells]
    .sort((left, right) => left - right)
    .map(
      (index) =>
        [index % region.width, Math.floor(index / region.width)] as const,
    );
}

function scenarioGeometry(
  hunt: HuntDefinition,
  playerStart: GridPosition,
): Omit<
  KernelScenario,
  'abilities' | 'lootTables' | 'conditions' | 'blueprints'
> {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    scenarioId: `scenario:${hunt.huntId}`,
    scenarioRevision: hunt.huntRevision,
    width: hunt.region.width,
    height: hunt.region.height,
    floors: hunt.region.floors.map((floor) => ({
      z: floor.z,
      blockedTiles: blockedTilesOf(hunt.region, floor.collision),
    })),
    transitions: hunt.transitions.entries.map(({ from, to }) => ({ from, to })),
    spawnGroups: hunt.spawns.groups
      .map((group) => ({
        center: group.center,
        radius: group.radius,
        slots: group.slots
          .map((slot) => ({
            blueprintId: slot.blueprintId,
            position: {
              x: group.center.x + slot.offsetX,
              y: group.center.y + slot.offsetY,
              z: group.center.z + slot.offsetZ,
            },
            respawnTicks: slot.respawnTicks,
            slotId: formatSpawnSlotId(slot.source, group.sourceCenter),
          }))
          // A seat on the border ring is now blocked terrain, which the kernel
          // contract refuses outright, and the floor composes no ground under
          // it either: the creature would have been invisible on a cell nobody
          // can reach. Extraction seats a handful of these per hunt.
          .filter(
            (slot) =>
              !isHuntRegionBorderCell(
                hunt.region,
                slot.position.x,
                slot.position.y,
              ),
          ),
      }))
      .filter((group) => group.slots.length > 0),
    maxLiveActors: hunt.spawns.maxLiveActors,
    initialActors: [
      {
        blueprintId: hunt.playerBlueprintId,
        position: playerStart,
        facing: 's',
      },
    ],
  };
}

function creatureKeyForBlueprint(
  hunt: HuntDefinition,
  blueprintId: string,
): ContentKey {
  for (const group of hunt.spawns.groups) {
    for (const slot of group.slots) {
      if (slot.blueprintId === blueprintId) {
        return slot.creatureKey as ContentKey;
      }
    }
  }
  return `creature:tibia:${blueprintId}` as ContentKey;
}

function composePlayer(
  source: ActorBlueprint,
  character: CharacterDefinition,
  registry: ContentRegistry,
  abilityIndices: readonly number[],
  diagnostics: HuntDiagnostic[],
  blueprintIndex: number,
  preparedHunt: boolean,
): ActorBlueprint | null {
  if (!registry.has(character.vocationKey)) {
    diagnostics.push(
      diagnostic(
        'HUNT_UNKNOWN_CREATURE',
        `Vocation ${character.vocationKey} is missing from the catalog`,
        ['character', 'vocationKey'],
      ),
    );
    return null;
  }
  const vocation = registry.getVocation(character.vocationKey);
  const combat = vocationCombatNumbers(vocation);
  const stepCooldownTicks = stepCooldownTicksFromSpeed(vocation.baseSpeed);
  if (stepCooldownTicks === null) {
    diagnostics.push(
      diagnostic(
        'HUNT_INTERVAL_NOT_DIVISIBLE',
        `Vocation baseSpeed ${vocation.baseSpeed} did not convert to a whole number of ticks`,
        ['blueprints', blueprintIndex, 'stepCooldownTicks'],
      ),
    );
    return null;
  }
  const attackCooldownTicks = ticksFromIntervalMs(vocation.attackSpeedMs);
  if (attackCooldownTicks === null) {
    diagnostics.push(
      diagnostic(
        'HUNT_INTERVAL_NOT_DIVISIBLE',
        `attackSpeedMs ${vocation.attackSpeedMs} is not divisible by 50`,
        ['blueprints', blueprintIndex, 'attackCooldownTicks'],
      ),
    );
    return null;
  }
  const weapon = registry.has(character.weaponItemKey)
    ? registry.getItem(character.weaponItemKey)
    : undefined;
  const wand = weapon?.weaponType === 'wand' || weapon?.weaponType === 'rod';
  const autoAttack = playerAutoAttack(character, weapon);
  const attackMinDamage = preparedHunt
    ? scaleByDamageDealtPermille(
        autoAttack.minPower,
        NEXT_HUNT_BUFF_DAMAGE_DEALT_PERMILLE,
      )
    : autoAttack.minPower;
  const attackMaxDamage = preparedHunt
    ? scaleByDamageDealtPermille(
        autoAttack.maxPower,
        NEXT_HUNT_BUFF_DAMAGE_DEALT_PERMILLE,
      )
    : autoAttack.maxPower;
  return {
    ...source,
    behavior: 'inert',
    factionId: PLAYER_FACTION_ID,
    maxHealth: character.maxHealth,
    maxResource: character.maxMana,
    healthRegenTicks: ticksFromIntervalMs(combat.healthRegenMs) ?? 0,
    healthRegenAmount: combat.healthRegenAmount,
    resourceRegenTicks: ticksFromIntervalMs(combat.resourceRegenMs) ?? 0,
    resourceRegenAmount: combat.resourceRegenAmount,
    stepCooldownTicks,
    attackCooldownTicks,
    attackMinDamage,
    attackMaxDamage,
    ...(wand ? {} : { attackSkillIndex: 2 }),
    attackRangeTiles: autoAttack.rangeTiles,
    aggroRadius: 0,
    lootTableIndex: null,
    abilityIndices,
    outOfCombatHealthRegenTicks:
      ticksFromIntervalMs(combat.outOfCombatHealthRegenMs) ?? 0,
    outOfCombatHealthRegenAmount: combat.outOfCombatHealthRegenAmount,
    outOfCombatResourceRegenTicks:
      ticksFromIntervalMs(combat.outOfCombatResourceRegenMs) ?? 0,
    outOfCombatResourceRegenAmount: combat.outOfCombatResourceRegenAmount,
    combatWindowTicks: ticksFromIntervalMs(combat.combatWindowMs) ?? 0,
    lifeLeechPermille: combat.lifeLeechPermille,
    manaLeechPermille: combat.manaLeechPermille,
    attackElement: wand ? 'energy' : 'physical',
    armor: character.armor ?? 0,
    resistances: [],
    immunities: [],
  };
}

/**
 * `flags.targetDistance` is not in the catalog. Melee stand-off is 1; a
 * ranged-only creature uses the longest imported `rangeTiles`. V0 is all melee.
 */
function attackRangeTilesFrom(creature: CreatureDefinition): number {
  if (creature.attacks.some((attack) => attack.kind === 'melee')) {
    return MELEE_RANGE_TILES;
  }
  let maxRange = 0;
  for (const attack of creature.attacks) {
    if (attack.kind === 'ranged' && attack.rangeTiles > maxRange) {
      maxRange = attack.rangeTiles;
    }
  }
  return maxRange > 0 ? maxRange : MELEE_RANGE_TILES;
}

function composeCreature(
  source: ActorBlueprint,
  creature: CreatureDefinition,
  lootTableIndex: number | null,
  abilityIndices: readonly number[],
  diagnostics: HuntDiagnostic[],
  blueprintIndex: number,
): ActorBlueprint | null {
  const stepCooldownTicks = stepCooldownTicksFromSpeed(creature.stats.speed);
  if (stepCooldownTicks === null) {
    diagnostics.push(
      diagnostic(
        'HUNT_INTERVAL_NOT_DIVISIBLE',
        `Creature speed ${creature.stats.speed} did not convert to a whole number of ticks`,
        ['blueprints', blueprintIndex, 'stepCooldownTicks'],
      ),
    );
    return null;
  }
  const melee = creature.attacks.find((attack) => attack.kind === 'melee');
  const attack = melee ?? creature.attacks[0];
  let attackCooldownTicks = 0;
  let attackMinDamage = 0;
  let attackMaxDamage = 0;
  if (attack !== undefined) {
    const converted = ticksFromIntervalMs(attack.intervalMs);
    if (converted === null) {
      diagnostics.push(
        diagnostic(
          'HUNT_INTERVAL_NOT_DIVISIBLE',
          `intervalMs ${attack.intervalMs} is not divisible by 50`,
          ['blueprints', blueprintIndex, 'attackCooldownTicks'],
        ),
      );
      return null;
    }
    attackCooldownTicks = converted;
    attackMinDamage = luaToInt32(attack.minDamage);
    attackMaxDamage = luaToInt32(attack.maxDamage);
  }
  return {
    ...source,
    behavior: creature.attacks.length > 0 ? 'hunter' : 'wander',
    factionId: CREATURE_FACTION_ID,
    maxHealth: creature.stats.health,
    maxResource: 0,
    healthRegenTicks: 0,
    healthRegenAmount: 0,
    resourceRegenTicks: 0,
    resourceRegenAmount: 0,
    stepCooldownTicks,
    attackCooldownTicks,
    attackMinDamage,
    attackMaxDamage,
    attackRangeTiles: attackRangeTilesFrom(creature),
    // Canary `Creature::canSee` is the viewport rectangle (±11, ±11). The old
    // literal 1 confused `flags.targetDistance` (melee stand-off) with agro.
    aggroRadius: creature.attacks.length > 0 ? CANARY_VIEW_RANGE_TILES : 0,
    lootTableIndex,
    abilityIndices,
    outOfCombatHealthRegenTicks: 0,
    outOfCombatHealthRegenAmount: 0,
    outOfCombatResourceRegenTicks: 0,
    outOfCombatResourceRegenAmount: 0,
    combatWindowTicks: 0,
    lifeLeechPermille: 0,
    manaLeechPermille: 0,
    // Creature `armor` is in the Lua and is not imported: the band that needs
    // it is 16 (`HUNT_BANDS.md`), and PB-13-04 is the player's set.
    armor: 0,
    resistances: [],
    immunities: [],
  };
}

function uniqueAbilityId(
  blueprintId: string,
  kind: string,
  used: Set<string>,
): string {
  const base = `${blueprintId}-${kind}`;
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let suffix = 2;
  let candidate = `${base}-${suffix}`;
  while (used.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  used.add(candidate);
  return candidate;
}

function composeCreatureAbilities(
  creature: CreatureDefinition,
  blueprintId: string,
  diagnostics: HuntDiagnostic[],
  blueprintIndex: number,
): AbilityDefinition[] | null {
  const abilities: AbilityDefinition[] = [];
  const usedIds = new Set<string>();

  for (const attack of creature.attacks) {
    if (attack.kind === 'melee') {
      continue;
    }
    const cooldownTicks = ticksFromIntervalMs(attack.intervalMs);
    if (cooldownTicks === null) {
      diagnostics.push(
        diagnostic(
          'HUNT_INTERVAL_NOT_DIVISIBLE',
          `intervalMs ${attack.intervalMs} is not divisible by 50`,
          ['blueprints', blueprintIndex, 'abilityIndices'],
        ),
      );
      return null;
    }
    const shape =
      attack.kind === 'ranged'
        ? {
            shape: 'target' as const,
            radius: 0,
            rangeTiles: attack.rangeTiles,
          }
        : {
            shape: 'area' as const,
            radius: attack.radiusTiles,
            rangeTiles: 0,
          };
    abilities.push({
      abilityId: uniqueAbilityId(blueprintId, attack.kind, usedIds),
      effect: 'damage',
      shape: shape.shape,
      radius: shape.radius,
      rangeTiles: shape.rangeTiles,
      resourceCost: 0,
      cooldownTicks,
      groupCooldownTicks: 0,
      minPower: luaToInt32(attack.minDamage),
      maxPower: luaToInt32(attack.maxDamage),
      element: combatElementFromDamageType(attack.damageType),
      primaryCooldownGroup: 0,
      secondaryCooldownGroup: null,
      secondaryGroupCooldownTicks: 0,
      appliedConditionIndex: null,
      maxCharges: null,
      rechargeKind: 'none',
      toggle: false,
      forcedTargetDurationTicks: 0,
      chanceBasisPoints: attack.chanceBasisPoints,
    });
  }

  for (const defense of creature.defenses) {
    if (defense.kind !== 'heal') {
      continue;
    }
    const cooldownTicks = ticksFromIntervalMs(defense.intervalMs);
    if (cooldownTicks === null) {
      diagnostics.push(
        diagnostic(
          'HUNT_INTERVAL_NOT_DIVISIBLE',
          `intervalMs ${defense.intervalMs} is not divisible by 50`,
          ['blueprints', blueprintIndex, 'abilityIndices'],
        ),
      );
      return null;
    }
    abilities.push({
      abilityId: uniqueAbilityId(blueprintId, 'heal', usedIds),
      effect: 'heal',
      shape: 'self',
      radius: 0,
      rangeTiles: 0,
      resourceCost: 0,
      cooldownTicks,
      groupCooldownTicks: 0,
      minPower: luaToInt32(defense.minAmount),
      maxPower: luaToInt32(defense.maxAmount),
      element: 'physical',
      primaryCooldownGroup: 0,
      secondaryCooldownGroup: null,
      secondaryGroupCooldownTicks: 0,
      appliedConditionIndex: null,
      maxCharges: null,
      rechargeKind: 'none',
      toggle: false,
      forcedTargetDurationTicks: 0,
      chanceBasisPoints: defense.chanceBasisPoints,
    });
  }

  return abilities;
}

function composeAbilities(
  character: CharacterDefinition,
  registry: ContentRegistry,
  diagnostics: HuntDiagnostic[],
  conditionIndexBySpellKey: ReadonlyMap<string, number>,
): { readonly abilities: AbilityDefinition[]; readonly abilityKeys: string[] } {
  const abilities: AbilityDefinition[] = [];
  const abilityKeys: string[] = [];
  const vocation = registry.has(character.vocationKey)
    ? registry.getVocation(character.vocationKey)
    : undefined;

  const activeBand = characterKitBandAtLevel(character);
  const spellPath =
    character.kit === undefined
      ? ['character', 'spellKeys']
      : ['character', 'kit', character.kit.indexOf(activeBand), 'spellKeys'];
  characterSpellKeysAtLevel(character).forEach((spellKey, spellIndex) => {
    if (spellKey === CHALLENGE_SPELL_KEY || spellKey === HASTE_SPELL_KEY) {
      return;
    }
    if (!registry.has(spellKey)) {
      diagnostics.push(
        diagnostic(
          'HUNT_SPELL_NOT_ALLOWED',
          `Spell ${spellKey} is missing from the catalog`,
          [...spellPath, spellIndex],
        ),
      );
      return;
    }
    const spell = registry.getSpell(spellKey);
    if (
      vocation !== undefined &&
      !spell.allowedVocationFamilies.includes(vocation.familyKey)
    ) {
      diagnostics.push(
        diagnostic(
          'HUNT_SPELL_NOT_ALLOWED',
          `Spell ${spellKey} is not allowed for vocation family ${vocation.familyKey}`,
          [...spellPath, spellIndex],
        ),
      );
      return;
    }
    const cooldownTicks = ticksFromIntervalMs(spell.cooldownMs);
    const groupCooldownTicks = ticksFromIntervalMs(spell.groupCooldownMs);
    if (cooldownTicks === null || groupCooldownTicks === null) {
      diagnostics.push(
        diagnostic(
          'HUNT_INTERVAL_NOT_DIVISIBLE',
          `Spell ${spellKey} cooldown is not divisible by 50`,
          [...spellPath, spellIndex],
        ),
      );
      return;
    }
    const power = resolveSpellPower(spell.formula, character);
    const shape = abilityShapeFromSpell(spell);
    const magicShield = spellKey === SORCERER_MAGIC_SHIELD_SPELL_KEY;
    const sorcererStance = spellKey === SORCERER_STANCE_SPELL_KEY;
    const toggle = magicShield || sorcererStance;
    const conditionIndex = conditionIndexBySpellKey.get(spellKey) ?? null;
    abilities.push({
      abilityId: abilityIdFromSpellKey(spellKey),
      effect: spell.damageType === 'healing' ? 'heal' : 'damage',
      shape: shape.shape,
      radius: shape.radius,
      rangeTiles: shape.rangeTiles,
      resourceCost: spell.mana,
      cooldownTicks,
      groupCooldownTicks,
      minPower: power.minPower,
      maxPower: power.maxPower,
      element: combatElementFromDamageType(spell.damageType),
      primaryCooldownGroup: toggle ? SUPPORT_COOLDOWN_GROUP : 0,
      secondaryCooldownGroup: toggle ? 2 : null,
      secondaryGroupCooldownTicks: toggle
        ? (ticksFromIntervalMs(2000) ?? 0)
        : 0,
      appliedConditionIndex: conditionIndex,
      /**
       * `rune:charges()` from the snapshot: 4 in
       * `data/scripts/runes/great_fireball.lua`, 3 in
       * `data/scripts/runes/sudden_death.lua`. The ADR-05 recharge replaces
       * conjuring, so the charge is the whole cost and the rune carries no
       * mana; the 530 and 985 in the conjuring scripts buy the item, and V0
       * has no inventory to buy it into.
       */
      maxCharges:
        spellKey === SORCERER_GREAT_FIREBALL_SPELL_KEY
          ? 4
          : spellKey === SORCERER_SUDDEN_DEATH_SPELL_KEY
            ? 3
            : null,
      rechargeKind:
        spellKey === SORCERER_GREAT_FIREBALL_SPELL_KEY ||
        spellKey === SORCERER_SUDDEN_DEATH_SPELL_KEY
          ? 'out-of-combat'
          : 'none',
      toggle,
      forcedTargetDurationTicks: 0,
    });
    abilityKeys.push(spellKey);
  });

  return { abilities, abilityKeys };
}

function composeChallengeAbility(): AbilityDefinition {
  return {
    abilityId: 'challenge',
    effect: 'damage',
    shape: 'area',
    radius: CHALLENGE_RADIUS,
    rangeTiles: 0,
    resourceCost: CHALLENGE_RESOURCE_COST,
    cooldownTicks: CHALLENGE_COOLDOWN_TICKS,
    groupCooldownTicks: CHALLENGE_COOLDOWN_TICKS,
    minPower: 0,
    maxPower: 0,
    element: 'physical',
    primaryCooldownGroup: SUPPORT_COOLDOWN_GROUP,
    secondaryCooldownGroup: null,
    secondaryGroupCooldownTicks: 0,
    appliedConditionIndex: null,
    maxCharges: null,
    rechargeKind: 'none',
    toggle: false,
    forcedTargetDurationTicks: CHALLENGE_DURATION_TICKS,
  };
}

function composeHasteAbility(appliedConditionIndex: number): AbilityDefinition {
  return {
    abilityId: 'haste',
    effect: 'heal',
    shape: 'self',
    radius: 0,
    rangeTiles: 0,
    resourceCost: HASTE_RESOURCE_COST,
    cooldownTicks: HASTE_COOLDOWN_TICKS,
    groupCooldownTicks: HASTE_COOLDOWN_TICKS,
    minPower: 0,
    maxPower: 0,
    element: 'physical',
    primaryCooldownGroup: SUPPORT_COOLDOWN_GROUP,
    secondaryCooldownGroup: null,
    secondaryGroupCooldownTicks: 0,
    appliedConditionIndex,
    maxCharges: null,
    rechargeKind: 'none',
    toggle: false,
    forcedTargetDurationTicks: 0,
  };
}

function composeHasteCondition(): ScenarioConditionDefinition {
  return {
    conditionId: 'haste',
    exclusivityGroup: null,
    durationTicks: HASTE_DURATION_TICKS,
    skillIndex: null,
    skillModifierPermille: 0,
    damageDealtPermille: 0,
    damageReceivedPermille: 0,
    speedPermille: HASTE_SPEED_PERMILLE,
    manaShield: false,
    tickDamageAmount: 0,
    tickDamageIntervalTicks: 0,
    elementBonusPermille: 0,
    convertNextAbilityElement: false,
    bonusElement: null,
  };
}

function composePostureAbilities(
  postures: readonly KnightPostureDefinition[],
  conditionOffset: number,
): readonly AbilityDefinition[] {
  const groupCooldownTicks = ticksFromIntervalMs(2000) ?? 0;
  return postures.map((posture, index) => ({
    abilityId: posture.abilityId,
    effect: 'heal',
    shape: 'self',
    radius: 0,
    rangeTiles: 0,
    resourceCost: posture.mana,
    cooldownTicks: 0,
    groupCooldownTicks,
    minPower: 0,
    maxPower: 0,
    element: 'physical',
    primaryCooldownGroup: 1,
    secondaryCooldownGroup: 2,
    secondaryGroupCooldownTicks: groupCooldownTicks,
    appliedConditionIndex: conditionOffset + index,
    maxCharges: null,
    rechargeKind: 'none',
    toggle: true,
    forcedTargetDurationTicks: 0,
  }));
}

function composePostureConditions(
  postures: readonly KnightPostureDefinition[],
): readonly ScenarioConditionDefinition[] {
  return postures.map((posture) => ({
    conditionId: posture.conditionId,
    exclusivityGroup: 1,
    durationTicks: 0,
    skillIndex: posture.skillIndex,
    skillModifierPermille: posture.skillModifierPermille,
    damageDealtPermille: posture.damageDealtPermille,
    damageReceivedPermille: posture.damageReceivedPermille,
    speedPermille: 0,
    manaShield: false,
    tickDamageAmount: 0,
    tickDamageIntervalTicks: 0,
    elementBonusPermille: 0,
    convertNextAbilityElement: false,
    bonusElement: null,
  }));
}

function composeSorcererConditions(): readonly ScenarioConditionDefinition[] {
  return [
    {
      conditionId: 'magic-shield',
      exclusivityGroup: 1,
      durationTicks: 0,
      skillIndex: null,
      skillModifierPermille: 0,
      damageDealtPermille: 0,
      damageReceivedPermille: 0,
      speedPermille: 0,
      manaShield: true,
      tickDamageAmount: 0,
      tickDamageIntervalTicks: 0,
      elementBonusPermille: 0,
      convertNextAbilityElement: false,
      bonusElement: null,
    },
    {
      conditionId: 'arcane-stance',
      exclusivityGroup: 1,
      durationTicks: 0,
      skillIndex: null,
      skillModifierPermille: 0,
      damageDealtPermille: 150,
      damageReceivedPermille: 100,
      speedPermille: 0,
      manaShield: false,
      tickDamageAmount: 0,
      tickDamageIntervalTicks: 0,
      elementBonusPermille: 0,
      convertNextAbilityElement: false,
      bonusElement: null,
    },
  ];
}

function applyPreparedHuntDamage<T extends AbilityDefinition>(
  abilities: readonly T[],
  preparedHunt: boolean,
): T[] {
  if (!preparedHunt) {
    return [...abilities];
  }
  return abilities.map((ability) =>
    ability.effect === 'damage'
      ? {
          ...ability,
          minPower: scaleByDamageDealtPermille(
            ability.minPower,
            NEXT_HUNT_BUFF_DAMAGE_DEALT_PERMILLE,
          ),
          maxPower: scaleByDamageDealtPermille(
            ability.maxPower,
            NEXT_HUNT_BUFF_DAMAGE_DEALT_PERMILLE,
          ),
        }
      : ability,
  );
}

function collectMissingLootKeys(
  creatures: readonly CreatureDefinition[],
  registry: ContentRegistry,
): readonly string[] {
  const missing = new Set<string>();
  for (const creature of creatures) {
    for (const entry of creature.loot) {
      if (!registry.has(entry.itemKey)) {
        missing.add(entry.itemKey);
      }
    }
  }
  return [...missing].sort(compareContentKeys);
}

export function buildHuntScenario(
  hunt: HuntDefinition,
  character: CharacterDefinition,
  registry: ContentRegistry,
  seed: Seed,
  options?: HuntScenarioBuildOptions,
): SimulationValidationResult<HuntScenarioBuild> {
  void seed;

  const validatedHunt = validateHuntDefinition(hunt);
  if (!validatedHunt.ok) {
    return validatedHunt;
  }

  const diagnostics: HuntDiagnostic[] = [];
  const sorcererConditions =
    character.vocationKey === SORCERER_VOCATION_KEY
      ? composeSorcererConditions()
      : [];
  const sorcererConditionIndices =
    character.vocationKey === SORCERER_VOCATION_KEY
      ? new Map<string, number>([
          [SORCERER_MAGIC_SHIELD_SPELL_KEY, 0],
          [SORCERER_STANCE_SPELL_KEY, 1],
        ])
      : new Map<string, number>();
  const { abilities: spellAbilities, abilityKeys } = composeAbilities(
    character,
    registry,
    diagnostics,
    sorcererConditionIndices,
  );
  const postureConditionOffset = sorcererConditions.length;
  const postureAbilities = composePostureAbilities(
    options?.postures ?? [],
    postureConditionOffset,
  );
  const kitHasChallenge =
    characterSpellKeysAtLevel(character).includes(CHALLENGE_SPELL_KEY);
  const kitHasHaste =
    characterSpellKeysAtLevel(character).includes(HASTE_SPELL_KEY);
  const challengeAbilities = kitHasChallenge ? [composeChallengeAbility()] : [];
  const postureConditions = composePostureConditions(options?.postures ?? []);
  const hasteAbilities = kitHasHaste
    ? [
        composeHasteAbility(
          sorcererConditions.length + postureConditions.length,
        ),
      ]
    : [];
  const preparedHunt = options?.preparedHunt === true;
  const abilities = applyPreparedHuntDamage(
    [
      ...spellAbilities,
      ...postureAbilities,
      ...challengeAbilities,
      ...hasteAbilities,
    ],
    preparedHunt,
  );
  const resolvedAbilityKeys = [
    ...abilityKeys,
    ...(kitHasChallenge ? [CHALLENGE_SPELL_KEY] : []),
    ...(kitHasHaste ? [HASTE_SPELL_KEY] : []),
  ];
  const conditions = [
    ...sorcererConditions,
    ...postureConditions,
    ...(kitHasHaste ? [composeHasteCondition()] : []),
  ];
  const playerAbilityIndices = abilities.map((_, index) => index);

  const orderedBlueprints = [...validatedHunt.value.blueprints].sort(
    (left, right) => left.blueprintId.localeCompare(right.blueprintId),
  );

  const creaturesByBlueprint = new Map<string, CreatureDefinition>();
  for (const blueprint of orderedBlueprints) {
    if (blueprint.blueprintId === validatedHunt.value.playerBlueprintId) {
      continue;
    }
    const creatureKey = creatureKeyForBlueprint(
      validatedHunt.value,
      blueprint.blueprintId,
    );
    if (!registry.has(creatureKey)) {
      diagnostics.push(
        diagnostic(
          'HUNT_UNKNOWN_CREATURE',
          `Creature ${creatureKey} is missing from the catalog`,
          ['blueprints', blueprint.blueprintId],
        ),
      );
      continue;
    }
    creaturesByBlueprint.set(
      blueprint.blueprintId,
      registry.getCreature(creatureKey),
    );
  }

  const missingItems = collectMissingLootKeys(
    [...creaturesByBlueprint.values()],
    registry,
  );
  if (missingItems.length > 0) {
    diagnostics.push(
      diagnostic(
        'HUNT_UNKNOWN_ITEM',
        `Loot item keys missing from the catalog: ${missingItems.join(', ')}`,
        ['lootTables'],
      ),
    );
  }

  if (diagnostics.length > 0) {
    return publicFailure(diagnostics);
  }

  const itemKeySet = new Set<string>();
  for (const creature of creaturesByBlueprint.values()) {
    for (const entry of creature.loot) {
      itemKeySet.add(entry.itemKey);
    }
  }
  const itemKeys = [...itemKeySet].sort(compareContentKeys);
  const itemIndexByKey = new Map(itemKeys.map((key, index) => [key, index]));

  const lootTables: LootTableDefinition[] = [];
  const lootTableIndexByBlueprint = new Map<string, number | null>();
  const blueprints: ActorBlueprint[] = [];

  orderedBlueprints.forEach((source, blueprintIndex) => {
    if (source.blueprintId === validatedHunt.value.playerBlueprintId) {
      const player = composePlayer(
        source,
        character,
        registry,
        playerAbilityIndices,
        diagnostics,
        blueprintIndex,
        preparedHunt,
      );
      if (player !== null) {
        blueprints.push(player);
      }
      return;
    }
    const creature = creaturesByBlueprint.get(source.blueprintId);
    if (creature === undefined) {
      return;
    }
    let lootTableIndex: number | null = null;
    if (creature.loot.length > 0) {
      const existing = lootTableIndexByBlueprint.get(source.blueprintId);
      if (existing === undefined) {
        lootTableIndex = lootTables.length;
        lootTables.push({
          entries: creature.loot.map((entry) => ({
            itemIndex: itemIndexByKey.get(entry.itemKey) ?? 0,
            chancePerHundredThousand: entry.chancePerHundredThousand,
            minCount: entry.minCount,
            maxCount: entry.maxCount,
          })),
        });
        lootTableIndexByBlueprint.set(source.blueprintId, lootTableIndex);
      } else {
        lootTableIndex = existing;
      }
    } else {
      lootTableIndexByBlueprint.set(source.blueprintId, null);
    }
    const creatureAbilities = composeCreatureAbilities(
      creature,
      source.blueprintId,
      diagnostics,
      blueprintIndex,
    );
    if (creatureAbilities === null) {
      return;
    }
    const abilityIndices = creatureAbilities.map(
      (_, index) => abilities.length + index,
    );
    abilities.push(...creatureAbilities);
    const composed = composeCreature(
      source,
      creature,
      lootTableIndex,
      abilityIndices,
      diagnostics,
      blueprintIndex,
    );
    if (composed !== null) {
      blueprints.push(composed);
    }
  });

  if (diagnostics.length > 0) {
    return publicFailure(diagnostics);
  }

  const playerStart = playerStartForScenario(validatedHunt.value);
  const scenario: KernelScenario = {
    ...scenarioGeometry(validatedHunt.value, playerStart),
    abilities,
    lootTables,
    conditions,
    blueprints,
  };

  const validatedScenario = validateKernelScenario(scenario);
  if (!validatedScenario.ok) {
    return validatedScenario;
  }

  return {
    ok: true,
    value: {
      scenario: validatedScenario.value,
      itemKeys,
      abilityKeys: resolvedAbilityKeys,
      playerStart,
    },
  };
}
