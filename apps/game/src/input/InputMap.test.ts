import { describe, expect, it } from 'vitest';

import { TICK_DURATION_MS } from '../../../../packages/contracts/src/index.ts';
import { createInputMap } from './InputMap';

class TestInputTarget extends EventTarget {
  readonly inputWindow = new EventTarget();
  readonly ownerDocument = {
    defaultView: this.inputWindow,
  } as unknown as Document;
  private activePointerDirection: string | undefined;
  private activePointerAction: string | undefined;

  closest(selector: string): {
    dataset: { huntDirection?: string; huntAction?: string };
  } | null {
    if (selector === '[data-hunt-direction]' && this.activePointerDirection) {
      return { dataset: { huntDirection: this.activePointerDirection } };
    }

    if (selector === '[data-hunt-action]' && this.activePointerAction) {
      return { dataset: { huntAction: this.activePointerAction } };
    }

    return null;
  }

  keyDown(code: string): void {
    this.dispatchEvent(Object.assign(new Event('keydown'), { code }));
  }

  keyUp(code: string): void {
    this.dispatchEvent(Object.assign(new Event('keyup'), { code }));
  }

  blurWindow(): void {
    this.inputWindow.dispatchEvent(new Event('blur'));
  }

  pointerDown(direction: string): void {
    this.activePointerDirection = direction;
    this.dispatchEvent(new Event('pointerdown'));
  }

  pointerUp(direction: string): void {
    this.activePointerDirection = direction;
    this.dispatchEvent(new Event('pointerup'));
    this.activePointerDirection = undefined;
  }

  pointerDownAction(action: string): void {
    this.activePointerAction = action;
    this.dispatchEvent(new Event('pointerdown'));
  }

  pointerUpAction(action: string): void {
    this.activePointerAction = action;
    this.dispatchEvent(new Event('pointerup'));
    this.activePointerAction = undefined;
  }

  pointerCancel(): void {
    this.dispatchEvent(new Event('pointercancel'));
  }
}

function createTestClock() {
  let currentMs = 0;

  return {
    now: () => currentMs,
    advance: (durationMs: number) => {
      currentMs += durationMs;
    },
  };
}

