import type { SimulationEvent, SimulationSnapshot } from '@huntbound/contracts';
import {
  createSeed,
  SIMULATION_RULES_VERSION,
  SIMULATION_SCHEMA_VERSION,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { createSimulationKernel } from '../kernel/index.ts';
import {
  at,
  kernelScenario,
  moveStep,
  spawnActor,
  TEST_SEED,
} from '../kernel/testScenarios.ts';
import { encodeCanonicalJson } from './canonicalJson.ts';
import { restoreSimulationKernel, snapshotKernel } from './snapshot.ts';

const SNAPSHOT_KEYS = [
  'actors',
  'nextCommandSequence',
  'nextEntityId',
  'nextEventSequence',
  'pendingCommands',
  'pendingIntents',
  'randomStreams',
  'rulesVersion',
  'scenarioId',
  'scenarioRevision',
  'schemaVersion',
  'seed',
  'tick',
];

function crowdedScenario() {
  return kernelScenario({
    scenarioId: 'snapshot-test',
    blockedTiles: [[3, 1]],
    initialActors: [
      { blueprintId: 'walker', position: at(1, 1), facing: 's' },
      { blueprintId: 'statue', position: at(2, 1), facing: 's' },
      { blueprintId: 'wanderer', position: at(1, 4), facing: 's' },
    ],
  });
}

function restoredOrThrow(
  scenario: ReturnType<typeof crowdedScenario>,
  snapshot: SimulationSnapshot,
) {
  const restored = restoreSimulationKernel(scenario, snapshot);
  if (!restored.ok) {
    throw new Error(
      `restore failed: ${restored.diagnostics.map((item) => item.code).join(', ')}`,
    );
  }
  return restored.value;
}

function eventText(events: readonly SimulationEvent[]): string {
  return encodeCanonicalJson(events);
}

describe('snapshotKernel', () => {
  it('carries exactly the frozen fields, with no terrain and no occupancy', () => {
    const kernel = createSimulationKernel(crowdedScenario(), TEST_SEED);
    kernel.advance(3);

    const snapshot = snapshotKernel(kernel);

    expect(Object.keys(snapshot).sort()).toEqual(SNAPSHOT_KEYS);
    expect(encodeCanonicalJson(snapshot)).not.toContain('blockedTiles');
    expect(encodeCanonicalJson(snapshot)).not.toContain('occupancy');
  });

  it('records identity, versions and tick of the kernel', () => {
    const scenario = crowdedScenario();
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advance(5);

    const snapshot = snapshotKernel(kernel);

    expect(snapshot.schemaVersion).toBe(SIMULATION_SCHEMA_VERSION);
    expect(snapshot.rulesVersion).toBe(SIMULATION_RULES_VERSION);
    expect(snapshot.scenarioId).toBe(scenario.scenarioId);
    expect(snapshot.scenarioRevision).toBe(scenario.scenarioRevision);
    expect(snapshot.seed).toBe(TEST_SEED);
    expect(snapshot.tick).toBe(5);
  });

  it('orders actors by entityId, streams by label and pending commands by tick then sequence', () => {
    const kernel = createSimulationKernel(crowdedScenario(), TEST_SEED);
    kernel.enqueue(spawnActor('walker', at(5, 5), 's', 0));
    kernel.advance(1);
    kernel.enqueue(moveStep(1, 'e', 4));
    kernel.enqueue(moveStep(2, 'e', 3));

    const snapshot = snapshotKernel(kernel);

    expect(snapshot.actors.map((actor) => actor.entityId)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(snapshot.randomStreams.map((stream) => stream.label)).toEqual([
      'ai',
      'movement',
      'scenario',
    ]);
    expect(
      snapshot.pendingCommands.map((record) => [record.tick, record.sequence]),
    ).toEqual([
      [3, 3],
      [4, 2],
    ]);
  });

  it('keeps the random stream draw counts observed by the kernel', () => {
    const kernel = createSimulationKernel(crowdedScenario(), TEST_SEED);
    kernel.advance(9);

    const snapshot = snapshotKernel(kernel);
    const ai = snapshot.randomStreams.find((stream) => stream.label === 'ai');

    expect(ai?.drawCount).toBeGreaterThan(0);
  });
});

const SWEEP_TICKS = 24;

/**
 * Splitting a run at `boundary` must be indistinguishable from not splitting
 * it: the events the split kernel drained before the snapshot, followed by the
 * events the restored kernel drains after it, must be the whole run, and the
 * two runs must end on the same state.
 */
function resumeReport(boundary: number): string[] {
  const scenario = crowdedScenario();
  const straight = createSimulationKernel(scenario, TEST_SEED);
  const straightEvents = straight.advance(SWEEP_TICKS);

  const split = createSimulationKernel(scenario, TEST_SEED);
  const head = split.advance(boundary);
  const resumed = restoredOrThrow(scenario, snapshotKernel(split));
  const tail = resumed.advance(SWEEP_TICKS - boundary);

  const problems: string[] = [];
  if (eventText([...head, ...tail]) !== eventText(straightEvents)) {
    problems.push(`tick ${boundary}: event journal differs`);
  }
  if (
    encodeCanonicalJson(snapshotKernel(resumed)) !==
    encodeCanonicalJson(snapshotKernel(straight))
  ) {
    problems.push(`tick ${boundary}: final snapshot differs`);
  }
  return problems;
}

describe('restoreSimulationKernel', () => {
  it('resumes every boundary identically to an uninterrupted run', () => {
    const problems: string[] = [];
    for (let boundary = 0; boundary <= SWEEP_TICKS; boundary += 1) {
      problems.push(...resumeReport(boundary));
    }

    expect(problems).toEqual([]);
  });

  it('resumes a boundary that still owes a decided AI intent', () => {
    // S3 decides at the end of tick T an intent applied at T + 1, so tick 1 of
    // this scenario owes a decision. The snapshot carries it in pendingIntents;
    // without that field the resumed run silently loses the decision.
    expect(resumeReport(1)).toEqual([]);
  });

  it('replays the boot spawn events when a tick-zero snapshot is resumed', () => {
    // The boot events belong to tick 0, so they are emitted by tick 0 and not
    // by the constructor. Emitting them earlier would strand them in an
    // undrained journal that no snapshot field can carry.
    const scenario = crowdedScenario();
    const straight = createSimulationKernel(scenario, TEST_SEED);
    const firstTick = straight.advance(1);

    const resumed = restoredOrThrow(
      scenario,
      snapshotKernel(createSimulationKernel(scenario, TEST_SEED)),
    );

    expect(eventText(resumed.advance(1))).toBe(eventText(firstTick));
  });

  it('rebuilds the occupancy index so a blocked step is still blocked', () => {
    const scenario = crowdedScenario();
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    const restored = restoredOrThrow(scenario, snapshotKernel(kernel));

    restored.enqueue(moveStep(1, 'e', 0));
    const events = restored.advance(1);
    const blocked = events.find(
      (event) => event.payload.type === 'actor/move-blocked',
    );

    expect(blocked?.payload).toMatchObject({
      entityId: 1,
      reason: 'occupied',
    });
  });

  it('keeps commands queued for future ticks', () => {
    const scenario = crowdedScenario();
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(moveStep(1, 'n', 4));

    const restored = restoredOrThrow(scenario, snapshotKernel(kernel));
    const events = restored.advance(5);
    const moved = events.filter(
      (event) => event.payload.type === 'actor/moved',
    );

    expect(moved.some((event) => event.tick === 4)).toBe(true);
  });

  it('continues the command sequence counter without reusing a sequence', () => {
    const scenario = crowdedScenario();
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(moveStep(1, 'n', 4));
    kernel.enqueue(moveStep(2, 'n', 4));

    const restored = restoredOrThrow(scenario, snapshotKernel(kernel));
    const acceptance = restored.enqueue(moveStep(1, 'n', 6));

    expect(acceptance).toEqual({ ok: true, sequence: 3 });
  });

  it('rejects a snapshot taken from another scenario', () => {
    const scenario = crowdedScenario();
    const snapshot = snapshotKernel(
      createSimulationKernel(scenario, TEST_SEED),
    );

    const restored = restoreSimulationKernel(
      { ...scenario, scenarioId: 'other-scenario' },
      snapshot,
    );

    expect(restored.ok).toBe(false);
    expect(
      restored.ok ? [] : restored.diagnostics.map((item) => item.code),
    ).toContain('SIM_SCENARIO_MISMATCH');
  });

  it('rejects a snapshot taken from another scenario revision', () => {
    const scenario = crowdedScenario();
    const snapshot = snapshotKernel(
      createSimulationKernel(scenario, TEST_SEED),
    );

    const restored = restoreSimulationKernel(
      { ...scenario, scenarioRevision: 2 },
      snapshot,
    );

    expect(restored.ok).toBe(false);
    expect(
      restored.ok ? [] : restored.diagnostics.map((item) => item.code),
    ).toContain('SIM_SCENARIO_MISMATCH');
  });

  it('rejects a snapshot written by another schema or rules version', () => {
    const scenario = crowdedScenario();
    const snapshot = snapshotKernel(
      createSimulationKernel(scenario, TEST_SEED),
    );

    const schemaMismatch = restoreSimulationKernel(scenario, {
      ...snapshot,
      schemaVersion: snapshot.schemaVersion + 1,
    });
    const rulesMismatch = restoreSimulationKernel(scenario, {
      ...snapshot,
      rulesVersion: snapshot.rulesVersion + 1,
    });

    expect(
      schemaMismatch.ok ? [] : schemaMismatch.diagnostics.map((i) => i.code),
    ).toContain('SIM_VERSION_MISMATCH');
    expect(
      rulesMismatch.ok ? [] : rulesMismatch.diagnostics.map((i) => i.code),
    ).toContain('SIM_VERSION_MISMATCH');
  });

  it('rejects a structurally invalid snapshot', () => {
    const scenario = crowdedScenario();
    const snapshot = snapshotKernel(
      createSimulationKernel(scenario, TEST_SEED),
    );

    const restored = restoreSimulationKernel(scenario, {
      ...snapshot,
      seed: createSeed('0000000000000000'),
      nextEntityId: 0,
    });

    expect(restored.ok).toBe(false);
  });
});
