import type {
  SimulationDiagnostic,
  SimulationValidationResult,
} from '../../../../packages/contracts/src/index.ts';
import { validateKernelScenario } from '../../../../packages/contracts/src/index.ts';
import {
  decodeCommandLog,
  encodeCanonicalJson,
  runReplay,
} from '../../../../packages/simulation/src/index.ts';

export interface KernelProbeResult {
  readonly canonicalSnapshot: string;
  readonly snapshotSha256: string;
  readonly eventCount: number;
  readonly finalTick: number;
}

export interface KernelProbe {
  replay(scenarioJson: string, logText: string): Promise<KernelProbeResult>;
}

export class KernelProbeError extends Error {
  readonly code: SimulationDiagnostic['code'];
  readonly diagnostics: readonly SimulationDiagnostic[];

  constructor(diagnostics: readonly SimulationDiagnostic[]) {
    const frozenDiagnostics = Object.freeze([...diagnostics]);
    const first = frozenDiagnostics[0];
    super(first?.message ?? 'Kernel probe input is invalid.');
    this.name = 'KernelProbeError';
    this.code = first?.code ?? 'SIM_SCHEMA_INVALID';
    this.diagnostics = frozenDiagnostics;
  }
}

declare global {
  interface Window {
    __huntboundKernelProbe?: KernelProbe;
  }
}

type HuntboundKernelGlobal = typeof globalThis & {
  __huntboundKernelProbe?: KernelProbe;
};

function diagnostic(
  message: string,
  path: readonly (string | number)[],
): SimulationDiagnostic {
  return {
    code: 'SIM_SCHEMA_INVALID',
    message,
    path,
  };
}

function parseScenarioJson(scenarioJson: unknown): unknown {
  if (typeof scenarioJson !== 'string') {
    throw new KernelProbeError([
      diagnostic('Scenario must be JSON text.', ['scenario']),
    ]);
  }

  try {
    return JSON.parse(scenarioJson) as unknown;
  } catch (error) {
    throw new KernelProbeError([
      diagnostic(
        `Scenario is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        ['scenario'],
      ),
    ]);
  }
}

function throwOnFailure<T>(result: SimulationValidationResult<T>): T {
  if (!result.ok) {
    throw new KernelProbeError(result.diagnostics);
  }
  return result.value;
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function replay(
  scenarioJson: string,
  logText: string,
): Promise<KernelProbeResult> {
  const scenario = throwOnFailure(
    validateKernelScenario(parseScenarioJson(scenarioJson)),
  );
  const log = throwOnFailure(decodeCommandLog(logText));
  const replayed = throwOnFailure(runReplay(scenario, log));
  const canonicalSnapshot = `${encodeCanonicalJson(replayed.snapshot)}\n`;

  return {
    canonicalSnapshot,
    snapshotSha256: await sha256Hex(canonicalSnapshot),
    eventCount: replayed.events.length,
    finalTick: replayed.snapshot.tick,
  };
}

export function installKernelProbe(): void {
  if (import.meta.env.MODE !== 'test') {
    return;
  }

  const target = globalThis as HuntboundKernelGlobal;
  target.__huntboundKernelProbe ??= Object.freeze({ replay });
}
