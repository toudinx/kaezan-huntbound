/**
 * How much health is left, as a colour: green while it is healthy, amber
 * around half, red as it runs out.
 *
 * These are the cockpit gauge's own stops, deliberately. The arc on the rail
 * and the bar over a creature's head answer the same question, and two
 * palettes would teach the player two scales for one fact.
 *
 * Interpolated rather than stepped: a bar that snaps from green to red at an
 * arbitrary threshold tells the player less than one that has been visibly
 * sliding for the last few hits.
 */
export type HealthRampRgb = readonly [number, number, number];

/** Empty, half, and full. */
const HEALTH_STOPS: readonly HealthRampRgb[] = Object.freeze([
  [255, 77, 77],
  [245, 197, 66],
  [93, 219, 107],
]);

const EMPTY: HealthRampRgb = [255, 77, 77];

export function healthRampRgb(fraction: number): HealthRampRgb {
  if (!Number.isFinite(fraction)) return EMPTY;

  const clamped = Math.min(Math.max(fraction, 0), 1);
  const scaled = clamped * (HEALTH_STOPS.length - 1);
  const lower = Math.min(Math.floor(scaled), HEALTH_STOPS.length - 2);
  const from = HEALTH_STOPS[lower];
  const to = HEALTH_STOPS[lower + 1];

  if (from === undefined || to === undefined) return EMPTY;

  const t = scaled - lower;
  const mix = (index: number): number =>
    Math.round(
      (from[index] ?? 0) + ((to[index] ?? 0) - (from[index] ?? 0)) * t,
    );

  return [mix(0), mix(1), mix(2)];
}

/** For the DOM cockpit, which paints through a custom property. */
export function healthRampCss(fraction: number): string {
  const [red, green, blue] = healthRampRgb(fraction);
  return `rgb(${red} ${green} ${blue})`;
}

/** For Phaser, which takes a packed `0xRRGGBB`. */
export function healthRampColor(fraction: number): number {
  const [red, green, blue] = healthRampRgb(fraction);
  return (red << 16) | (green << 8) | blue;
}
