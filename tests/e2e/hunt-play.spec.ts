import { expect, type Page, test } from '@playwright/test';

import type { HuntProbeState } from '../../apps/game/src/hunt/HuntProbe.ts';
import {
  blockedEvents,
  type HuntStepOutcome,
  movedEvents,
  readHuntState,
  requireCell,
  requireFirst,
  stepKeys,
  stepWithKeyboard,
  waitForHunt,
} from './support/huntDriver';
import { readHuntDefinition } from './support/huntSession';

const hunt = readHuntDefinition();
const playerStart = hunt.playerStart;
/** The transition immediately west of `playerStart`, per the frozen region. */
const transitionFrom = { x: 23, y: 14, z: 8 };
const lowerFloor = 9;
const desktop = { width: 1366, height: 768 };

function floorOf(z: number) {
  const floor = hunt.region.floors.find((candidate) => candidate.z === z);

  if (floor === undefined) throw new Error(`The region has no floor ${z}.`);
  return floor;
}

/** Cells whose palette entry is a real id; index 0 is the void marker (W8). */
function drawableGround(z: number): number {
  return floorOf(z).ground.filter((index) => {
    const clientId = hunt.region.palette[index];
    return clientId !== undefined && clientId > 0;
  }).length;
}

function drawableStack(z: number, layer: 'objectsBelow' | 'objectsAbove') {
  return floorOf(z)[layer].reduce(
    (total, entry) =>
      total +
      entry.stack.filter((index) => {
        const clientId = hunt.region.palette[index];
        return clientId !== undefined && clientId > 0;
      }).length,
    0,
  );
}

interface PageWatch {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
  readonly failedRequests: string[];
  readonly badResponses: string[];
}

function watchPage(page: Page): PageWatch {
  const watch: PageWatch = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
  };

  page.on('console', (message) => {
    if (message.type() === 'error') watch.consoleErrors.push(message.text());
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

  test('refuses a step into terrain without moving or throwing', async ({
    page,
  }) => {
    const watch = watchPage(page);
    const state = await waitForHunt(page);

    // East of `playerStart` is wall in the frozen region.
    const outcome = await stepWithKeyboard(page, stepKeys.e);
    const blocked = blockedEvents(outcome);

    expect(blocked.length).toBeGreaterThanOrEqual(1);
    expect(blocked[0]?.reason).toBe('terrain');
    expect(blocked[0]?.to).toEqual({
      x: playerStart.x + 1,
      y: playerStart.y,
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
    expect(transitions[0]?.to).toEqual({ ...transitionFrom, z: lowerFloor });
    expect(outcome.after.floor).toBe(lowerFloor);
    expect(outcome.after.player?.position.z).toBe(lowerFloor);
    // The whole other floor is now on screen, not just the player.
    expect(outcome.after.drawn.layers.ground).toBe(drawableGround(lowerFloor));
    expect(outcome.after.drawn.layers.objectsBelow).toBe(
      drawableStack(lowerFloor, 'objectsBelow'),
    );
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
 * Walks west off `playerStart` until the drawn floor changes. The step can be
 * refused for as long as a rotworm stands on the transition cell or on its
 * arrival cell, so this keeps pressing rather than assuming one press is enough.
 */
async function stepUntilFloorChanges(page: Page) {
  let outcome = await stepWithKeyboard(page, stepKeys.w);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (outcome.after.floor !== transitionFrom.z) return outcome;
    outcome = await stepWithKeyboard(page, stepKeys.w);
  }

  expect(
    outcome.after.floor,
    'the player never reached the floor below',
  ).not.toBe(transitionFrom.z);
  return outcome;
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
