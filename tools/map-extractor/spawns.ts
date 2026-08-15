import { parseXmlRoot } from '../../packages/content/src/importers/canary/xml/xmlDiagnostics.ts';
import {
  asXmlElements,
  xmlAttribute,
} from '../../packages/content/src/importers/canary/xml/xmlTypes.ts';
import type {
  MapRegion,
  SpawnGroupDefinition,
  SpawnSlotDefinition,
  SpawnTable,
} from '../../packages/contracts/src/hunt/types.ts';
import type { HuntSelection } from '../hunt-selection/types.ts';
import { convertSpawntimeToTicks } from '../hunt-selection/validateHuntSelection.ts';
import type { HuntLayoutRecipe } from './layout.ts';
import type { ExtractionDiagnostic } from './types.ts';
import { diagnostic } from './types.ts';

/** Frozen ceiling of simultaneously live actors from the region budget. */
export const MAX_LIVE_ACTORS = 64;

export interface SpawnTableBuild {
  readonly table: SpawnTable;
  /** Catalog keys the hunt needs a blueprint for, in first-use order. */
  readonly creatureKeys: readonly string[];
  readonly diagnostics: readonly ExtractionDiagnostic[];
}

type UnknownRecord = Record<string, unknown>;

function normalizeCreatureName(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase();
}

