import type {
  Direction,
  GridPosition,
  MoveBlockedReason,
  SimulationEvent,
} from '../../../../packages/contracts/src/index.ts';
import type { TargetRingState } from './TargetRing';

/**
 * Test-only observation of the hunt as it is actually presented.
 *
 * PB-04-09 has to prove the chain input -> command -> event -> pixel without
 * calling the kernel, so everything here is read back from the live scene and
 * from the events the scene itself consumes. Nothing in this module can enqueue
 * a command or advance a tick.
 */

export const HUNT_PROBE_EVENT_LIMIT = 4_096;

export type HuntProbeEventType =
  | 'actor/spawned'
  | 'actor/moved'
  | 'actor/move-blocked'
  | 'actor/transitioned'
  | 'actor/despawned';

export interface HuntProbeEvent {
  readonly tick: number;
  readonly type: HuntProbeEventType;
  readonly entityId: number;
  readonly reason: MoveBlockedReason | null;
  readonly from: GridPosition | null;
  readonly to: GridPosition | null;
}

export interface HuntProbeActor {
  readonly entityId: number;
  readonly blueprintId: string;
  readonly key: string;
  readonly position: GridPosition;
  readonly facing: Direction;
  /** Where the sprite sits in world pixels, or `null` when nothing is drawn. */
  readonly sprite: { readonly x: number; readonly y: number } | null;
  /** The atlas frame on screen, so facing and animation are observable. */
  readonly frame: number | string | null;
  /** Whether the sprite is mirrored. Tibia sheets carry every facing, so a
   * mirrored actor is a presentation bug, not a facing. */
  readonly flipX: boolean;
  readonly visible: boolean;
}

export interface HuntProbeLayerCounts {
  readonly ground: number;
  readonly objectsBelow: number;
  readonly actors: number;
  readonly objectsAbove: number;
}

export interface HuntProbeState {
  readonly tick: number;
  readonly floor: number;
  readonly floorRebuilds: number;
  readonly decorationTextWrites: number;
  readonly player: HuntProbeActor | null;
  readonly actors: readonly HuntProbeActor[];
  readonly targetRing: TargetRingState;
  readonly camera: {
    readonly scrollX: number;
    readonly scrollY: number;
    readonly width: number;
    readonly height: number;
    readonly zoom: number;
    readonly visibleRows: number;
    readonly roundPixels: boolean;
    /** The world box the camera is held inside, or `null` when unbounded. */
    readonly bounds: {
      readonly minX: number;
      readonly minY: number;
      readonly maxX: number;
      readonly maxY: number;
    } | null;
  };
  readonly drawn: {
    readonly total: number;
    readonly layers: HuntProbeLayerCounts;
    readonly composedGroundCells: number;
    readonly unresolvedGroundCells: number;
  };
  /** How the scene is covering the cells that have no ground under them. */
  readonly worldEdge: {
    /** Cells the treatment painted over on the floor being presented. */
    readonly treatedCells: number;
    /** Depth of the treatment. Must sit under every drawn tile. */
    readonly depth: number;
    readonly visible: boolean;
    /** Times the treatment object was constructed. Must not grow per frame. */
    readonly objectCreations: number;
    /** Visible cells with neither ground nor treatment. Must always be 0. */
    readonly untreatedVisibleCells: number;
  };
}

export interface HuntProbeCommand {
  readonly tick: number;
  readonly sequence: number;
  readonly entityId: number;
  readonly direction?: Direction;
  readonly type?: 'actor/attack' | 'actor/cast-ability';
  readonly targetEntityId?: number | null;
  readonly abilityIndex?: number;
}

export interface HuntProbeRecorder {
  record(events: readonly SimulationEvent[]): void;
  events(): readonly HuntProbeEvent[];
  reset(): void;
}

export interface HuntProbeDecoration {
  readonly id: number;
  readonly kind: string;
  readonly frame: number | string | null;
  readonly visible: boolean;
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
}

export interface HuntProbeImpulse {
  readonly id: number;
  readonly type: string;
  readonly entityId: number;
  readonly remainingMs: number;
}

export interface HuntProbe {
  state(): HuntProbeState;
  events(): readonly HuntProbeEvent[];
  commands?(): readonly HuntProbeCommand[];
  unresolvedCombatAssetKeys?(): readonly string[];
  visibleDecorations?(): readonly HuntProbeDecoration[];
  activeImpulses?(): readonly HuntProbeImpulse[];
  reset(): void;
  releaseHeld?(): void;
}

