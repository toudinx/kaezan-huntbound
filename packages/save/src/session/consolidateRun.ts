import type { RunBagEntry, SaveDraft } from '@huntbound/contracts';

import type { RunOutcome } from './types.ts';

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

/**
 * Closes the active run into the persistent save.
 *
 * The three outcomes differ only in what the run is worth. `completed` is the
 * explicit exit: the bag is banked and the run is credited. `abandoned` banks
 * the bag without crediting the run -- it is what a session that can no longer
 * be resumed is still worth. `died` is decision 1 of the PB-13 README: dying
 * costs the bag and the credit and nothing else, so the stash is left exactly
 * as it was.
 *
 * Clearing the session first is what makes a second call a no-op, which is the
 * only guard against banking the same bag twice.
 */
export function consolidateRun(draft: SaveDraft, outcome: RunOutcome): void {
  const session = draft.session;
  if (session === null) {
    return;
  }

  draft.session = null;
  if (outcome === 'died') {
    return;
  }

  draft.stash = mergeBagIntoStash(draft.stash, session.bag);
  if (outcome === 'completed') {
    draft.completedRuns += 1;
  }
}
