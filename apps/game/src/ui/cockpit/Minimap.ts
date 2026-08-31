import type {
  Direction,
  EntityId,
  GridPosition,
  MapRegion,
  TransitionEntry,
} from '../../../../../packages/contracts/src/index.ts';
import { resolveGroundSample } from '../../hunt/GroundCompositor';
import {
  createGroundTintCache,
  formatRgb,
  type GroundTintCache,
  type ResolveGroundAsset,
  type Rgb,
  scaleRgb,
} from './GroundTint';

export interface MinimapActorView {
  readonly entityId: EntityId;
  readonly blueprintId: string;
  readonly position: GridPosition;
  readonly isPlayer: boolean;
  readonly facing?: Direction | null;
}

export interface MinimapState {
  readonly floor: number;
  readonly actors: readonly MinimapActorView[];
}

export interface MinimapOptions {
  readonly region?: MapRegion;
  readonly size?: number;
  /** Where the hunt drops the player in, marked so the way back stays visible. */
  readonly playerStart?: GridPosition;
  /** The cells that move the player between floors. */
  readonly transitions?: readonly TransitionEntry[];
  /** Resolves the tile images the ground colours are read from. */
  readonly resolveAsset?: ResolveGroundAsset;
}

export interface Minimap {
  readonly element: HTMLElement;
  render(state: MinimapState): void;
  setRegion(region: MapRegion): void;
  destroy(): void;
}

const DEFAULT_MINIMAP_SIZE = 192;
const DEFAULT_REGION: MapRegion = {
  schemaVersion: 1,
  regionId: 'empty-minimap' as MapRegion['regionId'],
  regionRevision: 1,
  origin: { x: 0, y: 0 },
  width: 1,
  height: 1,
  palette: [0],
  floors: [
    {
      z: 0,
      ground: [0],
      objectsBelow: [],
      objectsAbove: [],
      collision: [],
    },
  ],
};

/** The tone a cell wears until its own tile image has been read. */
const UNSAMPLED_GROUND: Rgb = { r: 44, g: 56, b: 78 };
const VOID_FILL = '#070b14';
const PLAYER_COLOR = '#ffd76a';
const ENTRY_COLOR = '#8ef5a3';
const DESCEND_COLOR = '#7fd8ff';
const ASCEND_COLOR = '#ffb066';

/**
 * Hues for creatures, walked in blueprint order so two species on screen never
 * share one. Unlike ground, a creature marker is a category, not a likeness:
 * what the player needs is to tell three rotworms from one dragon at a glance.
 */
const CREATURE_COLORS = [
  '#ff7b72',
  '#d2a8ff',
  '#7ee787',
  '#ffa657',
  '#79c0ff',
  '#f2cc60',
] as const;

/**
 * Buffer pixels per tile.
 *
 * The floor is drawn once at this scale and the panel shows a window onto it,
 * so following the player is a blit rather than a repaint. Fitting the whole
 * region into the panel instead put a 24-tile cave into 192 px, which is the
 * scale at which a corridor and a wall are the same smudge.
 */
const TILE_PX = 12;

function bufferWidth(region: MapRegion): number {
  return Math.max(1, region.width * TILE_PX);
}

function bufferHeight(region: MapRegion): number {
  return Math.max(1, region.height * TILE_PX);
}

function createElement(
  document: Document,
  tagName: string,
  testId: string,
): HTMLElement {
  const element = document.createElement(tagName);
  element.setAttribute('data-testid', testId);
  return element;
}

