/**
 * Hand-built OTBM byte fixtures.
 *
 * The node stream is the one Remere's Map Editor writes in
 * `references/remeres-map-editor/source/filehandle.cpp`: a four byte version
 * identifier, then a tree where `0xFE` opens a node, `0xFF` closes it and
 * `0xFD` escapes the byte that follows. The first byte of a node's property
 * span is its type.
 */

export const NODE_START = 0xfe;
export const NODE_END = 0xff;
export const ESCAPE_CHAR = 0xfd;

export interface OtbmNodeSpec {
  readonly type: number;
  readonly props?: readonly number[];
  readonly children?: readonly OtbmNodeSpec[];
}

/** Escapes the three special bytes exactly as the writer does. */
export function escapeBytes(values: readonly number[]): number[] {
  const out: number[] = [];
  for (const value of values) {
    if (value === NODE_START || value === NODE_END || value === ESCAPE_CHAR) {
      out.push(ESCAPE_CHAR);
    }
    out.push(value);
  }
  return out;
}

export function encodeOtbmNode(node: OtbmNodeSpec): number[] {
  const out: number[] = [NODE_START];
  out.push(...escapeBytes([node.type, ...(node.props ?? [])]));
  for (const child of node.children ?? []) {
    out.push(...encodeOtbmNode(child));
  }
  out.push(NODE_END);
  return out;
}

export function encodeOtbmFile(root: OtbmNodeSpec): Uint8Array {
  return Uint8Array.from([0, 0, 0, 0, ...encodeOtbmNode(root)]);
}

export function u8(value: number): readonly number[] {
  return [value & 0xff];
}

export function u16(value: number): readonly number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

export function u32(value: number): readonly number[] {
  return [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ];
}

export const OTBM_ROOTV1 = 1;
export const OTBM_MAP_DATA = 2;
export const OTBM_TILE_AREA = 4;
export const OTBM_TILE = 5;
export const OTBM_ITEM = 6;
export const OTBM_HOUSETILE = 14;
export const OTBM_TILE_ZONE = 19;

export const OTBM_ATTR_TILE_FLAGS = 3;
export const OTBM_ATTR_ITEM = 9;

export interface OtbmTileFixture {
  /** Absolute map coordinates; the offsets are derived from the area base. */
  readonly x: number;
  readonly y: number;
  /** Items written as `OTBM_ATTR_ITEM` inside the tile property span. */
  readonly attributeItems?: readonly number[];
  /**
   * Items written as child `OTBM_ITEM` nodes. An object form writes a container
   * whose contents are grandchildren of the tile.
   */
  readonly items?: readonly (
    | number
    | { readonly id: number; readonly contents: readonly number[] }
  )[];
  readonly tileFlags?: number;
  /** Present for `OTBM_HOUSETILE`. */
  readonly houseId?: number;
  readonly zones?: readonly number[];
  /** Extra raw attribute bytes appended after the known ones. */
  readonly rawAttributes?: readonly number[];
}

export interface OtbmAreaFixture {
  readonly baseX: number;
  readonly baseY: number;
  readonly baseZ: number;
  readonly tiles: readonly OtbmTileFixture[];
}

function tileNode(area: OtbmAreaFixture, tile: OtbmTileFixture): OtbmNodeSpec {
  const props = [
    ...u8(tile.x - area.baseX),
    ...u8(tile.y - area.baseY),
    ...(tile.houseId === undefined ? [] : u32(tile.houseId)),
    ...(tile.tileFlags === undefined
      ? []
      : [OTBM_ATTR_TILE_FLAGS, ...u32(tile.tileFlags)]),
    ...(tile.attributeItems ?? []).flatMap((id) => [
      OTBM_ATTR_ITEM,
      ...u16(id),
    ]),
    ...(tile.rawAttributes ?? []),
  ];

  const children: OtbmNodeSpec[] = (tile.items ?? []).map((item) =>
    typeof item === 'number'
      ? { type: OTBM_ITEM, props: u16(item) }
      : {
          type: OTBM_ITEM,
          props: u16(item.id),
          children: item.contents.map((id) => ({
            type: OTBM_ITEM,
            props: u16(id),
          })),
        },
  );
  if (tile.zones !== undefined) {
    children.push({
      type: OTBM_TILE_ZONE,
      props: [
        ...u16(tile.zones.length),
        ...tile.zones.flatMap((id) => u16(id)),
      ],
    });
  }

  return {
    type: tile.houseId === undefined ? OTBM_TILE : OTBM_HOUSETILE,
    props,
    children,
  };
}

/** Builds a whole OTBM v2 file around the given tile areas. */
export function encodeOtbmMap(areas: readonly OtbmAreaFixture[]): Uint8Array {
  return encodeOtbmFile({
    type: OTBM_ROOTV1,
    props: [...u32(2), ...u16(40000), ...u16(40000), ...u32(3), ...u32(62)],
    children: [
      {
        type: OTBM_MAP_DATA,
        children: areas.map((area) => ({
          type: OTBM_TILE_AREA,
          props: [...u16(area.baseX), ...u16(area.baseY), ...u8(area.baseZ)],
          children: area.tiles.map((tile) => tileNode(area, tile)),
        })),
      },
    ],
  });
}
