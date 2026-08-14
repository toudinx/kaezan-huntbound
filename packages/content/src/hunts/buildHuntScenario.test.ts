import {
  createSeed,
  HUNT_SCHEMA_VERSION,
  type HuntDefinition,
  SIMULATION_SCHEMA_VERSION,
  type SimulationValidationResult,
  validateKernelScenario,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { buildHuntScenario } from './buildHuntScenario.ts';
import { loadHuntDefinition } from './loadHuntDefinition.ts';

function syntheticHunt(): HuntDefinition {
  return {
    schemaVersion: HUNT_SCHEMA_VERSION,
    huntId: 'hunt:tibia:synthetic-cave' as HuntDefinition['huntId'],
    huntRevision: 4,
    region: {
      schemaVersion: HUNT_SCHEMA_VERSION,
      regionId:
        'region:tibia:synthetic-cave' as HuntDefinition['region']['regionId'],
      regionRevision: 2,
      origin: { x: 1000, y: 2000 },
      width: 4,
      height: 4,
      palette: [100, 200],
      floors: [
        {
          z: 7,
          ground: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          objectsBelow: [],
          objectsAbove: [],
          collision: [1, 14],
        },
        {
          z: 8,
          ground: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          objectsBelow: [],
          objectsAbove: [],
          collision: [8],
        },
      ],
    },
    transitions: {
      entries: [
        {
          from: { x: 1, y: 1, z: 7 },
          to: { x: 1, y: 1, z: 8 },
        },
        {
          from: { x: 1, y: 1, z: 8 },
          to: { x: 1, y: 1, z: 7 },
        },
      ],
      dropped: 0,
    },
    spawns: {
      groups: [
        {
          center: { x: 2, y: 2, z: 8 },
          radius: 2,
          slots: [
            {
              creatureKey: 'creature:tibia:rotworm',
              blueprintId: 'rotworm',
              offsetX: -1,
              offsetY: 0,
              offsetZ: 0,
              respawnTicks: 1800,
            },
            {
              creatureKey: 'creature:tibia:rotworm',
              blueprintId: 'rotworm',
              offsetX: 0,
              offsetY: 1,
              offsetZ: 0,
              respawnTicks: 2000,
            },
          ],
        },
      ],
      maxLiveActors: 64,
    },
    blueprints: [
      { blueprintId: 'player', stepCooldownTicks: 2, behavior: 'inert' },
      { blueprintId: 'rotworm', stepCooldownTicks: 3, behavior: 'wander' },
    ],
    playerStart: { x: 0, y: 0, z: 7 },
    playerBlueprintId: 'player',
  };
}

function unwrapSuccess<T>(result: SimulationValidationResult<T>): T {
  if (!result.ok) {
    throw new Error(`Expected a successful result: ${JSON.stringify(result)}`);
  }
  return result.value;
}

describe('buildHuntScenario', () => {
  it('projects floors, transitions, spawn slots and the player into KernelScenario v3', () => {
    const result = buildHuntScenario(
      syntheticHunt(),
      createSeed('1a2b3c4d5e6f7a8b'),
    );

    expect(result).toEqual({
      ok: true,
      value: {
        schemaVersion: SIMULATION_SCHEMA_VERSION,
        scenarioId: 'scenario:hunt:tibia:synthetic-cave',
        scenarioRevision: 4,
        width: 4,
        height: 4,
        floors: [
          {
            z: 7,
            blockedTiles: [
              [1, 0],
              [2, 3],
            ],
          },
          { z: 8, blockedTiles: [[0, 2]] },
        ],
        transitions: [
          {
            from: { x: 1, y: 1, z: 7 },
            to: { x: 1, y: 1, z: 8 },
          },
          {
            from: { x: 1, y: 1, z: 8 },
            to: { x: 1, y: 1, z: 7 },
          },
        ],
        spawnGroups: [
          {
            center: { x: 2, y: 2, z: 8 },
            radius: 2,
            slots: [
              {
                blueprintId: 'rotworm',
                position: { x: 1, y: 2, z: 8 },
                respawnTicks: 1800,
              },
              {
                blueprintId: 'rotworm',
                position: { x: 2, y: 3, z: 8 },
                respawnTicks: 2000,
              },
            ],
          },
        ],
        maxLiveActors: 64,
        blueprints: [
          { blueprintId: 'player', stepCooldownTicks: 2, behavior: 'inert' },
          { blueprintId: 'rotworm', stepCooldownTicks: 3, behavior: 'wander' },
        ],
        initialActors: [
          {
            blueprintId: 'player',
            position: { x: 0, y: 0, z: 7 },
            facing: 's',
          },
        ],
      },
    });
  });

  it('returns a scenario accepted by the kernel validator', () => {
    const result = unwrapSuccess(
      buildHuntScenario(syntheticHunt(), createSeed('1a2b3c4d5e6f7a8b')),
    );

    expect(validateKernelScenario(result)).toEqual({ ok: true, value: result });
  });

  it('does not copy Tibia identities into the serialized scenario', () => {
    const result = unwrapSuccess(
      buildHuntScenario(syntheticHunt(), createSeed('1a2b3c4d5e6f7a8b')),
    );
    const serialized = JSON.stringify(result);

    for (const forbidden of [
      'palette',
      'serverId',
      'clientId',
      'creatureKey',
      'regionId',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('derives the same scenario id for repeated builds of the same hunt', () => {
    const first = unwrapSuccess(
      buildHuntScenario(syntheticHunt(), createSeed('1a2b3c4d5e6f7a8b')),
    );
    const second = unwrapSuccess(
      buildHuntScenario(syntheticHunt(), createSeed('deadbeefcafebabe')),
    );

    expect(second.scenarioId).toBe(first.scenarioId);
    expect(second).toEqual(first);
  });

  it('returns the hunt diagnostic when a slot references a missing blueprint', () => {
    const source = syntheticHunt();
    const hunt: HuntDefinition = {
      ...source,
      spawns: {
        ...source.spawns,
        groups: source.spawns.groups.map((group, groupIndex) =>
          groupIndex === 0
            ? {
                ...group,
                slots: group.slots.map((slot, slotIndex) =>
                  slotIndex === 0 ? { ...slot, blueprintId: 'missing' } : slot,
                ),
              }
            : group,
        ),
      },
    };

    const result = buildHuntScenario(hunt, createSeed('1a2b3c4d5e6f7a8b'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'HUNT_UNKNOWN_BLUEPRINT',
            path: ['spawns', 'groups', 0, 'slots', 0, 'blueprintId'],
          }),
        ]),
      );
    }
  });
});

describe('loadHuntDefinition', () => {
  it('validates and returns an unknown JSON object as a HuntDefinition', () => {
    const result = loadHuntDefinition(
      JSON.parse(JSON.stringify(syntheticHunt())),
    );

    expect(result).toEqual({ ok: true, value: syntheticHunt() });
  });

  it('returns schema diagnostics instead of throwing for malformed input', () => {
    const result = loadHuntDefinition({ schemaVersion: HUNT_SCHEMA_VERSION });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0]?.code).toBe('SIM_SCHEMA_INVALID');
    }
  });
});
