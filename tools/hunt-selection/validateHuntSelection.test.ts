import { describe, expect, it } from 'vitest';

import {
  convertSpawntimeToTicks,
  validateHuntSelection,
} from './validateHuntSelection.ts';

const catalogCreatureKeys = ['creature:tibia:rotworm'];

function selection(
  overrides: Partial<{
    region: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      floors: readonly number[];
    };
    creatures: readonly string[];
    excludedCreatures: readonly {
      name: string;
      reason: string;
      count: number;
    }[];
    expectedSpawnGroups: number;
    expectedSpawnSlots: number;
    source: { map?: string; spawns?: string };
  }> = {},
) {
  return {
    key: 'hunt:tibia:venore-rotworm-cave',
    displayName: 'Venore Rotworm Cave',
    sourceUrl: 'https://tibiaroute.com/br/hunting-places/Venore-Rotworm-Cave',
    source: {
      map: 'data-otservbr-global/world/otservbr.otbm',
      spawns: 'data-otservbr-global/world/otservbr-monster.xml',
    },
    layout: 'layouts/hunts/venore-rotworm-cave.json',
    recommendedLevel: 8,
    soloVocation: 'vocation:tibia:knight',
    region: {
      minX: 100,
      minY: 200,
      maxX: 102,
      maxY: 201,
      floors: [8, 9],
      ...overrides.region,
    },
    creatures: ['creature:tibia:rotworm'],
    excludedCreatures: [],
    expectedSpawnGroups: 2,
    expectedSpawnSlots: 2,
    expectedDroppedTransitions: 0,
    budget: { maxFloors: 3, maxWidth: 96, maxHeight: 96 },
    ...overrides,
  };
}

function group(
  centerX: number,
  centerY: number,
  floor: number,
  slots: readonly string[],
) {
  return `<monster centerx="${centerX}" centery="${centerY}" centerz="${floor}" radius="2">${slots.join('')}</monster>`;
}

function slot(
  name: string,
  x: number,
  y: number,
  floor: number,
  spawntime = '90',
) {
  return `<monster name="${name}" x="${x}" y="${y}" z="${floor}" spawntime="${spawntime}" />`;
}

