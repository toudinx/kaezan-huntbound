import { describe, expect, it } from 'vitest';

import { createAssetKey } from '../../../../packages/assets/src/index.ts';
import type {
  Direction,
  EntityId,
  GridPosition,
  MapRegion,
  SimulationEvent,
} from '../../../../packages/contracts/src/index.ts';

import {
  buildFloorDrawCommands,
  createHuntPresentation,
  type HuntDrawWindow,
  type PresentationActor,
} from './HuntPresentation';

function syntheticRegion(): MapRegion {
  return {
    schemaVersion: 1,
    regionId: 'region:test:synthetic' as MapRegion['regionId'],
    regionRevision: 1,
    origin: { x: 0, y: 0 },
    width: 4,
    height: 4,
    palette: [0, 101, 102, 103, 104],
    floors: [
      {
        z: 7,
        ground: [0, 0, 0, 0, 0, 1, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        objectsBelow: [{ i: 5, stack: [2] }],
        objectsAbove: [{ i: 9, stack: [4] }],
        collision: [],
      },
      {
        z: 8,
        ground: [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        objectsBelow: [],
        objectsAbove: [],
        collision: [],
      },
    ],
  };
}

function actor(
  entityId: number,
  blueprintId: string,
  position: GridPosition,
): PresentationActor {
  return {
    entityId: entityId as EntityId,
    blueprintId,
    key:
      blueprintId === 'player'
        ? createAssetKey('outfit:tibia:knight')
        : createAssetKey('creature:tibia:rotworm'),
    position,
    facing: 's',
  };
}

function event(
  sequence: number,
  payload: SimulationEvent['payload'],
): SimulationEvent {
  return {
    tick: 0 as SimulationEvent['tick'],
    sequence,
    payload,
  };
}

describe('HuntPresentation', () => {
  it('orders ground, objects below, actors, and objects above', () => {
    const commands = buildFloorDrawCommands(syntheticRegion(), 7, [
      actor(1, 'player', { x: 2, y: 1, z: 7 }),
    ]);

    expect(commands.map((command) => command.layer)).toEqual([
      'ground',
      'ground',
      'ground',
      'ground',
      'objectsBelow',
      'actors',
      'objectsAbove',
    ]);
    expect(
      commands
        .filter((command) => command.layer !== 'actors')
        .every((command) => command.key.startsWith('tile:tibia:')),
    ).toBe(true);
    expect(
      commands.find((command) => command.x === 2 && command.y === 2),
    ).toMatchObject({ layer: 'ground', sourceZ: 8 });
  });

  it('limits floor commands to the camera window', () => {
    const window: HuntDrawWindow = {
      minX: 2,
      minY: 1,
      maxX: 2,
      maxY: 1,
    };
    const commands = buildFloorDrawCommands(
      syntheticRegion(),
      7,
      [
        actor(1, 'player', { x: 2, y: 1, z: 7 }),
        actor(2, 'rotworm', { x: 1, y: 1, z: 7 }),
      ],
      window,
    );

    expect(
      commands.map(({ kind, layer, x, y }) => ({ kind, layer, x, y })),
    ).toEqual([
      { kind: 'tile', layer: 'ground', x: 2, y: 1 },
      { kind: 'actor', layer: 'actors', x: 2, y: 1 },
    ]);
  });

  it('replaces the active floor and handles actor lifecycle events', () => {
    const diagnostics: string[] = [];
    const presentation = createHuntPresentation({
      region: syntheticRegion(),
      playerBlueprintId: 'player',
      actorKeys: new Map([
        ['player', createAssetKey('outfit:tibia:knight')],
        ['rotworm', createAssetKey('creature:tibia:rotworm')],
      ]),
      onDiagnostic: (message) => diagnostics.push(message),
    });

    presentation.handle([
      event(1, {
        type: 'actor/spawned',
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: { x: 2, y: 1, z: 7 },
        facing: 's',
      }),
      event(2, {
        type: 'actor/spawned',
        entityId: 2 as EntityId,
        blueprintId: 'rotworm',
        position: { x: 1, y: 1, z: 7 },
        facing: 's',
      }),
      event(3, {
        type: 'actor/transitioned',
        entityId: 1 as EntityId,
        from: { x: 2, y: 1, z: 7 },
        to: { x: 2, y: 1, z: 8 },
      }),
      event(4, {
        type: 'actor/transitioned',
        entityId: 2 as EntityId,
        from: { x: 1, y: 1, z: 7 },
        to: { x: 1, y: 1, z: 8 },
      }),
    ]);

    expect(presentation.floor()).toBe(8);
    expect(presentation.actors()).toHaveLength(2);
    expect(presentation.actors()[0]?.target).toEqual({
      x: 2,
      y: 1,
      z: 8,
    });
    expect(presentation.actors()[1]).toMatchObject({
      entityId: 2,
      position: { x: 1, y: 1, z: 8 },
      previous: { x: 1, y: 1, z: 8 },
      target: { x: 1, y: 1, z: 8 },
    });
    expect(presentation.actors()[1]?.motion).toBeUndefined();
    expect(
      presentation
        .drawCommands()
        .filter((command) => command.kind === 'actor')
        .map((command) => command.entityId),
    ).toEqual([1, 2]);

    presentation.handle([
      event(5, {
        type: 'actor/moved',
        entityId: 2 as EntityId,
        from: { x: 1, y: 1, z: 8 },
        to: { x: 2, y: 1, z: 8 },
        facing: 'e',
      }),
    ]);

    expect(presentation.actors()[1]?.target).toEqual({
      x: 2,
      y: 1,
      z: 8,
    });
    expect(diagnostics).toEqual([]);
  });

  it('keeps a transitioned actor in the roster without drawing it off-floor', () => {
    const presentation = createHuntPresentation({
      region: syntheticRegion(),
      playerBlueprintId: 'player',
      actorKeys: new Map([
        ['player', createAssetKey('outfit:tibia:knight')],
        ['rotworm', createAssetKey('creature:tibia:rotworm')],
      ]),
    });

    presentation.handle([
      event(1, {
        type: 'actor/spawned',
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: { x: 2, y: 1, z: 7 },
        facing: 's',
      }),
      event(2, {
        type: 'actor/spawned',
        entityId: 2 as EntityId,
        blueprintId: 'rotworm',
        position: { x: 1, y: 1, z: 7 },
        facing: 's',
      }),
      event(3, {
        type: 'actor/transitioned',
        entityId: 2 as EntityId,
        from: { x: 1, y: 1, z: 7 },
        to: { x: 1, y: 1, z: 8 },
      }),
    ]);

    expect(presentation.floor()).toBe(7);
    expect(presentation.actors()).toHaveLength(2);
    expect(
      presentation
        .drawCommands()
        .filter((command) => command.kind === 'actor')
        .map((command) => command.entityId),
    ).toEqual([1]);
  });

  it('moves and faces an actor but leaves it fixed for a blocked step', () => {
    const presentation = createHuntPresentation({
      region: syntheticRegion(),
      playerBlueprintId: 'player',
      actorKeys: new Map([['player', createAssetKey('outfit:tibia:knight')]]),
    });
    presentation.handle([
      event(1, {
        type: 'actor/spawned',
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: { x: 1, y: 1, z: 7 },
        facing: 's',
      }),
      event(2, {
        type: 'actor/moved',
        entityId: 1 as EntityId,
        from: { x: 1, y: 1, z: 7 },
        to: { x: 2, y: 1, z: 7 },
        facing: 'e',
      }),
    ]);

    const moved = presentation.actors()[0];
    expect(moved?.previous).toEqual({ x: 1, y: 1, z: 7 });
    expect(moved?.target).toEqual({ x: 2, y: 1, z: 7 });
    expect(moved?.facing).toBe('e' satisfies Direction);

    presentation.handle([
      event(3, {
        type: 'actor/move-blocked',
        entityId: 1 as EntityId,
        attempted: { x: 2, y: 2, z: 7 },
        reason: 'terrain',
      }),
    ]);

    expect(presentation.actors()[0]?.target).toEqual({
      x: 2,
      y: 1,
      z: 7,
    });
    expect(presentation.actors()[0]?.previous).toEqual({
      x: 1,
      y: 1,
      z: 7,
    });
  });

  it('interpolates a move with the live step ticks, not the vocation base', () => {
    const presentation = createHuntPresentation({
      region: syntheticRegion(),
      playerBlueprintId: 'player',
      actorKeys: new Map([['player', createAssetKey('outfit:tibia:knight')]]),
      stepCooldownTicksByBlueprint: new Map([['player', 11]]),
      stepCooldownTicksFor: (actor) =>
        actor.blueprintId === 'player' ? 6 : 11,
    });
    presentation.handle([
      event(1, {
        type: 'actor/spawned',
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: { x: 1, y: 1, z: 7 },
        facing: 's',
      }),
      event(2, {
        type: 'actor/moved',
        entityId: 1 as EntityId,
        from: { x: 1, y: 1, z: 7 },
        to: { x: 2, y: 1, z: 7 },
        facing: 'e',
      }),
    ]);

    expect(presentation.actors()[0]?.motion?.durationTicks).toBe(6);
  });

  it('reports unknown actor events without throwing', () => {
    const diagnostics: string[] = [];
    const presentation = createHuntPresentation({
      region: syntheticRegion(),
      actorKeys: new Map(),
      onDiagnostic: (message) => diagnostics.push(message),
    });

    expect(() =>
      presentation.handle([
        event(1, {
          type: 'actor/faced',
          entityId: 99 as EntityId,
          facing: 'n',
        }),
      ]),
    ).not.toThrow();
    expect(diagnostics).toHaveLength(1);
  });
});
