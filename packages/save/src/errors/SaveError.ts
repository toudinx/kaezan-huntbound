export type SaveErrorCode =
  | 'SAVE_UNAVAILABLE'
  | 'SAVE_QUOTA_EXCEEDED'
  | 'SAVE_TRANSACTION_FAILED'
  | 'SAVE_DOCUMENT_INVALID'
  | 'SAVE_VERSION_UNSUPPORTED'
  | 'SAVE_UPGRADE_BLOCKED';

export class SaveError extends Error {
  readonly code: SaveErrorCode;

  constructor(code: SaveErrorCode, message: string, cause?: unknown) {
    super(
      message,
      cause === undefined
        ? undefined
        : {
            cause,
          },
    );
    this.name = 'SaveError';
    this.code = code;
  }
}
