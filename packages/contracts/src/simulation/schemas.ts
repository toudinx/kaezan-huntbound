import { z } from 'zod';

import {
  EntityIdSchema,
  PRIMARY_COOLDOWN_GROUP,
  SeedSchema,
  StreamLabelSchema,
  TickIndexSchema,
} from './identity.ts';
import type {
  Direction,
  SimulationCommandType,
  SimulationDiagnosticCode,
} from './types.ts';

const safeInteger = z.number().safe();
const nonNegativeInteger = safeInteger.nonnegative();
const positiveInteger = safeInteger.positive();
const uint32 = safeInteger.min(0).max(0xffff_ffff);
const nonEmptyString = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, 'Expected a non-empty string');
const blueprintId = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Expected a lowercase kebab-case blueprint id',
  );
const abilityId = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Expected a lowercase kebab-case ability id',
  );

const directionValues = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
const commandTypeValues = [
  'actor/move-step',
  'actor/face',
  'actor/wait',
  'actor/attack',
  'actor/cast-ability',
  'actor/set-target',
  'scenario/spawn-actor',
  'scenario/despawn-actor',
] as const;
const diagnosticCodeValues = [
  'SIM_SCHEMA_INVALID',
  'SIM_VERSION_MISMATCH',
  'SIM_SCENARIO_MISMATCH',
  'SIM_SEED_INVALID',
  'SIM_TICK_IN_PAST',
  'SIM_COMMAND_UNKNOWN_ENTITY',
  'SIM_COMMAND_FORBIDDEN',
  'SIM_COMMAND_DUPLICATE',
  'SIM_MOVE_OUT_OF_BOUNDS',
  'SIM_MOVE_BLOCKED_TERRAIN',
  'SIM_MOVE_BLOCKED_OCCUPIED',
  'SIM_MOVE_DIAGONAL_CORNER',
  'SIM_MOVE_ON_COOLDOWN',
  'SIM_SPAWN_TILE_UNAVAILABLE',
  'SIM_TRANSITION_CHAINED',
  'SIM_TARGET_UNKNOWN',
  'SIM_TARGET_SAME_FACTION',
  'SIM_ATTACK_OUT_OF_RANGE',
  'SIM_ATTACK_ON_COOLDOWN',
  'SIM_ABILITY_UNKNOWN',
  'SIM_ABILITY_ON_COOLDOWN',
  'SIM_ABILITY_NO_RESOURCE',
  'SIM_ABILITY_OUT_OF_RANGE',
  'SIM_STATE_NOT_INTEGER',
  'SIM_STATE_NOT_SERIALIZABLE',
  'SIM_REPLAY_DIVERGED',
] as const;

export const DirectionSchema = z.enum(directionValues);
export const ActorBehaviorSchema = z.enum(['inert', 'wander', 'hunter']);
export const AbilityEffectSchema = z.enum(['damage', 'heal']);
export const AbilityShapeSchema = z.enum(['self', 'target', 'area']);
export const CombatElementSchema = z.enum([
  'death',
  'earth',
  'energy',
  'fire',
  'holy',
  'ice',
  'physical',
  'poison',
]);
export const AbilityRechargeKindSchema = z.enum([
  'none',
  'out-of-combat',
  'between-runs',
]);
export const CommandIssuerSchema = z.enum(['player', 'ai', 'scenario']);
const moveBlockedReasonValues = [
  'bounds',
  'terrain',
  'occupied',
  'diagonal-corner',
  'cooldown',
  'transition-blocked',
] as const;

export const MoveBlockedReasonSchema = z.enum(moveBlockedReasonValues);
export const SpawnDeferralReasonSchema = z.enum([
  'no-free-cell',
  'cap-reached',
]);
export const CombatCauseSchema = z.enum(['attack', 'ability']);
export const SimulationCommandTypeSchema = z.enum(commandTypeValues);
export const SimulationDiagnosticCodeSchema = z.enum(diagnosticCodeValues);

export const GridPositionSchema = z
  .object({
    x: safeInteger,
    y: safeInteger,
    z: safeInteger,
  })
  .strict();

const BlockedTileSchema = z.tuple([safeInteger, safeInteger]);

