import type { GameSave, SaveDraft } from './types.ts';

function assertGameSaveReadonly(save: GameSave) {
  // @ts-expect-error GameSave fields are readonly at every level.
  save.completedRuns = 1;
  // @ts-expect-error stash cannot be replaced on a GameSave.
  save.stash = [];
  // @ts-expect-error session cannot be replaced on a GameSave.
  save.session = null;

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
  draft.session = null;
}

declare const save: GameSave;
declare const draft: SaveDraft;
assertGameSaveReadonly(save);
assertSessionReadonly(save);
assertSaveDraftMutable(draft);
