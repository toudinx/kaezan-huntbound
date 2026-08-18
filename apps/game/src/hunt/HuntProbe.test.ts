import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  Direction,
  EntityId,
  GridPosition,
  SimulationEvent,
  SimulationEventPayload,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';

import {
  createHuntProbeRecorder,
  type HuntProbe,
  type HuntProbeState,
  installHuntProbe,
} from './HuntProbe';

type HuntboundHuntGlobal = typeof globalThis & {
  __huntboundHuntProbe?: HuntProbe;
};

const target = globalThis as HuntboundHuntGlobal;

function at(x: number, y: number, z: number): GridPosition {
  return { x, y, z };
}

function event(tick: number, payload: SimulationEventPayload): SimulationEvent {
  return {
    tick: tick as TickIndex,
    sequence: tick,
    payload,
  };
}

function moved(
  tick: number,
  entityId: number,
  from: GridPosition,
  to: GridPosition,
  facing: Direction = 's',
): SimulationEvent {
  return event(tick, {
    type: 'actor/moved',
    entityId: entityId as EntityId,
    from,
    to,
    facing,
  });
}

function emptyState(): HuntProbeState {
  return {
    tick: 0,
    floor: 8,
    player: null,
    actors: [],
    camera: {
      scrollX: 0,
      scrollY: 0,
      width: 0,
      height: 0,
      zoom: 1,
      visibleRows: 11,
    },
    drawn: {
      total: 0,
      layers: { ground: 0, objectsBelow: 0, actors: 0, objectsAbove: 0 },
      composedGroundCells: 0,
      unresolvedGroundCells: 0,
    },
  };
}

describe('createHuntProbeRecorder', () => {
  it('records an accepted step with its tick, entity and cells', () => {
    const recorder = createHuntProbeRecorder();

    recorder.record([moved(12, 1, at(24, 14, 8), at(24, 15, 8))]);

    expect(recorder.events()).toEqual([
      {
        tick: 12,
        type: 'actor/moved',
        entityId: 1,
        reason: null,
        from: at(24, 14, 8),
        to: at(24, 15, 8),
      },
    ]);
  });

  it('records a refused step with its reason and the attempted cell', () => {
    const recorder = createHuntProbeRecorder();

    recorder.record([
      event(9, {
        type: 'actor/move-blocked',
        entityId: 1 as EntityId,
        attempted: at(25, 14, 8),
        reason: 'terrain',
      }),
    ]);

    expect(recorder.events()).toEqual([
      {
        tick: 9,
        type: 'actor/move-blocked',
        entityId: 1,
        reason: 'terrain',
        from: null,
        to: at(25, 14, 8),
      },
    ]);
  });

  it('records a floor transition', () => {
    const recorder = createHuntProbeRecorder();

    recorder.record([
      event(26, {
        type: 'actor/transitioned',
        entityId: 1 as EntityId,
        from: at(23, 14, 8),
        to: at(23, 14, 9),
      }),
    ]);

    expect(recorder.events()).toEqual([
      {
        tick: 26,
        type: 'actor/transitioned',
        entityId: 1,
        reason: null,
        from: at(23, 14, 8),
        to: at(23, 14, 9),
      },
    ]);
  });

  it('ignores events that carry no actor placement', () => {
    const recorder = createHuntProbeRecorder();

    recorder.record([
      event(3, {
        type: 'actor/faced',
        entityId: 1 as EntityId,
        facing: 'n',
      }),
      event(3, {
        type: 'spawn/deferred',
        groupIndex: 0,
        slotIndex: 0,
        reason: 'no-free-cell',
      }),
      event(3, { type: 'spawn/capped', groupIndex: 7, slotIndex: 1 }),
    ]);

    expect(recorder.events()).toEqual([]);
  });

  it('keeps only the newest events once the limit is reached', () => {
    const recorder = createHuntProbeRecorder(2);

    recorder.record([
      moved(1, 1, at(0, 0, 8), at(1, 0, 8)),
      moved(2, 1, at(1, 0, 8), at(2, 0, 8)),
      moved(3, 1, at(2, 0, 8), at(3, 0, 8)),
    ]);

    expect(recorder.events().map((item) => item.tick)).toEqual([2, 3]);
  });

  it('empties on reset', () => {
    const recorder = createHuntProbeRecorder();

    recorder.record([moved(1, 1, at(0, 0, 8), at(1, 0, 8))]);
    recorder.reset();

    expect(recorder.events()).toEqual([]);
  });
});

