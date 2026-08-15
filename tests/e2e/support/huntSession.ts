import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import {
  buildHuntScenario,
  loadHuntDefinition,
} from '../../../packages/content/src/hunts/index.ts';
import type {
  Direction,
  HuntDefinition,
  KernelScenario,
  MoveBlockedReason,
  SimulationCommandLog,
  SimulationCommandRecord,
} from '../../../packages/contracts/src/index.ts';
import {
  createEntityId,
  createSeed,
  createTickIndex,
  SIMULATION_RULES_VERSION,
  SIMULATION_SCHEMA_VERSION,
} from '../../../packages/contracts/src/index.ts';
import {
  encodeCanonicalJson,
  encodeCommandLog,
  runReplay,
} from '../../../packages/simulation/src/index.ts';

export const HUNT_SESSION_ID = 'pb-04-hunt-session';
export const HUNT_SESSION_SEED = '1a2b3c4d5e6f7a8b';
export const HUNT_SESSION_SCENARIO_ID =
  'scenario:hunt:tibia:venore-rotworm-cave';
export const HUNT_SESSION_TICK_COUNT = 600;
export const HUNT_SESSION_PLAYER_ENTITY_ID = 1;

/**
 * The player is `inert` with `stepCooldownTicks: 2`, so a step every four ticks
 * always clears the cooldown and no command in this route can be rejected for
 * timing. That keeps the route itself the only variable.
 */
export const HUNT_SESSION_FIRST_STEP_TICK = 2;
export const HUNT_SESSION_STEP_INTERVAL_TICKS = 4;

/**
 * Walks out of the spawn cell, bumps the terrain wall east and north of it,
 * drops through the transition west of `playerStart`, and then tours the floor
 * below. The route is fixed text: the point of this session is that the same
 * input produces the same bytes in both runtimes, not that the route is optimal.
 */
export const HUNT_SESSION_ROUTE: readonly Direction[] = [
  's',
  'e',
  'n',
  'e',
  's',
  'n',
  'w',
  'n',
  'n',
  'e',
  'e',
  'se',
  's',
  'w',
  'w',
  'sw',
  's',
  'n',
  'e',
  'ne',
  'n',
  'w',
  'sw',
  's',
  'e',
  'nw',
  'w',
  's',
  'e',
  'n',
];

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

const huntDefinitionUrl = new URL(
  '../../../packages/content/src/generated/hunts/venore-rotworm-cave/hunt.json',
  import.meta.url,
);

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
  const result = buildHuntScenario(
    readHuntDefinition(),
    createSeed(HUNT_SESSION_SEED),
  );

  if (!result.ok) {
    throw new Error(
      `Hunt scenario is invalid: ${result.diagnostics
        .map((item) => `${item.code} ${item.message}`)
        .join('; ')}`,
    );
  }

  return result.value;
}

export function buildHuntSessionCommandLog(
  scenario: KernelScenario,
): SimulationCommandLog {
  const commands: SimulationCommandRecord[] = HUNT_SESSION_ROUTE.map(
    (direction, index): SimulationCommandRecord => ({
      tick: createTickIndex(
        HUNT_SESSION_FIRST_STEP_TICK + index * HUNT_SESSION_STEP_INTERVAL_TICKS,
      ),
      sequence: index + 1,
      issuer: 'player',
      command: {
        type: 'actor/move-step',
        entityId: createEntityId(HUNT_SESSION_PLAYER_ENTITY_ID),
        direction,
      },
    }),
  );

  return {
    header: {
      kind: 'header',
      schemaVersion: SIMULATION_SCHEMA_VERSION,
      rulesVersion: SIMULATION_RULES_VERSION,
      scenarioId: scenario.scenarioId,
      scenarioRevision: scenario.scenarioRevision,
      seed: createSeed(HUNT_SESSION_SEED),
      tickCount: HUNT_SESSION_TICK_COUNT,
    },
    commands,
  };
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

/**
 * Describes what the session actually exercises. The browser parity test would
 * stay green over an empty route, so this is what keeps the route honest.
 */
export function huntSessionCoverage(): HuntSessionCoverage {
  const scenario = buildHuntSessionScenario();
  const log = buildHuntSessionCommandLog(scenario);
  const replayed = runReplay(scenario, log);

  if (!replayed.ok) {
    throw new Error(
      `Node replay of the hunt session failed: ${replayed.diagnostics
        .map((item) => `${item.code} ${item.message}`)
        .join('; ')}`,
    );
  }

  const player = createEntityId(HUNT_SESSION_PLAYER_ENTITY_ID);
  const blockedReasons = new Set<MoveBlockedReason>();
  let playerMoves = 0;
  let playerTransitions = 0;
  let largestPlayerStep = 0;
  let spawnedActors = 0;

  for (const event of replayed.value.events) {
    const payload = event.payload;

    switch (payload.type) {
      case 'actor/spawned':
        spawnedActors += 1;
        break;
      case 'actor/moved':
        if (payload.entityId !== player) break;
        playerMoves += 1;
        largestPlayerStep = Math.max(
          largestPlayerStep,
          Math.abs(payload.to.x - payload.from.x),
          Math.abs(payload.to.y - payload.from.y),
        );
        break;
      case 'actor/transitioned':
        if (payload.entityId === player) playerTransitions += 1;
        break;
      case 'actor/move-blocked':
        if (payload.entityId === player) blockedReasons.add(payload.reason);
        break;
      default:
        break;
    }
  }

  return {
    finalTick: replayed.value.snapshot.tick,
    eventCount: replayed.value.events.length,
    playerMoves,
    playerTransitions,
    playerBlockedReasons: [...blockedReasons].sort(),
    largestPlayerStep,
    spawnedActors,
  };
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Runs the session in Node and returns exactly the four values the browser
 * probe returns, so the two can be compared field by field.
 */
export function buildHuntSession(): HuntSession {
  const scenario = buildHuntSessionScenario();
  const log = buildHuntSessionCommandLog(scenario);
  const replayed = runReplay(scenario, log);

  if (!replayed.ok) {
    throw new Error(
      `Node replay of the hunt session failed: ${replayed.diagnostics
        .map((item) => `${item.code} ${item.message}`)
        .join('; ')}`,
    );
  }

  const canonicalSnapshot = `${encodeCanonicalJson(replayed.value.snapshot)}\n`;

  return {
    sessionId: HUNT_SESSION_ID,
    scenarioId: scenario.scenarioId,
    scenarioJson: encodeCanonicalJson(scenario),
    logText: encodeCommandLog(log),
    node: {
      canonicalSnapshot,
      snapshotSha256: sha256Hex(canonicalSnapshot),
      eventCount: replayed.value.events.length,
      finalTick: replayed.value.snapshot.tick,
    },
  };
}
