import { describe, expect, it } from 'vitest';

import { createSceneBridge, type SceneBridge } from '../bridge/SceneBridge';
import { createDefaultCombatViewModel } from '../hunt/CombatViewModel';
import { createInputMap } from '../input/InputMap';
import type { ShellSnapshot } from '../runtime/ShellSnapshot';
import type { AppShellOptions } from './AppShell';
import * as AppShellModule from './AppShell';

class TestElement {
  readonly children: TestElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Set<() => void>>();
  readonly style = { setProperty: (): void => undefined };
  parent: TestElement | null = null;
  textContent = '';
  className = '';
  disabled = false;

  constructor(
    readonly tagName: string,
    readonly ownerDocument: TestDocument,
  ) {}

  append(...children: TestElement[]) {
    for (const child of children) child.parent = this;
    this.children.push(...children);
  }

  replaceChildren(...children: TestElement[]) {
    for (const child of children) child.parent = this;
    this.children.length = 0;
    this.children.push(...children);
  }

  remove() {
    const siblings = this.parent?.children;
    const index = siblings?.indexOf(this) ?? -1;
    if (siblings !== undefined && index >= 0) siblings.splice(index, 1);
    this.parent = null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  addEventListener(type: string, listener: () => void) {
    const listeners = this.listeners.get(type) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
}

class TestDocument {
  createElement(tagName: string) {
    return new TestElement(tagName, this);
  }

  /** The vital arcs are SVG, which `createElement` cannot make. */
  createElementNS(_namespace: string, tagName: string) {
    return new TestElement(tagName, this);
  }
}

function findByTestId(element: TestElement, testId: string): TestElement {
  const visit = (current: TestElement): TestElement | undefined => {
    if (current.getAttribute('data-testid') === testId) {
      return current;
    }

    for (const child of current.children) {
      const result = visit(child);
      if (result) {
        return result;
      }
    }
  };

  const result = visit(element);
  if (result) {
    return result;
  }

  throw new Error(`Could not find ${testId}`);
}

function createRoot() {
  const document = new TestDocument();

  return document.createElement('div');
}

interface TestSaveState {
  readonly status: 'ready';
  readonly message: string;
  readonly bag: readonly { readonly itemKey: string; readonly count: number }[];
  readonly stash: readonly {
    readonly itemKey: string;
    readonly count: number;
  }[];
  readonly completedRuns: number;
}

interface TestSaveSource {
  getState(): TestSaveState;
  subscribe(listener: (state: TestSaveState) => void): () => void;
}

function mountShell(
  root: TestElement,
  bridge: SceneBridge,
  options: AppShellOptions = {},
) {
  const mount = (AppShellModule as Record<string, unknown>).mountAppShell;
  expect(mount).toBeTypeOf('function');

  return (
    mount as (
      root: HTMLElement,
      sceneBridge: SceneBridge,
      options?: AppShellOptions,
    ) => { destroy(): void }
  )(root as unknown as HTMLElement, bridge, options);
}

function createFrameClock() {
  let nowMs = 0;
  let pending: (() => void) | undefined;
  let cancelledHandles = 0;

  return {
    api: {
      now: () => nowMs,
      scheduleFrame: (callback: () => void) => {
        pending = callback;
        return 1;
      },
      cancelFrame: () => {
        cancelledHandles += 1;
        pending = undefined;
      },
    },
    advance(ms: number) {
      nowMs += ms;
      const callback = pending;
      pending = undefined;
      callback?.();
    },
    get cancelledHandles() {
      return cancelledHandles;
    },
    get scheduled() {
      return pending !== undefined;
    },
  };
}

function readRates(text: string): {
  readonly fps: string;
  readonly tps: string;
} {
  const match = /^(?<fps>[\d-]+) fps · (?<tps>[\d-]+) tps$/u.exec(text);

  if (!match?.groups) {
    throw new Error(`unreadable frame-rate readout: ${text}`);
  }

  return { fps: match.groups.fps ?? '', tps: match.groups.tps ?? '' };
}

function snapshot(phase: ShellSnapshot['phase']): ShellSnapshot {
  return {
    phase,
    renderer: phase === 'error' ? 'unavailable' : 'webgl',
    viewport: { width: 1366, height: 768, devicePixelRatio: 1 },
    message: `${phase} message`,
  };
}

describe('AppShell', () => {
  it('projects the booting state from the bridge', () => {
    const root = createRoot();
    const bridge = createSceneBridge(snapshot('booting'));
    const shell = mountShell(root, bridge);

    expect(findByTestId(root, 'shell-status').textContent).toBe(
      'Booting renderer: booting message',
    );
    expect(findByTestId(root, 'shell-viewport').textContent).toBe(
      '1366 × 768 · 1.00 DPR',
    );
    expect(
      findByTestId(root, 'app-shell').getAttribute('data-shell-ready'),
    ).toBe('false');

    shell.destroy();
  });

  it('updates the DOM when the bridge reaches ready', () => {
    const root = createRoot();
    const bridge = createSceneBridge(snapshot('booting'));
    const shell = mountShell(root, bridge);

    bridge.publish(snapshot('ready'));

    expect(findByTestId(root, 'shell-status').textContent).toBe(
      'Shell ready: ready message',
    );
    expect(
      findByTestId(root, 'app-shell').getAttribute('data-shell-ready'),
    ).toBe('true');

    shell.destroy();
  });

  it('projects the paused state from the bridge', () => {
    const root = createRoot();
    const bridge = createSceneBridge(snapshot('paused'));
    const shell = mountShell(root, bridge);

    expect(findByTestId(root, 'shell-status').textContent).toBe(
      'Presentation paused: paused message',
    );

    shell.destroy();
  });

  it('projects the error state from the bridge', () => {
    const root = createRoot();
    const bridge = createSceneBridge(snapshot('error'));
    const shell = mountShell(root, bridge);

    expect(findByTestId(root, 'shell-status').textContent).toBe(
      'Renderer unavailable: error message',
    );

    shell.destroy();
  });

  it('cleans up its bridge listener when destroyed', () => {
    const root = createRoot();
    const bridge = createSceneBridge(snapshot('booting'));
    const shell = mountShell(root, bridge);
    const status = findByTestId(root, 'shell-status');

    shell.destroy();
    bridge.publish(snapshot('error'));

    expect(status.textContent).toBe('Booting renderer: booting message');
    expect(root.children).toHaveLength(0);
  });

  it('mounts and updates the combat HUD from bridge events and ticks', () => {
    const root = createRoot();
    const bridge = createSceneBridge(snapshot('booting'));
    const shell = mountShell(root, bridge, {
      input: createInputMap(),
    });

    bridge.publishEvents([
      {
        tick: 0,
        sequence: 1,
        payload: {
          type: 'actor/spawned',
          entityId: 1,
          blueprintId: 'player',
          position: { x: 5, y: 5, z: 8 },
          facing: 's',
        },
      },
      {
        tick: 2,
        sequence: 2,
        payload: {
          type: 'combat/damaged',
          entityId: 1,
          sourceEntityId: 2,
          amount: 10,
          remainingHealth: 175,
          cause: 'attack',
        },
      },
    ] as never);
    bridge.publishTick(2);

    expect(
      findByTestId(root, 'combat-player-health').getAttribute('aria-valuenow'),
    ).toBe('175');
    expect(findByTestId(root, 'combat-hud')).toBeDefined();

    shell.destroy();
  });

  it('mounts the run bag and persistent stash from the save state source', () => {
    const root = createRoot();
    const bridge = createSceneBridge(snapshot('booting'));
    const saveSource: TestSaveSource = {
      getState: () => ({
        status: 'ready',
        message: 'Save ready',
        bag: [{ itemKey: 'item:tibia:meat', count: 2 }],
        stash: [{ itemKey: 'item:tibia:arrow', count: 8 }],
        completedRuns: 3,
      }),
      subscribe: (listener) => {
        listener(saveSource.getState());
        return () => undefined;
      },
    };

    const shell = mountShell(root, bridge, { save: { source: saveSource } });

    expect(findByTestId(root, 'save-run-bag').textContent).toBe('meat × 2');
    expect(findByTestId(root, 'save-stash').textContent).toBe('arrow × 8');
    expect(findByTestId(root, 'save-completed-runs').textContent).toBe(
      'Completed runs: 3',
    );

    shell.destroy();
  });

  it('shows no frame-rate reading before it has samples', () => {
    const root = createRoot();
    const bridge = createSceneBridge(snapshot('ready'));
    const clock = createFrameClock();
    const shell = mountShell(root, bridge, { frameRate: clock.api });

    expect(findByTestId(root, 'shell-frame-rate').textContent).toBe(
      '-- fps · -- tps',
    );

    shell.destroy();
  });

  it('lets the save callback capture the bag before restart clears the view model', () => {
    const root = createRoot();
    const bridge = createSceneBridge(snapshot('booting'));
    const viewModel = createDefaultCombatViewModel();
    viewModel.restoreBag([{ itemKey: 'item:tibia:meat', count: 3 }]);
    let capturedBag: readonly { itemKey: string; count: number }[] = [];
    const shell = mountShell(root, bridge, {
      input: createInputMap(),
      combat: {
        viewModel,
        onRestart: () => {
          capturedBag = viewModel.snapshot().bag;
        },
      },
    });

    findByTestId(root, 'combat-restart').dispatch('click');

    expect(capturedBag).toEqual([{ itemKey: 'item:tibia:meat', count: 3 }]);
    expect(viewModel.snapshot().bag).toEqual([]);
    shell.destroy();
  });

  it('reads the render clock apart from the simulation clock', () => {
    const root = createRoot();
    const bridge = createSceneBridge(snapshot('ready'));
    const clock = createFrameClock();
    const shell = mountShell(root, bridge, { frameRate: clock.api });

    // 60 frames in a second, with a tick every third frame: 20 per second.
    for (let frame = 1; frame <= 60; frame += 1) {
      clock.advance(1000 / 60);

      if (frame % 3 === 0) {
        bridge.publishTick(frame / 3);
      }
    }

    const rates = readRates(findByTestId(root, 'shell-frame-rate').textContent);

    expect(Number(rates.fps)).toBeCloseTo(60, 0);
    expect(Number(rates.tps)).toBeCloseTo(20, 0);

    shell.destroy();
  });

  it('counts a tick only when its value changes', () => {
    const root = createRoot();
    const bridge = createSceneBridge(snapshot('ready'));
    const clock = createFrameClock();
    const shell = mountShell(root, bridge, { frameRate: clock.api });

    // The scene calls publishTick every frame carrying the current tick. A
    // repeated value is not a simulation step and must not register as one.
    for (let frame = 1; frame <= 60; frame += 1) {
      clock.advance(1000 / 60);
      bridge.publishTick(7);
    }

    const rates = readRates(findByTestId(root, 'shell-frame-rate').textContent);

    expect(Number(rates.fps)).toBeCloseTo(60, 0);
    expect(rates.tps).toBe('--');

    shell.destroy();
  });

  it('stops sampling frames once destroyed', () => {
    const root = createRoot();
    const bridge = createSceneBridge(snapshot('ready'));
    const clock = createFrameClock();
    const shell = mountShell(root, bridge, { frameRate: clock.api });

    clock.advance(1000 / 60);
    expect(clock.scheduled).toBe(true);

    shell.destroy();

    expect(clock.cancelledHandles).toBe(1);
    expect(clock.scheduled).toBe(false);
  });
});
