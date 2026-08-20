import type { ActiveRunState } from '@huntbound/contracts';

import { SaveError } from '../errors/SaveError.ts';
import type { SaveRepository } from '../repository/types.ts';

export interface CheckpointScheduler {
  onTick(tick: number, capture: () => ActiveRunState): void;
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
  let pending: ActiveRunState | undefined;
  let disposed = false;

  function startWrite(session: ActiveRunState): void {
    inFlight = repository
      .transact((draft) => {
        draft.session = session;
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

  function enqueue(session: ActiveRunState): void {
    if (disposed) {
      return;
    }
    if (inFlight !== undefined) {
      pending = session;
      return;
    }
    startWrite(session);
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
