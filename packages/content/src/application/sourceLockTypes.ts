/**
 * `appearances`, `map` and `spawn` were added by PB-04-04. They are locked for
 * the tile flags table and the region extractor, not for the curated slice, so
 * they carry the same frozen provenance without joining the catalog import.
 */
export type LockedSourcePurpose =
  | 'vocations'
  | 'items'
  | 'spell'
  | 'creature'
  | 'appearances'
  | 'map'
  | 'spawn';

export interface LockedSourceFile {
  readonly relativePath: string;
  readonly sha256: string;
  readonly purpose: LockedSourcePurpose;
}

export interface SourceSnapshotLock {
  readonly sourceSystem: 'canary';
  readonly commit: string;
  readonly license: 'GPL-2.0-only';
  readonly licensePath: 'LICENSE';
  readonly licenseSha256: string;
  readonly files: readonly LockedSourceFile[];
}
