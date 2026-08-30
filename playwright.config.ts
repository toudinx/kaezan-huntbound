import { defineConfig } from '@playwright/test';

import {
  parsePreviewPort,
  previewOrigin,
} from './tests/e2e/support/previewPort.ts';

const previewPort = parsePreviewPort();
const previewUrl = previewOrigin(previewPort);

// Budget specs measure wall-clock time on the developer machine. They detect
// regressions, but a shared machine under load makes them report failures that
// no code change caused, so they live in their own project and never gate a
// merge. Everything else asserts behaviour and does gate.
const budgetSpecs = ['**/boot-budget.spec.ts', '**/hunt-budget.spec.ts'];

// A project-level testIgnore replaces the top-level one instead of extending
// it, so the shared helper tests have to be repeated here or Playwright picks
// up the Vitest suites under support/ and fails collecting them.
const helperTests = '**/support/**/*.test.ts';

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: helperTests,
  outputDir: 'test-results',
  // Naming the projects would otherwise push {-projectName} into every snapshot
  // filename and orphan the baselines committed since PB-00. Drop that segment
  // so the existing golden screenshots keep matching.
  snapshotPathTemplate:
    '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-snapshotSuffix}{ext}',
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  retries: 0,
  use: {
    baseURL: previewUrl,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'correctness', testIgnore: [helperTests, ...budgetSpecs] },
    { name: 'budgets', testIgnore: helperTests, testMatch: budgetSpecs },
  ],
  webServer: {
    command: `corepack pnpm --filter @huntbound/game exec vite preview --mode test --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: previewUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
