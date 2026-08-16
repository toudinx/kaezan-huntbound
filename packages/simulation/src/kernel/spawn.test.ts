import type {
  KernelScenario,
  SimulationEventPayload,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { encodeCanonicalJson } from '../state/canonicalJson.ts';
import { snapshotKernel } from '../state/snapshot.ts';
import { createSimulationKernel } from './index.ts';
import {
  at,
  despawnActor,
  kernelScenario,
  moveStep,
  payloads,
  payloadsOfType,
  TEST_SEED,
} from './testScenarios.ts';

function group(
  center: { x: number; y: number },
  radius: number,
  slots: readonly {
    x: number;
    y: number;
    blueprintId?: string;
    respawnTicks?: number;
  }[],
) {
  return {
    center: at(center.x, center.y),
    radius,
    slots: slots.map((slot) => ({
      blueprintId: slot.blueprintId ?? 'statue',
      position: at(slot.x, slot.y),
      respawnTicks: slot.respawnTicks ?? 5,
    })),
  };
}

function spawnScenario(overrides: Partial<KernelScenario> = {}) {
  return kernelScenario({
    scenarioId: 'spawn-test',
    spawnGroups: [group({ x: 4, y: 4 }, 1, [{ x: 4, y: 4 }])],
    ...overrides,
  });
}

function spawnedAt(
  payload: SimulationEventPayload,
): { x: number; y: number; z: number } | undefined {
  return payload.type === 'actor/spawned' ? payload.position : undefined;
}

describe('S7 spawn', () => {
  it('births a slot on its declared cell when that cell is free', () => {
    const kernel = createSimulationKernel(spawnScenario(), TEST_SEED);

    expect(payloads(kernel.advanceOne())).toEqual([
      {
        type: 'actor/spawned',
        entityId: 1,
        blueprintId: 'statue',
        position: at(4, 4),
        facing: 's',
      },
    ]);
  });

  it('gives the newborn a ready tick of now and no transition guard', () => {
    const kernel = createSimulationKernel(spawnScenario(), TEST_SEED);
    kernel.advanceOne();

    expect(kernel.state().actors).toEqual([
      expect.objectContaining({
        entityId: 1,
        readyAtTick: 0,
        transitionGuard: null,
      }),
    ]);
  });

  it('draws a free cell of the radius from the spawn stream when the declared cell is taken', () => {
    const scenario = spawnScenario({
      initialActors: [
        { blueprintId: 'statue', position: at(4, 4), facing: 's' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    const events = kernel.advanceOne();
    const born = payloads(events).map(spawnedAt).filter(Boolean);

    // Frozen draw: `spawn` first yields 0xc4e46756, and 0xc4e46756 % 8 picks
    // the seventh free cell of the row-major radius scan.
    expect(born).toEqual([at(4, 4), at(4, 5)]);
    expect(
      snapshotKernel(kernel).randomStreams.find((s) => s.label === 'spawn')
        ?.drawCount,
    ).toBe(1);
  });

  it('repeats the drawn cell for the same seed', () => {
    const scenario = spawnScenario({
      initialActors: [
        { blueprintId: 'statue', position: at(4, 4), facing: 's' },
      ],
    });
    const first = createSimulationKernel(scenario, TEST_SEED);
    const second = createSimulationKernel(scenario, TEST_SEED);

    expect(encodeCanonicalJson(first.advance(3))).toBe(
      encodeCanonicalJson(second.advance(3)),
    );
  });

  it('defers with no-free-cell and retries on the next tick', () => {
    const scenario = spawnScenario({
      spawnGroups: [group({ x: 0, y: 0 }, 0, [{ x: 0, y: 0 }])],
      initialActors: [
        { blueprintId: 'statue', position: at(0, 0), facing: 's' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();

    expect(payloadsOfType(kernel.advanceOne(), 'spawn/deferred')).toEqual([
      {
        type: 'spawn/deferred',
        groupIndex: 0,
        slotIndex: 0,
        reason: 'no-free-cell',
      },
    ]);

    kernel.enqueue(despawnActor(1, 2));
    const freed = kernel.advance(1);

    expect(kernel.tick).toBe(3);
    expect(payloadsOfType(freed, 'actor/spawned')).toEqual([
      {
        type: 'actor/spawned',
        entityId: 2,
        blueprintId: 'statue',
        position: at(0, 0),
        facing: 's',
      },
    ]);
    expect(payloadsOfType(freed, 'spawn/deferred')).toEqual([]);
  });

  it('spends no randomness when the radius holds no free cell', () => {
    const scenario = spawnScenario({
      spawnGroups: [group({ x: 0, y: 0 }, 0, [{ x: 0, y: 0 }])],
      initialActors: [
        { blueprintId: 'statue', position: at(0, 0), facing: 's' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advance(3);

    expect(
      snapshotKernel(kernel).randomStreams.find((s) => s.label === 'spawn')
        ?.drawCount,
    ).toBe(0);
  });

  it('waits respawnTicks after a despawn before refilling the slot', () => {
    const kernel = createSimulationKernel(
      spawnScenario({
        spawnGroups: [
          group({ x: 4, y: 4 }, 0, [{ x: 4, y: 4, respawnTicks: 5 }]),
        ],
      }),
      TEST_SEED,
    );
    kernel.advanceOne();
    kernel.enqueue(despawnActor(1, 1));

    const untilRespawn = kernel.advance(5);
    expect(payloadsOfType(untilRespawn, 'actor/spawned')).toEqual([]);

    expect(payloadsOfType(kernel.advanceOne(), 'actor/spawned')).toEqual([
      {
        type: 'actor/spawned',
        entityId: 2,
        blueprintId: 'statue',
        position: at(4, 4),
        facing: 's',
      },
    ]);
  });

  it('emits spawn/capped and spawn/deferred once the live ceiling is reached', () => {
    const kernel = createSimulationKernel(
      spawnScenario({
        maxLiveActors: 1,
        initialActors: [
          { blueprintId: 'statue', position: at(0, 0), facing: 's' },
        ],
      }),
      TEST_SEED,
    );

    expect(payloads(kernel.advanceOne()).slice(1)).toEqual([
      { type: 'spawn/capped', groupIndex: 0, slotIndex: 0 },
      {
        type: 'spawn/deferred',
        groupIndex: 0,
        slotIndex: 0,
        reason: 'cap-reached',
      },
    ]);
  });

  it('runs after movement, so a cell freed this tick is filled this tick', () => {
    const kernel = createSimulationKernel(
      spawnScenario({
        spawnGroups: [group({ x: 4, y: 4 }, 0, [{ x: 4, y: 4 }])],
        initialActors: [
          { blueprintId: 'statue', position: at(4, 4), facing: 'e' },
        ],
      }),
      TEST_SEED,
    );
    kernel.advanceOne();
    kernel.enqueue(moveStep(1, 'e', 1));

    expect(payloads(kernel.advanceOne())).toEqual([
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(4, 4),
        to: at(5, 4),
        facing: 'e',
      },
      {
        type: 'actor/spawned',
        entityId: 2,
        blueprintId: 'statue',
        position: at(4, 4),
        facing: 's',
      },
    ]);
  });

  it('runs after the AI, so a newborn wanderer only decides on the next tick', () => {
    // S6 has already walked the actor list when S7 births, so the creature born
    // at tick 0 decides at tick 1 and steps at tick 2.
    const kernel = createSimulationKernel(
      spawnScenario({
        spawnGroups: [
          group({ x: 4, y: 4 }, 0, [{ x: 4, y: 4, blueprintId: 'wanderer' }]),
        ],
      }),
      TEST_SEED,
    );
    kernel.advanceOne();

    expect(payloadsOfType(kernel.advanceOne(), 'actor/moved')).toEqual([]);
    expect(payloadsOfType(kernel.advanceOne(), 'actor/moved')).toHaveLength(1);
  });

  it('walks groups and slots in canonical order whatever the declaration order', () => {
    const near = group({ x: 1, y: 1 }, 0, [{ x: 1, y: 1 }]);
    const far = group({ x: 3, y: 3 }, 1, [
      { x: 4, y: 3 },
      { x: 2, y: 3 },
    ]);
    const reversedFar = group({ x: 3, y: 3 }, 1, [
      { x: 2, y: 3 },
      { x: 4, y: 3 },
    ]);

    const declared = createSimulationKernel(
      spawnScenario({ spawnGroups: [near, far] }),
      TEST_SEED,
    );
    const reversed = createSimulationKernel(
      spawnScenario({ spawnGroups: [reversedFar, near] }),
      TEST_SEED,
    );

    expect(encodeCanonicalJson(reversed.advance(2))).toBe(
      encodeCanonicalJson(declared.advance(2)),
    );
    expect(encodeCanonicalJson(snapshotKernel(reversed))).toBe(
      encodeCanonicalJson(snapshotKernel(declared)),
    );
  });

  it('carries every slot of the table in the snapshot, in canonical order', () => {
    const kernel = createSimulationKernel(
      spawnScenario({
        spawnGroups: [
          group({ x: 3, y: 3 }, 1, [
            { x: 4, y: 3 },
            { x: 2, y: 3 },
          ]),
          group({ x: 1, y: 1 }, 0, [{ x: 1, y: 1 }]),
        ],
      }),
      TEST_SEED,
    );
    kernel.advanceOne();

    expect(snapshotKernel(kernel).spawnSlots).toEqual([
      { groupIndex: 0, slotIndex: 0, readyAtTick: 0, entityId: 1 },
      { groupIndex: 1, slotIndex: 0, readyAtTick: 0, entityId: 2 },
      { groupIndex: 1, slotIndex: 1, readyAtTick: 0, entityId: 3 },
    ]);
  });
});
