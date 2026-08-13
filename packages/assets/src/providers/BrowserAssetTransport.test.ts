import { describe, expect, it } from 'vitest';

import {
  AssetProviderError,
  BrowserAssetTransport,
  digestSha256,
} from '../index.ts';

function response(body: string, ok = true): Response {
  return new Response(body, { status: ok ? 200 : 404 });
}

describe('BrowserAssetTransport', () => {
  it('parses JSON from response text and reads bytes', async () => {
    const requests: string[] = [];
    const transport = new BrowserAssetTransport(async (url) => {
      requests.push(String(url));
      return response('{"ready":true}');
    });

    await expect(
      transport.readJson('https://assets.test/catalog.json'),
    ).resolves.toEqual({
      ready: true,
    });
    await expect(
      transport.readBytes('https://assets.test/asset.png'),
    ).resolves.toEqual(new TextEncoder().encode('{"ready":true}'));
    expect(requests).toEqual([
      'https://assets.test/catalog.json',
      'https://assets.test/asset.png',
    ]);
  });

  it('returns typed errors for HTTP failures and malformed JSON', async () => {
    const failedTransport = new BrowserAssetTransport(async () =>
      response('', false),
    );
    await expect(
      failedTransport.readBytes('https://assets.test/missing.png'),
    ).rejects.toMatchObject({
      code: 'ASSET_TRANSPORT_FAILED',
    });

    const invalidTransport = new BrowserAssetTransport(async () =>
      response('{'),
    );
    try {
      await invalidTransport.readJson('https://assets.test/invalid.json');
      throw new Error('Expected malformed JSON to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(AssetProviderError);
      expect(error).toMatchObject({ code: 'ASSET_JSON_INVALID' });
      expect((error as AssetProviderError).message).not.toContain('{');
    }
  });
});

describe('digestSha256', () => {
  it('returns lowercase hexadecimal Web Crypto SHA-256', async () => {
    await expect(digestSha256(new TextEncoder().encode('abc'))).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
