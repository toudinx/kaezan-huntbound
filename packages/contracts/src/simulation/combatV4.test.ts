import { describe, expect, it } from 'vitest';

import {
  simulationDiagnosticsFromZodError,
  validateKernelScenario,
  validateSimulationSnapshot,
} from './diagnostics';
import {
  SIMULATION_RULES_VERSION,
  SIMULATION_SCHEMA_VERSION,
} from './identity';
import {
  commandPriority,
  isConcurrentActorAction,
  SimulationCommandInputSchema,
  SimulationEventPayloadSchema,
} from './schemas';
import type {
  SimulationCommandType,
  SimulationValidationResult,
} from './types';

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

function combatNeutralBlueprint(
  blueprintId: string,
  stepCooldownTicks: number,
  behavior: 'inert' | 'wander' | 'hunter',
) {
  return {
    blueprintId,
    stepCooldownTicks,
    behavior,
    factionId: 0,
    maxHealth: 10,
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

function createScenario() {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    scenarioId: 'pb-05-combat-contracts',
    scenarioRevision: 1,
    width: 4,
    height: 4,
    floors: [{ z: 7, blockedTiles: [[1, 1]] as [number, number][] }],
    transitions: [] as { from: unknown; to: unknown }[],
    spawnGroups: [] as unknown[],
    maxLiveActors: 8,
    abilities: [
      {
        abilityId: 'berserk',
        effect: 'damage',
        shape: 'area',
        radius: 1,
        rangeTiles: 0,
        resourceCost: 115,
        cooldownTicks: 80,
        groupCooldownTicks: 40,
        minPower: 20,
        maxPower: 40,
      },
      {
        abilityId: 'wound-cleansing',
        effect: 'heal',
        shape: 'self',
        radius: 0,
        rangeTiles: 0,
        resourceCost: 40,
        cooldownTicks: 20,
        groupCooldownTicks: 20,
        minPower: 8,
        maxPower: 12,
      },
    ],
    lootTables: [
      {
        entries: [
          {
            itemIndex: 0,
            chancePerHundredThousand: 25000,
            minCount: 1,
            maxCount: 3,
          },
        ],
      },
    ],
    blueprints: [
      {
        ...combatNeutralBlueprint('walker', 2, 'inert'),
        factionId: 1,
        maxHealth: 185,
        maxResource: 185,
        abilityIndices: [0, 1],
      },
      {
        ...combatNeutralBlueprint('rotworm', 4, 'hunter'),
        factionId: 2,
        maxHealth: 65,
        attackCooldownTicks: 40,
        attackMinDamage: 0,
        attackMaxDamage: 40,
        aggroRadius: 5,
        lootTableIndex: 0,
      },
    ],
    initialActors: [
      {
        blueprintId: 'walker',
        position: { x: 0, y: 0, z: 7 },
        facing: 'e',
      },
    ],
  };
}

function combatActorState(
  entityId: number,
  blueprintId: string,
  position: { x: number; y: number; z: number },
  facing: string,
) {
  return {
    entityId,
    blueprintId,
    position,
    facing,
    readyAtTick: 0,
    transitionGuard: null as { x: number; y: number; z: number } | null,
    health: 10,
    resource: 0,
    targetEntityId: null as number | null,
    attackReadyAtTick: 0,
    groupReadyAtTick: 0,
    abilityCooldowns: [] as { abilityIndex: number; readyAtTick: number }[],
    nextHealthRegenTick: 0,
    nextResourceRegenTick: 0,
  };
}

function createSnapshot() {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    rulesVersion: SIMULATION_RULES_VERSION,
    scenarioId: 'pb-05-combat-contracts',
    scenarioRevision: 1,
    seed: '0f1e2d3c4b5a6978',
    tick: 0,
    nextEntityId: 3,
    nextEventSequence: 1,
    nextCommandSequence: 1,
    randomStreams: [
      { label: 'ai', s0: 1, s1: 2, s2: 3, s3: 4, drawCount: 0 },
      { label: 'combat', s0: 1, s1: 2, s2: 3, s3: 4, drawCount: 0 },
      { label: 'loot', s0: 1, s1: 2, s2: 3, s3: 4, drawCount: 0 },
      { label: 'movement', s0: 1, s1: 2, s2: 3, s3: 4, drawCount: 0 },
    ],
    actors: [
      {
        ...combatActorState(1, 'walker', { x: 0, y: 0, z: 7 }, 'e'),
        health: 185,
        resource: 185,
        abilityCooldowns: [
          { abilityIndex: 0, readyAtTick: 4 },
          { abilityIndex: 1, readyAtTick: 8 },
        ],
      },
      combatActorState(2, 'rotworm', { x: 3, y: 3, z: 7 }, 'n'),
    ],
    spawnSlots: [] as unknown[],
    pendingCommands: [] as unknown[],
    pendingIntents: [
      { kind: 'move' as const, tick: 1, entityId: 1, direction: 'e' },
      {
        kind: 'attack' as const,
        tick: 1,
        entityId: 2,
        targetEntityId: 1,
      },
    ],
  };
}

