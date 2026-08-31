import { validateHuntDefinition } from '../../packages/contracts/src/hunt/diagnostics.ts';
import type {
  HuntDefinition,
  KernelBlueprint,
  MapRegion,
  SpawnGroupDefinition,
  SpawnTable,
  TransitionEntry,
} from '../../packages/contracts/src/hunt/types.ts';
import { HUNT_SCHEMA_VERSION } from '../../packages/contracts/src/hunt/types.ts';
import type { GridPosition } from '../../packages/contracts/src/simulation/types.ts';
import type { HuntSelection } from '../hunt-selection/types.ts';
import type { TileFlagsTable } from '../tile-flags/types.ts';
import { applyHuntLayout, type HuntLayoutRecipe } from './layout.ts';
import { readOtbmTiles } from './otbm.ts';
import { buildMapRegion, indexTileFlags } from './region.ts';
import { blueprintIdForCreature, buildSpawnTable } from './spawns.ts';
import {
  analyzeHuntTopology,
  reachableCells,
  walkableComponents,
} from './topology.ts';
import { buildTransitionTable } from './transitions.ts';
import type { ExtractionDiagnostic, ExtractionResult } from './types.ts';
import { diagnostic, sortDiagnostics } from './types.ts';

/**
 * Blueprint of the hunt's player actor.
 *
 * Step cadence reuses the values PB-03 already exercised: the player is
 * command-driven and therefore `inert`, and creatures wander. Combat stats on
 * these blueprints stay neutral until PB-05-07 composes the vocation kit.
 */
/**
 * Combat-neutral stats keep a movement-only actor valid under KernelScenario
 * v4. Real vocation, health and spells are composed in PB-05-07.
 */
function combatNeutralBlueprint(
  blueprintId: string,
  stepCooldownTicks: number,
  behavior: KernelBlueprint['behavior'],
): KernelBlueprint {
  return {
    blueprintId,
    stepCooldownTicks,
    behavior,
    factionId: 0,
    maxHealth: 1,
    maxResource: 0,
    healthRegenTicks: 0,
    healthRegenAmount: 0,
    resourceRegenTicks: 0,
    resourceRegenAmount: 0,
    attackCooldownTicks: 0,
    attackMinDamage: 0,
    attackMaxDamage: 0,
    attackRangeTiles: 1,
    aggroRadius: 0,
    lootTableIndex: null,
    abilityIndices: [],
  };
}

export const PLAYER_BLUEPRINT_ID = 'player';
/**
 * Steps are paced to read as walking rather than sliding: at 50 ms a tick these
 * are 500 ms per plain tile for the player, near a Tibia character without
 * haste, and 1 s for a rotworm, which is a slow creature.
 */
const PLAYER_STEP_COOLDOWN_TICKS = 10;
const CREATURE_STEP_COOLDOWN_TICKS = 20;

/** Frozen region budget from the PB-04 design spec. */
const MAX_FLOORS = 3;
const MAX_WIDTH = 96;
const MAX_HEIGHT = 96;

const HUNT_REVISION = 2;
const REGION_REVISION = 2;

/** `hunt:tibia:venore-rotworm-cave` addresses `region:tibia:...`. */
function regionIdFor(huntKey: string): string {
  const [, ...rest] = huntKey.split(':');
  return rest.length === 0 ? `region:${huntKey}` : `region:${rest.join(':')}`;
}

/**
 * Picks the player's starting cell.
 *
 * A layout recipe hands the start over; a raw OTBM box has to earn one. The box
 * is many disconnected places at once — fortress, field, ledge — and distance
 * to a spawn does not mean a path to it, so the rule is connectivity first:
 * the walkable component that holds the most spawn groups, then the floor of
 * that component holding the most of them, then the cell on that floor with the
 * shortest total walk to those groups. Ties break on canonical `(y, x)` order,
 * and a box without a single spawn group falls back to its first walkable cell.
 */
function pickPlayerStart(
  region: MapRegion,
  transitions: readonly TransitionEntry[],
  groups: readonly SpawnGroupDefinition[],
): GridPosition | undefined {
  const components = walkableComponents(region, transitions);
  if (components.length === 0) return undefined;

  const holdsCenter = (
    cells: readonly GridPosition[],
  ): ((group: SpawnGroupDefinition) => boolean) => {
    const reachable = new Set(
      cells.map((cell) => `${cell.z}:${cell.y * region.width + cell.x}`),
    );
    return (group) =>
      reachable.has(
        `${group.center.z}:${group.center.y * region.width + group.center.x}`,
      );
  };

  const hunt = components
    .map((cells) => ({ cells, groups: groups.filter(holdsCenter(cells)) }))
    .reduce((best, candidate) =>
      candidate.groups.length > best.groups.length ||
      (candidate.groups.length === best.groups.length &&
        candidate.cells.length > best.cells.length)
        ? candidate
        : best,
    );

  const floorOf = (z: number) => ({
    z,
    cells: hunt.cells.filter((cell) => cell.z === z),
    groups: hunt.groups.filter((group) => group.center.z === z),
  });
  const floor = [...new Set(hunt.cells.map((cell) => cell.z))]
    .map(floorOf)
    .reduce((best, candidate) =>
      candidate.groups.length > best.groups.length ||
      (candidate.groups.length === best.groups.length &&
        candidate.cells.length > best.cells.length)
        ? candidate
        : best,
    );

  const walkCost = (cell: GridPosition): number =>
    floor.groups.reduce(
      (total, group) =>
        total +
        Math.max(
          Math.abs(cell.x - group.center.x),
          Math.abs(cell.y - group.center.y),
        ),
      0,
    );

  return floor.cells.reduce((best, candidate) =>
    walkCost(candidate) < walkCost(best) ? candidate : best,
  );
}

