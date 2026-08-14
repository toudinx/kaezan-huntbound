import type { HuntDefinition } from '../../packages/contracts/src/hunt/types.ts';

/** Structured diagnostic emitted by the offline extraction. */
export interface ExtractionDiagnostic {
  readonly path: string;
  readonly code: ExtractionDiagnosticCode;
  readonly message: string;
}

export type ExtractionDiagnosticCode =
  | 'HUNT_TRANSITION_DROPPED'
  | 'HUNT_UNKNOWN_CREATURE'
  | 'HUNT_SPAWNTIME_NOT_DIVISIBLE'
  | 'HUNT_REGION_OUT_OF_BUDGET'
  | 'HUNT_EMPTY_TILE'
  | 'HUNT_ID_MISMATCH'
  | 'HUNT_SPAWN_OUT_OF_REGION'
  | 'HUNT_SCHEMA_INVALID';

/**
 * Diagnostics that never block: an empty tile is expected geometry and a
 * dropped transition is reconciled against the frozen selection instead.
 */
const advisoryCodes = new Set<ExtractionDiagnosticCode>([
  'HUNT_EMPTY_TILE',
  'HUNT_TRANSITION_DROPPED',
]);

export function isBlockingDiagnostic(
  diagnostic: ExtractionDiagnostic,
): boolean {
  return !advisoryCodes.has(diagnostic.code);
}

export interface ExtractionResult {
  readonly hunt: HuntDefinition;
  readonly diagnostics: readonly ExtractionDiagnostic[];
}

export function diagnostic(
  path: string,
  code: ExtractionDiagnosticCode,
  message: string,
): ExtractionDiagnostic {
  return { path, code, message };
}

/** Deterministic order: path, then code, then message. */
export function sortDiagnostics(
  diagnostics: readonly ExtractionDiagnostic[],
): readonly ExtractionDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);
    if (pathOrder !== 0) return pathOrder;
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0
      ? codeOrder
      : left.message.localeCompare(right.message);
  });
}
