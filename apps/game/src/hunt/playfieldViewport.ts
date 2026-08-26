import { TARGET_VISIBLE_ROWS } from './CameraFraming';

/**
 * The one place that knows where the play area ends.
 *
 * The cockpit frame overlays a full-bleed canvas, so "playfield" in ADR-001 is
 * the *visible* play area rather than the whole canvas: the frame is what says
 * where it stops. Two consumers need that answer and they must never disagree
 * -- the stylesheet, which sizes the frame, and the camera, which centres the
 * player inside what the frame left over. A deck the CSS draws 108 px tall and
 * a camera that assumed 100 puts the knight eight pixels low, and no unit test
 * of either half would see it. So both read this module: the CSS through the
 * custom properties `CockpitLayout` publishes, the camera through
 * `playfieldCameraOffset`.
 */

export interface PlayfieldViewportSize {
  readonly width: number;
  readonly height: number;
}

/** How much of each edge the cockpit frame claims, in CSS pixels. */
export interface PlayfieldInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface PlayfieldRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The play area the frame may never shrink past. Below these the cockpit gives
 * up its own measures instead: a HUD that fits at the cost of the game is the
 * failure this whole task exists to avoid, and the honest correction when a
 * viewport cannot hold both is to argue about *these two numbers*, in one
 * place, rather than to grow a second layout.
 */
export const MIN_PLAYFIELD_WIDTH = 260;
export const MIN_PLAYFIELD_HEIGHT = 320;

/**
 * Below this the rail has nowhere to go and the d-pad cannot share a row with
 * the deck, so the bottom band stacks and the top band carries the panels the
 * rail would otherwise hold.
 */
const COMPACT_WIDTH = 700;

const COMPACT_TOP_BAND = 112;
const WIDE_TOP_BAND = 56;
const COMPACT_BOTTOM_BAND = 236;
const MIN_WIDE_BOTTOM_BAND = 128;
const MAX_WIDE_BOTTOM_BAND = 176;
const WIDE_BOTTOM_BAND_RATIO = 0.13;
const MIN_ARC_BAND = 44;
const MAX_ARC_BAND = 92;
const ARC_BAND_RATIO = 0.11;
const RAIL_BAND = 208;

/**
 * How wide the play window is allowed to get, in tiles.
 *
 * The camera frames `TARGET_VISIBLE_ROWS` rows however tall the window is, but
 * nothing was capping the *width*, so on a 2560 px monitor the free area ran
 * the whole way across and the arcs ended up a thousand pixels from where the
 * player is looking. Reported at playtest on 2026-08-25: "os arcos deveriam
 * estar mais centralizados, a ideia e o jogador olhar sempre o centro da tela".
 *
 * Capping costs no view. The canvas is full-bleed and the frame floats over it,
 * so the world still draws behind the arcs and past them -- the cap moves the
 * arcs inward, it does not crop the game. Nine against eleven rows makes the
 * window a little taller than it is wide, which is the shape a top-down grid
 * reads best in.
 */
