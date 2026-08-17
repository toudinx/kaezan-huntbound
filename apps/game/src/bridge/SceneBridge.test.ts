import { describe, expect, it, vi } from 'vitest';

import type {
  EntityId,
  SimulationEvent,
} from '../../../../packages/contracts/src/index.ts';
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

  it('publishes simulation events to event subscribers', () => {
    const bridge = createBridge(bootingSnapshot);
    const listener = vi.fn();
    const simulationEvent = {
      tick: 0,
      sequence: 1,
      payload: {
        type: 'actor/spawned',
        entityId: 1,
        blueprintId: 'player',
        position: { x: 0, y: 0, z: 0 },
        facing: 's',
      },
    } as SimulationEvent;

    bridge.subscribeEvents(listener);
    bridge.publishEvents([simulationEvent]);

    expect(listener).toHaveBeenCalledWith([simulationEvent]);
  });

  it('publishes the current simulation tick to presentation subscribers', () => {
    const bridge = createBridge(bootingSnapshot);
    const listener = vi.fn();

    bridge.subscribeTick(listener);
    bridge.publishTick(42);

    expect(listener.mock.calls).toEqual([[0], [42]]);
  });

  it('publishes a restart request without coupling the bridge to a kernel', () => {
    const bridge = createBridge(bootingSnapshot);
    const listener = vi.fn();

    bridge.subscribeRestart(listener);
    bridge.requestRestart();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('publishes presentation target selection independently from kernel events', () => {
    const bridge = createBridge(bootingSnapshot);
    const listener = vi.fn();

    bridge.subscribeTargetSelected(listener);
    bridge.publishTargetSelected(7 as EntityId);
    bridge.publishTargetSelected(null);

    expect(listener.mock.calls).toEqual([[null], [7], [null]]);
  });
});
