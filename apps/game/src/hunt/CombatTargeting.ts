import type {
  EntityId,
  GridPosition,
  SimulationCommandType,
  SimulationDiagnosticCode,
  SimulationEvent,
} from '../../../../packages/contracts/src/index.ts';

export interface CombatTargetActor {
  readonly entityId: EntityId;
  readonly blueprintId: string;
  readonly position: GridPosition;
}

export interface CombatCommandRejection {
  readonly commandType: SimulationCommandType;
  readonly code: SimulationDiagnosticCode;
  readonly tick: number;
}

export interface CombatTargetSelection {
  targetId(): EntityId | null;
  rejection(): CombatCommandRejection | null;
  select(entityId: EntityId, actors: readonly CombatTargetActor[]): boolean;
  setTarget(entityId: EntityId | null): void;
  cycle(actors: readonly CombatTargetActor[]): void;
  handle(events: readonly SimulationEvent[]): void;
  reset(): void;
}

export interface CombatTargetSelectionOptions {
  readonly playerEntityId: EntityId;
}

function copyRejection(
  rejection: CombatCommandRejection | null,
): CombatCommandRejection | null {
  return rejection === null ? null : { ...rejection };
}

export function createCombatTargetSelection(
  options: CombatTargetSelectionOptions,
): CombatTargetSelection {
  let selectedTargetId: EntityId | null = null;
  let lastRejection: CombatCommandRejection | null = null;

  const candidates = (
    actors: readonly CombatTargetActor[],
  ): readonly CombatTargetActor[] =>
    [...actors]
      .filter((actor) => actor.entityId !== options.playerEntityId)
      .sort((left, right) => left.entityId - right.entityId);

  return {
    targetId: () => selectedTargetId,
    rejection: () => copyRejection(lastRejection),
    select: (entityId, actors) => {
      const candidate = candidates(actors).find(
        (actor) => actor.entityId === entityId,
      );
      if (candidate === undefined) return false;
      selectedTargetId = candidate.entityId;
      lastRejection = null;
      return true;
    },
    setTarget: (entityId) => {
      selectedTargetId = entityId;
      lastRejection = null;
    },
    cycle: (actors) => {
      const available = candidates(actors);
      if (available.length === 0) {
        selectedTargetId = null;
        return;
      }

      const currentIndex = available.findIndex(
        (actor) => actor.entityId === selectedTargetId,
      );
      const nextIndex =
        currentIndex < 0 ? 0 : (currentIndex + 1) % available.length;
      selectedTargetId = available[nextIndex]?.entityId ?? null;
      lastRejection = null;
    },
    handle: (events) => {
      for (const event of events) {
        switch (event.payload.type) {
          case 'actor/died':
            if (event.payload.entityId === selectedTargetId) {
              selectedTargetId = null;
            }
            break;
          case 'combat/target-changed':
            if (event.payload.entityId === options.playerEntityId) {
              selectedTargetId = event.payload.targetEntityId;
            }
            break;
          case 'command/rejected':
            lastRejection = {
              commandType: event.payload.commandType,
              code: event.payload.code,
              tick: event.tick,
            };
            break;
          default:
            break;
        }
      }
    },
    reset: () => {
      selectedTargetId = null;
      lastRejection = null;
    },
  };
}
