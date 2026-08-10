import { describe, expect, it } from 'vitest';

import { createSceneBridge } from '../bridge/SceneBridge';
import type { ShellSnapshot } from './ShellSnapshot';
import {
  createViewportController,
  type ViewportControllerBrowser,
} from './ViewportController';

class TestContainer {
  width = 1;
  height = 1;

  getBoundingClientRect() {
    return { width: this.width, height: this.height };
  }
}

class TestResizeObserver {
  observed?: TestContainer;
  disconnected = false;

  constructor(private readonly callback: () => void) {}

  observe(target: TestContainer) {
    this.observed = target;
  }

  disconnect() {
    this.disconnected = true;
  }

  resize() {
    this.callback();
  }
}

function createBrowser() {
  let devicePixelRatio = 1;
  let devicePixelRatioListener = () => {};
  let observer: TestResizeObserver | undefined;
  const browser: ViewportControllerBrowser = {
    getDevicePixelRatio: () => devicePixelRatio,
    createResizeObserver: (callback) => {
      observer = new TestResizeObserver(callback);
      return observer;
    },
    observeDevicePixelRatio: (callback) => {
      devicePixelRatioListener = callback;

      return () => {
        devicePixelRatioListener = () => {};
      };
    },
  };

  return {
    browser,
    get observer() {
      if (!observer) {
        throw new Error('ResizeObserver was not created.');
      }

      return observer;
    },
    setDevicePixelRatio(value: number) {
      devicePixelRatio = value;
    },
    notifyDevicePixelRatioChange() {
      devicePixelRatioListener();
    },
  };
}

function snapshot(): ShellSnapshot {
  return {
    phase: 'ready',
    renderer: 'webgl',
    viewport: { width: 1, height: 1, devicePixelRatio: 1 },
    message: 'Canvas ready',
  };
}

describe('ViewportController', () => {
  it('publishes its first normalized container measurement without changing shell state', () => {
    const container = new TestContainer();
    container.width = 390.4;
    container.height = 843.6;
    const browser = createBrowser();
    browser.setDevicePixelRatio(3);
    const bridge = createSceneBridge(snapshot());
    const controller = createViewportController(
      container,
      bridge,
      browser.browser,
    );

    controller.start();

    expect(bridge.getSnapshot()).toEqual({
      phase: 'ready',
      renderer: 'webgl',
      viewport: { width: 390, height: 844, devicePixelRatio: 3 },
      message: 'Canvas ready',
    });
  });

  it('updates the projection after a container resize', () => {
    const container = new TestContainer();
    const browser = createBrowser();
    const bridge = createSceneBridge(snapshot());
    const controller = createViewportController(
      container,
      bridge,
      browser.browser,
    );
    controller.start();

    container.width = 768;
    container.height = 1024;
    browser.observer.resize();

    expect(bridge.getSnapshot().viewport).toEqual({
      width: 768,
      height: 1024,
      devicePixelRatio: 1,
    });
  });

  it('updates the projection after a device pixel ratio change without a resize', () => {
    const container = new TestContainer();
    const browser = createBrowser();
    const bridge = createSceneBridge(snapshot());
    const controller = createViewportController(
      container,
      bridge,
      browser.browser,
    );
    controller.start();

    browser.setDevicePixelRatio(2);
    browser.notifyDevicePixelRatioChange();

    expect(bridge.getSnapshot().viewport).toEqual({
      width: 1,
      height: 1,
      devicePixelRatio: 2,
    });
  });

  it('does not publish again when the normalized measurement is unchanged', () => {
    const container = new TestContainer();
    const browser = createBrowser();
    const bridge = createSceneBridge(snapshot());
    const received: ShellSnapshot[] = [];
    bridge.subscribe((next) => received.push(next));
    const controller = createViewportController(
      container,
      bridge,
      browser.browser,
    );
    controller.start();
    browser.observer.resize();

    expect(received).toHaveLength(2);
  });

  it('disconnects its observer when disposed more than once', () => {
    const container = new TestContainer();
    const browser = createBrowser();
    const bridge = createSceneBridge(snapshot());
    const controller = createViewportController(
      container,
      bridge,
      browser.browser,
    );
    const dispose = controller.start();

    dispose();
    dispose();

    expect(browser.observer.disconnected).toBe(true);
  });
});
