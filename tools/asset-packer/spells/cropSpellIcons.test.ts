import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import {
  HUNT_PACK_SPELL_CLIENT_IDS,
  HUNT_PACK_SPELL_KEYS,
} from '../../../packages/assets/src/index.ts';

import { cropSpellIconAtlas, SPELL_ICON_SPECS } from './cropSpellIcons.ts';

const roots: string[] = [];
const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 0 ? value >>> 1 : 0xedb88320 ^ (value >>> 1);
  }
  crcTable[index] = value >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value = (crcTable[(value ^ byte) & 0xff] ?? 0) ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.byteLength, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(
    crc32(Buffer.concat([typeBytes, Buffer.from(data)])),
    0,
  );
  return Buffer.concat([size, typeBytes, Buffer.from(data), checksum]);
}

function rgbPng(width: number, height: number, pixels: Buffer): Buffer {
  const rowBytes = width * 3;
  const scanlines = Buffer.alloc((rowBytes + 1) * height);
  for (let row = 0; row < height; row += 1) {
    pixels.copy(
      scanlines,
      row * (rowBytes + 1) + 1,
      row * rowBytes,
      (row + 1) * rowBytes,
    );
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;

  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function firstPixel(bytes: Buffer): {
  readonly width: number;
  readonly height: number;
  readonly rgb: readonly number[];
} {
  let offset = signature.length;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + length;
    if (type === 'IHDR') {
      width = bytes.readUInt32BE(start);
      height = bytes.readUInt32BE(start + 4);
    }
    if (type === 'IDAT') idat.push(bytes.subarray(start, end));
    offset = end + 4;
  }
  const scanlines = inflateSync(Buffer.concat(idat));
  return {
    width,
    height,
    rgb: [scanlines[1] ?? 0, scanlines[2] ?? 0, scanlines[3] ?? 0],
  };
}

async function createSourceRoot(): Promise<{
  readonly root: string;
  readonly atlas: string;
}> {
  const root = await mkdtemp(join(tmpdir(), 'huntbound-spell-icons-'));
  roots.push(root);
  const maxClientId = Math.max(
    ...SPELL_ICON_SPECS.map(({ clientId }) => clientId),
  );
  const width = (maxClientId + 1) * 32;
  const pixels = Buffer.alloc(width * 32 * 3);
  for (let clientId = 0; clientId <= maxClientId; clientId += 1) {
    for (let row = 0; row < 32; row += 1) {
      for (let column = 0; column < 32; column += 1) {
        const pixel = (row * width + clientId * 32 + column) * 3;
        pixels[pixel] = clientId;
        pixels[pixel + 1] = 200;
        pixels[pixel + 2] = 100;
      }
    }
  }
  const atlas = join(root, 'spell-icons-32x32.png');
  await writeFile(atlas, rgbPng(width, 32, pixels));
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, 'manifest.json'),
    JSON.stringify({
      outfits: {},
      objects: {},
      effects: {},
      missiles: {},
      semantic: {},
      objectNames: {},
    }),
  );
  return { root, atlas };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('spell icon cropper', () => {
  it('crops every configured clientId into a static source entry', async () => {
    const { root, atlas } = await createSourceRoot();

    const result = await cropSpellIconAtlas({
      sourceRoot: root,
      atlasPath: atlas,
    });

    expect(result.paths).toEqual(
      HUNT_PACK_SPELL_KEYS.map(
        (key) => `spells/${HUNT_PACK_SPELL_CLIENT_IDS.get(key)}.png`,
      ),
    );
    const manifest = JSON.parse(
      await readFile(join(root, 'manifest.json'), 'utf8'),
    ) as {
      readonly spells: Record<string, { readonly file: string }>;
    };
    expect(
      Object.keys(manifest.spells).sort(
        (left, right) => Number(left) - Number(right),
      ),
    ).toEqual(
      SPELL_ICON_SPECS.map(({ clientId }) => String(clientId)).sort(
        (left, right) => Number(left) - Number(right),
      ),
    );

    for (const { clientId } of SPELL_ICON_SPECS) {
      const output = await readFile(join(root, `spells/${clientId}.png`));
      expect(firstPixel(output)).toEqual({
        width: 32,
        height: 32,
        rgb: [clientId, 200, 100],
      });
      expect(manifest.spells[String(clientId)]?.file).toBe(
        `spells/${clientId}.png`,
      );
    }
  });

  it('creates visible local fallback icons when dev allows a missing atlas', async () => {
    const { root } = await createSourceRoot();
    await rm(join(root, 'spell-icons-32x32.png'));

    const result = await cropSpellIconAtlas({
      sourceRoot: root,
      allowMissingAtlas: true,
    });

    expect(result.usedFallback).toBe(true);
    expect(firstPixel(await readFile(join(root, 'spells/2.png')))).toEqual({
      width: 32,
      height: 32,
      rgb: [145, 111, 155],
    });
  });
});
