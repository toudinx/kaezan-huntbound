import { healthColour } from './VitalArcs';

/**
 * The numeric strip above the play window: health and mana as horizontal bars
 * with `value / maximum` written across them, and the player's active buffs
 * beside them.
 *
 * The arcs used to carry the numbers themselves, inside the curve. That reads
 * well at 73 and stops reading at all once the pools grow: the readout has to
 * widen with the number, the arc band does not, and a four-digit health would
 * have burst out of a gauge 76 px wide. Playtest reached the same conclusion
 * and named the shape it wanted -- Tibia's, where a bar at the top carries the
 * numbers and the curved gauge stays a gauge. So the arcs went back to being
 * pure shape and length, and every digit lives here, on a plate wide enough to
 * grow.
 *
 * The bars are `aria-hidden`. They say exactly what the arcs already announce
 * as progressbars, and a screen reader that reports the same pool twice is
 * worse than one that reports it once.
 */
export interface VitalBannerVitals {
  readonly health: number;
  readonly maxHealth: number;
  readonly resource: number;
  readonly maxResource: number;
}

export interface VitalBanner {
  readonly element: HTMLElement;
  /** Owned by the HUD, which keeps writing their text and data attributes. */
  readonly posture: HTMLElement;
  readonly haste: HTMLElement;
  update(vitals: VitalBannerVitals | null): void;
}

/** Below this share the health bar stops being a number and becomes a warning. */
const CRITICAL_HEALTH_FRACTION = 0.3;

/**
 * `render` runs every frame, so each write is guarded by the last value written.
 * Nine deck cells rewritten per frame already cost this HUD a perf task; two
 * bars and a colour ramp would be the same mistake in a smaller place.
 */
interface Gauge {
  readonly element: HTMLElement;
  readonly fill: HTMLElement;
  readonly value: HTMLElement;
  written: string;
}

function createGauge(
  document: Document,
  tone: 'health' | 'mana',
  testId: string,
): Gauge {
  const element = document.createElement('div');
  element.className = `cockpit-gauge cockpit-gauge--${tone}`;
  element.setAttribute('data-testid', testId);
  element.setAttribute('aria-hidden', 'true');

  const fill = document.createElement('div');
  fill.className = 'cockpit-gauge__fill';

  const value = document.createElement('span');
  value.className = 'cockpit-gauge__value';
  value.setAttribute('data-testid', `${testId}-value`);

  element.append(fill, value);

  return { element, fill, value, written: '' };
}

function setGauge(gauge: Gauge, value: number, maximum: number): number {
  const safeMaximum = Math.max(0, maximum);
  const safeValue = Math.min(Math.max(0, value), safeMaximum);
  // An empty pool reads as full-but-unknown if the bar is left drawn, so a zero
  // maximum empties it rather than dividing by zero.
  const fraction = safeMaximum === 0 ? 0 : safeValue / safeMaximum;
  const text = `${safeValue} / ${safeMaximum}`;

  if (gauge.written !== text) {
    gauge.written = text;
    gauge.fill.style.setProperty('--gauge-fill', `${fraction * 100}%`);
    gauge.value.textContent = text;
  }

  return fraction;
}

export function mountVitalBanner(document: Document): VitalBanner {
  const element = document.createElement('div');
  element.className = 'cockpit__banner';
  element.setAttribute('data-testid', 'cockpit-banner');

  const gauges = document.createElement('div');
  gauges.className = 'cockpit-banner__gauges';

  const health = createGauge(document, 'health', 'combat-player-health-bar');
  const mana = createGauge(document, 'mana', 'combat-player-mana-bar');
  gauges.append(health.element, mana.element);

  /**
   * The buff strip, and it is a strip of what is actually on.
   *
   * An always-present "Posture: None / Haste: Off" pair would be two thirds of
   * this row spent telling the player nothing -- the placeholder the spec
   * refuses. The chips keep their text so the state stays readable to a test
   * and to a screen reader, and the stylesheet drops the ones whose data
   * attribute says they are off, so the row is empty until a buff is up.
   */
  const status = document.createElement('div');
  status.className = 'cockpit-banner__status';

  const posture = document.createElement('p');
  posture.className = 'cockpit-banner__chip';
  posture.setAttribute('data-testid', 'combat-posture');
  posture.setAttribute('aria-live', 'polite');

  const haste = document.createElement('p');
  haste.className = 'cockpit-banner__chip';
  haste.setAttribute('data-testid', 'combat-haste');
  haste.setAttribute('aria-live', 'polite');

  status.append(posture, haste);
  element.append(gauges, status);

  let writtenColour = '';
  let writtenCritical = '';

  const update = (vitals: VitalBannerVitals | null): void => {
    const fraction = setGauge(
      health,
      vitals?.health ?? 0,
      vitals?.maxHealth ?? 0,
    );
    setGauge(mana, vitals?.resource ?? 0, vitals?.maxResource ?? 0);

    // Published so the bar and the arc mix the same colour from the same ramp:
    // two gauges for one pool that disagree about how bad it is are worse than
    // either alone.
    const colour = healthColour(fraction);
    if (writtenColour !== colour) {
      writtenColour = colour;
      health.fill.style.setProperty('--gauge-colour', colour);
    }

    // A pool with no maximum yet is not critical, it is unknown -- the boot
    // frame runs before the kernel reports one, and a HUD that opens flashing
    // red teaches the player to ignore the flash.
    const critical = String(
      (vitals?.maxHealth ?? 0) > 0 && fraction <= CRITICAL_HEALTH_FRACTION,
    );
    if (writtenCritical !== critical) {
      writtenCritical = critical;
      health.element.setAttribute('data-critical', critical);
    }
  };

  update(null);

  return { element, posture, haste, update };
}
