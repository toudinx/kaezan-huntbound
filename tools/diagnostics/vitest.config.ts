import { defineConfig } from 'vitest/config';

// The root Vitest config only collects `tests/**`. The diagnostic harness lives
// under `tools/`, so its pure unit test needs its own collection root. Nothing
// else about the root config is changed or overridden.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tools/diagnostics/**/*.test.ts'],
  },
});
