import type {
  ActorBlueprint,
  ActorState,
  EntityId,
  LootTableDefinition,
  TickIndex,
} from '@huntbound/contracts';

import type { EventJournal } from '../events/journal.ts';
import type { RandomSource } from '../random/source.ts';

function rollCount(
  stream: RandomSource,
  minCount: number,
  maxCount: number,
): number {
  if (minCount === maxCount) {
    return minCount;
  }
  return minCount + stream.nextBelow(maxCount - minCount + 1);
}

export function resolveLoot(
  journal: EventJournal,
  stream: RandomSource,
  tick: TickIndex,
  victim: Pick<ActorState, 'entityId' | 'blueprintId'>,
  killerEntityId: EntityId | null,
  blueprints: ReadonlyMap<string, ActorBlueprint>,
  lootTables: readonly LootTableDefinition[],
): void {
  if (killerEntityId === null || victim.blueprintId === 'player') {
    return;
  }

  const blueprint = blueprints.get(victim.blueprintId);
  if (blueprint === undefined || blueprint.lootTableIndex === null) {
    return;
  }

  const table = lootTables[blueprint.lootTableIndex];
  if (table === undefined) {
    return;
  }

  for (const entry of table.entries) {
    const chanceRoll = stream.nextBelow(100_000);
    if (chanceRoll >= entry.chancePerHundredThousand) {
      continue;
    }

    journal.emit(tick, {
      type: 'loot/granted',
      entityId: killerEntityId,
      sourceEntityId: victim.entityId,
      itemIndex: entry.itemIndex,
      count: rollCount(stream, entry.minCount, entry.maxCount),
    });
  }
}
