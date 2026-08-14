import type { HuntDefinition } from '../../packages/contracts/src/hunt/types.ts';
import { encodeCanonicalJson } from './encode.ts';

/** The four generated files, in the order they are written and reported. */
export const HUNT_FILE_NAMES = [
  'region',
  'transitions',
  'spawns',
  'hunt',
] as const;

export type HuntFileName = (typeof HUNT_FILE_NAMES)[number];

/** Canonical bytes of every generated file, keyed by file name. */
export function encodeHuntFiles(
  hunt: HuntDefinition,
): ReadonlyMap<HuntFileName, string> {
  return new Map<HuntFileName, string>([
    ['region', encodeCanonicalJson(hunt.region)],
    ['transitions', encodeCanonicalJson(hunt.transitions)],
    ['spawns', encodeCanonicalJson(hunt.spawns)],
    ['hunt', encodeCanonicalJson(hunt)],
  ]);
}
