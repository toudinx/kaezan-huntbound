/**
 * The four PB-00R-02 diagnostic controls, transcribed from the recipe already
 * recorded in `docs/playbooks/PB-00R/artifacts/acceptance-report.md`.
 *
 * These reproduce the controls; they do not audit the historical numbers, which
 * remain an independently unverified report. No control is ever acceptance
 * evidence for the boot budget.
 */

export type ControlId = 'A' | 'A-prime' | 'B' | 'D';

export type PreviewLifecycle = 'reused' | 'per-run';

export interface ControlDefinition {
  readonly id: ControlId;
  /** Label used in the reported matrix. */
  readonly label: string;
  readonly client: 'chromium' | 'node-http';
  readonly runner: 'none';
  readonly previewLifecycle: PreviewLifecycle;
  readonly throttling: 'on' | 'off' | 'n/a';
  /**
   * `cdp` reads `sendEnd - sendStart` and `receiveHeadersStart - sendEnd` from
   * `Network.responseReceived`. `nodeHttpTtfb` has no CDP timeline at all: the
   * closest comparable boundary is the time to first byte measured in Node, and
   * it is reported in the header-wait slot so the same criterion applies. The
   * two sources are not the same measurement and are labelled per run.
   */
  readonly boundarySource: 'cdp' | 'nodeHttpTtfb';
  readonly description: string;
}

export const controlDefinitions: Record<ControlId, ControlDefinition> = {
  A: {
    id: 'A',
    label: 'A',
    client: 'chromium',
    runner: 'none',
    previewLifecycle: 'reused',
    throttling: 'on',
    boundarySource: 'cdp',
    description:
      'Chromium via CDP with the emulated network, against a single reused vite preview.',
  },
  'A-prime': {
    id: 'A-prime',
    label: 'A′',
    client: 'chromium',
    runner: 'none',
    previewLifecycle: 'per-run',
    throttling: 'on',
    boundarySource: 'cdp',
    description:
      'Identical to A except that vite preview is started and stopped around every execution.',
  },
  B: {
    id: 'B',
    label: 'B',
    client: 'chromium',
    runner: 'none',
    previewLifecycle: 'per-run',
    throttling: 'off',
    boundarySource: 'cdp',
    description:
      'Identical to A′ except that Network.emulateNetworkConditions is never sent.',
  },
  D: {
    id: 'D',
    label: 'D',
    client: 'node-http',
    runner: 'none',
    previewLifecycle: 'per-run',
    throttling: 'n/a',
    boundarySource: 'nodeHttpTtfb',
    description:
      'No browser: three Node GETs — document, then CSS and JS in parallel with the JS reusing the document agent.',
  },
};

export const controlOrder: readonly ControlId[] = ['A', 'A-prime', 'B', 'D'];

export function isControlId(value: string): value is ControlId {
  return (controlOrder as readonly string[]).includes(value);
}

/** Exactly the conditions the gate emulates; B omits this message entirely. */
export const emulatedNetworkConditions = {
  offline: false,
  latency: 150,
  downloadThroughput: 200_000,
  uploadThroughput: 93_750,
  connectionType: 'cellular4g',
} as const;
