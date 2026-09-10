import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { buildTileFlagsTable, encodeTileFlagsTable } from './table.ts';
import type { TileFlagsTable } from './types.ts';

function varint(value: bigint): readonly number[] {
  const bytes: number[] = [];
  let rest = value;
  do {
    const chunk = Number(rest & 0x7fn);
    rest >>= 7n;
    bytes.push(rest > 0n ? chunk | 0x80 : chunk);
  } while (rest > 0n);
  return bytes;
}

function tag(fieldNumber: number, wireType: number): readonly number[] {
  return varint(BigInt((fieldNumber << 3) | wireType));
}

function varintField(fieldNumber: number, value: number): readonly number[] {
  return [...tag(fieldNumber, 0), ...varint(BigInt(value))];
}

function messageField(
  fieldNumber: number,
  payload: readonly number[],
): readonly number[] {
  return [
    ...tag(fieldNumber, 2),
    ...varint(BigInt(payload.length)),
    ...payload,
  ];
}

/** Appearances { object = 1 { id = 1, flags = 3 } } */
function dat(...ids: readonly number[]): Uint8Array {
  return Uint8Array.from(
    ids.flatMap((id) =>
      messageField(1, [...varintField(1, id), ...messageField(3, [])]),
    ),
  );
}

function itemsXml(...rows: readonly string[]): string {
  return `<?xml version="1.0" encoding="ISO-8859-1"?>\n<items>\n${rows.join('\n')}\n</items>`;
}

function stairs(id: number, value: string): string {
  return [
    `\t<item id="${id}" name="stairs">`,
    `\t\t<attribute key="floorchange" value="${value}"/>`,
    '\t</item>',
  ].join('\n');
}

const COMMIT = '157e6f9e21318bd3033eea553fe9275b429faf72';

describe('buildTileFlagsTable', () => {
  it('sorts entries strictly by serverId', () => {
    const table = buildTileFlagsTable(dat(300, 100, 200), itemsXml(), COMMIT);

    expect(table.entries.map((entry) => entry.serverId)).toEqual([
      100, 200, 300,
    ]);
  });

  it('attaches each floorChange to its own entry and leaves the rest null', () => {
    const table = buildTileFlagsTable(
      dat(100, 200, 300),
      itemsXml(stairs(200, 'down')),
      COMMIT,
    );

    expect(table.entries.map((entry) => entry.floorChange)).toEqual([
      null,
      'down',
      null,
    ]);
  });

  it('carries the alt floorchange values through to the table', () => {
    const table = buildTileFlagsTable(
      dat(855, 856),
      itemsXml(stairs(855, 'southalt'), stairs(856, 'eastalt')),
      COMMIT,
    );

    expect(table.entries.map((entry) => entry.floorChange)).toEqual([
      'southalt',
      'eastalt',
    ]);
  });

  it('throws instead of creating an orphan entry for an unknown floorchange id', () => {
    expect(() =>
      buildTileFlagsTable(dat(100), itemsXml(stairs(999, 'down')), COMMIT),
    ).toThrow(/floorchange.*999.*not present in appearances\.dat/i);
  });

  it('records the schema version and the source commit', () => {
    const table = buildTileFlagsTable(dat(100), itemsXml(), COMMIT);

    expect(table.schemaVersion).toBe(2);
    expect(table.sourceCommit).toBe(COMMIT);
  });

  it('hashes the appearances bytes exactly as they were given', () => {
    const bytes = dat(100, 200);
    const table = buildTileFlagsTable(bytes, itemsXml(), COMMIT);

    expect(table.appearancesSha256).toBe(
      createHash('sha256').update(bytes).digest('hex'),
    );
  });

  it('hashes items.xml over its latin1 bytes, matching the on-disk file', () => {
    const xml = itemsXml(stairs(100, 'down'));
    const table = buildTileFlagsTable(dat(100), xml, COMMIT);

    expect(table.itemsXmlSha256).toBe(
      createHash('sha256').update(Buffer.from(xml, 'latin1')).digest('hex'),
    );
  });
});

describe('encodeTileFlagsTable', () => {
  const table: TileFlagsTable = buildTileFlagsTable(
    dat(200, 100),
    itemsXml(stairs(100, 'down')),
    COMMIT,
  );

  it('ends with exactly one trailing newline', () => {
    const encoded = encodeTileFlagsTable(table);

    expect(encoded.endsWith('}\n')).toBe(true);
    expect(encoded.endsWith('}\n\n')).toBe(false);
  });

  it('emits no superfluous whitespace', () => {
    const encoded = encodeTileFlagsTable(table).trimEnd();

    expect(encoded).not.toMatch(/[ \t]/);
    expect(encoded).not.toContain('\n');
  });

  it('orders the top-level keys alphabetically', () => {
    const encoded = encodeTileFlagsTable(table);

    expect(Object.keys(JSON.parse(encoded) as object)).toEqual([
      'appearancesSha256',
      'entries',
      'itemsXmlSha256',
      'schemaVersion',
      'sourceCommit',
    ]);
  });

  it('orders each entry key alphabetically', () => {
    const encoded = encodeTileFlagsTable(table);
    const parsed = JSON.parse(encoded) as { entries: readonly object[] };

    expect(Object.keys(parsed.entries[0] ?? {})).toEqual([
      'avoid',
      'blocking',
      'bottom',
      'clip',
      'elevation',
      'floorChange',
      'ground',
      'ladder',
      'serverId',
      'top',
      'unmove',
    ]);
  });

  it('is stable across repeated encodings', () => {
    expect(encodeTileFlagsTable(table)).toBe(encodeTileFlagsTable(table));
  });

  it('round-trips to an equal table', () => {
    expect(JSON.parse(encodeTileFlagsTable(table))).toEqual(table);
  });

  it('contains only integers, booleans, strings and nulls', () => {
    const encoded = encodeTileFlagsTable(table);
    const parsed = JSON.parse(encoded) as TileFlagsTable;

    for (const entry of parsed.entries) {
      expect(Number.isInteger(entry.serverId)).toBe(true);
      expect(Number.isInteger(entry.elevation)).toBe(true);
      expect(typeof entry.ground).toBe('boolean');
      expect(
        entry.floorChange === null || typeof entry.floorChange === 'string',
      ).toBe(true);
    }
    expect(encoded).not.toMatch(/\d\.\d/);
  });
});
