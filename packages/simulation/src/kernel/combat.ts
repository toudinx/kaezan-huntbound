import type {
  AbilityDefinition,
  ActorBlueprint,
  ActorState,
  CombatElement,
  EntityId,
  GridPosition,
  LootTableDefinition,
  ScenarioConditionDefinition,
  SimulationCommandType,
  SimulationDiagnosticCode,
  TickIndex,
} from '@huntbound/contracts';
import type { EventJournal } from '../events/journal.ts';
import { chebyshevDistance, inFacingCone } from '../grid/directions.ts';
import { isSightClear } from '../grid/sight.ts';
import type { StaticGrid } from '../grid/staticGrid.ts';
import type { RandomSource } from '../random/source.ts';
import type { MutableWorld } from '../state/worldState.ts';
import {
  applyCondition,
  type ConditionModifiers,
  expireConditions,
  hasActiveCondition,
  queryConditionModifiers,
  removeCondition,
  scaleByPermille,
  tickDamageFor,
} from './conditions.ts';
import { resolveLoot } from './loot.ts';

export type CombatIntent =
  | {
      readonly kind: 'attack';
      readonly entityId: EntityId;
      readonly targetEntityId: EntityId;
      readonly sourceRank: number;
      readonly order: number;
      readonly sequence: number | null;
    }
  | {
      readonly kind: 'cast';
      readonly entityId: EntityId;
      readonly abilityIndex: number;
      readonly targetEntityId: EntityId | null;
      readonly sourceRank: number;
      readonly order: number;
      readonly sequence: number | null;
    };

function compareCombatIntents(left: CombatIntent, right: CombatIntent): number {
  if (left.entityId !== right.entityId) {
    return left.entityId < right.entityId ? -1 : 1;
  }
  if (left.sourceRank !== right.sourceRank) {
    return left.sourceRank < right.sourceRank ? -1 : 1;
  }
  if (left.order !== right.order) {
    return left.order < right.order ? -1 : 1;
  }
  return 0;
}

/** Content and the kernel agree: faction 0 is the player. */
const PLAYER_FACTION_ID = 0;

function clampNonNegative(value: number): number {
  return value < 0 ? 0 : value;
}

function clampToMaximum(value: number, maximum: number): number {
  return value < maximum ? value : maximum;
}

function permilleOf(amount: number, permille: number): number {
  if (amount <= 0 || permille <= 0) {
    return 0;
  }
  return Math.trunc((amount * permille) / 1000);
}

function outgoingDamagePermille(
  blueprint: ActorBlueprint,
  element: CombatElement,
  modifiers: ConditionModifiers,
): number {
  let permille = modifiers.damageDealtPermille;
  if (element === 'physical' && blueprint.attackSkillIndex !== undefined) {
    permille += modifiers.skillModifierPermille(blueprint.attackSkillIndex);
  }
  return permille;
}

function isInCombat(
  actor: ActorState,
  blueprint: ActorBlueprint,
  currentTick: number,
): boolean {
  if (blueprint.factionId !== PLAYER_FACTION_ID) {
    return true;
  }
  if (blueprint.combatWindowTicks === 0) {
    return true;
  }
  if (actor.lastDamageReceivedTick === 0) {
    return false;
  }
  return (
    currentTick - actor.lastDamageReceivedTick < blueprint.combatWindowTicks
  );
}

function pickRegen(
  inCombat: boolean,
  combatTicks: number,
  combatAmount: number,
  outOfCombatTicks: number,
  outOfCombatAmount: number,
): { readonly ticks: number; readonly amount: number } {
  if (!inCombat && outOfCombatTicks > 0 && outOfCombatAmount > 0) {
    return { ticks: outOfCombatTicks, amount: outOfCombatAmount };
  }
  return { ticks: combatTicks, amount: combatAmount };
}

function inRange(
  from: GridPosition,
  to: GridPosition,
  rangeTiles: number,
): boolean {
  return from.z === to.z && chebyshevDistance(from, to) <= rangeTiles;
}

export function rollClosedRange(
  stream: RandomSource,
  min: number,
  max: number,
): number {
  if (min === max) {
    return min;
  }
  return min + stream.nextBelow(max - min + 1);
}

