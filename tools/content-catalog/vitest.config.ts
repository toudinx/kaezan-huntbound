import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@huntbound/contracts': resolve(
        import.meta.dirname,
        '../../packages/contracts/src/index.ts',
      ),
    },
  },
  test: {
    // Integration tests that read the canary snapshot skip when it is absent;
    // see resolveCanarySourceRoot in application/ContentCatalogApplication.test.ts.
    include: ['tools/content-catalog/**/*.test.ts'],
    pool: 'forks',
  },
});
