import { describe, expect, it, vi } from 'vitest';

import type { ShellSnapshot } from '../runtime/ShellSnapshot';
import * as SceneBridgeModule from './SceneBridge';

const bootingSnapshot: ShellSnapshot = {
  phase: 'booting',
  renderer: 'unavailable',
  viewport: { width: 0, height: 0, devicePixelRatio: 1 },
  message: 'Starting renderer',
};

const readySnapshot: ShellSnapshot = {
  phase: 'ready',
  renderer: 'webgl',
  viewport: { width: 1366, height: 768, devicePixelRatio: 1 },
  message: 'Shell ready',
};

function createBridge(initialSnapshot: ShellSnapshot) {
  const factory = (SceneBridgeModule as Record<string, unknown>)
    .createSceneBridge;
  expect(factory).toBeTypeOf('function');

  return (
    factory as (initial: ShellSnapshot) => {
      getSnapshot(): ShellSnapshot;
      publish(next: ShellSnapshot): void;
      subscribe(listener: (snapshot: ShellSnapshot) => void): () => void;
    }
  )(initialSnapshot);
}

describe('SceneBridge', () => {
  it('starts from the supplied snapshot and publishes later snapshots', () => {
    const bridge = createBridge(bootingSnapshot);

    expect(bridge.getSnapshot()).toEqual(bootingSnapshot);

    bridge.publish(readySnapshot);

    expect(bridge.getSnapshot()).toEqual(readySnapshot);
  });

  it('notifies a subscriber immediately and only once per later publication', () => {
    const bridge = createBridge(bootingSnapshot);
    const listener = vi.fn();

    bridge.subscribe(listener);
    bridge.subscribe(listener);
    bridge.publish(readySnapshot);

    expect(listener.mock.calls).toEqual([
      [bootingSnapshot],
      [bootingSnapshot],
      [readySnapshot],
    ]);
  });

  it('makes unsubscribe idempotent and stops future notifications', () => {
    const bridge = createBridge(bootingSnapshot);
    const listener = vi.fn();
    const unsubscribe = bridge.subscribe(listener);

    unsubscribe();
    unsubscribe();
    bridge.publish(readySnapshot);

    expect(listener.mock.calls).toEqual([[bootingSnapshot]]);
  });
});
