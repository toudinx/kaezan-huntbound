import { TICK_DURATION_MS } from '../../../../../packages/contracts/src/index.ts';
import type {
  CombatAbilityView,
  CombatViewState,
} from '../../hunt/CombatViewModel';
import { createAbilityGlyph } from './AbilityGlyph';

/**
 * The nine actions, centred under the play area.
 *
 * Two things here were decided at playtest and are not free to change:
 *
 * - **The separator is a gap, not a label and not a colour.** Naming the groups
 *   was refused, and so was tinting button by button. A gap in the run of cells
 *   is what Diablo 4 uses to split basics from the rest, and it says "these
 *   five are your rotation, these three you reach for" without writing a word
 *   on the screen.
 * - **Posture is a switch with two seats, not a button that cycles.** Cycling
 *   meant reaching Protector cost a cast of Blood Rage on the way. One cell,
 *   two seats, three states.
 *
 * The visual order is deliberately not the catalog order: the catalog puts
 * Wound Cleansing at index 2, in the middle of the damage spells. Renumbering
 * the keys to match would force `InputMap` to know about visual grouping, so
 * the mapping stays `DigitN` to index `N-1` and every cell prints its own key.
 */
export interface ActionDeck {
  render(state: CombatViewState): void;
  destroy(): void;
}

type SlotKind = 'attack' | 'ability' | 'posture';

interface DeckSlot {
  readonly kind: SlotKind;
  readonly abilityIndex: number | null;
  readonly hotkey: string;
}

const DAMAGE_SLOTS: readonly DeckSlot[] = [
  { kind: 'attack', abilityIndex: null, hotkey: 'Spc' },
  { kind: 'ability', abilityIndex: 0, hotkey: '1' },
  { kind: 'ability', abilityIndex: 1, hotkey: '2' },
  { kind: 'ability', abilityIndex: 3, hotkey: '4' },
  { kind: 'ability', abilityIndex: 4, hotkey: '5' },
];

const SITUATIONAL_SLOTS: readonly DeckSlot[] = [
  { kind: 'ability', abilityIndex: 2, hotkey: '3' },
  { kind: 'ability', abilityIndex: 7, hotkey: '8' },
  { kind: 'ability', abilityIndex: 8, hotkey: '9' },
];

const POSTURE_SLOTS: readonly DeckSlot[] = [
  { kind: 'posture', abilityIndex: 5, hotkey: '6' },
  { kind: 'posture', abilityIndex: 6, hotkey: '7' },
];

const DECLARED_SLOTS: readonly DeckSlot[] = [
  ...DAMAGE_SLOTS,
  ...SITUATIONAL_SLOTS,
  ...POSTURE_SLOTS,
];

interface DeckCell {
  readonly button: HTMLButtonElement;
  readonly slot: DeckSlot;
  readonly cooldown: HTMLElement;
  readonly cost: HTMLElement;
}

function cooldownSeconds(ticks: number): string {
  return ticks <= 0 ? '' : `${Math.ceil((ticks * TICK_DURATION_MS) / 1000)}s`;
}

/**
 * Why the cell is dark, in the game's own terms.
 *
 * `group` is the one that matters. Challenge and Haste spend the support group
 * and are never touched by the attack group, so a deck that dimmed them
 * alongside the attack spells would be describing a rule the simulation does
 * not have. The scope is projected, never decided: the view model is what knows
 * which group an ability spends.
 */
function cooldownScope(ability: CombatAbilityView): string {
  if (ability.remainingGroupCooldownTicks > 0) return 'group';
  if (ability.remainingCooldownTicks > 0) return 'ability';
  return 'none';
}

function createCell(
  document: Document,
  slot: DeckSlot,
  abilityId: string,
): DeckCell {
  const button = document.createElement('button') as HTMLButtonElement;
  button.type = 'button';
  button.className = 'cockpit-cell';
  button.setAttribute('data-cell-kind', slot.kind);

  if (slot.abilityIndex === null) {
    button.setAttribute('data-testid', 'combat-attack');
    button.setAttribute('data-hunt-action', 'attack');
    button.setAttribute('aria-label', 'Attack selected target');
  } else {
    button.setAttribute('data-testid', `combat-ability-${slot.abilityIndex}`);
    button.setAttribute('data-hunt-action', `ability:${slot.abilityIndex}`);
  }

  if (slot.kind === 'posture') {
    // A radio says "one of these, or neither" the way a pressed button cannot.
    // `aria-pressed` stays alongside it: the toggle state is what the rest of
    // the shell already reads, and dropping it would cost a contract for
    // nothing.
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
  }

  const glyph = createAbilityGlyph(document, abilityId);
  const hotkey = document.createElement('span');
  hotkey.className = 'cockpit-cell__key';
  hotkey.setAttribute('aria-hidden', 'true');
  hotkey.textContent = slot.hotkey;
  const cooldown = document.createElement('span');
  cooldown.className = 'cockpit-cell__cooldown';
  cooldown.setAttribute('aria-hidden', 'true');
  // The mana price was only in the `aria-label`, so the one number that decides
  // whether a spell is worth casting right now was the one thing a sighted
  // player could not read off the deck.
  const cost = document.createElement('span');
  cost.className = 'cockpit-cell__cost';
  cost.setAttribute('aria-hidden', 'true');

  button.append(glyph, hotkey, cost, cooldown);

  return { button, slot, cooldown, cost };
}

