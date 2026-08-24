import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateCombatSelection } from './validateCombatSelection.ts';

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

const vocationsXml = `<vocations>
	<vocation id="4" name="Knight" attackspeed="2000" basespeed="110" gainhp="15" gainmana="5" />
</vocations>
`;

const berserkLua = `spell:id(80)
spell:words("exori")
spell:cooldown(4 * 1000)
spell:groupCooldown(2 * 1000)
`;

const brutalStrikeLua = `spell:id(61)
spell:words("exori ico")
spell:cooldown(6 * 1000)
spell:groupCooldown(2 * 1000)
`;

const woundCleansingLua = `spell:id(123)
spell:words("exura ico")
spell:cooldown(1 * 1000)
spell:groupCooldown(1 * 1000)
`;

const rotwormLua = `monster.speed = 58
monster.corpse = 5967
monster.attacks = {
	{ name = "melee", interval = 2000, minDamage = 0, maxDamage = -40 },
}
`;

const itemsXml = `<items>
	<item id="3264" name="sword"><attribute key="attack" value="14"/></item>
	<item id="5967" name="dead rotworm"/>
	<item id="2889" name="small splash"/>
</items>
`;

const effectsHeader = `enum MagicEffectClasses : uint16_t {
	CONST_ME_DRAWBLOOD = 1,
	CONST_ME_HITAREA = 10,
	CONST_ME_MAGIC_BLUE = 13,
};
enum ShootType_t : uint8_t {
	CONST_ANI_WEAPONTYPE = 0xFE,
};
`;

const postures = [
  {
    abilityId: 'blood-rage',
    conditionId: 'blood-rage',
    displayName: 'Blood Rage',
    level: 20,
    mana: 20,
    skillIndex: 2,
    skillModifierPermille: 250,
    damageReceivedPermille: 150,
    damageDealtPermille: 0,
    shieldingPermille: 0,
    source: {
      provider: 'TibiaWiki',
      version: '15.25.3a4a52',
      divergence:
        'Uses the 2026 stance values because the Canary snapshot predates toggle stances.',
    },
  },
  {
    abilityId: 'protector',
    conditionId: 'protector',
    displayName: 'Protector',
    level: 20,
    mana: 20,
    skillIndex: null,
    skillModifierPermille: 0,
    damageReceivedPermille: -150,
    damageDealtPermille: -150,
    shieldingPermille: 300,
    source: {
      provider: 'TibiaWiki',
      version: '15.25.3a4a52',
      divergence:
        'Shielding stays declarative until PB-11 adds armor and shielding resolution.',
    },
  },
] as const;

const sourceFiles = {
  'data/XML/vocations.xml': vocationsXml,
  'data/scripts/spells/attack/berserk.lua': berserkLua,
  'data/scripts/spells/attack/brutal_strike.lua': brutalStrikeLua,
  'data/scripts/spells/healing/wound_cleansing.lua': woundCleansingLua,
  'data-otservbr-global/monster/vermins/rotworm.lua': rotwormLua,
  'data/items/items.xml': itemsXml,
  'src/utils/utils_definitions.hpp': effectsHeader,
} as const;

function hashedSources() {
  return Object.entries(sourceFiles).map(([relativePath, contents]) => ({
    relativePath,
    sha256: sha256(contents),
  }));
}