/** The unit vector the actor is looking along, in region coordinates. */
function facingVector(facing: Direction): { x: number; y: number } {
  const x = facing.includes('e') ? 1 : facing.includes('w') ? -1 : 0;
  const y = facing.includes('n') ? -1 : facing.includes('s') ? 1 : 0;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function creatureColor(blueprintId: string): string {
  let hash = 0;
  for (let index = 0; index < blueprintId.length; index += 1) {
    hash = (hash * 31 + blueprintId.charCodeAt(index)) % 1_000_003;
  }
  return CREATURE_COLORS[hash % CREATURE_COLORS.length] ?? CREATURE_COLORS[0];
}

function floorReadout(region: MapRegion, floorZ: number): string {
  const ordered = [...region.floors]
    .map((floor) => floor.z)
    .sort((left, right) => left - right);
  const position = ordered.indexOf(floorZ);
  return position < 0 || ordered.length < 2
    ? `Floor ${floorZ}`
    : `Floor ${floorZ} · ${position + 1}/${ordered.length}`;
}

/** The top-left corner of the visible window, in buffer pixels. */
interface Camera {
  readonly x: number;
  readonly y: number;
}

/**
 * Where the window looks.
 *
 * It follows the player, who therefore sits in the middle of the panel and
 * stays there: the map moves, not the marker. With no player on this floor
 * there is nothing to follow, so it falls back to the middle of the region.
 * The window is deliberately not clamped to the region — clamping would slide
 * the player off centre near an edge, and the honest answer at the edge of a
 * cave is that there is nothing further out.
 */
function cameraFor(
  region: MapRegion,
  actors: readonly MinimapActorView[],
  floorZ: number,
  size: number,
): Camera {
  const player = actors.find(
    (actor) => actor.isPlayer && actor.position.z === floorZ,
  );
  const focus =
    (player === undefined ? undefined : cellCenter(region, player.position)) ??
    ({ x: bufferWidth(region) / 2, y: bufferHeight(region) / 2 } as const);

  return { x: focus.x - size / 2, y: focus.y - size / 2 };
}

/** Paints the whole floor into the buffer and reports the client ids it used. */
function drawTerrain(
  context: CanvasRenderingContext2D | null,
  region: MapRegion,
  floorZ: number,
  tints: GroundTintCache | undefined,
): ReadonlySet<number> {
  const drawn = new Set<number>();
  if (context === null) return drawn;

  const width = bufferWidth(region);
  const height = bufferHeight(region);
  const floor = region.floors.find((entry) => entry.z === floorZ);

  context.clearRect(0, 0, width, height);
  context.fillStyle = VOID_FILL;
  context.fillRect(0, 0, width, height);

  if (floor === undefined) return drawn;

  const blocked = new Set(floor.collision);
  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      const index = y * region.width + x;
      const sample = resolveGroundSample(region, floorZ, index);
      if (sample === undefined) continue;

      const clientId = region.palette[sample.paletteIndex] ?? 0;
      drawn.add(clientId);
      const base = tints?.tint(clientId) ?? UNSAMPLED_GROUND;
      // A wall reads as mass without hiding what it is made of, and ground
      // borrowed from a floor below is dimmed so the current floor stays the
      // one in focus — the same composition the playfield draws.
      const shade = blocked.has(index)
        ? 0.5
        : sample.sourceZ === floorZ
          ? 1
          : 0.6;

      context.fillStyle = formatRgb(scaleRgb(base, shade));
      context.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
    }
  }

  return drawn;
}

/** The middle of a cell, in buffer pixels. */
function cellCenter(
  region: MapRegion,
  position: GridPosition,
): { x: number; y: number } | undefined {
  const localX = position.x - region.origin.x;
  const localY = position.y - region.origin.y;
  if (
    localX < 0 ||
    localX >= region.width ||
    localY < 0 ||
    localY >= region.height
  ) {
    return undefined;
  }
  return { x: (localX + 0.5) * TILE_PX, y: (localY + 0.5) * TILE_PX };
}

/**
 * The ways off this floor, plus the way the player came in.
 *
 * These sit on the terrain layer because they never move: a transition is a
 * property of the map, and repainting them with every step would put static
 * marks on the layer that exists to be cheap.
 */
function drawLandmarks(
  context: CanvasRenderingContext2D | null,
  region: MapRegion,
  floorZ: number,
  transitions: readonly TransitionEntry[],
  playerStart: GridPosition | undefined,
): void {
  if (context === null) return;

  const radius = TILE_PX * 0.42;

  for (const transition of transitions) {
    if (transition.from.z !== floorZ) continue;
    const center = cellCenter(region, transition.from);
    if (center === undefined) continue;

    // Canary counts z downward, so a larger target floor is deeper in.
    const descends = transition.to.z > transition.from.z;
    context.fillStyle = descends ? DESCEND_COLOR : ASCEND_COLOR;
    context.beginPath();
    context.moveTo(center.x, center.y + (descends ? radius : -radius));
    context.lineTo(center.x - radius, center.y + (descends ? -radius : radius));
    context.lineTo(center.x + radius, center.y + (descends ? -radius : radius));
    context.closePath();
    context.fill();
  }

  if (playerStart === undefined || playerStart.z !== floorZ) return;
  const entry = cellCenter(region, playerStart);
  if (entry === undefined) return;

  context.strokeStyle = ENTRY_COLOR;
  context.lineWidth = Math.max(1, TILE_PX * 0.18);
  context.beginPath();
  context.arc(entry.x, entry.y, radius, 0, Math.PI * 2);
  context.stroke();
}

