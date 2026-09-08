/**
 * What a dropped item is worth to the character wearing it.
 *
 * PB-13-04 makes the set the axis of progression (decision 4 of the PB-13
 * README), so this module answers three questions and only those: which slot a
 * piece belongs in, what wearing a set does to the sheet, and how much of a
 * band's set the player has actually found.
 *
 * The stats themselves are Canary's, imported by `parseItemsXml` and carried on
 * `ItemDefinition`. Nothing here invents a number, and nothing here invents a
 * drop: a band's set is exactly the equippable part of the loot the species'
 * Lua already declares.
 */
import {
  type CharacterEquipment,
  EQUIPMENT_SLOTS,
  type EquipmentSlot,
  type ItemDefinition,
} from '@huntbound/contracts';

/**
 * Canary's `slotType` word for each Huntbound slot that is not the weapon.
 *
 * `slotType` also carries `ring`, `necklace`, `ammo` and `backpack`; they have
 * no slot here because no band from 1 to 5 drops one, and a slot with nothing
 * to put in it is a row of empty UI.
 */
const SLOT_BY_SLOT_TYPE: ReadonlyMap<string, EquipmentSlot> = new Map([
  ['head', 'helmet'],
  ['body', 'armor'],
  ['legs', 'legs'],
  ['feet', 'boots'],
  ['shield', 'shield'],
]);

/** The `weaponType` words that are a melee weapon rather than a shield. */
const MELEE_WEAPON_TYPES: ReadonlySet<string> = new Set([
  'sword',
  'club',
  'axe',
]);

/** The one the Knight's `sword` skill is trained for. */
const TRAINED_WEAPON_TYPE = 'sword';

/**
 * The untrained skill a Knight swings anything else at.
 *
 * It is the base skill `knightProgression` creates a character with, which is
 * what makes the rule honest rather than a penalty invented here: picking up a
 * mace does not un-train your sword, it just does not use it. This is why a
 * higher-attack weapon of the wrong type is still the piece you sell.
 */
export const UNTRAINED_WEAPON_SKILL = 10;

export function equipmentSlotFor(item: ItemDefinition): EquipmentSlot | null {
  const weaponType = item.weaponType;
  if (weaponType !== undefined) {
    if (MELEE_WEAPON_TYPES.has(weaponType)) return 'weapon';
    if (weaponType === 'shield') return 'shield';
    return null;
  }
  return SLOT_BY_SLOT_TYPE.get(item.slotType ?? '') ?? null;
}

/** Whether the Knight's `sword` skill applies to this weapon. */
export function isTrainedWeapon(item: ItemDefinition): boolean {
  return item.weaponType === TRAINED_WEAPON_TYPE;
}

export interface EquippedWeapon {
  readonly itemKey: string;
  readonly attack: number;
  readonly trained: boolean;
}

export interface EquippedStats {
  /** The weapon in hand, or `null` when the character fights with the sheet's. */
  readonly weapon: EquippedWeapon | null;
  /** Armor summed over every worn piece. */
  readonly armor: number;
  /** Defense summed over every worn piece. Carried for the sheet; PB-15 uses it. */
  readonly defense: number;
}

export type ItemLookup = (itemKey: string) => ItemDefinition | undefined;

/**
 * Reads the worn set into the three numbers the character sheet needs.
 *
 * An item key the catalog does not know is skipped rather than thrown on: a
 * save older than the slice it was farmed in is a reason to stand there
 * unarmoured, not a reason to refuse to load.
 */
export function resolveEquippedStats(
  equipment: CharacterEquipment,
  lookup: ItemLookup,
): EquippedStats {
  let weapon: EquippedWeapon | null = null;
  let armor = 0;
  let defense = 0;
  for (const slot of EQUIPMENT_SLOTS) {
    const itemKey = equipment[slot];
    if (itemKey === null) continue;
    const item = lookup(itemKey);
    if (item === undefined) continue;
    armor += item.armor ?? 0;
    defense += item.defense ?? 0;
    if (slot === 'weapon') {
      weapon = {
        itemKey,
        attack: item.attack ?? 0,
        trained: isTrainedWeapon(item),
      };
    }
  }
  return { weapon, armor, defense };
}

export interface SetPiece {
  readonly itemKey: string;
  readonly displayName: string;
  readonly slot: EquipmentSlot;
  readonly collected: boolean;
}

export interface BandSet {
  readonly pieces: readonly SetPiece[];
  readonly collected: number;
  readonly total: number;
}

/**
 * The set of a hunting place: the equippable part of what its creatures drop.
 *
 * Deriving it beats authoring it. The loot table is already frozen per band in
 * `docs/content/HUNT_BANDS.md` and already generated into the hunt index, so a
 * second list would only be a place for the two to disagree -- and the design
 * rule the card carries from PB-08 falls out for free: one form per slot per
 * band, because the band drops what it drops.
 */
export function bandSetFor(
  lootItemKeys: readonly string[],
  collection: readonly string[],
  lookup: ItemLookup,
): BandSet {
  const owned = new Set(collection);
  const pieces: SetPiece[] = [];
  const seen = new Set<string>();
  for (const itemKey of lootItemKeys) {
    if (seen.has(itemKey)) continue;
    seen.add(itemKey);
    const item = lookup(itemKey);
    if (item === undefined) continue;
    const slot = equipmentSlotFor(item);
    if (slot === null) continue;
    pieces.push({
      itemKey,
      displayName: item.displayName,
      slot,
      collected: owned.has(itemKey),
    });
  }
  pieces.sort((left, right) =>
    left.itemKey === right.itemKey ? 0 : left.itemKey < right.itemKey ? -1 : 1,
  );
  return {
    pieces,
    collected: pieces.filter((piece) => piece.collected).length,
    total: pieces.length,
  };
}
