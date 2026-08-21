import { describe, expect, it } from 'vitest';

import type {
  AbilityDefinition,
  EntityId,
  SimulationCommand,
} from '../../../../packages/contracts/src/index.ts';

import {
  type CombatInputContext,
  combatCommandForAction,
} from './HuntCombatInput';

const abilityV5Defaults = {
  element: 'physical' as const,
  primaryCooldownGroup: 0,
  secondaryCooldownGroup: null,
  secondaryGroupCooldownTicks: 0,
  appliedConditionIndex: null,
  maxCharges: null,
  rechargeKind: 'none' as const,
  toggle: false,
};

const abilities: readonly AbilityDefinition[] = [
  {
    abilityId: 'berserk',
    effect: 'damage',
    shape: 'area',
    radius: 1,
    rangeTiles: 0,
    resourceCost: 115,
    cooldownTicks: 80,
    groupCooldownTicks: 40,
    minPower: 14,
    maxPower: 41,
    ...abilityV5Defaults,
  },
  {
    abilityId: 'brutal-strike',
    effect: 'damage',
    shape: 'target',
    radius: 0,
    rangeTiles: 1,
    resourceCost: 30,
    cooldownTicks: 120,
    groupCooldownTicks: 40,
    minPower: 10,
    maxPower: 20,
    ...abilityV5Defaults,
  },
  {
    abilityId: 'wound-cleansing',
    effect: 'heal',
    shape: 'self',
    radius: 0,
    rangeTiles: 0,
    resourceCost: 40,
    cooldownTicks: 20,
    groupCooldownTicks: 20,
    minPower: 26,
    maxPower: 52,
    ...abilityV5Defaults,
  },
];

const context: CombatInputContext = {
  playerEntityId: 1 as EntityId,
  targetEntityId: 2 as EntityId,
  abilities,
};

describe('HuntCombatInput', () => {
  it('does not create a target-spell command without a selected target', () => {
    expect(
      combatCommandForAction(
        { kind: 'cast-ability', abilityIndex: 1 },
        { ...context, targetEntityId: null },
      ),
    ).toBeUndefined();
  });

  it('creates a target-spell command for the current target', () => {
    expect(
      combatCommandForAction(
        { kind: 'cast-ability', abilityIndex: 1 },
        context,
      ),
    ).toEqual({
      type: 'actor/cast-ability',
      entityId: 1 as EntityId,
      abilityIndex: 1,
      targetEntityId: 2 as EntityId,
    } satisfies SimulationCommand);
  });

  it('keeps self and area abilities targetless while preserving the selected target', () => {
    expect(
      combatCommandForAction(
        { kind: 'cast-ability', abilityIndex: 0 },
        context,
      ),
    ).toMatchObject({
      type: 'actor/cast-ability',
      targetEntityId: null,
    });
    expect(
      combatCommandForAction(
        { kind: 'cast-ability', abilityIndex: 2 },
        context,
      ),
    ).toMatchObject({
      type: 'actor/cast-ability',
      targetEntityId: null,
    });
  });
});