function drawActors(
  context: CanvasRenderingContext2D | null,
  actors: readonly MinimapActorView[],
  region: MapRegion,
  floorZ: number,
  size: number,
  camera: Camera,
): void {
  if (context === null) return;

  const markerSize = TILE_PX * 0.72;

  context.clearRect(0, 0, size, size);
  for (const actor of actors) {
    if (actor.position.z !== floorZ) continue;
    const buffer = cellCenter(region, actor.position);
    if (buffer === undefined) continue;
    const center = { x: buffer.x - camera.x, y: buffer.y - camera.y };
    if (
      center.x < -TILE_PX ||
      center.y < -TILE_PX ||
      center.x > size + TILE_PX ||
      center.y > size + TILE_PX
    ) {
      continue;
    }

    if (!actor.isPlayer) {
      context.fillStyle = creatureColor(actor.blueprintId);
      context.beginPath();
      context.arc(center.x, center.y, markerSize / 2, 0, Math.PI * 2);
      context.fill();
      continue;
    }

    // The player is an arrow rather than a dot because a dot answers only one
    // of the two questions the panel exists for: it says where, never which way.
    const reach = markerSize * 0.85;
    const heading = facingVector(actor.facing ?? 's');
    const side = { x: -heading.y, y: heading.x };
    context.fillStyle = PLAYER_COLOR;
    context.strokeStyle = '#1b1204';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(center.x + heading.x * reach, center.y + heading.y * reach);
    context.lineTo(
      center.x - heading.x * reach * 0.6 + side.x * reach * 0.62,
      center.y - heading.y * reach * 0.6 + side.y * reach * 0.62,
    );
    context.lineTo(
      center.x - heading.x * reach * 0.6 - side.x * reach * 0.62,
      center.y - heading.y * reach * 0.6 - side.y * reach * 0.62,
    );
    context.closePath();
    context.fill();
    context.stroke();
  }
}

