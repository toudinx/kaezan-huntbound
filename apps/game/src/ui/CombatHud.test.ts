import { describe, expect, it, vi } from 'vitest';
import type { EntityId } from '../../../../packages/contracts/src/index.ts';
import type {
  CombatAbilityView,
  CombatViewState,
} from '../hunt/CombatViewModel';

import { mountCombatHud } from './CombatHud';

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }

  /** The vital arcs are SVG, which `createElement` cannot make. */
  createElementNS(_namespace: string, tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}

class FakeElement {
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Set<() => void>>();
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
  disabled = false;
  hidden = false;

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly tagName: string,
  ) {}

  remove(): void {
    const siblings = this.parent?.children;
    const index = siblings?.indexOf(this) ?? -1;
    if (siblings !== undefined && index >= 0) siblings.splice(index, 1);
    this.parent = null;
  }

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

/**
 * The catalog's own grouping: the five attack spells and Wound Cleansing spend
 * group 0, the postures and the two support spells group 1, and the postures
 * also spend group 2. The deck has to project this rather than guess it, so the
 * fixture carries the real thing.
 */
function cooldownGroupsFor(
  abilityId: string,
  remainingGroupCooldownTicks = 0,
): Pick<
  CombatAbilityView,
  | 'primaryCooldownGroup'
  | 'secondaryCooldownGroup'
  | 'remainingGroupCooldownTicks'
> {
  const support = ['blood-rage', 'protector', 'challenge', 'haste'];
  const stance = ['blood-rage', 'protector'];

  return {
    primaryCooldownGroup: support.includes(abilityId) ? 1 : 0,
    secondaryCooldownGroup: stance.includes(abilityId) ? 2 : null,
    remainingGroupCooldownTicks,
  };
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
    targetDetails: {
      blueprintId: 'rotworm',
      displayName: 'Rotworm',
      assetKey: null,
      resistances: [],
    },
    minimap: {
      floor: 7,
      actors: [],
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
        active: false,
        ...cooldownGroupsFor('berserk'),
      },
      {
        index: 1,
        abilityId: 'brutal-strike',
        label: 'Brutal Strike',
        resourceCost: 30,
        cooldownTicks: 120,
        remainingCooldownTicks: 0,
        available: true,
        active: false,
        ...cooldownGroupsFor('brutal-strike'),
      },
      {
        index: 2,
        abilityId: 'wound-cleansing',
        label: 'Wound Cleansing',
        resourceCost: 40,
        cooldownTicks: 20,
        remainingCooldownTicks: 0,
        available: true,
        active: false,
        ...cooldownGroupsFor('wound-cleansing'),
      },
      {
        index: 3,
        abilityId: 'groundshaker',
        label: 'Groundshaker',
        resourceCost: 160,
        cooldownTicks: 160,
        remainingCooldownTicks: 0,
        available: true,
        active: false,
        ...cooldownGroupsFor('groundshaker'),
      },
      {
        index: 4,
        abilityId: 'whirlwind-throw',
        label: 'Whirlwind Throw',
        resourceCost: 40,
        cooldownTicks: 120,
        remainingCooldownTicks: 0,
        available: true,
        active: false,
        ...cooldownGroupsFor('whirlwind-throw'),
      },
      {
        index: 5,
        abilityId: 'blood-rage',
        label: 'Blood Rage',
        resourceCost: 20,
        cooldownTicks: 0,
        remainingCooldownTicks: 0,
        available: true,
        active: true,
        ...cooldownGroupsFor('blood-rage'),
      },
      {
        index: 6,
        abilityId: 'protector',
        label: 'Protector',
        resourceCost: 20,
        cooldownTicks: 0,
        remainingCooldownTicks: 40,
        available: false,
        active: false,
        ...cooldownGroupsFor('protector'),
      },
    ],
    cooldownGroups: [
      { group: 0, remainingTicks: 2 },
      { group: 1, remainingTicks: 0 },
      { group: 2, remainingTicks: 0 },
    ],
    playerPosture: { abilityId: 'blood-rage', label: 'Blood Rage' },
    playerHaste: null,
    lootLog: [{ itemKey: 'item:tibia:dead-rotworm', count: 2, tick: 8 }],
    bag: [{ itemKey: 'item:tibia:dead-rotworm', count: 2 }],
    experience: { total: 2_550, runGained: 100 },
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

