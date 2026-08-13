import type { ContentDiagnostic } from '@huntbound/contracts';

export class ContentImportError extends Error {
  readonly diagnostics: readonly ContentDiagnostic[];

  constructor(message: string, diagnostics: readonly ContentDiagnostic[]) {
    super(
      diagnostics.length === 0
        ? message
        : `${message}: ${diagnostics.map((diagnostic) => diagnostic.message).join('; ')}`,
    );
    this.name = 'ContentImportError';
    this.diagnostics = diagnostics;
  }
}