export function mountMinimap(
  root: HTMLElement,
  options: MinimapOptions = {},
): Minimap {
  const document = root.ownerDocument;
  const size = options.size ?? DEFAULT_MINIMAP_SIZE;
  const transitions = options.transitions ?? [];
  let region = options.region ?? DEFAULT_REGION;
  let terrainSignature: string | undefined;
  let floorLabelValue: string | undefined;
  let renderedActors: readonly MinimapActorView[] | undefined;
  let renderedFloor: number | undefined;
  let paintedFloor: number | undefined;
  let terrainRedraws = 0;
  let actorRedraws = 0;

  const element = createElement(document, 'section', 'combat-minimap');
  element.className = 'cockpit-panel cockpit-minimap';
  element.setAttribute('aria-label', 'Minimap');
  const header = createElement(document, 'div', 'combat-minimap-header');
  const title = createElement(document, 'span', 'combat-minimap-title');
  title.textContent = 'Minimap';
  const floorLabel = createElement(document, 'span', 'combat-minimap-floor');
  header.append(title, floorLabel);

  const viewport = createElement(document, 'div', 'combat-minimap-viewport');
  const terrainCanvas = createElement(
    document,
    'canvas',
    'combat-minimap-terrain',
  ) as HTMLCanvasElement;
  const actorsCanvas = createElement(
    document,
    'canvas',
    'combat-minimap-actors',
  ) as HTMLCanvasElement;
  for (const canvas of [terrainCanvas, actorsCanvas]) {
    canvas.width = size;
    canvas.height = size;
    canvas.setAttribute('aria-hidden', 'true');
  }
  viewport.append(terrainCanvas, actorsCanvas);
  element.append(header, viewport);
  root.append(element);

  const legend = createElement(document, 'div', 'combat-minimap-legend');
  for (const [testId, label] of [
    ['combat-minimap-legend-entry', 'Entry'],
    ['combat-minimap-legend-down', 'Down'],
    ['combat-minimap-legend-up', 'Up'],
  ] as const) {
    const item = createElement(document, 'span', testId);
    item.textContent = label;
    legend.append(item);
  }
  element.append(legend);

  const terrainBuffer = document.createElement('canvas') as HTMLCanvasElement;
  const sizeBuffer = (): void => {
    terrainBuffer.width = bufferWidth(region);
    terrainBuffer.height = bufferHeight(region);
  };
  sizeBuffer();
  const terrainContext =
    typeof terrainBuffer.getContext === 'function'
      ? terrainBuffer.getContext('2d')
      : null;
  const visibleTerrainContext =
    typeof terrainCanvas.getContext === 'function'
      ? terrainCanvas.getContext('2d')
      : null;
  const actorContext =
    typeof actorsCanvas.getContext === 'function'
      ? actorsCanvas.getContext('2d')
      : null;

  let tints: GroundTintCache | undefined;
  let paintedClientIds: ReadonlySet<number> = new Set();
  let camera: Camera = { x: 0, y: 0 };

  /**
   * Blits the window the camera is looking at onto the visible canvas.
   *
   * The source rectangle is clipped to the buffer by hand and drawn at the
   * matching destination offset. Handing a canvas an out-of-bounds source
   * rectangle makes it scale what it does have to fill the destination, which
   * would stretch the map every time the player walked near an edge.
   */
  const composite = (): void => {
    if (visibleTerrainContext === null || terrainContext === null) return;

    visibleTerrainContext.clearRect(0, 0, size, size);
    visibleTerrainContext.fillStyle = VOID_FILL;
    visibleTerrainContext.fillRect(0, 0, size, size);

    const left = Math.max(0, camera.x);
    const top = Math.max(0, camera.y);
    const right = Math.min(terrainBuffer.width, camera.x + size);
    const bottom = Math.min(terrainBuffer.height, camera.y + size);
    if (right <= left || bottom <= top) return;

    visibleTerrainContext.drawImage(
      terrainBuffer,
      left,
      top,
      right - left,
      bottom - top,
      left - camera.x,
      top - camera.y,
      right - left,
      bottom - top,
    );
  };

  const paintTerrain = (floorZ: number): void => {
    paintedFloor = floorZ;
    // The detached buffer is intentionally repainted only when the region,
    // floor or a ground colour changes; actor movement only moves the window.
    paintedClientIds = drawTerrain(terrainContext, region, floorZ, tints);
    // Ask for this floor's colours as soon as it is known to need them. Ids
    // already read or in flight are skipped, so the repaint this may cause
    // cannot feed back into itself.
    tints?.prime(paintedClientIds);
    drawLandmarks(
      terrainContext,
      region,
      floorZ,
      transitions,
      options.playerStart,
    );
    composite();
  };

  // A sampled colour arriving is a property of the map, not of the frame, so it
  // repaints without counting as a redraw the movement probes would read.
  if (options.resolveAsset !== undefined) {
    tints = createGroundTintCache(document, options.resolveAsset, () => {
      if (paintedFloor !== undefined) paintTerrain(paintedFloor);
    });
  }

  const render = (state: MinimapState): void => {
    // The hunt pack finishes loading after the cockpit mounts, so the ids this
    // floor needs are offered again each frame until they resolve. Priming is a
    // set lookup per id; the repaint only follows a colour actually arriving.
    tints?.prime(paintedClientIds);

    const readout = floorReadout(region, state.floor);
    if (floorLabelValue !== readout) {
      floorLabelValue = readout;
      floorLabel.textContent = readout;
    }
    const nextCamera = cameraFor(region, state.actors, state.floor, size);
    const cameraMoved = nextCamera.x !== camera.x || nextCamera.y !== camera.y;
    camera = nextCamera;

    const nextSignature = `${region.regionId}:${region.regionRevision}:${state.floor}`;
    if (terrainSignature !== nextSignature) {
      terrainSignature = nextSignature;
      terrainRedraws += 1;
      paintTerrain(state.floor);
      element.setAttribute('data-terrain-redraws', String(terrainRedraws));
    } else if (cameraMoved) {
      // Walking slides the window over a buffer that is already painted, so
      // following the player costs one blit and no terrain work at all.
      composite();
    }

    if (
      renderedActors !== state.actors ||
      renderedFloor !== state.floor ||
      cameraMoved
    ) {
      renderedActors = state.actors;
      renderedFloor = state.floor;
      actorRedraws += 1;
      drawActors(actorContext, state.actors, region, state.floor, size, camera);
      element.setAttribute('data-actor-redraws', String(actorRedraws));
    }
  };

  return {
    element,
    render,
    setRegion: (nextRegion) => {
      region = nextRegion;
      sizeBuffer();
      terrainSignature = undefined;
      renderedActors = undefined;
      renderedFloor = undefined;
    },
    destroy: () => {
      tints?.destroy();
      element.remove();
    },
  };
}
