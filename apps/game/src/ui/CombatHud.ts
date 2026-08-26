import { TICK_DURATION_MS } from '../../../../packages/contracts/src/index.ts';
import type { CombatViewState } from '../hunt/CombatViewModel';
import { mountActionDeck } from './cockpit/ActionDeck';
import { createVitalArc, type VitalArc } from './cockpit/VitalArcs';
import { mountVitalBanner, type VitalBanner } from './cockpit/VitalBanner';

/**
 * Orchestrates the cockpit's combat surfaces.
 *
 * This used to be the whole HUD: five panels stacked in a 16 rem column pinned
 * to the top-right corner, with the nine actions as a flat list of full-width
 * buttons in catalog order. The vitals are now curved gauges (`VitalArcs`), the
 * actions a grouped deck (`ActionDeck`), and each surface sits in a band of the
 * frame `CockpitLayout` measures. What is left here is wiring them to one view
 * state.
 *
 * The bands are placed from the `--cockpit-*` custom properties the frame
 * publishes, which reach this subtree by inheritance. Nothing here decides a
 * measure of its own: two numbers for one edge is the defect this task exists
 * to avoid.
 *
 * Target, loot and the death overlay keep their current shape. PB-08-09 turns
 * the first two into real rail panels, once there is map and asset work to back
 * them.
 */
export interface CombatHud {
  render(state: CombatViewState): void;
  destroy(): void;
}

export interface CombatHudOptions {
  readonly onRestart?: () => void;
}

function createElement(
  document: Document,
  tagName: string,
  testId: string,
): HTMLElement {
  const element = document.createElement(tagName);
  element.setAttribute('data-testid', testId);
  return element;
}

function band(document: Document, className: string): HTMLElement {
  const element = document.createElement('div');
  element.className = className;
  return element;
}

function formatItemKey(itemKey: string): string {
  return itemKey.split(':').at(-1) ?? itemKey;
}

function updateBar(
  element: HTMLElement,
  label: string,
  value: number,
  maximum: number,
): void {
  element.setAttribute('aria-label', label);
  element.setAttribute('role', 'progressbar');
  element.setAttribute('aria-valuemin', '0');
  element.setAttribute('aria-valuemax', String(maximum));
  element.setAttribute('aria-valuenow', String(value));
  element.textContent = `${label}: ${value}/${maximum}`;
}

function postureDataValue(
  posture: CombatViewState['playerPosture'],
): 'blood-rage' | 'protector' | 'none' {
  return posture?.abilityId === 'blood-rage' ||
    posture?.abilityId === 'protector'
    ? posture.abilityId
    : 'none';
}

