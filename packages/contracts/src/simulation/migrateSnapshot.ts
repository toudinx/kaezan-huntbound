import { validateSimulationSnapshot } from './diagnostics.ts';
import {
  SIMULATION_RULES_VERSION,
  SIMULATION_SCHEMA_VERSION,
} from './identity.ts';
import { migrateActorStateInput } from './schemas.ts';
import type {
  SimulationSnapshot,
  SimulationValidationResult,
} from './types.ts';

function diagnostic(
  message: string,
  path: readonly (string | number)[] = [],
): SimulationValidationResult<SimulationSnapshot> {
  return {
    ok: false,
    diagnostics: [
      {
        code: 'SIM_SCHEMA_INVALID',
        message,
        path,
      },
    ],
  };
}

/**
 * Lifts a schema v4 snapshot to v5. The only breaking field is the scalar
 * `groupReadyAtTick`, which becomes the primary group entry. Additive v5
 * fields take their neutral defaults during schema parse.
 */
export function migrateSimulationSnapshot(
  input: unknown,
): SimulationValidationResult<SimulationSnapshot> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return diagnostic('Expected a snapshot object');
  }

  const document = input as Record<string, unknown>;
  const actors = document.actors;
  if (!Array.isArray(actors)) {
    return diagnostic('actors must be an array', ['actors']);
  }

  return validateSimulationSnapshot({
    ...document,
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    rulesVersion: SIMULATION_RULES_VERSION,
    actors: actors.map((actor) => migrateActorStateInput(actor)),
  });
}
