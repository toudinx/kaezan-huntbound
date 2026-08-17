import { describe, expect, it, vi } from 'vitest';
import type { EntityId } from '../../../../packages/contracts/src/index.ts';
import type { CombatViewState } from '../hunt/CombatViewModel';

import { mountCombatHud } from './CombatHud';

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}

class FakeElement {
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Set<() => void>>();
  textContent = '';
  disabled = false;

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly tagName: string,
  ) {}

  append(...children: FakeElement[]): void {
    this.children.push(...children);
  }

  replaceChildren(...children: FakeElement[]): void {
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
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const matches: FakeElement[] = [];
    const visit = (element: FakeElement): void => {
      if (
        selector.startsWith('[data-testid="') &&
        selector.endsWith('"]') &&
        element.getAttribute('data-testid') ===
          selector.slice('[data-testid="'.length, -2)
      ) {
        matches.push(element);
      }
      for (const child of element.children) visit(child);
    };
    visit(this);
    return matches;
  }
}

function state(overrides: Partial<CombatViewState> = {}): CombatViewState {
  return {
    tick: 9,
    player: {
      entityId: 1 as EntityId,
      health: 175,
      maxHealth: 185,
      resource: 70,
      maxResource: 185,
    },
    targetEntityId: 2 as EntityId,
    target: {
      entityId: 2 as EntityId,
      health: 45,
      maxHealth: 65,
      resource: 0,
      maxResource: 0,
    },
    abilities: [
      {
        index: 0,
        abilityId: 'berserk',
        label: 'Berserk',
        resourceCost: 115,
        cooldownTicks: 80,
        remainingCooldownTicks: 2,
        available: false,
      },
      {
        index: 1,
        abilityId: 'brutal-strike',
        label: 'Brutal Strike',
        resourceCost: 30,
        cooldownTicks: 120,
        remainingCooldownTicks: 0,
        available: true,
      },
    ],
    lootLog: [{ itemKey: 'item:tibia:dead-rotworm', count: 2, tick: 8 }],
    bag: [{ itemKey: 'item:tibia:dead-rotworm', count: 2 }],
    playerDead: true,
    lastRejection: null,
    ...overrides,
  };
}

function byTestId(root: FakeElement, testId: string): FakeElement {
  const element = root.querySelector(`[data-testid="${testId}"]`);
  if (!element) throw new Error(`Missing ${testId}`);
  return element;
}

describe('CombatHud', () => {
  it('renders bars, target, cooldowns, loot and death overlay from its view model', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const hud = mountCombatHud(root as unknown as HTMLElement);

    hud.render(state());

    expect(
      byTestId(root, 'combat-player-health').getAttribute('aria-valuenow'),
    ).toBe('175');
    expect(
      byTestId(root, 'combat-player-health').getAttribute('aria-valuemax'),
    ).toBe('185');
    expect(
      byTestId(root, 'combat-target-health').getAttribute('aria-valuenow'),
    ).toBe('45');
    expect(
      byTestId(root, 'combat-ability-0').getAttribute('data-cooldown-ticks'),
    ).toBe('2');
    expect(
      byTestId(root, 'combat-ability-0').getAttribute('aria-disabled'),
    ).toBe('true');
    expect(byTestId(root, 'combat-loot-log').textContent).toContain(
      'dead-rotworm × 2',
    );
    expect(byTestId(root, 'combat-run-bag').textContent).toContain(
      'dead-rotworm × 2',
    );
    expect(
      byTestId(root, 'combat-death-overlay').getAttribute('data-visible'),
    ).toBe('true');

    hud.render(
      state({
        lastRejection: {
          commandType: 'actor/attack',
          code: 'SIM_ATTACK_OUT_OF_RANGE',
          tick: 9,
        },
      }),
    );
    expect(byTestId(root, 'combat-rejection').textContent).toContain(
      'SIM_ATTACK_OUT_OF_RANGE',
    );

    hud.destroy();
    expect(root.children).toHaveLength(0);
  });

  it('emits restart through the overlay button and hides it when alive', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const onRestart = vi.fn();
    const hud = mountCombatHud(root as unknown as HTMLElement, { onRestart });

    hud.render(state());
    const restart = byTestId(root, 'combat-restart');
    restart.dispatch('click');
    expect(onRestart).toHaveBeenCalledTimes(1);

    hud.destroy();
    restart.dispatch('click');
    expect(onRestart).toHaveBeenCalledTimes(1);

    const remountedRoot = document.createElement('div');
    const remountedHud = mountCombatHud(
      remountedRoot as unknown as HTMLElement,
      { onRestart },
    );
    remountedHud.render(state({ playerDead: false }));
    expect(
      byTestId(remountedRoot, 'combat-death-overlay').getAttribute(
        'data-visible',
      ),
    ).toBe('false');
    remountedHud.destroy();
  });
});