export function mountCombatHud(
  root: HTMLElement,
  options: CombatHudOptions = {},
): CombatHud {
  const document = root.ownerDocument;
  const hud = createElement(document, 'section', 'combat-hud');
  hud.setAttribute('aria-label', 'Combat HUD');
  hud.className = 'combat-hud';

  const vitalsLeft = band(document, 'cockpit__vitals cockpit__vitals--left');
  const vitalsRight = band(document, 'cockpit__vitals cockpit__vitals--right');
  const rail = band(document, 'cockpit__rail');
  const alerts = band(document, 'cockpit__alerts');
  const deckBand = band(document, 'cockpit__deck');

  const health: VitalArc = createVitalArc(document, {
    testId: 'combat-player-health',
    label: 'Health',
    side: 'left',
    tone: 'health',
  });
  const mana: VitalArc = createVitalArc(document, {
    testId: 'combat-player-mana',
    label: 'Mana',
    side: 'right',
    tone: 'mana',
  });
  vitalsLeft.append(health.element);
  vitalsRight.append(mana.element);

  const banner: VitalBanner = mountVitalBanner(document);

  /**
   * The rail's first slot, held open for the minimap PB-08-09 puts here.
   *
   * It reserves geometry and nothing else: no border, no background, no
   * pointer. An empty box with a frame around it would be the placeholder the
   * spec refused -- "zero placeholder na tela" -- and would show up in the
   * player's hunt as a hole. Reserved space shows up as nothing at all, and the
   * map drops into a slot that is already square and already the right size.
   */
  const mapSlot = createElement(document, 'div', 'cockpit-rail-map');
  mapSlot.className = 'cockpit__rail-slot';

  const targetPanel = createElement(document, 'section', 'combat-target');
  targetPanel.className = 'cockpit-panel';
  targetPanel.setAttribute('aria-label', 'Target status');
  const targetName = createElement(document, 'p', 'combat-target-name');
  const targetHealth = createElement(document, 'div', 'combat-target-health');
  targetPanel.append(targetName, targetHealth);

  // Posture and haste used to be two lines of prose in a rail panel, on the
  // far side of the screen from the pools they modify. They belong beside the
  // numbers they change, so the banner holds them and the rail lost its modes
  // panel; the HUD still writes their text, because the wording is what the
  // hunt specs read.
  const { posture, haste } = banner;

  const lootPanel = createElement(document, 'section', 'combat-loot');
  lootPanel.className = 'cockpit-panel';
  lootPanel.setAttribute('aria-label', 'Loot');
  const lootLog = createElement(document, 'div', 'combat-loot-log');
  const runBag = createElement(document, 'div', 'combat-run-bag');
  lootPanel.append(lootLog, runBag);
  rail.append(mapSlot, targetPanel, lootPanel);

  const rejection = createElement(document, 'p', 'combat-rejection');
  rejection.setAttribute('aria-live', 'polite');
  alerts.append(rejection);

  const deathOverlay = createElement(
    document,
    'section',
    'combat-death-overlay',
  );
  deathOverlay.setAttribute('aria-label', 'Death');
  const deathMessage = createElement(document, 'p', 'combat-death-message');
  deathMessage.textContent = 'You died.';
  const restart = createElement(
    document,
    'button',
    'combat-restart',
  ) as HTMLButtonElement;
  restart.type = 'button';
  restart.setAttribute('aria-label', 'Restart hunt');
  restart.textContent = 'Restart hunt';
  deathOverlay.append(deathMessage, restart);

  hud.append(vitalsLeft, vitalsRight, rail, alerts, deckBand, deathOverlay);
  root.replaceChildren(hud);

  const deck = mountActionDeck(deckBand);
  // Under the spells, in the deck band, rather than over the head of the play
  // window. The player is already watching this strip for cooldowns, so the two
  // numbers he acts on are on the glance he is making anyway -- reported at
  // playtest: "o jogador ja vai ficar olhando o cooldown das habilidades, ai
  // ele pode olhar la mesmo a vida e mana".
  deckBand.append(banner.element);

  const onRestart = (): void => {
    options.onRestart?.();
  };
  restart.addEventListener('click', onRestart);

  const render = (state: CombatViewState): void => {
    if (state.player === null) {
      health.update(0, 0);
      mana.update(0, 0);
    } else {
      health.update(state.player.health, state.player.maxHealth);
      mana.update(state.player.resource, state.player.maxResource);
    }
    banner.update(state.player);

    targetName.textContent =
      state.targetEntityId === null
        ? 'No target'
        : `Target #${state.targetEntityId}`;
    if (state.target === null) {
      updateBar(targetHealth, 'Target health', 0, 0);
    } else {
      updateBar(
        targetHealth,
        'Target health',
        state.target.health,
        state.target.maxHealth,
      );
    }

    rejection.textContent =
      state.lastRejection === null
        ? ''
        : `Rejected: ${state.lastRejection.code}`;
    rejection.setAttribute(
      'data-visible',
      String(state.lastRejection !== null),
    );
    const postureValue = postureDataValue(state.playerPosture);
    posture.setAttribute('data-posture', postureValue);
    posture.textContent =
      state.playerPosture === null
        ? 'Posture: None'
        : `Posture: ${state.playerPosture.label}`;
    haste.setAttribute(
      'data-haste',
      state.playerHaste === null ? 'off' : 'active',
    );
    haste.setAttribute(
      'data-remaining-ticks',
      String(state.playerHaste?.remainingTicks ?? 0),
    );
    haste.textContent =
      state.playerHaste === null
        ? 'Haste: Off'
        : `Haste: ${String(Math.ceil((state.playerHaste.remainingTicks * TICK_DURATION_MS) / 1000))}s`;

    deck.render(state);

    const lootText = state.lootLog
      .map(
        (entry) =>
          `${formatItemKey(entry.itemKey)} × ${entry.count} · tick ${entry.tick}`,
      )
      .join(' | ');
    if (lootLog.textContent !== lootText) lootLog.textContent = lootText;
    const bagText = state.bag
      .map((entry) => `${formatItemKey(entry.itemKey)} × ${entry.count}`)
      .join(' | ');
    if (runBag.textContent !== bagText) runBag.textContent = bagText;
    deathOverlay.setAttribute('data-visible', String(state.playerDead));
  };

  let destroyed = false;
  return {
    render,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      restart.removeEventListener('click', onRestart);
      deck.destroy();
      root.replaceChildren();
    },
  };
}
