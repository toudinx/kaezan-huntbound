import type {
  KernelScenario,
  SimulationCommandLog,
  SimulationDiagnostic,
  SimulationEvent,
  SimulationSnapshot,
  SimulationValidationResult,
} from '@huntbound/contracts';
import {
  SIMULATION_SCHEMA_VERSION,
  validateKernelScenario,
  validateSimulationCommandLog,
} from '@huntbound/contracts';

import {
  createSimulationKernel,
  type SimulationKernel,
} from '../kernel/kernel.ts';
import { snapshotKernel } from '../state/snapshot.ts';

export interface ReplayResult {
  readonly snapshot: SimulationSnapshot;
  readonly events: readonly SimulationEvent[];
}

function diagnostic(
  code: SimulationDiagnostic['code'],
  message: string,
  path: readonly (string | number)[],
): SimulationDiagnostic {
  return { code, message, path };
}

/**
 * Validates the scenario and the log, then feeds every logged command into a
 * fresh kernel. The kernel assigns its own sequences at intake: if one of them
 * disagrees with the sequence written in the log, the log is not the log this
 * kernel would have produced and the replay is refused instead of guessed.
 */
export function prepareReplayKernel(
  scenario: KernelScenario,
  log: SimulationCommandLog,
): SimulationValidationResult<SimulationKernel> {
  const validatedScenario = validateKernelScenario(scenario);
  if (!validatedScenario.ok) {
    return {
      ok: false,
      diagnostics: validatedScenario.diagnostics.map((item) => ({
        ...item,
        path: ['scenario', ...item.path],
      })),
    };
  }

  const validatedLog = validateSimulationCommandLog(log);
  if (!validatedLog.ok) {
    return {
      ok: false,
      diagnostics: validatedLog.diagnostics.map((item) => ({
        ...item,
        path: ['log', ...item.path],
      })),
    };
  }

  const { header, commands } = validatedLog.value;
  const diagnostics: SimulationDiagnostic[] = [];

  if (scenario.schemaVersion !== SIMULATION_SCHEMA_VERSION) {
    diagnostics.push(
      diagnostic(
        'SIM_VERSION_MISMATCH',
        `Expected scenario schemaVersion ${SIMULATION_SCHEMA_VERSION}, received ${scenario.schemaVersion}`,
        ['scenario', 'schemaVersion'],
      ),
    );
  }
  if (header.scenarioId !== scenario.scenarioId) {
    diagnostics.push(
      diagnostic(
        'SIM_SCENARIO_MISMATCH',
        `Log belongs to scenario ${header.scenarioId}, not ${scenario.scenarioId}`,
        ['log', 'header', 'scenarioId'],
      ),
    );
  }
  if (header.scenarioRevision !== scenario.scenarioRevision) {
    diagnostics.push(
      diagnostic(
        'SIM_SCENARIO_MISMATCH',
        `Log belongs to scenario revision ${header.scenarioRevision}, not ${scenario.scenarioRevision}`,
        ['log', 'header', 'scenarioRevision'],
      ),
    );
  }

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics };
  }

  const kernel = createSimulationKernel(validatedScenario.value, header.seed);

  for (const [index, record] of commands.entries()) {
    const acceptance = kernel.enqueue({
      tick: record.tick,
      issuer: record.issuer,
      command: record.command,
    });

    if (!acceptance.ok) {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            acceptance.code,
            `Command ${record.sequence} was refused by the kernel`,
            ['log', 'commands', index],
          ),
        ],
      };
    }

    if (acceptance.sequence !== record.sequence) {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            'SIM_REPLAY_DIVERGED',
            `Command at index ${index} was logged with sequence ${record.sequence} but the kernel assigned ${acceptance.sequence}`,
            ['log', 'commands', index, 'sequence'],
          ),
        ],
      };
    }
  }

  return { ok: true, value: kernel };
}

/** Runs a command log from tick zero to the tick count declared in its header. */
export function runReplay(
  scenario: KernelScenario,
  log: SimulationCommandLog,
): SimulationValidationResult<ReplayResult> {
  const prepared = prepareReplayKernel(scenario, log);
  if (!prepared.ok) {
    return prepared;
  }

  const kernel = prepared.value;
  const events = kernel.advance(log.header.tickCount);

  return { ok: true, value: { snapshot: snapshotKernel(kernel), events } };
}
