import { describe, expect, it } from 'vitest';

import { parseCanaryItemsXml } from './parseItemsXml';

const fixture = `<items>
  <item id="9301" name="fixture shard" article="a" weight="0.4" />
  <item id="9302" name="fixture tonic" article="a" weight="1.1" />
  <item fromid="9310" toid="9312" name="fixture tile" article="a" weight="2.5" />
</items>`;

function diagnosticsOf(result: ReturnType<typeof parseCanaryItemsXml>) {
  return result.ok ? [] : result.diagnostics;
}

describe('parseCanaryItemsXml', () => {
  it('selects by concrete ID and maps documented scalar attributes', () => {
    expect(parseCanaryItemsXml(fixture, { ids: ['9301'], names: [] })).toEqual({
      ok: true,
      value: [
        {
          sourceId: '9301',
          displayName: 'fixture shard',
          attributes: { article: 'a', weight: 0.4 },
        },
      ],
    });
  });

  it('reads the equipment attributes and drops the zeroes Canary spells out', () => {
    const xml = `<items>
  <item id="3264" name="sword" article="a">
    <attribute key="weight" value="3500" />
    <attribute key="weaponType" value="sword" />
    <attribute key="slotType" value="hand" />
    <attribute key="attack" value="14" />
    <attribute key="defense" value="13" />
  </item>
  <item id="3374" name="legion helmet" article="a">
    <attribute key="armor" value="4" />
    <attribute key="slotType" value="head" />
    <attribute key="attack" value="0" />
    <attribute key="slot" value="head" />
  </item>
</items>`;

    const result = parseCanaryItemsXml(xml, {
      ids: ['3264', '3374'],
      names: [],
    });

    expect(result).toEqual({
      ok: true,
      value: [
        {
          sourceId: '3264',
          displayName: 'sword',
          attributes: {
            article: 'a',
            attack: 14,
            defense: 13,
            slotType: 'hand',
            weaponType: 'sword',
            weight: 3500,
          },
        },
        {
          sourceId: '3374',
          displayName: 'legion helmet',
          attributes: { armor: 4, article: 'a', slotType: 'head' },
        },
      ],
    });
  });

  it('selects by normalized name', () => {
    expect(
      parseCanaryItemsXml(fixture, {
        ids: [],
        names: ['  FIXTURE TONIC  '],
      }),
    ).toMatchObject({
      ok: true,
      value: [{ sourceId: '9302', displayName: 'fixture tonic' }],
    });
  });

  it('resolves one requested ID inside a range without expanding the range', () => {
    const result = parseCanaryItemsXml(fixture, { ids: ['9311'], names: [] });

    expect(result).toMatchObject({
      ok: true,
      value: [{ sourceId: '9311', displayName: 'fixture tile' }],
    });
    expect(result.ok ? result.value.map((item) => item.sourceId) : []).toEqual([
      '9311',
    ]);
  });

  it('reports a name that is ambiguous across two source IDs', () => {
    const xml = fixture.replace(
      'id="9302" name="fixture tonic"',
      'id="9302" name="fixture shard"',
    );
    const result = parseCanaryItemsXml(xml, {
      ids: [],
      names: ['fixture shard'],
    });

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'xml.ambiguous-name' }),
      ]),
    );
  });

  it('reports a missing item', () => {
    const result = parseCanaryItemsXml(fixture, { ids: ['9999'], names: [] });

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'xml.entity-not-found' }),
      ]),
    );
  });

  it('reports a reversed range', () => {
    const result = parseCanaryItemsXml(
      fixture.replace('fromid="9310" toid="9312"', 'fromid="9312" toid="9310"'),
      { ids: ['9311'], names: [] },
    );

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'xml.invalid-range' }),
      ]),
    );
  });

  it('reports duplicate concrete IDs', () => {
    const xml = fixture.replace(
      '</items>',
      '<item id="9301" name="duplicate" article="a" weight="1" /></items>',
    );
    const result = parseCanaryItemsXml(xml, { ids: ['9301'], names: [] });

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'xml.duplicate-id' }),
      ]),
    );
  });

  it('blocks an unknown attribute on a selected item', () => {
    const xml = fixture.replace(
      'id="9301" name="fixture shard"',
      'id="9301" name="fixture shard" semanticFlag="1"',
    );
    const result = parseCanaryItemsXml(xml, { ids: ['9301'], names: [] });

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'xml.unsupported-attribute' }),
      ]),
    );
  });

  it('maps a weight child attribute and ignores an allowlisted item field', () => {
    const xml = `<items>
      <item id="9301" name="fixture shard" article="a">
        <attribute key="weight" value="0.4" />
        <attribute key="primarytype" value="valuables" />
      </item>
    </items>`;
    const result = parseCanaryItemsXml(xml, { ids: ['9301'], names: [] });

    expect(result).toEqual({
      ok: true,
      value: [
        {
          sourceId: '9301',
          displayName: 'fixture shard',
          attributes: { article: 'a', weight: 0.4 },
        },
      ],
    });
  });

  it('ignores Canary combat fields that are outside the item contract', () => {
    const xml = `<items>
      <item id="9301" name="fixture shard" article="a">
        <attribute key="showAttributes" value="1" />
        <attribute key="absorbpercentphysical" value="10" />
        <attribute key="absorbpercentfire" value="20" />
        <attribute key="absorbpercentpoison" value="30" />
        <attribute key="absorbpercentenergy" value="40" />
        <attribute key="absorbpercentice" value="50" />
        <attribute key="absorbpercentholy" value="60" />
        <attribute key="absorbpercentdeath" value="70" />
        <attribute key="charges" value="3" />
        <attribute key="elementfire" value="1" />
        <attribute key="elementearth" value="1" />
        <attribute key="ammotype" value="arrow" />
      </item>
    </items>`;
    const result = parseCanaryItemsXml(xml, { ids: ['9301'], names: [] });

    expect(result).toEqual({
      ok: true,
      value: [
        {
          sourceId: '9301',
          displayName: 'fixture shard',
          attributes: { article: 'a' },
        },
      ],
    });
  });

  it('does not validate or return unknown fields from an unselected item', () => {
    const xml = fixture.replace(
      'id="9302" name="fixture tonic"',
      'id="9302" name="fixture tonic" semanticFlag="1"',
    );
    const result = parseCanaryItemsXml(xml, { ids: ['9301'], names: [] });

    expect(result).toEqual({
      ok: true,
      value: [
        {
          sourceId: '9301',
          displayName: 'fixture shard',
          attributes: { article: 'a', weight: 0.4 },
        },
      ],
    });
  });

  it('reports malformed XML', () => {
    const result = parseCanaryItemsXml('<items><item id="9301">', {
      ids: ['9301'],
      names: [],
    });

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'xml.malformed' }),
      ]),
    );
  });
});
