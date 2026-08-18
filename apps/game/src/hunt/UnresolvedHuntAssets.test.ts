import { describe, expect, it } from 'vitest';

import {
  HUNT_PACK_BLOOD_EFFECT_KEY,
  HUNT_PACK_COMBAT_KEYS,
  HUNT_PACK_DEAD_ROTWORM_KEY,
  HUNT_PACK_MAGIC_BLUE_EFFECT_KEY,
} from '../../../../packages/assets/src/index.ts';

import { createUnresolvedHuntAssetTracker } from './UnresolvedHuntAssets';

describe('createUnresolvedHuntAssetTracker', () => {
  it('diagnoses a missing decoration key once and keeps rendering without throwing', () => {
    const diagnostics: string[] = [];
    const tracker = createUnresolvedHuntAssetTracker({
      resolvedKeys: new Set([HUNT_PACK_MAGIC_BLUE_EFFECT_KEY]),
      onDiagnostic: (message) => diagnostics.push(message),
    });

    expect(() => {
      tracker.noteMissing(HUNT_PACK_DEAD_ROTWORM_KEY);
      tracker.noteMissing(HUNT_PACK_DEAD_ROTWORM_KEY);
      tracker.noteMissing(HUNT_PACK_MAGIC_BLUE_EFFECT_KEY);
    }).not.toThrow();

    expect(diagnostics).toEqual([
      `Hunt asset key is unresolved: ${HUNT_PACK_DEAD_ROTWORM_KEY}`,
    ]);
  });

  it('exposes unresolved combat keys in a stable sorted order', () => {
    const tracker = createUnresolvedHuntAssetTracker({
      resolvedKeys: new Set([HUNT_PACK_MAGIC_BLUE_EFFECT_KEY]),
      onDiagnostic: () => {},
    });

    tracker.noteMissing(HUNT_PACK_DEAD_ROTWORM_KEY);
    tracker.noteMissing(HUNT_PACK_BLOOD_EFFECT_KEY);
    const first = tracker.unresolvedCombatKeys();
    const second = tracker.unresolvedCombatKeys();

    expect(first).toEqual(
      [...HUNT_PACK_COMBAT_KEYS]
        .filter((key) => key !== HUNT_PACK_MAGIC_BLUE_EFFECT_KEY)
        .sort((left, right) => left.localeCompare(right)),
    );
    expect(second).toEqual(first);
    expect(first).toContain(HUNT_PACK_DEAD_ROTWORM_KEY);
    expect(first).toContain(HUNT_PACK_BLOOD_EFFECT_KEY);
    expect(first).not.toContain(HUNT_PACK_MAGIC_BLUE_EFFECT_KEY);
  });
});
