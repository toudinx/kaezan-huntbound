import type {
  KernelScenario,
  Seed,
  SimulationCommandInput,
  SimulationEvent,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';
import {
  type CommandAcceptance,
  createSimulationKernel,
} from '../../../../packages/simulation/src/index.ts';

import { createSimulationHost } from '../simulation/SimulationHost';

export interface RestartableHuntDriver {
  readonly tick: TickIndex;
  readonly alpha: number;
  enqueue(input: SimulationCommandInput): CommandAcceptance;
  advanceTo(nowMs: number): readonly SimulationEvent[];
  restart(nowMs?: number): void;
}

export function createRestartableHuntDriver(
  scenario: KernelScenario,
  seed: Seed,
  startNowMs: number,
): RestartableHuntDriver {
  const createRunKernel = () => createSimulationKernel(scenario, seed);
  let kernel = createRunKernel();
  let simulationHost = createSimulationHost(kernel, startNowMs);

  return {
    get tick() {
      return simulationHost.tick;
    },
    get alpha() {
      return simulationHost.alpha;
    },
    enqueue: (input) => kernel.enqueue(input),
    advanceTo: (nowMs) => simulationHost.advanceTo(nowMs),
    restart: (nowMs = 0) => {
      kernel = createRunKernel();
      simulationHost = createSimulationHost(kernel, nowMs);
    },
  };
}
