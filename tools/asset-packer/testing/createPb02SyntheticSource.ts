import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export const PB02_SYNTHETIC_SOURCE_PATHS = [
  'outfits/131.png',
  'outfits/26.png',
  'objects/3031.png',
  'effects/12.png',
  'missiles/36.png',
] as const;

const transparentPixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const transparentPixelSha256 =
  '431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460';

function sourceEntry(file: string) {
  return {
    name: '',
    file,
    cellW: 1,
    cellH: 1,
    cols: 1,
    groups: {
      kind: 'default',
      patternX: 1,
      patternY: 1,
      patternZ: 1,
      layers: 1,
      phases: [[100, 100]],
      start: 0,
      count: 1,
    },
    flags: {},
  };
}

function syntheticManifest() {
  return {
    outfits: {
      '26': sourceEntry(PB02_SYNTHETIC_SOURCE_PATHS[1]),
      '131': sourceEntry(PB02_SYNTHETIC_SOURCE_PATHS[0]),
    },
    objects: { '3031': sourceEntry(PB02_SYNTHETIC_SOURCE_PATHS[2]) },
    effects: { '12': sourceEntry(PB02_SYNTHETIC_SOURCE_PATHS[3]) },
    missiles: { '36': sourceEntry(PB02_SYNTHETIC_SOURCE_PATHS[4]) },
    semantic: {},
    objectNames: {},
  };
}

function canonicalJson(value: unknown): Buffer {
  const pretty = JSON.stringify(value, null, 2).replace(
    /("phases": )\[\n\s+\[\n\s+100,\n\s+100\n\s+\]\n\s+\]/g,
    '$1[[100, 100]]',
  );
  return Buffer.from(`${pretty}\n`, 'utf8');
}

function expectedFiles(): readonly {
  readonly path: string;
  readonly bytes: Buffer;
}[] {
  return [
    { path: 'manifest.json', bytes: canonicalJson(syntheticManifest()) },
    ...PB02_SYNTHETIC_SOURCE_PATHS.map((path) => ({
      path,
      bytes: transparentPixel,
    })),
  ];
}

function defaultDestinationRoot(): string {
  return resolve(
    import.meta.dirname,
    '../../../packages/test-fixtures/assets/pb02/source',
  );
}

async function assertExpectedFiles(
  destinationRoot: string,
  files: readonly { readonly path: string; readonly bytes: Buffer }[],
): Promise<void> {
  for (const file of files) {
    let actual: Buffer;
    try {
      actual = await readFile(join(destinationRoot, file.path));
    } catch {
      throw new Error(`Synthetic source drift: missing ${file.path}`);
    }
    if (!actual.equals(file.bytes)) {
      throw new Error(`Synthetic source drift: ${file.path} differs`);
    }
  }
}

export async function createPb02SyntheticSource(
  options: { readonly destinationRoot?: string; readonly check?: boolean } = {},
): Promise<void> {
  const destinationRoot = options.destinationRoot ?? defaultDestinationRoot();
  const files = expectedFiles();
  const actualHash = createHash('sha256')
    .update(transparentPixel)
    .digest('hex');
  if (
    transparentPixel.byteLength !== 68 ||
    actualHash !== transparentPixelSha256
  ) {
    throw new Error('Synthetic source pixel constant is invalid');
  }

  if (options.check === true) {
    await assertExpectedFiles(destinationRoot, files);
    return;
  }

  await Promise.all(
    files.map((file) =>
      mkdir(dirname(join(destinationRoot, file.path)), { recursive: true }),
    ),
  );
  await Promise.all(
    files.map((file) =>
      writeFile(join(destinationRoot, file.path), file.bytes),
    ),
  );
}

if (import.meta.main) {
  try {
    await createPb02SyntheticSource({
      check: process.argv.includes('--check'),
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
