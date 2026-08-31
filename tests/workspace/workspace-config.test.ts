import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

type PackageManifest = {
  readonly name?: string;
  readonly private?: boolean;
  readonly scripts?: Record<string, string>;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly optionalDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
};

type TsConfig = {
  readonly extends?: string;
};

const workspacePackages = [
  'apps/game',
  'packages/contracts',
  'packages/simulation',
  'packages/content',
  'packages/assets',
  'packages/save',
  'packages/test-fixtures',
] as const;

const requiredRootScripts = [
  'format',
  'format:check',
  'typecheck',
  'test',
  'build',
  'check',
  'verify',
] as const;

const focusedTestScripts = [
  'test:game',
  'test:contracts',
  'test:simulation',
  'test:content',
  'test:assets',
  'test:save',
] as const;

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, 'utf8')) as T;

const directDependencySpecs = (manifest: PackageManifest): string[] =>
  [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.optionalDependencies,
    manifest.peerDependencies,
  ].flatMap((dependencies) => Object.values(dependencies ?? {}));

const isExactVersion = (spec: string): boolean =>
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(spec);

describe('workspace configuration', () => {
  test('declares private @huntbound packages with strict inherited configuration and executable scripts', () => {
    const root = process.cwd();
    const rootPackagePath = resolve(root, 'package.json');

    expect(existsSync(rootPackagePath)).toBe(true);

    const rootPackage = readJson<PackageManifest>(rootPackagePath);
    expect(rootPackage.private).toBe(true);

    for (const scriptName of requiredRootScripts) {
      const script = rootPackage.scripts?.[scriptName];
      expect(script, `missing root script: ${scriptName}`).toBeTypeOf('string');
      expect(script?.trim(), `empty root script: ${scriptName}`).not.toBe('');
      expect(script, `masked root script: ${scriptName}`).not.toContain(
        '|| true',
      );
      expect(script, `masked root script: ${scriptName}`).not.toContain(
        'exit 0',
      );
    }

    for (const packagePath of workspacePackages) {
      const manifest = readJson<PackageManifest>(
        resolve(root, packagePath, 'package.json'),
      );
      const tsconfig = readJson<TsConfig>(
        resolve(root, packagePath, 'tsconfig.json'),
      );

      expect(manifest.name).toMatch(/^@huntbound\/[a-z-]+$/);
      expect(manifest.private).toBe(true);
      const testScript = manifest.scripts?.test;
      expect(testScript, `missing test script: ${packagePath}`).toBeTypeOf(
        'string',
      );
      expect(testScript?.trim(), `empty test script: ${packagePath}`).not.toBe(
        '',
      );
      expect(testScript, `masked test script: ${packagePath}`).not.toContain(
        '|| true',
      );
      expect(testScript, `masked test script: ${packagePath}`).not.toContain(
        'exit 0',
      );
      expect(manifest.scripts?.typecheck?.trim()).not.toBe('');
      expect(manifest.scripts?.build?.trim()).not.toBe('');
      expect(tsconfig.extends).toBe('../../tsconfig.base.json');
      expect(directDependencySpecs(manifest).every(isExactVersion)).toBe(true);
    }

    expect(directDependencySpecs(rootPackage).every(isExactVersion)).toBe(true);
  });

  test('verify is check plus one browser pass — qa:browser already builds', () => {
    const root = readJson<PackageManifest>(
      resolve(process.cwd(), 'package.json'),
    );
    const verify = root.scripts?.verify ?? '';
    const qaBrowser = root.scripts?.['qa:browser'] ?? '';
    const qaBrowserPrebuilt = root.scripts?.['qa:browser:prebuilt'] ?? '';
    const qaBudgets = root.scripts?.['qa:budgets'] ?? '';
    const qaBudgetsPrebuilt = root.scripts?.['qa:budgets:prebuilt'] ?? '';

    expect(qaBrowser).toMatch(/(?:^|&& )corepack pnpm build(?: &&|$)/);
    expect(qaBrowser).toContain('corepack pnpm qa:browser:prebuilt');
    expect(qaBrowserPrebuilt).toBe('playwright test --project=correctness');
    expect(qaBrowserPrebuilt).not.toContain('build');
    expect(qaBudgets).toContain('corepack pnpm build');
    expect(qaBudgets).toContain('corepack pnpm qa:budgets:prebuilt');
    expect(qaBudgetsPrebuilt).toBe('playwright test --project=budgets');
    expect(qaBudgetsPrebuilt).not.toContain('build');
    expect(verify).toBe('corepack pnpm check && corepack pnpm qa:browser');
    expect(verify, 'verify must not build again before qa:browser').not.toMatch(
      /build && (?:corepack pnpm )?qa:browser/,
    );
  });

  test('keeps implementation tests focused and free from asset staging', () => {
    const root = readJson<PackageManifest>(
      resolve(process.cwd(), 'package.json'),
    );

    expect(root.scripts?.test).not.toContain('assets:stage:test');
    for (const scriptName of focusedTestScripts) {
      const script = root.scripts?.[scriptName] ?? '';
      expect(script, `missing focused script: ${scriptName}`).toContain(
        'exec vitest run',
      );
    }
  });
});
