import type { ContentDiagnostic } from '@huntbound/contracts';

import type { CanaryParseResult } from '../sourceTypes';
import {
  createXmlDiagnostic,
  normalizeXmlName,
  parseRequiredInteger,
  parseRequiredNumber,
  parseXmlRoot,
} from './xmlDiagnostics';
import {
  asXmlElements,
  type XmlElement,
  xmlAttribute,
  xmlAttributeNames,
} from './xmlTypes';

export interface CanaryItemDto {
  readonly sourceId: string;
  readonly displayName: string;
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
}

type ItemRecord = {
  readonly element: XmlElement;
  readonly name: string;
  readonly normalizedName: string;
  readonly fromId: number;
  readonly toId: number;
  readonly isConcrete: boolean;
};

type ResolvedItem = {
  readonly sourceId: string;
  readonly record: ItemRecord;
};

const itemAttributes = new Set([
  'id',
  'fromid',
  'toid',
  'name',
  'article',
  'plural',
  'weight',
  'stackable',
  'maxStackSize',
]);

const itemChildElements = new Set(['attribute']);

const ignoredAttributeKeys = new Set([
  'primarytype',
  'weaponType',
  'shootType',
  'maxhitchance',
  'range',
  'attack',
  'defense',
  'extradef',
  'armor',
  'description',
  'showCount',
  'writeable',
  'maxtextlen',
  'stopduration',
  'decayTo',
  'duration',
  'containersize',
  'count',
  'imbuementslot',
  'slot',
  'slotType',
  'showCharges',
  'showduration',
  'showattributes',
  'walkstack',
  'perfectshotrange',
  'script',
]);

function diagnosticForUnknownAttribute(
  elementName: string,
  attributeName: string,
): ContentDiagnostic {
  return createXmlDiagnostic(
    'xml.unsupported-attribute',
    `Unsupported attribute ${attributeName} on ${elementName}`,
  );
}

function validateAttributes(
  elementName: string,
  element: XmlElement,
  allowed: ReadonlySet<string>,
  diagnostics: ContentDiagnostic[],
): void {
  for (const attributeName of xmlAttributeNames(element)) {
    if (!allowed.has(attributeName)) {
      diagnostics.push(
        diagnosticForUnknownAttribute(elementName, attributeName),
      );
    }
  }
}

function parseId(value: unknown, field: string): number | undefined {
  const parsed = parseRequiredInteger(value, field);
  return parsed.ok && parsed.value >= 0 ? parsed.value : undefined;
}

function parseItemRecord(
  element: XmlElement,
  diagnostics: ContentDiagnostic[],
): ItemRecord | undefined {
  const idValue = xmlAttribute(element, 'id');
  const fromIdValue = xmlAttribute(element, 'fromid');
  const toIdValue = xmlAttribute(element, 'toid');
  const nameValue = xmlAttribute(element, 'name');
  const hasId = idValue !== undefined;
  const hasRange = fromIdValue !== undefined || toIdValue !== undefined;

  if ((hasId && hasRange) || (!hasId && !hasRange)) {
    diagnostics.push(
      createXmlDiagnostic(
        'xml.invalid-item-shape',
        'Item must have either id or both fromid and toid',
      ),
    );
    return undefined;
  }

  const fromId = parseId(
    hasId ? idValue : fromIdValue,
    hasId ? 'id' : 'fromid',
  );
  const toId = parseId(hasId ? idValue : toIdValue, hasId ? 'id' : 'toid');
  if (fromId === undefined || toId === undefined) {
    diagnostics.push(
      createXmlDiagnostic(
        'xml.invalid-number',
        'Item IDs must be non-negative integers',
      ),
    );
    return undefined;
  }
  if (fromId > toId) {
    diagnostics.push(
      createXmlDiagnostic(
        'xml.invalid-range',
        `Item range ${fromId}-${toId} is reversed`,
      ),
    );
    return undefined;
  }

  if (typeof nameValue !== 'string' || nameValue.trim().length === 0) {
    diagnostics.push(
      createXmlDiagnostic(
        'xml.missing-attribute',
        'Item name must not be empty',
      ),
    );
    return undefined;
  }

  return {
    element,
    name: nameValue,
    normalizedName: normalizeXmlName(nameValue),
    fromId,
    toId,
    isConcrete: fromId === toId,
  };
}

function primitiveValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;

  const text = value.trim();
  if (text === 'true' || text === '1') return true;
  if (text === 'false' || text === '0') return false;
  const number = Number(text);
  return text.length > 0 && Number.isFinite(number) ? number : text;
}

function mapSelectedItem(
  resolved: ResolvedItem,
  diagnostics: ContentDiagnostic[],
): CanaryItemDto | undefined {
  const { element } = resolved.record;
  validateAttributes('item', element, itemAttributes, diagnostics);
  for (const childName of Object.keys(element).filter(
    (key) => !key.startsWith('@_'),
  )) {
    if (!itemChildElements.has(childName)) {
      diagnostics.push(
        createXmlDiagnostic(
          'xml.unsupported-element',
          `Unsupported child element ${childName} on item ${resolved.sourceId}`,
        ),
      );
    }
  }

  const attributes: Record<string, string | number | boolean> = {};
  for (const key of ['article', 'plural']) {
    const value = xmlAttribute(element, key);
    if (typeof value === 'string') attributes[key] = value;
  }

  const topLevelWeight = xmlAttribute(element, 'weight');
  if (topLevelWeight !== undefined) {
    const weight = parseRequiredNumber(topLevelWeight, 'weight');
    if (!weight.ok) diagnostics.push(weight.diagnostic);
    else if (weight.value < 0) {
      diagnostics.push(
        createXmlDiagnostic(
          'xml.invalid-number',
          'weight must be non-negative',
        ),
      );
    } else attributes.weight = weight.value;
  }

  for (const key of ['stackable', 'maxStackSize']) {
    const value = xmlAttribute(element, key);
    if (value === undefined) continue;
    const primitive = primitiveValue(value);
    if (primitive === undefined) {
      diagnostics.push(
        createXmlDiagnostic(
          'xml.invalid-attribute',
          `${key} must be a primitive value`,
        ),
      );
    } else {
      attributes[key] = primitive;
    }
  }

  for (const child of asXmlElements(element.attribute)) {
    const childAttributes = xmlAttributeNames(child);
    if (childAttributes.some((name) => !['key', 'value'].includes(name))) {
      for (const name of childAttributes) {
        if (!['key', 'value'].includes(name)) {
          diagnostics.push(diagnosticForUnknownAttribute('attribute', name));
        }
      }
      continue;
    }

    const key = xmlAttribute(child, 'key');
    const value = xmlAttribute(child, 'value');
    if (typeof key !== 'string' || typeof value !== 'string') {
      diagnostics.push(
        createXmlDiagnostic(
          'xml.missing-attribute',
          'Item attribute requires key and value',
        ),
      );
      continue;
    }
    if (key === 'weight') {
      const weight = parseRequiredNumber(value, 'weight');
      if (!weight.ok) diagnostics.push(weight.diagnostic);
      else if (weight.value < 0) {
        diagnostics.push(
          createXmlDiagnostic(
            'xml.invalid-number',
            'weight must be non-negative',
          ),
        );
      } else attributes.weight = weight.value;
    } else if (key === 'stackable' || key === 'maxStackSize') {
      const primitive = primitiveValue(value);
      if (primitive === undefined) {
        diagnostics.push(
          createXmlDiagnostic(
            'xml.invalid-attribute',
            `${key} must be a primitive value`,
          ),
        );
      } else attributes[key] = primitive;
    } else if (!ignoredAttributeKeys.has(key)) {
      diagnostics.push(
        createXmlDiagnostic(
          'xml.unsupported-attribute',
          `Unsupported item attribute ${key}`,
        ),
      );
    }
  }

  if (diagnostics.length > 0) return undefined;

  return {
    sourceId: resolved.sourceId,
    displayName: resolved.record.name,
    attributes: Object.fromEntries(
      Object.entries(attributes).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  };
}

function resolveByName(
  name: string,
  records: readonly ItemRecord[],
  diagnostics: ContentDiagnostic[],
): ResolvedItem | undefined {
  const matches = records.filter(
    (record) => record.normalizedName === normalizeXmlName(name),
  );
  if (matches.length !== 1) {
    diagnostics.push(
      createXmlDiagnostic(
        matches.length === 0 ? 'xml.entity-not-found' : 'xml.ambiguous-name',
        matches.length === 0
          ? `Requested item name ${name} was not found`
          : `Requested item name ${name} is ambiguous`,
      ),
    );
    return undefined;
  }

  const [match] = matches;
  if (match === undefined || !match.isConcrete) {
    diagnostics.push(
      createXmlDiagnostic(
        'xml.ambiguous-name',
        `Requested item name ${name} does not identify one concrete item ID`,
      ),
    );
    return undefined;
  }

  return { sourceId: String(match.fromId), record: match };
}

export function parseCanaryItemsXml(
  xml: string,
  selection: {
    readonly ids: readonly string[];
    readonly names: readonly string[];
  },
): CanaryParseResult<readonly CanaryItemDto[]> {
  const document = parseXmlRoot(xml, 'items', ['item', 'attribute']);
  if (!document.ok) return document;

  const diagnostics: ContentDiagnostic[] = [];
  const records: ItemRecord[] = [];
  const concreteIds = new Set<number>();
  const ranges = new Set<string>();
  for (const item of asXmlElements(document.root.item)) {
    const record = parseItemRecord(item, diagnostics);
    if (record === undefined) continue;
    if (record.isConcrete) {
      if (concreteIds.has(record.fromId)) {
        diagnostics.push(
          createXmlDiagnostic(
            'xml.duplicate-id',
            `Duplicate item ID ${record.fromId}`,
          ),
        );
        continue;
      }
      concreteIds.add(record.fromId);
    } else {
      const range = `${record.fromId}:${record.toId}`;
      if (ranges.has(range)) {
        diagnostics.push(
          createXmlDiagnostic(
            'xml.duplicate-range',
            `Duplicate item range ${range}`,
          ),
        );
        continue;
      }
      ranges.add(range);
    }
    records.push(record);
  }

  const resolved = new Map<string, ResolvedItem>();
  const concreteById = new Map(
    records
      .filter((record) => record.isConcrete)
      .map((record) => [String(record.fromId), record] as const),
  );
  for (const requestedId of [...new Set(selection.ids)]) {
    const parsed = parseRequiredInteger(requestedId, 'requested item ID');
    if (!parsed.ok || parsed.value < 0) {
      diagnostics.push(
        createXmlDiagnostic(
          'xml.invalid-id',
          `Requested item ID ${requestedId} is invalid`,
        ),
      );
      continue;
    }
    const sourceId = String(parsed.value);
    const concrete = concreteById.get(sourceId);
    if (concrete !== undefined) {
      resolved.set(sourceId, { sourceId, record: concrete });
      continue;
    }

    const containing = records.filter(
      (record) =>
        !record.isConcrete &&
        record.fromId <= parsed.value &&
        record.toId >= parsed.value,
    );
    if (containing.length === 0) {
      diagnostics.push(
        createXmlDiagnostic(
          'xml.entity-not-found',
          `Requested item ID ${sourceId} was not found`,
        ),
      );
    } else if (containing.length > 1) {
      diagnostics.push(
        createXmlDiagnostic(
          'xml.ambiguous-id',
          `Requested item ID ${sourceId} matches multiple ranges`,
        ),
      );
    } else {
      const [record] = containing;
      if (record !== undefined) resolved.set(sourceId, { sourceId, record });
    }
  }

  for (const requestedName of [...new Set(selection.names)]) {
    const item = resolveByName(requestedName, records, diagnostics);
    if (item !== undefined) resolved.set(item.sourceId, item);
  }

  const values: CanaryItemDto[] = [];
  for (const item of [...resolved.values()].sort((left, right) =>
    left.sourceId.localeCompare(right.sourceId, 'en', { numeric: true }),
  )) {
    const dto = mapSelectedItem(item, diagnostics);
    if (dto !== undefined) values.push(dto);
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics };
  return { ok: true, value: values };
}
