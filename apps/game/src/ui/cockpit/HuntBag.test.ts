import { describe, expect, it } from 'vitest';

import { mountHuntBag } from './HuntBag';

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}

class FakeElement {
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly style = { setProperty: (): void => undefined };
  parent: FakeElement | null = null;
  textContent = '';
  className = '';

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly tagName: string,
  ) {}

  append(...children: FakeElement[]): void {
    for (const child of children) child.parent = this;
    this.children.push(...children);
  }

  replaceChildren(...children: FakeElement[]): void {
    for (const child of children) child.parent = this;
    this.children.splice(0, this.children.length, ...children);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const testId = selector.match(/^\[data-testid="([^"]+)"\]$/)?.[1];
    if (testId === undefined) return [];

    const matches: FakeElement[] = [];
    const visit = (element: FakeElement): void => {
      if (element.getAttribute('data-testid') === testId) matches.push(element);
      for (const child of element.children) visit(child);
    };
    visit(this);
    return matches;
  }
}

describe('HuntBag', () => {
  it('mostra rótulo textual quando o sprite do item não resolve', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const bag = mountHuntBag(root as unknown as HTMLElement, {
      resolveAsset: () => undefined,
    });

    bag.render([{ itemKey: 'item:tibia:ham', count: 2 }]);

    const label = root.querySelector('[data-testid="combat-bag-slot-label-0"]');
    expect(label?.textContent).toContain('ham');
    expect(label?.textContent).toContain('2');
  });

  it('mostra o nome e uma contagem em badge quando há sprite', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const bag = mountHuntBag(root as unknown as HTMLElement, {
      resolveAsset: (key) => ({ mediaUrl: `/assets/${key}.png` }),
    });

    bag.render([{ itemKey: 'item:tibia:gold-coin', count: 1 }]);

    const slot = root.querySelector('[data-testid="combat-bag-slot-0"]');
    expect(slot?.getAttribute('data-item-name')).toBe('gold coin');
    expect(slot?.getAttribute('title')).toBe('gold coin × 1');
    expect(slot?.getAttribute('aria-label')).toBe('gold coin × 1');
    expect(
      root.querySelector('[data-testid="combat-bag-slot-name-0"]')?.textContent,
    ).toBe('gold coin');
    expect(
      root.querySelector('[data-testid="combat-bag-slot-count-0"]')
        ?.textContent,
    ).toBe('× 1');
    expect(
      root
        .querySelector('[data-testid="combat-bag-slot-count-0"]')
        ?.getAttribute('data-count'),
    ).toBe('1');
    expect(slot?.getAttribute('data-entering')).toBe(null);
  });

  it('marca o slot quando o loot chega ou aumenta o stack', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const bag = mountHuntBag(root as unknown as HTMLElement, {
      resolveAsset: () => ({ mediaUrl: '/assets/gold-coin.png' }),
    });

    bag.render([{ itemKey: 'item:tibia:gold-coin', count: 1 }]);
    bag.render([{ itemKey: 'item:tibia:gold-coin', count: 2 }]);

    expect(
      root
        .querySelector('[data-testid="combat-bag-slot-0"]')
        ?.getAttribute('data-entering'),
    ).toBe('true');
  });
});
