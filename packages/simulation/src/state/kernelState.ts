import type {
  ActorState,
  RandomStreamState,
  Seed,
  SimulationCommandRecord,
  TickIndex,
} from '@huntbound/contracts';

import type { SimulationKernel } from '../kernel/kernel.ts';

/**
 * Everything a snapshot needs to read out of a live kernel. The accessor is
 * internal to `@huntbound/simulation`: it is reachable only through the symbol
 * below, so no consumer can reach into the kernel by accident.
 */
export interface KernelStateAccess {
  readonly seed: Seed;
  readonly scenarioId: string;
  readonly scenarioRevision: number;
  readonly tick: TickIndex;
  readonly nextEntityId: number;
  readonly nextEventSequence: number;
  readonly nextCommandSequence: number;
  readonly actors: readonly ActorState[];
  readonly randomStreams: readonly RandomStreamState[];
  readonly pendingCommands: readonly SimulationCommandRecord[];
  /**
   * Number of AI intents already decided for ticks that have not run yet. They
   * live outside the command log and outside the snapshot, so a boundary with
   * `pendingInternalIntents > 0` cannot be restored faithfully.
   */
  readonly pendingInternalIntents: number;
}

/** State handed back to `createSimulationKernel` when resuming a snapshot. */
export interface KernelRestoreState {
  readonly tick: TickIndex;
  readonly nextEntityId: number;
  readonly nextEventSequence: number;
  readonly nextCommandSequence: number;
  readonly actors: readonly ActorState[];
  readonly randomStreams: readonly RandomStreamState[];
  readonly pendingCommands: readonly SimulationCommandRecord[];
}

export const KERNEL_STATE: unique symbol = Symbol('huntbound.kernel.state');

export interface KernelStateCarrier {
  readonly [KERNEL_STATE]: () => KernelStateAccess;
}

export function readKernelState(kernel: SimulationKernel): KernelStateAccess {
  const carrier = kernel as Partial<KernelStateCarrier>;
  const read = carrier[KERNEL_STATE];
  if (typeof read !== 'function') {
    throw new TypeError(
      'Expected a kernel created by createSimulationKernel or restoreSimulationKernel',
    );
  }
  return read();
}