export const ActorBlueprintSchema = z
  .object({
    blueprintId,
    stepCooldownTicks: nonNegativeInteger,
    behavior: ActorBehaviorSchema,
    factionId: nonNegativeInteger,
    maxHealth: nonNegativeInteger,
    maxResource: nonNegativeInteger,
    healthRegenTicks: nonNegativeInteger,
    healthRegenAmount: nonNegativeInteger,
    resourceRegenTicks: nonNegativeInteger,
    resourceRegenAmount: nonNegativeInteger,
    attackCooldownTicks: nonNegativeInteger,
    attackMinDamage: nonNegativeInteger,
    attackMaxDamage: nonNegativeInteger,
    attackRangeTiles: nonNegativeInteger.default(1),
    aggroRadius: nonNegativeInteger,
    lootTableIndex: nonNegativeInteger.nullable(),
    abilityIndices: z.array(nonNegativeInteger).readonly(),
    outOfCombatHealthRegenTicks: nonNegativeInteger.default(0),
    outOfCombatHealthRegenAmount: nonNegativeInteger.default(0),
    outOfCombatResourceRegenTicks: nonNegativeInteger.default(0),
    outOfCombatResourceRegenAmount: nonNegativeInteger.default(0),
    combatWindowTicks: nonNegativeInteger.default(0),
    lifeLeechPermille: nonNegativeInteger.default(0),
    manaLeechPermille: nonNegativeInteger.default(0),
    attackElement: CombatElementSchema.default('physical'),
    resistances: z
      .array(
        z
          .object({
            element: CombatElementSchema,
            permille: safeInteger,
          })
          .strict(),
      )
      .readonly()
      .default([]),
    immunities: z.array(CombatElementSchema).readonly().default([]),
  })
  .strict()
  .superRefine((blueprint, context) => {
    if (blueprint.attackMinDamage > blueprint.attackMaxDamage) {
      addSimulationIssue(
        context,
        'SIM_SCHEMA_INVALID',
        ['attackMinDamage'],
        'attackMinDamage must not exceed attackMaxDamage',
      );
    }

    for (let index = 1; index < blueprint.abilityIndices.length; index += 1) {
      const previous = blueprint.abilityIndices[index - 1];
      const current = blueprint.abilityIndices[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      if (previous === current) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['abilityIndices', index],
          'abilityIndices must not contain duplicates',
        );
      } else if (previous > current) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['abilityIndices', index],
          'abilityIndices must be strictly ordered',
        );
      }
    }

    for (let index = 1; index < blueprint.resistances.length; index += 1) {
      const previous = blueprint.resistances[index - 1];
      const current = blueprint.resistances[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      if (previous.element === current.element) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['resistances', index],
          'resistances must not repeat an element',
        );
      } else if (previous.element > current.element) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['resistances', index],
          'resistances must be strictly ordered by element',
        );
      }
    }

    for (let index = 1; index < blueprint.immunities.length; index += 1) {
      const previous = blueprint.immunities[index - 1];
      const current = blueprint.immunities[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      if (previous === current) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['immunities', index],
          'immunities must not contain duplicates',
        );
      } else if (previous > current) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['immunities', index],
          'immunities must be strictly ordered by element',
        );
      }
    }
  });

export const AbilityDefinitionSchema = z
  .object({
    abilityId,
    effect: AbilityEffectSchema,
    shape: AbilityShapeSchema,
    radius: nonNegativeInteger,
    rangeTiles: nonNegativeInteger,
    resourceCost: nonNegativeInteger,
    cooldownTicks: nonNegativeInteger,
    groupCooldownTicks: nonNegativeInteger,
    minPower: nonNegativeInteger,
    maxPower: nonNegativeInteger,
    element: CombatElementSchema.default('physical'),
    primaryCooldownGroup: nonNegativeInteger.default(PRIMARY_COOLDOWN_GROUP),
    secondaryCooldownGroup: nonNegativeInteger.nullable().default(null),
    secondaryGroupCooldownTicks: nonNegativeInteger.default(0),
    appliedConditionIndex: nonNegativeInteger.nullable().default(null),
    maxCharges: nonNegativeInteger.nullable().default(null),
    rechargeKind: AbilityRechargeKindSchema.default('none'),
    toggle: z.boolean().default(false),
  })
  .strict()
  .superRefine((ability, context) => {
    if (ability.shape !== 'area' && ability.radius !== 0) {
      addSimulationIssue(
        context,
        'SIM_SCHEMA_INVALID',
        ['radius'],
        'radius must be 0 unless shape is area',
      );
    }
    if (ability.shape !== 'target' && ability.rangeTiles !== 0) {
      addSimulationIssue(
        context,
        'SIM_SCHEMA_INVALID',
        ['rangeTiles'],
        'rangeTiles must be 0 unless shape is target',
      );
    }
    if (ability.minPower > ability.maxPower) {
      addSimulationIssue(
        context,
        'SIM_SCHEMA_INVALID',
        ['minPower'],
        'minPower must not exceed maxPower',
      );
    }
  });

export const ScenarioConditionDefinitionSchema = z
  .object({
    conditionId: abilityId,
    exclusivityGroup: nonNegativeInteger.nullable().default(null),
    durationTicks: nonNegativeInteger.default(0),
    skillIndex: nonNegativeInteger.nullable().default(null),
    skillModifierPermille: safeInteger.default(0),
    damageDealtPermille: safeInteger.default(0),
    damageReceivedPermille: safeInteger.default(0),
    speedPermille: safeInteger.default(0),
    manaShield: z.boolean().default(false),
    tickDamageAmount: nonNegativeInteger.default(0),
    tickDamageIntervalTicks: nonNegativeInteger.default(0),
    elementBonusPermille: safeInteger.default(0),
    convertNextAbilityElement: z.boolean().default(false),
    bonusElement: CombatElementSchema.nullable().default(null),
  })
  .strict();

const LootEntryDefinitionSchema = z
  .object({
    itemIndex: nonNegativeInteger,
    chancePerHundredThousand: safeInteger.min(1).max(100_000),
    minCount: positiveInteger,
    maxCount: positiveInteger,
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.minCount > entry.maxCount) {
      addSimulationIssue(
        context,
        'SIM_SCHEMA_INVALID',
        ['minCount'],
        'minCount must not exceed maxCount',
      );
    }
  });

export const LootTableDefinitionSchema = z
  .object({
    entries: z.array(LootEntryDefinitionSchema).readonly(),
  })
  .strict();

export const InitialActorSchema = z
  .object({
    blueprintId,
    position: GridPositionSchema,
    facing: DirectionSchema,
  })
  .strict();

function addSimulationIssue(
  context: z.RefinementCtx,
  code: SimulationDiagnosticCode,
  path: readonly (string | number)[],
  message: string,
) {
  context.addIssue({
    code: 'custom',
    path: [...path],
    message,
    params: { simulationCode: code },
  });
}

