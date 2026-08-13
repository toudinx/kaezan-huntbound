import type { AssetMediaUrlStore } from './types.ts';

export class BrowserAssetMediaUrlStore implements AssetMediaUrlStore {
  create(bytes: Uint8Array, mimeType: 'image/png'): string {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const blob = new Blob([buffer], { type: mimeType });
    return URL.createObjectURL(blob);
  }

  revoke(url: string): void {
    URL.revokeObjectURL(url);
  }
}

export function createBrowserAssetMediaUrlStore(): AssetMediaUrlStore {
  return new BrowserAssetMediaUrlStore();
}
