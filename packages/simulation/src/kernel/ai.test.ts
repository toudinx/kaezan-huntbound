import type { KernelScenario, SimulationEvent } from '@huntbound/contracts';
import { createSeed } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { snapshotKernel } from '../state/snapshot.ts';
import { createSimulationKernel } from './index.ts';
import {
  at,
  despawnActor,
  kernelScenario,
  moveStep,
  payloadsOfType,
  TEST_SEED,
} from './testScenarios.ts';

function runTicks(
  scenario: KernelScenario,
  ticks: number,
): readonly SimulationEvent[] {
  const kernel = createSimulationKernel(scenario, TEST_SEED);
  const collected: SimulationEvent[] = [];
  for (let index = 0; index < ticks; index += 1) {
    collected.push(...kernel.advanceOne());
  }
  return collected;
}

function movesOf(events: readonly SimulationEvent[], entityId: number) {
  return events
    .filter(
      (event) =>
        event.payload.type === 'actor/moved' &&
        event.payload.entityId === entityId,
    )
    .map((event) => ({
      tick: event.tick,
      facing:
        event.payload.type === 'actor/moved' ? event.payload.facing : undefined,
    }));
}

const loneWanderer = kernelScenario({
  initialActors: [{ blueprintId: 'wanderer', position: at(3, 3), facing: 'n' }],
});

const twoWanderers = kernelScenario({
  initialActors: [
    { blueprintId: 'wanderer', position: at(1, 1), facing: 'n' },
    { blueprintId: 'wanderer', position: at(5, 3), facing: 'n' },
  ],
});

describe('kernel wander ai', () => {
  it('queues the decision for the next tick instead of the current one', () => {
    const kernel = createSimulationKernel(loneWanderer, TEST_SEED);

    const firstTick = kernel.advanceOne();
    expect(payloadsOfType(firstTick, 'actor/moved')).toEqual([]);

    const secondTick = kernel.advanceOne();
    expect(payloadsOfType(secondTick, 'actor/moved')).toEqual([
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(3, 3),
        to: at(2, 2),
        facing: 'nw',
      },
    ]);
  });

  it('picks the direction with nextBelow(8) over the canonical order', () => {
    const events = runTicks(loneWanderer, 9);

    expect(payloadsOfType(events, 'actor/moved')).toEqual([
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(3, 3),
        to: at(2, 2),
        facing: 'nw',
      },
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(2, 2),
        to: at(3, 3),
        facing: 'se',
      },
    ]);
  });

  it('decides only while the actor is off cooldown', () => {
    const events = runTicks(loneWanderer, 9);

    expect(movesOf(events, 1)).toEqual([
      { tick: 1, facing: 'nw' },
      { tick: 7, facing: 'se' },
    ]);
  });

  it('reproduces the same journal for the same seed and diverges on another', () => {
    expect(runTicks(loneWanderer, 12)).toEqual(runTicks(loneWanderer, 12));

    const otherSeed = createSeed('0f1e2d3c4b5a6979');
    const kernel = createSimulationKernel(loneWanderer, otherSeed);
    const other: SimulationEvent[] = [];
    for (let index = 0; index < 12; index += 1) {
      other.push(...kernel.advanceOne());
    }

    expect(other).not.toEqual(runTicks(loneWanderer, 12));
  });

  it('consumes the ai stream in ascending entity id order', () => {
    const events = runTicks(twoWanderers, 2);

    expect(payloadsOfType(events, 'actor/moved')).toEqual([
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(1, 1),
        to: at(0, 0),
        facing: 'nw',
      },
      {
        type: 'actor/moved',
        entityId: 2,
        from: at(5, 3),
        to: at(6, 4),
        facing: 'se',
      },
    ]);
  });

  it('never lets an inert actor consume the ai stream', () => {
    const withInertNeighbours = kernelScenario({
      initialActors: [
        { blueprintId: 'statue', position: at(0, 0), facing: 'n' },
        { blueprintId: 'wanderer', position: at(3, 3), facing: 'n' },
        { blueprintId: 'statue', position: at(7, 5), facing: 'n' },
      ],
    });

    const alone = movesOf(runTicks(loneWanderer, 9), 1);
    const surrounded = movesOf(runTicks(withInertNeighbours, 9), 2);

    expect(surrounded).toEqual(alone);
    expect(surrounded).toEqual([
      { tick: 1, facing: 'nw' },
      { tick: 7, facing: 'se' },
    ]);
  });

  // These two invariants are why a pending intent needs no `order` field:
  // internal intents never collide on (tick, entityId), and the only collision
  // that does happen — external against internal — is broken by `sourceRank`.
  it('never queues two internal intents for the same tick and actor', () => {
    const kernel = createSimulationKernel(twoWanderers, TEST_SEED);
    const queued: string[] = [];

    for (let tick = 0; tick < 40; tick += 1) {
      kernel.advanceOne();
      for (const intent of snapshotKernel(kernel).pendingIntents) {
        queued.push(`${intent.tick}:${intent.entityId}`);
      }
    }

    expect(queued.length).toBeGreaterThan(0);
    expect(new Set(queued).size).toBe(queued.length);
  });

  it('resolves the external intent before the internal one for the same actor', () => {
    const kernel = createSimulationKernel(loneWanderer, TEST_SEED);
    kernel.advanceOne();

    expect(snapshotKernel(kernel).pendingIntents).toEqual([
      { tick: 1, entityId: 1, direction: 'nw' },
    ]);

    kernel.enqueue(moveStep(1, 'e', 1));
    const events = kernel.advanceOne();

    // The external step lands and puts the actor on cooldown; the internal one
    // is resolved second and therefore blocked. Reversing the two would move
    // the actor to (2,2) facing nw instead.
    expect(payloadsOfType(events, 'actor/moved')).toEqual([
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(3, 3),
        to: at(4, 3),
        facing: 'e',
      },
    ]);
    expect(payloadsOfType(events, 'actor/move-blocked')).toEqual([
      {
        type: 'actor/move-blocked',
        entityId: 1,
        attempted: at(3, 2),
        reason: 'cooldown',
      },
    ]);
  });

  it('shifts later decisions deterministically when a wander actor leaves', () => {
    const withDespawn = () => {
      const kernel = createSimulationKernel(twoWanderers, TEST_SEED);
      const collected: SimulationEvent[] = [];
      collected.push(...kernel.advanceOne());
      kernel.enqueue(despawnActor(1, 1));
      for (let index = 1; index < 9; index += 1) {
        collected.push(...kernel.advanceOne());
      }
      return collected;
    };

    const first = withDespawn();
    expect(withDespawn()).toEqual(first);

    expect(movesOf(first, 2)).toEqual([
      { tick: 1, facing: 'se' },
      { tick: 7, facing: 's' },
    ]);
    expect(movesOf(runTicks(twoWanderers, 9), 2)).toEqual([
      { tick: 1, facing: 'se' },
      { tick: 7, facing: 'sw' },
    ]);
  });
});
