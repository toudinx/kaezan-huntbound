import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  simulationDiagnosticsFromZodError,
  validateKernelScenario,
  validateSimulationCommandLog,
  validateSimulationSnapshot,
} from './diagnostics';
import {
  SIMULATION_RULES_VERSION,
  SIMULATION_SCHEMA_VERSION,
} from './identity';
import {
  ActorBlueprintSchema,
  commandPriority,
  KernelScenarioSchema,
  SimulationCommandInputSchema,
  SimulationCommandRecordSchema,
  SimulationCommandSchema,
  SimulationEventSchema,
  SimulationSnapshotSchema,
} from './schemas';
import type { SimulationValidationResult } from './types';

function at<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Missing test fixture value at index ${index}`);
  }
  return value;
}

function createScenario() {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    scenarioId: 'pb-03-kernel-coverage',
    scenarioRevision: 1,
    width: 4,
    height: 4,
    floors: [
      {
        z: 7,
        blockedTiles: [
          [1, 1],
          [2, 2],
        ],
      },
    ],
    transitions: [] as { from: unknown; to: unknown }[],
    spawnGroups: [] as unknown[],
    maxLiveActors: 64,
    blueprints: [
      { blueprintId: 'walker', stepCooldownTicks: 2, behavior: 'inert' },
      { blueprintId: 'wanderer', stepCooldownTicks: 3, behavior: 'wander' },
    ],
    initialActors: [
      {
        blueprintId: 'walker',
        position: { x: 0, y: 0, z: 7 },
        facing: 'e',
      },
      {
        blueprintId: 'wanderer',
        position: { x: 3, y: 3, z: 7 },
        facing: 'nw',
      },
    ],
  };
}

function createCommandLog() {
  return {
    header: {
      kind: 'header',
      schemaVersion: SIMULATION_SCHEMA_VERSION,
      rulesVersion: SIMULATION_RULES_VERSION,
      scenarioId: 'pb-03-kernel-coverage',
      scenarioRevision: 1,
      seed: '0f1e2d3c4b5a6978',
      tickCount: 2,
    },
    commands: [
      {
        tick: 0,
        sequence: 1,
        issuer: 'player',
        command: {
          type: 'actor/move-step',
          entityId: 1,
          direction: 'e',
        },
      },
      {
        tick: 1,
        sequence: 2,
        issuer: 'scenario',
        command: {
          type: 'scenario/spawn-actor',
          blueprintId: 'walker',
          position: { x: 2, y: 3, z: 7 },
          facing: 'n',
        },
      },
    ],
  };
}

function createSnapshot() {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    rulesVersion: SIMULATION_RULES_VERSION,
    scenarioId: 'pb-03-kernel-coverage',
    scenarioRevision: 1,
    seed: '0f1e2d3c4b5a6978',
    tick: 0,
    nextEntityId: 3,
    nextEventSequence: 1,
    nextCommandSequence: 1,
    randomStreams: [
      {
        label: 'movement',
        s0: 1,
        s1: 2,
        s2: 3,
        s3: 4,
        drawCount: 0,
      },
    ],
    actors: [
      {
        entityId: 1,
        blueprintId: 'walker',
        position: { x: 0, y: 0, z: 7 },
        facing: 'e',
        readyAtTick: 0,
        transitionGuard: null,
      },
      {
        entityId: 2,
        blueprintId: 'wanderer',
        position: { x: 3, y: 3, z: 7 },
        facing: 'nw',
        readyAtTick: 0,
        transitionGuard: null,
      },
    ],
    spawnSlots: [] as unknown[],
    pendingCommands: [
      {
        tick: 1,
        sequence: 1,
        issuer: 'player',
        command: { type: 'actor/wait', entityId: 1 },
      },
    ],
    pendingIntents: [
      { tick: 0, entityId: 2, direction: 'nw' },
      { tick: 1, entityId: 1, direction: 'e' },
    ],
  };
}

function expectSchemaInvalid(
  result: SimulationValidationResult<unknown>,
  expectedCode = 'SIM_SCHEMA_INVALID',
) {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.diagnostics.some(({ code }) => code === expectedCode)).toBe(
      true,
    );
  }
}

describe('simulation schemas', () => {
  it('accepts the valid scenario, command, event, snapshot, and log documents', () => {
    const scenarioResult = validateKernelScenario(createScenario());
    const logResult = validateSimulationCommandLog(createCommandLog());
    const snapshotResult = validateSimulationSnapshot(createSnapshot());
    const eventResult = SimulationEventSchema.safeParse({
      tick: 0,
      sequence: 1,
      payload: {
        type: 'actor/moved',
        entityId: 1,
        from: { x: 0, y: 0, z: 7 },
        to: { x: 1, y: 0, z: 7 },
        facing: 'e',
      },
    });

    expect(scenarioResult.ok).toBe(true);
    expect(logResult.ok).toBe(true);
    expect(snapshotResult.ok).toBe(true);
    expect(eventResult.success).toBe(true);
  });

  it('rejects extra fields at every public object boundary', () => {
    const scenario = createScenario() as Record<string, unknown>;
    scenario.unexpected = true;
    expect(KernelScenarioSchema.safeParse(scenario).success).toBe(false);

    const command = {
      type: 'actor/wait',
      entityId: 1,
      unexpected: true,
    };
    expect(SimulationCommandSchema.safeParse(command).success).toBe(false);

    const record = {
      tick: 0,
      sequence: 1,
      issuer: 'player',
      command: { type: 'actor/wait', entityId: 1 },
      unexpected: true,
    };
    expect(SimulationCommandRecordSchema.safeParse(record).success).toBe(false);

    const snapshot = createSnapshot() as Record<string, unknown>;
    snapshot.unexpected = true;
    expect(SimulationSnapshotSchema.safeParse(snapshot).success).toBe(false);
  });

  it('enforces scenario ordering, uniqueness, bounds, and cross references', () => {
    const unsorted = createScenario();
    at(unsorted.floors, 0).blockedTiles = [
      [2, 2],
      [1, 1],
    ];
    expectSchemaInvalid(validateKernelScenario(unsorted));

    const duplicateTile = createScenario();
    at(duplicateTile.floors, 0).blockedTiles = [
      [1, 1],
      [1, 1],
    ];
    expectSchemaInvalid(validateKernelScenario(duplicateTile));

    const blockedInitialActor = createScenario();
    at(blockedInitialActor.initialActors, 0).position = {
      x: 1,
      y: 1,
      z: 7,
    };
    expectSchemaInvalid(validateKernelScenario(blockedInitialActor));

    const duplicateInitialCell = createScenario();
    at(duplicateInitialCell.initialActors, 1).position = {
      x: 0,
      y: 0,
      z: 7,
    };
    expectSchemaInvalid(validateKernelScenario(duplicateInitialCell));

    const unknownBlueprint = createScenario();
    at(unknownBlueprint.initialActors, 0).blueprintId = 'missing';
    expectSchemaInvalid(validateKernelScenario(unknownBlueprint));

    const wrongFloor = createScenario();
    at(wrongFloor.initialActors, 0).position = { x: 0, y: 0, z: 8 };
    expectSchemaInvalid(validateKernelScenario(wrongFloor));

    const outOfBoundsTile = createScenario();
    at(outOfBoundsTile.floors, 0).blockedTiles = [
      [1, 1],
      [4, 2],
    ];
    expectSchemaInvalid(validateKernelScenario(outOfBoundsTile));
  });

  it('rejects decimals, unknown directions, and invalid blueprint fields', () => {
    const decimalScenario = createScenario();
    decimalScenario.width = 4.5;
    expectSchemaInvalid(validateKernelScenario(decimalScenario));

    const unknownDirection = createScenario();
    at(unknownDirection.initialActors, 0).facing = 'north';
    expectSchemaInvalid(validateKernelScenario(unknownDirection));

    expect(
      ActorBlueprintSchema.safeParse({
        blueprintId: 'walker',
        stepCooldownTicks: 1.5,
        behavior: 'inert',
      }).success,
    ).toBe(false);
  });

  it('validates issuer and command type together', () => {
    const scenarioCommand = {
      tick: 0,
      issuer: 'player',
      command: {
        type: 'scenario/spawn-actor',
        blueprintId: 'walker',
        position: { x: 0, y: 0, z: 7 },
        facing: 'n',
      },
    };
    const actorCommand = {
      tick: 0,
      issuer: 'scenario',
      command: { type: 'actor/wait', entityId: 1 },
    };

    for (const input of [scenarioCommand, actorCommand]) {
      const result = SimulationCommandInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          simulationDiagnosticsFromZodError(result.error).map(
            ({ code }) => code,
          ),
        ).toContain('SIM_COMMAND_FORBIDDEN');
      }
    }
  });

  it('keeps the frozen command priority table', () => {
    expect(commandPriority('scenario/spawn-actor')).toBe(0);
    expect(commandPriority('scenario/despawn-actor')).toBe(0);
    expect(commandPriority('actor/face')).toBe(1);
    expect(commandPriority('actor/move-step')).toBe(2);
    expect(commandPriority('actor/wait')).toBe(3);
  });

  it('requires snapshot collections to use their canonical order', () => {
    const snapshot = createSnapshot();
    snapshot.actors = [at(snapshot.actors, 1), at(snapshot.actors, 0)];
    expectSchemaInvalid(validateSimulationSnapshot(snapshot));

    const streams = createSnapshot();
    streams.randomStreams = [
      at(streams.randomStreams, 0),
      { label: 'ai', s0: 1, s1: 2, s2: 3, s3: 4, drawCount: 0 },
    ];
    expect(validateSimulationSnapshot(streams).ok).toBe(false);

    const decimalState = createSnapshot();
    at(decimalState.randomStreams, 0).s0 = 1.5;
    expectSchemaInvalid(validateSimulationSnapshot(decimalState));
  });

  it('requires pendingIntents to be ordered by (tick, entityId) without duplicates', () => {
    const unordered = createSnapshot();
    unordered.pendingIntents = [
      { tick: 1, entityId: 1, direction: 'e' },
      { tick: 0, entityId: 2, direction: 'nw' },
    ];
    expectSchemaInvalid(validateSimulationSnapshot(unordered));

    const sameTickUnordered = createSnapshot();
    sameTickUnordered.pendingIntents = [
      { tick: 1, entityId: 2, direction: 'nw' },
      { tick: 1, entityId: 1, direction: 'e' },
    ];
    expectSchemaInvalid(validateSimulationSnapshot(sameTickUnordered));

    const duplicated = createSnapshot();
    duplicated.pendingIntents = [
      { tick: 1, entityId: 1, direction: 'e' },
      { tick: 1, entityId: 1, direction: 'nw' },
    ];
    const duplicateResult = validateSimulationSnapshot(duplicated);
    expectSchemaInvalid(duplicateResult);
    expect(
      duplicateResult.ok
        ? []
        : duplicateResult.diagnostics.map((item) => item.message),
    ).toContain(
      'pendingIntents[1]: pendingIntents must not repeat a (tick, entityId) pair',
    );
  });

  it('rejects a pending intent scheduled before the snapshot tick', () => {
    const past = createSnapshot();
    past.tick = 4;
    past.pendingIntents = [{ tick: 3, entityId: 1, direction: 'e' }];
    expectSchemaInvalid(validateSimulationSnapshot(past), 'SIM_TICK_IN_PAST');
  });

  it('rejects a pending intent with an unknown direction or a decimal tick', () => {
    const unknownDirection = createSnapshot();
    unknownDirection.pendingIntents = [
      { tick: 1, entityId: 1, direction: 'north' },
    ];
    expectSchemaInvalid(validateSimulationSnapshot(unknownDirection));

    const decimalTick = createSnapshot();
    decimalTick.pendingIntents = [{ tick: 1.5, entityId: 1, direction: 'e' }];
    expectSchemaInvalid(validateSimulationSnapshot(decimalTick));
  });

  it('pins the schema version at 3 and the rules version at 2', () => {
    // Floors, transitions and the spawn system changed both the format and
    // the kernel semantics, so both numbers moved.
    expect(SIMULATION_SCHEMA_VERSION).toBe(3);
    expect(SIMULATION_RULES_VERSION).toBe(2);
  });

  it('rejects non-increasing command sequences and decreasing ticks in logs', () => {
    const duplicateSequence = createCommandLog();
    at(duplicateSequence.commands, 1).sequence = 1;
    expectSchemaInvalid(
      validateSimulationCommandLog(duplicateSequence),
      'SIM_COMMAND_DUPLICATE',
    );

    const decreasingTick = createCommandLog();
    at(decreasingTick.commands, 1).tick = 0;
    at(decreasingTick.commands, 1).sequence = 2;
    at(decreasingTick.commands, 0).tick = 1;
    expectSchemaInvalid(validateSimulationCommandLog(decreasingTick));
  });

  it('reports version mismatches with a stable domain diagnostic', () => {
    const snapshot = createSnapshot();
    snapshot.rulesVersion = SIMULATION_RULES_VERSION + 1;
    const result = validateSimulationSnapshot(snapshot);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          code: 'SIM_VERSION_MISMATCH',
          path: ['rulesVersion'],
        }),
      ]);
    }
  });

  it('reports invalid seeds with the seed-specific diagnostic', () => {
    const snapshot = createSnapshot();
    snapshot.seed = '0F1E2D3C4B5A6978';
    const result = validateSimulationSnapshot(snapshot);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          code: 'SIM_SEED_INVALID',
          path: ['seed'],
        }),
      ]);
    }
  });

  it('sorts diagnostics by path and then code', () => {
    const schema = z.object({ alpha: z.string(), zeta: z.string() }).strict();
    const parsed = schema.safeParse({ alpha: 1, zeta: 2 });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const diagnostics = simulationDiagnosticsFromZodError(parsed.error);
      expect(diagnostics.map(({ path }) => path)).toEqual([
        ['alpha'],
        ['zeta'],
      ]);
    }
  });
});
