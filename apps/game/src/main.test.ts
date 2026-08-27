import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as cachedMain from './main';

const harness = vi.hoisted(() => ({
  events: [] as string[],
  gameOptions: [] as unknown[],
  viewModelCalls: [] as unknown[][],
  restoredSnapshots: [] as unknown[],
  shellSnapshots: [] as { phase: string; message: string }[],
  selectedHuntId: undefined as string | undefined,
  bridge: undefined as
    | {
        getSnapshot(): { phase: string; message: string };
        subscribe(
          listener: (next: { phase: string; message: string }) => void,
        ): () => void;
      }
    | undefined,
}));

vi.mock('phaser', () => ({
  default: {
    Core: { Events: { DESTROY: 'destroy' } },
  },
}));

vi.mock('./bridge/SceneBridge', () => ({
  createSceneBridge: (initial: { phase: string; message: string }) => {
    let snapshot = initial;
    const listeners = new Set<(next: typeof snapshot) => void>();
    const eventListeners = new Set<(events: readonly unknown[]) => void>();
    const tickListeners = new Set<(tick: number) => void>();
    const bridge = {
      getSnapshot: () => snapshot,
      publish: (next: typeof snapshot) => {
        snapshot = next;
        for (const listener of listeners) {
          listener(snapshot);
        }
      },
      subscribe: (listener: (next: typeof snapshot) => void) => {
        listener(snapshot);
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      publishEvents: (events: readonly unknown[]) => {
        for (const listener of eventListeners) listener(events);
      },
      subscribeEvents: (listener: (events: readonly unknown[]) => void) => {
        eventListeners.add(listener);
        return () => eventListeners.delete(listener);
      },
      publishTick: (tick: number) => {
        for (const listener of tickListeners) listener(tick);
      },
      subscribeTick: (listener: (tick: number) => void) => {
        tickListeners.add(listener);
        listener(0);
        return () => tickListeners.delete(listener);
      },
    };
    return bridge;
  },
}));

vi.mock('./ui/AppShell', () => ({
  mountAppShell: (
    _root: unknown,
    bridge: NonNullable<typeof harness.bridge>,
  ) => {
    harness.events.push('shell');
    harness.bridge = bridge;
    const unsubscribe = bridge.subscribe((snapshot) => {
      harness.shellSnapshots.push(snapshot);
    });
    return { destroy: unsubscribe };
  },
}));

vi.mock('./ui/HuntingPlaces', () => ({
  mountHuntingPlaces: (
    _root: unknown,
    index: { hunts: readonly unknown[] },
    onSelect: (hunt: unknown) => void,
  ) => {
    harness.events.push('hunting');
    const preferredHuntId =
      harness.selectedHuntId ?? 'hunt:tibia:venore-rotworm-cave';
    const hunt =
      index.hunts.find(
        (candidate) =>
          typeof candidate === 'object' &&
          candidate !== null &&
          (candidate as { readonly huntId?: unknown }).huntId ===
            preferredHuntId,
      ) ?? index.hunts[0];
    if (hunt !== undefined) onSelect(hunt);
    return { destroy: () => undefined };
  },
}));

vi.mock('./phaser/createGame', () => ({
  createGame: (_parent: unknown, _bridge: unknown, options: unknown) => {
    harness.events.push('game');
    harness.gameOptions.push(options);
    return { game: {}, lifecycle: {} };
  },
}));

vi.mock('./hunt/CombatViewModel', () => ({
  createHuntCombatViewModel: (...args: readonly unknown[]) => {
    harness.viewModelCalls.push([...args]);
    return {
      handle: () => undefined,
      restoreBag: () => undefined,
      restoreSnapshot: (snapshot: unknown) => {
        harness.events.push('restoreSnapshot');
        harness.restoredSnapshots.push(snapshot);
      },
      setTick: () => undefined,
      setTarget: () => undefined,
      selectTarget: () => undefined,
      snapshot: () => ({ bag: [] }),
      reset: () => undefined,
    };
  },
}));

vi.mock('./runtime/ViewportController', () => ({
  createViewportController: () => ({ start: () => () => undefined }),
}));

vi.mock('./runtime/RuntimeLifecycle', () => ({
  createRuntimeLifecycle: () => ({ start: () => () => undefined }),
}));

class FakeElement {
  private readonly attributes = new Map<string, string>();

  constructor(readonly id: string) {}

  get textContent() {
    return '';
  }

  set textContent(_value: string) {
    return;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener() {
    return undefined;
  }

  removeEventListener() {
    return undefined;
  }
}

function createRoots() {
  const shellRoot = new FakeElement('shell-root');
  const gameRoot = new FakeElement('game-root');
  const uiRoot = new FakeElement('ui-root');
  const document = {
    querySelector: (selector: string) => {
      const roots: Record<string, FakeElement> = {
        '#shell-root': shellRoot,
        '#game-root': gameRoot,
        '#ui-root': uiRoot,
      };
      return roots[selector] ?? null;
    },
  };
  const browserWindow = {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    confirm: () => false,
  };

  return {
    shellRoot,
    document: document as unknown as Document,
    window: browserWindow as unknown as Window,
  };
}

function createRuntime(events: string[], label: string, shouldFail = false) {
  return {
    preload: async () => {
      events.push(`preload:${label}:start`);
      if (shouldFail) {
        const error = new Error('ASSET_MEDIA_HASH_MISMATCH: synthetic failure');
        throw error;
      }
      await Promise.resolve();
      events.push(`preload:${label}:end`);
      return Array.from({ length: 5 }, (_, index) => ({
        key: `test:key-${index}`,
      }));
    },
    unload: async () => undefined,
    snapshot: () => ({ state: 'loaded', count: 5, keys: [] }),
  };
}

function createTestSaveSession() {
  const state = {
    status: 'ready' as const,
    message: 'New run started',
    bag: [],
    stash: [],
    completedRuns: 0,
  };
  return {
    getState: () => state,
    subscribe: (listener: (next: typeof state) => void) => {
      listener(state);
      return () => undefined;
    },
    boot: async (options: {
      createDriver: (snapshot: undefined) => unknown;
    }) => ({
      decision: { kind: 'fresh' as const },
      driver: options.createDriver(undefined),
      bag: [],
    }),
    attachRun: () => undefined,
    updateBag: () => undefined,
    onTick: () => undefined,
    finish: async () => undefined,
    pagehide: async () => undefined,
    export: async () => '{}',
    import: async () => undefined,
    destroy: () => undefined,
  };
}

async function loadBootstrapApp(reset = false) {
  if (!reset) return cachedMain;
  vi.resetModules();
  return import('./main');
}

describe('main asset bootstrap', () => {
  beforeEach(() => {
    harness.events.length = 0;
    harness.gameOptions.length = 0;
    harness.viewModelCalls.length = 0;
    harness.restoredSnapshots.length = 0;
    harness.shellSnapshots.length = 0;
    harness.selectedHuntId = undefined;
    harness.bridge = undefined;
  });

  afterEach(() => {
    vi.doUnmock('../../../packages/content/src/index.ts');
    vi.unstubAllGlobals();
  });

  it('preloads assets before readiness, probe installation, and Phaser creation', async () => {
    const roots = createRoots();
    const main = await loadBootstrapApp();
    vi.stubGlobal('document', roots.document);
    vi.stubGlobal('window', roots.window);
    let rootRuntime: ReturnType<typeof createRuntime> | undefined;
    let huntRuntime: ReturnType<typeof createRuntime> | undefined;
    const bootstrapApp = main.bootstrapApp as unknown as (
      overrides: Record<string, unknown>,
    ) => Promise<void>;

    await bootstrapApp({
      document: roots.document,
      window: roots.window,
      createAssetRuntime: (input: { profile: string; catalogUrl: string }) => {
        const label =
          input.catalogUrl === '/assets/test/catalog.json' ? 'root' : 'hunt';
        harness.events.push(`runtime:${label}`);
        const runtime = createRuntime(harness.events, label);
        if (label === 'hunt') huntRuntime = runtime;
        else rootRuntime = runtime;
        return runtime;
      },
      installAssetRuntimeProbe: (profile: string, activeRuntime: unknown) => {
        harness.events.push(
          `probe:${profile}:${String(activeRuntime === rootRuntime)}`,
        );
        return undefined;
      },
      createSaveSession: () => createTestSaveSession(),
    });
    await vi.waitFor(() => expect(harness.events).toContain('game'));

    expect(harness.events).toEqual([
      'hunting',
      'runtime:root',
      'runtime:hunt',
      'restoreSnapshot',
      'shell',
      'preload:root:start',
      'preload:root:end',
      'preload:hunt:start',
      'preload:hunt:end',
      'probe:test:true',
      'game',
    ]);
    expect(rootRuntime).toBeDefined();
    expect(huntRuntime).toBeDefined();
    expect(roots.shellRoot.getAttribute('data-assets-ready')).toBe('true');
    expect(roots.shellRoot.getAttribute('data-assets-count')).toBe('5');
  });

  it('boots combat from the scenario posture tables before the first shell render', async () => {
    const roots = createRoots();
    const main = await loadBootstrapApp();
    vi.stubGlobal('document', roots.document);
    vi.stubGlobal('window', roots.window);
    const bootstrapApp = main.bootstrapApp as unknown as (
      overrides: Record<string, unknown>,
    ) => Promise<void>;

    await bootstrapApp({
      document: roots.document,
      window: roots.window,
      createAssetRuntime: () => createRuntime(harness.events, 'root'),
      createSaveSession: () => createTestSaveSession(),
    });
    await vi.waitFor(() => expect(harness.viewModelCalls).toHaveLength(1));

    const viewModelCall = harness.viewModelCalls[0];
    if (viewModelCall === undefined) {
      throw new Error('Expected the hunt combat view model to be created.');
    }
    const viewModelAbilities = viewModelCall[3] as
      | readonly { readonly abilityId: string }[]
      | undefined;
    const viewModelConditions = viewModelCall[4] as
      | readonly { readonly conditionId: string }[]
      | undefined;
    const gameOptions = harness.gameOptions[0] as
      | {
          readonly abilities?: readonly { readonly abilityId: string }[];
          readonly conditions?: readonly { readonly conditionId: string }[];
        }
      | undefined;

    expect(viewModelAbilities?.map((ability) => ability.abilityId)).toEqual([
      'berserk',
      'brutal-strike',
      'wound-cleansing',
      'groundshaker',
      'whirlwind-throw',
      'blood-rage',
      'protector',
      'challenge',
      'haste',
    ]);
    expect(
      viewModelConditions?.map((condition) => condition.conditionId),
    ).toEqual(['blood-rage', 'protector', 'haste']);
    expect(gameOptions?.abilities).toBe(viewModelAbilities);
    expect(gameOptions?.conditions).toBe(viewModelConditions);
    expect(harness.restoredSnapshots).toHaveLength(1);
    expect(harness.events.indexOf('restoreSnapshot')).toBeLessThan(
      harness.events.indexOf('shell'),
    );
  });

  it('boots Orc Fortress with the shared Knight vocation character', async () => {
    harness.selectedHuntId = 'hunt:tibia:orc-fortress';
    const roots = createRoots();
    const main = await loadBootstrapApp();
    vi.stubGlobal('document', roots.document);
    vi.stubGlobal('window', roots.window);
    const bootstrapApp = main.bootstrapApp as unknown as (
      overrides: Record<string, unknown>,
    ) => Promise<void>;

    await bootstrapApp({
      document: roots.document,
      window: roots.window,
      createAssetRuntime: (input: { catalogUrl: string }) =>
        createRuntime(
          harness.events,
          input.catalogUrl === '/assets/test/catalog.json' ? 'root' : 'hunt',
        ),
      createSaveSession: () => createTestSaveSession(),
    });
    await vi.waitFor(() => expect(harness.events).toContain('game'));

    expect(harness.shellSnapshots.at(-1)?.phase).not.toBe('error');
    expect(harness.viewModelCalls).toHaveLength(1);
  });

  it('mounts the shell before reporting an invalid hunt bootstrap', async () => {
    vi.doMock(
      '../../../packages/content/src/index.ts',
      async (importOriginal) => {
        const actual =
          await importOriginal<
            typeof import('../../../packages/content/src/index.ts')
          >();
        return {
          ...actual,
          loadHuntDefinition: () => ({
            ok: false as const,
            diagnostics: [
              {
                code: 'SIM_SCHEMA_INVALID' as const,
                message: 'Synthetic invalid hunt definition',
                path: [],
              },
            ],
          }),
        };
      },
    );
    const roots = createRoots();
    const main = await loadBootstrapApp(true);
    vi.stubGlobal('document', roots.document);
    vi.stubGlobal('window', roots.window);
    const bootstrapApp = main.bootstrapApp as unknown as (
      overrides: Record<string, unknown>,
    ) => Promise<void>;

    await bootstrapApp({
      document: roots.document,
      window: roots.window,
      createAssetRuntime: () => createRuntime(harness.events, 'root'),
      createSaveSession: () => createTestSaveSession(),
    });
    await vi.waitFor(() => expect(harness.events).toContain('shell'));

    expect(harness.events).toContain('shell');
    expect(harness.shellSnapshots.at(-1)).toMatchObject({
      phase: 'error',
      message: 'Hunt bootstrap failed: Synthetic invalid hunt definition',
    });
    expect(harness.events).not.toContain('game');
  });

  it('keeps the shell blocked and does not create Phaser on preload failure', async () => {
    const roots = createRoots();
    const main = await loadBootstrapApp();
    vi.stubGlobal('document', roots.document);
    vi.stubGlobal('window', roots.window);
    const runtime = createRuntime(harness.events, 'root', true);
    const bootstrapApp = main.bootstrapApp as unknown as (
      overrides: Record<string, unknown>,
    ) => Promise<void>;

    await bootstrapApp({
      document: roots.document,
      window: roots.window,
      createAssetRuntime: () => runtime,
      createSaveSession: () => createTestSaveSession(),
    });
    await vi.waitFor(() =>
      expect(harness.bridge?.getSnapshot().phase).toBe('error'),
    );

    expect(roots.shellRoot.getAttribute('data-assets-ready')).toBe('false');
    expect(roots.shellRoot.getAttribute('data-assets-count')).toBe('0');
    expect(harness.events).not.toContain('game');
    expect(harness.bridge?.getSnapshot().phase).toBe('error');
    expect(harness.bridge?.getSnapshot().message).toContain(
      'ASSET_MEDIA_HASH_MISMATCH',
    );
  });
});