function compareBlockedTiles(
  left: readonly [number, number],
  right: readonly [number, number],
) {
  if (left[1] !== right[1]) {
    return left[1] < right[1] ? -1 : 1;
  }
  if (left[0] !== right[0]) {
    return left[0] < right[0] ? -1 : 1;
  }
  return 0;
}

function tileKey(x: number, y: number) {
  return `${x}:${y}`;
}

function positionKey(position: {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}) {
  return `${position.x}:${position.y}:${position.z}`;
}

export const ScenarioFloorSchema = z
  .object({
    z: safeInteger,
    blockedTiles: z.array(BlockedTileSchema).readonly(),
  })
  .strict();

export const ScenarioTransitionSchema = z
  .object({
    from: GridPositionSchema,
    to: GridPositionSchema,
  })
  .strict();

export const ScenarioSpawnSlotSchema = z
  .object({
    blueprintId,
    position: GridPositionSchema,
    respawnTicks: nonNegativeInteger,
  })
  .strict();

export const ScenarioSpawnGroupSchema = z
  .object({
    center: GridPositionSchema,
    radius: nonNegativeInteger,
    slots: z.array(ScenarioSpawnSlotSchema).readonly(),
  })
  .strict();

export const KernelScenarioSchema = z
  .object({
    schemaVersion: nonNegativeInteger,
    scenarioId: nonEmptyString,
    scenarioRevision: nonNegativeInteger,
    width: positiveInteger,
    height: positiveInteger,
    floors: z.array(ScenarioFloorSchema).readonly(),
    transitions: z.array(ScenarioTransitionSchema).readonly(),
    spawnGroups: z.array(ScenarioSpawnGroupSchema).readonly(),
    maxLiveActors: positiveInteger,
    abilities: z.array(AbilityDefinitionSchema).readonly(),
    lootTables: z.array(LootTableDefinitionSchema).readonly(),
    conditions: z
      .array(ScenarioConditionDefinitionSchema)
      .readonly()
      .default([]),
    blueprints: z.array(ActorBlueprintSchema).readonly(),
    initialActors: z.array(InitialActorSchema).readonly(),
  })
  .strict()
  .superRefine((scenario, context) => {
    const inside = (position: { readonly x: number; readonly y: number }) =>
      position.x >= 0 &&
      position.x < scenario.width &&
      position.y >= 0 &&
      position.y < scenario.height;

    if (scenario.floors.length === 0) {
      addSimulationIssue(
        context,
        'SIM_SCHEMA_INVALID',
        ['floors'],
        'A scenario must declare at least one floor',
      );
    }

    // A blocked cell belongs to one floor: `(x, y)` alone is not a key any
    // more, and the same column can be free above and solid below.
    const blocked = new Set<string>();
    const declaredFloors = new Set<number>();
    let previousZ: number | undefined;

    scenario.floors.forEach((floor, floorIndex) => {
      if (previousZ !== undefined && floor.z <= previousZ) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['floors', floorIndex, 'z'],
          'floors must be strictly ordered by ascending z',
        );
      }
      previousZ = floor.z;
      declaredFloors.add(floor.z);

      const seen = new Set<string>();
      let previousTile: readonly [number, number] | undefined;

      floor.blockedTiles.forEach((tile, index) => {
        const [x, y] = tile;
        const path = ['floors', floorIndex, 'blockedTiles', index] as const;

        if (!inside({ x, y })) {
          addSimulationIssue(
            context,
            'SIM_SCHEMA_INVALID',
            path,
            'Blocked tile must be inside the scenario grid',
          );
        }

        if (
          previousTile !== undefined &&
          compareBlockedTiles(previousTile, tile) >= 0
        ) {
          addSimulationIssue(
            context,
            'SIM_SCHEMA_INVALID',
            path,
            'blockedTiles must be strictly ordered by (y, x)',
          );
        }

        if (seen.has(tileKey(x, y))) {
          addSimulationIssue(
            context,
            'SIM_SCHEMA_INVALID',
            path,
            'blockedTiles must not contain duplicates',
          );
        }

        seen.add(tileKey(x, y));
        blocked.add(positionKey({ x, y, z: floor.z }));
        previousTile = tile;
      });
    });

    const usable = (
      position: { readonly x: number; readonly y: number; readonly z: number },
      allowBlocked: boolean,
    ): string | undefined => {
      if (!inside(position)) {
        return 'must be inside the scenario grid';
      }
      if (!declaredFloors.has(position.z)) {
        return 'must sit on a declared floor';
      }
      if (!allowBlocked && blocked.has(positionKey(position))) {
        return 'must not sit on blocked terrain';
      }
      return undefined;
    };

    const transitionSources = new Set<string>();
    scenario.transitions.forEach((transition, index) => {
      const fromProblem = usable(transition.from, true);
      if (fromProblem !== undefined) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['transitions', index, 'from'],
          `Transition source ${fromProblem}`,
        );
      }

      const toProblem = usable(transition.to, false);
      if (toProblem !== undefined) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['transitions', index, 'to'],
          `Transition target ${toProblem}`,
        );
      }

      if (positionKey(transition.from) === positionKey(transition.to)) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['transitions', index],
          'A transition must not target its own source',
        );
      }

      const key = positionKey(transition.from);
      if (transitionSources.has(key)) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['transitions', index, 'from'],
          'A cell can declare at most one transition',
        );
      }
      transitionSources.add(key);
    });

    const blueprintIds = new Set<string>();
    scenario.blueprints.forEach((blueprint, index) => {
      if (blueprintIds.has(blueprint.blueprintId)) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['blueprints', index, 'blueprintId'],
          'blueprintId must be unique',
        );
      }
      blueprintIds.add(blueprint.blueprintId);

      if (
        blueprint.lootTableIndex !== null &&
        blueprint.lootTableIndex >= scenario.lootTables.length
      ) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['blueprints', index, 'lootTableIndex'],
          `lootTableIndex ${blueprint.lootTableIndex} is outside lootTables`,
        );
      }

      blueprint.abilityIndices.forEach((abilityIndex, abilityPosition) => {
        if (abilityIndex >= scenario.abilities.length) {
          addSimulationIssue(
            context,
            'SIM_SCHEMA_INVALID',
            ['blueprints', index, 'abilityIndices', abilityPosition],
            `Unknown ability index ${abilityIndex}`,
          );
        }
      });
    });

    const abilityIds = new Set<string>();
    scenario.abilities.forEach((ability, index) => {
      if (abilityIds.has(ability.abilityId)) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['abilities', index, 'abilityId'],
          'abilityId must be unique',
        );
      }
      abilityIds.add(ability.abilityId);

      if (
        ability.appliedConditionIndex !== null &&
        ability.appliedConditionIndex >= scenario.conditions.length
      ) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['abilities', index, 'appliedConditionIndex'],
          `appliedConditionIndex ${ability.appliedConditionIndex} is outside conditions`,
        );
      }
    });

    const conditionIds = new Set<string>();
    scenario.conditions.forEach((condition, index) => {
      if (conditionIds.has(condition.conditionId)) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['conditions', index, 'conditionId'],
          'conditionId must be unique',
        );
      }
      conditionIds.add(condition.conditionId);
    });

    // The canonical spawn order is derived from `(z, y, x)` of the centre and
    // of each slot, so both keys have to be unique for the order to be total.
    const groupCentres = new Set<string>();
    scenario.spawnGroups.forEach((group, groupIndex) => {
      const centreProblem = usable(group.center, true);
      if (centreProblem !== undefined) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['spawnGroups', groupIndex, 'center'],
          `Spawn group centre ${centreProblem}`,
        );
      }

      const centreKey = positionKey(group.center);
      if (groupCentres.has(centreKey)) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['spawnGroups', groupIndex, 'center'],
          'Spawn group centres must be unique',
        );
      }
      groupCentres.add(centreKey);

      const slotCells = new Set<string>();
      group.slots.forEach((slot, slotIndex) => {
        const path = ['spawnGroups', groupIndex, 'slots', slotIndex] as const;

        if (!blueprintIds.has(slot.blueprintId)) {
          addSimulationIssue(
            context,
            'SIM_SCHEMA_INVALID',
            [...path, 'blueprintId'],
            `Unknown blueprint ${slot.blueprintId}`,
          );
        }

        const slotProblem = usable(slot.position, false);
        if (slotProblem !== undefined) {
          addSimulationIssue(
            context,
            'SIM_SCHEMA_INVALID',
            [...path, 'position'],
            `Spawn slot position ${slotProblem}`,
          );
        }

        if (
          slot.position.z !== group.center.z ||
          Math.abs(slot.position.x - group.center.x) > group.radius ||
          Math.abs(slot.position.y - group.center.y) > group.radius
        ) {
          addSimulationIssue(
            context,
            'SIM_SCHEMA_INVALID',
            [...path, 'position'],
            'Spawn slot position must lie inside the group radius',
          );
        }

        const slotKey = positionKey(slot.position);
        if (slotCells.has(slotKey)) {
          addSimulationIssue(
            context,
            'SIM_SCHEMA_INVALID',
            [...path, 'position'],
            'Spawn slots of a group must not share a cell',
          );
        }
        slotCells.add(slotKey);
      });
    });

    const actorCells = new Set<string>();
    scenario.initialActors.forEach((actor, index) => {
      const positionPath = ['initialActors', index, 'position'] as const;
      const { position } = actor;

      if (!blueprintIds.has(actor.blueprintId)) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['initialActors', index, 'blueprintId'],
          `Unknown blueprint ${actor.blueprintId}`,
        );
      }

      if (!inside(position)) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          positionPath,
          'Initial actor position must be inside the scenario grid',
        );
      }

      if (!declaredFloors.has(position.z)) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          [...positionPath, 'z'],
          'Initial actor position must use a declared floor',
        );
      }

      if (blocked.has(positionKey(position))) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          positionPath,
          'Initial actor cannot occupy a blocked tile',
        );
      }

      const key = positionKey(position);
      if (actorCells.has(key)) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          positionPath,
          'Initial actors cannot share a cell',
        );
      }
      actorCells.add(key);
    });
  });

