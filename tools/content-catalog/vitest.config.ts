import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tools/content-catalog/**/*.test.ts'],
    pool: 'forks',
  },
});
