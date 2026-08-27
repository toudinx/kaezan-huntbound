import type { ContentSliceDefinition } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { validateSliceSelection } from './validateSliceSelection';

type SelectionInput = Record<string, unknown> & {
  roots: string[];
  projections: Array<Record<string, unknown>>;
  rootSourceIds: Record<string, string[]>;
  projectionPolicy: Record<string, unknown>;
};

function asSliceDefinition(selection: SelectionInput): ContentSliceDefinition {
  return selection as unknown as ContentSliceDefinition;
}

function selectionFixture(): SelectionInput {
  return {
    key: 'fixture:pb-01-contract-coverage',
    objective: 'fixture objective',
    consumer: 'fixture consumer',
    roots: [
      'vocation:tibia:knight',
      'spell:tibia:berserk',
      'spell:tibia:brutal-strike',
      'spell:tibia:wound-cleansing',
      'spell:tibia:groundshaker',
      'spell:tibia:whirlwind-throw',
      'creature:tibia:rotworm',
      'creature:tibia:cyclops',
      'creature:tibia:amazon',
      'creature:tibia:orc-shaman',
      'creature:tibia:hero',
    ],
    dependencies: ['creature:tibia:snake'],
    projections: [
      {
        entityKey: 'vocation:tibia:knight',
        facets: ['identity', 'progression'],
        consumer: 'vocation tests',
        rationale: 'vocation fixture',
      },
      {
        entityKey: 'spell:tibia:berserk',
        facets: ['identity', 'spell'],
        consumer: 'spell tests',
        rationale: 'spell fixture',
      },
      {
        entityKey: 'spell:tibia:brutal-strike',
        facets: ['identity', 'spell'],
        consumer: 'spell tests',
        rationale: 'brutal strike fixture',
      },
      {
        entityKey: 'spell:tibia:wound-cleansing',
        facets: ['identity', 'spell'],
        consumer: 'spell tests',
        rationale: 'wound cleansing fixture',
      },
      {
        entityKey: 'spell:tibia:groundshaker',
        facets: ['identity', 'spell'],
        consumer: 'spell tests',
        rationale: 'groundshaker fixture',
      },
      {
        entityKey: 'spell:tibia:whirlwind-throw',
        facets: ['identity', 'spell'],
        consumer: 'spell tests',
        rationale: 'whirlwind throw fixture',
      },
      ...[
        'creature:tibia:rotworm',
        'creature:tibia:cyclops',
        'creature:tibia:amazon',
        'creature:tibia:orc-shaman',
        'creature:tibia:hero',
      ].map((entityKey) => ({
        entityKey,
        facets: ['identity', 'stats', 'appearance', 'combat', 'loot'],
        consumer: 'creature tests',
        rationale: 'creature fixture',
      })),
      {
        entityKey: 'creature:tibia:snake',
        facets: ['identity', 'stats', 'appearance', 'combat', 'conditions'],
        consumer: 'summon tests',
        rationale: 'summon fixture',
      },
    ],
    dependencyMode: 'reachable-only',
    curationState: 'accepted',
    exportVersion: '1',
    snapshot: '157e6f9e21318bd3033eea553fe9275b429faf72',
    sourceFiles: [
      'data/XML/vocations.xml',
      'data/items/items.xml',
      'data/scripts/spells/attack/berserk.lua',
      'data/scripts/spells/attack/brutal_strike.lua',
      'data/scripts/spells/healing/wound_cleansing.lua',
      'data/scripts/spells/attack/groundshaker.lua',
      'data/scripts/spells/attack/whirlwind_throw.lua',
      'data-otservbr-global/monster/vermins/rotworm.lua',
      'data-otservbr-global/monster/giants/cyclops.lua',
      'data-otservbr-global/monster/humans/amazon.lua',
      'data-otservbr-global/monster/humanoids/orc_shaman.lua',
      'data-otservbr-global/monster/humans/hero.lua',
      'data-otservbr-global/monster/reptiles/snake.lua',
    ],
    rootSourceIds: {
      vocation: ['4'],
      spell: ['80', '61', '123', '106', '107'],
      creature: ['26', '22', '77', '6', '73'],
    },
    projectionPolicy: {
      vocationFamilyKey: 'vocation-family:huntbound:knight',
      rawReferenceMappings: [
        {
          rawReference: 'knight',
          targetFamilyKey: 'vocation-family:huntbound:knight',
        },
        {
          rawReference: 'elite knight',
          targetFamilyKey: 'vocation-family:huntbound:knight',
        },
      ],
      aliases: [],
    },
    dependencySourceIds: { creature: ['28'] },
    characters: [
      {
        stableKey: 'character:huntbound:knight-venore-rotworm-cave',
        vocationKey: 'vocation:tibia:knight',
        level: 35,
        skills: { sword: 60, magic: 0 },
        weaponItemKey: 'item:tibia:sword',
        weaponSourceId: '3264',
        weaponAttack: 14,
        maxHealth: 590,
        maxMana: 185,
        spellKeys: [
          'spell:tibia:berserk',
          'spell:tibia:brutal-strike',
          'spell:tibia:wound-cleansing',
          'spell:tibia:groundshaker',
          'spell:tibia:whirlwind-throw',
        ],
      },
      {
        stableKey: 'character:huntbound:knight-cyclopolis',
        vocationKey: 'vocation:tibia:knight',
        level: 45,
        skills: { sword: 60, magic: 0 },
        weaponItemKey: 'item:tibia:sword',
        weaponSourceId: '3264',
        weaponAttack: 14,
        maxHealth: 740,
        maxMana: 185,
        spellKeys: [
          'spell:tibia:berserk',
          'spell:tibia:brutal-strike',
          'spell:tibia:wound-cleansing',
          'spell:tibia:groundshaker',
          'spell:tibia:whirlwind-throw',
        ],
      },
      {
        stableKey: 'character:huntbound:knight-hero-cave',
        vocationKey: 'vocation:tibia:knight',
        level: 130,
        skills: { sword: 90, magic: 0 },
        weaponItemKey: 'item:tibia:two-handed-sword',
        weaponSourceId: '3265',
        weaponAttack: 30,
        maxHealth: 2015,
        maxMana: 645,
        spellKeys: [
          'spell:tibia:berserk',
          'spell:tibia:brutal-strike',
          'spell:tibia:wound-cleansing',
          'spell:tibia:groundshaker',
          'spell:tibia:whirlwind-throw',
        ],
      },
    ],
  };
}

