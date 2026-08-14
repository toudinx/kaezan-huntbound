/**
 * Hand-rolled protobuf encoders used only by tests, so every fixture in this
 * tool is built byte by byte rather than lifted from the real snapshot.
 */

export function varint(value: bigint): readonly number[] {
  const bytes: number[] = [];
  let rest = value;
  do {
    const chunk = Number(rest & 0x7fn);
    rest >>= 7n;
    bytes.push(rest > 0n ? chunk | 0x80 : chunk);
  } while (rest > 0n);
  return bytes;
}

export function tag(fieldNumber: number, wireType: number): readonly number[] {
  return varint(BigInt((fieldNumber << 3) | wireType));
}

export function varintField(
  fieldNumber: number,
  value: number,
): readonly number[] {
  return [...tag(fieldNumber, 0), ...varint(BigInt(value))];
}

export function boolField(
  fieldNumber: number,
  value: boolean,
): readonly number[] {
  return varintField(fieldNumber, value ? 1 : 0);
}

export function messageField(
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
export function appearance(
  id: number,
  flags: readonly number[] = [],
): readonly number[] {
  return [...varintField(1, id), ...messageField(3, flags)];
}

/** Appearances, with each collection addressed by its field number. */
export function appearancesDat(collections: {
  object?: readonly (readonly number[])[];
  outfit?: readonly number[];
  effect?: readonly number[];
  missile?: readonly number[];
}): Uint8Array {
  const ids = (fieldNumber: number, values: readonly number[] = []) =>
    values.flatMap((id) => messageField(fieldNumber, appearance(id)));
  return Uint8Array.from([
    ...(collections.object ?? []).flatMap((object) => messageField(1, object)),
    ...ids(2, collections.outfit),
    ...ids(3, collections.effect),
    ...ids(4, collections.missile),
  ]);
}
