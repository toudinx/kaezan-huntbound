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
 */
const ARC_PATH = 'M 96 16 A 128 192 0 0 0 96 384';

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

  canvas.append(track, fill);

  const readout = document.createElement('span');
  readout.className = 'cockpit-arc__value';
  readout.setAttribute('data-testid', `${options.testId}-value`);

  element.append(canvas, readout);

  const update = (value: number, maximum: number): void => {
    const safeMaximum = Math.max(0, maximum);
    const safeValue = Math.min(Math.max(0, value), safeMaximum);
    // An empty pool reads as full-but-unknown if the arc is left drawn, so a
    // zero maximum empties it rather than dividing by zero.
    const filled = safeMaximum === 0 ? 0 : (safeValue / safeMaximum) * 100;

    element.setAttribute('aria-valuemax', String(maximum));
    element.setAttribute('aria-valuenow', String(value));
    fill.setAttribute('stroke-dashoffset', String(100 - filled));

    const text = `${safeValue}`;
    if (readout.textContent !== text) readout.textContent = text;
  };

  update(0, 0);

  return { element, update };
}
