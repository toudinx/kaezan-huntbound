import type { EntityId, Seed, StreamLabel, TickIndex } from './identity.ts';

export type Direction = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export type ActorBehavior = 'inert' | 'wander';

export interface GridPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ActorBlueprint {
  readonly blueprintId: string;
  readonly stepCooldownTicks: number;
  readonly behavior: ActorBehavior;
}

export interface InitialActor {
  readonly blueprintId: string;
  readonly position: GridPosition;
  readonly facing: Direction;
}

export interface KernelScenario {
  readonly schemaVersion: number;
  readonly scenarioId: string;
  readonly scenarioRevision: number;
  readonly width: number;
  readonly height: number;
  readonly z: number;
  readonly blockedTiles: readonly (readonly [number, number])[];
  readonly blueprints: readonly ActorBlueprint[];
  readonly initialActors: readonly InitialActor[];
}

export type CommandIssuer = 'player' | 'ai' | 'scenario';

export type SimulationCommand =
  | {
      readonly type: 'actor/move-step';
      readonly entityId: EntityId;
      readonly direction: Direction;
    }
  | {
      readonly type: 'actor/face';
      readonly entityId: EntityId;
      readonly direction: Direction;
    }
  | { readonly type: 'actor/wait'; readonly entityId: EntityId }
  | {
      readonly type: 'scenario/spawn-actor';
      readonly blueprintId: string;
      readonly position: GridPosition;
      readonly facing: Direction;
    }
  | { readonly type: 'scenario/despawn-actor'; readonly entityId: EntityId };

export type SimulationCommandType = SimulationCommand['type'];

export interface SimulationCommandInput {
  readonly tick: TickIndex;
  readonly issuer: CommandIssuer;
  readonly command: SimulationCommand;
}

export interface SimulationCommandRecord extends SimulationCommandInput {
  readonly sequence: number;
}

export type MoveBlockedReason =
  | 'bounds'
  | 'terrain'
  | 'occupied'
  | 'diagonal-corner'
  | 'cooldown';

export type SimulationEventPayload =
  | {
      readonly type: 'actor/spawned';
      readonly entityId: EntityId;
      readonly blueprintId: string;
      readonly position: GridPosition;
      readonly facing: Direction;
    }
  | {
      readonly type: 'actor/moved';
      readonly entityId: EntityId;
      readonly from: GridPosition;
      readonly to: GridPosition;
      readonly facing: Direction;
    }
  | {
      readonly type: 'actor/move-blocked';
      readonly entityId: EntityId;
      readonly attempted: GridPosition;
      readonly reason: MoveBlockedReason;
    }
  | {
      readonly type: 'actor/faced';
      readonly entityId: EntityId;
      readonly facing: Direction;
    }
  | { readonly type: 'actor/despawned'; readonly entityId: EntityId }
  | {
      readonly type: 'command/rejected';
      readonly commandType: SimulationCommandType;
      readonly commandSequence: number;
      readonly code: SimulationDiagnosticCode;
    };

export interface SimulationEvent {
  readonly tick: TickIndex;
  readonly sequence: number;
  readonly payload: SimulationEventPayload;
}

export interface RandomStreamState {
  readonly label: StreamLabel;
  readonly s0: number;
  readonly s1: number;
  readonly s2: number;
  readonly s3: number;
  readonly drawCount: number;
}

export interface ActorState {
  readonly entityId: EntityId;
  readonly blueprintId: string;
  readonly position: GridPosition;
  readonly facing: Direction;
  readonly readyAtTick: number;
}

export interface SimulationSnapshot {
  readonly schemaVersion: number;
  readonly rulesVersion: number;
  readonly scenarioId: string;
  readonly scenarioRevision: number;
  readonly seed: Seed;
  readonly tick: TickIndex;
  readonly nextEntityId: number;
  readonly nextEventSequence: number;
  readonly nextCommandSequence: number;
  readonly randomStreams: readonly RandomStreamState[];
  readonly actors: readonly ActorState[];
  readonly pendingCommands: readonly SimulationCommandRecord[];
}

export interface SimulationCommandLogHeader {
  readonly kind: 'header';
  readonly schemaVersion: number;
  readonly rulesVersion: number;
  readonly scenarioId: string;
  readonly scenarioRevision: number;
  readonly seed: Seed;
  readonly tickCount: number;
}

export interface SimulationCommandLog {
  readonly header: SimulationCommandLogHeader;
  readonly commands: readonly SimulationCommandRecord[];
}

export type SimulationDiagnosticCode =
  | 'SIM_SCHEMA_INVALID'
  | 'SIM_VERSION_MISMATCH'
  | 'SIM_SCENARIO_MISMATCH'
  | 'SIM_SEED_INVALID'
  | 'SIM_TICK_IN_PAST'
  | 'SIM_COMMAND_UNKNOWN_ENTITY'
  | 'SIM_COMMAND_FORBIDDEN'
  | 'SIM_COMMAND_DUPLICATE'
  | 'SIM_MOVE_OUT_OF_BOUNDS'
  | 'SIM_MOVE_BLOCKED_TERRAIN'
  | 'SIM_MOVE_BLOCKED_OCCUPIED'
  | 'SIM_MOVE_DIAGONAL_CORNER'
  | 'SIM_MOVE_ON_COOLDOWN'
  | 'SIM_SPAWN_TILE_UNAVAILABLE'
  | 'SIM_STATE_NOT_INTEGER'
  | 'SIM_STATE_NOT_SERIALIZABLE'
  | 'SIM_REPLAY_DIVERGED';

export interface SimulationDiagnostic {
  readonly code: SimulationDiagnosticCode;
  readonly message: string;
  readonly path: readonly (string | number)[];
}

export type SimulationValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly diagnostics: readonly SimulationDiagnostic[];
    };
