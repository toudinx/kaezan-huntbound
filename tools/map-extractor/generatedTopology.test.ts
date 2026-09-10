import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { HuntDefinition } from '../../packages/contracts/src/hunt/types.ts';
import { analyzeBoxDensity } from './boxDensity.ts';
import { analyzeHuntTopology } from './topology.ts';

const readHunt = (slug: string): HuntDefinition =>
  JSON.parse(
    readFileSync(
      `packages/content/src/generated/hunts/${slug}/hunt.json`,
      'utf8',
    ),
  ) as HuntDefinition;

function reachableCellCount(hunt: HuntDefinition): number {
  const report = analyzeHuntTopology(hunt);
  return report.floors.reduce(
    (total, floor) => total + floor.walkableTiles - floor.unreachable.length,
    0,
  );
}

function walkableCellCount(hunt: HuntDefinition): number {
  return analyzeHuntTopology(hunt).floors.reduce(
    (total, floor) => total + floor.walkableTiles,
    0,
  );
}

function spawnSlotCount(hunt: HuntDefinition): number {
  return hunt.spawns.groups.reduce(
    (total, group) => total + group.slots.length,
    0,
  );
}

const hunt = readHunt('venore-rotworm-cave');

describe('generated Venore Rotworm Cave hunt', () => {
  it('keeps the full authored floors and reports their isolated components', () => {
    const report = analyzeHuntTopology(hunt);

    expect(
      report.floors.map(({ z, walkableTiles, componentCount }) => ({
        z,
        walkableTiles,
        componentCount,
      })),
    ).toEqual([
      { z: 8, walkableTiles: 690, componentCount: 19 },
      { z: 9, walkableTiles: 761, componentCount: 13 },
    ]);
    // Still the same four cut-off stairs -- (42,35), (48,65), (6,81) and
    // (49,92) -- counted twice: every descent now carries its return, and a
    // stair nobody can reach is unreachable from either side of it.
    expect(report.diagnostics.map(({ code }) => code)).toEqual([
      ...Array.from({ length: 8 }, () => 'HUNT_TRANSITION_UNREACHABLE'),
      'HUNT_WALKABLE_DISCONNECTED',
      'HUNT_WALKABLE_DISCONNECTED',
    ]);
  });

  it('keeps spawn slots reachable from the upper hunt circuit', () => {
    // Eight stairs down and the eight climbs back up they gained.
    expect(hunt.transitions.entries).toHaveLength(16);
    expect(hunt.spawns.groups).toHaveLength(8);
    expect(hunt.spawns.groups.flatMap((group) => group.slots)).toHaveLength(12);
    expect(hunt.playerStart).toEqual({ x: 13, y: 19, z: 8 });
  });

  it('offers a spot where a knight can box', () => {
    const report = analyzeBoxDensity(hunt);

    // A knight's box is the point of the hunt. `exori` hits every adjacent
    // tile, so a map that cannot gather creatures makes the whole kit
    // pointless and leaves auto-attack as the only line of play.
    expect(report.best?.pullableSlots).toBeGreaterThanOrEqual(2);

    // One lucky tile is not a spot. The box has to be findable.
    expect(report.tilesByPull[2] ?? 0).toBeGreaterThanOrEqual(19);
  });
});

describe('generated Orc Fortress hunt', () => {
  // The box is raw OTBM: the fortress, the field outside its wall and a
  // handful of ledges that share no path with either. A start picked by
  // distance to the first spawn group dropped the player on a 21-tile ledge
  // with one spawn and no stairs, and the hunt read as an empty field. The
  // start is picked from the walkable component now, so it cannot land off
  // the hunt again.
  it('starts the player inside the fortress, not on a ledge', () => {
    const fortress = readHunt('orc-fortress');
    const report = analyzeHuntTopology(fortress);
    const reachable = new Map(
      report.floors.map((floor) => [
        floor.z,
        floor.walkableTiles - floor.unreachable.length,
      ]),
    );

    expect(fortress.playerStart).toEqual({ x: 37, y: 40, z: 7 });
    expect(reachable.get(7)).toBe(889);
    // Both directions: the holes drop into the cave and the ladders climb back
    // to the roof, so all three floors are reachable from where the hunt
    // starts.
    expect(reachable.get(8)).toBe(916);
    expect(reachable.get(6)).toBe(815);
    expect(fortress.transitions.entries).toHaveLength(12);
    // Every seat left in the box is one the player can walk to: the field
    // outside the wall is a component of its own, and its creatures would hold
    // `maxLiveActors` down for a fight that never happens.
    expect(
      report.diagnostics.filter(
        (item) =>
          item.code === 'HUNT_PLAYER_START_UNREACHABLE' ||
          item.code === 'HUNT_SPAWN_UNREACHABLE',
      ),
    ).toEqual([]);
    expect(fortress.spawns.groups).toHaveLength(21);
    expect(fortress.spawns.groups.flatMap((group) => group.slots)).toHaveLength(
      46,
    );
  });
});

describe('generated raw-box hunt starts', () => {
  it('keeps the rotworm hunt on its upper circuit and clears the dragon threshold', () => {
    const rotworm = readHunt('venore-rotworm-cave');
    const dragon = readHunt('dragon-lair');

    expect(rotworm.playerStart.z).toBe(8);
    expect(rotworm.spawns.groups.length).toBeGreaterThan(1);
    expect(spawnSlotCount(rotworm)).toBeGreaterThan(2);
    expect(reachableCellCount(rotworm)).toBeGreaterThan(35);

    expect(reachableCellCount(dragon)).toBeGreaterThanOrEqual(
      walkableCellCount(dragon) * 0.25,
    );
  });
});
