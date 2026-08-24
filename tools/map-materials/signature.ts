import type {
  MaterialGrid,
  MaterialGridCell,
  MaterialWindow,
} from './types.ts';

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

export function createMaterialGrid(
  bounds: MaterialWindow,
  cells: readonly MaterialGridCell[],
): MaterialGrid {
  return { bounds, cells: new Map(cells.map((cell) => [cellKey(cell), cell])) };
}

export function calculateMaterialSignature(
  grid: MaterialGrid,
  center: Pick<MaterialGridCell, 'x' | 'y' | 'z'>,
  materialIds: ReadonlySet<number>,
): number {
  let signature = 0;
  for (const [index, offset] of NEIGHBORS.entries()) {
    const x = center.x + offset.dx;
    const y = center.y + offset.dy;
    if (!insideWindow(grid.bounds, x, y, center.z)) continue;

    const neighbor = grid.cells.get(cellKey({ x, y, z: center.z }));
    if (neighbor?.items.some((serverId) => materialIds.has(serverId))) {
      signature |= 1 << index;
    }
  }
  return signature;
}

function insideWindow(
  bounds: MaterialWindow,
  x: number,
  y: number,
  z: number,
): boolean {
  return (
    x >= bounds.minX &&
    x <= bounds.maxX &&
    y >= bounds.minY &&
    y <= bounds.maxY &&
    bounds.floors.includes(z)
  );
}

function cellKey(cell: Pick<MaterialGridCell, 'x' | 'y' | 'z'>): string {
  return `${cell.z}:${cell.x}:${cell.y}`;
}
