import { expect, type Page } from '@playwright/test';
import type {
  HuntboundHuntGlobal,
  HuntProbeActor,
  HuntProbeCommand,
  HuntProbeEvent,
  HuntProbeState,
} from '../../../apps/game/src/hunt/HuntProbe.ts';
import type { GridPosition } from '../../../packages/contracts/src/index.ts';

export type StepKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export const stepKeys: Readonly<Record<'n' | 's' | 'w' | 'e', StepKey>> = {
  n: 'ArrowUp',
  s: 'ArrowDown',
  w: 'ArrowLeft',
  e: 'ArrowRight',
};

/** What one held input produced: the events it caused and the state after it. */
export interface HuntStepOutcome {
  readonly before: HuntProbeState;
  readonly after: HuntProbeState;
  readonly playerEvents: readonly HuntProbeEvent[];
  readonly commands: readonly HuntProbeCommand[];
}

const playerEventTypes = new Set([
  'actor/moved',
  'actor/move-blocked',
  'actor/transitioned',
]);

const probeErrorMessage = 'Hunt probe is not installed in the test browser.';

export async function waitForHunt(page: Page): Promise<HuntProbeState> {
  await page.goto('/');
  await expect(
    page.locator('#shell-root[data-assets-ready="true"]'),
  ).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('#game-root canvas')).toHaveCount(1);

  await page.waitForFunction(
    () => {
      const probe = (globalThis as HuntboundHuntGlobal).__huntboundHuntProbe;
      return probe !== undefined && probe.state().player !== null;
    },
    undefined,
    { polling: 'raf', timeout: 15_000 },
  );

  return readHuntState(page);
}

export async function readHuntState(page: Page): Promise<HuntProbeState> {
  return page.evaluate(() => {
    const probe = (globalThis as HuntboundHuntGlobal).__huntboundHuntProbe;
    if (probe === undefined) {
      throw new Error('Hunt probe is not installed in the test browser.');
    }
    return probe.state();
  });
}

async function beginStep(page: Page): Promise<HuntProbeState> {
  return page.evaluate(() => {
    const probe = (globalThis as HuntboundHuntGlobal).__huntboundHuntProbe;
    if (probe === undefined) {
      throw new Error('Hunt probe is not installed in the test browser.');
    }
    probe.reset();
    return probe.state();
  });
}

/**
 * Waits in the page, on `requestAnimationFrame`, so the hold is released about
 * one frame after the simulation answers. The input gate opens once per tick, so
 * a hold shorter than one tick is what yields a single command; a longer hold
 * keeps enqueueing while the key is down.
 *
 * A `cooldown` refusal is not an answer to this press: it only says the
 * previous step is still paying for itself. Treating it as one would release
 * the key before the hunt ever ruled on the direction.
 */
async function waitForPlayerAnswer(
  page: Page,
  playerEntityId: number,
): Promise<void> {
  await page.waitForFunction(
    (entityId) => {
      const probe = (globalThis as HuntboundHuntGlobal).__huntboundHuntProbe;
      if (probe === undefined) return false;
      return probe
        .events()
        .some(
          (item) =>
            item.entityId === entityId &&
            (item.type === 'actor/moved' ||
              item.type === 'actor/transitioned' ||
              (item.type === 'actor/move-blocked' &&
                item.reason !== 'cooldown')),
        );
    },
    playerEntityId,
    { polling: 'raf', timeout: 10_000 },
  );
}

async function endStep(
  page: Page,
  before: HuntProbeState,
): Promise<HuntStepOutcome> {
  const [after, events, commands] = await page.evaluate(() => {
    const probe = (globalThis as HuntboundHuntGlobal).__huntboundHuntProbe;
    if (probe === undefined) {
      throw new Error('Hunt probe is not installed in the test browser.');
    }
    return [probe.state(), probe.events(), probe.commands?.() ?? []] as const;
  });
  const playerEntityId = before.player?.entityId;

  return {
    before,
    after,
    playerEvents: events.filter(
      (item) =>
        item.entityId === playerEntityId &&
        playerEventTypes.has(item.type) &&
        item.reason !== 'cooldown',
    ),
    commands,
  };
}

