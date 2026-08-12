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
    include: ['tools/content-catalog/**/*.test.ts'],
    pool: 'forks',
  },
});
