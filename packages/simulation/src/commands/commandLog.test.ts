import {
  createEntityId,
  createSeed,
  createTickIndex,
  SIMULATION_RULES_VERSION,
  SIMULATION_SCHEMA_VERSION,
  type SimulationCommandLog,
  type SimulationCommandRecord,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { decodeCommandLog, encodeCommandLog } from './commandLog.ts';

function validHeader() {
  return {
    kind: 'header' as const,
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    rulesVersion: SIMULATION_RULES_VERSION,
    scenarioId: 'training-yard',
    scenarioRevision: 2,
    seed: createSeed('0123456789abcdef'),
    tickCount: 4,
  };
}

function spawnRecord(tick: number, sequence: number): SimulationCommandRecord {
  return {
    tick: createTickIndex(tick),
    sequence,
    issuer: 'scenario',
    command: {
      type: 'scenario/spawn-actor',
      blueprintId: 'hero',
      position: { x: 1, y: 2, z: 0 },
      facing: 's',
    },
  };
}

function faceRecord(tick: number, sequence: number): SimulationCommandRecord {
  return {
    tick: createTickIndex(tick),
    sequence,
    issuer: 'player',
    command: {
      type: 'actor/face',
      entityId: createEntityId(7),
      direction: 'e',
    },
  };
}

function validLog(): SimulationCommandLog {
  return {
    header: validHeader(),
    commands: [spawnRecord(0, 1), faceRecord(1, 2)],
  };
}

function line(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

describe('command log JSONL', () => {
  it('encodes canonical flattened lines and round-trips the nested log', () => {
    const log = validLog();

    const encoded = encodeCommandLog(log);

    expect(encoded).toBe(
      '{"kind":"header","rulesVersion":1,"scenarioId":"training-yard","scenarioRevision":2,"schemaVersion":2,"seed":"0123456789abcdef","tickCount":4}\n' +
        '{"issuer":"scenario","kind":"command","payload":{"blueprintId":"hero","facing":"s","position":{"x":1,"y":2,"z":0}},"sequence":1,"tick":0,"type":"scenario/spawn-actor"}\n' +
        '{"issuer":"player","kind":"command","payload":{"direction":"e","entityId":7},"sequence":2,"tick":1,"type":"actor/face"}\n',
    );
    expect(encoded.endsWith('\n')).toBe(true);
    expect(decodeCommandLog(encoded)).toEqual({ ok: true, value: log });
  });

  it('rejects logs without a complete JSONL header and command stream', () => {
    const encoded = encodeCommandLog(validLog());
    const cases: readonly [string, string][] = [
      ['', 'missing header'],
      [encoded.slice(0, -1), 'missing final newline'],
      [encoded.replace('\n{', '\n\n{'), 'empty middle line'],
      ['{not-json}\n', 'invalid JSON'],
    ];

    for (const [input, name] of cases) {
      const result = decodeCommandLog(input);
      expect(result.ok, name).toBe(false);
      if (result.ok) continue;
      expect(result.diagnostics[0]?.code, name).toBe('SIM_SCHEMA_INVALID');
      expect('value' in result, name).toBe(false);
    }
  });

  it('rejects unknown kinds and divergent versions before returning a log', () => {
    const log = validLog();
    const encoded = encodeCommandLog(log);
    const lines = encoded.trimEnd().split('\n');
    const header = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
    const command = JSON.parse(lines[1] ?? '{}') as Record<string, unknown>;

    const unknownKind = decodeCommandLog(
      `${line({ ...header, kind: 'unknown' })}${line(command)}`,
    );
    expect(unknownKind.ok).toBe(false);
    if (!unknownKind.ok) {
      expect(unknownKind.diagnostics[0]?.code).toBe('SIM_SCHEMA_INVALID');
    }

    const unknownCommandKind = decodeCommandLog(
      `${line(header)}${line({ ...command, kind: 'unknown' })}`,
    );
    expect(unknownCommandKind.ok).toBe(false);
    if (!unknownCommandKind.ok) {
      expect(unknownCommandKind.diagnostics[0]?.code).toBe(
        'SIM_SCHEMA_INVALID',
      );
      expect('value' in unknownCommandKind).toBe(false);
    }

    const wrongVersion = decodeCommandLog(
      `${line({ ...header, schemaVersion: 99 })}${line(command)}`,
    );
    expect(wrongVersion.ok).toBe(false);
    if (!wrongVersion.ok) {
      expect(wrongVersion.diagnostics[0]?.code).toBe('SIM_VERSION_MISMATCH');
      expect('value' in wrongVersion).toBe(false);
    }
  });

  it('rejects decreasing ticks and non-increasing sequences transactionally', () => {
    const log = validLog();
    const encoded = encodeCommandLog(log);
    const lines = encoded.trimEnd().split('\n');
    const header = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
    const firstCommand = JSON.parse(lines[1] ?? '{}') as Record<
      string,
      unknown
    >;
    const secondCommand = JSON.parse(lines[2] ?? '{}') as Record<
      string,
      unknown
    >;

    const decreasingTick = decodeCommandLog(
      `${line(header)}${line({ ...firstCommand, tick: 2 })}${line({ ...secondCommand, tick: 1 })}`,
    );
    expect(decreasingTick.ok).toBe(false);
    if (!decreasingTick.ok) {
      expect(
        decreasingTick.diagnostics.some(
          (item) => item.code === 'SIM_SCHEMA_INVALID',
        ),
      ).toBe(true);
      expect('value' in decreasingTick).toBe(false);
    }

    const duplicateSequence = decodeCommandLog(
      `${line(header)}${line(firstCommand)}${line({ ...secondCommand, sequence: 1 })}`,
    );
    expect(duplicateSequence.ok).toBe(false);
    if (!duplicateSequence.ok) {
      expect(duplicateSequence.diagnostics[0]?.code).toBe(
        'SIM_COMMAND_DUPLICATE',
      );
      expect('value' in duplicateSequence).toBe(false);
    }
  });
});
