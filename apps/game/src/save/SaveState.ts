import type {
  AchievementProgress,
  BestiaryProgress,
  CharacterProgress,
  NextHuntBuffState,
  RunBagEntry,
} from '../../../../packages/contracts/src/index.ts';

export type SaveStatus = 'loading' | 'ready' | 'saving' | 'error';

export interface SaveInventoryState {
  readonly status: SaveStatus;
  readonly message: string;
  readonly bag: readonly RunBagEntry[];
  readonly stash: readonly RunBagEntry[];
  readonly gold: number;
  readonly nextHuntBuff: NextHuntBuffState;
  readonly completedRuns: number;
  readonly activeVocationKey: string;
  readonly characters: readonly CharacterProgress[];
  readonly bestiary: readonly BestiaryProgress[];
  readonly achievements: readonly AchievementProgress[];
  /** The active character the save keeps between runs. Never reset by a death. */
  readonly character: CharacterProgress;
}

export interface SaveStateSource {
  getState(): SaveInventoryState;
  subscribe(listener: (state: SaveInventoryState) => void): () => void;
}