describe('InputMap', () => {
  it('maps keyboard axes to one action in each available direction', () => {
    const clock = createTestClock();
    const input = createInputMap({ now: clock.now });
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyW');
    expect(input.drain()).toEqual([{ kind: 'step', direction: 'n' }]);

    target.keyDown('KeyD');
    expect(input.drain()).toEqual([{ kind: 'step', direction: 'ne' }]);

    target.keyUp('KeyW');
    expect(input.drain()).toEqual([]);
    clock.advance(TICK_DURATION_MS * 2);
    expect(input.drain()).toEqual([{ kind: 'step', direction: 'e' }]);
  });

  it('preserves one keyboard edge when released before drain', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyW');
    target.keyUp('KeyW');

    expect(input.drain()).toEqual([{ kind: 'step', direction: 'n' }]);
    expect(input.drain()).toEqual([]);
  });

  it('does not reset a held repeat for an unrelated keyup', () => {
    const clock = createTestClock();
    const input = createInputMap({ now: clock.now });
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyW');
    expect(input.drain()).toEqual([{ kind: 'step', direction: 'n' }]);

    target.keyUp('KeyQ');
    clock.advance(TICK_DURATION_MS * 2);

    expect(input.drain()).toEqual([{ kind: 'step', direction: 'n' }]);
  });

  it('maps simultaneous keys and repeats after the hold delay', () => {
    const clock = createTestClock();
    const input = createInputMap({ now: clock.now });
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyW');
    target.keyDown('KeyD');
    target.keyDown('KeyD');

    expect(input.drain()).toEqual([{ kind: 'step', direction: 'ne' }]);
    expect(input.drain()).toEqual([]);
    clock.advance(TICK_DURATION_MS * 2);
    expect(input.drain()).toEqual([{ kind: 'step', direction: 'ne' }]);

    target.keyUp('KeyW');
    target.keyUp('KeyD');
    expect(input.drain()).toEqual([]);
  });

  it('waits through one gate before repeating a held direction', () => {
    const clock = createTestClock();
    const input = createInputMap({ now: clock.now });
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyW');

    expect(input.drain()).toEqual([{ kind: 'step', direction: 'n' }]);
    expect(input.drain()).toEqual([]);
    expect(input.drain()).toEqual([]);
    clock.advance(TICK_DURATION_MS * 2);
    expect(input.drain()).toEqual([{ kind: 'step', direction: 'n' }]);
    expect(input.drain()).toEqual([{ kind: 'step', direction: 'n' }]);

    target.keyUp('KeyW');
    expect(input.drain()).toEqual([]);
  });

  it('preserves one D-pad edge when released before drain', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.pointerDown('nw');
    target.pointerUp('nw');

    expect(input.drain()).toEqual([{ kind: 'step', direction: 'nw' }]);
    expect(input.drain()).toEqual([]);
  });

  it('starts the hold delay after the edge is consumed, not at pointerdown', () => {
    const clock = createTestClock();
    const input = createInputMap({ now: clock.now });
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.pointerDown('s');
    clock.advance(TICK_DURATION_MS);
    expect(input.drain()).toEqual([{ kind: 'step', direction: 's' }]);

    clock.advance(TICK_DURATION_MS);
    expect(input.drain()).toEqual([]);

    target.pointerUp('s');
    clock.advance(TICK_DURATION_MS * 2);
    expect(input.drain()).toEqual([]);
  });

  it('starts the hold delay after the keyboard edge is consumed, not at keydown', () => {
    const clock = createTestClock();
    const input = createInputMap({ now: clock.now });
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyS');
    clock.advance(TICK_DURATION_MS);
    expect(input.drain()).toEqual([{ kind: 'step', direction: 's' }]);

    clock.advance(TICK_DURATION_MS);
    expect(input.drain()).toEqual([]);

    target.keyUp('KeyS');
    clock.advance(TICK_DURATION_MS * 2);
    expect(input.drain()).toEqual([]);
  });

  it('repeats a D-pad hold only after two later input-gate ticks', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.pointerDown('s');
    expect(input.drain(10)).toEqual([{ kind: 'step', direction: 's' }]);
    expect(input.drain(10)).toEqual([]);
    expect(input.drain(11)).toEqual([]);
    expect(input.drain(12)).toEqual([{ kind: 'step', direction: 's' }]);
    expect(input.drain(13)).toEqual([{ kind: 'step', direction: 's' }]);

    target.pointerUp('s');
    expect(input.drain(14)).toEqual([]);
  });

  it('releases a D-pad hold when pointerup arrives on the owner window', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.pointerDown('s');
    expect(input.drain(10)).toEqual([{ kind: 'step', direction: 's' }]);

    target.inputWindow.dispatchEvent(new Event('pointerup'));
    expect(input.drain(11)).toEqual([]);
    expect(input.drain(12)).toEqual([]);
    expect(input.drain(13)).toEqual([]);
  });

  it('releases a keyboard hold when keyup arrives on the owner window', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyS');
    expect(input.drain(10)).toEqual([{ kind: 'step', direction: 's' }]);

    target.inputWindow.dispatchEvent(
      Object.assign(new Event('keyup'), { code: 'KeyS' }),
    );
    expect(input.drain(11)).toEqual([]);
    expect(input.drain(12)).toEqual([]);
    expect(input.drain(13)).toEqual([]);
  });

  it('ignores a keyboard auto-repeat after the key was released', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyS');
    expect(input.drain(10)).toEqual([{ kind: 'step', direction: 's' }]);
    target.keyUp('KeyS');

    target.dispatchEvent(
      Object.assign(new Event('keydown'), { code: 'KeyS', repeat: true }),
    );
    expect(input.drain(11)).toEqual([]);
    expect(input.drain(12)).toEqual([]);
    expect(input.drain(13)).toEqual([]);
  });

  it('stops a hold without dropping a pending edge that has not been drained', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyS');
    input.releaseHeld();
    expect(input.drain(10)).toEqual([{ kind: 'step', direction: 's' }]);
    expect(input.drain(11)).toEqual([]);
    expect(input.drain(12)).toEqual([]);
  });

  it('stops a D-pad hold after the edge was consumed', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.pointerDown('s');
    expect(input.drain(10)).toEqual([{ kind: 'step', direction: 's' }]);
    input.releaseHeld();
    expect(input.drain(11)).toEqual([]);
    expect(input.drain(12)).toEqual([]);
    expect(input.drain(13)).toEqual([]);
  });

  it('clears held input when the owner window blurs', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyW');
    target.blurWindow();

    expect(input.drain()).toEqual([]);
  });

  it('clears a pending D-pad edge when the pointer is canceled', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.pointerDown('nw');
    target.pointerCancel();

    expect(input.drain()).toEqual([]);
  });

  it('clears a pending edge when detached', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyW');
    input.detach();

    expect(input.drain()).toEqual([]);
  });

  it('detaches all listeners and ignores unmapped keys', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyQ');
    expect(input.drain()).toEqual([]);

    input.detach();
    target.keyDown('KeyA');
    expect(input.drain()).toEqual([]);
  });

  it('emits one attack edge and ignores keyboard auto-repeat', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('Space');
    target.dispatchEvent(
      Object.assign(new Event('keydown'), {
        code: 'Space',
        repeat: true,
      }),
    );

    expect(input.drain(20)).toEqual([{ kind: 'attack' }]);
    expect(input.drain(20)).toEqual([]);
  });

  it('maps the seven ability keys to their stable indices', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('Digit1');
    expect(input.drain(1)).toEqual([{ kind: 'cast-ability', abilityIndex: 0 }]);

    target.keyUp('Digit1');
    target.keyDown('Digit2');
    expect(input.drain(2)).toEqual([{ kind: 'cast-ability', abilityIndex: 1 }]);

    target.keyUp('Digit2');
    target.keyDown('Digit3');
    expect(input.drain(3)).toEqual([{ kind: 'cast-ability', abilityIndex: 2 }]);

    target.keyUp('Digit3');
    target.keyDown('Digit4');
    expect(input.drain(4)).toEqual([{ kind: 'cast-ability', abilityIndex: 3 }]);

    target.keyUp('Digit4');
    target.keyDown('Digit5');
    expect(input.drain(5)).toEqual([{ kind: 'cast-ability', abilityIndex: 4 }]);

    target.keyUp('Digit5');
    target.keyDown('Digit6');
    expect(input.drain(6)).toEqual([{ kind: 'cast-ability', abilityIndex: 5 }]);

    target.keyUp('Digit6');
    target.keyDown('Digit7');
    expect(input.drain(7)).toEqual([{ kind: 'cast-ability', abilityIndex: 6 }]);

    target.keyUp('Digit7');
    target.keyDown('Numpad4');
    expect(input.drain(8)).toEqual([{ kind: 'cast-ability', abilityIndex: 3 }]);

    target.keyUp('Numpad4');
    target.keyDown('Numpad5');
    expect(input.drain(9)).toEqual([{ kind: 'cast-ability', abilityIndex: 4 }]);

    target.keyUp('Numpad5');
    target.keyDown('Numpad6');
    expect(input.drain(10)).toEqual([
      { kind: 'cast-ability', abilityIndex: 5 },
    ]);

    target.keyUp('Numpad6');
    target.keyDown('Numpad7');
    expect(input.drain(11)).toEqual([
      { kind: 'cast-ability', abilityIndex: 6 },
    ]);
  });

  it('emits exactly one combat action for a short touch', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.pointerDownAction('attack');
    target.pointerUpAction('attack');

    expect(input.drain(7)).toEqual([{ kind: 'attack' }]);
    expect(input.drain(7)).toEqual([]);
  });

  it('maps a touch ability button and target-cycle key', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.pointerDownAction('ability:2');
    target.pointerUpAction('ability:2');
    expect(input.drain(8)).toEqual([{ kind: 'cast-ability', abilityIndex: 2 }]);

    target.keyDown('Tab');
    expect(input.drain(9)).toEqual([{ kind: 'cycle-target' }]);
  });
});