const ActorMoveStepCommandSchema = z
  .object({
    type: z.literal('actor/move-step'),
    entityId: EntityIdSchema,
    direction: DirectionSchema,
  })
  .strict();

const ActorFaceCommandSchema = z
  .object({
    type: z.literal('actor/face'),
    entityId: EntityIdSchema,
    direction: DirectionSchema,
  })
  .strict();

const ActorWaitCommandSchema = z
  .object({
    type: z.literal('actor/wait'),
    entityId: EntityIdSchema,
  })
  .strict();

const ActorAttackCommandSchema = z
  .object({
    type: z.literal('actor/attack'),
    entityId: EntityIdSchema,
    targetEntityId: EntityIdSchema,
  })
  .strict();

const ActorCastAbilityCommandSchema = z
  .object({
    type: z.literal('actor/cast-ability'),
    entityId: EntityIdSchema,
    abilityIndex: nonNegativeInteger,
    targetEntityId: EntityIdSchema.nullable(),
  })
  .strict();

/**
 * The persistent Tibia target. While it is set the actor swings on its own
 * attack cooldown, so a click is a decision and not a single blow.
 */
const ActorSetTargetCommandSchema = z
  .object({
    type: z.literal('actor/set-target'),
    entityId: EntityIdSchema,
    targetEntityId: EntityIdSchema.nullable(),
  })
  .strict();

