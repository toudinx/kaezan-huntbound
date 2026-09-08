import {
  bandSetFor,
  equipmentSlotFor,
  isTrainedWeapon,
  knightProgressAtExperience,
  resolveEquippedStats,
} from '../../../../packages/content/src/index.ts';
import {
  type CharacterProgress,
  EQUIPMENT_SLOTS,
  type EquipmentSlot,
  type HuntIndex,
  type HuntIndexCreature,
  type HuntIndexEntry,
  type HuntIndexLootEntry,
  type ItemDefinition,
  type NextHuntBuffState,
  type RunBagEntry,
} from '../../../../packages/contracts/src/index.ts';

export interface HuntingPlacesScreen {
  destroy(): void;
}

export type HuntPlaceSelectionHandler = (hunt: HuntIndexEntry) => void;

/**
 * Everything the atlas needs to let the player change what they are wearing.
 *
 * Gear is chosen here and nowhere else: the kernel is built from the sheet when
 * a run starts, so a set put on mid-hunt would be a set the simulation never
 * hears about. Between runs is also where the choice belongs -- decision 5 of
 * the PB-13 README makes the set of one band the thing that carries you into
 * the next, which is a decision you make on the way in.
 */
export interface HuntingPlacesGear {
  readonly stash: readonly RunBagEntry[];
  readonly item: (itemKey: string) => ItemDefinition | undefined;
  readonly onEquip: (slot: EquipmentSlot, itemKey: string) => void;
  readonly onUnequip: (slot: EquipmentSlot) => void;
}

/**
 * The one between-runs purchase: a blessing that lasts the next hunt.
 *
 * Bought here, never from the bag, because charges stay free and this is
 * not an inventory item. `pending` is paid and waiting; `active` is already
 * inside a run that a reload brought the player back to the atlas from.
 */
export interface HuntingPlacesPreparation {
  readonly gold: number;
  readonly status: NextHuntBuffState;
  readonly price: number;
  readonly damagePercent: number;
  readonly onBuy: () => void;
}

/**
 * What the run the player just left was worth.
 *
 * The atlas is where a run ends, so it is the only place the reward can be
 * read. `banked` is what the bag added to the stash, which is empty on a death
 * by decision 1 of the PB-13 README.
 */
export interface HuntRunSummary {
  readonly outcome: 'completed' | 'died';
  readonly huntName: string;
  readonly banked: readonly RunBagEntry[];
  readonly stash: readonly RunBagEntry[];
  readonly completedRuns: number;
  /** Experience the run earned. A death keeps it: only the bag is lost. */
  readonly experienceGained: number;
}

const numberFormatter = new Intl.NumberFormat('en-US');

function formatInteger(value: number): string {
  return numberFormatter.format(value);
}

function formatContentName(key: string): string {
  const slug = key.split(':').at(-1) ?? key;
  return slug
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function formatVocation(key: string): string {
  return formatContentName(key);
}

function formatChance(chancePerHundredThousand: number): string {
  const percent = chancePerHundredThousand / 1_000;
  return `${percent.toFixed(percent % 1 === 0 ? 0 : 2)}%`;
}

function createTextElement<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tagName: K,
  text: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className !== undefined) element.className = className;
  return element;
}

function createFact(
  document: Document,
  label: string,
  value: string,
  testId: string,
): HTMLElement {
  const fact = document.createElement('div');
  fact.className = 'hunting-places__fact';
  const labelElement = createTextElement(
    document,
    'dt',
    label,
    'hunting-places__fact-label',
  );
  const valueElement = createTextElement(
    document,
    'dd',
    value,
    'hunting-places__fact-value',
  );
  valueElement.setAttribute('data-testid', testId);
  fact.append(labelElement, valueElement);
  return fact;
}

function createLootEntry(
  document: Document,
  loot: HuntIndexLootEntry,
): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'hunting-places__loot-item';
  item.setAttribute('data-testid', 'hunt-place-loot-entry');
  item.append(
    createTextElement(
      document,
      'span',
      formatContentName(loot.itemKey),
      'hunting-places__loot-name',
    ),
    createTextElement(
      document,
      'span',
      formatChance(loot.chancePerHundredThousand),
      'hunting-places__loot-chance',
    ),
    createTextElement(
      document,
      'span',
      `${loot.minCount}–${loot.maxCount}`,
      'hunting-places__loot-count',
    ),
  );
  return item;
}

