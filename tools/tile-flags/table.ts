/**
 * Joins `appearances.dat` flags with `items.xml` floorchanges into the
 * versioned, byte-reproducible tile-flags table.
 */

import { createHash } from 'node:crypto';

import { parseAppearanceFlags } from './appearances.ts';
import { readFloorChanges } from './floorChanges.ts';
import {
  TILE_FLAGS_SCHEMA_VERSION,
  type TileFlags,
  type TileFlagsTable,
} from './types.ts';

function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

export function buildTileFlagsTable(
  appearancesDat: Uint8Array,
  itemsXml: string,
  sourceCommit: string,
): TileFlagsTable {
  const appearances = parseAppearanceFlags(appearancesDat);
  const floorChanges = readFloorChanges(itemsXml);

  const known = new Set(appearances.map((entry) => entry.serverId));
  for (const serverId of floorChanges.keys()) {
    if (!known.has(serverId)) {
      throw new Error(
        `items.xml declares a floorchange for item ${serverId}, which is not present in appearances.dat`,
      );
    }
  }

  const entries: readonly TileFlags[] = appearances
    .map((entry) => ({
      ...entry,
      floorChange: floorChanges.get(entry.serverId) ?? null,
    }))
    .sort((left, right) => left.serverId - right.serverId);

  return {
    schemaVersion: TILE_FLAGS_SCHEMA_VERSION,
    sourceCommit,
    appearancesSha256: sha256(appearancesDat),
    // items.xml is ISO-8859-1; re-encoding the decoded string as latin1
    // reproduces the original bytes, so this hash matches the source lock.
    itemsXmlSha256: sha256(Buffer.from(itemsXml, 'latin1')),
    entries,
  };
}

function encodeEntry(entry: TileFlags): string {
  // Keys are written in alphabetical order by hand so the canonical form does
  // not depend on object construction order anywhere upstream.
  return JSON.stringify({
    avoid: entry.avoid,
    blocking: entry.blocking,
    bottom: entry.bottom,
    clip: entry.clip,
    elevation: entry.elevation,
    floorChange: entry.floorChange,
    ground: entry.ground,
    serverId: entry.serverId,
    top: entry.top,
    unmove: entry.unmove,
  });
}

export function encodeTileFlagsTable(table: TileFlagsTable): string {
  const entries = table.entries.map(encodeEntry).join(',');
  return `{"appearancesSha256":${JSON.stringify(table.appearancesSha256)},"entries":[${entries}],"itemsXmlSha256":${JSON.stringify(table.itemsXmlSha256)},"schemaVersion":${JSON.stringify(table.schemaVersion)},"sourceCommit":${JSON.stringify(table.sourceCommit)}}\n`;
}
