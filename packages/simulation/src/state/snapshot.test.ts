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
import {
  isKernelQuiescent,
  restoreSimulationKernel,
  snapshotKernel,
} from './snapshot.ts';

const SNAPSHOT_KEYS = [
  'actors',
  'nextCommandSequence',
  'nextEntityId',
  'nextEventSequence',
  'pendingCommands',
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

describe('restoreSimulationKernel', () => {
  it('resumes a quiescent boundary identically to an uninterrupted run', () => {
    const scenario = crowdedScenario();
    const straight = createSimulationKernel(scenario, TEST_SEED);
    straight.advance(11);
    const straightTail = straight.advance(9);

    const split = createSimulationKernel(scenario, TEST_SEED);
    split.advance(11);
    expect(isKernelQuiescent(split)).toBe(true);
    const resumed = restoredOrThrow(scenario, snapshotKernel(split));
    const resumedTail = resumed.advance(9);

    expect(eventText(resumedTail)).toBe(eventText(straightTail));
    expect(encodeCanonicalJson(snapshotKernel(resumed))).toBe(
      encodeCanonicalJson(snapshotKernel(straight)),
    );
  });

  it('cannot resume a boundary that still owes a decided AI intent', () => {
    // The frozen snapshot carries pendingCommands, which are external only.
    // An intent decided by S3 at tick T for tick T + 1 has no field to live in,
    // so tick 1 of this scenario is not restorable. The limitation is proved
    // here on purpose: a silent divergence would be far worse than a known one.
    const scenario = crowdedScenario();
    const straight = createSimulationKernel(scenario, TEST_SEED);
    straight.advance(1);
    const straightTail = straight.advance(8);

    const split = createSimulationKernel(scenario, TEST_SEED);
    split.advance(1);
    expect(isKernelQuiescent(split)).toBe(false);
    const resumed = restoredOrThrow(scenario, snapshotKernel(split));

    expect(eventText(resumed.advance(8))).not.toBe(eventText(straightTail));
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
