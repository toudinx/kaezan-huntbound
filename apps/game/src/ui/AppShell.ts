import type { SceneBridge } from '../bridge/SceneBridge';
import {
  type CombatViewModel,
  createDefaultCombatViewModel,
} from '../hunt/CombatViewModel';
import type { InputMap } from '../input/InputMap';
import type { ShellPhase, ShellSnapshot } from '../runtime/ShellSnapshot';
import type { SaveStateSource } from '../save/SaveState';
import {
  type CombatHud,
  type CombatHudOptions,
  mountCombatHud,
} from './CombatHud';
import { type Cockpit, mountCockpit } from './cockpit/CockpitLayout';
import { mountDpad } from './Dpad';
import {
  type InventoryPanel,
  type InventoryPanelOptions,
  mountInventoryPanel,
} from './InventoryPanel';
import { createRateMeter } from './RateMeter';

export interface AppShell {
  destroy(): void;
}

export interface AppShellOptions {
  readonly input?: InputMap;
  /** Injected so the readout can be driven by hand in tests. */
  readonly frameRate?: {
    readonly now: () => number;
    readonly scheduleFrame: (callback: () => void) => number;
    readonly cancelFrame: (handle: number) => void;
  };
  readonly combat?: {
    readonly viewModel: CombatViewModel;
    readonly onRestart?: () => void;
    readonly onLeave?: () => void;
    readonly region?: CombatHudOptions['region'];
    readonly transitions?: CombatHudOptions['transitions'];
    readonly playerStart?: CombatHudOptions['playerStart'];
    readonly resolveAsset?: CombatHudOptions['resolveAsset'];
    readonly preparedHunt?: CombatHudOptions['preparedHunt'];
  };
  readonly save?: {
    readonly source: SaveStateSource;
    readonly getSaleOffer?: InventoryPanelOptions['getSaleOffer'];
    readonly onSell?: InventoryPanelOptions['onSell'];
    readonly confirmProtectedSale?: InventoryPanelOptions['confirmProtectedSale'];
    readonly onExport?: InventoryPanelOptions['onExport'];
    readonly confirmImport?: InventoryPanelOptions['confirmImport'];
    readonly onImport?: InventoryPanelOptions['onImport'];
  };
}

const phaseLabels: Record<ShellPhase, string> = {
  hunting: 'Choose a hunting place',
  booting: 'Booting renderer',
  ready: 'Shell ready',
  paused: 'Presentation paused',
  error: 'Renderer unavailable',
};

/**
 * The renderer and the simulation are separate clocks: Phaser draws on
 * `requestAnimationFrame` while the kernel advances in fixed `TICK_DURATION_MS`
 * steps with the scene interpolating between them. One number would hide which
 * of the two is behind, so both are shown.
 */
function formatFrameRate(
  framesPerSecond: number | undefined,
  ticksPerSecond: number | undefined,
): string {
  const show = (rate: number | undefined) =>
    rate === undefined ? '--' : String(Math.round(rate));

  return `${show(framesPerSecond)} fps · ${show(ticksPerSecond)} tps`;
}

function formatViewport(snapshot: ShellSnapshot): string {
  const { width, height, devicePixelRatio } = snapshot.viewport;

  return `${width} × ${height} · ${devicePixelRatio.toFixed(2)} DPR`;
}

