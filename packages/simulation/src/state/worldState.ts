import type {
  ActorState,
  EntityId,
  GridPosition,
  KernelScenario,
  TickIndex,
} from '@huntbound/contracts';

export interface WorldState {
  readonly tick: TickIndex;
  readonly actors: readonly ActorState[];
  readonly nextEntityId: number;
}

export interface MutableWorld {
  tick: TickIndex;
  readonly nextEntityId: number;
  actor(entityId: EntityId): ActorState | undefined;
  actors(): readonly ActorState[];
  allocateEntityId(): EntityId;
  insert(actor: ActorState): void;
  remove(entityId: EntityId): boolean;
  update(actor: ActorState): void;
  state(): WorldState;
}

function clonePosition(position: GridPosition): GridPosition {
  return { x: position.x, y: position.y, z: position.z };
}

export function cloneActor(actor: ActorState): ActorState {
  return {
    entityId: actor.entityId,
    blueprintId: actor.blueprintId,
    position: clonePosition(actor.position),
    facing: actor.facing,
    readyAtTick: actor.readyAtTick,
    transitionGuard:
      actor.transitionGuard === null
        ? null
        : clonePosition(actor.transitionGuard),
  };
}

function createEmptyWorld(startEntityId: number, startTick: TickIndex) {
  const ordered: ActorState[] = [];
  const byEntityId = new Map<number, ActorState>();
  let nextEntityId = startEntityId;
  let tick = startTick;

  const allocateEntityId = (): EntityId => {
    const entityId = nextEntityId as EntityId;
    nextEntityId += 1;
    return entityId;
  };

  const insert = (actor: ActorState): void => {
    ordered.push(cloneActor(actor));
    const inserted = ordered[ordered.length - 1];
    if (inserted !== undefined) {
      byEntityId.set(actor.entityId, inserted);
    }
  };

  const world: MutableWorld = {
    get tick() {
      return tick;
    },
    set tick(value: TickIndex) {
      tick = value;
    },
    get nextEntityId() {
      return nextEntityId;
    },
    actor: (entityId) => byEntityId.get(entityId),
    actors: () => ordered,
    allocateEntityId,
    insert,
    remove(entityId) {
      const index = ordered.findIndex((actor) => actor.entityId === entityId);
      if (index < 0) {
        return false;
      }
      ordered.splice(index, 1);
      byEntityId.delete(entityId);
      return true;
    },
    update(actor) {
      const index = ordered.findIndex(
        (candidate) => candidate.entityId === actor.entityId,
      );
      if (index < 0) {
        return;
      }
      const stored = cloneActor(actor);
      ordered[index] = stored;
      byEntityId.set(actor.entityId, stored);
    },
    state() {
      return {
        tick,
        actors: ordered.map(cloneActor),
        nextEntityId,
      };
    },
  };

  return world;
}

export function createWorld(scenario: KernelScenario): MutableWorld {
  const world = createEmptyWorld(1, 0 as TickIndex);

  for (const initial of scenario.initialActors) {
    world.insert({
      entityId: world.allocateEntityId(),
      blueprintId: initial.blueprintId,
      position: initial.position,
      facing: initial.facing,
      readyAtTick: 0,
      transitionGuard: null,
    });
  }

  return world;
}

export function restoreWorld(
  actors: readonly ActorState[],
  nextEntityId: number,
  tick: TickIndex,
): MutableWorld {
  if (!Number.isSafeInteger(nextEntityId) || nextEntityId <= 0) {
    throw new RangeError('nextEntityId must be a positive safe integer');
  }

  const world = createEmptyWorld(nextEntityId, tick);
  for (const actor of [...actors].sort(
    (left, right) => left.entityId - right.entityId,
  )) {
    if (actor.entityId >= nextEntityId) {
      throw new RangeError(
        `nextEntityId must exceed restored entityId ${actor.entityId}`,
      );
    }
    world.insert(actor);
  }
  return world;
}
