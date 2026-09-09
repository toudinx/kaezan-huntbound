import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';

import {
  HUNT_PACK_SPELL_CLIENT_IDS,
  HUNT_PACK_SPELL_KEYS,
} from '../../../packages/assets/src/index.ts';
import { parseArenaFableSourceManifest } from '../source/sourceManifest.ts';

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const SPELL_ICON_SIZE = 32;

const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 0 ? value >>> 1 : 0xedb88320 ^ (value >>> 1);
  }
  crcTable[index] = value >>> 0;
}

export const SPELL_ICON_SPECS = HUNT_PACK_SPELL_KEYS.map((key) => {
  const clientId = HUNT_PACK_SPELL_CLIENT_IDS.get(key);
  if (clientId === undefined) {
    throw new Error(`Missing clientId for ${key}`);
  }
  return { key, clientId };
});

interface DecodedPng {
  readonly width: number;
  readonly height: number;
  readonly colorType: number;
  readonly channels: number;
  readonly pixels: Buffer;
}

interface JsonRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value = (crcTable[(value ^ byte) & 0xff] ?? 0) ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.byteLength, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(
    crc32(Buffer.concat([typeBytes, Buffer.from(data)])),
    0,
  );
  return Buffer.concat([length, typeBytes, Buffer.from(data), checksum]);
}

