import type { SimulationEvent } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { createSimulationKernel } from './index.ts';
import {
  at,
  face,
  kernelScenario,
  moveStep,
  spawnActor,
  TEST_SEED,
} from './testScenarios.ts';

const scenario = kernelScenario({
  initialActors: [
    { blueprintId: 'wanderer', position: at(1, 1), facing: 'n' },
    { blueprintId: 'walker', position: at(5, 3), facing: 'n' },
    { blueprintId: 'wanderer', position: at(6, 1), facing: 'n' },
  ],
});

function seededKernel() {
  const kernel = createSimulationKernel(scenario, TEST_SEED);
  kernel.enqueue(face(2, 'e', 0));
  kernel.enqueue(moveStep(2, 'e', 1));
  kernel.enqueue(spawnActor('walker', at(3, 4), 'w', 2));
  kernel.enqueue(moveStep(99, 'e', 2));
  return kernel;
}

describe('kernel journal and advance', () => {
  it('keeps the event sequence global and strictly increasing', () => {
    const kernel = seededKernel();
    const collected: SimulationEvent[] = [];
    for (let index = 0; index < 8; index += 1) {
      collected.push(...kernel.advanceOne());
    }

    expect(collected.length).toBeGreaterThan(6);
    expect(collected[0]?.sequence).toBe(1);
    for (let index = 1; index < collected.length; index += 1) {
      const previous = collected[index - 1]?.sequence ?? 0;
      const current = collected[index]?.sequence ?? 0;
      expect(current).toBeGreaterThan(previous);
    }
  });

  it('returns only the events of the tick it advanced', () => {
    const kernel = seededKernel();

    for (let expectedTick = 0; expectedTick < 8; expectedTick += 1) {
      const events = kernel.advanceOne();
      for (const event of events) {
        expect(event.tick).toBe(expectedTick);
      }
      expect(kernel.tick).toBe(expectedTick + 1);
    }
  });

  it('does not advance on advance(0)', () => {
    const kernel = seededKernel();

    expect(kernel.advance(0)).toEqual([]);
    expect(kernel.tick).toBe(0);
    expect(kernel.state()).toEqual(seededKernel().state());
  });

  it('rejects a negative or fractional tick count', () => {
    const kernel = seededKernel();

    expect(() => kernel.advance(-1)).toThrow(RangeError);
    expect(() => kernel.advance(1.5)).toThrow(RangeError);
    expect(() => kernel.advance(Number.NaN)).toThrow(RangeError);
    expect(kernel.tick).toBe(0);
  });

  it('makes advance(n) equivalent to n calls of advanceOne()', () => {
    const stepped = seededKernel();
    const steppedEvents: SimulationEvent[] = [];
    for (let index = 0; index < 8; index += 1) {
      steppedEvents.push(...stepped.advanceOne());
    }

    const bulk = seededKernel();
    const bulkEvents = bulk.advance(8);

    expect(bulkEvents).toEqual(steppedEvents);
    expect(bulk.state()).toEqual(stepped.state());
    expect(bulk.tick).toBe(stepped.tick);
  });
});
