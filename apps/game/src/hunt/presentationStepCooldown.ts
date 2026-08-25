import type {
  ActorState,
  ScenarioConditionDefinition,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';
import {
  effectiveStepCooldownTicks,
  queryConditionModifiers,
} from '../../../../packages/simulation/src/index.ts';

export function presentationStepCooldownTicks(input: {
  readonly baseTicks: number;
  readonly actor: ActorState | undefined;
  readonly conditions: readonly ScenarioConditionDefinition[];
  readonly tick: TickIndex;
}): number {
  if (input.actor === undefined) {
    return input.baseTicks;
  }
  return effectiveStepCooldownTicks(
    input.baseTicks,
    queryConditionModifiers(input.actor, input.conditions, input.tick)
      .speedPermille,
  );
}
