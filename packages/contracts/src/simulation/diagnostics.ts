import type { z } from 'zod';

import {
  SIMULATION_RULES_VERSION,
  SIMULATION_SCHEMA_VERSION,
} from './identity.ts';
import {
  KernelScenarioSchema,
  SimulationCommandLogSchema,
  SimulationSnapshotSchema,
} from './schemas.ts';
import type {
  KernelScenario,
  SimulationCommandLog,
  SimulationDiagnostic,
  SimulationDiagnosticCode,
  SimulationSnapshot,
  SimulationValidationResult,
} from './types.ts';

const diagnosticCodes = new Set<SimulationDiagnosticCode>([
  'SIM_SCHEMA_INVALID',
  'SIM_VERSION_MISMATCH',
  'SIM_SCENARIO_MISMATCH',
  'SIM_SEED_INVALID',
  'SIM_TICK_IN_PAST',
  'SIM_COMMAND_UNKNOWN_ENTITY',
  'SIM_COMMAND_FORBIDDEN',
  'SIM_COMMAND_DUPLICATE',
  'SIM_MOVE_OUT_OF_BOUNDS',
  'SIM_MOVE_BLOCKED_TERRAIN',
  'SIM_MOVE_BLOCKED_OCCUPIED',
  'SIM_MOVE_DIAGONAL_CORNER',
  'SIM_MOVE_ON_COOLDOWN',
  'SIM_SPAWN_TILE_UNAVAILABLE',
  'SIM_TRANSITION_CHAINED',
  'SIM_TARGET_UNKNOWN',
  'SIM_TARGET_SAME_FACTION',
  'SIM_ATTACK_OUT_OF_RANGE',
  'SIM_ATTACK_ON_COOLDOWN',
  'SIM_ABILITY_UNKNOWN',
  'SIM_ABILITY_ON_COOLDOWN',
  'SIM_ABILITY_NO_RESOURCE',
  'SIM_ABILITY_OUT_OF_RANGE',
  'SIM_STATE_NOT_INTEGER',
  'SIM_STATE_NOT_SERIALIZABLE',
  'SIM_REPLAY_DIVERGED',
]);

function formatPath(path: readonly (string | number)[]) {
  return path
    .map((segment) =>
      typeof segment === 'number' ? `[${segment}]` : String(segment),
    )
    .join('.')
    .replaceAll('.[', '[');
}

function comparePath(
  left: readonly (string | number)[],
  right: readonly (string | number)[],
) {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftSegment = left[index];
    const rightSegment = right[index];
    if (leftSegment === rightSegment) {
      continue;
    }
    if (leftSegment === undefined) {
      return -1;
    }
    if (rightSegment === undefined) {
      return 1;
    }
    if (typeof leftSegment === 'number' && typeof rightSegment === 'number') {
      return leftSegment < rightSegment ? -1 : 1;
    }
    if (typeof leftSegment === 'number') {
      return 1;
    }
    if (typeof rightSegment === 'number') {
      return -1;
    }
    return leftSegment < rightSegment ? -1 : 1;
  }
  return left.length - right.length;
}

function sortDiagnostics(
  diagnostics: readonly SimulationDiagnostic[],
): readonly SimulationDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const pathOrder = comparePath(left.path, right.path);
    if (pathOrder !== 0) {
      return pathOrder;
    }
    const codeOrder =
      left.code === right.code ? 0 : left.code < right.code ? -1 : 1;
    if (codeOrder !== 0) {
      return codeOrder;
    }
    return left.message === right.message
      ? 0
      : left.message < right.message
        ? -1
        : 1;
  });
}

function codeFromIssue(issue: z.core.$ZodIssue): SimulationDiagnosticCode {
  if (issue.code === 'custom' && issue.params !== undefined) {
    const simulationCode = issue.params.simulationCode;
    if (
      typeof simulationCode === 'string' &&
      diagnosticCodes.has(simulationCode as SimulationDiagnosticCode)
    ) {
      return simulationCode as SimulationDiagnosticCode;
    }
  }

  if (issue.path.at(-1) === 'seed') {
    return 'SIM_SEED_INVALID';
  }

  return 'SIM_SCHEMA_INVALID';
}

export function simulationDiagnosticsFromZodError(
  error: z.ZodError,
): readonly SimulationDiagnostic[] {
  return sortDiagnostics(
    error.issues.map((issue) => {
      const path = issue.path.filter(
        (segment): segment is string | number =>
          typeof segment === 'string' || typeof segment === 'number',
      );
      const formattedPath = formatPath(path);
      return {
        code: codeFromIssue(issue),
        message:
          formattedPath.length > 0
            ? `${formattedPath}: ${issue.message}`
            : issue.message,
        path,
      };
    }),
  );
}

function versionDiagnostics(
  schemaVersion: number,
  rulesVersion: number | undefined,
): readonly SimulationDiagnostic[] {
  const diagnostics: SimulationDiagnostic[] = [];
  if (schemaVersion !== SIMULATION_SCHEMA_VERSION) {
    diagnostics.push({
      code: 'SIM_VERSION_MISMATCH',
      message: `Expected schemaVersion ${SIMULATION_SCHEMA_VERSION}, received ${schemaVersion}`,
      path: ['schemaVersion'],
    });
  }
  if (rulesVersion !== undefined && rulesVersion !== SIMULATION_RULES_VERSION) {
    diagnostics.push({
      code: 'SIM_VERSION_MISMATCH',
      message: `Expected rulesVersion ${SIMULATION_RULES_VERSION}, received ${rulesVersion}`,
      path: ['rulesVersion'],
    });
  }
  return sortDiagnostics(diagnostics);
}

function invalid<T>(
  diagnostics: readonly SimulationDiagnostic[],
): SimulationValidationResult<T> {
  return { ok: false, diagnostics: sortDiagnostics(diagnostics) };
}

export function validateKernelScenario(
  input: unknown,
): SimulationValidationResult<KernelScenario> {
  const result = KernelScenarioSchema.safeParse(input);
  if (!result.success) {
    return invalid(simulationDiagnosticsFromZodError(result.error));
  }

  const versions = versionDiagnostics(result.data.schemaVersion, undefined);
  return versions.length > 0
    ? invalid(versions)
    : { ok: true, value: result.data };
}

export function validateSimulationSnapshot(
  input: unknown,
): SimulationValidationResult<SimulationSnapshot> {
  const result = SimulationSnapshotSchema.safeParse(input);
  if (!result.success) {
    return invalid(simulationDiagnosticsFromZodError(result.error));
  }

  const versions = versionDiagnostics(
    result.data.schemaVersion,
    result.data.rulesVersion,
  );
  return versions.length > 0
    ? invalid(versions)
    : { ok: true, value: result.data };
}

export function validateSimulationCommandLog(
  input: unknown,
): SimulationValidationResult<SimulationCommandLog> {
  const result = SimulationCommandLogSchema.safeParse(input);
  if (!result.success) {
    return invalid(simulationDiagnosticsFromZodError(result.error));
  }

  const versions = versionDiagnostics(
    result.data.header.schemaVersion,
    result.data.header.rulesVersion,
  );
  return versions.length > 0
    ? invalid(versions)
    : { ok: true, value: result.data };
}
