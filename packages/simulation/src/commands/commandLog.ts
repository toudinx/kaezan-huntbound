import type {
  SimulationCommandLog,
  SimulationCommandLogHeader,
  SimulationCommandRecord,
  SimulationDiagnostic,
  SimulationDiagnosticCode,
  SimulationValidationResult,
} from '@huntbound/contracts';
import {
  SimulationCommandLogHeaderSchema,
  SimulationCommandRecordSchema,
  simulationDiagnosticsFromZodError,
  validateSimulationCommandLog,
} from '@huntbound/contracts';

type JsonRecord = Record<string, unknown>;

const headerLineKeys = new Set([
  'kind',
  'schemaVersion',
  'rulesVersion',
  'scenarioId',
  'scenarioRevision',
  'seed',
  'tickCount',
]);

const commandLineKeys = new Set([
  'kind',
  'tick',
  'sequence',
  'issuer',
  'type',
  'payload',
]);

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertSerializableNumber(value: number): void {
  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    Object.is(value, -0)
  ) {
    throw new TypeError('Canonical JSON only accepts finite integers');
  }
}

function canonicalizeJsonValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    assertSerializableNumber(value);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalizeJsonValue);
  }
  if (typeof value === 'object') {
    const output: JsonRecord = {};
    for (const key of Object.keys(value).sort(compareText)) {
      const child = canonicalizeJsonValue((value as JsonRecord)[key]);
      if (child === undefined) {
        throw new TypeError(
          `Canonical JSON cannot contain undefined at ${key}`,
        );
      }
      output[key] = child;
    }
    return output;
  }
  throw new TypeError('Canonical JSON value is not serializable');
}

function canonicalJson(value: unknown): string {
  const serialized = JSON.stringify(canonicalizeJsonValue(value));
  if (serialized === undefined) {
    throw new TypeError('Canonical JSON root is not serializable');
  }
  return serialized;
}

function commandLine(record: SimulationCommandRecord): JsonRecord {
  const { type, ...payload } = record.command;
  return {
    kind: 'command',
    tick: record.tick,
    sequence: record.sequence,
    issuer: record.issuer,
    type,
    payload,
  };
}

function diagnostic(
  code: SimulationDiagnosticCode,
  message: string,
  path: readonly (string | number)[],
): SimulationDiagnostic {
  return { code, message, path };
}

function comparePath(
  left: readonly (string | number)[],
  right: readonly (string | number)[],
): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];
    if (leftValue === rightValue) continue;
    if (leftValue === undefined) return -1;
    if (rightValue === undefined) return 1;
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return leftValue < rightValue ? -1 : 1;
    }
    if (typeof leftValue === 'number') return 1;
    if (typeof rightValue === 'number') return -1;
    return compareText(leftValue, rightValue);
  }
  return left.length === right.length ? 0 : left.length < right.length ? -1 : 1;
}

function sortDiagnostics(
  diagnostics: readonly SimulationDiagnostic[],
): readonly SimulationDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const pathOrder = comparePath(left.path, right.path);
    if (pathOrder !== 0) return pathOrder;
    return compareText(left.code, right.code);
  });
}

function invalid<T>(
  diagnostics: readonly SimulationDiagnostic[],
): SimulationValidationResult<T> {
  return { ok: false, diagnostics: sortDiagnostics(diagnostics) };
}

function prefixedDiagnostics(
  diagnostics: readonly SimulationDiagnostic[],
  prefix: readonly (string | number)[],
): readonly SimulationDiagnostic[] {
  return diagnostics.map((item) => ({
    ...item,
    path: [...prefix, ...item.path],
    message: `${prefix.join('.')}: ${item.message}`,
  }));
}

