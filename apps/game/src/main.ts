import './styles.css';

import Phaser from 'phaser';

import {
  AssetProviderError,
  type ResolvedAsset,
} from '../../../packages/assets/src/index.ts';
import huntIndexJson from '../../../packages/content/src/generated/hunts/index.json?raw';
import catalogBundleJson from '../../../packages/content/src/generated/pb-01-contract-coverage.json?raw';
import {
  buildAchievementCatalog,
  buildBestiaryCatalog,
  buildHuntScenario,
  createContentRegistry,
  createItemSaleOffer,
  type EquippedStats,
  type ItemSaleOffer,
  knightSheetAtLevel,
  levelForExperience,
  loadHuntDefinition,
  nextHuntBuffDamagePercent,
  nextHuntBuffOffer,
  parseKnightPostures,
  projectRuntimeBundle,
  resolveEquippedStats,
} from '../../../packages/content/src/index.ts';
import knightCombatSelectionJson from '../../../packages/content/src/selections/pb-05-knight-combat.json?raw';
import {
  type CatalogContentBundle,
  type CharacterDefinition,
  CharacterDefinitionSchema,
  type CharacterProgress,
  createEmptyCharacterProgress,
  createSeed,
  type EntityId,
  type EquipmentSlot,
  type HuntDefinition,
  type HuntIndex,
  type HuntIndexEntry,
  HuntIndexSchema,
  type ItemDefinition,
  type NextHuntBuffState,
  type RunBagEntry,
  type SaveDraft,
} from '../../../packages/contracts/src/index.ts';
import {
  buyNextHuntBuff,
  createIndexedDbSaveDriver,
  createSaveRepository,
  equipFromStash,
  refreshAchievements,
  type SaveRepository,
  unequipToStash,
} from '../../../packages/save/src/index.ts';
import {
  getAssetCatalogUrl,
  parseAppAssetProfile,
} from './assets/AssetProfile';
import { installAssetRuntimeProbe } from './assets/AssetRuntimeProbe';
import { createAssetRuntime } from './assets/createAssetRuntime';
import { createSceneBridge } from './bridge/SceneBridge';
import {
  type CombatViewModel,
  createHuntCombatViewModel,
} from './hunt/CombatViewModel';
import { createHuntRuntime } from './hunt/huntRuntime';
import { huntSlug } from './hunt/huntSlug';
import { createRestartableHuntDriver } from './hunt/RestartableHuntDriver';
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
  type HuntingPlacesPreparation,
  type HuntingPlacesScreen,
  type HuntRunSummary,
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

/**
 * The player's own character sheet at the level their save says they are.
 *
 * The hunt is no longer part of this: it names a place, not a build. Stats come
 * from the Huntbound curve in `knightSheetAtLevel`, and the kit comes from the
 * PB-05 selection, which is one open band from level 1 -- the whole five-action
 * kit is in hand from the first minute, as decision 3 of the PB-13 README and
 * rule 4 of the ADR-05 curation require.
 */
