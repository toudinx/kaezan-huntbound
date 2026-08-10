import { describe, expect, it } from 'vitest';

import {
  createRuntimeLifecycle,
  type PauseReason,
  type RuntimeLifecyclePort,
} from './RuntimeLifecycle';

class TestEventTarget {
  private readonly listeners = new Map<string, Set<() => void>>();

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
}

class LifecyclePort implements RuntimeLifecyclePort {
  readonly pauses: PauseReason[] = [];
  readonly resumes: PauseReason[] = [];

  pause(reason: PauseReason) {
    this.pauses.push(reason);
  }

  resume(reason: PauseReason) {
    this.resumes.push(reason);
  }
}

function createBrowserEvents() {
  const window = new TestEventTarget();
  const document = new TestEventTarget() as TestEventTarget & {
    hidden: boolean;
  };
  document.hidden = false;

  return { window, document };
}

describe('RuntimeLifecycle', () => {
  it('pauses on blur and resumes on focus', () => {
    const port = new LifecyclePort();
    const browser = createBrowserEvents();
    const lifecycle = createRuntimeLifecycle(port, browser);
    const dispose = lifecycle.start();

    browser.window.dispatch('blur');
    browser.window.dispatch('focus');

    expect(port.pauses).toEqual(['window-blur']);
    expect(port.resumes).toEqual(['window-blur']);

    dispose();
  });

  it('pauses while the document is hidden and resumes when visible', () => {
    const port = new LifecyclePort();
    const browser = createBrowserEvents();
    const lifecycle = createRuntimeLifecycle(port, browser);
    const dispose = lifecycle.start();

    browser.document.hidden = true;
    browser.document.dispatch('visibilitychange');
    browser.document.hidden = false;
    browser.document.dispatch('visibilitychange');

    expect(port.pauses).toEqual(['document-hidden']);
    expect(port.resumes).toEqual(['document-hidden']);

    dispose();
  });

  it('waits for every pause reason before resuming', () => {
    const port = new LifecyclePort();
    const browser = createBrowserEvents();
    const lifecycle = createRuntimeLifecycle(port, browser);
    const dispose = lifecycle.start();

    browser.window.dispatch('blur');
    browser.document.hidden = true;
    browser.document.dispatch('visibilitychange');
    browser.window.dispatch('focus');

    expect(port.pauses).toEqual(['window-blur']);
    expect(port.resumes).toEqual([]);

    browser.document.hidden = false;
    browser.document.dispatch('visibilitychange');

    expect(port.resumes).toEqual(['document-hidden']);

    dispose();
  });

  it('ignores duplicate browser lifecycle events', () => {
    const port = new LifecyclePort();
    const browser = createBrowserEvents();
    const lifecycle = createRuntimeLifecycle(port, browser);
    const dispose = lifecycle.start();

    browser.window.dispatch('blur');
    browser.window.dispatch('blur');
    browser.window.dispatch('focus');
    browser.window.dispatch('focus');

    expect(port.pauses).toEqual(['window-blur']);
    expect(port.resumes).toEqual(['window-blur']);

    dispose();
  });

  it('removes listeners when disposed more than once', () => {
    const port = new LifecyclePort();
    const browser = createBrowserEvents();
    const lifecycle = createRuntimeLifecycle(port, browser);
    const dispose = lifecycle.start();

    dispose();
    dispose();
    browser.window.dispatch('blur');
    browser.document.hidden = true;
    browser.document.dispatch('visibilitychange');

    expect(port.pauses).toEqual([]);
    expect(port.resumes).toEqual([]);
  });
});
