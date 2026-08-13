import { readFileSync } from 'node:fs';

// @ts-expect-error Node 24 executes the neighboring TypeScript module directly.
import { type SourceSnapshotLock, verifySourceLock } from './sourceLock.ts';

const [snapshotRoot, lockPath] = process.argv.slice(2);

if (snapshotRoot === undefined || lockPath === undefined) {
  console.error(
    'Usage: node tools/content-catalog/source/verifySourceLock.ts <snapshot-root> <lock-json>',
  );
  process.exitCode = 2;
} else {
  let lock: SourceSnapshotLock | undefined;
  try {
    lock = JSON.parse(readFileSync(lockPath, 'utf8')) as SourceSnapshotLock;
  } catch (error) {
    console.error(
      JSON.stringify({
        code: 'source-lock.invalid-manifest',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 2;
  }

  if (lock !== undefined) {
    const diagnostics = verifySourceLock(snapshotRoot, lock);
    if (diagnostics.length > 0) {
      console.error(JSON.stringify(diagnostics, null, 2));
      process.exitCode = 1;
    } else {
      console.log(
        JSON.stringify({
          ok: true,
          sourceRoot: snapshotRoot,
          commit: lock.commit,
          files: lock.files.length,
        }),
      );
    }
  }
}
