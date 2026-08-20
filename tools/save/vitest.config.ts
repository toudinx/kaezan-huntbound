import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@huntbound/contracts': resolve(
        import.meta.dirname,
        '../../packages/contracts/src/index.ts',
      ),
      '@huntbound/simulation': resolve(
        import.meta.dirname,
        '../../packages/simulation/src/index.ts',
      ),
      '@huntbound/content': resolve(
        import.meta.dirname,
        '../../packages/content/src/index.ts',
      ),
      '@huntbound/save': resolve(
        import.meta.dirname,
        '../../packages/save/src/index.ts',
      ),
    },
  },
  test: {
    include: ['tools/save/**/*.test.ts'],
    pool: 'forks',
  },
});
