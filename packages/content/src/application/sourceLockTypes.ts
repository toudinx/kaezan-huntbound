export interface LockedSourceFile {
  readonly relativePath: string;
  readonly sha256: string;
  readonly purpose: 'vocations' | 'items' | 'spell' | 'creature';
}

export interface SourceSnapshotLock {
  readonly sourceSystem: 'canary';
  readonly commit: string;
  readonly license: 'GPL-2.0-only';
  readonly licensePath: 'LICENSE';
  readonly licenseSha256: string;
  readonly files: readonly LockedSourceFile[];
}
