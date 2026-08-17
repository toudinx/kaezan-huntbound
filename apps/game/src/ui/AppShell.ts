import type { SceneBridge } from '../bridge/SceneBridge';
import {
  type CombatViewModel,
  createDefaultCombatViewModel,
} from '../hunt/CombatViewModel';
import type { InputMap } from '../input/InputMap';
import type { ShellPhase, ShellSnapshot } from '../runtime/ShellSnapshot';
import { type CombatHud, mountCombatHud } from './CombatHud';
import { mountDpad } from './Dpad';

export interface AppShell {
  destroy(): void;
}

export interface AppShellOptions {
  readonly input?: InputMap;
  readonly combat?: {
    readonly viewModel: CombatViewModel;
    readonly onRestart?: () => void;
  };
}

const phaseLabels: Record<ShellPhase, string> = {
  booting: 'Booting renderer',
  ready: 'Shell ready',
  paused: 'Presentation paused',
  error: 'Renderer unavailable',
};

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
  const controls = document.createElement('div');
  const combatRoot = document.createElement('div');

  shell.setAttribute('aria-label', 'Huntbound shell');
  shell.setAttribute('data-testid', 'app-shell');
  header.setAttribute('aria-label', 'Shell status');
  viewportPanel.setAttribute('aria-label', 'Viewport');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('data-testid', 'shell-status');
  viewport.setAttribute('data-testid', 'shell-viewport');
  controls.setAttribute('data-testid', 'hunt-controls');
  combatRoot.setAttribute('data-testid', 'combat-root');

  header.append(status);
  viewportPanel.append(viewport);
  shell.append(header, viewportPanel, controls, combatRoot);
  root.replaceChildren(shell);

  const dpad = options.input ? mountDpad(controls, options.input) : undefined;
  const combatViewModel =
    options.combat?.viewModel ??
    (options.input === undefined ? undefined : createDefaultCombatViewModel());
  let combatHud: CombatHud | undefined;
  let unsubscribeCombatEvents: (() => void) | undefined;
  let unsubscribeCombatTick: (() => void) | undefined;
  let unsubscribeTargetSelection: (() => void) | undefined;

  if (combatViewModel !== undefined) {
    combatHud = mountCombatHud(combatRoot, {
      onRestart: () => {
        combatViewModel.reset();
        combatHud?.render(combatViewModel.snapshot());
        options.combat?.onRestart?.();
        bridge.requestRestart();
      },
    });
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
      unsubscribe();
      dpad?.destroy();
      unsubscribeCombatEvents?.();
      unsubscribeCombatTick?.();
      unsubscribeTargetSelection?.();
      combatHud?.destroy();
      root.replaceChildren();
    },
  };
}
