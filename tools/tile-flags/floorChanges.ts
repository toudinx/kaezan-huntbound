/**
 * Reads the `floorchange` attribute out of Canary's `items.xml`.
 *
 * The accepted vocabulary is exactly Canary's `TileStatesMap`; anything else
 * is an error rather than a silently dropped transition.
 */

import { scanItems } from './items.ts';
import {
  FLOOR_CHANGE_VALUES,
  type FloorChange,
  isFloorChange,
} from './types.ts';

export function readFloorChanges(
  itemsXml: string,
): ReadonlyMap<number, FloorChange> {
  const floorChanges = new Map<number, FloorChange>();

  for (const row of scanItems(itemsXml)) {
    const value = row.floorChange;
    if (value === undefined) continue;

    if (!isFloorChange(value)) {
      throw new Error(
        `unknown floorchange value "${value}" for item ${row.ids[0]}; expected one of ${FLOOR_CHANGE_VALUES.join(', ')}`,
      );
    }

    for (const id of row.ids) {
      const previous = floorChanges.get(id);
      if (previous !== undefined && previous !== value) {
        throw new Error(
          `conflicting floorchange for item ${id}: "${previous}" then "${value}"`,
        );
      }
      floorChanges.set(id, value);
    }
  }

  return floorChanges;
}