function selection(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    key: 'selection:pb-05-knight-combat',
    huntKey: 'hunt:tibia:venore-rotworm-cave',
    vocation: {
      stableKey: 'vocation:tibia:knight',
      sourceId: '4',
      sourceFile: 'data/XML/vocations.xml',
      attackSpeedMs: 2000,
      baseSpeed: 110,
    },
    creature: {
      stableKey: 'creature:tibia:rotworm',
      sourceFile: 'data-otservbr-global/monster/vermins/rotworm.lua',
      speed: 58,
      intervalMs: 2000,
      corpseItemId: 5967,
    },
    weapon: {
      stableKey: 'item:tibia:sword',
      sourceId: '3264',
      sourceFile: 'data/items/items.xml',
      attack: 14,
    },
    spells: [
      {
        stableKey: 'spell:tibia:berserk',
        sourceId: '80',
        words: 'exori',
        sourceFile: 'data/scripts/spells/attack/berserk.lua',
        cooldownMs: 4000,
        groupCooldownMs: 2000,
      },
      {
        stableKey: 'spell:tibia:brutal-strike',
        sourceId: '61',
        words: 'exori ico',
        sourceFile: 'data/scripts/spells/attack/brutal_strike.lua',
        cooldownMs: 6000,
        groupCooldownMs: 2000,
      },
      {
        stableKey: 'spell:tibia:wound-cleansing',
        sourceId: '123',
        words: 'exura ico',
        sourceFile: 'data/scripts/spells/healing/wound_cleansing.lua',
        cooldownMs: 1000,
        groupCooldownMs: 1000,
      },
    ],
    assets: [
      {
        kind: 'effect',
        name: 'CONST_ME_DRAWBLOOD',
        sourceId: 1,
        sourceFile: 'src/utils/utils_definitions.hpp',
      },
      {
        kind: 'effect',
        name: 'CONST_ME_HITAREA',
        sourceId: 10,
        sourceFile: 'src/utils/utils_definitions.hpp',
      },
      {
        kind: 'effect',
        name: 'CONST_ME_MAGIC_BLUE',
        sourceId: 13,
        sourceFile: 'src/utils/utils_definitions.hpp',
      },
      {
        kind: 'effect',
        name: 'CONST_ANI_WEAPONTYPE',
        sourceId: 254,
        sourceFile: 'src/utils/utils_definitions.hpp',
      },
      {
        kind: 'item',
        name: 'dead rotworm',
        sourceId: '5967',
        sourceFile: 'data/items/items.xml',
      },
      {
        kind: 'item',
        name: 'small splash',
        sourceId: '2889',
        sourceFile: 'data/items/items.xml',
      },
    ],
    postures,
    sourceFiles: hashedSources(),
    ...overrides,
  };
}

function files(
  overrides: Record<string, string | undefined> = {},
): ReadonlyMap<string, string> {
  const entries = Object.entries({ ...sourceFiles, ...overrides }).flatMap(
    ([path, contents]) =>
      contents === undefined ? [] : ([[path, contents]] as const),
  );
  return new Map(entries);
}

