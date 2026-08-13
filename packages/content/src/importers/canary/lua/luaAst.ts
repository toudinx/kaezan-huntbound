import type { Chunk, Node } from 'luaparse';
import * as luaparse from 'luaparse';

import type { CanaryParseResult } from '../sourceTypes';
import {
  diagnosticAt,
  diagnosticFromLuaError,
} from './luaDiagnostics';

export { diagnosticAt } from './luaDiagnostics';

export function parseLuaChunk(lua: string): CanaryParseResult<Chunk> {
  try {
    return {
      ok: true,
      value: luaparse.parse(lua, {
        comments: false,
        locations: true,
        ranges: true,
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
