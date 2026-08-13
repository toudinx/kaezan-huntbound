import { describe, expect, it } from 'vitest';

import * as runtimeContent from '../../../index';
import { parseCanaryVocationsXml } from './parseVocationsXml';

const fixture = `<vocations>
  <vocation id="9004" clientid="9104" baseid="9004" name="Fixture Knight" gaincap="17" gainhp="9" gainmana="6" manamultiplier="2.4" attackspeed="1800" basespeed="125">
    <formula meleeDamage="1.25" distDamage="0.75" defense="1.15" armor="1.05" />
    <skill id="0" multiplier="1.4" />
    <skill id="1" multiplier="1.2" />
  </vocation>
  <vocation id="9008" clientid="9108" baseid="9008" name="Fixture Mystic" gaincap="8" gainhp="4" gainmana="19" manamultiplier="1.3" attackspeed="2100" basespeed="118">
    <formula meleeDamage="0.7" distDamage="1.2" defense="0.8" armor="0.9" />
    <skill id="0" multiplier="1.8" />
  </vocation>
</vocations>`;

function diagnosticsOf(result: ReturnType<typeof parseCanaryVocationsXml>) {
  return result.ok ? [] : result.diagnostics;
}

describe('parseCanaryVocationsXml', () => {
  it('selects one vocation and maps explicit progression values', () => {
    expect(parseCanaryVocationsXml(fixture, ['9004'])).toEqual({
      ok: true,
      value: [
        {
          sourceId: '9004',
          displayName: 'Fixture Knight',
          gainHp: 9,
          gainMana: 6,
          gainCapacity: 17,
          baseSpeed: 125,
          attackSpeedMs: 1800,
          manaMultiplier: 2.4,
          skillMultipliers: { 'skill:0': 1.4, 'skill:1': 1.2 },
        },
      ],
    });
  });

  it('selects Knight exclusively by source ID 4', () => {
    const xml = `<vocations>
      <vocation id="4" name="Knight" gaincap="25" gainhp="15" gainmana="5" manamultiplier="3.0" attackspeed="2000" basespeed="110">
        <skill id="4" multiplier="1.4" />
      </vocation>
      <vocation id="8" name="Knight" gaincap="8" gainhp="4" gainmana="19" manamultiplier="1.3" attackspeed="2100" basespeed="118" />
    </vocations>`;

    expect(parseCanaryVocationsXml(xml, ['4'])).toMatchObject({
      ok: true,
      value: [{ sourceId: '4', displayName: 'Knight' }],
    });
  });

  it('does not import an unrequested vocation', () => {
    const result = parseCanaryVocationsXml(fixture, ['9004']);

    expect(
      result.ok ? result.value.map((vocation) => vocation.sourceId) : [],
    ).toEqual(['9004']);
  });

  it('reports a requested vocation that is absent', () => {
    const result = parseCanaryVocationsXml(fixture, ['4']);

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'xml.entity-not-found' }),
      ]),
    );
  });

  it('reports duplicate vocation IDs', () => {
    const duplicate = fixture.replace(
      '</vocations>',
      '<vocation id="9004" name="Duplicate" gaincap="1" gainhp="1" gainmana="1" manamultiplier="1" attackspeed="1" basespeed="1" /></vocations>',
    );
    const result = parseCanaryVocationsXml(duplicate, ['9004']);

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'xml.duplicate-id' }),
      ]),
    );
  });

  it('reports invalid required numeric attributes', () => {
    const result = parseCanaryVocationsXml(
      fixture.replace('gainhp="9"', 'gainhp="nine"'),
      ['9004'],
    );

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'xml.invalid-number' }),
      ]),
    );
  });

  it('blocks unknown semantic attributes instead of copying them generically', () => {
    const result = parseCanaryVocationsXml(
      fixture.replace('gainhp="9"', 'gainhp="9" manaShield="1"'),
      ['9004'],
    );

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'xml.unsupported-attribute' }),
      ]),
    );
  });

  it('allows documented source-only vocation elements without importing them', () => {
    const xml = fixture.replace(
      '</vocation>',
      '<mitigation multiplier="1.3" primaryShield="2.05" secondaryShield="1.25" />\n      <pvp damageReceivedMultiplier="1" damageDealtMultiplier="1" />\n      <gem quality="0" name="fixture gem" />\n    </vocation>',
    );
    const result = parseCanaryVocationsXml(xml, ['9004']);

    expect(result).toMatchObject({
      ok: true,
      value: [{ sourceId: '9004' }],
    });
  });

  it('keeps XML adapters outside the runtime entrypoint', () => {
    expect(runtimeContent).not.toHaveProperty('parseCanaryVocationsXml');
    expect(runtimeContent).not.toHaveProperty('parseCanaryItemsXml');
  });
});
