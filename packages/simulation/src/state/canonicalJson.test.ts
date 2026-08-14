import { describe, expect, it } from 'vitest';

import { CanonicalJsonError, encodeCanonicalJson } from './canonicalJson.ts';

function codeOf(value: unknown): string {
  try {
    encodeCanonicalJson(value);
  } catch (error) {
    if (error instanceof CanonicalJsonError) {
      return error.code;
    }
    throw error;
  }
  throw new Error('encodeCanonicalJson did not reject the value');
}

describe('encodeCanonicalJson', () => {
  it('orders object keys by UTF-16 code unit', () => {
    const encoded = encodeCanonicalJson({
      á: 5,
      '~': 4,
      a: 3,
      Z: 2,
      '1': 1,
    });

    expect(encoded).toBe('{"1":1,"Z":2,"a":3,"~":4,"á":5}');
  });

  it('produces identical output for the same keys declared in different orders', () => {
    const left = encodeCanonicalJson({ b: 1, a: { d: 2, c: 3 } });
    const right = encodeCanonicalJson({ a: { c: 3, d: 2 }, b: 1 });

    expect(left).toBe(right);
    expect(left).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it('preserves array order and omits superfluous whitespace', () => {
    expect(encodeCanonicalJson([3, 1, 2, { b: 1, a: 2 }])).toBe(
      '[3,1,2,{"a":2,"b":1}]',
    );
  });

  it('escapes quotes, backslashes and newlines while keeping non-ASCII literal', () => {
    expect(encodeCanonicalJson('a"b\\c\nd\té')).toBe('"a\\"b\\\\c\\nd\\té"');
  });

  it('escapes lone surrogates so the output is always well formed', () => {
    expect(encodeCanonicalJson('\ud800')).toBe('"\\ud800"');
  });

  it('does not terminate the encoded value with a newline', () => {
    expect(encodeCanonicalJson({ a: 1 }).endsWith('\n')).toBe(false);
  });

  it('accepts zero, negative integers, booleans and null', () => {
    expect(encodeCanonicalJson({ a: 0, b: -12, c: true, d: null })).toBe(
      '{"a":0,"b":-12,"c":true,"d":null}',
    );
  });

  it('rejects non-integer numbers with SIM_STATE_NOT_INTEGER', () => {
    expect(codeOf(1.5)).toBe('SIM_STATE_NOT_INTEGER');
    expect(codeOf(Number.NaN)).toBe('SIM_STATE_NOT_INTEGER');
    expect(codeOf(Number.POSITIVE_INFINITY)).toBe('SIM_STATE_NOT_INTEGER');
    expect(codeOf(Number.NEGATIVE_INFINITY)).toBe('SIM_STATE_NOT_INTEGER');
    expect(codeOf(-0)).toBe('SIM_STATE_NOT_INTEGER');
    expect(codeOf(2 ** 53)).toBe('SIM_STATE_NOT_INTEGER');
  });

  it('rejects values JSON cannot represent with SIM_STATE_NOT_SERIALIZABLE', () => {
    expect(codeOf(undefined)).toBe('SIM_STATE_NOT_SERIALIZABLE');
    expect(codeOf(() => 1)).toBe('SIM_STATE_NOT_SERIALIZABLE');
    expect(codeOf(Symbol('nope'))).toBe('SIM_STATE_NOT_SERIALIZABLE');
    expect(codeOf(1n)).toBe('SIM_STATE_NOT_SERIALIZABLE');
    expect(codeOf({ a: undefined })).toBe('SIM_STATE_NOT_SERIALIZABLE');
    expect(codeOf([undefined])).toBe('SIM_STATE_NOT_SERIALIZABLE');
  });

  it('reports the path of the offending value', () => {
    try {
      encodeCanonicalJson({ actors: [{ position: { x: 1.5 } }] });
      throw new Error('encodeCanonicalJson did not reject the value');
    } catch (error) {
      expect(error).toBeInstanceOf(CanonicalJsonError);
      expect((error as CanonicalJsonError).path).toEqual([
        'actors',
        0,
        'position',
        'x',
      ]);
    }
  });

  it('rejects cycles instead of overflowing the stack', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(codeOf(cyclic)).toBe('SIM_STATE_NOT_SERIALIZABLE');
  });
});
