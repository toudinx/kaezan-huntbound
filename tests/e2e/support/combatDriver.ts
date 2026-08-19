import { expect, type Page } from '@playwright/test';

import type {
  Direction,
  GridPosition,
  HuntDefinition,
} from '../../../packages/contracts/src/index.ts';
import { TICK_DURATION_MS } from '../../../packages/contracts/src/index.ts';
import {
  readHuntState,
  stepKeys,
  stepWithDpad,
  stepWithKeyboard,
  waitForHunt,
} from './huntDriver';
import { readHuntCharacter, readHuntDefinition } from './huntSession';

export interface CombatDomState {
  readonly playerHealth: number;
  readonly playerHealthMaximum: number;
  readonly playerMana: number;
  readonly targetEntityId: number | null;
  readonly targetHealth: number;
  readonly targetHealthMaximum: number;
  readonly targetName: string;
  readonly lootLog: string;
  readonly runBag: string;
}

export interface CombatHealthProgress {
  readonly targetHealthBefore: number;
  readonly targetHealthAfter: number;
}

export interface CombatEngagement extends CombatHealthProgress {
  readonly targetEntityId: number;
}

export interface CombatHealingProgress {
  readonly playerHealthBefore: number;
  readonly playerHealthAfter: number;
  readonly playerManaBefore: number;
  readonly playerManaAfter: number;
}

export interface CombatPlayEvidence {
  readonly bootDurationMs: number;
  readonly attack: CombatHealthProgress;
  readonly berserk: CombatHealthProgress;
  readonly brutalStrike: CombatHealthProgress;
  readonly woundCleansing: CombatHealingProgress;
  /** Engaged with one press, then killed by the auto-attack loop alone. */
  readonly killedTargetId: number;
  readonly lootLog: string;
  readonly runBag: string;
  readonly deathOverlayVisible: boolean;
}

export interface CombatViewport {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

export interface CombatSessionOptions {
  readonly onCombatVisible?: () => Promise<void>;
}

const combatHudSelector = '[data-testid="combat-hud"]';
const targetNameSelector = '[data-testid="combat-target-name"]';
const attackSelector = '[data-testid="combat-attack"]';
const PLAYER_ATTACK_COOLDOWN_TICKS = 40;

function isRotworm(blueprintId: string): boolean {
  return blueprintId === 'rotworm';
}

function chebyshev(
  left: { readonly x: number; readonly y: number; readonly z: number },
  right: { readonly x: number; readonly y: number; readonly z: number },
): number {
  if (left.z !== right.z) return Number.POSITIVE_INFINITY;
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

const movementDirections: readonly {
  readonly direction: Direction;
  readonly dx: number;
  readonly dy: number;
}[] = [
  { direction: 'n', dx: 0, dy: -1 },
  { direction: 'ne', dx: 1, dy: -1 },
  { direction: 'e', dx: 1, dy: 0 },
  { direction: 'se', dx: 1, dy: 1 },
  { direction: 's', dx: 0, dy: 1 },
  { direction: 'sw', dx: -1, dy: 1 },
  { direction: 'w', dx: -1, dy: 0 },
  { direction: 'nw', dx: -1, dy: -1 },
];

function positionKey(position: { readonly x: number; readonly y: number }) {
  return `${position.x},${position.y}`;
}

function floorFor(hunt: HuntDefinition, z: number) {
  const floor = hunt.region.floors.find((candidate) => candidate.z === z);
  if (floor === undefined) throw new Error(`The hunt has no floor ${z}.`);
  return floor;
}

function isTransitionCell(
  hunt: HuntDefinition,
  position: GridPosition,
): boolean {
  return hunt.transitions.entries.some(
    ({ from }) =>
      from.x === position.x && from.y === position.y && from.z === position.z,
  );
}

function walkable(hunt: HuntDefinition, z: number, x: number, y: number) {
  if (x < 0 || x >= hunt.region.width || y < 0 || y >= hunt.region.height) {
    return false;
  }
  if (isTransitionCell(hunt, { x, y, z })) return false;
  return !floorFor(hunt, z).collision.includes(y * hunt.region.width + x);
}

function canStep(
  hunt: HuntDefinition,
  from: GridPosition,
  to: GridPosition,
): boolean {
  if (from.z !== to.z || !walkable(hunt, to.z, to.x, to.y)) return false;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 || dy === 0) return true;
  return (
    walkable(hunt, from.z, from.x + dx, from.y) &&
    walkable(hunt, from.z, from.x, from.y + dy)
  );
}

function combatRoute(
  hunt: HuntDefinition,
  from: GridPosition,
  to: GridPosition,
  avoidActors: readonly { readonly position: GridPosition }[] = [],
  blockedActors: readonly { readonly position: GridPosition }[] = avoidActors,
): readonly Direction[] {
  if (from.z !== to.z) {
    throw new Error('Combat approach cannot cross floors.');
  }

  const start = positionKey(from);
  const queue = [from];
  const visited = new Set([start]);
  const parents = new Map<
    string,
    { readonly previous: string; readonly direction: Direction }
  >();

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    if (
      positionKey(current) !== positionKey(to) &&
      chebyshev(current, to) <= 1
    ) {
      break;
    }

    for (const step of movementDirections) {
      const next: GridPosition = {
        x: current.x + step.dx,
        y: current.y + step.dy,
        z: current.z,
      };
      const key = positionKey(next);
      if (
        visited.has(key) ||
        !canStep(hunt, current, next) ||
        key === positionKey(to) ||
        blockedActors.some((actor) => positionKey(actor.position) === key) ||
        avoidActors.some((actor) => chebyshev(next, actor.position) <= 1)
      ) {
        continue;
      }
      visited.add(key);
      parents.set(key, {
        previous: positionKey(current),
        direction: step.direction,
      });
      queue.push(next);
    }
  }