const ScenarioSpawnActorCommandSchema = z
  .object({
    type: z.literal('scenario/spawn-actor'),
    blueprintId,
    position: GridPositionSchema,
    facing: DirectionSchema,
  })
  .strict();

const ScenarioDespawnActorCommandSchema = z
  .object({
    type: z.literal('scenario/despawn-actor'),
    entityId: EntityIdSchema,
  })
  .strict();

export const SimulationCommandSchema = z.discriminatedUnion('type', [
  ActorMoveStepCommandSchema,
  ActorFaceCommandSchema,
  ActorWaitCommandSchema,
  ActorAttackCommandSchema,
  ActorCastAbilityCommandSchema,
  ActorSetTargetCommandSchema,
  ScenarioSpawnActorCommandSchema,
  ScenarioDespawnActorCommandSchema,
]);

function validateCommandIssuer(
  input: {
    readonly issuer: 'player' | 'ai' | 'scenario';
    readonly command: { readonly type: SimulationCommandType };
  },
  context: z.RefinementCtx,
) {
  const isScenarioCommand = input.command.type.startsWith('scenario/');
  const valid = isScenarioCommand
    ? input.issuer === 'scenario'
    : input.issuer === 'player' || input.issuer === 'ai';

  if (!valid) {
    addSimulationIssue(
      context,
      'SIM_COMMAND_FORBIDDEN',
      ['issuer'],
      `Issuer ${input.issuer} is not allowed to emit ${input.command.type}`,
    );
  }
}

export const SimulationCommandInputSchema = z
  .object({
    tick: TickIndexSchema,
    issuer: z.enum(['player', 'ai', 'scenario']),
    command: SimulationCommandSchema,
  })
  .strict()
  .superRefine(validateCommandIssuer);

export const SimulationCommandRecordSchema = z
  .object({
    tick: TickIndexSchema,
    sequence: positiveInteger,
    issuer: z.enum(['player', 'ai', 'scenario']),
    command: SimulationCommandSchema,
  })
  .strict()
  .superRefine(validateCommandIssuer);

export const ActorSpawnedEventPayloadSchema = z
  .object({
    type: z.literal('actor/spawned'),
    entityId: EntityIdSchema,
    blueprintId,
    position: GridPositionSchema,
    facing: DirectionSchema,
  })
  .strict();

export const ActorMovedEventPayloadSchema = z
  .object({
    type: z.literal('actor/moved'),
    entityId: EntityIdSchema,
    from: GridPositionSchema,
    to: GridPositionSchema,
    facing: DirectionSchema,
  })
  .strict();

export const ActorMoveBlockedEventPayloadSchema = z
  .object({
    type: z.literal('actor/move-blocked'),
    entityId: EntityIdSchema,
    attempted: GridPositionSchema,
    reason: MoveBlockedReasonSchema,
  })
  .strict();

export const ActorTransitionedEventPayloadSchema = z
  .object({
    type: z.literal('actor/transitioned'),
    entityId: EntityIdSchema,
    from: GridPositionSchema,
    to: GridPositionSchema,
  })
  .strict();

export const SpawnDeferredEventPayloadSchema = z
  .object({
    type: z.literal('spawn/deferred'),
    groupIndex: nonNegativeInteger,
    slotIndex: nonNegativeInteger,
    reason: SpawnDeferralReasonSchema,
  })
  .strict();

export const SpawnCappedEventPayloadSchema = z
  .object({
    type: z.literal('spawn/capped'),
    groupIndex: nonNegativeInteger,
    slotIndex: nonNegativeInteger,
  })
  .strict();

export const CombatAttackedEventPayloadSchema = z
  .object({
    type: z.literal('combat/attacked'),
    entityId: EntityIdSchema,
    targetEntityId: EntityIdSchema,
  })
  .strict();

export const CombatDamagedEventPayloadSchema = z
  .object({
    type: z.literal('combat/damaged'),
    entityId: EntityIdSchema,
    sourceEntityId: EntityIdSchema,
    amount: nonNegativeInteger,
    remainingHealth: nonNegativeInteger,
    cause: CombatCauseSchema,
  })
  .strict();

export const CombatHealedEventPayloadSchema = z
  .object({
    type: z.literal('combat/healed'),
    entityId: EntityIdSchema,
    sourceEntityId: EntityIdSchema,
    amount: nonNegativeInteger,
    health: nonNegativeInteger,
  })
  .strict();

export const CombatLeechedEventPayloadSchema = z
  .object({
    type: z.literal('combat/leeched'),
    entityId: EntityIdSchema,
    sourceEntityId: EntityIdSchema,
    healthAmount: nonNegativeInteger,
    resourceAmount: nonNegativeInteger,
    health: nonNegativeInteger,
    resource: nonNegativeInteger,
  })
  .strict();

/**
 * Upkeep restoring health or resource. It carries absolute values because
 * regeneration is a state change nobody commanded: a presentation that only
 * watches damage and heals would otherwise drift away from the actor.
 */
export const CombatRegeneratedEventPayloadSchema = z
  .object({
    type: z.literal('combat/regenerated'),
    entityId: EntityIdSchema,
    health: nonNegativeInteger,
    resource: nonNegativeInteger,
  })
  .strict();

