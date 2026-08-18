import { HUNT_PACK_COMBAT_KEYS } from '../../../../packages/assets/src/index.ts';

export function unresolvedHuntAssetMessage(key: string): string {
  return `Hunt asset key is unresolved: ${key}`;
}

export function createUnresolvedHuntAssetTracker(options: {
  readonly resolvedKeys: ReadonlySet<string>;
  readonly combatKeys?: readonly string[];
  readonly onDiagnostic: (message: string) => void;
}): {
  noteMissing(key: string | undefined): void;
  unresolvedCombatKeys(): readonly string[];
} {
  const reported = new Set<string>();
  const combatKeys = options.combatKeys ?? HUNT_PACK_COMBAT_KEYS;

  return {
    noteMissing: (key) => {
      if (key === undefined || options.resolvedKeys.has(key)) return;
      if (reported.has(key)) return;
      reported.add(key);
      options.onDiagnostic(unresolvedHuntAssetMessage(key));
    },
    unresolvedCombatKeys: () =>
      Object.freeze(
        [...combatKeys]
          .filter((key) => !options.resolvedKeys.has(key))
          .sort((left, right) => left.localeCompare(right)),
      ),
  };
}