function createCreature(
  document: Document,
  creature: HuntIndexCreature,
): HTMLElement {
  const article = document.createElement('article');
  article.className = 'hunting-places__creature';
  article.setAttribute('data-testid', 'hunt-place-creature');
  article.setAttribute('data-creature-key', creature.creatureKey);

  const heading = createTextElement(
    document,
    'h3',
    creature.displayName,
    'hunting-places__creature-name',
  );
  heading.setAttribute('data-testid', 'hunt-place-creature-name');

  const stats = document.createElement('p');
  stats.className = 'hunting-places__creature-stats';
  const health = createTextElement(
    document,
    'span',
    `${formatInteger(creature.health)} HP`,
  );
  health.setAttribute('data-testid', 'hunt-place-creature-health');
  const experience = createTextElement(
    document,
    'span',
    `${formatInteger(creature.experience)} XP`,
  );
  experience.setAttribute('data-testid', 'hunt-place-creature-experience');
  const slots = createTextElement(
    document,
    'span',
    `${formatInteger(creature.slotCount)} spawns`,
  );
  stats.append(health, experience, slots);

  const lootHeading = createTextElement(
    document,
    'h4',
    'Loot table',
    'hunting-places__loot-heading',
  );
  const loot = document.createElement('ul');
  loot.className = 'hunting-places__loot';
  loot.setAttribute('data-testid', 'hunt-place-creature-loot');
  if (creature.loot.length === 0) {
    loot.append(
      createTextElement(
        document,
        'li',
        'No catalogued loot',
        'hunting-places__loot-empty',
      ),
    );
  } else {
    loot.append(
      ...creature.loot.map((entry) => createLootEntry(document, entry)),
    );
  }

  article.append(heading, stats, lootHeading, loot);
  return article;
}

function countItems(entries: readonly RunBagEntry[]): number {
  return entries.reduce((total, entry) => total + entry.count, 0);
}

function createRunSummary(
  document: Document,
  summary: HuntRunSummary,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'hunting-places__summary';
  section.setAttribute('data-testid', 'hunt-run-summary');
  section.setAttribute('data-outcome', summary.outcome);
  section.setAttribute('role', 'status');

  const title = createTextElement(
    document,
    'h2',
    summary.outcome === 'completed'
      ? `Left ${summary.huntName} with the bag`
      : `Died in ${summary.huntName}`,
    'hunting-places__summary-title',
  );
  title.setAttribute('data-testid', 'hunt-run-summary-title');

  const banked = document.createElement('ul');
  banked.className = 'hunting-places__summary-banked';
  banked.setAttribute('data-testid', 'hunt-run-summary-banked');
  if (summary.banked.length === 0) {
    banked.append(
      createTextElement(
        document,
        'li',
        summary.outcome === 'completed'
          ? 'Nothing to bank'
          : 'The bag was lost',
        'hunting-places__summary-empty',
      ),
    );
  } else {
    banked.append(
      ...summary.banked.map((entry) => {
        const item = document.createElement('li');
        item.setAttribute('data-testid', 'hunt-run-summary-banked-entry');
        item.textContent = `${formatContentName(entry.itemKey)} × ${formatInteger(entry.count)}`;
        return item;
      }),
    );
  }

  const experience = createTextElement(
    document,
    'p',
    `Experience earned: ${formatInteger(summary.experienceGained)} XP`,
    'hunting-places__summary-experience',
  );
  experience.setAttribute('data-testid', 'hunt-run-summary-experience');
  experience.setAttribute(
    'data-experience-gained',
    String(summary.experienceGained),
  );

  const totals = createTextElement(
    document,
    'p',
    `Stash: ${formatInteger(countItems(summary.stash))} items · Runs completed: ${formatInteger(summary.completedRuns)}`,
    'hunting-places__summary-totals',
  );
  totals.setAttribute('data-testid', 'hunt-run-summary-totals');

  section.append(title, banked, experience, totals);
  return section;
}

/**
 * The character, on the screen where hunts are chosen.
 *
 * It sits above the list because that is the point PB-13-03 is making: the
 * character is the player's and the same one whichever place they walk into.
 * Every hunt stays open -- entering above your band is allowed, and only
 * dangerous.
 */
