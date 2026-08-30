import './styles.css';

import Phaser from 'phaser';

import {
  AssetProviderError,
  type ResolvedAsset,
} from '../../../packages/assets/src/index.ts';
import huntIndexJson from '../../../packages/content/src/generated/hunts/index.json?raw';
import catalogBundleJson from '../../../packages/content/src/generated/pb-01-contract-coverage.json?raw';
import {
  buildHuntScenario,
  createContentRegistry,
  loadHuntDefinition,
  parseKnightPostures,
  projectRuntimeBundle,
} from '../../../packages/content/src/index.ts';
import knightCombatSelectionJson from '../../../packages/content/src/selections/pb-05-knight-combat.json?raw';
import {
  type CatalogContentBundle,
  type CharacterDefinition,
  CharacterDefinitionSchema,
  createSeed,
  type EntityId,
  type HuntDefinition,
  type HuntIndex,
  type HuntIndexEntry,
  HuntIndexSchema,
} from '../../../packages/contracts/src/index.ts';
import {
  createIndexedDbSaveDriver,
  createSaveRepository,
  type SaveRepository,
} from '../../../packages/save/src/index.ts';
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
import { huntSlug, readHuntCharacter } from './hunt/readHuntCharacter';
import { installKernelProbe, installSaveProbe } from './index';
import { createInputMap } from './input/InputMap';
import { createGame } from './phaser/createGame';
import { createRuntimeLifecycle } from './runtime/RuntimeLifecycle';
import type { ShellSnapshot } from './runtime/ShellSnapshot';
import { createViewportController } from './runtime/ViewportController';
import {
  createSaveSession,
  type SaveSessionController,
} from './save/SaveSession';
import { mountAppShell } from './ui/AppShell';
import {
  type HuntingPlacesScreen,
  mountHuntingPlaces,
} from './ui/HuntingPlaces';

interface ShellHmrData {
  phaserDestroyed?: Promise<void>;
}

export interface MainBootstrapOverrides {
  readonly document?: Document;
  readonly window?: Window;
  readonly createAssetRuntime?: typeof createAssetRuntime;
  readonly installAssetRuntimeProbe?: typeof installAssetRuntimeProbe;
  readonly mountAppShell?: typeof mountAppShell;
  readonly mountHuntingPlaces?: typeof mountHuntingPlaces;
  readonly createGame?: typeof createGame;
  readonly createViewportController?: typeof createViewportController;
  readonly createRuntimeLifecycle?: typeof createRuntimeLifecycle;
  readonly createSaveSession?: typeof createSaveSession;
}

const hmrData = import.meta.hot?.data as ShellHmrData | undefined;

const huntDefinitionLoaders = import.meta.glob<{ readonly default: string }>(
  '../../../packages/content/src/generated/hunts/*/hunt.json',
  { query: '?raw' },
);

