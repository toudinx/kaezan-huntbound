import type { z } from 'zod';
import type {
  SimulationDiagnostic,
  SimulationValidationResult,
} from '../simulation/types.ts';
import { HuntDefinitionSchema, MapRegionSchema } from './schemas.ts';
import type {
  HuntDefinition,
  HuntDiagnostic,
  HuntDiagnosticCode,
  MapRegion,
} from './types.ts';

const diagnosticCodes = new Set<HuntDiagnosticCode>([
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
  'SIM_STATE_NOT_INTEGER',
  'SIM_STATE_NOT_SERIALIZABLE',
  'SIM_REPLAY_DIVERGED',
  'HUNT_REGION_OUT_OF_BUDGET',
  'HUNT_UNKNOWN_BLUEPRINT',
  'HUNT_TRANSITION_INVALID',
  'HUNT_SPAWN_OUT_OF_REGION',
  'HUNT_PALETTE_INDEX_INVALID',
  'HUNT_INTERVAL_NOT_DIVISIBLE',
  'HUNT_UNKNOWN_ITEM',
  'HUNT_UNKNOWN_CREATURE',
  'HUNT_SPELL_NOT_ALLOWED',
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
  diagnostics: readonly HuntDiagnostic[],
): readonly HuntDiagnostic[] {
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

function codeFromIssue(issue: z.core.$ZodIssue): HuntDiagnosticCode {
  if (issue.code === 'custom' && issue.params !== undefined) {
    const huntCode = issue.params.huntCode;
    if (
      typeof huntCode === 'string' &&
      diagnosticCodes.has(huntCode as HuntDiagnosticCode)
    ) {
      return huntCode as HuntDiagnosticCode;
    }
  }
  return 'SIM_SCHEMA_INVALID';
}

export function huntDiagnosticsFromZodError(
  error: z.ZodError,
): readonly HuntDiagnostic[] {
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

function asPublicDiagnostics(
  diagnostics: readonly HuntDiagnostic[],
): readonly SimulationDiagnostic[] {
  return diagnostics as unknown as readonly SimulationDiagnostic[];
}

export function validateMapRegion(
  input: unknown,
): SimulationValidationResult<MapRegion> {
  const result = MapRegionSchema.safeParse(input);
  return result.success
    ? { ok: true, value: result.data }
    : {
        ok: false,
        diagnostics: asPublicDiagnostics(
          huntDiagnosticsFromZodError(result.error),
        ),
      };
}

export function validateHuntDefinition(
  input: unknown,
): SimulationValidationResult<HuntDefinition> {
  const result = HuntDefinitionSchema.safeParse(input);
  return result.success
    ? { ok: true, value: result.data }
    : {
        ok: false,
        diagnostics: asPublicDiagnostics(
          huntDiagnosticsFromZodError(result.error),
        ),
      };
}
