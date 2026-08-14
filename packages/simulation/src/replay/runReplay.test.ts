import type {
  SimulationCommandLog,
  SimulationCommandRecord,
} from '@huntbound/contracts';
import {
  createEntityId,
  createTickIndex,
  SIMULATION_RULES_VERSION,
  SIMULATION_SCHEMA_VERSION,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { at, kernelScenario, TEST_SEED } from '../kernel/testScenarios.ts';
import { encodeCanonicalJson } from '../state/canonicalJson.ts';
import { restoreSimulationKernel, snapshotKernel } from '../state/snapshot.ts';
import { encodeEventJournal } from './eventJournalFile.ts';
import { prepareReplayKernel, runReplay } from './runReplay.ts';

const scenario = kernelScenario({
  scenarioId: 'replay-test',
  blockedTiles: [[3, 1]],
  initialActors: [
    { blueprintId: 'walker', position: at(1, 1), facing: 's' },
    { blueprintId: 'statue', position: at(2, 1), facing: 's' },
    { blueprintId: 'wanderer', position: at(1, 4), facing: 's' },
  ],
});

function moveRecord(
  sequence: number,
  tick: number,
  entityId: number,
  direction: 'n' | 'e' | 's' | 'w',
): SimulationCommandRecord {
  return {
    tick: createTickIndex(tick),
    sequence,
    issuer: 'player',
    command: {
      type: 'actor/move-step',
      entityId: createEntityId(entityId),
      direction,
    },
  };
}

function log(
  overrides: Partial<SimulationCommandLog['header']> = {},
  commands: readonly SimulationCommandRecord[] = [
    moveRecord(1, 2, 1, 'n'),
    moveRecord(2, 6, 1, 'e'),
    moveRecord(3, 9, 2, 'w'),
  ],
): SimulationCommandLog {
  return {
    header: {
      kind: 'header',
      schemaVersion: SIMULATION_SCHEMA_VERSION,
      rulesVersion: SIMULATION_RULES_VERSION,
      scenarioId: scenario.scenarioId,
      scenarioRevision: scenario.scenarioRevision,
      seed: TEST_SEED,
      tickCount: 20,
      ...overrides,
    },
    commands,
  };
}

function valueOrThrow<T>(
  result:
    | { ok: true; value: T }
    | { ok: false; diagnostics: readonly { code: string }[] },
): T {
  if (!result.ok) {
    throw new Error(
      `replay failed: ${result.diagnostics.map((item) => item.code).join(', ')}`,
    );
  }
  return result.value;
}

describe('runReplay', () => {
  it('applies each logged command on its own tick', () => {
    const result = valueOrThrow(runReplay(scenario, log()));
    const moved = result.events.filter(
      (event) => event.payload.type === 'actor/moved',
    );

    expect(
      moved.map((event) => [
        event.tick,
        (event.payload as { entityId: number }).entityId,
      ]),
    ).toEqual(
      expect.arrayContaining([
        [2, 1],
        [6, 1],
        [9, 2],
      ]),
    );
  });

  it('stops at the tick count declared in the header', () => {
    const result = valueOrThrow(runReplay(scenario, log({ tickCount: 12 })));

    expect(result.snapshot.tick).toBe(12);
  });

  it('produces byte-identical output when the same log runs twice', () => {
    const first = valueOrThrow(runReplay(scenario, log()));
    const second = valueOrThrow(runReplay(scenario, log()));

    expect(encodeCanonicalJson(second.snapshot)).toBe(
      encodeCanonicalJson(first.snapshot),
    );
    expect(encodeEventJournal(second.events)).toBe(
      encodeEventJournal(first.events),
    );
  });

  it('rejects a log written for another scenario', () => {
    const result = runReplay(scenario, log({ scenarioId: 'other' }));

    expect(
      result.ok ? [] : result.diagnostics.map((item) => item.code),
    ).toContain('SIM_SCENARIO_MISMATCH');
  });

  it('rejects a log written for another scenario revision', () => {
    const result = runReplay(scenario, log({ scenarioRevision: 9 }));

    expect(
      result.ok ? [] : result.diagnostics.map((item) => item.code),
    ).toContain('SIM_SCENARIO_MISMATCH');
  });

  it('rejects a log written by another rules version', () => {
    const result = runReplay(
      scenario,
      log({ rulesVersion: SIMULATION_RULES_VERSION + 1 }),
    );

    expect(
      result.ok ? [] : result.diagnostics.map((item) => item.code),
    ).toContain('SIM_VERSION_MISMATCH');
  });

  it('rejects a log whose sequences the kernel would not reproduce', () => {
    const result = runReplay(
      scenario,
      log({}, [moveRecord(4, 2, 1, 'n'), moveRecord(9, 6, 1, 'e')]),
    );

    expect(
      result.ok ? [] : result.diagnostics.map((item) => item.code),
    ).toContain('SIM_REPLAY_DIVERGED');
  });

  it('changes the snapshot when a single command changes', () => {
    const baseline = valueOrThrow(runReplay(scenario, log()));
    const altered = valueOrThrow(
      runReplay(
        scenario,
        log({}, [
          moveRecord(1, 2, 1, 's'),
          moveRecord(2, 6, 1, 'e'),
          moveRecord(3, 9, 2, 'w'),
        ]),
      ),
    );

    expect(encodeCanonicalJson(altered.snapshot)).not.toBe(
      encodeCanonicalJson(baseline.snapshot),
    );
  });

  it('changes the snapshot when a single seed bit changes', () => {
    const baseline = valueOrThrow(runReplay(scenario, log()));
    const altered = valueOrThrow(
      runReplay(
        scenario,
        log({ seed: '0f1e2d3c4b5a6979' as typeof TEST_SEED }),
      ),
    );

    expect(encodeCanonicalJson(altered.snapshot)).not.toBe(
      encodeCanonicalJson(baseline.snapshot),
    );
  });

  it('converges when the run is split at a boundary that owes an AI intent', () => {
    const straight = valueOrThrow(runReplay(scenario, log()));

    const kernel = valueOrThrow(prepareReplayKernel(scenario, log()));
    kernel.advance(13);
    const head = snapshotKernel(kernel);
    expect(head.pendingIntents.length).toBeGreaterThan(0);

    const resumed = valueOrThrow(restoreSimulationKernel(scenario, head));
    const tail = resumed.advance(7);

    expect(encodeCanonicalJson(snapshotKernel(resumed))).toBe(
      encodeCanonicalJson(straight.snapshot),
    );
    expect(encodeEventJournal(tail)).toBe(
      encodeEventJournal(straight.events.filter((event) => event.tick >= 13)),
    );
  });
});

describe('encodeEventJournal', () => {
  it('writes one canonical JSON line per event and ends with a newline', () => {
    const result = valueOrThrow(runReplay(scenario, log({ tickCount: 1 })));
    const text = encodeEventJournal(result.events);

    expect(text.endsWith('\n')).toBe(true);
    const lines = text.split('\n').slice(0, -1);
    expect(lines).toHaveLength(result.events.length);
    expect(lines[0]).toBe(encodeCanonicalJson(result.events[0]));
  });

  it('writes an empty journal as an empty file', () => {
    expect(encodeEventJournal([])).toBe('');
  });
});