  const goal = [...visited].find((key) => {
    const [xText, yText] = key.split(',');
    const position = {
      x: Number(xText),
      y: Number(yText),
      z: from.z,
    } satisfies GridPosition;
    return key !== positionKey(to) && chebyshev(position, to) <= 1;
  });

  if (goal === undefined) {
    throw new Error(
      `No safe combat route from (${from.x},${from.y},${from.z}) adjacent to ` +
        `(${to.x},${to.y},${to.z}).`,
    );
  }

  const route: Direction[] = [];
  let current = goal;
  while (current !== start) {
    const parent = parents.get(current);
    if (parent === undefined) throw new Error('Combat route is incomplete.');
    route.push(parent.direction);
    current = parent.previous;
  }
  return route.reverse();
}

export async function readCombatState(page: Page): Promise<CombatDomState> {
  return page.evaluate(
    ({ targetNameSelector: targetSelector }) => {
      const targetName =
        document
          .querySelector<HTMLElement>(targetSelector)
          ?.textContent?.trim() ?? '';
      const targetHealthElement = document.querySelector<HTMLElement>(
        '[data-testid="combat-target-health"]',
      );
      const targetHealth = Number(
        targetHealthElement?.getAttribute('aria-valuenow'),
      );
      const targetHealthMaximum = Number(
        targetHealthElement?.getAttribute('aria-valuemax'),
      );
      const playerHealth = Number(
        document
          .querySelector<HTMLElement>('[data-testid="combat-player-health"]')
          ?.getAttribute('aria-valuenow'),
      );
      const playerHealthMaximum = Number(
        document
          .querySelector<HTMLElement>('[data-testid="combat-player-health"]')
          ?.getAttribute('aria-valuemax'),
      );
      const playerMana = Number(
        document
          .querySelector<HTMLElement>('[data-testid="combat-player-mana"]')
          ?.getAttribute('aria-valuenow'),
      );

      if (
        !Number.isSafeInteger(playerHealth) ||
        !Number.isSafeInteger(playerHealthMaximum) ||
        !Number.isSafeInteger(playerMana) ||
        !Number.isSafeInteger(targetHealth) ||
        !Number.isSafeInteger(targetHealthMaximum)
      ) {
        throw new Error('Combat HUD bars are not projecting integer values.');
      }

      return {
        playerHealth,
        playerHealthMaximum,
        playerMana,
        targetEntityId: /^Target #(\d+)$/.test(targetName)
          ? Number(targetName.slice('Target #'.length))
          : null,
        targetHealth,
        targetHealthMaximum,
        targetName,
        lootLog:
          document.querySelector<HTMLElement>('[data-testid="combat-loot-log"]')
            ?.textContent ?? '',
        runBag:
          document.querySelector<HTMLElement>('[data-testid="combat-run-bag"]')
            ?.textContent ?? '',
        deathOverlayVisible:
          document
            .querySelector<HTMLElement>('[data-testid="combat-death-overlay"]')
            ?.getAttribute('data-visible') === 'true',
      } satisfies CombatDomState;
    },
    { targetNameSelector },
  );
}

