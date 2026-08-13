import { createHash } from 'node:crypto';
import { isAbsolute, relative, sep } from 'node:path';

import type {
  AssetDiagnostic,
  AssetDiagnosticCode,
  AssetKey,
} from '../../../packages/assets/src/index.ts';

export function compareAssetText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparePaths(
  left: readonly (string | number)[],
  right: readonly (string | number)[],
): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftSegment = left[index];
    const rightSegment = right[index];
    if (leftSegment === rightSegment) continue;
    if (typeof leftSegment === 'number' && typeof rightSegment === 'number') {
      return leftSegment - rightSegment;
    }
    return compareAssetText(String(leftSegment), String(rightSegment));
  }
  return left.length - right.length;
}

export function sortAssetDiagnostics(
  diagnostics: readonly AssetDiagnostic[],
): readonly AssetDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const pathOrder = comparePaths(left.path, right.path);
    if (pathOrder !== 0) return pathOrder;
    const codeOrder = compareAssetText(left.code, right.code);
    return codeOrder !== 0
      ? codeOrder
      : compareAssetText(left.message, right.message);
  });
}

export function assetDiagnostic(
  code: AssetDiagnosticCode,
  path: readonly (string | number)[],
  message: string,
  key?: AssetKey,
): AssetDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    path,
    ...(key === undefined ? {} : { key }),
  };
}

export function hashAssetBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function isPathWithin(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return (
    fromRoot.length === 0 ||
    (!fromRoot.startsWith(`..${sep}`) &&
      fromRoot !== '..' &&
      !isAbsolute(fromRoot))
  );
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
