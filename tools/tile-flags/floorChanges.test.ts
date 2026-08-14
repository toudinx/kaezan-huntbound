import { describe, expect, it } from 'vitest';

import { readFloorChanges } from './floorChanges.ts';

function items(body: string): string {
  return `<?xml version="1.0" encoding="ISO-8859-1"?>\n<items>\n${body}\n</items>`;
}

function item(attrs: string, floorchange?: string): string {
  if (floorchange === undefined) return `\t<item ${attrs}/>`;
  return [
    `\t<item ${attrs}>`,
    `\t\t<attribute key="floorchange" value="${floorchange}"/>`,
    '\t</item>',
  ].join('\n');
}

describe('readFloorChanges', () => {
  it('reads down and north', () => {
    const map = readFloorChanges(
      items(
        [
          item('id="459" name="stone floor"', 'down'),
          item('id="1385" name="stone stairs"', 'north'),
        ].join('\n'),
      ),
    );

    expect(map.get(459)).toBe('down');
    expect(map.get(1385)).toBe('north');
  });

  it('reads every value Canary declares, including the alt variants', () => {
    const map = readFloorChanges(
      items(
        [
          item('id="1" name="a"', 'down'),
          item('id="2" name="b"', 'north'),
          item('id="3" name="c"', 'south'),
          item('id="4" name="d"', 'southalt'),
          item('id="5" name="e"', 'east'),
          item('id="6" name="f"', 'eastalt'),
          item('id="7" name="g"', 'west'),
        ].join('\n'),
      ),
    );

    expect([...map.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [1, 'down'],
      [2, 'north'],
      [3, 'south'],
      [4, 'southalt'],
      [5, 'east'],
      [6, 'eastalt'],
      [7, 'west'],
    ]);
  });

  it('omits items that declare no floorchange', () => {
    const map = readFloorChanges(
      items(
        [
          item('id="100" name="water"'),
          item('id="101" name="wine" article="a"', 'down'),
          item('id="102" name="beer"'),
        ].join('\n'),
      ),
    );

    expect(map.has(100)).toBe(false);
    expect(map.has(102)).toBe(false);
    expect(map.get(101)).toBe('down');
  });

  it('ignores attributes other than floorchange', () => {
    const map = readFloorChanges(
      items(
        [
          '\t<item id="200" name="crate">',
          '\t\t<attribute key="weight" value="3000"/>',
          '\t\t<attribute key="containerSize" value="8"/>',
          '\t</item>',
        ].join('\n'),
      ),
    );

    expect(map.size).toBe(0);
  });

  it('expands a fromid/toid range to every id in it', () => {
    const map = readFloorChanges(
      items(item('fromid="410" toid="413" name="stairs"', 'down')),
    );

    expect([...map.entries()]).toEqual([
      [410, 'down'],
      [411, 'down'],
      [412, 'down'],
      [413, 'down'],
    ]);
  });

  it('throws for a value outside the Canary vocabulary, naming id and value', () => {
    expect(() =>
      readFloorChanges(items(item('id="855" name="stone stairs"', 'sideways'))),
    ).toThrow(/855.*sideways|sideways.*855/i);
  });

  it('rejects "up", which Canary does not define', () => {
    expect(() =>
      readFloorChanges(items(item('id="900" name="ladder"', 'up'))),
    ).toThrow(/900.*up|up.*900/i);
  });

  it('throws when the same id is declared twice with different values', () => {
    expect(() =>
      readFloorChanges(
        items(
          [
            item('id="500" name="stairs"', 'down'),
            item('id="500" name="stairs"', 'north'),
          ].join('\n'),
        ),
      ),
    ).toThrow(/conflicting floorchange.*500/i);
  });

  it('tolerates the same id declared twice with the same value', () => {
    const map = readFloorChanges(
      items(
        [
          item('id="501" name="stairs"', 'down'),
          item('id="501" name="stairs"', 'down'),
        ].join('\n'),
      ),
    );

    expect(map.get(501)).toBe('down');
  });

  it('detects a conflict introduced by an overlapping range', () => {
    expect(() =>
      readFloorChanges(
        items(
          [
            item('fromid="600" toid="605" name="stairs"', 'down'),
            item('id="603" name="stairs"', 'west'),
          ].join('\n'),
        ),
      ),
    ).toThrow(/conflicting floorchange.*603/i);
  });

  it('throws when a range is inverted', () => {
    expect(() =>
      readFloorChanges(items(item('fromid="700" toid="699" name="x"', 'down'))),
    ).toThrow(/invalid id range 700\.\.699/i);
  });

  it('returns an empty map for a document with no items', () => {
    expect(readFloorChanges(items('')).size).toBe(0);
  });
});
