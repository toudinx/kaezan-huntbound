import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SourceSnapshotLock } from '../../packages/content/src/application/sourceLockTypes.ts';
import type { HuntSelectionSource } from '../hunt-selection/types.ts';
import { resolveHuntSources } from './sources.ts';

const MAP_BYTES = 'pretend-otbm';
const OTHER_MAP_BYTES = 'a different pretend otbm';
const SPAWN_BYTES = '<?xml version="1.0"?><monsters></monsters>';

const CANARY_MAP = 'data-canary/world/canary.otbm';
const GLOBAL_MAP = 'data-otservbr-global/world/otservbr.otbm';
const SPAWNS = 'data-otservbr-global/world/otservbr-monster.xml';

const WRONG_SHA =
  'ab8ea1a35d69a2f4b4a97d8ac25e4a2f7e01b98b0b5c4c92e14b4a4a4a1ab6ab';

let root = '';

function lock(files: SourceSnapshotLock['files']): SourceSnapshotLock {
  return {
    sourceSystem: 'canary',
    commit: '157e6f9e21318bd3033eea553fe9275b429faf72',
    license: 'GPL-2.0-only',
    licensePath: 'LICENSE',
    licenseSha256: 'x'.repeat(64),
    files,
  };
}

function source(map: string, spawns = SPAWNS): HuntSelectionSource {
  return { map, spawns };
}

/** Digest of a snapshot file, discovered the way the resolver computes it. */
function digestOf(relativePath: string): string {
  const resolved = resolveHuntSources(
    lock([
      { relativePath, sha256: 'skip', purpose: 'map' },
      { relativePath: SPAWNS, sha256: 'skip', purpose: 'spawn' },
    ]),
    root,
    source(relativePath),
    { verifyHashes: false },
  );
  if (!resolved.ok)
    throw new Error(`fixture resolve failed for ${relativePath}`);
  return resolved.map.sha256;
}

/** A lock that freezes both maps and the spawn file, all with real digests. */
function fullLock(): SourceSnapshotLock {
  return lock([
    { relativePath: CANARY_MAP, sha256: digestOf(CANARY_MAP), purpose: 'map' },
    { relativePath: GLOBAL_MAP, sha256: digestOf(GLOBAL_MAP), purpose: 'map' },
    {
      relativePath: SPAWNS,
      sha256: digestOf(CANARY_MAP) === '' ? '' : spawnDigest(),
      purpose: 'spawn',
    },
  ]);
}

function spawnDigest(): string {
  const resolved = resolveHuntSources(
    lock([
      { relativePath: CANARY_MAP, sha256: 'skip', purpose: 'map' },
      { relativePath: SPAWNS, sha256: 'skip', purpose: 'spawn' },
    ]),
    root,
    source(CANARY_MAP),
    { verifyHashes: false },
  );
  if (!resolved.ok) throw new Error('fixture resolve failed for spawns');
  return resolved.spawn.sha256;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'hunt-sources-'));
  mkdirSync(join(root, 'data-canary', 'world'), { recursive: true });
  mkdirSync(join(root, 'data-otservbr-global', 'world'), { recursive: true });
  writeFileSync(join(root, ...CANARY_MAP.split('/')), MAP_BYTES);
  writeFileSync(join(root, ...GLOBAL_MAP.split('/')), OTHER_MAP_BYTES);
  writeFileSync(join(root, ...SPAWNS.split('/')), SPAWN_BYTES, 'latin1');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('resolveHuntSources', () => {
  it('reads the map the selection names', () => {
    const resolved = resolveHuntSources(fullLock(), root, source(CANARY_MAP));

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.map.relativePath).toBe(CANARY_MAP);
    expect(resolved.spawn.relativePath).toBe(SPAWNS);
    expect(resolved.spawn.text).toBe(SPAWN_BYTES);
  });

  it('lets a second hunt name a different map from the same lock', () => {
    const first = resolveHuntSources(fullLock(), root, source(CANARY_MAP));
    const second = resolveHuntSources(fullLock(), root, source(GLOBAL_MAP));

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.map.relativePath).toBe(CANARY_MAP);
    expect(second.map.relativePath).toBe(GLOBAL_MAP);
    expect(first.map.sha256).not.toBe(second.map.sha256);
  });

  it('rejects a map the lock does not freeze', () => {
    const partial = lock([
      {
        relativePath: CANARY_MAP,
        sha256: digestOf(CANARY_MAP),
        purpose: 'map',
      },
      { relativePath: SPAWNS, sha256: spawnDigest(), purpose: 'spawn' },
    ]);

    const resolved = resolveHuntSources(partial, root, source(GLOBAL_MAP));

    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.diagnostics[0]?.code).toBe('HUNT_SOURCE_NOT_LOCKED');
    expect(resolved.diagnostics[0]?.message).toContain(GLOBAL_MAP);
  });

  it('names the missing file when the lock freezes a map the snapshot lacks', () => {
    const locked = fullLock();
    rmSync(join(root, ...GLOBAL_MAP.split('/')));

    const resolved = resolveHuntSources(locked, root, source(GLOBAL_MAP));

    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.diagnostics[0]?.code).toBe('HUNT_SOURCE_MISSING');
    expect(resolved.diagnostics[0]?.message).toContain(GLOBAL_MAP);
  });

  it('rejects a digest that disagrees with the lock', () => {
    const tampered = lock([
      { relativePath: CANARY_MAP, sha256: WRONG_SHA, purpose: 'map' },
      { relativePath: SPAWNS, sha256: spawnDigest(), purpose: 'spawn' },
    ]);

    const resolved = resolveHuntSources(tampered, root, source(CANARY_MAP));

    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.diagnostics[0]?.code).toBe('HUNT_SOURCE_HASH_MISMATCH');
    expect(resolved.diagnostics[0]?.message).toContain(WRONG_SHA);
  });

  it('refuses a selection path that escapes the snapshot root', () => {
    const resolved = resolveHuntSources(
      fullLock(),
      root,
      source('../outside.otbm'),
    );

    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.diagnostics[0]?.code).toBe('HUNT_SOURCE_PATH_INVALID');
  });

  it('rejects a lock that freezes the same path twice', () => {
    const duplicated = lock([
      {
        relativePath: CANARY_MAP,
        sha256: digestOf(CANARY_MAP),
        purpose: 'map',
      },
      { relativePath: CANARY_MAP, sha256: WRONG_SHA, purpose: 'map' },
      { relativePath: SPAWNS, sha256: spawnDigest(), purpose: 'spawn' },
    ]);

    const resolved = resolveHuntSources(duplicated, root, source(CANARY_MAP));

    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.diagnostics[0]?.code).toBe('HUNT_SOURCE_AMBIGUOUS');
  });

  it('reads the spawn XML as latin1 so its bytes round-trip', () => {
    const accented = '<?xml version="1.0"?><monsters>ã</monsters>';
    writeFileSync(join(root, ...SPAWNS.split('/')), accented, 'latin1');

    const resolved = resolveHuntSources(fullLock(), root, source(CANARY_MAP));

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.spawn.text).toBe(accented);
  });

  it('reports both problems when the map and the spawn file are unlocked', () => {
    const empty = lock([]);

    const resolved = resolveHuntSources(empty, root, source(CANARY_MAP));

    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.diagnostics.map((item) => item.code)).toEqual([
      'HUNT_SOURCE_NOT_LOCKED',
      'HUNT_SOURCE_NOT_LOCKED',
    ]);
  });
});
