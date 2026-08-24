import { describe, expect, it } from 'vitest';

import {
  encodeMaterialBordersTable,
  MATERIAL_BORDERS_SCHEMA_VERSION,
} from './table.ts';
import type { MaterialBordersTable } from './types.ts';

function table(): MaterialBordersTable {
  return {
    materials: [
      {
        ambiguities: [],
        cases: [{ count: 2, serverId: 101, signature: 3 }],
        coverage: {
          minimumOccurrence: 2,
          observedCases: 1,
          sampledTiles: 2,
          totalCases: 256,
        },
        key: 'earth',
        serverIds: [101],
      },
    ],
    schemaVersion: MATERIAL_BORDERS_SCHEMA_VERSION,
    sourcePath: 'data-otservbr-global/world/otservbr.otbm',
    windows: [
      {
        floors: [7],
        maxX: 10,
        maxY: 20,
        minX: 0,
        minY: 0,
        reason: 'synthetic serialization fixture',
      },
    ],
  };
}

describe('encodeMaterialBordersTable', () => {
  it('emits canonical one-line JSON with one trailing newline', () => {
    const encoded = encodeMaterialBordersTable(table());

    expect(encoded.endsWith('}\n')).toBe(true);
    expect(encoded.endsWith('}\n\n')).toBe(false);
    expect(encoded).not.toMatch(/\n[ \t]/);
    expect(encoded.slice(0, -1)).not.toContain('\n');
    expect(Object.keys(JSON.parse(encoded) as object)).toEqual([
      'materials',
      'schemaVersion',
      'sourcePath',
      'windows',
    ]);
  });

  it('is byte-identical for independent objects with the same values', () => {
    const first = encodeMaterialBordersTable(table());
    const second = encodeMaterialBordersTable(
      JSON.parse(JSON.stringify(table())) as MaterialBordersTable,
    );

    expect(first).toBe(second);
  });
});
