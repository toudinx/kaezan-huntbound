import type {
  SimulationEvent,
  SimulationEventPayload,
  TickIndex,
} from '@huntbound/contracts';

export interface EventJournal {
  readonly nextSequence: number;
  emit(tick: TickIndex, payload: SimulationEventPayload): SimulationEvent;
  drain(): readonly SimulationEvent[];
}

export function createEventJournal(startSequence = 1): EventJournal {
  if (!Number.isSafeInteger(startSequence) || startSequence <= 0) {
    throw new RangeError('startSequence must be a positive safe integer');
  }

  let nextSequence = startSequence;
  const buffered: SimulationEvent[] = [];

  return {
    get nextSequence() {
      return nextSequence;
    },
    emit(tick, payload) {
      const event: SimulationEvent = {
        tick,
        sequence: nextSequence,
        payload,
      };
      nextSequence += 1;
      buffered.push(event);
      return event;
    },
    drain() {
      return buffered.splice(0, buffered.length);
    },
  };
}
