/**
 * Reads the ladder items out of Canary's `items.xml`.
 *
 * A ladder carries no `floorchange`: in Canary it is `type="ladder"`, climbed
 * by `data/scripts/actions/items/ladder_up.lua` rather than walked onto. It is
 * still the only way up out of most caves, so the extraction has to see it or
 * every hole in the map becomes a one-way drop.
 */

import { scanItems } from './items.ts';

export const LADDER_ITEM_TYPE = 'ladder';

export function readLadderIds(itemsXml: string): ReadonlySet<number> {
  const ladders = new Set<number>();

  for (const row of scanItems(itemsXml)) {
    if (row.type !== LADDER_ITEM_TYPE) continue;
    for (const id of row.ids) ladders.add(id);
  }

  return ladders;
}
