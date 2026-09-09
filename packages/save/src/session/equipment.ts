import {
  activeCharacter,
  type EquipmentSlot,
  type RunBagEntry,
  replaceCharacter,
  type SaveDraft,
} from '@huntbound/contracts';

function compareItemKeys(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function addToStash(
  stash: readonly RunBagEntry[],
  itemKey: string,
): readonly RunBagEntry[] {
  const existing = stash.find((entry) => entry.itemKey === itemKey);
  if (existing !== undefined) {
    return stash.map((entry) =>
      entry.itemKey === itemKey
        ? { itemKey, count: entry.count + 1 }
        : { ...entry },
    );
  }
  return [...stash.map((entry) => ({ ...entry })), { itemKey, count: 1 }].sort(
    (left, right) => compareItemKeys(left.itemKey, right.itemKey),
  );
}

function takeFromStash(
  stash: readonly RunBagEntry[],
  itemKey: string,
): readonly RunBagEntry[] | null {
  const existing = stash.find((entry) => entry.itemKey === itemKey);
  if (existing === undefined) {
    return null;
  }
  return stash.flatMap((entry) => {
    if (entry.itemKey !== itemKey) return [{ ...entry }];
    return entry.count > 1 ? [{ itemKey, count: entry.count - 1 }] : [];
  });
}

/**
 * Moves one copy of `itemKey` out of the stash and into `slot`.
 *
 * A worn piece is not in the stash: it left when it was equipped and comes
 * back when it comes off, so the panel can never show one item in two places
 * and selling can never sell the sword you are holding. Whatever was in the
 * slot is returned to the stash in the same transaction, which is what makes
 * swapping a weapon a single reversible move.
 *
 * Returns `false` when the stash does not hold the item, leaving the draft
 * untouched.
 */
export function equipFromStash(
  draft: SaveDraft,
  slot: EquipmentSlot,
  itemKey: string,
): boolean {
  const withoutItem = takeFromStash(draft.stash, itemKey);
  if (withoutItem === null) {
    return false;
  }

  const character = activeCharacter(draft);
  const previous = character.equipment[slot];
  draft.stash =
    previous === null ? withoutItem : addToStash(withoutItem, previous);
  replaceCharacter(draft, {
    ...character,
    equipment: { ...character.equipment, [slot]: itemKey },
  });
  return true;
}

/** Returns the worn piece to the stash. `false` when the slot was empty. */
export function unequipToStash(draft: SaveDraft, slot: EquipmentSlot): boolean {
  const character = activeCharacter(draft);
  const itemKey = character.equipment[slot];
  if (itemKey === null) {
    return false;
  }

  draft.stash = addToStash(draft.stash, itemKey);
  replaceCharacter(draft, {
    ...character,
    equipment: { ...character.equipment, [slot]: null },
  });
  return true;
}
