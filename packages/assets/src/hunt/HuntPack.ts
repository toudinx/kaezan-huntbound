import { z } from 'zod';
import type { MapRegion } from '../../../contracts/src/hunt/types.ts';

import { type AssetKey, AssetKeySchema } from '../manifest/identity.ts';

const VOID_SERVER_ID = 0;

export const HUNT_PACK_CREATURE_KEY = 'creature:tibia:rotworm';
export const HUNT_PACK_OUTFIT_KEY = 'outfit:tibia:knight';
export const HUNT_PACK_BLOOD_EFFECT_KEY = 'effect:tibia:draw-blood';
export const HUNT_PACK_SMALL_SPLASH_KEY = 'item:tibia:small-splash';
export const HUNT_PACK_HIT_AREA_EFFECT_KEY = 'effect:tibia:hit-area';
export const HUNT_PACK_MAGIC_BLUE_EFFECT_KEY = 'effect:tibia:magic-blue';
export const HUNT_PACK_DEAD_ROTWORM_KEY = 'item:tibia:dead-rotworm';
export const HUNT_PACK_LOOT_KEYS = [
  'item:tibia:gold-coin',
  'item:tibia:ham',
  'item:tibia:legion-helmet',
  'item:tibia:lump-of-dirt',
  'item:tibia:mace',
  'item:tibia:meat',
  'item:tibia:sword',
  'item:tibia:worm',
] as const;

export const HUNT_PACK_COMBAT_KEYS = [
  HUNT_PACK_BLOOD_EFFECT_KEY,
  HUNT_PACK_SMALL_SPLASH_KEY,
  HUNT_PACK_HIT_AREA_EFFECT_KEY,
  HUNT_PACK_MAGIC_BLUE_EFFECT_KEY,
  HUNT_PACK_DEAD_ROTWORM_KEY,
] as const;

const HUNT_PACK_EXTRA_KEYS = [
  HUNT_PACK_CREATURE_KEY,
  HUNT_PACK_OUTFIT_KEY,
  ...HUNT_PACK_COMBAT_KEYS,
  ...HUNT_PACK_LOOT_KEYS,
] as const;

export interface HuntPackSelection {
  readonly packKey: string;
  readonly huntId: string;
  readonly regionSha256: string;
  readonly keys: readonly string[];
  readonly budget: {
    readonly maxEntries: number;
    readonly maxBytes: number;
  };
}

export const HuntPackSelectionSchema: z.ZodType<HuntPackSelection> = z
  .object({
    packKey: z.string().min(1),
    huntId: z.string().min(1),
    regionSha256: z.string().regex(/^[0-9a-f]{64}$/),
    keys: z.array(AssetKeySchema).min(1).readonly(),
    budget: z
      .object({
        maxEntries: z.number().int().positive(),
        maxBytes: z.number().int().positive(),
      })
      .strict(),
  })
  .strict();

export type HuntPackDiagnosticCode =
  | 'HUNT_ASSET_KEY_MISSING'
  | 'HUNT_ASSET_KEY_UNEXPECTED'
  | 'HUNT_PACK_OVER_ENTRIES'
  | 'HUNT_PACK_OVER_BYTES'
  | 'HUNT_PACK_REGION_STALE';

export interface HuntPackDiagnostic {
  readonly path: string;
  readonly code: HuntPackDiagnosticCode;
  readonly message: string;
}

export interface HuntPackResolvedEntry {
  readonly key: string;
  readonly bytes: number;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalJson(value: unknown, path: string): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError(`Hunt region must contain safe integers at ${path}`);
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value
      .map((item, index) => canonicalJson(item, `${path}[${index}]`))
      .join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => compareText(left, right),
    );
    return `{${entries
      .map(
        ([key, item]) =>
          `${JSON.stringify(key)}:${canonicalJson(item, path === '' ? key : `${path}.${key}`)}`,
      )
      .join(',')}}`;
  }
  throw new TypeError(`Hunt region cannot be serialized at ${path}`);
}

