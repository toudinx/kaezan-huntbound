import './styles.css';

import Phaser from 'phaser';

import {
  AssetProviderError,
  type ResolvedAsset,
} from '../../../packages/assets/src/index.ts';
import huntDefinitionJson from '../../../packages/content/src/generated/hunts/venore-rotworm-cave/hunt.json?raw';
import catalogBundleJson from '../../../packages/content/src/generated/pb-01-contract-coverage.json?raw';
import {
  buildHuntScenario,
  createContentRegistry,
  loadHuntDefinition,
  projectRuntimeBundle,
} from '../../../packages/content/src/index.ts';
import {
  type CatalogContentBundle,
  createSeed,
  type HuntDefinition,
} from '../../../packages/contracts/src/index.ts';
import {
  getAssetCatalogUrl,
  parseAppAssetProfile,
} from './assets/AssetProfile';
import { installAssetRuntimeProbe } from './assets/AssetRuntimeProbe';
import { createAssetRuntime } from './assets/createAssetRuntime';
import { createSceneBridge } from './bridge/SceneBridge';
import { createHuntCombatViewModel } from './hunt/CombatViewModel';
import { createHuntRuntime } from './hunt/huntRuntime';
import { createRestartableHuntDriver } from './hunt/RestartableHuntDriver';
import { installKernelProbe } from './index';
import { createInputMap } from './input/InputMap';
import { createGame } from './phaser/createGame';
import { createRuntimeLifecycle } from './runtime/RuntimeLifecycle';
import type { ShellSnapshot } from './runtime/ShellSnapshot';
import { createViewportController } from './runtime/ViewportController';
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

function formatHuntBootError(error: unknown): string {
  if (error instanceof Error) {
    return `Hunt bootstrap failed: ${error.message}`;
  }

  return 'Hunt bootstrap failed. Check the generated hunt definition.';
}

function readHuntDefinition(): HuntDefinition {
  const result = loadHuntDefinition(JSON.parse(huntDefinitionJson) as unknown);
  if (result.ok) {
    return result.value;
  }

  const diagnostic = result.diagnostics[0];
  throw new Error(
    diagnostic?.message ?? 'Generated hunt definition is invalid.',
  );
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
  if (profile === 'test') {
    installKernelProbe();
  }
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
  const huntAssetRuntime = createHuntRuntime(profile, assetRuntimeFactory);
  const bridge = createSceneBridge(initialShellSnapshot());
  const appShellMount = overrides.mountAppShell ?? mountAppShell;
  const inputMap = createInputMap();
  const inputTarget =
    (browserDocument.body as HTMLElement | null | undefined) ?? uiRoot;
  inputMap.attach(inputTarget);
  // The catalog is a compile-time import, so the HUD can know the real health
  // and mana ceilings before a single asset has loaded.
  const runtime = projectRuntimeBundle(
    JSON.parse(catalogBundleJson) as CatalogContentBundle,
  );
  const appShell = appShellMount(uiRoot, bridge, {
    input: inputMap,
    combat: { viewModel: createHuntCombatViewModel(runtime) },
  });
  let huntAssets: readonly ResolvedAsset[] = [];

  try {
    const assets = await activeAssetRuntime.preload();
    huntAssets = await huntAssetRuntime.preload();
    setAssetReadiness(shellRoot, true, assets.length);

    if (profile === 'test') {
      const probeInstaller =
        overrides.installAssetRuntimeProbe ?? installAssetRuntimeProbe;
      probeInstaller(profile, activeAssetRuntime, browserWindow);
    }
  } catch (error) {
    inputMap.detach();
    setAssetReadiness(shellRoot, false, 0);
    bridge.publish({
      ...bridge.getSnapshot(),
      phase: 'error',
      renderer: 'unavailable',
      message: formatAssetBootError(error),
    });
    return;
  }

  let hunt: HuntDefinition;
  try {
    hunt = readHuntDefinition();
  } catch (error) {
    inputMap.detach();
    setAssetReadiness(shellRoot, false, 0);
    bridge.publish({
      ...bridge.getSnapshot(),
      phase: 'error',
      renderer: 'unavailable',
      message: formatHuntBootError(error),
    });
    return;
  }

  const character = runtime.characters[0];
  if (character === undefined) {
    inputMap.detach();
    setAssetReadiness(shellRoot, false, 0);
    bridge.publish({
      ...bridge.getSnapshot(),
      phase: 'error',
      renderer: 'unavailable',
      message: formatHuntBootError(
        new Error('Generated catalog is missing the hunt character.'),
      ),
    });
    return;
  }

  const huntSeed = createSeed('1a2b3c4d5e6f7a8b');
  const scenarioResult = buildHuntScenario(
    hunt,
    character,
    createContentRegistry(runtime),
    huntSeed,
  );
  if (!scenarioResult.ok) {
    inputMap.detach();
    setAssetReadiness(shellRoot, false, 0);
    bridge.publish({
      ...bridge.getSnapshot(),
      phase: 'error',
      renderer: 'unavailable',
      message: formatHuntBootError(
        new Error(
          scenarioResult.diagnostics[0]?.message ??
            'Generated hunt scenario is invalid.',
        ),
      ),
    });
    return;
  }

  const scenario = scenarioResult.value.scenario;
  const driver = createRestartableHuntDriver(scenario, huntSeed, 0);
  const gameFactory = overrides.createGame ?? createGame;
  const gameRuntime = gameFactory(gameRoot, bridge, {
    hunt,
    assets: huntAssets,
    input: inputMap,
    driver,
  });
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
    inputMap.detach();
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
