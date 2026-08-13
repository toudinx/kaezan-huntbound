import './styles.css';

import Phaser from 'phaser';

import { AssetProviderError } from '../../../packages/assets/src/index.ts';
import { createSceneBridge } from './bridge/SceneBridge';
import {
  getAssetCatalogUrl,
  parseAppAssetProfile,
} from './assets/AssetProfile';
import { createAssetRuntime } from './assets/createAssetRuntime';
import { installAssetRuntimeProbe } from './assets/AssetRuntimeProbe';
import { createGame } from './phaser/createGame';
import { createRuntimeLifecycle } from './runtime/RuntimeLifecycle';
import { createViewportController } from './runtime/ViewportController';
import type { ShellSnapshot } from './runtime/ShellSnapshot';
import { mountAppShell } from './ui/AppShell';

interface ShellHmrData {
  phaserDestroyed?: Promise<void>;
}

export interface MainBootstrapOverrides {
  readonly document?: Document;
  readonly window?: Window;
  readonly createAssetRuntime?: typeof createAssetRuntime;
  readonly installAssetRuntimeProbe?: typeof installAssetRuntimeProbe;
  readonly mountAppShell?: typeof mountAppShell;
  readonly createGame?: typeof createGame;
  readonly createViewportController?: typeof createViewportController;
  readonly createRuntimeLifecycle?: typeof createRuntimeLifecycle;
}

const hmrData = import.meta.hot?.data as ShellHmrData | undefined;

function initialShellSnapshot(): ShellSnapshot {
  return {
    phase: 'booting',
    renderer: 'unavailable',
    viewport: {
      width: 0,
      height: 0,
      devicePixelRatio: 1,
    },
    message: 'Preparing shell',
  };
}

function setAssetReadiness(
  root: HTMLElement,
  ready: boolean,
  count: number,
): void {
  root.setAttribute('data-assets-ready', String(ready));
  root.setAttribute('data-assets-count', String(count));
}

function formatAssetBootError(error: unknown): string {
  if (error instanceof AssetProviderError) {
    return `Asset preload failed (${error.code}): ${error.message}`;
  }

  if (error instanceof Error) {
    return `Asset preload failed: ${error.message}`;
  }

  return 'Asset preload failed. Check the asset catalog and media integrity.';
}

export async function bootstrapApp(
  overrides: MainBootstrapOverrides = {},
): Promise<void> {
  await hmrData?.phaserDestroyed;

  const browserDocument = overrides.document ?? globalThis.document;
  const browserWindow = overrides.window ?? globalThis.window;

  if (!browserDocument || !browserWindow) {
    throw new Error('Huntbound browser globals are unavailable.');
  }

  const profile = parseAppAssetProfile(import.meta.env.MODE);
  const catalogUrl = getAssetCatalogUrl(profile);
  const shellRoot = browserDocument.querySelector<HTMLElement>('#shell-root');
  const gameRoot = browserDocument.querySelector<HTMLElement>('#game-root');
  const uiRoot = browserDocument.querySelector<HTMLElement>('#ui-root');

  if (!shellRoot || !gameRoot || !uiRoot) {
    throw new Error('Huntbound shell roots are missing.');
  }

  setAssetReadiness(shellRoot, false, 0);
  const assetRuntimeFactory =
    overrides.createAssetRuntime ?? createAssetRuntime;
  const activeAssetRuntime = assetRuntimeFactory({
    profile,
    catalogUrl,
  });
  const bridge = createSceneBridge(initialShellSnapshot());
  const appShellMount = overrides.mountAppShell ?? mountAppShell;
  const appShell = appShellMount(uiRoot, bridge);

  try {
    const assets = await activeAssetRuntime.preload();
    setAssetReadiness(shellRoot, true, assets.length);

    if (profile === 'test') {
      const probeInstaller =
        overrides.installAssetRuntimeProbe ?? installAssetRuntimeProbe;
      probeInstaller(profile, activeAssetRuntime, browserWindow);
    }
  } catch (error) {
    setAssetReadiness(shellRoot, false, 0);
    bridge.publish({
      ...bridge.getSnapshot(),
      phase: 'error',
      renderer: 'unavailable',
      message: formatAssetBootError(error),
    });
    return;
  }

  const gameFactory = overrides.createGame ?? createGame;
  const gameRuntime = gameFactory(gameRoot, bridge);
  const viewportFactory =
    overrides.createViewportController ?? createViewportController;
  const disposeViewport = viewportFactory(gameRoot, bridge, {
    getDevicePixelRatio: () => browserWindow.devicePixelRatio,
    createResizeObserver: (callback) => new ResizeObserver(callback),
    observeDevicePixelRatio: (callback) => {
      let mediaQuery = browserWindow.matchMedia(
        `(resolution: ${browserWindow.devicePixelRatio}dppx)`,
      );
      const onDevicePixelRatioChange = () => {
        mediaQuery.removeEventListener('change', onDevicePixelRatioChange);
        callback();
        mediaQuery = browserWindow.matchMedia(
          `(resolution: ${browserWindow.devicePixelRatio}dppx)`,
        );
        mediaQuery.addEventListener('change', onDevicePixelRatioChange);
      };

      mediaQuery.addEventListener('change', onDevicePixelRatioChange);

      return () => {
        mediaQuery.removeEventListener('change', onDevicePixelRatioChange);
      };
    },
  }).start();
  const lifecycleFactory =
    overrides.createRuntimeLifecycle ?? createRuntimeLifecycle;
  const disposeLifecycle = lifecycleFactory(gameRuntime.lifecycle, {
    window: browserWindow,
    document: browserDocument,
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
      gameRuntime.game.events.once(Phaser.Core.Events.DESTROY, resolve);
      gameRuntime.game.destroy(true);
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
}

if (typeof document !== 'undefined') {
  await bootstrapApp();
}
