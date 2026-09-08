import type { ActiveRunState } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { SaveError } from '../errors/SaveError.ts';
import { createSaveRepository } from '../repository/SaveRepository.ts';
import type { SaveDriver, TransactionOutcome } from '../repository/types.ts';
import { createCheckpointScheduler } from './checkpointScheduler.ts';
import {
  createHoldableDriver,
  makeSession,
  saveWithSession,
} from './sessionTestUtils.ts';
import type { RunCheckpoint } from './types.ts';

function checkpoint(
  overrides: Partial<ActiveRunState> = {},
  experience = 0,
): RunCheckpoint {
  return { session: makeSession(overrides), character: { experience } };
}

describe('createCheckpointScheduler', () => {
  it('captures only on positive multiples of everyTicks', () => {
    const repository = createSaveRepository(createHoldableDriver().driver);
    const captured: number[] = [];
    const scheduler = createCheckpointScheduler(repository, {
      everyTicks: 4,
      onError() {
        throw new Error('onError should not run');
      },
    });
    const captureable = checkpoint();

    for (const tick of [0, 1, 2, 3, 4, 5, 7, 8, 9]) {
      scheduler.onTick(tick, () => {
        captured.push(tick);
        return captureable;
      });
    }

    expect(captured).toEqual([4, 8]);
    scheduler.dispose();
  });

  it('coalesces to one extra write of the newest state while a write is in flight', async () => {
    const held = createHoldableDriver();
    held.holdNextWrite();
    const repository = createSaveRepository(held.driver);
    const scheduler = createCheckpointScheduler(repository, {
      everyTicks: 4,
      onError() {
        throw new Error('onError should not run');
      },
    });

    scheduler.onTick(4, () => checkpoint({ huntId: 'hunt:tick-4' }));
    scheduler.onTick(8, () => checkpoint({ huntId: 'hunt:tick-8' }));
    scheduler.onTick(12, () => checkpoint({ huntId: 'hunt:tick-12' }));
    scheduler.onTick(16, () => checkpoint({ huntId: 'hunt:tick-16' }));

    await Promise.resolve();
    expect(held.writeCount()).toBe(1);

    held.releaseHeldWrite();
    await scheduler.flush();

    expect(held.writeCount()).toBe(2);
    await expect(repository.load()).resolves.toMatchObject({
      session: { huntId: 'hunt:tick-16' },
    });
    scheduler.dispose();
  });

  it('writes the character alongside the session it belongs to', async () => {
    const held = createHoldableDriver();
    const repository = createSaveRepository(held.driver);
    const scheduler = createCheckpointScheduler(repository, {
      everyTicks: 4,
      onError() {
        throw new Error('onError should not run');
      },
    });

    scheduler.onTick(4, () => checkpoint({ huntId: 'hunt:tick-4' }, 2_450));
    await scheduler.flush();

    await expect(repository.load()).resolves.toMatchObject({
      session: { huntId: 'hunt:tick-4' },
      character: { experience: 2_450 },
    });
    scheduler.dispose();
  });

  it('does not move the bestiary event cursor backwards', async () => {
    const initial = saveWithSession(
      makeSession({ lastBestiaryEventSequence: 9 }),
    );
    const repository = createSaveRepository(
      createHoldableDriver(initial).driver,
    );
    const scheduler = createCheckpointScheduler(repository, {
      everyTicks: 4,
      onError() {
        throw new Error('onError should not run');
      },
    });

    scheduler.onTick(4, () => checkpoint({ lastBestiaryEventSequence: 4 }));
    await scheduler.flush();

    await expect(repository.load()).resolves.toMatchObject({
      session: { lastBestiaryEventSequence: 9 },
    });
    scheduler.dispose();
  });

  it('flush writes the pending checkpoint and resolves', async () => {
    const held = createHoldableDriver();
    held.holdNextWrite();
    const repository = createSaveRepository(held.driver);
    const scheduler = createCheckpointScheduler(repository, {
      everyTicks: 4,
      onError() {
        throw new Error('onError should not run');
      },
    });

    scheduler.onTick(4, () => checkpoint({ huntId: 'hunt:first' }));
    scheduler.onTick(8, () => checkpoint({ huntId: 'hunt:pending' }));

    held.releaseHeldWrite();
    await scheduler.flush();

    await expect(repository.load()).resolves.toMatchObject({
      session: { huntId: 'hunt:pending' },
    });
    scheduler.dispose();
  });

  it('calls onError and does not throw from onTick when a write fails', async () => {
    const errors: SaveError[] = [];
    const failure = new SaveError('SAVE_QUOTA_EXCEEDED', 'quota exceeded');
    const driver: SaveDriver = {
      async read() {
        return null;
      },
      async runTransaction<T>(
        _operation: (current: unknown) => TransactionOutcome<T>,
      ): Promise<T> {
        throw failure;
      },
      close() {},
    };
    const scheduler = createCheckpointScheduler(createSaveRepository(driver), {
      everyTicks: 4,
      onError(error) {
        errors.push(error);
      },
    });

    expect(() => scheduler.onTick(4, () => checkpoint())).not.toThrow();

    await scheduler.flush();

    expect(errors).toEqual([failure]);
    scheduler.dispose();
  });

  it('dispose drops the pending checkpoint so it is never written', async () => {
    const held = createHoldableDriver();
    held.holdNextWrite();
    const repository = createSaveRepository(held.driver);
    const scheduler = createCheckpointScheduler(repository, {
      everyTicks: 4,
      onError() {
        throw new Error('onError should not run');
      },
    });

    scheduler.onTick(4, () => checkpoint({ huntId: 'hunt:first' }));
    scheduler.onTick(8, () => checkpoint({ huntId: 'hunt:pending' }));
    scheduler.dispose();

    held.releaseHeldWrite();
    await scheduler.flush();

    expect(held.writeCount()).toBe(1);
    await expect(repository.load()).resolves.toMatchObject({
      session: { huntId: 'hunt:first' },
    });
  });
});
