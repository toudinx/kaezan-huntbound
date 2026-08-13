import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { checkContentBoundaries } from './content-boundaries.ts';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('content architecture boundaries', () => {
  it('rejects tooling, source-format, SQLite, and Node imports from runtime paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'huntbound-content-boundaries-'));
    roots.push(root);
    await writeFile(
      join(root, 'runtime.ts'),
      'import "tools/content-catalog/cli";\nimport "./source.xml";\n',
    );
    const diagnostics = await checkContentBoundaries(root, {
      runtimeFiles: [join(root, 'runtime.ts')],
    });
    assert.equal(diagnostics.length, 2);
    assert.match(diagnostics.join('\n'), /tools\/content-catalog/);
    assert.match(diagnostics.join('\n'), /\.xml/);
  });

  it('allows the writer only through the two application services and composition root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'huntbound-writer-boundaries-'));
    roots.push(root);
    const allowed = join(root, 'ImportCanarySlice.ts');
    const forbidden = join(root, 'other.ts');
    await writeFile(
      allowed,
      'import type { CuratedCatalogWriter } from "./internal/CuratedCatalogWriter";\n',
    );
    await writeFile(
      forbidden,
      'import type { CuratedCatalogWriter } from "./internal/CuratedCatalogWriter";\n',
    );
    const diagnostics = await checkContentBoundaries(root, {
      writerFiles: [allowed, forbidden],
      allowedWriterFiles: [allowed],
    });
    assert.equal(diagnostics.length, 1);
    assert.match(diagnostics[0] ?? '', /other\.ts/);
  });
});