function createCharacterPanel(
  document: Document,
  character: CharacterProgress,
): HTMLElement {
  const progress = knightProgressAtExperience(character.experience);
  const panel = document.createElement('section');
  panel.className = 'hunting-places__character';
  panel.setAttribute('data-testid', 'hunt-character');
  panel.setAttribute('data-level', String(progress.level));

  const level = createTextElement(
    document,
    'p',
    `Knight · Level ${formatInteger(progress.level)}`,
    'hunting-places__character-level',
  );
  level.setAttribute('data-testid', 'hunt-character-level');

  const experience = createTextElement(
    document,
    'p',
    `${formatInteger(progress.intoLevel)} / ${formatInteger(progress.levelSpan)} XP to level ${formatInteger(progress.level + 1)} · ${formatInteger(progress.experience)} total`,
    'hunting-places__character-experience',
  );
  experience.setAttribute('data-testid', 'hunt-character-experience');
  experience.setAttribute('data-experience', String(progress.experience));

  panel.append(level, experience);
  return panel;
}

const SLOT_LABELS: Readonly<Record<EquipmentSlot, string>> = {
  weapon: 'Weapon',
  shield: 'Shield',
  helmet: 'Helmet',
  armor: 'Armor',
  legs: 'Legs',
  boots: 'Boots',
};

function describeItem(item: ItemDefinition): string {
  const parts: string[] = [];
  if (item.attack !== undefined) {
    parts.push(`Atk ${formatInteger(item.attack)}`);
  }
  if (item.defense !== undefined) {
    parts.push(`Def ${formatInteger(item.defense)}`);
  }
  if (item.armor !== undefined) {
    parts.push(`Arm ${formatInteger(item.armor)}`);
  }
  if (item.weaponType !== undefined && !isTrainedWeapon(item)) {
    parts.push('untrained');
  }
  return parts.length === 0 ? 'no stats' : parts.join(' · ');
}

function createSlotRow(
  document: Document,
  slot: EquipmentSlot,
  character: CharacterProgress,
  gear: HuntingPlacesGear,
): HTMLElement {
  const row = document.createElement('li');
  row.className = 'hunting-places__slot';
  row.setAttribute('data-testid', 'hunt-equipment-slot');
  row.setAttribute('data-slot', slot);

  const wornKey = character.equipment[slot];
  const worn = wornKey === null ? undefined : gear.item(wornKey);
  const label = createTextElement(
    document,
    'span',
    SLOT_LABELS[slot],
    'hunting-places__slot-label',
  );
  // A worn key the catalog no longer knows still names itself and still comes
  // off: the one thing worse than an unreadable piece is one stuck in the slot.
  const wornText =
    wornKey === null
      ? 'empty'
      : worn === undefined
        ? `${formatContentName(wornKey)} — unknown to this slice`
        : `${worn.displayName} — ${describeItem(worn)}`;
  const value = createTextElement(
    document,
    'span',
    wornText,
    'hunting-places__slot-value',
  );
  value.setAttribute('data-testid', 'hunt-equipment-worn');
  row.append(label, value);

  if (wornKey !== null) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'hunting-places__slot-action';
    remove.setAttribute('data-testid', 'hunt-equipment-unequip');
    remove.setAttribute('data-slot', slot);
    remove.textContent = 'Unequip';
    remove.addEventListener('click', () => {
      gear.onUnequip(slot);
    });
    row.append(remove);
  }

  for (const entry of gear.stash) {
    const item = gear.item(entry.itemKey);
    if (item === undefined || equipmentSlotFor(item) !== slot) continue;
    const equip = document.createElement('button');
    equip.type = 'button';
    equip.className = 'hunting-places__slot-action';
    equip.setAttribute('data-testid', 'hunt-equipment-equip');
    equip.setAttribute('data-slot', slot);
    equip.setAttribute('data-item-key', entry.itemKey);
    equip.textContent = `Equip ${item.displayName} (${describeItem(item)})`;
    equip.addEventListener('click', () => {
      gear.onEquip(slot, entry.itemKey);
    });
    row.append(equip);
  }

  return row;
}

/**
 * What the character is wearing, and what in the stash could replace it.
 *
 * Every slot is listed, worn or not, because an empty slot is the clearest
 * statement of what the band still owes you. A piece the stash holds and the
 * slot accepts becomes a button next to it, so comparing is reading one line.
 */
function createEquipmentPanel(
  document: Document,
  character: CharacterProgress,
  gear: HuntingPlacesGear,
): HTMLElement {
  const stats = resolveEquippedStats(character.equipment, gear.item);
  const panel = document.createElement('section');
  panel.className = 'hunting-places__equipment';
  panel.setAttribute('data-testid', 'hunt-equipment');
  panel.setAttribute('data-armor', String(stats.armor));

  const title = createTextElement(
    document,
    'h2',
    'Equipment',
    'hunting-places__section-title',
  );
  const totals = createTextElement(
    document,
    'p',
    `Armor ${formatInteger(stats.armor)} · Defense ${formatInteger(stats.defense)}`,
    'hunting-places__equipment-totals',
  );
  totals.setAttribute('data-testid', 'hunt-equipment-totals');

  const slots = document.createElement('ul');
  slots.className = 'hunting-places__slots';
  slots.append(
    ...EQUIPMENT_SLOTS.map((slot) =>
      createSlotRow(document, slot, character, gear),
    ),
  );

  panel.append(title, totals, slots);
  return panel;
}

