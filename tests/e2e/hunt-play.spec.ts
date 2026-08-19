import { expect, type Page, test } from '@playwright/test';
import { resolveGroundSample } from '../../apps/game/src/hunt/GroundCompositor.ts';
import type { HuntProbeState } from '../../apps/game/src/hunt/HuntProbe.ts';
import { TICK_DURATION_MS } from '../../packages/contracts/src/index.ts';
import {
  blockedEvents,
  type HuntStepOutcome,
  holdKeyboardFor,
  movedEvents,
  readHuntState,
  requireCell,
  requireFirst,
  requirePlayer,
  stepKeys,
  stepWithKeyboard,
  tapDpadFor,
  waitForHunt,
} from './support/huntDriver';
import { readHuntDefinition } from './support/huntSession';
import { cardinalRoute, reachableWalkableCount } from './support/huntTopology';

const hunt = readHuntDefinition();
const playerStart = hunt.playerStart;
const downTransition = hunt.transitions.entries.find(
  ({ from, to }) => from.z === playerStart.z && to.z !== from.z,
);
const returnTransition = hunt.transitions.entries.find(
  ({ from, to }) =>
    downTransition !== undefined &&
    from.x === downTransition.to.x &&
    from.y === downTransition.to.y &&
    from.z === downTransition.to.z &&
    to.x === downTransition.from.x &&
    to.y === downTransition.from.y &&
    to.z === downTransition.from.z,
);

if (downTransition === undefined || returnTransition === undefined) {
  throw new Error(
    'The corrected hunt must declare an opposite transition pair.',
  );
}

const transitionFrom = downTransition.from;
const lowerFloor = downTransition.to.z;
const desktop = { width: 1366, height: 768 };

function cardinalKey(
  from: { x: number; y: number },
  to: { x: number; y: number },
): keyof typeof stepKeys {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 1 && dy === 0) return 'e';
  if (dx === -1 && dy === 0) return 'w';
  if (dx === 0 && dy === 1) return 's';
  if (dx === 0 && dy === -1) return 'n';
  throw new Error(`Expected adjacent cardinal cells, got ${dx},${dy}`);
}

function directionDelta(direction: keyof typeof stepKeys) {
  return {
    x: direction === 'e' ? 1 : direction === 'w' ? -1 : 0,
    y: direction === 's' ? 1 : direction === 'n' ? -1 : 0,
  };
}

const transitionKey = cardinalKey(playerStart, transitionFrom);
const offlineReachableWalkable = new Map([
  [8, 104],
  [9, 152],
]);

function floorOf(z: number) {
  const floor = hunt.region.floors.find((candidate) => candidate.z === z);

  if (floor === undefined) throw new Error(`The region has no floor ${z}.`);
  return floor;
}

/** Cells whose palette entry is a real id; index 0 is the void marker (W8). */
function drawableGround(z: number): number {
  return Array.from(
    { length: hunt.region.width * hunt.region.height },
    (_value, index) => resolveGroundSample(hunt.region, z, index),
  ).filter((sample) => sample !== undefined).length;
}

function drawableStack(z: number, layer: 'objectsBelow' | 'objectsAbove') {
  return floorOf(z)[layer].reduce(
    (total, entry) =>
      total +
      (resolveGroundSample(hunt.region, z, entry.i) === undefined
        ? 0
        : entry.stack.length),
    0,
  );
}

const terrainDirection = (['n', 's', 'w', 'e'] as const).find((direction) => {
  const dx = direction === 'e' ? 1 : direction === 'w' ? -1 : 0;
  const dy = direction === 's' ? 1 : direction === 'n' ? -1 : 0;
  const x = playerStart.x + dx;
  const y = playerStart.y + dy;
  const floor = floorOf(playerStart.z);
  return floor.collision.includes(y * hunt.region.width + x);
});

if (terrainDirection === undefined) {
  throw new Error('The corrected player start must have an adjacent wall.');
}

const terrainDelta = directionDelta(terrainDirection);

interface PageWatch {
  readonly consoleErrors: string[];
  readonly consoleWarnings: string[];
  readonly pageErrors: string[];
  readonly failedRequests: string[];
  readonly badResponses: string[];
}

function watchPage(page: Page): PageWatch {
  const watch: PageWatch = {
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
  };

  page.on('console', (message) => {
    if (message.type() === 'error') watch.consoleErrors.push(message.text());
    if (
      message.type() === 'warning' &&
      message.text().includes('Move event references unknown actor')
    ) {
      watch.consoleWarnings.push(message.text());
    }
  });
  page.on('pageerror', (error) => watch.pageErrors.push(error.message));
  page.on('requestfailed', (request) =>
    watch.failedRequests.push(request.url()),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) {
      watch.badResponses.push(`${response.url()} (${response.status()})`);
    }
  });

  return watch;
}