function readKnightCharacter(
  level: number,
  equipped: EquippedStats,
): CharacterDefinition {
  const kit = readKnightCombatSelection().character?.kit;
  if (kit === undefined) {
    throw new Error('PB-05 selection character is missing its kit');
  }
  return CharacterDefinitionSchema.parse({
    ...knightSheetAtLevel(level, equipped),
    stableKey: 'character:huntbound:knight',
    vocationKey: 'vocation:tibia:knight',
    kit,
  });
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
  // One repository for the whole app rather than one per run: the atlas is a
  // screen the player comes back to, and it has to be able to read the
  // character before any run has been started.
  const saveRepository: SaveRepository = createSaveRepository(
    createIndexedDbSaveDriver(),
  );
  let character: CharacterProgress = createEmptyCharacterProgress();
  let stash: readonly RunBagEntry[] = [];
  let gold = 0;
  let nextHuntBuff: NextHuntBuffState = 'none';
  try {
    const loaded = await saveRepository.load();
    character = loaded.character;
    stash = loaded.stash;
    gold = loaded.gold;
    nextHuntBuff = loaded.nextHuntBuff;
  } catch {
    // A save that cannot be read is a fresh character, not a dead boot: the
    // session reports the failure properly once a run starts.
  }
  // The catalog is a compile-time import, so the atlas can read an item's
  // stats before any run has been started -- which is the only moment gear can
  // be changed.
  const contentRuntime = projectRuntimeBundle(
    JSON.parse(catalogBundleJson) as CatalogContentBundle,
  );
  const itemsByKey = new Map<string, ItemDefinition>(
    contentRuntime.items.map((item) => [item.stableKey, item]),
  );
  const lookupItem = (itemKey: string): ItemDefinition | undefined =>
    itemsByKey.get(itemKey);
  const saleOfferFor = (itemKey: string): ItemSaleOffer | undefined => {
    const item = lookupItem(itemKey);
    return item === undefined ? undefined : createItemSaleOffer(item);
  };
  const resolveSellItem = (itemKey: string) => {
    const offer = saleOfferFor(itemKey);
    return offer === undefined
      ? undefined
      : {
          displayName: offer.displayName,
          unitPrice: offer.unitPrice,
          protected: offer.protected,
        };
  };
  const equippedStats = (): EquippedStats =>
    resolveEquippedStats(character.equipment, lookupItem);
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
  const appUiRoot = uiRoot;
  const bestiary = buildBestiaryCatalog(huntIndex);
  const achievements = buildAchievementCatalog();
  try {
    const refreshed = await saveRepository.transact((draft) => {
      refreshAchievements(draft, achievements);
      return {
        character: draft.character,
        gold: draft.gold,
        stash: draft.stash,
        nextHuntBuff: draft.nextHuntBuff,
      };
    });
    character = refreshed.character;
    stash = refreshed.stash;
    gold = refreshed.gold;
    nextHuntBuff = refreshed.nextHuntBuff;
  } catch {
    // SaveSession will surface a write failure once the player starts a run.
  }
  const bestiaryByCreatureKey = new Map(
    bestiary.map((species) => [species.creatureKey, species]),
  );

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
    let unsubscribeBestiaryActors: (() => void) | undefined;
    let unsubscribeSaveTick: (() => void) | undefined;
    let unsubscribeSaveState: (() => void) | undefined;
    let pageHideHandler: (() => void) | undefined;
    let combatViewModel: CombatViewModel | undefined;
    let destroyRenderer: (() => Promise<void>) | undefined;
    let unloadAssets: (() => Promise<void>) | undefined;
    // Death consolidates the run the moment it happens rather than when a
    // button is pressed, so a reload on the death overlay cannot bring the lost
    // bag back. The promise is kept because restarting and leaving both have to
    // wait for that write before they touch the session again.
    let deathConsolidation: Promise<void> | undefined;
    let leaving = false;
    const runDisposers: (() => void)[] = [];
    const onSaveError = (error: unknown): void => {
      publishSaveError(bridge, error);
    };
    const disposeSave = (): void => {
      if (pageHideHandler !== undefined) {
        browserWindow.removeEventListener('pagehide', pageHideHandler);
      }
      unsubscribeSaveState?.();
      unsubscribeSaveEvents?.();
      unsubscribeBestiaryActors?.();
      unsubscribeSaveTick?.();
      saveSession?.destroy();
    };
    const disposeRunSurfaces = (): void => {
      for (const dispose of runDisposers.splice(0)) dispose();
      inputMap?.detach();
      disposeSave();
      appShell?.destroy();
      appShell = undefined;
      setAssetReadiness(shellRoot, false, 0);
    };
    const isPlayerDead = (): boolean =>
      combatViewModel?.snapshot().playerDead === true;
    const consolidateOnDeath = (): void => {
      if (deathConsolidation !== undefined || leaving || !isPlayerDead()) {
        return;
      }
      deathConsolidation = saveSession?.finish('died');
    };
    const leaveRun = async (): Promise<void> => {
      if (leaving) return;
      leaving = true;
      await deathConsolidation;
      const dead = isPlayerDead();
      // The bag the run is about to bank, read where `finish` reads it, so the
      // atlas lists exactly what reached the stash.
      const banked = dead ? [] : (combatViewModel?.snapshot().bag ?? []);
      const experienceGained =
        combatViewModel?.snapshot().experience.runGained ?? 0;
      if (!dead) {
        await saveSession?.finish('completed');
      }
      const settled = saveSession?.getState();
      // The atlas is remounted from here, so the character it shows is the one
      // the run just finished writing.
      character = settled?.character ?? character;
      stash = settled?.stash ?? stash;
      gold = settled?.gold ?? gold;
      nextHuntBuff = settled?.nextHuntBuff ?? nextHuntBuff;
      disposeRunSurfaces();
      await destroyRenderer?.();
      await unloadAssets?.();
      showHuntingPlaces({
        outcome: dead ? 'died' : 'completed',
        huntName: huntEntry.displayName,
        banked,
        stash: settled?.stash ?? [],
        completedRuns: settled?.completedRuns ?? 0,
        experienceGained,
      });
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
      const runtime = contentRuntime;
      const hunt = await readHuntDefinition(huntEntry);
      const huntSeed = createSeed('1a2b3c4d5e6f7a8b');
      const registry = createContentRegistry(runtime);
      // The sheet is fixed for the length of the run: the kernel is built from
      // it. Levelling mid-hunt therefore banks the experience now and hands the
      // bigger sheet to the next run, which is the same boundary the bag uses.
      const knight = readKnightCharacter(
        levelForExperience(character.experience),
        equippedStats(),
      );
      const postures = readKnightPostures();
      const scenarioResult = buildHuntScenario(
        hunt,
        knight,
        registry,
        huntSeed,
        {
          postures,
          ...(nextHuntBuff === 'none' ? {} : { preparedHunt: true }),
        },
      );

      if (!scenarioResult.ok) {
        throw new Error(
          scenarioResult.diagnostics[0]?.message ??
            'Generated hunt scenario is invalid.',
        );
      }

      const scenario = scenarioResult.value.scenario;
      const effectiveHunt = {
        ...hunt,
        playerStart: scenarioResult.value.playerStart,
      };
      let huntAssets: readonly ResolvedAsset[] = [];
      let huntAssetsByKey = new Map<string, ResolvedAsset>();
      const resolveHuntAsset = (key: string): ResolvedAsset | undefined =>
        huntAssetsByKey.get(key);
      const activeCombatViewModel = createHuntCombatViewModel(
        runtime,
        1 as EntityId,
        'player',
        scenario.abilities,
        scenario.conditions,
        scenario.blueprints,
        knight,
        scenarioResult.value.itemKeys,
      );
      combatViewModel = activeCombatViewModel;
      const identity = {
        huntId: hunt.huntId,
        scenarioId: scenario.scenarioId,
        scenarioRevision: scenario.scenarioRevision,
        seed: huntSeed,
      } as const;

      saveSession = overrides.createSaveSession
        ? overrides.createSaveSession(saveRepository, {
            resolveSellItem,
            bestiary,
            achievements,
          })
        : createSaveSession(saveRepository, {
            resolveSellItem,
            bestiary,
            achievements,
          });
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
      activeCombatViewModel.restoreSnapshot(activeDriver.snapshot());
      activeCombatViewModel.restoreBag(saveBoot.bag);
      activeCombatViewModel.restoreExperience(saveBoot.character.experience);
      character = saveBoot.character;
      stash = saveSession?.getState().stash ?? stash;

      inputMap = createInputMap();
      const inputTarget =
        (browserDocument.body as HTMLElement | null | undefined) ?? uiRoot;
      inputMap.attach(inputTarget);
      selectionScreen?.destroy();
      selectionScreen = undefined;
      // Death events carry an entity id rather than a content key. Keep the
      // spawn mapping ahead of the HUD's event subscriber so the save layer
      // can still resolve the species after the view model removes the dead
      // actor from its live roster.
      const blueprintByEntityId = new Map<number, string>();
      unsubscribeBestiaryActors = bridge.subscribeEvents((events) => {
        for (const event of events) {
          if (event.payload.type !== 'actor/spawned') continue;
          blueprintByEntityId.set(
            event.payload.entityId,
            event.payload.blueprintId,
          );
        }
      });
      appShell = appShellMount(uiRoot, bridge, {
        input: inputMap,
        combat: {
          viewModel: activeCombatViewModel,
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
            // The death write is already in flight; reattaching before it
            // settles would hand the reopened run to the transaction's own
            // cleanup and leave it without a checkpoint scheduler.
            void Promise.resolve(deathConsolidation).then(() => {
              deathConsolidation = undefined;
              saveSession?.attachRun({
                identity: activeIdentity,
                driver: activeDriver,
                getBag: () => activeCombatViewModel.snapshot().bag,
                getExperience: () =>
                  activeCombatViewModel.snapshot().experience.total,
              });
            });
          },
          onLeave: () => {
            void leaveRun();
          },
          region: effectiveHunt.region,
          transitions: effectiveHunt.transitions.entries,
          playerStart: effectiveHunt.playerStart,
          resolveAsset: resolveHuntAsset,
          ...(nextHuntBuff === 'none'
            ? {}
            : {
                preparedHunt: {
                  damagePercent: nextHuntBuffDamagePercent(),
                },
              }),
        },
        save: {
          source: saveSession,
          getSaleOffer: saleOfferFor,
          onSell: async (itemKey, quantity, allowProtected) => {
            await saveSession?.sell(itemKey, quantity, allowProtected);
          },
          confirmProtectedSale: (offer, quantity) =>
            browserWindow.confirm(
              `${offer.displayName} is a collection piece. Sell ${quantity} ` +
                `for ${offer.unitPrice * quantity} gold anyway?`,
            ),
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
      unsubscribeSaveEvents = bridge.subscribeEvents((events) => {
        const projection = activeCombatViewModel.snapshot();
        saveSession?.updateBag(projection.bag);
        saveSession?.updateExperience(projection.experience.total);
        // Bestiary progress is account progress, so it is credited at the
        // death event even when the run later dies and loses its bag. The
        // event sequence is persisted with the active session; a replay after
        // reload therefore becomes an idempotent no-op.
        for (const event of events) {
          if (
            event.payload.type !== 'actor/died' ||
            event.payload.killerEntityId !== (1 as EntityId)
          ) {
            continue;
          }
          const blueprintId = blueprintByEntityId.get(event.payload.entityId);
          if (blueprintId === undefined) continue;
          const creatureKey =
            activeCombatViewModel.targetDetailsByBlueprint.get(
              blueprintId,
            )?.assetKey;
          if (creatureKey === null || creatureKey === undefined) continue;
          if (!bestiaryByCreatureKey.has(creatureKey)) continue;
          void saveSession?.recordBestiaryKill(creatureKey, event.sequence);
        }
        consolidateOnDeath();
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
        getBag: () => activeCombatViewModel.snapshot().bag,
        getExperience: () => activeCombatViewModel.snapshot().experience.total,
      });
      // A run resumed from a save written after the player died comes back
      // already dead, and its bag is owed to the same rule as a fresh death.
      consolidateOnDeath();
      unloadAssets = async () => {
        await activeAssetRuntime.unload();
        await huntAssetRuntime.unload();
      };
      const gameFactory = overrides.createGame ?? createGame;
      const gameRuntime = gameFactory(gameRoot, bridge, {
        hunt: effectiveHunt,
        // The caps the kernel was built with. `hunt.blueprints` still carries the
        // movement-era placeholders.
        blueprints: scenario.blueprints,
        assets: huntAssets,
        input: inputMap,
        driver: activeDriver,
        abilities: scenario.abilities,
        conditions: scenario.conditions,
        targetDetailsByBlueprint:
          activeCombatViewModel.targetDetailsByBlueprint,
        itemKeys: scenarioResult.value.itemKeys,
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

      // Leaving the hunt and a hot reload tear down the same surfaces; the only
      // difference is that HMR hands the Phaser teardown to the next module
      // instead of waiting for it here.
      runDisposers.push(
        unsubscribePerformanceMark,
        disposeLifecycle,
        disposeViewport,
      );
      destroyRenderer = destroyGame;

      function disposeShell(data: ShellHmrData) {
        disposeRunSurfaces();
        data.phaserDestroyed = destroyGame();
      }

      if (import.meta.hot) {
        import.meta.hot.dispose(disposeShell);
      }
    } catch (error) {
      publishHuntBootstrapError(error);
    }
  };

  /**
   * The atlas is a screen the player comes back to, not a splash the boot
   * sequence passes through once. Remounting it here -- with the shell torn
   * down and the bridge published back to `hunting` -- is what makes leaving a
   * hunt a move inside the app instead of a reload.
   *
   * A declaration rather than a `const`, because it and `startSelectedHunt`
   * each reach for the other and only one of the two can be second.
   */
  function showHuntingPlaces(summary?: HuntRunSummary): void {
    selectionStarted = false;
    bridge.publish(initialShellSnapshot());
    selectionScreen?.destroy();
    // Equipping rewrites the save and then redraws the atlas from it, so the
    // slot row, the totals and the set counter can never disagree with what
    // the next run will actually be built from.
    const applyGearChange = (change: (draft: SaveDraft) => boolean): void => {
      void saveRepository
        .transact((draft) => {
          const changed = change(draft);
          if (changed) {
            refreshAchievements(draft, achievements, 'item-equipped');
          }
          return {
            character: draft.character,
            stash: draft.stash,
            gold: draft.gold,
          };
        })
        .then((next) => {
          character = next.character;
          stash = next.stash;
          gold = next.gold;
          showHuntingPlaces(summary);
        })
        .catch(() => {
          // A failed write leaves the atlas showing the set that is still
          // saved, which is the honest picture of what the next run gets.
        });
    };
    selectionScreen = mountSelection(
      appUiRoot,
      huntIndex,
      (hunt) => {
        void startSelectedHunt(hunt);
      },
      summary,
      character,
      {
        stash,
        item: lookupItem,
        onEquip: (slot: EquipmentSlot, itemKey: string) => {
          applyGearChange((draft) => equipFromStash(draft, slot, itemKey));
        },
        onUnequip: (slot: EquipmentSlot) => {
          applyGearChange((draft) => unequipToStash(draft, slot));
        },
      },
      {
        gold,
        status: nextHuntBuff,
        price: nextHuntBuffOffer().price,
        damagePercent: nextHuntBuffDamagePercent(),
        onBuy: () => {
          const price = nextHuntBuffOffer().price;
          void saveRepository
            .transact((draft) => {
              buyNextHuntBuff(draft, price);
              return {
                gold: draft.gold,
                nextHuntBuff: draft.nextHuntBuff,
              };
            })
            .then((next) => {
              gold = next.gold;
              nextHuntBuff = next.nextHuntBuff;
              showHuntingPlaces(summary);
            })
            .catch(() => {
              // A failed write leaves the atlas showing the wallet that is
              // still saved.
            });
        },
      } satisfies HuntingPlacesPreparation,
      bestiary,
      achievements,
    );
  }

  showHuntingPlaces();
}

if (typeof document !== 'undefined') {
  await bootstrapApp();
}
