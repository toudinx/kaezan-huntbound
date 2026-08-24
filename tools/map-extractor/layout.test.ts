import { describe, expect, it } from 'vitest';

import type { HuntSelectionRegion } from '../hunt-selection/types.ts';
import {
  applyHuntLayout,
  type HuntLayoutRecipe,
  parseHuntLayoutRecipe,
} from './layout.ts';
import type { OtbmTile } from './otbm.ts';

const sourceRegion: HuntSelectionRegion = {
  minX: 100,
  minY: 200,
  maxX: 103,
  maxY: 203,
  floors: [8],
};

function recipe(overrides: Partial<HuntLayoutRecipe> = {}): HuntLayoutRecipe {
  return {
    schemaVersion: 1,
    layoutId: 'layout:huntbound:test',
    width: 4,
    height: 3,
    floors: [{ z: 8, operations: [] }],
    cells: [],
    playerStart: { x: 0, y: 0, z: 8 },
    transitions: [],
    spawnPlacements: [],
    ...overrides,
  };
}

describe('parseHuntLayoutRecipe', () => {
  it('treats an omitted cells layer as an empty reversible overlay', () => {
    const { cells: _cells, ...legacyRecipe } = recipe();

    expect(parseHuntLayoutRecipe(legacyRecipe, sourceRegion).cells).toEqual([]);
  });

  it('rejects duplicate coordinates in the cells layer', () => {
    expect(() =>
      parseHuntLayoutRecipe(
        {
          ...recipe(),
          cells: [
            { x: 1, y: 1, z: 8, ground: 101 },
            { x: 1, y: 1, z: 8, ground: 101 },
          ],
        },
        sourceRegion,
      ),
    ).toThrow(/cells.*duplicated/);
  });

  it('rejects a cells ground id outside the borderizer vocabulary', () => {
    expect(() =>
      parseHuntLayoutRecipe(
        {
          ...recipe(),
          cells: [{ x: 1, y: 1, z: 8, ground: 999 }],
        },
        sourceRegion,
      ),
    ).toThrow(/cells.*ground.*vocabulary/);
  });

  it('rejects an operation whose target leaves the authored region', () => {
    expect(() =>
      parseHuntLayoutRecipe(
        {
          schemaVersion: 1,
          layoutId: 'layout:huntbound:test',
          width: 4,
          height: 4,
          floors: [
            {
              z: 8,
              operations: [
                {
                  kind: 'copy-rect',
                  from: { minX: 100, minY: 200, z: 8 },
                  width: 2,
                  height: 2,
                  to: { x: 3, y: 3 },
                },
              ],
            },
          ],
          playerStart: { x: 0, y: 0, z: 8 },
          transitions: [],
          spawnPlacements: [],
        },
        sourceRegion,
      ),
    ).toThrow(/HUNT_LAYOUT_INVALID/);
  });

  it('rejects unknown operation keys instead of silently changing the recipe', () => {
    expect(() =>
      parseHuntLayoutRecipe(
        {
          schemaVersion: 1,
          layoutId: 'layout:huntbound:test',
          width: 4,
          height: 3,
          floors: [
            {
              z: 8,
              operations: [
                {
                  kind: 'copy-cell',
                  from: { x: 100, y: 200, z: 8 },
                  to: { x: 0, y: 0 },
                  unexpected: true,
                },
              ],
            },
          ],
          playerStart: { x: 0, y: 0, z: 8 },
          transitions: [],
          spawnPlacements: [],
        },
        sourceRegion,
      ),
    ).toThrow(/HUNT_LAYOUT_INVALID/);
  });
});

describe('applyHuntLayout', () => {
  it('applies cells after collation and replaces only the ground item', () => {
    const authored = parseHuntLayoutRecipe(
      {
        ...recipe({
          width: 1,
          height: 1,
          floors: [
            {
              z: 8,
              operations: [
                {
                  kind: 'copy-cell',
                  from: { x: 100, y: 200, z: 8 },
                  to: { x: 0, y: 0 },
                },
              ],
            },
          ],
        }),
        cells: [{ x: 0, y: 0, z: 8, ground: 101 }],
      },
      sourceRegion,
    );

    expect(
      applyHuntLayout([{ x: 100, y: 200, z: 8, items: [100, 777] }], authored),
    ).toEqual([{ x: 0, y: 0, z: 8, items: [101, 777] }]);
  });

  it('materializes a cell when the collation left the target empty', () => {
    const authored = parseHuntLayoutRecipe(
      {
        ...recipe({
          width: 2,
          height: 1,
          floors: [
            {
              z: 8,
              operations: [
                {
                  kind: 'copy-rect',
                  from: { minX: 100, minY: 200, z: 8 },
                  width: 2,
                  height: 1,
                  to: { x: 0, y: 0 },
                },
              ],
            },
          ],
        }),
        cells: [{ x: 1, y: 0, z: 8, ground: 101 }],
      },
      sourceRegion,
    );

    expect(
      applyHuntLayout([{ x: 100, y: 200, z: 8, items: [100] }], authored),
    ).toEqual([
      { x: 0, y: 0, z: 8, items: [100] },
      { x: 1, y: 0, z: 8, items: [101] },
    ]);
  });

  it('applies copy, erase, and copy-cell in declared order', () => {
    const sourceTiles: readonly OtbmTile[] = [
      { x: 100, y: 200, z: 8, items: [100, 200] },
      { x: 101, y: 200, z: 8, items: [300] },
      { x: 102, y: 200, z: 8, items: [400] },
    ];
    const authored = recipe({
      width: 3,
      height: 1,
      floors: [
        {
          z: 8,
          operations: [
            {
              kind: 'copy-rect',
              from: { minX: 100, minY: 200, z: 8 },
              width: 2,
              height: 1,
              to: { x: 0, y: 0 },
            },
            { kind: 'erase-rect', at: { x: 1, y: 0 }, width: 1, height: 1 },
            {
              kind: 'copy-cell',
              from: { x: 102, y: 200, z: 8 },
              to: { x: 1, y: 0 },
            },
          ],
        },
      ],
    });

    const output = applyHuntLayout(sourceTiles, authored);

    expect(output).toEqual([
      { x: 0, y: 0, z: 8, items: [100, 200] },
      { x: 1, y: 0, z: 8, items: [400] },
    ]);
    expect(applyHuntLayout(sourceTiles, authored)).toEqual(output);
    expect(sourceTiles).toEqual([
      { x: 100, y: 200, z: 8, items: [100, 200] },
      { x: 101, y: 200, z: 8, items: [300] },
      { x: 102, y: 200, z: 8, items: [400] },
    ]);
  });
});
