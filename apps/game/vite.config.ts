import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    outDir: '../../dist/game',
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
