import { knightProgressAtExperience } from '../../../../packages/content/src/index.ts';
import type {
  GridPosition,
  TransitionEntry,
} from '../../../../packages/contracts/src/index.ts';
import {
  type MapRegion,
  TICK_DURATION_MS,
} from '../../../../packages/contracts/src/index.ts';
import type { CombatViewState } from '../hunt/CombatViewModel';
import { mountActionDeck } from './cockpit/ActionDeck';
import type { ResolveCockpitAsset } from './cockpit/AssetFrame';
import { type HuntBag, mountHuntBag } from './cockpit/HuntBag';
import { type Minimap, mountMinimap } from './cockpit/Minimap';
import { mountTargetWindow, type TargetWindow } from './cockpit/TargetWindow';
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
 * The rail owns the minimap, target and hunt bag panels; all three only render
 * the projection they receive here. The simulation remains behind the view
 * model and never learns about DOM, canvas or asset URLs.
 */
export interface CombatHud {
  render(state: CombatViewState): void;
  destroy(): void;
}

export interface CombatHudOptions {
  readonly onRestart?: () => void;
  /**
   * Leaves the hunt for the atlas. Wired only by the shell that owns the run,
   * so a HUD mounted without it simply has no exit rather than a dead button.
   */
  readonly onLeave?: () => void;
  readonly region?: MapRegion;
  /** The hunt's floor links and drop-in cell, drawn as minimap landmarks. */
  readonly transitions?: readonly TransitionEntry[];
  readonly playerStart?: GridPosition;
  readonly resolveAsset?: ResolveCockpitAsset;
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

  const minimap: Minimap = mountMinimap(rail, {
    ...(options.region === undefined ? {} : { region: options.region }),
    ...(options.transitions === undefined
      ? {}
      : { transitions: options.transitions }),
    ...(options.playerStart === undefined
      ? {}
      : { playerStart: options.playerStart }),
    ...(options.resolveAsset === undefined
      ? {}
      : { resolveAsset: options.resolveAsset }),
  });
  const targetWindow: TargetWindow = mountTargetWindow(rail, {
    ...(options.resolveAsset === undefined
      ? {}
      : { resolveAsset: options.resolveAsset }),
  });

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
  lootPanel.append(lootLog);
  const huntBag: HuntBag = mountHuntBag(lootPanel, {
    ...(options.resolveAsset === undefined
      ? {}
      : { resolveAsset: options.resolveAsset }),
  });
  rail.append(lootPanel);

  const rejection = createElement(document, 'p', 'combat-rejection');
  rejection.setAttribute('aria-live', 'polite');

  // Level and experience live in the same band as the exit, because both talk
  // about the character and the run rather than about the fight in front of
  // the player.
  const levelReadout = createElement(document, 'p', 'combat-level');
  levelReadout.className = 'combat-hud__level';
  levelReadout.setAttribute('aria-live', 'polite');

  // The way out of the hunt sits over the top edge of the play window, in the
  // one band that is already reserved for things that talk to the player about
  // the run rather than about the fight.
  const leave = createElement(
    document,
    'button',
    'combat-leave',
  ) as HTMLButtonElement;
  leave.type = 'button';
  leave.setAttribute('aria-label', 'Leave hunt and bank the run');
  leave.textContent = 'Leave hunt';
  leave.hidden = options.onLeave === undefined;
  alerts.append(levelReadout, leave, rejection);

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
  // The overlay covers the whole viewport, so without its own way out a death
  // is a dead end: the only other exit is underneath it.
  const deathLeave = createElement(
    document,
    'button',
    'combat-death-leave',
  ) as HTMLButtonElement;
  deathLeave.type = 'button';
  deathLeave.setAttribute('aria-label', 'Back to the hunting places');
  deathLeave.textContent = 'Back to atlas';
  deathLeave.hidden = options.onLeave === undefined;
  deathOverlay.append(deathMessage, restart, deathLeave);

  hud.append(vitalsLeft, vitalsRight, rail, alerts, deckBand, deathOverlay);
  root.replaceChildren(hud);

  // The deck band reads buffs, spells, pools from top to bottom, and it is
  // built in that order. The bars are down here rather than over the head of
  // the play window because the player is already watching this strip for
  // cooldowns -- "o jogador ja vai ficar olhando o cooldown das habilidades,
  // ai ele pode olhar la mesmo a vida e mana" -- and the buffs get a row above
  // the spells so that nothing ever shares a line with the bars and resizes
  // them mid-hunt.
  deckBand.append(banner.status);
  const deck = mountActionDeck(deckBand, {
    ...(options.resolveAsset === undefined
      ? {}
      : { resolveAsset: options.resolveAsset }),
  });
  deckBand.append(banner.element);

  const onRestart = (): void => {
    options.onRestart?.();
  };
  const onLeave = (): void => {
    options.onLeave?.();
  };
  restart.addEventListener('click', onRestart);
  leave.addEventListener('click', onLeave);
  deathLeave.addEventListener('click', onLeave);

  const render = (state: CombatViewState): void => {
    if (state.player === null) {
      health.update(0, 0);
      mana.update(0, 0);
    } else {
      health.update(state.player.health, state.player.maxHealth);
      mana.update(state.player.resource, state.player.maxResource);
    }
    banner.update(state.player);

    targetWindow.render({
      target: state.target,
      details: state.targetDetails,
    });
    minimap.render(state.minimap);

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

    const progress = knightProgressAtExperience(state.experience.total);
    levelReadout.setAttribute('data-level', String(progress.level));
    levelReadout.setAttribute('data-experience', String(progress.experience));
    levelReadout.setAttribute(
      'data-run-experience',
      String(state.experience.runGained),
    );
    const levelText = `Level ${progress.level} · ${progress.intoLevel} / ${progress.levelSpan} XP · +${state.experience.runGained} this run`;
    if (levelReadout.textContent !== levelText) {
      levelReadout.textContent = levelText;
    }

    deck.render(state);

    const lootText = state.lootLog
      .map(
        (entry) =>
          `${formatItemKey(entry.itemKey)} × ${entry.count} · tick ${entry.tick}`,
      )
      .join(' | ');
    if (lootLog.textContent !== lootText) lootLog.textContent = lootText;
    huntBag.render(state.bag);
    deathOverlay.setAttribute('data-visible', String(state.playerDead));
    // A dead run has nothing left to bank, and the overlay carries its own exit.
    leave.hidden = options.onLeave === undefined || state.playerDead;
  };

  let destroyed = false;
  return {
    render,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      restart.removeEventListener('click', onRestart);
      leave.removeEventListener('click', onLeave);
      deathLeave.removeEventListener('click', onLeave);
      deck.destroy();
      minimap.destroy();
      targetWindow.destroy();
      huntBag.destroy();
      root.replaceChildren();
    },
  };
}