function paethPredictor(
  left: number,
  above: number,
  upperLeft: number,
): number {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function decodePng(bytes: Buffer): DecodedPng {
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('Spell icon atlas is not a PNG');
  }

  let offset = PNG_SIGNATURE.length;
  let width: number | undefined;
  let height: number | undefined;
  let bitDepth: number | undefined;
  let colorType: number | undefined;
  let interlaceMethod: number | undefined;
  const idat: Buffer[] = [];

  while (offset < bytes.byteLength) {
    if (offset + 12 > bytes.byteLength) {
      throw new Error('Spell icon atlas has a truncated PNG chunk');
    }
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (chunkEnd > bytes.byteLength) {
      throw new Error(`Spell icon atlas has a truncated ${type} chunk`);
    }

    if (type === 'IHDR') {
      if (length !== 13)
        throw new Error('Spell icon atlas has an invalid IHDR');
      width = bytes.readUInt32BE(dataStart);
      height = bytes.readUInt32BE(dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
      interlaceMethod = bytes[dataStart + 12];
    } else if (type === 'IDAT') {
      idat.push(bytes.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }
    offset = chunkEnd;
  }

  if (
    width === undefined ||
    height === undefined ||
    bitDepth === undefined ||
    colorType === undefined ||
    interlaceMethod === undefined
  ) {
    throw new Error('Spell icon atlas is missing IHDR');
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(
      'Spell icon atlas must use 8-bit RGB or RGBA pixels for deterministic cropping',
    );
  }
  if (interlaceMethod !== 0) {
    throw new Error('Interlaced spell icon atlases are not supported');
  }
  if (idat.length === 0) throw new Error('Spell icon atlas is missing IDAT');

  const channels = colorType === 6 ? 4 : 3;
  const bytesPerPixel = channels;
  const rowBytes = width * bytesPerPixel;
  const scanlineBytes = (rowBytes + 1) * height;
  const scanlines = inflateSync(Buffer.concat(idat));
  if (scanlines.byteLength !== scanlineBytes) {
    throw new Error(
      `Spell icon atlas has ${scanlines.byteLength} decoded bytes; expected ${scanlineBytes}`,
    );
  }

  const pixels = Buffer.alloc(rowBytes * height);
  for (let row = 0; row < height; row += 1) {
    const filter = scanlines[row * (rowBytes + 1)];
    const sourceStart = row * (rowBytes + 1) + 1;
    const targetStart = row * rowBytes;
    const previousStart = (row - 1) * rowBytes;
    if (filter === undefined || filter > 4) {
      throw new Error(`Spell icon atlas uses unsupported PNG filter ${filter}`);
    }
    for (let column = 0; column < rowBytes; column += 1) {
      const raw = scanlines[sourceStart + column] ?? 0;
      const left =
        column >= bytesPerPixel
          ? (pixels[targetStart + column - bytesPerPixel] ?? 0)
          : 0;
      const above = row === 0 ? 0 : (pixels[previousStart + column] ?? 0);
      const upperLeft =
        row === 0 || column < bytesPerPixel
          ? 0
          : (pixels[previousStart + column - bytesPerPixel] ?? 0);
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? above
              : filter === 3
                ? Math.floor((left + above) / 2)
                : paethPredictor(left, above, upperLeft);
      pixels[targetStart + column] = (raw + predictor) & 0xff;
    }
  }

  return { width, height, colorType, channels, pixels };
}

function encodePng(input: {
  readonly colorType: number;
  readonly channels: number;
  readonly pixels: Buffer;
}): Buffer {
  const rowBytes = SPELL_ICON_SIZE * input.channels;
  const scanlines = Buffer.alloc((rowBytes + 1) * SPELL_ICON_SIZE);
  for (let row = 0; row < SPELL_ICON_SIZE; row += 1) {
    const sourceStart = row * rowBytes;
    const targetStart = row * (rowBytes + 1) + 1;
    input.pixels.copy(
      scanlines,
      targetStart,
      sourceStart,
      sourceStart + rowBytes,
    );
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SPELL_ICON_SIZE, 0);
  ihdr.writeUInt32BE(SPELL_ICON_SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = input.colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(scanlines)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function sourceEntry(clientId: number) {
  return {
    name: `spell-${clientId}`,
    file: `spells/${clientId}.png`,
    cellW: SPELL_ICON_SIZE,
    cellH: SPELL_ICON_SIZE,
    cols: 1,
    groups: {
      kind: 'default',
      patternX: 1,
      patternY: 1,
      patternZ: 1,
      layers: 1,
      phases: [],
      start: 0,
      count: 1,
    },
    flags: {},
  };
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function candidatePath(sourceRoot: string, path: string): string {
  return isAbsolute(path) ? resolve(path) : resolve(sourceRoot, path);
}

async function findAtlasPath(
  sourceRoot: string,
  requestedPath: string | undefined,
  allowMissingAtlas: boolean,
): Promise<string | undefined> {
  const candidates = [
    requestedPath,
    process.env.HUNTBOUND_PERSONAL_SPELL_ATLAS,
    'spell-icons-32x32.png',
    'spells/spell-icons-32x32.png',
    'data/images/game/spells/spell-icons-32x32.png',
  ]
    .filter((path): path is string => path !== undefined)
    .map((path) => candidatePath(sourceRoot, path));

  for (const path of [...new Set(candidates)]) {
    if (await isFile(path)) return path;
  }

  if (allowMissingAtlas) return undefined;

  throw new Error(
    `Spell icon atlas was not found. Pass --atlas or set HUNTBOUND_PERSONAL_SPELL_ATLAS; tried ${candidates.join(', ')}`,
  );
}

function cropIcon(atlas: DecodedPng, clientId: number): Buffer {
  const x = clientId * SPELL_ICON_SIZE;
  if (x + SPELL_ICON_SIZE > atlas.width || SPELL_ICON_SIZE > atlas.height) {
    throw new Error(
      `Spell icon clientId ${clientId} is outside the ${atlas.width}x${atlas.height} atlas`,
    );
  }

  const sourceRowBytes = atlas.width * atlas.channels;
  const targetRowBytes = SPELL_ICON_SIZE * atlas.channels;
  const pixels = Buffer.alloc(targetRowBytes * SPELL_ICON_SIZE);
  for (let row = 0; row < SPELL_ICON_SIZE; row += 1) {
    const sourceStart = row * sourceRowBytes + x * atlas.channels;
    const targetStart = row * targetRowBytes;
    atlas.pixels.copy(
      pixels,
      targetStart,
      sourceStart,
      sourceStart + targetRowBytes,
    );
  }
  return encodePng({
    colorType: atlas.colorType,
    channels: atlas.channels,
    pixels,
  });
}

export type VisibleFallbackKind = 'spell' | 'tile';

export function createVisibleFallbackPng(
  seed: number,
  kind: VisibleFallbackKind = 'spell',
): Buffer {
  const pixels = Buffer.alloc(SPELL_ICON_SIZE * SPELL_ICON_SIZE * 4);
  const spellPalettes = [
    {
      background: [24, 31, 54],
      border: [111, 123, 153],
      rune: [238, 190, 91],
      accent: [89, 172, 220],
    },
    {
      background: [28, 43, 52],
      border: [106, 147, 149],
      rune: [101, 220, 188],
      accent: [225, 202, 104],
    },
    {
      background: [45, 29, 50],
      border: [145, 111, 155],
      rune: [225, 120, 170],
      accent: [244, 193, 91],
    },
    {
      background: [39, 39, 29],
      border: [139, 132, 87],
      rune: [239, 207, 103],
      accent: [173, 112, 66],
    },
  ] as const;
  const tilePalettes = [
    [72, 63, 56],
    [81, 69, 57],
    [67, 67, 61],
    [86, 70, 61],
  ] as const;
  const paletteIndex = Math.abs(seed) % spellPalettes.length;
  const spellPalette = spellPalettes[paletteIndex] ?? spellPalettes[0];
  const tilePalette = tilePalettes[paletteIndex] ?? tilePalettes[0];

  for (let row = 0; row < SPELL_ICON_SIZE; row += 1) {
    for (let column = 0; column < SPELL_ICON_SIZE; column += 1) {
      const offset = (row * SPELL_ICON_SIZE + column) * 4;
      if (kind === 'tile') {
        const block = (Math.floor(row / 8) + Math.floor(column / 8) + seed) % 2;
        const shade = block === 0 ? 0 : 10;
        const seam = row % 8 === 0 || column % 8 === 0;
        pixels[offset] = Math.max(0, tilePalette[0] - shade - (seam ? 18 : 0));
        pixels[offset + 1] = Math.max(
          0,
          tilePalette[1] - shade - (seam ? 15 : 0),
        );
        pixels[offset + 2] = Math.max(
          0,
          tilePalette[2] - shade - (seam ? 12 : 0),
        );
      } else {
        const dx = column - 15.5;
        const dy = row - 15.5;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const ring = radius >= 9 && radius <= 11;
        const cross = Math.abs(dx) <= 1.5 || Math.abs(dy) <= 1.5;
        const diagonal = Math.abs(Math.abs(dx) - Math.abs(dy)) <= 1.2;
        const rune = (ring || cross || diagonal) && radius <= 12;
        const highlight =
          rune &&
          ((row + column + seed) % 5 === 0 ||
            (row * 3 + column + seed) % 11 === 0);
        const border =
          row < 2 ||
          column < 2 ||
          row >= SPELL_ICON_SIZE - 2 ||
          column >= SPELL_ICON_SIZE - 2;
        const color = border
          ? spellPalette.border
          : rune
            ? highlight
              ? spellPalette.accent
              : spellPalette.rune
            : spellPalette.background;
        pixels[offset] = color[0];
        pixels[offset + 1] = color[1];
        pixels[offset + 2] = color[2];
      }
      pixels[offset + 3] = 255;
    }
  }
  return encodePng({ colorType: 6, channels: 4, pixels });
}

function missingAtlasIcon(clientId: number): Buffer {
  return createVisibleFallbackPng(clientId);
}

export interface CropSpellIconAtlasInput {
  readonly sourceRoot: string;
  readonly atlasPath?: string;
  readonly allowMissingAtlas?: boolean;
}

export interface CropSpellIconAtlasResult {
  readonly sourceRoot: string;
  readonly atlasPath?: string;
  readonly usedFallback: boolean;
  readonly paths: readonly string[];
}

export async function cropSpellIconAtlas(
  input: CropSpellIconAtlasInput,
): Promise<CropSpellIconAtlasResult> {
  const sourceRoot = resolve(input.sourceRoot);
  const manifestPath = join(sourceRoot, 'manifest.json');
  const manifestText = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestText) as unknown;
  if (!isRecord(manifest)) throw new Error('Source manifest must be an object');
  if (manifest.spells !== undefined && !isRecord(manifest.spells)) {
    throw new Error('Source manifest field spells must be an object map');
  }

  const existingSpells = isRecord(manifest.spells) ? manifest.spells : {};
  const paths = SPELL_ICON_SPECS.map(
    ({ clientId }) => `spells/${clientId}.png`,
  );
  const outputsExist = await Promise.all(
    paths.map((path) => isFile(join(sourceRoot, path))),
  );
  const needsCrop = outputsExist.some((exists) => !exists);
  let atlasPath: string | undefined;
  let usedFallback = false;

  if (needsCrop) {
    atlasPath = await findAtlasPath(
      sourceRoot,
      input.atlasPath,
      input.allowMissingAtlas === true,
    );
    let outputBytes: readonly {
      readonly clientId: number;
      readonly bytes: Buffer;
    }[];
    if (atlasPath === undefined) {
      outputBytes = SPELL_ICON_SPECS.map(({ clientId }) => ({
        clientId,
        bytes: missingAtlasIcon(clientId),
      }));
    } else {
      const atlas = decodePng(await readFile(atlasPath));
      if (atlas.height !== SPELL_ICON_SIZE) {
        throw new Error(
          `Spell icon atlas must be ${SPELL_ICON_SIZE}px high; got ${atlas.height}px`,
        );
      }
      outputBytes = SPELL_ICON_SPECS.map(({ clientId }) => ({
        clientId,
        bytes: cropIcon(atlas, clientId),
      }));
    }
    usedFallback = atlasPath === undefined;
    await Promise.all(
      outputBytes.map(async ({ clientId, bytes }) => {
        const outputPath = join(sourceRoot, `spells/${clientId}.png`);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, bytes);
      }),
    );
  }

  const spells: JsonRecord = { ...existingSpells };
  for (const { clientId } of SPELL_ICON_SPECS) {
    spells[String(clientId)] = sourceEntry(clientId);
  }
  const updatedManifest = { ...manifest, spells };
  const parsed = parseArenaFableSourceManifest(updatedManifest);
  if (!parsed.ok) {
    throw new Error(
      parsed.diagnostics.map(({ message }) => message).join('\n'),
    );
  }
  await writeFile(
    manifestPath,
    `${JSON.stringify(updatedManifest, null, 2)}\n`,
  );

  return {
    sourceRoot,
    ...(atlasPath === undefined ? {} : { atlasPath }),
    usedFallback,
    paths,
  };
}

function option(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  const value = index < 0 ? undefined : args[index + 1];
  return value === undefined || value.startsWith('--') ? undefined : value;
}

if (import.meta.main) {
  try {
    const sourceRoot =
      option(process.argv.slice(2), '--source-root') ??
      process.env.HUNTBOUND_PERSONAL_ASSET_SOURCE;
    if (sourceRoot === undefined) {
      throw new Error(
        'HUNTBOUND_PERSONAL_ASSET_SOURCE or --source-root is required',
      );
    }
    const atlasPath = option(process.argv.slice(2), '--atlas');
    const result = await cropSpellIconAtlas({
      sourceRoot,
      ...(atlasPath === undefined ? {} : { atlasPath }),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
