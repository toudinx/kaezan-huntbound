import type {
  EntityId,
  GridPosition,
  SimulationEvent,
} from '../../../../packages/contracts/src/index.ts';
import { TICK_DURATION_MS } from '../../../../packages/contracts/src/index.ts';

export const FLASH_TTL_MS = 100;
export const LUNGE_TTL_MS = 140;
export const LUNGE_DISTANCE_PX = 6;
export const HIT_STOP_MAX_MS = 50;
export const SHAKE_TTL_MS = 180;
export const SHAKE_AMPLITUDE_PX = 3;

const SHAKE_STEP_MS = 24;

export type CombatImpulseKind = 'flash' | 'lunge' | 'hit-stop' | 'shake';

export interface CombatImpulse {
  readonly id: number;
  readonly kind: CombatImpulseKind;
  /** The actor that is hit, lunges, or caused the camera shake. */
  readonly entityId: EntityId;
  readonly tick: number;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  readonly directionX: number;
  readonly directionY: number;
}

export interface CombatImpulseInput {
  readonly events: readonly SimulationEvent[];
  readonly actorPositions: ReadonlyMap<EntityId, GridPosition>;
  readonly playerEntityId: EntityId | null;
}

export interface CombatImpulses {
  handle(input: CombatImpulseInput): void;
  advance(nowMs: number): void;
  current(): readonly CombatImpulse[];
  active(nowMs: number): readonly CombatImpulse[];
  isActive(kind: CombatImpulseKind, entityId: EntityId, nowMs: number): boolean;
  lungeOffset(
    entityId: EntityId,
    nowMs: number,
  ): { readonly x: number; readonly y: number };
  cameraOffset(nowMs: number): { readonly x: number; readonly y: number };
  renderTickFor(entityId: EntityId, renderTick: number): number;
  reset(): void;
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
}

function sign(value: number): number {
  return value === 0 ? 0 : value > 0 ? 1 : -1;
}

function hash(entityId: EntityId, tick: number, salt: number): number {
  return (
    (Math.imul(Number(entityId), 1_103_515_245) +
      Math.imul(tick, 12_345) +
      salt) >>>
    0
  );
}

function signedHash(entityId: EntityId, tick: number, salt: number): number {
  return hash(entityId, tick, salt) % 2 === 0 ? 1 : -1;
}

function triangularEnvelope(progress: number): number {
  const normalized = clamp01(progress);
  return normalized <= 0.5 ? normalized * 2 : (1 - normalized) * 2;
}

function directionFor(
  sourceEntityId: EntityId,
  targetEntityId: EntityId,
  tick: number,
  actorPositions: ReadonlyMap<EntityId, GridPosition>,
): { readonly x: number; readonly y: number } {
  const source = actorPositions.get(sourceEntityId);
  const target = actorPositions.get(targetEntityId);
  if (source !== undefined && target !== undefined) {
    const x = sign(target.x - source.x);
    const y = sign(target.y - source.y);
    if (x !== 0 || y !== 0) return { x, y };
  }

  return {
    x: signedHash(sourceEntityId, tick, 17),
    y: signedHash(sourceEntityId, tick, 31),
  };
}

function copyImpulse(impulse: CombatImpulse): CombatImpulse {
  return Object.freeze({ ...impulse });
}

