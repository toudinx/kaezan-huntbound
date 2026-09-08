import {
  createEmptyEquipment,
  createEmptyGameSave,
  type GameSave,
  parseGameSave,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { decodeSaveDocument, encodeSaveDocument } from '../index.ts';

function createSnapshot() {
  return {
    schemaVersion: 5,
    rulesVersion: 4,
    scenarioId: 'pb-06-save-export',
    scenarioRevision: 1,
    seed: '0f1e2d3c4b5a6978',
    tick: 1400,
    nextEntityId: 1,
    nextEventSequence: 1,
    nextCommandSequence: 1,
    randomStreams: [] as unknown[],
    actors: [] as unknown[],
    pendingCommands: [] as unknown[],
    pendingIntents: [] as unknown[],
    spawnSlots: [] as unknown[],
  };
}

function createActiveSave(): GameSave {
  const parsed = parseGameSave({
    schemaVersion: 5,
    character: {
      experience: 96_800,
      equipment: createEmptyEquipment(),
      collection: [],
    },
    stash: [
      { itemKey: 'item:tibia:gold-coin', count: 10 },
      { itemKey: 'item:tibia:health-potion', count: 2 },
    ],
    gold: 17,
    completedRuns: 3,
    session: {
      huntId: 'venore-rotworm-cave',
      scenarioId: 'pb-06-save-export',
      scenarioRevision: 1,
      seed: '0f1e2d3c4b5a6978',
      snapshot: createSnapshot(),
      bag: [
        { itemKey: 'item:tibia:gold-coin', count: 4 },
        { itemKey: 'item:tibia:sword', count: 1 },
      ],
    },
  });

  if (!parsed.ok) {
    throw new Error('Expected the active save fixture to be valid');
  }

  return parsed.value;
}

describe('save document serialization', () => {
  it('encodes JSON canonically with exactly one final LF', () => {
    const document = createEmptyGameSave();

    expect(encodeSaveDocument(document)).toBe(
      '{"character":{"collection":[],"equipment":{"armor":null,"boots":null,"helmet":null,"legs":null,"shield":null,"weapon":null},"experience":0},"completedRuns":0,"gold":0,"schemaVersion":5,"session":null,"stash":[]}\n',
    );
  });

  it('returns the same export for repeated calls and insertion orders', () => {
    const first = {
      schemaVersion: 5,
      character: {
        experience: 7,
        equipment: createEmptyEquipment(),
        collection: [],
      },
      stash: [],
      gold: 0,
      completedRuns: 0,
      session: null,
    } as GameSave;
    const second = {
      session: null,
      completedRuns: 0,
      character: {
        experience: 7,
        equipment: createEmptyEquipment(),
        collection: [],
      },
      stash: [],
      gold: 0,
      schemaVersion: 5,
    } as GameSave;

    expect(encodeSaveDocument(first)).toBe(encodeSaveDocument(first));
    expect(encodeSaveDocument(first)).toBe(encodeSaveDocument(second));
  });

  it('exports the complete active session snapshot', () => {
    const document = createActiveSave();
    const serialized = encodeSaveDocument(document);

    expect(serialized.endsWith('\n')).toBe(true);
    expect(serialized.endsWith('\n\n')).toBe(false);
    expect(JSON.parse(serialized)).toEqual(document);
    expect(JSON.parse(serialized).session.snapshot).toEqual(
      document.session?.snapshot,
    );
  });

  it('omits idle forced-target fields from encoded actors', () => {
    const parsed = parseGameSave({
      schemaVersion: 5,
      character: {
        experience: 0,
        equipment: createEmptyEquipment(),
        collection: [],
      },
      stash: [],
      gold: 0,
      completedRuns: 0,
      session: {
        huntId: 'venore-rotworm-cave',
        scenarioId: 'pb-06-save-export',
        scenarioRevision: 1,
        seed: '0f1e2d3c4b5a6978',
        snapshot: {
          ...createSnapshot(),
          actors: [
            {
              entityId: 1,
              blueprintId: 'walker',
              position: { x: 0, y: 0, z: 7 },
              facing: 'e',
              readyAtTick: 0,
              transitionGuard: null,
              health: 10,
              resource: 10,
              targetEntityId: null,
              attackReadyAtTick: 0,
              abilityCooldowns: [],
              nextHealthRegenTick: 0,
              nextResourceRegenTick: 0,
            },
          ],
        },
        bag: [],
      },
    });
    if (!parsed.ok) {
      throw new Error('Expected actor save fixture to be valid');
    }

    expect(parsed.value.session?.snapshot.actors[0]?.forcedTargetEntityId).toBe(
      null,
    );
    expect(encodeSaveDocument(parsed.value).includes('forcedTarget')).toBe(
      false,
    );
  });

  it('round-trips a complete document without changing its export', () => {
    const serialized = encodeSaveDocument(createActiveSave());

    expect(encodeSaveDocument(decodeSaveDocument(serialized))).toBe(serialized);
  });

  it('maps malformed JSON to SAVE_DOCUMENT_INVALID', () => {
    expect(() => decodeSaveDocument('{')).toThrow(
      expect.objectContaining({ code: 'SAVE_DOCUMENT_INVALID' }),
    );
  });

  it('maps a future schema version to SAVE_VERSION_UNSUPPORTED', () => {
    const future = JSON.stringify({
      ...createEmptyGameSave(),
      schemaVersion: 6,
    });

    expect(() => decodeSaveDocument(future)).toThrow(
      expect.objectContaining({ code: 'SAVE_VERSION_UNSUPPORTED' }),
    );
  });

  it('migrates an unversioned document before validating it', () => {
    expect(
      decodeSaveDocument('{"stash":[],"completedRuns":0,"session":null}\n'),
    ).toEqual(createEmptyGameSave());
  });

  it('maps a schema rejection to SAVE_DOCUMENT_INVALID', () => {
    const invalid = JSON.stringify({
      ...createEmptyGameSave(),
      completedRuns: -1,
    });

    expect(() => decodeSaveDocument(invalid)).toThrow(
      expect.objectContaining({ code: 'SAVE_DOCUMENT_INVALID' }),
    );
  });
});
