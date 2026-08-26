import { describe, expect, it } from 'vitest';

import { healthRampColor, healthRampCss, healthRampRgb } from './HealthRamp';

describe('HealthRamp', () => {
  it('runs green at full, amber at half and red at empty', () => {
    expect(healthRampRgb(1)).toEqual([93, 219, 107]);
    expect(healthRampRgb(0.5)).toEqual([245, 197, 66]);
    expect(healthRampRgb(0)).toEqual([255, 77, 77]);
  });

  it('slides between the stops instead of snapping', () => {
    const quarter = healthRampRgb(0.25);
    expect(quarter).toEqual([250, 137, 72]);
    expect(quarter).not.toEqual(healthRampRgb(0));
    expect(quarter).not.toEqual(healthRampRgb(0.5));
  });

  it('clamps anything outside 0..1, including a broken fraction', () => {
    expect(healthRampRgb(2)).toEqual(healthRampRgb(1));
    expect(healthRampRgb(-1)).toEqual(healthRampRgb(0));
    expect(healthRampRgb(Number.NaN)).toEqual(healthRampRgb(0));
  });

  it('packs the same colour for Phaser and for the DOM', () => {
    expect(healthRampColor(1)).toBe(0x5ddb6b);
    expect(healthRampCss(1)).toBe('rgb(93 219 107)');
    expect(healthRampColor(0)).toBe(0xff4d4d);
  });
});