function initialShellSnapshot(): ShellSnapshot {
  return {
    phase: 'hunting',
    renderer: 'unavailable',
    viewport: {
      width: 0,
      height: 0,
      devicePixelRatio: 1,
    },
    message: 'Choose a hunting place',
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

function readHuntIndex(): HuntIndex {
  const result = HuntIndexSchema.safeParse(
    JSON.parse(huntIndexJson) as unknown,
  );
  if (result.success) {
    return result.data;
  }

  const diagnostic = result.error.issues[0];
  throw new Error(diagnostic?.message ?? 'Generated hunt index is invalid.');
}

async function readHuntDefinition(
  hunt: Pick<HuntIndexEntry, 'huntId'>,
): Promise<HuntDefinition> {
  const suffix = `/${huntSlug(hunt.huntId)}/hunt.json`;
  const loader = Object.entries(huntDefinitionLoaders).find(([path]) =>
    path.endsWith(suffix),
  )?.[1];
  if (loader === undefined) {
    throw new Error(`Generated hunt definition is missing for ${hunt.huntId}`);
  }

  const result = loadHuntDefinition(
    JSON.parse((await loader()).default) as unknown,
  );
  if (result.ok) {
    return result.value;
  }

  const diagnostic = result.diagnostics[0];
  throw new Error(
    diagnostic?.message ?? 'Generated hunt definition is invalid.',
  );
}

function resolveHuntCharacter(
  characters: readonly CharacterDefinition[],
  hunt: Pick<HuntIndexEntry, 'huntId' | 'soloVocation'>,
): CharacterDefinition {
  return readKnightCharacter(readHuntCharacter(characters, hunt));
}

function readKnightCombatSelection(): {
  readonly character?: { readonly kit?: unknown };
  readonly postures?: unknown;
} {
  return JSON.parse(knightCombatSelectionJson) as {
    readonly character?: { readonly kit?: unknown };
    readonly postures?: unknown;
  };
}

function readKnightPostures() {
  return parseKnightPostures(readKnightCombatSelection().postures);
}

function readKnightCharacter(
  catalogCharacter: CharacterDefinition,
): CharacterDefinition {
  const kit = readKnightCombatSelection().character?.kit;
  if (kit === undefined) {
    throw new Error('PB-05 selection character is missing its kit');
  }
  return CharacterDefinitionSchema.parse({
    ...catalogCharacter,
    spellKeys: undefined,
    kit,
  });
}

function createBrowserSaveSession(): SaveSessionController {
  const repository: SaveRepository = createSaveRepository(
    createIndexedDbSaveDriver(),
  );
  return createSaveSession(repository);
}

function downloadSave(document: Document, serialized: string): void {
  const blob = new Blob([serialized], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'huntbound-save.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importSaveFromFile(
  document: Document,
  root: HTMLElement,
  saveSession: SaveSessionController,
  onError: (error: unknown) => void,
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.setAttribute('hidden', 'true');

  const onChange = (): void => {
    input.removeEventListener('change', onChange);
    input.remove();
    const file = input.files?.[0];
    if (file === undefined) return;

    void file
      .text()
      .then((serialized) => saveSession.import(serialized))
      .catch(onError);
  };

  input.addEventListener('change', onChange);
  root.append(input);
  input.click();
}

function publishSaveError(
  bridge: ReturnType<typeof createSceneBridge>,
  error: unknown,
): void {
  bridge.publish({
    ...bridge.getSnapshot(),
    phase: 'error',
    renderer: 'unavailable',
    message:
      error instanceof Error
        ? `Save replacement failed: ${error.message}`
        : 'Save replacement failed.',
  });
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
    installSaveProbe(profile, browserWindow);
  }
  const catalogUrl = getAssetCatalogUrl(profile);
  const shellRoot = browserDocument.querySelector<HTMLElement>('#shell-root');
  const gameRoot = browserDocument.querySelector<HTMLElement>('#game-root');
  const uiRoot = browserDocument.querySelector<HTMLElement>('#ui-root');

  if (!shellRoot || !gameRoot || !uiRoot) {
    throw new Error('Huntbound shell roots are missing.');
  }

  setAssetReadiness(shellRoot, false, 0);
  const bridge = createSceneBridge(initialShellSnapshot());
  const appShellMount = overrides.mountAppShell ?? mountAppShell;
  let huntIndex: HuntIndex;
  try {
    huntIndex = readHuntIndex();
  } catch (error) {
    appShellMount(uiRoot, bridge);
    bridge.publish({
      ...bridge.getSnapshot(),
      phase: 'error',
      renderer: 'unavailable',
      message: formatHuntBootError(error),
    });
    return;
  }

  const mountSelection = overrides.mountHuntingPlaces ?? mountHuntingPlaces;
  let selectionScreen: HuntingPlacesScreen | undefined;
  let selectionStarted = false;

  const startSelectedHunt = async (
    huntEntry: HuntIndexEntry,
  ): Promise<void> => {
    if (selectionStarted) return;
    selectionStarted = true;
    bridge.publish({
      ...bridge.getSnapshot(),
      phase: 'booting',
      renderer: 'unavailable',
      message: `Loading ${huntEntry.displayName}`,
    });

    let inputMap: ReturnType<typeof createInputMap> | undefined;
    let saveSession: SaveSessionController | undefined;
    let appShell: ReturnType<typeof mountAppShell> | undefined;
    let driver: ReturnType<typeof createRestartableHuntDriver> | undefined;
    let runIdentity:
      | {
          readonly huntId: string;
          readonly scenarioId: string;
          readonly scenarioRevision: number;
          readonly seed: ReturnType<typeof createSeed>;
        }
      | undefined;
    let unsubscribeSaveEvents: (() => void) | undefined;
    let unsubscribeSaveTick: (() => void) | undefined;
    let unsubscribeSaveState: (() => void) | undefined;
    let pageHideHandler: (() => void) | undefined;
    const onSaveError = (error: unknown): void => {
      publishSaveError(bridge, error);
    };
    const disposeSave = (): void => {
      if (pageHideHandler !== undefined) {
        browserWindow.removeEventListener('pagehide', pageHideHandler);
      }
      unsubscribeSaveState?.();
      unsubscribeSaveEvents?.();
      unsubscribeSaveTick?.();
      saveSession?.destroy();
    };
    const publishHuntBootstrapError = (error: unknown): void => {
      inputMap?.detach();
      disposeSave();
      setAssetReadiness(shellRoot, false, 0);
      selectionScreen?.destroy();
      selectionScreen = undefined;
      appShell ??= appShellMount(uiRoot, bridge);
      bridge.publish({
        ...bridge.getSnapshot(),
        phase: 'error',
        renderer: 'unavailable',
        message: formatHuntBootError(error),
      });
    };

    try {
      const assetRuntimeFactory =
        overrides.createAssetRuntime ?? createAssetRuntime;
      const activeAssetRuntime = assetRuntimeFactory({
        profile,
        catalogUrl,
      });
      const huntAssetRuntime = createHuntRuntime(
        profile,
        huntEntry,
        assetRuntimeFactory,
      );
      // The catalog is a compile-time import, so the HUD can know the real
      // health and mana ceilings before a single asset has loaded.
      const runtime = projectRuntimeBundle(
        JSON.parse(catalogBundleJson) as CatalogContentBundle,
      );
      const hunt = await readHuntDefinition(huntEntry);
      const huntSeed = createSeed('1a2b3c4d5e6f7a8b');
      const registry = createContentRegistry(runtime);
      const character = resolveHuntCharacter(runtime.characters, huntEntry);
      const postures = readKnightPostures();
      const scenarioResult = buildHuntScenario(
        hunt,
        character,
        registry,
        huntSeed,
        { postures },
      );

      if (!scenarioResult.ok) {
        throw new Error(
          scenarioResult.diagnostics[0]?.message ??
            'Generated hunt scenario is invalid.',
        );
      }

      const scenario = scenarioResult.value.scenario;
      let huntAssets: readonly ResolvedAsset[] = [];
      let huntAssetsByKey = new Map<string, ResolvedAsset>();
      const resolveHuntAsset = (key: string): ResolvedAsset | undefined =>
        huntAssetsByKey.get(key);
      const combatViewModel = createHuntCombatViewModel(
        runtime,
        1 as EntityId,
        'player',
        scenario.abilities,
        scenario.conditions,
        scenario.blueprints,
        character,
        scenarioResult.value.itemKeys,
      );
      const identity = {
        huntId: hunt.huntId,
        scenarioId: scenario.scenarioId,
        scenarioRevision: scenario.scenarioRevision,
        seed: huntSeed,
      } as const;

      saveSession = overrides.createSaveSession
        ? overrides.createSaveSession(
            createSaveRepository(createIndexedDbSaveDriver()),
          )
        : createBrowserSaveSession();
      pageHideHandler = (): void => {
        void saveSession?.pagehide();
      };
      browserWindow.addEventListener('pagehide', pageHideHandler);
      const saveBoot = await saveSession.boot({
        identity,
        createDriver: (snapshot) =>
          createRestartableHuntDriver(scenario, huntSeed, 0, snapshot),
      });
      const activeDriver = saveBoot.driver;
      driver = activeDriver;
      runIdentity = identity;
      combatViewModel.restoreSnapshot(activeDriver.snapshot());
      combatViewModel.restoreBag(saveBoot.bag);

      inputMap = createInputMap();
      const inputTarget =
        (browserDocument.body as HTMLElement | null | undefined) ?? uiRoot;
      inputMap.attach(inputTarget);
      selectionScreen?.destroy();
      selectionScreen = undefined;
      appShell = appShellMount(uiRoot, bridge, {
        input: inputMap,
        combat: {
          viewModel: combatViewModel,
          onRestart: () => {
            const activeDriver = driver;
            const activeIdentity = runIdentity;
            if (
              activeDriver === undefined ||
              activeIdentity === undefined ||
              saveSession === undefined
            ) {
              return;
            }
            void saveSession.finish('abandoned').then(() => {
              saveSession?.attachRun({
                identity: activeIdentity,
                driver: activeDriver,
                getBag: () => combatViewModel.snapshot().bag,
              });
            });
          },
          region: hunt.region,
          resolveAsset: resolveHuntAsset,
        },
        save: {
          source: saveSession,
          onExport: async () => {
            const serialized = await saveSession?.export();
            if (serialized !== undefined) {
              downloadSave(browserDocument, serialized);
            }
          },
          confirmImport: () =>
            browserWindow.confirm(
              'Replacing the current save will overwrite it. Continue?',
            ),
          onImport: () =>
            importSaveFromFile(
              browserDocument,
              uiRoot,
              saveSession as SaveSessionController,
              onSaveError,
            ),
        },
      });
      unsubscribeSaveState = saveSession.subscribe((state) => {
        if (state.status !== 'error') return;
        bridge.publish({
          ...bridge.getSnapshot(),
          phase: 'error',
          renderer: 'unavailable',
          message: state.message,
        });
      });
      unsubscribeSaveEvents = bridge.subscribeEvents(() => {
        saveSession?.updateBag(combatViewModel.snapshot().bag);
      });
      unsubscribeSaveTick = bridge.subscribeTick((tick) => {
        saveSession?.onTick(tick);
      });

      try {
        const assets = await activeAssetRuntime.preload();
        huntAssets = await huntAssetRuntime.preload();
        huntAssetsByKey = new Map(
          huntAssets.map((asset) => [asset.key, asset] as const),
        );
        setAssetReadiness(shellRoot, true, assets.length);

        if (profile === 'test') {
          const probeInstaller =
            overrides.installAssetRuntimeProbe ?? installAssetRuntimeProbe;
          probeInstaller(profile, activeAssetRuntime, browserWindow);
        }
      } catch (error) {
        inputMap.detach();
        disposeSave();
        setAssetReadiness(shellRoot, false, 0);
        bridge.publish({
          ...bridge.getSnapshot(),
          phase: 'error',
          renderer: 'unavailable',
          message: formatAssetBootError(error),
        });
        return;
      }

      saveSession.attachRun({
        identity,
        driver: activeDriver,
        getBag: () => combatViewModel.snapshot().bag,
      });
      const gameFactory = overrides.createGame ?? createGame;
      const gameRuntime = gameFactory(gameRoot, bridge, {
        hunt,
        // The caps the kernel was built with. `hunt.blueprints` still carries the
        // movement-era placeholders.
        blueprints: scenario.blueprints,
        assets: huntAssets,
        input: inputMap,
        driver: activeDriver,
        abilities: scenario.abilities,
        conditions: scenario.conditions,
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
        disposeSave();
        inputMap?.detach();
        disposeLifecycle();
        disposeViewport();
        appShell?.destroy();
        data.phaserDestroyed = destroyGame();
      }

      if (import.meta.hot) {
        import.meta.hot.dispose(disposeShell);
      }
    } catch (error) {
      publishHuntBootstrapError(error);
    }
  };

  selectionScreen = mountSelection(uiRoot, huntIndex, (hunt) => {
    void startSelectedHunt(hunt);
  });
}

if (typeof document !== 'undefined') {
  await bootstrapApp();
}
