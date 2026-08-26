import type { GridPosition } from './types.ts';

/** `z:y:x@gz:gy:gx` — slot source, then the group source that disambiguates it. */
const SPAWN_SLOT_ID_PATTERN = /^-?\d+:-?\d+:-?\d+@-?\d+:-?\d+:-?\d+$/;

function compareCoordinate(left: GridPosition, right: GridPosition): number {
  if (left.z !== right.z) return left.z < right.z ? -1 : 1;
  if (left.y !== right.y) return left.y < right.y ? -1 : 1;
  if (left.x !== right.x) return left.x < right.x ? -1 : 1;
  return 0;
}

function parseCoordinate(value: string): GridPosition | undefined {
  const parts = value.split(':');
  if (parts.length !== 3) {
    return undefined;
  }
  const z = Number(parts[0]);
  const y = Number(parts[1]);
  const x = Number(parts[2]);
  if (
    !Number.isSafeInteger(z) ||
    !Number.isSafeInteger(y) ||
    !Number.isSafeInteger(x)
  ) {
    return undefined;
  }
  return { x, y, z };
}

/**
 * Stable identity of a spawn seat. Built from the Canary source cell and the
 * source centre of its group, never from the seat's position in the list.
 * Recutting a layout changes `target`; it does not change this id.
 */
export function formatSpawnSlotId(
  source: GridPosition,
  groupSource: GridPosition,
): string {
  return `${source.z}:${source.y}:${source.x}@${groupSource.z}:${groupSource.y}:${groupSource.x}`;
}

export function parseSpawnSlotId(slotId: string):
  | {
      readonly source: GridPosition;
      readonly groupSource: GridPosition;
    }
  | undefined {
  if (!SPAWN_SLOT_ID_PATTERN.test(slotId)) {
    return undefined;
  }
  const separator = slotId.indexOf('@');
  const source = parseCoordinate(slotId.slice(0, separator));
  const groupSource = parseCoordinate(slotId.slice(separator + 1));
  if (source === undefined || groupSource === undefined) {
    return undefined;
  }
  return { source, groupSource };
}

export function compareSpawnSlotIds(left: string, right: string): number {
  const parsedLeft = parseSpawnSlotId(left);
  const parsedRight = parseSpawnSlotId(right);
  if (parsedLeft === undefined || parsedRight === undefined) {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  return (
    compareCoordinate(parsedLeft.source, parsedRight.source) ||
    compareCoordinate(parsedLeft.groupSource, parsedRight.groupSource)
  );
}

export function isSpawnSlotId(value: string): boolean {
  return parseSpawnSlotId(value) !== undefined;
}