export function applyUpkeep(
  world: MutableWorld,
  blueprints: ReadonlyMap<string, ActorBlueprint>,
  conditions: readonly ScenarioConditionDefinition[],
  currentTick: number,
  journal: EventJournal,
): void {
  for (const actor of world.actors()) {
    const blueprint = blueprints.get(actor.blueprintId);
    if (blueprint === undefined) {
      continue;
    }

    const activeConditions = expireConditions(actor, currentTick);
    let { health, resource, nextHealthRegenTick, nextResourceRegenTick } =
      actor;
    let { lastDamageReceivedTick } = actor;
    const pulse = tickDamageFor(
      { ...actor, activeConditions },
      conditions,
      currentTick,
    );
    if (pulse > 0) {
      const remaining = clampNonNegative(health - pulse);
      lastDamageReceivedTick = currentTick === 0 ? 1 : currentTick;
      journal.emit(currentTick as TickIndex, {
        type: 'combat/damaged',
        entityId: actor.entityId,
        sourceEntityId: actor.entityId,
        amount: pulse,
        remainingHealth: remaining,
        cause: 'ability',
      });
      health = remaining;
    }
    const healthAfterPulse = health;
    const resourceAfterPulse = resource;
    const inCombat = isInCombat(
      { ...actor, lastDamageReceivedTick },
      blueprint,
      currentTick,
    );
    const healthRegen = pickRegen(
      inCombat,
      blueprint.healthRegenTicks,
      blueprint.healthRegenAmount,
      blueprint.outOfCombatHealthRegenTicks,
      blueprint.outOfCombatHealthRegenAmount,
    );
    const resourceRegen = pickRegen(
      inCombat,
      blueprint.resourceRegenTicks,
      blueprint.resourceRegenAmount,
      blueprint.outOfCombatResourceRegenTicks,
      blueprint.outOfCombatResourceRegenAmount,
    );

    if (
      healthRegen.ticks > 0 &&
      healthRegen.amount > 0 &&
      currentTick >= nextHealthRegenTick
    ) {
      health = clampToMaximum(health + healthRegen.amount, blueprint.maxHealth);
      nextHealthRegenTick = currentTick + healthRegen.ticks;
    }

    if (
      resourceRegen.ticks > 0 &&
      resourceRegen.amount > 0 &&
      currentTick >= nextResourceRegenTick
    ) {
      resource = clampToMaximum(
        resource + resourceRegen.amount,
        blueprint.maxResource,
      );
      nextResourceRegenTick = currentTick + resourceRegen.ticks;
    }

    const conditionsChanged =
      activeConditions.length !== actor.activeConditions.length ||
      activeConditions.some(
        (entry, index) =>
          entry.conditionIndex !==
            actor.activeConditions[index]?.conditionIndex ||
          entry.expiresAtTick !== actor.activeConditions[index]?.expiresAtTick,
      );

    if (
      health !== actor.health ||
      resource !== actor.resource ||
      nextHealthRegenTick !== actor.nextHealthRegenTick ||
      nextResourceRegenTick !== actor.nextResourceRegenTick ||
      lastDamageReceivedTick !== actor.lastDamageReceivedTick ||
      conditionsChanged
    ) {
      world.update({
        ...actor,
        health,
        resource,
        nextHealthRegenTick,
        nextResourceRegenTick,
        lastDamageReceivedTick,
        activeConditions,
      });
      if (health !== healthAfterPulse || resource !== resourceAfterPulse) {
        journal.emit(currentTick as TickIndex, {
          type: 'combat/regenerated',
          entityId: actor.entityId,
          health,
          resource,
        });
      }
    }
  }
}

function reject(
  journal: EventJournal,
  tick: TickIndex,
  commandType: SimulationCommandType,
  sequence: number | null,
  code: SimulationDiagnosticCode,
): void {
  if (sequence === null) {
    return;
  }
  journal.emit(tick, {
    type: 'command/rejected',
    commandType,
    commandSequence: sequence,
    code,
  });
}

function sortedCooldowns(
  entries: readonly {
    readonly abilityIndex: number;
    readonly readyAtTick: number;
  }[],
): readonly { readonly abilityIndex: number; readonly readyAtTick: number }[] {
  return [...entries].sort(
    (left, right) => left.abilityIndex - right.abilityIndex,
  );
}

