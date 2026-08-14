import type {
  GridPosition,
  KernelScenario,
  SimulationEvent,
  SimulationSnapshot,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { restoreSimulationKernel, snapshotKernel } from '../state/snapshot.ts';
import { createSimulationKernel } from './index.ts';
import {
  at,
  kernelScenario,
  moveStep,
  payloads,
  TEST_SEED,
  TEST_Z,
  TEST_Z_BELOW,
  twoFloors,
} from './testScenarios.ts';

const STAIRS = at(3, 1, TEST_Z);
const LANDING = at(3, 1, TEST_Z_BELOW);

function stairScenario(overrides: Partial<KernelScenario> = {}) {
  return kernelScenario({
    scenarioId: 'transition-test',
    floors: twoFloors(),
    transitions: [{ from: STAIRS, to: LANDING }],
    initialActors: [{ blueprintId: 'statue', position: at(2, 1), facing: 'e' }],
    ...overrides,
  });
}

/** Stairs in both directions, so the landing cell is itself a transition. */
function bidirectionalScenario(overrides: Partial<KernelScenario> = {}) {
  return stairScenario({
    transitions: [
      { from: STAIRS, to: LANDING },
      { from: LANDING, to: STAIRS },
    ],
    ...overrides,
  });
}

function bootedAt(scenario: KernelScenario) {
  const kernel = createSimulationKernel(scenario, TEST_SEED);
  kernel.advanceOne();
  return kernel;
}

function positionOf(
  kernel: ReturnType<typeof createSimulationKernel>,
  entityId: number,
): GridPosition | undefined {
  return kernel.state().actors.find((a) => a.entityId === entityId)?.position;
}

function guardOf(
  kernel: ReturnType<typeof createSimulationKernel>,
  entityId: number,
): GridPosition | null | undefined {
  return kernel.state().actors.find((a) => a.entityId === entityId)
    ?.transitionGuard;
}

function payloadsOfTransition(events: readonly SimulationEvent[]) {
  return payloads(events).filter((e) => e.type === 'actor/transitioned');
}

function restoredOrThrow(
  scenario: KernelScenario,
  snapshot: SimulationSnapshot,
) {
  const restored = restoreSimulationKernel(scenario, snapshot);
  if (!restored.ok) {
    throw new Error(
      `restore failed: ${restored.diagnostics.map((d) => d.code).join(', ')}`,
    );
  }
  return restored.value;
}

describe('automatic floor transitions', () => {
  it('moves the actor and then transitions it, in that order', () => {
    const kernel = bootedAt(stairScenario());
    kernel.enqueue(moveStep(1, 'e', 1));

    expect(payloads(kernel.advanceOne())).toEqual([
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(2, 1),
        to: STAIRS,
        facing: 'e',
      },
      { type: 'actor/transitioned', entityId: 1, from: STAIRS, to: LANDING },
    ]);
    expect(positionOf(kernel, 1)).toEqual(LANDING);
  });

  it('leaves the guard on the arrival cell', () => {
    const kernel = bootedAt(stairScenario());
    kernel.enqueue(moveStep(1, 'e', 1));
    kernel.advanceOne();

    expect(guardOf(kernel, 1)).toEqual(LANDING);
  });

  it('clears the guard on the step that leaves the arrival cell', () => {
    const kernel = bootedAt(stairScenario());
    kernel.enqueue(moveStep(1, 'e', 1));
    kernel.advanceOne();
    kernel.enqueue(moveStep(1, 'w', 2));
    kernel.advanceOne();

    expect(positionOf(kernel, 1)).toEqual(at(2, 1, TEST_Z_BELOW));
    expect(guardOf(kernel, 1)).toBeNull();
  });

  it('does not chain when the arrival cell is itself a transition', () => {
    const kernel = bootedAt(bidirectionalScenario());
    kernel.enqueue(moveStep(1, 'e', 1));

    const transitioned = payloads(kernel.advanceOne()).filter(
      (payload) => payload.type === 'actor/transitioned',
    );

    expect(transitioned).toEqual([
      { type: 'actor/transitioned', entityId: 1, from: STAIRS, to: LANDING },
    ]);
    expect(positionOf(kernel, 1)).toEqual(LANDING);
    expect(guardOf(kernel, 1)).toEqual(LANDING);
  });

  it('suppresses the transition on the very step that leaves the arrival cell', () => {
    // "Only fires again after leaving that cell": the step off the guarded cell
    // is the step that leaves it, so it cannot itself fire. This is what makes
    // the guard live state — a resumed run without it takes the second stair.
    const scenario = stairScenario({
      transitions: [
        { from: STAIRS, to: LANDING },
        { from: at(2, 1, TEST_Z_BELOW), to: at(2, 1) },
      ],
    });
    const kernel = bootedAt(scenario);
    kernel.enqueue(moveStep(1, 'e', 1));
    kernel.advanceOne();
    kernel.enqueue(moveStep(1, 'w', 2));

    const events = payloads(kernel.advanceOne());

    expect(events.filter((e) => e.type === 'actor/transitioned')).toEqual([]);
    expect(positionOf(kernel, 1)).toEqual(at(2, 1, TEST_Z_BELOW));
    expect(guardOf(kernel, 1)).toBeNull();
  });

  it('takes the second stair one step later, once the guard is gone', () => {
    const scenario = stairScenario({
      transitions: [
        { from: STAIRS, to: LANDING },
        { from: at(2, 1, TEST_Z_BELOW), to: at(2, 1) },
      ],
    });
    const kernel = bootedAt(scenario);
    kernel.enqueue(moveStep(1, 'e', 1));
    kernel.advanceOne();
    kernel.enqueue(moveStep(1, 'w', 2));
    kernel.advanceOne();
    kernel.enqueue(moveStep(1, 'e', 3));
    kernel.advanceOne();
    kernel.enqueue(moveStep(1, 'w', 4));

    expect(payloadsOfTransition(kernel.advanceOne())).toEqual([
      {
        type: 'actor/transitioned',
        entityId: 1,
        from: at(2, 1, TEST_Z_BELOW),
        to: at(2, 1),
      },
    ]);
  });

  it('allows the transition again after the actor leaves and returns', () => {
    const kernel = bootedAt(bidirectionalScenario());
    kernel.enqueue(moveStep(1, 'e', 1));
    kernel.advanceOne();
    kernel.enqueue(moveStep(1, 'w', 2));
    kernel.advanceOne();
    kernel.enqueue(moveStep(1, 'e', 3));

    expect(payloads(kernel.advanceOne())).toEqual([
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(2, 1, TEST_Z_BELOW),
        to: LANDING,
        facing: 'e',
      },
      { type: 'actor/transitioned', entityId: 1, from: LANDING, to: STAIRS },
    ]);
    expect(positionOf(kernel, 1)).toEqual(STAIRS);
  });

  it('blocks the whole step when the landing cell is taken', () => {
    const kernel = bootedAt(
      stairScenario({
        initialActors: [
          { blueprintId: 'statue', position: at(2, 1), facing: 'e' },
          {
            blueprintId: 'statue',
            position: at(3, 1, TEST_Z_BELOW),
            facing: 'n',
          },
        ],
      }),
    );
    kernel.enqueue(moveStep(1, 'e', 1));

    expect(payloads(kernel.advanceOne())).toEqual([
      {
        type: 'actor/move-blocked',
        entityId: 1,
        attempted: STAIRS,
        reason: 'transition-blocked',
      },
    ]);
    expect(positionOf(kernel, 1)).toEqual(at(2, 1));
  });

  it('spends no randomness on a transition', () => {
    const kernel = bootedAt(stairScenario());
    const before = snapshotKernel(kernel).randomStreams;
    kernel.enqueue(moveStep(1, 'e', 1));
    kernel.advanceOne();

    expect(snapshotKernel(kernel).randomStreams).toEqual(before);
  });

  it('fails the tick when a transition fires with a guard still active', () => {
    // A guard that does not match its actor is inconsistent state, not a
    // behaviour: the kernel refuses the tick instead of chaining.
    const scenario = stairScenario();
    const kernel = bootedAt(scenario);
    const snapshot = snapshotKernel(kernel);
    const stale = {
      ...snapshot,
      actors: snapshot.actors.map((actor) => ({
        ...actor,
        transitionGuard: at(0, 0, TEST_Z_BELOW),
      })),
    };

    const resumed = restoredOrThrow(scenario, stale);
    resumed.enqueue(moveStep(1, 'e', 1));

    expect(() => resumed.advanceOne()).toThrow(/SIM_TRANSITION_CHAINED/);
  });

  it('rejects a snapshot whose guard is outside the scenario grid', () => {
    const scenario = stairScenario();
    const snapshot = snapshotKernel(bootedAt(scenario));
    const outside = {
      ...snapshot,
      actors: snapshot.actors.map((actor) => ({
        ...actor,
        transitionGuard: { x: 99, y: 0, z: TEST_Z },
      })),
    };

    const restored = restoreSimulationKernel(scenario, outside);

    expect(restored.ok).toBe(false);
    expect(
      restored.ok ? [] : restored.diagnostics.map((d) => d.code),
    ).toContain('SIM_SCHEMA_INVALID');
  });
});
