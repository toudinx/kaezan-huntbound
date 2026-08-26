import { describe, expect, it } from 'vitest';

import type { EntityId } from '../../../../packages/contracts/src/index.ts';

import {
  type CreatureHealthBarActor,
  creatureHealthBarGeometry,
  resolveCreatureHealthBars,
} from './CreatureHealthBar';
import { healthRampColor } from './HealthRamp';

function creature(
  entityId: number,
  health: number,
  maxHealth = 100,
  overrides: Partial<CreatureHealthBarActor> = {},
): CreatureHealthBarActor {
  return {
    entityId: entityId as EntityId,
    health,
    maxHealth,
    onScreen: true,
    isPlayer: false,
    ...overrides,
  };
}

describe('CreatureHealthBar', () => {
  it('gives every drawn creature a bar coloured by what is left', () => {
    expect(
      resolveCreatureHealthBars([creature(2, 100), creature(3, 25)]),
    ).toEqual([
      { entityId: 2, fraction: 1, color: healthRampColor(1) },
      { entityId: 3, fraction: 0.25, color: healthRampColor(0.25) },
    ]);
  });

  it('leaves the player to the cockpit gauges', () => {
    expect(
      resolveCreatureHealthBars([creature(1, 50, 100, { isPlayer: true })]),
    ).toEqual([]);
  });

  it('skips actors with no sprite on screen', () => {
    expect(
      resolveCreatureHealthBars([creature(2, 50, 100, { onScreen: false })]),
    ).toEqual([]);
  });

  it('skips an unknown ceiling rather than drawing a creature as dead', () => {
    expect(resolveCreatureHealthBars([creature(2, 50, 0)])).toEqual([]);
    expect(resolveCreatureHealthBars([creature(2, 50, Number.NaN)])).toEqual(
      [],
    );
  });

  it('clamps overheal and negative health into the bar', () => {
    const [overhealed, dying] = resolveCreatureHealthBars([
      creature(2, 180, 100),
      creature(3, -10, 100),
    ]);
    expect(overhealed?.fraction).toBe(1);
    expect(dying?.fraction).toBe(0);
  });

  it('sizes the bar like Tibia does, and keeps a frame at any tile size', () => {
    expect(creatureHealthBarGeometry(32)).toEqual({
      width: 27,
      height: 4,
      gap: 2,
      inset: 1,
    });

    const tiny = creatureHealthBarGeometry(8);
    expect(tiny.height).toBeGreaterThanOrEqual(3);
    expect(tiny.inset).toBeGreaterThanOrEqual(1);
    expect(tiny.width - tiny.inset * 2).toBeGreaterThan(0);
  });
});