export function canonicalHuntRegionJson(region: MapRegion): string {
  return `${canonicalJson(region, '')}\n`;
}

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function sha256(bytes: Uint8Array): string {
  const blockSize = 64;
  const paddedLength =
    Math.ceil((bytes.byteLength + 9) / blockSize) * blockSize;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.byteLength] = 0x80;

  const view = new DataView(padded.buffer);
  const bitLength = bytes.byteLength * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const roundConstants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ];
  const schedule = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += blockSize) {
    for (let index = 0; index < 16; index += 1) {
      schedule[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const previous = schedule[index - 15] ?? 0;
      const earlier = schedule[index - 2] ?? 0;
      const sigma0 =
        rotateRight(previous, 7) ^ rotateRight(previous, 18) ^ (previous >>> 3);
      const sigma1 =
        rotateRight(earlier, 17) ^ rotateRight(earlier, 19) ^ (earlier >>> 10);
      schedule[index] =
        ((schedule[index - 16] ?? 0) +
          sigma0 +
          (schedule[index - 7] ?? 0) +
          sigma1) >>>
        0;
    }

    let a = hash[0] ?? 0;
    let b = hash[1] ?? 0;
    let c = hash[2] ?? 0;
    let d = hash[3] ?? 0;
    let e = hash[4] ?? 0;
    let f = hash[5] ?? 0;
    let g = hash[6] ?? 0;
    let h = hash[7] ?? 0;
    for (let index = 0; index < 64; index += 1) {
      const sigma1 =
        rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temporary1 =
        (h +
          sigma1 +
          choose +
          (roundConstants[index] ?? 0) +
          (schedule[index] ?? 0)) >>>
        0;
      const sigma0 =
        rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sigma0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    const working = [a, b, c, d, e, f, g, h];
    hash = hash.map((value, index) => (value + (working[index] ?? 0)) >>> 0);
  }

  return hash.map((value) => value.toString(16).padStart(8, '0')).join('');
}

export function hashHuntRegion(region: MapRegion): string {
  return sha256(new TextEncoder().encode(canonicalHuntRegionJson(region)));
}

export function deriveHuntPackKeys(region: MapRegion): readonly AssetKey[] {
  return [...new Set(region.palette)]
    .filter((serverId) => serverId > VOID_SERVER_ID)
    .sort((left, right) => left - right)
    .map((clientId) => `tile:tibia:${clientId}` as AssetKey);
}

function diagnostic(
  code: HuntPackDiagnosticCode,
  path: string,
  message: string,
): HuntPackDiagnostic {
  return { path, code, message };
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort(compareText);
}

export function validateHuntPack(
  selection: HuntPackSelection,
  region: MapRegion,
  resolvedEntries: readonly HuntPackResolvedEntry[],
): readonly HuntPackDiagnostic[] {
  const diagnostics: HuntPackDiagnostic[] = [];
  const expectedKeys = [...deriveHuntPackKeys(region), ...HUNT_PACK_EXTRA_KEYS];
  const expectedSet = new Set<string>(expectedKeys);
  const selectedSet = new Set(selection.keys);
  const resolvedSet = new Set(resolvedEntries.map(({ key }) => key));

  for (const key of expectedKeys) {
    if (!selectedSet.has(key) || !resolvedSet.has(key)) {
      diagnostics.push(
        diagnostic(
          'HUNT_ASSET_KEY_MISSING',
          'selection.keys',
          `Selection is missing ${key}`,
        ),
      );
    }
  }

  for (const key of sortedUnique([
    ...selection.keys,
    ...resolvedEntries.map(({ key }) => key),
  ])) {
    if (!expectedSet.has(key)) {
      diagnostics.push(
        diagnostic(
          'HUNT_ASSET_KEY_UNEXPECTED',
          'selection.keys',
          `Selection contains unexpected ${key}`,
        ),
      );
    }
  }

  const actualRegionSha256 = hashHuntRegion(region);
  if (selection.regionSha256 !== actualRegionSha256) {
    diagnostics.push(
      diagnostic(
        'HUNT_PACK_REGION_STALE',
        'regionSha256',
        `Selection region hash ${selection.regionSha256} does not match ${actualRegionSha256}`,
      ),
    );
  }

  const byteCount = resolvedEntries.reduce(
    (total, entry) => total + entry.bytes,
    0,
  );
  if (resolvedEntries.length > selection.budget.maxEntries) {
    diagnostics.push(
      diagnostic(
        'HUNT_PACK_OVER_ENTRIES',
        'budget.maxEntries',
        `Pack has ${resolvedEntries.length} entries; maximum is ${selection.budget.maxEntries}`,
      ),
    );
  }
  if (byteCount > selection.budget.maxBytes) {
    diagnostics.push(
      diagnostic(
        'HUNT_PACK_OVER_BYTES',
        'budget.maxBytes',
        `Pack has ${byteCount} bytes; maximum is ${selection.budget.maxBytes}`,
      ),
    );
  }

  return diagnostics;
}
