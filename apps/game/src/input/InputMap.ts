import {
  type Direction,
  TICK_DURATION_MS,
} from '../../../../packages/contracts/src/index.ts';

export type InputAction =
  | { readonly kind: 'step'; readonly direction: Direction }
  | { readonly kind: 'face'; readonly direction: Direction };

export interface InputMap {
  attach(target: HTMLElement): void;
  detach(): void;
  drain(): readonly InputAction[];
}

export interface InputMapOptions {
  readonly now?: () => number;
}

type Axis = 'horizontal' | 'vertical';
type AxisValue = -1 | 1;

interface KeyBinding {
  readonly axis: Axis;
  readonly value: AxisValue;
}

const keyBindings: Readonly<Record<string, KeyBinding>> = {
  KeyW: { axis: 'vertical', value: -1 },
  ArrowUp: { axis: 'vertical', value: -1 },
  KeyS: { axis: 'vertical', value: 1 },
  ArrowDown: { axis: 'vertical', value: 1 },
  KeyA: { axis: 'horizontal', value: -1 },
  ArrowLeft: { axis: 'horizontal', value: -1 },
  KeyD: { axis: 'horizontal', value: 1 },
  ArrowRight: { axis: 'horizontal', value: 1 },
};

const directionValues = new Set<Direction>([
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
  'nw',
]);

const HOLD_REPEAT_DELAY_TICKS = 2;
const HOLD_REPEAT_DELAY_MS = HOLD_REPEAT_DELAY_TICKS * TICK_DURATION_MS;
const EMPTY_ACTIONS = Object.freeze([]) as readonly InputAction[];

function readDirection(value: unknown): Direction | undefined {
  return typeof value === 'string' && directionValues.has(value as Direction)
    ? (value as Direction)
    : undefined;
}

function directionFromTarget(
  target: EventTarget | null,
): Direction | undefined {
  if (target === null || typeof target !== 'object') {
    return undefined;
  }

  const candidate = target as EventTarget & {
    closest?: (selector: string) => {
      readonly dataset?: { readonly huntDirection?: string };
      getAttribute?: (name: string) => string | null;
    } | null;
  };
  const control = candidate.closest?.('[data-hunt-direction]');
  const value =
    control?.dataset?.huntDirection ??
    control?.getAttribute?.('data-hunt-direction');
  return readDirection(value);
}

function directionFromAxes(
  horizontal: AxisValue | 0,
  vertical: AxisValue | 0,
): Direction | undefined {
  if (horizontal === 0 && vertical === 0) return undefined;
  if (horizontal === 0) return vertical < 0 ? 'n' : 's';
  if (vertical === 0) return horizontal < 0 ? 'w' : 'e';
  if (horizontal < 0) return vertical < 0 ? 'nw' : 'sw';
  return vertical < 0 ? 'ne' : 'se';
}

function axisValue(heldKeys: ReadonlySet<string>, axis: Axis): AxisValue | 0 {
  let negative = false;
  let positive = false;

  for (const [code, binding] of Object.entries(keyBindings)) {
    if (binding.axis !== axis || !heldKeys.has(code)) {
      continue;
    }
    if (binding.value < 0) negative = true;
    if (binding.value > 0) positive = true;
  }

  if (negative === positive) return 0;
  return negative ? -1 : 1;
}

