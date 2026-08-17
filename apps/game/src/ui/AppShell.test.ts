import { describe, expect, it } from 'vitest';

import { createSceneBridge, type SceneBridge } from '../bridge/SceneBridge';
import { createInputMap, type InputMap } from '../input/InputMap';
import type { ShellSnapshot } from '../runtime/ShellSnapshot';
import * as AppShellModule from './AppShell';

class TestElement {
  readonly children: TestElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Set<() => void>>();
  textContent = '';
  disabled = false;

  constructor(
    readonly tagName: string,
    readonly ownerDocument: TestDocument,
  ) {}

  append(...children: TestElement[]) {
    this.children.push(...children);
  }

  replaceChildren(...children: TestElement[]) {
    this.children.length = 0;
    this.children.push(...children);
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

function mountShell(
  root: TestElement,
  bridge: SceneBridge,
  options: { readonly input?: InputMap } = {},
) {
  const mount = (AppShellModule as Record<string, unknown>).mountAppShell;
  expect(mount).toBeTypeOf('function');

  return (
    mount as (
      root: HTMLElement,
      sceneBridge: SceneBridge,
      options?: { readonly input?: InputMap },
    ) => { destroy(): void }
  )(root as unknown as HTMLElement, bridge, options);
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
});