function setAbilityCooldown(
  actor: ActorState,
  abilityIndex: number,
  readyAtTick: number,
): ActorState['abilityCooldowns'] {
  const next = actor.abilityCooldowns.filter(
    (entry) => entry.abilityIndex !== abilityIndex,
  );
  next.push({ abilityIndex, readyAtTick });
  return sortedCooldowns(next);
}

/**
 * What `armor` takes off a hit.
 *
 * Canary rolls the reduction between half the armor and the whole of it; here
 * it is the three quarters that roll averages to, taken flat. The number is not
 * the point -- the absence of a draw is: a new stream, or a new call on an
 * existing one, would shift every later value and break every replay this
 * repository has, for a stat whose whole job is to be felt as a smaller number.
 */
function armorMitigation(armor: number): number {
  if (armor <= 0) {
    return 0;
  }
  return Math.trunc((armor * 3) / 4);
}

function applyDamage(
  world: MutableWorld,
  journal: EventJournal,
  tick: TickIndex,
  target: ActorState,
  sourceEntityId: EntityId,
  amount: number,
  cause: 'attack' | 'ability',
  killers: Map<number, EntityId | null>,
  blueprints: ReadonlyMap<string, ActorBlueprint>,
  conditions: readonly ScenarioConditionDefinition[],
): void {
  const targetModifiers = queryConditionModifiers(target, conditions, tick);
  const targetBlueprint = blueprints.get(target.blueprintId);
  const scaled = scaleByPermille(
    amount,
    targetModifiers.damageReceivedPermille,
  );
  const incoming = clampNonNegative(
    scaled - armorMitigation(targetBlueprint?.armor ?? 0),
  );
  let absorbed = 0;
  let resource = target.resource;
  if (targetModifiers.manaShield && incoming > 0 && resource > 0) {
    absorbed = incoming < resource ? incoming : resource;
    resource -= absorbed;
  }
  const healthDamage = incoming - absorbed;
  const remaining = clampNonNegative(target.health - healthDamage);
  const applied = target.health - remaining;
  const lastDamageReceivedTick =
    applied > 0 || absorbed > 0
      ? tick === 0
        ? 1
        : tick
      : target.lastDamageReceivedTick;
  world.update({
    ...target,
    health: remaining,
    resource,
    lastDamageReceivedTick,
  });
  if (remaining === 0 && !killers.has(target.entityId)) {
    killers.set(target.entityId, sourceEntityId);
  }
  journal.emit(tick, {
    type: 'combat/damaged',
    entityId: target.entityId,
    sourceEntityId,
    amount: incoming,
    remainingHealth: remaining,
    cause,
  });
  if (applied <= 0) {
    return;
  }

  const source = world.actor(sourceEntityId);
  if (source === undefined) {
    return;
  }
  const sourceBlueprint = blueprints.get(source.blueprintId);
  if (sourceBlueprint === undefined) {
    return;
  }
  const nextHealth = clampToMaximum(
    source.health + permilleOf(applied, sourceBlueprint.lifeLeechPermille),
    sourceBlueprint.maxHealth,
  );
  const nextResource = clampToMaximum(
    source.resource + permilleOf(applied, sourceBlueprint.manaLeechPermille),
    sourceBlueprint.maxResource,
  );
  const healthAmount = nextHealth - source.health;
  const resourceAmount = nextResource - source.resource;
  if (healthAmount === 0 && resourceAmount === 0) {
    return;
  }
  world.update({ ...source, health: nextHealth, resource: nextResource });
  journal.emit(tick, {
    type: 'combat/leeched',
    entityId: source.entityId,
    sourceEntityId: target.entityId,
    healthAmount,
    resourceAmount,
    health: nextHealth,
    resource: nextResource,
  });
}

function applyHeal(
  world: MutableWorld,
  journal: EventJournal,
  tick: TickIndex,
  target: ActorState,
  sourceEntityId: EntityId,
  rolled: number,
  maxHealth: number,
): void {
  const health = target.health + rolled;
  const nextHealth = health < maxHealth ? health : maxHealth;
  const amount = nextHealth - target.health;
  world.update({ ...target, health: nextHealth });
  journal.emit(tick, {
    type: 'combat/healed',
    entityId: target.entityId,
    sourceEntityId,
    amount,
    health: nextHealth,
  });
}

