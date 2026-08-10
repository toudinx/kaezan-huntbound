import './styles.css';

import Phaser from 'phaser';

import { createSceneBridge } from './bridge/SceneBridge';
import { createGame } from './phaser/createGame';
import { createRuntimeLifecycle } from './runtime/RuntimeLifecycle';
import { createViewportController } from './runtime/ViewportController';
import { mountAppShell } from './ui/AppShell';

interface ShellHmrData {
  phaserDestroyed?: Promise<void>;
}

const hmrData = import.meta.hot?.data as ShellHmrData | undefined;

// A replacement shell waits until Phaser removes the preceding canvas.
await hmrData?.phaserDestroyed;

const gameRoot = document.querySelector<HTMLElement>('#game-root');
const uiRoot = document.querySelector<HTMLElement>('#ui-root');

if (!gameRoot || !uiRoot) {
  throw new Error('Huntbound shell roots are missing.');
}

const bridge = createSceneBridge({
  phase: 'booting',
  renderer: 'unavailable',
  viewport: {
    width: 0,
    height: 0,
    devicePixelRatio: 1,
  },
  message: 'Preparing shell',
});
const appShell = mountAppShell(uiRoot, bridge);
const runtime = createGame(gameRoot, bridge);
const disposeViewport = createViewportController(gameRoot, bridge, {
  getDevicePixelRatio: () => window.devicePixelRatio,
  createResizeObserver: (callback) => new ResizeObserver(callback),
  observeDevicePixelRatio: (callback) => {
    let mediaQuery = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`,
    );
    const onDevicePixelRatioChange = () => {
      mediaQuery.removeEventListener('change', onDevicePixelRatioChange);
      callback();
      mediaQuery = window.matchMedia(
        `(resolution: ${window.devicePixelRatio}dppx)`,
      );
      mediaQuery.addEventListener('change', onDevicePixelRatioChange);
    };

    mediaQuery.addEventListener('change', onDevicePixelRatioChange);

    return () => {
      mediaQuery.removeEventListener('change', onDevicePixelRatioChange);
    };
  },
}).start();
const disposeLifecycle = createRuntimeLifecycle(runtime.lifecycle, {
  window,
  document,
}).start();

let markedActionable = false;
const unsubscribePerformanceMark = bridge.subscribe((snapshot) => {
  if (snapshot.phase === 'ready' && !markedActionable) {
    markedActionable = true;
    performance.mark('huntbound:shell-actionable');
  }
});

function destroyGame() {
  return new Promise<void>((resolve) => {
    runtime.game.events.once(Phaser.Core.Events.DESTROY, resolve);
    runtime.game.destroy(true);
  });
}

function disposeShell(data: ShellHmrData) {
  unsubscribePerformanceMark();
  disposeLifecycle();
  disposeViewport();
  appShell.destroy();
  data.phaserDestroyed = destroyGame();
}

if (import.meta.hot) {
  import.meta.hot.dispose(disposeShell);
}
