import type { RunBagEntry } from '../../../../packages/contracts/src/index.ts';

export type SaveStatus = 'loading' | 'ready' | 'saving' | 'error';

export interface SaveInventoryState {
  readonly status: SaveStatus;
  readonly message: string;
  readonly bag: readonly RunBagEntry[];
  readonly stash: readonly RunBagEntry[];
  readonly completedRuns: number;
}

export interface SaveStateSource {
  getState(): SaveInventoryState;
  subscribe(listener: (state: SaveInventoryState) => void): () => void;
}
