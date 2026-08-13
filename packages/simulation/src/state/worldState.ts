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
  };
}

export function createWorld(scenario: KernelScenario): MutableWorld {
  const ordered: ActorState[] = [];
  const byEntityId = new Map<number, ActorState>();
  let nextEntityId = 1;
  let tick = 0 as TickIndex;

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

  for (const initial of scenario.initialActors) {
    insert({
      entityId: allocateEntityId(),
      blueprintId: initial.blueprintId,
      position: initial.position,
      facing: initial.facing,
      readyAtTick: 0,
    });
  }

  return {
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
}
