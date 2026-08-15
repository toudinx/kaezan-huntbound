import { describe, expect, it } from 'vitest';

import { createTickInputGate } from './TickInputGate';

describe('TickInputGate', () => {
  it('takes once per observed tick and never catches up with a burst', () => {
    const gate = createTickInputGate();

    expect(gate.take(10)).toBe(true);
    expect(gate.take(10)).toBe(false);
    expect(gate.take(13)).toBe(true);
    expect(gate.take(13)).toBe(false);
  });

  it('can be reset for a new scene lifecycle', () => {
    const gate = createTickInputGate();

    expect(gate.take(4)).toBe(true);
    gate.reset();
    expect(gate.take(4)).toBe(true);
  });
});
