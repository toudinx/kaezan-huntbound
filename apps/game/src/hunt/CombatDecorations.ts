import {
  type AssetKey,
  createAssetKey,
  HUNT_PACK_BLOOD_EFFECT_KEY,
  HUNT_PACK_DEAD_ROTWORM_KEY,
  HUNT_PACK_MAGIC_BLUE_EFFECT_KEY,
} from '../../../../packages/assets/src/index.ts';
import {
  type AbilityDefinition,
  type EntityId,
  type GridPosition,
  type SimulationEvent,
  TICK_DURATION_MS,
} from '../../../../packages/contracts/src/index.ts';

import { combatFxForAbility, combatFxForCause } from './CombatFxTable';

export const CORPSE_TTL_MS = 900;
export const BLOOD_TTL_MS = 900;
export const IMPACT_TTL_MS = 900;
export const DAMAGE_NUMBER_TTL_MS = 700;
export const HEAL_NUMBER_TTL_MS = 700;
export const AUTOLOOT_ARC_TTL_MS = 600;
export const BERSERK_STAGGER_MS = 40;

export type CombatDecorationKind =
  | 'corpse'
  | 'blood'
  | 'impact'
  | 'damage-number'
  | 'heal-number'
  | 'autoloot-arc';

export interface CombatDecoration {
  readonly id: number;
  readonly kind: CombatDecorationKind;
  readonly key?: AssetKey;
  readonly position?: GridPosition;
  readonly from?: GridPosition;
  readonly to?: GridPosition;
  readonly amount?: number;
  readonly stronger?: boolean;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  readonly blocksMovement: false;
}

export interface CombatDecorationInput {
  readonly events: readonly SimulationEvent[];
  readonly actorPositions: ReadonlyMap<EntityId, GridPosition>;
  readonly playerPosition: GridPosition | null;
}

export interface CombatDecorations {
  handle(input: CombatDecorationInput): void;
  advance(nowMs: number): void;
  current(): readonly CombatDecoration[];
  reset(): void;
}

function copyPosition(position: GridPosition): GridPosition {
  return { x: position.x, y: position.y, z: position.z };
}

function copyDecoration(decoration: CombatDecoration): CombatDecoration {
  return {
    ...decoration,
    ...(decoration.position === undefined
      ? {}
      : { position: copyPosition(decoration.position) }),
    ...(decoration.from === undefined
      ? {}
      : { from: copyPosition(decoration.from) }),
    ...(decoration.to === undefined ? {} : { to: copyPosition(decoration.to) }),
  };
}

export function createDecorationObjectPool<T>(options: {
  readonly reset: (item: T) => void;
}): {
  acquire(create: () => T): T;
  release(item: T): void;
  drain(dispose: (item: T) => void): void;
} {
  const idle: T[] = [];

  return {
    acquire: (create) => {
      const item = idle.pop() ?? create();
      options.reset(item);
      return item;
    },
    release: (item) => {
      idle.push(item);
    },
    drain: (dispose) => {
      for (const item of idle) dispose(item);
      idle.length = 0;
    },
  };
}

