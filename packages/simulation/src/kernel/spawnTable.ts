import type {
  EntityId,
  GridPosition,
  KernelScenario,
  ScenarioSpawnSlot,
  SpawnSlotState,
} from '@huntbound/contracts';

/** A slot of the scenario table, with the live seat the kernel keeps for it. */
export interface SpawnSlotRuntime {
  readonly groupIndex: number;
  readonly slotIndex: number;
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
 * Builds the runtime table. `groupIndex` and `slotIndex` come from the
 * canonical `(z, y, x)` order of the group centres and of the slot cells, never
 * from the order the scenario document happens to list them in: two documents
 * with the same composition have to run identically.
 */
export function createSpawnTable(
  scenario: KernelScenario,
): readonly SpawnSlotRuntime[] {
  const groups = [...scenario.spawnGroups].sort((left, right) =>
    comparePositions(left.center, right.center),
  );

  return groups.flatMap((group, groupIndex) => {
    const cells = radiusCells(group.center, group.radius);
    const slots = [...group.slots].sort((left, right) =>
      comparePositions(left.position, right.position),
    );

    return slots.map(
      (slot: ScenarioSpawnSlot, slotIndex): SpawnSlotRuntime => ({
        groupIndex,
        slotIndex,
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
    groupIndex: slot.groupIndex,
    slotIndex: slot.slotIndex,
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
  const byKey = new Map(
    table.map((slot) => [`${slot.groupIndex}:${slot.slotIndex}`, slot]),
  );

  for (const state of states) {
    const slot = byKey.get(`${state.groupIndex}:${state.slotIndex}`);
    if (slot === undefined) {
      throw new RangeError(
        `Snapshot holds spawn slot (${state.groupIndex}, ${state.slotIndex}) that the scenario does not declare.`,
      );
    }
    slot.readyAtTick = state.readyAtTick;
    slot.entityId = state.entityId;
  }
}
