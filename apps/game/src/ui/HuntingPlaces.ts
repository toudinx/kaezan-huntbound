import {
  bandSetFor,
  equipmentSlotFor,
  isTrainedWeapon,
  knightProgressAtExperience,
  resolveEquippedStats,
  sorcererProgressAtExperience,
  weaponTypesForVocation,
} from '../../../../packages/content/src/index.ts';
import {
  type AchievementDefinition,
  type AchievementProgress,
  type BestiaryProgress,
  type BestiarySpecies,
  type CharacterProgress,
  DEFAULT_KNIGHT_VOCATION_KEY,
  DEFAULT_SORCERER_VOCATION_KEY,
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
  readonly weaponTypes?: readonly string[];
  readonly onEquip: (slot: EquipmentSlot, itemKey: string) => void;
  readonly onUnequip: (slot: EquipmentSlot) => void;
}

export interface HuntingPlacesVocationSelection {
  readonly activeVocationKey: string;
  readonly characters: readonly CharacterProgress[];
  readonly onSelect: (vocationKey: string) => void;
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

const CAMP_ICONS: Readonly<Record<string, string>> = {
  weapon: 'M18 2h4v4L10 18l-4-4ZM4 13l7 7-2 2-7-7Zm-1 7 3-3 2 2-3 3Z',
  shield: 'M12 2 21 5v8c0 5-9 9-9 9S3 18 3 13V5Zm0 3v14c3-2 6-4 6-7V7Z',
  helmet: 'M5 10a7 7 0 0 1 14 0v10h-6v-6h-2v6H5Zm2 0v3h4v-2Zm10 0-4 1v2h4Z',
  armor: 'm7 2 5 3 5-3 5 6-4 3v10H6V11L2 8Zm5 6-3-2v11h3Zm2 0v9h2V6Z',
  legs: 'M5 3h14l-1 18h-5l-1-11-1 11H6Zm2 2v3h10V5Z',
  boots: 'M5 2h6v13l-2 6H1v-5l4-2Zm9 0h6v12l3 2v5h-9l-1-6Z',
  hunts: 'm12 1 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm0 7-4 4 4 4 4-4Z',
  equipment: 'M18 2h4v4L10 18l-4-4ZM4 13l7 7-2 2-7-7Zm-1 7 3-3 2 2-3 3Z',
  bestiary:
    'M3 3h8l1 2 1-2h8v17h-8l-1 2-1-2H3Zm3 4v2h4V7Zm8 0v2h4V7ZM6 12v2h4v-2Zm8 0v2h4v-2Z',
  achievements:
    'M7 2h10v3h5v4c0 4-4 6-7 6l-1 2v3h4v2H6v-2h4v-3l-1-2c-3 0-7-2-7-6V5h5Zm-3 5v2c0 2 2 3 4 4L7 7Zm13 0-1 6c2-1 4-2 4-4V7Z',
};

function createCampIcon(document: Document, kind: string): SVGSVGElement {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('class', `camp-icon camp-icon--${kind}`);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', CAMP_ICONS[kind] ?? CAMP_ICONS.hunts ?? '');
  path.setAttribute('fill-rule', 'evenodd');
  icon.append(path);
  return icon;
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
  const progress = character.vocationKey.endsWith(':sorcerer')
    ? sorcererProgressAtExperience(character.experience)
    : knightProgressAtExperience(character.experience);
  const vocationName = formatVocation(character.vocationKey);
  const panel = document.createElement('section');
  panel.className = 'hunting-places__character';
  panel.setAttribute('data-testid', 'hunt-character');
  panel.setAttribute('data-level', String(progress.level));

  const level = createTextElement(
    document,
    'p',
    `${vocationName} · Level ${formatInteger(progress.level)}`,
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

  const meter = document.createElement('progress');
  meter.className = 'hunting-places__experience-bar';
  meter.max = progress.levelSpan;
  meter.value = progress.intoLevel;
  meter.setAttribute('aria-label', `Progress to level ${progress.level + 1}`);
  panel.append(level, experience, meter);
  return panel;
}

function createVocationPanel(
  document: Document,
  selection: HuntingPlacesVocationSelection,
): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'hunting-places__vocations';
  panel.setAttribute('data-testid', 'hunt-vocations');

  const title = createTextElement(
    document,
    'h2',
    'Characters',
    'hunting-places__section-title',
  );
  const buttons = document.createElement('div');
  buttons.className = 'hunting-places__vocation-buttons';
  for (const character of selection.characters) {
    const playable =
      character.vocationKey === DEFAULT_KNIGHT_VOCATION_KEY ||
      character.vocationKey === DEFAULT_SORCERER_VOCATION_KEY;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hunting-places__vocation';
    button.setAttribute('data-testid', 'hunt-vocation-select');
    button.setAttribute('data-vocation-key', character.vocationKey);
    button.textContent = formatVocation(character.vocationKey);
    button.disabled =
      !playable || character.vocationKey === selection.activeVocationKey;
    button.setAttribute(
      'aria-pressed',
      String(character.vocationKey === selection.activeVocationKey),
    );
    button.addEventListener('click', () => {
      if (!button.disabled) selection.onSelect(character.vocationKey);
    });
    buttons.append(button);
  }
  panel.append(title, buttons);
  return panel;
}

function bestiaryProgressFor(
  progress: readonly BestiaryProgress[],
  creatureKey: string,
): BestiaryProgress | undefined {
  return progress.find((entry) => entry.creatureKey === creatureKey);
}

/** The persistent field guide, kept compact so the atlas remains a launch screen. */
function createBestiaryPanel(
  document: Document,
  species: readonly BestiarySpecies[],
  progress: readonly BestiaryProgress[],
): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'hunting-places__bestiary';
  panel.setAttribute('data-testid', 'hunt-bestiary');

