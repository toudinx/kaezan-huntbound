import {
  type CharacterEquipment,
  EQUIPMENT_SLOTS,
  type RunBagEntry,
} from '../../../../packages/contracts/src/index.ts';
import type { SaveInventoryState, SaveStateSource } from '../save/SaveState';

export interface InventoryPanel {
  destroy(): void;
}

export interface InventoryPanelOptions {
  readonly source: SaveStateSource;
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

export function mountInventoryPanel(
  root: HTMLElement,
  options: InventoryPanelOptions,
): InventoryPanel {
  const document = root.ownerDocument;
  const panel = createElement(document, 'section', 'save-inventory-panel');
  panel.setAttribute('aria-label', 'Inventory');

  const status = createElement(document, 'p', 'save-status');
  status.setAttribute('aria-live', 'polite');
  const runBag = createElement(document, 'div', 'save-run-bag');
  const runBagEmpty = createElement(document, 'p', 'save-run-bag-empty');
  runBagEmpty.textContent = 'Run bag empty';
  const stash = createElement(document, 'div', 'save-stash');
  const stashEmpty = createElement(document, 'p', 'save-stash-empty');
  stashEmpty.textContent = 'Stash empty';
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
    runBag,
    runBagEmpty,
    stash,
    stashEmpty,
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
    renderEntries(runBag, runBagEmpty, state.bag);
    renderEntries(stash, stashEmpty, state.stash);
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
