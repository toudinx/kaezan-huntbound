import { readdir, readFile } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import { join, relative } from 'node:path';

import { createScanner, SyntaxKind } from 'typescript/unstable/ast';

interface Token {
  readonly kind: SyntaxKind;
  readonly position: number;
  readonly value: string;
}

interface LocatedToken extends Token {
  readonly column: number;
  readonly line: number;
}

function scanTokens(source: string): readonly Token[] {
  const scanner = createScanner(true, undefined, source);
  const tokens: Token[] = [];
  let kind = scanner.scan();
  while (kind !== SyntaxKind.EndOfFile) {
    tokens.push({
      kind,
      position: scanner.getTokenStart(),
      value: scanner.getTokenValue(),
    });
    kind = scanner.scan();
  }
  return tokens;
}

function isStringToken(kind: SyntaxKind): boolean {
  return (
    kind === SyntaxKind.StringLiteral ||
    kind === SyntaxKind.NoSubstitutionTemplateLiteral
  );
}

function locate(source: string, token: Token): LocatedToken {
  const lineStart = source.lastIndexOf('\n', token.position - 1);
  return {
    ...token,
    column: token.position - lineStart,
    line: source.slice(0, token.position).split('\n').length,
  };
}

function importSpecifiers(source: string): readonly LocatedToken[] {
  const tokens = scanTokens(source);
  const imports: LocatedToken[] = [];
  const add = (token: Token) => imports.push(locate(source, token));

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined) continue;
    const next = tokens[index + 1];
    if (
      token.kind === SyntaxKind.ImportKeyword &&
      next?.kind === SyntaxKind.OpenParenToken
    ) {
      const argument = tokens[index + 2];
      if (argument !== undefined && isStringToken(argument.kind)) add(argument);
      continue;
    }
    if (token.kind === SyntaxKind.ImportKeyword) {
      for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
        const candidate = tokens[cursor];
        if (
          candidate === undefined ||
          candidate.kind === SyntaxKind.SemicolonToken
        ) {
          break;
        }
        if (isStringToken(candidate.kind)) {
          add(candidate);
          break;
        }
      }
      continue;
    }
    if (token.kind !== SyntaxKind.ExportKeyword) continue;
    let foundFrom = false;
    for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
      const candidate = tokens[cursor];
      if (
        candidate === undefined ||
        candidate.kind === SyntaxKind.SemicolonToken
      ) {
        break;
      }
      if (candidate.kind === SyntaxKind.FromKeyword) {
        foundFrom = true;
        continue;
      }
      if (foundFrom && isStringToken(candidate.kind)) {
        add(candidate);
        break;
      }
    }
  }
  return imports;
}

function stringLiterals(source: string): readonly LocatedToken[] {
  return scanTokens(source)
    .filter((token) => isStringToken(token.kind))
    .map((token) => locate(source, token));
}

async function sourceFiles(directory: string): Promise<readonly string[]> {
  let entries: readonly import('node:fs').Dirent<string>[];
  try {
    entries = await readdir(directory, {
      encoding: 'utf8',
      withFileTypes: true,
    });
  } catch {
    return [];
  }
  const nested = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !['.git', 'dist', 'node_modules', 'public'].includes(entry.name),
      )
      .map((entry) => sourceFiles(join(directory, entry.name))),
  );
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        ['.cts', '.mts', '.ts', '.tsx'].some((extension) =>
          entry.name.endsWith(extension),
        ),
    )
    .map((entry) => join(directory, entry.name));
  return [...files, ...nested.flat()];
}

function normalizedPath(root: string, filePath: string): string {
  return relative(root, filePath).replaceAll('\\', '/');
}

function isCompositionProfilePath(relativePath: string): boolean {
  return (
    relativePath === 'apps/game/vite.config.ts' ||
    relativePath === 'apps/game/src/assets/AssetProfile.ts'
  );
}

function isToolingOrManifestPath(relativePath: string): boolean {
  return (
    relativePath.startsWith('tools/asset-packer/') ||
    relativePath.startsWith('packages/assets/catalog/') ||
    relativePath.startsWith('packages/test-fixtures/') ||
    relativePath.startsWith('packages/assets/src/manifest/') ||
    isCompositionProfilePath(relativePath)
  );
}

function diagnostic(
  root: string,
  filePath: string,
  token: LocatedToken,
  message: string,
): string {
  return (
    normalizedPath(root, filePath) +
    ':' +
    token.line +
    ':' +
    token.column +
    ' — ' +
    message
  );
}

