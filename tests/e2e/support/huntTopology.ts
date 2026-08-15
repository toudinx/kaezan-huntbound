import type {
  Direction,
  GridPosition,
  HuntDefinition,
  MapRegionFloor,
} from '../../../packages/contracts/src/index.ts';

const CARDINALS: readonly {
  readonly direction: Direction;
  readonly dx: number;
  readonly dy: number;
}[] = [
  { direction: 'n', dx: 0, dy: -1 },
  { direction: 'e', dx: 1, dy: 0 },
  { direction: 's', dx: 0, dy: 1 },
  { direction: 'w', dx: -1, dy: 0 },
];

const EIGHT_WAY: readonly {
  readonly dx: number;
  readonly dy: number;
}[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 },
];

/** Counts the reachable eight-way walkable component with kernel corner rules. */
export function reachableWalkableCount(
  hunt: HuntDefinition,
  root: GridPosition,
): number {
  const floor = floorAt(hunt, root.z);
  if (!walkable(floor, root.x, root.y, hunt.region.width, hunt.region.height)) {
    return 0;
  }

  const reachable = new Set<number>([
    indexOf(root.x, root.y, hunt.region.width),
  ]);
  const queue = [...reachable];

  while (queue.length > 0) {
    const current = queue.shift() as number;
    const x = current % hunt.region.width;
    const y = Math.floor(current / hunt.region.width);

    for (const { dx, dy } of EIGHT_WAY) {
      const nextX = x + dx;
      const nextY = y + dy;
      if (
        !canStep(
          floor,
          x,
          y,
          nextX,
          nextY,
          hunt.region.width,
          hunt.region.height,
        )
      ) {
        continue;
      }

      const next = indexOf(nextX, nextY, hunt.region.width);
      if (reachable.has(next)) continue;
      reachable.add(next);
      queue.push(next);
    }
  }

  return reachable.size;
}

/** Returns a deterministic cardinal route within one authored floor. */
export function cardinalRoute(
  hunt: HuntDefinition,
  from: GridPosition,
  to: GridPosition,
): readonly Direction[] {
  if (from.z !== to.z) {
    throw new Error('A cardinal route cannot cross floors.');
  }

  const floor = floorAt(hunt, from.z);
  const start = indexOf(from.x, from.y, hunt.region.width);
  const target = indexOf(to.x, to.y, hunt.region.width);
  const parent = new Map<
    number,
    { readonly previous: number; readonly direction: Direction }
  >();
  const queue = [start];
  const visited = new Set([start]);

  while (queue.length > 0) {
    const current = queue.shift() as number;
    if (current === target) break;

    const x = current % hunt.region.width;
    const y = Math.floor(current / hunt.region.width);
    for (const step of CARDINALS) {
      const nextX = x + step.dx;
      const nextY = y + step.dy;
      if (
        !canStep(
          floor,
          x,
          y,
          nextX,
          nextY,
          hunt.region.width,
          hunt.region.height,
        )
      ) {
        continue;
      }

      const next = indexOf(nextX, nextY, hunt.region.width);
      if (visited.has(next)) continue;
      visited.add(next);
      parent.set(next, { previous: current, direction: step.direction });
      queue.push(next);
    }
  }

  if (!visited.has(target)) {
    throw new Error(
      `No cardinal route from (${from.x},${from.y},${from.z}) to (${to.x},${to.y},${to.z}).`,
    );
  }

  const route: Direction[] = [];
  let current = target;
  while (current !== start) {
    const step = parent.get(current);
    if (step === undefined)
      throw new Error('Route parent chain is incomplete.');
    route.push(step.direction);
    current = step.previous;
  }

  return route.reverse();
}

function floorAt(hunt: HuntDefinition, z: number): MapRegionFloor {
  const floor = hunt.region.floors.find((candidate) => candidate.z === z);
  if (floor === undefined) throw new Error(`The region has no floor ${z}.`);
  return floor;
}

function indexOf(x: number, y: number, width: number): number {
  return y * width + x;
}

function walkable(
  floor: MapRegionFloor,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return (
    x >= 0 &&
    x < width &&
    y >= 0 &&
    y < height &&
    !floor.collision.includes(indexOf(x, y, width))
  );
}

function canStep(
  floor: MapRegionFloor,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  width: number,
  height: number,
): boolean {
  if (!walkable(floor, toX, toY, width, height)) return false;

  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx === 0 || dy === 0) return true;

  return (
    walkable(floor, fromX + dx, fromY, width, height) &&
    walkable(floor, fromX, fromY + dy, width, height)
  );
}
