/**
 * Canonical JSON for the generated hunt files.
 *
 * The output is reproducible byte for byte from the same snapshot: keys sorted
 * alphabetically at every level, no superfluous whitespace, a single line and a
 * trailing newline. Only integers, booleans, strings and `null` are accepted —
 * a float would make the file depend on formatting instead of on the data.
 */
function encodeValue(value: unknown, path: string): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new Error(
        `Canonical JSON accepts only safe integers: ${path}: ${value}`,
      );
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value
      .map((item, index) => encodeValue(item, `${path}[${index}]`))
      .join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
    );
    return `{${entries
      .map(
        ([key, item]) =>
          `${JSON.stringify(key)}:${encodeValue(item, path === '' ? key : `${path}.${key}`)}`,
      )
      .join(',')}}`;
  }
  throw new Error(`Canonical JSON cannot encode ${path}`);
}

export function encodeCanonicalJson(value: unknown): string {
  return `${encodeValue(value, '')}\n`;
}
