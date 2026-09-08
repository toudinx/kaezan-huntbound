import {
  HELPER_MODULE_LABELS,
  HELPER_MODULES,
  HELPER_MODULES_OFF,
  type HelperLogEntry,
  type HelperModule,
  type HelperModuleFlags,
  type HelperReport,
} from '../../hunt/HuntHelper';

/**
 * The helper's switchboard and its feed, in one rail panel.
 *
 * The switches are checkboxes rather than a single "helper on" toggle because
 * the ADR-05 permission is four modules, not a mode: the player who wants it
 * to heal while they pick their own fights has to be able to say exactly that.
 *
 * The feed is the other half of the task. It carries three kinds of line and
 * they are told apart by `data-kind`, not by wording: what the helper did, what
 * it refused and why, and what the fight paid. A refusal is written here rather
 * than worked around, which is the whole reason the helper issues ordinary
 * player commands.
 */
export interface HelperPanel {
  readonly element: HTMLElement;
  render(report: HelperReport): void;
  destroy(): void;
}

export interface HelperPanelOptions {
  /** Absent means the panel is a readout: the switches render disabled. */
  readonly onModuleChange?: (module: HelperModule, enabled: boolean) => void;
}

function createElement(
  document: Document,
  tagName: string,
  testId: string,
): HTMLElement {
  const element = document.createElement(tagName);
  element.setAttribute('data-testid', testId);
  return element;
}

function logSignature(log: readonly HelperLogEntry[]): string {
  return log
    .map(
      (entry) =>
        `${String(entry.tick)}:${entry.module}:${entry.kind}:${entry.message}`,
    )
    .join('|');
}

export function mountHelperPanel(
  root: HTMLElement,
  options: HelperPanelOptions = {},
): HelperPanel {
  const document = root.ownerDocument;
  const element = createElement(document, 'section', 'combat-helper');
  element.className = 'cockpit-panel combat-helper';
  element.setAttribute('aria-label', 'Helper');

  const header = createElement(document, 'div', 'combat-helper-header');
  header.className = 'combat-helper__header';
  header.textContent = 'Helper';

  const switches = createElement(document, 'div', 'combat-helper-modules');
  switches.className = 'combat-helper__modules';

  const inputs = new Map<HelperModule, HTMLInputElement>();
  const labels = new Map<HelperModule, HTMLElement>();
  const listeners: (() => void)[] = [];
  /**
   * The switches are controlled by the report, never by the click. The scene
   * owns the helper, so a click is a request; it is the report coming back that
   * moves the box. A request nobody is listening to therefore snaps back
   * instead of lying about a module that is not running.
   */
  let shownModules: HelperModuleFlags = HELPER_MODULES_OFF;

  for (const module of HELPER_MODULES) {
    const label = document.createElement('label');
    label.className = 'combat-helper__module';
    label.setAttribute('data-testid', `combat-helper-module-${module}`);
    label.setAttribute('data-module', module);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('data-testid', `combat-helper-toggle-${module}`);
    input.setAttribute('aria-label', `${HELPER_MODULE_LABELS[module]} module`);
    input.disabled = options.onModuleChange === undefined;
    const text = document.createElement('span');
    text.textContent = HELPER_MODULE_LABELS[module];
    label.append(input, text);
    switches.append(label);
    inputs.set(module, input);
    labels.set(module, label);

    const onChange = (): void => {
      const requested = input.checked;
      input.checked = shownModules[module];
      options.onModuleChange?.(module, requested);
    };
    input.addEventListener('change', onChange);
    listeners.push(() => {
      input.removeEventListener('change', onChange);
    });
  }

  const feed = createElement(document, 'ul', 'combat-helper-feed');
  feed.className = 'combat-helper__feed';
  feed.setAttribute('aria-label', 'Helper activity');
  feed.setAttribute('aria-live', 'polite');

  element.append(header, switches, feed);
  root.append(element);

  let renderedFeed: string | undefined;

  const render = (report: HelperReport): void => {
    shownModules = report.modules;
    const held = new Set(report.held);
    for (const module of HELPER_MODULES) {
      const input = inputs.get(module);
      const label = labels.get(module);
      if (input === undefined || label === undefined) continue;
      if (input.checked !== report.modules[module]) {
        input.checked = report.modules[module];
      }
      label.setAttribute('data-enabled', String(report.modules[module]));
      // Standing down for a manual action is a state the player should be able
      // to see, or "the helper stopped" reads as "the helper broke".
      label.setAttribute(
        'data-held',
        String(report.modules[module] && held.has(module)),
      );
    }

    const signature = logSignature(report.log);
    if (signature === renderedFeed) return;
    renderedFeed = signature;

    // Newest first: the line the player is looking for is the one that just
    // happened, and the panel is short.
    feed.replaceChildren(
      ...[...report.log].reverse().map((entry, index) => {
        const item = createElement(
          document,
          'li',
          `combat-helper-feed-entry-${String(index)}`,
        );
        item.className = 'combat-helper__entry';
        item.setAttribute('data-module', entry.module);
        item.setAttribute('data-kind', entry.kind);
        item.setAttribute('data-tick', String(entry.tick));
        item.textContent = `${HELPER_MODULE_LABELS[entry.module]}: ${entry.message}`;
        return item;
      }),
    );
  };

  return {
    element,
    render,
    destroy: () => {
      for (const off of listeners) off();
      element.remove();
    },
  };
}
