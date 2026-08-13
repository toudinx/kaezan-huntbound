import { describe, expect, it } from 'vitest';

import { diagnosticAt, parseLuaChunk } from './luaAst';
import { readStaticValue } from './staticValues';

describe('strict Lua AST boundary', () => {
  it('reports malformed Lua with a syntax diagnostic', () => {
    const result = parseLuaChunk('local broken = {');

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'lua.syntax', severity: 'error' }),
      ]),
    );
  });

  it('attaches line and column to a diagnostic for a parsed node', () => {
    const result = parseLuaChunk('local value = dofile("x")');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const statement = result.value.body[0];
    expect(statement).toBeDefined();
    if (statement === undefined) return;

    expect(
      diagnosticAt(statement, 'lua.unsupported-call', 'blocked call'),
    ).toEqual(
      expect.objectContaining({
        code: 'lua.unsupported-call',
        line: 1,
        column: 1,
      }),
    );
  });

  it('rejects computed indexes instead of reading them', () => {
    const result = parseLuaChunk('local value = object[key]');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const statement = result.value.body[0];
    expect(statement?.type).toBe('LocalStatement');
    if (statement?.type !== 'LocalStatement') return;

    const expression = statement.init[0];
    expect(expression).toBeDefined();
    if (expression === undefined) return;

    expect(readStaticValue(expression)).toEqual(
      expect.objectContaining({
        ok: false,
        diagnostics: expect.arrayContaining([
          expect.objectContaining({ code: 'lua.computed-index' }),
        ]),
      }),
    );
  });

  it('rejects unsupported operators in static arithmetic', () => {
    const result = parseLuaChunk('local value = 1 .. 2');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const statement = result.value.body[0];
    expect(statement?.type).toBe('LocalStatement');
    if (statement?.type !== 'LocalStatement') return;

    const expression = statement.init[0];
    expect(expression).toBeDefined();
    if (expression === undefined) return;

    expect(readStaticValue(expression)).toEqual(
      expect.objectContaining({
        ok: false,
        diagnostics: expect.arrayContaining([
          expect.objectContaining({ code: 'lua.unsupported-expression' }),
        ]),
      }),
    );
  });
});
