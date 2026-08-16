import { describe, expect, it } from 'vitest';
import {
  inspectCommand,
  inspectFileEdit,
} from '../../tools/agent-hooks/rules.ts';

describe('inspectCommand — package manager', () => {
  it('denies npm', () => {
    expect(inspectCommand('npm install', { bundleStale: false }).verdict).toBe(
      'deny',
    );
  });

  it('denies yarn', () => {
    expect(inspectCommand('yarn add zod', { bundleStale: false }).verdict).toBe(
      'deny',
    );
  });

  it('denies bare pnpm', () => {
    expect(inspectCommand('pnpm test', { bundleStale: false }).verdict).toBe(
      'deny',
    );
  });

  it('allows pnpm through corepack', () => {
    expect(
      inspectCommand('corepack pnpm test', { bundleStale: false }).verdict,
    ).toBe('allow');
  });

  it('inspects every segment of a compound command', () => {
    expect(
      inspectCommand('cd apps/game && npm i', { bundleStale: false }).verdict,
    ).toBe('deny');
  });

  it('allows npx, used to start MCP servers', () => {
    expect(
      inspectCommand('npx -y @modelcontextprotocol/server-filesystem .', {
        bundleStale: false,
      }).verdict,
    ).toBe('allow');
  });
});

describe('inspectCommand — git safety', () => {
  it('denies --no-verify', () => {
    expect(
      inspectCommand('git commit --no-verify -m wip', { bundleStale: false })
        .verdict,
    ).toBe('deny');
  });

  it('denies force push', () => {
    expect(
      inspectCommand('git push --force origin main', { bundleStale: false })
        .verdict,
    ).toBe('deny');
  });

  it('denies force push in short form', () => {
    expect(
      inspectCommand('git push -f origin main', { bundleStale: false }).verdict,
    ).toBe('deny');
  });

  it('asks before a hard reset', () => {
    expect(
      inspectCommand('git reset --hard HEAD~1', { bundleStale: false }).verdict,
    ).toBe('ask');
  });

  it('asks before removing a worktree, which usually fails on node_modules', () => {
    expect(
      inspectCommand('git worktree remove .worktrees/pb-04-fix-02', {
        bundleStale: false,
      }).verdict,
    ).toBe('ask');
  });

  it('denies force-adding ignored personal assets', () => {
    expect(
      inspectCommand(
        'git add -f apps/game/public/assets/personal/pb04/pack.json',
        {
          bundleStale: false,
        },
      ).verdict,
    ).toBe('deny');
  });

  it('allows an ordinary commit', () => {
    expect(
      inspectCommand('git commit -m "feat: x"', { bundleStale: false }).verdict,
    ).toBe('allow');
  });
});

describe('inspectCommand — stale browser bundle', () => {
  it('denies a direct playwright run when dist is older than apps/game/src', () => {
    const decision = inspectCommand('corepack pnpm exec playwright test', {
      bundleStale: true,
    });
    expect(decision.verdict).toBe('deny');
    expect(decision.reason).toContain('build');
  });

  it('allows a direct playwright run when the bundle is fresh', () => {
    expect(
      inspectCommand('corepack pnpm exec playwright test', {
        bundleStale: false,
      }).verdict,
    ).toBe('allow');
  });

  it('allows qa:browser, which builds first', () => {
    expect(
      inspectCommand('corepack pnpm qa:browser', { bundleStale: true }).verdict,
    ).toBe('allow');
  });

  it('allows a build chained before playwright', () => {
    expect(
      inspectCommand(
        'corepack pnpm build && corepack pnpm exec playwright test',
        {
          bundleStale: true,
        },
      ).verdict,
    ).toBe('allow');
  });
});

describe('inspectFileEdit — generated artifacts', () => {
  it('denies generated content', () => {
    expect(
      inspectFileEdit('packages/content/src/generated/tile-flags.json').verdict,
    ).toBe('deny');
  });

  it('denies expected fixtures', () => {
    expect(
      inspectFileEdit(
        'packages/test-fixtures/assets/pb04/expected/test/packs/pack.json',
      ).verdict,
    ).toBe('deny');
  });

  it('denies replay goldens', () => {
    expect(
      inspectFileEdit('packages/test-fixtures/hunt/pb04/snapshot.golden.json')
        .verdict,
    ).toBe('deny');
  });

  it('denies staged asset packs', () => {
    expect(
      inspectFileEdit('apps/game/public/assets/test/pb04/pack.json').verdict,
    ).toBe('deny');
  });

  it('normalises Windows separators and absolute paths', () => {
    expect(
      inspectFileEdit(
        'C:\\Kaezan\\kaezan-huntbound\\packages\\content\\src\\generated\\hunts\\a.json',
      ).verdict,
    ).toBe('deny');
  });

  it('allows the curated selection that feeds the generator', () => {
    expect(
      inspectFileEdit(
        'packages/content/src/selections/hunts/venore-rotworm-cave.json',
      ).verdict,
    ).toBe('allow');
  });

  it('allows ordinary source', () => {
    expect(inspectFileEdit('apps/game/src/main.ts').verdict).toBe('allow');
  });
});