function resolveAttack(
  world: MutableWorld,
  grid: StaticGrid,
  journal: EventJournal,
  streams: { readonly combat: RandomSource },
  blueprints: ReadonlyMap<string, ActorBlueprint>,
  conditions: readonly ScenarioConditionDefinition[],
  tick: TickIndex,
  intent: Extract<CombatIntent, { kind: 'attack' }>,
  killers: Map<number, EntityId | null>,
): void {
  const attacker = world.actor(intent.entityId);
  if (attacker === undefined) {
    return;
  }
  const blueprint = blueprints.get(attacker.blueprintId);
  if (blueprint === undefined) {
    return;
  }
  if (tick < attacker.attackReadyAtTick) {
    reject(
      journal,
      tick,
      'actor/attack',
      intent.sequence,
      'SIM_ATTACK_ON_COOLDOWN',
    );
    return;
  }
  const target = world.actor(intent.targetEntityId);
  if (target === undefined) {
    reject(
      journal,
      tick,
      'actor/attack',
      intent.sequence,
      'SIM_TARGET_UNKNOWN',
    );
    return;
  }
  if (target.entityId === attacker.entityId) {
    reject(
      journal,
      tick,
      'actor/attack',
      intent.sequence,
      'SIM_TARGET_SAME_FACTION',
    );
    return;
  }
  const targetBlueprint = blueprints.get(target.blueprintId);
  if (targetBlueprint === undefined) {
    reject(
      journal,
      tick,
      'actor/attack',
      intent.sequence,
      'SIM_TARGET_UNKNOWN',
    );
    return;
  }
  if (targetBlueprint.factionId === blueprint.factionId) {
    reject(
      journal,
      tick,
      'actor/attack',
      intent.sequence,
      'SIM_TARGET_SAME_FACTION',
    );
    return;
  }
  if (
    !inRange(attacker.position, target.position, blueprint.attackRangeTiles)
  ) {
    reject(
      journal,
      tick,
      'actor/attack',
      intent.sequence,
      'SIM_ATTACK_OUT_OF_RANGE',
    );
    return;
  }
  if (!isSightClear(grid, attacker.position, target.position)) {
    reject(
      journal,
      tick,
      'actor/attack',
      intent.sequence,
      'SIM_ATTACK_OUT_OF_RANGE',
    );
    return;
  }

  const freshAttacker = world.actor(attacker.entityId);
  const freshTarget = world.actor(target.entityId);
  if (freshAttacker === undefined || freshTarget === undefined) {
    return;
  }
  const amount = scaleByPermille(
    rollClosedRange(
      streams.combat,
      blueprint.attackMinDamage,
      blueprint.attackMaxDamage,
    ),
    outgoingDamagePermille(
      blueprint,
      blueprint.attackElement,
      queryConditionModifiers(freshAttacker, conditions, tick),
    ),
  );
  world.update({
    ...freshAttacker,
    attackReadyAtTick: tick + blueprint.attackCooldownTicks,
  });
  journal.emit(tick, {
    type: 'combat/attacked',
    entityId: attacker.entityId,
    targetEntityId: target.entityId,
  });
  applyDamage(
    world,
    journal,
    tick,
    freshTarget,
    attacker.entityId,
    amount,
    'attack',
    killers,
    blueprints,
    conditions,
  );
}

function abilityOf(
  scenarioAbilities: readonly AbilityDefinition[],
  blueprint: ActorBlueprint,
  abilityIndex: number,
): AbilityDefinition | undefined {
  if (!blueprint.abilityIndices.includes(abilityIndex)) {
    return undefined;
  }
  return scenarioAbilities[abilityIndex];
}

function groupReadyAt(actor: ActorState, groupIndex: number): number {
  for (const entry of actor.groupCooldowns) {
    if (entry.groupIndex === groupIndex) {
      return entry.readyAtTick;
    }
  }
  return 0;
}

