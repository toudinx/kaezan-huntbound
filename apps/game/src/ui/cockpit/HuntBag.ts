import type { RunBagEntry } from '../../../../../packages/contracts/src/index.ts';
import {
  assetFrameSignature,
  createAtlasFrame,
  type ResolveCockpitAsset,
} from './AssetFrame';

export interface HuntBagOptions {
  readonly resolveAsset?: ResolveCockpitAsset;
}

export interface HuntBag {
  readonly element: HTMLElement;
  render(entries: readonly RunBagEntry[]): void;
  destroy(): void;
}

/** Three columns by four visible rows; extra entries stay reachable by scroll. */
export const HUNT_BAG_VISIBLE_SLOT_COUNT = 12;

function createElement(
  document: Document,
  tagName: string,
  testId: string,
): HTMLElement {
  const element = document.createElement(tagName);
  element.setAttribute('data-testid', testId);
  return element;
}

function labelFromItemKey(itemKey: string): string {
  return (itemKey.split(':').at(-1) ?? itemKey).replaceAll('-', ' ');
}

function rawLabelFromItemKey(itemKey: string): string {
  return itemKey.split(':').at(-1) ?? itemKey;
}

function entryCounts(entries: readonly RunBagEntry[]): Map<string, number> {
  return new Map(entries.map((entry) => [entry.itemKey, entry.count]));
}

export function mountHuntBag(
  root: HTMLElement,
  options: HuntBagOptions = {},
): HuntBag {
  const document = root.ownerDocument;
  const element = createElement(document, 'div', 'combat-run-bag');
  element.className = 'combat-run-bag';
  const header = createElement(document, 'div', 'combat-bag-header');
  header.textContent = 'Hunt bag';
  const grid = createElement(document, 'div', 'combat-bag-grid');
  grid.setAttribute('aria-label', 'Hunt bag contents');
  element.append(header, grid);
  root.append(element);
  let renderedSignature: string | undefined;
  let previousCounts = new Map<string, number>();
  let hasRendered = false;

  const render = (entries: readonly RunBagEntry[]): void => {
    const signature = entries
      .map((entry) => {
        const resolved = options.resolveAsset?.(entry.itemKey);
        return `${entry.itemKey}:${entry.count}:${assetFrameSignature(resolved)}`;
      })
      .join('|');
    if (signature === renderedSignature) return;
    renderedSignature = signature;

    const nextCounts = entryCounts(entries);
    const slotCount = Math.max(HUNT_BAG_VISIBLE_SLOT_COUNT, entries.length);
    const slots: HTMLElement[] = [];
    for (let index = 0; index < slotCount; index += 1) {
      const entry = entries[index];
      const slot = createElement(document, 'div', `combat-bag-slot-${index}`);
      slot.className = 'combat-bag-slot';
      if (entry === undefined) {
        slot.setAttribute('data-empty', 'true');
        slots.push(slot);
        continue;
      }

      const itemName = labelFromItemKey(entry.itemKey);
      const entering =
        hasRendered && entry.count > (previousCounts.get(entry.itemKey) ?? 0);
      slot.setAttribute('data-item-key', entry.itemKey);
      slot.setAttribute('data-item-name', itemName);
      slot.setAttribute('data-item-count', String(entry.count));
      slot.setAttribute('role', 'img');
      slot.setAttribute('tabindex', '0');
      slot.setAttribute('aria-label', `${itemName} × ${entry.count}`);
      slot.setAttribute('title', `${itemName} × ${entry.count}`);
      if (entering) slot.setAttribute('data-entering', 'true');
      const asset = options.resolveAsset?.(entry.itemKey);
      if (asset === undefined) {
        const label = createElement(
          document,
          'span',
          `combat-bag-slot-label-${index}`,
        );
        label.className = 'combat-bag-slot-fallback-label';
        label.textContent = `${labelFromItemKey(entry.itemKey)} × ${entry.count}`;
        slot.append(label);
      } else {
        const imageFrame = createAtlasFrame(document, asset, {
          imageClassName: 'combat-bag-slot-image',
          imageTestId: `combat-bag-slot-image-${index}`,
          alt: labelFromItemKey(entry.itemKey),
        });
        const name = createElement(
          document,
          'span',
          `combat-bag-slot-name-${index}`,
        );
        name.className = 'combat-bag-slot-name';
        name.setAttribute('aria-hidden', 'true');
        name.textContent = itemName;
        const accessibleLabel = createElement(
          document,
          'span',
          `combat-bag-slot-accessible-label-${index}`,
        );
        accessibleLabel.className = 'combat-bag-slot-accessible-label';
        accessibleLabel.textContent = `${rawLabelFromItemKey(entry.itemKey)} × ${entry.count}`;
        slot.append(imageFrame, name, accessibleLabel);
      }

      const count = createElement(
        document,
        'span',
        `combat-bag-slot-count-${index}`,
      );
      count.className = 'combat-bag-slot-count';
      count.setAttribute('aria-hidden', 'true');
      count.setAttribute('data-count', String(entry.count));
      count.textContent = `× ${entry.count}`;
      slot.append(count);
      slots.push(slot);
    }
    grid.replaceChildren(...slots);
    element.setAttribute('data-slot-count', String(slotCount));
    previousCounts = nextCounts;
    hasRendered = true;
  };

  return {
    element,
    render,
    destroy: () => {
      element.remove();
    },
  };
}
