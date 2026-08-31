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
import type { ActorMotionSegment } from './ActorMotion';
import { createActorMotion } from './ActorMotion';
import {
  type GroundCompositionStats,
  type GroundSample,
  groundCompositionStats,
  resolveGroundSample,
} from './GroundCompositor';

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

/** Inclusive cell bounds that the scene asks the presentation to draw. */
export interface HuntDrawWindow {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

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
  drawCommands(window?: HuntDrawWindow): readonly HuntDrawCommand[];
  groundComposition(): GroundCompositionStats;
}

export interface HuntPresentationOptions {
  readonly region: MapRegion;
  readonly actorKeys: ReadonlyMap<string, AssetKey>;
  readonly playerBlueprintId?: string;
  readonly initialFloor?: number;
  readonly stepCooldownTicksByBlueprint?: ReadonlyMap<string, number>;
  readonly stepCooldownTicksFor?: (actor: {
    readonly entityId: EntityId;
    readonly blueprintId: string;
  }) => number;
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

function fullDrawWindow(region: MapRegion): HuntDrawWindow {
  return {
    minX: 0,
    minY: 0,
    maxX: region.width - 1,
    maxY: region.height - 1,
  };
}

function normalizeDrawWindow(
  region: MapRegion,
  window: HuntDrawWindow | undefined,
): HuntDrawWindow {
  const source = window ?? fullDrawWindow(region);
  return {
    minX: Math.max(0, Math.ceil(source.minX)),
    minY: Math.max(0, Math.ceil(source.minY)),
    maxX: Math.min(region.width - 1, Math.floor(source.maxX)),
    maxY: Math.min(region.height - 1, Math.floor(source.maxY)),
  };
}

function windowContains(window: HuntDrawWindow, x: number, y: number): boolean {
  return (
    x >= window.minX && x <= window.maxX && y >= window.minY && y <= window.maxY
  );
}

export function buildFloorDrawCommands(
  region: MapRegion,
  z: number,
  actors: readonly PresentationActor[],
  window?: HuntDrawWindow,
): readonly HuntDrawCommand[] {
  const floor = region.floors.find((candidate) => candidate.z === z);
  if (floor === undefined) return Object.freeze([]);

  const drawWindow = normalizeDrawWindow(region, window);
  const commands: HuntDrawCommand[] = [];
  const groundSamples = new Map<number, GroundSample | undefined>();
  const groundSampleFor = (index: number): GroundSample | undefined => {
    if (!groundSamples.has(index)) {
      groundSamples.set(index, resolveGroundSample(region, z, index));
    }
    return groundSamples.get(index);
  };
  const hasGround = (index: number): boolean =>
    groundSampleFor(index) !== undefined;

  for (let y = drawWindow.minY; y <= drawWindow.maxY; y += 1) {
    for (let x = drawWindow.minX; x <= drawWindow.maxX; x += 1) {
      const index = y * region.width + x;
      const sample = groundSampleFor(index);
      if (sample === undefined) continue;

      const command = tileCommand(
        region,
        z,
        'ground',
        index,
        sample.paletteIndex,
        0,
        sample.sourceZ,
      );
      if (command !== undefined) commands.push(command);
    }
  }

  for (const entry of sortedStacks(floor.objectsBelow)) {
    const x = entry.i % region.width;
    const y = Math.floor(entry.i / region.width);
    if (!windowContains(drawWindow, x, y)) continue;
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
    .filter(
      (candidate) =>
        candidate.position.z === z &&
        windowContains(drawWindow, candidate.position.x, candidate.position.y),
    )
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
    const x = entry.i % region.width;
    const y = Math.floor(entry.i / region.width);
    if (!windowContains(drawWindow, x, y)) continue;
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
              options.stepCooldownTicksFor?.(actor) ??
              options.stepCooldownTicksByBlueprint?.get(actor.blueprintId) ??
              1,
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
          actor.previous = copyPosition(payload.to);
          actor.target = copyPosition(payload.to);
          actor.position = copyPosition(payload.to);
          delete actor.motion;
          if (payload.entityId === playerEntityId) {
            activeFloor = payload.to.z;
          }
          break;
        }
        case 'actor/despawned':
        case 'actor/died': {
          actorsById.delete(payload.entityId);
          break;
        }
        case 'actor/move-blocked':
          break;
        case 'spawn/deferred':
        case 'spawn/capped':
        case 'command/rejected':
        case 'combat/attacked':
        case 'combat/damaged':
        case 'combat/healed':
        case 'ability/cast':
        case 'combat/target-changed':
        case 'loot/granted':
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
    drawCommands: (window) =>
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
        window,
      ),
    groundComposition: () =>
      groundCompositionStats(options.region, activeFloor),
  };
}
