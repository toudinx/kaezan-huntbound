/**
 * What each action does to the ground around the knight, drawn on a 5x5 grid.
 *
 * The Tibia spell icon sits beside this glyph: the icon says *which* spell,
 * while this says *where it lands*, which is the thing the player is actually
 * choosing between.
 *
 * Presentation only. The shapes are keyed by ability id and written out by
 * hand; reading radius off the ability definition would put a rule about how
 * far Groundshaker reaches inside a UI component, which `40-game.mdc` forbids.
 */

const GRID = 5;
const CENTRE = 2;

export type GlyphCellState = 'origin' | 'hit' | 'edge' | 'path';

interface GlyphShape {
  /** Keyed `x,y` on the 5x5 grid, with the knight at `2,2`. */
  readonly cells: ReadonlyMap<string, GlyphCellState>;
  /** Decoration the stylesheet draws on the origin cell. */
  readonly mark: string;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function build(
  mark: string,
  entries: readonly (readonly [number, number, GlyphCellState])[],
): GlyphShape {
  const cells = new Map<string, GlyphCellState>();
  for (const [x, y, state] of entries) cells.set(key(x, y), state);
  return { cells, mark };
}

function ring(
  distance: number,
  state: GlyphCellState,
): (readonly [number, number, GlyphCellState])[] {
  const entries: (readonly [number, number, GlyphCellState])[] = [];

  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const chebyshev = Math.max(Math.abs(x - CENTRE), Math.abs(y - CENTRE));
      if (chebyshev === distance) entries.push([x, y, state]);
    }
  }

  return entries;
}

function disc(
  state: GlyphCellState,
): (readonly [number, number, GlyphCellState])[] {
  return [...ring(1, state), ...ring(2, state)];
}

/**
 * No two shapes may share a cell set, or the deck would have two cells the
 * player cannot tell apart without reading the label -- which is the whole
 * point of drawing them.
 */
const SHAPES: ReadonlyMap<string, GlyphShape> = new Map([
  // Swings at whatever is in front; the knight himself is not the subject.
  ['auto-attack', build('strike', [[3, 2, 'hit']])],
  // Radius 1 around the caster, everything in it.
  ['berserk', build('burst', [[CENTRE, CENTRE, 'origin'], ...ring(1, 'hit')])],
  // One target, one tile away.
  [
    'brutal-strike',
    build('pierce', [
      [CENTRE, CENTRE, 'origin'],
      [3, 2, 'hit'],
    ]),
  ],
  // Radius 3: past the edge of a 5x5 window, so the window fills.
  [
    'groundshaker',
    build('quake', [[CENTRE, CENTRE, 'origin'], ...disc('hit')]),
  ],
  // Leaves the caster and comes back; range 5, so it runs off the window.
  [
    'whirlwind-throw',
    build('throw', [
      [CENTRE, CENTRE, 'origin'],
      [3, 2, 'hit'],
      [4, 2, 'hit'],
      [4, 1, 'edge'],
      [4, 3, 'edge'],
    ]),
  ],
  // Heals the tile he is standing on and nothing else.
  ['wound-cleansing', build('cross', [[CENTRE, CENTRE, 'origin']])],
  // Same radius as Berserk, but it pulls rather than hits: hollow, not filled.
  [
    'challenge',
    build('taunt', [[CENTRE, CENTRE, 'origin'], ...ring(1, 'edge')]),
  ],
  // Modes, not casts: the diagonals open outward, the far ring closes in.
  [
    'blood-rage',
    build('stance-open', [
      [CENTRE, CENTRE, 'origin'],
      [1, 1, 'hit'],
      [3, 1, 'hit'],
      [1, 3, 'hit'],
      [3, 3, 'hit'],
    ]),
  ],
  [
    'protector',
    build('stance-closed', [[CENTRE, CENTRE, 'origin'], ...ring(2, 'edge')]),
  ],
  // Moves him: the trail is where he has been.
  [
    'haste',
    build('trail', [
      [CENTRE, CENTRE, 'origin'],
      [1, 2, 'path'],
      [0, 2, 'path'],
    ]),
  ],
]);

export interface AbilityIconAsset {
  readonly mediaUrl: string;
}

/** The stable manifest key delivered by PB-17-01 for one spell icon. */
export function spellIconAssetKey(abilityId: string): string {
  return `spell:tibia:${abilityId}`;
}

/**
 * Builds the real Tibia icon when the hunt pack has resolved it. An absent
 * asset keeps the area glyph alive as a useful fallback while the pack is
 * loading or when a future ability has no personal art yet.
 */
export function createAbilityIcon(
  document: Document,
  abilityId: string,
  asset: AbilityIconAsset | undefined,
): HTMLElement | undefined {
  if (asset === undefined) return undefined;

  const icon = document.createElement('span');
  icon.className = 'cockpit-cell__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('data-asset-key', spellIconAssetKey(abilityId));

  const image = document.createElement('img') as HTMLImageElement;
  image.className = 'cockpit-cell__icon-image';
  image.setAttribute('src', asset.mediaUrl);
  image.setAttribute('alt', '');
  image.setAttribute('aria-hidden', 'true');
  image.setAttribute('draggable', 'false');
  icon.append(image);

  return icon;
}

/** The shape ids this module can draw, for callers that want to check first. */
export function hasAbilityGlyph(abilityId: string): boolean {
  return SHAPES.has(abilityId);
}

/**
 * Builds the glyph for one action. An id with no shape draws an empty grid
 * rather than nothing at all, so the cell keeps its size and the deck does not
 * reflow when a future ability arrives before its shape does.
 */
export function createAbilityGlyph(
  document: Document,
  abilityId: string,
): HTMLElement {
  const shape = SHAPES.get(abilityId);
  const glyph = document.createElement('span');
  glyph.className = 'cockpit-glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.setAttribute('data-glyph', abilityId);
  glyph.setAttribute('data-glyph-mark', shape?.mark ?? 'none');

  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const cell = document.createElement('span');
      cell.className = 'cockpit-glyph__cell';
      cell.setAttribute('data-cell', shape?.cells.get(key(x, y)) ?? 'off');
      glyph.append(cell);
    }
  }

  return glyph;
}
