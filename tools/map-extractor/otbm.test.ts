import { describe, expect, it } from 'vitest';

import { readOtbmTree, unescapeOtbmProps } from './otbm.ts';
import {
  ESCAPE_CHAR,
  encodeOtbmFile,
  NODE_END,
  NODE_START,
} from './testing/otbmFixture.ts';

describe('unescapeOtbmProps', () => {
  it('turns 0xFD 0xFE into a literal 0xFE', () => {
    expect([
      ...unescapeOtbmProps(Uint8Array.from([ESCAPE_CHAR, NODE_START])),
    ]).toEqual([NODE_START]);
  });

  it('turns 0xFD 0xFF into a literal 0xFF', () => {
    expect([
      ...unescapeOtbmProps(Uint8Array.from([ESCAPE_CHAR, NODE_END])),
    ]).toEqual([NODE_END]);
  });

  it('turns 0xFD 0xFD into a literal 0xFD', () => {
    expect([
      ...unescapeOtbmProps(Uint8Array.from([ESCAPE_CHAR, ESCAPE_CHAR])),
    ]).toEqual([ESCAPE_CHAR]);
  });

  it('keeps ordinary bytes around an escape', () => {
    expect([
      ...unescapeOtbmProps(
        Uint8Array.from([0x01, ESCAPE_CHAR, NODE_START, 0x02]),
      ),
    ]).toEqual([0x01, NODE_START, 0x02]);
  });

  it('rejects an escape on the last byte instead of reading past the end', () => {
    expect(() =>
      unescapeOtbmProps(Uint8Array.from([0x01, ESCAPE_CHAR])),
    ).toThrow(/escape/i);
  });
});

describe('readOtbmTree', () => {
  it('does not open a node for an escaped 0xFE inside properties', () => {
    const root = readOtbmTree(
      encodeOtbmFile({ type: 1, props: [NODE_START, 0x07] }),
    );

    expect(root.type).toBe(1);
    expect([...root.props]).toEqual([NODE_START, 0x07]);
    expect(root.children).toEqual([]);
  });

  it('does not close a node for an escaped 0xFF inside properties', () => {
    const root = readOtbmTree(
      encodeOtbmFile({
        type: 1,
        props: [NODE_END, 0x07],
        children: [{ type: 2 }],
      }),
    );

    expect([...root.props]).toEqual([NODE_END, 0x07]);
    expect(root.children).toHaveLength(1);
    expect(root.children[0]?.type).toBe(2);
  });

  it('reads three nesting levels with children in file order', () => {
    const root = readOtbmTree(
      encodeOtbmFile({
        type: 1,
        props: [0xaa],
        children: [
          {
            type: 2,
            props: [0xbb],
            children: [
              { type: 3, props: [0x01] },
              { type: 3, props: [0x02] },
            ],
          },
          { type: 4, props: [0xcc] },
        ],
      }),
    );

    expect(root.children.map((child) => child.type)).toEqual([2, 4]);
    const [first] = root.children;
    expect(first?.children.map((child) => [...child.props])).toEqual([
      [0x01],
      [0x02],
    ]);
  });

  it('rejects an unclosed node naming its type', () => {
    const truncated = Uint8Array.from([0, 0, 0, 0, NODE_START, 42, 0x01]);

    expect(() => readOtbmTree(truncated)).toThrow(/42/);
  });

  it('reads an empty property span as a zero-length Uint8Array', () => {
    const root = readOtbmTree(encodeOtbmFile({ type: 9 }));

    expect(root.props).toBeInstanceOf(Uint8Array);
    expect(root.props).toHaveLength(0);
  });
});
