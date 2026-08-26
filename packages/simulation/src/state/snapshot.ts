import type {
  ActorState,
  KernelScenario,
  PendingIntentState,
  RandomStreamState,
  SimulationCommandRecord,
  SimulationDiagnostic,
  SimulationSnapshot,
  SimulationValidationResult,
  SpawnSlotState,
} from '@huntbound/contracts';
import {
  compareSpawnSlotIds,
  SIMULATION_RULES_VERSION,
  SIMULATION_SCHEMA_VERSION,
  validateSimulationSnapshot,
} from '@huntbound/contracts';

import { createStaticGrid } from '../grid/staticGrid.ts';
import {
  createSimulationKernel,
  type SimulationKernel,
} from '../kernel/kernel.ts';
import { readKernelState } from './kernelState.ts';

function compareNumbers(left: number, right: number): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function byEntityId(left: ActorState, right: ActorState): number {
  return compareNumbers(left.entityId, right.entityId);
}

function byLabel(left: RandomStreamState, right: RandomStreamState): number {
  return compareText(left.label, right.label);
}

function byTickThenSequence(
  left: SimulationCommandRecord,
  right: SimulationCommandRecord,
): number {
  return (
    compareNumbers(left.tick, right.tick) ||
    compareNumbers(left.sequence, right.sequence)
  );
}

function byTickThenEntityId(
  left: PendingIntentState,
  right: PendingIntentState,
): number {
  return (
    compareNumbers(left.tick, right.tick) ||
    compareNumbers(left.entityId, right.entityId)
  );
}

function bySlotId(left: SpawnSlotState, right: SpawnSlotState): number {
  return compareSpawnSlotIds(left.slotId, right.slotId);
}

export function omitIdleForcedTarget(actor: ActorState): ActorState {
  if (
    actor.forcedTargetEntityId !== null ||
    actor.forcedTargetExpiresAtTick !== 0
  ) {
    return actor;
  }
  const {
    forcedTargetEntityId: _forcedTargetEntityId,
    forcedTargetExpiresAtTick: _forcedTargetExpiresAtTick,
    ...rest
  } = actor;
  return rest as ActorState;
}

/**
 * Serializable state of a live kernel, in the frozen field order-independent
 * shape. Terrain, occupancy and the scenario digest are deliberately absent:
 * they are reconstructed from the scenario document at restore time.
 */
export function snapshotKernel(kernel: SimulationKernel): SimulationSnapshot {
  const state = readKernelState(kernel);

  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    rulesVersion: SIMULATION_RULES_VERSION,
    scenarioId: state.scenarioId,
    scenarioRevision: state.scenarioRevision,
    seed: state.seed,
    tick: state.tick,
    nextEntityId: state.nextEntityId,
    nextEventSequence: state.nextEventSequence,
    nextCommandSequence: state.nextCommandSequence,
    randomStreams: [...state.randomStreams].sort(byLabel),
    actors: [...state.actors].sort(byEntityId).map(omitIdleForcedTarget),
    pendingCommands: [...state.pendingCommands].sort(byTickThenSequence),
    pendingIntents: [...state.pendingInternalIntents].sort(byTickThenEntityId),
    spawnSlots: [...state.spawnSlots].sort(bySlotId),
  };
}

function diagnostic(
  code: SimulationDiagnostic['code'],
  message: string,
  path: readonly (string | number)[],
): SimulationDiagnostic {
  return { code, message, path };
}

/**
 * Rebuilds a kernel from a snapshot against the scenario it was taken from.
 * The scenario is the authority for terrain and blueprints; the snapshot is the
 * authority for actors, RNG state, sequences and pending commands.
 */
export function restoreSimulationKernel(
  scenario: KernelScenario,
  snapshot: SimulationSnapshot,
): SimulationValidationResult<SimulationKernel> {
  const validated = validateSimulationSnapshot(snapshot);
  if (!validated.ok) {
    return validated;
  }

  const value = validated.value;
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
  if (value.scenarioId !== scenario.scenarioId) {
    diagnostics.push(
      diagnostic(
        'SIM_SCENARIO_MISMATCH',
        `Snapshot belongs to scenario ${value.scenarioId}, not ${scenario.scenarioId}`,
        ['scenarioId'],
      ),
    );
  }
  if (value.scenarioRevision !== scenario.scenarioRevision) {
    diagnostics.push(
      diagnostic(
        'SIM_SCENARIO_MISMATCH',
        `Snapshot belongs to scenario revision ${value.scenarioRevision}, not ${scenario.scenarioRevision}`,
        ['scenarioRevision'],
      ),
    );
  }

  // The snapshot schema cannot see the grid, so the cell a guard names is only
  // checkable once the scenario is in hand.
  const grid = createStaticGrid(scenario);
  const blueprints = new Map(
    scenario.blueprints.map((blueprint) => [blueprint.blueprintId, blueprint]),
  );
  value.actors.forEach((actor, index) => {
    const guard = actor.transitionGuard;
    if (guard !== null && !grid.isInside(guard)) {
      diagnostics.push(
        diagnostic(
          'SIM_SCHEMA_INVALID',
          `transitionGuard (${guard.x}, ${guard.y}, ${guard.z}) is outside the scenario grid`,
          ['actors', index, 'transitionGuard'],
        ),
      );
    }
    const blueprint = blueprints.get(actor.blueprintId);
    if (blueprint === undefined) {
      diagnostics.push(
        diagnostic(
          'SIM_SCHEMA_INVALID',
          `Unknown blueprint ${actor.blueprintId}`,
          ['actors', index, 'blueprintId'],
        ),
      );
      return;
    }
    if (actor.health > blueprint.maxHealth) {
      diagnostics.push(
        diagnostic(
          'SIM_SCHEMA_INVALID',
          `health ${actor.health} exceeds maxHealth ${blueprint.maxHealth}`,
          ['actors', index, 'health'],
        ),
      );
    }
    if (actor.resource > blueprint.maxResource) {
      diagnostics.push(
        diagnostic(
          'SIM_SCHEMA_INVALID',
          `resource ${actor.resource} exceeds maxResource ${blueprint.maxResource}`,
          ['actors', index, 'resource'],
        ),
      );
    }
    actor.abilityCooldowns.forEach((entry, cooldownIndex) => {
      if (!blueprint.abilityIndices.includes(entry.abilityIndex)) {
        diagnostics.push(
          diagnostic(
            'SIM_SCHEMA_INVALID',
            `abilityCooldowns index ${entry.abilityIndex} is not declared on the blueprint`,
            [
              'actors',
              index,
              'abilityCooldowns',
              cooldownIndex,
              'abilityIndex',
            ],
          ),
        );
      }
    });
  });

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics };
  }

  try {
    return {
      ok: true,
      value: createSimulationKernel(scenario, value.seed, {
        tick: value.tick,
        nextEntityId: value.nextEntityId,
        nextEventSequence: value.nextEventSequence,
        nextCommandSequence: value.nextCommandSequence,
        actors: value.actors,
        randomStreams: value.randomStreams,
        pendingCommands: value.pendingCommands,
        pendingIntents: value.pendingIntents,
        spawnSlots: value.spawnSlots,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          'SIM_SCHEMA_INVALID',
          error instanceof Error ? error.message : String(error),
          [],
        ),
      ],
    };
  }
}
