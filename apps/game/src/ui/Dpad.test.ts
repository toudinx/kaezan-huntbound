import { describe, expect, it } from 'vitest';

import { createInputMap, type InputMap } from '../input/InputMap';
import { mountDpad } from './Dpad';

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}

class FakeElement {
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  textContent = '';

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly tagName: string,
  ) {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  append(...children: FakeElement[]): void {
    this.children.push(...children);
  }

  replaceChildren(...children: FakeElement[]): void {
    this.children.splice(0, this.children.length, ...children);
  }

  remove(): void {}

  querySelectorAll(selector: string): FakeElement[] {
    const matches = this.children.flatMap((child) =>
      child.querySelectorAll(selector),
    );
    if (selector === '[data-hunt-direction]') {
      return [
        ...this.children.filter((child) =>
          child.attributes.has('data-hunt-direction'),
        ),
        ...matches,
      ];
    }
    return matches;
  }
}

describe('Dpad', () => {
  it('creates eight accessible direction buttons and destroys them', () => {
    const document = new FakeDocument();
    const root = new FakeElement(document, 'div');
    const input = createInputMap();

    const dpad = mountDpad(root as unknown as HTMLElement, input as InputMap);

    expect(root.querySelectorAll('[data-hunt-direction]')).toHaveLength(8);
    expect(
      root
        .querySelectorAll('[data-hunt-direction]')
        .map((button) => button.getAttribute('data-hunt-direction')),
    ).toEqual(['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']);
    expect(
      root
        .querySelectorAll('[data-hunt-direction]')[0]
        ?.getAttribute('aria-label'),
    ).toBe('Move northwest');

    dpad.destroy();
    dpad.destroy();
    expect(root.children).toHaveLength(0);
  });
});
