import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { HuntDefinition } from '../../packages/contracts/src/hunt/types.ts';
import { analyzeHuntTopology } from './topology.ts';

const hunt = JSON.parse(
  readFileSync(
    'packages/content/src/generated/hunts/venore-rotworm-cave/hunt.json',
    'utf8',
  ),
) as HuntDefinition;

describe('generated Venore Rotworm Cave hunt', () => {
  it('generates one connected component on each authored floor', () => {
    const report = analyzeHuntTopology(hunt);

    expect(report.diagnostics).toEqual([]);
    expect(
      report.floors.map(({ z, walkableTiles, componentCount }) => ({
        z,
        walkableTiles,
        componentCount,
      })),
    ).toEqual([
      { z: 8, walkableTiles: 104, componentCount: 1 },
      { z: 9, walkableTiles: 152, componentCount: 1 },
    ]);
  });

  it('keeps a two-way transition pair and all selected spawn slots', () => {
    expect(hunt.transitions.entries).toHaveLength(2);
    expect(hunt.transitions.entries[1]?.from).toEqual(
      hunt.transitions.entries[0]?.to,
    );
    expect(hunt.transitions.entries[1]?.to).toEqual(
      hunt.transitions.entries[0]?.from,
    );
    expect(hunt.spawns.groups.flatMap((group) => group.slots)).toHaveLength(12);
    expect(hunt.playerStart.z).toBe(8);
  });
});
