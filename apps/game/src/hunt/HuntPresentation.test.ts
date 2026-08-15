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
  type PresentationActor,
} from './HuntPresentation';

function syntheticRegion(): MapRegion {
  return {
    schemaVersion: 1,
    regionId: 'region:test:synthetic' as MapRegion['regionId'],
    regionRevision: 1,
    origin: { x: 0, y: 0 },
    width: 2,
    height: 2,
    palette: [0, 101, 102, 103, 104],
    floors: [
      {
        z: 7,
        ground: [1, 2, 1, 0],
        objectsBelow: [{ i: 0, stack: [2] }],
        objectsAbove: [{ i: 2, stack: [4] }],
        collision: [],
      },
      {
        z: 8,
        ground: [1, 1, 1, 1],
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
      actor(1, 'player', { x: 1, y: 0, z: 7 }),
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
      commands.find((command) => command.x === 1 && command.y === 1),
    ).toMatchObject({ layer: 'ground', sourceZ: 8 });
  });

  it('replaces the active floor and handles actor lifecycle events', () => {
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
        position: { x: 1, y: 0, z: 7 },
        facing: 's',
      }),
      event(2, {
        type: 'actor/spawned',
        entityId: 2 as EntityId,
        blueprintId: 'rotworm',
        position: { x: 0, y: 0, z: 7 },
        facing: 's',
      }),
      event(3, {
        type: 'actor/transitioned',
        entityId: 1 as EntityId,
        from: { x: 1, y: 0, z: 7 },
        to: { x: 1, y: 0, z: 8 },
      }),
      event(4, {
        type: 'actor/transitioned',
        entityId: 2 as EntityId,
        from: { x: 0, y: 0, z: 7 },
        to: { x: 0, y: 0, z: 8 },
      }),
    ]);

    expect(presentation.floor()).toBe(8);
    expect(presentation.actors()).toHaveLength(1);
    expect(presentation.actors()[0]?.target).toEqual({
      x: 1,
      y: 0,
      z: 8,
    });
    expect(
      presentation.drawCommands().every((command) => command.z === 8),
    ).toBe(true);
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
        position: { x: 0, y: 0, z: 7 },
        facing: 's',
      }),
      event(2, {
        type: 'actor/moved',
        entityId: 1 as EntityId,
        from: { x: 0, y: 0, z: 7 },
        to: { x: 1, y: 0, z: 7 },
        facing: 'e',
      }),
    ]);

    const moved = presentation.actors()[0];
    expect(moved?.previous).toEqual({ x: 0, y: 0, z: 7 });
    expect(moved?.target).toEqual({ x: 1, y: 0, z: 7 });
    expect(moved?.facing).toBe('e' satisfies Direction);

    presentation.handle([
      event(3, {
        type: 'actor/move-blocked',
        entityId: 1 as EntityId,
        attempted: { x: 1, y: 1, z: 7 },
        reason: 'terrain',
      }),
    ]);

    expect(presentation.actors()[0]?.target).toEqual({
      x: 1,
      y: 0,
      z: 7,
    });
    expect(presentation.actors()[0]?.previous).toEqual({
      x: 0,
      y: 0,
      z: 7,
    });
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
