import type {
  ActiveConditionState,
  ActorState,
  ScenarioConditionDefinition,
} from '@huntbound/contracts';

export interface ConditionModifiers {
  readonly damageDealtPermille: number;
  readonly damageReceivedPermille: number;
  readonly speedPermille: number;
  readonly manaShield: boolean;
  skillModifierPermille(skillIndex: number): number;
}

export function isConditionLiving(
  entry: ActiveConditionState,
  tick: number,
): boolean {
  return entry.expiresAtTick === 0 || tick < entry.expiresAtTick;
}

export function scaleByPermille(value: number, permilleDelta: number): number {
  if (value === 0 || permilleDelta === 0) {
    return value;
  }
  const scaled = Math.trunc((value * (1000 + permilleDelta)) / 1000);
  return scaled < 0 ? 0 : scaled;
}

export function effectiveStepCooldownTicks(
  baseTicks: number,
  speedPermille: number,
): number {
  if (baseTicks <= 0) {
    return 0;
  }
  const denominator = Math.max(1, 1000 + speedPermille);
  const scaled = Math.trunc((baseTicks * 1000) / denominator);
  return scaled < 1 ? 1 : scaled;
}

export function queryConditionModifiers(
  actor: ActorState,
  definitions: readonly ScenarioConditionDefinition[],
  tick: number,
): ConditionModifiers {
  let damageDealtPermille = 0;
  let damageReceivedPermille = 0;
  let speedPermille = 0;
  let manaShield = false;
  const skillByIndex = new Map<number, number>();

  for (const entry of actor.activeConditions) {
    if (!isConditionLiving(entry, tick)) {
      continue;
    }
    const definition = definitions[entry.conditionIndex];
    if (definition === undefined) {
      continue;
    }
    damageDealtPermille += definition.damageDealtPermille;
    damageReceivedPermille += definition.damageReceivedPermille;
    speedPermille += definition.speedPermille;
    if (definition.manaShield) {
      manaShield = true;
    }
    if (definition.skillIndex !== null) {
      skillByIndex.set(
        definition.skillIndex,
        (skillByIndex.get(definition.skillIndex) ?? 0) +
          definition.skillModifierPermille,
      );
    }
  }

  return {
    damageDealtPermille,
    damageReceivedPermille,
    speedPermille,
    manaShield,
    skillModifierPermille: (skillIndex) => skillByIndex.get(skillIndex) ?? 0,
  };
}

function sortActiveConditions(
  entries: readonly ActiveConditionState[],
): ActiveConditionState[] {
  return [...entries].sort(
    (left, right) => left.conditionIndex - right.conditionIndex,
  );
}

export function hasActiveCondition(
  actor: ActorState,
  conditionIndex: number,
  tick: number,
): boolean {
  return actor.activeConditions.some(
    (entry) =>
      entry.conditionIndex === conditionIndex && isConditionLiving(entry, tick),
  );
}

export function removeCondition(
  actor: ActorState,
  conditionIndex: number,
): readonly ActiveConditionState[] {
  return actor.activeConditions.filter(
    (entry) => entry.conditionIndex !== conditionIndex,
  );
}

export function applyCondition(
  actor: ActorState,
  definition: ScenarioConditionDefinition,
  conditionIndex: number,
  tick: number,
): readonly ActiveConditionState[] {
  const expiresAtTick =
    definition.durationTicks === 0 ? 0 : tick + definition.durationTicks;
  const kept = actor.activeConditions.filter((entry) => {
    if (entry.conditionIndex === conditionIndex) {
      return false;
    }
    return !(
      definition.exclusivityGroup !== null &&
      entry.exclusivityGroup === definition.exclusivityGroup
    );
  });
  kept.push({
    conditionIndex,
    expiresAtTick,
    exclusivityGroup: definition.exclusivityGroup,
  });
  return sortActiveConditions(kept);
}

export function expireConditions(
  actor: ActorState,
  tick: number,
): readonly ActiveConditionState[] {
  return actor.activeConditions.filter((entry) =>
    isConditionLiving(entry, tick),
  );
}

export function tickDamageFor(
  actor: ActorState,
  definitions: readonly ScenarioConditionDefinition[],
  tick: number,
): number {
  let total = 0;
  for (const entry of actor.activeConditions) {
    if (!isConditionLiving(entry, tick)) {
      continue;
    }
    const definition = definitions[entry.conditionIndex];
    if (definition === undefined) {
      continue;
    }
    if (
      definition.tickDamageAmount <= 0 ||
      definition.tickDamageIntervalTicks <= 0 ||
      entry.expiresAtTick === 0
    ) {
      continue;
    }
    const appliedAtTick = entry.expiresAtTick - definition.durationTicks;
    const elapsed = tick - appliedAtTick;
    if (elapsed <= 0) {
      continue;
    }
    if (elapsed % definition.tickDamageIntervalTicks === 0) {
      total += definition.tickDamageAmount;
    }
  }
  return total;
}