/** `creature:tibia:rotworm` becomes the kebab-case blueprint id `rotworm`. */
export function blueprintIdForCreature(creatureKey: string): string {
  return (creatureKey.split(':').at(-1) ?? creatureKey)
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

function attributeInteger(
  element: UnknownRecord,
  name: string,
): number | undefined {
  const value = xmlAttribute(element, name);
  if (typeof value !== 'string' || !/^-?\d+$/.test(value.trim())) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

interface CandidateGroup {
  readonly centerX: number;
  readonly centerY: number;
  readonly centerZ: number;
  readonly radius: number;
  readonly element: UnknownRecord;
}

/**
 * Builds the spawn table in region-local coordinates.
 *
 * A group enters the table when its center is inside the extracted region, and
 * each of its slots survives only when its absolute position is inside too.
 * Creatures listed in `excludedCreatures` are omitted silently; any other
 * creature outside the selection is a diagnostic, never a silent import.
 */
export function buildSpawnTable(
  monsterXml: string,
  selection: HuntSelection,
  region: MapRegion,
  layout?: HuntLayoutRecipe,
): SpawnTableBuild {
  const parsed = parseXmlRoot(monsterXml, 'monsters', ['monster']);
  if (!parsed.ok) {
    throw new Error(
      `Spawn XML is not readable: ${parsed.diagnostics.map((item) => item.message).join('; ')}`,
    );
  }

  const floors = new Set(region.floors.map((floor) => floor.z));
  const sourceRegion = layout === undefined ? region : selection.region;
  const sourceFloors = new Set(sourceRegion.floors);
  const keyByName = new Map(
    selection.creatures.flatMap((key) => {
      const name = key.split(':').at(-1);
      return name === undefined
        ? []
        : [[normalizeCreatureName(name), key] as const];
    }),
  );
  const excluded = new Set(
    selection.excludedCreatures.map((entry) =>
      normalizeCreatureName(entry.name),
    ),
  );

  const insideRegion = (x: number, y: number, z: number) =>
    x >= (layout === undefined ? region.origin.x : sourceRegion.minX) &&
    x <=
      (layout === undefined
        ? region.origin.x + region.width - 1
        : sourceRegion.maxX) &&
    y >= (layout === undefined ? region.origin.y : sourceRegion.minY) &&
    y <=
      (layout === undefined
        ? region.origin.y + region.height - 1
        : sourceRegion.maxY) &&
    (layout === undefined ? floors.has(z) : sourceFloors.has(z));

  const placementBySource = new Map(
    (layout?.spawnPlacements ?? []).map((placement) => [
      `${placement.source.x}:${placement.source.y}:${placement.source.z}`,
      placement.target,
    ]),
  );

  const outputContains = (position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }) =>
    position.x >= 0 &&
    position.x < region.width &&
    position.y >= 0 &&
    position.y < region.height &&
    floors.has(position.z);

  const candidates: CandidateGroup[] = [];
  for (const element of asXmlElements(parsed.root.monster)) {
    const centerX = attributeInteger(element, 'centerx');
    const centerY = attributeInteger(element, 'centery');
    const centerZ = attributeInteger(element, 'centerz');
    const radius = attributeInteger(element, 'radius');
    if (
      centerX === undefined ||
      centerY === undefined ||
      centerZ === undefined ||
      radius === undefined ||
      !insideRegion(centerX, centerY, centerZ)
    ) {
      continue;
    }
    candidates.push({ centerX, centerY, centerZ, radius, element });
  }

  // Canonical order first, so diagnostic paths address the emitted table.
  candidates.sort((left, right) => {
    if (left.centerZ !== right.centerZ) return left.centerZ - right.centerZ;
    if (left.centerY !== right.centerY) return left.centerY - right.centerY;
    return left.centerX - right.centerX;
  });

  const groups: SpawnGroupDefinition[] = [];
  const creatureKeys: string[] = [];
  const diagnostics: ExtractionDiagnostic[] = [];
  let slotCount = 0;

  candidates.forEach((group, groupIndex) => {
    const mappedSlots: {
      readonly position: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
      };
      readonly slot: SpawnSlotDefinition;
    }[] = [];

    asXmlElements(group.element.monster).forEach((slot, slotIndex) => {
      const path = `spawns.groups[${groupIndex}].slots[${slotIndex}]`;
      const name = xmlAttribute(slot, 'name');
      const offsetX = attributeInteger(slot, 'x');
      const offsetY = attributeInteger(slot, 'y');
      const z = attributeInteger(slot, 'z');
      if (
        typeof name !== 'string' ||
        offsetX === undefined ||
        offsetY === undefined ||
        z === undefined
      ) {
        diagnostics.push(
          diagnostic(
            path,
            'HUNT_SCHEMA_INVALID',
            'Spawn slot needs name, x, y and z attributes',
          ),
        );
        return;
      }

      const normalized = normalizeCreatureName(name);
      if (excluded.has(normalized)) return;

      const creatureKey = keyByName.get(normalized);
      if (creatureKey === undefined) {
        diagnostics.push(
          diagnostic(
            path,
            'HUNT_UNKNOWN_CREATURE',
            `${name} is not included in the PB-01 catalog selection`,
          ),
        );
        return;
      }

      const absoluteX = group.centerX + offsetX;
      const absoluteY = group.centerY + offsetY;
      if (!insideRegion(absoluteX, absoluteY, z)) {
        diagnostics.push(
          diagnostic(
            path,
            'HUNT_SPAWN_OUT_OF_REGION',
            `${name} at (${absoluteX}, ${absoluteY}, ${z}) falls outside the extracted region`,
          ),
        );
        return;
      }

      const conversion = convertSpawntimeToTicks(
        xmlAttribute(slot, 'spawntime'),
      );
      if (!conversion.ok) {
        diagnostics.push(
          diagnostic(
            path,
            'HUNT_SPAWNTIME_NOT_DIVISIBLE',
            conversion.reason === 'non-numeric'
              ? `${name} spawntime must be numeric seconds`
              : `${name} spawntime must convert to whole 50 ms ticks`,
          ),
        );
        return;
      }

      if (!creatureKeys.includes(creatureKey)) creatureKeys.push(creatureKey);
      const sourcePosition = { x: absoluteX, y: absoluteY, z };
      const targetPosition =
        layout === undefined
          ? {
              x: absoluteX - region.origin.x,
              y: absoluteY - region.origin.y,
              z,
            }
          : placementBySource.get(
              `${sourcePosition.x}:${sourcePosition.y}:${sourcePosition.z}`,
            );
      if (targetPosition === undefined) {
        diagnostics.push(
          diagnostic(
            path,
            'HUNT_LAYOUT_INVALID',
            `No spawn placement exists for ${name} at (${absoluteX}, ${absoluteY}, ${z})`,
          ),
        );
        return;
      }
      if (!outputContains(targetPosition)) {
        diagnostics.push(
          diagnostic(
            path,
            'HUNT_SPAWN_OUT_OF_REGION',
            `${name} target at (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z}) falls outside the authored region`,
          ),
        );
        return;
      }
      mappedSlots.push({
        position: targetPosition,
        slot: {
          creatureKey,
          blueprintId: blueprintIdForCreature(creatureKey),
          offsetX: layout === undefined ? offsetX : targetPosition.x,
          offsetY: layout === undefined ? offsetY : targetPosition.y,
          offsetZ: layout === undefined ? z - group.centerZ : targetPosition.z,
          respawnTicks: conversion.ticks,
        },
      });
    });

    if (mappedSlots.length === 0) return;
    const targetCenter = mappedSlots[0]?.position as {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    };
    const slots =
      layout === undefined
        ? mappedSlots.map(({ slot }) => slot)
        : mappedSlots.map(({ position, slot }) => ({
            ...slot,
            offsetX: position.x - targetCenter.x,
            offsetY: position.y - targetCenter.y,
            offsetZ: position.z - targetCenter.z,
          }));
    slotCount += slots.length;
    groups.push({
      center:
        layout === undefined
          ? {
              x: group.centerX - region.origin.x,
              y: group.centerY - region.origin.y,
              z: group.centerZ,
            }
          : targetCenter,
      radius: group.radius,
      slots,
    });
  });

  groups.sort((left, right) => {
    if (left.center.z !== right.center.z) return left.center.z - right.center.z;
    if (left.center.y !== right.center.y) return left.center.y - right.center.y;
    return left.center.x - right.center.x;
  });

  return {
    table: {
      groups,
      maxLiveActors: Math.max(1, Math.min(MAX_LIVE_ACTORS, slotCount)),
    },
    creatureKeys,
    diagnostics,
  };
}