const PLAYFIELD_MAX_COLUMNS = 7;

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be positive finite`);
  }
}

function assertViewport(size: PlayfieldViewportSize): void {
  assertPositiveFinite('viewportWidth', size.width);
  assertPositiveFinite('viewportHeight', size.height);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

/**
 * Scales a pair of opposing bands down until what is left between them clears
 * `minimum`. Both shrink by the same factor so the free area keeps its place
 * on the axis instead of sliding into whichever band happened to be thinner.
 */
function fitBands(
  extent: number,
  minimum: number,
  near: number,
  far: number,
): { readonly near: number; readonly far: number } {
  const budget = extent - minimum;

  if (budget <= 0) return { near: 0, far: 0 };

  const claimed = near + far;

  if (claimed <= budget) return { near, far };

  const factor = budget / claimed;
  return { near: near * factor, far: far * factor };
}

/**
 * Splits the width between the two side bands.
 *
 * Preferred shape: the play window sits on the middle of the canvas, with the
 * rail's width mirrored on the left so that centring is real rather than
 * nominal. The mirror is dead space, and it is worth it -- the player watches
 * the middle of the screen, so that is where his knight and his two gauges have
 * to be.
 *
 * When mirroring would push the window under its minimum, the mirror is what
 * gets dropped: the window hugs the left band and takes whatever the rail
 * leaves. A narrow laptop keeps a playable window and loses only the symmetry.
 */
function horizontalBands(
  size: PlayfieldViewportSize,
  arc: number,
  rail: number,
): { readonly left: number; readonly right: number } {
  const tile = size.height / TARGET_VISIBLE_ROWS;
  const maximumWidth = PLAYFIELD_MAX_COLUMNS * tile;
  const mirrored = Math.min(maximumWidth, size.width - 2 * (arc + rail));

  if (mirrored >= MIN_PLAYFIELD_WIDTH) {
    const side = (size.width - mirrored) / 2;
    return { left: side, right: side };
  }

  const bands = fitBands(size.width, MIN_PLAYFIELD_WIDTH, arc, arc + rail);
  const available = size.width - bands.near - bands.far;
  // The cap never takes the window below the minimum: on a viewport too small
  // to hold both, the chrome is what gives way, not the game.
  const width = Math.max(
    Math.min(maximumWidth, available),
    Math.min(available, MIN_PLAYFIELD_WIDTH),
  );
  const slack = (available - width) / 2;

  return { left: bands.near + slack, right: bands.far + slack };
}

export function playfieldInsets(size: PlayfieldViewportSize): PlayfieldInsets {
  assertViewport(size);

  const compact = size.width < COMPACT_WIDTH;
  const arc = clamp(
    Math.round(size.width * ARC_BAND_RATIO),
    MIN_ARC_BAND,
    MAX_ARC_BAND,
  );
  const horizontal = horizontalBands(size, arc, compact ? 0 : RAIL_BAND);
  const vertical = fitBands(
    size.height,
    MIN_PLAYFIELD_HEIGHT,
    compact ? COMPACT_TOP_BAND : WIDE_TOP_BAND,
    compact
      ? COMPACT_BOTTOM_BAND
      : clamp(
          Math.round(size.height * WIDE_BOTTOM_BAND_RATIO),
          MIN_WIDE_BOTTOM_BAND,
          MAX_WIDE_BOTTOM_BAND,
        ),
  );

  return {
    top: vertical.near,
    right: horizontal.right,
    bottom: vertical.far,
    left: horizontal.left,
  };
}

/** The arc band width, which both side bands reserve next to the play window. */
export function playfieldArcBand(size: PlayfieldViewportSize): number {
  assertViewport(size);

  return clamp(
    Math.round(size.width * ARC_BAND_RATIO),
    MIN_ARC_BAND,
    MAX_ARC_BAND,
  );
}

/** The rail band width, zero on a viewport with no room for one. */
export function playfieldRailBand(size: PlayfieldViewportSize): number {
  assertViewport(size);

  return size.width < COMPACT_WIDTH ? 0 : RAIL_BAND;
}

export function playfieldRect(size: PlayfieldViewportSize): PlayfieldRect {
  const insets = playfieldInsets(size);

  return {
    x: insets.left,
    y: insets.top,
    width: size.width - insets.left - insets.right,
    height: size.height - insets.top - insets.bottom,
  };
}

/** Where the free area's centre sits relative to the canvas centre, in CSS px. */
export function playfieldCentreOffset(size: PlayfieldViewportSize): {
  readonly x: number;
  readonly y: number;
} {
  const rect = playfieldRect(size);

  return {
    x: rect.x + rect.width / 2 - size.width / 2,
    y: rect.y + rect.height / 2 - size.height / 2,
  };
}

/**
 * World pixels to subtract from the follow target so the player lands on the
 * free centre instead of the canvas centre.
 *
 * Phaser holds `scroll + viewport / 2` under the camera centre and applies zoom
 * around it, so moving the player off that centre by `d` screen pixels means
 * moving the followed world point by `d / zoom`. `render` is the backing store
 * the renderer allocates, which the resolution cap can make smaller than the
 * CSS box the frame is measured in; spending a CSS-pixel offset in render
 * pixels would miss the free centre by exactly the cap ratio.
 */
export function playfieldCameraOffset(input: {
  readonly viewport: PlayfieldViewportSize;
  readonly render: PlayfieldViewportSize;
  readonly zoom: number;
}): { readonly x: number; readonly y: number } {
  assertViewport(input.viewport);
  assertPositiveFinite('renderWidth', input.render.width);
  assertPositiveFinite('renderHeight', input.render.height);
  assertPositiveFinite('zoom', input.zoom);

  const offset = playfieldCentreOffset(input.viewport);

  return {
    x: (offset.x * (input.render.width / input.viewport.width)) / input.zoom,
    y: (offset.y * (input.render.height / input.viewport.height)) / input.zoom,
  };
}
