import type { SaveDriver, TransactionOutcome } from '../repository/types.ts';

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createMemorySaveDriver(initial: unknown = null): SaveDriver {
  let document = clone(initial);

  return {
    async read() {
      return clone(document);
    },

    async runTransaction<T>(
      operation: (current: unknown) => TransactionOutcome<T>,
    ) {
      const current = clone(document);
      const outcome = operation(current);
      const nextDocument = clone(outcome.document);
      document = nextDocument;
      return outcome.result;
    },

    close() {},
  };
}
