import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

import { assetProfileGuardPlugin } from '../../tools/asset-packer/vite/assetProfileGuardPlugin.ts';

const assetProfiles = new Set(['test', 'personal', 'product']);

export default defineConfig(({ mode }) => {
  if (!assetProfiles.has(mode)) {
    throw new Error(
      'Unsupported game build mode ' +
        mode +
        '; use test, personal, or product',
    );
  }
  return {
    plugins: [
      assetProfileGuardPlugin({
        profile: mode as 'test' | 'personal' | 'product',
        publicDir: resolve(import.meta.dirname, 'public/assets', mode),
      }),
    ],
    build: {
      outDir: '../../dist/game',
      emptyOutDir: true,
    },
    test: {
      include: ['src/**/*.test.ts'],
    },
  };
});
