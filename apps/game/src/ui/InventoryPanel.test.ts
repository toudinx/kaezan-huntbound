import { describe, expect, it } from 'vitest';

import {
  type AchievementProgress,
  type BestiaryProgress,
  type CharacterProgress,
  createEmptyCharacterProgress,
} from '../../../../packages/contracts/src/index.ts';
import { mountInventoryPanel } from './InventoryPanel';

interface TestInventoryState {
  readonly status: 'loading' | 'ready' | 'saving' | 'error';
  readonly message: string;
  readonly bag: readonly { readonly itemKey: string; readonly count: number }[];
  readonly stash: readonly {
    readonly itemKey: string;
    readonly count: number;
  }[];
  readonly gold: number;
  readonly nextHuntBuff: 'none';
  readonly completedRuns: number;
  readonly activeVocationKey: string;
  readonly characters: readonly CharacterProgress[];
  readonly bestiary: readonly BestiaryProgress[];
  readonly achievements: readonly AchievementProgress[];
  readonly character: CharacterProgress;
}

class TestElement {
  readonly children: TestElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Set<() => void>>();
  textContent = '';
  disabled = false;
  type = '';
  value = '';

  constructor(
    readonly tagName: string,
    readonly ownerDocument: TestDocument,
  ) {}

  append(...children: TestElement[]): void {
    this.children.push(...children);
  }

