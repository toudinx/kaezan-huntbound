import { createHash } from 'node:crypto';

import type {
  KernelScenario,
  SimulationCommandLog,
  SimulationDiagnostic,
} from '../../packages/contracts/src/index.ts';
import { validateKernelScenario } from '../../packages/contracts/src/index.ts';
import {
  decodeCommandLog,
  encodeCanonicalJson,
  encodeEventJournal,
  prepareReplayKernel,
  restoreSimulationKernel,
  runReplay,
  snapshotKernel,
} from '../../packages/simulation/src/index.ts';

export interface ReplayDigests {
  readonly scenario: string;
  readonly commands: string;
  readonly snapshot: string;
  readonly events: string;
}

export interface ReplayArtifacts {
  readonly snapshotText: string;
  readonly eventsText: string;
  readonly digests: ReplayDigests;
}

export interface BuildReplayArtifactsOptions {
  /**
   * When set, the run is split: ticks `0..resumeAtTick` run on one kernel, the
   * kernel is snapshotted, restored, and the remaining ticks run on the
   * restored kernel. The artifacts must come out identical to a straight run.
   */
  readonly resumeAtTick?: number;
}

/**
 * `invalid-input` means the document could not be read at all. `divergence`
 * means it was read fine but does not belong to this run — another rules
 * version, another scenario, or a log this kernel would not have produced.
 * The CLI maps them to exit 2 and exit 1 respectively.
 */
export type ReplayFailureKind = 'invalid-input' | 'divergence';

export type ReplayArtifactsResult =
  | { readonly ok: true; readonly value: ReplayArtifacts }
  | {
      readonly ok: false;
      readonly kind: ReplayFailureKind;
      readonly diagnostics: readonly SimulationDiagnostic[];
    };

const divergenceCodes = new Set<SimulationDiagnostic['code']>([
  'SIM_VERSION_MISMATCH',
  'SIM_SCENARIO_MISMATCH',
  'SIM_REPLAY_DIVERGED',
]);

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function failure(
  diagnostics: readonly SimulationDiagnostic[],
): ReplayArtifactsResult {
  const kind: ReplayFailureKind = diagnostics.some((item) =>
    divergenceCodes.has(item.code),
  )
    ? 'divergence'
    : 'invalid-input';
  return { ok: false, kind, diagnostics };
}

function invalidInput(
  diagnostics: readonly SimulationDiagnostic[],
): ReplayArtifactsResult {
  return failure(diagnostics);
}

function diagnostic(
  code: SimulationDiagnostic['code'],
  message: string,
  path: readonly (string | number)[],
): SimulationDiagnostic {
  return { code, message, path };
}

function parseJson(
  text: string,
  label: string,
): { readonly ok: true; readonly value: unknown } | ReplayArtifactsResult {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    return invalidInput([
      diagnostic(
        'SIM_SCHEMA_INVALID',
        `${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        [label],
      ),
    ]);
  }
}

function artifacts(
  scenarioText: string,
  logText: string,
  snapshotValue: unknown,
  events: Parameters<typeof encodeEventJournal>[0],
): ReplayArtifacts {
  const snapshotText = `${encodeCanonicalJson(snapshotValue)}\n`;
  const eventsText = encodeEventJournal(events);

  return {
    snapshotText,
    eventsText,
    digests: {
      scenario: sha256Hex(scenarioText),
      commands: sha256Hex(logText),
      snapshot: sha256Hex(snapshotText),
      events: sha256Hex(eventsText),
    },
  };
}

function buildSplitRun(
  scenario: KernelScenario,
  log: SimulationCommandLog,
  scenarioText: string,
  logText: string,
  resumeAtTick: number,
): ReplayArtifactsResult {
  if (
    !Number.isSafeInteger(resumeAtTick) ||
    resumeAtTick < 0 ||
    resumeAtTick > log.header.tickCount
  ) {
    return invalidInput([
      diagnostic(
        'SIM_SCHEMA_INVALID',
        `resumeAtTick must be between 0 and ${log.header.tickCount}`,
        ['resumeAtTick'],
      ),
    ]);
  }

  const prepared = prepareReplayKernel(scenario, log);
  if (!prepared.ok) {
    return invalidInput(prepared.diagnostics);
  }

  const head = prepared.value.advance(resumeAtTick);
  const restored = restoreSimulationKernel(
    scenario,
    snapshotKernel(prepared.value),
  );
  if (!restored.ok) {
    return invalidInput(restored.diagnostics);
  }

  const tail = restored.value.advance(log.header.tickCount - resumeAtTick);

  return {
    ok: true,
    value: artifacts(scenarioText, logText, snapshotKernel(restored.value), [
      ...head,
      ...tail,
    ]),
  };
}

/**
 * Runs the fixture end to end from its two source documents and returns the
 * canonical artifacts plus their digests. Every failure is an input failure:
 * this function never rewrites a golden to make anything agree.
 */
export function buildReplayArtifacts(
  scenarioText: string,
  logText: string,
  options: BuildReplayArtifactsOptions = {},
): ReplayArtifactsResult {
  const scenarioJson = parseJson(scenarioText, 'scenario');
  if (!scenarioJson.ok) {
    return scenarioJson;
  }
  if (!('value' in scenarioJson)) {
    return scenarioJson;
  }

  const scenario = validateKernelScenario(scenarioJson.value);
  if (!scenario.ok) {
    return invalidInput(scenario.diagnostics);
  }

  const log = decodeCommandLog(logText);
  if (!log.ok) {
    return invalidInput(log.diagnostics);
  }

  if (options.resumeAtTick !== undefined) {
    return buildSplitRun(
      scenario.value,
      log.value,
      scenarioText,
      logText,
      options.resumeAtTick,
    );
  }

  const replayed = runReplay(scenario.value, log.value);
  if (!replayed.ok) {
    return invalidInput(replayed.diagnostics);
  }

  return {
    ok: true,
    value: artifacts(
      scenarioText,
      logText,
      replayed.value.snapshot,
      replayed.value.events,
    ),
  };
}
