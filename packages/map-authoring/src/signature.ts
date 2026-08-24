import type { AuthoringCell } from './types.ts';

const NEIGHBORS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 },
] as const;

export function coordinateKey(x: number, y: number, z: number): string {
  return `${z}:${x}:${y}`;
}

function neighbors(
  cells: ReadonlyMap<string, AuthoringCell>,
  center: AuthoringCell,
): Array<AuthoringCell | undefined> {
  return NEIGHBORS.map(({ dx, dy }) =>
    cells.get(coordinateKey(center.x + dx, center.y + dy, center.z)),
  );
}

export function hasFloorNeighbor(
  cells: ReadonlyMap<string, AuthoringCell>,
  center: AuthoringCell,
  floorIds: ReadonlySet<number>,
): boolean {
  return neighbors(cells, center).some(
    (cell) =>
      cell?.ground !== null && cell !== undefined && floorIds.has(cell.ground),
  );
}

export function calculateSignature(
  cells: ReadonlyMap<string, AuthoringCell>,
  center: AuthoringCell,
  massIds: ReadonlySet<number>,
): number {
  return neighbors(cells, center).reduce(
    (signature, cell, index) =>
      cell?.ground !== null && cell !== undefined && massIds.has(cell.ground)
        ? signature | (1 << index)
        : signature,
    0,
  );
}
