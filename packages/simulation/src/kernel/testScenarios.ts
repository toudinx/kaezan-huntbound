import type {
  AbilityDefinition,
  ActorBehavior,
  ActorBlueprint,
  ActorState,
  CommandIssuer,
  Direction,
  GridPosition,
  KernelScenario,
  ScenarioConditionDefinition,
  ScenarioFloor,
  Seed,
  SimulationCommandInput,
  SimulationEvent,
  SimulationEventPayload,
  TickIndex,
} from '@huntbound/contracts';
import {
  createEntityId,
  createSeed,
  createTickIndex,
  SIMULATION_SCHEMA_VERSION,
} from '@huntbound/contracts';

export const TEST_SEED: Seed = createSeed('0f1e2d3c4b5a6978');

export const TEST_Z = 7;

/** The floor directly below `TEST_Z`, used by the multi-floor cases. */
export const TEST_Z_BELOW = 8;

export function at(x: number, y: number, z: number = TEST_Z): GridPosition {
  return { x, y, z };
}

export function singleFloor(
  blockedTiles: readonly (readonly [number, number])[] = [],
): readonly ScenarioFloor[] {
  return [{ z: TEST_Z, blockedTiles }];
}

export function twoFloors(
  upper: readonly (readonly [number, number])[] = [],
  lower: readonly (readonly [number, number])[] = [],
): readonly ScenarioFloor[] {
  return [
    { z: TEST_Z, blockedTiles: upper },
    { z: TEST_Z_BELOW, blockedTiles: lower },
  ];
}

/** Combat-neutral stats so a v3-era actor keeps its movement-only behaviour. */
export function combatNeutralBlueprint(
  blueprintId: string,
  stepCooldownTicks: number,
  behavior: ActorBehavior,
  overrides: Partial<ActorBlueprint> = {},
): ActorBlueprint {
  return {
    blueprintId,
    stepCooldownTicks,
    behavior,
    factionId: 0,
    maxHealth: 1,
    maxResource: 0,
    healthRegenTicks: 0,
    healthRegenAmount: 0,
    resourceRegenTicks: 0,
    resourceRegenAmount: 0,
    attackCooldownTicks: 0,
    attackMinDamage: 0,
    attackMaxDamage: 0,
    attackRangeTiles: 1,
    aggroRadius: 0,
    lootTableIndex: null,
    abilityIndices: [],
    outOfCombatHealthRegenTicks: 0,
    outOfCombatHealthRegenAmount: 0,
    outOfCombatResourceRegenTicks: 0,
    outOfCombatResourceRegenAmount: 0,
    combatWindowTicks: 0,
    lifeLeechPermille: 0,
    manaLeechPermille: 0,
    attackElement: 'physical',
    resistances: [],
    immunities: [],
    ...overrides,
  };
}

export function kernelScenario(
  overrides: Partial<KernelScenario> = {},
): KernelScenario {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    scenarioId: 'kernel-tick-loop-test',
    scenarioRevision: 1,
    width: 8,
    height: 6,
    floors: singleFloor(),
    transitions: [],
    spawnGroups: [],
    maxLiveActors: 64,
    abilities: [],
    lootTables: [],
    conditions: [],
    blueprints: [
      combatNeutralBlueprint('walker', 2, 'inert'),
      combatNeutralBlueprint('wanderer', 3, 'wander'),
      combatNeutralBlueprint('statue', 0, 'inert'),
    ],
    initialActors: [],
    ...overrides,
  };
}

export function tickOf(tick: number): TickIndex {
  return createTickIndex(tick);
}

export function moveStep(
  entityId: number,
  direction: Direction,
  tick = 0,
  issuer: CommandIssuer = 'player',
): SimulationCommandInput {
  return {
    tick: tickOf(tick),
    issuer,
    command: {
      type: 'actor/move-step',
      entityId: createEntityId(entityId),
      direction,
    },
  };
}

export function face(
  entityId: number,
  direction: Direction,
  tick = 0,
  issuer: CommandIssuer = 'player',
): SimulationCommandInput {
  return {
    tick: tickOf(tick),
    issuer,
    command: {
      type: 'actor/face',
      entityId: createEntityId(entityId),
      direction,
    },
  };
}

export function wait(
  entityId: number,
  tick = 0,
  issuer: CommandIssuer = 'player',
): SimulationCommandInput {
  return {
    tick: tickOf(tick),
    issuer,
    command: { type: 'actor/wait', entityId: createEntityId(entityId) },
  };
}

export function attack(
  entityId: number,
  targetEntityId: number,
  tick = 0,
  issuer: CommandIssuer = 'player',
): SimulationCommandInput {
  return {
    tick: tickOf(tick),
    issuer,
    command: {
      type: 'actor/attack',
      entityId: createEntityId(entityId),
      targetEntityId: createEntityId(targetEntityId),
    },
  };
}

export function castAbility(
  entityId: number,
  abilityIndex: number,
  targetEntityId: number | null = null,
  tick = 0,
  issuer: CommandIssuer = 'player',
): SimulationCommandInput {
  return {
    tick: tickOf(tick),
    issuer,
    command: {
      type: 'actor/cast-ability',
      entityId: createEntityId(entityId),
      abilityIndex,
      targetEntityId:
        targetEntityId === null ? null : createEntityId(targetEntityId),
    },
  };
}

