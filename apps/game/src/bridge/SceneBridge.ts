import type {
  EntityId,
  SimulationEvent,
} from '../../../../packages/contracts/src/index.ts';
import {
  HELPER_MODULES_OFF,
  type HelperModule,
  type HelperReport,
} from '../hunt/HuntHelper';
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
  /** What the helper is set to and what it has just done, for the cockpit. */
  publishHelper(report: HelperReport): void;
  subscribeHelper(listener: (report: HelperReport) => void): () => void;
  /** The cockpit switching one module. The scene owns the helper and answers. */
  requestHelperModule(module: HelperModule, enabled: boolean): void;
  subscribeHelperModule(
    listener: (module: HelperModule, enabled: boolean) => void,
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
  const helperListeners = new Set<(report: HelperReport) => void>();
  const helperModuleListeners = new Set<
    (module: HelperModule, enabled: boolean) => void
  >();
  let tick = 0;
  let targetEntityId: EntityId | null = null;
  let helperReport: HelperReport = {
    modules: HELPER_MODULES_OFF,
    held: [],
    log: [],
  };

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
      // The scene publishes once per rendered frame but the simulation only
      // advances on its own clock, so most frames repeat the last tick. Passing
      // those on made the HUD re-render ~60 times a second for nothing.
      if (nextTick === tick) {
        return;
      }
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
    publishHelper: (report) => {
      helperReport = report;
      for (const listener of helperListeners) {
        listener(helperReport);
      }
    },
    subscribeHelper: (listener) => {
      listener(helperReport);
      helperListeners.add(listener);

      return () => {
        helperListeners.delete(listener);
      };
    },
    requestHelperModule: (module, enabled) => {
      for (const listener of helperModuleListeners) {
        listener(module, enabled);
      }
    },
    subscribeHelperModule: (listener) => {
      helperModuleListeners.add(listener);

      return () => {
        helperModuleListeners.delete(listener);
      };
    },
  };
}
