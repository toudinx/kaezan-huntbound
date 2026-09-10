import { describe, expect, it } from 'vitest';

import { readLadderIds } from './ladders.ts';

function items(body: string): string {
  return `<?xml version="1.0" encoding="ISO-8859-1"?>\n<items>\n${body}\n</items>`;
}

describe('readLadderIds', () => {
  it('reads the ladder type and ignores every other type and attribute', () => {
    const ladders = readLadderIds(
      items(
        [
          '\t<item id="1948" article="a" name="ladder">',
          '\t\t<attribute key="type" value="ladder"/>',
          '\t</item>',
          '\t<item id="1949" article="a" name="magic forcefield">',
          '\t\t<attribute key="type" value="teleport"/>',
          '\t</item>',
          '\t<item fromid="411" toid="412" article="a" name="trapdoor">',
          '\t\t<attribute key="floorchange" value="down"/>',
          '\t</item>',
          '\t<item id="416" name="stone floor"/>',
        ].join('\n'),
      ),
    );

    expect([...ladders]).toEqual([1948]);
  });

  it('covers every id of a ladder declared as a range', () => {
    const ladders = readLadderIds(
      items(
        [
          '\t<item fromid="1948" toid="1950" name="ladder">',
          '\t\t<attribute key="type" value="ladder"/>',
          '\t</item>',
        ].join('\n'),
      ),
    );

    expect([...ladders]).toEqual([1948, 1949, 1950]);
  });
});
