import { AssetProviderError } from './AssetProviderError.ts';

export async function digestSha256(bytes: Uint8Array): Promise<string> {
  if (globalThis.crypto?.subtle === undefined) {
    throw new AssetProviderError(
      'ASSET_TRANSPORT_FAILED',
      'Web Crypto SHA-256 is unavailable',
    );
  }

  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}
