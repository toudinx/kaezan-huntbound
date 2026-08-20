import type { RunBagEntry, SaveDraft } from '@huntbound/contracts';

function compareItemKeys(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function mergeBagIntoStash(
  stash: readonly RunBagEntry[],
  bag: readonly RunBagEntry[],
): readonly RunBagEntry[] {
  const counts = new Map<string, number>();
  for (const entry of stash) {
    counts.set(entry.itemKey, (counts.get(entry.itemKey) ?? 0) + entry.count);
  }
  for (const entry of bag) {
    counts.set(entry.itemKey, (counts.get(entry.itemKey) ?? 0) + entry.count);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => compareItemKeys(left, right))
    .map(([itemKey, count]) => ({ itemKey, count }));
}

export function consolidateRun(
  draft: SaveDraft,
  outcome: 'completed' | 'abandoned',
): void {
  const session = draft.session;
  if (session === null) {
    return;
  }

  draft.stash = mergeBagIntoStash(draft.stash, session.bag);
  draft.session = null;
  if (outcome === 'completed') {
    draft.completedRuns += 1;
  }
}
