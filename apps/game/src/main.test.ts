import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  events: [] as string[],
  bridge: undefined as
    | {
        getSnapshot(): { phase: string; message: string };
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
    };
    return bridge;
  },
}));

vi.mock('./ui/AppShell', () => ({
  mountAppShell: (_root: unknown, bridge: typeof harness.bridge) => {
    harness.events.push('shell');
    harness.bridge = bridge;
    return { destroy: () => undefined };
  },
}));

vi.mock('./phaser/createGame', () => ({
  createGame: () => {
    harness.events.push('game');
    return { game: {}, lifecycle: {} };
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

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
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
  const browserWindow = {};

  return {
    shellRoot,
    document: document as unknown as Document,
    window: browserWindow as unknown as Window,
  };
}

function createRuntime(events: string[], shouldFail = false) {
  return {
    preload: async () => {
      events.push('preload:start');
      if (shouldFail) {
        const error = new Error('ASSET_MEDIA_HASH_MISMATCH: synthetic failure');
        throw error;
      }
      await Promise.resolve();
      events.push('preload:end');
      return Array.from({ length: 5 }, (_, index) => ({
        key: `test:key-${index}`,
      }));
    },
    unload: async () => undefined,
    snapshot: () => ({ state: 'loaded', count: 5, keys: [] }),
  };
}

async function loadBootstrapApp() {
  vi.resetModules();
  return import('./main');
}

describe('main asset bootstrap', () => {
  beforeEach(() => {
    harness.events.length = 0;
    harness.bridge = undefined;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preloads assets before readiness, probe installation, and Phaser creation', async () => {
    const roots = createRoots();
    const main = await loadBootstrapApp();
    vi.stubGlobal('document', roots.document);
    vi.stubGlobal('window', roots.window);
    const runtime = createRuntime(harness.events);
    const bootstrapApp = main.bootstrapApp as unknown as (
      overrides: Record<string, unknown>,
    ) => Promise<void>;

    await bootstrapApp({
      document: roots.document,
      window: roots.window,
      createAssetRuntime: (input: { profile: string; catalogUrl: string }) => {
        harness.events.push(
          'runtime:' + input.profile + ':' + input.catalogUrl,
        );
        return runtime;
      },
      installAssetRuntimeProbe: (profile: string, activeRuntime: unknown) => {
        harness.events.push(
          'probe:' + profile + ':' + String(activeRuntime === runtime),
        );
        return undefined;
      },
    });

    expect(harness.events).toEqual([
      'runtime:test:/assets/test/catalog.json',
      'shell',
      'preload:start',
      'preload:end',
      'probe:test:true',
      'game',
    ]);
    expect(roots.shellRoot.getAttribute('data-assets-ready')).toBe('true');
    expect(roots.shellRoot.getAttribute('data-assets-count')).toBe('5');
  });

  it('keeps the shell blocked and does not create Phaser on preload failure', async () => {
    const roots = createRoots();
    const main = await loadBootstrapApp();
    vi.stubGlobal('document', roots.document);
    vi.stubGlobal('window', roots.window);
    const runtime = createRuntime(harness.events, true);
    const bootstrapApp = main.bootstrapApp as unknown as (
      overrides: Record<string, unknown>,
    ) => Promise<void>;

    await bootstrapApp({
      document: roots.document,
      window: roots.window,
      createAssetRuntime: () => runtime,
    });

    expect(roots.shellRoot.getAttribute('data-assets-ready')).toBe('false');
    expect(roots.shellRoot.getAttribute('data-assets-count')).toBe('0');
    expect(harness.events).not.toContain('game');
    expect(harness.bridge?.getSnapshot().phase).toBe('error');
    expect(harness.bridge?.getSnapshot().message).toContain(
      'ASSET_MEDIA_HASH_MISMATCH',
    );
  });
});