async function selectNextTarget(
  page: Page,
  previousTargetId: number | null,
): Promise<number> {
  await page.keyboard.press('Tab');
  await page.waitForFunction(
    (previousId) => {
      const name = document
        .querySelector<HTMLElement>('[data-testid="combat-target-name"]')
        ?.textContent?.trim();
      const match = /^Target #(\d+)$/.exec(name ?? '');
      return match !== null && Number(match[1]) !== previousId;
    },
    previousTargetId,
    { polling: 'raf', timeout: 10_000 },
  );

  const state = await readCombatState(page);
  if (state.targetEntityId === null) {
    throw new Error('Target cycling did not select a living combat target.');
  }
  return state.targetEntityId;
}

async function moveToAdjacentTarget(
  page: Page,
  hunt: HuntDefinition,
  targetEntityId: number,
  allowDeath = false,
  allowMissingTarget = false,
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (allowDeath && (await readCombatState(page)).deathOverlayVisible) {
      return;
    }
    const state = await readHuntState(page);
    const player = state.player;
    const target = state.actors.find(
      (actor) =>
        actor.entityId === targetEntityId && isRotworm(actor.blueprintId),
    );

    if (player === null || target === undefined) {
      if (allowDeath && (await readCombatState(page)).deathOverlayVisible) {
        return;
      }
      if (allowMissingTarget && target === undefined) return;
      throw new Error(
        'The selected combat target disappeared before approach.',
      );
    }

    if (chebyshev(player.position, target.position) <= 1) return;

    if (player.position.z !== target.position.z) {
      throw new Error(
        `Selected target ${targetEntityId} is on floor ${target.position.z}, ` +
          `while the player is on floor ${player.position.z}.`,
      );
    }

    const otherActors = state.actors.filter(
      (actor) =>
        actor.entityId !== targetEntityId && isRotworm(actor.blueprintId),
    );
    if (
      otherActors.some(
        (actor) => chebyshev(player.position, actor.position) <= 1,
      )
    ) {
      await stepAwayFromActors(page, hunt, targetEntityId);
      continue;
    }
    let route: readonly Direction[];
    try {
      route = combatRoute(hunt, player.position, target.position, otherActors);
    } catch {
      await stepAwayFromActors(page, hunt, targetEntityId);
      await page.waitForTimeout(TICK_DURATION_MS * 2);
      continue;
    }
    const direction = route[0];
    if (direction === undefined) {
      throw new Error(
        `No walkable route to target ${targetEntityId} from ` +
          `(${player.position.x},${player.position.y},${player.position.z}).`,
      );
    }

    if (
      direction === 'n' ||
      direction === 'e' ||
      direction === 's' ||
      direction === 'w'
    ) {
      try {
        await stepWithKeyboard(page, stepKeys[direction]);
      } catch (error) {
        if (allowDeath && (await readCombatState(page)).deathOverlayVisible) {
          return;
        }
        throw error;
      }
    } else {
      try {
        await stepWithDpad(page, direction);
      } catch (error) {
        if (allowDeath && (await readCombatState(page)).deathOverlayVisible) {
          return;
        }
        throw error;
      }
    }
  }

  throw new Error(`The player never reached target ${targetEntityId}.`);
}