describe('validateHuntSelection', () => {
  it('accepts a valid selection and reports measured dimensions and spawn counts', () => {
    const xml = `<monsters>${group(100, 200, 8, [slot('Rotworm', 0, 0, 8)])}${group(102, 201, 9, [slot('Rotworm', 0, 0, 9)])}</monsters>`;

    const result = validateHuntSelection(selection(), xml, catalogCreatureKeys);

    expect(result).toEqual({
      ok: true,
      width: 3,
      height: 2,
      floors: [8, 9],
      spawnGroups: 2,
      spawnSlots: 2,
      creatureNames: ['Rotworm'],
      diagnostics: [],
    });
  });

  it('reports a 97-tile width at region.maxX', () => {
    const result = validateHuntSelection(
      selection({
        region: { minX: 100, minY: 200, maxX: 196, maxY: 200, floors: [8] },
        expectedSpawnGroups: 1,
        expectedSpawnSlots: 1,
      }),
      `<monsters>${group(100, 200, 8, [slot('Rotworm', 0, 0, 8)])}</monsters>`,
      catalogCreatureKeys,
    );

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        path: 'region.maxX',
        code: 'HUNT_REGION_OUT_OF_BUDGET',
      }),
    ]);
  });

  it('reports four floors at region.floors', () => {
    const result = validateHuntSelection(
      selection({
        region: {
          minX: 100,
          minY: 200,
          maxX: 100,
          maxY: 200,
          floors: [8, 9, 10, 11],
        },
        expectedSpawnGroups: 1,
        expectedSpawnSlots: 1,
      }),
      `<monsters>${group(100, 200, 8, [slot('Rotworm', 0, 0, 8)])}</monsters>`,
      catalogCreatureKeys,
    );

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        path: 'region.floors',
        code: 'HUNT_REGION_OUT_OF_BUDGET',
      }),
    ]);
  });

  it('reports a creature absent from the catalog when it is not excluded', () => {
    const result = validateHuntSelection(
      selection({
        region: { minX: 100, minY: 200, maxX: 100, maxY: 200, floors: [8] },
        expectedSpawnGroups: 0,
        expectedSpawnSlots: 0,
      }),
      `<monsters>${group(100, 200, 8, [slot('Troll', 0, 0, 8)])}</monsters>`,
      catalogCreatureKeys,
    );

    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'HUNT_UNKNOWN_CREATURE' }),
    ]);
  });

  it('accepts an explicitly excluded creature and leaves it out of creatureNames', () => {
    const result = validateHuntSelection(
      selection({
        region: { minX: 100, minY: 200, maxX: 100, maxY: 200, floors: [8] },
        excludedCreatures: [
          {
            name: 'Troll',
            reason: 'absent from PB-01 catalog',
            count: 1,
          },
        ],
        expectedSpawnGroups: 1,
        expectedSpawnSlots: 1,
      }),
      `<monsters>${group(100, 200, 8, [slot('Rotworm', 0, 0, 8), slot('Troll', 0, 1, 8)])}</monsters>`,
      catalogCreatureKeys,
    );

    expect(result.ok).toBe(true);
    expect(result.creatureNames).toEqual(['Rotworm']);
    expect(result.diagnostics).toEqual([]);
  });

  it('converts seconds to 50 ms ticks and distinguishes invalid spawntime reasons', () => {
    expect(convertSpawntimeToTicks('90')).toEqual({ ok: true, ticks: 1800 });
    expect(convertSpawntimeToTicks('2')).toEqual({ ok: true, ticks: 40 });

    const fractional = validateHuntSelection(
      selection({
        region: { minX: 100, minY: 200, maxX: 100, maxY: 200, floors: [8] },
        expectedSpawnGroups: 1,
        expectedSpawnSlots: 1,
      }),
      `<monsters>${group(100, 200, 8, [slot('Rotworm', 0, 0, 8, '0.03')])}</monsters>`,
      catalogCreatureKeys,
    );
    const nonNumeric = validateHuntSelection(
      selection({
        region: { minX: 100, minY: 200, maxX: 100, maxY: 200, floors: [8] },
        expectedSpawnGroups: 1,
        expectedSpawnSlots: 1,
      }),
      `<monsters>${group(100, 200, 8, [slot('Rotworm', 0, 0, 8, 'abc')])}</monsters>`,
      catalogCreatureKeys,
    );

    expect(fractional.diagnostics).toEqual([
      expect.objectContaining({
        code: 'HUNT_SPAWNTIME_NOT_DIVISIBLE',
        message: expect.stringContaining('multiple'),
      }),
    ]);
    expect(nonNumeric.diagnostics).toEqual([
      expect.objectContaining({
        code: 'HUNT_SPAWNTIME_NOT_DIVISIBLE',
        message: expect.stringContaining('numeric'),
      }),
    ]);
  });

  it('reports an empty region when no spawn slot is inside the box', () => {
    const result = validateHuntSelection(
      selection({
        region: { minX: 300, minY: 400, maxX: 300, maxY: 400, floors: [8] },
        expectedSpawnGroups: 0,
        expectedSpawnSlots: 0,
      }),
      `<monsters>${group(100, 200, 8, [slot('Rotworm', 0, 0, 8)])}</monsters>`,
      catalogCreatureKeys,
    );

    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'HUNT_EMPTY_REGION' }),
    ]);
  });

  it('orders diagnostics by code when two diagnostics share a path', () => {
    const result = validateHuntSelection(
      selection({
        region: { minX: 100, minY: 200, maxX: 100, maxY: 200, floors: [8] },
        expectedSpawnGroups: 0,
        expectedSpawnSlots: 0,
      }),
      `<monsters>${group(100, 200, 8, [slot('Troll', 0, 0, 8, '0.03')])}</monsters>`,
      catalogCreatureKeys,
    );

    expect(
      result.diagnostics.map(({ path, code }) => ({ path, code })),
    ).toEqual([
      {
        path: 'spawns[0]',
        code: 'HUNT_SPAWNTIME_NOT_DIVISIBLE',
      },
      { path: 'spawns[0]', code: 'HUNT_UNKNOWN_CREATURE' },
    ]);
  });

  it('requires the selection to name the map it is extracted from', () => {
    const result = validateHuntSelection(
      selection({ source: { spawns: 'data/world/spawns.xml' } }),
      `<monsters>${group(100, 200, 8, [slot('Rotworm', 0, 0, 8, '90')])}</monsters>`,
      catalogCreatureKeys,
    );

    expect(
      result.diagnostics.filter((item) => item.path === 'source.map'),
    ).toEqual([
      {
        path: 'source.map',
        code: 'HUNT_SOURCE_INVALID',
        message: 'Selection must name the snapshot map it is extracted from',
      },
    ]);
  });

  it('requires the selection to name its spawn declaration', () => {
    const result = validateHuntSelection(
      selection({ source: { map: 'data/world/map.otbm' } }),
      `<monsters>${group(100, 200, 8, [slot('Rotworm', 0, 0, 8, '90')])}</monsters>`,
      catalogCreatureKeys,
    );

    expect(
      result.diagnostics.filter((item) => item.path === 'source.spawns'),
    ).toEqual([
      {
        path: 'source.spawns',
        code: 'HUNT_SOURCE_INVALID',
        message: 'Selection must name the snapshot spawn declaration',
      },
    ]);
  });

  it('rejects a source path that escapes the snapshot root', () => {
    const result = validateHuntSelection(
      selection({
        source: { map: '../outside.otbm', spawns: 'data/world/spawns.xml' },
      }),
      `<monsters>${group(100, 200, 8, [slot('Rotworm', 0, 0, 8, '90')])}</monsters>`,
      catalogCreatureKeys,
    );

    expect(
      result.diagnostics.filter((item) => item.path === 'source.map'),
    ).toEqual([
      {
        path: 'source.map',
        code: 'HUNT_SOURCE_INVALID',
        message:
          'Source path must be relative to the snapshot root: ../outside.otbm',
      },
    ]);
  });

  it('rejects a layout path that escapes the selection directory', () => {
    const invalid = validateHuntSelection(
      {
        ...selection(),
        layout: '/outside.json',
        expectedSpawnGroups: 1,
        expectedSpawnSlots: 1,
      },
      `<monsters>${group(100, 200, 8, [slot('Rotworm', 0, 0, 8, '90')])}</monsters>`,
      catalogCreatureKeys,
    );
    expect(invalid.diagnostics).toEqual([
      {
        path: 'layout',
        code: 'HUNT_LAYOUT_INVALID',
        message:
          'Layout path must be relative to the selection file: /outside.json',
      },
    ]);
  });

  it('accepts a selection without a layout recipe', () => {
    const { layout: _layout, ...selectionWithoutLayout } = selection();
    const result = validateHuntSelection(
      {
        ...selectionWithoutLayout,
        expectedSpawnGroups: 1,
        expectedSpawnSlots: 1,
      },
      `<monsters>${group(100, 200, 8, [slot('Rotworm', 0, 0, 8, '90')])}</monsters>`,
      catalogCreatureKeys,
    );

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('accepts a selection that names both sources', () => {
    const result = validateHuntSelection(
      selection({
        region: { minX: 100, minY: 200, maxX: 102, maxY: 201, floors: [8] },
        expectedSpawnGroups: 1,
        expectedSpawnSlots: 1,
      }),
      `<monsters>${group(100, 200, 8, [slot('Rotworm', 0, 0, 8, '90')])}</monsters>`,
      catalogCreatureKeys,
    );

    expect(
      result.diagnostics.filter((item) => item.code === 'HUNT_SOURCE_INVALID'),
    ).toEqual([]);
  });

  it('resolves catalog creature keys with kebab-case names', () => {
    const result = validateHuntSelection(
      selection({
        creatures: ['creature:tibia:orc-spearman'],
        region: { minX: 100, minY: 200, maxX: 100, maxY: 200, floors: [8] },
        expectedSpawnGroups: 1,
        expectedSpawnSlots: 1,
      }),
      `<monsters>${group(100, 200, 8, [slot('Orc Spearman', 0, 0, 8)])}</monsters>`,
      ['creature:tibia:orc-spearman'],
    );

    expect(result.ok).toBe(true);
    expect(result.creatureNames).toEqual(['Orc Spearman']);
    expect(result.diagnostics).toEqual([]);
  });
});
