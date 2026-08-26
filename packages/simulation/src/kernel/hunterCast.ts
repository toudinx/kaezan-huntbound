import type {
  AbilityDefinition,
  ActorBlueprint,
  ActorState,
  EntityId,
} from '@huntbound/contracts';

import { chebyshevDistance } from '../grid/directions.ts';
import { abilityOnCooldown } from './combat.ts';

export const ABILITY_CHANCE_BASIS_POINTS = 10_000;

export interface HunterCastChoice {
  readonly abilityIndex: number;
  readonly targetEntityId: EntityId | null;
}

export function chooseHunterCast(
  actor: ActorState,
  blueprint: ActorBlueprint,
  abilities: readonly AbilityDefinition[],
  actors: readonly ActorState[],
  actorBlueprint: (blueprintId: string) => ActorBlueprint | undefined,
  targetId: EntityId | null,
  tick: number,
  rollChance: () => number,
): HunterCastChoice | null {
  if (blueprint.abilityIndices.length === 0) {
    return null;
  }

  const maxHealth = blueprint.maxHealth;
  for (const abilityIndex of blueprint.abilityIndices) {
    const ability = abilities[abilityIndex];
    if (ability === undefined) {
      continue;
    }
    if (abilityOnCooldown(actor, ability, abilityIndex, tick)) {
      continue;
    }
    const targetEntityId = eligibleCastTarget(
      actor,
      blueprint,
      ability,
      actors,
      actorBlueprint,
      targetId,
      maxHealth,
    );
    if (targetEntityId === undefined) {
      continue;
    }
    const chance = ability.chanceBasisPoints ?? ABILITY_CHANCE_BASIS_POINTS;
    if (rollChance() >= chance) {
      continue;
    }
    return { abilityIndex, targetEntityId };
  }
  return null;
}

function eligibleCastTarget(
  actor: ActorState,
  blueprint: ActorBlueprint,
  ability: AbilityDefinition,
  actors: readonly ActorState[],
  actorBlueprint: (blueprintId: string) => ActorBlueprint | undefined,
  targetId: EntityId | null,
  maxHealth: number,
): EntityId | null | undefined {
  if (ability.shape === 'self') {
    if (ability.effect === 'heal' && actor.health >= maxHealth) {
      return undefined;
    }
    return null;
  }
  if (ability.shape === 'target') {
    if (targetId === null) {
      return undefined;
    }
    const target = actors.find((candidate) => candidate.entityId === targetId);
    if (target === undefined) {
      return undefined;
    }
    if (target.position.z !== actor.position.z) {
      return undefined;
    }
    if (
      chebyshevDistance(actor.position, target.position) > ability.rangeTiles
    ) {
      return undefined;
    }
    const targetBlueprint = actorBlueprint(target.blueprintId);
    if (
      targetBlueprint === undefined ||
      targetBlueprint.factionId === blueprint.factionId
    ) {
      return undefined;
    }
    return targetId;
  }

  for (const candidate of actors) {
    if (candidate.entityId === actor.entityId) {
      continue;
    }
    if (candidate.position.z !== actor.position.z) {
      continue;
    }
    if (
      chebyshevDistance(actor.position, candidate.position) > ability.radius
    ) {
      continue;
    }
    const candidateBlueprint = actorBlueprint(candidate.blueprintId);
    if (
      candidateBlueprint === undefined ||
      candidateBlueprint.factionId === blueprint.factionId
    ) {
      continue;
    }
    return null;
  }
  return undefined;
}
