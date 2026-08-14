import { describe, expect, it } from 'vitest';

import { createInputMap } from './InputMap';

class TestInputTarget extends EventTarget {
  readonly ownerDocument = this as unknown as Document;
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

  pointerDown(direction: string): void {
    this.activePointerDirection = direction;
    this.dispatchEvent(new Event('pointerdown'));
  }

  pointerUp(direction: string): void {
    this.activePointerDirection = direction;
    this.dispatchEvent(new Event('pointerup'));
    this.activePointerDirection = undefined;
  }
}

describe('InputMap', () => {
  it('maps keyboard axes to one action in each available direction', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyW');
    expect(input.drain()).toEqual([{ kind: 'step', direction: 'n' }]);

    target.keyDown('KeyD');
    expect(input.drain()).toEqual([{ kind: 'step', direction: 'ne' }]);

    target.keyUp('KeyW');
    expect(input.drain()).toEqual([{ kind: 'step', direction: 'e' }]);
  });

  it('produces one action for simultaneous keys and one per drain while held', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.keyDown('KeyW');
    target.keyDown('KeyD');
    target.keyDown('KeyD');

    expect(input.drain()).toEqual([{ kind: 'step', direction: 'ne' }]);
    expect(input.drain()).toEqual([{ kind: 'step', direction: 'ne' }]);

    target.keyUp('KeyW');
    target.keyUp('KeyD');
    expect(input.drain()).toEqual([]);
  });

  it('uses the same direction actions for a D-pad press and release', () => {
    const input = createInputMap();
    const target = new TestInputTarget();
    input.attach(target as unknown as HTMLElement);

    target.pointerDown('nw');
    expect(input.drain()).toEqual([{ kind: 'step', direction: 'nw' }]);

    target.pointerUp('nw');
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
