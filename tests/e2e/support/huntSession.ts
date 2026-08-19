import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import {
  buildHuntScenario,
  createContentRegistry,
  loadHuntDefinition,
  projectRuntimeBundle,
} from '../../../packages/content/src/index.ts';
import type {
  CatalogContentBundle,
  Direction,
  HuntDefinition,
  KernelScenario,
  MoveBlockedReason,
  SimulationCommandLog,
} from '../../../packages/contracts/src/index.ts';
import {
  createSeed,
  validateKernelScenario,
} from '../../../packages/contracts/src/index.ts';
import {
  decodeCommandLog,
  encodeCanonicalJson,
} from '../../../packages/simulation/src/index.ts';

export const HUNT_SESSION_ID = 'pb-04-hunt-session';
export const HUNT_SESSION_SEED = '1a2b3c4d5e6f7a8b';
export const HUNT_SESSION_SCENARIO_ID =
  'scenario:hunt:tibia:venore-rotworm-cave';
export const HUNT_SESSION_TICK_COUNT = 600;
export const HUNT_SESSION_PLAYER_ENTITY_ID = 1;

const huntDefinitionUrl = new URL(
  '../../../packages/content/src/generated/hunts/venore-rotworm-cave/hunt.json',
  import.meta.url,
);
const catalogBundleUrl = new URL(
  '../../../packages/content/src/generated/pb-01-contract-coverage.json',
  import.meta.url,
);
const fixtureUrl = new URL(
  '../../../packages/test-fixtures/hunt/pb04/',
  import.meta.url,
);

function fixtureText(name: string): string {
  return readFileSync(new URL(name, fixtureUrl), 'utf8');
}

