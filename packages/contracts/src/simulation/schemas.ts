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
  'SIM_STATE_NOT_INTEGER',
  'SIM_STATE_NOT_SERIALIZABLE',
  'SIM_REPLAY_DIVERGED',
] as const;

export const DirectionSchema = z.enum(directionValues);
export const ActorBehaviorSchema = z.enum(['inert', 'wander']);
export const CommandIssuerSchema = z.enum(['player', 'ai', 'scenario']);
export const MoveBlockedReasonSchema = z.enum([
  'bounds',
  'terrain',
  'occupied',
  'diagonal-corner',
  'cooldown',
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

export const KernelScenarioSchema = z
  .object({
    schemaVersion: nonNegativeInteger,
    scenarioId: nonEmptyString,
    scenarioRevision: nonNegativeInteger,
    width: positiveInteger,
    height: positiveInteger,
    z: safeInteger,
    blockedTiles: z.array(BlockedTileSchema).readonly(),
    blueprints: z.array(ActorBlueprintSchema).readonly(),
    initialActors: z.array(InitialActorSchema).readonly(),
  })
  .strict()
  .superRefine((scenario, context) => {
    const blocked = new Set<string>();
    let previousTile: readonly [number, number] | undefined;

    scenario.blockedTiles.forEach((tile, index) => {
      const [x, y] = tile;
      const path = ['blockedTiles', index] as const;

      if (x < 0 || x >= scenario.width || y < 0 || y >= scenario.height) {
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

      if (blocked.has(tileKey(x, y))) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          path,
          'blockedTiles must not contain duplicates',
        );
      }

      blocked.add(tileKey(x, y));
      previousTile = tile;
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

      if (
        position.x < 0 ||
        position.x >= scenario.width ||
        position.y < 0 ||
        position.y >= scenario.height
      ) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          positionPath,
          'Initial actor position must be inside the scenario grid',
        );
      }

      if (position.z !== scenario.z) {
        addSimulationIssue(
          context,
          'SIM_SCHEMA_INVALID',
          [...positionPath, 'z'],
          'Initial actor position must use the scenario z level',
        );
      }

      if (blocked.has(tileKey(position.x, position.y))) {
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
    reason: z.enum([
      'bounds',
      'terrain',
      'occupied',
      'diagonal-corner',
      'cooldown',
    ]),
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
  })
  .strict();

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
