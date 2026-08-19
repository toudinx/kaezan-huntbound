import {
  type AbilityDefinition,
  type ActorBlueprint,
  type CharacterDefinition,
  type ContentKey,
  type CreatureDefinition,
  type HuntDefinition,
  type HuntDiagnostic,
  type KernelScenario,
  type LootTableDefinition,
  type Seed,
  SIMULATION_SCHEMA_VERSION,
  type SimulationDiagnostic,
  type SimulationValidationResult,
  validateHuntDefinition,
  validateKernelScenario,
} from '@huntbound/contracts';

import type { ContentRegistry } from '../runtime/contentRegistry.ts';
import {
  abilityIdFromSpellKey,
  abilityShapeFromSpell,
  CANARY_VIEW_RANGE_TILES,
  CREATURE_FACTION_ID,
  compareContentKeys,
  KNIGHT_HEALTH_REGEN_AMOUNT,
  KNIGHT_HEALTH_REGEN_MS,
  KNIGHT_RESOURCE_REGEN_AMOUNT,
  KNIGHT_RESOURCE_REGEN_MS,
  knightMeleeDamage,
  luaToInt32,
  MELEE_RANGE_TILES,
  PLAYER_FACTION_ID,
  resolveSpellPower,
  stepCooldownTicksFromSpeed,
  ticksFromIntervalMs,
} from './combatConversion.ts';

export interface HuntScenarioBuild {
  readonly scenario: KernelScenario;
  readonly itemKeys: readonly string[];
  readonly abilityKeys: readonly string[];
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

function scenarioGeometry(
  hunt: HuntDefinition,
): Omit<KernelScenario, 'abilities' | 'lootTables' | 'blueprints'> {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    scenarioId: `scenario:${hunt.huntId}`,
    scenarioRevision: hunt.huntRevision,
    width: hunt.region.width,
    height: hunt.region.height,
    floors: hunt.region.floors.map((floor) => ({
      z: floor.z,
      blockedTiles: floor.collision.map(
        (index) =>
          [
            index % hunt.region.width,
            Math.floor(index / hunt.region.width),
          ] as const,
      ),
    })),
    transitions: hunt.transitions.entries.map(({ from, to }) => ({ from, to })),
    spawnGroups: hunt.spawns.groups.map((group) => ({
      center: group.center,
      radius: group.radius,
      slots: group.slots.map((slot) => ({
        blueprintId: slot.blueprintId,
        position: {
          x: group.center.x + slot.offsetX,
          y: group.center.y + slot.offsetY,
          z: group.center.z + slot.offsetZ,
        },
        respawnTicks: slot.respawnTicks,
      })),
    })),
    maxLiveActors: hunt.spawns.maxLiveActors,
    initialActors: [
      {
        blueprintId: hunt.playerBlueprintId,
        position: hunt.playerStart,
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
  const melee = knightMeleeDamage(
    character.level,
    character.skills.sword,
    character.weaponAttack,
  );
  return {
    ...source,
    behavior: 'inert',
    factionId: PLAYER_FACTION_ID,
    maxHealth: character.maxHealth,
    maxResource: character.maxMana,
    healthRegenTicks: ticksFromIntervalMs(KNIGHT_HEALTH_REGEN_MS) ?? 0,
    healthRegenAmount: KNIGHT_HEALTH_REGEN_AMOUNT,
    resourceRegenTicks: ticksFromIntervalMs(KNIGHT_RESOURCE_REGEN_MS) ?? 0,
    resourceRegenAmount: KNIGHT_RESOURCE_REGEN_AMOUNT,
    stepCooldownTicks,
    attackCooldownTicks,
    attackMinDamage: melee.minPower,
    attackMaxDamage: melee.maxPower,
    attackRangeTiles: MELEE_RANGE_TILES,
    aggroRadius: 0,
    lootTableIndex: null,
    abilityIndices,
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
    abilityIndices: [],
  };
}

function composeAbilities(
  character: CharacterDefinition,
  registry: ContentRegistry,
  diagnostics: HuntDiagnostic[],
): { readonly abilities: AbilityDefinition[]; readonly abilityKeys: string[] } {
  const abilities: AbilityDefinition[] = [];
  const abilityKeys: string[] = [];
  const vocation = registry.has(character.vocationKey)
    ? registry.getVocation(character.vocationKey)
    : undefined;

  character.spellKeys.forEach((spellKey, spellIndex) => {
    if (!registry.has(spellKey)) {
      diagnostics.push(
        diagnostic(
          'HUNT_SPELL_NOT_ALLOWED',
          `Spell ${spellKey} is missing from the catalog`,
          ['character', 'spellKeys', spellIndex],
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
          ['character', 'spellKeys', spellIndex],
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
          ['character', 'spellKeys', spellIndex],
        ),
      );
      return;
    }
    const power = resolveSpellPower(spell.formula, character);
    const shape = abilityShapeFromSpell(spell);
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
    });
    abilityKeys.push(spellKey);
  });

  return { abilities, abilityKeys };
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
): SimulationValidationResult<HuntScenarioBuild> {
  void seed;

  const validatedHunt = validateHuntDefinition(hunt);
  if (!validatedHunt.ok) {
    return validatedHunt;
  }

  const diagnostics: HuntDiagnostic[] = [];
  const { abilities, abilityKeys } = composeAbilities(
    character,
    registry,
    diagnostics,
  );
  const playerAbilityIndices = abilities.map((_, index) => index);

  const creaturesByBlueprint = new Map<string, CreatureDefinition>();
  for (const blueprint of validatedHunt.value.blueprints) {
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

  validatedHunt.value.blueprints.forEach((source, blueprintIndex) => {
    if (source.blueprintId === validatedHunt.value.playerBlueprintId) {
      const player = composePlayer(
        source,
        character,
        registry,
        playerAbilityIndices,
        diagnostics,
        blueprintIndex,
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
    const composed = composeCreature(
      source,
      creature,
      lootTableIndex,
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

  const scenario: KernelScenario = {
    ...scenarioGeometry(validatedHunt.value),
    abilities,
    lootTables,
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
      abilityKeys,
    },
  };
}
