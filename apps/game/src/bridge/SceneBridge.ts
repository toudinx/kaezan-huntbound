import type {
  EntityId,
  SimulationEvent,
} from '../../../../packages/contracts/src/index.ts';
import type { ShellSnapshot } from '../runtime/ShellSnapshot';

export interface SceneBridge {
  getSnapshot(): ShellSnapshot;
  publish(next: ShellSnapshot): void;
  subscribe(listener: (snapshot: ShellSnapshot) => void): () => void;
  publishEvents(events: readonly SimulationEvent[]): void;
  subscribeEvents(
    listener: (events: readonly SimulationEvent[]) => void,
  ): () => void;
  publishTick(tick: number): void;
  subscribeTick(listener: (tick: number) => void): () => void;
  requestRestart(): void;
  subscribeRestart(listener: () => void): () => void;
  publishTargetSelected(entityId: EntityId | null): void;
  subscribeTargetSelected(
    listener: (entityId: EntityId | null) => void,
  ): () => void;
}

export function createSceneBridge(initialSnapshot: ShellSnapshot): SceneBridge {
  let snapshot = initialSnapshot;
  const listeners = new Set<(next: ShellSnapshot) => void>();
  const eventListeners = new Set<
    (events: readonly SimulationEvent[]) => void
  >();
  const tickListeners = new Set<(tick: number) => void>();
  const restartListeners = new Set<() => void>();
  const targetListeners = new Set<(entityId: EntityId | null) => void>();
  let tick = 0;
  let targetEntityId: EntityId | null = null;

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
    publishTick: (nextTick) => {
      tick = nextTick;
      for (const listener of tickListeners) {
        listener(tick);
      }
    },
    subscribeTick: (listener) => {
      listener(tick);
      tickListeners.add(listener);

      return () => {
        tickListeners.delete(listener);
      };
    },
    requestRestart: () => {
      for (const listener of restartListeners) {
        listener();
      }
    },
    subscribeRestart: (listener) => {
      restartListeners.add(listener);

      return () => {
        restartListeners.delete(listener);
      };
    },
    publishTargetSelected: (entityId) => {
      targetEntityId = entityId;
      for (const listener of targetListeners) {
        listener(targetEntityId);
      }
    },
    subscribeTargetSelected: (listener) => {
      listener(targetEntityId);
      targetListeners.add(listener);

      return () => {
        targetListeners.delete(listener);
      };
    },
  };
}
