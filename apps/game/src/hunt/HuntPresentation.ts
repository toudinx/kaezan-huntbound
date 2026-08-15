import {
  type AssetKey,
  createAssetKey,
} from '../../../../packages/assets/src/index.ts';
import type {
  Direction,
  EntityId,
  GridPosition,
  MapRegion,
  SimulationEvent,
} from '../../../../packages/contracts/src/index.ts';
import {
  groundCompositionStats,
  resolveGroundSample,
  type GroundCompositionStats,
} from './GroundCompositor';
import type { ActorMotionSegment } from './ActorMotion';
import { createActorMotion } from './ActorMotion';

export type HuntDrawLayer =
  | 'ground'
  | 'objectsBelow'
  | 'actors'
  | 'objectsAbove';

export interface PresentationActor {
  readonly entityId: EntityId;
  readonly blueprintId: string;
  readonly key: AssetKey;
  readonly position: GridPosition;
  readonly facing: Direction;
}

export interface HuntTileDrawCommand {
  readonly kind: 'tile';
  readonly layer: Exclude<HuntDrawLayer, 'actors'>;
  readonly key: AssetKey;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly sourceZ: number;
  readonly stackIndex: number;
}

export interface HuntActorDrawCommand {
  readonly kind: 'actor';
  readonly layer: 'actors';
  readonly key: AssetKey;
  readonly entityId: EntityId;
  readonly blueprintId: string;
  readonly facing: Direction;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type HuntDrawCommand = HuntTileDrawCommand | HuntActorDrawCommand;

export interface PresentationActorState extends PresentationActor {
  readonly previous: GridPosition;
  readonly target: GridPosition;
  readonly motion?: ActorMotionSegment;
}

interface MutablePresentationActorState {
  entityId: EntityId;
  blueprintId: string;
  key: AssetKey;
  position: GridPosition;
  previous: GridPosition;
  target: GridPosition;
  facing: Direction;
  motion?: ActorMotionSegment;
}

export interface HuntPresentation {
  handle(events: readonly SimulationEvent[]): void;
  setFloor(z: number): void;
  floor(): number;
  actors(): readonly PresentationActorState[];
  drawCommands(): readonly HuntDrawCommand[];
  groundComposition(): GroundCompositionStats;
}

export interface HuntPresentationOptions {
  readonly region: MapRegion;
  readonly actorKeys: ReadonlyMap<string, AssetKey>;
  readonly playerBlueprintId?: string;
  readonly initialFloor?: number;
  readonly stepCooldownTicksByBlueprint?: ReadonlyMap<string, number>;
  readonly onDiagnostic?: (message: string) => void;
}

function copyPosition(position: GridPosition): GridPosition {
  return { x: position.x, y: position.y, z: position.z };
}

function positionIndex(region: MapRegion, position: GridPosition): number {
  return position.y * region.width + position.x;
}

function tileKeyForPaletteIndex(
  region: MapRegion,
  paletteIndex: number | undefined,
): AssetKey | undefined {
  if (
    paletteIndex === undefined ||
    !Number.isSafeInteger(paletteIndex) ||
    paletteIndex < 0
  ) {
    return undefined;
  }

  const clientId = region.palette[paletteIndex];
  if (
    clientId === undefined ||
    !Number.isSafeInteger(clientId) ||
    clientId <= 0
  ) {
    return undefined;
  }

  return createAssetKey(`tile:tibia:${clientId}`);
}

function tileCommand(
  region: MapRegion,
  z: number,
  layer: Exclude<HuntDrawLayer, 'actors'>,
  index: number,
  paletteIndex: number | undefined,
  stackIndex: number,
  sourceZ: number,
): HuntTileDrawCommand | undefined {
  const key = tileKeyForPaletteIndex(region, paletteIndex);
  if (key === undefined) return undefined;
  return {
    kind: 'tile',
    layer,
    key,
    x: index % region.width,
    y: Math.floor(index / region.width),
    z,
    sourceZ,
    stackIndex,
  };
}

function sortedStacks(
  entries: readonly { readonly i: number; readonly stack: readonly number[] }[],
) {
  return [...entries].sort((left, right) => left.i - right.i);
}

export function buildFloorDrawCommands(
  region: MapRegion,
  z: number,
  actors: readonly PresentationActor[],
): readonly HuntDrawCommand[] {
  const floor = region.floors.find((candidate) => candidate.z === z);
  if (floor === undefined) return Object.freeze([]);

  const commands: HuntDrawCommand[] = [];
  const groundSamples = floor.ground.map((_paletteIndex, index) =>
    resolveGroundSample(region, z, index),
  );
  const hasGround = (index: number): boolean =>
    groundSamples[index] !== undefined;

  floor.ground.forEach((_paletteIndex, index) => {
    const sample = groundSamples[index];
    const command =
      sample === undefined
        ? undefined
        : tileCommand(
            region,
            z,
            'ground',
            index,
            sample.paletteIndex,
            0,
            sample.sourceZ,
          );
    if (command !== undefined) commands.push(command);
  });

  for (const entry of sortedStacks(floor.objectsBelow)) {
    if (!hasGround(entry.i)) continue;
    entry.stack.forEach((paletteIndex, stackIndex) => {
      const command = tileCommand(
        region,
        z,
        'objectsBelow',
        entry.i,
        paletteIndex,
        stackIndex,
        z,
      );
      if (command !== undefined) commands.push(command);
    });
  }

  for (const actor of [...actors]
    .filter((candidate) => candidate.position.z === z)
    .sort((left, right) => left.entityId - right.entityId)) {
    const index = positionIndex(region, actor.position);
    if (!hasGround(index)) continue;
    commands.push({
      kind: 'actor',
      layer: 'actors',
      key: actor.key,
      entityId: actor.entityId,
      blueprintId: actor.blueprintId,
      facing: actor.facing,
      x: actor.position.x,
      y: actor.position.y,
      z: actor.position.z,
    });
  }

  for (const entry of sortedStacks(floor.objectsAbove)) {
    if (!hasGround(entry.i)) continue;
    entry.stack.forEach((paletteIndex, stackIndex) => {
      const command = tileCommand(
        region,
        z,
        'objectsAbove',
        entry.i,
        paletteIndex,
        stackIndex,
        z,
      );
      if (command !== undefined) commands.push(command);
    });
  }

  return Object.freeze(commands);
}

function copyActor(
  actor: MutablePresentationActorState,
): PresentationActorState {
  return {
    entityId: actor.entityId,
    blueprintId: actor.blueprintId,
    key: actor.key,
    position: copyPosition(actor.target),
    previous: copyPosition(actor.previous),
    target: copyPosition(actor.target),
    facing: actor.facing,
    ...(actor.motion === undefined ? {} : { motion: { ...actor.motion } }),
  };
}

export function createHuntPresentation(
  options: HuntPresentationOptions,
): HuntPresentation {
  const actorsById = new Map<number, MutablePresentationActorState>();
  const playerBlueprintId = options.playerBlueprintId;
  const firstFloor = options.region.floors[0]?.z ?? 0;
  let activeFloor = options.initialFloor ?? firstFloor;
  let playerEntityId: EntityId | undefined;

  const diagnose = (message: string): void => {
    options.onDiagnostic?.(message);
  };

  const actorFor = (
    entityId: EntityId,
  ): MutablePresentationActorState | undefined => actorsById.get(entityId);

  const handle = (events: readonly SimulationEvent[]): void => {
    for (const event of events) {
      const payload = event.payload;
      switch (payload.type) {
        case 'actor/spawned': {
          const key = options.actorKeys.get(payload.blueprintId);
          if (key === undefined) {
            diagnose(
              `No presentation asset for blueprint ${payload.blueprintId}`,
            );
            continue;
          }
          const state: MutablePresentationActorState = {
            entityId: payload.entityId,
            blueprintId: payload.blueprintId,
            key,
            position: copyPosition(payload.position),
            previous: copyPosition(payload.position),
            target: copyPosition(payload.position),
            facing: payload.facing,
          };
          actorsById.set(payload.entityId, state);
          if (
            playerEntityId === undefined &&
            playerBlueprintId !== undefined &&
            payload.blueprintId === playerBlueprintId
          ) {
            playerEntityId = payload.entityId;
            activeFloor = payload.position.z;
          }
          break;
        }
        case 'actor/moved': {
          const actor = actorFor(payload.entityId);
          if (actor === undefined) {
            diagnose(`Move event references unknown actor ${payload.entityId}`);
            continue;
          }
          actor.previous = copyPosition(payload.from);
          actor.target = copyPosition(payload.to);
          actor.position = copyPosition(payload.to);
          actor.facing = payload.facing;
          actor.motion = createActorMotion({
            event: payload,
            eventTick: event.tick,
            baseStepTicks:
              options.stepCooldownTicksByBlueprint?.get(actor.blueprintId) ?? 1,
          });
          break;
        }
        case 'actor/faced': {
          const actor = actorFor(payload.entityId);
          if (actor === undefined) {
            diagnose(`Face event references unknown actor ${payload.entityId}`);
            continue;
          }
          actor.facing = payload.facing;
          break;
        }
        case 'actor/transitioned': {
          const actor = actorFor(payload.entityId);
          if (actor === undefined) {
            diagnose(
              `Transition event references unknown actor ${payload.entityId}`,
            );
            continue;
          }
          if (payload.entityId !== playerEntityId) {
            actorsById.delete(payload.entityId);
            continue;
          }
          actor.previous = copyPosition(payload.to);
          actor.target = copyPosition(payload.to);
          actor.position = copyPosition(payload.to);
          delete actor.motion;
          activeFloor = payload.to.z;
          break;
        }
        case 'actor/despawned': {
          actorsById.delete(payload.entityId);
          break;
        }
        case 'actor/move-blocked':
          break;
        case 'spawn/deferred':
        case 'spawn/capped':
        case 'command/rejected':
          break;
      }
    }
  };

  const setFloor = (z: number): void => {
    if (options.region.floors.some((floor) => floor.z === z)) {
      activeFloor = z;
      return;
    }
    diagnose(`Cannot present undeclared floor ${z}`);
  };

  return {
    handle,
    setFloor,
    floor: () => activeFloor,
    actors: () =>
      Object.freeze(
        [...actorsById.values()]
          .sort((left, right) => left.entityId - right.entityId)
          .map(copyActor),
      ),
    drawCommands: () =>
      buildFloorDrawCommands(
        options.region,
        activeFloor,
        [...actorsById.values()].map((actor) => ({
          entityId: actor.entityId,
          blueprintId: actor.blueprintId,
          key: actor.key,
          position: actor.target,
          facing: actor.facing,
        })),
      ),
    groundComposition: () =>
      groundCompositionStats(options.region, activeFloor),
  };
}