  replaceChildren(...children: TestElement[]): void {
    this.children.splice(0, this.children.length, ...children);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type: string, listener: () => void): void {
    const listeners = this.listeners.get(type) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

class TestDocument {
  createElement(tagName: string): TestElement {
    return new TestElement(tagName, this);
  }
}

function findByTestId(root: TestElement, testId: string): TestElement {
  const visit = (element: TestElement): TestElement | undefined => {
    if (element.getAttribute('data-testid') === testId) return element;
    for (const child of element.children) {
      const result = visit(child);
      if (result) return result;
    }
    return undefined;
  };

  const result = visit(root);
  if (result) return result;
  throw new Error(`Missing ${testId}`);
}

/**
 * The bag and the stash are a row per entry, so the label lives on the children
 * and not on the container the test id sits on.
 */
function entriesOf(root: TestElement, testId: string): string {
  return findByTestId(root, testId)
    .children.map((child) => child.textContent)
    .join(' | ');
}

function source(initial: TestInventoryState) {
  let current = initial;
  const listeners = new Set<(state: TestInventoryState) => void>();

  return {
    getState: () => current,
    subscribe(listener: (state: TestInventoryState) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(next: TestInventoryState) {
      current = next;
      for (const listener of listeners) listener(current);
    },
    listenerCount: () => listeners.size,
  };
}

function state(
  overrides: Partial<TestInventoryState> = {},
): TestInventoryState {
  return {
    status: 'ready',
    message: 'Save ready',
    bag: [
      { itemKey: 'item:tibia:zombie-dust', count: 1 },
      { itemKey: 'item:tibia:gold-coin', count: 12 },
    ],
    stash: [{ itemKey: 'item:tibia:arrow', count: 4 }],
    gold: 9,
    nextHuntBuff: 'none',
    completedRuns: 2,
    activeVocationKey: 'vocation:tibia:knight',
    characters: [createEmptyCharacterProgress()],
    bestiary: [],
    achievements: [],
    character: createEmptyCharacterProgress(),
    ...overrides,
  };
}

describe('InventoryPanel', () => {
  it('lists the run bag and persistent stash separately in itemKey order', () => {
    const document = new TestDocument();
    const root = document.createElement('div');
    const inventorySource = source(state());

    const panel = mountInventoryPanel(root as unknown as HTMLElement, {
      source: inventorySource,
    });

    expect(entriesOf(root, 'save-run-bag')).toBe(
      'Gold Coin × 12 | Zombie Dust × 1',
    );
    expect(entriesOf(root, 'save-stash')).toBe('Arrow × 4');
    expect(
      findByTestId(root, 'save-run-bag-empty').getAttribute('data-visible'),
    ).toBe('false');
    expect(
      findByTestId(root, 'save-stash-empty').getAttribute('data-visible'),
    ).toBe('false');

    panel.destroy();
  });

  it('updates counts from the latest state event without replaying the run', () => {
    const document = new TestDocument();
    const root = document.createElement('div');
    const inventorySource = source(state());
    const panel = mountInventoryPanel(root as unknown as HTMLElement, {
      source: inventorySource,
    });

    inventorySource.emit(
      state({
        bag: [{ itemKey: 'item:tibia:gold-coin', count: 15 }],
        stash: [{ itemKey: 'item:tibia:arrow', count: 4 }],
      }),
    );

    expect(entriesOf(root, 'save-run-bag')).toBe('Gold Coin × 15');
    expect(entriesOf(root, 'save-stash')).toBe('Arrow × 4');
    expect(entriesOf(root, 'save-run-bag')).not.toContain('Zombie Dust');

    panel.destroy();
  });

  it('shows dedicated empty states and removes its state listener on destroy', () => {
    const document = new TestDocument();
    const root = document.createElement('div');
    const inventorySource = source(
      state({ bag: [], stash: [], completedRuns: 0 }),
    );
    const panel = mountInventoryPanel(root as unknown as HTMLElement, {
      source: inventorySource,
    });

    expect(
      findByTestId(root, 'save-run-bag-empty').getAttribute('data-visible'),
    ).toBe('true');
    expect(
      findByTestId(root, 'save-stash-empty').getAttribute('data-visible'),
    ).toBe('true');
    expect(inventorySource.listenerCount()).toBe(1);

    panel.destroy();
    expect(inventorySource.listenerCount()).toBe(0);
    inventorySource.emit(
      state({ bag: [{ itemKey: 'item:tibia:meat', count: 2 }] }),
    );
    expect(root.children).toHaveLength(0);
  });

  it('requires explicit confirmation before delegating save import', () => {
    const document = new TestDocument();
    const root = document.createElement('div');
    const inventorySource = source(state());
    let confirmations = 0;
    let imports = 0;
    const panel = mountInventoryPanel(root as unknown as HTMLElement, {
      source: inventorySource,
      onExport: () => undefined,
      confirmImport: () => {
        confirmations += 1;
        return false;
      },
      onImport: () => {
        imports += 1;
      },
    });

    findByTestId(root, 'save-import').dispatch('click');

    expect(confirmations).toBe(1);
    expect(imports).toBe(0);
    panel.destroy();
  });

  it('shows a quantity control and delegates an ordinary sale', () => {
    const document = new TestDocument();
    const root = document.createElement('div');
    const inventorySource = source(state());
    const sales: Array<{
      itemKey: string;
      quantity: number;
      allowProtected: boolean;
    }> = [];
    const panel = mountInventoryPanel(root as unknown as HTMLElement, {
      source: inventorySource,
      getSaleOffer: (itemKey) =>
        itemKey === 'item:tibia:arrow'
          ? { displayName: 'arrow', unitPrice: 1, protected: false }
          : undefined,
      onSell: (itemKey, quantity, allowProtected) => {
        sales.push({ itemKey, quantity, allowProtected });
      },
    });

    const quantity = findByTestId(root, 'save-sale-quantity');
    expect(quantity.value).toBe('4');
    expect(quantity.getAttribute('max')).toBe('4');
    quantity.value = '2';
    findByTestId(root, 'save-sell').dispatch('click');

    expect(sales).toEqual([
      {
        itemKey: 'item:tibia:arrow',
        quantity: 2,
        allowProtected: false,
      },
    ]);
    expect(findByTestId(root, 'save-gold').textContent).toBe('Gold: 9');
    panel.destroy();
  });

  it('blocks a protected sale until the confirmation callback accepts it', () => {
    const document = new TestDocument();
    const root = document.createElement('div');
    const inventorySource = source(
      state({
        stash: [{ itemKey: 'item:tibia:legion-helmet', count: 1 }],
      }),
    );
    let confirmations = 0;
    let sold = 0;
    const panel = mountInventoryPanel(root as unknown as HTMLElement, {
      source: inventorySource,
      getSaleOffer: () => ({
        displayName: 'legion helmet',
        unitPrice: 20,
        protected: true,
      }),
      confirmProtectedSale: (_offer, quantity) => {
        confirmations += quantity;
        return true;
      },
      onSell: (_itemKey, _quantity, allowProtected) => {
        if (allowProtected) sold += 1;
      },
    });

    findByTestId(root, 'save-sell').dispatch('click');

    expect(confirmations).toBe(1);
    expect(sold).toBe(1);
    expect(findByTestId(root, 'save-sale-protected').textContent).toContain(
      'confirmation required',
    );
    panel.destroy();
  });
});