function expectQuiet(watch: PageWatch): void {
  expect(watch.pageErrors).toEqual([]);
  expect(watch.consoleErrors).toEqual([]);
  expect(watch.consoleWarnings).toEqual([]);
  expect(watch.failedRequests).toEqual([]);
  expect(watch.badResponses).toEqual([]);
}

function chebyshev(
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  return Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
}

function livingRotworms(state: HuntProbeState) {
  return state.actors.filter(
    (actor) =>
      actor.blueprintId !== hunt.playerBlueprintId &&
      actor.position.z === state.floor &&
      actor.visible,
  );
}

test.describe('the first hunt is playable by synthetic input', () => {
  test.use({ viewport: desktop });

  test('starts the player on playerStart with the region drawn', async ({
    page,
  }) => {
    const watch = watchPage(page);
    const state = await waitForHunt(page);

    expect(state.player?.position).toEqual(playerStart);
    expect(state.floor).toBe(playerStart.z);
    expect(state.drawn.layers.ground).toBeGreaterThan(0);
    expect(state.camera.visibleRows).toBeGreaterThanOrEqual(10);
    expect(state.camera.visibleRows).toBeLessThanOrEqual(12);
    expect(state.camera.zoom).toBeGreaterThan(1);
    expect(state.drawn.composedGroundCells).toBeGreaterThan(0);
    expect(state.drawn.layers.actors).toBeGreaterThan(0);
    expect(state.drawn.total).toBeGreaterThan(state.drawn.layers.ground);
    expect(state.player?.sprite).not.toBeNull();
    expectQuiet(watch);
  });

  test('shows at least one rotworm on the drawn cave floor', async ({
    page,
  }) => {
    const watch = watchPage(page);
    const state = await waitForHunt(page);

    expect(livingRotworms(state).length).toBeGreaterThanOrEqual(1);
    expectQuiet(watch);
  });

  test('does not repaint the floor for another actor transition', async ({
    page,
  }) => {
    const watch = watchPage(page);
    const before = await waitForHunt(page);
    const playerEntityId = requirePlayer(before).entityId;

    expect(before.floorRebuilds).toBe(1);

    await page.waitForFunction(
      (entityId) => {
        const probe = (globalThis as HuntboundHuntGlobal).__huntboundHuntProbe;
        return (
          probe
            ?.events()
            .some(
              (event) =>
                event.type === 'actor/transitioned' &&
                event.entityId !== entityId,
            ) ?? false
        );
      },
      playerEntityId,
      { polling: 'raf', timeout: 20_000 },
    );

    const after = await readHuntState(page);
    expect(after.floor).toBe(before.floor);
    expect(after.floorRebuilds).toBe(before.floorRebuilds);
    expectQuiet(watch);
  });

  test('keeps another actor in the roster while filtering its floor sprite', async ({
    page,
  }) => {
    const watch = watchPage(page);
    const before = await waitForHunt(page);
    const playerEntityId = requirePlayer(before).entityId;

    await page.waitForFunction(
      (entityId) => {
        const probe = (globalThis as HuntboundHuntGlobal).__huntboundHuntProbe;
        return (
          probe
            ?.events()
            .some(
              (event) =>
                event.type === 'actor/transitioned' &&
                event.entityId !== entityId,
            ) ?? false
        );
      },
      playerEntityId,
      { polling: 'raf', timeout: 20_000 },
    );

    const [after, transition] = await page.evaluate((entityId) => {
      const probe = (globalThis as HuntboundHuntGlobal).__huntboundHuntProbe;
      if (probe === undefined) throw new Error('Hunt probe is not installed.');
      const event = probe
        .events()
        .find(
          (item) =>
            item.type === 'actor/transitioned' && item.entityId !== entityId,
        );
      return [probe.state(), event] as const;
    }, playerEntityId);

    expect(transition).toBeDefined();
    const actor = after.actors.find(
      (candidate) => candidate.entityId === transition?.entityId,
    );
    expect(actor).toBeDefined();
    expect(actor?.visible).toBe(actor?.position.z === after.floor);
    expectQuiet(watch);
  });

  test('moves the player exactly one tile per press', async ({ page }) => {
    const watch = watchPage(page);
    await waitForHunt(page);

    // South of `playerStart` is the only free cell the first spawn group can
    // use, so it can still hold a rotworm on the very first frames. Retrying
    // keeps the assertion about the step, not about spawn timing.
    let outcome = await stepWithKeyboard(page, stepKeys.s);
    for (let attempt = 0; attempt < 10 && movedEvents(outcome).length === 0; ) {
      attempt += 1;
      outcome = await stepWithKeyboard(page, stepKeys.s);
    }

    const moves = movedEvents(outcome);

    // A held key repeats, and the release costs a frame, so a press can outlive
    // the two-tick step cooldown. What is invariant is that every accepted step
    // advances exactly one tile, and that the first one lands on the cell
    // immediately south of `playerStart`.
    expect(moves.length).toBeGreaterThanOrEqual(1);
    for (const move of moves) {
      expect(
        chebyshev(requireCell(move, 'from'), requireCell(move, 'to')),
      ).toBe(1);
    }

    const first = requireFirst(moves, 'accepted step');

    expect(first.from).toEqual(playerStart);
    expect(first.to).toEqual({
      x: playerStart.x,
      y: playerStart.y + 1,
      z: playerStart.z,
    });
    expectQuiet(watch);
  });

  test('faces west from the sheet instead of mirroring the sprite', async ({
    page,
  }) => {
    const watch = watchPage(page);
    await waitForHunt(page);

    // West of `playerStart` is the floor transition, so the player would leave
    // the floor mid-test. One step north first keeps the westward step on a
    // plain cell, which is what this assertion is about.
    await stepWithKeyboard(page, stepKeys.n);

    let outcome = await stepWithKeyboard(page, stepKeys.w);
    for (let attempt = 0; attempt < 10 && movedEvents(outcome).length === 0; ) {
      attempt += 1;
      outcome = await stepWithKeyboard(page, stepKeys.w);
    }

    expect(movedEvents(outcome).length).toBeGreaterThanOrEqual(1);

    const player = requirePlayer(outcome.after);

    expect(player.facing).toBe('w');
    // Every Tibia sheet carries all four facings, so mirroring the west sprite
    // turns it back east and the actor walks backwards.
    expect(player.flipX).toBe(false);
    expectQuiet(watch);
  });

  test('turns a short held direction into one paced command', async ({
    page,
  }) => {
    const watch = watchPage(page);
    await waitForHunt(page);

    const player = hunt.blueprints.find(
      (blueprint) => blueprint.blueprintId === hunt.playerBlueprintId,
    );
    if (player === undefined)
      throw new Error('The hunt has no player blueprint.');

    // Shorter than one tick, so the input gate opens exactly once: that is what
    // makes this a single press rather than a held walk.
    const holdMs = TICK_DURATION_MS - 10;
    // South is the only free neighbour of `playerStart`: north and east are
    // terrain, and west is the floor transition, which answers
    // `transition-blocked` and made this assertion about the transition rather
    // than about input pacing.
    const outcome = await holdKeyboardFor(page, stepKeys.s, holdMs);
    const moves = movedEvents(outcome);

    expect(moves).toHaveLength(1);
    expect(outcome.commands).toHaveLength(1);
    expect(new Set(outcome.commands.map(({ tick }) => tick)).size).toBe(
      outcome.commands.length,
    );
    expect(new Set(outcome.commands.map(({ sequence }) => sequence)).size).toBe(
      outcome.commands.length,
    );
    expect(outcome.commands[0]?.tick).toBe(moves[0]?.tick);
    expectQuiet(watch);
  });

  test('turns a short d-pad tap into one paced command', async ({ page }) => {
    const watch = watchPage(page);
    await waitForHunt(page);

    const outcome = await tapDpadFor(page, 's', TICK_DURATION_MS - 10);

    expect(movedEvents(outcome)).toHaveLength(1);
    expect(outcome.commands).toHaveLength(1);
    expectQuiet(watch);
  });

  test('refuses a step into terrain without moving or throwing', async ({
    page,
  }) => {
    const watch = watchPage(page);
    const state = await waitForHunt(page);

    const outcome = await stepWithKeyboard(page, stepKeys[terrainDirection]);
    const blocked = blockedEvents(outcome);

    expect(blocked.length).toBeGreaterThanOrEqual(1);
    expect(blocked[0]?.reason).toBe('terrain');
    expect(blocked[0]?.to).toEqual({
      x: playerStart.x + terrainDelta.x,
      y: playerStart.y + terrainDelta.y,
      z: playerStart.z,
    });
    expect(movedEvents(outcome)).toHaveLength(0);
    expect(outcome.after.player?.position).toEqual(state.player?.position);
    expectQuiet(watch);
  });

  test('swaps the drawn floor when the player reaches the transition', async ({
    page,
  }) => {
    const watch = watchPage(page);
    const before = await waitForHunt(page);

    expect(before.floor).toBe(transitionFrom.z);
    expect(before.drawn.layers.ground).toBe(drawableGround(transitionFrom.z));

    // A rotworm wandering onto the transition cell or onto its arrival cell
    // refuses the step, so the walk is retried rather than assumed.
    const outcome = await stepUntilFloorChanges(page);
    const transitions = outcome.playerEvents.filter(
      (item) => item.type === 'actor/transitioned',
    );

    expect(transitions.length).toBeGreaterThanOrEqual(1);
    expect(transitions[0]?.from).toEqual(transitionFrom);
    expect(transitions[0]?.to).toEqual(downTransition.to);
    expect(outcome.after.floor).toBe(lowerFloor);
    expect(outcome.after.player?.position.z).toBe(lowerFloor);
    // The whole other floor is now on screen, not just the player.
    expect(outcome.after.drawn.layers.ground).toBe(drawableGround(lowerFloor));
    expect(outcome.after.drawn.layers.objectsBelow).toBe(
      drawableStack(lowerFloor, 'objectsBelow'),
    );
    expectQuiet(watch);
  });

  test('walks the corrected topology by deterministic BFS and returns', async ({
    page,
  }) => {
    const watch = watchPage(page);
    const before = await waitForHunt(page);

    for (const floor of hunt.region.floors) {
      const root = floor.z === playerStart.z ? playerStart : downTransition.to;
      expect(reachableWalkableCount(hunt, root)).toBe(
        offlineReachableWalkable.get(floor.z),
      );
    }

    expect(before.player?.position).toEqual(playerStart);
    const descentRoute = cardinalRoute(hunt, playerStart, transitionFrom);
    expect(descentRoute.length).toBeGreaterThan(0);
    for (const direction of descentRoute.slice(0, -1)) {
      await stepUntilMoved(page, stepKeys[direction as keyof typeof stepKeys]);
    }
    const descent = await stepUntilTransition(
      page,
      stepKeys[descentRoute[descentRoute.length - 1] as keyof typeof stepKeys],
      downTransition,
    );

    expect(descent.transition.from).toEqual(downTransition.from);
    expect(descent.transition.to).toEqual(downTransition.to);
    let state = descent.outcome.after;
    expect(state.floor).toBe(lowerFloor);

    let returnTransitionEvent:
      | HuntStepOutcome['playerEvents'][number]
      | undefined;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const position = state.player?.position;
      if (position === null || position === undefined) {
        state = await readHuntState(page);
        continue;
      }

      const route = cardinalRoute(hunt, position, returnTransition.from);
      if (route.length === 0) {
        const exitDirection = findExitDirection(returnTransition.from);
        const exit = await stepUntilMoved(page, stepKeys[exitDirection]);
        returnTransitionEvent = exit.playerEvents.find(
          (event) => event.type === 'actor/transitioned',
        );
        state = exit.after;
        if (returnTransitionEvent !== undefined) break;
        continue;
      }

      const step = await stepUntilMoved(
        page,
        stepKeys[route[0] as keyof typeof stepKeys],
      );
      returnTransitionEvent = step.playerEvents.find(
        (event) => event.type === 'actor/transitioned',
      );
      state = step.after;
      if (returnTransitionEvent !== undefined) break;
    }

    expect(returnTransitionEvent).toBeDefined();
    expect(returnTransitionEvent?.from).toEqual(returnTransition.from);
    expect(returnTransitionEvent?.to).toEqual(returnTransition.to);
    expect(state.floor).toBe(playerStart.z);
    expectQuiet(watch);
  });

  test('refuses a step into a rotworm without moving the player', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const watch = watchPage(page);
    await waitForHunt(page);

    // Drop to the lower floor, whose pocket around the arrival cell is small
    // enough that its two wandering rotworms stay within a few tiles.
    let state = (await stepUntilFloorChanges(page)).after;

    expect(state.floor).toBe(lowerFloor);

    let refusals = 0;

    for (let attempt = 0; attempt < 200 && refusals === 0; attempt += 1) {
      const target = nearestRotworm(state);

      if (state.player === null || target === undefined) {
        state = await readHuntState(page);
        continue;
      }

      const key = keyToward(state.player.position, target.position);
      const outcome = await stepWithKeyboard(page, key);
      const occupied = blockedEvents(outcome).find(
        (item) => item.reason === 'occupied',
      );

      if (occupied !== undefined) {
        refusals += 1;
        // A press can outlive the step cooldown, so an earlier tick of the same
        // press may legitimately have moved the player. What must hold is that
        // the refused tick moved nobody: the refusal and a move cannot share a
        // tick for the same actor.
        expect(
          movedEvents(outcome).filter((move) => move.tick === occupied.tick),
        ).toEqual([]);
        // Where the player stood when the step was refused, replayed from the
        // events of this press. The press can keep going after the refusal, so
        // the state afterwards is not that position.
        const standing = playerPositionAtTick(outcome, occupied.tick);
        const refused = requireCell(occupied, 'to');

        expect(standing).not.toBeNull();
        expect(chebyshev(refused, standing ?? refused)).toBe(1);
        expect(standing?.z).toBe(refused.z);
      }
      state = outcome.after;
    }

    expect(refusals, 'no step was ever refused by a rotworm').toBe(1);
    expectQuiet(watch);
  });
});