describe('validateCombatSelection', () => {
  it('freezes unrestricted spell access on the hunt-level Knight sheet', async () => {
    const frozen = JSON.parse(
      await readFile(
        resolve(
          import.meta.dirname,
          '../../packages/content/src/selections/pb-05-knight-combat.json',
        ),
        'utf8',
      ),
    ) as {
      readonly spellAccess: string;
      readonly postures: readonly {
        readonly abilityId: string;
        readonly conditionId: string;
        readonly source: {
          readonly provider: string;
          readonly version: string;
          readonly divergence: string;
        };
      }[];
      readonly sourceFiles: readonly {
        readonly relativePath: string;
      }[];
      readonly character: {
        readonly level: number;
        readonly maxHealth: number;
        readonly maxMana: number;
        readonly spellAccess: string;
        readonly trivializesHunt: boolean;
      };
      readonly spells: readonly { readonly huntboundAccess: string }[];
      readonly resolvedPower: {
        readonly berserk: {
          readonly minPower: number;
          readonly maxPower: number;
        };
        readonly melee: {
          readonly minPower: number;
          readonly maxPower: number;
        };
      };
    };

    expect(frozen.spellAccess).toBe('unrestricted');
    expect(frozen.character).toMatchObject({
      level: 35,
      maxHealth: 590,
      maxMana: 185,
      spellAccess: 'unrestricted',
      trivializesHunt: false,
    });
    expect(
      frozen.spells.every((spell) => spell.huntboundAccess === 'unrestricted'),
    ).toBe(true);
    expect(frozen.postures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          abilityId: 'blood-rage',
          conditionId: 'blood-rage',
          source: expect.objectContaining({
            provider: 'TibiaWiki',
            version: '15.25.3a4a52',
          }),
        }),
        expect.objectContaining({
          abilityId: 'protector',
          conditionId: 'protector',
          source: expect.objectContaining({
            provider: 'TibiaWiki',
            version: '15.25.3a4a52',
            divergence: expect.stringContaining('PB-11'),
          }),
        }),
      ]),
    );
    expect(
      frozen.sourceFiles.some((entry) => /tibiawiki/i.test(entry.relativePath)),
    ).toBe(false);
    expect(frozen.resolvedPower.berserk).toEqual({
      minPower: 48,
      maxPower: 129,
    });
    expect(frozen.resolvedPower.melee).toEqual({ minPower: 7, maxPower: 78 });
  });

  it('accepts a selection whose every declared ID exists in the snapshot files', () => {
    const result = validateCombatSelection(selection(), files());

    expect(result).toEqual({
      ok: true,
      presentIds: [
        'vocation:4',
        'spell:80',
        'spell:61',
        'spell:123',
        'item:3264',
        'effect:CONST_ME_DRAWBLOOD',
        'effect:CONST_ME_HITAREA',
        'effect:CONST_ME_MAGIC_BLUE',
        'effect:CONST_ANI_WEAPONTYPE',
        'item:5967',
        'item:2889',
        'creature:rotworm',
        'posture:blood-rage',
        'posture:protector',
      ],
      diagnostics: [],
    });
  });

  it('only reports posture ids when the posture block is valid', () => {
    const result = validateCombatSelection(
      selection({
        postures: [
          {
            ...postures[0],
            source: {
              provider: 'TibiaWiki',
              divergence: postures[0].source.divergence,
            },
          },
          postures[1],
        ],
      }),
      files(),
    );

    expect(result.ok).toBe(false);
    expect(result.presentIds).not.toContain('posture:blood-rage');
    expect(result.presentIds).not.toContain('posture:protector');
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'postures[0].source.version',
        }),
      ]),
    );
  });

  it('lists every missing ID in one report instead of stopping at the first', () => {
    const result = validateCombatSelection(
      selection({
        vocation: {
          stableKey: 'vocation:tibia:knight',
          sourceId: '99',
          sourceFile: 'data/XML/vocations.xml',
          attackSpeedMs: 2000,
          baseSpeed: 110,
        },
        weapon: {
          stableKey: 'item:tibia:sword',
          sourceId: '1',
          sourceFile: 'data/items/items.xml',
          attack: 14,
        },
        spells: [
          {
            stableKey: 'spell:tibia:berserk',
            sourceId: '1',
            words: 'exori',
            sourceFile: 'data/scripts/spells/attack/berserk.lua',
            cooldownMs: 4000,
            groupCooldownMs: 2000,
          },
        ],
        assets: [
          {
            kind: 'effect',
            name: 'CONST_ME_POFF',
            sourceId: 3,
            sourceFile: 'src/utils/utils_definitions.hpp',
          },
        ],
      }),
      files(),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'PB05_ID_MISSING',
      'PB05_ID_MISSING',
      'PB05_ID_MISSING',
      'PB05_ID_MISSING',
    ]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.path)).toEqual([
      'vocation.sourceId',
      'spells[0].sourceId',
      'weapon.sourceId',
      'assets[0].sourceId',
    ]);
  });

  it('reports a hash mismatch and a missing source file together', () => {
    const result = validateCombatSelection(
      selection({
        sourceFiles: [
          {
            relativePath: 'data/XML/vocations.xml',
            sha256: '0'.repeat(64),
          },
          {
            relativePath: 'data/scripts/spells/attack/missing.lua',
            sha256: '1'.repeat(64),
          },
        ],
      }),
      files(),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        path: 'sourceFiles[0].sha256',
        code: 'PB05_SOURCE_HASH_MISMATCH',
      }),
      expect.objectContaining({
        path: 'sourceFiles[1].relativePath',
        code: 'PB05_SOURCE_MISSING',
      }),
    ]);
  });

  it('reports every interval that does not divide exactly by 50', () => {
    const result = validateCombatSelection(
      selection({
        vocation: {
          stableKey: 'vocation:tibia:knight',
          sourceId: '4',
          sourceFile: 'data/XML/vocations.xml',
          attackSpeedMs: 2001,
          baseSpeed: 110,
        },
        creature: {
          stableKey: 'creature:tibia:rotworm',
          sourceFile: 'data-otservbr-global/monster/vermins/rotworm.lua',
          speed: 58,
          intervalMs: 1999,
          corpseItemId: 5967,
        },
        spells: [
          {
            stableKey: 'spell:tibia:berserk',
            sourceId: '80',
            words: 'exori',
            sourceFile: 'data/scripts/spells/attack/berserk.lua',
            cooldownMs: 4001,
            groupCooldownMs: 2000,
          },
        ],
      }),
      files(),
    );

    expect(result.ok).toBe(false);
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === 'PB05_INTERVAL_NOT_DIVISIBLE',
      ),
    ).toEqual([
      expect.objectContaining({ path: 'vocation.attackSpeedMs' }),
      expect.objectContaining({ path: 'creature.intervalMs' }),
      expect.objectContaining({ path: 'spells[0].cooldownMs' }),
    ]);
  });
});