function setGroupCooldown(
  groupCooldowns: ActorState['groupCooldowns'],
  groupIndex: number,
  readyAtTick: number,
): ActorState['groupCooldowns'] {
  const next = groupCooldowns.filter(
    (entry) => entry.groupIndex !== groupIndex,
  );
  next.push({ groupIndex, readyAtTick });
  next.sort((left, right) => left.groupIndex - right.groupIndex);
  return next;
}

function abilityGroupCooldowns(
  actor: ActorState,
  ability: AbilityDefinition,
  tick: number,
): ActorState['groupCooldowns'] {
  let groups = setGroupCooldown(
    actor.groupCooldowns,
    ability.primaryCooldownGroup,
    tick + ability.groupCooldownTicks,
  );
  if (ability.secondaryCooldownGroup !== null) {
    groups = setGroupCooldown(
      groups,
      ability.secondaryCooldownGroup,
      tick + ability.secondaryGroupCooldownTicks,
    );
  }
  return groups;
}

export function abilityOnCooldown(
  actor: ActorState,
  ability: AbilityDefinition,
  abilityIndex: number,
  tick: number,
): boolean {
  if (tick < groupReadyAt(actor, ability.primaryCooldownGroup)) {
    return true;
  }
  if (
    ability.secondaryCooldownGroup !== null &&
    tick < groupReadyAt(actor, ability.secondaryCooldownGroup)
  ) {
    return true;
  }
  return actor.abilityCooldowns.some(
    (entry) => entry.abilityIndex === abilityIndex && tick < entry.readyAtTick,
  );
}

function validEffectTarget(
  source: ActorState,
  sourceFaction: number,
  candidate: ActorState,
  candidateFaction: number,
  effect: AbilityDefinition['effect'],
): boolean {
  if (effect === 'heal') {
    return candidateFaction === sourceFaction;
  }
  return (
    candidate.entityId !== source.entityId && candidateFaction !== sourceFaction
  );
}

function collectAreaTargets(
  world: MutableWorld,
  blueprints: ReadonlyMap<string, ActorBlueprint>,
  origin: GridPosition,
  radius: number,
  caster: ActorState,
  casterFaction: number,
  effect: AbilityDefinition['effect'],
  facingCone: ActorState['facing'] | null,
): ActorState[] {
  return world
    .actors()
    .filter((candidate) => {
      const candidateBlueprint = blueprints.get(candidate.blueprintId);
      if (candidateBlueprint === undefined) {
        return false;
      }
      if (!inRange(origin, candidate.position, radius)) {
        return false;
      }
      if (
        facingCone !== null &&
        !inFacingCone(origin, candidate.position, facingCone, radius)
      ) {
        return false;
      }
      return validEffectTarget(
        caster,
        casterFaction,
        candidate,
        candidateBlueprint.factionId,
        effect,
      );
    })
    .sort((left, right) => left.entityId - right.entityId);
}

function applyForcedTarget(
  world: MutableWorld,
  journal: EventJournal,
  tick: TickIndex,
  casterEntityId: EntityId,
  targets: readonly ActorState[],
  durationTicks: number,
): void {
  const expiresAtTick = tick + durationTicks;
  for (const target of targets) {
    const live = world.actor(target.entityId);
    if (live === undefined) {
      continue;
    }
    const previousTarget = live.targetEntityId;
    world.update({
      ...live,
      targetEntityId: casterEntityId,
      forcedTargetEntityId: casterEntityId,
      forcedTargetExpiresAtTick: expiresAtTick,
    });
    if (previousTarget !== casterEntityId) {
      journal.emit(tick, {
        type: 'combat/target-changed',
        entityId: live.entityId,
        targetEntityId: casterEntityId,
      });
    }
  }
}