export function mountAppShell(
  root: HTMLElement,
  bridge: SceneBridge,
  options: AppShellOptions = {},
): AppShell {
  const document = root.ownerDocument;
  const shell = document.createElement('section');
  const header = document.createElement('header');
  const viewportPanel = document.createElement('aside');
  const status = document.createElement('p');
  const viewport = document.createElement('p');
  const frameRate = document.createElement('p');
  const controls = document.createElement('div');
  const combatRoot = document.createElement('div');
  const inventoryRoot = document.createElement('div');

  shell.setAttribute('aria-label', 'Huntbound shell');
  shell.setAttribute('data-testid', 'app-shell');
  header.setAttribute('aria-label', 'Shell status');
  viewportPanel.setAttribute('aria-label', 'Viewport');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('data-testid', 'shell-status');
  viewport.setAttribute('data-testid', 'shell-viewport');
  frameRate.setAttribute('data-testid', 'shell-frame-rate');
  controls.setAttribute('data-testid', 'hunt-controls');
  combatRoot.setAttribute('data-testid', 'combat-root');
  inventoryRoot.setAttribute('data-testid', 'save-inventory-root');

  header.append(status);
  viewportPanel.append(viewport, frameRate);
  root.replaceChildren(shell);

  /**
   * The five panels used to be absolutely positioned siblings, each pinned to a
   * corner it had picked for itself. They are bands of one frame now: the top
   * band carries the readouts and the save strip, the bottom-left corner of the
   * deck band carries the d-pad, and `combatRoot` overlays the whole frame so
   * the combat surfaces can inherit its measures.
   */
  const cockpit: Cockpit = mountCockpit(shell);
  cockpit.top.append(header, viewportPanel, inventoryRoot);
  cockpit.movement.append(controls);
  cockpit.element.append(combatRoot);

  const dpad = options.input ? mountDpad(controls, options.input) : undefined;
  const combatViewModel =
    options.combat?.viewModel ??
    (options.input === undefined ? undefined : createDefaultCombatViewModel());
  let combatHud: CombatHud | undefined;
  let unsubscribeCombatEvents: (() => void) | undefined;
  let unsubscribeCombatTick: (() => void) | undefined;
  let unsubscribeTargetSelection: (() => void) | undefined;
  let inventoryPanel: InventoryPanel | undefined;

  if (options.save !== undefined) {
    const inventoryOptions = {
      source: options.save.source,
      ...(options.save.getSaleOffer === undefined
        ? {}
        : { getSaleOffer: options.save.getSaleOffer }),
      ...(options.save.onSell === undefined
        ? {}
        : { onSell: options.save.onSell }),
      ...(options.save.confirmProtectedSale === undefined
        ? {}
        : { confirmProtectedSale: options.save.confirmProtectedSale }),
      ...(options.save.onExport === undefined
        ? {}
        : { onExport: options.save.onExport }),
      ...(options.save.confirmImport === undefined
        ? {}
        : { confirmImport: options.save.confirmImport }),
      ...(options.save.onImport === undefined
        ? {}
        : { onImport: options.save.onImport }),
    } satisfies InventoryPanelOptions;
    inventoryPanel = mountInventoryPanel(inventoryRoot, inventoryOptions);
  }

  if (combatViewModel !== undefined) {
    const combatHudOptions: CombatHudOptions = {
      onRestart: () => {
        // The projection is cleared before the shell is told, because the
        // shell reattaches the run and reads the bag through this view model:
        // told first, it would reattach carrying the dead run's loot.
        combatViewModel.reset();
        combatHud?.render(combatViewModel.snapshot());
        options.combat?.onRestart?.();
        bridge.requestRestart();
      },
      ...(options.combat?.onLeave === undefined
        ? {}
        : { onLeave: options.combat.onLeave }),
      ...(options.combat?.region === undefined
        ? {}
        : { region: options.combat.region }),
      ...(options.combat?.transitions === undefined
        ? {}
        : { transitions: options.combat.transitions }),
      ...(options.combat?.playerStart === undefined
        ? {}
        : { playerStart: options.combat.playerStart }),
      ...(options.combat?.resolveAsset === undefined
        ? {}
        : { resolveAsset: options.combat.resolveAsset }),
      ...(options.combat?.preparedHunt === undefined
        ? {}
        : { preparedHunt: options.combat.preparedHunt }),
    };
    combatHud = mountCombatHud(combatRoot, combatHudOptions);
    combatHud.render(combatViewModel.snapshot());
    unsubscribeCombatEvents = bridge.subscribeEvents((events) => {
      combatViewModel.handle(events);
      combatHud?.render(combatViewModel.snapshot());
    });
    unsubscribeCombatTick = bridge.subscribeTick((tick) => {
      combatViewModel.setTick(tick);
      combatHud?.render(combatViewModel.snapshot());
    });
    unsubscribeTargetSelection = bridge.subscribeTargetSelected((entityId) => {
      combatViewModel.setTarget(entityId);
      combatHud?.render(combatViewModel.snapshot());
    });
  }

  const clock = options.frameRate ?? {
    now: () => performance.now(),
    scheduleFrame: (callback: () => void) =>
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(() => callback())
        : 0,
    cancelFrame: (handle: number) => {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(handle);
      }
    },
  };
  const frameMeter = createRateMeter();
  const tickMeter = createRateMeter();
  let seenFirstTick = false;
  let lastReadoutMs: number | undefined;
  let frameHandle: number | undefined;

  frameRate.textContent = formatFrameRate(undefined, undefined);

  /**
   * The scene calls `publishTick` every frame, but the bridge only forwards a
   * tick whose value actually changed, so each call here is one simulation
   * step. `subscribeTick` does replay the current tick to a new subscriber
   * though, and that replay is not a step -- counting it would report a rate
   * off two samples that never happened.
   */
  const unsubscribeTickRate = bridge.subscribeTick(() => {
    if (!seenFirstTick) {
      seenFirstTick = true;
      return;
    }

    tickMeter.mark(clock.now());
  });

  const sampleFrame = () => {
    const nowMs = clock.now();
    frameMeter.mark(nowMs);

    // Four refreshes a second: enough to read, too few to thrash layout.
    if (lastReadoutMs === undefined || nowMs - lastReadoutMs >= 250) {
      lastReadoutMs = nowMs;
      frameRate.textContent = formatFrameRate(
        frameMeter.rate(nowMs),
        tickMeter.rate(nowMs),
      );
    }

    frameHandle = clock.scheduleFrame(sampleFrame);
  };

  frameHandle = clock.scheduleFrame(sampleFrame);

  const unsubscribe = bridge.subscribe((snapshot) => {
    shell.setAttribute('data-shell-phase', snapshot.phase);
    shell.setAttribute('data-shell-ready', String(snapshot.phase === 'ready'));
    status.textContent = `${phaseLabels[snapshot.phase]}: ${snapshot.message}`;
    viewport.textContent = formatViewport(snapshot);
  });

  let destroyed = false;

  return {
    destroy: () => {
      if (destroyed) {
        return;
      }

      destroyed = true;

      if (frameHandle !== undefined) {
        clock.cancelFrame(frameHandle);
      }

      unsubscribeTickRate();
      unsubscribe();
      dpad?.destroy();
      cockpit.destroy();
      unsubscribeCombatEvents?.();
      unsubscribeCombatTick?.();
      unsubscribeTargetSelection?.();
      combatHud?.destroy();
      inventoryPanel?.destroy();
      root.replaceChildren();
    },
  };
}
