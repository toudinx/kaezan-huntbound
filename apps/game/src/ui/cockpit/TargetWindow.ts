import {
  COMBAT_ELEMENTS,
  type CombatElement,
} from '../../../../../packages/contracts/src/index.ts';
import type {
  CombatTargetDetails,
  CombatVitalsView,
} from '../../hunt/CombatViewModel';
import {
  assetFrameSignature,
  createAtlasFrame,
  type ResolveCockpitAsset,
} from './AssetFrame';

export interface TargetWindowState {
  readonly target: CombatVitalsView | null;
  readonly details: CombatTargetDetails | null;
}

export interface TargetWindowOptions {
  readonly resolveAsset?: ResolveCockpitAsset;
}

export interface TargetWindow {
  readonly element: HTMLElement;
  render(state: TargetWindowState): void;
  destroy(): void;
}

const ELEMENT_LABELS: Record<CombatElement, string> = {
  death: 'Death',
  earth: 'Earth',
  energy: 'Energy',
  fire: 'Fire',
  holy: 'Holy',
  ice: 'Ice',
  physical: 'Physical',
  poison: 'Poison',
};

function createElement(
  document: Document,
  tagName: string,
  testId: string,
): HTMLElement {
  const element = document.createElement(tagName);
  element.setAttribute('data-testid', testId);
  return element;
}

function formatBlueprintId(blueprintId: string): string {
  return blueprintId
    .split(/[-_]/u)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function formatPermille(permille: number): string {
  const percentage = permille / 10;
  const formatted = Number.isInteger(percentage)
    ? String(percentage)
    : percentage.toFixed(1);
  return `${percentage > 0 ? '+' : ''}${formatted}%`;
}

function updateBar(element: HTMLElement, value: number, maximum: number): void {
  element.setAttribute('role', 'progressbar');
  element.setAttribute('aria-label', 'Target health');
  element.setAttribute('aria-valuemin', '0');
  element.setAttribute('aria-valuemax', String(maximum));
  element.setAttribute('aria-valuenow', String(value));
  element.textContent = `${value}/${maximum}`;
}

export function mountTargetWindow(
  root: HTMLElement,
  options: TargetWindowOptions = {},
): TargetWindow {
  const document = root.ownerDocument;
  const element = createElement(document, 'section', 'combat-target');
  element.className = 'cockpit-panel cockpit-target';
  element.setAttribute('aria-label', 'Target status');

  const header = createElement(document, 'div', 'combat-target-header');
  const title = createElement(document, 'span', 'combat-target-title');
  title.textContent = 'Target';
  const targetName = createElement(document, 'strong', 'combat-target-name');
  header.append(title, targetName);

  const identity = createElement(document, 'div', 'combat-target-identity');
  const imageFrame = createElement(
    document,
    'div',
    'combat-target-image-frame',
  );
  const targetBlueprint = createElement(
    document,
    'span',
    'combat-target-blueprint',
  );
  const imageFallback = createElement(
    document,
    'span',
    'combat-target-image-fallback',
  );
  imageFallback.textContent = '—';
  imageFrame.append(imageFallback);
  identity.append(imageFrame, targetBlueprint);

  const targetHealth = createElement(document, 'div', 'combat-target-health');
  const resistances = createElement(
    document,
    'div',
    'combat-target-resistances',
  );
  const resistanceRows = new Map<CombatElement, HTMLElement>();
  for (const elementName of COMBAT_ELEMENTS) {
    const row = createElement(
      document,
      'div',
      `combat-target-resistance-${elementName}`,
    );
    resistanceRows.set(elementName, row);
    resistances.append(row);
  }
  element.append(header, identity, targetHealth, resistances);
  root.append(element);
  let identitySignature: string | undefined;
  let healthSignature: string | undefined;
  let visible: boolean | undefined;

  const render = (state: TargetWindowState): void => {
    const target = state.target;
    const details = state.details;
    const nextVisible = target !== null;
    if (visible !== nextVisible) {
      visible = nextVisible;
      element.setAttribute('data-visible', String(nextVisible));
    }
    const nextHealthSignature = `${target?.entityId ?? 'none'}:${target?.health ?? 0}:${target?.maxHealth ?? 0}`;
    if (healthSignature !== nextHealthSignature) {
      healthSignature = nextHealthSignature;
      updateBar(targetHealth, target?.health ?? 0, target?.maxHealth ?? 0);
    }

    const asset =
      details?.assetKey === null || details?.assetKey === undefined
        ? undefined
        : options.resolveAsset?.(details.assetKey);
    const nextIdentitySignature = [
      target?.entityId ?? 'none',
      details?.blueprintId ?? 'none',
      details?.displayName ?? 'none',
      details?.assetKey ?? 'none',
      assetFrameSignature(asset) || 'unresolved',
      ...(details?.resistances ?? []).map(
        (entry) => `${entry.element}:${entry.permille}`,
      ),
    ].join('|');
    if (identitySignature === nextIdentitySignature) return;
    identitySignature = nextIdentitySignature;

    targetName.textContent =
      target === null ? 'No target' : `Target #${target.entityId}`;
    targetBlueprint.textContent =
      target === null
        ? ''
        : (details?.displayName ??
          (details === null
            ? 'Unknown target'
            : formatBlueprintId(details.blueprintId)));

    imageFrame.replaceChildren();
    if (asset !== undefined && target !== null) {
      imageFrame.append(
        createAtlasFrame(document, asset, {
          imageClassName: 'combat-target-image',
          imageTestId: 'combat-target-image',
          alt: details?.displayName ?? 'Target',
        }),
      );
    } else {
      imageFrame.append(imageFallback);
    }

    const resistanceByElement = new Map(
      (details?.resistances ?? []).map((entry) => [entry.element, entry]),
    );
    for (const elementName of COMBAT_ELEMENTS) {
      const row = resistanceRows.get(elementName);
      if (row === undefined) continue;
      const resistance = resistanceByElement.get(elementName);
      row.textContent = `${ELEMENT_LABELS[elementName]}: ${
        resistance === undefined ? '—' : formatPermille(resistance.permille)
      }`;
    }
  };

  return {
    element,
    render,
    destroy: () => {
      element.remove();
    },
  };
}
