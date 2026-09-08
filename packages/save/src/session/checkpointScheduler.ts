import { SaveError } from '../errors/SaveError.ts';
import type { SaveRepository } from '../repository/types.ts';
import type { RunCheckpoint } from './types.ts';

export interface CheckpointScheduler {
  onTick(tick: number, capture: () => RunCheckpoint): void;
  flush(): Promise<void>;
  dispose(): void;
}

function toSaveError(error: unknown): SaveError {
  return error instanceof SaveError
    ? error
    : new SaveError(
        'SAVE_TRANSACTION_FAILED',
        'Save transaction failed',
        error,
      );
}

export function createCheckpointScheduler(
  repository: SaveRepository,
  options: {
    readonly everyTicks: number;
    readonly onError: (error: SaveError) => void;
  },
): CheckpointScheduler {
  const { everyTicks, onError } = options;
  let inFlight: Promise<void> | undefined;
  let pending: RunCheckpoint | undefined;
  let disposed = false;

  function startWrite(checkpoint: RunCheckpoint): void {
    inFlight = repository
      .transact((draft) => {
        const persistedCursor = draft.session?.lastBestiaryEventSequence ?? 0;
        draft.session = {
          ...checkpoint.session,
          // A checkpoint can have been captured while a kill-credit
          // transaction was queued. Never let that older capture roll the
          // idempotency cursor back and make the same event pay twice after a
          // reload.
          lastBestiaryEventSequence: Math.max(
            checkpoint.session.lastBestiaryEventSequence,
            persistedCursor,
          ),
        };
        draft.character = {
          ...draft.character,
          experience: checkpoint.character.experience,
        };
      })
      .then(
        () => {
          inFlight = undefined;
          const next = pending;
          pending = undefined;
          if (!disposed && next !== undefined) {
            startWrite(next);
          }
        },
        (error: unknown) => {
          inFlight = undefined;
          if (!disposed) {
            onError(toSaveError(error));
          }
          const next = pending;
          pending = undefined;
          if (!disposed && next !== undefined) {
            startWrite(next);
          }
        },
      );
  }

  function enqueue(checkpoint: RunCheckpoint): void {
    if (disposed) {
      return;
    }
    if (inFlight !== undefined) {
      pending = checkpoint;
      return;
    }
    startWrite(checkpoint);
  }

  return {
    onTick(tick, capture) {
      if (
        disposed ||
        everyTicks <= 0 ||
        tick === 0 ||
        tick % everyTicks !== 0
      ) {
        return;
      }
      enqueue(capture());
    },

    async flush() {
      while (inFlight !== undefined) {
        await inFlight;
      }
      if (!disposed && pending !== undefined) {
        const next = pending;
        pending = undefined;
        startWrite(next);
        await inFlight;
      }
    },

    dispose() {
      disposed = true;
      pending = undefined;
    },
  };
}