function createPreparationPanel(
  document: Document,
  preparation: HuntingPlacesPreparation,
): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'hunting-places__preparation';
  panel.setAttribute('data-testid', 'hunt-preparation');
  panel.setAttribute('data-status', preparation.status);

  const title = createTextElement(
    document,
    'h2',
    'Prepared hunt',
    'hunting-places__section-title',
  );
  const gold = createTextElement(
    document,
    'p',
    `Gold: ${formatInteger(preparation.gold)}`,
    'hunting-places__preparation-gold',
  );
  gold.setAttribute('data-testid', 'hunt-preparation-gold');

  const benefit = createTextElement(
    document,
    'p',
    `+${formatInteger(preparation.damagePercent)}% damage for the next hunt, then it ends. ${formatInteger(preparation.price)} gold.`,
    'hunting-places__preparation-benefit',
  );
  benefit.setAttribute('data-testid', 'hunt-preparation-benefit');

  const status = createTextElement(
    document,
    'p',
    preparation.status === 'pending'
      ? 'Ready. The next hunt deals the extra damage, then the blessing ends.'
      : preparation.status === 'active'
        ? 'Already running in the open hunt. It ends when you leave.'
        : 'Not bought.',
    'hunting-places__preparation-status',
  );
  status.setAttribute('data-testid', 'hunt-preparation-status');

  const buy = document.createElement('button');
  buy.type = 'button';
  buy.className = 'hunting-places__select';
  buy.setAttribute('data-testid', 'hunt-preparation-buy');
  const canBuy =
    preparation.status === 'none' && preparation.gold >= preparation.price;
  buy.disabled = !canBuy;
  buy.textContent = canBuy
    ? `Buy for ${formatInteger(preparation.price)} gold`
    : preparation.status === 'none'
      ? `Need ${formatInteger(preparation.price)} gold`
      : 'Already bought';
  buy.addEventListener('click', () => {
    if (buy.disabled) return;
    buy.disabled = true;
    preparation.onBuy();
  });

  panel.append(title, gold, benefit, status, buy);
  return panel;
}

/** How much of this place's set the player has already found. */
function createSetProgress(
  document: Document,
  hunt: HuntIndexEntry,
  character: CharacterProgress,
  gear: HuntingPlacesGear,
): HTMLElement {
  const lootKeys = hunt.creatures.flatMap((creature) =>
    creature.loot.map((entry) => entry.itemKey),
  );
  const set = bandSetFor(lootKeys, character.collection, gear.item);
  const section = document.createElement('div');
  section.className = 'hunting-places__set';
  section.setAttribute('data-testid', 'hunt-place-set');
  section.setAttribute('data-collected', String(set.collected));
  section.setAttribute('data-total', String(set.total));

  const heading = createTextElement(
    document,
    'h3',
    `Set ${formatInteger(set.collected)} / ${formatInteger(set.total)}`,
    'hunting-places__section-title',
  );
  const pieces = document.createElement('ul');
  pieces.className = 'hunting-places__set-pieces';
  pieces.append(
    ...set.pieces.map((piece) => {
      const item = document.createElement('li');
      item.setAttribute('data-testid', 'hunt-place-set-piece');
      item.setAttribute('data-item-key', piece.itemKey);
      item.setAttribute('data-collected', String(piece.collected));
      const suffix = piece.collected ? '' : ' — missing';
      item.textContent = `${piece.displayName} (${SLOT_LABELS[piece.slot]})${suffix}`;
      return item;
    }),
  );

  section.append(heading, pieces);
  return section;
}

