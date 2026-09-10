import type {
  FloorChange,
  TileFlags,
  TileFlagsTable,
} from '../../tile-flags/types.ts';
import { TILE_FLAGS_SCHEMA_VERSION } from '../../tile-flags/types.ts';

export interface TileFlagsOverrides {
  readonly ground?: boolean;
  readonly blocking?: boolean;
  readonly top?: boolean;
  readonly clip?: boolean;
  readonly bottom?: boolean;
  readonly unmove?: boolean;
  readonly avoid?: boolean;
  readonly elevation?: number;
  readonly floorChange?: FloorChange | null;
  readonly ladder?: boolean;
}

export function tileFlags(
  serverId: number,
  overrides: TileFlagsOverrides = {},
): TileFlags {
  return {
    serverId,
    ground: overrides.ground ?? false,
    blocking: overrides.blocking ?? false,
    top: overrides.top ?? false,
    clip: overrides.clip ?? false,
    bottom: overrides.bottom ?? false,
    unmove: overrides.unmove ?? false,
    avoid: overrides.avoid ?? false,
    elevation: overrides.elevation ?? 0,
    floorChange: overrides.floorChange ?? null,
    ladder: overrides.ladder ?? false,
  };
}

export function tileFlagsTable(entries: readonly TileFlags[]): TileFlagsTable {
  return {
    schemaVersion: TILE_FLAGS_SCHEMA_VERSION,
    sourceCommit: 'test-commit',
    appearancesSha256: 'test-appearances',
    itemsXmlSha256: 'test-items',
    entries: [...entries].sort((left, right) => left.serverId - right.serverId),
  };
}
