/**
 * Decodes tile-relevant flags out of Canary's `appearances.dat`.
 *
 * Field numbers come from `references/canary/src/protobuf/appearances.proto`:
 * `Appearances.object = 1`, `Appearance.id = 1`, `Appearance.flags = 3`, and
 * the `AppearanceFlags` numbers listed below. Only those are decoded; every
 * other field is skipped by wire type.
 */

import { type ProtoField, readProtoFields } from './proto.ts';
import type { TileFlags } from './types.ts';

const APPEARANCES_OBJECT = 1;
const APPEARANCE_ID = 1;
const APPEARANCE_FLAGS = 3;

const FLAG_BANK = 1;
const FLAG_CLIP = 2;
const FLAG_BOTTOM = 3;
const FLAG_TOP = 4;
const FLAG_UNPASS = 13;
const FLAG_UNMOVE = 14;
const FLAG_AVOID = 16;
const FLAG_HEIGHT = 27;

const HEIGHT_ELEVATION = 1;

interface MutableFlags {
  ground: boolean;
  blocking: boolean;
  top: boolean;
  clip: boolean;
  bottom: boolean;
  unmove: boolean;
  avoid: boolean;
  elevation: number;
}

function emptyFlags(): MutableFlags {
  return {
    ground: false,
    blocking: false,
    top: false,
    clip: false,
    bottom: false,
    unmove: false,
    avoid: false,
    elevation: 0,
  };
}

function isTrue(field: ProtoField): boolean {
  return field.varint !== undefined && field.varint !== 0n;
}

function readElevation(bytes: Uint8Array | undefined): number {
  if (bytes === undefined) return 0;
  for (const field of readProtoFields(bytes)) {
    if (field.fieldNumber === HEIGHT_ELEVATION && field.varint !== undefined) {
      return Number(field.varint);
    }
  }
  return 0;
}

function readFlags(bytes: Uint8Array): MutableFlags {
  const flags = emptyFlags();
  for (const field of readProtoFields(bytes)) {
    switch (field.fieldNumber) {
      case FLAG_BANK:
        flags.ground = true;
        break;
      case FLAG_CLIP:
        flags.clip = isTrue(field);
        break;
      case FLAG_BOTTOM:
        flags.bottom = isTrue(field);
        break;
      case FLAG_TOP:
        flags.top = isTrue(field);
        break;
      case FLAG_UNPASS:
        flags.blocking = isTrue(field);
        break;
      case FLAG_UNMOVE:
        flags.unmove = isTrue(field);
        break;
      case FLAG_AVOID:
        flags.avoid = isTrue(field);
        break;
      case FLAG_HEIGHT:
        flags.elevation = readElevation(field.bytes);
        break;
      default:
        break;
    }
  }
  return flags;
}

const APPEARANCES_OUTFIT = 2;
const APPEARANCES_EFFECT = 3;
const APPEARANCES_MISSILE = 4;

export interface AppearanceIds {
  readonly object: ReadonlySet<number>;
  readonly outfit: ReadonlySet<number>;
  readonly effect: ReadonlySet<number>;
  readonly missile: ReadonlySet<number>;
}

/**
 * Collects the declared ids of each top-level appearance collection. Used to
 * prove that a frozen identity resolves in the collection it belongs to.
 */
export function readAppearanceIds(appearancesDat: Uint8Array): AppearanceIds {
  const collections = new Map<number, Set<number>>([
    [APPEARANCES_OBJECT, new Set()],
    [APPEARANCES_OUTFIT, new Set()],
    [APPEARANCES_EFFECT, new Set()],
    [APPEARANCES_MISSILE, new Set()],
  ]);

  for (const field of readProtoFields(appearancesDat)) {
    const target = collections.get(field.fieldNumber);
    if (target === undefined || field.bytes === undefined) continue;
    for (const objectField of readProtoFields(field.bytes)) {
      if (
        objectField.fieldNumber === APPEARANCE_ID &&
        objectField.varint !== undefined
      ) {
        target.add(Number(objectField.varint));
      }
    }
  }

  return {
    object: collections.get(APPEARANCES_OBJECT) ?? new Set(),
    outfit: collections.get(APPEARANCES_OUTFIT) ?? new Set(),
    effect: collections.get(APPEARANCES_EFFECT) ?? new Set(),
    missile: collections.get(APPEARANCES_MISSILE) ?? new Set(),
  };
}

export function parseAppearanceFlags(
  appearancesDat: Uint8Array,
): readonly TileFlags[] {
  const entries: TileFlags[] = [];
  const seen = new Set<number>();
  let index = 0;

  for (const field of readProtoFields(appearancesDat)) {
    if (field.fieldNumber !== APPEARANCES_OBJECT || field.bytes === undefined) {
      continue;
    }

    const objectIndex = index;
    index += 1;

    let serverId: number | undefined;
    let flags = emptyFlags();
    for (const objectField of readProtoFields(field.bytes)) {
      if (
        objectField.fieldNumber === APPEARANCE_ID &&
        objectField.varint !== undefined
      ) {
        serverId = Number(objectField.varint);
      } else if (
        objectField.fieldNumber === APPEARANCE_FLAGS &&
        objectField.bytes !== undefined
      ) {
        flags = readFlags(objectField.bytes);
      }
    }

    if (serverId === undefined) {
      throw new Error(`appearance object at index ${objectIndex} has no id`);
    }
    if (seen.has(serverId)) {
      throw new Error(
        `duplicate serverId ${serverId} at object index ${objectIndex}`,
      );
    }
    seen.add(serverId);
    entries.push({ serverId, ...flags, floorChange: null });
  }

  return entries;
}