async function stepAwayFromTarget(
  page: Page,
  hunt: HuntDefinition,
  targetEntityId: number,
): Promise<boolean> {
  const state = await readHuntState(page);
  const player = state.player;
  const target = state.actors.find(
    (actor) =>
      actor.entityId === targetEntityId && isRotworm(actor.blueprintId),
  );
  if (player === null || target === undefined) {
    throw new Error('Cannot move away without both combat actors.');
  }

  const possibleSteps = movementDirections
    .map((step) => ({
      ...step,
      next: {
        x: player.position.x + step.dx,
        y: player.position.y + step.dy,
        z: player.position.z,
      } satisfies GridPosition,
    }))
    .filter(
      ({ next }) =>
        canStep(hunt, player.position, next) &&
        !state.actors.some(
          (actor) =>
            actor.position.x === next.x &&
            actor.position.y === next.y &&
            actor.position.z === next.z,
        ),
    )
    .sort(
      (left, right) =>
        chebyshev(right.next, target.position) -
        chebyshev(left.next, target.position),
    );

  if (possibleSteps.length === 0) {
    return false;
  }

  const otherActors = state.actors.filter(
    (actor) =>
      actor.entityId !== targetEntityId && actor.entityId !== player.entityId,
  );
  const safeSteps = possibleSteps.filter(({ next }) =>
    otherActors.every((actor) => chebyshev(next, actor.position) > 1),
  );
  const orderedSteps = [...safeSteps, ...possibleSteps].filter(
    (step, index, all) =>
      all.findIndex((candidate) => candidate.direction === step.direction) ===
      index,
  );

  for (const step of orderedSteps) {
    const outcome =
      step.direction === 'n' ||
      step.direction === 'e' ||
      step.direction === 's' ||
      step.direction === 'w'
        ? await stepWithKeyboard(page, stepKeys[step.direction])
        : await stepWithDpad(page, step.direction);
    const movedPlayer = outcome.after.player;
    if (
      movedPlayer !== null &&
      (movedPlayer.position.x !== player.position.x ||
        movedPlayer.position.y !== player.position.y ||
        movedPlayer.position.z !== player.position.z)
    ) {
      return true;
    }
  }

  return false;
}

async function stepAwayFromActors(
  page: Page,
  hunt: HuntDefinition,
  excludedEntityId: number,
): Promise<boolean> {
  const state = await readHuntState(page);
  const player = state.player;
  if (player === null) return false;

  const threats = state.actors.filter(
    (actor) =>
      actor.entityId !== excludedEntityId &&
      actor.entityId !== player.entityId &&
      isRotworm(actor.blueprintId),
  );
  const possibleSteps = movementDirections
    .map((step) => ({
      ...step,
      next: {
        x: player.position.x + step.dx,
        y: player.position.y + step.dy,
        z: player.position.z,
      } satisfies GridPosition,
    }))
    .filter(
      ({ next }) =>
        canStep(hunt, player.position, next) &&
        !state.actors.some(
          (actor) =>
            actor.position.x === next.x &&
            actor.position.y === next.y &&
            actor.position.z === next.z,
        ) &&
        threats.every((actor) => chebyshev(next, actor.position) > 1),
    )
    .sort((left, right) => {
      const leftDistance = Math.min(
        ...threats.map((actor) => chebyshev(left.next, actor.position)),
      );
      const rightDistance = Math.min(
        ...threats.map((actor) => chebyshev(right.next, actor.position)),
      );
      return rightDistance - leftDistance;
    });

  for (const step of possibleSteps) {
    const outcome =
      step.direction === 'n' ||
      step.direction === 'e' ||
      step.direction === 's' ||
      step.direction === 'w'
        ? await stepWithKeyboard(page, stepKeys[step.direction])
        : await stepWithDpad(page, step.direction);
    const movedPlayer = outcome.after.player;
    if (
      movedPlayer !== null &&
      (movedPlayer.position.x !== player.position.x ||
        movedPlayer.position.y !== player.position.y ||
        movedPlayer.position.z !== player.position.z)
    ) {
      return true;
    }
  }

  return false;
}

