/** Filesystem probes used by the hook adapters. Kept out of `rules.ts` so the rules stay pure. */

import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = (): string =>
  resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function newestMtime(directory: string): number {
  let newest = 0;

  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      continue;
    }

    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtime(path));
      continue;
    }

    try {
      newest = Math.max(newest, statSync(path).mtimeMs);
    } catch {
      // A file that vanished between readdir and stat cannot be the newest one that matters.
    }
  }

  return newest;
}

/**
 * True when the built bundle is older than the game source, which is exactly when a direct
 * `playwright test` run would test a stale `dist/game`. A missing bundle counts as stale.
 */
export function isBundleStale(root = repoRoot()): boolean {
  const source = newestMtime(join(root, 'apps', 'game', 'src'));
  const bundle = newestMtime(join(root, 'dist', 'game'));

  if (source === 0) {
    return false;
  }

  return bundle === 0 || bundle < source;
}