describe('KernelScenario v4', () => {
  it('accepts a document with abilities, loot tables, and combat blueprints', () => {
    expect(validateKernelScenario(createScenario()).ok).toBe(true);
  });

  it('rejects a v3 document that omits abilities and lootTables', () => {
    const legacy = createScenario() as unknown as Record<string, unknown>;
    delete legacy.abilities;
    delete legacy.lootTables;

    expect(validateKernelScenario(legacy).ok).toBe(false);
    expect(codes(validateKernelScenario(legacy))).toContain(
      'SIM_SCHEMA_INVALID',
    );
  });

  it('reports SIM_VERSION_MISMATCH for schemaVersion 3', () => {
    const scenario = createScenario();
    scenario.schemaVersion = 3;

    expect(codes(validateKernelScenario(scenario))).toEqual([
      'SIM_VERSION_MISMATCH',
    ]);
  });

  it('rejects a blueprint that omits combat fields', () => {
    const scenario = createScenario();
    scenario.blueprints = [
      { blueprintId: 'walker', stepCooldownTicks: 2, behavior: 'inert' },
    ] as typeof scenario.blueprints;

    expect(validateKernelScenario(scenario).ok).toBe(false);
  });

  it('rejects attackMinDamage greater than attackMaxDamage', () => {
    const scenario = createScenario();
    at(scenario.blueprints, 1).attackMinDamage = 50;
    at(scenario.blueprints, 1).attackMaxDamage = 40;

    expect(validateKernelScenario(scenario).ok).toBe(false);
  });

  it('rejects minPower greater than maxPower', () => {
    const scenario = createScenario();
    at(scenario.abilities, 0).minPower = 50;
    at(scenario.abilities, 0).maxPower = 40;

    expect(validateKernelScenario(scenario).ok).toBe(false);
  });

  it('rejects a lootTableIndex outside the lootTables range', () => {
    const scenario = createScenario();
    at(scenario.blueprints, 1).lootTableIndex = 1;

    expect(validateKernelScenario(scenario).ok).toBe(false);
  });

  it('rejects abilityIndices that are unknown, duplicated, or out of order', () => {
    const unknown = createScenario();
    at(unknown.blueprints, 0).abilityIndices = [0, 9];
    expect(validateKernelScenario(unknown).ok).toBe(false);

    const duplicated = createScenario();
    at(duplicated.blueprints, 0).abilityIndices = [0, 0];
    expect(validateKernelScenario(duplicated).ok).toBe(false);

    const unordered = createScenario();
    at(unordered.blueprints, 0).abilityIndices = [1, 0];
    expect(validateKernelScenario(unordered).ok).toBe(false);
  });

  it('rejects a non-zero radius outside area and a non-zero rangeTiles outside target', () => {
    const radius = createScenario();
    at(radius.abilities, 1).radius = 1;
    expect(validateKernelScenario(radius).ok).toBe(false);

    const range = createScenario();
    at(range.abilities, 0).rangeTiles = 3;
    expect(validateKernelScenario(range).ok).toBe(false);
  });

  it('rejects chancePerHundredThousand outside [1, 100000]', () => {
    const tooLow = createScenario();
    at(at(tooLow.lootTables, 0).entries, 0).chancePerHundredThousand = 0;
    expect(validateKernelScenario(tooLow).ok).toBe(false);

    const tooHigh = createScenario();
    at(at(tooHigh.lootTables, 0).entries, 0).chancePerHundredThousand = 100001;
    expect(validateKernelScenario(tooHigh).ok).toBe(false);
  });

  it('rejects minCount greater than maxCount', () => {
    const scenario = createScenario();
    at(at(scenario.lootTables, 0).entries, 0).minCount = 4;
    at(at(scenario.lootTables, 0).entries, 0).maxCount = 3;

    expect(validateKernelScenario(scenario).ok).toBe(false);
  });

  it('rejects floats in every new combat field', () => {
    const maxHealth = createScenario();
    at(maxHealth.blueprints, 0).maxHealth = 10.5;
    expect(validateKernelScenario(maxHealth).ok).toBe(false);

    const radius = createScenario();
    at(radius.abilities, 0).radius = 1.25;
    expect(validateKernelScenario(radius).ok).toBe(false);

    const chance = createScenario();
    at(at(chance.lootTables, 0).entries, 0).chancePerHundredThousand = 1.5;
    expect(validateKernelScenario(chance).ok).toBe(false);

    const faction = createScenario();
    at(faction.blueprints, 0).factionId = 0.5;
    expect(validateKernelScenario(faction).ok).toBe(false);
  });

  it('accepts hunter as a blueprint behavior', () => {
    const scenario = createScenario();
    expect(at(scenario.blueprints, 1).behavior).toBe('hunter');
    expect(validateKernelScenario(scenario).ok).toBe(true);
  });

  it('sorts multiple scenario diagnostics by path and then by code, stably across runs', () => {
    const scenario = createScenario();
    at(scenario.blueprints, 1).attackMinDamage = 50;
    at(scenario.blueprints, 1).attackMaxDamage = 10;
    at(scenario.abilities, 0).minPower = 9;
    at(scenario.abilities, 0).maxPower = 1;
    at(at(scenario.lootTables, 0).entries, 0).minCount = 8;
    at(at(scenario.lootTables, 0).entries, 0).maxCount = 2;

    const first = validateKernelScenario(scenario);
    const second = validateKernelScenario(scenario);

    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
    if (first.ok || second.ok) {
      return;
    }

    expect(first.diagnostics).toEqual(second.diagnostics);
    const ordered = [...first.diagnostics].sort((left, right) => {
      const path = left.path.join('.').localeCompare(right.path.join('.'));
      if (path !== 0) {
        return path;
      }
      return left.code.localeCompare(right.code);
    });
    expect(first.diagnostics).toEqual(ordered);
  });
});