export function spawnActor(
  blueprintId: string,
  position: GridPosition,
  facing: Direction = 's',
  tick = 0,
): SimulationCommandInput {
  return {
    tick: tickOf(tick),
    issuer: 'scenario',
    command: { type: 'scenario/spawn-actor', blueprintId, position, facing },
  };
}

export function despawnActor(
  entityId: number,
  tick = 0,
): SimulationCommandInput {
  return {
    tick: tickOf(tick),
    issuer: 'scenario',
    command: {
      type: 'scenario/despawn-actor',
      entityId: createEntityId(entityId),
    },
  };
}

export function payloads(
  events: readonly SimulationEvent[],
): readonly SimulationEventPayload[] {
  return events.map((event) => event.payload);
}

export function payloadsOfType<Type extends SimulationEventPayload['type']>(
  events: readonly SimulationEvent[],
  type: Type,
): readonly Extract<SimulationEventPayload, { type: Type }>[] {
  const matching: Extract<SimulationEventPayload, { type: Type }>[] = [];
  for (const event of events) {
    if (event.payload.type === type) {
      matching.push(
        event.payload as Extract<SimulationEventPayload, { type: Type }>,
      );
    }
  }
  return matching;
}

function abilityV5Defaults(): Pick<
  AbilityDefinition,
  | 'element'
  | 'primaryCooldownGroup'
  | 'secondaryCooldownGroup'
  | 'secondaryGroupCooldownTicks'
  | 'appliedConditionIndex'
  | 'maxCharges'
  | 'rechargeKind'
  | 'toggle'
> {
  return {
    element: 'physical',
    primaryCooldownGroup: 0,
    secondaryCooldownGroup: null,
    secondaryGroupCooldownTicks: 0,
    appliedConditionIndex: null,
    maxCharges: null,
    rechargeKind: 'none',
    toggle: false,
  };
}

export function scenarioCondition(
  overrides: Partial<ScenarioConditionDefinition> = {},
): ScenarioConditionDefinition {
  return {
    conditionId: 'haste',
    exclusivityGroup: null,
    durationTicks: 0,
    skillIndex: null,
    skillModifierPermille: 0,
    damageDealtPermille: 0,
    damageReceivedPermille: 0,
    speedPermille: 0,
    manaShield: false,
    tickDamageAmount: 0,
    tickDamageIntervalTicks: 0,
    elementBonusPermille: 0,
    convertNextAbilityElement: false,
    bonusElement: null,
    ...overrides,
  };
}

export function supportSelfAbility(
  overrides: Partial<AbilityDefinition> = {},
): AbilityDefinition {
  return {
    abilityId: 'blood-rage',
    effect: 'heal',
    shape: 'self',
    radius: 0,
    rangeTiles: 0,
    resourceCost: 20,
    cooldownTicks: 0,
    groupCooldownTicks: 0,
    minPower: 0,
    maxPower: 0,
    ...abilityV5Defaults(),
    toggle: true,
    ...overrides,
  };
}

export function healSelfAbility(
  overrides: Partial<AbilityDefinition> = {},
): AbilityDefinition {
  return {
    abilityId: 'wound-cleansing',
    effect: 'heal',
    shape: 'self',
    radius: 0,
    rangeTiles: 0,
    resourceCost: 4,
    cooldownTicks: 4,
    groupCooldownTicks: 2,
    minPower: 3,
    maxPower: 3,
    ...abilityV5Defaults(),
    ...overrides,
  };
}

export function damageTargetAbility(
  overrides: Partial<AbilityDefinition> = {},
): AbilityDefinition {
  return {
    abilityId: 'brutal-strike',
    effect: 'damage',
    shape: 'target',
    radius: 0,
    rangeTiles: 1,
    resourceCost: 5,
    cooldownTicks: 4,
    groupCooldownTicks: 2,
    minPower: 4,
    maxPower: 4,
    ...abilityV5Defaults(),
    ...overrides,
  };
}

export function damageAreaAbility(
  overrides: Partial<AbilityDefinition> = {},
): AbilityDefinition {
  return {
    abilityId: 'berserk',
    effect: 'damage',
    shape: 'area',
    radius: 1,
    rangeTiles: 0,
    resourceCost: 6,
    cooldownTicks: 8,
    groupCooldownTicks: 4,
    minPower: 2,
    maxPower: 5,
    ...abilityV5Defaults(),
    ...overrides,
  };
}

export function actorCombatFields(
  blueprint: ActorBlueprint,
  bornAtTick = 0,
): Pick<
  ActorState,
  | 'health'
  | 'resource'
  | 'targetEntityId'
  | 'attackReadyAtTick'
  | 'groupCooldowns'
  | 'abilityCooldowns'
  | 'nextHealthRegenTick'
  | 'nextResourceRegenTick'
  | 'lastDamageReceivedTick'
  | 'activeConditions'
  | 'abilityCharges'
> {
  return {
    health: blueprint.maxHealth,
    resource: blueprint.maxResource,
    targetEntityId: null,
    attackReadyAtTick: 0,
    groupCooldowns: [],
    abilityCooldowns: [],
    nextHealthRegenTick:
      blueprint.healthRegenTicks === 0
        ? 0
        : bornAtTick + blueprint.healthRegenTicks,
    nextResourceRegenTick:
      blueprint.resourceRegenTicks === 0
        ? 0
        : bornAtTick + blueprint.resourceRegenTicks,
    lastDamageReceivedTick: 0,
    activeConditions: [],
    abilityCharges: [],
  };
}
