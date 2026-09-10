/**
 * Canary's authoritative floorchange vocabulary.
 *
 * Mirrors `TileStatesMap` in
 * `references/canary/src/items/functions/item/item_parse.hpp`. `southalt` and
 * `eastalt` are distinct tile states in Canary, not aliases of `south`/`east`,
 * and there is no `up` value anywhere in the engine.
 */
export const FLOOR_CHANGE_VALUES = [
  'down',
  'east',
  'eastalt',
  'north',
  'south',
  'southalt',
  'west',
] as const;

export type FloorChange = (typeof FLOOR_CHANGE_VALUES)[number];

export interface TileFlags {
  readonly serverId: number;
  readonly ground: boolean;
  readonly blocking: boolean;
  readonly top: boolean;
  readonly clip: boolean;
  readonly bottom: boolean;
  readonly unmove: boolean;
  readonly avoid: boolean;
  readonly elevation: number;
  readonly floorChange: FloorChange | null;
  /**
   * `type="ladder"` in `items.xml`. Canary climbs it by action, not by
   * floorchange, so it is a separate flag rather than a floorchange value —
   * the engine's vocabulary has no `up`.
   */
  readonly ladder: boolean;
}

export interface TileFlagsTable {
  readonly schemaVersion: number;
  readonly sourceCommit: string;
  readonly appearancesSha256: string;
  readonly itemsXmlSha256: string;
  readonly entries: readonly TileFlags[];
}

export const TILE_FLAGS_SCHEMA_VERSION = 2;

export function isFloorChange(value: string): value is FloorChange {
  return (FLOOR_CHANGE_VALUES as readonly string[]).includes(value);
}
