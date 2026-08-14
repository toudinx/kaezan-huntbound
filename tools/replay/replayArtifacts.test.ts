import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SIMULATION_RULES_VERSION,
  validateKernelScenario,
} from '../../packages/contracts/src/index.ts';
import {
  decodeCommandLog,
  prepareReplayKernel,
  snapshotKernel,
} from '../../packages/simulation/src/index.ts';
import { buildReplayArtifacts, sha256Hex } from './replayArtifacts.ts';

const fixtureRoot = resolve(
  import.meta.dirname,
  '../../packages/test-fixtures/simulation/pb03',
);

async function fixtures() {
  const [scenarioText, logText] = await Promise.all([
    readFile(resolve(fixtureRoot, 'scenario.json'), 'utf8'),
    readFile(resolve(fixtureRoot, 'commands.jsonl'), 'utf8'),
  ]);
  return { scenarioText, logText };
}

describe('sha256Hex', () => {
  it('hashes the UTF-8 bytes of the text', () => {
    expect(sha256Hex('abc')).toBe(
      createHash('sha256').update('abc', 'utf8').digest('hex'),
    );
  });

  it('is stable across calls', () => {
    expect(sha256Hex('pb-03')).toBe(sha256Hex('pb-03'));
  });
});

describe('buildReplayArtifacts', () => {
  it('produces a canonical snapshot file and a JSONL journal', async () => {
    const { scenarioText, logText } = await fixtures();

    const built = buildReplayArtifacts(scenarioText, logText);

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.value.snapshotText.endsWith('\n')).toBe(true);
    expect(built.value.snapshotText).not.toContain('\n{');
    expect(built.value.eventsText.endsWith('\n')).toBe(true);
    expect(built.value.snapshotText).toContain('"tick":200');
  });

  it('produces byte-identical artifacts on repeated runs', async () => {
    const { scenarioText, logText } = await fixtures();

    const first = buildReplayArtifacts(scenarioText, logText);
    const second = buildReplayArtifacts(scenarioText, logText);

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.snapshotText).toBe(first.value.snapshotText);
    expect(second.value.eventsText).toBe(first.value.eventsText);
    expect(second.value.digests).toEqual(first.value.digests);
  });

  it('digests the exact bytes it reports', async () => {
    const { scenarioText, logText } = await fixtures();

    const built = buildReplayArtifacts(scenarioText, logText);

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.value.digests.scenario).toBe(sha256Hex(scenarioText));
    expect(built.value.digests.commands).toBe(sha256Hex(logText));
    expect(built.value.digests.snapshot).toBe(
      sha256Hex(built.value.snapshotText),
    );
    expect(built.value.digests.events).toBe(sha256Hex(built.value.eventsText));
  });

  it('changes the snapshot digest when one seed bit changes', async () => {
    const { scenarioText, logText } = await fixtures();
    const baseline = buildReplayArtifacts(scenarioText, logText);
    const altered = buildReplayArtifacts(
      scenarioText,
      logText.replace('0f1e2d3c4b5a6978', '0f1e2d3c4b5a6979'),
    );

    expect(baseline.ok && altered.ok).toBe(true);
    if (!baseline.ok || !altered.ok) return;
    expect(altered.value.digests.snapshot).not.toBe(
      baseline.value.digests.snapshot,
    );
  });

  it('changes the snapshot digest when a state-changing command changes', async () => {
    const { scenarioText, logText } = await fixtures();
    const baseline = buildReplayArtifacts(scenarioText, logText);
    // The first accepted step of entity 1, at tick 5: west becomes north.
    const altered = buildReplayArtifacts(
      scenarioText,
      logText.replace(
        '"direction":"w","entityId":1',
        '"direction":"n","entityId":1',
      ),
    );

    expect(baseline.ok && altered.ok).toBe(true);
    if (!baseline.ok || !altered.ok) return;
    expect(altered.value.digests.snapshot).not.toBe(
      baseline.value.digests.snapshot,
    );
    expect(altered.value.digests.events).not.toBe(
      baseline.value.digests.events,
    );
  });

  it('changes the events digest when a blocked command changes', async () => {
    // Both `ne` and `se` from (1,1) are refused by the same corner tile, so no
    // state changes and the snapshot cannot see the edit. The journal can: the
    // attempted position differs. This is why verify compares both goldens.
    const { scenarioText, logText } = await fixtures();
    const baseline = buildReplayArtifacts(scenarioText, logText);
    const altered = buildReplayArtifacts(
      scenarioText,
      logText.replace(
        '"direction":"ne","entityId":1',
        '"direction":"se","entityId":1',
      ),
    );

    expect(baseline.ok && altered.ok).toBe(true);
    if (!baseline.ok || !altered.ok) return;
    expect(altered.value.digests.snapshot).toBe(
      baseline.value.digests.snapshot,
    );
    expect(altered.value.digests.events).not.toBe(
      baseline.value.digests.events,
    );
  });

  it('refuses a log written by another rules version', async () => {
    const { scenarioText, logText } = await fixtures();

    const built = buildReplayArtifacts(
      scenarioText,
      logText.replace(
        `"rulesVersion":${SIMULATION_RULES_VERSION}`,
        `"rulesVersion":${SIMULATION_RULES_VERSION + 1}`,
      ),
    );

    expect(built.ok).toBe(false);
    expect(
      built.ok ? [] : built.diagnostics.map((item) => item.code),
    ).toContain('SIM_VERSION_MISMATCH');
  });

  it('refuses a log line whose issuer may not emit the command', async () => {
    const { scenarioText, logText } = await fixtures();

    const built = buildReplayArtifacts(
      scenarioText,
      logText.replace(
        '{"issuer":"scenario","kind":"command","payload":{"entityId":5}',
        '{"issuer":"player","kind":"command","payload":{"entityId":5}',
      ),
    );

    expect(built.ok).toBe(false);
    expect(
      built.ok ? [] : built.diagnostics.map((item) => item.code),
    ).toContain('SIM_COMMAND_FORBIDDEN');
  });

  it('refuses malformed JSON with an input error, not a divergence', async () => {
    const { logText } = await fixtures();

    const built = buildReplayArtifacts('{ not json', logText);

    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.kind).toBe('invalid-input');
  });

  it('resumes from a mid-run snapshot and converges on the same final state', async () => {
    const { scenarioText, logText } = await fixtures();

    const built = buildReplayArtifacts(scenarioText, logText, {
      resumeAtTick: 117,
    });

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const straight = buildReplayArtifacts(scenarioText, logText);
    expect(straight.ok).toBe(true);
    if (!straight.ok) return;

    expect(built.value.snapshotText).toBe(straight.value.snapshotText);
    expect(built.value.eventsText).toBe(straight.value.eventsText);
  });

  it('resumes at a boundary that still owes a decided AI intent', async () => {
    const { scenarioText, logText } = await fixtures();
    const scenario = validateKernelScenario(
      JSON.parse(scenarioText) as unknown,
    );
    const log = decodeCommandLog(logText);
    expect(scenario.ok && log.ok).toBe(true);
    if (!scenario.ok || !log.ok) return;

    // Tick 117 is quiescent, so it never exercised the pending intents. Tick 13
    // does: the tool used to refuse it with SIM_REPLAY_DIVERGED.
    const probe = prepareReplayKernel(scenario.value, log.value);
    expect(probe.ok).toBe(true);
    if (!probe.ok) return;
    probe.value.advance(13);
    expect(snapshotKernel(probe.value).pendingIntents).not.toEqual([]);

    const built = buildReplayArtifacts(scenarioText, logText, {
      resumeAtTick: 13,
    });
    const straight = buildReplayArtifacts(scenarioText, logText);

    expect(built.ok).toBe(true);
    expect(straight.ok).toBe(true);
    if (!built.ok || !straight.ok) return;
    expect(built.value.snapshotText).toBe(straight.value.snapshotText);
    expect(built.value.eventsText).toBe(straight.value.eventsText);
  });

  it('resumes at every boundary of the first stretch of the run', async () => {
    const { scenarioText, logText } = await fixtures();
    const straight = buildReplayArtifacts(scenarioText, logText);
    expect(straight.ok).toBe(true);
    if (!straight.ok) return;

    const diverged: number[] = [];
    for (let boundary = 0; boundary <= 24; boundary += 1) {
      const built = buildReplayArtifacts(scenarioText, logText, {
        resumeAtTick: boundary,
      });
      if (
        !built.ok ||
        built.value.snapshotText !== straight.value.snapshotText ||
        built.value.eventsText !== straight.value.eventsText
      ) {
        diverged.push(boundary);
      }
    }

    expect(diverged).toEqual([]);
  });
});