function isMediaLiteral(value: string): boolean {
  return /\.(?:png|webp|jpg|jpeg|gif|avif)(?:[?#].*)?$/i.test(value);
}

function isPackOrMediaPath(value: string): boolean {
  return (
    /(?:^|\/)packs\//.test(value) ||
    /(?:^|\/)media\//.test(value) ||
    /(?:^|\/)(?:pack|catalog)\.json(?:$|[?#])/.test(value)
  );
}

function packageName(specifier: string): string {
  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/');
  }
  return specifier.split('/')[0] ?? specifier;
}

function isForbiddenAssetImport(specifier: string): boolean {
  return (
    specifier === 'phaser' ||
    isBuiltin(specifier) ||
    ['fs', 'fs/promises', 'path', 'path/posix'].includes(packageName(specifier))
  );
}

async function consumerSourceFiles(root: string): Promise<readonly string[]> {
  const appFiles = await sourceFiles(join(root, 'apps/game/src'));
  let packageEntries: readonly import('node:fs').Dirent<string>[] = [];
  try {
    packageEntries = await readdir(join(root, 'packages'), {
      encoding: 'utf8',
      withFileTypes: true,
    });
  } catch {
    packageEntries = [];
  }
  const featureFiles = await Promise.all(
    packageEntries
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !['assets', 'simulation', 'test-fixtures'].includes(entry.name),
      )
      .map((entry) => sourceFiles(join(root, 'packages', entry.name, 'src'))),
  );
  return [...appFiles, ...featureFiles.flat()].filter(
    (filePath) =>
      normalizedPath(root, filePath) !== 'apps/game/src/assets/AssetProfile.ts',
  );
}

export async function checkAssetBoundaries(
  root: string,
): Promise<readonly string[]> {
  const diagnostics: string[] = [];

  const simulationFiles = await sourceFiles(
    join(root, 'packages/simulation/src'),
  );
  for (const filePath of simulationFiles) {
    const source = await readFile(filePath, 'utf8');
    for (const token of importSpecifiers(source)) {
      if (token.value === '@huntbound/assets') {
        diagnostics.push(
          diagnostic(
            root,
            filePath,
            token,
            'simulation cannot import @huntbound/assets',
          ),
        );
      }
    }
    for (const token of stringLiterals(source)) {
      if (isMediaLiteral(token.value)) {
        diagnostics.push(
          diagnostic(
            root,
            filePath,
            token,
            'media path literal "' +
              token.value +
              '" is forbidden in simulation consumers',
          ),
        );
      }
      if (
        token.value.includes('assets/personal') ||
        isPackOrMediaPath(token.value)
      ) {
        diagnostics.push(
          diagnostic(
            root,
            filePath,
            token,
            'asset pack/media path literal "' +
              token.value +
              '" is forbidden in simulation consumers',
          ),
        );
      }
    }
  }

  const assetFiles = await sourceFiles(join(root, 'packages/assets/src'));
  for (const filePath of assetFiles) {
    const source = await readFile(filePath, 'utf8');
    for (const token of importSpecifiers(source)) {
      if (!isForbiddenAssetImport(token.value)) continue;
      diagnostics.push(
        diagnostic(
          root,
          filePath,
          token,
          `browser asset package cannot import ${token.value}`,
        ),
      );
    }
  }

  const consumerFiles = await consumerSourceFiles(root);
  for (const filePath of consumerFiles) {
    const relativePath = normalizedPath(root, filePath);
    if (isToolingOrManifestPath(relativePath)) continue;
    const source = await readFile(filePath, 'utf8');
    for (const token of stringLiterals(source)) {
      if (isMediaLiteral(token.value)) {
        diagnostics.push(
          diagnostic(
            root,
            filePath,
            token,
            'media file literal "' +
              token.value +
              '" is forbidden in consumer code',
          ),
        );
      }
      if (
        token.value.includes('/packs/') ||
        token.value.includes('assets/personal') ||
        isPackOrMediaPath(token.value)
      ) {
        diagnostics.push(
          diagnostic(
            root,
            filePath,
            token,
            'asset manifest/media path literal "' +
              token.value +
              '" is forbidden in consumer code',
          ),
        );
      }
    }
  }

  return diagnostics.sort((left, right) => left.localeCompare(right));
}
