import type {
  CommandIssuer,
  Direction,
  GridPosition,
  KernelScenario,
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
    blueprints: [
      { blueprintId: 'walker', stepCooldownTicks: 2, behavior: 'inert' },
      { blueprintId: 'wanderer', stepCooldownTicks: 3, behavior: 'wander' },
      { blueprintId: 'statue', stepCooldownTicks: 0, behavior: 'inert' },
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
