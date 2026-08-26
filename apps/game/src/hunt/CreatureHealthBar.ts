import type { EntityId } from '../../../../packages/contracts/src/index.ts';

import { healthRampColor } from './HealthRamp';

/**
 * The bar Tibia hangs over a creature's head.
 *
 * It exists because the cockpit only ever shows one creature -- the selected
 * target -- and a hunt is fought against a room. Without it the player cannot
 * tell the rotworm he has nearly killed from the one that just walked in, so he
 * spreads his damage over the whole pack and takes hits from all of them.
 *
 * The player keeps the arcs instead: his own bar would sit under his hand on
 * the one sprite whose health is already the largest thing on screen.
 */

/** Width of the bar as a share of a tile. Tibia's is 27px over 32. */
const WIDTH_RATIO = 27 / 32;
/** Height as a share of a tile: 4px over 32, of which 2 are the fill. */
const HEIGHT_RATIO = 4 / 32;
/** Air between the top of the sprite and the foot of the bar. */
const GAP_RATIO = 2 / 32;
/** The frame around the fill, dark enough to hold on a lit floor. */
export const CREATURE_HEALTH_BAR_BACKDROP_COLOR = 0x0d0705;
export const CREATURE_HEALTH_BAR_BACKDROP_ALPHA = 0.85;
/**
 * Over the sprite it belongs to, under the damage numbers, which are drawn at
 * `+20` and have to stay readable over the bar.
 */
export const CREATURE_HEALTH_BAR_DEPTH_OFFSET = 15;

export interface CreatureHealthBarActor {
  readonly entityId: EntityId;
  readonly health: number;
  readonly maxHealth: number;
  /** Whether a sprite is actually being drawn for this actor right now. */
  readonly onScreen: boolean;
  /** The player wears the cockpit gauges instead of a bar. */
  readonly isPlayer: boolean;
}

export interface CreatureHealthBar {
  readonly entityId: EntityId;
  /** Health left, from 0 to 1. */
  readonly fraction: number;
  /** The ramp colour for that fraction, as a packed `0xRRGGBB`. */
  readonly color: number;
}

export interface CreatureHealthBarGeometry {
  readonly width: number;
  readonly height: number;
  readonly gap: number;
  /** The frame, in pixels per side, between the backdrop and the fill. */
  readonly inset: number;
}

/** The bar drawn at this tile size, in world pixels. */
export function creatureHealthBarGeometry(
  tileSize: number,
): CreatureHealthBarGeometry {
  const height = Math.max(3, Math.round(tileSize * HEIGHT_RATIO));
  return {
    width: Math.max(8, Math.round(tileSize * WIDTH_RATIO)),
    height,
    gap: Math.max(1, Math.round(tileSize * GAP_RATIO)),
    // A frame thicker than a third of the bar leaves no fill to colour.
    inset: Math.max(1, Math.floor(height / 4)),
  };
}

/**
 * Which actors get a bar this frame, and how full it is.
 *
 * An actor with no health ceiling is skipped rather than drawn empty: a bar
 * that reads "dead" because the blueprint is missing is worse than no bar.
 */
export function resolveCreatureHealthBars(
  actors: readonly CreatureHealthBarActor[],
): readonly CreatureHealthBar[] {
  const bars: CreatureHealthBar[] = [];

  for (const actor of actors) {
    if (!actor.onScreen || actor.isPlayer) continue;
    if (!Number.isFinite(actor.maxHealth) || actor.maxHealth <= 0) continue;
    if (!Number.isFinite(actor.health)) continue;

    const fraction = Math.min(Math.max(actor.health / actor.maxHealth, 0), 1);
    bars.push({
      entityId: actor.entityId,
      fraction,
      color: healthRampColor(fraction),
    });
  }

  return bars;
}
