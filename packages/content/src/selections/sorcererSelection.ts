import {
  type CharacterDefinition,
  CharacterDefinitionSchema,
  type ItemDefinition,
  ItemDefinitionSchema,
  type RuntimeContentBundle,
  RuntimeContentBundleSchema,
  type SpellDefinition,
  SpellDefinitionSchema,
  type VocationDefinition,
  VocationDefinitionSchema,
  type VocationFamilyDefinition,
  VocationFamilyDefinitionSchema,
} from '@huntbound/contracts';

export interface SorcererSelection {
  readonly vocationFamily: VocationFamilyDefinition;
  readonly vocation: VocationDefinition;
  readonly weapon: ItemDefinition;
  readonly character: CharacterDefinition;
  readonly spells: readonly SpellDefinition[];
}

interface SelectionRecord {
  readonly vocationFamily: unknown;
  readonly vocation: unknown;
  readonly weapon: unknown;
  readonly character: unknown;
  readonly spells: unknown;
}

function record(value: unknown): SelectionRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Sorcerer selection must be an object');
  }
  return value as SelectionRecord;
}

export function parseSorcererSelection(value: unknown): SorcererSelection {
  const input = record(value);
  const family = VocationFamilyDefinitionSchema.parse(input.vocationFamily);
  const vocation = VocationDefinitionSchema.parse(input.vocation);
  const weapon = ItemDefinitionSchema.parse(input.weapon);
  const character = CharacterDefinitionSchema.parse(input.character);
  const spells = SpellDefinitionSchema.array().parse(input.spells);
  if (!family.vocationKeys.includes(vocation.stableKey)) {
    throw new Error(`Sorcerer family does not include ${vocation.stableKey}`);
  }
  if (character.vocationKey !== vocation.stableKey) {
    throw new Error('Sorcerer character and vocation do not match');
  }
  if (character.weaponItemKey !== weapon.stableKey) {
    throw new Error('Sorcerer character and weapon do not match');
  }
  return { vocationFamily: family, vocation, weapon, character, spells };
}

function upsert<T extends { readonly stableKey: string }>(
  values: readonly T[],
  replacement: T,
): readonly T[] {
  return [
    ...values.filter((value) => value.stableKey !== replacement.stableKey),
    replacement,
  ];
}

export function mergeSorcererRuntimeBundle(
  bundle: RuntimeContentBundle,
  selection: SorcererSelection,
): RuntimeContentBundle {
  const vocationFamilies = [
    ...bundle.vocationFamilies.filter(
      (family) => family.key !== selection.vocationFamily.key,
    ),
    selection.vocationFamily,
  ];
  const merged = {
    ...bundle,
    vocationFamilies,
    vocations: upsert(bundle.vocations, selection.vocation),
    items: upsert(bundle.items, selection.weapon),
    spells: selection.spells.reduce(
      (spells, spell) => upsert(spells, spell),
      bundle.spells,
    ),
    characters: upsert(bundle.characters, selection.character),
  };
  return RuntimeContentBundleSchema.parse(merged);
}
