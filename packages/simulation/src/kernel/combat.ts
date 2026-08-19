import type {
  AbilityDefinition,
  ActorBlueprint,
  ActorState,
  EntityId,
  GridPosition,
  LootTableDefinition,
  SimulationCommandType,
  SimulationDiagnosticCode,
  TickIndex,
} from '@huntbound/contracts';
import type { EventJournal } from '../events/journal.ts';
import { chebyshevDistance } from '../grid/directions.ts';
import type { RandomSource } from '../random/source.ts';
import type { MutableWorld } from '../state/worldState.ts';
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

function clampNonNegative(value: number): number {
  return value < 0 ? 0 : value;
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
  currentTick: number,
  journal: EventJournal,
): void {
  for (const actor of world.actors()) {
    const blueprint = blueprints.get(actor.blueprintId);
    if (blueprint === undefined) {
      continue;
    }

    let { health, resource, nextHealthRegenTick, nextResourceRegenTick } =
      actor;

    if (
      blueprint.healthRegenTicks > 0 &&
      blueprint.healthRegenAmount > 0 &&
      currentTick >= nextHealthRegenTick
    ) {
      const healed = health + blueprint.healthRegenAmount;
      health = healed < blueprint.maxHealth ? healed : blueprint.maxHealth;
      nextHealthRegenTick = currentTick + blueprint.healthRegenTicks;
    }

    if (
      blueprint.resourceRegenTicks > 0 &&
      blueprint.resourceRegenAmount > 0 &&
      currentTick >= nextResourceRegenTick
    ) {
      const restored = resource + blueprint.resourceRegenAmount;
      resource =
        restored < blueprint.maxResource ? restored : blueprint.maxResource;
      nextResourceRegenTick = currentTick + blueprint.resourceRegenTicks;
    }

    if (
      health !== actor.health ||
      resource !== actor.resource ||
      nextHealthRegenTick !== actor.nextHealthRegenTick ||
      nextResourceRegenTick !== actor.nextResourceRegenTick
    ) {
      world.update({
        ...actor,
        health,
        resource,
        nextHealthRegenTick,
        nextResourceRegenTick,
      });
      if (health !== actor.health || resource !== actor.resource) {
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

function applyDamage(
  world: MutableWorld,
  journal: EventJournal,
  tick: TickIndex,
  target: ActorState,
  sourceEntityId: EntityId,
  amount: number,
  cause: 'attack' | 'ability',
  killers: Map<number, EntityId | null>,
): void {
  const remaining = clampNonNegative(target.health - amount);
  world.update({ ...target, health: remaining });
  if (remaining === 0 && !killers.has(target.entityId)) {
    killers.set(target.entityId, sourceEntityId);
  }
  journal.emit(tick, {
    type: 'combat/damaged',
    entityId: target.entityId,
    sourceEntityId,
    amount,
    remainingHealth: remaining,
    cause,
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
  journal: EventJournal,
  streams: { readonly combat: RandomSource },
  blueprints: ReadonlyMap<string, ActorBlueprint>,
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
  if (!inRange(attacker.position, target.position, 1)) {
    reject(
      journal,
      tick,
      'actor/attack',
      intent.sequence,
      'SIM_ATTACK_OUT_OF_RANGE',
    );
    return;
  }

  const amount = rollClosedRange(
    streams.combat,
    blueprint.attackMinDamage,
    blueprint.attackMaxDamage,
  );
  const freshAttacker = world.actor(attacker.entityId);
  const freshTarget = world.actor(target.entityId);
  if (freshAttacker === undefined || freshTarget === undefined) {
    return;
  }
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

function abilityOnCooldown(
  actor: ActorState,
  abilityIndex: number,
  tick: number,
): boolean {
  if (tick < actor.groupReadyAtTick) {
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

function resolveCast(
  world: MutableWorld,
  journal: EventJournal,
  streams: { readonly combat: RandomSource },
  blueprints: ReadonlyMap<string, ActorBlueprint>,
  abilities: readonly AbilityDefinition[],
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
  if (abilityOnCooldown(caster, intent.abilityIndex, tick)) {
    reject(
      journal,
      tick,
      'actor/cast-ability',
      intent.sequence,
      'SIM_ABILITY_ON_COOLDOWN',
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
  } else if (ability.shape === 'target') {
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
    targets = [target];
  } else {
    targets = world
      .actors()
      .filter((candidate) => {
        const candidateBlueprint = blueprints.get(candidate.blueprintId);
        if (candidateBlueprint === undefined) {
          return false;
        }
        if (!inRange(caster.position, candidate.position, ability.radius)) {
          return false;
        }
        return validEffectTarget(
          caster,
          blueprint.factionId,
          candidate,
          candidateBlueprint.factionId,
          ability.effect,
        );
      })
      .sort((left, right) => left.entityId - right.entityId);
  }

  const spent = world.actor(caster.entityId);
  if (spent === undefined) {
    return;
  }
  world.update({
    ...spent,
    resource: spent.resource - ability.resourceCost,
    groupReadyAtTick: tick + ability.groupCooldownTicks,
    abilityCooldowns: setAbilityCooldown(
      spent,
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

  for (const target of targets) {
    const live = world.actor(target.entityId);
    if (live === undefined) {
      continue;
    }
    const liveBlueprint = blueprints.get(live.blueprintId);
    if (liveBlueprint === undefined) {
      continue;
    }
    const power = rollClosedRange(
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
        power,
        liveBlueprint.maxHealth,
      );
    } else {
      applyDamage(
        world,
        journal,
        tick,
        live,
        caster.entityId,
        power,
        'ability',
        killers,
      );
    }
  }
}

export function resolveCombat(
  world: MutableWorld,
  journal: EventJournal,
  streams: { readonly combat: RandomSource },
  blueprints: ReadonlyMap<string, ActorBlueprint>,
  abilities: readonly AbilityDefinition[],
  tick: TickIndex,
  intents: readonly CombatIntent[],
  killers: Map<number, EntityId | null>,
): void {
  for (const intent of [...intents].sort(compareCombatIntents)) {
    if (intent.kind === 'attack') {
      resolveAttack(world, journal, streams, blueprints, tick, intent, killers);
    } else {
      resolveCast(
        world,
        journal,
        streams,
        blueprints,
        abilities,
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
