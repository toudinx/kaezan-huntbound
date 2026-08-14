import type { SimulationEvent } from '../../../../packages/contracts/src/index.ts';
import type { ShellSnapshot } from '../runtime/ShellSnapshot';

export interface SceneBridge {
  getSnapshot(): ShellSnapshot;
  publish(next: ShellSnapshot): void;
  subscribe(listener: (snapshot: ShellSnapshot) => void): () => void;
  publishEvents(events: readonly SimulationEvent[]): void;
  subscribeEvents(
    listener: (events: readonly SimulationEvent[]) => void,
  ): () => void;
}

export function createSceneBridge(initialSnapshot: ShellSnapshot): SceneBridge {
  let snapshot = initialSnapshot;
  const listeners = new Set<(next: ShellSnapshot) => void>();
  const eventListeners = new Set<
    (events: readonly SimulationEvent[]) => void
  >();

  return {
    getSnapshot: () => snapshot,
    publish: (next) => {
      snapshot = next;

      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    subscribe: (listener) => {
      listener(snapshot);
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    publishEvents: (events) => {
      const frozenEvents = Object.freeze([...events]);
      for (const listener of eventListeners) {
        listener(frozenEvents);
      }
    },
    subscribeEvents: (listener) => {
      eventListeners.add(listener);

      return () => {
        eventListeners.delete(listener);
      };
    },
  };
}
