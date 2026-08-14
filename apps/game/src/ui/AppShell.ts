import type { SceneBridge } from '../bridge/SceneBridge';
import type { InputMap } from '../input/InputMap';
import type { ShellPhase, ShellSnapshot } from '../runtime/ShellSnapshot';
import { mountDpad } from './Dpad';

export interface AppShell {
  destroy(): void;
}

export interface AppShellOptions {
  readonly input?: InputMap;
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

  shell.setAttribute('aria-label', 'Huntbound shell');
  shell.setAttribute('data-testid', 'app-shell');
  header.setAttribute('aria-label', 'Shell status');
  viewportPanel.setAttribute('aria-label', 'Viewport');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('data-testid', 'shell-status');
  viewport.setAttribute('data-testid', 'shell-viewport');
  controls.setAttribute('data-testid', 'hunt-controls');

  header.append(status);
  viewportPanel.append(viewport);
  shell.append(header, viewportPanel, controls);
  root.replaceChildren(shell);

  const dpad = options.input ? mountDpad(controls, options.input) : undefined;

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
      root.replaceChildren();
    },
  };
}
