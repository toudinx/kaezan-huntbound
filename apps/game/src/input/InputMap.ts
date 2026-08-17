import {
  type Direction,
  TICK_DURATION_MS,
} from '../../../../packages/contracts/src/index.ts';

export type InputAction =
  | { readonly kind: 'step'; readonly direction: Direction }
  | { readonly kind: 'face'; readonly direction: Direction }
  | { readonly kind: 'attack' }
  | { readonly kind: 'cast-ability'; readonly abilityIndex: number }
  | { readonly kind: 'cycle-target' };

export interface InputMap {
  attach(target: HTMLElement): void;
  detach(): void;
  drain(tick?: number): readonly InputAction[];
  /** Ends a hold without dropping a pending edge that has not been drained. */
  releaseHeld(): void;
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

type CombatInputAction = Exclude<
  InputAction,
  { readonly kind: 'step' | 'face' }
>;

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

const combatKeyBindings: Readonly<Record<string, CombatInputAction>> = {
  Space: { kind: 'attack' },
  Enter: { kind: 'attack' },
  Digit1: { kind: 'cast-ability', abilityIndex: 0 },
  Digit2: { kind: 'cast-ability', abilityIndex: 1 },
  Digit3: { kind: 'cast-ability', abilityIndex: 2 },
  Numpad1: { kind: 'cast-ability', abilityIndex: 0 },
  Numpad2: { kind: 'cast-ability', abilityIndex: 1 },
  Numpad3: { kind: 'cast-ability', abilityIndex: 2 },
  Tab: { kind: 'cycle-target' },
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

function readCombatAction(value: unknown): CombatInputAction | undefined {
  if (value === 'attack') return { kind: 'attack' };
  if (value === 'cycle-target') return { kind: 'cycle-target' };
  if (typeof value !== 'string' || !value.startsWith('ability:')) {
    return undefined;
  }

  const index = Number(value.slice('ability:'.length));
  return Number.isSafeInteger(index) && index >= 0
    ? { kind: 'cast-ability', abilityIndex: index }
    : undefined;
}

function combatActionFromTarget(
  target: EventTarget | null,
): CombatInputAction | undefined {
  if (target === null || typeof target !== 'object') {
    return undefined;
  }

  const candidate = target as EventTarget & {
    closest?: (selector: string) => {
      readonly dataset?: { readonly huntAction?: string };
      getAttribute?: (name: string) => string | null;
    } | null;
  };
  const control = candidate.closest?.('[data-hunt-action]');
  const value =
    control?.dataset?.huntAction ?? control?.getAttribute?.('data-hunt-action');
  return readCombatAction(value);
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
  const heldCombatKeys = new Set<string>();
  const heldDpadDirections = new Set<Direction>();
  let pendingDirection: Direction | undefined;
  let pendingCombatAction: CombatInputAction | undefined;
  let holdStartedAtMs: number | undefined;
  let holdGateTicks = 0;
  let lastHoldTick: number | undefined;
  let repeatEngaged = false;
  let attachedTarget: HTMLElement | undefined;
  let attachedWindow: Window | undefined;
  const windowCapture: AddEventListenerOptions = { capture: true };
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
    holdGateTicks = 0;
    lastHoldTick = undefined;
    repeatEngaged = false;
  };

  const onKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    const combatAction = combatKeyBindings[keyboardEvent.code];
    if (combatAction !== undefined) {
      keyboardEvent.preventDefault();
      if (keyboardEvent.repeat || heldCombatKeys.has(keyboardEvent.code)) {
        return;
      }
      heldCombatKeys.add(keyboardEvent.code);
      pendingCombatAction ??= combatAction;
      return;
    }

    if (keyBindings[keyboardEvent.code] === undefined) {
      return;
    }
    keyboardEvent.preventDefault();
    if (keyboardEvent.repeat || heldKeys.has(keyboardEvent.code)) {
      return;
    }
    heldKeys.add(keyboardEvent.code);
    armEdge();
  };

  const onKeyUp = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    const identity = keyboardEvent.code || keyboardEvent.key;
    if (combatKeyBindings[identity] !== undefined) {
      heldCombatKeys.delete(identity);
      return;
    }

