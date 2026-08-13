import { describe, expect, it } from 'vitest';

import { createSimulationKernel } from './index.ts';
import { at, kernelScenario, payloads, TEST_SEED } from './testScenarios.ts';

const scenario = kernelScenario({
  initialActors: [
    { blueprintId: 'walker', position: at(1, 1), facing: 's' },
    { blueprintId: 'wanderer', position: at(3, 1), facing: 'n' },
    { blueprintId: 'statue', position: at(5, 4), facing: 'e' },
  ],
});

describe('kernel boot', () => {
  it('starts at tick zero', () => {
    const kernel = createSimulationKernel(scenario, TEST_SEED);

    expect(kernel.tick).toBe(0);
    expect(kernel.state().tick).toBe(0);
  });

  it('assigns entity ids one through n in declaration order', () => {
    const kernel = createSimulationKernel(scenario, TEST_SEED);

    expect(kernel.state().actors).toEqual([
      {
        entityId: 1,
        blueprintId: 'walker',
        position: at(1, 1),
        facing: 's',
        readyAtTick: 0,
      },
      {
        entityId: 2,
        blueprintId: 'wanderer',
        position: at(3, 1),
        facing: 'n',
        readyAtTick: 0,
      },
      {
        entityId: 3,
        blueprintId: 'statue',
        position: at(5, 4),
        facing: 'e',
        readyAtTick: 0,
      },
    ]);
  });

  it('reserves the next entity id after the initial actors', () => {
    const kernel = createSimulationKernel(scenario, TEST_SEED);

    expect(kernel.state().nextEntityId).toBe(4);
  });

  it('emits one spawn event per initial actor in entity id order', () => {
    const kernel = createSimulationKernel(scenario, TEST_SEED);

    const events = kernel.advanceOne();
    const spawned = events.filter(
      (event) => event.payload.type === 'actor/spawned',
    );

    expect(spawned).toHaveLength(3);
    expect(payloads(spawned)).toEqual([
      {
        type: 'actor/spawned',
        entityId: 1,
        blueprintId: 'walker',
        position: at(1, 1),
        facing: 's',
      },
      {
        type: 'actor/spawned',
        entityId: 2,
        blueprintId: 'wanderer',
        position: at(3, 1),
        facing: 'n',
      },
      {
        type: 'actor/spawned',
        entityId: 3,
        blueprintId: 'statue',
        position: at(5, 4),
        facing: 'e',
      },
    ]);
    expect(spawned.map((event) => event.sequence)).toEqual([1, 2, 3]);
    expect(spawned.map((event) => event.tick)).toEqual([0, 0, 0]);
  });

  it('emits the boot journal only once', () => {
    const kernel = createSimulationKernel(scenario, TEST_SEED);

    kernel.advanceOne();
    const second = kernel.advanceOne();

    expect(
      second.filter((event) => event.payload.type === 'actor/spawned'),
    ).toEqual([]);
  });

  it('exposes a read-only world state that does not alias internal actors', () => {
    const kernel = createSimulationKernel(scenario, TEST_SEED);

    const first = kernel.state();
    const second = kernel.state();

    expect(first).not.toBe(second);
    expect(first.actors[0]).not.toBe(second.actors[0]);
    expect(first).toEqual(second);
  });

  it('boots an empty world without actors', () => {
    const kernel = createSimulationKernel(kernelScenario(), TEST_SEED);

    expect(kernel.state().actors).toEqual([]);
    expect(kernel.state().nextEntityId).toBe(1);
    expect(kernel.advanceOne()).toEqual([]);
  });
});
