import { readdir, readFile } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';

import { createScanner, SyntaxKind } from 'typescript/unstable/ast';

import { checkContentBoundaries } from './content-boundaries.ts';

type DependencyMap = Record<string, string>;

type ExternalRule = {
  allowedDependencies?: string[];
  forbidDomLibraries?: string[];
  forbidNodeBuiltins?: boolean;
};

type PackageManifest = {
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  name?: string;
  optionalDependencies?: DependencyMap;
  peerDependencies?: DependencyMap;
};

type Policy = {
  external?: Record<string, ExternalRule>;
} & Record<string, string[] | Record<string, ExternalRule> | undefined>;

type WorkspacePackage = {
  directory: string;
  manifest: PackageManifest;
  manifestPath: string;
  name: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePolicy(value: unknown): Policy {
  if (!isRecord(value)) {
    throw new Error('Dependency policy must be a JSON object.');
  }

  return value as Policy;
}

function packageName(specifier: string): string {
  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/');
  }

  return specifier.split('/')[0] ?? specifier;
}

function declaredDependencies(manifest: PackageManifest): DependencyMap {
  return {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.optionalDependencies,
    ...manifest.peerDependencies,
  };
}

function isLiteralModuleSpecifier(kind: SyntaxKind): boolean {
  return (
    kind === SyntaxKind.StringLiteral ||
    kind === SyntaxKind.NoSubstitutionTemplateLiteral
  );
}

function importSpecifiers(
  sourceText: string,
): Array<{ column: number; line: number; specifier: string }> {
  const scanner = createScanner(true, undefined, sourceText);
  const tokens: Array<{ kind: SyntaxKind; position: number; value: string }> =
    [];
  let kind = scanner.scan();
  while (kind !== SyntaxKind.EndOfFile) {
    tokens.push({
      kind,
      position: scanner.getTokenStart(),
      value: scanner.getTokenValue(),
    });
    kind = scanner.scan();
  }

  const imports: Array<{ column: number; line: number; specifier: string }> =
    [];

  const add = (token: { position: number; value: string }) => {
    const lineStart = sourceText.lastIndexOf('\n', token.position - 1);
    imports.push({
      column: token.position - lineStart,
      line: sourceText.slice(0, token.position).split('\n').length,
      specifier: token.value,
    });
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) {
      continue;
    }

    const next = tokens[index + 1];
    if (
      token.kind === SyntaxKind.ImportKeyword &&
      next?.kind === SyntaxKind.OpenParenToken
    ) {
      const argument = tokens[index + 2];
      if (argument && isLiteralModuleSpecifier(argument.kind)) {
        add(argument);
      }
      continue;
    }

    if (token.kind === SyntaxKind.ImportKeyword) {
      for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
        const candidate = tokens[cursor];
        if (!candidate || candidate.kind === SyntaxKind.SemicolonToken) {
          break;
        }
        if (isLiteralModuleSpecifier(candidate.kind)) {
          add(candidate);
          break;
        }
      }
      continue;
    }

    if (token.kind !== SyntaxKind.ExportKeyword) {
      continue;
    }

    let foundFrom = false;
    for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
      const candidate = tokens[cursor];
      if (!candidate || candidate.kind === SyntaxKind.SemicolonToken) {
        break;
      }
      if (candidate.kind === SyntaxKind.FromKeyword) {
        foundFrom = true;
        continue;
      }
      if (foundFrom && isLiteralModuleSpecifier(candidate.kind)) {
        add(candidate);
        break;
      }
    }
  }

  return imports;
}

async function directoriesWithPackages(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
      entries
        .filter(
          (entry) =>
            entry.isDirectory() &&
            !['.git', 'dist', 'node_modules'].includes(entry.name),
        )
        .map((entry) => directoriesWithPackages(join(directory, entry.name))),
    );
    const containsManifest = entries.some(
      (entry) => entry.isFile() && entry.name === 'package.json',
    );
    return [...(containsManifest ? [directory] : []), ...nested.flat()];
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function workspacePackages(root: string): Promise<WorkspacePackage[]> {
  const directories = (
    await Promise.all([
      directoriesWithPackages(join(root, 'apps')),
      directoriesWithPackages(join(root, 'packages')),
    ])
  ).flat();

  const packages = await Promise.all(
    directories.map(async (directory) => {
      const manifestPath = join(directory, 'package.json');
      const manifest = JSON.parse(
        await readFile(manifestPath, 'utf8'),
      ) as PackageManifest;
      if (!manifest.name) {
        throw new Error(`${manifestPath} must declare a package name.`);
      }

      return { directory, manifest, manifestPath, name: manifest.name };
    }),
  );
  if (packages.length === 0) {
    throw new Error(`No workspace package manifests found below ${root}.`);
  }
  return packages;
}

function policyDependencies(policy: Policy): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(policy).filter(
      (entry): entry is [string, string[]] =>
        entry[0].startsWith('@huntbound/') && Array.isArray(entry[1]),
    ),
  );
}

function diagnostic(
  root: string,
  filePath: string,
  line: number,
  column: number,
  message: string,
): string {
  return `${relative(root, filePath)}:${line}:${column} — ${message}`;
}

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isDirectory() && !['dist', 'node_modules'].includes(entry.name),
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

