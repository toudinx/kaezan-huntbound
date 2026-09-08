import { describe, expect, it } from 'vitest';

import type { HuntIndex } from '../../../../packages/contracts/src/index.ts';
import { mountHuntingPlaces } from './HuntingPlaces';

class TestElement {
  readonly children: TestElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Set<() => void>>();
  private ownTextContent = '';
  className = '';
  disabled = false;
  parent: TestElement | undefined;

  constructor(
    readonly tagName: string,
    readonly ownerDocument: TestDocument,
  ) {}

  get textContent(): string {
    return `${this.ownTextContent}${this.children.map((child) => child.textContent).join('')}`;
  }

  set textContent(value: string) {
    this.ownTextContent = value;
  }

  append(...children: TestElement[]) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }

  replaceChildren(...children: TestElement[]) {
    this.children.length = 0;
    this.append(...children);
  }

  remove() {
    const index = this.parent?.children.indexOf(this) ?? -1;
    if (index >= 0) this.parent?.children.splice(index, 1);
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type: string, listener: () => void) {
    const listeners = this.listeners.get(type) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type: string) {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

class TestDocument {
  createElement(tagName: string) {
    return new TestElement(tagName, this);
  }
}

function findByTestId(
  root: TestElement,
  testId: string,
): TestElement | undefined {
  if (root.getAttribute('data-testid') === testId) return root;
  for (const child of root.children) {
    const result = findByTestId(child, testId);
    if (result !== undefined) return result;
  }
  return undefined;
}

const hunt: HuntIndex['hunts'][number] = {
  huntId: 'hunt:tibia:fabricated-cave' as HuntIndex['hunts'][number]['huntId'],
  runtimeDirectory: 'fabricated-pack',
  displayName: 'Fabricated Cave',
  band: 2,
  recommendedLevel: 25,
  soloVocation: 'vocation:tibia:knight',
  sourceUrl: 'https://example.invalid/hunt',
  maxLiveActors: 4,
  experiencePerHour: 12_345,
  creatures: [
    {
      creatureKey: 'creature:tibia:orc',
      displayName: 'Orc',
      slotCount: 4,
      health: 125,
      experience: 75,
      lookType: 6,
      respawnTicks: 1800,
      experiencePerHour: 12_345,
      loot: [
        {
          itemKey: 'item:tibia:gold-coin',
          chancePerHundredThousand: 50_000,
          minCount: 1,
          maxCount: 5,
        },
      ],
    },
  ],
};

describe('HuntingPlaces', () => {
  it('renders the catalog fields and sends the selected index entry to the boot', () => {
    const document = new TestDocument();
    const root = document.createElement('div');
    let selected: HuntIndex['hunts'][number] | undefined;
    const screen = mountHuntingPlaces(
      root as unknown as HTMLElement,
      {
        schemaVersion: 1,
        hunts: [hunt],
      },
      (entry) => {
        selected = entry;
      },
    );

    const screenElement = findByTestId(root, 'hunting-places-screen');
    if (screenElement === undefined) {
      throw new Error('Missing test id hunting-places-screen');
    }
    expect(screenElement.textContent).toContain('Fabricated Cave');
    expect(screenElement.textContent).toContain('Band 2');
    expect(screenElement.textContent).toContain('Level 25');
    expect(screenElement.textContent).toContain('Orc');
    expect(screenElement.textContent).toContain('125 HP');
    expect(screenElement.textContent).toContain('75 XP');
    expect(screenElement.textContent).toContain('12,345 XP/h');
    expect(screenElement.textContent).toContain('Gold Coin');

    const select = findByTestId(root, 'hunt-place-select');
    if (select === undefined) {
      throw new Error('Missing test id hunt-place-select');
    }
    select.dispatch('click');
    expect(selected).toBe(hunt);

    screen.destroy();
    expect(root.children).toHaveLength(0);
  });

  it('reports what the completed run banked, and omits the summary when there is no run behind it', () => {
    const document = new TestDocument();
    const bare = document.createElement('div');
    mountHuntingPlaces(
      bare as unknown as HTMLElement,
      { schemaVersion: 1, hunts: [hunt] },
      () => undefined,
    );
    expect(findByTestId(bare, 'hunt-run-summary')).toBeUndefined();

    const root = document.createElement('div');
    mountHuntingPlaces(
      root as unknown as HTMLElement,
      { schemaVersion: 1, hunts: [hunt] },
      () => undefined,
      {
        outcome: 'completed',
        huntName: 'Fabricated Cave',
        banked: [{ itemKey: 'item:tibia:gold-coin', count: 14 }],
        stash: [
          { itemKey: 'item:tibia:gold-coin', count: 20 },
          { itemKey: 'item:tibia:meat', count: 3 },
        ],
        completedRuns: 2,
      },
    );

    const summary = findByTestId(root, 'hunt-run-summary');
    if (summary === undefined) {
      throw new Error('Missing test id hunt-run-summary');
    }
    expect(summary.getAttribute('data-outcome')).toBe('completed');
    expect(summary.textContent).toContain('Left Fabricated Cave with the bag');
    expect(summary.textContent).toContain('Gold Coin × 14');
    expect(summary.textContent).toContain(
      'Stash: 23 items · Runs completed: 2',
    );
  });

  it('says the bag was lost when the run ended in a death', () => {
    const document = new TestDocument();
    const root = document.createElement('div');
    mountHuntingPlaces(
      root as unknown as HTMLElement,
      { schemaVersion: 1, hunts: [hunt] },
      () => undefined,
      {
        outcome: 'died',
        huntName: 'Fabricated Cave',
        banked: [],
        stash: [],
        completedRuns: 0,
      },
    );

    const summary = findByTestId(root, 'hunt-run-summary');
    if (summary === undefined) {
      throw new Error('Missing test id hunt-run-summary');
    }
    expect(summary.getAttribute('data-outcome')).toBe('died');
    expect(summary.textContent).toContain('Died in Fabricated Cave');
    expect(summary.textContent).toContain('The bag was lost');
  });
});
