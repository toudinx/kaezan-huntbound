/**
 * Minimal OTBM node reader.
 *
 * The format is documented by the writer in
 * `references/remeres-map-editor/source/filehandle.cpp`: four identifier bytes,
 * then a node tree where `0xFE` opens a node, `0xFF` closes it and `0xFD`
 * escapes the byte that follows. The first byte of a node's property span is
 * its type. No OTBM library enters the workspace; this reader decodes only what
 * the extraction consumes.
 */

const NODE_START = 0xfe;
const NODE_END = 0xff;
const ESCAPE_CHAR = 0xfd;

/** Bytes of the version identifier that precedes the root node. */
const HEADER_LENGTH = 4;

export interface OtbmNode {
  readonly type: number;
  readonly props: Uint8Array;
  readonly children: readonly OtbmNode[];
}

/**
 * Resolves `0xFD` escapes inside a raw property span.
 *
 * An escape on the last byte is a truncated file, not a literal `0xFD`: it is
 * the classic source of silent OTBM corruption, so it throws.
 */
export function unescapeOtbmProps(raw: Uint8Array): Uint8Array {
  const out = new Uint8Array(raw.length);
  let length = 0;
  for (let index = 0; index < raw.length; index += 1) {
    let byte = raw[index] as number;
    if (byte === ESCAPE_CHAR) {
      index += 1;
      if (index >= raw.length) {
        throw new Error('OTBM escape at the end of the property span');
      }
      byte = raw[index] as number;
    }
    out[length] = byte;
    length += 1;
  }
  return out.subarray(0, length);
}

/**
 * Returns the offset of the first unescaped delimiter at or after `start`, or
 * `buffer.length` when the span runs to the end of the buffer.
 */
function findDelimiter(buffer: Uint8Array, start: number): number {
  let offset = start;
  while (offset < buffer.length) {
    const byte = buffer[offset] as number;
    if (byte === NODE_START || byte === NODE_END) {
      return offset;
    }
    offset += byte === ESCAPE_CHAR ? 2 : 1;
  }
  return buffer.length;
}

interface ScannedNode {
  readonly type: number;
  readonly props: Uint8Array;
  /** Offset of the delimiter that ended the property span. */
  readonly delimiter: number;
}

/** Reads the type byte and properties of the node opened at `start`. */
function scanNodeHead(buffer: Uint8Array, start: number): ScannedNode {
  const delimiter = findDelimiter(buffer, start + 1);
  const decoded = unescapeOtbmProps(buffer.subarray(start + 1, delimiter));
  if (decoded.length === 0) {
    throw new Error(`OTBM node at offset ${start} has no type byte`);
  }
  return {
    type: decoded[0] as number,
    props: decoded.subarray(1),
    delimiter,
  };
}

/**
 * Walks the children opened between a node's property span and its `0xFF`.
 *
 * `visit` receives the offset where a child opens plus its already-scanned head
 * and must return the offset just past that child, so a caller either descends
 * into it or skips it without ever re-scanning what it consumed.
 *
 * Returns the offset just past the parent's terminating `0xFF`.
 */
function walkChildren(
  buffer: Uint8Array,
  parent: ScannedNode,
  visit: (start: number, head: ScannedNode) => number,
): number {
  let offset = parent.delimiter;
  while (offset < buffer.length) {
    if ((buffer[offset] as number) === NODE_END) {
      return offset + 1;
    }
    offset = visit(offset, scanNodeHead(buffer, offset));
  }
  throw new Error(`OTBM node of type ${parent.type} was not closed`);
}

/** Returns the offset just past the node whose head was already scanned. */
function skipNode(buffer: Uint8Array, head: ScannedNode): number {
  return walkChildren(buffer, head, (_start, child) => skipNode(buffer, child));
}

interface ReadNode {
  readonly node: OtbmNode;
  /** Offset just past this node's terminating `0xFF`. */
  readonly next: number;
}

function readNodeAt(buffer: Uint8Array, start: number): ReadNode {
  const head = scanNodeHead(buffer, start);
  const children: OtbmNode[] = [];
  const next = walkChildren(buffer, head, (childStart) => {
    const child = readNodeAt(buffer, childStart);
    children.push(child.node);
    return child.next;
  });
  return { node: { type: head.type, props: head.props, children }, next };
}

/**
 * Reads a whole OTBM buffer into a node tree.
 *
 * Only synthetic fixtures and small files go through this function; the real
 * 19.7 MB map is walked by {@link readOtbmTiles}, which never materializes the
 * tree.
 */
