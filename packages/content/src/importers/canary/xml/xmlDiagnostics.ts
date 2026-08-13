import type { ContentDiagnostic } from '@huntbound/contracts';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

import { asXmlElement, type XmlElement } from './xmlTypes.ts';

export type ParsedXmlValue<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly diagnostic: ContentDiagnostic };

export function normalizeXmlName(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function createXmlDiagnostic(
  code: string,
  message: string,
): ContentDiagnostic {
  return { code, severity: 'error', message };
}

export function parseXmlRoot(
  xml: string,
  rootName: string,
  arrayElements: readonly string[],
):
  | { readonly ok: true; readonly root: XmlElement }
  | {
      readonly ok: false;
      readonly diagnostics: readonly ContentDiagnostic[];
    } {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    return {
      ok: false,
      diagnostics: [
        createXmlDiagnostic('xml.malformed', 'XML is not well-formed'),
      ],
    };
  }

  try {
    const parsed = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (tagName: string) => arrayElements.includes(tagName),
    }).parse(xml) as Record<string, unknown>;
    const root = asXmlElement(parsed[rootName]);
    if (root === undefined) {
      return {
        ok: false,
        diagnostics: [
          createXmlDiagnostic(
            'xml.invalid-root',
            `Expected a ${rootName} root element`,
          ),
        ],
      };
    }

    return { ok: true, root };
  } catch {
    return {
      ok: false,
      diagnostics: [
        createXmlDiagnostic('xml.malformed', 'XML could not be parsed'),
      ],
    };
  }
}

function scalarText(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

export function parseRequiredInteger(
  value: unknown,
  field: string,
): ParsedXmlValue<number> {
  const text = scalarText(value);
  if (text === undefined || !/^-?\d+$/.test(text)) {
    return {
      ok: false,
      diagnostic: createXmlDiagnostic(
        'xml.invalid-number',
        `${field} must be an integer`,
      ),
    };
  }

  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed)) {
    return {
      ok: false,
      diagnostic: createXmlDiagnostic(
        'xml.invalid-number',
        `${field} must be a safe integer`,
      ),
    };
  }

  return { ok: true, value: parsed };
}

export function parseRequiredNumber(
  value: unknown,
  field: string,
): ParsedXmlValue<number> {
  const text = scalarText(value);
  if (text === undefined || text.length === 0) {
    return {
      ok: false,
      diagnostic: createXmlDiagnostic(
        'xml.invalid-number',
        `${field} must be a finite number`,
      ),
    };
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    return {
      ok: false,
      diagnostic: createXmlDiagnostic(
        'xml.invalid-number',
        `${field} must be a finite number`,
      ),
    };
  }

  return { ok: true, value: parsed };
}