export const AbilityCastEventPayloadSchema = z
  .object({
    type: z.literal('ability/cast'),
    entityId: EntityIdSchema,
    abilityIndex: nonNegativeInteger,
    targetEntityId: EntityIdSchema.nullable(),
  })
  .strict();

export const CombatTargetChangedEventPayloadSchema = z
  .object({
    type: z.literal('combat/target-changed'),
    entityId: EntityIdSchema,
    targetEntityId: EntityIdSchema.nullable(),
  })
  .strict();

export const ActorDiedEventPayloadSchema = z
  .object({
    type: z.literal('actor/died'),
    entityId: EntityIdSchema,
    killerEntityId: EntityIdSchema.nullable(),
    position: GridPositionSchema,
  })
  .strict();

export const LootGrantedEventPayloadSchema = z
  .object({
    type: z.literal('loot/granted'),
    entityId: EntityIdSchema,
    sourceEntityId: EntityIdSchema,
    itemIndex: nonNegativeInteger,
    count: positiveInteger,
  })
  .strict();

export const ActorFacedEventPayloadSchema = z
  .object({
    type: z.literal('actor/faced'),
    entityId: EntityIdSchema,
    facing: DirectionSchema,
  })
  .strict();

export const ActorDespawnedEventPayloadSchema = z
  .object({
    type: z.literal('actor/despawned'),
    entityId: EntityIdSchema,
  })
  .strict();

export const CommandRejectedEventPayloadSchema = z
  .object({
    type: z.literal('command/rejected'),
    commandType: SimulationCommandTypeSchema,
    commandSequence: positiveInteger,
    code: SimulationDiagnosticCodeSchema,
  })
  .strict();

export const SimulationEventPayloadSchema = z.discriminatedUnion('type', [
  ActorSpawnedEventPayloadSchema,
  ActorMovedEventPayloadSchema,
  ActorMoveBlockedEventPayloadSchema,
  ActorFacedEventPayloadSchema,
  ActorDespawnedEventPayloadSchema,
  ActorTransitionedEventPayloadSchema,
  SpawnDeferredEventPayloadSchema,
  SpawnCappedEventPayloadSchema,
  CombatAttackedEventPayloadSchema,
  CombatDamagedEventPayloadSchema,
  CombatHealedEventPayloadSchema,
  CombatLeechedEventPayloadSchema,
  CombatRegeneratedEventPayloadSchema,
  AbilityCastEventPayloadSchema,
  CombatTargetChangedEventPayloadSchema,
  ActorDiedEventPayloadSchema,
  LootGrantedEventPayloadSchema,
  CommandRejectedEventPayloadSchema,
]);

export const SimulationEventSchema = z
  .object({
    tick: TickIndexSchema,
    sequence: positiveInteger,
    payload: SimulationEventPayloadSchema,
  })
  .strict();

export const RandomStreamStateSchema = z
  .object({
    label: StreamLabelSchema,
    s0: uint32,
    s1: uint32,
    s2: uint32,
    s3: uint32,
    drawCount: nonNegativeInteger,
  })
  .strict();

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The only v4 → v5 shape break: a scalar group channel becomes the primary
 * group entry. Additive fields are filled by schema defaults, not here.
 */
export function migrateActorStateInput(value: unknown): unknown {
  if (!isObjectRecord(value)) {
    return value;
  }
  if (Object.hasOwn(value, 'groupCooldowns')) {
    return value;
  }
  if (!Object.hasOwn(value, 'groupReadyAtTick')) {
    return value;
  }

  const { groupReadyAtTick, ...rest } = value;
  if (
    typeof groupReadyAtTick !== 'number' ||
    !Number.isSafeInteger(groupReadyAtTick) ||
    groupReadyAtTick < 0
  ) {
    return {
      ...rest,
      groupCooldowns: groupReadyAtTick,
    };
  }

  return {
    ...rest,
    groupCooldowns: [
      {
        groupIndex: PRIMARY_COOLDOWN_GROUP,
        readyAtTick: groupReadyAtTick,
      },
    ],
  };
}

function refineOrderedUniqueByNumber<Key extends string>(
  entries: readonly Record<Key, number>[],
  key: Key,
  context: z.RefinementCtx,
  collection: string,
) {
  for (let index = 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const current = entries[index];
    if (previous === undefined || current === undefined) {
      continue;
    }
    if (previous[key] === current[key]) {
      addSimulationIssue(
        context,
        'SIM_SCHEMA_INVALID',
        [collection, index],
        `${collection} must not repeat a ${key}`,
      );
    } else if (previous[key] > current[key]) {
      addSimulationIssue(
        context,
        'SIM_SCHEMA_INVALID',
        [collection, index],
        `${collection} must be strictly ordered by ${key}`,
      );
    }
  }
}

