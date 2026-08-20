import { describe, expect, it } from 'vitest';

import { createMemorySaveDriver } from './memory.ts';

interface MemoryDocument {
  nested: { value: number };
}

describe('MemorySaveDriver', () => {
  it('clones the initial and read documents', async () => {
    const initial: MemoryDocument = { nested: { value: 1 } };
    const driver = createMemorySaveDriver(initial);
    initial.nested.value = 2;

    const read = (await driver.read()) as MemoryDocument;
    expect(read).toEqual({ nested: { value: 1 } });
    read.nested.value = 3;

    await expect(driver.read()).resolves.toEqual({
      nested: { value: 1 },
    });
  });

  it('does not commit a transaction when the operation throws', async () => {
    const driver = createMemorySaveDriver({ nested: { value: 1 } });
    const failure = new Error('driver operation failed');

    await expect(
      driver.runTransaction(() => {
        throw failure;
      }),
    ).rejects.toBe(failure);

    await expect(driver.read()).resolves.toEqual({
      nested: { value: 1 },
    });
  });

  it('clones the document at commit time', async () => {
    const driver = createMemorySaveDriver();
    const committed: MemoryDocument = { nested: { value: 4 } };

    await driver.runTransaction(() => ({
      document: committed,
      result: undefined,
    }));
    committed.nested.value = 5;

    await expect(driver.read()).resolves.toEqual({
      nested: { value: 4 },
    });
  });
});
