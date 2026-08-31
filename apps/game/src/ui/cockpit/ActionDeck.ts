import { TICK_DURATION_MS } from '../../../../../packages/contracts/src/index.ts';
import type {
  CombatAbilityView,
  CombatViewState,
} from '../../hunt/CombatViewModel';
import { createAbilityIcon, spellIconAssetKey } from './AbilityIcon';
import type { ResolveCockpitAsset } from './AssetFrame';
import { assetFrameSignature } from './AssetFrame';

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

export interface ActionDeckOptions {
  readonly resolveAsset?: ResolveCockpitAsset;
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
  /** What was last written, so a still frame writes nothing at all. */
  readonly written: Map<string, string>;
}

/**
 * The scene publishes a tick every frame, so the deck is asked to render about
 * sixty times a second while almost nothing about it changes. Writing an
 * attribute that already holds its value still invalidates style for that
 * element, and nine cells by ten attributes is six hundred pointless
 * invalidations a second on top of whatever the playfield is doing. Every
 * per-frame write goes through here.
 */
function write(cell: DeckCell, name: string, value: string): void {
  if (cell.written.get(name) === value) return;

  cell.written.set(name, value);
  cell.button.setAttribute(name, value);
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

function sameCooldownGroup(
  left: CombatAbilityView,
  right: CombatAbilityView,
): boolean {
  return (
    left.primaryCooldownGroup === right.primaryCooldownGroup ||
    left.primaryCooldownGroup === right.secondaryCooldownGroup ||
    left.secondaryCooldownGroup === right.primaryCooldownGroup ||
    (left.secondaryCooldownGroup !== null &&
      left.secondaryCooldownGroup === right.secondaryCooldownGroup)
  );
}

function cooldownDurationTicks(
  ability: CombatAbilityView,
  abilities: readonly CombatAbilityView[],
): number {
  if (ability.cooldownTicks > 0) return ability.cooldownTicks;

  // Toggle abilities have no personal cooldown. The view model still gives us
  // their group countdown, and the other abilities that spend that group give
  // us a stable presentation scale without making the deck own game rules.
  return Math.max(
    ability.remainingGroupCooldownTicks,
    ...abilities
      .filter((candidate) => sameCooldownGroup(ability, candidate))
      .map((candidate) => candidate.cooldownTicks),
    1,
  );
}

function cooldownSweepPercent(
  ability: CombatAbilityView,
  abilities: readonly CombatAbilityView[],
): string {
  const remaining = Math.max(0, ability.remainingCooldownTicks);
  if (remaining === 0) return '0%';

  const duration = cooldownDurationTicks(ability, abilities);
  const fraction = Math.min(1, remaining / duration);
  return `${fraction * 100}%`;
}

function unavailableReason(
  state: CombatViewState,
  ability: CombatAbilityView,
): 'ready' | 'cooldown' | 'mana' | 'dead' | 'unavailable' {
  if (state.playerDead) return 'dead';
  if (ability.remainingCooldownTicks > 0) return 'cooldown';
  if (state.player !== null && state.player.resource < ability.resourceCost) {
    return 'mana';
  }
  return ability.available ? 'ready' : 'unavailable';
}

function createCell(
  document: Document,
  slot: DeckSlot,
  abilityId: string,
  resolveAsset: ActionDeckOptions['resolveAsset'],
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

  const icon =
    slot.abilityIndex === null
      ? undefined
      : createAbilityIcon(
          document,
          abilityId,
          resolveAsset?.(spellIconAssetKey(abilityId)),
        );
  // The attack cell has no icon to name it, so it says what it is in words
  // where the other cells put their art.
  const name =
    slot.abilityIndex === null ? document.createElement('span') : undefined;
  if (name !== undefined) {
    name.className = 'cockpit-cell__name';
    name.setAttribute('aria-hidden', 'true');
    name.textContent = 'Auto';
  }
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

  button.append(
    ...(icon === undefined ? [] : [icon]),
    ...(name === undefined ? [] : [name]),
    hotkey,
    cost,
    cooldown,
  );

  return { button, slot, cooldown, cost, written: new Map() };
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

export function mountActionDeck(
  root: HTMLElement,
  options: ActionDeckOptions = {},
): ActionDeck {
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
        built.push(createCell(document, slot, 'auto-attack', undefined));
        continue;
      }

      const ability = byIndex.get(slot.abilityIndex);
      if (ability === undefined) continue;

      built.push(
        createCell(document, slot, ability.abilityId, options.resolveAsset),
      );
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
          options.resolveAsset,
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

  /** Reused across frames rather than allocated sixty times a second. */
  const frameIndex = new Map<number, CombatAbilityView>();

  const render = (state: CombatViewState): void => {
    const next = state.abilities
      .map((ability) => {
        const asset = options.resolveAsset?.(
          spellIconAssetKey(ability.abilityId),
        );
        return `${ability.index}:${ability.abilityId}:${assetFrameSignature(asset)}`;
      })
      .join('|');

    if (next !== signature) {
      signature = next;
      rebuild(state);
    }

    frameIndex.clear();
    for (const ability of state.abilities) {
      frameIndex.set(ability.index, ability);
    }

    for (const cell of cells) {
      const { button, slot } = cell;

      if (slot.abilityIndex === null) {
        // The attack cell has no cooldown of its own to project: the kernel
        // paces swings. It only goes dark when there is nobody to swing at.
        write(
          cell,
          'aria-disabled',
          String(state.playerDead || state.targetEntityId === null),
        );
        write(
          cell,
          'data-unavailable-reason',
          state.playerDead || state.targetEntityId === null
            ? 'unavailable'
            : 'ready',
        );
        write(cell, 'data-cooldown-scope', 'none');
        cell.button.style.setProperty('--cooldown-sweep', '0%');
        continue;
      }

      const ability = frameIndex.get(slot.abilityIndex);
      if (ability === undefined) continue;

      write(
        cell,
        'aria-label',
        // A stance costs nothing, and "(0 mana)" is a price tag on a free
        // thing: the reader hears the name alone, the same as the cost badge
        // below already shows nothing.
        ability.resourceCost > 0
          ? `${ability.label} (${ability.resourceCost} mana)`
          : ability.label,
      );
      write(cell, 'title', ability.label);
      write(cell, 'aria-disabled', String(!ability.available));
      write(
        cell,
        'data-cooldown-ticks',
        String(ability.remainingCooldownTicks),
      );
      write(
        cell,
        'data-group-cooldown-ticks',
        String(ability.remainingGroupCooldownTicks),
      );
      write(cell, 'data-cooldown-group', String(ability.primaryCooldownGroup));
      write(cell, 'data-cooldown-scope', cooldownScope(ability));
      write(cell, 'data-unavailable-reason', unavailableReason(state, ability));
      write(cell, 'aria-pressed', String(ability.active));
      write(cell, 'data-active', String(ability.active));
      if (slot.kind === 'posture') {
        write(cell, 'aria-checked', String(ability.active));
      }
      if (button.disabled !== !ability.available) {
        button.disabled = !ability.available;
      }

      const text = cooldownSeconds(ability.remainingCooldownTicks);
      if (cell.cooldown.textContent !== text) cell.cooldown.textContent = text;
      const cost = ability.resourceCost > 0 ? String(ability.resourceCost) : '';
      if (cell.cost.textContent !== cost) cell.cost.textContent = cost;
      cell.button.style.setProperty(
        '--cooldown-sweep',
        cooldownSweepPercent(ability, state.abilities),
      );
    }

    const stance = state.playerPosture?.abilityId ?? 'none';
    if (posture.getAttribute('data-posture') !== stance) {
      posture.setAttribute('data-posture', stance);
    }
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