describe('installHuntProbe', () => {
  afterEach(() => {
    delete target.__huntboundHuntProbe;
    vi.unstubAllEnvs();
  });

  it('does not install outside the test mode', () => {
    vi.stubEnv('MODE', 'personal');
    installHuntProbe({ huntProbeState: emptyState }, () => () => {});

    expect(target.__huntboundHuntProbe).toBeUndefined();

    vi.stubEnv('MODE', 'product');
    installHuntProbe({ huntProbeState: emptyState }, () => () => {});

    expect(target.__huntboundHuntProbe).toBeUndefined();
  });

  it('publishes the live scene state and the recorded events', () => {
    vi.stubEnv('MODE', 'test');
    let publish: ((events: readonly SimulationEvent[]) => void) | undefined;
    const state = emptyState();

    installHuntProbe({ huntProbeState: () => state }, (listener) => {
      publish = listener;
      return () => {
        publish = undefined;
      };
    });

    const probe = target.__huntboundHuntProbe;

    expect(probe).toBeDefined();
    expect(probe?.state()).toEqual(state);

    publish?.([moved(4, 1, at(24, 14, 8), at(24, 15, 8))]);

    expect(probe?.events().map((item) => item.tick)).toEqual([4]);
  });

  it('publishes accepted input commands and clears them with reset', () => {
    vi.stubEnv('MODE', 'test');
    let commands = [
      { tick: 12, sequence: 4, entityId: 1, direction: 'e' as const },
    ];
    const source = {
      huntProbeState: emptyState,
      huntProbeCommands: () => commands,
      resetHuntProbe: () => {
        commands = [];
      },
    };

    installHuntProbe(source, () => () => {});

    const probe = target.__huntboundHuntProbe;
    expect(probe?.commands?.()).toEqual([
      { tick: 12, sequence: 4, entityId: 1, direction: 'e' },
    ]);

    probe?.reset();
    expect(probe?.commands?.()).toEqual([]);
  });

  it('replaces the probe when a later scene installs its own', () => {
    vi.stubEnv('MODE', 'test');
    const first = emptyState();
    const second = { ...emptyState(), floor: 9 };

    installHuntProbe({ huntProbeState: () => first }, () => () => {});
    installHuntProbe({ huntProbeState: () => second }, () => () => {});

    expect(target.__huntboundHuntProbe?.state().floor).toBe(9);
  });

  it('stops recording once disposed', () => {
    vi.stubEnv('MODE', 'test');
    let publish: ((events: readonly SimulationEvent[]) => void) | undefined;
    const dispose = installHuntProbe(
      { huntProbeState: emptyState },
      (listener) => {
        publish = listener;
        return () => {
          publish = undefined;
        };
      },
    );

    dispose();
    publish?.([moved(4, 1, at(24, 14, 8), at(24, 15, 8))]);

    expect(target.__huntboundHuntProbe).toBeUndefined();
  });

  it('exposes unresolved combat asset keys from the live scene', () => {
    vi.stubEnv('MODE', 'test');
    const keys = Object.freeze([
      'effect:tibia:draw-blood',
      'item:tibia:dead-rotworm',
    ]);

    installHuntProbe(
      {
        huntProbeState: emptyState,
        huntProbeUnresolvedCombatAssetKeys: () => keys,
      },
      () => () => {},
    );

    expect(target.__huntboundHuntProbe?.unresolvedCombatAssetKeys?.()).toEqual(
      keys,
    );
  });
});
