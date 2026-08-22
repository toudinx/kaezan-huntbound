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
import { migrateSimulationSnapshot } from './migrateSnapshot';
import {
  AbilityDefinitionSchema,
  ActorBlueprintSchema,
  ActorStateSchema,
  KernelScenarioSchema,
  ScenarioConditionDefinitionSchema,
  SimulationEventPayloadSchema,
} from './schemas';
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

function diagnosticPath(
  result: SimulationValidationResult<unknown>,
): readonly (string | number)[] {
  if (result.ok) {
    return [];
  }
  return result.diagnostics[0]?.path ?? [];
}

function combatNeutralBlueprint(blueprintId: string) {
  return {
    blueprintId,
    stepCooldownTicks: 2,
    behavior: 'inert' as const,
    factionId: 1,
    maxHealth: 10,
    maxResource: 10,
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

function combatAbility() {
  return {
    abilityId: 'brutal-strike',
    effect: 'damage' as const,
    shape: 'target' as const,
    radius: 0,
    rangeTiles: 1,
    resourceCost: 30,
    cooldownTicks: 80,
    groupCooldownTicks: 40,
    minPower: 20,
    maxPower: 40,
  };
}

function createScenario() {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    scenarioId: 'pb-07-combat-contract-v5',
    scenarioRevision: 1,
    width: 4,
    height: 4,
    floors: [{ z: 7, blockedTiles: [] as [number, number][] }],
    transitions: [] as unknown[],
    spawnGroups: [] as unknown[],
    maxLiveActors: 8,
    abilities: [combatAbility()],
    lootTables: [] as unknown[],
    blueprints: [
      {
        ...combatNeutralBlueprint('walker'),
        abilityIndices: [0],
      },
    ],
    initialActors: [
      {
        blueprintId: 'walker',
        position: { x: 0, y: 0, z: 7 },
        facing: 'e' as const,
      },
    ],
  };
}

function combatActorState() {
  return {
    entityId: 1,
    blueprintId: 'walker',
    position: { x: 0, y: 0, z: 7 },
    facing: 'e',
    readyAtTick: 0,
    transitionGuard: null as { x: number; y: number; z: number } | null,
    health: 10,
    resource: 10,
    targetEntityId: null as number | null,
    attackReadyAtTick: 0,
    abilityCooldowns: [] as { abilityIndex: number; readyAtTick: number }[],
    nextHealthRegenTick: 0,
    nextResourceRegenTick: 0,
  };
}

function createSnapshot() {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    rulesVersion: SIMULATION_RULES_VERSION,
    scenarioId: 'pb-07-combat-contract-v5',
    scenarioRevision: 1,
    seed: '0f1e2d3c4b5a6978',
    tick: 0,
    nextEntityId: 2,
    nextEventSequence: 1,
    nextCommandSequence: 1,
    randomStreams: [{ label: 'ai', s0: 1, s1: 2, s2: 3, s3: 4, drawCount: 0 }],
    actors: [combatActorState()],
    spawnSlots: [] as unknown[],
    pendingCommands: [] as unknown[],
    pendingIntents: [] as unknown[],
  };
}

function v4Snapshot(groupReadyAtTick: number) {
  return {
    schemaVersion: 4,
    rulesVersion: 3,
    scenarioId: 'pb-07-combat-contract-v5',
    scenarioRevision: 1,
    seed: '0f1e2d3c4b5a6978',
    tick: 12,
    nextEntityId: 2,
    nextEventSequence: 4,
    nextCommandSequence: 2,
    randomStreams: [{ label: 'ai', s0: 1, s1: 2, s2: 3, s3: 4, drawCount: 0 }],
    actors: [
      {
        ...combatActorState(),
        groupReadyAtTick,
      },
    ],
    spawnSlots: [] as unknown[],
    pendingCommands: [] as unknown[],
    pendingIntents: [] as unknown[],
  };
}

describe('frozen versions', () => {
  it('pins the schema version at 5 and the rules version at 4', () => {
    expect(SIMULATION_SCHEMA_VERSION).toBe(5);
    expect(SIMULATION_RULES_VERSION).toBe(4);
  });
});

