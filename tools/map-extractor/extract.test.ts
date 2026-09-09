import { describe, expect, it } from 'vitest';

import { validateHuntDefinition } from '../../packages/contracts/src/hunt/diagnostics.ts';
import { TICK_DURATION_MS } from '../../packages/contracts/src/index.ts';
import type { HuntSelection } from '../hunt-selection/types.ts';
import { extractHunt, PLAYER_BLUEPRINT_ID } from './extract.ts';
import { parseHuntLayoutRecipe } from './layout.ts';
import type { OtbmAreaFixture } from './testing/otbmFixture.ts';
import { encodeOtbmMap } from './testing/otbmFixture.ts';
import { tileFlags, tileFlagsTable } from './testing/tileFlagsFixture.ts';

const MIN_X = 1000;
const MIN_Y = 2000;
const SIZE = 4;

const GROUND = 100;
const CELL_GROUND = 101;
const WALL = 200;
const STAIRS_DOWN = 300;

const flags = tileFlagsTable([
  tileFlags(GROUND, { ground: true }),
  tileFlags(CELL_GROUND, { blocking: true, ground: true }),
  tileFlags(WALL, { blocking: true }),
  tileFlags(STAIRS_DOWN, { floorChange: 'down' }),
]);

const selection: HuntSelection = {
  key: 'hunt:tibia:venore-rotworm-cave',
  displayName: 'Venore Rotworm Cave',
  sourceUrl: 'https://example.invalid/hunt',
  source: {
    map: 'data-otservbr-global/world/otservbr.otbm',
    spawns: 'data-otservbr-global/world/otservbr-monster.xml',
  },
  layout: 'layouts/hunts/venore-rotworm-cave.json',
  recommendedLevel: 8,
  soloVocation: 'vocation:tibia:knight',
  band: 1,
  region: {
    minX: MIN_X,
    minY: MIN_Y,
    maxX: MIN_X + SIZE - 1,
    maxY: MIN_Y + SIZE - 1,
    floors: [7, 8],
  },
  creatures: ['creature:tibia:rotworm'],
  excludedCreatures: [],
  expectedSpawnGroups: 1,
  expectedSpawnSlots: 1,
  expectedDroppedTransitions: 0,
  budget: { maxFloors: 3, maxWidth: 96, maxHeight: 96 },
};

/** Every cell of both floors gets ground, so nothing is void by accident. */
function filledAreas(
  overrides: ReadonlyMap<string, readonly number[]> = new Map(),
): readonly OtbmAreaFixture[] {
  return [7, 8].map((baseZ) => ({
    baseX: MIN_X,
    baseY: MIN_Y,
    baseZ,
    tiles: Array.from({ length: SIZE * SIZE }, (_value, index) => {
      const x = MIN_X + (index % SIZE);
      const y = MIN_Y + Math.floor(index / SIZE);
      return {
        x,
        y,
        items: overrides.get(`${x},${y},${baseZ}`) ?? [GROUND],
      };
    }),
  }));
}

const spawnXml = `<?xml version="1.0"?><monsters><monster centerx="${MIN_X + 2}" centery="${MIN_Y + 2}" centerz="8" radius="2"><monster name="Rotworm" x="0" y="1" z="8" spawntime="90" /></monster></monsters>`;

function extract(areas = filledAreas(), xml = spawnXml) {
  return extractHunt(encodeOtbmMap(areas), xml, flags, selection);
}

function holeLayout() {
  return parseHuntLayoutRecipe(
    {
      schemaVersion: 1,
      layoutId: 'layout:huntbound:test',
      width: SIZE,
      height: SIZE,
      floors: [7, 8].map((z) => ({
        z,
        operations: [
          {
            kind: 'copy-rect' as const,
            from: { minX: MIN_X, minY: MIN_Y, z },
            width: SIZE,
            height: SIZE,
            to: { x: 0, y: 0 },
          },
        ],
      })),
      cells: [{ x: 1, y: 1, z: 8, ground: CELL_GROUND }],
      playerStart: { x: 0, y: 0, z: 7 },
      transitions: [],
      spawnPlacements: [
        {
          source: { x: MIN_X + 2, y: MIN_Y + 3, z: 8 },
          target: { x: 2, y: 3, z: 8 },
        },
      ],
    },
    selection.region,
  );
}

