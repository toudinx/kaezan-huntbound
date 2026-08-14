import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SourceSnapshotLock } from '../../packages/content/src/application/sourceLockTypes.ts';
import { resolveHuntSources } from './sources.ts';

const MAP_BYTES = 'pretend-otbm';
const SPAWN_BYTES = '<?xml version="1.0"?><monsters></monsters>';

/** sha256 of the fixture payloads, computed the same way the resolver does. */
const MAP_SHA =
  'ab8ea1a35d69a2f4b4a97d8ac25e4a2f7e01b98b0b5c4c92e14b4a4a4a1ab6ab';
const SPAWN_SHA =
  'cd8ea1a35d69a2f4b4a97d8ac25e4a2f7e01b98b0b5c4c92e14b4a4a4a1ab6cd';

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

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'hunt-sources-'));
  mkdirSync(join(root, 'data-canary', 'world'), { recursive: true });
  mkdirSync(join(root, 'data-otservbr-global', 'world'), { recursive: true });
  writeFileSync(join(root, 'data-canary', 'world', 'canary.otbm'), MAP_BYTES);
  writeFileSync(
    join(root, 'data-otservbr-global', 'world', 'otservbr-monster.xml'),
    SPAWN_BYTES,
    'latin1',
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Reads the digest the resolver reports so the fixtures stay self-checking. */
function digests() {
  const resolved = resolveHuntSources(
    lock([
      {
        relativePath: 'data-canary/world/canary.otbm',
        sha256: 'skip',
        purpose: 'map',
      },
      {
        relativePath: 'data-otservbr-global/world/otservbr-monster.xml',
        sha256: 'skip',
        purpose: 'spawn',
      },
    ]),
    root,
    { verifyHashes: false },
  );
  if (!resolved.ok) throw new Error('fixture resolve failed');
  return { map: resolved.map.sha256, spawn: resolved.spawn.sha256 };
}

describe('resolveHuntSources', () => {
  it('resolves the map and the spawn file by purpose, not by hard-coded path', () => {
    const actual = digests();
    const resolved = resolveHuntSources(
      lock([
        {
          relativePath: 'data-canary/world/canary.otbm',
          sha256: actual.map,
          purpose: 'map',
        },
        {
          relativePath: 'data-otservbr-global/world/otservbr-monster.xml',
          sha256: actual.spawn,
          purpose: 'spawn',
        },
      ]),
      root,
    );

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.map.relativePath).toBe('data-canary/world/canary.otbm');
    expect(resolved.spawn.relativePath).toBe(
      'data-otservbr-global/world/otservbr-monster.xml',
    );
    expect(resolved.map.bytes).toBeInstanceOf(Uint8Array);
    expect(resolved.spawn.text).toBe(SPAWN_BYTES);
  });

  it('follows the lock when the map entry names a different file', () => {
    writeFileSync(
      join(root, 'data-otservbr-global', 'world', 'otservbr.otbm'),
      MAP_BYTES,
    );
    const actual = digests();
    const resolved = resolveHuntSources(
      lock([
        {
          relativePath: 'data-otservbr-global/world/otservbr.otbm',
          sha256: actual.map,
          purpose: 'map',
        },
        {
          relativePath: 'data-otservbr-global/world/otservbr-monster.xml',
          sha256: actual.spawn,
          purpose: 'spawn',
        },
      ]),
      root,
    );

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.map.relativePath).toBe(
      'data-otservbr-global/world/otservbr.otbm',
    );
  });

  it('rejects a lock without a map entry', () => {
    const resolved = resolveHuntSources(
      lock([
        {
          relativePath: 'data-otservbr-global/world/otservbr-monster.xml',
          sha256: digests().spawn,
          purpose: 'spawn',
        },
      ]),
      root,
    );

    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.diagnostics.map((item) => item.code)).toEqual([
      'HUNT_SOURCE_NOT_LOCKED',
    ]);
    expect(resolved.diagnostics[0]?.message).toContain('map');
  });

  it('rejects a lock that declares the same purpose twice', () => {
    const actual = digests();
    const resolved = resolveHuntSources(
      lock([
        {
          relativePath: 'data-canary/world/canary.otbm',
          sha256: actual.map,
          purpose: 'map',
        },
        {
          relativePath: 'data-otservbr-global/world/otservbr-monster.xml',
          sha256: actual.spawn,
          purpose: 'spawn',
        },
        {
          relativePath:
            'data-otservbr-global/world/custom/otservbr-custom.otbm',
          sha256: actual.map,
          purpose: 'map',
        },
      ]),
      root,
    );

    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.diagnostics.map((item) => item.code)).toEqual([
      'HUNT_SOURCE_AMBIGUOUS',
    ]);
  });

  it('rejects a digest that disagrees with the lock', () => {
    const resolved = resolveHuntSources(
      lock([
        {
          relativePath: 'data-canary/world/canary.otbm',
          sha256: MAP_SHA,
          purpose: 'map',
        },
        {
          relativePath: 'data-otservbr-global/world/otservbr-monster.xml',
          sha256: SPAWN_SHA,
          purpose: 'spawn',
        },
      ]),
      root,
    );

    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.diagnostics.map((item) => item.code)).toEqual([
      'HUNT_SOURCE_HASH_MISMATCH',
      'HUNT_SOURCE_HASH_MISMATCH',
    ]);
    expect(resolved.diagnostics[0]?.message).toContain(MAP_SHA);
  });

  it('rejects a locked file that is missing from the snapshot', () => {
    rmSync(join(root, 'data-canary', 'world', 'canary.otbm'));
    const resolved = resolveHuntSources(
      lock([
        {
          relativePath: 'data-canary/world/canary.otbm',
          sha256: MAP_SHA,
          purpose: 'map',
        },
        {
          relativePath: 'data-otservbr-global/world/otservbr-monster.xml',
          sha256: SPAWN_SHA,
          purpose: 'spawn',
        },
      ]),
      root,
    );

    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.diagnostics[0]?.code).toBe('HUNT_SOURCE_MISSING');
  });

  it('refuses a locked path that escapes the snapshot root', () => {
    const resolved = resolveHuntSources(
      lock([
        {
          relativePath: '../outside.otbm',
          sha256: MAP_SHA,
          purpose: 'map',
        },
        {
          relativePath: 'data-otservbr-global/world/otservbr-monster.xml',
          sha256: digests().spawn,
          purpose: 'spawn',
        },
      ]),
      root,
    );

    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.diagnostics[0]?.code).toBe('HUNT_SOURCE_PATH_INVALID');
  });

  it('reads the spawn XML as latin1 so its bytes round-trip', () => {
    const accented = '<?xml version="1.0"?><monsters>ã</monsters>';
    writeFileSync(
      join(root, 'data-otservbr-global', 'world', 'otservbr-monster.xml'),
      accented,
      'latin1',
    );
    const actual = digests();
    const resolved = resolveHuntSources(
      lock([
        {
          relativePath: 'data-canary/world/canary.otbm',
          sha256: actual.map,
          purpose: 'map',
        },
        {
          relativePath: 'data-otservbr-global/world/otservbr-monster.xml',
          sha256: actual.spawn,
          purpose: 'spawn',
        },
      ]),
      root,
    );

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.spawn.text).toBe(accented);
  });
});
