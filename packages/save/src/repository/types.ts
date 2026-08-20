import type { GameSave, SaveDraft } from '@huntbound/contracts';

export interface SaveDriver {
  read(): Promise<unknown>;
  runTransaction<T>(
    operation: (current: unknown) => TransactionOutcome<T>,
  ): Promise<T>;
  close(): void;
}

export interface TransactionOutcome<T> {
  readonly document: unknown;
  readonly result: T;
}

export interface SaveRepository {
  load(): Promise<GameSave>;
  transact<T>(operation: (draft: SaveDraft) => T): Promise<T>;
  export(): Promise<string>;
  import(serialized: string): Promise<void>;
}
