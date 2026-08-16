import type { Direction, GridPosition } from '@huntbound/contracts';

const DIRECTION_DELTAS = {
  n: { dx: 0, dy: -1 },
  ne: { dx: 1, dy: -1 },
  e: { dx: 1, dy: 0 },
  se: { dx: 1, dy: 1 },
  s: { dx: 0, dy: 1 },
  sw: { dx: -1, dy: 1 },
  w: { dx: -1, dy: 0 },
  nw: { dx: -1, dy: -1 },
} as const satisfies Record<
  Direction,
  { readonly dx: number; readonly dy: number }
>;

export const DIRECTIONS: readonly Direction[] = [
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
  'nw',
];

export function directionDelta(direction: Direction): {
  readonly dx: number;
  readonly dy: number;
} {
  return DIRECTION_DELTAS[direction];
}

export function isDiagonal(direction: Direction): boolean {
  const { dx, dy } = directionDelta(direction);
  return dx !== 0 && dy !== 0;
}

export function stepCostTicks(baseTicks: number, direction: Direction): number {
  return isDiagonal(direction) ? Math.ceil((baseTicks * 3) / 2) : baseTicks;
}

export function translate(
  position: GridPosition,
  direction: Direction,
): GridPosition {
  const { dx, dy } = directionDelta(direction);
  return {
    x: position.x + dx,
    y: position.y + dy,
    z: position.z,
  };
}

export function chebyshevDistance(
  left: GridPosition,
  right: GridPosition,
): number {
  const dx = left.x < right.x ? right.x - left.x : left.x - right.x;
  const dy = left.y < right.y ? right.y - left.y : left.y - right.y;
  return dx < dy ? dy : dx;
}
