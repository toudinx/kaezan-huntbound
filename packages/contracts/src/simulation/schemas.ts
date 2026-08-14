import { z } from 'zod';

import {
  EntityIdSchema,
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

const directionValues = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
const commandTypeValues = [
  'actor/move-step',
  'actor/face',
  'actor/wait',
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
  'SIM_STATE_NOT_INTEGER',
  'SIM_STATE_NOT_SERIALIZABLE',
  'SIM_REPLAY_DIVERGED',
] as const;

export const DirectionSchema = z.enum(directionValues);
export const ActorBehaviorSchema = z.enum(['inert', 'wander']);
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

export const ActorStateSchema = z
  .object({
    entityId: EntityIdSchema,
    blueprintId,
    position: GridPositionSchema,
    facing: DirectionSchema,
    readyAtTick: nonNegativeInteger,
    transitionGuard: GridPositionSchema.nullable(),
  })
  .strict();

export const SpawnSlotStateSchema = z
  .object({
    groupIndex: nonNegativeInteger,
    slotIndex: nonNegativeInteger,
    readyAtTick: nonNegativeInteger,
    entityId: EntityIdSchema.nullable(),
  })
  .strict();

export const PendingIntentStateSchema = z
  .object({
    tick: TickIndexSchema,
    entityId: EntityIdSchema,
    direction: DirectionSchema,
  })
  .strict();

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

    snapshot.pendingIntents.forEach((intent, index) => {
      if (intent.tick < snapshot.tick) {
        addSimulationIssue(
          context,
          'SIM_TICK_IN_PAST',
          ['pendingIntents', index, 'tick'],
          'pendingIntents cannot be scheduled before the snapshot tick',
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
    case 'actor/face':
      return 1;
    case 'actor/move-step':
      return 2;
    case 'actor/wait':
      return 3;
  }
}

export type { Direction, SimulationCommandType };
