/**
 * Minimal protobuf wire-format reader.
 *
 * It decodes only what PB-04-03 needs: tags, varints and length-delimited
 * slices. Every other wire type is skipped by its exact width so unknown
 * fields never corrupt the fields that follow. No external dependency.
 */

export type ProtoWireType = 0 | 1 | 2 | 5;

export interface ProtoField {
  readonly fieldNumber: number;
  readonly wireType: ProtoWireType;
  readonly varint?: bigint;
  readonly bytes?: Uint8Array;
}

const MAX_UINT64 = 0xffffffffffffffffn;
const MAX_VARINT_SHIFT = 70n;

interface VarintRead {
  readonly value: bigint;
  readonly offset: number;
}

function readVarint(buffer: Uint8Array, offset: number): VarintRead {
  let value = 0n;
  let shift = 0n;
  let cursor = offset;

  for (;;) {
    if (shift >= MAX_VARINT_SHIFT) {
      throw new Error(`varint exceeds 64 bits at offset ${offset}`);
    }
    const byte = buffer[cursor];
    if (byte === undefined) {
      throw new Error(`truncated varint at offset ${offset}`);
    }
    cursor += 1;
    value |= BigInt(byte & 0x7f) << shift;
    shift += 7n;
    if ((byte & 0x80) === 0) break;
  }

  if (value > MAX_UINT64) {
    throw new Error(`varint exceeds 64 bits at offset ${offset}`);
  }
  return { value, offset: cursor };
}

function skipFixed(
  buffer: Uint8Array,
  offset: number,
  width: number,
  fieldNumber: number,
): number {
  const end = offset + width;
  if (end > buffer.length) {
    throw new Error(
      `truncated fixed-width field ${fieldNumber} at offset ${offset}`,
    );
  }
  return end;
}

export function readProtoFields(buffer: Uint8Array): readonly ProtoField[] {
  const fields: ProtoField[] = [];
  let cursor = 0;

  while (cursor < buffer.length) {
    const tagStart = cursor;
    const tag = readVarint(buffer, cursor);
    cursor = tag.offset;

    const fieldNumber = Number(tag.value >> 3n);
    const wireType = Number(tag.value & 0x07n);

    if (fieldNumber === 0) {
      throw new Error(`field number 0 is not valid at offset ${tagStart}`);
    }

    switch (wireType) {
      case 0: {
        const read = readVarint(buffer, cursor);
        cursor = read.offset;
        fields.push({ fieldNumber, wireType: 0, varint: read.value });
        break;
      }
      case 1: {
        cursor = skipFixed(buffer, cursor, 8, fieldNumber);
        fields.push({ fieldNumber, wireType: 1 });
        break;
      }
      case 2: {
        const lengthRead = readVarint(buffer, cursor);
        const length = Number(lengthRead.value);
        const start = lengthRead.offset;
        const end = start + length;
        if (!Number.isSafeInteger(length) || end > buffer.length) {
          throw new Error(
            `truncated length-delimited field ${fieldNumber} at offset ${cursor}`,
          );
        }
        cursor = end;
        fields.push({
          fieldNumber,
          wireType: 2,
          bytes: buffer.subarray(start, end),
        });
        break;
      }
      case 5: {
        cursor = skipFixed(buffer, cursor, 4, fieldNumber);
        fields.push({ fieldNumber, wireType: 5 });
        break;
      }
      default:
        throw new Error(
          `unsupported protobuf wire type ${wireType} for field ${fieldNumber} at offset ${tagStart}`,
        );
    }
  }

  return fields;
}