export function createInputMap(options: InputMapOptions = {}): InputMap {
  const heldKeys = new Set<string>();
  const heldDpadDirections = new Set<Direction>();
  let pendingDirection: Direction | undefined;
  let holdStartedAtMs: number | undefined;
  let repeatEngaged = false;
  let attachedTarget: HTMLElement | undefined;
  let attachedWindow: Window | undefined;
  const now =
    options.now ?? (() => globalThis.performance?.now() ?? Date.now());

  const currentDirection = (): Direction | undefined => {
    const dpadDirection = [...heldDpadDirections][0];
    return (
      dpadDirection ??
      directionFromAxes(
        axisValue(heldKeys, 'horizontal'),
        axisValue(heldKeys, 'vertical'),
      )
    );
  };

  const stepAction = (direction: Direction): readonly InputAction[] =>
    Object.freeze([
      { kind: 'step', direction } as const,
    ]) as readonly InputAction[];

  const armEdge = (): void => {
    const direction = currentDirection();
    if (direction === undefined) return;
    pendingDirection = direction;
    holdStartedAtMs = now();
    repeatEngaged = false;
  };

  const onKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyBindings[keyboardEvent.code] === undefined) {
      return;
    }
    keyboardEvent.preventDefault();
    if (heldKeys.has(keyboardEvent.code)) {
      return;
    }
    heldKeys.add(keyboardEvent.code);
    armEdge();
  };

  const onKeyUp = (event: Event): void => {
    const code = (event as KeyboardEvent).code;
    if (!heldKeys.delete(code)) {
      return;
    }
    holdStartedAtMs = undefined;
    repeatEngaged = false;
  };

  const onPointerDown = (event: Event): void => {
    const direction = directionFromTarget(event.target);
    if (direction === undefined) {
      return;
    }
    event.preventDefault();
    if (heldDpadDirections.has(direction)) {
      return;
    }
    heldDpadDirections.add(direction);
    armEdge();
  };

  const onPointerUp = (event: Event): void => {
    const direction = directionFromTarget(event.target);
    if (direction === undefined) {
      heldDpadDirections.clear();
      holdStartedAtMs = undefined;
      repeatEngaged = false;
      return;
    }
    heldDpadDirections.delete(direction);
    holdStartedAtMs = undefined;
    repeatEngaged = false;
  };

  const clearHeldInput = (): void => {
    heldKeys.clear();
    heldDpadDirections.clear();
    pendingDirection = undefined;
    holdStartedAtMs = undefined;
    repeatEngaged = false;
  };

  const detach = (): void => {
    const target = attachedTarget;
    const windowTarget = attachedWindow;
    if (target === undefined && windowTarget === undefined) {
      clearHeldInput();
      return;
    }

    target?.removeEventListener('keydown', onKeyDown);
    target?.removeEventListener('keyup', onKeyUp);
    target?.removeEventListener('pointerdown', onPointerDown);
    target?.removeEventListener('pointerup', onPointerUp);
    target?.removeEventListener('pointercancel', clearHeldInput);
    target?.removeEventListener('blur', clearHeldInput);
    windowTarget?.removeEventListener('blur', clearHeldInput);
    attachedTarget = undefined;
    attachedWindow = undefined;
    clearHeldInput();
  };

  return {
    attach: (target) => {
      detach();
      attachedTarget = target;
      attachedWindow = target.ownerDocument?.defaultView ?? undefined;
      target.addEventListener('keydown', onKeyDown);
      target.addEventListener('keyup', onKeyUp);
      target.addEventListener('pointerdown', onPointerDown);
      target.addEventListener('pointerup', onPointerUp);
      target.addEventListener('pointercancel', clearHeldInput);
      target.addEventListener('blur', clearHeldInput);
      attachedWindow?.addEventListener('blur', clearHeldInput);
    },
    detach,
    drain: () => {
      const edgeDirection = pendingDirection;
      if (edgeDirection !== undefined) {
        pendingDirection = undefined;
        repeatEngaged = false;
        return stepAction(edgeDirection);
      }

      const direction = currentDirection();
      if (direction === undefined) {
        holdStartedAtMs = undefined;
        repeatEngaged = false;
        return EMPTY_ACTIONS;
      }

      if (!repeatEngaged) {
        const heldSince = holdStartedAtMs;
        if (heldSince === undefined) {
          holdStartedAtMs = now();
          return EMPTY_ACTIONS;
        }
        if (now() - heldSince < HOLD_REPEAT_DELAY_MS) {
          return EMPTY_ACTIONS;
        }
        repeatEngaged = true;
      }
      return stepAction(direction);
    },
  };
}
