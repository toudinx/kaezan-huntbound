import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

export interface SimulationBoundaryOptions {
  readonly sourceFiles?: readonly string[];
  readonly internalPackages?: readonly string[];
  readonly testOnlyPackages?: readonly string[];
}

const forbiddenGlobals: readonly string[] = [
  'Date',
  'crypto',
  'globalThis',
  'performance',
  'process',
  'queueMicrotask',
  'setImmediate',
  'setInterval',
  'setTimeout',
];

const forbiddenMembers: readonly (readonly [string, string])[] = [
  ['Math', 'random'],
];

async function filesUnder(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries.sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  )) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesUnder(path)));
    } else if (entry.isFile() && path.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

function importSpecifiers(source: string): readonly string[] {
  const values: string[] = [];
  const pattern =
    /\b(?:import|export)\s+(?:[^'";]*?\sfrom\s+)?["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    const value = match[1];
    if (value !== undefined) values.push(value);
  }
  const dynamicPattern = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of source.matchAll(dynamicPattern)) {
    const value = match[1];
    if (value !== undefined) values.push(value);
  }
  return values;
}

interface Token {
  readonly identifier: boolean;
  readonly start: number;
  readonly value: string;
}

const identifierStart = /[A-Za-z_$]/;
const identifierPart = /[A-Za-z0-9_$]/;
const regexPrecedes = new Set([
  '(',
  ',',
  '=',
  ':',
  '[',
  '!',
  '&',
  '|',
  '?',
  '{',
  '}',
  ';',
  '+',
  '-',
  '*',
  '%',
  '<',
  '>',
  '~',
  '^',
  '',
]);

/**
 * Minimal TypeScript lexer. It only distinguishes identifiers from punctuation
 * and skips comments, strings, template literals and regular expressions, which
 * is everything this rule needs. A general-purpose scanner is not used here
 * because it stops at the first template literal and would silently leave the
 * rest of a file unchecked.
 */
function tokenize(source: string): readonly Token[] {
  const tokens: Token[] = [];
  const templates: number[] = [];
  let index = 0;
  let previousSignificant = '';

  const push = (value: string, start: number, identifier: boolean): void => {
    tokens.push({ identifier, start, value });
    previousSignificant = value;
  };

  while (index < source.length) {
    const character = source[index] ?? '';
    const next = source[index + 1] ?? '';

    if (templates.length > 0 && templates[templates.length - 1] === -1) {
      if (character === '\\') {
        index += 2;
        continue;
      }
      if (character === '`') {
        templates.pop();
        index += 1;
        continue;
      }
      if (character === '$' && next === '{') {
        templates.push(0);
        index += 2;
        continue;
      }
      index += 1;
      continue;
    }

    if (character === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }

    if (character === '/' && next === '*') {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === '*' && source[index + 1] === '/')
      ) {
        index += 1;
      }
      index += 2;
      continue;
    }

    if (character === '"' || character === "'") {
      index += 1;
      while (index < source.length && source[index] !== character) {
        index += source[index] === '\\' ? 2 : 1;
      }
      index += 1;
      previousSignificant = 'string';
      continue;
    }

    if (character === '`') {
      templates.push(-1);
      index += 1;
      continue;
    }

    if (character === '/' && regexPrecedes.has(previousSignificant)) {
      index += 1;
      let inClass = false;
      while (index < source.length) {
        const current = source[index];
        if (current === '\\') {
          index += 2;
          continue;
        }
        if (current === '[') inClass = true;
        else if (current === ']') inClass = false;
        else if (current === '/' && !inClass) break;
        else if (current === '\n') break;
        index += 1;
      }
      index += 1;
      previousSignificant = 'regex';
      continue;
    }

    if (identifierStart.test(character)) {
      const start = index;
      while (
        index < source.length &&
        identifierPart.test(source[index] ?? '')
      ) {
        index += 1;
      }
      push(source.slice(start, index), start, true);
      continue;
    }

    if (character === '{' || character === '}') {
      const depth = templates[templates.length - 1];
      if (depth !== undefined && depth >= 0) {
        if (character === '{') {
          templates[templates.length - 1] = depth + 1;
        } else if (depth === 0) {
          templates.pop();
          index += 1;
          continue;
        } else {
          templates[templates.length - 1] = depth - 1;
        }
      }
    }

    if (character.trim() !== '') {
      push(character, index, false);
    }
    index += 1;
  }

  return tokens;
}

function lineOf(source: string, start: number): number {
  let line = 1;
  for (let index = 0; index < start; index += 1) {
    if (source[index] === '\n') line += 1;
  }
  return line;
}

function globalDiagnostics(source: string): readonly [string, number][] {
  const tokens = tokenize(source);
  const found: [string, number][] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined || !token.identifier) {
      continue;
    }

    for (const [object, member] of forbiddenMembers) {
      if (
        token.value === object &&
        tokens[index + 1]?.value === '.' &&
        tokens[index + 2]?.value === member
      ) {
        found.push([`${object}.${member}`, lineOf(source, token.start)]);
      }
    }

    if (tokens[index - 1]?.value === '.' || tokens[index + 1]?.value === ':') {
      continue;
    }

    if (forbiddenGlobals.includes(token.value)) {
      found.push([token.value, lineOf(source, token.start)]);
    }
  }

  return found;
}

export async function checkSimulationBoundaries(
  root: string,
  options: SimulationBoundaryOptions = {},
): Promise<readonly string[]> {
  const sourceFiles =
    options.sourceFiles ??
    (await filesUnder(join(root, 'packages', 'simulation', 'src')));
  const internalPackages = new Set(
    options.internalPackages ?? ['@huntbound/contracts'],
  );
  const testOnlyPackages = new Set(options.testOnlyPackages ?? ['vitest']);
  const diagnostics: string[] = [];

  for (const path of sourceFiles) {
    const label = relative(root, path) || path;
    const source = await readFile(path, 'utf8');
    const isTest = path.endsWith('.test.ts');

    for (const [name, line] of globalDiagnostics(source)) {
      diagnostics.push(
        `${label}:${line} — "${name}" is forbidden in the deterministic kernel`,
      );
    }

    for (const specifier of importSpecifiers(source)) {
      if (specifier.startsWith('.') || specifier.startsWith('/')) {
        continue;
      }
      if (internalPackages.has(specifier)) {
        continue;
      }
      if (isTest && testOnlyPackages.has(specifier)) {
        continue;
      }
      diagnostics.push(
        `${label}: import "${specifier}" is forbidden in the deterministic kernel`,
      );
    }
  }

  return diagnostics;
}
