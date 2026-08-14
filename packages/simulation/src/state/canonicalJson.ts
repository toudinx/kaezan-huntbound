export type CanonicalJsonErrorCode =
  | 'SIM_STATE_NOT_INTEGER'
  | 'SIM_STATE_NOT_SERIALIZABLE';

export class CanonicalJsonError extends TypeError {
  readonly code: CanonicalJsonErrorCode;
  readonly path: readonly (string | number)[];

  constructor(
    code: CanonicalJsonErrorCode,
    path: readonly (string | number)[],
    message: string,
  ) {
    super(message);
    this.name = 'CanonicalJsonError';
    this.code = code;
    this.path = path;
  }
}

function formatPath(path: readonly (string | number)[]): string {
  return path.length === 0 ? '<root>' : path.join('.');
}

function fail(
  code: CanonicalJsonErrorCode,
  path: readonly (string | number)[],
  detail: string,
): never {
  throw new CanonicalJsonError(
    code,
    path,
    `Canonical JSON rejected ${detail} at ${formatPath(path)}`,
  );
}

function compareCodeUnits(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function encodeNumber(
  value: number,
  path: readonly (string | number)[],
): string {
  if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
    fail('SIM_STATE_NOT_INTEGER', path, `the number ${String(value)}`);
  }
  return String(value);
}

function encodeValue(
  value: unknown,
  path: readonly (string | number)[],
  ancestors: ReadonlySet<object>,
): string {
  if (value === null) {
    return 'null';
  }

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      return encodeNumber(value, path);
    case 'string':
      return JSON.stringify(value);
    case 'undefined':
      fail('SIM_STATE_NOT_SERIALIZABLE', path, 'undefined');
      break;
    case 'function':
      fail('SIM_STATE_NOT_SERIALIZABLE', path, 'a function');
      break;
    case 'symbol':
      fail('SIM_STATE_NOT_SERIALIZABLE', path, 'a symbol');
      break;
    case 'bigint':
      fail('SIM_STATE_NOT_SERIALIZABLE', path, 'a bigint');
      break;
    default:
      break;
  }

  const container = value as object;
  if (ancestors.has(container)) {
    fail('SIM_STATE_NOT_SERIALIZABLE', path, 'a cyclic reference');
  }
  const nested = new Set(ancestors).add(container);

  if (Array.isArray(value)) {
    const items = value.map((item, index) =>
      encodeValue(item, [...path, index], nested),
    );
    return `[${items.join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort(compareCodeUnits);
  const entries = keys.map((key) => {
    const encoded = encodeValue(record[key], [...path, key], nested);
    return `${JSON.stringify(key)}:${encoded}`;
  });
  return `{${entries.join(',')}}`;
}

/**
 * Encodes a value as canonical JSON: object keys ordered by UTF-16 code unit,
 * no superfluous whitespace and no trailing newline. The newline belongs to the
 * file, never to the encoded value.
 */
export function encodeCanonicalJson(value: unknown): string {
  return encodeValue(value, [], new Set<object>());
}
