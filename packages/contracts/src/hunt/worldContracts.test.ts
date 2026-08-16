import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  HUNT_SCHEMA_VERSION as RootHuntSchemaVersion,
  MapRegionSchema as RootMapRegionSchema,
  validateHuntDefinition as RootValidateHuntDefinition,
} from '../index.ts';
import {
  huntDiagnosticsFromZodError,
  validateHuntDefinition,
  validateMapRegion,
} from './diagnostics.ts';
import {
  HuntDefinitionSchema,
  SpawnTableSchema,
  TransitionTableSchema,
} from './schemas.ts';
import type { MapRegion, RegionId } from './types.ts';

function createRegion(): MapRegion {
  return {
    schemaVersion: 1,
    regionId: 'region:venore-rotworm-cave' as RegionId,
    regionRevision: 1,
    origin: { x: 33002, y: 31995 },
    width: 2,
    height: 2,
    palette: [100, 200],
    floors: [
      {
        z: 8,
        ground: [0, 1, 0, 1],
        objectsBelow: [],
        objectsAbove: [],
        collision: [],
      },
    ],
  };
}

type MutableRegionFloor = {
  [key: string]: unknown;
  z: number;
  ground: number[];
  objectsBelow: Array<{ i: number; stack: number[] }>;
  objectsAbove: Array<{ i: number; stack: number[] }>;
  collision: number[];
};

type MutableRegion = {
  [key: string]: unknown;
  width: number;
  height: number;
  palette: number[];
  floors: MutableRegionFloor[];
};

function cloneRegion() {
  return structuredClone(createRegion()) as unknown as MutableRegion;
}

