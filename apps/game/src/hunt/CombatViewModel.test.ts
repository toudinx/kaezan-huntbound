import { describe, expect, it } from 'vitest';

import type {
  AbilityDefinition,
  EntityId,
  SimulationEvent,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';

import {
  type CombatViewModelOptions,
  createCombatViewModel,
  createDefaultCombatViewModel,
} from './CombatViewModel';

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

const options: CombatViewModelOptions = {
  playerEntityId: 1 as EntityId,
  playerBlueprintId: 'player',
  abilities,
  itemKeys: ['item:tibia:dead-rotworm'],
  maxHealthByBlueprint: new Map([
    ['player', 185],
    ['rotworm', 65],
  ]),
  maxResourceByBlueprint: new Map([['player', 185]]),
};

function event(
  tick: number,
  payload: SimulationEvent['payload'],
): SimulationEvent {
  return { tick: tick as TickIndex, sequence: tick, payload };
}

describe('CombatViewModel', () => {
  it('exposes five active Knight abilities in the default combat model', () => {
    const viewModel = createDefaultCombatViewModel();

    expect(
      viewModel.snapshot().abilities.map((ability) => ability.abilityId),
    ).toEqual([
      'berserk',
      'brutal-strike',
      'wound-cleansing',
      'groundshaker',
      'whirlwind-throw',
    ]);
  });

  it('restores a persisted run bag without replaying loot events', () => {
    const viewModel = createCombatViewModel(options);

    viewModel.restoreBag([
      { itemKey: 'item:tibia:gold-coin', count: 6 },
      { itemKey: 'item:tibia:meat', count: 2 },
    ]);

    expect(viewModel.snapshot().bag).toEqual([
      { itemKey: 'item:tibia:gold-coin', count: 6 },
      { itemKey: 'item:tibia:meat', count: 2 },
    ]);
  });

  it('projects health, target health, mana, cooldowns, loot and death from events', () => {
    const viewModel = createCombatViewModel(options);
    viewModel.selectTarget(2 as EntityId, [
      {
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: { x: 5, y: 5, z: 8 },
      },
      {
        entityId: 2 as EntityId,
        blueprintId: 'rotworm',
        position: { x: 6, y: 5, z: 8 },
      },
    ]);

    viewModel.handle([
      event(0, {
        type: 'actor/spawned',
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: { x: 5, y: 5, z: 8 },
        facing: 's',
      }),
      event(0, {
        type: 'actor/spawned',
        entityId: 2 as EntityId,
        blueprintId: 'rotworm',
        position: { x: 6, y: 5, z: 8 },
        facing: 'w',
      }),
      event(2, {
        type: 'combat/damaged',
        entityId: 2 as EntityId,
        sourceEntityId: 1 as EntityId,
        amount: 20,
        remainingHealth: 45,
        cause: 'attack',
      }),
      event(3, {
        type: 'combat/damaged',
        entityId: 1 as EntityId,
        sourceEntityId: 2 as EntityId,
        amount: 10,
        remainingHealth: 175,
        cause: 'attack',
      }),
      event(4, {
        type: 'combat/healed',
        entityId: 1 as EntityId,
        sourceEntityId: 1 as EntityId,
        amount: 10,
        health: 185,
      }),
      event(5, {
        type: 'ability/cast',
        entityId: 1 as EntityId,
        abilityIndex: 0,
        targetEntityId: null,
      }),
      event(6, {
        type: 'loot/granted',
        entityId: 1 as EntityId,
        sourceEntityId: 2 as EntityId,
        itemIndex: 0,
        count: 2,
      }),
      event(7, {
        type: 'actor/died',
        entityId: 1 as EntityId,
        killerEntityId: 2 as EntityId,
        position: { x: 5, y: 5, z: 8 },
      }),
    ]);

    const state = viewModel.snapshot();
    expect(state.player).toMatchObject({
      entityId: 1,
      health: 185,
      maxHealth: 185,
      resource: 70,
      maxResource: 185,
    });
    expect(state.target).toMatchObject({
      entityId: 2,
      health: 45,
      maxHealth: 65,
    });
    expect(state.abilities[0]).toMatchObject({
      index: 0,
      remainingCooldownTicks: 78,
      available: false,
    });
    expect(state.abilities[1]?.remainingCooldownTicks).toBe(38);
    expect(state.lootLog).toEqual([
      { itemKey: 'item:tibia:dead-rotworm', count: 2, tick: 6 },
    ]);
    expect(state.bag).toEqual([
      { itemKey: 'item:tibia:dead-rotworm', count: 2 },
    ]);
    expect(state.playerDead).toBe(true);
  });

  /**
   * A resumed run never replays `actor/died`, so a save written after the
   * player died came back with the hunt reporting him alive and merely absent:
   * no vitals, no sprite, and no death overlay — which is where the only
   * restart button lives. The roster the run comes up with is the answer: if it
   * names every actor and none of them is the player, he is gone.
   */
  it('reports the player dead when the restored roster does not name him', () => {
    const viewModel = createCombatViewModel(options);

    expect(viewModel.snapshot().playerDead).toBe(false);

    viewModel.handle([
      event(1400, {
        type: 'actor/spawned',
        entityId: 7 as EntityId,
        blueprintId: 'rotworm',
        position: { x: 9, y: 9, z: 8 },
        facing: 's',
      }),
    ]);

    expect(viewModel.snapshot().player).toBeNull();
    expect(viewModel.snapshot().playerDead).toBe(true);
  });

  it('leaves the player alive when the restored roster names him', () => {
    const viewModel = createCombatViewModel(options);

    viewModel.handle([
      event(1400, {
        type: 'actor/spawned',
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: { x: 5, y: 5, z: 8 },
        facing: 's',
      }),
      event(1400, {
        type: 'actor/spawned',
        entityId: 7 as EntityId,
        blueprintId: 'rotworm',
        position: { x: 9, y: 9, z: 8 },
        facing: 's',
      }),
    ]);

    expect(viewModel.snapshot().playerDead).toBe(false);
  });

  it('projects combat/leeched onto the source vitals', () => {
    const viewModel = createCombatViewModel(options);
    viewModel.handle([
      event(0, {
        type: 'actor/spawned',
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: { x: 5, y: 5, z: 8 },
        facing: 's',
      }),
      event(1, {
        type: 'combat/leeched',
        entityId: 1 as EntityId,
        sourceEntityId: 2 as EntityId,
        healthAmount: 5,
        resourceAmount: 3,
        health: 180,
        resource: 90,
      }),
    ]);

    expect(viewModel.snapshot().player).toMatchObject({
      health: 180,
      resource: 90,
    });
  });

  it('recomputes cooldowns from the current tick without mutating the event projection', () => {
    const viewModel = createCombatViewModel(options);

    viewModel.handle([
      event(10, {
        type: 'ability/cast',
        entityId: 1 as EntityId,
        abilityIndex: 1,
        targetEntityId: 2 as EntityId,
      }),
    ]);
    viewModel.setTick(129);

    expect(viewModel.snapshot().abilities[1]).toMatchObject({
      remainingCooldownTicks: 1,
      available: false,
    });

    viewModel.setTick(130);
    expect(viewModel.snapshot().abilities[1]).toMatchObject({
      remainingCooldownTicks: 0,
      available: true,
    });
  });
});