describe('curated slice selection', () => {
  it('accepts the frozen curated selection and its dependency projection', () => {
    expect(
      validateSliceSelection(asSliceDefinition(selectionFixture())),
    ).toEqual([]);
  });

  it('rejects a root outside the frozen curated set', () => {
    const selection = selectionFixture();
    selection.roots.push('creature:tibia:snake');

    expect(validateSliceSelection(asSliceDefinition(selection))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'selection.root-set-mismatch' }),
      ]),
    );
  });

  it('rejects a manually supplied GUID in the root list', () => {
    const selection = selectionFixture();
    selection.roots[0] = '9a8dd398-e67b-5a98-be03-3406bd581cf9';

    expect(validateSliceSelection(asSliceDefinition(selection))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'selection.manual-guid' }),
      ]),
    );
  });

  it('rejects duplicate source IDs within an entity kind', () => {
    const selection = selectionFixture();
    selection.rootSourceIds.creature?.push('26');

    expect(validateSliceSelection(asSliceDefinition(selection))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'selection.duplicate-source-id' }),
      ]),
    );
  });

  it('rejects a facet without consumer or rationale and fields outside facets', () => {
    const selection = selectionFixture();
    const projection = selection.projections[0];
    if (projection === undefined) throw new Error('Expected a projection');
    projection.consumer = '';
    projection.rationale = '';
    projection.fields = ['loot'];

    const diagnostics = validateSliceSelection(asSliceDefinition(selection));

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'schema.too_small' }),
        expect.objectContaining({ code: 'selection.field-without-facet' }),
      ]),
    );
  });

  it('rejects an item declared as a root without a curation justification', () => {
    const selection = selectionFixture();
    selection.roots[0] = 'item:tibia:3031';

    expect(validateSliceSelection(asSliceDefinition(selection))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'selection.item-root-not-allowed' }),
      ]),
    );
  });

  it('keeps raw Elite Knight as a family projection and rejects an entity alias', () => {
    const selection = selectionFixture();
    const policy = selection.projectionPolicy;
    policy.aliases = ['elite knight'];

    expect(validateSliceSelection(asSliceDefinition(selection))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'selection.raw-reference-alias' }),
      ]),
    );
  });
});
