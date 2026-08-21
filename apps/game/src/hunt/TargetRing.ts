import type {
  EntityId,
  GridPosition,
} from '../../../../packages/contracts/src/index.ts';

export interface TargetRingActor {
  readonly entityId: EntityId;
  readonly position: GridPosition;
  readonly visible: boolean;
}

export interface TargetRingState {
  readonly targetEntityId: EntityId | null;
  readonly position: GridPosition | null;
  readonly visible: boolean;
}

const HIDDEN_TARGET_RING: TargetRingState = Object.freeze({
  targetEntityId: null,
  position: null,
  visible: false,
});

function copyPosition(position: GridPosition): GridPosition {
  return { x: position.x, y: position.y, z: position.z };
}

export function resolveTargetRing(
  targetEntityId: EntityId | null,
  actors: readonly TargetRingActor[],
): TargetRingState {
  if (targetEntityId === null) return HIDDEN_TARGET_RING;

  const target = actors.find(
    (actor) => actor.entityId === targetEntityId && actor.visible,
  );
  if (target === undefined) return HIDDEN_TARGET_RING;

  return {
    targetEntityId,
    position: copyPosition(target.position),
    visible: true,
  };
}
