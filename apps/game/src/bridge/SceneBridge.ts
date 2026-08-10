import type { ShellSnapshot } from '../runtime/ShellSnapshot';

export interface SceneBridge {
  getSnapshot(): ShellSnapshot;
  publish(next: ShellSnapshot): void;
  subscribe(listener: (snapshot: ShellSnapshot) => void): () => void;
}

export function createSceneBridge(initialSnapshot: ShellSnapshot): SceneBridge {
  let snapshot = initialSnapshot;
  const listeners = new Set<(next: ShellSnapshot) => void>();

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
  };
}
