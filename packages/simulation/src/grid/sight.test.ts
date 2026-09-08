import type { KernelScenario } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { createStaticGrid, isSightClear } from './index.ts';

const Z = 7;

function at(x: number, y: number) {
  return { x, y, z: Z };
}

function gridOf(blockedTiles: readonly (readonly [number, number])[] = []) {
  const scenario: KernelScenario = {
    schemaVersion: 5,
    scenarioId: 'sight-test',
    scenarioRevision: 1,
    width: 8,
    height: 6,
    floors: [{ z: Z, blockedTiles }],
    transitions: [],
    spawnGroups: [],
    maxLiveActors: 8,
    abilities: [],
    lootTables: [],
    conditions: [],
    blueprints: [
      {
        blueprintId: 'walker',
        stepCooldownTicks: 2,
        behavior: 'inert',
        factionId: 0,
        maxHealth: 1,
        maxResource: 0,
        healthRegenTicks: 0,
        healthRegenAmount: 0,
        resourceRegenTicks: 0,
        resourceRegenAmount: 0,
        attackCooldownTicks: 0,
        attackMinDamage: 0,
        attackMaxDamage: 0,
        attackRangeTiles: 1,
        aggroRadius: 0,
        lootTableIndex: null,
        abilityIndices: [],
        outOfCombatHealthRegenTicks: 0,
        outOfCombatHealthRegenAmount: 0,
        outOfCombatResourceRegenTicks: 0,
        outOfCombatResourceRegenAmount: 0,
        combatWindowTicks: 0,
        lifeLeechPermille: 0,
        manaLeechPermille: 0,
        attackElement: 'physical',
        armor: 0,
        resistances: [],
        immunities: [],
      },
    ],
    initialActors: [],
  };
  return createStaticGrid(scenario);
}

describe('isSightClear', () => {
  it('is true for Chebyshev 1 even when both orthogonal cells are blocked', () => {
    const grid = gridOf([
      [2, 1],
      [1, 2],
    ]);
    expect(isSightClear(grid, at(1, 1), at(2, 2))).toBe(true);
  });

  it('is true on the same cell and false across floors', () => {
    const grid = gridOf();
    expect(isSightClear(grid, at(2, 2), at(2, 2))).toBe(true);
    expect(isSightClear(grid, at(2, 2), { x: 2, y: 2, z: Z + 1 })).toBe(false);
  });

  it('is false at Chebyshev 2 when a wall sits on the line', () => {
    const grid = gridOf([[2, 1]]);
    expect(isSightClear(grid, at(1, 1), at(3, 1))).toBe(false);
  });

  it('is true at Chebyshev 2 when the line is open', () => {
    const grid = gridOf();
    expect(isSightClear(grid, at(1, 1), at(3, 1))).toBe(true);
  });
});