/** Implemented by the scene under observation. */
export interface HuntProbeSource {
  huntProbeState(): HuntProbeState;
  huntProbeCommands?(): readonly HuntProbeCommand[];
  huntProbeUnresolvedCombatAssetKeys?(): readonly string[];
  huntProbeVisibleDecorations?(): readonly HuntProbeDecoration[];
  huntProbeActiveImpulses?(): readonly HuntProbeImpulse[];
  resetHuntProbe?(): void;
  releaseHeldInput?(): void;
}

export type HuntProbeEventFeed = (
  listener: (events: readonly SimulationEvent[]) => void,
) => () => void;

declare global {
  interface Window {
    __huntboundHuntProbe?: HuntProbe;
  }
}

/**
 * How the page's global object looks once the probe is installed. Exported so
 * the browser QA suite can read it back without redeclaring the shape.
 */
export type HuntboundHuntGlobal = typeof globalThis & {
  __huntboundHuntProbe?: HuntProbe;
};

function copyPosition(position: GridPosition): GridPosition {
  return { x: position.x, y: position.y, z: position.z };
}

function probeEvent(event: SimulationEvent): HuntProbeEvent | undefined {
  const payload = event.payload;

  switch (payload.type) {
    case 'actor/spawned':
      return {
        tick: event.tick,
        type: payload.type,
        entityId: payload.entityId,
        reason: null,
        from: null,
        to: copyPosition(payload.position),
      };
    case 'actor/moved':
      return {
        tick: event.tick,
        type: payload.type,
        entityId: payload.entityId,
        reason: null,
        from: copyPosition(payload.from),
        to: copyPosition(payload.to),
      };
    case 'actor/move-blocked':
      return {
        tick: event.tick,
        type: payload.type,
        entityId: payload.entityId,
        reason: payload.reason,
        from: null,
        to: copyPosition(payload.attempted),
      };
    case 'actor/transitioned':
      return {
        tick: event.tick,
        type: payload.type,
        entityId: payload.entityId,
        reason: null,
        from: copyPosition(payload.from),
        to: copyPosition(payload.to),
      };
    case 'actor/despawned':
      return {
        tick: event.tick,
        type: payload.type,
        entityId: payload.entityId,
        reason: null,
        from: null,
        to: null,
      };
    case 'actor/faced':
    case 'spawn/deferred':
    case 'spawn/capped':
    case 'command/rejected':
    case 'combat/attacked':
    case 'combat/damaged':
    case 'combat/healed':
    case 'ability/cast':
    case 'combat/target-changed':
    case 'loot/granted':
    case 'actor/died':
      return undefined;
  }
}

export function createHuntProbeRecorder(
  limit = HUNT_PROBE_EVENT_LIMIT,
): HuntProbeRecorder {
  let recorded: HuntProbeEvent[] = [];

  return {
    record: (events) => {
      for (const event of events) {
        const mapped = probeEvent(event);
        if (mapped !== undefined) recorded.push(mapped);
      }
      if (recorded.length > limit) {
        recorded = recorded.slice(recorded.length - limit);
      }
    },
    events: () => Object.freeze([...recorded]),
    reset: () => {
      recorded = [];
    },
  };
}

/**
 * Publishes the probe on the global object in the `test` build only, mirroring
 * `installKernelProbe`. Returns a disposer so a scene shutdown takes its probe
 * with it instead of leaving a stale reader behind.
 */
export function installHuntProbe(
  source: HuntProbeSource,
  subscribeEvents: HuntProbeEventFeed,
): () => void {
  if (import.meta.env.MODE !== 'test') {
    return () => {};
  }

  const target = globalThis as HuntboundHuntGlobal;
  const recorder = createHuntProbeRecorder();
  const unsubscribe = subscribeEvents((events) => recorder.record(events));
  const probe: HuntProbe = Object.freeze({
    state: () => source.huntProbeState(),
    events: () => recorder.events(),
    commands: () => source.huntProbeCommands?.() ?? [],
    unresolvedCombatAssetKeys: () =>
      source.huntProbeUnresolvedCombatAssetKeys?.() ?? [],
    visibleDecorations: () => source.huntProbeVisibleDecorations?.() ?? [],
    activeImpulses: () => source.huntProbeActiveImpulses?.() ?? [],
    reset: () => {
      recorder.reset();
      source.resetHuntProbe?.();
    },
    releaseHeld: () => {
      source.releaseHeldInput?.();
    },
  });

  target.__huntboundHuntProbe = probe;

  return () => {
    unsubscribe();
    if (target.__huntboundHuntProbe === probe) {
      delete target.__huntboundHuntProbe;
    }
  };
}
