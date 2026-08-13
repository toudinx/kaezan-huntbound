import type { z } from 'zod';

import { type AssetKey, AssetKeySchema } from './identity.ts';
import {
  type AssetPackCatalog,
  AssetPackCatalogSchema,
  type AssetPackManifest,
  AssetPackManifestSchema,
  type AssetSelectionManifest,
  AssetSelectionManifestSchema,
  type AssetSourceLock,
  AssetSourceLockSchema,
} from './schemas.ts';

export type AssetDiagnosticCode =
  | 'ASSET_SCHEMA_INVALID'
  | 'ASSET_PATH_UNSAFE'
  | 'ASSET_KEY_DUPLICATE'
  | 'ASSET_ID_DUPLICATE'
  | 'ASSET_CATEGORY_MISMATCH'
  | 'ASSET_REFERENCE_MISSING'
  | 'ASSET_MEDIA_MISSING'
  | 'ASSET_MEDIA_SIZE_MISMATCH'
  | 'ASSET_MEDIA_HASH_MISMATCH'
  | 'ASSET_ANIMATION_INVALID'
  | 'ASSET_PROFILE_FORBIDDEN'
  | 'ASSET_LICENSE_FORBIDDEN'
  | 'ASSET_PACK_CONFLICT'
  | 'ASSET_PACK_NOT_LOADED'
  | 'ASSET_KEY_UNAVAILABLE';

export interface AssetDiagnostic {
  readonly code: AssetDiagnosticCode;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly path: readonly (string | number)[];
  readonly key?: AssetKey;
  readonly packId?: string;
}

export type AssetValidationResult<T = unknown> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly diagnostics: readonly AssetDiagnostic[] };

const diagnosticCodes = new Set<AssetDiagnosticCode>([
  'ASSET_SCHEMA_INVALID',
  'ASSET_PATH_UNSAFE',
  'ASSET_KEY_DUPLICATE',
  'ASSET_ID_DUPLICATE',
  'ASSET_CATEGORY_MISMATCH',
  'ASSET_REFERENCE_MISSING',
  'ASSET_MEDIA_MISSING',
  'ASSET_MEDIA_SIZE_MISMATCH',
  'ASSET_MEDIA_HASH_MISMATCH',
  'ASSET_ANIMATION_INVALID',
  'ASSET_PROFILE_FORBIDDEN',
  'ASSET_LICENSE_FORBIDDEN',
  'ASSET_PACK_CONFLICT',
  'ASSET_PACK_NOT_LOADED',
  'ASSET_KEY_UNAVAILABLE',
]);

type ZodIssueLike = {
  readonly code: string;
  readonly message: string;
  readonly path: readonly PropertyKey[];
  readonly params?: Record<string, unknown>;
};

function isDiagnosticCode(value: unknown): value is AssetDiagnosticCode {
  return (
    typeof value === 'string' &&
    diagnosticCodes.has(value as AssetDiagnosticCode)
  );
}

function formatPath(path: readonly PropertyKey[]): string {
  return path
    .map((segment) =>
      typeof segment === 'number' ? `[${segment}]` : String(segment),
    )
    .join('.')
    .replaceAll('.[', '[');
}

function comparePaths(
  left: readonly (string | number)[],
  right: readonly (string | number)[],
): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftSegment = left[index];
    const rightSegment = right[index];
    if (leftSegment === rightSegment) {
      continue;
    }
    if (typeof leftSegment === 'number' && typeof rightSegment === 'number') {
      return leftSegment - rightSegment;
    }
    return String(leftSegment).localeCompare(String(rightSegment));
  }
  return left.length - right.length;
}

function sortDiagnostics(
  diagnostics: readonly AssetDiagnostic[],
): readonly AssetDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const pathOrder = comparePaths(left.path, right.path);
    if (pathOrder !== 0) {
      return pathOrder;
    }
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0
      ? codeOrder
      : left.message.localeCompare(right.message);
  });
}

export function diagnosticsFromZodError(
  error: z.ZodError,
): readonly AssetDiagnostic[] {
  const diagnostics = error.issues.map((rawIssue) => {
    const issue = rawIssue as ZodIssueLike;
    const path = issue.path.map((segment) =>
      typeof segment === 'symbol' ? String(segment) : segment,
    );
    const code = isDiagnosticCode(issue.params?.assetCode)
      ? issue.params.assetCode
      : 'ASSET_SCHEMA_INVALID';
    const pathText = formatPath(path);
    const keyResult = AssetKeySchema.safeParse(issue.params?.assetKey);
    return {
      code,
      severity: 'error' as const,
      message:
        pathText.length > 0 ? `${pathText}: ${issue.message}` : issue.message,
      path,
      ...(keyResult.success ? { key: keyResult.data } : {}),
      ...(typeof issue.params?.packId === 'string'
        ? { packId: issue.params.packId }
        : {}),
    } satisfies AssetDiagnostic;
  });

  return sortDiagnostics(diagnostics);
}

function validateSchema<T>(
  schema: {
    safeParse(
      input: unknown,
    ): { success: true; data: T } | { success: false; error: z.ZodError };
  },
  input: unknown,
): AssetValidationResult<T> {
  const result = schema.safeParse(input);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, diagnostics: diagnosticsFromZodError(result.error) };
}

export function validateAssetSelectionManifest(
  input: unknown,
): AssetValidationResult<AssetSelectionManifest> {
  return validateSchema(AssetSelectionManifestSchema, input);
}

export function validateAssetSourceLock(
  input: unknown,
): AssetValidationResult<AssetSourceLock> {
  return validateSchema(AssetSourceLockSchema, input);
}

export function validateAssetPackManifest(
  input: unknown,
): AssetValidationResult<AssetPackManifest> {
  return validateSchema(AssetPackManifestSchema, input);
}

export function validateAssetPackCatalog(
  input: unknown,
): AssetValidationResult<AssetPackCatalog> {
  return validateSchema(AssetPackCatalogSchema, input);
}
