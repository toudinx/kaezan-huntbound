import type { SimulationEvent } from '@huntbound/contracts';

import { encodeCanonicalJson } from '../state/canonicalJson.ts';

/**
 * JSONL journal: one canonical JSON event per line, LF separated, with a final
 * newline. An empty journal is an empty file, never a lone newline.
 */
export function encodeEventJournal(events: readonly SimulationEvent[]): string {
  if (events.length === 0) {
    return '';
  }
  return `${events.map((event) => encodeCanonicalJson(event)).join('\n')}\n`;
}