function resolveCast(
  world: MutableWorld,
  journal: EventJournal,
  streams: { readonly combat: RandomSource },
  blueprints: ReadonlyMap<string, ActorBlueprint>,
  abilities: readonly AbilityDefinition[],
  conditions: readonly ScenarioConditionDefinition[],
  tick: TickIndex,
  intent: Extract<CombatIntent, { kind: 'cast' }>,
  killers: Map<number, EntityId | null>,
): void {
  const caster = world.actor(intent.entityId);
  if (caster === undefined) {
    return;
  }
  const blueprint = blueprints.get(caster.blueprintId);
  if (blueprint === undefined) {
    return;
  }
  const ability = abilityOf(abilities, blueprint, intent.abilityIndex);
  if (ability === undefined) {
    reject(
      journal,
      tick,
      'actor/cast-ability',
      intent.sequence,
      'SIM_ABILITY_UNKNOWN',
    );
    return;
  }
  if (abilityOnCooldown(caster, ability, intent.abilityIndex, tick)) {
    reject(
      journal,
      tick,
      'actor/cast-ability',
      intent.sequence,
      'SIM_ABILITY_ON_COOLDOWN',
    );
    return;
  }

  const togglingOff =
    ability.toggle &&
    ability.appliedConditionIndex !== null &&
    hasActiveCondition(caster, ability.appliedConditionIndex, tick);
  if (togglingOff && ability.appliedConditionIndex !== null) {
    const liveCaster = world.actor(caster.entityId);
    if (liveCaster === undefined) {
      return;
    }
    world.update({
      ...liveCaster,
      activeConditions: removeCondition(
        liveCaster,
        ability.appliedConditionIndex,
      ),
      groupCooldowns: abilityGroupCooldowns(liveCaster, ability, tick),
      abilityCooldowns: setAbilityCooldown(
        liveCaster,
        intent.abilityIndex,
        tick + ability.cooldownTicks,
      ),
    });
    journal.emit(tick, {
      type: 'ability/cast',
      entityId: caster.entityId,
      abilityIndex: intent.abilityIndex,
      targetEntityId: intent.targetEntityId,
    });
    return;
  }

  if (caster.resource < ability.resourceCost) {
    reject(
      journal,
      tick,
      'actor/cast-ability',
      intent.sequence,
      'SIM_ABILITY_NO_RESOURCE',
    );
    return;
  }

  let targets: ActorState[] = [];
  if (ability.shape === 'self') {
    if (
      validEffectTarget(
        caster,
        blueprint.factionId,
        caster,
        blueprint.factionId,
        ability.effect,
      )
    ) {
      targets = [caster];
    }
  } else if (ability.shape === 'target' || ability.shape === 'target-area') {
    if (intent.targetEntityId === null) {
      reject(
        journal,
        tick,
        'actor/cast-ability',
        intent.sequence,
        'SIM_TARGET_UNKNOWN',
      );
      return;
    }
    const target = world.actor(intent.targetEntityId);
    if (target === undefined) {
      reject(
        journal,
        tick,
        'actor/cast-ability',
        intent.sequence,
        'SIM_TARGET_UNKNOWN',
      );
      return;
    }
    const targetBlueprint = blueprints.get(target.blueprintId);
    if (targetBlueprint === undefined) {
      reject(
        journal,
        tick,
        'actor/cast-ability',
        intent.sequence,
        'SIM_TARGET_UNKNOWN',
      );
      return;
    }
    if (
      !validEffectTarget(
        caster,
        blueprint.factionId,
        target,
        targetBlueprint.factionId,
        ability.effect,
      )
    ) {
      reject(
        journal,
        tick,
        'actor/cast-ability',
        intent.sequence,
        ability.effect === 'heal'
          ? 'SIM_TARGET_UNKNOWN'
          : 'SIM_TARGET_SAME_FACTION',
      );
      return;
    }
    if (!inRange(caster.position, target.position, ability.rangeTiles)) {
      reject(
        journal,
        tick,
        'actor/cast-ability',
        intent.sequence,
        'SIM_ABILITY_OUT_OF_RANGE',
      );
      return;
    }
    targets =
      ability.shape === 'target'
        ? [target]
        : collectAreaTargets(
            world,
            blueprints,
            target.position,
            ability.radius,
            caster,
            blueprint.factionId,
            ability.effect,
            null,
          );
  } else if (ability.shape === 'cone') {
    targets = collectAreaTargets(
      world,
      blueprints,
      caster.position,
      ability.radius,
      caster,
      blueprint.factionId,
      ability.effect,
      caster.facing,
    );
  } else {
    targets = collectAreaTargets(
      world,
      blueprints,
      caster.position,
      ability.radius,
      caster,
      blueprint.factionId,
      ability.effect,
      null,
    );
  }

  const spent = world.actor(caster.entityId);
  if (spent === undefined) {
    return;
  }
  let nextConditions = spent.activeConditions;
  if (ability.appliedConditionIndex !== null) {
    const definition = conditions[ability.appliedConditionIndex];
    if (definition !== undefined) {
      nextConditions = applyCondition(
        spent,
        definition,
        ability.appliedConditionIndex,
        tick,
      );
    }
  }
  world.update({
    ...spent,
    resource: spent.resource - ability.resourceCost,
    groupCooldowns: abilityGroupCooldowns(spent, ability, tick),
    abilityCooldowns: setAbilityCooldown(
      spent,
      intent.abilityIndex,
      tick + ability.cooldownTicks,
    ),
    activeConditions: nextConditions,
  });
  journal.emit(tick, {
    type: 'ability/cast',
    entityId: caster.entityId,
    abilityIndex: intent.abilityIndex,
    targetEntityId: intent.targetEntityId,
  });

  if (ability.forcedTargetDurationTicks > 0) {
    applyForcedTarget(
      world,
      journal,
      tick,
      caster.entityId,
      targets,
      ability.forcedTargetDurationTicks,
    );
  }

  if (ability.minPower === 0 && ability.maxPower === 0) {
    return;
  }

  for (const target of targets) {
    const live = world.actor(target.entityId);
    if (live === undefined) {
      continue;
    }
    const liveBlueprint = blueprints.get(live.blueprintId);
    if (liveBlueprint === undefined) {
      continue;
    }
    const rolled = rollClosedRange(
      streams.combat,
      ability.minPower,
      ability.maxPower,
    );
    if (ability.effect === 'heal') {
      applyHeal(
        world,
        journal,
        tick,
        live,
        caster.entityId,
        rolled,
        liveBlueprint.maxHealth,
      );
    } else {
      const liveCaster = world.actor(caster.entityId) ?? spent;
      const power = scaleByPermille(
        rolled,
        outgoingDamagePermille(
          blueprint,
          ability.element,
          queryConditionModifiers(liveCaster, conditions, tick),
        ),
      );
      applyDamage(
        world,
        journal,
        tick,
        live,
        caster.entityId,
        power,
        'ability',
        killers,
        blueprints,
        conditions,
      );
    }
  }
}

