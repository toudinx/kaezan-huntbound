import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const SAVE_PUBLISHED_HASH_ARTIFACTS = [
  'checkpoint.golden.json',
  'export.golden.txt',
  'legacy.json',
  'migrated.golden.json',
] as const;

export type SavePublishedHashArtifact =
  (typeof SAVE_PUBLISHED_HASH_ARTIFACTS)[number];

const HASH_ROW = /^\| `([^`]+)` \| `([0-9a-f]{64})` \|$/;
const REQUIRED_ARTIFACTS = new Set<string>(SAVE_PUBLISHED_HASH_ARTIFACTS);

export interface HashDivergence {
  readonly file: string;
  readonly expected: string;
  readonly actual: string;
}

export type CheckPublishedHashesResult =
  | {
      readonly ok: true;
      readonly digests: Readonly<Record<SavePublishedHashArtifact, string>>;
    }
  | {
      readonly ok: false;
      readonly kind: 'divergence';
      readonly divergences: readonly HashDivergence[];
    }
  | {
      readonly ok: false;
      readonly kind: 'invalid-input';
      readonly errors: readonly string[];
    };

/** `a/b/checkpoint.golden.json` -> `a/b/checkpoint.golden.sha256`. */
export function digestPathFor(filePath: string): string {
  const index = filePath.lastIndexOf('.');
  const base = index <= 0 ? filePath : filePath.slice(0, index);
  return `${base}.sha256`;
}

export function sha256Bytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function parsePublishedHashTable(
  markdown: string,
): Map<string, string> | { readonly error: string } {
  const table = new Map<string, string>();
  for (const line of markdown.split(/\r?\n/)) {
    const match = HASH_ROW.exec(line.trimEnd());
    if (match === null || match[1] === undefined || match[2] === undefined) {
      continue;
    }
    const artifact = match[1];
    const digest = match[2];
    if (table.has(artifact)) {
      return { error: `Duplicate hash row for ${artifact}` };
    }
    table.set(artifact, digest);
  }
  if (table.size === 0) {
    return { error: 'hashes.md has no artifact digest rows' };
  }
  return table;
}

async function readUtf8(
  filePath: string,
): Promise<
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly error: string }
> {
  try {
    return { ok: true, text: await readFile(filePath, 'utf8') };
  } catch (error) {
    return {
      ok: false,
      error: `Cannot read ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function readBytes(
  filePath: string,
): Promise<
  | { readonly ok: true; readonly bytes: Buffer }
  | { readonly ok: false; readonly error: string }
> {
  try {
    return { ok: true, bytes: await readFile(filePath) };
  } catch (error) {
    return {
      ok: false,
      error: `Cannot read ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function checkPublishedHashes(
  dir: string,
): Promise<CheckPublishedHashesResult> {
  const hashesPath = join(dir, 'hashes.md');
  const markdown = await readUtf8(hashesPath);
  if (!markdown.ok) {
    return { ok: false, kind: 'invalid-input', errors: [markdown.error] };
  }

  const parsed = parsePublishedHashTable(markdown.text);
  if ('error' in parsed) {
    return { ok: false, kind: 'invalid-input', errors: [parsed.error] };
  }

  const errors: string[] = [];
  for (const artifact of SAVE_PUBLISHED_HASH_ARTIFACTS) {
    if (!parsed.has(artifact)) {
      errors.push(`hashes.md is missing ${artifact}`);
    }
  }
  for (const artifact of parsed.keys()) {
    if (!REQUIRED_ARTIFACTS.has(artifact)) {
      errors.push(`hashes.md has unknown artifact ${artifact}`);
    }
  }
  if (errors.length > 0) {
    return { ok: false, kind: 'invalid-input', errors };
  }

  const divergences: HashDivergence[] = [];
  const digests = {} as Record<SavePublishedHashArtifact, string>;

  for (const artifact of SAVE_PUBLISHED_HASH_ARTIFACTS) {
    const published = parsed.get(artifact);
    if (published === undefined) {
      continue;
    }

    const filePath = join(dir, artifact);
    const sidecarPath = digestPathFor(filePath);
    const file = await readBytes(filePath);
    if (!file.ok) {
      errors.push(file.error);
      continue;
    }
    const sidecar = await readUtf8(sidecarPath);
    if (!sidecar.ok) {
      errors.push(sidecar.error);
      continue;
    }

    const fileDigest = sha256Bytes(file.bytes);
    digests[artifact] = fileDigest;

    if (published !== fileDigest) {
      divergences.push({
        file: hashesPath,
        expected: published,
        actual: fileDigest,
      });
    }
    if (sidecar.text.trim() !== fileDigest) {
      divergences.push({
        file: sidecarPath,
        expected: sidecar.text.trim(),
        actual: fileDigest,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, kind: 'invalid-input', errors };
  }
  if (divergences.length > 0) {
    return { ok: false, kind: 'divergence', divergences };
  }
  return { ok: true, digests };
}
