import {
  type HuntDefinition,
  type KernelScenario,
  type Seed,
  SIMULATION_SCHEMA_VERSION,
  type SimulationValidationResult,
  validateHuntDefinition,
  validateKernelScenario,
} from '@huntbound/contracts';

function scenarioForHunt(hunt: HuntDefinition): KernelScenario {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    scenarioId: `scenario:${hunt.huntId}`,
    scenarioRevision: hunt.huntRevision,
    width: hunt.region.width,
    height: hunt.region.height,
    floors: hunt.region.floors.map((floor) => ({
      z: floor.z,
      blockedTiles: floor.collision.map(
        (index) =>
          [
            index % hunt.region.width,
            Math.floor(index / hunt.region.width),
          ] as const,
      ),
    })),
    transitions: hunt.transitions.entries.map(({ from, to }) => ({ from, to })),
    spawnGroups: hunt.spawns.groups.map((group) => ({
      center: group.center,
      radius: group.radius,
      slots: group.slots.map((slot) => ({
        blueprintId: slot.blueprintId,
        position: {
          x: group.center.x + slot.offsetX,
          y: group.center.y + slot.offsetY,
          z: group.center.z + slot.offsetZ,
        },
        respawnTicks: slot.respawnTicks,
      })),
    })),
    maxLiveActors: hunt.spawns.maxLiveActors,
    abilities: [],
    lootTables: [],
    blueprints: hunt.blueprints.map((blueprint) => ({ ...blueprint })),
    initialActors: [
      {
        blueprintId: hunt.playerBlueprintId,
        position: hunt.playerStart,
        facing: 's',
      },
    ],
  };
}

export function buildHuntScenario(
  hunt: HuntDefinition,
  seed: Seed,
): SimulationValidationResult<KernelScenario> {
  void seed;

  const validatedHunt = validateHuntDefinition(hunt);
  if (!validatedHunt.ok) {
    return validatedHunt;
  }

  return validateKernelScenario(scenarioForHunt(validatedHunt.value));
}