export function resolveCombat(
  world: MutableWorld,
  grid: StaticGrid,
  journal: EventJournal,
  streams: { readonly combat: RandomSource },
  blueprints: ReadonlyMap<string, ActorBlueprint>,
  abilities: readonly AbilityDefinition[],
  conditions: readonly ScenarioConditionDefinition[],
  tick: TickIndex,
  intents: readonly CombatIntent[],
  killers: Map<number, EntityId | null>,
): void {
  for (const intent of [...intents].sort(compareCombatIntents)) {
    if (intent.kind === 'attack') {
      resolveAttack(
        world,
        grid,
        journal,
        streams,
        blueprints,
        conditions,
        tick,
        intent,
        killers,
      );
    } else {
      resolveCast(
        world,
        journal,
        streams,
        blueprints,
        abilities,
        conditions,
        tick,
        intent,
        killers,
      );
    }
  }
}

export function resolveDeath(
  world: MutableWorld,
  journal: EventJournal,
  tick: TickIndex,
  killers: ReadonlyMap<number, EntityId | null>,
  releaseSpawnSlot: (entityId: EntityId, tick: number) => void,
  lootStream: RandomSource,
  blueprints: ReadonlyMap<string, ActorBlueprint>,
  lootTables: readonly LootTableDefinition[],
): void {
  const dying = world
    .actors()
    .filter((actor) => actor.health <= 0)
    .sort((left, right) => left.entityId - right.entityId);

  for (const actor of dying) {
    const position = actor.position;
    const entityId = actor.entityId;
    const killerEntityId = killers.get(entityId) ?? null;
    world.remove(entityId);
    releaseSpawnSlot(entityId, tick);
    journal.emit(tick, {
      type: 'actor/died',
      entityId,
      killerEntityId,
      position,
    });
    resolveLoot(
      journal,
      lootStream,
      tick,
      actor,
      killerEntityId,
      blueprints,
      lootTables,
    );
  }
}
