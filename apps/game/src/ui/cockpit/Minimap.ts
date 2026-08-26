import type {
  EntityId,
  GridPosition,
  MapRegion,
} from '../../../../../packages/contracts/src/index.ts';

export interface MinimapActorView {
  readonly entityId: EntityId;
  readonly blueprintId: string;
  readonly position: GridPosition;
  readonly isPlayer: boolean;
}

export interface MinimapState {
  readonly floor: number;
  readonly actors: readonly MinimapActorView[];
}

export interface MinimapOptions {
  readonly region?: MapRegion;
  readonly size?: number;
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

function createElement(
  document: Document,
  tagName: string,
  testId: string,
): HTMLElement {
  const element = document.createElement(tagName);
  element.setAttribute('data-testid', testId);
  return element;
}

function colorForGround(ground: number, palette: readonly number[]): string {
  const paletteValue = palette[ground] ?? ground;
  const hue = Math.abs(paletteValue * 47 + 191) % 360;
  return `hsl(${hue} 34% 30%)`;
}

function drawTerrain(
  context: CanvasRenderingContext2D | null,
  region: MapRegion,
  floorZ: number,
  size: number,
): void {
  if (context === null) return;

  const floor = region.floors.find((entry) => entry.z === floorZ);
  const tileSize = Math.min(size / region.width, size / region.height);
  const drawnWidth = tileSize * region.width;
  const drawnHeight = tileSize * region.height;
  const offsetX = (size - drawnWidth) / 2;
  const offsetY = (size - drawnHeight) / 2;

  context.clearRect(0, 0, size, size);
  context.fillStyle = '#0a1120';
  context.fillRect(0, 0, size, size);

  if (floor === undefined) return;

  const blocked = new Set(floor.collision);
  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      const index = y * region.width + x;
      context.fillStyle = blocked.has(index)
        ? '#26334a'
        : colorForGround(floor.ground[index] ?? 0, region.palette);
      context.fillRect(
        offsetX + x * tileSize,
        offsetY + y * tileSize,
        Math.ceil(tileSize),
        Math.ceil(tileSize),
      );
    }
  }
}

function drawActors(
  context: CanvasRenderingContext2D | null,
  actors: readonly MinimapActorView[],
  region: MapRegion,
  floorZ: number,
  size: number,
): void {
  if (context === null) return;

  const tileSize = Math.min(size / region.width, size / region.height);
  const drawnWidth = tileSize * region.width;
  const drawnHeight = tileSize * region.height;
  const offsetX = (size - drawnWidth) / 2;
  const offsetY = (size - drawnHeight) / 2;
  const markerSize = Math.max(4, Math.min(9, tileSize * 0.62));

  context.clearRect(0, 0, size, size);
  for (const actor of actors) {
    if (actor.position.z !== floorZ) continue;
    const localX = actor.position.x - region.origin.x;
    const localY = actor.position.y - region.origin.y;
    if (
      localX < 0 ||
      localX >= region.width ||
      localY < 0 ||
      localY >= region.height
    ) {
      continue;
    }
    context.fillStyle = actor.isPlayer ? '#f6d365' : '#ff7b72';
    context.fillRect(
      offsetX + localX * tileSize + (tileSize - markerSize) / 2,
      offsetY + localY * tileSize + (tileSize - markerSize) / 2,
      markerSize,
      markerSize,
    );
  }
}

export function mountMinimap(
  root: HTMLElement,
  options: MinimapOptions = {},
): Minimap {
  const document = root.ownerDocument;
  const size = options.size ?? DEFAULT_MINIMAP_SIZE;
  let region = options.region ?? DEFAULT_REGION;
  let terrainSignature: string | undefined;
  let floorLabelValue: number | undefined;
  let renderedActors: readonly MinimapActorView[] | undefined;
  let renderedFloor: number | undefined;
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

  const terrainBuffer = document.createElement('canvas') as HTMLCanvasElement;
  terrainBuffer.width = size;
  terrainBuffer.height = size;
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

  const render = (state: MinimapState): void => {
    if (floorLabelValue !== state.floor) {
      floorLabelValue = state.floor;
      floorLabel.textContent = `Floor ${state.floor}`;
    }
    const nextSignature = `${region.regionId}:${region.regionRevision}:${state.floor}`;
    if (terrainSignature !== nextSignature) {
      terrainSignature = nextSignature;
      terrainRedraws += 1;
      // The detached buffer is intentionally repainted only when the region or
      // floor changes; actor movement never touches the terrain layer.
      drawTerrain(terrainContext, region, state.floor, size);
      visibleTerrainContext?.clearRect(0, 0, size, size);
      if (terrainContext !== null) {
        visibleTerrainContext?.drawImage(terrainBuffer, 0, 0);
      }
      element.setAttribute('data-terrain-redraws', String(terrainRedraws));
    }

    if (renderedActors !== state.actors || renderedFloor !== state.floor) {
      renderedActors = state.actors;
      renderedFloor = state.floor;
      actorRedraws += 1;
      drawActors(actorContext, state.actors, region, state.floor, size);
      element.setAttribute('data-actor-redraws', String(actorRedraws));
    }
  };

  return {
    element,
    render,
    setRegion: (nextRegion) => {
      region = nextRegion;
      terrainSignature = undefined;
      renderedActors = undefined;
      renderedFloor = undefined;
    },
    destroy: () => {
      element.remove();
    },
  };
}
