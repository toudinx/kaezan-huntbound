import type { GridPosition } from '@huntbound/contracts';

import { chebyshevDistance } from './directions.ts';
import type { StaticGrid } from './staticGrid.ts';

/**
 * `Map::isSightClear` with `floorCheck = true`. Chebyshev `<= 1` on the same
 * floor is unconditionally clear — melee through a blocked corner is legal.
 * Beyond that, intermediate cells fail on blocked terrain.
 */
export function isSightClear(
  grid: StaticGrid,
  from: GridPosition,
  to: GridPosition,
): boolean {
  if (from.z !== to.z) {
    return false;
  }
  if (chebyshevDistance(from, to) <= 1) {
    return true;
  }
  return checkSightLine(grid, from, to);
}

function isBlocked(grid: StaticGrid, x: number, y: number, z: number): boolean {
  return grid.isBlockedTerrain({ x, y, z });
}

/**
 * Port of `Map::checkSightLine`: axis walk, then Abrash/Xiaolin Wu for the
 * diagonal, stopping before the destination. `CONST_PROP_BLOCKPROJECTILE`
 * becomes `StaticGrid.isBlockedTerrain`.
 */
function checkSightLine(
  grid: StaticGrid,
  start: GridPosition,
  destination: GridPosition,
): boolean {
  if (start.x === destination.x && start.y === destination.y) {
    return true;
  }

  let x = start.x;
  let y = start.y;
  let destX = destination.x;
  let destY = destination.y;
  const z = start.z;
  let distanceX = x < destX ? destX - x : x - destX;
  let distanceY = y < destY ? destY - y : y - destY;

  if (y === destY) {
    const delta = x < destX ? 1 : -1;
    while (distanceX > 1) {
      x += delta;
      distanceX -= 1;
      if (isBlocked(grid, x, y, z)) {
        return false;
      }
    }
    return true;
  }

  if (x === destX) {
    const delta = y < destY ? 1 : -1;
    while (distanceY > 1) {
      y += delta;
      distanceY -= 1;
      if (isBlocked(grid, x, y, z)) {
        return false;
      }
    }
    return true;
  }

  let eAcc = 0;
  let deltaX = 1;
  let deltaY = 1;

  if (distanceY > distanceX) {
    const eAdj = Math.trunc((distanceX << 16) / distanceY) & 0xffff;
    if (y > destY) {
      const swapX = x;
      const swapY = y;
      x = destX;
      y = destY;
      destX = swapX;
      destY = swapY;
    }
    if (x > destX) {
      deltaX = -1;
      eAcc = (eAcc - eAdj) & 0xffff;
    }
    while (distanceY > 1) {
      const eAccTemp = eAcc;
      eAcc = (eAcc + eAdj) & 0xffff;
      const xIncrease = eAcc <= eAccTemp ? deltaX : 0;
      if (isBlocked(grid, x + xIncrease, y + deltaY, z)) {
        if (chebyshevDistance({ x, y, z }, { x: destX, y: destY, z }) <= 1) {
          return true;
        }
        return false;
      }
      x += xIncrease;
      y += deltaY;
      distanceY -= 1;
    }
    return true;
  }

  const eAdj = Math.trunc((distanceY << 16) / distanceX) & 0xffff;
  if (x > destX) {
    const swapX = x;
    const swapY = y;
    x = destX;
    y = destY;
    destX = swapX;
    destY = swapY;
  }
  if (y > destY) {
    deltaY = -1;
    eAcc = (eAcc - eAdj) & 0xffff;
  }
  while (distanceX > 1) {
    const eAccTemp = eAcc;
    eAcc = (eAcc + eAdj) & 0xffff;
    const yIncrease = eAcc <= eAccTemp ? deltaY : 0;
    if (isBlocked(grid, x + deltaX, y + yIncrease, z)) {
      if (chebyshevDistance({ x, y, z }, { x: destX, y: destY, z }) <= 1) {
        return true;
      }
      return false;
    }
    x += deltaX;
    y += yIncrease;
    distanceX -= 1;
  }
  return true;
}