async function moveAwayFromTarget(
  page: Page,
  hunt: HuntDefinition,
  targetEntityId: number,
  allowMissingTarget = false,
): Promise<boolean> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const state = await readHuntState(page);
    const player = state.player;
    const target = state.actors.find(
      (actor) =>
        actor.entityId === targetEntityId && isRotworm(actor.blueprintId),
    );
    if (player === null || target === undefined) {
      if (allowMissingTarget && target === undefined) return false;
      throw new Error('Cannot break aggro without both combat actors.');
    }
    if (chebyshev(player.position, target.position) > 2) return true;
    if (!(await stepAwayFromTarget(page, hunt, targetEntityId))) {
      return false;
    }
  }

  return false;
}

async function waitForPlayerDamage(
  page: Page,
  maximumHealth: number,
): Promise<CombatDomState> {
  await page.waitForFunction(
    (maximum) => {
      const value = Number(
        document
          .querySelector<HTMLElement>('[data-testid="combat-player-health"]')
          ?.getAttribute('aria-valuenow'),
      );
      return Number.isSafeInteger(value) && value < maximum;
    },
    maximumHealth,
    { polling: 'raf', timeout: 15_000 },
  );
  return readCombatState(page);
}

async function waitForTargetProgress(
  page: Page,
  previousHealth: number,
  timeoutMs = 1_000,
): Promise<CombatDomState> {
  await page.waitForFunction(
    (previous) => {
      const name = document
        .querySelector<HTMLElement>('[data-testid="combat-target-name"]')
        ?.textContent?.trim();
      if (name === 'No target') return true;
      const health = Number(
        document
          .querySelector<HTMLElement>('[data-testid="combat-target-health"]')
          ?.getAttribute('aria-valuenow'),
      );
      return Number.isSafeInteger(health) && health < previous;
    },
    previousHealth,
    { polling: 'raf', timeout: timeoutMs },
  );
  return readCombatState(page);
}

/**
 * Presses attack and waits for the engaged creature to lose health.
 *
 * The button no longer swings once, it engages: pressing it with nothing
 * targeted picks the nearest creature, which is the one already biting the
 * player. That is why this clears the target first instead of insisting on a
 * creature the driver chose several steps ago and may no longer be next to.
 */