function group(document: Document, name: string): HTMLElement {
  const element = document.createElement('div');
  element.className = 'cockpit-deck__group';
  element.setAttribute('data-deck-group', name);
  return element;
}

function gap(document: Document): HTMLElement {
  const element = document.createElement('div');
  element.className = 'cockpit-deck__gap';
  element.setAttribute('aria-hidden', 'true');
  return element;
}

export function mountActionDeck(root: HTMLElement): ActionDeck {
  const document = root.ownerDocument;
  const deck = document.createElement('div');
  deck.className = 'cockpit-deck__inner';
  deck.setAttribute('data-testid', 'combat-actions');
  deck.setAttribute('role', 'group');
  deck.setAttribute('aria-label', 'Combat actions');

  const damage = group(document, 'damage');
  const situational = group(document, 'situational');
  const posture = document.createElement('div');
  posture.className = 'cockpit-deck__switch';
  posture.setAttribute('data-testid', 'combat-posture-switch');
  posture.setAttribute('role', 'radiogroup');
  posture.setAttribute('aria-label', 'Posture');

  deck.append(damage, gap(document), situational, gap(document), posture);
  root.append(deck);

  let cells: DeckCell[] = [];
  let signature = '';

  const build = (
    host: HTMLElement,
    slots: readonly DeckSlot[],
    byIndex: ReadonlyMap<number, CombatAbilityView>,
    extras: readonly CombatAbilityView[] = [],
  ): DeckCell[] => {
    const built: DeckCell[] = [];

    for (const slot of slots) {
      if (slot.abilityIndex === null) {
        built.push(createCell(document, slot, 'auto-attack'));
        continue;
      }

      const ability = byIndex.get(slot.abilityIndex);
      if (ability === undefined) continue;

      built.push(createCell(document, slot, ability.abilityId));
    }

    for (const ability of extras) {
      built.push(
        createCell(
          document,
          {
            kind: 'ability',
            abilityIndex: ability.index,
            hotkey: String(ability.index + 1),
          },
          ability.abilityId,
        ),
      );
    }

    host.replaceChildren(...built.map((cell) => cell.button));
    return built;
  };

  /**
   * The scene publishes a tick every frame, so `render` runs about sixty times
   * a second. Rebuilding the cells there once dropped frames and destroyed the
   * very node the player had his finger on; they are built when the catalog
   * changes and updated in place otherwise.
   */
  const rebuild = (state: CombatViewState): void => {
    const byIndex = new Map(
      state.abilities.map((ability) => [ability.index, ability]),
    );
    // An ability the declared order does not name still gets a cell. A catalog
    // that grew would otherwise lose a key `InputMap` still fires, and the deck
    // would be quietly understating what the knight can do.
    const extras = state.abilities.filter(
      (ability) =>
        !DECLARED_SLOTS.some((slot) => slot.abilityIndex === ability.index),
    );

    const damageCells = build(damage, DAMAGE_SLOTS, byIndex);
    const situationalCells = build(
      situational,
      SITUATIONAL_SLOTS,
      byIndex,
      extras,
    );
    const postureCells = build(posture, POSTURE_SLOTS, byIndex);

    cells = [...damageCells, ...situationalCells, ...postureCells];
  };

  const render = (state: CombatViewState): void => {
    const next = state.abilities
      .map((ability) => `${ability.index}:${ability.abilityId}`)
      .join('|');

    if (next !== signature) {
      signature = next;
      rebuild(state);
    }

    const byIndex = new Map(
      state.abilities.map((ability) => [ability.index, ability]),
    );

    for (const cell of cells) {
      const { button, slot } = cell;

      if (slot.abilityIndex === null) {
        // The attack cell has no cooldown of its own to project: the kernel
        // paces swings. It only goes dark when there is nobody to swing at.
        button.setAttribute(
          'aria-disabled',
          String(state.playerDead || state.targetEntityId === null),
        );
        button.setAttribute('data-cooldown-scope', 'none');
        continue;
      }

      const ability = byIndex.get(slot.abilityIndex);
      if (ability === undefined) continue;

      button.setAttribute(
        'aria-label',
        `${ability.label} (${ability.resourceCost} mana)`,
      );
      button.setAttribute('title', ability.label);
      button.setAttribute('aria-disabled', String(!ability.available));
      button.setAttribute(
        'data-cooldown-ticks',
        String(ability.remainingCooldownTicks),
      );
      button.setAttribute(
        'data-group-cooldown-ticks',
        String(ability.remainingGroupCooldownTicks),
      );
      button.setAttribute(
        'data-cooldown-group',
        String(ability.primaryCooldownGroup),
      );
      button.setAttribute('data-cooldown-scope', cooldownScope(ability));
      button.setAttribute('aria-pressed', String(ability.active));
      button.setAttribute('data-active', String(ability.active));
      if (slot.kind === 'posture') {
        button.setAttribute('aria-checked', String(ability.active));
      }
      button.disabled = !ability.available;

      const text = cooldownSeconds(ability.remainingCooldownTicks);
      if (cell.cooldown.textContent !== text) cell.cooldown.textContent = text;
      const cost = ability.resourceCost > 0 ? String(ability.resourceCost) : '';
      if (cell.cost.textContent !== cost) cell.cost.textContent = cost;
    }

    posture.setAttribute(
      'data-posture',
      state.playerPosture?.abilityId ?? 'none',
    );
  };

  let destroyed = false;

  return {
    render,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      deck.remove();
    },
  };
}