function fixtureEvents(): readonly {
  readonly tick: number;
  readonly payload: Record<string, unknown>;
}[] {
  return fixtureText('events.golden.jsonl')
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

export function readHuntDefinition(): HuntDefinition {
  const parsed = JSON.parse(readFileSync(huntDefinitionUrl, 'utf8')) as unknown;
  const result = loadHuntDefinition(parsed);

  if (!result.ok) {
    throw new Error(
      `Generated hunt definition is invalid: ${result.diagnostics
        .map((item) => `${item.code} ${item.message}`)
        .join('; ')}`,
    );
  }

  return result.value;
}

export function buildHuntSessionScenario(): KernelScenario {
  const scenario = JSON.parse(fixtureText('scenario.json')) as unknown;
  const result = validateKernelScenario(scenario);

  if (!result.ok) {
    throw new Error(
      `PB-04 scenario fixture is invalid: ${result.diagnostics
        .map((item) => `${item.code} ${item.message}`)
        .join('; ')}`,
    );
  }

  expectScenarioMatchesHunt(result.value);
  return result.value;
}

export function readHuntCharacter() {
  return readHuntCombatContext().character;
}

function readHuntCombatContext() {
  const runtime = projectRuntimeBundle(
    JSON.parse(readFileSync(catalogBundleUrl, 'utf8')) as CatalogContentBundle,
  );
  const character = runtime.characters[0];
  if (character === undefined) {
    throw new Error('Generated catalog is missing the hunt character.');
  }
  return {
    character,
    registry: createContentRegistry(runtime),
  };
}

function expectScenarioMatchesHunt(scenario: KernelScenario): void {
  const hunt = readHuntDefinition();
  const { character, registry } = readHuntCombatContext();
  const built = buildHuntScenario(
    hunt,
    character,
    registry,
    createSeed(HUNT_SESSION_SEED),
  );
  if (!built.ok) {
    throw new Error(
      `Generated hunt scenario is invalid: ${built.diagnostics
        .map((item) => `${item.code} ${item.message}`)
        .join('; ')}`,
    );
  }
  const composed = built.value.scenario;
  if (
    composed.scenarioId !== scenario.scenarioId ||
    composed.scenarioRevision !== scenario.scenarioRevision ||
    composed.width !== scenario.width ||
    composed.height !== scenario.height ||
    encodeCanonicalJson(composed.floors) !==
      encodeCanonicalJson(scenario.floors) ||
    encodeCanonicalJson(composed.transitions) !==
      encodeCanonicalJson(scenario.transitions) ||
    encodeCanonicalJson(composed.spawnGroups) !==
      encodeCanonicalJson(scenario.spawnGroups) ||
    encodeCanonicalJson(composed.initialActors) !==
      encodeCanonicalJson(scenario.initialActors)
  ) {
    throw new Error(
      'PB-04 scenario fixture geometry is stale relative to hunt.json',
    );
  }
}

export function buildHuntSessionCommandLog(
  scenario: KernelScenario,
): SimulationCommandLog {
  const result = decodeCommandLog(fixtureText('commands.jsonl'));
  if (!result.ok) {
    throw new Error(
      `PB-04 command fixture is invalid: ${result.diagnostics
        .map((item) => `${item.code} ${item.message}`)
        .join('; ')}`,
    );
  }
  if (result.value.header.scenarioId !== scenario.scenarioId) {
    throw new Error('PB-04 command fixture targets a different scenario');
  }
  return result.value;
}

export interface HuntSessionReplay {
  readonly canonicalSnapshot: string;
  readonly snapshotSha256: string;
  readonly eventCount: number;
  readonly finalTick: number;
}

export interface HuntSession {
  readonly sessionId: string;
  readonly scenarioId: string;
  readonly scenarioJson: string;
  readonly logText: string;
  readonly node: HuntSessionReplay;
}

export interface HuntSessionCoverage {
  readonly finalTick: number;
  readonly eventCount: number;
  readonly playerMoves: number;
  readonly playerTransitions: number;
  readonly playerBlockedReasons: readonly MoveBlockedReason[];
  readonly largestPlayerStep: number;
  readonly spawnedActors: number;
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function huntSessionCoverage(): HuntSessionCoverage {
  const events = fixtureEvents();
  const snapshot = JSON.parse(fixtureText('snapshot.golden.json')) as {
    readonly tick: number;
  };
  const blockedReasons = new Set<MoveBlockedReason>();
  let playerMoves = 0;
  let playerTransitions = 0;
  let largestPlayerStep = 0;
  let spawnedActors = 0;

  for (const event of events) {
    const payload = event.payload;
    if (payload.type === 'actor/spawned') {
      spawnedActors += 1;
    } else if (
      payload.type === 'actor/moved' &&
      payload.entityId === HUNT_SESSION_PLAYER_ENTITY_ID
    ) {
      playerMoves += 1;
      const from = payload.from as { x: number; y: number };
      const to = payload.to as { x: number; y: number };
      largestPlayerStep = Math.max(
        largestPlayerStep,
        Math.abs(to.x - from.x),
        Math.abs(to.y - from.y),
      );
    } else if (
      payload.type === 'actor/transitioned' &&
      payload.entityId === HUNT_SESSION_PLAYER_ENTITY_ID
    ) {
      playerTransitions += 1;
    } else if (
      payload.type === 'actor/move-blocked' &&
      payload.entityId === HUNT_SESSION_PLAYER_ENTITY_ID
    ) {
      blockedReasons.add(payload.reason as MoveBlockedReason);
    }
  }

  return {
    finalTick: snapshot.tick,
    eventCount: events.length,
    playerMoves,
    playerTransitions,
    playerBlockedReasons: [...blockedReasons].sort(),
    largestPlayerStep,
    spawnedActors,
  };
}

export function buildHuntSession(): HuntSession {
  const scenarioJson = fixtureText('scenario.json');
  const logText = fixtureText('commands.jsonl');
  const canonicalSnapshot = fixtureText('snapshot.golden.json');
  const eventsText = fixtureText('events.golden.jsonl');
  const scenario = buildHuntSessionScenario();
  const log = buildHuntSessionCommandLog(scenario);
  const snapshot = JSON.parse(canonicalSnapshot) as { readonly tick: number };

  if (log.header.tickCount !== HUNT_SESSION_TICK_COUNT) {
    throw new Error('PB-04 main fixture must remain a 600-tick session');
  }

  return {
    sessionId: HUNT_SESSION_ID,
    scenarioId: scenario.scenarioId,
    scenarioJson,
    logText,
    node: {
      canonicalSnapshot,
      snapshotSha256: sha256Hex(canonicalSnapshot),
      eventCount: eventsText.trimEnd().split('\n').length,
      finalTick: snapshot.tick,
    },
  };
}

export type { Direction };
