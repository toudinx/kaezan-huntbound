import { describe, expect, it } from 'vitest';

import { createSimulationKernel } from './index.ts';
import {
  at,
  despawnActor,
  kernelScenario,
  moveStep,
  payloads,
  TEST_SEED,
} from './testScenarios.ts';

function bootedKernel(overrides: Parameters<typeof kernelScenario>[0]) {
  const kernel = createSimulationKernel(kernelScenario(overrides), TEST_SEED);
  kernel.advanceOne();
  return kernel;
}

describe('kernel movement system', () => {
  it('resolves a contested cell by the lowest entity id', () => {
    const kernel = bootedKernel({
      initialActors: [
        { blueprintId: 'walker', position: at(1, 1), facing: 'e' },
        { blueprintId: 'walker', position: at(3, 1), facing: 'w' },
      ],
    });

    kernel.enqueue(moveStep(2, 'w', 1));
    kernel.enqueue(moveStep(1, 'e', 1));
    const events = kernel.advanceOne();

    expect(payloads(events)).toEqual([
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(1, 1),
        to: at(2, 1),
        facing: 'e',
      },
      {
        type: 'actor/move-blocked',
        entityId: 2,
        attempted: at(2, 1),
        reason: 'occupied',
      },
    ]);
    expect(kernel.state().actors.map((actor) => actor.position)).toEqual([
      at(2, 1),
      at(3, 1),
    ]);
  });

  it('charges the orthogonal cost to readyAtTick', () => {
    const kernel = bootedKernel({
      initialActors: [
        { blueprintId: 'walker', position: at(1, 1), facing: 'e' },
      ],
    });

    kernel.enqueue(moveStep(1, 'e', 1));
    kernel.advanceOne();

    expect(kernel.state().actors[0]?.readyAtTick).toBe(3);
  });

  it('charges the diagonal cost to readyAtTick', () => {
    const kernel = bootedKernel({
      initialActors: [
        { blueprintId: 'walker', position: at(1, 1), facing: 'e' },
      ],
    });

    kernel.enqueue(moveStep(1, 'se', 1));
    kernel.advanceOne();

    expect(kernel.state().actors[0]).toEqual({
      entityId: 1,
      blueprintId: 'walker',
      position: at(2, 2),
      facing: 'se',
      readyAtTick: 4,
    });
  });

  it('lets a zero-cooldown actor move on consecutive ticks', () => {
    const kernel = bootedKernel({
      initialActors: [
        { blueprintId: 'statue', position: at(0, 0), facing: 'e' },
      ],
    });

    const moved: number[] = [];
    for (const tick of [1, 2, 3]) {
      kernel.enqueue(moveStep(1, 'e', tick));
      const events = kernel.advanceOne();
      expect(payloads(events).map((payload) => payload.type)).toEqual([
        'actor/moved',
      ]);
      moved.push(kernel.state().actors[0]?.position.x ?? -1);
    }

    expect(moved).toEqual([1, 2, 3]);
    expect(kernel.state().actors[0]?.readyAtTick).toBe(3);
  });

  it('applies a despawn before a move of the same actor in one tick', () => {
    const kernel = bootedKernel({
      initialActors: [
        { blueprintId: 'walker', position: at(1, 1), facing: 'e' },
      ],
    });

    kernel.enqueue(moveStep(1, 'e', 1));
    kernel.enqueue(despawnActor(1, 1));
    const events = kernel.advanceOne();

    expect(payloads(events)).toEqual([
      {
        type: 'command/rejected',
        commandType: 'actor/move-step',
        commandSequence: 1,
        code: 'SIM_COMMAND_UNKNOWN_ENTITY',
      },
      { type: 'actor/despawned', entityId: 1 },
    ]);
    expect(kernel.state().actors).toEqual([]);
  });

  it('frees the vacated cell for a later mover in the same tick', () => {
    const kernel = bootedKernel({
      initialActors: [
        { blueprintId: 'statue', position: at(1, 1), facing: 'e' },
        { blueprintId: 'statue', position: at(1, 2), facing: 'n' },
      ],
    });

    kernel.enqueue(moveStep(1, 'e', 1));
    kernel.enqueue(moveStep(2, 'n', 1));
    const events = kernel.advanceOne();

    expect(payloads(events).map((payload) => payload.type)).toEqual([
      'actor/moved',
      'actor/moved',
    ]);
    expect(kernel.state().actors.map((actor) => actor.position)).toEqual([
      at(2, 1),
      at(1, 1),
    ]);
  });
});
