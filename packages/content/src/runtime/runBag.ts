import type { RunBagEntry, SimulationEvent } from '@huntbound/contracts';

export type { RunBagEntry };

function compareItemKeys(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

export function projectRunBag(
  events: readonly SimulationEvent[],
  itemKeys: readonly string[],
  previous: readonly RunBagEntry[] = [],
): readonly RunBagEntry[] {
  const counts = new Map<string, number>();

  for (const entry of previous) {
    counts.set(entry.itemKey, (counts.get(entry.itemKey) ?? 0) + entry.count);
  }

  for (const event of events) {
    if (event.payload.type !== 'loot/granted') {
      continue;
    }

    const itemKey = itemKeys[event.payload.itemIndex];
    if (itemKey === undefined) {
      throw new RangeError(
        `Unknown itemIndex ${event.payload.itemIndex} in loot/granted event`,
      );
    }
    counts.set(itemKey, (counts.get(itemKey) ?? 0) + event.payload.count);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => compareItemKeys(left, right))
    .map(([itemKey, count]) => ({ itemKey, count }));
}
