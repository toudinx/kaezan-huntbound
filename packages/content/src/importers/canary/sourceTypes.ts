import type { ContentDiagnostic } from '@huntbound/contracts';

export interface CanarySourceLocation {
  readonly line: number;
  readonly column: number;
  readonly offset?: number;
}

export interface CanarySourceSpan {
  readonly start: CanarySourceLocation;
  readonly end: CanarySourceLocation;
}

export type CanaryParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly diagnostics: readonly ContentDiagnostic[];
    };
