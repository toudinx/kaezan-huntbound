import { z } from 'zod';

export type TickIndex = number & { readonly __brand: 'TickIndex' };
export type EntityId = number & { readonly __brand: 'EntityId' };
export type Seed = string & { readonly __brand: 'Seed' };
export type StreamLabel = string & { readonly __brand: 'StreamLabel' };

export const SIMULATION_SCHEMA_VERSION = 5;
export const SIMULATION_RULES_VERSION = 4;
/** Shared v4 cooldown channel. Later groups are addressed by index from here. */
export const PRIMARY_COOLDOWN_GROUP = 0;
export const TICK_DURATION_MS = 50;
/**
 * The most wall time one frame may spend catching the simulation up.
 *
 * Time beyond this is dropped rather than banked, so a stall costs simulated
 * time instead of visual continuity. The ceiling is therefore also the worst
 * jump a single frame can show: at `100 ms` that is two ticks, a fifth of a
 * tile on a ten-tick step. `250 ms` bought a closer match to wall time and paid
 * for it with a visible half-tile hop after every hitch.
 */
export const MAX_FRAME_DELTA_MS = 100;

const safeInteger = z.number().safe();

export const TickIndexSchema = safeInteger
  .nonnegative()
  .transform((value) => value as TickIndex);

export const EntityIdSchema = safeInteger
  .positive()
  .transform((value) => value as EntityId);

export const SeedSchema = z
  .string()
  .regex(/^[0-9a-f]{16}$/, 'Expected a lowercase 16-character hexadecimal seed')
  .transform((value) => value as Seed);

export const StreamLabelSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Expected a lowercase kebab-case stream label',
  )
  .transform((value) => value as StreamLabel);

export function createTickIndex(value: unknown): TickIndex {
  return TickIndexSchema.parse(value);
}

export function createEntityId(value: unknown): EntityId {
  return EntityIdSchema.parse(value);
}

export function createSeed(value: unknown): Seed {
  return SeedSchema.parse(value);
}

export function createStreamLabel(value: unknown): StreamLabel {
  return StreamLabelSchema.parse(value);
}