describe('SimulationSnapshot v4', () => {
  it('accepts actors with combat fields and discriminated pending intents', () => {
    expect(validateSimulationSnapshot(createSnapshot()).ok).toBe(true);
  });

  it('rejects abilityCooldowns that are unordered or duplicated', () => {
    const unordered = createSnapshot();
    at(unordered.actors, 0).abilityCooldowns = [
      { abilityIndex: 1, readyAtTick: 8 },
      { abilityIndex: 0, readyAtTick: 4 },
    ];
    expect(validateSimulationSnapshot(unordered).ok).toBe(false);

    const duplicated = createSnapshot();
    at(duplicated.actors, 0).abilityCooldowns = [
      { abilityIndex: 0, readyAtTick: 4 },
      { abilityIndex: 0, readyAtTick: 8 },
    ];
    expect(validateSimulationSnapshot(duplicated).ok).toBe(false);
  });

  it('rejects negative health', () => {
    const snapshot = createSnapshot();
    at(snapshot.actors, 0).health = -1;
    expect(validateSimulationSnapshot(snapshot).ok).toBe(false);
  });

  it('rejects a targetEntityId that does not name a live actor', () => {
    const snapshot = createSnapshot();
    at(snapshot.actors, 1).targetEntityId = 9;
    expect(validateSimulationSnapshot(snapshot).ok).toBe(false);
  });

  it('rejects a pending intent with an unknown kind', () => {
    const snapshot = createSnapshot();
    snapshot.pendingIntents = [
      { kind: 'wait', tick: 1, entityId: 1, direction: 'e' },
    ] as unknown as typeof snapshot.pendingIntents;
    expect(validateSimulationSnapshot(snapshot).ok).toBe(false);
  });

  it('rejects two pending intents that share a (tick, entityId) pair', () => {
    const snapshot = createSnapshot();
    snapshot.pendingIntents = [
      { kind: 'move', tick: 1, entityId: 1, direction: 'e' },
      { kind: 'attack', tick: 1, entityId: 1, targetEntityId: 2 },
    ];
    expect(validateSimulationSnapshot(snapshot).ok).toBe(false);
  });

  it('rejects an attack intent whose target is absent from the snapshot', () => {
    const snapshot = createSnapshot();
    snapshot.pendingIntents = [
      { kind: 'attack', tick: 1, entityId: 1, targetEntityId: 9 },
    ];
    expect(validateSimulationSnapshot(snapshot).ok).toBe(false);
  });

  it('reports SIM_VERSION_MISMATCH for snapshot schemaVersion 3', () => {
    const snapshot = createSnapshot();
    snapshot.schemaVersion = 3;

    expect(codes(validateSimulationSnapshot(snapshot))).toEqual([
      'SIM_VERSION_MISMATCH',
    ]);
  });
});

