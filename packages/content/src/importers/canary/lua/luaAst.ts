import type { Chunk, Node } from 'luaparse';
import * as luaparse from 'luaparse';

import type { CanaryParseResult } from '../sourceTypes.ts';
import { diagnosticFromLuaError } from './luaDiagnostics.ts';

export { diagnosticAt } from './luaDiagnostics.ts';

export function parseLuaChunk(lua: string): CanaryParseResult<Chunk> {
  try {
    return {
      ok: true,
      value: luaparse.parse(lua, {
        comments: false,
        locations: true,
        ranges: true,
        encodingMode: 'pseudo-latin1',
        luaVersion: '5.3',
      }),
    };
  } catch (error) {
    return { ok: false, diagnostics: [diagnosticFromLuaError(error)] };
  }
}

export function nodeType(node: Node): string {
  return node.type;
}
