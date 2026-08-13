import type { ContentDiagnostic } from '@huntbound/contracts';

import type { CanaryParseResult } from '../sourceTypes';
import {
  createXmlDiagnostic,
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

export interface CanaryVocationDto {
  readonly sourceId: string;
  readonly displayName: string;
  readonly gainHp: number;
  readonly gainMana: number;
  readonly gainCapacity: number;
  readonly baseSpeed: number;
  readonly attackSpeedMs: number;
  readonly manaMultiplier: number;
  readonly skillMultipliers: Readonly<Record<string, number>>;
}

const vocationAttributes = new Set([
  'id',
  'name',
  'gaincap',
  'gainhp',
  'gainmana',
  'manamultiplier',
  'attackspeed',
  'basespeed',
  'clientid',
  'baseid',
  'description',
  'magicshield',
  'gainhpticks',
  'gainhpamount',
  'gainmanaticks',
  'gainmanaamount',
  'soulmax',
  'gainsoulticks',
  'fromvoc',
  'avatarlooktype',
]);

const ignoredChildAttributes: Readonly<Record<string, ReadonlySet<string>>> = {
  formula: new Set(['meleeDamage', 'distDamage', 'defense', 'armor']),
  mitigation: new Set(['multiplier', 'primaryShield', 'secondaryShield']),
  pvp: new Set(['damageReceivedMultiplier', 'damageDealtMultiplier']),
  gem: new Set(['quality', 'name']),
};

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

function readRequiredAttribute(
  element: XmlElement,
  name: string,
  diagnostics: ContentDiagnostic[],
): unknown {
  const value = xmlAttribute(element, name);
  if (
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    diagnostics.push(
      createXmlDiagnostic(
        'xml.missing-attribute',
        `Missing required attribute ${name}`,
      ),
    );
  }

  return value;
}

function readIntegerAttribute(
  element: XmlElement,
  name: string,
  diagnostics: ContentDiagnostic[],
  options: { readonly nonNegative?: boolean } = {},
): number | undefined {
  const parsed = parseRequiredInteger(
    readRequiredAttribute(element, name, diagnostics),
    name,
  );
  if (!parsed.ok) {
    diagnostics.push(parsed.diagnostic);
    return undefined;
  }
  if (options.nonNegative && parsed.value < 0) {
    diagnostics.push(
      createXmlDiagnostic('xml.invalid-number', `${name} must be non-negative`),
    );
    return undefined;
  }

  return parsed.value;
}

function readNumberAttribute(
  element: XmlElement,
  name: string,
  diagnostics: ContentDiagnostic[],
  options: { readonly positive?: boolean; readonly nonNegative?: boolean } = {},
): number | undefined {
  const parsed = parseRequiredNumber(
    readRequiredAttribute(element, name, diagnostics),
    name,
  );
  if (!parsed.ok) {
    diagnostics.push(parsed.diagnostic);
    return undefined;
  }
  if (options.positive && parsed.value <= 0) {
    diagnostics.push(
      createXmlDiagnostic('xml.invalid-number', `${name} must be positive`),
    );
    return undefined;
  }
  if (options.nonNegative && parsed.value < 0) {
    diagnostics.push(
      createXmlDiagnostic('xml.invalid-number', `${name} must be non-negative`),
    );
    return undefined;
  }

  return parsed.value;
}

function parseVocation(
  sourceId: string,
  element: XmlElement,
  diagnostics: ContentDiagnostic[],
): CanaryVocationDto | undefined {
  validateAttributes('vocation', element, vocationAttributes, diagnostics);

  const displayName = xmlAttribute(element, 'name');
  const gainHp = readNumberAttribute(element, 'gainhp', diagnostics, {
    nonNegative: true,
  });
  const gainMana = readNumberAttribute(element, 'gainmana', diagnostics, {
    nonNegative: true,
  });
  const gainCapacity = readNumberAttribute(element, 'gaincap', diagnostics, {
    nonNegative: true,
  });
  const baseSpeed = readIntegerAttribute(element, 'basespeed', diagnostics, {
    nonNegative: true,
  });
  const attackSpeedMs = readIntegerAttribute(
    element,
    'attackspeed',
    diagnostics,
    {
      nonNegative: true,
    },
  );
  const manaMultiplier = readNumberAttribute(
    element,
    'manamultiplier',
    diagnostics,
    { positive: true },
  );

  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    diagnostics.push(
      createXmlDiagnostic(
        'xml.missing-attribute',
        'Vocation name must not be empty',
      ),
    );
  }

  const allowedChildElements = new Set([
    'formula',
    'mitigation',
    'pvp',
    'skill',
    'gem',
  ]);
  for (const childName of Object.keys(element).filter(
    (key) => !key.startsWith('@_'),
  )) {
    if (!allowedChildElements.has(childName)) {
      diagnostics.push(
        createXmlDiagnostic(
          'xml.unsupported-element',
          `Unsupported child element ${childName} on vocation ${sourceId}`,
        ),
      );
    }
  }

  for (const [childName, allowedAttributes] of Object.entries(
    ignoredChildAttributes,
  )) {
    for (const child of asXmlElements(element[childName])) {
      validateAttributes(childName, child, allowedAttributes, diagnostics);
    }
  }

  const skillMultipliers: Record<string, number> = {};
  for (const child of asXmlElements(element.skill)) {
    validateAttributes(
      'skill',
      child,
      new Set(['id', 'multiplier']),
      diagnostics,
    );
    const skillId = readIntegerAttribute(child, 'id', diagnostics, {
      nonNegative: true,
    });
    const multiplier = readNumberAttribute(child, 'multiplier', diagnostics, {
      nonNegative: true,
    });
    if (skillId === undefined || multiplier === undefined) continue;

    const key = `skill:${skillId}`;
    if (Object.hasOwn(skillMultipliers, key)) {
      diagnostics.push(
        createXmlDiagnostic(
          'xml.duplicate-skill-id',
          `Duplicate skill ${skillId}`,
        ),
      );
      continue;
    }
    skillMultipliers[key] = multiplier;
  }

  if (
    diagnostics.length > 0 ||
    typeof displayName !== 'string' ||
    gainHp === undefined ||
    gainMana === undefined ||
    gainCapacity === undefined ||
    baseSpeed === undefined ||
    attackSpeedMs === undefined ||
    manaMultiplier === undefined
  ) {
    return undefined;
  }

  return {
    sourceId,
    displayName,
    gainHp,
    gainMana,
    gainCapacity,
    baseSpeed,
    attackSpeedMs,
    manaMultiplier,
    skillMultipliers,
  };
}

