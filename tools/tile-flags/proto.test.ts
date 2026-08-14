import { describe, expect, it } from 'vitest';

import { readProtoFields } from './proto.ts';

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

function buffer(...parts: readonly (readonly number[])[]): Uint8Array {
  return Uint8Array.from(parts.flat());
}

describe('readProtoFields', () => {
  it('reads a varint field that fits in a single byte', () => {
    const fields = readProtoFields(buffer(tag(1, 0), [0x7f]));

    expect(fields).toEqual([{ fieldNumber: 1, wireType: 0, varint: 127n }]);
  });

  it('reads a varint field spanning multiple bytes', () => {
    const fields = readProtoFields(buffer(tag(2, 0), varint(300n)));

    expect(fields).toEqual([{ fieldNumber: 2, wireType: 0, varint: 300n }]);
  });

  it('reads a varint at the 64-bit maximum', () => {
    const max = 0xffffffffffffffffn;
    const fields = readProtoFields(buffer(tag(3, 0), varint(max)));

    expect(fields).toEqual([{ fieldNumber: 3, wireType: 0, varint: max }]);
  });

  it('throws when a varint exceeds 64 bits', () => {
    const overlong = [
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01,
    ];

    expect(() => readProtoFields(buffer(tag(1, 0), overlong))).toThrow(
      /varint exceeds 64 bits/i,
    );
  });

  it('returns the exact byte slice for a length-delimited field', () => {
    const payload = [0xde, 0xad, 0xbe, 0xef];
    const fields = readProtoFields(
      buffer(tag(4, 2), [payload.length], payload),
    );

    expect(fields).toHaveLength(1);
    expect(fields[0]?.fieldNumber).toBe(4);
    expect(fields[0]?.wireType).toBe(2);
    expect(fields[0]?.bytes).toEqual(Uint8Array.from(payload));
  });

  it('returns an empty slice for a zero-length length-delimited field', () => {
    const fields = readProtoFields(buffer(tag(4, 2), [0]));

    expect(fields[0]?.bytes).toEqual(new Uint8Array(0));
  });

  it('skips a 64-bit field by exactly eight bytes', () => {
    const fields = readProtoFields(
      buffer(tag(5, 1), [1, 2, 3, 4, 5, 6, 7, 8], tag(6, 0), [9]),
    );

    expect(fields).toEqual([
      { fieldNumber: 5, wireType: 1 },
      { fieldNumber: 6, wireType: 0, varint: 9n },
    ]);
  });

  it('skips a 32-bit field by exactly four bytes', () => {
    const fields = readProtoFields(
      buffer(tag(7, 5), [1, 2, 3, 4], tag(8, 0), [9]),
    );

    expect(fields).toEqual([
      { fieldNumber: 7, wireType: 5 },
      { fieldNumber: 8, wireType: 0, varint: 9n },
    ]);
  });

  it('keeps reading following fields after an unknown high-numbered field', () => {
    const fields = readProtoFields(
      buffer(
        tag(9999, 2),
        [2],
        [0xaa, 0xbb],
        tag(9998, 1),
        [1, 2, 3, 4, 5, 6, 7, 8],
        tag(9997, 5),
        [1, 2, 3, 4],
        tag(1, 0),
        [42],
      ),
    );

    expect(fields.map((field) => field.fieldNumber)).toEqual([
      9999, 9998, 9997, 1,
    ]);
    expect(fields.at(-1)?.varint).toBe(42n);
  });

  it('throws a named error for wire type 3', () => {
    expect(() => readProtoFields(buffer(tag(1, 3)))).toThrow(
      /unsupported protobuf wire type 3 for field 1/i,
    );
  });

  it('throws a named error for wire type 4', () => {
    expect(() => readProtoFields(buffer(tag(2, 4)))).toThrow(
      /unsupported protobuf wire type 4 for field 2/i,
    );
  });

  it('throws when the buffer is truncated in the middle of a varint', () => {
    expect(() => readProtoFields(buffer(tag(1, 0), [0x80, 0x80]))).toThrow(
      /truncated varint/i,
    );
  });

  it('throws when the buffer is truncated in the middle of a length-delimited payload', () => {
    expect(() => readProtoFields(buffer(tag(1, 2), [8], [1, 2, 3]))).toThrow(
      /truncated length-delimited field/i,
    );
  });

  it('throws when the buffer is truncated in the middle of a fixed-width field', () => {
    expect(() => readProtoFields(buffer(tag(1, 1), [1, 2, 3]))).toThrow(
      /truncated fixed-width field/i,
    );
  });

  it('reads a nested message recursively through its byte slice', () => {
    const child = buffer(tag(1, 0), [7], tag(2, 0), [8]);
    const parent = buffer(tag(3, 2), [child.length], [...child]);

    const outer = readProtoFields(parent);
    expect(outer).toHaveLength(1);

    const inner = readProtoFields(outer[0]?.bytes ?? new Uint8Array(0));
    expect(inner).toEqual([
      { fieldNumber: 1, wireType: 0, varint: 7n },
      { fieldNumber: 2, wireType: 0, varint: 8n },
    ]);
  });

  it('returns no fields for an empty buffer', () => {
    expect(readProtoFields(new Uint8Array(0))).toEqual([]);
  });

  it('throws when a tag declares field number zero', () => {
    expect(() => readProtoFields(buffer([0x00, 0x01]))).toThrow(
      /field number 0 is not valid/i,
    );
  });
});
