import {
  type GameSave,
  parseGameSave,
  type SaveDiagnostic,
} from '@huntbound/contracts';
import { encodeCanonicalJson } from '@huntbound/simulation/src/state/canonicalJson.ts';

import { SaveError } from '../errors/SaveError.ts';
import { migrateSaveDocument } from '../migrations/migrateSaveDocument.ts';

function invalidDocument(
  message: string,
  cause?: unknown,
  diagnostics?: readonly SaveDiagnostic[],
): SaveError {
  return new SaveError('SAVE_DOCUMENT_INVALID', message, {
    cause,
    diagnostics,
  });
}

export function encodeSaveDocument(document: GameSave): string {
  return `${encodeCanonicalJson(document)}\n`;
}

export function decodeSaveDocument(serialized: string): GameSave {
  let document: unknown;
  try {
    document = JSON.parse(serialized);
  } catch (error) {
    throw invalidDocument('Save document is not valid JSON', error);
  }

  const migrated = migrateSaveDocument(document);
  const parsed = parseGameSave(migrated);
  if (!parsed.ok) {
    const firstDiagnostic = parsed.diagnostics[0];
    const detail =
      firstDiagnostic === undefined ? '' : `: ${firstDiagnostic.message}`;
    throw invalidDocument(
      `Save document is invalid${detail}`,
      undefined,
      parsed.diagnostics,
    );
  }

  return parsed.value;
}
