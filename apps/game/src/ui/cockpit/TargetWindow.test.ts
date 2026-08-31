import { describe, expect, it } from 'vitest';
import type { EntityId } from '../../../../../packages/contracts/src/index.ts';

import { mountTargetWindow } from './TargetWindow';

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}

class FakeElement {
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly style = {
    properties: new Map<string, string>(),
    setProperty: (name: string, value: string): void => {
      this.style.properties.set(name, value);
    },
    getPropertyValue: (name: string): string =>
      this.style.properties.get(name) ?? '',
  };
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

describe('TargetWindow', () => {
  it('recorta o retrato para o primeiro frame do atlas', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const targetWindow = mountTargetWindow(root as unknown as HTMLElement, {
      resolveAsset: () => ({
        mediaUrl: 'blob:rotworm',
        cellWidth: 64,
        cellHeight: 64,
        columns: 16,
        atlasFrameCount: 36,
      }),
    });

    targetWindow.render({
      target: {
        entityId: 2 as EntityId,
        health: 45,
        maxHealth: 65,
        resource: 0,
        maxResource: 0,
      },
      details: {
        blueprintId: 'rotworm',
        displayName: 'Rotworm',
        assetKey: 'creature:tibia:rotworm',
        resistances: [],
      },
    });

    const image = root.querySelector('[data-testid="combat-target-image"]');
    expect(image?.getAttribute('src')).toBe('blob:rotworm');
    expect(image?.parent?.getAttribute('data-atlas-frame')).toBe('0');
    expect(
      image?.parent?.style.getPropertyValue('--cockpit-atlas-columns'),
    ).toBe('16');
    expect(image?.parent?.style.getPropertyValue('--cockpit-atlas-rows')).toBe(
      '3',
    );
  });

  it('mostra — para resistência ausente sem transformar ausência em zero', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const targetWindow = mountTargetWindow(root as unknown as HTMLElement);

    targetWindow.render({
      target: {
        entityId: 2 as EntityId,
        health: 45,
        maxHealth: 65,
        resource: 0,
        maxResource: 0,
      },
      details: {
        blueprintId: 'rotworm',
        displayName: 'Rotworm',
        assetKey: 'creature:tibia:rotworm',
        resistances: [],
      },
    });

    const fireResistance = root.querySelector(
      '[data-testid="combat-target-resistance-fire"]',
    );
    expect(fireResistance?.textContent).toContain('—');
    expect(fireResistance?.textContent).not.toContain('0');
  });
});
