import type { KernelScenario, SpawnSlotState } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { encodeCanonicalJson } from '../state/canonicalJson.ts';
import { restoreSimulationKernel, snapshotKernel } from '../state/snapshot.ts';
import { createSimulationKernel } from './index.ts';
import { at, kernelScenario, TEST_SEED } from './testScenarios.ts';

function group(
  center: { x: number; y: number },
  radius: number,
  slots: readonly { x: number; y: number }[],
) {
  return {
    center: at(center.x, center.y),
    radius,
    slots: slots.map((slot) => ({
      blueprintId: 'statue',
      position: at(slot.x, slot.y),
      respawnTicks: 5,
    })),
  };
}

function spawnScenario(overrides: Partial<KernelScenario> = {}) {
  return kernelScenario({
    scenarioId: 'spawn-identity-test',
    spawnGroups: [group({ x: 4, y: 4 }, 1, [{ x: 4, y: 4 }])],
    ...overrides,
  });
}

function slotIdOf(slot: SpawnSlotState): string {
  const record = slot as unknown as { readonly slotId?: unknown };
  if (typeof record.slotId !== 'string' || record.slotId.length === 0) {
    throw new Error(
      `spawn slot is still addressed by list position: ${JSON.stringify(slot)}`,
    );
  }
  return record.slotId;
}

function slotIdsOf(scenario: KernelScenario): readonly string[] {
  const kernel = createSimulationKernel(scenario, TEST_SEED);
  return snapshotKernel(kernel).spawnSlots.map(slotIdOf);
}

describe('stable spawn slot identity', () => {
  it('keeps existing identities when a group is inserted in the middle', () => {
    const original = spawnScenario({
      spawnGroups: [
        group({ x: 1, y: 1 }, 0, [{ x: 1, y: 1 }]),
        group({ x: 5, y: 5 }, 0, [{ x: 5, y: 5 }]),
      ],
    });
    const inserted = spawnScenario({
      spawnGroups: [
        group({ x: 1, y: 1 }, 0, [{ x: 1, y: 1 }]),
        group({ x: 3, y: 3 }, 0, [{ x: 3, y: 3 }]),
        group({ x: 5, y: 5 }, 0, [{ x: 5, y: 5 }]),
      ],
    });

    const originalIds = slotIdsOf(original);
    const insertedIds = slotIdsOf(inserted);

    expect(originalIds).toHaveLength(2);
    expect(insertedIds).toEqual(expect.arrayContaining([...originalIds]));
  });

  it('keeps existing identities when a slot is inserted in the middle of a group', () => {
    const original = spawnScenario({
      spawnGroups: [
        group({ x: 3, y: 3 }, 2, [
          { x: 2, y: 3 },
          { x: 4, y: 3 },
        ]),
      ],
    });
    const inserted = spawnScenario({
      spawnGroups: [
        group({ x: 3, y: 3 }, 2, [
          { x: 2, y: 3 },
          { x: 3, y: 3 },
          { x: 4, y: 3 },
        ]),
      ],
    });

    const originalIds = slotIdsOf(original);
    const insertedIds = slotIdsOf(inserted);

    expect(originalIds).toHaveLength(2);
    expect(insertedIds).toEqual(expect.arrayContaining([...originalIds]));
  });

  it('gives two slots that share an origin different identities in deterministic order', () => {
    const shared = { x: 3, y: 3 };
    const declared = spawnScenario({
      spawnGroups: [
        group({ x: 2, y: 2 }, 2, [shared]),
        group({ x: 4, y: 4 }, 2, [shared]),
      ],
    });
    const reversed = spawnScenario({
      spawnGroups: [
        group({ x: 4, y: 4 }, 2, [shared]),
        group({ x: 2, y: 2 }, 2, [shared]),
      ],
    });

    const declaredIds = slotIdsOf(declared);
    const reversedIds = slotIdsOf(reversed);

    expect(declaredIds).toHaveLength(2);
    expect(new Set(declaredIds).size).toBe(2);
    expect(reversedIds).toEqual(declaredIds);
  });

  it('round-trips spawn state through a snapshot restore', () => {
    const scenario = spawnScenario({
      spawnGroups: [
        group({ x: 1, y: 1 }, 0, [{ x: 1, y: 1 }]),
        group({ x: 3, y: 3 }, 1, [
          { x: 2, y: 3 },
          { x: 4, y: 3 },
        ]),
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();
    const snapshot = snapshotKernel(kernel);

    expect(snapshot.spawnSlots.map(slotIdOf)).toHaveLength(3);

    const restored = restoreSimulationKernel(scenario, snapshot);
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      throw new Error(
        'Expected restoreSimulationKernel to accept the snapshot',
      );
    }

    expect(encodeCanonicalJson(snapshotKernel(restored.value))).toBe(
      encodeCanonicalJson(snapshot),
    );
  });
});
