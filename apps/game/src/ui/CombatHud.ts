import { TICK_DURATION_MS } from '../../../../packages/contracts/src/index.ts';
import type {
  CombatAbilityView,
  CombatViewState,
} from '../hunt/CombatViewModel';

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

function createAbilityButton(
  document: Document,
  ability: CombatAbilityView,
): HTMLButtonElement {
  const button = createElement(
    document,
    'button',
    `combat-ability-${ability.index}`,
  ) as HTMLButtonElement;
  button.type = 'button';
  button.setAttribute('data-hunt-action', `ability:${ability.index}`);
  return button;
}

function updateAbilityButton(
  button: HTMLButtonElement,
  ability: CombatAbilityView,
): void {
  button.setAttribute(
    'aria-label',
    `${ability.label} (${ability.resourceCost} mana)`,
  );
  button.setAttribute('aria-disabled', String(!ability.available));
  button.setAttribute(
    'data-cooldown-ticks',
    String(ability.remainingCooldownTicks),
  );
  button.setAttribute('aria-pressed', String(ability.active));
  button.setAttribute('data-active', String(ability.active));
  button.disabled = !ability.available;
  const text =
    ability.remainingCooldownTicks > 0
      ? `${ability.index + 1}. ${ability.label} · ${ability.remainingCooldownTicks}`
      : `${ability.index + 1}. ${ability.label}`;
  if (button.textContent !== text) button.textContent = text;
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

  const playerPanel = createElement(document, 'section', 'combat-player');
  playerPanel.setAttribute('aria-label', 'Player status');
  const playerHealth = createElement(document, 'div', 'combat-player-health');
  const playerMana = createElement(document, 'div', 'combat-player-mana');
  playerPanel.append(playerHealth, playerMana);

  const targetPanel = createElement(document, 'section', 'combat-target');
  targetPanel.setAttribute('aria-label', 'Target status');
  const targetName = createElement(document, 'p', 'combat-target-name');
  const targetHealth = createElement(document, 'div', 'combat-target-health');
  targetPanel.append(targetName, targetHealth);
  const rejection = createElement(document, 'p', 'combat-rejection');
  rejection.setAttribute('aria-live', 'polite');

  const actions = createElement(document, 'section', 'combat-actions');
  actions.setAttribute('aria-label', 'Combat actions');
  const attack = createElement(
    document,
    'button',
    'combat-attack',
  ) as HTMLButtonElement;
  attack.type = 'button';
  attack.setAttribute('data-hunt-action', 'attack');
  attack.setAttribute('aria-label', 'Attack selected target');
  attack.textContent = 'Attack';
  const posture = createElement(document, 'p', 'combat-posture');
  posture.setAttribute('aria-live', 'polite');
  const haste = createElement(document, 'p', 'combat-haste');
  haste.setAttribute('aria-live', 'polite');
  const abilities = createElement(document, 'div', 'combat-abilities');
  actions.append(attack, posture, haste, abilities);

  const lootPanel = createElement(document, 'section', 'combat-loot');
  lootPanel.setAttribute('aria-label', 'Loot');
  const lootLog = createElement(document, 'div', 'combat-loot-log');
  const runBag = createElement(document, 'div', 'combat-run-bag');
  lootPanel.append(lootLog, runBag);

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

  hud.append(
    playerPanel,
    targetPanel,
    rejection,
    actions,
    lootPanel,
    deathOverlay,
  );
  root.replaceChildren(hud);

  const onRestart = (): void => {
    options.onRestart?.();
  };
  restart.addEventListener('click', onRestart);

  let abilityButtons: HTMLButtonElement[] = [];

  const render = (state: CombatViewState): void => {
    if (state.player === null) {
      updateBar(playerHealth, 'Health', 0, 0);
      updateBar(playerMana, 'Mana', 0, 0);
    } else {
      updateBar(
        playerHealth,
        'Health',
        state.player.health,
        state.player.maxHealth,
      );
      updateBar(
        playerMana,
        'Mana',
        state.player.resource,
        state.player.maxResource,
      );
    }

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

    // The scene publishes a tick every frame, so this runs ~60 times a second.
    // Rebuilding the buttons here dropped frames and destroyed the very node
    // the player was pressing; they are created once and updated in place.
    if (abilityButtons.length !== state.abilities.length) {
      abilityButtons = state.abilities.map((ability) =>
        createAbilityButton(document, ability),
      );
      abilities.replaceChildren(...abilityButtons);
    }
    state.abilities.forEach((ability, index) => {
      const button = abilityButtons[index];
      if (button !== undefined) updateAbilityButton(button, ability);
    });

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
      root.replaceChildren();
    },
  };
}
