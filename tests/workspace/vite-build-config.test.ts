import { describe, expect, it } from 'vitest';

import gameViteConfig from '../../apps/game/vite.config';

describe('game Vite output', () => {
  it('cleans the explicit game output directory before build', () => {
    expect(gameViteConfig.build?.outDir).toBe('../../dist/game');
    expect(gameViteConfig.build?.emptyOutDir).toBe(true);
  });
});