function byClass(root: FakeElement, className: string): FakeElement {
  const visit = (element: FakeElement): FakeElement | undefined => {
    if (element.className.split(/\s+/u).includes(className)) return element;
    for (const child of element.children) {
      const match = visit(child);
      if (match !== undefined) return match;
    }
    return undefined;
  };

  const element = visit(root);
  if (element === undefined) throw new Error(`Missing .${className}`);
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
    expect(byTestId(root, 'combat-posture').textContent).toBe(
      'Posture: Blood Rage',
    );
    expect(byTestId(root, 'combat-posture').getAttribute('data-posture')).toBe(
      'blood-rage',
    );
    expect(
      byTestId(root, 'combat-ability-5').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(byTestId(root, 'combat-ability-5').getAttribute('data-active')).toBe(
      'true',
    );
    expect(
      byTestId(root, 'combat-ability-6').getAttribute('aria-pressed'),
    ).toBe('false');
    expect(byTestId(root, 'combat-loot-log').textContent).toContain(
      'dead-rotworm × 2',
    );
    expect(byTestId(root, 'combat-bag-slot-label-0').textContent).toContain(
      'dead rotworm × 2',
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
    expect(
      byTestId(remountedRoot, 'combat-posture').getAttribute('data-posture'),
    ).toBe('blood-rage');
    remountedHud.destroy();
  });

  it('offers the exit while the run is alive and again on the death overlay', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const onLeave = vi.fn();
    const hud = mountCombatHud(root as unknown as HTMLElement, { onLeave });

    hud.render(state({ playerDead: false }));
    const leave = byTestId(root, 'combat-leave');
    const deathLeave = byTestId(root, 'combat-death-leave');
    expect(leave.hidden).toBe(false);
    leave.dispatch('click');
    expect(onLeave).toHaveBeenCalledTimes(1);

    // Dying hides the in-run exit -- there is nothing left to bank, and the
    // overlay that covers it carries the way back to the atlas.
    hud.render(state({ playerDead: true }));
    expect(leave.hidden).toBe(true);
    deathLeave.dispatch('click');
    expect(onLeave).toHaveBeenCalledTimes(2);

    hud.destroy();
    deathLeave.dispatch('click');
    expect(onLeave).toHaveBeenCalledTimes(2);
  });

  it('leaves no exit control behind when the shell wires no way out', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const hud = mountCombatHud(root as unknown as HTMLElement, {});

    hud.render(state({ playerDead: false }));
    expect(byTestId(root, 'combat-leave').hidden).toBe(true);
    expect(byTestId(root, 'combat-death-leave').hidden).toBe(true);
    hud.destroy();
  });

  it('shows the empty posture state when no stance is active', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const hud = mountCombatHud(root as unknown as HTMLElement);

    hud.render(
      state({
        playerPosture: null,
        abilities: state().abilities.map((ability) => ({
          ...ability,
          active: false,
        })),
      }),
    );

    expect(byTestId(root, 'combat-posture').textContent).toBe('Posture: None');
    expect(byTestId(root, 'combat-posture').getAttribute('data-posture')).toBe(
      'none',
    );
    expect(byTestId(root, 'combat-haste').textContent).toBe('Haste: Off');
    expect(byTestId(root, 'combat-haste').getAttribute('data-haste')).toBe(
      'off',
    );
    expect(
      byTestId(root, 'combat-ability-5').getAttribute('aria-pressed'),
    ).toBe('false');
    expect(byTestId(root, 'combat-ability-5').getAttribute('data-active')).toBe(
      'false',
    );

    hud.destroy();
  });

  it('shows the haste clock while the condition lasts', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const hud = mountCombatHud(root as unknown as HTMLElement);

    hud.render(
      state({
        playerHaste: { remainingTicks: 600 },
      }),
    );

    expect(byTestId(root, 'combat-haste').textContent).toBe('Haste: 30s');
    expect(byTestId(root, 'combat-haste').getAttribute('data-haste')).toBe(
      'active',
    );
    expect(
      byTestId(root, 'combat-haste').getAttribute('data-remaining-ticks'),
    ).toBe('600');

    hud.destroy();
  });

  it('shows the next-hunt blessing for the length of the run', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const hud = mountCombatHud(root as unknown as HTMLElement, {
      preparedHunt: { damagePercent: 25 },
    });

    hud.render(state());

    expect(byTestId(root, 'combat-prepared-hunt').textContent).toBe(
      'Prepared hunt: +25% damage until this run ends',
    );
    expect(
      byTestId(root, 'combat-prepared-hunt').getAttribute('data-prepared-hunt'),
    ).toBe('active');

    hud.destroy();
  });

  it('renders the resolved spell icon and animates a cooldown sweep', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    let assetsReady = false;
    const resolveAsset = vi.fn((key: string) =>
      assetsReady && key === 'spell:tibia:berserk'
        ? {
            mediaUrl: 'blob:berserk',
            cellWidth: 32,
            cellHeight: 32,
            columns: 3,
            atlasFrameCount: 9,
          }
        : undefined,
    );
    const hud = mountCombatHud(root as unknown as HTMLElement, {
      resolveAsset,
    });

    hud.render(state());
    expect(resolveAsset).toHaveBeenCalledWith('spell:tibia:berserk');
    const cell = byTestId(root, 'combat-ability-0');
    expect(() => byClass(cell, 'cockpit-cell__icon')).toThrow(
      'Missing .cockpit-cell__icon',
    );

    assetsReady = true;
    hud.render(state());
    const readyCell = byTestId(root, 'combat-ability-0');
    const icon = byClass(readyCell, 'cockpit-cell__icon');
    expect(icon.getAttribute('data-asset-key')).toBe('spell:tibia:berserk');
    expect(icon.getAttribute('data-atlas-frame')).toBe('0');
    expect(icon.style.getPropertyValue('--cockpit-atlas-columns')).toBe('3');
    expect(icon.style.getPropertyValue('--cockpit-atlas-rows')).toBe('3');
    expect(byClass(icon, 'cockpit-cell__icon-image').getAttribute('src')).toBe(
      'blob:berserk',
    );
    expect(readyCell.style.getPropertyValue('--cooldown-sweep')).toBe('2.5%');

    hud.render(
      state({
        abilities: state().abilities.map((ability) =>
          ability.index === 0
            ? { ...ability, remainingCooldownTicks: 1 }
            : ability,
        ),
      }),
    );
    expect(
      byTestId(root, 'combat-ability-0').style.getPropertyValue(
        '--cooldown-sweep',
      ),
    ).toBe('1.25%');

    hud.destroy();
  });

  it('reads the character level and the experience the run has earned', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const hud = mountCombatHud(root as unknown as HTMLElement);

    hud.render(state({ experience: { total: 2_550, runGained: 100 } }));

    const readout = byTestId(root, 'combat-level');
    expect(readout.getAttribute('data-level')).toBe('8');
    expect(readout.textContent).toBe('Level 8 · 100 / 750 XP · +100 this run');

    hud.render(state({ experience: { total: 3_200, runGained: 750 } }));
    expect(byTestId(root, 'combat-level').getAttribute('data-level')).toBe('9');

    hud.destroy();
  });

  it('keeps mana lock visually distinct from a cooldown lock', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const hud = mountCombatHud(root as unknown as HTMLElement);

    hud.render(
      state({
        playerDead: false,
        player: {
          entityId: 1 as EntityId,
          health: 175,
          maxHealth: 185,
          resource: 0,
          maxResource: 185,
        },
        abilities: state().abilities.map((ability) =>
          ability.index === 1 ? { ...ability, available: false } : ability,
        ),
      }),
    );

    expect(
      byTestId(root, 'combat-ability-0').getAttribute(
        'data-unavailable-reason',
      ),
    ).toBe('cooldown');
    expect(
      byTestId(root, 'combat-ability-1').getAttribute(
        'data-unavailable-reason',
      ),
    ).toBe('mana');

    hud.destroy();
  });
});
