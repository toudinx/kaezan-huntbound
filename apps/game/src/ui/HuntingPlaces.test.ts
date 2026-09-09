import { describe, expect, it } from 'vitest';

import {
  type AchievementDefinition,
  type BestiarySpecies,
  createEmptyCharacterProgress,
  type HuntIndex,
} from '../../../../packages/contracts/src/index.ts';
import { mountHuntingPlaces } from './HuntingPlaces';

class TestElement {
  readonly children: TestElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Set<() => void>>();
  readonly dataset: Record<string, string | undefined> = {};
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

  prepend(...children: TestElement[]) {
    for (const child of [...children].reverse()) {
      child.parent = this;
      this.children.unshift(child);
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

  createElementNS(_namespace: string, tagName: string) {
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

function findAllByTestId(root: TestElement, testId: string): TestElement[] {
  const matches: TestElement[] = [];
  if (root.getAttribute('data-testid') === testId) matches.push(root);
  for (const child of root.children) {
    matches.push(...findAllByTestId(child, testId));
  }
  return matches;
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
        experienceGained: 1_240,
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
    expect(summary.textContent).toContain('Experience earned: 1,240 XP');
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
        experienceGained: 810,
      },
    );

    const summary = findByTestId(root, 'hunt-run-summary');
    if (summary === undefined) {
      throw new Error('Missing test id hunt-run-summary');
    }
    expect(summary.getAttribute('data-outcome')).toBe('died');
    expect(summary.textContent).toContain('Died in Fabricated Cave');
    expect(summary.textContent).toContain('The bag was lost');
    // Decision 1: the risk lives inside the run. The bag is gone, the
    // experience is not.
    expect(summary.textContent).toContain('Experience earned: 810 XP');
  });

  it('shows the persistent character above the list, whatever hunt is chosen', () => {
    const document = new TestDocument();
    const bare = document.createElement('div');
    mountHuntingPlaces(
      bare as unknown as HTMLElement,
      { schemaVersion: 1, hunts: [hunt] },
      () => undefined,
    );
    expect(findByTestId(bare, 'hunt-character')).toBeUndefined();

    const root = document.createElement('div');
    mountHuntingPlaces(
      root as unknown as HTMLElement,
      { schemaVersion: 1, hunts: [hunt] },
      () => undefined,
      undefined,
      { ...createEmptyCharacterProgress(), experience: 2_550 },
    );

    const panel = findByTestId(root, 'hunt-character');
    if (panel === undefined) {
      throw new Error('Missing test id hunt-character');
    }
    expect(panel.getAttribute('data-level')).toBe('8');
    expect(panel.textContent).toContain('Knight · Level 8');
    expect(panel.textContent).toContain('100 / 750 XP to level 9');
  });

  it('shows one visible goal and reward state for every catalogued species', () => {
    const document = new TestDocument();
    const root = document.createElement('div');
    const bestiary: readonly BestiarySpecies[] = [
      {
        creatureKey: 'creature:tibia:orc',
        displayName: 'Orc',
        targetKills: 10,
        rewardGold: 25,
      },
      {
        creatureKey: 'creature:tibia:rotworm',
        displayName: 'Rotworm',
        targetKills: 10,
        rewardGold: 25,
      },
    ];
    mountHuntingPlaces(
      root as unknown as HTMLElement,
      { schemaVersion: 1, hunts: [hunt] },
      () => undefined,
      undefined,
      createEmptyCharacterProgress(),
      undefined,
      undefined,
      bestiary,
      undefined,
      [
        {
          creatureKey: 'creature:tibia:orc',
          kills: 3,
          rewardClaimed: false,
        },
        {
          creatureKey: 'creature:tibia:rotworm',
          kills: 10,
          rewardClaimed: true,
        },
      ],
    );

    const panel = findByTestId(root, 'hunt-bestiary');
    if (panel === undefined) {
      throw new Error('Missing test id hunt-bestiary');
    }
    const entries = findAllByTestId(panel, 'hunt-bestiary-entry');
    expect(entries).toHaveLength(2);
    expect(entries[0]?.getAttribute('data-kills')).toBe('3');
    expect(entries[0]?.getAttribute('data-completed')).toBe('false');
    expect(entries[0]?.textContent).toContain('3 / 10 kills');
    expect(entries[0]?.textContent).toContain('Reward 25 gold');
    expect(entries[1]?.getAttribute('data-kills')).toBe('10');
    expect(entries[1]?.getAttribute('data-completed')).toBe('true');
    expect(entries[1]?.textContent).toContain('Complete · 25 gold claimed');
  });

  it('shows the next first-loop objective and the reward ledger', () => {
    const document = new TestDocument();
    const root = document.createElement('div');
    const achievements: readonly AchievementDefinition[] = [
      {
        achievementId: 'achievement:test:first-hunt',
        displayName: 'First Hunt',
        description: 'Complete your first hunt.',
        metric: 'completed-runs',
        target: 1,
        rewardGold: 25,
      },
      {
        achievementId: 'achievement:test:armed',
        displayName: 'Armed and Ready',
        description: 'Equip your first piece of gear.',
        metric: 'equipped-slots',
        target: 1,
        rewardGold: 25,
      },
    ];
    mountHuntingPlaces(
      root as unknown as HTMLElement,
      { schemaVersion: 1, hunts: [hunt] },
      () => undefined,
      undefined,
      createEmptyCharacterProgress(),
      undefined,
      undefined,
      undefined,
      achievements,
      [],
      [
        {
          achievementId: 'achievement:test:first-hunt',
          progress: 1,
          rewardClaimed: true,
        },
      ],
    );

    const panel = findByTestId(root, 'hunt-achievements');
    if (panel === undefined) {
      throw new Error('Missing test id hunt-achievements');
    }
    const entries = findAllByTestId(panel, 'hunt-achievement-entry');
    expect(entries).toHaveLength(2);
    expect(entries[0]?.getAttribute('data-completed')).toBe('true');
    expect(entries[0]?.textContent).toContain('Complete your first hunt.');
    expect(entries[0]?.textContent).toContain('1 / 1 runs');
    expect(entries[0]?.textContent).toContain('Complete · 25 gold claimed');
    expect(entries[1]?.getAttribute('data-completed')).toBe('false');
    expect(entries[1]?.textContent).toContain('0 / 1 pieces');
    expect(entries[1]?.textContent).toContain('Reward 25 gold');
  });

  it('sells nothing here: the blessing is a between-runs buy with a clear duration', () => {
    const document = new TestDocument();
    const root = document.createElement('div');
    let bought = 0;
    mountHuntingPlaces(
      root as unknown as HTMLElement,
      { schemaVersion: 1, hunts: [hunt] },
      () => undefined,
      undefined,
      undefined,
      undefined,
      {
        gold: 80,
        status: 'none',
        price: 50,
        damagePercent: 25,
        onBuy: () => {
          bought += 1;
        },
      },
    );

    const panel = findByTestId(root, 'hunt-preparation');
    if (panel === undefined) {
      throw new Error('Missing test id hunt-preparation');
    }
    expect(panel.getAttribute('data-status')).toBe('none');
    expect(findByTestId(root, 'hunt-preparation-gold')?.textContent).toBe(
      'Gold: 80',
    );
    expect(
      findByTestId(root, 'hunt-preparation-benefit')?.textContent,
    ).toContain('+25% damage');
    const buy = findByTestId(root, 'hunt-preparation-buy');
    if (buy === undefined) {
      throw new Error('Missing test id hunt-preparation-buy');
    }
    expect(buy.disabled).toBe(false);
    buy.dispatch('click');
    expect(bought).toBe(1);
  });
});