describe('ActorBlueprint v5 defaults and refusals', () => {
  const numericDefaults = [
    ['outOfCombatHealthRegenTicks', 0],
    ['outOfCombatHealthRegenAmount', 0],
    ['outOfCombatResourceRegenTicks', 0],
    ['outOfCombatResourceRegenAmount', 0],
    ['combatWindowTicks', 0],
    ['lifeLeechPermille', 0],
    ['manaLeechPermille', 0],
  ] as const;

  it.each(numericDefaults)('defaults omitted %s to %i', (field, expected) => {
    const parsed = ActorBlueprintSchema.parse(combatNeutralBlueprint('walker'));
    expect(parsed[field]).toBe(expected);
  });

  it.each(numericDefaults)('accepts a valid %s', (field) => {
    const parsed = ActorBlueprintSchema.parse({
      ...combatNeutralBlueprint('walker'),
      [field]: 40,
    });
    expect(parsed[field]).toBe(40);
  });

  it.each(numericDefaults)('rejects a negative %s at that path', (field) => {
    const parsed = ActorBlueprintSchema.safeParse({
      ...combatNeutralBlueprint('walker'),
      [field]: -1,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual([field]);
    }
  });

  it('defaults omitted attackElement to physical', () => {
    expect(
      ActorBlueprintSchema.parse(combatNeutralBlueprint('walker'))
        .attackElement,
    ).toBe('physical');
  });

  it('accepts a declared attackElement', () => {
    expect(
      ActorBlueprintSchema.parse({
        ...combatNeutralBlueprint('walker'),
        attackElement: 'fire',
      }).attackElement,
    ).toBe('fire');
  });

  it('rejects an unknown attackElement at that path', () => {
    const parsed = ActorBlueprintSchema.safeParse({
      ...combatNeutralBlueprint('walker'),
      attackElement: 'lightning',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['attackElement']);
    }
  });

  it('defaults omitted resistances and immunities to empty lists', () => {
    const parsed = ActorBlueprintSchema.parse(combatNeutralBlueprint('walker'));
    expect(parsed.resistances).toEqual([]);
    expect(parsed.immunities).toEqual([]);
  });

  it('accepts canonically ordered resistances and immunities', () => {
    const parsed = ActorBlueprintSchema.parse({
      ...combatNeutralBlueprint('walker'),
      resistances: [
        { element: 'fire', permille: -80 },
        { element: 'physical', permille: 200 },
      ],
      immunities: ['earth', 'holy'],
    });
    expect(parsed.resistances).toHaveLength(2);
    expect(parsed.immunities).toEqual(['earth', 'holy']);
  });

  it('rejects unordered resistances with a localized path', () => {
    const parsed = ActorBlueprintSchema.safeParse({
      ...combatNeutralBlueprint('walker'),
      resistances: [
        { element: 'physical', permille: 0 },
        { element: 'fire', permille: 100 },
      ],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const diagnostics = simulationDiagnosticsFromZodError(parsed.error);
      expect(at(diagnostics, 0).path).toEqual(['resistances', 1]);
    }
  });

  it('rejects unordered immunities with a localized path', () => {
    const parsed = ActorBlueprintSchema.safeParse({
      ...combatNeutralBlueprint('walker'),
      immunities: ['physical', 'fire'],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const diagnostics = simulationDiagnosticsFromZodError(parsed.error);
      expect(at(diagnostics, 0).path).toEqual(['immunities', 1]);
    }
  });
});

describe('AbilityDefinition v5 defaults and refusals', () => {
  it('defaults omitted element to physical', () => {
    expect(AbilityDefinitionSchema.parse(combatAbility()).element).toBe(
      'physical',
    );
  });

  it('accepts a declared ability element', () => {
    expect(
      AbilityDefinitionSchema.parse({
        ...combatAbility(),
        element: 'energy',
      }).element,
    ).toBe('energy');
  });

  it('rejects an unknown ability element at that path', () => {
    const parsed = AbilityDefinitionSchema.safeParse({
      ...combatAbility(),
      element: 'lightning',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['element']);
    }
  });

  it('defaults omitted cooldown groups to the primary channel only', () => {
    const parsed = AbilityDefinitionSchema.parse(combatAbility());
    expect(parsed.primaryCooldownGroup).toBe(0);
    expect(parsed.secondaryCooldownGroup).toBeNull();
    expect(parsed.secondaryGroupCooldownTicks).toBe(0);
  });

  it('accepts a secondary cooldown group', () => {
    const parsed = AbilityDefinitionSchema.parse({
      ...combatAbility(),
      primaryCooldownGroup: 0,
      secondaryCooldownGroup: 1,
      secondaryGroupCooldownTicks: 20,
    });
    expect(parsed.secondaryCooldownGroup).toBe(1);
    expect(parsed.secondaryGroupCooldownTicks).toBe(20);
  });

  it('rejects a negative primaryCooldownGroup at that path', () => {
    const parsed = AbilityDefinitionSchema.safeParse({
      ...combatAbility(),
      primaryCooldownGroup: -1,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['primaryCooldownGroup']);
    }
  });

  it('defaults omitted condition, charges, recharge and toggle to the v4-neutral values', () => {
    const parsed = AbilityDefinitionSchema.parse(combatAbility());
    expect(parsed.appliedConditionIndex).toBeNull();
    expect(parsed.maxCharges).toBeNull();
    expect(parsed.rechargeKind).toBe('none');
    expect(parsed.toggle).toBe(false);
  });

  it('accepts finite charges, a recharge rule, a toggle and an applied condition', () => {
    const parsed = AbilityDefinitionSchema.parse({
      ...combatAbility(),
      appliedConditionIndex: 0,
      maxCharges: 3,
      rechargeKind: 'out-of-combat',
      toggle: true,
    });
    expect(parsed.appliedConditionIndex).toBe(0);
    expect(parsed.maxCharges).toBe(3);
    expect(parsed.rechargeKind).toBe('out-of-combat');
    expect(parsed.toggle).toBe(true);
  });

  it('rejects an unknown rechargeKind at that path', () => {
    const parsed = AbilityDefinitionSchema.safeParse({
      ...combatAbility(),
      rechargeKind: 'shop',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['rechargeKind']);
    }
  });
});

describe('ScenarioConditionDefinition', () => {
  it('accepts a condition addressed only by kebab-case id and integer modifiers', () => {
    const parsed = ScenarioConditionDefinitionSchema.parse({
      conditionId: 'blood-rage',
      exclusivityGroup: 1,
      durationTicks: 0,
      skillIndex: 2,
      skillModifierPermille: 250,
      damageDealtPermille: 0,
      damageReceivedPermille: 150,
      speedPermille: 0,
      manaShield: false,
      tickDamageAmount: 0,
      tickDamageIntervalTicks: 0,
      elementBonusPermille: 0,
      convertNextAbilityElement: false,
      bonusElement: null,
    });
    expect(parsed.conditionId).toBe('blood-rage');
    expect(parsed.exclusivityGroup).toBe(1);
  });

  it('defaults omitted modifiers to the no-op integers and flags', () => {
    const parsed = ScenarioConditionDefinitionSchema.parse({
      conditionId: 'haste',
    });
    expect(parsed.exclusivityGroup).toBeNull();
    expect(parsed.durationTicks).toBe(0);
    expect(parsed.skillIndex).toBeNull();
    expect(parsed.skillModifierPermille).toBe(0);
    expect(parsed.damageDealtPermille).toBe(0);
    expect(parsed.damageReceivedPermille).toBe(0);
    expect(parsed.speedPermille).toBe(0);
    expect(parsed.manaShield).toBe(false);
    expect(parsed.tickDamageAmount).toBe(0);
    expect(parsed.tickDamageIntervalTicks).toBe(0);
    expect(parsed.elementBonusPermille).toBe(0);
    expect(parsed.convertNextAbilityElement).toBe(false);
    expect(parsed.bonusElement).toBeNull();
  });

  it('rejects a free-form conditionId at that path', () => {
    const parsed = ScenarioConditionDefinitionSchema.safeParse({
      conditionId: 'Blood Rage',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['conditionId']);
    }
  });
});

describe('KernelScenario v5', () => {
  it('defaults omitted conditions to an empty table', () => {
    const parsed = KernelScenarioSchema.parse(createScenario());
    expect(parsed.conditions).toEqual([]);
  });

  it('accepts a condition table addressed by index from an ability', () => {
    const scenario = createScenario();
    const parsed = validateKernelScenario({
      ...scenario,
      conditions: [{ conditionId: 'haste' }],
      abilities: [
        {
          ...combatAbility(),
          appliedConditionIndex: 0,
        },
      ],
    });
    expect(parsed.ok).toBe(true);
  });

  it('rejects an appliedConditionIndex outside the condition table', () => {
    const scenario = createScenario();
    const result = validateKernelScenario({
      ...scenario,
      abilities: [
        {
          ...combatAbility(),
          appliedConditionIndex: 0,
        },
      ],
    });
    expect(result.ok).toBe(false);
    expect(diagnosticPath(result)).toEqual([
      'abilities',
      0,
      'appliedConditionIndex',
    ]);
  });

  it('reports SIM_VERSION_MISMATCH for schemaVersion 4', () => {
    const scenario = createScenario();
    scenario.schemaVersion = 4;
    expect(codes(validateKernelScenario(scenario))).toEqual([
      'SIM_VERSION_MISMATCH',
    ]);
  });
});

describe('ActorState v5 defaults, collections and refusals', () => {
  it('defaults omitted last-damage, conditions, group cooldowns and charges', () => {
    const parsed = ActorStateSchema.parse(combatActorState());
    expect(parsed.lastDamageReceivedTick).toBe(0);
    expect(parsed.activeConditions).toEqual([]);
    expect(parsed.groupCooldowns).toEqual([]);
    expect(parsed.abilityCharges).toEqual([]);
    expect('groupReadyAtTick' in parsed).toBe(false);
  });

  it('accepts canonically ordered group cooldowns, conditions and charges', () => {
    const parsed = ActorStateSchema.parse({
      ...combatActorState(),
      lastDamageReceivedTick: 9,
      groupCooldowns: [
        { groupIndex: 0, readyAtTick: 12 },
        { groupIndex: 1, readyAtTick: 40 },
      ],
      activeConditions: [
        {
          conditionIndex: 0,
          expiresAtTick: 80,
          exclusivityGroup: 1,
        },
      ],
      abilityCharges: [{ abilityIndex: 0, remaining: 3 }],
    });
    expect(parsed.groupCooldowns).toHaveLength(2);
    expect(parsed.activeConditions).toHaveLength(1);
    expect(at(parsed.abilityCharges, 0).remaining).toBe(3);
  });

  it('rejects unordered groupCooldowns with a localized path', () => {
    const snapshot = createSnapshot();
    const result = validateSimulationSnapshot({
      ...snapshot,
      actors: [
        {
          ...at(snapshot.actors, 0),
          groupCooldowns: [
            { groupIndex: 1, readyAtTick: 4 },
            { groupIndex: 0, readyAtTick: 8 },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
    expect(diagnosticPath(result)).toEqual(['actors', 0, 'groupCooldowns', 1]);
  });

  it('rejects unordered activeConditions with a localized path', () => {
    const snapshot = createSnapshot();
    const result = validateSimulationSnapshot({
      ...snapshot,
      actors: [
        {
          ...at(snapshot.actors, 0),
          activeConditions: [
            { conditionIndex: 1, expiresAtTick: 8, exclusivityGroup: null },
            { conditionIndex: 0, expiresAtTick: 4, exclusivityGroup: null },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
    expect(diagnosticPath(result)).toEqual([
      'actors',
      0,
      'activeConditions',
      1,
    ]);
  });

  it('rejects unordered abilityCharges with a localized path', () => {
    const snapshot = createSnapshot();
    const result = validateSimulationSnapshot({
      ...snapshot,
      actors: [
        {
          ...at(snapshot.actors, 0),
          abilityCharges: [
            { abilityIndex: 1, remaining: 1 },
            { abilityIndex: 0, remaining: 2 },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
    expect(diagnosticPath(result)).toEqual(['actors', 0, 'abilityCharges', 1]);
  });

  it('rejects a negative lastDamageReceivedTick at that path', () => {
    const parsed = ActorStateSchema.safeParse({
      ...combatActorState(),
      lastDamageReceivedTick: -1,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['lastDamageReceivedTick']);
    }
  });
});

describe('groupReadyAtTick v4 to v5 migration', () => {
  it('maps a scalar groupReadyAtTick onto the primary group and no other group', () => {
    const migrated = migrateSimulationSnapshot(v4Snapshot(17));
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) {
      return;
    }
    expect(migrated.value.schemaVersion).toBe(5);
    expect(migrated.value.rulesVersion).toBe(4);
    expect(at(migrated.value.actors, 0).groupCooldowns).toEqual([
      { groupIndex: 0, readyAtTick: 17 },
    ]);
    expect('groupReadyAtTick' in at(migrated.value.actors, 0)).toBe(false);
    expect(validateSimulationSnapshot(migrated.value).ok).toBe(true);
  });

  it('keeps a zero scalar as the primary group ready at tick zero', () => {
    const migrated = migrateSimulationSnapshot(v4Snapshot(0));
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) {
      return;
    }
    expect(at(migrated.value.actors, 0).groupCooldowns).toEqual([
      { groupIndex: 0, readyAtTick: 0 },
    ]);
  });
});

describe('combat/leeched event', () => {
  it('accepts a dedicated leech payload and rejects unknown fields', () => {
    const payload = {
      type: 'combat/leeched',
      entityId: 1,
      sourceEntityId: 2,
      healthAmount: 4,
      resourceAmount: 2,
      health: 54,
      resource: 180,
    };

    expect(SimulationEventPayloadSchema.safeParse(payload).success).toBe(true);
    expect(
      SimulationEventPayloadSchema.safeParse({ ...payload, unexpected: true })
        .success,
    ).toBe(false);
  });
});
