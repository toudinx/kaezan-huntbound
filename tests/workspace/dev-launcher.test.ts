import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

import { createDevPlan, parseEnvFile } from '../../tools/dev/start.ts';

describe('dev launcher', () => {
  test('parses the local personal asset source from an env file', () => {
    expect(
      parseEnvFile(
        '# Local-only configuration\nexport HUNTBOUND_PERSONAL_ASSET_SOURCE="C:\\\\Kaezan\\\\assets"\n',
      ),
    ).toEqual({
      HUNTBOUND_PERSONAL_ASSET_SOURCE: 'C:\\Kaezan\\assets',
    });
  });

  test('keeps the test profile plan reproducible without personal assets', () => {
    expect(createDevPlan('test', {})).toEqual({
      ok: true,
      commands: [
        { command: 'corepack pnpm assets:stage:test' },
        {
          command:
            'corepack pnpm --filter @huntbound/game exec vite --mode test',
        },
      ],
      environment: {},
    });
  });

  test('explains how to configure personal dev when the source is missing', () => {
    expect(createDevPlan('personal', {})).toEqual({
      ok: false,
      message: expect.stringContaining(
        'HUNTBOUND_PERSONAL_ASSET_SOURCE is missing',
      ),
    });
  });

  test('builds the personal plan with the configured source', () => {
    const environment = {
      HUNTBOUND_PERSONAL_ASSET_SOURCE: 'C:\\Kaezan\\private-assets',
    };

    expect(createDevPlan('personal', environment)).toEqual({
      ok: true,
      commands: [
        { command: 'corepack pnpm assets:hunt:personal:generate' },
        {
          command:
            'corepack pnpm --filter @huntbound/game exec vite --mode personal',
        },
      ],
      environment,
    });
  });

  test('reuses an existing personal profile without rechecking every pack', () => {
    const environment = {
      HUNTBOUND_PERSONAL_ASSET_SOURCE: 'C:\\Kaezan\\private-assets',
    };

    expect(
      createDevPlan('personal', environment, {
        personalProfileExists: true,
      }),
    ).toEqual({
      ok: true,
      commands: [
        {
          command:
            'corepack pnpm --filter @huntbound/game exec vite --mode personal',
        },
      ],
      environment,
    });
  });

  test('does not start a second server when dev is already running', () => {
    const environment = {
      HUNTBOUND_PERSONAL_ASSET_SOURCE: 'C:\\Kaezan\\private-assets',
    };

    expect(
      createDevPlan('personal', environment, {
        devServerRunning: true,
      }),
    ).toEqual({
      ok: true,
      commands: [],
      environment,
      message: 'Dev server already running at http://localhost:5173/.',
    });
  });

  test('uses personal assets for the default root dev command', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts.start).toBe('corepack pnpm dev');
    expect(packageJson.scripts.dev).toContain('--profile personal');
    expect(packageJson.scripts['dev:test']).toContain('--profile test');
  });
});
