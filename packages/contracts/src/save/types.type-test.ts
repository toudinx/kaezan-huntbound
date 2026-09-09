import {
  createEmptyCharacterProgress,
  type GameSave,
  type SaveDraft,
} from './types.ts';

function assertGameSaveReadonly(save: GameSave) {
  // @ts-expect-error GameSave fields are readonly at every level.
  save.completedRuns = 1;
  // @ts-expect-error gold cannot be replaced on a GameSave.
  save.gold = 1;
  // @ts-expect-error nextHuntBuff cannot be replaced on a GameSave.
  save.nextHuntBuff = 'pending';
  // @ts-expect-error stash cannot be replaced on a GameSave.
  save.stash = [];
  // @ts-expect-error session cannot be replaced on a GameSave.
  save.session = null;
  // @ts-expect-error the characters cannot be replaced on a GameSave.
  save.characters = [];
  const character = save.characters[0];
  if (character !== undefined) {
    // @ts-expect-error experience is readonly on a GameSave.
    character.experience = 1;
    // @ts-expect-error the worn set is readonly on a GameSave.
    character.equipment.weapon = 'item:tibia:sword';
    // @ts-expect-error the collection is readonly on a GameSave.
    character.collection = [];
  }

  // @ts-expect-error the active vocation cannot be replaced on a GameSave.
  save.activeVocationKey = 'vocation:tibia:sorcerer';

  const stashEntry = save.stash[0];
  if (stashEntry !== undefined) {
    // @ts-expect-error bag entries on a GameSave are readonly.
    stashEntry.count = 2;
  }
}

function assertSessionReadonly(save: GameSave) {
  if (save.session === null) {
    return;
  }
  // @ts-expect-error ActiveRunState fields are readonly.
  save.session.huntId = 'other';
  const bagEntry = save.session.bag[0];
  if (bagEntry !== undefined) {
    // @ts-expect-error bag entries on a GameSave are readonly.
    bagEntry.itemKey = 'item:tibia:gold-coin';
  }
}

function assertSaveDraftMutable(draft: SaveDraft) {
  draft.schemaVersion = 1;
  draft.stash = [];
  draft.completedRuns = 2;
  draft.gold = 3;
  draft.nextHuntBuff = 'none';
  draft.characters = [{ ...createEmptyCharacterProgress(), experience: 3 }];
  draft.session = null;
}

declare const save: GameSave;
declare const draft: SaveDraft;
assertGameSaveReadonly(save);
assertSessionReadonly(save);
assertSaveDraftMutable(draft);
