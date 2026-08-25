import { describe, expect, it } from 'vitest';

import type {
  AbilityDefinition,
  EntityId,
  RuntimeContentBundle,
  ScenarioConditionDefinition,
  Seed,
  SimulationEvent,
  SimulationSnapshot,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';

import {
  type CombatViewModelOptions,
  createCombatViewModel,
  createDefaultCombatViewModel,
  createHuntCombatViewModel,
  DEFAULT_COMBAT_FALLBACK_CONDITIONS,
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
  forcedTargetDurationTicks: 0,
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
  {
    abilityId: 'groundshaker',
    effect: 'damage',
    shape: 'area',
    radius: 3,
    rangeTiles: 0,
    resourceCost: 160,
    cooldownTicks: 160,
    groupCooldownTicks: 40,
    minPower: 56,
    maxPower: 113,
    ...abilityV5Defaults,
  },
  {
    abilityId: 'whirlwind-throw',
    effect: 'damage',
    shape: 'target',
    radius: 0,
    rangeTiles: 5,
    resourceCost: 40,
    cooldownTicks: 120,
    groupCooldownTicks: 40,
    minPower: 40,
    maxPower: 103,
    ...abilityV5Defaults,
  },
  {
    abilityId: 'blood-rage',
    effect: 'heal',
    shape: 'self',
    radius: 0,
    rangeTiles: 0,
    resourceCost: 20,
    cooldownTicks: 0,
    groupCooldownTicks: 40,
    minPower: 0,
    maxPower: 0,
    element: 'physical',
    primaryCooldownGroup: 1,
    secondaryCooldownGroup: 2,
    secondaryGroupCooldownTicks: 40,
    appliedConditionIndex: 0,
    maxCharges: null,
    rechargeKind: 'none',
    toggle: true,
    forcedTargetDurationTicks: 0,
  },
  {
    abilityId: 'protector',
    effect: 'heal',
    shape: 'self',
    radius: 0,
    rangeTiles: 0,
    resourceCost: 20,
    cooldownTicks: 0,
    groupCooldownTicks: 40,
    minPower: 0,
    maxPower: 0,
    element: 'physical',
    primaryCooldownGroup: 1,
    secondaryCooldownGroup: 2,
    secondaryGroupCooldownTicks: 40,
    appliedConditionIndex: 1,
    maxCharges: null,
    rechargeKind: 'none',
    toggle: true,
    forcedTargetDurationTicks: 0,
  },
];

const conditions: readonly ScenarioConditionDefinition[] = [
  {
    conditionId: 'blood-rage',
    exclusivityGroup: 1,
    durationTicks: 0,
    skillIndex: 2,
    skillModifierPermille: 250,
    damageDealtPermille: 0,
    damageReceivedPermille: 150,
    speedPermille: 0,
    manaShield: false,
    tickDamageAmount: 0,
    tickDamageIntervalTicks: 0,
    elementBonusPermille: 0,
    convertNextAbilityElement: false,
    bonusElement: null,
  },
  {
    conditionId: 'protector',
    exclusivityGroup: 1,
    durationTicks: 0,
    skillIndex: null,
    skillModifierPermille: 0,
    damageDealtPermille: 0,
    damageReceivedPermille: -200,
    speedPermille: 0,
    manaShield: false,
    tickDamageAmount: 0,
    tickDamageIntervalTicks: 0,
    elementBonusPermille: 0,
    convertNextAbilityElement: false,
    bonusElement: null,
  },
];

const options: CombatViewModelOptions = {
  playerEntityId: 1 as EntityId,
  playerBlueprintId: 'player',
  abilities,
  conditions,
  itemKeys: ['item:tibia:dead-rotworm'],
  maxHealthByBlueprint: new Map([
    ['player', 185],
    ['rotworm', 65],
  ]),
  maxResourceByBlueprint: new Map([['player', 185]]),
};

const playerSnapshotActor = {
  entityId: 1 as EntityId,
  blueprintId: 'player',
  position: { x: 5, y: 5, z: 8 },
  facing: 's' as const,
  readyAtTick: 0,
  transitionGuard: null,
  health: 185,
  resource: 185,
  targetEntityId: null,
  attackReadyAtTick: 0,
  groupCooldowns: [],
  abilityCooldowns: [],
  nextHealthRegenTick: 0,
  nextResourceRegenTick: 0,
  lastDamageReceivedTick: 0,
  activeConditions: [],
  abilityCharges: [],
  forcedTargetEntityId: null,
  forcedTargetExpiresAtTick: 0,
};

const bloodRageAbility: AbilityDefinition = {
  abilityId: 'blood-rage',
  effect: 'heal',
  shape: 'self',
  radius: 0,
  rangeTiles: 0,
  resourceCost: 20,
  cooldownTicks: 0,
  groupCooldownTicks: 40,
  minPower: 0,
  maxPower: 0,
  element: 'physical',
  primaryCooldownGroup: 1,
  secondaryCooldownGroup: 2,
  secondaryGroupCooldownTicks: 40,
  appliedConditionIndex: 0,
  maxCharges: null,
  rechargeKind: 'none',
  toggle: true,
  forcedTargetDurationTicks: 0,
};

function event(
  tick: number,
  payload: SimulationEvent['payload'],
): SimulationEvent {
  return { tick: tick as TickIndex, sequence: tick, payload };
}

function snapshot(
  overrides: Partial<SimulationSnapshot> = {},
): SimulationSnapshot {
  return {
    schemaVersion: 5,
    rulesVersion: 5,
    scenarioId: 'test-scenario',
    scenarioRevision: 1,
    seed: 'test-seed' as Seed,
    tick: 0 as TickIndex,
    nextEntityId: 10,
    nextEventSequence: 0,
    nextCommandSequence: 0,
    randomStreams: [],
    actors: [playerSnapshotActor],
    pendingCommands: [],
    pendingIntents: [],
    spawnSlots: [],
    ...overrides,
  };
}

function runtimeFixture(): RuntimeContentBundle {
  return {
    schemaVersion: '1',
    contentVersion: 'fixture-1',
    slice: {
      key: 'fixture:combat-view-model',
      objective: 'Combat view model fixture',
      consumer: 'unit test',
      roots: ['character:huntbound:knight-test'],
      dependencies: [],
      projections: [
        {
          entityKey: 'character:huntbound:knight-test',
          facets: ['identity', 'progression'],
          consumer: 'unit test',
          rationale: 'Minimal runtime for combat view model',
        },
      ],
      dependencyMode: 'reachable-only',
      curationState: 'accepted',
      exportVersion: '1',
    },
    vocationFamilies: [],
    vocations: [],
    creatures: [
      {
        guid: '11111111-1111-4111-8111-111111111111',
        stableKey: 'creature:tibia:rotworm',
        displayName: 'Rotworm',
        includedFacets: [
          'identity',
          'stats',
          'appearance',
          'combat',
          'conditions',
          'loot',
        ],
        stats: { health: 65, experience: 40, speed: 100 },
        lookType: 26,
        attacks: [],
        defenses: [],
        conditions: [],
        summons: [],
        resistances: {},
        immunities: [],
        loot: [],
      },
    ],
    items: [],
    spells: [],
    characters: [
      {
        stableKey: 'character:huntbound:knight-test',
        vocationKey: 'vocation:tibia:knight',
        level: 35,
        skills: { sword: 60, magic: 0 },
        weaponItemKey: 'item:tibia:sword',
        weaponAttack: 14,
        maxHealth: 590,
        maxMana: 185,
        spellKeys: [
          'spell:tibia:berserk',
          'spell:tibia:brutal-strike',
          'spell:tibia:wound-cleansing',
          'spell:tibia:groundshaker',
          'spell:tibia:whirlwind-throw',
        ],
      },
    ],
  } as unknown as RuntimeContentBundle;
}

describe('CombatViewModel', () => {
  it('exposes nine active Knight abilities in the default combat model', () => {
    const viewModel = createDefaultCombatViewModel();

    expect(
      viewModel.snapshot().abilities.map((ability) => ability.abilityId),
    ).toEqual([
      'berserk',
      'brutal-strike',
      'wound-cleansing',
      'groundshaker',
      'whirlwind-throw',
      'blood-rage',
      'protector',
      'challenge',
      'haste',
    ]);
  });

  it('keeps fallback posture condition values aligned with the approved content data', () => {
    expect(DEFAULT_COMBAT_FALLBACK_CONDITIONS).toEqual([
      {
        conditionId: 'blood-rage',
        exclusivityGroup: 1,
        durationTicks: 0,
        skillIndex: 2,
        skillModifierPermille: 250,
        damageDealtPermille: 0,
        damageReceivedPermille: 150,
        speedPermille: 0,
        manaShield: false,
        tickDamageAmount: 0,
        tickDamageIntervalTicks: 0,
        elementBonusPermille: 0,
        convertNextAbilityElement: false,
        bonusElement: null,
      },
      {
        conditionId: 'protector',
        exclusivityGroup: 1,
        durationTicks: 0,
        skillIndex: null,
        skillModifierPermille: 0,
        damageDealtPermille: -150,
        damageReceivedPermille: -150,
        speedPermille: 0,
        manaShield: false,
        tickDamageAmount: 0,
        tickDamageIntervalTicks: 0,
        elementBonusPermille: 0,
        convertNextAbilityElement: false,
        bonusElement: null,
      },
      {
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
      },
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

  it('restores an active posture and its indexed cooldown channels from a snapshot', () => {
    const viewModel = createCombatViewModel(options);

    viewModel.restoreSnapshot(
      snapshot({
        tick: 90 as TickIndex,
        actors: [
          {
            ...playerSnapshotActor,
            resource: 165,
            groupCooldowns: [
              { groupIndex: 1, readyAtTick: 130 },
              { groupIndex: 2, readyAtTick: 125 },
            ],
            abilityCooldowns: [{ abilityIndex: 5, readyAtTick: 120 }],
            activeConditions: [
              {
                conditionIndex: 0,
                expiresAtTick: 0,
                exclusivityGroup: 1,
              },
            ],
          },
        ],
      }),
    );

    const state = viewModel.snapshot();
    expect(state.playerPosture).toEqual({
      abilityId: 'blood-rage',
      label: 'Blood Rage',
    });
    expect(state.abilities[5]).toMatchObject({
      available: false,
      active: true,
      remainingCooldownTicks: 40,
    });
    expect(state.abilities[6]).toMatchObject({
      active: false,
      remainingCooldownTicks: 40,
    });
  });

  it('projects Haste remaining ticks without reporting it as a posture', () => {
    const viewModel = createDefaultCombatViewModel();

    viewModel.restoreSnapshot(
      snapshot({
        tick: 100 as TickIndex,
        actors: [
          {
            ...playerSnapshotActor,
            resource: 125,
            activeConditions: [
              {
                conditionIndex: 2,
                expiresAtTick: 600,
                exclusivityGroup: null,
              },
            ],
          },
        ],
      }),
    );
    viewModel.setTick(100);

    const state = viewModel.snapshot();
    expect(state.playerPosture).toBeNull();
    expect(state.playerHaste).toEqual({ remainingTicks: 500 });
    expect(state.abilities[8]).toMatchObject({
      abilityId: 'haste',
      active: true,
    });
  });

  it('toggles the active posture on recast, swaps exclusivity rivals and skips the extra mana charge', () => {
    const viewModel = createCombatViewModel(options);

    viewModel.handle([
      event(0, {
        type: 'actor/spawned',
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: { x: 5, y: 5, z: 8 },
        facing: 's',
      }),
      event(10, {
        type: 'ability/cast',
        entityId: 1 as EntityId,
        abilityIndex: 5,
        targetEntityId: null,
      }),
    ]);

    expect(viewModel.snapshot()).toMatchObject({
      player: { resource: 165 },
      playerPosture: { abilityId: 'blood-rage', label: 'Blood Rage' },
    });
    expect(viewModel.snapshot().abilities[5]).toMatchObject({ active: true });

    viewModel.handle([
      event(50, {
        type: 'ability/cast',
        entityId: 1 as EntityId,
        abilityIndex: 5,
        targetEntityId: null,
      }),
    ]);

    expect(viewModel.snapshot()).toMatchObject({
      player: { resource: 165 },
      playerPosture: null,
    });
    expect(viewModel.snapshot().abilities[5]).toMatchObject({ active: false });

    viewModel.handle([
      event(90, {
        type: 'ability/cast',
        entityId: 1 as EntityId,
        abilityIndex: 6,
        targetEntityId: null,
      }),
    ]);

    expect(viewModel.snapshot()).toMatchObject({
      player: { resource: 145 },
      playerPosture: { abilityId: 'protector', label: 'Protector' },
    });
    expect(viewModel.snapshot().abilities[5]).toMatchObject({ active: false });
    expect(viewModel.snapshot().abilities[6]).toMatchObject({ active: true });

    viewModel.handle([
      event(130, {
        type: 'ability/cast',
        entityId: 1 as EntityId,
        abilityIndex: 6,
        targetEntityId: null,
      }),
    ]);

    expect(viewModel.snapshot()).toMatchObject({
      player: { resource: 145 },
      playerPosture: null,
    });
    expect(viewModel.snapshot().abilities[6]).toMatchObject({ active: false });
  });

  it('keeps posture secondary cooldowns isolated from unrelated primary spell groups', () => {
    const cooldownOptions: CombatViewModelOptions = {
      ...options,
      abilities: [
        {
          abilityId: 'strike',
          effect: 'damage',
          shape: 'target',
          radius: 0,
          rangeTiles: 1,
          resourceCost: 0,
          cooldownTicks: 0,
          groupCooldownTicks: 40,
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
        },
        {
          abilityId: 'support-wave',
          effect: 'heal',
          shape: 'self',
          radius: 0,
          rangeTiles: 0,
          resourceCost: 0,
          cooldownTicks: 0,
          groupCooldownTicks: 40,
          minPower: 0,
          maxPower: 0,
          element: 'physical',
          primaryCooldownGroup: 2,
          secondaryCooldownGroup: null,
          secondaryGroupCooldownTicks: 0,
          appliedConditionIndex: null,
          maxCharges: null,
          rechargeKind: 'none',
          toggle: false,
          forcedTargetDurationTicks: 0,
        },
        bloodRageAbility,
      ],
    };
    const viewModel = createCombatViewModel(cooldownOptions);

    viewModel.handle([
      event(0, {
        type: 'actor/spawned',
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: { x: 5, y: 5, z: 8 },
        facing: 's',
      }),
      event(10, {
        type: 'ability/cast',
        entityId: 1 as EntityId,
        abilityIndex: 2,
        targetEntityId: null,
      }),
    ]);

    expect(viewModel.snapshot().abilities[0]).toMatchObject({
      available: true,
      remainingCooldownTicks: 0,
    });
    expect(viewModel.snapshot().abilities[1]).toMatchObject({
      available: false,
      remainingCooldownTicks: 40,
    });

    viewModel.reset();
    viewModel.handle([
      event(0, {
        type: 'actor/spawned',
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: { x: 5, y: 5, z: 8 },
        facing: 's',
      }),
      event(10, {
        type: 'ability/cast',
        entityId: 1 as EntityId,
        abilityIndex: 1,
        targetEntityId: null,
      }),
    ]);

    expect(viewModel.snapshot().abilities[0]).toMatchObject({
      available: true,
      remainingCooldownTicks: 0,
    });
    expect(viewModel.snapshot().abilities[2]).toMatchObject({
      available: false,
      remainingCooldownTicks: 40,
    });
  });

  it('keeps the support group out of the attack cooldown, and the reverse', () => {
    // The one the HUD is most likely to get wrong. Challenge and Haste spend
    // the support group; the five attack spells and Wound Cleansing spend the
    // attack group. A deck that dimmed one run because the other was spent
    // would be describing a rule the kernel does not have, so the view model
    // has to say which group each ability owes and what that group still owes.
    const spawnPlayer = event(0, {
      type: 'actor/spawned',
      entityId: 1 as EntityId,
      blueprintId: 'player',
      position: { x: 5, y: 5, z: 8 },
      facing: 's',
    });
    const castAttack = createDefaultCombatViewModel();

    castAttack.handle([
      spawnPlayer,
      event(10, {
        type: 'ability/cast',
        entityId: 1 as EntityId,
        abilityIndex: 0,
        targetEntityId: null,
      }),
    ]);
    castAttack.setTick(11);
    const afterAttack = castAttack.snapshot();

    expect(afterAttack.abilities[1]).toMatchObject({
      abilityId: 'brutal-strike',
      primaryCooldownGroup: 0,
      remainingGroupCooldownTicks: 39,
      available: false,
    });
    for (const index of [7, 8]) {
      expect(afterAttack.abilities[index]).toMatchObject({
        primaryCooldownGroup: 1,
        remainingGroupCooldownTicks: 0,
        remainingCooldownTicks: 0,
        available: true,
      });
    }
    expect(afterAttack.cooldownGroups).toEqual([
      { group: 0, remainingTicks: 39 },
      { group: 1, remainingTicks: 0 },
      { group: 2, remainingTicks: 0 },
    ]);

    const castSupport = createDefaultCombatViewModel();

    castSupport.handle([
      spawnPlayer,
      event(10, {
        type: 'ability/cast',
        entityId: 1 as EntityId,
        abilityIndex: 8,
        targetEntityId: null,
      }),
    ]);
    castSupport.setTick(11);
    const afterSupport = castSupport.snapshot();

    expect(afterSupport.abilities[7]).toMatchObject({
      abilityId: 'challenge',
      remainingGroupCooldownTicks: 39,
      available: false,
    });
    for (const index of [0, 1, 2, 3, 4]) {
      expect(afterSupport.abilities[index]).toMatchObject({
        primaryCooldownGroup: 0,
        remainingGroupCooldownTicks: 0,
        remainingCooldownTicks: 0,
      });
    }
  });

  it('uses explicit scenario conditions in the hunt combat model instead of the compatibility fallback', () => {
    const bloodRageFallback = DEFAULT_COMBAT_FALLBACK_CONDITIONS[0];
    const protectorFallback = DEFAULT_COMBAT_FALLBACK_CONDITIONS[1];
    if (bloodRageFallback === undefined || protectorFallback === undefined) {
      throw new Error('Expected posture fallback conditions to be present');
    }
    const explicitConditions: readonly ScenarioConditionDefinition[] = [
      bloodRageFallback,
      {
        ...protectorFallback,
        exclusivityGroup: null,
      },
    ];
    const viewModel = createHuntCombatViewModel(
      runtimeFixture(),
      1 as EntityId,
      'player',
      explicitConditions,
    );

    viewModel.handle([
      event(0, {
        type: 'actor/spawned',
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: { x: 5, y: 5, z: 8 },
        facing: 's',
      }),
      event(10, {
        type: 'ability/cast',
        entityId: 1 as EntityId,
        abilityIndex: 5,
        targetEntityId: null,
      }),
      event(20, {
        type: 'ability/cast',
        entityId: 1 as EntityId,
        abilityIndex: 6,
        targetEntityId: null,
      }),
    ]);

    expect(viewModel.snapshot().playerPosture).toEqual({
      abilityId: 'blood-rage',
      label: 'Blood Rage',
    });
  });
});
