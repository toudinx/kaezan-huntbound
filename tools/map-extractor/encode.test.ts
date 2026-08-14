import { describe, expect, it } from 'vitest';

import { encodeCanonicalJson } from './encode.ts';

describe('encodeCanonicalJson', () => {
  it('sorts object keys at every level', () => {
    expect(encodeCanonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(
      '{"a":{"c":3,"d":2},"b":1}\n',
    );
  });

  it('emits a single line and a trailing newline', () => {
    const encoded = encodeCanonicalJson({ a: [1, 2], b: 'x' });

    expect(encoded).toBe('{"a":[1,2],"b":"x"}\n');
    expect(encoded.split('\n')).toHaveLength(2);
  });

  it('preserves array order', () => {
    expect(encodeCanonicalJson([3, 1, 2])).toBe('[3,1,2]\n');
  });

  it('keeps booleans and null', () => {
    expect(encodeCanonicalJson({ a: true, b: null })).toBe(
      '{"a":true,"b":null}\n',
    );
  });

  it('rejects a float so no rounding drift reaches the frozen file', () => {
    expect(() => encodeCanonicalJson({ a: 1.5 })).toThrow(/a: 1.5/);
  });

  it('rejects a value that is not JSON data', () => {
    expect(() => encodeCanonicalJson({ a: undefined })).toThrow(/a/);
  });
});
