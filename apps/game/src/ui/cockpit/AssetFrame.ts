import type { ResolvedAsset } from '../../../../../packages/assets/src/index.ts';

export type CockpitAsset = Pick<
  ResolvedAsset,
  'mediaUrl' | 'cellWidth' | 'cellHeight' | 'columns' | 'atlasFrameCount'
>;

export type ResolveCockpitAsset = (key: string) => CockpitAsset | undefined;

interface AtlasFrameOptions {
  readonly frameClassName?: string;
  readonly imageClassName: string;
  readonly imageTestId?: string;
  readonly alt: string;
  readonly imageAriaHidden?: boolean;
}

/** The cockpit uses a stable, non-animated first frame for atlas-backed art. */
const STATIC_FRAME_INDEX = 0;

function atlasRows(asset: CockpitAsset): number {
  return Math.ceil(asset.atlasFrameCount / asset.columns);
}

/** Includes the geometry metadata because it determines the visible crop. */
export function assetFrameSignature(asset: CockpitAsset | undefined): string {
  if (asset === undefined) return '';

  return [
    asset.mediaUrl,
    asset.cellWidth,
    asset.cellHeight,
    asset.columns,
    asset.atlasFrameCount,
  ].join(':');
}

/**
 * Places the atlas in a clipped window whose size is exactly one source cell.
 * The image keeps its URL; only its rendered dimensions are expanded by the
 * atlas geometry, leaving the first cell inside the window.
 */
export function createAtlasFrame(
  document: Document,
  asset: CockpitAsset,
  options: AtlasFrameOptions,
): HTMLElement {
  const frame = document.createElement('span');
  frame.className = ['cockpit-asset-frame', options.frameClassName ?? '']
    .filter(Boolean)
    .join(' ');
  frame.setAttribute('data-atlas-frame', String(STATIC_FRAME_INDEX));
  frame.style.setProperty('--cockpit-atlas-columns', String(asset.columns));
  frame.style.setProperty('--cockpit-atlas-rows', String(atlasRows(asset)));
  frame.style.setProperty(
    '--cockpit-atlas-cell-width',
    String(asset.cellWidth),
  );
  frame.style.setProperty(
    '--cockpit-atlas-cell-height',
    String(asset.cellHeight),
  );

  const image = document.createElement('img') as HTMLImageElement;
  image.className = ['cockpit-asset-frame__image', options.imageClassName]
    .filter(Boolean)
    .join(' ');
  if (options.imageTestId !== undefined) {
    image.setAttribute('data-testid', options.imageTestId);
  }
  image.setAttribute('src', asset.mediaUrl);
  image.setAttribute('alt', options.alt);
  image.setAttribute('draggable', 'false');
  if (options.imageAriaHidden === true) {
    image.setAttribute('aria-hidden', 'true');
  }
  frame.append(image);

  return frame;
}