  const title = createTextElement(
    document,
    'h2',
    'Bestiary',
    'hunting-places__section-title',
  );
  const intro = createTextElement(
    document,
    'p',
    'Account progress · each milestone pays gold once.',
    'hunting-places__bestiary-intro',
  );
  const entries = document.createElement('ul');
  entries.className = 'hunting-places__bestiary-entries';

  for (const entry of species) {
    const current = bestiaryProgressFor(progress, entry.creatureKey);
    const kills = current?.kills ?? 0;
    const completed = current?.rewardClaimed === true;
    const row = document.createElement('li');
    row.className = 'hunting-places__bestiary-entry';
    row.setAttribute('data-testid', 'hunt-bestiary-entry');
    row.setAttribute('data-creature-key', entry.creatureKey);
    row.setAttribute('data-kills', String(kills));
    row.setAttribute('data-target-kills', String(entry.targetKills));
    row.setAttribute('data-completed', String(completed));

    const name = createTextElement(
      document,
      'span',
      entry.displayName,
      'hunting-places__bestiary-name',
    );
    const count = createTextElement(
      document,
      'span',
      `${formatInteger(kills)} / ${formatInteger(entry.targetKills)} kills`,
      'hunting-places__bestiary-count',
    );
    const reward = createTextElement(
      document,
      'span',
      completed
        ? `Complete · ${formatInteger(entry.rewardGold)} gold claimed`
        : `Reward ${formatInteger(entry.rewardGold)} gold`,
      'hunting-places__bestiary-reward',
    );
    row.append(name, count, reward);
    entries.append(row);
  }

  panel.append(title, intro, entries);
  return panel;
}

function achievementProgressFor(
  progress: readonly AchievementProgress[],
  achievementId: string,
): AchievementProgress | undefined {
  return progress.find((entry) => entry.achievementId === achievementId);
}

function achievementProgressLabel(
  definition: AchievementDefinition,
  progress: number,
): string {
  const value = `${formatInteger(progress)} / ${formatInteger(definition.target)}`;
  switch (definition.metric) {
    case 'completed-runs':
      return `${value} runs`;
    case 'equipped-slots':
      return `${value} pieces`;
    case 'sold-items':
      return `${value} sales`;
    case 'experience':
      return `${value} XP`;
    case 'bestiary-species':
      return `${value} entries`;
  }
}

