import { describe, expect, it } from 'vitest';

import gameViteConfigFactory from '../../apps/game/vite.config';

describe('game Vite output', () => {
  it('cleans the explicit game output directory before build', () => {
    const gameViteConfig = gameViteConfigFactory({
      command: 'build',
      mode: 'test',
    });
    expect(gameViteConfig.build?.outDir).toBe('../../dist/game');
    expect(gameViteConfig.build?.emptyOutDir).toBe(true);
  });

  it('rejects an unprofiled build mode', () => {
    expect(() =>
      gameViteConfigFactory({
        command: 'build',
        mode: 'production',
      }),
    ).toThrow('Unsupported game build mode production');
  });
});
