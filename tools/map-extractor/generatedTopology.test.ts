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

const hunt = readHunt('venore-rotworm-cave');

describe('generated Venore Rotworm Cave hunt', () => {
  it('generates one connected component on each authored floor', () => {
    const report = analyzeHuntTopology(hunt);

    expect(report.diagnostics).toEqual([]);
    expect(
      report.floors.map(({ z, walkableTiles, componentCount }) => ({
        z,
        walkableTiles,
        componentCount,
      })),
    ).toEqual([
      { z: 8, walkableTiles: 104, componentCount: 1 },
      { z: 9, walkableTiles: 152, componentCount: 1 },
    ]);
  });

  it('keeps a two-way transition pair and all selected spawn slots', () => {
    expect(hunt.transitions.entries).toHaveLength(2);
    expect(hunt.transitions.entries[1]?.from).toEqual(
      hunt.transitions.entries[0]?.to,
    );
    expect(hunt.transitions.entries[1]?.to).toEqual(
      hunt.transitions.entries[0]?.from,
    );
    expect(hunt.spawns.groups.flatMap((group) => group.slots)).toHaveLength(20);
    expect(hunt.playerStart.z).toBe(8);
  });

  it('offers a spot where a knight can box', () => {
    const report = analyzeBoxDensity(hunt);

    // A knight's box is the point of the hunt. `exori` hits every adjacent
    // tile, so a map that cannot gather creatures makes the whole kit
    // pointless and leaves auto-attack as the only line of play.
    expect(report.best?.pullableSlots).toBeGreaterThanOrEqual(6);

    // One lucky tile is not a spot. The box has to be findable.
    expect(report.tilesByPull[4] ?? 0).toBeGreaterThanOrEqual(20);
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
