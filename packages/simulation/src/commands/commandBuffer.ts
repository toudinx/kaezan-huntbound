import type {
  SimulationCommand,
  SimulationCommandInput,
  SimulationCommandRecord,
  SimulationDiagnosticCode,
  TickIndex,
} from '@huntbound/contracts';
import {
  commandPriority,
  SimulationCommandInputSchema,
  SimulationCommandRecordSchema,
  simulationDiagnosticsFromZodError,
} from '@huntbound/contracts';

export type CommandAcceptance =
  | { readonly ok: true; readonly sequence: number }
  | { readonly ok: false; readonly code: SimulationDiagnosticCode };

export interface CommandBuffer {
  readonly nextSequence: number;
  enqueue(
    input: SimulationCommandInput,
    currentTick: TickIndex,
  ): CommandAcceptance;
  drain(tick: TickIndex): readonly SimulationCommandRecord[];
  pending(): readonly SimulationCommandRecord[];
}

function compareNumbers(left: number, right: number): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function compareApplicationOrder(
  left: SimulationCommandRecord,
  right: SimulationCommandRecord,
): number {
  return (
    compareNumbers(left.tick, right.tick) ||
    compareNumbers(
      commandPriority(left.command.type),
      commandPriority(right.command.type),
    ) ||
    compareNumbers(left.sequence, right.sequence)
  );
}

function comparePendingOrder(
  left: SimulationCommandRecord,
  right: SimulationCommandRecord,
): number {
  return (
    compareNumbers(left.tick, right.tick) ||
    compareNumbers(left.sequence, right.sequence)
  );
}

function cloneCommand(command: SimulationCommand): SimulationCommand {
  if (command.type === 'scenario/spawn-actor') {
    return {
      ...command,
      position: { ...command.position },
    };
  }
  return { ...command } as SimulationCommand;
}

function cloneRecord(record: SimulationCommandRecord): SimulationCommandRecord {
  return {
    tick: record.tick,
    sequence: record.sequence,
    issuer: record.issuer,
    command: cloneCommand(record.command),
  };
}

function actionKey(input: SimulationCommandInput): string | undefined {
  const { command } = input;
  if (command.type !== 'actor/move-step' && command.type !== 'actor/wait') {
    return undefined;
  }
  return `${input.issuer}:${command.entityId}:${input.tick}`;
}

function validationCode(input: unknown): SimulationDiagnosticCode {
  const result = SimulationCommandRecordSchema.safeParse(input);
  if (result.success) {
    return 'SIM_SCHEMA_INVALID';
  }
  return (
    simulationDiagnosticsFromZodError(result.error)[0]?.code ??
    'SIM_SCHEMA_INVALID'
  );
}

function assertPositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

export function orderCommands(
  records: readonly SimulationCommandRecord[],
): readonly SimulationCommandRecord[] {
  return [...records].sort(compareApplicationOrder);
}

function createCommandBufferInternal(
  startSequence: number,
  initialRecords: readonly SimulationCommandRecord[],
): CommandBuffer {
  assertPositiveSafeInteger(startSequence, 'startSequence');

  let nextSequence = startSequence;
  const records: SimulationCommandRecord[] = initialRecords.map(cloneRecord);
  const actionSequences = new Map<string, number>();
  for (const record of records) {
    const duplicateKey = actionKey(record);
    if (duplicateKey !== undefined) {
      actionSequences.set(duplicateKey, record.sequence);
    }
  }

  const enqueue = (
    input: SimulationCommandInput,
    currentTick: TickIndex,
  ): CommandAcceptance => {
    const parsed = SimulationCommandInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        code:
          simulationDiagnosticsFromZodError(parsed.error)[0]?.code ??
          'SIM_SCHEMA_INVALID',
      };
    }

    if (parsed.data.tick < currentTick) {
      return { ok: false, code: 'SIM_TICK_IN_PAST' };
    }

    const duplicateKey = actionKey(parsed.data);
    if (duplicateKey !== undefined && actionSequences.has(duplicateKey)) {
      return { ok: false, code: 'SIM_COMMAND_DUPLICATE' };
    }

    if (nextSequence > Number.MAX_SAFE_INTEGER) {
      return { ok: false, code: 'SIM_STATE_NOT_INTEGER' };
    }

    const sequence = nextSequence;
    nextSequence += 1;
    const record: SimulationCommandRecord = {
      tick: parsed.data.tick,
      sequence,
      issuer: parsed.data.issuer,
      command: cloneCommand(parsed.data.command),
    };
    records.push(record);
    if (duplicateKey !== undefined) {
      actionSequences.set(duplicateKey, sequence);
    }
    return { ok: true, sequence };
  };

  const drain = (tick: TickIndex): readonly SimulationCommandRecord[] => {
    const drained: SimulationCommandRecord[] = [];
    const remaining: SimulationCommandRecord[] = [];
    for (const record of records) {
      if (record.tick === tick) {
        drained.push(record);
        const duplicateKey = actionKey(record);
        if (duplicateKey !== undefined) {
          actionSequences.delete(duplicateKey);
        }
      } else {
        remaining.push(record);
      }
    }
    records.length = 0;
    records.push(...remaining);
    return orderCommands(drained).map(cloneRecord);
  };

  const pending = (): readonly SimulationCommandRecord[] =>
    [...records].sort(comparePendingOrder).map(cloneRecord);

  return {
    get nextSequence() {
      return nextSequence;
    },
    enqueue,
    drain,
    pending,
  };
}

export function createCommandBuffer(startSequence = 1): CommandBuffer {
  return createCommandBufferInternal(startSequence, []);
}

export function restoreCommandBuffer(
  pending: readonly SimulationCommandRecord[],
  nextSequence: number,
): CommandBuffer {
  assertPositiveSafeInteger(nextSequence, 'nextSequence');
  const seenSequences = new Set<number>();
  const seenActions = new Set<string>();
  let maximumSequence = 0;

  for (const record of pending) {
    const parsed = SimulationCommandRecordSchema.safeParse(record);
    if (
      !parsed.success ||
      !Number.isSafeInteger(record.sequence) ||
      record.sequence <= 0
    ) {
      throw new TypeError(`Invalid pending command: ${validationCode(record)}`);
    }
    if (seenSequences.has(record.sequence)) {
      throw new RangeError(
        `Duplicate pending command sequence ${record.sequence}`,
      );
    }
    const duplicateKey = actionKey(parsed.data);
    if (duplicateKey !== undefined && seenActions.has(duplicateKey)) {
      throw new RangeError(`Duplicate pending command action ${duplicateKey}`);
    }
    if (record.sequence >= nextSequence) {
      throw new RangeError(
        `nextSequence must be greater than pending sequence ${record.sequence}`,
      );
    }

    seenSequences.add(record.sequence);
    if (duplicateKey !== undefined) {
      seenActions.add(duplicateKey);
    }
    maximumSequence = Math.max(maximumSequence, record.sequence);
  }

  if (maximumSequence >= nextSequence) {
    throw new RangeError('nextSequence must exceed every pending sequence');
  }

  return createCommandBufferInternal(nextSequence, pending);
}
