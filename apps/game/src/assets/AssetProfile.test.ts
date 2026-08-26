import { describe, expect, it } from 'vitest';

import {
  getAssetCatalogUrl,
  getHuntAssetCatalogUrl,
  parseAppAssetProfile,
} from './AssetProfile';

const fabricatedHunt = {
  runtimeDirectory: 'fabricated-pack',
} as const;

describe('AssetProfile', () => {
  it.each(['test', 'personal', 'product'] as const)(
    'accepts the %s build mode',
    (mode) => {
      expect(parseAppAssetProfile(mode)).toBe(mode);
    },
  );

  it('rejects an unsupported mode with an actionable message', () => {
    expect(() => parseAppAssetProfile('preview')).toThrowError(
      'Unsupported game asset profile "preview"; use test, personal, or product.',
    );
  });

  it.each(['test', 'personal', 'product'] as const)(
    'composes only the catalog route for %s',
    (profile) => {
      const url = getAssetCatalogUrl(profile);

      expect(url).toBe(`/assets/${profile}/catalog.json`);
      expect(url.startsWith('/assets/')).toBe(true);
      expect(url.endsWith('/catalog' + '.json')).toBe(true);
      expect(url).not.toMatch(/[\\]|:\/\//);
    },
  );

  it.each(['test', 'personal', 'product'] as const)(
    'composes the selected hunt catalog route for %s',
    (profile) => {
      expect(getHuntAssetCatalogUrl(profile, fabricatedHunt)).toBe(
        `/assets/${profile}/fabricated-pack/catalog.json`,
      );
    },
  );
});
