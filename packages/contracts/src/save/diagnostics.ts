import type { z } from 'zod';

import { GameSaveSchema } from './schemas.ts';
import type { GameSave, ParseResult, SaveDiagnostic } from './types.ts';

function formatPath(path: readonly (string | number)[]) {
  return path
    .map((segment) =>
      typeof segment === 'number' ? `[${segment}]` : String(segment),
    )
    .join('.')
    .replaceAll('.[', '[');
}

function issuePath(issue: z.core.$ZodIssue): readonly (string | number)[] {
  return issue.path.filter(
    (segment): segment is string | number =>
      typeof segment === 'string' || typeof segment === 'number',
  );
}

function unrecognizedKeys(issue: z.core.$ZodIssue): readonly string[] {
  if (issue.code !== 'unrecognized_keys' || !('keys' in issue)) {
    return [];
  }

  const { keys } = issue;
  if (!Array.isArray(keys)) {
    return [];
  }

  return keys.filter((key): key is string => typeof key === 'string');
}

function comparePath(
  left: readonly (string | number)[],
  right: readonly (string | number)[],
) {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftSegment = left[index];
    const rightSegment = right[index];
    if (leftSegment === rightSegment) {
      continue;
    }
    if (leftSegment === undefined) {
      return -1;
    }
    if (rightSegment === undefined) {
      return 1;
    }
    if (typeof leftSegment === 'number' && typeof rightSegment === 'number') {
      return leftSegment < rightSegment ? -1 : 1;
    }
    if (typeof leftSegment === 'number') {
      return 1;
    }
    if (typeof rightSegment === 'number') {
      return -1;
    }
    return leftSegment < rightSegment ? -1 : 1;
  }
  return left.length - right.length;
}

function sortDiagnostics(
  diagnostics: readonly SaveDiagnostic[],
): readonly SaveDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const pathOrder = comparePath(left.path, right.path);
    if (pathOrder !== 0) {
      return pathOrder;
    }
    return left.message === right.message
      ? 0
      : left.message < right.message
        ? -1
        : 1;
  });
}

export function saveDiagnosticsFromZodError(
  error: z.ZodError,
): readonly SaveDiagnostic[] {
  const diagnostics: SaveDiagnostic[] = [];

  for (const issue of error.issues) {
    const path = issuePath(issue);
    const extraKeys = unrecognizedKeys(issue);
    if (extraKeys.length > 0) {
      for (const key of extraKeys) {
        const extraPath = [...path, key];
        const formattedPath = formatPath(extraPath);
        diagnostics.push({
          code: 'SAVE_DOCUMENT_INVALID',
          message:
            formattedPath.length > 0
              ? `${formattedPath}: ${issue.message}`
              : issue.message,
          path: extraPath,
        });
      }
      continue;
    }

    const formattedPath = formatPath(path);
    diagnostics.push({
      code: 'SAVE_DOCUMENT_INVALID',
      message:
        formattedPath.length > 0
          ? `${formattedPath}: ${issue.message}`
          : issue.message,
      path,
    });
  }

  return sortDiagnostics(diagnostics);
}

export function parseGameSave(value: unknown): ParseResult<GameSave> {
  const result = GameSaveSchema.safeParse(value);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, diagnostics: saveDiagnosticsFromZodError(result.error) };
}
