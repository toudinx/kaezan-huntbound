/**
 * Minimal scanner over Canary's `items.xml`.
 *
 * Only two shapes matter: `<item id=…>` / `<item fromid=… toid=…>` and the
 * `<attribute key="floorchange" value=…/>` child. Deliberately not a general
 * XML parser — no new dependency enters the workspace for this.
 */

const ITEM_TAG = /<item\b([^>]*?)(\/?)>/g;
const ATTRIBUTE_PAIR = /([A-Za-z_][\w.-]*)\s*=\s*"([^"]*)"/g;
const FLOORCHANGE_ATTRIBUTE =
  /<attribute\b[^>]*\bkey\s*=\s*"floorchange"[^>]*\bvalue\s*=\s*"([^"]*)"[^>]*>/i;

export interface ItemRow {
  readonly ids: readonly number[];
  readonly name: string;
  readonly floorChange: string | undefined;
}

function attributesOf(raw: string): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  ATTRIBUTE_PAIR.lastIndex = 0;
  for (;;) {
    const match = ATTRIBUTE_PAIR.exec(raw);
    if (match === null) break;
    const [, name, value] = match;
    if (name !== undefined && value !== undefined && !values.has(name)) {
      values.set(name, value);
    }
  }
  return values;
}

function parseId(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function idRange(
  attributes: ReadonlyMap<string, string>,
): readonly number[] | undefined {
  const single = parseId(attributes.get('id'));
  if (single !== undefined) return [single];

  const from = parseId(attributes.get('fromid'));
  const to = parseId(attributes.get('toid'));
  if (from === undefined || to === undefined) return undefined;
  if (to < from) {
    throw new Error(`invalid id range ${from}..${to} in items.xml`);
  }

  const ids: number[] = [];
  for (let id = from; id <= to; id += 1) ids.push(id);
  return ids;
}

export function scanItems(itemsXml: string): readonly ItemRow[] {
  const rows: ItemRow[] = [];

  ITEM_TAG.lastIndex = 0;
  for (;;) {
    const match = ITEM_TAG.exec(itemsXml);
    if (match === null) break;

    const [, rawAttributes, selfClosing] = match;
    if (rawAttributes === undefined) continue;

    let floorChange: string | undefined;
    if (selfClosing !== '/') {
      const closing = itemsXml.indexOf('</item>', ITEM_TAG.lastIndex);
      const body = itemsXml.slice(
        ITEM_TAG.lastIndex,
        closing === -1 ? itemsXml.length : closing,
      );
      floorChange = FLOORCHANGE_ATTRIBUTE.exec(body)?.[1];
    }

    const attributes = attributesOf(rawAttributes);
    const ids = idRange(attributes);
    if (ids === undefined) continue;

    rows.push({ ids, name: attributes.get('name') ?? '', floorChange });
  }

  return rows;
}

export function readItemIds(itemsXml: string): ReadonlyMap<number, string> {
  const names = new Map<number, string>();
  for (const row of scanItems(itemsXml)) {
    for (const id of row.ids) {
      if (!names.has(id)) names.set(id, row.name);
    }
  }
  return names;
}
