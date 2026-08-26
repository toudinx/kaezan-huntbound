import type { RunBagEntry } from '../../../../../packages/contracts/src/index.ts';

export interface HuntBagOptions {
  readonly resolveAsset?: (
    key: string,
  ) => { readonly mediaUrl: string } | undefined;
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

  const render = (entries: readonly RunBagEntry[]): void => {
    const signature = entries
      .map((entry) => {
        const resolved = options.resolveAsset?.(entry.itemKey);
        return `${entry.itemKey}:${entry.count}:${resolved?.mediaUrl ?? ''}`;
      })
      .join('|');
    if (signature === renderedSignature) return;
    renderedSignature = signature;

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

      slot.setAttribute('data-item-key', entry.itemKey);
      const asset = options.resolveAsset?.(entry.itemKey);
      if (asset === undefined) {
        const label = createElement(
          document,
          'span',
          `combat-bag-slot-label-${index}`,
        );
        label.textContent = `${labelFromItemKey(entry.itemKey)} × ${entry.count}`;
        slot.append(label);
      } else {
        const image = createElement(
          document,
          'img',
          `combat-bag-slot-image-${index}`,
        ) as HTMLImageElement;
        image.setAttribute('src', asset.mediaUrl);
        image.setAttribute('alt', labelFromItemKey(entry.itemKey));
        image.setAttribute('draggable', 'false');
        const accessibleLabel = createElement(
          document,
          'span',
          `combat-bag-slot-accessible-label-${index}`,
        );
        accessibleLabel.className = 'combat-bag-slot-accessible-label';
        accessibleLabel.textContent = `${rawLabelFromItemKey(entry.itemKey)} × ${entry.count}`;
        slot.append(image, accessibleLabel);
      }

      const count = createElement(
        document,
        'span',
        `combat-bag-slot-count-${index}`,
      );
      count.textContent = String(entry.count);
      slot.append(count);
      slots.push(slot);
    }
    grid.replaceChildren(...slots);
    element.setAttribute('data-slot-count', String(slotCount));
  };

  return {
    element,
    render,
    destroy: () => {
      element.remove();
    },
  };
}
