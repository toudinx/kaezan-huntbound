import { describe, expect, it } from 'vitest';

import type {
  ActorState,
  EntityId,
  ScenarioConditionDefinition,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';

import { presentationStepCooldownTicks } from './presentationStepCooldown';

const hasteCondition: ScenarioConditionDefinition = {
  conditionId: 'haste',
  exclusivityGroup: null,
  durationTicks: 600,
  skillIndex: null,
  skillModifierPermille: 0,
  damageDealtPermille: 0,
  damageReceivedPermille: 0,
  speedPermille: 600,
  manaShield: false,
  tickDamageAmount: 0,
  tickDamageIntervalTicks: 0,
  elementBonusPermille: 0,
  convertNextAbilityElement: false,
  bonusElement: null,
};

function actor(activeConditions: ActorState['activeConditions']): ActorState {
  return {
    entityId: 1 as EntityId,
    blueprintId: 'player',
    position: { x: 0, y: 0, z: 8 },
    facing: 's',
    readyAtTick: 0,
    transitionGuard: null,
    health: 1,
    resource: 0,
    targetEntityId: null,
    attackReadyAtTick: 0,
    groupCooldowns: [],
    abilityCooldowns: [],
    nextHealthRegenTick: 0,
    nextResourceRegenTick: 0,
    lastDamageReceivedTick: 0,
    activeConditions,
    abilityCharges: [],
    forcedTargetEntityId: null,
    forcedTargetExpiresAtTick: 0,
  };
}

describe('presentationStepCooldownTicks', () => {
  it('keeps the vocation step when the actor has no speed condition', () => {
    expect(
      presentationStepCooldownTicks({
        baseTicks: 11,
        actor: actor([]),
        conditions: [hasteCondition],
        tick: 10 as TickIndex,
      }),
    ).toBe(11);
  });

  it('shortens the interpolated step to the kernel cooldown under Haste', () => {
    expect(
      presentationStepCooldownTicks({
        baseTicks: 11,
        actor: actor([
          { conditionIndex: 0, expiresAtTick: 600, exclusivityGroup: null },
        ]),
        conditions: [hasteCondition],
        tick: 10 as TickIndex,
      }),
    ).toBe(6);
  });

  it('falls back to the vocation step when the snapshot actor is missing', () => {
    expect(
      presentationStepCooldownTicks({
        baseTicks: 11,
        actor: undefined,
        conditions: [hasteCondition],
        tick: 10 as TickIndex,
      }),
    ).toBe(11);
  });
});
