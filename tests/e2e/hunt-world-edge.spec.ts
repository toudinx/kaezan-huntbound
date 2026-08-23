import { expect, type Page, test } from '@playwright/test';

import type { HuntProbeState } from '../../apps/game/src/hunt/HuntProbe.ts';
import { tileDepth } from '../../apps/game/src/hunt/TileDepth.ts';
import type { GridPosition } from '../../packages/contracts/src/index.ts';

import {
  readHuntState,
  requirePlayer,
  stepKeys,
  stepWithKeyboard,
  waitForHunt,
} from './support/huntDriver';
import { readHuntDefinition } from './support/huntSession';
import { cardinalRoute, reachableCardinalCells } from './support/huntTopology';

/**
 * The edge of the extracted world used to be the canvas showing through, which
 * reads as a failed load rather than as the map ending. These specs affirm
 * state rather than pixels: the probe reports how many visible cells carry
 * neither ground nor treatment, and that number is the whole claim.
 *
 * The clamp itself is proved over every ground cell, corners included, in
 * `CameraFraming.test.ts`; a cave with walls in it cannot be walked to the
 * corner of its own bounding box. What this file adds is that the live scene
 * really wires that clamp up, on both floors, at the four mandatory viewports,
 * and at the extremes of the walkable world.
 */

/** The scene's tile size. Every cell of the region is one tile square. */
const TILE = 32;

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'desktop-wide', width: 1920, height: 1080 },
] as const;

const hunt = readHuntDefinition();
const playerStart = hunt.playerStart;
const downTransition = hunt.transitions.entries.find(
  ({ from, to }) => from.z === playerStart.z && to.z !== from.z,
);

if (downTransition === undefined) {
  throw new Error('The hunt must declare a transition off the first floor.');
}

const descent = downTransition;

/**
 * Stepping onto a transition cell swaps the floor, so a walk across the upper
 * cave has to route around the one that leads down or it ends up somewhere it
 * never asked to go.
 */
const transitionCells = hunt.transitions.entries.map(({ from }) => from);

