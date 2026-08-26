const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * The two curved gauges that flank the play area.
 *
 * A rectangular bar was tried and refused at playtest: with everything else on
 * screen already a rectangle, one more made the whole thing read as a
 * dashboard. These arcs are the only curve in the cockpit, and that is the
 * point -- they are what stops the frame looking like a spreadsheet, which is
 * the first acceptance criterion the user wrote down.
 *
 * `pathLength="100"` lets the fill be set in percent without measuring the path
 * at runtime: `getTotalLength` needs a laid-out SVG, which is exactly what a
 * unit test does not have.
 *
 * No number rides the arc. It used to carry one at its foot, as text laid
 * straight on the terrain, and that lost every contrast fight with grass, dirt
 * and cave floor in turn. Moving it onto the curve fixed the contrast and broke
 * something worse: a readout has to widen with the pool and a 76 px band cannot,
 * so a four-digit health would have burst the gauge. The digits live in
 * `VitalBanner` now and the arc is shape and length only -- which is the split
 * Tibia uses and the one playtest asked for.
 */
export type VitalArcSide = 'left' | 'right';

export interface VitalArc {
  readonly element: HTMLElement;
  update(value: number, maximum: number): void;
}

export interface VitalArcOptions {
  readonly testId: string;
  readonly label: string;
  readonly side: VitalArcSide;
  readonly tone: 'health' | 'mana';
}

function svg(document: Document, tagName: string): Element {
  return document.createElementNS(SVG_NS, tagName);
}

/**
 * Bulges away from the play area and hugs it on the inner edge, so the free
 * rectangle stays a rectangle and the curve is spent on the outside.
 *
 * A quadratic curve rather than a circular arc: the element is stretched to
 * whatever height the band gives it, and a circle's bulge flattens out of sight
 * as it stretches. The control point fixes the bulge as a share of the width,
 * so the gauge still reads as a curve on a tall monitor instead of as a line.
 *
 * Drawn bottom to top on purpose. `stroke-dashoffset` eats the path from its
 * far end, so a top-down path drained upward from the foot -- the gauge kept its
 * full head and lost its base, which reads as the wrong thing entirely. Starting
 * at the foot makes what is left pool at the bottom and the loss come off the
 * top, the way a vessel empties.
 */
const ARC_PATH = 'M 102 390 Q 2 200 102 10';

/** Where health stops being a number to watch and becomes one to act on. */
const CRITICAL_HEALTH_PERCENT = 30;

/** Full, half, and empty. Health crosses all three; mana keeps its own blue. */
const HEALTH_STOPS: readonly (readonly [number, number, number])[] = [
  [255, 77, 77],
  [245, 197, 66],
  [93, 219, 107],
];

/**
 * Green while it is healthy, amber around half, red as it runs out.
 *
 * Interpolated rather than stepped: a bar that snaps from green to red at an
 * arbitrary threshold tells the player less than one that has been visibly
 * sliding for the last few hits.
 *
 * Shared with the banner's health bar. Two gauges for one pool that mix their
 * own colours will disagree about how bad it is at some fraction, and the
 * player will believe whichever is redder.
 */
export function healthColour(fraction: number): string {
  const clamped = Math.min(Math.max(fraction, 0), 1);
  const scaled = clamped * (HEALTH_STOPS.length - 1);
  const lower = Math.min(Math.floor(scaled), HEALTH_STOPS.length - 2);
  const from = HEALTH_STOPS[lower];
  const to = HEALTH_STOPS[lower + 1];

  if (from === undefined || to === undefined) return 'rgb(255 77 77)';

  const t = scaled - lower;
  const mix = (index: number): number =>
    Math.round(
      (from[index] ?? 0) + ((to[index] ?? 0) - (from[index] ?? 0)) * t,
    );

  return `rgb(${mix(0)} ${mix(1)} ${mix(2)})`;
}

export function createVitalArc(
  document: Document,
  options: VitalArcOptions,
): VitalArc {
  const element = document.createElement('div');
  element.className = `cockpit-arc cockpit-arc--${options.tone}`;
  element.setAttribute('data-testid', options.testId);
  element.setAttribute('data-side', options.side);
  element.setAttribute('role', 'progressbar');
  element.setAttribute('aria-label', options.label);
  element.setAttribute('aria-valuemin', '0');

  const canvas = svg(document, 'svg');
  canvas.setAttribute('class', 'cockpit-arc__canvas');
  canvas.setAttribute('viewBox', '0 0 120 400');
  canvas.setAttribute('preserveAspectRatio', 'none');
  canvas.setAttribute('aria-hidden', 'true');

  // A dark stroke a few pixels wider than the gauge, drawn underneath it. The
  // arcs float over grass, dirt and blood-red cave floor, and a coloured line
  // laid straight on top of that terrain has no edge of its own -- which is
  // what the playtest read as blurry. The casing gives every pixel of the
  // gauge the same near-black backing whatever it happens to be crossing.
  const casing = svg(document, 'path');
  casing.setAttribute('class', 'cockpit-arc__casing');
  casing.setAttribute('d', ARC_PATH);

  const track = svg(document, 'path');
  track.setAttribute('class', 'cockpit-arc__track');
  track.setAttribute('d', ARC_PATH);
  track.setAttribute('pathLength', '100');

  const fill = svg(document, 'path');
  fill.setAttribute('class', 'cockpit-arc__fill');
  fill.setAttribute('d', ARC_PATH);
  fill.setAttribute('pathLength', '100');
  fill.setAttribute('stroke-dasharray', '100');
  fill.setAttribute('stroke-dashoffset', '100');

  canvas.append(casing, track, fill);
  element.append(canvas);

  // `render` runs every frame; each write below is guarded by what was last
  // written, so a steady pool costs no DOM work at all.
  let writtenColour = '';
  let writtenCritical = '';

  const update = (value: number, maximum: number): void => {
    const safeMaximum = Math.max(0, maximum);
    const safeValue = Math.min(Math.max(0, value), safeMaximum);
    // An empty pool reads as full-but-unknown if the arc is left drawn, so a
    // zero maximum empties it rather than dividing by zero.
    const filled = safeMaximum === 0 ? 0 : (safeValue / safeMaximum) * 100;

    element.setAttribute('aria-valuemax', String(maximum));
    element.setAttribute('aria-valuenow', String(value));
    fill.setAttribute('stroke-dashoffset', String(100 - filled));

    if (options.tone === 'health') {
      // Published as a custom property so the stroke, its glow and the readout
      // stay one colour; the stylesheet keeps owning how each is drawn.
      const colour = healthColour(filled / 100);
      if (writtenColour !== colour) {
        writtenColour = colour;
        element.style.setProperty('--arc-colour', colour);
      }
      // The ramp alone was missed at playtest -- "73 de hp ... e algo critico,
      // mas confesso que e um pouco dificil de ver" -- so the last stretch is
      // flagged as well as coloured, and the stylesheet makes the arc insist.
      // A pool that has no maximum yet is not critical, it is unknown -- the
      // boot frame runs before the kernel reports one, and a HUD that opens
      // flashing red teaches the player to ignore the flash.
      const critical =
        safeMaximum > 0 && filled <= CRITICAL_HEALTH_PERCENT ? 'true' : 'false';
      if (writtenCritical !== critical) {
        writtenCritical = critical;
        element.setAttribute('data-critical', critical);
      }
    }
  };

  update(0, 0);

  return { element, update };
}
