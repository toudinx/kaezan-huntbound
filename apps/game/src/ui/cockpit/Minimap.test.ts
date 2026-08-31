import { describe, expect, it } from 'vitest';
import type {
  EntityId,
  GridPosition,
  MapRegion,
} from '../../../../../packages/contracts/src/index.ts';

import { type MinimapState, mountMinimap } from './Minimap';

class FakeCanvasContext {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 0;
  readonly calls: string[] = [];

  clearRect(): void {
    this.calls.push('clearRect');
  }

  drawImage(): void {
    this.calls.push('drawImage');
  }

  fillRect(): void {
    this.calls.push('fillRect');
  }

  beginPath(): void {
    this.calls.push('beginPath');
  }

  closePath(): void {
    this.calls.push('closePath');
  }

  moveTo(): void {
    this.calls.push('moveTo');
  }

  lineTo(): void {
    this.calls.push('lineTo');
  }

  arc(): void {
    this.calls.push('arc');
  }

  fill(): void {
    this.calls.push('fill');
  }

  stroke(): void {
    this.calls.push('stroke');
  }
}

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return tagName === 'canvas'
      ? new FakeCanvas(this, tagName)
      : new FakeElement(this, tagName);
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

class FakeCanvas extends FakeElement {
  width = 0;
  height = 0;
  readonly context = new FakeCanvasContext();

  getContext(): FakeCanvasContext {
    return this.context;
  }
}

function position(x: number, y: number, z: number): GridPosition {
  return { x, y, z };
}

function region(): MapRegion {
  return {
    schemaVersion: 1,
    regionId: 'minimap-test' as MapRegion['regionId'],
    regionRevision: 1,
    origin: { x: 100, y: 200 },
    width: 2,
    height: 2,
    palette: [0, 1, 2],
    floors: [
      {
        z: 7,
        ground: [1, 2, 0, 1],
        objectsBelow: [],
        objectsAbove: [],
        collision: [2],
      },
    ],
  };
}

function state(floor: number, playerPosition: GridPosition): MinimapState {
  return {
    floor,
    actors: [
      {
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: playerPosition,
        isPlayer: true,
      },
    ],
  };
}

describe('Minimap', () => {
  it('desenha o piso atual e repinta quando o piso muda', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const minimap = mountMinimap(root as unknown as HTMLElement, {
      region: region(),
    });

    minimap.render(state(7, position(100, 200, 7)));
    expect(
      root.querySelector('[data-testid="combat-minimap-floor"]')?.textContent,
    ).toBe('Floor 7');
    expect(
      root
        .querySelector('[data-testid="combat-minimap"]')
        ?.getAttribute('data-terrain-redraws'),
    ).toBe('1');

    minimap.render(state(8, position(100, 200, 8)));
    expect(
      root.querySelector('[data-testid="combat-minimap-floor"]')?.textContent,
    ).toBe('Floor 8');
    expect(
      root
        .querySelector('[data-testid="combat-minimap"]')
        ?.getAttribute('data-terrain-redraws'),
    ).toBe('2');
  });

  it('não repinta o terreno quando só um ator se move', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const minimap = mountMinimap(root as unknown as HTMLElement, {
      region: region(),
    });

    minimap.render(state(7, position(100, 200, 7)));
    minimap.render(state(7, position(101, 200, 7)));

    expect(
      root
        .querySelector('[data-testid="combat-minimap"]')
        ?.getAttribute('data-terrain-redraws'),
    ).toBe('1');
    expect(
      root
        .querySelector('[data-testid="combat-minimap"]')
        ?.getAttribute('data-actor-redraws'),
    ).toBe('2');
  });
});