export function readOtbmTree(buffer: Uint8Array): OtbmNode {
  if (buffer.length <= HEADER_LENGTH) {
    throw new Error('OTBM buffer is shorter than its version identifier');
  }
  if (buffer[HEADER_LENGTH] !== NODE_START) {
    throw new Error('OTBM root node does not start with 0xFE');
  }
  return readNodeAt(buffer, HEADER_LENGTH).node;
}

const OTBM_MAP_DATA = 2;
const OTBM_TILE_AREA = 4;
const OTBM_TILE = 5;
const OTBM_ITEM = 6;
const OTBM_HOUSETILE = 14;

const OTBM_ATTR_TILE_FLAGS = 3;
const OTBM_ATTR_ITEM = 9;

/** A tile area addresses its tiles with unsigned byte offsets. */
const TILE_AREA_SPAN = 256;

export interface OtbmBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly floors: readonly number[];
}

export interface OtbmTile {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly items: readonly number[];
}

function readU16(props: Uint8Array, offset: number): number {
  const low = props[offset];
  const high = props[offset + 1];
  if (low === undefined || high === undefined) {
    throw new Error('OTBM property span ended inside a 16-bit value');
  }
  return low | (high << 8);
}

/**
 * Reads the items of a tile: first the ones inlined as `OTBM_ATTR_ITEM` in the
 * property span, then the child `OTBM_ITEM` nodes, in file order.
 *
 * Only direct children count. A container writes its contents as grandchildren,
 * and those never stack on the tile.
 */
function readTileItems(
  buffer: Uint8Array,
  head: ScannedNode,
  propsOffset: number,
): { readonly items: readonly number[]; readonly next: number } {
  const items: number[] = [];

  let offset = propsOffset;
  while (offset < head.props.length) {
    const attribute = head.props[offset] as number;
    offset += 1;
    if (attribute === OTBM_ATTR_ITEM) {
      items.push(readU16(head.props, offset));
      offset += 2;
      continue;
    }
    if (attribute === OTBM_ATTR_TILE_FLAGS) {
      offset += 4;
      continue;
    }
    throw new Error(`Unsupported OTBM tile attribute ${attribute}`);
  }

  const next = walkChildren(buffer, head, (_start, child) => {
    if (child.type === OTBM_ITEM) {
      items.push(readU16(child.props, 0));
    }
    return skipNode(buffer, child);
  });

  return { items, next };
}

/**
 * Walks an OTBM buffer and returns only the tiles inside `bounds`.
 *
 * The tree is never materialized: nodes outside the bounding box are skipped by
 * offset. A tile area is filtered tile by tile, because an area spans 256 × 256
 * tiles and one whose base corner falls outside the box still contains tiles
 * inside it.
 */
export function readOtbmTiles(
  buffer: Uint8Array,
  bounds: OtbmBounds,
): readonly OtbmTile[] {
  const floors = new Set(bounds.floors);
  const tiles: OtbmTile[] = [];

  const readArea = (head: ScannedNode): number => {
    const baseX = readU16(head.props, 0);
    const baseY = readU16(head.props, 2);
    const baseZ = head.props[4];
    if (baseZ === undefined) {
      throw new Error('OTBM tile area has no base coordinate');
    }

    if (
      !floors.has(baseZ) ||
      baseX > bounds.maxX ||
      baseX + TILE_AREA_SPAN <= bounds.minX ||
      baseY > bounds.maxY ||
      baseY + TILE_AREA_SPAN <= bounds.minY
    ) {
      return skipNode(buffer, head);
    }

    return walkChildren(buffer, head, (_start, tile) => {
      if (tile.type !== OTBM_TILE && tile.type !== OTBM_HOUSETILE) {
        return skipNode(buffer, tile);
      }
      const offsetX = tile.props[0];
      const offsetY = tile.props[1];
      if (offsetX === undefined || offsetY === undefined) {
        throw new Error('OTBM tile has no position');
      }
      const x = baseX + offsetX;
      const y = baseY + offsetY;
      // The house id sits between the offsets and the attribute stream.
      const propsOffset = tile.type === OTBM_HOUSETILE ? 6 : 2;
      if (
        x < bounds.minX ||
        x > bounds.maxX ||
        y < bounds.minY ||
        y > bounds.maxY
      ) {
        return skipNode(buffer, tile);
      }
      const { items, next } = readTileItems(buffer, tile, propsOffset);
      tiles.push({ x, y, z: baseZ, items });
      return next;
    });
  };

  const root = scanNodeHead(buffer, HEADER_LENGTH);
  walkChildren(buffer, root, (_start, mapData) => {
    if (mapData.type !== OTBM_MAP_DATA) {
      return skipNode(buffer, mapData);
    }
    return walkChildren(buffer, mapData, (_areaStart, area) =>
      area.type === OTBM_TILE_AREA ? readArea(area) : skipNode(buffer, area),
    );
  });

  return tiles;
}
