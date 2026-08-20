import {
  createEmptyGameSave,
  parseGameSave,
  type SaveDiagnostic,
  type SaveDraft,
} from '@huntbound/contracts';

import { SaveError } from '../errors/SaveError.ts';
import { migrateSaveDocument } from '../migrations/migrateSaveDocument.ts';
import {
  decodeSaveDocument,
  encodeSaveDocument,
} from '../serialization/saveDocument.ts';
import type { SaveDriver, SaveRepository } from './types.ts';

class OperationFailure {
  constructor(readonly error: unknown) {}
}

function invalidDocument(diagnostics: readonly SaveDiagnostic[]): SaveError {
  const firstDiagnostic = diagnostics[0];
  const detail =
    firstDiagnostic === undefined ? '' : `: ${firstDiagnostic.message}`;
  return new SaveError(
    'SAVE_DOCUMENT_INVALID',
    `Save document is invalid${detail}`,
    diagnostics,
  );
}

function transactionFailure(error: unknown): SaveError {
  return error instanceof SaveError
    ? error
    : new SaveError(
        'SAVE_TRANSACTION_FAILED',
        'Save transaction failed',
        error,
      );
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createSaveRepository(driver: SaveDriver): SaveRepository {
  let queue: Promise<void> = Promise.resolve();

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const queued = queue.then(() => operation());
    queue = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  }

  async function loadInternal(): Promise<
    ReturnType<typeof createEmptyGameSave>
  > {
    let document: unknown;
    try {
      document = await driver.read();
    } catch (error) {
      throw transactionFailure(error);
    }

    if (document === null) {
      return createEmptyGameSave();
    }

    const migrated = migrateSaveDocument(document);
    const parsed = parseGameSave(migrated);
    if (!parsed.ok) {
      throw invalidDocument(parsed.diagnostics);
    }
    return clone(parsed.value);
  }

  async function transactInternal<T>(
    operation: (draft: SaveDraft) => T,
  ): Promise<T> {
    try {
      return await driver.runTransaction((current) => {
        const source =
          current === null
            ? createEmptyGameSave()
            : migrateSaveDocument(current);
        const parsedCurrent = parseGameSave(source);
        if (!parsedCurrent.ok) {
          throw invalidDocument(parsedCurrent.diagnostics);
        }

        const draft = clone(parsedCurrent.value) as SaveDraft;
        let result: T;
        try {
          result = operation(draft);
        } catch (error) {
          throw new OperationFailure(error);
        }

        const parsedNext = parseGameSave(draft);
        if (!parsedNext.ok) {
          throw invalidDocument(parsedNext.diagnostics);
        }

        return {
          document: parsedNext.value,
          result,
        };
      });
    } catch (error) {
      if (error instanceof OperationFailure) {
        throw error.error;
      }
      throw transactionFailure(error);
    }
  }

  return {
    load() {
      return enqueue(loadInternal);
    },

    transact<T>(operation: (draft: SaveDraft) => T) {
      return enqueue(() => transactInternal(operation));
    },

    export() {
      return enqueue(async () => encodeSaveDocument(await loadInternal()));
    },

    import(serialized: string) {
      return enqueue(async () => {
        const document = decodeSaveDocument(serialized);

        try {
          await driver.runTransaction(() => ({
            document: clone(document),
            result: undefined,
          }));
        } catch (error) {
          throw transactionFailure(error);
        }
      });
    },
  };
}