function createHuntCard(
  document: Document,
  hunt: HuntIndexEntry,
  onSelect: HuntPlaceSelectionHandler,
  set?: HTMLElement,
): HTMLElement {
  const card = document.createElement('article');
  card.className = 'hunting-places__card';
  card.setAttribute('data-testid', 'hunt-place-card');
  card.setAttribute('data-hunt-id', hunt.huntId);

  const header = document.createElement('header');
  header.className = 'hunting-places__card-header';
  const title = createTextElement(
    document,
    'h2',
    hunt.displayName,
    'hunting-places__card-title',
  );
  title.setAttribute('data-testid', 'hunt-place-name');
  const badge = createTextElement(
    document,
    'span',
    `Band ${hunt.band}`,
    'hunting-places__band',
  );
  badge.setAttribute('data-testid', 'hunt-place-band');
  header.append(title, badge);

  const details = document.createElement('p');
  details.className = 'hunting-places__card-details';
  const level = createTextElement(
    document,
    'span',
    `Level ${hunt.recommendedLevel}`,
  );
  level.setAttribute('data-testid', 'hunt-place-level');
  const vocation = createTextElement(
    document,
    'span',
    `Recommended for ${formatVocation(hunt.soloVocation)}`,
  );
  vocation.setAttribute('data-testid', 'hunt-place-vocation');
  details.append(level, vocation);

  const summary = document.createElement('dl');
  summary.className = 'hunting-places__facts';
  summary.append(
    createFact(
      document,
      'Experience / hour',
      `${formatInteger(hunt.experiencePerHour)} XP/h`,
      'hunt-place-experience',
    ),
    createFact(
      document,
      'Live actors',
      formatInteger(hunt.maxLiveActors),
      'hunt-place-live-actors',
    ),
  );

  const creaturesHeading = createTextElement(
    document,
    'h3',
    'Creatures',
    'hunting-places__section-title',
  );
  const creatures = document.createElement('div');
  creatures.className = 'hunting-places__creatures';
  creatures.append(
    ...hunt.creatures.map((creature) => createCreature(document, creature)),
  );

  const select = document.createElement('button');
  select.type = 'button';
  select.className = 'hunting-places__select';
  select.setAttribute('data-testid', 'hunt-place-select');
  select.setAttribute('data-hunt-id', hunt.huntId);
  select.setAttribute('aria-label', `Enter ${hunt.displayName}`);
  select.textContent = 'Enter hunt';
  select.addEventListener('click', () => {
    if (select.disabled) return;
    select.disabled = true;
    select.setAttribute('aria-busy', 'true');
    card.setAttribute('data-selected', 'true');
    select.textContent = 'Loading hunt…';
    onSelect(hunt);
  });

  card.append(header, details, summary, creaturesHeading, creatures);
  if (set !== undefined) card.append(set);
  card.append(select);
  return card;
}

export function mountHuntingPlaces(
  root: HTMLElement,
  index: HuntIndex,
  onSelect: HuntPlaceSelectionHandler,
  summary?: HuntRunSummary,
  character?: CharacterProgress,
  gear?: HuntingPlacesGear,
  preparation?: HuntingPlacesPreparation,
): HuntingPlacesScreen {
  const document = root.ownerDocument;
  const screen = document.createElement('main');
  screen.className = 'hunting-places';
  screen.setAttribute('data-testid', 'hunting-places-screen');
  screen.setAttribute('data-shell-phase', 'hunting');
  screen.setAttribute('aria-labelledby', 'hunting-places-title');

  const header = document.createElement('header');
  header.className = 'hunting-places__header';
  const eyebrow = createTextElement(
    document,
    'p',
    'Huntbound · Field atlas',
    'hunting-places__eyebrow',
  );
  const title = createTextElement(
    document,
    'h1',
    'Hunting Places',
    'hunting-places__title',
  );
  title.id = 'hunting-places-title';
  const intro = createTextElement(
    document,
    'p',
    'Choose a place to begin your run. Your route sets the field and the recommended kit for now.',
    'hunting-places__intro',
  );
  header.append(eyebrow, title, intro);
  if (character !== undefined) {
    header.append(createCharacterPanel(document, character));
    if (gear !== undefined) {
      header.append(createEquipmentPanel(document, character, gear));
    }
  }
  if (preparation !== undefined) {
    header.append(createPreparationPanel(document, preparation));
  }
  if (summary !== undefined) {
    header.append(createRunSummary(document, summary));
  }

  const list = document.createElement('section');
  list.className = 'hunting-places__list';
  list.setAttribute('data-testid', 'hunting-places-list');
  list.setAttribute('aria-label', 'Available hunting places');
  list.append(
    ...index.hunts.map((hunt) =>
      createHuntCard(
        document,
        hunt,
        onSelect,
        character !== undefined && gear !== undefined
          ? createSetProgress(document, hunt, character, gear)
          : undefined,
      ),
    ),
  );

  screen.append(header, list);
  root.replaceChildren(screen);

  let destroyed = false;
  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      screen.remove();
    },
  };
}
