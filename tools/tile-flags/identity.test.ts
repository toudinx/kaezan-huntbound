import { describe, expect, it } from 'vitest';

import { readAppearanceIds } from './appearances.ts';
import { verifyItemIdentity } from './identity.ts';
import { readItemIds } from './items.ts';

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

/** Builds an Appearances message from per-collection id lists. */
function dat(collections: {
  object?: readonly number[];
  outfit?: readonly number[];
  effect?: readonly number[];
  missile?: readonly number[];
}): Uint8Array {
  const emit = (fieldNumber: number, ids: readonly number[] = []) =>
    ids.flatMap((id) => messageField(fieldNumber, varintField(1, id)));
  return Uint8Array.from([
    ...emit(1, collections.object),
    ...emit(2, collections.outfit),
    ...emit(3, collections.effect),
    ...emit(4, collections.missile),
  ]);
}

function itemsXml(...rows: readonly string[]): string {
  return `<?xml version="1.0" encoding="ISO-8859-1"?>\n<items>\n${rows.join('\n')}\n</items>`;
}

function plain(id: number, name: string): string {
  return `\t<item id="${id}" name="${name}"/>`;
}

function stairs(id: number, value: string): string {
  return [
    `\t<item id="${id}" name="stairs">`,
    `\t\t<attribute key="floorchange" value="${value}"/>`,
    '\t</item>',
  ].join('\n');
}

describe('readAppearanceIds', () => {
  it('separates object, outfit, effect and missile collections', () => {
    const ids = readAppearanceIds(
      dat({ object: [100, 200], outfit: [26], effect: [12], missile: [36] }),
    );

    expect([...ids.object]).toEqual([100, 200]);
    expect([...ids.outfit]).toEqual([26]);
    expect([...ids.effect]).toEqual([12]);
    expect([...ids.missile]).toEqual([36]);
  });

  it('yields empty sets for absent collections', () => {
    const ids = readAppearanceIds(dat({ object: [1] }));

    expect(ids.outfit.size).toBe(0);
    expect(ids.missile.size).toBe(0);
  });
});

describe('readItemIds', () => {
  it('maps each declared id to its name', () => {
    const ids = readItemIds(itemsXml(plain(100, 'water'), plain(101, 'wine')));

    expect(ids.get(100)).toBe('water');
    expect(ids.get(101)).toBe('wine');
  });

  it('expands fromid/toid ranges under a shared name', () => {
    const ids = readItemIds(
      itemsXml('\t<item fromid="410" toid="412" name="stairs"/>'),
    );

    expect([...ids.keys()]).toEqual([410, 411, 412]);
    expect(ids.get(411)).toBe('stairs');
  });

  it('includes items that carry attribute children', () => {
    const ids = readItemIds(itemsXml(stairs(855, 'southalt')));

    expect(ids.get(855)).toBe('stairs');
  });
});

describe('verifyItemIdentity', () => {
  const required = [
    { key: 'item:tibia:gold-coin', kind: 'clientId' as const, id: 3031 },
    { key: 'outfit:tibia:knight', kind: 'lookType' as const, id: 131 },
    { key: 'effect:tibia:energy-hit', kind: 'effectId' as const, id: 12 },
    { key: 'missile:tibia:energy-ball', kind: 'missileId' as const, id: 36 },
  ];

  const healthy = dat({
    object: [100, 3031],
    outfit: [131],
    effect: [12],
    missile: [36],
  });

  it('accepts a snapshot where every required identity resolves', () => {
    const report = verifyItemIdentity(
      healthy,
      itemsXml(plain(100, 'water'), plain(3031, 'gold coin')),
      required,
    );

    expect(report.ok).toBe(true);
    expect(report.diagnostics).toEqual([]);
  });

  it('reports HUNT_ID_MISMATCH when a required clientId is absent from objects', () => {
    const report = verifyItemIdentity(
      dat({ object: [100], outfit: [131], effect: [12], missile: [36] }),
      itemsXml(plain(100, 'water')),
      required,
    );

    expect(report.ok).toBe(false);
    expect(report.diagnostics).toHaveLength(1);
    expect(report.diagnostics[0]).toMatchObject({
      code: 'HUNT_ID_MISMATCH',
      kind: 'clientId',
      serverId: 3031,
    });
    expect(report.diagnostics[0]?.found).toMatch(/absent/i);
  });

  it('reports a required lookType missing from the outfit collection', () => {
    const report = verifyItemIdentity(
      dat({ object: [100, 3031], effect: [12], missile: [36] }),
      itemsXml(plain(100, 'water')),
      required,
    );

    expect(report.diagnostics.map((d) => d.kind)).toEqual(['lookType']);
  });

  it('fails when a floorchange item has no appearance object', () => {
    const report = verifyItemIdentity(
      healthy,
      itemsXml(plain(100, 'water'), stairs(999, 'down')),
      [],
    );

    expect(report.ok).toBe(false);
    expect(report.diagnostics[0]).toMatchObject({
      code: 'HUNT_ID_MISMATCH',
      kind: 'floorchange',
      serverId: 999,
    });
  });

  it('counts reserved and named absences separately without failing', () => {
    const report = verifyItemIdentity(
      healthy,
      itemsXml(
        plain(100, 'water'),
        plain(3031, 'gold coin'),
        plain(500, 'RESERVED SPRITE'),
        plain(501, 'reserved sprite'),
        plain(502, 'bridge'),
      ),
      required,
    );

    expect(report.ok).toBe(true);
    expect(report.absentReservedCount).toBe(2);
    expect(report.absentNamedCount).toBe(1);
    expect(report.resolvedCount).toBe(2);
  });

  it('reports collection sizes for the record', () => {
    const report = verifyItemIdentity(
      healthy,
      itemsXml(plain(100, 'water'), plain(3031, 'gold coin')),
      required,
    );

    expect(report.appearanceObjectCount).toBe(2);
    expect(report.itemsXmlIdCount).toBe(2);
  });

  it('orders diagnostics by serverId', () => {
    const report = verifyItemIdentity(
      dat({ object: [100] }),
      itemsXml(plain(100, 'water'), stairs(900, 'down'), stairs(400, 'down')),
      required,
    );

    expect(report.diagnostics.map((d) => d.serverId)).toEqual([
      12, 36, 131, 400, 900, 3031,
    ]);
  });
});