    if (!identity) {
      if (heldKeys.size === 0) {
        return;
      }
      heldKeys.clear();
    } else if (!heldKeys.delete(identity)) {
      return;
    }
    holdStartedAtMs = undefined;
    holdGateTicks = 0;
    lastHoldTick = undefined;
    repeatEngaged = false;
  };

  const onPointerDown = (event: Event): void => {
    const combatAction = combatActionFromTarget(event.target);
    if (combatAction !== undefined) {
      event.preventDefault();
      const pointerEvent = event as PointerEvent;
      const captureTarget = attachedTarget;
      if (
        captureTarget !== undefined &&
        typeof pointerEvent.pointerId === 'number' &&
        typeof captureTarget.setPointerCapture === 'function'
      ) {
        try {
          captureTarget.setPointerCapture(pointerEvent.pointerId);
        } catch {
          // Capture is best-effort: a lost pointerup still reaches the window listener.
        }
      }
      pendingCombatAction ??= combatAction;
      return;
    }

    const direction = directionFromTarget(event.target);
    if (direction === undefined) {
      return;
    }
    event.preventDefault();
    const pointerEvent = event as PointerEvent;
    const captureTarget = attachedTarget;
    if (
      captureTarget !== undefined &&
      typeof pointerEvent.pointerId === 'number' &&
      typeof captureTarget.setPointerCapture === 'function'
    ) {
      try {
        captureTarget.setPointerCapture(pointerEvent.pointerId);
      } catch {
        // Capture is best-effort: a lost pointerup still reaches the window listener.
      }
    }
    if (heldDpadDirections.has(direction)) {
      return;
    }
    heldDpadDirections.add(direction);
    armEdge();
  };

  const onPointerUp = (event: Event): void => {
    if (combatActionFromTarget(event.target) !== undefined) {
      return;
    }

    const direction = directionFromTarget(event.target);
    if (direction === undefined) {
      heldDpadDirections.clear();
      holdStartedAtMs = undefined;
      holdGateTicks = 0;
      lastHoldTick = undefined;
      repeatEngaged = false;
      return;
    }
    heldDpadDirections.delete(direction);
    holdStartedAtMs = undefined;
    holdGateTicks = 0;
    lastHoldTick = undefined;
    repeatEngaged = false;
  };

  const releaseHeld = (): void => {
    heldKeys.clear();
    heldCombatKeys.clear();
    heldDpadDirections.clear();
    holdStartedAtMs = undefined;
    holdGateTicks = 0;
    lastHoldTick = undefined;
    repeatEngaged = false;
  };

  const clearHeldInput = (): void => {
    pendingDirection = undefined;
    pendingCombatAction = undefined;
    releaseHeld();
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
    windowTarget?.removeEventListener('keyup', onKeyUp, windowCapture);
    windowTarget?.removeEventListener('pointerup', onPointerUp, windowCapture);
    windowTarget?.removeEventListener(
      'pointercancel',
      clearHeldInput,
      windowCapture,
    );
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
      attachedWindow?.addEventListener('keyup', onKeyUp, windowCapture);
      attachedWindow?.addEventListener('pointerup', onPointerUp, windowCapture);
      attachedWindow?.addEventListener(
        'pointercancel',
        clearHeldInput,
        windowCapture,
      );
      attachedWindow?.addEventListener('blur', clearHeldInput);
    },
    detach,
    releaseHeld,
    drain: (tick) => {
      const combatAction = pendingCombatAction;
      if (combatAction !== undefined) {
        pendingCombatAction = undefined;
        return Object.freeze([combatAction]) as readonly InputAction[];
      }

      const edgeDirection = pendingDirection;
      if (edgeDirection !== undefined) {
        pendingDirection = undefined;
        holdStartedAtMs = now();
        holdGateTicks = 0;
        lastHoldTick = tick;
        repeatEngaged = false;
        return stepAction(edgeDirection);
      }

      const direction = currentDirection();
      if (direction === undefined) {
        holdStartedAtMs = undefined;
        holdGateTicks = 0;
        lastHoldTick = undefined;
        repeatEngaged = false;
        return EMPTY_ACTIONS;
      }

      if (tick !== undefined) {
        if (lastHoldTick === tick) {
          return repeatEngaged ? stepAction(direction) : EMPTY_ACTIONS;
        }
        lastHoldTick = tick;
        holdGateTicks += 1;
        if (holdGateTicks < HOLD_REPEAT_DELAY_TICKS) {
          return EMPTY_ACTIONS;
        }
        repeatEngaged = true;
        return stepAction(direction);
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
