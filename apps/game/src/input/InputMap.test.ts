import { describe, expect, it } from 'vitest';

import { TICK_DURATION_MS } from '../../../../packages/contracts/src/index.ts';
import { createInputMap } from './InputMap';

class TestInputTarget extends EventTarget {
  readonly inputWindow = new EventTarget();
  readonly ownerDocument = {
    defaultView: this.inputWindow,
  } as unknown as Document;
  private activePointerDirection: string | undefined;

  closest(selector: string): { dataset: { huntDirection: string } } | null {
    if (selector !== '[data-hunt-direction]' || !this.activePointerDirection) {
      return null;
    }

    return { dataset: { huntDirection: this.activePointerDirection } };
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
});
