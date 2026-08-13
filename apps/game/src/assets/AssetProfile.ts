export type AppAssetProfile = 'test' | 'personal' | 'product';

export function parseAppAssetProfile(mode: string): AppAssetProfile {
  if (mode === 'test' || mode === 'personal' || mode === 'product') {
    return mode;
  }

  throw new Error(
    'Unsupported game asset profile "' +
      mode +
      '"; use test, personal, or product.',
  );
}

export function getAssetCatalogUrl(profile: AppAssetProfile): string {
  return `/assets/${profile}/catalog.json`;
}