export function createCombatDecorations(
  abilities: readonly AbilityDefinition[] = [],
): CombatDecorations {
  let nextId = 1;
  let entries: CombatDecoration[] = [];
  const deathPositions = new Map<EntityId, GridPosition>();
  const autolootSources = new Set<EntityId>();

  const addImpact = (
    createdAtMs: number,
    recipe: ReturnType<typeof combatFxForCause>,
    position: GridPosition,
  ): void => {
    if (recipe.impactKey === undefined) return;
    add('impact', createdAtMs, IMPACT_TTL_MS, {
      key: recipe.impactKey,
      position: copyPosition(position),
      ...(recipe.stronger ? { stronger: true } : {}),
    });
  };

  const add = (
    kind: CombatDecorationKind,
    createdAtMs: number,
    ttlMs: number,
    input: Omit<
      CombatDecoration,
      'id' | 'kind' | 'createdAtMs' | 'expiresAtMs' | 'blocksMovement'
    >,
  ): void => {
    entries.push({
      id: nextId,
      kind,
      createdAtMs,
      expiresAtMs: createdAtMs + ttlMs,
      blocksMovement: false,
      ...input,
    });
    nextId += 1;
  };

  return {
    handle: ({ events, actorPositions, playerPosition }) => {
      for (const event of events) {
        const createdAtMs = event.tick * TICK_DURATION_MS;
        switch (event.payload.type) {
          case 'actor/died': {
            const position = copyPosition(event.payload.position);
            deathPositions.set(event.payload.entityId, position);
            add('corpse', createdAtMs, CORPSE_TTL_MS, {
              key: createAssetKey(HUNT_PACK_DEAD_ROTWORM_KEY),
              position,
            });
            add('blood', createdAtMs, BLOOD_TTL_MS, {
              key: createAssetKey(HUNT_PACK_BLOOD_EFFECT_KEY),
              position,
            });
            break;
          }
          case 'loot/granted': {
            const from = deathPositions.get(event.payload.sourceEntityId);
            if (
              from !== undefined &&
              playerPosition !== null &&
              !autolootSources.has(event.payload.sourceEntityId)
            ) {
              autolootSources.add(event.payload.sourceEntityId);
              add('autoloot-arc', createdAtMs, AUTOLOOT_ARC_TTL_MS, {
                key: createAssetKey(HUNT_PACK_MAGIC_BLUE_EFFECT_KEY),
                from: copyPosition(from),
                to: copyPosition(playerPosition),
              });
            }
            break;
          }
          case 'combat/attacked': {
            const position = actorPositions.get(event.payload.targetEntityId);
            const recipe = combatFxForCause('attack');
            if (position !== undefined && recipe.impactKey !== undefined) {
              addImpact(createdAtMs, recipe, position);
            }
            break;
          }
          case 'combat/damaged': {
            const position = actorPositions.get(event.payload.entityId);
            if (position === undefined) break;
            add('damage-number', createdAtMs, DAMAGE_NUMBER_TTL_MS, {
              amount: event.payload.amount,
              position: copyPosition(position),
            });
            const recipe = combatFxForCause(event.payload.cause);
            if (recipe.bloodKey !== undefined) {
              add('blood', createdAtMs, BLOOD_TTL_MS, {
                key: recipe.bloodKey,
                position: copyPosition(position),
              });
            }
            break;
          }
          case 'ability/cast': {
            const ability = abilities[event.payload.abilityIndex];
            if (ability === undefined) break;
            const recipe = combatFxForAbility(ability.abilityId);
            if (recipe === undefined || recipe.impactKey === undefined) break;
            const casterPosition = actorPositions.get(event.payload.entityId);

            if (recipe.placement === 'radius-1') {
              if (casterPosition === undefined) break;
              for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
                for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
                  const distance = Math.max(
                    Math.abs(offsetX),
                    Math.abs(offsetY),
                  );
                  addImpact(
                    createdAtMs +
                      (recipe.staggerByDistance
                        ? distance * BERSERK_STAGGER_MS
                        : 0),
                    recipe,
                    {
                      x: casterPosition.x + offsetX,
                      y: casterPosition.y + offsetY,
                      z: casterPosition.z,
                    },
                  );
                }
              }
              break;
            }

            const position =
              recipe.placement === 'self'
                ? casterPosition
                : event.payload.targetEntityId === null
                  ? undefined
                  : actorPositions.get(event.payload.targetEntityId);
            if (position !== undefined) {
              addImpact(createdAtMs, recipe, position);
            }
            break;
          }
          case 'combat/healed': {
            const position = actorPositions.get(event.payload.entityId);
            if (position === undefined) break;
            add('heal-number', createdAtMs, HEAL_NUMBER_TTL_MS, {
              amount: event.payload.amount,
              position: copyPosition(position),
            });
            break;
          }
          default:
            break;
        }
      }
    },
    advance: (nowMs) => {
      entries = entries.filter((entry) => entry.expiresAtMs > nowMs);
    },
    current: () => Object.freeze(entries.map(copyDecoration)),
    reset: () => {
      entries = [];
      deathPositions.clear();
      autolootSources.clear();
      nextId = 1;
    },
  };
}
