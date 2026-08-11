import { Agent, get } from 'node:http';

import { chromium } from '@playwright/test';

import {
  classifyStall,
  STALL_THRESHOLD_MS,
  type StallBoundary,
} from './bootStall.ts';
import {
  type ControlDefinition,
  type ControlId,
  controlDefinitions,
  emulatedNetworkConditions,
  isControlId,
} from './controls.ts';
import { previewOrigin } from './previewServer.ts';

/**
 * Runs exactly one execution of one control in this process and prints a single
 * JSON line on stdout. The orchestrator spawns a fresh Node process per
 * execution, which is what the recipe requires; nothing here is shared between
 * executions.
 */

const navigationTimeoutMs = 45_000;
const readinessTimeoutMs = 45_000;
const httpTimeoutMs = 45_000;

export interface RequestObservation {
  readonly url: string;
  readonly sendMs: number | null;
  readonly headerWaitMs: number | null;
  readonly ttfbMs: number | null;
  readonly totalMs: number | null;
  readonly status: number | null;
  readonly bytes: number | null;
}

interface ControlOutcome {
  readonly actionableMs: number | null;
  readonly requests: readonly RequestObservation[];
}

function largest(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);

  return present.length === 0 ? null : Math.max(...present);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

async function runChromium(
  definition: ControlDefinition,
): Promise<ControlOutcome> {
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    const requests: RequestObservation[] = [];

    cdp.on('Network.responseReceived', (event) => {
      const timing = event.response.timing;

      if (!timing || event.response.url.startsWith('data:')) {
        return;
      }

      const headersStart = timing.receiveHeadersStart;

      requests.push({
        url: event.response.url,
        sendMs: round1(timing.sendEnd - timing.sendStart),
        headerWaitMs:
          headersStart === undefined || headersStart < 0
            ? null
            : round1(headersStart - timing.sendEnd),
        ttfbMs: null,
        totalMs: null,
        status: event.response.status,
        bytes: event.response.encodedDataLength ?? null,
      });
    });

    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

    if (definition.throttling === 'on') {
      await cdp.send('Network.emulateNetworkConditions', {
        ...emulatedNetworkConditions,
      });
    }

    await page.goto(`${previewOrigin}/`, { timeout: navigationTimeoutMs });
    await page
      .locator('[data-shell-ready="true"]')
      .first()
      .waitFor({ state: 'attached', timeout: readinessTimeoutMs });

    const actionableMs = await page.evaluate(() => {
      const [mark] = performance.getEntriesByName('huntbound:shell-actionable');

      return mark ? mark.startTime : null;
    });

    return {
      actionableMs: actionableMs === null ? null : round1(actionableMs),
      requests,
    };
  } finally {
    await browser.close();
  }
}

interface TimedResponse {
  readonly observation: RequestObservation;
  readonly body: string;
}

function fetchTimed(url: string, agent: Agent): Promise<TimedResponse> {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const attempt = get(url, { agent }, (response) => {
      const ttfbMs = round1(performance.now() - startedAt);
      const chunks: Buffer[] = [];

      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        const body = Buffer.concat(chunks);

        resolve({
          observation: {
            url,
            sendMs: null,
            headerWaitMs: ttfbMs,
            ttfbMs,
            totalMs: round1(performance.now() - startedAt),
            status: response.statusCode ?? null,
            bytes: body.byteLength,
          },
          body: body.toString('utf8'),
        });
      });
    });

    attempt.on('error', reject);
    attempt.setTimeout(httpTimeoutMs, () => {
      attempt.destroy(new Error(`GET ${url} exceeded ${httpTimeoutMs} ms.`));
    });
  });
}

function assetPath(html: string, extension: string): string {
  const match = html.match(
    new RegExp(`/assets/[^"']+\\.${extension}(?=["'?])`, 'i'),
  );

  if (!match) {
    throw new Error(`No /assets/*.${extension} reference in the document.`);
  }

  return match[0];
}

async function runNodeHttp(): Promise<ControlOutcome> {
  // The document agent is kept alive so the JS request can reuse its socket,
  // exactly as the recipe describes; the CSS gets its own agent.
  const documentAgent = new Agent({ keepAlive: true });
  const styleAgent = new Agent({ keepAlive: true });

  try {
    const document = await fetchTimed(`${previewOrigin}/`, documentAgent);
    const [style, script] = await Promise.all([
      fetchTimed(
        `${previewOrigin}${assetPath(document.body, 'css')}`,
        styleAgent,
      ),
      fetchTimed(
        `${previewOrigin}${assetPath(document.body, 'js')}`,
        documentAgent,
      ),
    ]);

    return {
      actionableMs: null,
      requests: [document.observation, style.observation, script.observation],
    };
  } finally {
    documentAgent.destroy();
    styleAgent.destroy();
  }
}

function parseArguments(argv: readonly string[]): {
  control: ControlId;
  index: number;
} {
  const values = new Map<string, string>();

  for (let cursor = 0; cursor < argv.length; cursor += 2) {
    const flag = argv[cursor];
    const value = argv[cursor + 1];

    if (flag?.startsWith('--') && value !== undefined) {
      values.set(flag.slice(2), value);
    }
  }

  const control = values.get('control') ?? '';
  const index = Number.parseInt(values.get('index') ?? '', 10);

  if (!isControlId(control)) {
    throw new Error(
      `--control must be one of A, A-prime, B, D; received "${control}".`,
    );
  }

  if (!Number.isInteger(index) || index < 1) {
    throw new Error(`--index must be a positive integer; received "${index}".`);
  }

  return { control, index };
}

export async function runOnce(
  control: ControlId,
  index: number,
): Promise<Record<string, unknown>> {
  const definition = controlDefinitions[control];
  const startedAt = new Date().toISOString();

  let outcome: ControlOutcome = { actionableMs: null, requests: [] };
  let failure: string | null = null;

  try {
    outcome =
      definition.client === 'chromium'
        ? await runChromium(definition)
        : await runNodeHttp();
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  }

  const maxSendMs = largest(outcome.requests.map(({ sendMs }) => sendMs));
  const maxHeaderWaitMs = largest(
    outcome.requests.map(({ headerWaitMs }) => headerWaitMs),
  );
  const verdict = classifyStall({ maxSendMs, maxHeaderWaitMs });

  return {
    schema: 'pb00r-06-boot-stall-run/1',
    control: definition.id,
    controlLabel: definition.label,
    index,
    startedAt,
    finishedAt: new Date().toISOString(),
    client: definition.client,
    runner: definition.runner,
    previewLifecycle: definition.previewLifecycle,
    throttling: definition.throttling,
    boundarySource: definition.boundarySource,
    thresholdMs: STALL_THRESHOLD_MS,
    actionableMs: outcome.actionableMs,
    maxSendMs,
    maxHeaderWaitMs,
    stalled: verdict.stalled,
    worstMs: verdict.worstMs,
    worstBoundary: verdict.worstBoundary satisfies StallBoundary | null,
    completed: failure === null,
    error: failure,
    requests: outcome.requests,
  };
}

async function main(): Promise<void> {
  const { control, index } = parseArguments(process.argv.slice(2));

  process.stdout.write(`${JSON.stringify(await runOnce(control, index))}\n`);
}

if (import.meta.main) {
  await main();
}