/**
 * Drops the spawn groups the player cannot walk to.
 *
 * A raw box is cut out of a living map, so it carries seats the hunt has no
 * path to — the Orc Fortress rectangle holds the field outside its wall, and
 * the ramp up the mountain is not inside the cut. Those creatures are not
 * scenery: `S7` counts `maxLiveActors` over every live actor, so seats nobody
 * can reach hold the cap down and starve the seats inside the hunt.
 *
 * A seat survives if the player can stand where the creature will. When the
 * seat's own cell is blocked the kernel draws from the group radius instead,
 * so that pool decides for it.
 */
function keepReachableSpawns(
  table: SpawnTable,
  region: MapRegion,
  transitions: readonly TransitionEntry[],
  playerStart: GridPosition,
): {
  readonly table: SpawnTable;
  readonly diagnostics: readonly ExtractionDiagnostic[];
} {
  const reachable = reachableCells(region, transitions, playerStart);
  const isReachable = (position: GridPosition): boolean =>
    reachable.get(position.z)?.has(position.y * region.width + position.x) ===
    true;
  const isWalkable = (position: GridPosition): boolean => {
    const floor = region.floors.find((entry) => entry.z === position.z);
    if (floor === undefined) return false;
    if (
      position.x < 0 ||
      position.y < 0 ||
      position.x >= region.width ||
      position.y >= region.height
    ) {
      return false;
    }
    return !floor.collision.includes(position.y * region.width + position.x);
  };

  const diagnostics: ExtractionDiagnostic[] = [];
  const groups = table.groups.flatMap((group, groupIndex) => {
    const radiusReachable = (): boolean => {
      for (
        let y = group.center.y - group.radius;
        y <= group.center.y + group.radius;
        y += 1
      ) {
        for (
          let x = group.center.x - group.radius;
          x <= group.center.x + group.radius;
          x += 1
        ) {
          if (isReachable({ x, y, z: group.center.z })) return true;
        }
      }
      return false;
    };

    const slots = group.slots.filter((slot) => {
      const seat = {
        x: group.center.x + slot.offsetX,
        y: group.center.y + slot.offsetY,
        z: group.center.z + slot.offsetZ,
      };
      return isWalkable(seat) ? isReachable(seat) : radiusReachable();
    });

    if (slots.length === group.slots.length) return [{ ...group, slots }];

    diagnostics.push(
      diagnostic(
        `spawns.groups[${groupIndex}]`,
        'HUNT_SPAWN_DROPPED',
        `${group.slots.length - slots.length} of ${group.slots.length} seats at (${group.center.x}, ${group.center.y}, ${group.center.z}) are unreachable from the player start`,
      ),
    );
    return slots.length === 0 ? [] : [{ ...group, slots }];
  });

  return { table: { ...table, groups }, diagnostics };
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
  layout?: HuntLayoutRecipe,
): ExtractionResult {
  const bounds = {
    minX: selection.region.minX,
    minY: selection.region.minY,
    maxX: selection.region.maxX,
    maxY: selection.region.maxY,
    floors: selection.region.floors,
  };

  const tiles = readOtbmTiles(otbm, bounds);
  const authoredTiles =
    layout === undefined ? tiles : applyHuntLayout(tiles, layout);
  const regionBounds =
    layout === undefined
      ? bounds
      : {
          minX: 0,
          minY: 0,
          maxX: layout.width - 1,
          maxY: layout.height - 1,
          floors: layout.floors.map(({ z }) => z),
        };
  const built = buildMapRegion(
    authoredTiles,
    regionBounds,
    indexTileFlags(tileFlags),
    {
      regionId: regionIdFor(selection.key),
      regionRevision: REGION_REVISION,
    },
  );
  const transitions =
    layout === undefined
      ? buildTransitionTable(built.region, built.floorChanges, built.ladders)
      : {
          table: { entries: layout.transitions, dropped: 0 },
          diagnostics: [],
        };
  const spawns = buildSpawnTable(monsterXml, selection, built.region, layout);

  const player = combatNeutralBlueprint(
    PLAYER_BLUEPRINT_ID,
    PLAYER_STEP_COOLDOWN_TICKS,
    'inert',
  );
  const blueprints: KernelBlueprint[] = [
    player,
    ...spawns.creatureKeys.map(
      (key): KernelBlueprint =>
        combatNeutralBlueprint(
          blueprintIdForCreature(key),
          CREATURE_STEP_COOLDOWN_TICKS,
          'wander',
        ),
    ),
  ].sort((left, right) => left.blueprintId.localeCompare(right.blueprintId));

  const playerStart =
    layout?.playerStart ??
    pickPlayerStart(
      built.region,
      transitions.table.entries,
      spawns.table.groups,
    );
  // Only a raw box carries seats with no path to them: a layout recipe places
  // every group by hand inside the cut it authored.
  const reachableSpawns =
    layout === undefined && playerStart !== undefined
      ? keepReachableSpawns(
          spawns.table,
          built.region,
          transitions.table.entries,
          playerStart,
        )
      : { table: spawns.table, diagnostics: [] };

  const diagnostics: ExtractionDiagnostic[] = [
    ...built.diagnostics,
    ...transitions.diagnostics,
    ...spawns.diagnostics,
    ...reachableSpawns.diagnostics,
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
    spawns: reachableSpawns.table,
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

  if (layout !== undefined) {
    diagnostics.push(...analyzeHuntTopology(hunt).diagnostics);
  }

  return { hunt, diagnostics: sortDiagnostics(diagnostics) };
}
