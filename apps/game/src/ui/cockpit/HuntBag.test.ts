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
});
