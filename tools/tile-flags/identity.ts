/**
 * Proves the identity hypothesis the whole hunt pipeline rests on: an item's
 * server id is the same number as its client id, so PB-02 can resolve assets
 * by `clientId` without a translation table.
 *
 * The snapshot ships no `items.otb`, so no translation table exists; identity
 * is therefore the only mapping available. What this module checks is that the
 * ids the pipeline actually depends on do resolve, and it records how much of
 * `items.xml` resolves overall.
 */

import { readAppearanceIds } from './appearances.ts';
import { scanItems } from './items.ts';

export type IdentityKind =
  | 'clientId'
  | 'lookType'
  | 'effectId'
  | 'missileId'
  | 'floorchange';

export interface RequiredIdentity {
  readonly key: string;
  readonly kind: Exclude<IdentityKind, 'floorchange'>;
  readonly id: number;
}

export interface IdentityDiagnostic {
  readonly code: 'HUNT_ID_MISMATCH';
  readonly kind: IdentityKind;
  readonly serverId: number;
  readonly key: string;
  readonly found: string;
}

export interface IdentityReport {
  readonly ok: boolean;
  readonly appearanceObjectCount: number;
  readonly itemsXmlIdCount: number;
  readonly resolvedCount: number;
  readonly absentReservedCount: number;
  readonly absentNamedCount: number;
  readonly floorChangeIdCount: number;
  readonly diagnostics: readonly IdentityDiagnostic[];
}

const RESERVED_NAME = /reserved sprite/i;

const COLLECTION_OF: Record<
  Exclude<IdentityKind, 'floorchange'>,
  'object' | 'outfit' | 'effect' | 'missile'
> = {
  clientId: 'object',
  lookType: 'outfit',
  effectId: 'effect',
  missileId: 'missile',
};

export function verifyItemIdentity(
  appearancesDat: Uint8Array,
  itemsXml: string,
  required: readonly RequiredIdentity[],
): IdentityReport {
  const appearanceIds = readAppearanceIds(appearancesDat);
  const rows = scanItems(itemsXml);
  const diagnostics: IdentityDiagnostic[] = [];

  for (const identity of required) {
    const collection = COLLECTION_OF[identity.kind];
    if (!appearanceIds[collection].has(identity.id)) {
      diagnostics.push({
        code: 'HUNT_ID_MISMATCH',
        kind: identity.kind,
        serverId: identity.id,
        key: identity.key,
        found: `absent from appearances.${collection}`,
      });
    }
  }

  let resolvedCount = 0;
  let absentReservedCount = 0;
  let absentNamedCount = 0;
  let floorChangeIdCount = 0;
  const seen = new Set<number>();

  for (const row of rows) {
    for (const id of row.ids) {
      if (seen.has(id)) continue;
      seen.add(id);

      const present = appearanceIds.object.has(id);
      if (row.floorChange !== undefined) {
        floorChangeIdCount += 1;
        if (!present) {
          diagnostics.push({
            code: 'HUNT_ID_MISMATCH',
            kind: 'floorchange',
            serverId: id,
            key: row.name,
            found: 'absent from appearances.object',
          });
        }
      }

      if (present) resolvedCount += 1;
      else if (RESERVED_NAME.test(row.name)) absentReservedCount += 1;
      else absentNamedCount += 1;
    }
  }

  diagnostics.sort((left, right) => left.serverId - right.serverId);

  return {
    ok: diagnostics.length === 0,
    appearanceObjectCount: appearanceIds.object.size,
    itemsXmlIdCount: seen.size,
    resolvedCount,
    absentReservedCount,
    absentNamedCount,
    floorChangeIdCount,
    diagnostics,
  };
}
