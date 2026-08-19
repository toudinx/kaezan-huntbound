import { describe, expect, it } from 'vitest';

import {
  validateKernelScenario,
  validateSimulationSnapshot,
} from './diagnostics';
import {
  SIMULATION_RULES_VERSION,
  SIMULATION_SCHEMA_VERSION,
} from './identity';
import type { SimulationValidationResult } from './types';

function at<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Missing test fixture value at index ${index}`);
  }
  return value;
}

function codes(result: SimulationValidationResult<unknown>): readonly string[] {
  return result.ok ? [] : result.diagnostics.map((item) => item.code);
}

function messages(
  result: SimulationValidationResult<unknown>,
): readonly string[] {
  return result.ok ? [] : result.diagnostics.map((item) => item.message);
}

function combatNeutral(
  blueprintId: string,
  stepCooldownTicks: number,
  behavior: 'inert' | 'wander',
) {
  return {
    blueprintId,
    stepCooldownTicks,
    behavior,
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
    lootTableIndex: null as number | null,
    abilityIndices: [] as number[],
  };
}

function combatState() {
  return {
    health: 1,
    resource: 0,
    targetEntityId: null as number | null,
    attackReadyAtTick: 0,
    groupReadyAtTick: 0,
    abilityCooldowns: [] as { abilityIndex: number; readyAtTick: number }[],
    nextHealthRegenTick: 0,
    nextResourceRegenTick: 0,
  };
}

/**
 * A two-floor scenario: `z = 7` on top of `z = 8`, one transition down and one
 * spawn group. Every v3 rule under test mutates a copy of this document.
 */
function createScenario() {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    scenarioId: 'pb-04-floors',
    scenarioRevision: 1,
    width: 4,
    height: 4,
    floors: [
      { z: 7, blockedTiles: [[1, 1]] },
      { z: 8, blockedTiles: [[3, 3]] },
    ],
    transitions: [{ from: { x: 2, y: 0, z: 7 }, to: { x: 2, y: 0, z: 8 } }],
    spawnGroups: [
      {
        center: { x: 1, y: 2, z: 8 },
        radius: 1,
        slots: [
          {
            blueprintId: 'wanderer',
            position: { x: 1, y: 2, z: 8 },
            respawnTicks: 1800,
          },
        ],
      },
    ],
    maxLiveActors: 8,
    abilities: [] as unknown[],
    lootTables: [] as unknown[],
    blueprints: [
      combatNeutral('walker', 2, 'inert'),
      combatNeutral('wanderer', 3, 'wander'),
    ],
    initialActors: [
      { blueprintId: 'walker', position: { x: 0, y: 0, z: 7 }, facing: 'e' },
    ],
  };
}

function createSnapshot() {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    rulesVersion: SIMULATION_RULES_VERSION,
    scenarioId: 'pb-04-floors',
    scenarioRevision: 1,
    seed: '0f1e2d3c4b5a6978',
    tick: 0,
    nextEntityId: 3,
    nextEventSequence: 1,
    nextCommandSequence: 1,
    randomStreams: [
      { label: 'ai', s0: 1, s1: 2, s2: 3, s3: 4, drawCount: 0 },
      { label: 'movement', s0: 1, s1: 2, s2: 3, s3: 4, drawCount: 0 },
      { label: 'scenario', s0: 1, s1: 2, s2: 3, s3: 4, drawCount: 0 },
      { label: 'spawn', s0: 1, s1: 2, s2: 3, s3: 4, drawCount: 0 },
    ],
    actors: [
      {
        entityId: 1,
        blueprintId: 'walker',
        position: { x: 0, y: 0, z: 7 },
        facing: 'e',
        readyAtTick: 0,
        transitionGuard: null as { x: number; y: number; z: number } | null,
        ...combatState(),
      },
      {
        entityId: 2,
        blueprintId: 'wanderer',
        position: { x: 1, y: 2, z: 8 },
        facing: 'n',
        readyAtTick: 0,
        transitionGuard: { x: 1, y: 2, z: 8 },
        ...combatState(),
      },
    ],
    pendingCommands: [],
    pendingIntents: [],
    spawnSlots: [
      { groupIndex: 0, slotIndex: 0, readyAtTick: 0, entityId: 2 },
      { groupIndex: 0, slotIndex: 1, readyAtTick: 12, entityId: null },
    ],
  };
}

describe('KernelScenario v3', () => {
  it('accepts the multi-floor document with transitions and spawn groups', () => {
    expect(validateKernelScenario(createScenario()).ok).toBe(true);
  });

  it('rejects the v2 shape that declared a single z and flat blockedTiles', () => {
    const legacy = createScenario() as unknown as Record<string, unknown>;
    legacy.z = 7;
    legacy.blockedTiles = [[1, 1]];
    delete legacy.floors;

    expect(validateKernelScenario(legacy).ok).toBe(false);
  });

  it('rejects an empty floor list', () => {
    const scenario = createScenario();
    scenario.floors = [];

    expect(codes(validateKernelScenario(scenario))).toContain(
      'SIM_SCHEMA_INVALID',
    );
  });

  it('rejects floors that are not strictly ordered by ascending z', () => {
    const unordered = createScenario();
    unordered.floors = [
      { z: 8, blockedTiles: [[3, 3]] },
      { z: 7, blockedTiles: [[1, 1]] },
    ];
    expect(validateKernelScenario(unordered).ok).toBe(false);

    const duplicated = createScenario();
    duplicated.floors = [
      { z: 7, blockedTiles: [] },
      { z: 7, blockedTiles: [] },
    ];
    expect(validateKernelScenario(duplicated).ok).toBe(false);
  });

  it('keeps the per-floor blocked tile rules of the flat list', () => {
    const unordered = createScenario();
    unordered.floors = [
      {
        z: 7,
        blockedTiles: [
          [2, 2],
          [1, 1],
        ],
      },
      { z: 8, blockedTiles: [] },
    ];
    expect(validateKernelScenario(unordered).ok).toBe(false);

    const outside = createScenario();
    outside.floors = [
      { z: 7, blockedTiles: [[4, 1]] },
      { z: 8, blockedTiles: [] },
    ];
    expect(validateKernelScenario(outside).ok).toBe(false);
  });

  it('rejects a transition whose from or to sits on a floor that is not declared', () => {
    const missingSource = createScenario();
    missingSource.transitions = [
      { from: { x: 2, y: 0, z: 6 }, to: { x: 2, y: 0, z: 8 } },
    ];
    expect(validateKernelScenario(missingSource).ok).toBe(false);

    const missingTarget = createScenario();
    missingTarget.transitions = [
      { from: { x: 2, y: 0, z: 7 }, to: { x: 2, y: 0, z: 9 } },
    ];
    expect(validateKernelScenario(missingTarget).ok).toBe(false);
  });

  it('rejects a transition that leaves the grid, lands on terrain, or repeats a source', () => {
    const outside = createScenario();
    outside.transitions = [
      { from: { x: 2, y: 0, z: 7 }, to: { x: 4, y: 0, z: 8 } },
    ];
    expect(validateKernelScenario(outside).ok).toBe(false);

    const ontoTerrain = createScenario();
    ontoTerrain.transitions = [
      { from: { x: 2, y: 0, z: 7 }, to: { x: 3, y: 3, z: 8 } },
    ];
    expect(validateKernelScenario(ontoTerrain).ok).toBe(false);

    const duplicateSource = createScenario();
    duplicateSource.transitions = [
      { from: { x: 2, y: 0, z: 7 }, to: { x: 2, y: 0, z: 8 } },
      { from: { x: 2, y: 0, z: 7 }, to: { x: 1, y: 0, z: 8 } },
    ];
    expect(validateKernelScenario(duplicateSource).ok).toBe(false);

    const selfLoop = createScenario();
    selfLoop.transitions = [
      { from: { x: 2, y: 0, z: 7 }, to: { x: 2, y: 0, z: 7 } },
    ];
    expect(validateKernelScenario(selfLoop).ok).toBe(false);
  });

  it('rejects a spawn group whose center, radius or slots are unusable', () => {
    const centerOutside = createScenario();
    centerOutside.spawnGroups = [
      {
        center: { x: 9, y: 2, z: 8 },
        radius: 1,
        slots: [
          {
            blueprintId: 'wanderer',
            position: { x: 1, y: 2, z: 8 },
            respawnTicks: 1800,
          },
        ],
      },
    ];
    expect(validateKernelScenario(centerOutside).ok).toBe(false);

    const unknownBlueprint = createScenario();
    unknownBlueprint.spawnGroups = [
      {
        center: { x: 1, y: 2, z: 8 },
        radius: 1,
        slots: [
          {
            blueprintId: 'missing',
            position: { x: 1, y: 2, z: 8 },
            respawnTicks: 1800,
          },
        ],
      },
    ];
    expect(validateKernelScenario(unknownBlueprint).ok).toBe(false);

    const slotOutsideRadius = createScenario();
    slotOutsideRadius.spawnGroups = [
      {
        center: { x: 1, y: 2, z: 8 },
        radius: 1,
        slots: [
          {
            blueprintId: 'wanderer',
            position: { x: 3, y: 2, z: 8 },
            respawnTicks: 1800,
          },
        ],
      },
    ];
    expect(validateKernelScenario(slotOutsideRadius).ok).toBe(false);

    const duplicateCenter = createScenario();
    duplicateCenter.spawnGroups = [
      createScenario().spawnGroups[0],
      createScenario().spawnGroups[0],
    ] as typeof duplicateCenter.spawnGroups;
    expect(validateKernelScenario(duplicateCenter).ok).toBe(false);

    const duplicateSlot = createScenario();
    duplicateSlot.spawnGroups = [
      {
        center: { x: 1, y: 2, z: 8 },
        radius: 1,
        slots: [
          {
            blueprintId: 'wanderer',
            position: { x: 1, y: 2, z: 8 },
            respawnTicks: 1800,
          },
          {
            blueprintId: 'wanderer',
            position: { x: 1, y: 2, z: 8 },
            respawnTicks: 1800,
          },
        ],
      },
    ];
    expect(validateKernelScenario(duplicateSlot).ok).toBe(false);
  });

  it('requires an initial actor to stand on a declared floor', () => {
    const scenario = createScenario();
    scenario.initialActors = [
      { blueprintId: 'walker', position: { x: 0, y: 0, z: 9 }, facing: 'e' },
    ];

    expect(validateKernelScenario(scenario).ok).toBe(false);
  });

  it('lets the same cell be free on one floor and blocked on another', () => {
    const scenario = createScenario();
    scenario.floors = [
      { z: 7, blockedTiles: [[1, 1]] },
      { z: 8, blockedTiles: [] },
    ];
    scenario.initialActors = [
      { blueprintId: 'walker', position: { x: 1, y: 1, z: 8 }, facing: 'e' },
    ];

    expect(validateKernelScenario(scenario).ok).toBe(true);
  });

  it('requires a positive live actor ceiling', () => {
    const scenario = createScenario();
    scenario.maxLiveActors = 0;

    expect(validateKernelScenario(scenario).ok).toBe(false);
  });
});

describe('SimulationSnapshot v3', () => {
  it('accepts transitionGuard and spawnSlots', () => {
    expect(validateSimulationSnapshot(createSnapshot()).ok).toBe(true);
  });

  it('rejects a snapshot written by schema version 2', () => {
    const snapshot = createSnapshot();
    snapshot.schemaVersion = 2;

    expect(codes(validateSimulationSnapshot(snapshot))).toContain(
      'SIM_VERSION_MISMATCH',
    );
  });

  it('rejects a snapshot written by rules version 1', () => {
    const snapshot = createSnapshot();
    snapshot.rulesVersion = 1;

    expect(codes(validateSimulationSnapshot(snapshot))).toContain(
      'SIM_VERSION_MISMATCH',
    );
  });

  it('rejects an actor without the transitionGuard field', () => {
    const snapshot = createSnapshot() as unknown as {
      actors: Record<string, unknown>[];
    };
    delete at(snapshot.actors, 0).transitionGuard;

    expect(validateSimulationSnapshot(snapshot).ok).toBe(false);
  });

  it('rejects a transitionGuard that is not a whole grid position', () => {
    const decimal = createSnapshot();
    at(decimal.actors, 0).transitionGuard = { x: 1.5, y: 0, z: 7 };
    expect(validateSimulationSnapshot(decimal).ok).toBe(false);

    const partial = createSnapshot() as unknown as {
      actors: { transitionGuard: unknown }[];
    };
    at(partial.actors, 0).transitionGuard = { x: 1, y: 0 };
    expect(validateSimulationSnapshot(partial).ok).toBe(false);
  });

  it('rejects spawnSlots that are out of (groupIndex, slotIndex) order', () => {
    const unordered = createSnapshot();
    unordered.spawnSlots = [
      { groupIndex: 0, slotIndex: 1, readyAtTick: 0, entityId: null },
      { groupIndex: 0, slotIndex: 0, readyAtTick: 0, entityId: null },
    ];
    expect(validateSimulationSnapshot(unordered).ok).toBe(false);

    const groupsUnordered = createSnapshot();
    groupsUnordered.spawnSlots = [
      { groupIndex: 1, slotIndex: 0, readyAtTick: 0, entityId: null },
      { groupIndex: 0, slotIndex: 0, readyAtTick: 0, entityId: null },
    ];
    expect(validateSimulationSnapshot(groupsUnordered).ok).toBe(false);
  });

  it('rejects a repeated (groupIndex, slotIndex) pair', () => {
    const duplicated = createSnapshot();
    duplicated.spawnSlots = [
      { groupIndex: 0, slotIndex: 0, readyAtTick: 0, entityId: null },
      { groupIndex: 0, slotIndex: 0, readyAtTick: 4, entityId: null },
    ];

    expect(messages(validateSimulationSnapshot(duplicated))).toContain(
      'spawnSlots[1]: spawnSlots must not repeat a (groupIndex, slotIndex) pair',
    );
  });

  it('rejects a spawn slot pointing at an actor that is not in the snapshot', () => {
    const dangling = createSnapshot();
    dangling.spawnSlots = [
      { groupIndex: 0, slotIndex: 0, readyAtTick: 0, entityId: 9 },
    ];

    expect(validateSimulationSnapshot(dangling).ok).toBe(false);
  });

  it('lets two actors on different floors share the same (x, y)', () => {
    const snapshot = createSnapshot();
    at(snapshot.actors, 1).position = { x: 0, y: 0, z: 8 };
    at(snapshot.actors, 1).transitionGuard = null;

    expect(validateSimulationSnapshot(snapshot).ok).toBe(true);
  });

  it('still rejects two actors sharing the same cell on the same floor', () => {
    const snapshot = createSnapshot();
    at(snapshot.actors, 1).position = { x: 0, y: 0, z: 7 };
    at(snapshot.actors, 1).transitionGuard = null;

    expect(validateSimulationSnapshot(snapshot).ok).toBe(false);
  });
});

describe('frozen versions', () => {
  it('pins the schema version at 4 and the rules version at 3', () => {
    expect(SIMULATION_SCHEMA_VERSION).toBe(4);
    expect(SIMULATION_RULES_VERSION).toBe(3);
  });
});
