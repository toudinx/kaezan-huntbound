import type { z } from 'zod';

import type { ContentKey } from './identity.ts';
import {
  type CatalogContentBundle,
  CatalogContentBundleSchema,
  type RuntimeContentBundle,
  RuntimeContentBundleSchema,
} from './schemas.ts';

export interface ContentDiagnostic {
  readonly code: string;
  readonly severity: 'warning' | 'error';
  readonly message: string;
  readonly sourcePath?: string;
  readonly line?: number;
  readonly column?: number;
  readonly entityKey?: ContentKey;
}

function formatPath(path: readonly PropertyKey[]) {
  return path
    .map((segment) =>
      typeof segment === 'number' ? `[${segment}]` : String(segment),
    )
    .join('.')
    .replaceAll('.[', '[');
}

export function diagnosticsFromZodError(
  error: z.ZodError,
): readonly ContentDiagnostic[] {
  return error.issues.map((issue) => {
    const path = formatPath(issue.path);
    const namedCode =
      issue.code === 'custom' &&
      issue.params !== undefined &&
      typeof issue.params.contentCode === 'string'
        ? issue.params.contentCode
        : undefined;
    return {
      code: namedCode ?? `schema.${issue.code}`,
      severity: 'error' as const,
      message: path.length > 0 ? `${path}: ${issue.message}` : issue.message,
    };
  });
}

export function validateCatalogContentBundle(
  input: unknown,
):
  | { readonly ok: true; readonly value: CatalogContentBundle }
  | { readonly ok: false; readonly diagnostics: readonly ContentDiagnostic[] } {
  const result = CatalogContentBundleSchema.safeParse(input);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, diagnostics: diagnosticsFromZodError(result.error) };
}

export function validateRuntimeContentBundle(
  input: unknown,
):
  | { readonly ok: true; readonly value: RuntimeContentBundle }
  | { readonly ok: false; readonly diagnostics: readonly ContentDiagnostic[] } {
  const result = RuntimeContentBundleSchema.safeParse(input);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, diagnostics: diagnosticsFromZodError(result.error) };
}