const ActorStateObjectSchema = z
  .object({
    entityId: EntityIdSchema,
    blueprintId,
    position: GridPositionSchema,
    facing: DirectionSchema,
    readyAtTick: nonNegativeInteger,
    transitionGuard: GridPositionSchema.nullable(),
    health: nonNegativeInteger,
    resource: nonNegativeInteger,
    targetEntityId: EntityIdSchema.nullable(),
    attackReadyAtTick: nonNegativeInteger,
    groupCooldowns: z
      .array(
        z
          .object({
            groupIndex: nonNegativeInteger,
            readyAtTick: nonNegativeInteger,
          })
          .strict(),
      )
      .readonly()
      .default([]),
    abilityCooldowns: z
      .array(
        z
          .object({
            abilityIndex: nonNegativeInteger,
            readyAtTick: nonNegativeInteger,
          })
          .strict(),
      )
      .readonly(),
    nextHealthRegenTick: nonNegativeInteger,
    nextResourceRegenTick: nonNegativeInteger,
    lastDamageReceivedTick: nonNegativeInteger.default(0),
    activeConditions: z
      .array(
        z
          .object({
            conditionIndex: nonNegativeInteger,
            expiresAtTick: nonNegativeInteger,
            exclusivityGroup: nonNegativeInteger.nullable(),
          })
          .strict(),
      )
      .readonly()
      .default([]),
    abilityCharges: z
      .array(
        z
          .object({
            abilityIndex: nonNegativeInteger,
            remaining: nonNegativeInteger,
          })
          .strict(),
      )
      .readonly()
      .default([]),
  })
  .strict()
  .superRefine((actor, context) => {
    refineOrderedUniqueByNumber(
      actor.groupCooldowns,
      'groupIndex',
      context,
      'groupCooldowns',
    );
    refineOrderedUniqueByNumber(
      actor.activeConditions,
      'conditionIndex',
      context,
      'activeConditions',
    );
    refineOrderedUniqueByNumber(
      actor.abilityCharges,
      'abilityIndex',
      context,
      'abilityCharges',
    );
  });

export const ActorStateSchema = z.preprocess(
  migrateActorStateInput,
  ActorStateObjectSchema,
);

export const SpawnSlotStateSchema = z
  .object({
    groupIndex: nonNegativeInteger,
    slotIndex: nonNegativeInteger,
    readyAtTick: nonNegativeInteger,
    entityId: EntityIdSchema.nullable(),
  })
  .strict();

const PendingMoveIntentStateSchema = z
  .object({
    kind: z.literal('move'),
    tick: TickIndexSchema,
    entityId: EntityIdSchema,
    direction: DirectionSchema,
  })
  .strict();

const PendingAttackIntentStateSchema = z
  .object({
    kind: z.literal('attack'),
    tick: TickIndexSchema,
    entityId: EntityIdSchema,
    targetEntityId: EntityIdSchema,
  })
  .strict();

export const PendingIntentStateSchema = z.discriminatedUnion('kind', [
  PendingMoveIntentStateSchema,
  PendingAttackIntentStateSchema,
]);

function comparePendingIntents(
  left: { readonly tick: number; readonly entityId: number },
  right: { readonly tick: number; readonly entityId: number },
) {
  if (left.tick !== right.tick) {
    return left.tick < right.tick ? -1 : 1;
  }
  if (left.entityId !== right.entityId) {
    return left.entityId < right.entityId ? -1 : 1;
  }
  return 0;
}

function compareSpawnSlots(
  left: { readonly groupIndex: number; readonly slotIndex: number },
  right: { readonly groupIndex: number; readonly slotIndex: number },
) {
  if (left.groupIndex !== right.groupIndex) {
    return left.groupIndex < right.groupIndex ? -1 : 1;
  }
  if (left.slotIndex !== right.slotIndex) {
    return left.slotIndex < right.slotIndex ? -1 : 1;
  }
  return 0;
}

function compareSnapshotCommands(
  left: { readonly tick: number; readonly sequence: number },
  right: { readonly tick: number; readonly sequence: number },
) {
  if (left.tick !== right.tick) {
    return left.tick < right.tick ? -1 : 1;
  }
  if (left.sequence !== right.sequence) {
    return left.sequence < right.sequence ? -1 : 1;
  }
  return 0;
}

