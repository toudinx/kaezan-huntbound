import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@huntbound/assets': resolve(
        import.meta.dirname,
        '../../packages/assets/src/index.ts',
      ),
      '@huntbound/contracts': resolve(
        import.meta.dirname,
        '../../packages/contracts/src/index.ts',
      ),
    },
  },
  test: {
    include: ['tools/asset-packer/**/*.test.ts'],
    pool: 'forks',
  },
});
