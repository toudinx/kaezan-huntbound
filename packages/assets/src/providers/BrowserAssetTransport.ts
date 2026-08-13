import { AssetProviderError } from './AssetProviderError.ts';
import type { AssetTransport } from './types.ts';

export type AssetFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export class BrowserAssetTransport implements AssetTransport {
  private readonly fetcher: AssetFetch;

  constructor(fetcher: AssetFetch = globalThis.fetch.bind(globalThis)) {
    this.fetcher = fetcher;
  }

  async readJson(url: string): Promise<unknown> {
    const response = await this.readResponse(url);
    let text: string;
    try {
      text = await response.text();
    } catch (error) {
      throw new AssetProviderError(
        'ASSET_TRANSPORT_FAILED',
        'Unable to read asset JSON',
        [],
        error,
      );
    }

    try {
      return JSON.parse(text) as unknown;
    } catch (error) {
      throw new AssetProviderError(
        'ASSET_JSON_INVALID',
        'Asset JSON is invalid',
        [],
        error,
      );
    }
  }

  async readBytes(url: string): Promise<Uint8Array> {
    const response = await this.readResponse(url);
    try {
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      throw new AssetProviderError(
        'ASSET_TRANSPORT_FAILED',
        'Unable to read asset bytes',
        [],
        error,
      );
    }
  }

  private async readResponse(url: string): Promise<Response> {
    let response: Response;
    try {
      response = await this.fetcher(url);
    } catch (error) {
      throw new AssetProviderError(
        'ASSET_TRANSPORT_FAILED',
        'Unable to fetch asset resource',
        [],
        error,
      );
    }

    if (!response.ok) {
      throw new AssetProviderError(
        'ASSET_TRANSPORT_FAILED',
        'Asset resource request failed',
      );
    }
    return response;
  }
}