export const SimulationSnapshotSchema = z
  .object({
    schemaVersion: nonNegativeInteger,
    rulesVersion: nonNegativeInteger,
    scenarioId: nonEmptyString,
    scenarioRevision: nonNegativeInteger,
    seed: SeedSchema,
    tick: TickIndexSchema,
    nextEntityId: positiveInteger,
    nextEventSequence: positiveInteger,
    nextCommandSequence: positiveInteger,
    randomStreams: z.array(RandomStreamStateSchema).readonly(),
    actors: z.array(ActorStateSchema).readonly(),
    pendingCommands: z.array(SimulationCommandRecordSchema).readonly(),
    pendingIntents: z.array(PendingIntentStateSchema).readonly(),
    spawnSlots: z.array(SpawnSlotStateSchema).readonly(),
  })
  .strict()
  .superRefine((snapshot, context) => {
    for (let index = 1; index < snapshot.randomStreams.length; index += 1) {
      const previous = snapshot.randomStreams[index - 1];
      const current = snapshot.randomStreams[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      if (previous.label >= current.label) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['randomStreams', index, 'label'],
          'randomStreams must be strictly ordered by label',
        );
      }
    }

    for (let index = 1; index < snapshot.actors.length; index += 1) {
      const previous = snapshot.actors[index - 1];
      const current = snapshot.actors[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      if (previous.entityId >= current.entityId) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['actors', index, 'entityId'],
          'actors must be strictly ordered by entityId',
        );
      }
    }

    for (let index = 1; index < snapshot.pendingCommands.length; index += 1) {
      const previous = snapshot.pendingCommands[index - 1];
      const current = snapshot.pendingCommands[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      if (compareSnapshotCommands(previous, current) >= 0) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['pendingCommands', index],
          'pendingCommands must be strictly ordered by (tick, sequence)',
        );
      }
    }

    const actorCells = new Set<string>();
    const liveEntityIds = new Set<number>();
    snapshot.actors.forEach((actor, index) => {
      const key = positionKey(actor.position);
      if (actorCells.has(key)) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['actors', index, 'position'],
          'actors cannot share a cell',
        );
      }
      actorCells.add(key);
      liveEntityIds.add(actor.entityId);

      for (
        let cooldownIndex = 1;
        cooldownIndex < actor.abilityCooldowns.length;
        cooldownIndex += 1
      ) {
        const previous = actor.abilityCooldowns[cooldownIndex - 1];
        const current = actor.abilityCooldowns[cooldownIndex];
        if (previous === undefined || current === undefined) {
          continue;
        }
        if (previous.abilityIndex === current.abilityIndex) {
          addSimulationIssue(
            context,
            'SIM_SCHEMA_INVALID',
            ['actors', index, 'abilityCooldowns', cooldownIndex],
            'abilityCooldowns must not repeat an abilityIndex',
          );
        } else if (previous.abilityIndex > current.abilityIndex) {
          addSimulationIssue(
            context,
            'SIM_SCHEMA_INVALID',
            ['actors', index, 'abilityCooldowns', cooldownIndex],
            'abilityCooldowns must be strictly ordered by abilityIndex',
          );
        }
      }
    });

    snapshot.actors.forEach((actor, index) => {
      if (
        actor.targetEntityId !== null &&
        !liveEntityIds.has(actor.targetEntityId)
      ) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['actors', index, 'targetEntityId'],
          `targetEntityId ${actor.targetEntityId} does not name a live actor`,
        );
      }
    });

    snapshot.pendingIntents.forEach((intent, index) => {
      if (intent.tick < snapshot.tick) {
        addSimulationIssue(
          context,
          'SIM_TICK_IN_PAST',
          ['pendingIntents', index, 'tick'],
          'pendingIntents cannot be scheduled before the snapshot tick',
        );
      }

      if (
        intent.kind === 'attack' &&
        !liveEntityIds.has(intent.targetEntityId)
      ) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['pendingIntents', index, 'targetEntityId'],
          `Attack intent target ${intent.targetEntityId} is not in the snapshot`,
        );
      }

      const previous = snapshot.pendingIntents[index - 1];
      if (previous === undefined) {
        return;
      }

      // Strict ordering is what makes the pair unique: a repeated pair sorts
      // equal, so it can never appear in a correctly ordered list.
      const order = comparePendingIntents(previous, intent);
      if (order === 0) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['pendingIntents', index],
          'pendingIntents must not repeat a (tick, entityId) pair',
        );
      } else if (order > 0) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['pendingIntents', index],
          'pendingIntents must be strictly ordered by (tick, entityId)',
        );
      }
    });

    snapshot.spawnSlots.forEach((slot, index) => {
      if (slot.entityId !== null && !liveEntityIds.has(slot.entityId)) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['spawnSlots', index, 'entityId'],
          `spawnSlots cannot hold the missing entity ${slot.entityId}`,
        );
      }

      const previous = snapshot.spawnSlots[index - 1];
      if (previous === undefined) {
        return;
      }

      const order = compareSpawnSlots(previous, slot);
      if (order === 0) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['spawnSlots', index],
          'spawnSlots must not repeat a (groupIndex, slotIndex) pair',
        );
      } else if (order > 0) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['spawnSlots', index],
          'spawnSlots must be strictly ordered by (groupIndex, slotIndex)',
        );
      }
    });
  });

export const SimulationCommandLogHeaderSchema = z
  .object({
    kind: z.literal('header'),
    schemaVersion: nonNegativeInteger,
    rulesVersion: nonNegativeInteger,
    scenarioId: nonEmptyString,
    scenarioRevision: nonNegativeInteger,
    seed: SeedSchema,
    tickCount: nonNegativeInteger,
  })
  .strict();

export const SimulationCommandLogSchema = z
  .object({
    header: SimulationCommandLogHeaderSchema,
    commands: z.array(SimulationCommandRecordSchema).readonly(),
  })
  .strict()
  .superRefine((log, context) => {
    for (let index = 1; index < log.commands.length; index += 1) {
      const previous = log.commands[index - 1];
      const current = log.commands[index];
      if (previous === undefined || current === undefined) {
        continue;
      }

      if (current.tick < previous.tick) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          ['commands', index, 'tick'],
          'command log ticks must be non-decreasing',
        );
      }

      if (current.sequence <= previous.sequence) {
        addSimulationIssue(
          context,
          'SIM_COMMAND_DUPLICATE',
          ['commands', index, 'sequence'],
          'command log sequences must be strictly increasing',
        );
      }
    }
  });

export function commandPriority(type: SimulationCommandType): number {
  switch (type) {
    case 'scenario/spawn-actor':
    case 'scenario/despawn-actor':
      return 0;
    // Neither turns nor targeting consume the tick, so they land first: a
    // click and a spell issued together resolve against the new target.
    case 'actor/face':
    case 'actor/set-target':
      return 1;
    case 'actor/move-step':
      return 2;
    case 'actor/attack':
      return 3;
    case 'actor/cast-ability':
      return 4;
    case 'actor/wait':
      return 5;
  }
}

export function isConcurrentActorAction(
  type: SimulationCommandType,
): type is
  | 'actor/move-step'
  | 'actor/attack'
  | 'actor/cast-ability'
  | 'actor/wait' {
  switch (type) {
    case 'actor/move-step':
    case 'actor/attack':
    case 'actor/cast-ability':
    case 'actor/wait':
      return true;
    case 'actor/face':
    case 'actor/set-target':
    case 'scenario/spawn-actor':
    case 'scenario/despawn-actor':
      return false;
  }
}

export type { Direction, SimulationCommandType };