export function parseCanaryVocationsXml(
  xml: string,
  sourceIds: readonly string[],
): CanaryParseResult<readonly CanaryVocationDto[]> {
  const document = parseXmlRoot(xml, 'vocations', [
    'vocation',
    'skill',
    'formula',
    'mitigation',
    'pvp',
    'gem',
  ]);
  if (!document.ok) return document;

  const diagnostics: ContentDiagnostic[] = [];
  const byId = new Map<string, XmlElement>();
  for (const vocation of asXmlElements(document.root.vocation)) {
    const rawId = xmlAttribute(vocation, 'id');
    const sourceId = typeof rawId === 'string' ? rawId.trim() : '';
    if (sourceId.length === 0) {
      diagnostics.push(
        createXmlDiagnostic('xml.missing-attribute', 'Vocation id is required'),
      );
      continue;
    }
    if (byId.has(sourceId)) {
      diagnostics.push(
        createXmlDiagnostic(
          'xml.duplicate-id',
          `Duplicate vocation ID ${sourceId}`,
        ),
      );
      continue;
    }
    byId.set(sourceId, vocation);
  }

  const selected = new Map<string, CanaryVocationDto>();
  for (const sourceId of [...new Set(sourceIds)]) {
    const vocation = byId.get(sourceId);
    if (vocation === undefined) {
      diagnostics.push(
        createXmlDiagnostic(
          'xml.entity-not-found',
          `Requested vocation ID ${sourceId} was not found`,
        ),
      );
      continue;
    }

    const dto = parseVocation(sourceId, vocation, diagnostics);
    if (dto !== undefined) selected.set(sourceId, dto);
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics };

  return {
    ok: true,
    value: [...selected.values()].sort((left, right) =>
      left.sourceId.localeCompare(right.sourceId, 'en', { numeric: true }),
    ),
  };
}
