import { type CockpitAsset, createAtlasFrame } from './AssetFrame';

/**
 * The Tibia spell icon for one deck cell.
 *
 * The deck used to draw a 5x5 area glyph beside the icon, saying *where* the
 * spell lands. It was dropped once the real icons shipped: the art already
 * names the spell, and the grid only competed with it for the cell.
 */

export type AbilityIconAsset = CockpitAsset;

/** The stable manifest key delivered by PB-17-01 for one spell icon. */
export function spellIconAssetKey(abilityId: string): string {
  return `spell:tibia:${abilityId}`;
}

/**
 * Builds the icon when the hunt pack has resolved it. An absent asset leaves
 * the cell to its hotkey and cost, which is what the attack cell has always
 * shown and what a future ability without personal art gets.
 */
export function createAbilityIcon(
  document: Document,
  abilityId: string,
  asset: AbilityIconAsset | undefined,
): HTMLElement | undefined {
  if (asset === undefined) return undefined;

  const icon = createAtlasFrame(document, asset, {
    frameClassName: 'cockpit-cell__icon',
    imageClassName: 'cockpit-cell__icon-image',
    alt: '',
    imageAriaHidden: true,
  });
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('data-asset-key', spellIconAssetKey(abilityId));

  return icon;
}
