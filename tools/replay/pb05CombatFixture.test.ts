import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SIMULATION_RULES_VERSION,
  type SimulationEvent,
  validateKernelScenario,
} from '../../packages/contracts/src/index.ts';
import {
  decodeCommandLog,
  encodeCanonicalJson,
} from '../../packages/simulation/src/index.ts';
import {
  composePb05CombatSession,
  PB05_COMBAT_SEED,
  PB05_COMBAT_TICK_COUNT,
  sessionCoverage,
} from './generatePb05CombatFixture.ts';
import { buildReplayArtifacts } from './replayArtifacts.ts';

const fixtureRoot = resolve(
  import.meta.dirname,
  '../../packages/test-fixtures/hunt/pb05',
);

const REQUIRED_COVERAGE = {
  attacked: true,
  damagedAttack: true,
  damagedAbility: true,
  playerReceivedDamage: true,
  healed: true,
  castBerserk: true,
  castBrutalStrike: true,
  castWoundCleansing: true,
  targetChanged: true,
  died: true,
  lootGranted: true,
  respawnAfterDeath: true,
  combatRejected: true,
} as const;

interface Fixture {
  readonly scenarioText: string;
  readonly logText: string;
  readonly snapshotText: string;
  readonly eventsText: string;
}

async function readFixture(): Promise<Fixture> {
  const [scenarioText, logText, snapshotText, eventsText] = await Promise.all([
    readFile(resolve(fixtureRoot, 'scenario.json'), 'utf8'),
    readFile(resolve(fixtureRoot, 'commands.jsonl'), 'utf8'),
    readFile(resolve(fixtureRoot, 'snapshot.golden.json'), 'utf8'),
    readFile(resolve(fixtureRoot, 'events.golden.jsonl'), 'utf8'),
  ]);
  return { scenarioText, logText, snapshotText, eventsText };
}

function parsedEvents(text: string): readonly SimulationEvent[] {
  return text
    .trimEnd()
    .split('\n')
    .map((line) => JSON.parse(line) as SimulationEvent);
}

describe('PB-05 combat session coverage', () => {
  it('exercises every required combat event on the real hunt scenario', async () => {
    const session = await composePb05CombatSession();
    const scenario = validateKernelScenario(
      JSON.parse(session.scenarioText) as unknown,
    );
    const log = decodeCommandLog(session.logText);

    expect(scenario.ok).toBe(true);
    expect(log.ok).toBe(true);
    if (!scenario.ok || !log.ok) {
      return;
    }

    expect(log.value.header).toMatchObject({
      scenarioId: 'scenario:hunt:tibia:venore-rotworm-cave',
      seed: PB05_COMBAT_SEED,
      tickCount: PB05_COMBAT_TICK_COUNT,
    });
    expect(
      log.value.commands.every((command) => command.issuer === 'player'),
    ).toBe(true);
    expect(session.coverage).toEqual(REQUIRED_COVERAGE);
  }, 30_000);
});

describe('PB-05 combat replay fixture', () => {
  it('freezes the composed hunt scenario and the 2700-tick command header', async () => {
    const fixture = await readFixture();
    const scenario = validateKernelScenario(
      JSON.parse(fixture.scenarioText) as unknown,
    );
    const log = decodeCommandLog(fixture.logText);

    expect(scenario.ok).toBe(true);
    expect(log.ok).toBe(true);
    if (!scenario.ok || !log.ok) {
      return;
    }

    expect(log.value.header).toMatchObject({
      scenarioId: 'scenario:hunt:tibia:venore-rotworm-cave',
      seed: PB05_COMBAT_SEED,
      tickCount: PB05_COMBAT_TICK_COUNT,
      scenarioRevision: 2,
    });
    expect(
      log.value.commands.every((command) => command.issuer === 'player'),
    ).toBe(true);
    expect(
      scenario.value.blueprints.find(
        (blueprint) => blueprint.blueprintId === 'rotworm',
      )?.aggroRadius,
    ).toBe(1);
  });

  it('proves combat coverage on the committed journal before trusting the golden', async () => {
    const fixture = await readFixture();
    const built = buildReplayArtifacts(fixture.scenarioText, fixture.logText);
    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }

    const events = parsedEvents(built.value.eventsText);
    expect(JSON.parse(built.value.snapshotText).tick).toBe(
      PB05_COMBAT_TICK_COUNT,
    );
    expect(sessionCoverage(events)).toEqual(REQUIRED_COVERAGE);
  });

  it('reproduces the committed goldens and converges at every boundary', async () => {
    const fixture = await readFixture();
    const straight = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText,
    );
    expect(straight.ok).toBe(true);
    if (!straight.ok) {
      return;
    }
    expect(straight.value.snapshotText).toBe(fixture.snapshotText);
    expect(straight.value.eventsText).toBe(fixture.eventsText);

    const divergent: number[] = [];
    for (let boundary = 0; boundary <= PB05_COMBAT_TICK_COUNT; boundary += 1) {
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
  }, 180_000);

  it('distinguishes seed, command, and rules-version changes', async () => {
    const fixture = await readFixture();
    const baseline = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText,
    );
    expect(baseline.ok).toBe(true);
    if (!baseline.ok) {
      return;
    }

    const changedSeed = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText.replace(PB05_COMBAT_SEED, '2c3d4e5f60718294'),
    );
    expect(changedSeed.ok).toBe(true);
    if (changedSeed.ok) {
      expect(changedSeed.value.snapshotText).not.toBe(
        baseline.value.snapshotText,
      );
      expect(changedSeed.value.eventsText).not.toBe(baseline.value.eventsText);
    }

    const changedCommand = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText.replace(
        '"direction":"sw","entityId":1},"sequence":2,"tick":1',
        '"direction":"se","entityId":1},"sequence":2,"tick":1',
      ),
    );
    expect(changedCommand.ok).toBe(true);
    if (changedCommand.ok) {
      expect(changedCommand.value.snapshotText).not.toBe(
        baseline.value.snapshotText,
      );
      expect(changedCommand.value.eventsText).not.toBe(
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
    const fixture = await readFixture();
    expect(fixture.scenarioText).toBe(
      `${encodeCanonicalJson(JSON.parse(fixture.scenarioText))}\n`,
    );
  });
});
