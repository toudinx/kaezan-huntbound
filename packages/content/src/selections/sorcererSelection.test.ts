import type { CatalogContentBundle } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';
import catalogJson from '../generated/pb-01-contract-coverage.json?raw';
import { projectRuntimeBundle } from '../runtime/contentRegistry.ts';
import selectionJson from './pb-14-03-sorcerer.json?raw';
import {
  mergeSorcererRuntimeBundle,
  parseSorcererSelection,
} from './sorcererSelection.ts';

describe('PB-14-03 Sorcerer selection', () => {
  it('parses the complete curated kit and wand', () => {
    const selection = parseSorcererSelection(JSON.parse(selectionJson));

    expect(selection.vocation.stableKey).toBe('vocation:tibia:sorcerer');
    expect(selection.weapon.weaponType).toBe('wand');
    expect(selection.spells.map((spell) => spell.stableKey)).toEqual([
      'spell:tibia:energy-strike',
      'spell:tibia:fire-wave',
      'spell:tibia:great-fireball',
      'spell:tibia:sudden-death',
      'spell:tibia:ultimate-healing',
      'spell:tibia:magic-shield',
      'spell:tibia:arcane-stance',
      'spell:tibia:haste',
    ]);
  });

  it('merges Sorcerer dependencies into the runtime catalog without replacing hunts', () => {
    const base = projectRuntimeBundle(
      JSON.parse(catalogJson) as CatalogContentBundle,
    );
    const merged = mergeSorcererRuntimeBundle(
      base,
      parseSorcererSelection(JSON.parse(selectionJson)),
    );

    expect(merged.vocationFamilies).toContainEqual(
      expect.objectContaining({
        key: 'vocation-family:huntbound:sorcerer',
      }),
    );
    expect(merged.items).toContainEqual(
      expect.objectContaining({
        stableKey: 'item:tibia:wand-of-decay',
        weaponType: 'wand',
      }),
    );
    expect(merged.characters).toContainEqual(
      expect.objectContaining({
        stableKey: 'character:huntbound:sorcerer',
      }),
    );
  });
});
