import type { ContentDiagnostic } from '@huntbound/contracts';
import type { Node } from 'luaparse';

interface LuaLocation {
  readonly start: { readonly line: number; readonly column: number };
}

interface LocatableNode {
  readonly loc?: LuaLocation | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function locationFields(
  location: { readonly line?: unknown; readonly column?: unknown } | undefined,
): Pick<ContentDiagnostic, 'line' | 'column'> {
  const line = typeof location?.line === 'number' ? location.line : undefined;
  const rawColumn =
    typeof location?.column === 'number' ? location.column : undefined;
  const column = rawColumn === undefined ? undefined : rawColumn + 1;
  return {
    ...(line === undefined ? {} : { line }),
    ...(column === undefined ? {} : { column }),
  };
}

export function createLuaDiagnostic(
  code: string,
  message: string,
  location?: { readonly line?: number; readonly column?: number },
): ContentDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    ...locationFields(location),
  };
}

export function diagnosticAt(
  node: LocatableNode | undefined,
  code: string,
  message: string,
): ContentDiagnostic {
  return createLuaDiagnostic(code, message, node?.loc?.start);
}

export function diagnosticFromLuaError(error: unknown): ContentDiagnostic {
  if (!isRecord(error)) {
    return createLuaDiagnostic('lua.syntax', 'Lua source is not valid');
  }

  const nestedStart =
    isRecord(error.location) && isRecord(error.location.start)
      ? error.location.start
      : undefined;
  const rawLine = nestedStart?.line ?? error.line;
  const rawColumn = nestedStart?.column ?? error.column;
  const location = {
    ...(typeof rawLine === 'number' ? { line: rawLine } : {}),
    ...(typeof rawColumn === 'number' ? { column: rawColumn } : {}),
  };
  const message = typeof error.message === 'string'
    ? error.message
    : 'Lua source is not valid';
  return {
    ...createLuaDiagnostic('lua.syntax', message, location),
  };
}

export function diagnosticForNode(
  node: Node,
  code: string,
  message: string,
): ContentDiagnostic {
  return diagnosticAt(node, code, message);
}