async function attackUntilProgress(
  page: Page,
  onCombatVisible?: () => Promise<void>,
): Promise<CombatEngagement> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if ((await readCombatState(page)).deathOverlayVisible) {
      throw new Error('The player died before any attack landed.');
    }

    await page.keyboard.press('Escape');
    await tapCombatAction(page, attackSelector);
    // The HUD only learns the new target on the next published tick, so
    // reading it straight after the key press sees the cleared one.
    try {
      await page.waitForFunction(
        (selector) => {
          const name = document
            .querySelector<HTMLElement>(selector)
            ?.textContent?.trim();
          return /^Target #\d+$/.test(name ?? '');
        },
        targetNameSelector,
        { polling: 'raf', timeout: 2_000 },
      );
    } catch {
      await page.waitForTimeout(TICK_DURATION_MS * 4);
      continue;
    }

    const before = await readCombatState(page);
    if (before.targetEntityId === null || before.targetHealth <= 0) {
      await page.waitForTimeout(TICK_DURATION_MS * 4);
      continue;
    }

    try {
      // One full attack cooldown, not an arbitrary wait: the knight swings
      // every `PLAYER_ATTACK_COOLDOWN_TICKS`, so a shorter window can expire
      // between two legitimate swings.
      const after = await waitForTargetProgress(
        page,
        before.targetHealth,
        PLAYER_ATTACK_COOLDOWN_TICKS * TICK_DURATION_MS + 1_000,
      );
      await onCombatVisible?.();
      return {
        targetEntityId: before.targetEntityId,
        targetHealthBefore: before.targetHealth,
        targetHealthAfter: after.targetHealth,
      };
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(TICK_DURATION_MS);
    }
  }

  throw new Error(
    `Attack did not damage the selected target: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

async function waitForAbilityReady(
  page: Page,
  abilityIndex: number,
): Promise<void> {
  await page.waitForFunction(
    (selector) => {
      const button = document.querySelector<HTMLButtonElement>(selector);
      return button !== null && !button.disabled;
    },
    `[data-testid="combat-ability-${abilityIndex}"]`,
    { polling: 'raf', timeout: 15_000 },
  );
}

async function tapCombatAction(page: Page, selector: string): Promise<void> {
  if (selector === attackSelector) {
    await page.keyboard.press('Space');
    return;
  }

  const match = /^\[data-testid="combat-ability-(\d+)"\]$/.exec(selector);
  if (match === null) {
    throw new Error(`Unknown combat control ${selector}.`);
  }

  await page.keyboard.press(`Digit${Number(match[1]) + 1}`);
}

/**
 * Leaves the player standing next to a living creature, targeting it. The
 * knight now swings on its own, so a creature the driver picked two steps ago
 * may already be a corpse by the time an ability comes off cooldown.
 */
async function ensureEngagedTarget(
  page: Page,
  hunt: HuntDefinition,
): Promise<number> {
  const state = await readCombatState(page);
  if (state.targetEntityId !== null && state.targetHealth > 0) {
    await moveToAdjacentTarget(page, hunt, state.targetEntityId, false, true);
    const stillThere = await readCombatState(page);
    if (stillThere.targetEntityId !== null && stillThere.targetHealth > 0) {
      return stillThere.targetEntityId;
    }
  }

  const targetId = await selectNextTarget(page, state.targetEntityId);
  await moveToAdjacentTarget(page, hunt, targetId);
  return targetId;
}

async function castDamageAbility(
  page: Page,
  hunt: HuntDefinition,
  abilityIndex: number,
): Promise<CombatHealthProgress> {
  await waitForAbilityReady(page, abilityIndex);
  await ensureEngagedTarget(page, hunt);
  const before = await readCombatState(page);
  await tapCombatAction(page, `[data-testid="combat-ability-${abilityIndex}"]`);
  // A creature that dies to the ability reads back as `0`, which is still the
  // progress this leg is proving.
  const after = await waitForTargetProgress(page, before.targetHealth);
  return {
    targetHealthBefore: before.targetHealth,
    targetHealthAfter: after.targetHealth,
  };
}

async function castHealingAbility(
  page: Page,
  hunt: HuntDefinition,
  targetEntityId: number,
): Promise<CombatHealingProgress> {
  await waitForAbilityReady(page, 2);
  if ((await readCombatState(page)).targetEntityId !== null) {
    await moveAwayFromTarget(page, hunt, targetEntityId, true);
    await page.waitForTimeout(TICK_DURATION_MS * 2);
  }
  const before = await readCombatState(page);
  await tapCombatAction(page, '[data-testid="combat-ability-2"]');
  const observation = await page.waitForFunction(
    (previousHealth) => {
      const health = Number(
        document
          .querySelector<HTMLElement>('[data-testid="combat-player-health"]')
          ?.getAttribute('aria-valuenow'),
      );
      const mana = Number(
        document
          .querySelector<HTMLElement>('[data-testid="combat-player-mana"]')
          ?.getAttribute('aria-valuenow'),
      );
      return Number.isSafeInteger(health) && health > previousHealth
        ? { health, mana }
        : false;
    },
    before.playerHealth,
    { polling: 'raf', timeout: 4_000 },
  );
  const after = await observation.jsonValue<{
    readonly health: number;
    readonly mana: number;
  }>();
  await observation.dispose();
  return {
    playerHealthBefore: before.playerHealth,
    playerHealthAfter: after.health,
    playerManaBefore: before.playerMana,
    playerManaAfter: after.mana,
  };
}

async function waitForLoot(page: Page): Promise<CombatDomState> {
  await page.waitForFunction(
    () => {
      const loot = document.querySelector<HTMLElement>(
        '[data-testid="combat-loot-log"]',
      )?.textContent;
      const bag = document.querySelector<HTMLElement>(
        '[data-testid="combat-run-bag"]',
      )?.textContent;
      return Boolean(loot?.trim()) && Boolean(bag?.trim());
    },
    undefined,
    { polling: 'raf', timeout: 10_000 },
  );
  return readCombatState(page);
}

async function waitForTargetCleared(
  page: Page,
  timeoutMs = 10_000,
): Promise<void> {
  await page.waitForFunction(
    (selector) =>
      document.querySelector<HTMLElement>(selector)?.textContent?.trim() ===
      'No target',
    targetNameSelector,
    undefined,
    { polling: 'raf', timeout: timeoutMs },
  );
}

export async function runCombatSession(
  page: Page,
  viewport: CombatViewport,
  options: CombatSessionOptions = {},
): Promise<CombatPlayEvidence> {
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
  await waitForHunt(page);
  const bootDurationMs = await page.evaluate(() => {
    const marks = performance.getEntriesByName('huntbound:shell-actionable');
    const mark = marks[0];
    if (mark === undefined || !Number.isFinite(mark.startTime)) {
      throw new Error('The shell actionable performance mark is missing.');
    }
    return mark.startTime;
  });
  await expect(page.locator(combatHudSelector)).toHaveCount(1);
  // Read from the catalog rather than freezing a number here: the HUD ceiling
  // is the character sheet's, and hard-coding it made a balance change look
  // like a renderer bug.
  const expectedMaxHealth = readHuntCharacter().maxHealth;
  await page.waitForFunction(
    (maximum) => {
      const health = document.querySelector<HTMLElement>(
        '[data-testid="combat-player-health"]',
      );
      return (
        Number(health?.getAttribute('aria-valuemax')) === maximum &&
        Number(health?.getAttribute('aria-valuenow')) > 0
      );
    },
    expectedMaxHealth,
    { polling: 'raf', timeout: 15_000 },
  );

  const hunt = readHuntDefinition();
  const initial = await readCombatState(page);
  const firstTargetId = await selectNextTarget(page, null);
  await moveToAdjacentTarget(page, hunt, firstTargetId);
  const attack = await attackUntilProgress(page, options.onCombatVisible);

  // The leg the recorded session was missing: one press engaged the creature,
  // and nothing between here and `waitForTargetCleared` touches a key. The
  // knight has to finish it on its own attack cooldown.
  const killedTargetId = attack.targetEntityId;
  await waitForTargetCleared(page, 25_000);

  // Floor 8 of the cave only seats four rotworms, so the abilities have to
  // take whatever is still standing rather than a creature chosen up front.
  const engagedId = await ensureEngagedTarget(page, hunt);
  await waitForPlayerDamage(page, initial.playerHealthMaximum);
  const berserk = await castDamageAbility(page, hunt, 0);
  const brutalStrike = await castDamageAbility(page, hunt, 1);
  const woundCleansing = await castHealingAbility(page, hunt, engagedId);
  const withLoot = await waitForLoot(page);

  return {
    bootDurationMs,
    attack,
    berserk,
    brutalStrike,
    woundCleansing,
    killedTargetId,
    lootLog: withLoot.lootLog,
    runBag: withLoot.runBag,
  };
}