/** First-loop goals live beside the bestiary so the next action is obvious. */
function createAchievementPanel(
  document: Document,
  definitions: readonly AchievementDefinition[],
  progress: readonly AchievementProgress[],
): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'hunting-places__achievements';
  panel.setAttribute('data-testid', 'hunt-achievements');

  const title = createTextElement(
    document,
    'h2',
    'Achievements',
    'hunting-places__section-title',
  );
  const intro = createTextElement(
    document,
    'p',
    'First-loop goals · each reward is paid once.',
    'hunting-places__achievements-intro',
  );
  const entries = document.createElement('ul');
  entries.className = 'hunting-places__achievement-entries';

  for (const definition of definitions) {
    const current = achievementProgressFor(progress, definition.achievementId);
    const currentProgress = current?.progress ?? 0;
    const completed = current?.rewardClaimed === true;
    const row = document.createElement('li');
    row.className = 'hunting-places__achievement-entry';
    row.setAttribute('data-testid', 'hunt-achievement-entry');
    row.setAttribute('data-achievement-id', definition.achievementId);
    row.setAttribute('data-progress', String(currentProgress));
    row.setAttribute('data-target', String(definition.target));
    row.setAttribute('data-completed', String(completed));

    const name = createTextElement(
      document,
      'span',
      definition.displayName,
      'hunting-places__achievement-name',
    );
    const description = createTextElement(
      document,
      'span',
      definition.description,
      'hunting-places__achievement-description',
    );
    const count = createTextElement(
      document,
      'span',
      achievementProgressLabel(definition, currentProgress),
      'hunting-places__achievement-progress',
    );
    const reward = createTextElement(
      document,
      'span',
      completed
        ? `Complete · ${formatInteger(definition.rewardGold)} gold claimed`
        : `Reward ${formatInteger(definition.rewardGold)} gold`,
      'hunting-places__achievement-reward',
    );
    row.append(name, description, count, reward);
    entries.append(row);
  }

  panel.append(title, intro, entries);
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

