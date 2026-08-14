import { describe, expect, it } from 'vitest';

import { parseAppearanceFlags } from './appearances.ts';

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

function boolField(fieldNumber: number, value: boolean): readonly number[] {
  return varintField(fieldNumber, value ? 1 : 0);
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

/** Appearance { id = 1, flags = 3 } */
function appearance(
  id: number | null,
  flags: readonly number[],
): readonly number[] {
  return [
    ...(id === null ? [] : varintField(1, id)),
    ...messageField(3, flags),
  ];
}

/** Appearances { object = 1 } */
function appearances(...objects: readonly (readonly number[])[]): Uint8Array {
  return Uint8Array.from(objects.flatMap((object) => messageField(1, object)));
}

const BANK = 1;
const CLIP = 2;
const BOTTOM = 3;
const TOP = 4;
const UNPASS = 13;
const UNMOVE = 14;
const AVOID = 16;
const HEIGHT = 27;

describe('parseAppearanceFlags', () => {
  it('reads ground, blocking and top from three distinct objects', () => {
    const dat = appearances(
      appearance(100, messageField(BANK, varintField(1, 0))),
      appearance(200, boolField(UNPASS, true)),
      appearance(300, boolField(TOP, true)),
    );

    const entries = parseAppearanceFlags(dat);

    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({
      serverId: 100,
      ground: true,
      blocking: false,
      top: false,
    });
    expect(entries[1]).toMatchObject({
      serverId: 200,
      ground: false,
      blocking: true,
      top: false,
    });
    expect(entries[2]).toMatchObject({
      serverId: 300,
      ground: false,
      blocking: false,
      top: true,
    });
  });

  it('reads clip, bottom, unmove and avoid', () => {
    const dat = appearances(
      appearance(7, [
        ...boolField(CLIP, true),
        ...boolField(BOTTOM, true),
        ...boolField(UNMOVE, true),
        ...boolField(AVOID, true),
      ]),
    );

    expect(parseAppearanceFlags(dat)[0]).toMatchObject({
      serverId: 7,
      clip: true,
      bottom: true,
      unmove: true,
      avoid: true,
    });
  });

  it('defaults every absent flag to false', () => {
    const dat = appearances(appearance(11, []));

    expect(parseAppearanceFlags(dat)[0]).toEqual({
      serverId: 11,
      ground: false,
      blocking: false,
      top: false,
      clip: false,
      bottom: false,
      unmove: false,
      avoid: false,
      elevation: 0,
      floorChange: null,
    });
  });

  it('treats an explicitly false bool as false', () => {
    const dat = appearances(appearance(12, boolField(UNPASS, false)));

    expect(parseAppearanceFlags(dat)[0]?.blocking).toBe(false);
  });

  it('reads the elevation when height is present', () => {
    const dat = appearances(
      appearance(13, messageField(HEIGHT, varintField(1, 8))),
    );

    expect(parseAppearanceFlags(dat)[0]?.elevation).toBe(8);
  });

  it('defaults a missing elevation to zero', () => {
    const dat = appearances(appearance(14, messageField(HEIGHT, [])));

    expect(parseAppearanceFlags(dat)[0]?.elevation).toBe(0);
  });

  it('rejects an object without an id', () => {
    const dat = appearances(appearance(null, boolField(UNPASS, true)));

    expect(() => parseAppearanceFlags(dat)).toThrow(
      /object at index 0 has no id/i,
    );
  });

  it('keeps known flags intact when AppearanceFlags carries an unknown field', () => {
    const dat = appearances(
      appearance(15, [
        ...messageField(9999, [1, 2, 3]),
        ...boolField(UNPASS, true),
        ...varintField(9998, 4242),
        ...boolField(TOP, true),
      ]),
    );

    expect(parseAppearanceFlags(dat)[0]).toMatchObject({
      serverId: 15,
      blocking: true,
      top: true,
    });
  });

  it('reads an object that has no flags message at all', () => {
    const dat = Uint8Array.from(messageField(1, varintField(1, 16)));

    expect(parseAppearanceFlags(dat)[0]).toMatchObject({
      serverId: 16,
      ground: false,
      blocking: false,
    });
  });

  it('ignores outfit, effect and missile collections', () => {
    const dat = Uint8Array.from([
      ...messageField(1, appearance(20, boolField(UNPASS, true))),
      ...messageField(2, appearance(21, boolField(UNPASS, true))),
      ...messageField(3, appearance(22, boolField(UNPASS, true))),
      ...messageField(4, appearance(23, boolField(UNPASS, true))),
    ]);

    expect(parseAppearanceFlags(dat).map((entry) => entry.serverId)).toEqual([
      20,
    ]);
  });

  it('rejects a duplicated serverId', () => {
    const dat = appearances(appearance(30, []), appearance(30, []));

    expect(() => parseAppearanceFlags(dat)).toThrow(/duplicate serverId 30/i);
  });
});