describe('combat commands, events, and diagnostics', () => {
  it('accepts actor/attack and actor/cast-ability from player and ai', () => {
    const attack = {
      tick: 0,
      issuer: 'player',
      command: { type: 'actor/attack', entityId: 1, targetEntityId: 2 },
    };
    const cast = {
      tick: 0,
      issuer: 'ai',
      command: {
        type: 'actor/cast-ability',
        entityId: 1,
        abilityIndex: 0,
        targetEntityId: null,
      },
    };

    expect(SimulationCommandInputSchema.safeParse(attack).success).toBe(true);
    expect(SimulationCommandInputSchema.safeParse(cast).success).toBe(true);
  });

  it('rejects actor/attack and actor/cast-ability from scenario with SIM_COMMAND_FORBIDDEN', () => {
    for (const command of [
      { type: 'actor/attack', entityId: 1, targetEntityId: 2 },
      {
        type: 'actor/cast-ability',
        entityId: 1,
        abilityIndex: 0,
        targetEntityId: null,
      },
    ]) {
      const parsed = SimulationCommandInputSchema.safeParse({
        tick: 0,
        issuer: 'scenario',
        command,
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(
          simulationDiagnosticsFromZodError(parsed.error).map(
            ({ code }) => code,
          ),
        ).toContain('SIM_COMMAND_FORBIDDEN');
      }
    }
  });

  it('returns the v4 command priority table', () => {
    expect(commandPriority('scenario/spawn-actor')).toBe(0);
    expect(commandPriority('scenario/despawn-actor')).toBe(0);
    expect(commandPriority('actor/face')).toBe(1);
    expect(commandPriority('actor/move-step')).toBe(2);
    expect(commandPriority('actor/attack')).toBe(3);
    expect(commandPriority('actor/cast-ability')).toBe(4);
    expect(commandPriority('actor/wait')).toBe(5);
  });

  it('treats the four concurrent actor actions as edge duplicates and ignores actor/face', () => {
    const concurrent: SimulationCommandType[] = [
      'actor/move-step',
      'actor/attack',
      'actor/cast-ability',
      'actor/wait',
    ];
    for (const type of concurrent) {
      expect(isConcurrentActorAction(type)).toBe(true);
    }
    expect(isConcurrentActorAction('actor/face')).toBe(false);
    expect(isConcurrentActorAction('scenario/spawn-actor')).toBe(false);
    expect(isConcurrentActorAction('scenario/despawn-actor')).toBe(false);
  });

  it('validates each new event payload and rejects unknown fields', () => {
    const payloads = [
      { type: 'combat/attacked', entityId: 1, targetEntityId: 2 },
      {
        type: 'combat/damaged',
        entityId: 2,
        sourceEntityId: 1,
        amount: 12,
        remainingHealth: 53,
        cause: 'attack',
      },
      {
        type: 'combat/healed',
        entityId: 1,
        sourceEntityId: 1,
        amount: 8,
        health: 193,
      },
      {
        type: 'ability/cast',
        entityId: 1,
        abilityIndex: 0,
        targetEntityId: null,
      },
      { type: 'combat/target-changed', entityId: 2, targetEntityId: 1 },
      {
        type: 'actor/died',
        entityId: 2,
        killerEntityId: 1,
        position: { x: 3, y: 3, z: 7 },
      },
      {
        type: 'loot/granted',
        entityId: 1,
        sourceEntityId: 2,
        itemIndex: 0,
        count: 2,
      },
    ];

    for (const payload of payloads) {
      expect(SimulationEventPayloadSchema.safeParse(payload).success).toBe(
        true,
      );
      expect(
        SimulationEventPayloadSchema.safeParse({ ...payload, unexpected: true })
          .success,
      ).toBe(false);
    }
  });

  it('requires position on actor/died and accepts a null killer', () => {
    expect(
      SimulationEventPayloadSchema.safeParse({
        type: 'actor/died',
        entityId: 2,
        killerEntityId: null,
      }).success,
    ).toBe(false);

    expect(
      SimulationEventPayloadSchema.safeParse({
        type: 'actor/died',
        entityId: 2,
        killerEntityId: null,
        position: { x: 3, y: 3, z: 7 },
      }).success,
    ).toBe(true);
  });
});

describe('frozen versions', () => {
  it('pins the schema version at 4 and the rules version at 3', () => {
    expect(SIMULATION_SCHEMA_VERSION).toBe(4);
    expect(SIMULATION_RULES_VERSION).toBe(3);
  });
});