interface WorldRect {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** The ground box the scene reports it is holding the camera inside. */
type CameraBox = NonNullable<HuntProbeState['camera']['bounds']>;

/** What the camera shows, rebuilt from the probe the same way Phaser does. */
function visibleRect(state: HuntProbeState): WorldRect {
  const halfWidth = state.camera.width / (2 * state.camera.zoom);
  const halfHeight = state.camera.height / (2 * state.camera.zoom);
  const centreX = state.camera.scrollX + state.camera.width / 2;
  const centreY = state.camera.scrollY + state.camera.height / 2;

  return {
    left: centreX - halfWidth,
    right: centreX + halfWidth,
    top: centreY - halfHeight,
    bottom: centreY + halfHeight,
  };
}

/** The depth of the very first thing the floor paints. */
const firstPaintedDepth = tileDepth({
  x: 0,
  y: 0,
  layer: 'ground',
  stackIndex: 0,
  regionWidth: hunt.region.width,
});

const EPSILON = 1e-6;

function expectEdgeTreated(state: HuntProbeState, where: string): void {
  expect(state.worldEdge.visible, where).toBe(true);
  expect(state.worldEdge.untreatedVisibleCells, where).toBe(0);
  expect(state.worldEdge.treatedCells, where).toBe(
    state.drawn.unresolvedGroundCells,
  );
  expect(state.worldEdge.depth, where).toBeLessThan(firstPaintedDepth);
}

function expectCameraFramesGround(state: HuntProbeState, where: string): void {
  const bounds = state.camera.bounds;
  if (bounds === null) throw new Error(`${where}: the camera is unbounded.`);

  const rect = visibleRect(state);
  // The clamp only holds the view inside a box that can contain it; a box
  // narrower than the view is centred instead, and the treatment covers the
  // rest. This region is larger than every mandatory viewport, so both axes
  // take the first branch, and saying so here is what would catch a window
  // that shrank under one.
  expect(bounds.maxX - bounds.minX, where).toBeGreaterThan(
    rect.right - rect.left,
  );
  expect(bounds.maxY - bounds.minY, where).toBeGreaterThan(
    rect.bottom - rect.top,
  );
  expect(rect.left, where).toBeGreaterThanOrEqual(bounds.minX - EPSILON);
  expect(rect.right, where).toBeLessThanOrEqual(bounds.maxX + EPSILON);
  expect(rect.top, where).toBeGreaterThanOrEqual(bounds.minY - EPSILON);
  expect(rect.bottom, where).toBeLessThanOrEqual(bounds.maxY + EPSILON);
}

function expectPlayerFramed(state: HuntProbeState, where: string): void {
  const player = requirePlayer(state);
  const rect = visibleRect(state);
  const centreX = (player.position.x + 0.5) * TILE;
  const centreY = (player.position.y + 0.5) * TILE;

  expect(centreX, where).toBeGreaterThanOrEqual(rect.left - EPSILON);
  expect(centreX, where).toBeLessThanOrEqual(rect.right + EPSILON);
  expect(centreY, where).toBeGreaterThanOrEqual(rect.top - EPSILON);
  expect(centreY, where).toBeLessThanOrEqual(rect.bottom + EPSILON);
}

function expectWorldEdgeHolds(state: HuntProbeState, where: string): void {
  expectEdgeTreated(state, where);
  expectCameraFramesGround(state, where);
  expectPlayerFramed(state, where);
}

/**
 * Steps toward `target`, re-routing after every answer so a rotworm standing in
 * the way cannot desync the walk, checking the edge at each cell on the way and
 * stopping as soon as `until` is satisfied.
 */
async function walkTo(
  page: Page,
  target: GridPosition,
  where: string,
  until: (state: HuntProbeState) => boolean = () => false,
): Promise<HuntProbeState> {
  let state = await readHuntState(page);

  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (state.player === null) {
      throw new Error(`${where}: the player died before reaching the edge.`);
    }
    if (until(state)) return state;

    const player = requirePlayer(state);
    if (player.position.x === target.x && player.position.y === target.y) {
      return state;
    }

    const route = cardinalRoute(hunt, player.position, target, transitionCells);
    const direction = route[0];
    if (direction === undefined) return state;

    const outcome = await stepWithKeyboard(
      page,
      stepKeys[direction as keyof typeof stepKeys],
    );
    state = outcome.after;
    if (state.player === null) {
      throw new Error(`${where}: the player died before reaching the edge.`);
    }
    expectWorldEdgeHolds(
      state,
      `${where} at (${state.player.position.x},${state.player.position.y})`,
    );
  }

  throw new Error(`${where}: never reached (${target.x},${target.y}).`);
}

const reachable = reachableCardinalCells(hunt, playerStart, transitionCells);

if (reachable.length === 0) {
  throw new Error('The hunt starts the player somewhere unwalkable.');
}

function farthest(score: (cell: GridPosition) => number): GridPosition {
  let best = reachable[0] as GridPosition;
  for (const cell of reachable) {
    if (score(cell) < score(best)) best = cell;
  }
  return best;
}

/** The cell farthest into the south-west of the walkable upper cave. */
const inland = farthest((cell) => cell.x - cell.y);

function pinnedSides(rect: WorldRect, bounds: CameraBox): readonly string[] {
  const sides: string[] = [];
  if (Math.abs(rect.top - bounds.minY) <= EPSILON) sides.push('north');
  if (Math.abs(rect.bottom - bounds.maxY) <= EPSILON) sides.push('south');
  if (Math.abs(rect.left - bounds.minX) <= EPSILON) sides.push('west');
  if (Math.abs(rect.right - bounds.maxX) <= EPSILON) sides.push('east');
  return sides;
}

