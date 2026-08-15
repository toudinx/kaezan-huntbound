import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  decodeCommandLog,
  encodeCanonicalJson,
} from '../../packages/simulation/src/index.ts';
import {
  SIMULATION_RULES_VERSION,
  validateKernelScenario,
} from '../../packages/contracts/src/index.ts';
import { buildReplayArtifacts } from './replayArtifacts.ts';

const fixtureRoot = resolve(
  import.meta.dirname,
  '../../packages/test-fixtures/hunt',
);

interface Fixture {
  readonly scenarioText: string;
  readonly logText: string;
  readonly snapshotText: string;
  readonly eventsText: string;
  readonly scenario: ReturnType<typeof JSON.parse>;
}

async function readFixture(name: 'pb04' | 'pb04-respawn'): Promise<Fixture> {
  const root = resolve(fixtureRoot, name);
  const [scenarioText, logText, snapshotText, eventsText] = await Promise.all([
    readFile(resolve(root, 'scenario.json'), 'utf8'),
    readFile(resolve(root, 'commands.jsonl'), 'utf8'),
    readFile(resolve(root, 'snapshot.golden.json'), 'utf8'),
    readFile(resolve(root, 'events.golden.jsonl'), 'utf8'),
  ]);
  return {
    scenarioText,
    logText,
    snapshotText,
    eventsText,
    scenario: JSON.parse(scenarioText) as unknown,
  };
}

function parsedEvents(text: string): readonly {
  readonly tick: number;
  readonly payload: Record<string, unknown>;
}[] {
  return text
    .trimEnd()
    .split('\n')
    .map(
      (line) =>
        JSON.parse(line) as {
          readonly tick: number;
          readonly payload: Record<string, unknown>;
        },
    );
}

