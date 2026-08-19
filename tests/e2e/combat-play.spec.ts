import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, type Page, test } from '@playwright/test';
import type { HuntboundHuntGlobal } from '../../apps/game/src/hunt/HuntProbe';

import {
  type CombatPlayEvidence,
  runCombatSession,
} from './support/combatDriver';

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'desktop-wide', width: 1920, height: 1080 },
] as const;

const screenshotRoot = fileURLToPath(
  new URL('../../docs/playbooks/PB-05/artifacts/screenshots/', import.meta.url),
);

interface PageWatch {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
  readonly failedRequests: string[];
  readonly badResponses: string[];
}

function watchPage(page: Page): PageWatch {
  const watch: PageWatch = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
  };

  page.on('console', (message) => {
    if (message.type() === 'error') watch.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => watch.pageErrors.push(error.message));
  page.on('requestfailed', (request) =>
    watch.failedRequests.push(request.url()),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) {
      watch.badResponses.push(`${response.url()} (${response.status()})`);
    }
  });

  return watch;
}

function expectEvidence(evidence: CombatPlayEvidence): void {
  expect(evidence.attack.targetHealthAfter).toBeLessThan(
    evidence.attack.targetHealthBefore,
  );
  expect(evidence.berserk.targetHealthAfter).toBeLessThan(
    evidence.berserk.targetHealthBefore,
  );
  expect(evidence.brutalStrike.targetHealthAfter).toBeLessThan(
    evidence.brutalStrike.targetHealthBefore,
  );
  expect(evidence.woundCleansing.playerHealthAfter).toBeGreaterThan(
    evidence.woundCleansing.playerHealthBefore,
  );
  expect(evidence.woundCleansing.playerManaAfter).toBeLessThan(
    evidence.woundCleansing.playerManaBefore,
  );
  expect(evidence.lootLog).not.toBe('');
  expect(evidence.runBag).not.toBe('');
  expect(evidence.killedTargetId).toBeGreaterThan(1);
}

interface DamageNumberFrame {
  readonly id: number;
  readonly textWrites: number;
  readonly time: number;
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
}

interface DamageNumberObservation {
  readonly time: number;
  readonly textWrites: number;
  readonly numbers: readonly DamageNumberFrame[];
}

interface DamageNumberSamplesGlobal extends HuntboundHuntGlobal {
  __huntboundDamageNumberSamples?: {
    active: boolean;
    observations: DamageNumberObservation[];
  };
}

async function startDamageNumberSampling(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = globalThis as DamageNumberSamplesGlobal;
    if (target.__huntboundDamageNumberSamples !== undefined) return;
    const samples = {
      active: true,
      observations: [] as DamageNumberObservation[],
    };
    const sample = (): void => {
      const probe = target.__huntboundHuntProbe;
      const time = performance.now();
      const textWrites = probe?.state().decorationTextWrites;
      const numbers = (probe?.visibleDecorations?.() ?? [])
        .filter(
          (decoration) =>
            decoration.kind === 'damage-number' && decoration.visible,
        )
        .map((decoration) => ({
          id: decoration.id,
          textWrites: textWrites ?? 0,
          time,
          x: decoration.x,
          y: decoration.y,
          alpha: decoration.alpha,
        }));
      if (textWrites !== undefined) {
        samples.observations.push({ time, textWrites, numbers });
      }
      if (samples.observations.length > 20_000) {
        samples.observations.shift();
      }
      if (samples.active) window.setTimeout(sample, 50);
    };
    target.__huntboundDamageNumberSamples = samples;
    window.setTimeout(() => {
      samples.active = false;
    }, 4_000);
    sample();
  });
}

async function stopDamageNumberSampling(
  page: Page,
): Promise<readonly DamageNumberObservation[]> {
  return page.evaluate(() => {
    const target = globalThis as DamageNumberSamplesGlobal;
    const samples = target.__huntboundDamageNumberSamples;
    if (samples === undefined) return [];
    samples.active = false;
    return samples.observations;
  });
}

function expectDamageNumberAnimation(
  observations: readonly DamageNumberObservation[],
): void {
  const frames = observations.flatMap((observation) => observation.numbers);
  expect(frames.length).toBeGreaterThan(0);

  const byId = new Map<number, DamageNumberFrame[]>();
  for (const frame of frames) {
    const framesForId = byId.get(frame.id) ?? [];
    framesForId.push(frame);
    byId.set(frame.id, framesForId);
  }

  let stablePair: readonly [DamageNumberFrame, DamageNumberFrame] | undefined;
  for (const framesForId of byId.values()) {
    for (let firstIndex = 0; firstIndex < framesForId.length; firstIndex += 1) {
      const first = framesForId[firstIndex];
      if (first === undefined) continue;
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < framesForId.length;
        secondIndex += 1
      ) {
        const second = framesForId[secondIndex];
        if (
          second !== undefined &&
          second.time - first.time >= 200 &&
          second.textWrites === first.textWrites &&
          second.y !== first.y &&
          second.alpha < first.alpha
        ) {
          stablePair = [first, second];
          break;
        }
      }
      if (stablePair !== undefined) break;
    }
    if (stablePair !== undefined) break;
  }
  expect(stablePair).toBeDefined();

  const firstSeen = [...byId.values()]
    .map((framesForId) => framesForId[0])
    .filter((frame): frame is DamageNumberFrame => frame !== undefined)
    .sort((first, second) => first.time - second.time);
  expect(firstSeen.length).toBeGreaterThan(1);
  const hasLaterTextWrite = firstSeen.some((first, firstIndex) =>
    firstSeen
      .slice(firstIndex + 1)
      .some((later) => later.textWrites > first.textWrites),
  );
  expect(hasLaterTextWrite).toBe(true);

  let idlePair:
    | readonly [DamageNumberObservation, DamageNumberObservation]
    | undefined;
  for (let index = 1; index < observations.length; index += 1) {
    const previous = observations[index - 1];
    const current = observations[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      previous.numbers.length === 0 &&
      current.numbers.length === 0 &&
      current.time - previous.time >= 50 &&
      current.textWrites === previous.textWrites
    ) {
      idlePair = [previous, current];
      break;
    }
  }
  expect(idlePair).toBeDefined();
}

for (const viewport of viewports) {
  test(`${viewport.name} proves the directed combat session`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const watch = watchPage(page);
    const screenshotPath = `${screenshotRoot}combat-${viewport.name}-${viewport.width}x${viewport.height}.png`;
    const shouldWriteScreenshot =
      process.env.HUNTBOUND_COMBAT_SCREENSHOTS === 'write';
    const evidence = await runCombatSession(page, viewport, {
      onCombatVisible: async () => {
        await startDamageNumberSampling(page);
        if (shouldWriteScreenshot) {
          await page.screenshot({ path: screenshotPath, fullPage: true });
        }
      },
    });
    const damageNumberObservations = await stopDamageNumberSampling(page);
    expectDamageNumberAnimation(damageNumberObservations);

    expectEvidence(evidence);
    console.log(
      `[combat-boot] viewport=${viewport.name} actionable=${evidence.bootDurationMs.toFixed(1)}ms`,
    );
    expect(existsSync(screenshotPath)).toBe(true);
    expect(watch.consoleErrors).toEqual([]);
    expect(watch.pageErrors).toEqual([]);
    expect(watch.failedRequests).toEqual([]);
    expect(watch.badResponses).toEqual([]);
  });
}