for (const viewport of viewports) {
  test(`covers every cell without ground at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.setViewportSize(viewport);
    const state = await waitForHunt(page);

    // The floor really does have holes in it, or the assertions below would
    // pass on a map that never needed treating.
    expect(state.drawn.unresolvedGroundCells).toBeGreaterThan(0);
    expectWorldEdgeHolds(state, viewport.name);

    // One object for the whole floor, kept across frames. A sprite per empty
    // cell created and destroyed per frame is the failure this rules out.
    const created = state.worldEdge.objectCreations;
    expect(created).toBe(1);
    await page.waitForTimeout(500);
    const later = await readHuntState(page);
    expect(later.worldEdge.objectCreations).toBe(created);
    expectWorldEdgeHolds(later, `${viewport.name} after 500ms`);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}

test('spawns with the camera already held against the world edge', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const state = await waitForHunt(page);
  const bounds = state.camera.bounds;
  if (bounds === null) throw new Error('The camera is unbounded at spawn.');

  // The hunt starts three cells from the north-east of the ground box, closer
  // than half a view on both axes, so the clamp is already load-bearing on the
  // first frame: an unclamped camera would be centred on the player and would
  // be showing cells north and east of anything the region ever carried.
  expect(pinnedSides(visibleRect(state), bounds).sort()).toEqual([
    'east',
    'north',
  ]);
  expectWorldEdgeHolds(state, 'spawn');
});

/**
 * Walking the whole cave is not something the browser can do here: about
 * twenty-four tiles of rotworms killed the player on every attempt, with his
 * mana untouched, and fixing that is combat work this task may not do. So the
 * walk is bounded, and its job is to prove the clamp travels with the player
 * rather than being a constant that happened to be right at spawn. The corners,
 * where both axes clamp at once, are proved over every ground cell at every
 * mandatory viewport in `CameraFraming.test.ts`.
 */
test('keeps the edge covered as the camera travels inland', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  const start = await waitForHunt(page);
  expectWorldEdgeHolds(start, 'start');

  const moved = (state: HuntProbeState): boolean => {
    const player = requirePlayer(state);
    const from = requirePlayer(start);
    return (
      Math.abs(player.position.x - from.position.x) +
        Math.abs(player.position.y - from.position.y) >=
      6
    );
  };
  const state = await walkTo(page, inland, 'inland', moved);
  const player = requirePlayer(state);

  // Without this the walk could have been blocked on its first step and the
  // assertions below would only be re-checking the spawn frame.
  expect(moved(state), 'the player never left the spawn area').toBe(true);
  // Only one axis has to have moved. Walking away from a pinned side does not
  // release it until the player is more than half a view from it, so a few
  // steps west of the spawn still leave `scrollX` sitting on the east bound —
  // which is the clamp working, not the camera being stuck.
  expect([state.camera.scrollX, state.camera.scrollY]).not.toEqual([
    start.camera.scrollX,
    start.camera.scrollY,
  ]);
  expectWorldEdgeHolds(state, 'inland');
  console.log(
    `[world-edge] inland (${player.position.x},${player.position.y}) ` +
      `treated=${state.worldEdge.treatedCells} ` +
      `untreated=${state.worldEdge.untreatedVisibleCells} ` +
      `camera=${Math.round(state.camera.scrollX)},${Math.round(state.camera.scrollY)}`,
  );
});

test('treats the second floor with its own empty cells', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  const upper = await waitForHunt(page);
  expectWorldEdgeHolds(upper, 'upper floor');
  const upperTreated = upper.worldEdge.treatedCells;

  // The descent sits one cell west of the start, and the step onto it is what
  // fires the transition.
  expect(descent.from).toEqual({
    x: playerStart.x - 1,
    y: playerStart.y,
    z: playerStart.z,
  });

  let lower = upper;
  for (
    let attempt = 0;
    attempt < 40 && lower.floor === playerStart.z;
    attempt += 1
  ) {
    const outcome = await stepWithKeyboard(page, stepKeys.w);
    lower = outcome.after;
  }

  expect(lower.floor).toBe(descent.to.z);
  expectWorldEdgeHolds(lower, 'lower floor');
  // The two floors do not carry ground in the same cells, so a treatment that
  // was not rebuilt with the floor would still be showing the upper count.
  expect(lower.worldEdge.treatedCells).not.toBe(upperTreated);
  expect(lower.worldEdge.treatedCells).toBe(lower.drawn.unresolvedGroundCells);

  console.log(
    `[world-edge] floors upper=${upperTreated} lower=${lower.worldEdge.treatedCells}`,
  );
});