function describeItem(
  item: ItemDefinition,
  weaponTypes = weaponTypesForVocation('vocation:tibia:knight'),
): string {
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
  if (item.weaponType !== undefined && !isTrainedWeapon(item, weaponTypes)) {
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
        : `${worn.displayName} — ${describeItem(worn, gear.weaponTypes)}`;
  const value = createTextElement(
    document,
    'span',
    wornText,
    'hunting-places__slot-value',
  );
  value.setAttribute('data-testid', 'hunt-equipment-worn');
  row.append(createCampIcon(document, slot), label, value);

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
    if (
      slot === 'weapon' &&
      (item.weaponType === undefined ||
        (gear.weaponTypes !== undefined &&
          !gear.weaponTypes.includes(item.weaponType)))
    ) {
      continue;
    }
    const equip = document.createElement('button');
    equip.type = 'button';
    equip.className = 'hunting-places__slot-action';
    equip.setAttribute('data-testid', 'hunt-equipment-equip');
    equip.setAttribute('data-slot', slot);
    equip.setAttribute('data-item-key', entry.itemKey);
    equip.textContent = `Equip ${item.displayName} (${describeItem(item, gear.weaponTypes)})`;
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
  const stats = resolveEquippedStats(
    character.equipment,
    gear.item,
    gear.weaponTypes === undefined ? {} : { weaponTypes: gear.weaponTypes },
  );
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
  const set = bandSetFor(
    lootKeys,
    character.collection,
    gear.item,
    gear.weaponTypes === undefined ? {} : { weaponTypes: gear.weaponTypes },
  );
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
  header.append(createCampIcon(document, 'hunts'), title, badge);

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
      'Creatures on the map',
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

  const guide = document.createElement('details');
  guide.open = true;
  guide.className = 'hunting-places__guide';
  const guideToggle = createTextElement(
    document,
    'summary',
    'Creatures, loot & collection',
  );
  guide.append(guideToggle, creaturesHeading, creatures);
  if (set !== undefined) guide.append(set);
  const inhabitants = createTextElement(
    document,
    'p',
    hunt.creatures.map((creature) => creature.displayName).join(' · '),
    'hunting-places__inhabitants',
  );
  card.append(header, details, summary, inhabitants, select, guide);
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
  bestiary?: readonly BestiarySpecies[],
  achievements?: readonly AchievementDefinition[],
  bestiaryProgress: readonly BestiaryProgress[] = [],
  achievementProgress: readonly AchievementProgress[] = [],
  vocationSelection?: HuntingPlacesVocationSelection,
): HuntingPlacesScreen {
  const document = root.ownerDocument;
  const screen = document.createElement('main');
  screen.className = 'hunting-places';
  screen.setAttribute('data-testid', 'hunting-places-screen');
  screen.setAttribute('data-shell-phase', 'hunting');
  screen.setAttribute('aria-labelledby', 'hunting-places-title');

  const masthead = document.createElement('div');
  masthead.className = 'hunting-places__masthead';
  masthead.append(
    createTextElement(
      document,
      'p',
      'Kaezan Huntbound',
      'hunting-places__brand',
    ),
    createTextElement(
      document,
      'span',
      `Character selection · ${formatVocation(character?.vocationKey ?? 'vocation:tibia:knight')}`,
      'hunting-places__tagline',
    ),
  );
  const header = document.createElement('header');
  header.className = 'hunting-places__header';
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
    'Select a destination, then enter the hunt.',
    'hunting-places__intro',
  );
  header.append(createCampIcon(document, 'hunts'), title, intro);
  const identity = document.createElement('div');
  identity.className = 'hunting-places__identity';
  if (character !== undefined)
    identity.append(createCharacterPanel(document, character));
  if (vocationSelection !== undefined) {
    identity.append(createVocationPanel(document, vocationSelection));
  }
  if (preparation !== undefined) {
    identity.append(
      createTextElement(
        document,
        'p',
        `${formatInteger(preparation.gold)} gold`,
        'hunting-places__wallet',
      ),
    );
  }
  const navigation = document.createElement('nav');
  navigation.className = 'hunting-places__navigation';
  navigation.setAttribute('aria-label', 'Camp sections');
  const content = document.createElement('div');
  content.className = 'hunting-places__content';
  const pages: { id: string; button: HTMLButtonElement; panel: HTMLElement }[] =
    [];
  const selectPage = (id: string): void => {
    root.dataset.campPage = id;
    title.textContent =
      pages.find((page) => page.id === id)?.button.textContent ??
      'Hunting Places';
    for (const page of pages) {
      page.panel.hidden = page.id !== id;
      page.button.setAttribute('aria-pressed', String(page.id === id));
    }
  };
  const addPage = (id: string, label: string): HTMLElement => {
    const button = createTextElement(
      document,
      'button',
      label,
      'hunting-places__nav-button',
    );
    button.type = 'button';
    button.prepend(createCampIcon(document, id));
    button.setAttribute('aria-controls', `camp-${id}`);
    const panel = document.createElement('section');
    panel.className = 'hunting-places__page';
    panel.id = `camp-${id}`;
    panel.setAttribute('aria-label', label);
    button.addEventListener('click', () => selectPage(id));
    pages.push({ id, button, panel });
    navigation.append(button);
    content.append(panel);
    return panel;
  };
  const huntsPage = addPage('hunts', 'Hunting Places');
  if (summary !== undefined)
    huntsPage.append(createRunSummary(document, summary));
  const toolbar = document.createElement('div');
  toolbar.className = 'hunting-places__toolbar';
  toolbar.append(
    createTextElement(
      document,
      'h2',
      'Destinations',
      'hunting-places__page-title',
    ),
  );
  const searchLabel = createTextElement(
    document,
    'label',
    'Find a hunt',
    'hunting-places__search',
  );
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Place or creature name…';
  searchLabel.append(search);
  toolbar.append(searchLabel);
  huntsPage.append(toolbar);
  if (character !== undefined && gear !== undefined) {
    const equipmentPage = addPage('equipment', 'Equipment');
    equipmentPage.append(createEquipmentPanel(document, character, gear));
    if (preparation !== undefined)
      equipmentPage.append(createPreparationPanel(document, preparation));
  } else if (preparation !== undefined) {
    addPage('equipment', 'Preparation').append(
      createPreparationPanel(document, preparation),
    );
  }
  if (bestiary !== undefined && character !== undefined) {
    addPage('bestiary', 'Bestiary').append(
      createBestiaryPanel(document, bestiary, bestiaryProgress),
    );
  }
  if (achievements !== undefined && character !== undefined) {
    addPage('achievements', 'Achievements').append(
      createAchievementPanel(document, achievements, achievementProgress),
    );
  }

  const travel = document.createElement('div');
  travel.className = 'camp-travel';
  const destinations = document.createElement('div');
  destinations.className = 'camp-destinations';
  destinations.setAttribute('role', 'group');
  destinations.setAttribute('aria-label', 'Destinations');
  const list = document.createElement('section');
  list.className = 'hunting-places__list';
  list.setAttribute('data-testid', 'hunting-places-list');
  list.setAttribute('aria-label', 'Selected hunting place');
  const routes: {
    hunt: HuntIndexEntry;
    button: HTMLButtonElement;
    card: HTMLElement;
  }[] = [];
  const selectHunt = (huntId: string): void => {
    root.dataset.campHunt = huntId;
    for (const route of routes) {
      route.card.hidden = route.hunt.huntId !== huntId;
      route.button.setAttribute(
        'aria-pressed',
        String(route.hunt.huntId === huntId),
      );
    }
  };
  const orderedHunts = [...index.hunts].sort(
    (left, right) => left.recommendedLevel - right.recommendedLevel,
  );
  for (const hunt of orderedHunts) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'camp-destination';
    button.append(
      createCampIcon(document, 'hunts'),
      createTextElement(
        document,
        'span',
        hunt.displayName,
        'camp-destination__name',
      ),
      createTextElement(
        document,
        'span',
        `Level ${hunt.recommendedLevel} · Band ${hunt.band}`,
        'camp-destination__level',
      ),
    );
    button.addEventListener('click', () => selectHunt(hunt.huntId));
    const card = createHuntCard(
      document,
      hunt,
      (selected) => {
        root.dataset.campPage = 'hunts';
        onSelect(selected);
      },
      character !== undefined && gear !== undefined
        ? createSetProgress(document, hunt, character, gear)
        : undefined,
    );
    routes.push({ hunt, button, card });
    destinations.append(button);
    list.append(card);
  }
  const empty = createTextElement(
    document,
    'p',
    'No destinations found.',
    'hunting-places__empty',
  );
  empty.hidden = true;
  empty.setAttribute('role', 'status');
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase();
    const matching = routes.filter(({ hunt, button }) => {
      const matches =
        `${hunt.displayName} ${hunt.creatures.map((creature) => creature.displayName).join(' ')}`
          .toLocaleLowerCase()
          .includes(query);
      button.hidden = !matches;
      return matches;
    });
    empty.hidden = matching.length !== 0;
    const selected =
      matching.find(({ hunt }) => hunt.huntId === root.dataset.campHunt) ??
      matching[0];
    selectHunt(selected?.hunt.huntId ?? '');
  });
  const selectedHunt =
    routes.find(({ hunt }) => hunt.huntId === root.dataset.campHunt) ??
    routes[0];
  selectHunt(selectedHunt?.hunt.huntId ?? '');
  destinations.append(empty);
  travel.append(destinations, list);
  huntsPage.append(travel);
  if (character !== undefined) {
    const paperdoll = document.createElement('div');
    paperdoll.className = 'camp-paperdoll';
    paperdoll.setAttribute('aria-label', 'Equipped items');
    for (const slot of EQUIPMENT_SLOTS) {
      const itemKey = character.equipment[slot];
      const name =
        itemKey === null
          ? 'Empty'
          : (gear?.item(itemKey)?.displayName ?? formatContentName(itemKey));
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'camp-paperdoll__slot';
      cell.dataset.slot = slot;
      cell.dataset.empty = String(itemKey === null);
      cell.title = `${SLOT_LABELS[slot]}: ${name}`;
      cell.setAttribute('aria-label', cell.title);
      cell.append(createCampIcon(document, slot));
      cell.disabled = gear === undefined;
      cell.addEventListener('click', () => {
        selectPage('equipment');
        const row = content.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
        if (row !== null) {
          row.tabIndex = -1;
          row.focus();
        }
      });
      paperdoll.append(cell);
    }
    identity.append(paperdoll);
  }
  identity.append(navigation);
  const footer = createTextElement(
    document,
    'footer',
    'Choose a hunting place to begin. Equipment can be changed between hunts.',
    'camp-statusbar',
  );
  content.prepend(header);
  const activePage = root.dataset.campPage ?? 'hunts';
  selectPage(
    pages.some((page) => page.id === activePage) ? activePage : 'hunts',
  );
  screen.append(masthead, identity, content, footer);
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
