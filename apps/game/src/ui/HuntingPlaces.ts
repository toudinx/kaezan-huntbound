import { knightProgressAtExperience } from '../../../../packages/content/src/index.ts';
import type {
  CharacterProgress,
  HuntIndex,
  HuntIndexCreature,
  HuntIndexEntry,
  HuntIndexLootEntry,
  RunBagEntry,
} from '../../../../packages/contracts/src/index.ts';

export interface HuntingPlacesScreen {
  destroy(): void;
}

export type HuntPlaceSelectionHandler = (hunt: HuntIndexEntry) => void;

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

function createHuntCard(
  document: Document,
  hunt: HuntIndexEntry,
  onSelect: HuntPlaceSelectionHandler,
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

  card.append(header, details, summary, creaturesHeading, creatures, select);
  return card;
}

export function mountHuntingPlaces(
  root: HTMLElement,
  index: HuntIndex,
  onSelect: HuntPlaceSelectionHandler,
  summary?: HuntRunSummary,
  character?: CharacterProgress,
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
  }
  if (summary !== undefined) {
    header.append(createRunSummary(document, summary));
  }

  const list = document.createElement('section');
  list.className = 'hunting-places__list';
  list.setAttribute('data-testid', 'hunting-places-list');
  list.setAttribute('aria-label', 'Available hunting places');
  list.append(
    ...index.hunts.map((hunt) => createHuntCard(document, hunt, onSelect)),
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
