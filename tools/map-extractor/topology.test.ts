import { describe, expect, it } from 'vitest';

import type {
  HuntDefinition,
  MapRegion,
} from '../../packages/contracts/src/hunt/types.ts';
import { HUNT_SCHEMA_VERSION } from '../../packages/contracts/src/hunt/types.ts';
import { analyzeHuntTopology } from './topology.ts';

const WIDTH = 7;
const HEIGHT = 5;

function cell(x: number, y: number): number {
  return y * WIDTH + x;
}

function disconnectedHunt(): HuntDefinition {
  const walkable = new Set([
    cell(0, 0),
    cell(1, 0),
    cell(2, 0),
    cell(5, 2),
    cell(6, 2),
    cell(5, 3),
  ]);
  const region: MapRegion = {
    schemaVersion: HUNT_SCHEMA_VERSION,
    regionId: 'region:test' as MapRegion['regionId'],
    regionRevision: 1,
    origin: { x: 0, y: 0 },
    width: WIDTH,
    height: HEIGHT,
    palette: [1],
    floors: [
      {
        z: 8,
        ground: Array.from({ length: WIDTH * HEIGHT }, () => 0),
        objectsBelow: [],
        objectsAbove: [],
        collision: Array.from(
          { length: WIDTH * HEIGHT },
          (_value, index) => index,
        ).filter((index) => !walkable.has(index)),
      },
    ],
  };

  return {
    schemaVersion: HUNT_SCHEMA_VERSION,
    huntId: 'hunt:test' as HuntDefinition['huntId'],
    huntRevision: 1,
    region,
    transitions: {
      entries: [
        {
          from: { x: 1, y: 0, z: 8 },
          to: { x: 5, y: 2, z: 8 },
        },
      ],
      dropped: 0,
    },
    spawns: {
      groups: [
        {
          center: { x: 6, y: 2, z: 8 },
          radius: 1,
          slots: [
            {
              creatureKey: 'creature:test:rat',
              blueprintId: 'rat',
              offsetX: 0,
              offsetY: 0,
              offsetZ: 0,
              respawnTicks: 10,
              source: { x: 6, y: 2, z: 8 },
            },
          ],
          sourceCenter: { x: 6, y: 2, z: 8 },
        },
      ],
      maxLiveActors: 1,
    },
    blueprints: [
      {
        blueprintId: 'player',
        behavior: 'inert',
        stepCooldownTicks: 2,
        factionId: 0,
        maxHealth: 1,
        maxResource: 0,
        healthRegenTicks: 0,
        healthRegenAmount: 0,
        resourceRegenTicks: 0,
        resourceRegenAmount: 0,
        attackCooldownTicks: 0,
        attackMinDamage: 0,
        attackMaxDamage: 0,
        attackRangeTiles: 1,
        aggroRadius: 0,
        lootTableIndex: null,
        abilityIndices: [],
      },
      {
        blueprintId: 'rat',
        behavior: 'wander',
        stepCooldownTicks: 3,
        factionId: 0,
        maxHealth: 1,
        maxResource: 0,
        healthRegenTicks: 0,
        healthRegenAmount: 0,
        resourceRegenTicks: 0,
        resourceRegenAmount: 0,
        attackCooldownTicks: 0,
        attackMinDamage: 0,
        attackMaxDamage: 0,
        attackRangeTiles: 1,
        aggroRadius: 0,
        lootTableIndex: null,
        abilityIndices: [],
      },
    ],
    playerStart: { x: 0, y: 0, z: 8 },
    playerBlueprintId: 'player',
  };
}

describe('analyzeHuntTopology', () => {
  it('reports disconnected walkable cells and unreachable functional points', () => {
    const report = analyzeHuntTopology(disconnectedHunt());

    expect(report.floors).toEqual([
      { z: 8, walkableTiles: 6, componentCount: 2, unreachable: [19, 20, 26] },
    ]);
    expect(report.diagnostics.map(({ code }) => code)).toEqual([
      'HUNT_SPAWN_UNREACHABLE',
      'HUNT_TRANSITION_UNREACHABLE',
      'HUNT_WALKABLE_DISCONNECTED',
    ]);
  });

  it('does not pass through a blocked orthogonal neighbor for a diagonal step', () => {
    const hunt = disconnectedHunt();
    const floor = {
      z: 8,
      ground: Array.from({ length: 9 }, () => 0),
      objectsBelow: [],
      objectsAbove: [],
      collision: [1, 2, 3, 5, 6, 7, 8],
    };
    const diagonalOnly: HuntDefinition = {
      ...hunt,
      playerStart: { x: 0, y: 0, z: 8 },
      region: {
        ...hunt.region,
        width: 3,
        height: 3,
        floors: [floor],
      },
      transitions: { entries: [], dropped: 0 },
      spawns: { groups: [], maxLiveActors: 1 },
    };

    const report = analyzeHuntTopology(diagonalOnly);

    expect(report.floors[0]?.walkableTiles).toBe(2);
    expect(report.floors[0]?.componentCount).toBe(2);
  });
});
