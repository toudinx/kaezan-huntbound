import type {
  KernelScenario,
  Seed,
  SimulationCommandInput,
  SimulationEvent,
  SimulationSnapshot,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';
import {
  type CommandAcceptance,
  createSimulationKernel,
  restoreSimulationKernel,
  snapshotKernel,
} from '../../../../packages/simulation/src/index.ts';

import { createSimulationHost } from '../simulation/SimulationHost';

export interface RestartableHuntDriver {
  readonly tick: TickIndex;
  readonly alpha: number;
  snapshot(): SimulationSnapshot;
  enqueue(input: SimulationCommandInput): CommandAcceptance;
  advanceTo(nowMs: number): readonly SimulationEvent[];
  resyncClock(): void;
  restart(nowMs?: number): void;
}

function restoredActorEvents(
  snapshot: SimulationSnapshot,
  kernel: ReturnType<typeof createSimulationKernel>,
): readonly SimulationEvent[] {
  if (snapshot.tick === 0) {
    return [];
  }

  const actors = [...kernel.state().actors].sort(
    (left, right) => left.entityId - right.entityId,
  );
  return actors.map((actor, index) => ({
    tick: snapshot.tick,
    sequence: index,
    payload: {
      type: 'actor/spawned',
      entityId: actor.entityId,
      blueprintId: actor.blueprintId,
      position: actor.position,
      facing: actor.facing,
    },
  }));
}

export function createRestartableHuntDriver(
  scenario: KernelScenario,
  seed: Seed,
  startNowMs: number,
  initialSnapshot?: SimulationSnapshot,
): RestartableHuntDriver {
  const createRunKernel = (snapshot?: SimulationSnapshot) => {
    if (snapshot === undefined) {
      return createSimulationKernel(scenario, seed);
    }

    const restored = restoreSimulationKernel(scenario, snapshot);
    if (!restored.ok) {
      throw new Error(
        `Unable to restore hunt snapshot: ${restored.diagnostics
          .map((diagnostic) => diagnostic.message)
          .join('; ')}`,
      );
    }
    return restored.value;
  };

  let kernel = createRunKernel(initialSnapshot);
  let simulationHost = createSimulationHost(kernel, startNowMs);
  let pendingBootstrapEvents =
    initialSnapshot === undefined
      ? []
      : [...restoredActorEvents(initialSnapshot, kernel)];

  return {
    get tick() {
      return simulationHost.tick;
    },
    get alpha() {
      return simulationHost.alpha;
    },
    snapshot: () => snapshotKernel(kernel),
    enqueue: (input) => kernel.enqueue(input),
    advanceTo: (nowMs) => {
      const bootstrapEvents = pendingBootstrapEvents;
      pendingBootstrapEvents = [];
      return [...bootstrapEvents, ...simulationHost.advanceTo(nowMs)];
    },
    resyncClock: () => {
      simulationHost.resyncClock();
    },
    restart: (nowMs = 0) => {
      kernel = createRunKernel();
      simulationHost = createSimulationHost(kernel, nowMs);
      pendingBootstrapEvents = [];
    },
  };
}
