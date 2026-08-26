import type {
  EntityId,
  GridPosition,
  KernelScenario,
  ScenarioSpawnSlot,
  SpawnSlotState,
} from '@huntbound/contracts';
import { formatSpawnSlotId } from '@huntbound/contracts';

/** A slot of the scenario table, with the live seat the kernel keeps for it. */
export interface SpawnSlotRuntime {
  readonly slotId: string;
  readonly blueprintId: string;
  readonly position: GridPosition;
  readonly respawnTicks: number;
  /** Row-major candidate cells of the group radius, the fallback draw pool. */
  readonly radiusCells: readonly GridPosition[];
  readyAtTick: number;
  entityId: EntityId | null;
}

function comparePositions(left: GridPosition, right: GridPosition): number {
  if (left.z !== right.z) return left.z < right.z ? -1 : 1;
  if (left.y !== right.y) return left.y < right.y ? -1 : 1;
  if (left.x !== right.x) return left.x < right.x ? -1 : 1;
  return 0;
}

function radiusCells(
  center: GridPosition,
  radius: number,
): readonly GridPosition[] {
  const cells: GridPosition[] = [];
  for (let y = center.y - radius; y <= center.y + radius; y += 1) {
    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      cells.push({ x, y, z: center.z });
    }
  }
  return cells;
}

/**
 * Builds the runtime table. Walk order stays the target `(z, y, x)` of group
 * centres then slot cells, so S7 appearance and spawn-stream draws do not
 * move when identity changes. `slotId` is the Canary source key, or the
 * synthetic `(position, centre)` stand-in when a test scenario omits it.
 */
export function createSpawnTable(
  scenario: KernelScenario,
): readonly SpawnSlotRuntime[] {
  const groups = [...scenario.spawnGroups].sort((left, right) =>
    comparePositions(left.center, right.center),
  );

  return groups.flatMap((group) => {
    const cells = radiusCells(group.center, group.radius);
    const slots = [...group.slots].sort((left, right) =>
      comparePositions(left.position, right.position),
    );

    return slots.map(
      (slot: ScenarioSpawnSlot): SpawnSlotRuntime => ({
        slotId: slot.slotId ?? formatSpawnSlotId(slot.position, group.center),
        blueprintId: slot.blueprintId,
        position: slot.position,
        respawnTicks: slot.respawnTicks,
        radiusCells: cells,
        readyAtTick: 0,
        entityId: null,
      }),
    );
  });
}

export function serializeSpawnTable(
  table: readonly SpawnSlotRuntime[],
): readonly SpawnSlotState[] {
  return table.map((slot) => ({
    slotId: slot.slotId,
    readyAtTick: slot.readyAtTick,
    entityId: slot.entityId,
  }));
}

/**
 * Applies a restored schedule onto a freshly built table. The scenario is the
 * authority for where a slot is; the snapshot is the authority for when it is
 * due and who is sitting in it.
 */
export function restoreSpawnTable(
  table: readonly SpawnSlotRuntime[],
  states: readonly SpawnSlotState[],
): void {
  const byKey = new Map(table.map((slot) => [slot.slotId, slot]));

  for (const state of states) {
    const slot = byKey.get(state.slotId);
    if (slot === undefined) {
      throw new RangeError(
        `Snapshot holds spawn slot ${state.slotId} that the scenario does not declare.`,
      );
    }
    slot.readyAtTick = state.readyAtTick;
    slot.entityId = state.entityId;
  }
}
