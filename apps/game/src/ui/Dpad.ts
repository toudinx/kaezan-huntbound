import type { Direction } from '../../../../packages/contracts/src/index.ts';

import type { InputMap } from '../input/InputMap';

export interface Dpad {
  destroy(): void;
}

const directions: readonly {
  readonly direction: Direction;
  readonly label: string;
  readonly glyph: string;
}[] = [
  { direction: 'nw', label: 'Move northwest', glyph: '↖' },
  { direction: 'n', label: 'Move north', glyph: '↑' },
  { direction: 'ne', label: 'Move northeast', glyph: '↗' },
  { direction: 'w', label: 'Move west', glyph: '←' },
  { direction: 'e', label: 'Move east', glyph: '→' },
  { direction: 'sw', label: 'Move southwest', glyph: '↙' },
  { direction: 's', label: 'Move south', glyph: '↓' },
  { direction: 'se', label: 'Move southeast', glyph: '↘' },
];

export function mountDpad(root: HTMLElement, input: InputMap): Dpad {
  void input;
  const document = root.ownerDocument;
  const nav = document.createElement('nav');
  nav.className = 'hunt-dpad';
  nav.setAttribute('aria-label', 'Movement controls');
  nav.setAttribute('data-testid', 'hunt-dpad');

  for (const item of directions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hunt-dpad__button';
    button.setAttribute('data-hunt-direction', item.direction);
    button.setAttribute('aria-label', item.label);
    button.textContent = item.glyph;
    nav.append(button);
  }

  root.replaceChildren(nav);
  let destroyed = false;

  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      root.replaceChildren();
    },
  };
}
