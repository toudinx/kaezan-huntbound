export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface GroundTintAsset {
  readonly mediaUrl: string;
}

export type ResolveGroundAsset = (key: string) => GroundTintAsset | undefined;

export interface GroundTintCache {
  /** The colour of the tile the canvas paints for this client id, once read. */
  tint(clientId: number): Rgb | undefined;
  /** Starts reading any of these client ids that has not been read yet. */
  prime(clientIds: Iterable<number>): void;
  destroy(): void;
}

/** The runtime asset key the hunt pack publishes for a ground client id. */
export function groundTileAssetKey(clientId: number): string {
  return `tile:tibia:${clientId}`;
}

/**
 * The average of every pixel the tile actually paints.
 *
 * Transparent pixels carry no colour and would drag the average toward black,
 * so each sample is weighted by its own alpha and fully clear pixels drop out.
 * A tile that paints nothing has no colour to report.
 */
export function averageOpaqueColor(
  pixels: Uint8ClampedArray | readonly number[],
): Rgb | undefined {
  let red = 0;
  let green = 0;
  let blue = 0;
  let weight = 0;

  for (let index = 0; index + 3 < pixels.length; index += 4) {
    const alpha = (pixels[index + 3] ?? 0) / 255;
    if (alpha === 0) continue;
    red += (pixels[index] ?? 0) * alpha;
    green += (pixels[index + 1] ?? 0) * alpha;
    blue += (pixels[index + 2] ?? 0) * alpha;
    weight += alpha;
  }

  if (weight === 0) return undefined;

  return {
    r: Math.round(red / weight),
    g: Math.round(green / weight),
    b: Math.round(blue / weight),
  };
}

export function scaleRgb(color: Rgb, factor: number): Rgb {
  const clamp = (value: number): number =>
    Math.max(0, Math.min(255, Math.round(value * factor)));
  return { r: clamp(color.r), g: clamp(color.g), b: clamp(color.b) };
}

export function formatRgb(color: Rgb): string {
  return `rgb(${color.r} ${color.g} ${color.b})`;
}

/**
 * Reads ground colours off the tile images the playfield already loads.
 *
 * The minimap used to hash the palette index into a hue, so its greens were
 * never grass and every hunt recoloured itself by arithmetic accident. The
 * only honest source for "what colour is this floor" is the pixels the player
 * is looking at, so each client id is sampled once from its own tile image and
 * cached. Sampling is asynchronous — the first paint uses the neutral fallback
 * and `onSampled` asks for a repaint as colours arrive.
 *
 * Reading and fetching are separate on purpose: `tint` never starts work, so
 * painting stays a pure lookup, and `prime` is what every frame may call
 * cheaply until the pack is actually loaded.
 */
export function createGroundTintCache(
  document: Document,
  resolveAsset: ResolveGroundAsset,
  onSampled: () => void,
): GroundTintCache {
  const tints = new Map<number, Rgb | null>();
  const inFlight = new Set<number>();
  const images = new Set<HTMLImageElement>();
  let destroyed = false;

  const sample = (image: HTMLImageElement): Rgb | undefined => {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (width === 0 || height === 0) return undefined;

    const canvas = document.createElement('canvas');
    if (typeof canvas.getContext !== 'function') return undefined;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (context === null) return undefined;

    context.drawImage(image, 0, 0);
    try {
      return averageOpaqueColor(context.getImageData(0, 0, width, height).data);
    } catch {
      // A tainted canvas cannot be read. The fallback tone stands in.
      return undefined;
    }
  };

  return {
    tint: (clientId) => tints.get(clientId) ?? undefined,
    prime: (clientIds) => {
      for (const clientId of clientIds) {
        if (tints.has(clientId) || inFlight.has(clientId)) continue;

        // The pack finishes loading after the cockpit mounts, so a key that
        // does not resolve yet is not a key that never will. Nothing is
        // remembered here: the next paint asks again.
        const asset = resolveAsset(groundTileAssetKey(clientId));
        if (asset === undefined) continue;

        inFlight.add(clientId);
        const image = document.createElement('img') as HTMLImageElement;
        images.add(image);
        const finish = (color: Rgb | undefined): void => {
          images.delete(image);
          inFlight.delete(clientId);
          if (destroyed) return;
          // A tile that failed to decode is remembered as colourless, so a
          // broken image is asked for once rather than on every paint.
          tints.set(clientId, color ?? null);
          if (color !== undefined) onSampled();
        };

        image.addEventListener('load', () => {
          finish(sample(image));
        });
        image.addEventListener('error', () => {
          finish(undefined);
        });
        image.src = asset.mediaUrl;
      }
    },
    destroy: () => {
      destroyed = true;
      for (const image of images) image.src = '';
      images.clear();
    },
  };
}
