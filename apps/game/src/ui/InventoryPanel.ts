import {
  type CharacterEquipment,
  EQUIPMENT_SLOTS,
  type RunBagEntry,
} from '../../../../packages/contracts/src/index.ts';
import type { SaveInventoryState, SaveStateSource } from '../save/SaveState';

export interface InventoryPanel {
  destroy(): void;
}

export interface InventorySaleOffer {
  readonly displayName: string;
  readonly unitPrice: number;
  readonly protected: boolean;
}

export interface InventoryPanelOptions {
  readonly source: SaveStateSource;
  readonly getSaleOffer?: (
    itemKey: string,
  ) => InventorySaleOffer | undefined;
  readonly onSell?: (
    itemKey: string,
    quantity: number,
    allowProtected: boolean,
  ) => void | Promise<unknown>;
  readonly confirmProtectedSale?: (
    offer: InventorySaleOffer,
    quantity: number,
  ) => boolean;
  readonly onExport?: () => void | Promise<void>;
  readonly confirmImport?: () => boolean;
  readonly onImport?: () => void | Promise<void>;
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

function formatItemKey(itemKey: string): string {
  return itemKey.split(':').at(-1) ?? itemKey;
}

function compareItemKeys(left: RunBagEntry, right: RunBagEntry): number {
  return left.itemKey === right.itemKey
    ? 0
    : left.itemKey < right.itemKey
      ? -1
      : 1;
}

function formatEntries(entries: readonly RunBagEntry[]): string {
  return [...entries]
    .sort(compareItemKeys)
    .map((entry) => `${formatItemKey(entry.itemKey)} × ${entry.count}`)
    .join(' | ');
}

/**
 * What the character is wearing, read-only.
 *
 * The panel is the in-hunt one and gear is chosen in the atlas, so this is a
 * reminder rather than a control: the kernel was built from this set when the
 * run started and nothing during the run can move it.
 */
function formatEquipment(equipment: CharacterEquipment): string {
  const worn = EQUIPMENT_SLOTS.flatMap((slot) => {
    const itemKey = equipment[slot];
    return itemKey === null ? [] : [`${slot}: ${formatItemKey(itemKey)}`];
  });
  return worn.length === 0 ? 'Nothing equipped' : worn.join(' | ');
}

function renderEntries(
  list: HTMLElement,
  empty: HTMLElement,
  entries: readonly RunBagEntry[],
): void {
  list.textContent = formatEntries(entries);
  empty.setAttribute('data-visible', String(entries.length === 0));
}

function renderSales(
  list: HTMLElement,
  empty: HTMLElement,
  entries: readonly RunBagEntry[],
  options: InventoryPanelOptions,
  status: SaveInventoryState['status'],
): void {
  const document = list.ownerDocument;
  list.replaceChildren();
  const canSell =
    options.getSaleOffer !== undefined && options.onSell !== undefined;
  empty.setAttribute(
    'data-visible',
    String(!canSell || entries.length === 0),
  );
  if (
    !canSell ||
    options.getSaleOffer === undefined ||
    options.onSell === undefined
  ) {
    return;
  }

  for (const entry of entries) {
    const row = createElement(document, 'div', 'save-sale-entry');
    row.setAttribute('data-item-key', entry.itemKey);
    const offer = options.getSaleOffer(entry.itemKey);
    const label = createElement(document, 'span', 'save-sale-label');
    label.textContent = formatItemKey(entry.itemKey);
    row.append(label);

    if (offer === undefined) {
      const unavailable = createElement(
        document,
        'span',
        'save-sale-unavailable',
      );
      unavailable.textContent = 'Not for sale';
      row.append(unavailable);
      list.append(row);
      continue;
    }

    const quote = createElement(document, 'span', 'save-sale-quote');
    quote.textContent = `${offer.displayName} · ${offer.unitPrice} gold each`;
    row.append(quote);

    if (offer.protected) {
      const protection = createElement(
        document,
        'span',
        'save-sale-protected',
      );
      protection.textContent = 'Collection piece — confirmation required';
      row.append(protection);
    }

    const quantity = createElement(
      document,
      'input',
      'save-sale-quantity',
    ) as HTMLInputElement;
    quantity.type = 'number';
    quantity.value = String(entry.count);
    quantity.setAttribute('min', '1');
    quantity.setAttribute('max', String(entry.count));
    quantity.setAttribute('inputmode', 'numeric');
    quantity.setAttribute(
      'aria-label',
      `Quantity of ${offer.displayName} to sell`,
    );

    const sellButton = createElement(
      document,
      'button',
      'save-sell',
    ) as HTMLButtonElement;
    sellButton.type = 'button';
    sellButton.textContent = 'Sell';
    sellButton.disabled = status !== 'ready';
    const onSell = (): void => {
      const requested = Number(quantity.value);
      if (!Number.isSafeInteger(requested) || requested <= 0) return;
      if (
        offer.protected &&
        (options.confirmProtectedSale === undefined ||
          !options.confirmProtectedSale(offer, requested))
      ) {
        return;
      }
      void options.onSell?.(entry.itemKey, requested, offer.protected);
    };
    sellButton.addEventListener('click', onSell);
    row.append(quantity, sellButton);
    list.append(row);
  }
}

export function mountInventoryPanel(
  root: HTMLElement,
  options: InventoryPanelOptions,
): InventoryPanel {
  const document = root.ownerDocument;
  const panel = createElement(document, 'section', 'save-inventory-panel');
  panel.setAttribute('aria-label', 'Inventory');

  const status = createElement(document, 'p', 'save-status');
  status.setAttribute('aria-live', 'polite');
  const gold = createElement(document, 'p', 'save-gold');
  const runBag = createElement(document, 'div', 'save-run-bag');
  const runBagEmpty = createElement(document, 'p', 'save-run-bag-empty');
  runBagEmpty.textContent = 'Run bag empty';
  const stash = createElement(document, 'div', 'save-stash');
  const stashEmpty = createElement(document, 'p', 'save-stash-empty');
  stashEmpty.textContent = 'Stash empty';
  const sales = createElement(document, 'div', 'save-sales');
  const salesEmpty = createElement(document, 'p', 'save-sales-empty');
  salesEmpty.textContent = 'No sellable stash items';
  const salesEnabled =
    options.getSaleOffer !== undefined && options.onSell !== undefined;
  const equipment = createElement(document, 'p', 'save-equipment');
  const completedRuns = createElement(document, 'p', 'save-completed-runs');
  const exportButton = createElement(
    document,
    'button',
    'save-export',
  ) as HTMLButtonElement;
  exportButton.type = 'button';
  exportButton.textContent = 'Export save';
  const importButton = createElement(
    document,
    'button',
    'save-import',
  ) as HTMLButtonElement;
  importButton.type = 'button';
  importButton.textContent = 'Import save';

  panel.append(
    status,
    gold,
    runBag,
    runBagEmpty,
    stash,
    stashEmpty,
    ...(salesEnabled ? [sales, salesEmpty] : []),
    equipment,
    completedRuns,
    exportButton,
    importButton,
  );
  root.replaceChildren(panel);

  const onExport = (): void => {
    void options.onExport?.();
  };
  const onImport = (): void => {
    if (options.confirmImport !== undefined && !options.confirmImport()) {
      return;
    }
    void options.onImport?.();
  };
  exportButton.addEventListener('click', onExport);
  importButton.addEventListener('click', onImport);

  const render = (state: SaveInventoryState): void => {
    status.textContent = state.message;
    status.setAttribute('data-status', state.status);
    gold.textContent = `Gold: ${state.gold}`;
    renderEntries(runBag, runBagEmpty, state.bag);
    renderEntries(stash, stashEmpty, state.stash);
    if (salesEnabled) {
      renderSales(sales, salesEmpty, state.stash, options, state.status);
    }
    equipment.textContent = formatEquipment(state.character.equipment);
    completedRuns.textContent = `Completed runs: ${state.completedRuns}`;
  };

  render(options.source.getState());
  const unsubscribe = options.source.subscribe(render);
  let destroyed = false;

  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      exportButton.removeEventListener('click', onExport);
      importButton.removeEventListener('click', onImport);
      root.replaceChildren();
    },
  };
}