describe('extractHunt', () => {
  it('produces a definition that satisfies the frozen contract', () => {
    const result = validateHuntDefinition(extract().hunt);

    expect(result.ok ? [] : result.diagnostics).toEqual([]);
  });

  it('carries the selection identity into the hunt and the region', () => {
    const { hunt } = extract();

    expect(hunt.huntId).toBe('hunt:tibia:venore-rotworm-cave');
    expect(hunt.region.regionId).toBe('region:tibia:venore-rotworm-cave');
    expect(hunt.region.origin).toEqual({ x: MIN_X, y: MIN_Y });
    expect(hunt.region.width).toBe(SIZE);
    expect(hunt.region.height).toBe(SIZE);
  });

  it('declares one blueprint per spawned creature plus the player', () => {
    const { hunt } = extract();

    expect(hunt.blueprints.map((blueprint) => blueprint.blueprintId)).toEqual([
      PLAYER_BLUEPRINT_ID,
      'rotworm',
    ]);
    expect(hunt.playerBlueprintId).toBe(PLAYER_BLUEPRINT_ID);
  });

  /**
   * The cooldown is authored in ticks but read by the eye in milliseconds, so
   * the assertion is written the way the hunt is judged: a Tibia character
   * without haste crosses a plain tile in about half a second.
   */
  it('paces a step in milliseconds a player can read as walking', () => {
    const { hunt } = extract();
    const stepMs = (blueprintId: string) => {
      const blueprint = hunt.blueprints.find(
        (candidate) => candidate.blueprintId === blueprintId,
      );
      if (blueprint === undefined) {
        throw new Error(`${blueprintId} blueprint is missing`);
      }
      return blueprint.stepCooldownTicks * TICK_DURATION_MS;
    };

    expect(stepMs(PLAYER_BLUEPRINT_ID)).toBe(500);
    expect(stepMs('rotworm')).toBe(1_000);
  });

  it('starts the player on a walkable tile of the region', () => {
    const { hunt } = extract(
      filledAreas(
        new Map([
          [`${MIN_X},${MIN_Y},8`, [GROUND, WALL]],
          [`${MIN_X + 1},${MIN_Y},8`, [GROUND, WALL]],
        ]),
      ),
    );

    const floor = hunt.region.floors.find(
      (entry) => entry.z === hunt.playerStart.z,
    );
    const index = hunt.playerStart.y * hunt.region.width + hunt.playerStart.x;
    expect(floor?.collision).not.toContain(index);
  });

  it('does not start the player on a creature spawn cell', () => {
    const overlappingXml =
      `<?xml version="1.0"?><monsters><monster centerx="${MIN_X + 2}" ` +
      `centery="${MIN_Y + 2}" centerz="8" radius="2"><monster ` +
      `name="Rotworm" x="0" y="0" z="8" spawntime="90" />` +
      `</monster></monsters>`;
    const { hunt } = extract(filledAreas(), overlappingXml);

    expect(hunt.playerStart).not.toEqual({ x: 2, y: 2, z: 8 });
    expect(hunt.playerStart).toEqual({ x: 1, y: 1, z: 8 });
  });

  it('emits the transitions derived from the floor change items', () => {
    const { hunt } = extract(
      filledAreas(
        new Map([[`${MIN_X + 1},${MIN_Y + 1},7`, [GROUND, STAIRS_DOWN]]]),
      ),
    );

    expect(hunt.transitions.entries).toEqual([
      { from: { x: 1, y: 1, z: 7 }, to: { x: 1, y: 1, z: 8 } },
    ]);
    expect(hunt.transitions.dropped).toBe(0);
  });

  it('reports a transition dropped onto a blocked destination', () => {
    const { hunt, diagnostics } = extract(
      filledAreas(
        new Map([
          [`${MIN_X + 1},${MIN_Y + 1},7`, [GROUND, STAIRS_DOWN]],
          [`${MIN_X + 1},${MIN_Y + 1},8`, [GROUND, WALL]],
        ]),
      ),
    );

    expect(hunt.transitions.entries).toEqual([]);
    expect(hunt.transitions.dropped).toBe(1);
    expect(
      diagnostics.filter((item) => item.code === 'HUNT_TRANSITION_DROPPED'),
    ).toHaveLength(1);
  });

  it('reports a region that busts the frozen budget', () => {
    const wide = {
      ...selection,
      region: { ...selection.region, maxX: MIN_X + 200 },
    };
    const { diagnostics } = extractHunt(
      encodeOtbmMap(filledAreas()),
      spawnXml,
      flags,
      wide,
    );

    expect(
      diagnostics.filter((item) => item.code === 'HUNT_REGION_OUT_OF_BUDGET'),
    ).not.toEqual([]);
  });

  it('sorts diagnostics by path, then code, then message', () => {
    const { diagnostics } = extract(
      filledAreas(new Map([[`${MIN_X},${MIN_Y},7`, []]])),
    );

    const paths = diagnostics.map((item) => item.path);
    expect([...paths].sort((left, right) => left.localeCompare(right))).toEqual(
      paths,
    );
  });

  it('produces the same definition when run twice on the same input', () => {
    expect(extract().hunt).toEqual(extract().hunt);
  });

  it('reports a server id that the tile flags table does not cover', () => {
    const { diagnostics } = extract(
      filledAreas(new Map([[`${MIN_X},${MIN_Y},7`, [GROUND, 4242]]])),
    );

    expect(
      diagnostics.filter((item) => item.code === 'HUNT_ID_MISMATCH'),
    ).toHaveLength(1);
  });

  it('fills a synthetic hole so extraction reports no HUNT_EMPTY_TILE', () => {
    const areas = filledAreas(new Map([[`${MIN_X + 1},${MIN_Y + 1},8`, []]]));
    const { diagnostics } = extractHunt(
      encodeOtbmMap(areas),
      spawnXml,
      flags,
      selection,
      holeLayout(),
    );

    expect(
      diagnostics.filter((item) => item.code === 'HUNT_EMPTY_TILE'),
    ).toHaveLength(0);
  });

  it('preserves collision when cells fills a synthetic hole', () => {
    const areas = filledAreas(new Map([[`${MIN_X + 1},${MIN_Y + 1},8`, []]]));
    const source = encodeOtbmMap(areas);
    const base = extractHunt(source, spawnXml, flags, selection).hunt;
    const result = extractHunt(
      source,
      spawnXml,
      flags,
      selection,
      holeLayout(),
    ).hunt;

    expect(
      result.region.floors.map(({ z, collision }) => ({ z, collision })),
    ).toEqual(base.region.floors.map(({ z, collision }) => ({ z, collision })));
  });
});