describe('PB-04 hunt replay fixture', () => {
  it('freezes the corrected scenario and the 600-tick command header', async () => {
    const fixture = await readFixture('pb04');
    const scenario = validateKernelScenario(fixture.scenario);
    const log = decodeCommandLog(fixture.logText);

    expect(scenario.ok).toBe(true);
    expect(log.ok).toBe(true);
    if (!scenario.ok || !log.ok) return;

    expect(log.value.header).toMatchObject({
      scenarioId: 'scenario:hunt:tibia:venore-rotworm-cave',
      seed: '1a2b3c4d5e6f7a8b',
      tickCount: 600,
      scenarioRevision: 2,
    });
    expect(scenario.value.floors).toHaveLength(2);
    expect(scenario.value.transitions).toHaveLength(2);
    expect(
      scenario.value.spawnGroups.flatMap((group) => group.slots),
    ).toHaveLength(12);
    expect(scenario.value.initialActors[0]?.blueprintId).toBe('player');
  });

  it('proves route coverage before accepting the golden', async () => {
    const fixture = await readFixture('pb04');
    const built = buildReplayArtifacts(fixture.scenarioText, fixture.logText);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const events = parsedEvents(built.value.eventsText);
    const playerMoves = events.filter(
      ({ payload }) => payload.type === 'actor/moved' && payload.entityId === 1,
    );
    const playerTransitions = events.filter(
      ({ payload }) =>
        payload.type === 'actor/transitioned' && payload.entityId === 1,
    );
    const playerBlocked = new Set(
      events
        .filter(
          ({ payload }) =>
            payload.type === 'actor/move-blocked' && payload.entityId === 1,
        )
        .map(({ payload }) => payload.reason),
    );

    expect(JSON.parse(built.value.snapshotText).tick).toBe(600);
    expect(playerMoves.length).toBeGreaterThan(0);
    expect(playerTransitions.length).toBeGreaterThanOrEqual(2);
    expect([...playerBlocked]).toEqual(
      expect.arrayContaining(['terrain', 'occupied']),
    );
    expect(
      events.some(({ payload }) => payload.type === 'spawn/deferred'),
    ).toBe(true);
    expect(
      events.some(({ payload }) => payload.type === 'command/rejected'),
    ).toBe(true);
  });

  it('reproduces the committed main goldens and converges at every boundary', async () => {
    const fixture = await readFixture('pb04');
    const straight = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText,
    );
    expect(straight.ok).toBe(true);
    if (!straight.ok) return;
    expect(straight.value.snapshotText).toBe(fixture.snapshotText);
    expect(straight.value.eventsText).toBe(fixture.eventsText);

    const divergent: number[] = [];
    for (let boundary = 0; boundary <= 600; boundary += 1) {
      const split = buildReplayArtifacts(
        fixture.scenarioText,
        fixture.logText,
        {
          resumeAtTick: boundary,
        },
      );
      if (
        !split.ok ||
        split.value.snapshotText !== straight.value.snapshotText ||
        split.value.eventsText !== straight.value.eventsText
      ) {
        divergent.push(boundary);
      }
    }
    expect(divergent).toEqual([]);
  }, 30_000);

  it('proves the real 1800-tick respawn boundary', async () => {
    const fixture = await readFixture('pb04-respawn');
    const built = buildReplayArtifacts(fixture.scenarioText, fixture.logText);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const events = parsedEvents(built.value.eventsText);
    expect(
      events.some(
        ({ tick, payload }) =>
          tick === 1 &&
          payload.type === 'actor/despawned' &&
          payload.entityId === 2,
      ),
    ).toBe(true);
    expect(
      events.some(
        ({ tick, payload }) =>
          tick === 1801 &&
          payload.type === 'actor/spawned' &&
          payload.entityId === 14,
      ),
    ).toBe(true);
    expect(JSON.parse(built.value.snapshotText).tick).toBe(1805);

    for (const boundary of [0, 1, 2, 1800, 1801, 1805]) {
      const split = buildReplayArtifacts(
        fixture.scenarioText,
        fixture.logText,
        {
          resumeAtTick: boundary,
        },
      );
      expect(split.ok).toBe(true);
      if (!split.ok) continue;
      expect(split.value.snapshotText).toBe(built.value.snapshotText);
      expect(split.value.eventsText).toBe(built.value.eventsText);
    }
  });

  it('distinguishes seed, state, blocked-command, and rules-version changes', async () => {
    const fixture = await readFixture('pb04');
    const baseline = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText,
    );
    expect(baseline.ok).toBe(true);
    if (!baseline.ok) return;

    const changedSeed = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText.replace('1a2b3c4d5e6f7a8b', '1a2b3c4d5e6f7a8c'),
    );
    expect(changedSeed.ok).toBe(true);
    if (changedSeed.ok) {
      expect(changedSeed.value.snapshotText).not.toBe(
        baseline.value.snapshotText,
      );
    }

    const changedState = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText.replace(
        '"direction":"s","entityId":1',
        '"direction":"n","entityId":1',
      ),
    );
    expect(changedState.ok).toBe(true);
    if (changedState.ok) {
      expect(changedState.value.snapshotText).not.toBe(
        baseline.value.snapshotText,
      );
    }

    const changedBlocked = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText.replace(
        '"direction":"e","entityId":1',
        '"direction":"ne","entityId":1',
      ),
    );
    expect(changedBlocked.ok).toBe(true);
    if (changedBlocked.ok) {
      expect(changedBlocked.value.snapshotText).toBe(
        baseline.value.snapshotText,
      );
      expect(changedBlocked.value.eventsText).not.toBe(
        baseline.value.eventsText,
      );
    }

    const changedRules = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText.replace(
        `"rulesVersion":${SIMULATION_RULES_VERSION}`,
        `"rulesVersion":${SIMULATION_RULES_VERSION + 1}`,
      ),
    );
    expect(changedRules.ok).toBe(false);
  });

  it('keeps scenario JSON canonical', async () => {
    const fixture = await readFixture('pb04');
    expect(fixture.scenarioText).toBe(
      encodeCanonicalJson(JSON.parse(fixture.scenarioText)),
    );
  });
});