/**
 * Walks from `playerStart` onto the authored transition until the drawn floor changes. The step can be
 * refused for as long as a rotworm stands on the transition cell or on its
 * arrival cell, so this keeps pressing rather than assuming one press is enough.
 */
async function stepUntilFloorChanges(page: Page) {
  let outcome = await stepWithKeyboard(page, stepKeys[transitionKey]);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (outcome.after.floor !== transitionFrom.z) return outcome;
    outcome = await stepWithKeyboard(page, stepKeys[transitionKey]);
  }

  expect(
    outcome.after.floor,
    'the player never reached the floor below',
  ).not.toBe(transitionFrom.z);
  return outcome;
}

async function stepUntilMoved(
  page: Page,
  key: (typeof stepKeys)[keyof typeof stepKeys],
) {
  let outcome = await stepWithKeyboard(page, key);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (movedEvents(outcome).length > 0) return outcome;
    outcome = await stepWithKeyboard(page, key);
  }

  throw new Error(`The player never accepted ${key}.`);
}

async function stepUntilTransition(
  page: Page,
  key: (typeof stepKeys)[keyof typeof stepKeys],
  expected: {
    readonly from: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    };
    readonly to: { readonly x: number; readonly y: number; readonly z: number };
  },
) {
  let outcome = await stepWithKeyboard(page, key);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const transition = outcome.playerEvents.find(
      (event) =>
        event.type === 'actor/transitioned' &&
        event.from?.x === expected.from.x &&
        event.from?.y === expected.from.y &&
        event.from?.z === expected.from.z &&
        event.to?.x === expected.to.x &&
        event.to?.y === expected.to.y &&
        event.to?.z === expected.to.z,
    );
    if (transition !== undefined) return { outcome, transition };
    outcome = await stepWithKeyboard(page, key);
  }

  throw new Error(`The player never reached transition ${key}.`);
}

