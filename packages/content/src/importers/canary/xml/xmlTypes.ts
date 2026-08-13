export type XmlElement = Readonly<Record<string, unknown>>;

export function asXmlElement(value: unknown): XmlElement | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as XmlElement;
}

export function asXmlElements(value: unknown): readonly XmlElement[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      const element = asXmlElement(entry);
      return element === undefined ? [] : [element];
    });
  }

  const element = asXmlElement(value);
  return element === undefined ? [] : [element];
}

export function xmlAttribute(element: XmlElement, name: string): unknown {
  return element[`@_${name}`];
}

export function xmlAttributeNames(element: XmlElement): readonly string[] {
  return Object.keys(element)
    .filter((key) => key.startsWith('@_'))
    .map((key) => key.slice(2));
}
