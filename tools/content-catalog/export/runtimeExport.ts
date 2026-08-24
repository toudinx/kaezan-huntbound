import { createHash } from 'node:crypto';

import type {
  CatalogContentBundle,
  ContentFacet,
  RuntimeContentBundle,
} from '@huntbound/contracts';
import { characterSpellKeysAtLevel } from '../../../packages/contracts/src/index.ts';

const facetOrder: readonly ContentFacet[] = [
  'identity',
  'stats',
  'appearance',
  'combat',
  'conditions',
  'loot',
  'item',
  'progression',
  'spell',
];

function sortFacets(facets: readonly ContentFacet[]): ContentFacet[] {
  return [...facets].sort(
    (left, right) => facetOrder.indexOf(left) - facetOrder.indexOf(right),
  );
}

function canonicalRuntimeBundle(
  bundle: RuntimeContentBundle,
): RuntimeContentBundle {
  return {
    ...bundle,
    slice: {
      ...bundle.slice,
      roots: [...bundle.slice.roots].sort(),
      dependencies: [...bundle.slice.dependencies].sort(),
      projections: [...bundle.slice.projections]
        .map((projection) => ({
          ...projection,
          facets: sortFacets(projection.facets),
        }))
        .sort((left, right) => left.entityKey.localeCompare(right.entityKey)),
    },
    vocationFamilies: [...bundle.vocationFamilies]
      .map((family) => ({
        ...family,
        vocationKeys: [...family.vocationKeys].sort(),
      }))
      .sort((left, right) => left.key.localeCompare(right.key)),
    vocations: [...bundle.vocations]
      .map((vocation) => ({
        ...vocation,
        includedFacets: sortFacets(vocation.includedFacets),
        skillMultipliers: Object.fromEntries(
          Object.entries(vocation.skillMultipliers).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        ),
      }))
      .sort((left, right) => left.stableKey.localeCompare(right.stableKey)),
    creatures: [...bundle.creatures]
      .map((creature) => ({
        ...creature,
        includedFacets: sortFacets(creature.includedFacets),
        resistances: Object.fromEntries(
          Object.entries(creature.resistances).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        ),
      }))
      .sort((left, right) => left.stableKey.localeCompare(right.stableKey)),
    items: [...bundle.items]
      .map((item) => ({
        ...item,
        includedFacets: sortFacets(item.includedFacets),
      }))
      .sort((left, right) => left.stableKey.localeCompare(right.stableKey)),
    spells: [...bundle.spells]
      .map((spell) => ({
        ...spell,
        includedFacets: sortFacets(spell.includedFacets),
        allowedVocationFamilies: [...spell.allowedVocationFamilies].sort(),
      }))
      .sort((left, right) => left.stableKey.localeCompare(right.stableKey)),
    characters: [...bundle.characters]
      .map((character) => {
        if (character.kit !== undefined) {
          return {
            ...character,
            kit: character.kit.map((band) => ({
              ...band,
              spellKeys: [...band.spellKeys],
            })),
          };
        }
        if (character.spellKeys !== undefined) {
          return { ...character, spellKeys: [...character.spellKeys] };
        }
        throw new Error('Character must define either kit or spellKeys');
      })
      .sort((left, right) => left.stableKey.localeCompare(right.stableKey)),
  };
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortObjectKeys(child)]),
  );
}

export function canonicalJsonText(value: unknown): string {
  return `${JSON.stringify(sortObjectKeys(value), null, 2)}\n`;
}

export interface RuntimeExport {
  readonly runtime: RuntimeContentBundle;
  readonly json: string;
  readonly sha256: string;
}

export function createRuntimeExport(
  bundle: RuntimeContentBundle,
): RuntimeExport {
  const runtime = canonicalRuntimeBundle(bundle);
  const json = canonicalJsonText(runtime);
  return {
    runtime,
    json,
    sha256: createHash('sha256')
      .update(Buffer.from(json, 'utf8'))
      .digest('hex'),
  };
}

function entityRelations(
  bundle: CatalogContentBundle,
  stableKey: string,
): readonly string[] {
  const creature = bundle.creatures.find(
    (value) => value.stableKey === stableKey,
  );
  if (creature !== undefined) {
    return [
      ...creature.summons.map((summon) => summon.creatureKey),
      ...creature.loot.map((loot) => loot.itemKey),
    ].sort();
  }
  const spell = bundle.spells.find((value) => value.stableKey === stableKey);
  return spell === undefined ? [] : [...spell.allowedVocationFamilies].sort();
}

export function generateCatalogDocumentation(
  bundle: CatalogContentBundle,
): string {
  const projections = new Map(
    bundle.slice.projections.map((projection) => [
      projection.entityKey,
      projection,
    ]),
  );
  const entities = [
    ...bundle.vocations.map((entity) => ({ kind: 'vocation', entity })),
    ...bundle.creatures.map((entity) => ({ kind: 'creature', entity })),
    ...bundle.items.map((entity) => ({ kind: 'item', entity })),
    ...bundle.spells.map((entity) => ({ kind: 'spell', entity })),
  ].sort((left, right) =>
    left.entity.stableKey.localeCompare(right.entity.stableKey),
  );
  const lines = [
    '# PB-01 Catalog',
    '',
    `- Slice: ${bundle.slice.key}`,
    `- Content version: ${bundle.contentVersion}`,
    `- Snapshot: ${bundle.slice.snapshot}`,
    `- Roots: ${[...bundle.slice.roots].sort().join(', ')}`,
    `- Dependencies: ${[...bundle.slice.dependencies].sort().join(', ')}`,
    '',
    '## Entities',
    '',
  ];
  for (const { kind, entity } of entities) {
    const projection = projections.get(entity.stableKey);
    const relations = entityRelations(bundle, entity.stableKey);
    lines.push(
      `### ${entity.stableKey}`,
      '',
      `- Kind: ${kind}`,
      `- GUID: ${entity.guid}`,
      `- Display name: ${entity.displayName}`,
      `- Facets: ${[...(projection?.facets ?? entity.includedFacets)].join(', ')}`,
      `- Consumer: ${projection?.consumer ?? 'unknown'}`,
      `- Rationale: ${projection?.rationale ?? 'unknown'}`,
      `- Source: ${entity.source.snapshot} / ${entity.source.sourcePath} / ${entity.source.sourceId} / ${entity.source.sourceSha256}`,
      `- Relations: ${relations.length === 0 ? 'none' : relations.join(', ')}`,
      '',
    );
  }
  if (bundle.characters.length > 0) {
    lines.push('## Characters', '');
    for (const character of [...bundle.characters].sort((left, right) =>
      left.stableKey.localeCompare(right.stableKey),
    )) {
      lines.push(
        `### ${character.stableKey}`,
        '',
        `- Vocation: ${character.vocationKey}`,
        `- Level: ${character.level}`,
        `- Skills: ${Object.entries(character.skills)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([skill, value]) => `${skill} ${value}`)
          .join(', ')}`,
        `- Weapon: ${character.weaponItemKey} attack ${character.weaponAttack}`,
        `- Vitals: health ${character.maxHealth}, mana ${character.maxMana}`,
        `- Active spells: ${characterSpellKeysAtLevel(character).join(', ')}`,
        '',
      );
    }
  }
  return `${lines.join('\n').replace(/\n+$/u, '')}\n`;
}
