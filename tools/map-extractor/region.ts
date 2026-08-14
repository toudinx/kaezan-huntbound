import type {
  MapRegion,
  MapRegionFloor,
} from '../../packages/contracts/src/hunt/types.ts';
import { HUNT_SCHEMA_VERSION } from '../../packages/contracts/src/hunt/types.ts';
import type {
  FloorChange,
  TileFlags,
  TileFlagsTable,
} from '../tile-flags/types.ts';
import type { OtbmTile } from './otbm.ts';
import type { ExtractionDiagnostic } from './types.ts';
import { diagnostic } from './types.ts';

/**
 * Palette entry for a cell with no ground item.
 *
 * `ground` is dense and every entry must be a valid palette index, and the
 * contract forbids a negative sentinel. `0` is not a real Tibia item id, so it
 * is the only value that can encode "void" without claiming a real tile. It
 * only enters the palette when the region actually has a void cell.
 */
export const VOID_SERVER_ID = 0;

export interface RegionBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly floors: readonly number[];
}

export interface RegionIdentity {
  readonly regionId: string;
  readonly regionRevision: number;
}

/** `z` → local cell index → floor change values declared on that cell. */
export type FloorChangeCells = ReadonlyMap<
  number,
  ReadonlyMap<number, ReadonlySet<FloorChange>>
>;

export interface MapRegionBuild {
  readonly region: MapRegion;
  readonly diagnostics: readonly ExtractionDiagnostic[];
  readonly floorChanges: FloorChangeCells;
}

export function indexTileFlags(
  table: TileFlagsTable,
): ReadonlyMap<number, TileFlags> {
  return new Map(table.entries.map((entry) => [entry.serverId, entry]));
}

interface CellPlan {
  readonly ground: number | undefined;
  readonly below: readonly number[];
  readonly above: readonly number[];
  readonly blocking: boolean;
  readonly floorChanges: ReadonlySet<FloorChange>;
}

/**
 * Classifies the items of one tile.
 *
 * The first item flagged `ground` becomes the ground; `top` items go above the
 * actor and everything else stays below, both preserving the OTBM stacking
 * order. Collision is exactly `blocking` on any item, the ground included.
 */
function planCell(
  items: readonly number[],
  flags: ReadonlyMap<number, TileFlags>,
  path: string,
  diagnostics: ExtractionDiagnostic[],
): CellPlan {
  const resolved: TileFlags[] = [];
  items.forEach((serverId, index) => {
    const entry = flags.get(serverId);
    if (entry === undefined) {
      diagnostics.push(
        diagnostic(
          `${path}.items[${index}]`,
          'HUNT_ID_MISMATCH',
          `serverId ${serverId} is absent from the tile flags table`,
        ),
      );
      return;
    }
    resolved.push(entry);
  });

  const groundAt = resolved.findIndex((entry) => entry.ground);
  if (groundAt < 0) {
    return {
      ground: undefined,
      below: [],
      above: [],
      blocking: true,
      floorChanges: new Set(),
    };
  }

  const below: number[] = [];
  const above: number[] = [];
  const floorChanges = new Set<FloorChange>();
  let blocking = false;

  resolved.forEach((entry, index) => {
    if (entry.blocking) blocking = true;
    if (entry.floorChange !== null) floorChanges.add(entry.floorChange);
    if (index === groundAt) return;
    (entry.top ? above : below).push(entry.serverId);
  });

  return {
    ground: (resolved[groundAt] as TileFlags).serverId,
    below,
    above,
    blocking,
    floorChanges,
  };
}

/**
 * Builds the frozen `MapRegion` from the tiles that survived the bounding box.
 *
 * Local coordinates have their origin at `(bounds.minX, bounds.minY)` and each
 * floor is indexed row-major by `y * width + x`.
 */
export function buildMapRegion(
  tiles: readonly OtbmTile[],
  bounds: RegionBounds,
  flags: ReadonlyMap<number, TileFlags>,
  identity: RegionIdentity,
): MapRegionBuild {
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const cellCount = width * height;
  const floorsZ = [...bounds.floors].sort((left, right) => left - right);
  const diagnostics: ExtractionDiagnostic[] = [];

  const byFloor = new Map<number, Map<number, OtbmTile>>(
    floorsZ.map((z) => [z, new Map()]),
  );
  for (const tile of tiles) {
    const cells = byFloor.get(tile.z);
    if (cells === undefined) continue;
    const index = (tile.y - bounds.minY) * width + (tile.x - bounds.minX);
    cells.set(index, tile);
  }

  const usedServerIds = new Set<number>();
  const plans = new Map<number, Map<number, CellPlan>>();

  for (const z of floorsZ) {
    const cells = byFloor.get(z) as Map<number, OtbmTile>;
    const floorPlans = new Map<number, CellPlan>();
    plans.set(z, floorPlans);

    for (let index = 0; index < cellCount; index += 1) {
      const path = `region.floors[${z}].cells[${index}]`;
      const plan = planCell(
        cells.get(index)?.items ?? [],
        flags,
        path,
        diagnostics,
      );
      floorPlans.set(index, plan);

      if (plan.ground === undefined) {
        usedServerIds.add(VOID_SERVER_ID);
        diagnostics.push(
          diagnostic(
            path,
            'HUNT_EMPTY_TILE',
            'Cell has no ground item and is extracted as void collision',
          ),
        );
        continue;
      }
      usedServerIds.add(plan.ground);
      for (const serverId of plan.below) usedServerIds.add(serverId);
      for (const serverId of plan.above) usedServerIds.add(serverId);
    }
  }

  const palette = [...usedServerIds].sort((left, right) => left - right);
  const paletteIndex = new Map(palette.map((value, index) => [value, index]));
  const indexOf = (serverId: number) => paletteIndex.get(serverId) as number;

  const floors: MapRegionFloor[] = [];
  const floorChanges = new Map<number, Map<number, ReadonlySet<FloorChange>>>();

  for (const z of floorsZ) {
    const floorPlans = plans.get(z) as Map<number, CellPlan>;
    const ground: number[] = [];
    const objectsBelow: { i: number; stack: number[] }[] = [];
    const objectsAbove: { i: number; stack: number[] }[] = [];
    const collision: number[] = [];
    const changes = new Map<number, ReadonlySet<FloorChange>>();

    for (let index = 0; index < cellCount; index += 1) {
      const plan = floorPlans.get(index) as CellPlan;
      ground.push(indexOf(plan.ground ?? VOID_SERVER_ID));
      if (plan.blocking) collision.push(index);
      if (plan.below.length > 0) {
        objectsBelow.push({ i: index, stack: plan.below.map(indexOf) });
      }
      if (plan.above.length > 0) {
        objectsAbove.push({ i: index, stack: plan.above.map(indexOf) });
      }
      if (plan.floorChanges.size > 0) {
        changes.set(index, plan.floorChanges);
      }
    }

    floors.push({ z, ground, objectsBelow, objectsAbove, collision });
    floorChanges.set(z, changes);
  }

  return {
    region: {
      schemaVersion: HUNT_SCHEMA_VERSION,
      regionId: identity.regionId as MapRegion['regionId'],
      regionRevision: identity.regionRevision,
      origin: { x: bounds.minX, y: bounds.minY },
      width,
      height,
      palette,
      floors,
    },
    diagnostics,
    floorChanges,
  };
}
