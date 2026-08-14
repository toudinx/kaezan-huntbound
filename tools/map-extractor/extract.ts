import { validateHuntDefinition } from '../../packages/contracts/src/hunt/diagnostics.ts';
import type {
  HuntDefinition,
  KernelBlueprint,
  MapRegion,
} from '../../packages/contracts/src/hunt/types.ts';
import { HUNT_SCHEMA_VERSION } from '../../packages/contracts/src/hunt/types.ts';
import type { GridPosition } from '../../packages/contracts/src/simulation/types.ts';
import type { HuntSelection } from '../hunt-selection/types.ts';
import type { TileFlagsTable } from '../tile-flags/types.ts';
import { readOtbmTiles } from './otbm.ts';
import { buildMapRegion, indexTileFlags } from './region.ts';
import { blueprintIdForCreature, buildSpawnTable } from './spawns.ts';
import { buildTransitionTable } from './transitions.ts';
import type { ExtractionDiagnostic, ExtractionResult } from './types.ts';
import { diagnostic, sortDiagnostics } from './types.ts';

/**
 * Blueprint of the hunt's player actor.
 *
 * PB-04 has no combat, so a blueprint is only an id, a behavior and a step
 * cooldown. The values reuse the ones PB-03 already exercised in
 * `packages/test-fixtures/simulation/pb03`: the player is command-driven and
 * therefore `inert`, and creatures wander. Deriving them from creature stats
 * belongs to combat, which is PB-05.
 */
export const PLAYER_BLUEPRINT_ID = 'player';
const PLAYER_STEP_COOLDOWN_TICKS = 2;
const CREATURE_STEP_COOLDOWN_TICKS = 3;

/** Frozen region budget from the PB-04 design spec. */
const MAX_FLOORS = 3;
const MAX_WIDTH = 96;
const MAX_HEIGHT = 96;

const HUNT_REVISION = 1;
const REGION_REVISION = 1;

/** `hunt:tibia:venore-rotworm-cave` addresses `region:tibia:...`. */
function regionIdFor(huntKey: string): string {
  const [, ...rest] = huntKey.split(':');
  return rest.length === 0 ? `region:${huntKey}` : `region:${rest.join(':')}`;
}

/**
 * Picks the player's starting cell.
 *
 * The rule is deterministic and keeps the start reachable from the hunt: the
 * walkable cell nearest to the first spawn group's center on that group's
 * floor, ties broken by `(y, x)`. Without spawn groups it falls back to the
 * first walkable cell in canonical order.
 */
function pickPlayerStart(
  region: MapRegion,
  anchor: GridPosition | undefined,
): GridPosition | undefined {
  const floors =
    anchor === undefined
      ? region.floors
      : [
          ...region.floors.filter((floor) => floor.z === anchor.z),
          ...region.floors.filter((floor) => floor.z !== anchor.z),
        ];

  for (const floor of floors) {
    const blocked = new Set(floor.collision);
    let best: GridPosition | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < floor.ground.length; index += 1) {
      if (blocked.has(index)) continue;
      const candidate: GridPosition = {
        x: index % region.width,
        y: Math.floor(index / region.width),
        z: floor.z,
      };
      if (anchor === undefined) return candidate;
      const distance = Math.max(
        Math.abs(candidate.x - anchor.x),
        Math.abs(candidate.y - anchor.y),
      );
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }

    if (best !== undefined) return best;
  }

  return undefined;
}

function budgetDiagnostics(region: MapRegion): readonly ExtractionDiagnostic[] {
  const out: ExtractionDiagnostic[] = [];
  if (region.width > MAX_WIDTH) {
    out.push(
      diagnostic(
        'region.width',
        'HUNT_REGION_OUT_OF_BUDGET',
        `Region width ${region.width} exceeds the ${MAX_WIDTH}-tile budget`,
      ),
    );
  }
  if (region.height > MAX_HEIGHT) {
    out.push(
      diagnostic(
        'region.height',
        'HUNT_REGION_OUT_OF_BUDGET',
        `Region height ${region.height} exceeds the ${MAX_HEIGHT}-tile budget`,
      ),
    );
  }
  if (region.floors.length > MAX_FLOORS) {
    out.push(
      diagnostic(
        'region.floors',
        'HUNT_REGION_OUT_OF_BUDGET',
        `Region has ${region.floors.length} floors, exceeding the ${MAX_FLOORS}-floor budget`,
      ),
    );
  }
  return out;
}

/**
 * Converts the frozen OTBM region into a validated `HuntDefinition`.
 *
 * Nothing here touches the kernel, the assets, the scene or the input: the
 * result is data, produced offline and reproducible byte for byte from the same
 * snapshot.
 */
export function extractHunt(
  otbm: Uint8Array,
  monsterXml: string,
  tileFlags: TileFlagsTable,
  selection: HuntSelection,
): ExtractionResult {
  const bounds = {
    minX: selection.region.minX,
    minY: selection.region.minY,
    maxX: selection.region.maxX,
    maxY: selection.region.maxY,
    floors: selection.region.floors,
  };

  const tiles = readOtbmTiles(otbm, bounds);
  const built = buildMapRegion(tiles, bounds, indexTileFlags(tileFlags), {
    regionId: regionIdFor(selection.key),
    regionRevision: REGION_REVISION,
  });
  const transitions = buildTransitionTable(built.region, built.floorChanges);
  const spawns = buildSpawnTable(monsterXml, selection, built.region);

  const player: KernelBlueprint = {
    blueprintId: PLAYER_BLUEPRINT_ID,
    stepCooldownTicks: PLAYER_STEP_COOLDOWN_TICKS,
    behavior: 'inert',
  };
  const blueprints: KernelBlueprint[] = [
    player,
    ...spawns.creatureKeys.map(
      (key): KernelBlueprint => ({
        blueprintId: blueprintIdForCreature(key),
        stepCooldownTicks: CREATURE_STEP_COOLDOWN_TICKS,
        behavior: 'wander',
      }),
    ),
  ].sort((left, right) => left.blueprintId.localeCompare(right.blueprintId));

  const playerStart = pickPlayerStart(
    built.region,
    spawns.table.groups[0]?.center,
  );
  const diagnostics: ExtractionDiagnostic[] = [
    ...built.diagnostics,
    ...transitions.diagnostics,
    ...spawns.diagnostics,
    ...budgetDiagnostics(built.region),
  ];

  if (playerStart === undefined) {
    diagnostics.push(
      diagnostic(
        'playerStart',
        'HUNT_SCHEMA_INVALID',
        'Region has no walkable cell to start the player on',
      ),
    );
  }

  const hunt: HuntDefinition = {
    schemaVersion: HUNT_SCHEMA_VERSION,
    huntId: selection.key as HuntDefinition['huntId'],
    huntRevision: HUNT_REVISION,
    region: built.region,
    transitions: transitions.table,
    spawns: spawns.table,
    blueprints,
    playerStart: playerStart ?? {
      x: 0,
      y: 0,
      z: built.region.floors[0]?.z ?? 0,
    },
    playerBlueprintId: PLAYER_BLUEPRINT_ID,
  };

  // A schema failure is a failure of the extraction, never a reason to loosen
  // the contract.
  const validation = validateHuntDefinition(hunt);
  if (!validation.ok) {
    diagnostics.push(
      ...validation.diagnostics.map((item) =>
        diagnostic(
          `hunt.${item.path.join('.')}`,
          'HUNT_SCHEMA_INVALID',
          item.message,
        ),
      ),
    );
  }

  return { hunt, diagnostics: sortDiagnostics(diagnostics) };
}