/** Drives one step with the real keyboard, held only until the hunt answers. */
export async function stepWithKeyboard(
  page: Page,
  key: StepKey,
): Promise<HuntStepOutcome> {
  const before = await beginStep(page);
  const playerEntityId = before.player?.entityId;

  if (playerEntityId === undefined) {
    throw new Error(probeErrorMessage);
  }

  await page.keyboard.down(key);
  try {
    await waitForPlayerAnswer(page, playerEntityId);
  } finally {
    await page.keyboard.up(key);
  }

  return endStep(page, before);
}

/** Holds a direction for less than the player's 2-tick step duration. */
export async function holdKeyboardFor(
  page: Page,
  key: StepKey,
  durationMs: number,
): Promise<HuntStepOutcome> {
  const before = await beginStep(page);
  const playerEntityId = before.player?.entityId;

  if (playerEntityId === undefined) {
    throw new Error(probeErrorMessage);
  }

  await page.keyboard.down(key);
  try {
    await page.waitForTimeout(durationMs);
  } finally {
    await page.keyboard.up(key);
  }

  await waitForPlayerAnswer(page, playerEntityId);
  return endStep(page, before);
}

/** Drives one step by holding a d-pad control, using real pointer input. */
export async function stepWithDpad(
  page: Page,
  direction: 'n' | 's' | 'w' | 'e' | 'nw' | 'ne' | 'sw' | 'se',
): Promise<HuntStepOutcome> {
  const before = await beginStep(page);
  const playerEntityId = before.player?.entityId;

  if (playerEntityId === undefined) {
    throw new Error(probeErrorMessage);
  }

  const control = page.locator(
    `[data-testid="hunt-dpad"] [data-hunt-direction="${direction}"]`,
  );
  const box = await control.boundingBox();

  if (box === null) {
    throw new Error(`D-pad control ${direction} has no box.`);
  }

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  try {
    await waitForPlayerAnswer(page, playerEntityId);
  } finally {
    await page.mouse.up();
  }

  return endStep(page, before);
}

/** Taps a d-pad control for a measured duration using real pointer input. */
export async function tapDpadFor(
  page: Page,
  direction: 'n' | 's' | 'w' | 'e' | 'nw' | 'ne' | 'sw' | 'se',
  durationMs: number,
): Promise<HuntStepOutcome> {
  const before = await beginStep(page);
  const playerEntityId = before.player?.entityId;

  if (playerEntityId === undefined) {
    throw new Error(probeErrorMessage);
  }

  const control = page.locator(
    `[data-testid="hunt-dpad"] [data-hunt-direction="${direction}"]`,
  );
  const box = await control.boundingBox();

  if (box === null) {
    throw new Error(`D-pad control ${direction} has no box.`);
  }

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  try {
    await page.waitForTimeout(durationMs);
  } finally {
    await page.mouse.up();
  }

  await waitForPlayerAnswer(page, playerEntityId);
  return endStep(page, before);
}

/** Narrows the optional shapes the probe returns, with a message on failure. */
export function requirePlayer(state: HuntProbeState): HuntProbeActor {
  const player = state.player;

  if (player === null) {
    throw new Error('The hunt is presenting no player actor.');
  }

  return player;
}

export function requireCell(
  event: HuntProbeEvent,
  side: 'from' | 'to',
): GridPosition {
  const cell = event[side];

  if (cell === null) {
    throw new Error(`A ${event.type} event carries no ${side} cell.`);
  }

  return cell;
}

export function requireFirst<T>(items: readonly T[], what: string): T {
  const first = items[0];

  if (first === undefined) {
    throw new Error(`Expected at least one ${what}.`);
  }

  return first;
}

export function movedEvents(
  outcome: HuntStepOutcome,
): readonly HuntProbeEvent[] {
  return outcome.playerEvents.filter((item) => item.type === 'actor/moved');
}

export function blockedEvents(
  outcome: HuntStepOutcome,
): readonly HuntProbeEvent[] {
  return outcome.playerEvents.filter(
    (item) => item.type === 'actor/move-blocked',
  );
}