async function effectiveLibraries(
  configPath: string,
): Promise<string[] | undefined> {
  const config = JSON.parse(await readFile(configPath, 'utf8')) as {
    compilerOptions?: { lib?: unknown };
    extends?: unknown;
  };
  const libraries = config.compilerOptions?.lib;
  if (
    Array.isArray(libraries) &&
    libraries.every((library) => typeof library === 'string')
  ) {
    return libraries;
  }

  if (typeof config.extends === 'string') {
    const inheritedPath = resolve(
      dirname(configPath),
      config.extends.endsWith('.json')
        ? config.extends
        : `${config.extends}.json`,
    );
    return effectiveLibraries(inheritedPath);
  }

  return undefined;
}

async function simulationUsesDom(
  packageInfo: WorkspacePackage,
): Promise<string | undefined> {
  const libraries = await effectiveLibraries(
    join(packageInfo.directory, 'tsconfig.json'),
  );
  if (!libraries) {
    return 'simulation tsconfig must declare a non-DOM compilerOptions.lib.';
  }

  if (libraries.some((library) => library.toLowerCase().includes('dom'))) {
    return 'simulation tsconfig resolves a DOM library; use a non-DOM lib such as ES2022.';
  }

  return undefined;
}

export async function checkBoundaries(
  root: string,
  policyPath = join(root, 'tools/architecture/dependency-policy.json'),
): Promise<string[]> {
  const policy = parsePolicy(JSON.parse(await readFile(policyPath, 'utf8')));
  const allowedDependencies = policyDependencies(policy);
  const packages = await workspacePackages(root);
  const diagnostics: string[] = [];

  for (const packageInfo of packages) {
    const allowed = allowedDependencies[packageInfo.name];
    if (!allowed) {
      diagnostics.push(
        diagnostic(
          root,
          packageInfo.manifestPath,
          1,
          1,
          `${packageInfo.name} is missing from the dependency policy.`,
        ),
      );
      continue;
    }

    const dependencies = declaredDependencies(packageInfo.manifest);
    const externalRule = policy.external?.[packageInfo.name];

    for (const dependency of Object.keys(dependencies)) {
      if (
        dependency.startsWith('@huntbound/') &&
        !allowed.includes(dependency)
      ) {
        diagnostics.push(
          diagnostic(
            root,
            packageInfo.manifestPath,
            1,
            1,
            `${dependency} is not permitted for ${packageInfo.name}.`,
          ),
        );
      }

      if (externalRule?.forbidDomLibraries?.includes(packageName(dependency))) {
        diagnostics.push(
          diagnostic(
            root,
            packageInfo.manifestPath,
            1,
            1,
            `${dependency} violates the DOM library rule for ${packageInfo.name}.`,
          ),
        );
      }

      if (
        !dependency.startsWith('@huntbound/') &&
        externalRule?.allowedDependencies &&
        !externalRule.allowedDependencies.includes(packageName(dependency))
      ) {
        diagnostics.push(
          diagnostic(
            root,
            packageInfo.manifestPath,
            1,
            1,
            `${dependency} is not permitted for ${packageInfo.name}.`,
          ),
        );
      }
    }

    if (packageInfo.name === '@huntbound/simulation') {
      const domDiagnostic = await simulationUsesDom(packageInfo);
      if (domDiagnostic) {
        diagnostics.push(
          diagnostic(
            root,
            join(packageInfo.directory, 'tsconfig.json'),
            1,
            1,
            domDiagnostic,
          ),
        );
      }
    }

    for (const filePath of await sourceFiles(packageInfo.directory)) {
      const sourceText = await readFile(filePath, 'utf8');
      for (const imported of importSpecifiers(sourceText)) {
        if (
          imported.specifier.startsWith('.') ||
          imported.specifier.startsWith('/')
        ) {
          continue;
        }

        const dependency = packageName(imported.specifier);
        const location = (message: string) =>
          diagnostic(
            root,
            filePath,
            imported.line,
            imported.column,
            `import "${imported.specifier}" ${message}`,
          );

        if (dependency.startsWith('@huntbound/')) {
          if (!allowed.includes(dependency)) {
            diagnostics.push(
              location(`is not permitted for ${packageInfo.name}.`),
            );
          }
          if (!dependencies[dependency]) {
            diagnostics.push(
              location(`must be declared in ${packageInfo.manifestPath}.`),
            );
          }
          continue;
        }

        if (
          externalRule?.forbidNodeBuiltins &&
          (imported.specifier.startsWith('node:') ||
            isBuiltin(imported.specifier))
        ) {
          diagnostics.push(location('violates the Node builtin rule.'));
          continue;
        }

        if (externalRule?.forbidDomLibraries?.includes(dependency)) {
          diagnostics.push(location('violates the DOM library rule.'));
          continue;
        }

        if (
          externalRule?.allowedDependencies &&
          !externalRule.allowedDependencies.includes(dependency)
        ) {
          diagnostics.push(
            location(`is not permitted for ${packageInfo.name}.`),
          );
          continue;
        }

        if (!dependencies[dependency] && !isBuiltin(imported.specifier)) {
          diagnostics.push(
            location(`must be declared in ${packageInfo.manifestPath}.`),
          );
        }
      }
    }
  }

  diagnostics.push(...(await checkContentBoundaries(root)));
  return diagnostics;
}

async function main(): Promise<void> {
  const root = process.argv[2] ?? process.cwd();
  const policyPath = process.argv[3];
  const diagnostics = await checkBoundaries(root, policyPath);
  if (diagnostics.length > 0) {
    console.error(diagnostics.join('\n'));
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
