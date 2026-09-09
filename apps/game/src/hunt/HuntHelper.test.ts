import { describe, expect, it } from 'vitest';

import type {
  AbilityDefinition,
  EntityId,
  SimulationEvent,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';
import {
  createHuntHelper,
  decideHelperAction,
  HELPER_MANUAL_HOLD_TICKS,
  type HelperModuleFlags,
  type HelperSituation,
} from './HuntHelper';

const PLAYER = 1 as EntityId;

function ability(
  overrides: Partial<AbilityDefinition> & Pick<AbilityDefinition, 'abilityId'>,
): AbilityDefinition {
  return {
    effect: 'damage',
    shape: 'target',
    radius: 0,
    rangeTiles: 1,
    resourceCost: 0,
    cooldownTicks: 0,
    groupCooldownTicks: 0,
    minPower: 1,
    maxPower: 2,
    element: 'physical',
    primaryCooldownGroup: 0,
    secondaryCooldownGroup: null,
    secondaryGroupCooldownTicks: 0,
    appliedConditionIndex: null,
    maxCharges: null,
    rechargeKind: 'none',
    toggle: false,
    forcedTargetDurationTicks: 0,
    ...overrides,
  };
}

const HEAL = ability({
  abilityId: 'wound-cleansing',
  effect: 'heal',
  shape: 'self',
  rangeTiles: 0,
  resourceCost: 40,
});
const BERSERK = ability({
  abilityId: 'berserk',
  shape: 'area',
  radius: 1,
  rangeTiles: 0,
  resourceCost: 115,
});
const BRUTAL = ability({
  abilityId: 'brutal-strike',
  rangeTiles: 1,
  resourceCost: 30,
});

const KIT = [BERSERK, BRUTAL, HEAL] as const;

const MAGIC_SHIELD = ability({
  abilityId: 'magic-shield',
  effect: 'heal',
  shape: 'self',
  rangeTiles: 0,
  resourceCost: 50,
  toggle: true,
  appliedConditionIndex: 0,
});
const FIRE_WAVE = ability({
  abilityId: 'fire-wave',
  shape: 'cone',
  radius: 3,
  rangeTiles: 0,
  resourceCost: 50,
});
const GREAT_FIREBALL = ability({
  abilityId: 'great-fireball',
  shape: 'target-area',
  radius: 1,
  rangeTiles: 5,
  resourceCost: 80,
});

function situation(overrides: Partial<HelperSituation> = {}): HelperSituation {
  return {
    tick: 100,
    playerEntityId: PLAYER,
    playerPosition: { x: 5, y: 5, z: 7 },
    health: 400,
    maxHealth: 400,
    resource: 200,
    targetEntityId: null,
    hostiles: [],
    abilities: KIT,
    abilityIndices: [0, 1, 2],
    abilityReadyAtTick: new Map(),
    groupReadyAtTick: new Map(),
    ...overrides,
  };
}

function modules(
  overrides: Partial<HelperModuleFlags> = {},
): HelperModuleFlags {
  return {
    heal: false,
    target: false,
    actions: false,
    loot: false,
    ...overrides,
  };
}

const NO_HOLDS = { heal: 0, target: 0, actions: 0, loot: 0 } as const;

function hostile(entityId: number, x: number, y: number, z = 7) {
  return {
    entityId: entityId as EntityId,
    position: { x, y, z },
    displayName: `Rotworm ${String(entityId)}`,
  };
}

describe('decideHelperAction', () => {
  it('does nothing at all while every module is off', () => {
    expect(
      decideHelperAction({
        situation: situation({ health: 10, hostiles: [hostile(2, 5, 6)] }),
        modules: modules(),
        holdUntilTick: NO_HOLDS,
      }),
    ).toEqual({ kind: 'idle' });
  });

  it('heals once health drops under the threshold', () => {
    const decision = decideHelperAction({
      situation: situation({ health: 200 }),
      modules: modules({ heal: true }),
      holdUntilTick: NO_HOLDS,
    });

    expect(decision).toMatchObject({
      kind: 'act',
      module: 'heal',
      command: {
        type: 'actor/cast-ability',
        entityId: PLAYER,
        abilityIndex: 2,
        targetEntityId: null,
      },
    });
  });

  it('reports the refusal instead of healing without the mana for it', () => {
    const decision = decideHelperAction({
      situation: situation({ health: 200, resource: 12 }),
      modules: modules({ heal: true }),
      holdUntilTick: NO_HOLDS,
    });

    expect(decision.kind).toBe('refuse');
    expect(decision.kind === 'refuse' && decision.message).toContain(
      '12 of 40 mana',
    );
  });

  it('leaves a full-health player alone', () => {
    expect(
      decideHelperAction({
        situation: situation(),
        modules: modules({ heal: true }),
        holdUntilTick: NO_HOLDS,
      }),
    ).toEqual({ kind: 'idle' });
  });

  it('engages the nearest creature on the player floor', () => {
    const decision = decideHelperAction({
      situation: situation({
        hostiles: [hostile(2, 9, 5), hostile(3, 6, 5), hostile(4, 5, 6, 6)],
      }),
      modules: modules({ target: true }),
      holdUntilTick: NO_HOLDS,
    });

    expect(decision).toMatchObject({
      kind: 'act',
      module: 'target',
      command: {
        type: 'actor/set-target',
        entityId: PLAYER,
        targetEntityId: 3,
      },
    });
  });

  it('keeps a target it already has', () => {
    expect(
      decideHelperAction({
        situation: situation({
          targetEntityId: 2 as EntityId,
          hostiles: [hostile(2, 9, 5), hostile(3, 6, 5)],
        }),
        modules: modules({ target: true }),
        holdUntilTick: NO_HOLDS,
      }),
    ).toEqual({ kind: 'idle' });
  });

  it('casts the single-target spell on one creature in reach', () => {
    const decision = decideHelperAction({
      situation: situation({
        targetEntityId: 2 as EntityId,
        hostiles: [hostile(2, 5, 6)],
      }),
      modules: modules({ actions: true }),
      holdUntilTick: NO_HOLDS,
    });

    expect(decision).toMatchObject({
      kind: 'act',
      module: 'actions',
      command: { abilityIndex: 1, targetEntityId: 2 },
    });
  });

  it('spends the area spell only once the crowd is worth it', () => {
    const decision = decideHelperAction({
      situation: situation({
        targetEntityId: 2 as EntityId,
        hostiles: [hostile(2, 5, 6), hostile(3, 6, 5)],
      }),
      modules: modules({ actions: true }),
      holdUntilTick: NO_HOLDS,
    });

    expect(decision).toMatchObject({
      kind: 'act',
      module: 'actions',
      command: { abilityIndex: 0, targetEntityId: null },
    });
  });

  it('skips a spell the target is out of range of', () => {
    expect(
      decideHelperAction({
        situation: situation({
          targetEntityId: 2 as EntityId,
          hostiles: [hostile(2, 9, 5)],
        }),
        modules: modules({ actions: true }),
        holdUntilTick: NO_HOLDS,
      }),
    ).toEqual({ kind: 'idle' });
  });

  it('waits out a cooldown rather than routing around it', () => {
    const decision = decideHelperAction({
      situation: situation({
        targetEntityId: 2 as EntityId,
        hostiles: [hostile(2, 5, 6)],
        abilityReadyAtTick: new Map([[1, 140]]),
      }),
      modules: modules({ actions: true }),
      holdUntilTick: NO_HOLDS,
    });

    expect(decision).toEqual({ kind: 'idle' });
  });

  it('ignores an ability the player blueprint does not carry', () => {
    expect(
      decideHelperAction({
        situation: situation({
          health: 200,
          abilityIndices: [0, 1],
        }),
        modules: modules({ heal: true }),
        holdUntilTick: NO_HOLDS,
      }),
    ).toEqual({ kind: 'idle' });
  });

  it('reports the heal it cannot pay for and still swings', () => {
    const decision = decideHelperAction({
      situation: situation({
        health: 200,
        // Enough for Brutal Strike, short of Wound Cleansing.
        resource: 30,
        targetEntityId: 2 as EntityId,
        hostiles: [hostile(2, 5, 6)],
      }),
      modules: modules({ heal: true, actions: true }),
      holdUntilTick: NO_HOLDS,
    });

    expect(decision).toMatchObject({ kind: 'act', module: 'actions' });
  });

  it('falls back to the first refusal when nothing could act', () => {
    const decision = decideHelperAction({
      situation: situation({
        health: 200,
        resource: 0,
        targetEntityId: 2 as EntityId,
        hostiles: [hostile(2, 5, 6)],
      }),
      modules: modules({ heal: true, actions: true }),
      holdUntilTick: NO_HOLDS,
    });

    expect(decision).toMatchObject({ kind: 'refuse', module: 'heal' });
  });

  it('stands a held module down and still runs the others', () => {
    const decision = decideHelperAction({
      situation: situation({
        health: 200,
        hostiles: [hostile(2, 5, 6)],
      }),
      modules: modules({ heal: true, target: true }),
      holdUntilTick: { ...NO_HOLDS, heal: 160 },
    });

    expect(decision).toMatchObject({ kind: 'act', module: 'target' });
  });

  it('casts a front-facing cone when two hostiles are in the wedge', () => {
    const decision = decideHelperAction({
      situation: situation({
        playerFacing: 'e',
        abilities: [FIRE_WAVE],
        abilityIndices: [0],
        hostiles: [hostile(2, 6, 5), hostile(3, 7, 6)],
      }),
      modules: modules({ actions: true }),
      holdUntilTick: NO_HOLDS,
    });

    expect(decision).toMatchObject({
      kind: 'act',
      module: 'actions',
      command: { abilityIndex: 0, targetEntityId: null },
    });
  });

  it('centres target-area spells on the selected hostile', () => {
    const decision = decideHelperAction({
      situation: situation({
        abilities: [GREAT_FIREBALL],
        abilityIndices: [0],
        targetEntityId: 2 as EntityId,
        hostiles: [hostile(2, 8, 5), hostile(3, 8, 6)],
      }),
      modules: modules({ actions: true }),
      holdUntilTick: NO_HOLDS,
    });

    expect(decision).toMatchObject({
      kind: 'act',
      module: 'actions',
      command: { abilityIndex: 0, targetEntityId: 2 },
    });
  });

  it('activates the first inactive Sorcerer toggle once', () => {
    const decision = decideHelperAction({
      situation: situation({
        abilities: [MAGIC_SHIELD],
        abilityIndices: [0],
        activeAbilityIndices: new Set(),
      }),
      modules: modules({ actions: true }),
      holdUntilTick: NO_HOLDS,
    });

    expect(decision).toMatchObject({
      kind: 'act',
      module: 'actions',
      command: { abilityIndex: 0, targetEntityId: null },
    });
  });
});

describe('createHuntHelper', () => {
  it('starts with every module off', () => {
    expect(createHuntHelper().report().modules).toEqual(modules());
  });

  it('holds the casting modules after a manual cast and frees them on time', () => {
    const helper = createHuntHelper({
      modules: { heal: true, actions: true },
    });
    helper.noteManualAction({ kind: 'cast-ability', abilityIndex: 1 }, 100);

    expect(helper.decide(situation({ tick: 101, health: 200 }))).toEqual({
      kind: 'idle',
    });
    expect(helper.report().held).toEqual(['heal', 'actions']);

    const freedAt = 100 + HELPER_MANUAL_HOLD_TICKS;
    expect(
      helper.decide(situation({ tick: freedAt, health: 200 })),
    ).toMatchObject({ kind: 'act', module: 'heal' });
    expect(helper.report().held).toEqual([]);
  });

  it('does not hold healing because the player walked', () => {
    const helper = createHuntHelper({ modules: { heal: true } });
    helper.noteManualAction({ kind: 'step', direction: 'n' }, 100);

    expect(helper.decide(situation({ tick: 101, health: 200 }))).toMatchObject({
      kind: 'act',
      module: 'heal',
    });
  });

  it('collapses a repeated refusal into one standing line', () => {
    const helper = createHuntHelper({ modules: { heal: true } });
    for (let tick = 100; tick < 110; tick += 1) {
      helper.decide(situation({ tick, health: 200, resource: 0 }));
    }

    expect(helper.report().log).toEqual([
      {
        tick: 109,
        module: 'heal',
        kind: 'refused',
        message: 'Wound Cleansing held at 50% health: 0 of 40 mana',
      },
    ]);
  });

  it('reports loot only while its module is on', () => {
    const grant: SimulationEvent = {
      tick: 42 as TickIndex,
      sequence: 1,
      payload: {
        type: 'loot/granted',
        entityId: PLAYER,
        sourceEntityId: 2 as EntityId,
        itemIndex: 0,
        count: 3,
      },
    };
    const helper = createHuntHelper({ itemKeys: ['item:gold-coin'] });

    helper.handle([grant], PLAYER);
    expect(helper.report().log).toEqual([]);

    helper.setModule('loot', true);
    helper.handle([grant], PLAYER);
    expect(helper.report().log).toEqual([
      { tick: 42, module: 'loot', kind: 'gained', message: 'gold coin × 3' },
    ]);
  });

  it('forgets its holds and its feed on reset', () => {
    const helper = createHuntHelper({ modules: { heal: true } });
    helper.noteManualAction({ kind: 'cast-ability', abilityIndex: 1 }, 100);
    helper.decide(situation({ tick: 101, health: 200 }));
    helper.reset();

    expect(helper.report()).toMatchObject({ held: [], log: [] });
  });
});
