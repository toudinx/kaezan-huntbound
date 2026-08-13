import type {
  AssetDiagnostic,
  AssetDiagnosticCode,
} from '../manifest/diagnostics.ts';

export type AssetProviderErrorCode =
  | AssetDiagnosticCode
  | 'ASSET_CATALOG_PROFILE_MISMATCH'
  | 'ASSET_TRANSPORT_FAILED'
  | 'ASSET_JSON_INVALID'
  | 'ASSET_PACK_HASH_MISMATCH'
  | 'ASSET_MEDIA_URL_CREATE_FAILED';

export class AssetProviderError extends Error {
  readonly code: AssetProviderErrorCode;
  readonly diagnostics: readonly AssetDiagnostic[];

  constructor(
    code: AssetProviderErrorCode,
    message: string,
    diagnostics: readonly AssetDiagnostic[] = [],
    cause?: unknown,
  ) {
    super(
      message,
      cause === undefined
        ? undefined
        : {
            cause,
          },
    );
    this.name = 'AssetProviderError';
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

export function createAssetDiagnostic(
  code: AssetDiagnosticCode,
  path: readonly (string | number)[],
  message: string,
  options: {
    readonly key?: AssetDiagnostic['key'];
    readonly packId?: string;
  } = {},
): AssetDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    path,
    ...(options.key === undefined ? {} : { key: options.key }),
    ...(options.packId === undefined ? {} : { packId: options.packId }),
  };
}
