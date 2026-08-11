import { v5 as uuidv5 } from 'uuid';
import { z } from 'zod';

export const HUNTBOUND_CONTENT_NAMESPACE =
  '471cdc3d-d99e-4bed-9782-9923d845f3d7';

export type EntityKind = 'vocation' | 'creature' | 'item' | 'spell';
export type ContentGuid = string & { readonly __brand: 'ContentGuid' };
export type ContentKey = string & { readonly __brand: 'ContentKey' };
export type VocationFamilyKey = string & {
  readonly __brand: 'VocationFamilyKey';
};

const UUID_V5_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CONTENT_KEY_PATTERN =
  /^(?:vocation|creature|item|spell):tibia:[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VOCATION_FAMILY_KEY_PATTERN =
  /^vocation-family:huntbound:[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ContentGuidSchema = z
  .string()
  .regex(UUID_V5_PATTERN, 'Expected a canonical lowercase UUIDv5')
  .transform((value) => value as ContentGuid);

export const ContentKeySchema = z
  .string()
  .regex(
    CONTENT_KEY_PATTERN,
    'Expected a lowercase kebab-case Tibia content key',
  )
  .transform((value) => value as ContentKey);

export const VocationFamilyKeySchema = z
  .string()
  .regex(
    VOCATION_FAMILY_KEY_PATTERN,
    'Expected a lowercase Huntbound vocation family key',
  )
  .transform((value) => value as VocationFamilyKey);

export function createContentGuid(
  kind: EntityKind,
  sourceSystem: 'tibia',
  sourceId: string,
): ContentGuid {
  if (sourceId.trim().length === 0) {
    throw new Error('sourceId must not be empty');
  }

  const canonicalName = `${sourceSystem}/${kind}/${sourceId}`;
  return uuidv5(canonicalName, HUNTBOUND_CONTENT_NAMESPACE) as ContentGuid;
}