function at<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Expected test fixture value at index ${index}`);
  }
  return value;
}

function diagnosticsFor(input: unknown) {
  const result = validateMapRegion(input);
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('Expected the map region to be rejected');
  }
  return result.diagnostics;
}

function expectDiagnostic(
  input: unknown,
  code: string,
  path?: readonly (string | number)[],
) {
  const diagnostics = diagnosticsFor(input);
  expect(diagnostics.some((diagnostic) => diagnostic.code === code)).toBe(true);
  if (path !== undefined) {
    expect(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.code === code &&
          diagnostic.path.join('.') === path.join('.'),
      ),
    ).toBe(true);
  }
}

function expectSchemaDiagnostic(
  schema: {
    safeParse(input: unknown): { success: boolean; error?: z.ZodError };
  },
  input: unknown,
  code: string,
  path?: readonly (string | number)[],
) {
  const result = schema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success || result.error === undefined) {
    throw new Error('Expected the schema to reject the input');
  }
  const diagnostics = huntDiagnosticsFromZodError(result.error);
  expect(diagnostics.some((diagnostic) => diagnostic.code === code)).toBe(true);
  if (path !== undefined) {
    expect(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.code === code &&
          diagnostic.path.join('.') === path.join('.'),
      ),
    ).toBe(true);
  }
}

describe('MapRegion contract', () => {
  it('accepts a valid 2x2 region with one floor', () => {
    const result = validateMapRegion(createRegion());

    expect(result).toEqual({ ok: true, value: createRegion() });
  });

  it('rejects a ground array whose length is not width times height', () => {
    const input = cloneRegion();
    at(input.floors, 0).ground = [0, 1, 0];

    expectDiagnostic(input, 'SIM_SCHEMA_INVALID', ['floors', 0, 'ground']);
  });

  it('rejects a ground palette index outside the palette', () => {
    const input = cloneRegion();
    at(input.floors, 0).ground[3] = 2;

    expectDiagnostic(input, 'HUNT_PALETTE_INDEX_INVALID', [
      'floors',
      0,
      'ground',
      3,
    ]);
  });

  it('rejects duplicate palette values', () => {
    const input = cloneRegion();
    input.palette = [100, 100];

    expectDiagnostic(input, 'SIM_SCHEMA_INVALID', ['palette', 1]);
  });

  it('rejects a palette that is not strictly increasing', () => {
    const input = cloneRegion();
    input.palette = [200, 100];

    expectDiagnostic(input, 'SIM_SCHEMA_INVALID', ['palette', 1]);
  });

  it('rejects floors that are not strictly ordered by z', () => {
    const input = cloneRegion();
    input.floors.push({
      z: 7,
      ground: [0, 1, 0, 1],
      objectsBelow: [],
      objectsAbove: [],
      collision: [],
    });

    expectDiagnostic(input, 'SIM_SCHEMA_INVALID', ['floors', 1, 'z']);
  });

  it('rejects a region without floors', () => {
    const input = cloneRegion();
    input.floors = [];

    expectDiagnostic(input, 'SIM_SCHEMA_INVALID', ['floors']);
  });

  it('rejects duplicate sparse object indices', () => {
    const input = cloneRegion();
    at(input.floors, 0).objectsBelow = [
      { i: 1, stack: [0] },
      { i: 1, stack: [1] },
    ];

    expectDiagnostic(input, 'SIM_SCHEMA_INVALID', [
      'floors',
      0,
      'objectsBelow',
      1,
      'i',
    ]);
  });

  it('rejects objectsAbove indices that are not strictly ordered', () => {
    const input = cloneRegion();
    at(input.floors, 0).objectsAbove = [
      { i: 2, stack: [0] },
      { i: 1, stack: [1] },
    ];

    expectDiagnostic(input, 'SIM_SCHEMA_INVALID', [
      'floors',
      0,
      'objectsAbove',
      1,
      'i',
    ]);
  });

  it('rejects an empty sparse object stack', () => {
    const input = cloneRegion();
    at(input.floors, 0).objectsBelow = [{ i: 1, stack: [] }];

    expectDiagnostic(input, 'SIM_SCHEMA_INVALID', [
      'floors',
      0,
      'objectsBelow',
      0,
      'stack',
    ]);
  });

  it('rejects collision indices that are not strictly ordered', () => {
    const input = cloneRegion();
    at(input.floors, 0).collision = [2, 1];

    expectDiagnostic(input, 'SIM_SCHEMA_INVALID', [
      'floors',
      0,
      'collision',
      1,
    ]);
  });

  it('rejects a negative sparse index', () => {
    const input = cloneRegion();
    at(input.floors, 0).collision = [-1];

    expectDiagnostic(input, 'SIM_SCHEMA_INVALID', [
      'floors',
      0,
      'collision',
      0,
    ]);
  });

  it('rejects a sparse index at or beyond the number of cells', () => {
    const input = cloneRegion();
    at(input.floors, 0).collision = [4];

    expectDiagnostic(input, 'SIM_SCHEMA_INVALID', [
      'floors',
      0,
      'collision',
      0,
    ]);
  });

  it.each([
    ['width', 97],
    ['height', 97],
  ])(
    'rejects a region with %s above the 96 tile budget',
    (dimension, value) => {
      const input = cloneRegion();
      input[dimension] = value;

      expectDiagnostic(input, 'HUNT_REGION_OUT_OF_BUDGET', [dimension]);
    },
  );

  it('rejects more than three floors by budget', () => {
    const input = cloneRegion();
    input.floors.push(
      {
        z: 9,
        ground: [0, 1, 0, 1],
        objectsBelow: [],
        objectsAbove: [],
        collision: [],
      },
      {
        z: 10,
        ground: [0, 1, 0, 1],
        objectsBelow: [],
        objectsAbove: [],
        collision: [],
      },
      {
        z: 11,
        ground: [0, 1, 0, 1],
        objectsBelow: [],
        objectsAbove: [],
        collision: [],
      },
    );

    expectDiagnostic(input, 'HUNT_REGION_OUT_OF_BUDGET', ['floors']);
  });

  it('rejects a decimal in a nested numeric field', () => {
    const input = cloneRegion();
    at(input.floors, 0).objectsBelow = [{ i: 1.5, stack: [0] }];

    expectDiagnostic(input, 'SIM_SCHEMA_INVALID', [
      'floors',
      0,
      'objectsBelow',
      0,
      'i',
    ]);
  });

  it('rejects unknown fields at every strict object boundary', () => {
    const input = cloneRegion();
    at(input.floors, 0).unexpected = true;

    expectDiagnostic(input, 'SIM_SCHEMA_INVALID', ['floors', 0]);
  });

  it('sorts diagnostics on the same path by code', () => {
    const schema = z.object({}).superRefine((_value, context) => {
      context.addIssue({
        code: 'custom',
        path: ['same'],
        message: 'schema',
        params: { huntCode: 'SIM_SCHEMA_INVALID' },
      });
      context.addIssue({
        code: 'custom',
        path: ['same'],
        message: 'budget',
        params: { huntCode: 'HUNT_REGION_OUT_OF_BUDGET' },
      });
    });
    const parsed = schema.safeParse({});

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error('Expected the diagnostic fixture to be rejected');
    }

    expect(
      huntDiagnosticsFromZodError(parsed.error).map(
        (diagnostic) => diagnostic.code,
      ),
    ).toEqual(['HUNT_REGION_OUT_OF_BUDGET', 'SIM_SCHEMA_INVALID']);
  });
});

describe('TransitionTable contract', () => {
  function createTransitionTable() {
    return {
      entries: [
        {
          from: { x: 0, y: 0, z: 8 },
          to: { x: 0, y: 0, z: 9 },
        },
      ],
      dropped: 0,
    };
  }

  it('accepts a transition between adjacent floors', () => {
    expect(
      TransitionTableSchema.safeParse(createTransitionTable()).success,
    ).toBe(true);
  });

  it('rejects a transition from a cell to itself', () => {
    const input = createTransitionTable();
    at(input.entries, 0).to = { x: 0, y: 0, z: 8 };

    expectSchemaDiagnostic(
      TransitionTableSchema,
      input,
      'HUNT_TRANSITION_INVALID',
      ['entries', 0, 'to'],
    );
  });

  it('rejects two entries with the same from position', () => {
    const input = createTransitionTable();
    input.entries.push({
      from: { x: 0, y: 0, z: 8 },
      to: { x: 1, y: 0, z: 7 },
    });

    expectSchemaDiagnostic(
      TransitionTableSchema,
      input,
      'HUNT_TRANSITION_INVALID',
      ['entries', 1, 'from'],
    );
  });

  it('rejects entries that are not ordered by from z, y, x', () => {
    const input = createTransitionTable();
    input.entries.unshift({
      from: { x: 0, y: 0, z: 9 },
      to: { x: 0, y: 0, z: 8 },
    });

    expectSchemaDiagnostic(
      TransitionTableSchema,
      input,
      'HUNT_TRANSITION_INVALID',
      ['entries', 1, 'from'],
    );
  });

  it.each([-1, 0.5])('rejects invalid dropped count %s', (dropped) => {
    const input = createTransitionTable();
    input.dropped = dropped;

    expectSchemaDiagnostic(TransitionTableSchema, input, 'SIM_SCHEMA_INVALID', [
      'dropped',
    ]);
  });

  it('rejects a transition that jumps more than one floor', () => {
    const input = createTransitionTable();
    at(input.entries, 0).to = { x: 0, y: 0, z: 10 };

    expectSchemaDiagnostic(
      TransitionTableSchema,
      input,
      'HUNT_TRANSITION_INVALID',
      ['entries', 0, 'to'],
    );
  });
});

describe('SpawnTable contract', () => {
  function createSpawnTable() {
    return {
      groups: [
        {
          center: { x: 0, y: 0, z: 8 },
          radius: 1,
          slots: [
            {
              creatureKey: 'creature:tibia:rotworm',
              blueprintId: 'rotworm',
              offsetX: 0,
              offsetY: 0,
              offsetZ: 0,
              respawnTicks: 1800,
            },
          ],
        },
      ],
      maxLiveActors: 64,
    };
  }

  it('accepts a bounded spawn table with a positive respawn time', () => {
    expect(SpawnTableSchema.safeParse(createSpawnTable()).success).toBe(true);
  });

  it.each([-1, 16])('rejects a radius outside 0..15: %s', (radius) => {
    const input = createSpawnTable();
    at(input.groups, 0).radius = radius;

    expectSchemaDiagnostic(SpawnTableSchema, input, 'SIM_SCHEMA_INVALID', [
      'groups',
      0,
      'radius',
    ]);
  });

  it.each([0, -1, 1.5])(
    'rejects a respawnTicks value that is not positive integer: %s',
    (respawnTicks) => {
      const input = createSpawnTable();
      at(at(input.groups, 0).slots, 0).respawnTicks = respawnTicks;

      expectSchemaDiagnostic(SpawnTableSchema, input, 'SIM_SCHEMA_INVALID', [
        'groups',
        0,
        'slots',
        0,
        'respawnTicks',
      ]);
    },
  );

  it.each([0, 65, 1.5])(
    'rejects maxLiveActors outside 1..64: %s',
    (maxLiveActors) => {
      const input = createSpawnTable();
      input.maxLiveActors = maxLiveActors;

      expectSchemaDiagnostic(SpawnTableSchema, input, 'SIM_SCHEMA_INVALID', [
        'maxLiveActors',
      ]);
    },
  );

  it('rejects groups that are not ordered by center z, y, x', () => {
    const input = createSpawnTable();
    input.groups.unshift({
      center: { x: 0, y: 0, z: 9 },
      radius: 1,
      slots: [...at(input.groups, 0).slots],
    });

    expectSchemaDiagnostic(SpawnTableSchema, input, 'SIM_SCHEMA_INVALID', [
      'groups',
      1,
      'center',
    ]);
  });

  it('rejects duplicate group centers', () => {
    const input = createSpawnTable();
    input.groups.push(structuredClone(at(input.groups, 0)));

    expectSchemaDiagnostic(SpawnTableSchema, input, 'SIM_SCHEMA_INVALID', [
      'groups',
      1,
      'center',
    ]);
  });

  it('rejects a group with no slots', () => {
    const input = createSpawnTable();
    at(input.groups, 0).slots = [];

    expectSchemaDiagnostic(SpawnTableSchema, input, 'SIM_SCHEMA_INVALID', [
      'groups',
      0,
      'slots',
    ]);
  });
});

describe('HuntDefinition contract', () => {
  function createHuntDefinition() {
    return {
      schemaVersion: 1,
      huntId: 'hunt:tibia:venore-rotworm-cave',
      huntRevision: 1,
      region: {
        schemaVersion: 1,
        regionId: 'region:venore-rotworm-cave',
        regionRevision: 1,
        origin: { x: 33002, y: 31995 },
        width: 2,
        height: 2,
        palette: [100],
        floors: [
          {
            z: 8,
            ground: [0, 0, 0, 0],
            objectsBelow: [],
            objectsAbove: [],
            collision: [3],
          },
          {
            z: 9,
            ground: [0, 0, 0, 0],
            objectsBelow: [],
            objectsAbove: [],
            collision: [],
          },
        ],
      },
      transitions: {
        entries: [
          {
            from: { x: 0, y: 0, z: 8 },
            to: { x: 0, y: 0, z: 9 },
          },
        ],
        dropped: 0,
      },
      spawns: {
        groups: [
          {
            center: { x: 1, y: 0, z: 8 },
            radius: 1,
            slots: [
              {
                creatureKey: 'creature:tibia:rotworm',
                blueprintId: 'rotworm',
                offsetX: 0,
                offsetY: 0,
                offsetZ: 0,
                respawnTicks: 1800,
              },
            ],
          },
        ],
        maxLiveActors: 64,
      },
      blueprints: [
        {
          blueprintId: 'player',
          stepCooldownTicks: 1,
          behavior: 'inert',
          factionId: 1,
          maxHealth: 1,
          maxResource: 0,
          healthRegenTicks: 0,
          healthRegenAmount: 0,
          resourceRegenTicks: 0,
          resourceRegenAmount: 0,
          attackCooldownTicks: 0,
          attackMinDamage: 0,
          attackMaxDamage: 0,
          aggroRadius: 0,
          lootTableIndex: null,
          abilityIndices: [],
        },
        {
          blueprintId: 'rotworm',
          stepCooldownTicks: 1,
          behavior: 'inert',
          factionId: 2,
          maxHealth: 1,
          maxResource: 0,
          healthRegenTicks: 0,
          healthRegenAmount: 0,
          resourceRegenTicks: 0,
          resourceRegenAmount: 0,
          attackCooldownTicks: 0,
          attackMinDamage: 0,
          attackMaxDamage: 0,
          aggroRadius: 0,
          lootTableIndex: null,
          abilityIndices: [],
        },
      ],
      playerStart: { x: 0, y: 1, z: 8 },
      playerBlueprintId: 'player',
    };
  }

  function huntDiagnosticsFor(input: unknown) {
    const result = validateHuntDefinition(input);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected the hunt definition to be rejected');
    }
    return result.diagnostics;
  }

  function expectHuntDiagnostic(
    input: unknown,
    code: string,
    path: readonly (string | number)[],
  ) {
    const diagnostics = huntDiagnosticsFor(input);
    expect(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.code === code &&
          diagnostic.path.join('.') === path.join('.'),
      ),
    ).toBe(true);
  }

  it('accepts a definition whose references stay inside the extracted world', () => {
    const result = validateHuntDefinition(createHuntDefinition());

    expect(result.ok).toBe(true);
  });

  it('rejects a spawn slot that names an unknown blueprint', () => {
    const input = structuredClone(createHuntDefinition());
    at(at(input.spawns.groups, 0).slots, 0).blueprintId = 'missing';

    expectHuntDiagnostic(input, 'HUNT_UNKNOWN_BLUEPRINT', [
      'spawns',
      'groups',
      0,
      'slots',
      0,
      'blueprintId',
    ]);
  });

  it('rejects a player blueprint that is not declared', () => {
    const input = structuredClone(createHuntDefinition());
    input.playerBlueprintId = 'missing';

    expectHuntDiagnostic(input, 'HUNT_UNKNOWN_BLUEPRINT', [
      'playerBlueprintId',
    ]);
  });

  it('rejects a spawn group center outside the region', () => {
    const input = structuredClone(createHuntDefinition());
    at(input.spawns.groups, 0).center.x = 2;

    expectHuntDiagnostic(input, 'HUNT_SPAWN_OUT_OF_REGION', [
      'spawns',
      'groups',
      0,
      'center',
    ]);
  });

  it('rejects a player start outside the region', () => {
    const input = structuredClone(createHuntDefinition());
    input.playerStart.x = 2;

    expectHuntDiagnostic(input, 'HUNT_SPAWN_OUT_OF_REGION', ['playerStart']);
  });

  it('rejects a player start on a collision tile', () => {
    const input = structuredClone(createHuntDefinition());
    input.playerStart = { x: 1, y: 1, z: 8 };

    expectHuntDiagnostic(input, 'HUNT_SPAWN_OUT_OF_REGION', ['playerStart']);
  });

  it('rejects a transition from a floor that was not extracted', () => {
    const input = structuredClone(createHuntDefinition());
    at(input.transitions.entries, 0).from.z = 7;

    expectHuntDiagnostic(input, 'HUNT_TRANSITION_INVALID', [
      'transitions',
      'entries',
      0,
      'from',
    ]);
  });

  it('rejects duplicate blueprint ids', () => {
    const input = structuredClone(createHuntDefinition());
    at(input.blueprints, 1).blueprintId = 'player';

    const diagnostics = huntDiagnosticsFor(input);
    expect(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.code === 'SIM_SCHEMA_INVALID' &&
          diagnostic.path.join('.') === 'blueprints.1.blueprintId',
      ),
    ).toBe(true);
  });

  it('rejects unknown fields on the hunt definition', () => {
    const input = structuredClone(createHuntDefinition()) as Record<
      string,
      unknown
    >;
    input.unexpected = true;

    const diagnostics = huntDiagnosticsFor(input);
    expect(
      diagnostics.some(
        (diagnostic) => diagnostic.code === 'SIM_SCHEMA_INVALID',
      ),
    ).toBe(true);
  });

  it('exposes the composed schema for direct parsing', () => {
    expect(HuntDefinitionSchema.safeParse(createHuntDefinition()).success).toBe(
      true,
    );
  });

  it('exports the hunt contract surface from the package root', () => {
    expect(RootHuntSchemaVersion).toBe(1);
    expect(RootMapRegionSchema).toBeDefined();
    expect(RootValidateHuntDefinition(createHuntDefinition()).ok).toBe(true);
  });
});