function findExitDirection(position: {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}) {
  const direction = (['n', 'e', 's', 'w'] as const).find((candidate) => {
    const delta = directionDelta(candidate);
    const x = position.x + delta.x;
    const y = position.y + delta.y;
    const floor = floorOf(position.z);
    return (
      x >= 0 &&
      x < hunt.region.width &&
      y >= 0 &&
      y < hunt.region.height &&
      !floor.collision.includes(y * hunt.region.width + x)
    );
  });

  if (direction === undefined) {
    throw new Error('The transition has no walkable exit neighbor.');
  }
  return direction;
}

/**
 * Replays this press's player events up to (but not including) `tick`, so an
 * assertion can talk about where the player stood at that tick rather than
 * where the press left them.
 */
function playerPositionAtTick(outcome: HuntStepOutcome, tick: number) {
  let position = outcome.before.player?.position ?? null;

  for (const event of outcome.playerEvents) {
    if (event.tick >= tick) break;
    if (event.type === 'actor/moved' || event.type === 'actor/transitioned') {
      position = event.to ?? position;
    }
  }

  return position;
}

function nearestRotworm(state: HuntProbeState) {
  const player = state.player;

  if (player === null) return undefined;

  return [...livingRotworms(state)].sort(
    (left, right) =>
      chebyshev(player.position, left.position) -
      chebyshev(player.position, right.position),
  )[0];
}

function keyToward(
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  if (Math.abs(to.x - from.x) >= Math.abs(to.y - from.y) && to.x !== from.x) {
    return to.x > from.x ? stepKeys.e : stepKeys.w;
  }
  if (to.y !== from.y) {
    return to.y > from.y ? stepKeys.s : stepKeys.n;
  }
  return to.x > from.x ? stepKeys.e : stepKeys.w;
}
