import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    outDir: '../../dist/game',
    emptyOutDir: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
