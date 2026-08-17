import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import type {
  KernelScenario,
  SimulationCommandLog,
} from '../../../packages/contracts/src/index.ts';
import { validateKernelScenario } from '../../../packages/contracts/src/index.ts';
import {
  decodeCommandLog,
  encodeCanonicalJson,
  runReplay,
} from '../../../packages/simulation/src/index.ts';

export const PB05_COMBAT_SESSION_ID = 'pb-05-hunt-combat';
export const PB05_COMBAT_SCENARIO_ID =
  'scenario:hunt:tibia:venore-rotworm-cave';
export const PB05_COMBAT_TICK_COUNT = 2_700;

const fixtureUrl = new URL(
  '../../../packages/test-fixtures/hunt/pb05/',
  import.meta.url,
);

function fixtureText(name: string): string {
  return readFileSync(new URL(name, fixtureUrl), 'utf8');
}

function requireScenario(): KernelScenario {
  const result = validateKernelScenario(
    JSON.parse(fixtureText('scenario.json')) as unknown,
  );

  if (!result.ok) {
    throw new Error(
      `PB-05 scenario fixture is invalid: ${result.diagnostics
        .map((item) => `${item.code} ${item.message}`)
        .join('; ')}`,
    );
  }

  return result.value;
}

function requireCommandLog(scenario: KernelScenario): SimulationCommandLog {
  const result = decodeCommandLog(fixtureText('commands.jsonl'));

  if (!result.ok) {
    throw new Error(
      `PB-05 command fixture is invalid: ${result.diagnostics
        .map((item) => `${item.code} ${item.message}`)
        .join('; ')}`,
    );
  }

  if (
    result.value.header.scenarioId !== scenario.scenarioId ||
    result.value.header.tickCount !== PB05_COMBAT_TICK_COUNT
  ) {
    throw new Error('PB-05 command fixture targets a different session.');
  }

  return result.value;
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function expectedEventCount(): number {
  return fixtureText('events.golden.jsonl').trimEnd().split('\n').length;
}

export interface CombatSessionReplay {
  readonly canonicalSnapshot: string;
  readonly snapshotSha256: string;
  readonly eventCount: number;
  readonly finalTick: number;
}

export interface CombatSession {
  readonly sessionId: string;
  readonly scenarioId: string;
  readonly scenarioJson: string;
  readonly logText: string;
  readonly node: CombatSessionReplay;
}

export function buildCombatSession(): CombatSession {
  const scenario = requireScenario();
  const log = requireCommandLog(scenario);
  const replayed = runReplay(scenario, log);

  if (!replayed.ok) {
    throw new Error(
      `PB-05 replay failed: ${replayed.diagnostics
        .map((item) => `${item.code} ${item.message}`)
        .join('; ')}`,
    );
  }

  const canonicalSnapshot = `${encodeCanonicalJson(replayed.value.snapshot)}\n`;
  const expectedSnapshot = fixtureText('snapshot.golden.json');
  if (canonicalSnapshot !== expectedSnapshot) {
    throw new Error('PB-05 snapshot golden is stale relative to the replay.');
  }

  const eventCount = replayed.value.events.length;
  if (eventCount !== expectedEventCount()) {
    throw new Error('PB-05 event golden is stale relative to the replay.');
  }

  return {
    sessionId: PB05_COMBAT_SESSION_ID,
    scenarioId: scenario.scenarioId,
    scenarioJson: fixtureText('scenario.json'),
    logText: fixtureText('commands.jsonl'),
    node: {
      canonicalSnapshot,
      snapshotSha256: sha256Hex(canonicalSnapshot),
      eventCount,
      finalTick: replayed.value.snapshot.tick,
    },
  };
}