function unknownKeys(
  value: JsonRecord,
  allowed: ReadonlySet<string>,
): readonly string[] {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

function parseJsonLine(
  text: string,
  lineIndex: number,
): { readonly value: unknown } | { readonly diagnostic: SimulationDiagnostic } {
  try {
    return { value: JSON.parse(text) as unknown };
  } catch {
    return {
      diagnostic: diagnostic(
        'SIM_SCHEMA_INVALID',
        `lines[${lineIndex}]: invalid JSON`,
        ['lines', lineIndex],
      ),
    };
  }
}

function headerDiagnostics(
  value: unknown,
  lineIndex: number,
): readonly SimulationDiagnostic[] {
  if (!isJsonRecord(value)) {
    return [
      diagnostic(
        'SIM_SCHEMA_INVALID',
        `lines[${lineIndex}]: header must be a JSON object`,
        ['lines', lineIndex],
      ),
    ];
  }

  const unknown = unknownKeys(value, headerLineKeys);
  const diagnostics: SimulationDiagnostic[] = unknown.map((key) =>
    diagnostic(
      'SIM_SCHEMA_INVALID',
      `lines[${lineIndex}]: unknown header field ${key}`,
      ['lines', lineIndex, key],
    ),
  );
  const result = SimulationCommandLogHeaderSchema.safeParse(value);
  if (!result.success) {
    diagnostics.push(
      ...prefixedDiagnostics(simulationDiagnosticsFromZodError(result.error), [
        'lines',
        lineIndex,
      ]),
    );
  }
  return diagnostics;
}

function commandDiagnostics(
  value: unknown,
  lineIndex: number,
): readonly SimulationDiagnostic[] {
  if (!isJsonRecord(value)) {
    return [
      diagnostic(
        'SIM_SCHEMA_INVALID',
        `lines[${lineIndex}]: command must be a JSON object`,
        ['lines', lineIndex],
      ),
    ];
  }

  const diagnostics: SimulationDiagnostic[] = unknownKeys(
    value,
    commandLineKeys,
  ).map((key) =>
    diagnostic(
      'SIM_SCHEMA_INVALID',
      `lines[${lineIndex}]: unknown command field ${key}`,
      ['lines', lineIndex, key],
    ),
  );
  if (value.kind !== 'command') {
    diagnostics.push(
      diagnostic(
        'SIM_SCHEMA_INVALID',
        `lines[${lineIndex}]: command line kind must be command`,
        ['lines', lineIndex, 'kind'],
      ),
    );
  }
  const payload = value.payload;
  const payloadIsRecord = isJsonRecord(payload);
  if (!payloadIsRecord) {
    diagnostics.push(
      diagnostic(
        'SIM_SCHEMA_INVALID',
        `lines[${lineIndex}]: command payload must be a JSON object`,
        ['lines', lineIndex, 'payload'],
      ),
    );
  }
  if (payloadIsRecord && Object.hasOwn(payload, 'type')) {
    diagnostics.push(
      diagnostic(
        'SIM_SCHEMA_INVALID',
        `lines[${lineIndex}]: command payload must not contain type`,
        ['lines', lineIndex, 'payload', 'type'],
      ),
    );
  }

  const nestedCommand = {
    ...(payloadIsRecord ? payload : {}),
    type: value.type,
  };
  const result = SimulationCommandRecordSchema.safeParse({
    tick: value.tick,
    sequence: value.sequence,
    issuer: value.issuer,
    command: nestedCommand,
  });
  if (!result.success) {
    diagnostics.push(
      ...prefixedDiagnostics(simulationDiagnosticsFromZodError(result.error), [
        'lines',
        lineIndex,
      ]),
    );
  }
  return diagnostics;
}

function logDiagnosticPath(
  path: readonly (string | number)[],
): readonly (string | number)[] {
  if (path[0] === 'schemaVersion' || path[0] === 'rulesVersion') {
    return ['lines', 0, ...path];
  }
  if (path[0] === 'commands' && typeof path[1] === 'number') {
    return ['lines', path[1] + 1, ...path.slice(2)];
  }
  return ['lines', ...path];
}

export function encodeCommandLog(log: SimulationCommandLog): string {
  const validation = validateSimulationCommandLog(log);
  if (!validation.ok) {
    throw new TypeError(
      `Cannot encode invalid command log: ${validation.diagnostics
        .map((item) => item.code)
        .join(', ')}`,
    );
  }

  const lines = [canonicalJson(validation.value.header)];
  for (const record of validation.value.commands) {
    lines.push(canonicalJson(commandLine(record)));
  }
  return `${lines.join('\n')}\n`;
}

export function decodeCommandLog(
  text: string,
): SimulationValidationResult<SimulationCommandLog> {
  if (typeof text !== 'string') {
    return invalid([
      diagnostic('SIM_SCHEMA_INVALID', 'Command log must be text', ['text']),
    ]);
  }
  if (!text.endsWith('\n')) {
    return invalid([
      diagnostic('SIM_SCHEMA_INVALID', 'Command log must end with a newline', [
        'text',
      ]),
    ]);
  }

  const rawLines = text.split('\n');
  rawLines.pop();
  const diagnostics: SimulationDiagnostic[] = [];
  const parsedLines: unknown[] = [];

  if (rawLines.length === 0) {
    diagnostics.push(
      diagnostic('SIM_SCHEMA_INVALID', 'Command log header is missing', [
        'lines',
      ]),
    );
  }

  rawLines.forEach((rawLine, lineIndex) => {
    if (rawLine.trim().length === 0) {
      diagnostics.push(
        diagnostic(
          'SIM_SCHEMA_INVALID',
          `lines[${lineIndex}]: empty line is not allowed`,
          ['lines', lineIndex],
        ),
      );
      parsedLines.push(undefined);
      return;
    }

    const parsed = parseJsonLine(rawLine, lineIndex);
    if ('diagnostic' in parsed) {
      diagnostics.push(parsed.diagnostic);
      parsedLines.push(undefined);
      return;
    }
    parsedLines.push(parsed.value);
    diagnostics.push(
      ...(lineIndex === 0
        ? headerDiagnostics(parsed.value, lineIndex)
        : commandDiagnostics(parsed.value, lineIndex)),
    );
  });

  const headerResult = SimulationCommandLogHeaderSchema.safeParse(
    parsedLines[0],
  );
  const header: SimulationCommandLogHeader | undefined = headerResult.success
    ? headerResult.data
    : undefined;
  const commands: SimulationCommandRecord[] = [];

  for (let lineIndex = 1; lineIndex < parsedLines.length; lineIndex += 1) {
    const value = parsedLines[lineIndex];
    if (!isJsonRecord(value) || value.kind !== 'command') continue;
    const payload = value.payload;
    const nestedCommand = {
      ...(isJsonRecord(payload) ? payload : {}),
      type: value.type,
    };
    const result = SimulationCommandRecordSchema.safeParse({
      tick: value.tick,
      sequence: value.sequence,
      issuer: value.issuer,
      command: nestedCommand,
    });
    if (result.success) {
      commands.push(result.data);
    }
  }

  if (diagnostics.length > 0 || header === undefined) {
    return invalid(diagnostics);
  }

  const validation = validateSimulationCommandLog({ header, commands });
  if (!validation.ok) {
    return invalid(
      validation.diagnostics.map((item) => ({
        ...item,
        path: logDiagnosticPath(item.path),
      })),
    );
  }
  return validation;
}
