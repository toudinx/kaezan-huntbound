import type {
  ActorState,
  PendingIntentState,
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
   * AI intents already decided for ticks that have not run yet. They live
   * outside the command log, so the snapshot carries them itself: dropping
   * them would lose a decision and diverge on the next tick.
   */
  readonly pendingInternalIntents: readonly PendingIntentState[];
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
  readonly pendingIntents: readonly PendingIntentState[];
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