export function createCombatImpulses(): CombatImpulses {
  let nextId = 1;
  let entries: CombatImpulse[] = [];
  let lastAdvanceMs = 0;

  const add = (input: {
    readonly kind: CombatImpulseKind;
    readonly entityId: EntityId;
    readonly tick: number;
    readonly ttlMs: number;
    readonly directionX?: number;
    readonly directionY?: number;
  }): void => {
    const createdAtMs = input.tick * TICK_DURATION_MS;
    if (
      entries.some(
        (entry) =>
          entry.kind === input.kind &&
          entry.entityId === input.entityId &&
          entry.createdAtMs === createdAtMs,
      )
    ) {
      return;
    }

    entries.push({
      id: nextId,
      kind: input.kind,
      entityId: input.entityId,
      tick: input.tick,
      createdAtMs,
      expiresAtMs: createdAtMs + input.ttlMs,
      directionX: input.directionX ?? 0,
      directionY: input.directionY ?? 0,
    });
    nextId += 1;
  };

  return {
    handle: ({ events, actorPositions, playerEntityId }) => {
      for (const event of events) {
        if (event.payload.type !== 'combat/damaged') continue;

        const { entityId, sourceEntityId } = event.payload;
        const direction = directionFor(
          sourceEntityId,
          entityId,
          event.tick,
          actorPositions,
        );
        add({
          kind: 'flash',
          entityId,
          tick: event.tick,
          ttlMs: FLASH_TTL_MS,
        });
        add({
          kind: 'lunge',
          entityId: sourceEntityId,
          tick: event.tick,
          ttlMs: LUNGE_TTL_MS,
          directionX: direction.x,
          directionY: direction.y,
        });
        add({
          kind: 'hit-stop',
          entityId,
          tick: event.tick,
          ttlMs: HIT_STOP_MAX_MS,
        });
        add({
          kind: 'hit-stop',
          entityId: sourceEntityId,
          tick: event.tick,
          ttlMs: HIT_STOP_MAX_MS,
        });
        if (entityId === playerEntityId) {
          add({
            kind: 'shake',
            entityId,
            tick: event.tick,
            ttlMs: SHAKE_TTL_MS,
          });
        }
      }
    },
    advance: (nowMs) => {
      const safeNowMs = Number.isFinite(nowMs)
        ? Math.max(lastAdvanceMs, nowMs)
        : lastAdvanceMs;

      entries = entries.filter((entry) => entry.expiresAtMs > safeNowMs);
      lastAdvanceMs = safeNowMs;
    },
    current: () => Object.freeze(entries.map(copyImpulse)),
    active: (nowMs) =>
      Object.freeze(
        entries
          .filter(
            (entry) => entry.createdAtMs <= nowMs && nowMs < entry.expiresAtMs,
          )
          .map(copyImpulse),
      ),
    isActive: (kind, entityId, nowMs) =>
      entries.some(
        (entry) =>
          entry.kind === kind &&
          entry.entityId === entityId &&
          entry.createdAtMs <= nowMs &&
          nowMs < entry.expiresAtMs,
      ),
    lungeOffset: (entityId, nowMs) => {
      let x = 0;
      let y = 0;
      for (const entry of entries) {
        if (
          entry.kind !== 'lunge' ||
          entry.entityId !== entityId ||
          nowMs < entry.createdAtMs ||
          nowMs >= entry.expiresAtMs
        ) {
          continue;
        }
        const progress =
          (nowMs - entry.createdAtMs) / (entry.expiresAtMs - entry.createdAtMs);
        const distance = LUNGE_DISTANCE_PX * triangularEnvelope(progress);
        x += entry.directionX * distance;
        y += entry.directionY * distance;
      }
      return { x, y };
    },
    cameraOffset: (nowMs) => {
      let x = 0;
      let y = 0;
      for (const entry of entries) {
        if (
          entry.kind !== 'shake' ||
          nowMs < entry.createdAtMs ||
          nowMs >= entry.expiresAtMs
        ) {
          continue;
        }
        const elapsedMs = nowMs - entry.createdAtMs;
        const progress = elapsedMs / (entry.expiresAtMs - entry.createdAtMs);
        const envelope = 1 - clamp01(progress);
        const phase = Math.floor(elapsedMs / SHAKE_STEP_MS);
        x +=
          signedHash(entry.entityId, entry.tick + phase, 53) *
          SHAKE_AMPLITUDE_PX *
          envelope;
        y +=
          signedHash(entry.entityId, entry.tick + phase, 71) *
          SHAKE_AMPLITUDE_PX *
          envelope;
      }
      return { x, y };
    },
    /**
     * Holds the actor's clock still while a hit is landing, and hands it back
     * intact afterwards.
     *
     * Hit-stop used to be a running total of paused milliseconds subtracted
     * from the world clock. A total only grows, and every `combat/damaged`
     * stops both the target and the attacker, so a fight walked the player's
     * clock permanently backwards -- forty exchanges put him forty ticks, four
     * whole tiles, behind. His position and walk frame read from that stale
     * clock while the lunge offset and the camera read from the live one, so
     * the world slid past a sprite pinned to a tile it had already left. That
     * is what moonwalking looked like.
     *
     * Freezing instead of subtracting keeps the impact and cannot drift: the
     * actor resumes on the world clock the moment the last hit-stop expires,
     * having skipped at most HIT_STOP_MAX_MS of its own animation.
     */
    renderTickFor: (entityId, renderTick) => {
      const nowMs = renderTick * TICK_DURATION_MS;
      let frozenAtMs: number | undefined;
      for (const entry of entries) {
        if (
          entry.kind !== 'hit-stop' ||
          entry.entityId !== entityId ||
          nowMs < entry.createdAtMs ||
          nowMs >= entry.expiresAtMs
        ) {
          continue;
        }
        if (frozenAtMs === undefined || entry.createdAtMs > frozenAtMs) {
          frozenAtMs = entry.createdAtMs;
        }
      }
      return frozenAtMs === undefined
        ? renderTick
        : frozenAtMs / TICK_DURATION_MS;
    },
    reset: () => {
      entries = [];
      lastAdvanceMs = 0;
      nextId = 1;
    },
  };
}
