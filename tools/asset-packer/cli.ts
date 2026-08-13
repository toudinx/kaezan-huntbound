import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';

import {
  type AssetBuildProfile,
  type AssetDiagnostic,
  AssetSelectionManifestSchema,
  AssetSourceLockSchema,
} from '../../packages/assets/src/index.ts';

import { buildAssetPackManifest } from './application/buildAssetPack.ts';
import { materializeAssetPack } from './application/materializeAssetPack.ts';
import { compareAssetPackTrees } from './pack/compareAssetPackTrees.ts';
import { verifyMaterializedAssetPack } from './pack/verifyMaterializedAssetPack.ts';
import { buildAssetProfile } from './profile/buildAssetProfile.ts';
import { stageAssetProfile } from './profile/stageAssetProfile.ts';
import { validateAssetProfileTree } from './profile/validateAssetProfileTree.ts';
import { verifyAssetSourceLock } from './source/sourceLock.ts';
import {
  type ArenaFableSourceManifest,
  parseArenaFableSourceManifest,
} from './source/sourceManifest.ts';

type AssetPackerCommand =
  | {
      readonly kind: 'build';
      readonly check: boolean;
      readonly selectionPath: string;
      readonly sourceLockPath: string;
      readonly sourceRoot: string;
      readonly output: string;
    }
  | {
      readonly kind: 'verify-pack';
      readonly packRoot: string;
    }
  | {
      readonly kind: 'source-verify';
      readonly sourceLockPath: string;
      readonly sourceRoot: string;
    }
  | {
      readonly kind: 'profile-check';
      readonly profile: AssetBuildProfile;
      readonly profileRoot: string;
    }
  | {
      readonly kind: 'stage-profile';
      readonly profile: AssetBuildProfile;
      readonly sourceProfileRoot: string;
      readonly output: string;
    }
  | {
      readonly kind: 'build-profile';
      readonly check: boolean;
      readonly profile: AssetBuildProfile;
      readonly selectionPath: string;
      readonly sourceLockPath: string;
      readonly sourceRoot: string;
      readonly output: string;
    };

export interface AssetPackerCliIo {
  stdout(value: unknown): void;
  stderr(value: unknown): void;
  usage(): void;
}

const usageText = `Usage:
  node tools/asset-packer/cli.ts build [--check] --selection <path> --source-lock <path> [--source-root <path>] --output <path>
  node tools/asset-packer/cli.ts verify-pack --pack-root <path>
  node tools/asset-packer/cli.ts source verify --source-lock <path> [--source-root <path>]
  node tools/asset-packer/cli.ts profile-check --profile <test|personal|product> --profile-root <path>
  node tools/asset-packer/cli.ts stage-profile --profile <test|personal|product> --source-profile-root <path> --output <path>
  node tools/asset-packer/cli.ts build-profile [--check] --profile <test|personal|product> --selection <path> --source-lock <path> [--source-root <path>|--source-root-env HUNTBOUND_PERSONAL_ASSET_SOURCE] --output <path>`;

const processIo: AssetPackerCliIo = {
  stdout(value) {
    process.stdout.write(`${JSON.stringify(value)}\n`);
  },
  stderr(value) {
    process.stderr.write(`${JSON.stringify(value)}\n`);
  },
  usage() {
    process.stderr.write(`${usageText}\n`);
  },
};

function parseOptions(
  args: readonly string[],
  valueNames: ReadonlySet<string>,
  booleanNames: ReadonlySet<string> = new Set(),
):
  | {
      readonly ok: true;
      readonly values: ReadonlyMap<string, string>;
      readonly booleans: ReadonlySet<string>;
    }
  | { readonly ok: false } {
  const values = new Map<string, string>();
  const booleans = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (name === undefined || !name.startsWith('--')) return { ok: false };
    if (booleanNames.has(name)) {
      if (booleans.has(name)) return { ok: false };
      booleans.add(name);
      continue;
    }
    if (!valueNames.has(name) || values.has(name)) return { ok: false };
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) return { ok: false };
    values.set(name, value);
    index += 1;
  }
  return { ok: true, values, booleans };
}

function requiredValue(
  values: ReadonlyMap<string, string>,
  name: string,
): string | undefined {
  const value = values.get(name);
  return value === undefined || value.length === 0 ? undefined : value;
}

function parseBuildCommand(
  args: readonly string[],
): AssetPackerCommand | undefined {
  const options = parseOptions(
    args,
    new Set(['--selection', '--source-lock', '--source-root', '--output']),
    new Set(['--check']),
  );
  if (!options.ok) return undefined;
  const selectionPath = requiredValue(options.values, '--selection');
  const sourceLockPath = requiredValue(options.values, '--source-lock');
  const sourceRoot =
    requiredValue(options.values, '--source-root') ??
    process.env.HUNTBOUND_PERSONAL_ASSET_SOURCE;
  const output = requiredValue(options.values, '--output');
  return selectionPath !== undefined &&
    sourceLockPath !== undefined &&
    sourceRoot !== undefined &&
    output !== undefined
    ? {
        kind: 'build',
        check: options.booleans.has('--check'),
        selectionPath,
        sourceLockPath,
        sourceRoot,
        output,
      }
    : undefined;
}

function parseVerifyPackCommand(
  args: readonly string[],
): AssetPackerCommand | undefined {
  const options = parseOptions(args, new Set(['--pack-root']));
  if (!options.ok) return undefined;
  const packRoot = requiredValue(options.values, '--pack-root');
  return packRoot === undefined ? undefined : { kind: 'verify-pack', packRoot };
}

function parseSourceVerifyCommand(
  args: readonly string[],
): AssetPackerCommand | undefined {
  const options = parseOptions(
    args,
    new Set(['--source-lock', '--lock', '--source-root']),
  );
  if (!options.ok) return undefined;
  const explicitSourceLock = requiredValue(options.values, '--source-lock');
  const aliasSourceLock = requiredValue(options.values, '--lock');
  if (explicitSourceLock !== undefined && aliasSourceLock !== undefined) {
    return undefined;
  }
  const sourceLockPath = explicitSourceLock ?? aliasSourceLock;
  const sourceRoot =
    requiredValue(options.values, '--source-root') ??
    process.env.HUNTBOUND_PERSONAL_ASSET_SOURCE;
  return sourceLockPath === undefined || sourceRoot === undefined
    ? undefined
    : { kind: 'source-verify', sourceLockPath, sourceRoot };
}

function parseProfile(
  value: string | undefined,
): AssetBuildProfile | undefined {
  return value === 'test' || value === 'personal' || value === 'product'
    ? value
    : undefined;
}

function parseProfileCheckCommand(
  args: readonly string[],
): AssetPackerCommand | undefined {
  const options = parseOptions(args, new Set(['--profile', '--profile-root']));
  if (!options.ok) return undefined;
  const profile = parseProfile(requiredValue(options.values, '--profile'));
  const profileRoot = requiredValue(options.values, '--profile-root');
  return profile === undefined || profileRoot === undefined
    ? undefined
    : { kind: 'profile-check', profile, profileRoot };
}

function parseStageProfileCommand(
  args: readonly string[],
): AssetPackerCommand | undefined {
  const options = parseOptions(
    args,
    new Set(['--profile', '--source-profile-root', '--output']),
  );
  if (!options.ok) return undefined;
  const profile = parseProfile(requiredValue(options.values, '--profile'));
  const sourceProfileRoot = requiredValue(
    options.values,
    '--source-profile-root',
  );
  const output = requiredValue(options.values, '--output');
  return profile === undefined ||
    sourceProfileRoot === undefined ||
    output === undefined
    ? undefined
    : { kind: 'stage-profile', profile, sourceProfileRoot, output };
}

function parseBuildProfileCommand(
  args: readonly string[],
): AssetPackerCommand | undefined {
  const options = parseOptions(
    args,
    new Set([
      '--profile',
      '--selection',
      '--source-lock',
      '--source-root',
      '--source-root-env',
      '--output',
    ]),
    new Set(['--check']),
  );
  if (!options.ok) return undefined;
  const profile = parseProfile(requiredValue(options.values, '--profile'));
  const selectionPath = requiredValue(options.values, '--selection');
  const sourceLockPath = requiredValue(options.values, '--source-lock');
  const explicitSourceRoot = requiredValue(options.values, '--source-root');
  const sourceRootEnv = requiredValue(options.values, '--source-root-env');
  const output = requiredValue(options.values, '--output');
  if (
    profile === undefined ||
    selectionPath === undefined ||
    sourceLockPath === undefined ||
    output === undefined ||
    (explicitSourceRoot !== undefined && sourceRootEnv !== undefined)
  ) {
    return undefined;
  }
  let sourceRoot = explicitSourceRoot;
  if (sourceRootEnv !== undefined) {
    if (sourceRootEnv !== 'HUNTBOUND_PERSONAL_ASSET_SOURCE') return undefined;
    sourceRoot = process.env.HUNTBOUND_PERSONAL_ASSET_SOURCE;
  }
  if (sourceRoot === undefined || !isAbsolute(sourceRoot)) return undefined;
  return {
    kind: 'build-profile',
    check: options.booleans.has('--check'),
    profile,
    selectionPath,
    sourceLockPath,
    sourceRoot,
    output,
  };
}

function parseCommand(args: readonly string[]): AssetPackerCommand | undefined {
  switch (args[0]) {
    case 'build':
      return parseBuildCommand(args.slice(1));
    case 'verify-pack':
      return parseVerifyPackCommand(args.slice(1));
    case 'source':
      return args[1] === 'verify'
        ? parseSourceVerifyCommand(args.slice(2))
        : undefined;
    case 'profile-check':
      return parseProfileCheckCommand(args.slice(1));
    case 'stage-profile':
      return parseStageProfileCommand(args.slice(1));
    case 'build-profile':
      return parseBuildProfileCommand(args.slice(1));
    default:
      return undefined;
  }
}

function schemaDiagnostic(path: string, message: string): AssetDiagnostic {
  return {
    code: 'ASSET_SCHEMA_INVALID',
    severity: 'error',
    message,
    path: [path],
  };
}

async function readJson(
  path: string,
  logicalName: string,
): Promise<
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly diagnostics: readonly AssetDiagnostic[] }
> {
  try {
    return {
      ok: true,
      value: JSON.parse(await readFile(path, 'utf8')) as unknown,
    };
  } catch {
    return {
      ok: false,
      diagnostics: [
        schemaDiagnostic(logicalName, `${logicalName} JSON cannot be read`),
      ],
    };
  }
}

function materializedSummary(
  command: 'build' | 'verify-pack',
  value: {
    readonly packId: string;
    readonly packSha256: string;
    readonly mediaCount: number;
    readonly byteCount: number;
    readonly paths: readonly string[];
  },
  check?: boolean,
) {
  return {
    ok: true,
    command,
    ...(check === undefined ? {} : { check }),
    packId: value.packId,
    packSha256: value.packSha256,
    mediaCount: value.mediaCount,
    byteCount: value.byteCount,
    paths: value.paths,
  };
}

async function runSourceVerify(
  command: Extract<AssetPackerCommand, { readonly kind: 'source-verify' }>,
  io: AssetPackerCliIo,
): Promise<number> {
  const rawLock = await readJson(command.sourceLockPath, 'source-lock');
  if (!rawLock.ok) {
    io.stderr(rawLock.diagnostics);
    return 1;
  }
  const lock = AssetSourceLockSchema.safeParse(rawLock.value);
  if (!lock.success) {
    io.stderr([
      schemaDiagnostic('source-lock', 'Source lock schema is invalid'),
    ]);
    return 1;
  }
  const verified = await verifyAssetSourceLock({
    sourceRoot: command.sourceRoot,
    lock: lock.data,
  });
  if (!verified.ok) {
    io.stderr(verified.diagnostics);
    return 1;
  }
  io.stdout({
    ok: true,
    command: 'source verify',
    source: verified.value.source,
    sourceSnapshot: verified.value.sourceSnapshot,
    manifest: {
      ...verified.value.manifest,
      verified: true,
    },
    files: {
      verified: verified.value.files.length,
      total: verified.value.files.length,
    },
  });
  return 0;
}

async function loadBuildInputs(
  command: Extract<AssetPackerCommand, { readonly kind: 'build' }>,
  io: AssetPackerCliIo,
): Promise<
  | {
      readonly selection: ReturnType<typeof AssetSelectionManifestSchema.parse>;
      readonly sourceLock: ReturnType<typeof AssetSourceLockSchema.parse>;
      readonly sourceManifest: ArenaFableSourceManifest;
    }
  | undefined
> {
  const [rawSelection, rawLock] = await Promise.all([
    readJson(command.selectionPath, 'selection'),
    readJson(command.sourceLockPath, 'source-lock'),
  ]);
  if (!rawSelection.ok || !rawLock.ok) {
    io.stderr([
      ...(rawSelection.ok ? [] : rawSelection.diagnostics),
      ...(rawLock.ok ? [] : rawLock.diagnostics),
    ]);
    return undefined;
  }
  const selection = AssetSelectionManifestSchema.safeParse(rawSelection.value);
  const sourceLock = AssetSourceLockSchema.safeParse(rawLock.value);
  if (!selection.success || !sourceLock.success) {
    io.stderr([
      ...(selection.success
        ? []
        : [schemaDiagnostic('selection', 'Selection schema is invalid')]),
      ...(sourceLock.success
        ? []
        : [schemaDiagnostic('source-lock', 'Source lock schema is invalid')]),
    ]);
    return undefined;
  }

  const verifiedLock = await verifyAssetSourceLock({
    sourceRoot: command.sourceRoot,
    lock: sourceLock.data,
  });
  if (!verifiedLock.ok) {
    io.stderr(verifiedLock.diagnostics);
    return undefined;
  }
  const rawManifest = await readJson(
    join(command.sourceRoot, 'manifest.json'),
    'manifest.json',
  );
  if (!rawManifest.ok) {
    io.stderr(rawManifest.diagnostics);
    return undefined;
  }
  const sourceManifest = parseArenaFableSourceManifest(rawManifest.value);
  if (!sourceManifest.ok) {
    io.stderr(sourceManifest.diagnostics);
    return undefined;
  }
  return {
    selection: selection.data,
    sourceLock: sourceLock.data,
    sourceManifest: sourceManifest.value,
  };
}

async function runBuild(
  command: Extract<AssetPackerCommand, { readonly kind: 'build' }>,
  io: AssetPackerCliIo,
): Promise<number> {
  const inputs = await loadBuildInputs(command, io);
  if (inputs === undefined) return 1;
  const manifest = buildAssetPackManifest(inputs);
  if (!manifest.ok) {
    io.stderr(manifest.diagnostics);
    return 1;
  }

  if (!command.check) {
    const materialized = await materializeAssetPack({
      sourceRoot: command.sourceRoot,
      destination: command.output,
      manifest: manifest.value,
    });
    if (!materialized.ok) {
      io.stderr(materialized.diagnostics);
      return 1;
    }
    io.stdout(materializedSummary('build', materialized.value, false));
    return 0;
  }

  const temporaryRoot = await mkdtemp(
    join(tmpdir(), 'huntbound-asset-pack-check-'),
  );
  try {
    const generatedRoot = join(temporaryRoot, 'pack');
    const materialized = await materializeAssetPack({
      sourceRoot: command.sourceRoot,
      destination: generatedRoot,
      manifest: manifest.value,
    });
    if (!materialized.ok) {
      io.stderr(materialized.diagnostics);
      return 1;
    }
    const comparison = await compareAssetPackTrees(
      generatedRoot,
      command.output,
    );
    if (!comparison.equal) {
      io.stderr({
        code: 'ASSET_PACK_CONFLICT',
        message: 'Materialized asset pack differs from the expected tree',
        differences: comparison.differences,
      });
      return 1;
    }
    io.stdout(materializedSummary('build', materialized.value, true));
    return 0;
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

function profileSummary(
  command: 'profile-check' | 'stage-profile',
  profile: AssetBuildProfile,
  value: {
    readonly packs: readonly {
      readonly reference: { readonly manifestPath: string };
      readonly verified: {
        readonly mediaCount: number;
        readonly byteCount: number;
        readonly packSha256: string;
      };
    }[];
  },
) {
  return {
    ok: true,
    command,
    profile,
    packCount: value.packs.length,
    mediaCount: value.packs.reduce(
      (total, pack) => total + pack.verified.mediaCount,
      0,
    ),
    byteCount: value.packs.reduce(
      (total, pack) => total + pack.verified.byteCount,
      0,
    ),
    packSha256: value.packs[0]?.verified.packSha256 ?? '',
    paths: [
      'catalog.json',
      ...value.packs.map((pack) => pack.reference.manifestPath),
    ].sort(),
  };
}

async function runProfileCheck(
  command: Extract<AssetPackerCommand, { readonly kind: 'profile-check' }>,
  io: AssetPackerCliIo,
): Promise<number> {
  const validated = await validateAssetProfileTree({
    profile: command.profile,
    profileRoot: command.profileRoot,
    catalogPath: 'catalog.json',
  });
  if (!validated.ok) {
    io.stderr(validated.diagnostics);
    return 1;
  }
  io.stdout(profileSummary('profile-check', command.profile, validated.value));
  return 0;
}

async function runStageProfile(
  command: Extract<AssetPackerCommand, { readonly kind: 'stage-profile' }>,
  io: AssetPackerCliIo,
): Promise<number> {
  const staged = await stageAssetProfile({
    profile: command.profile,
    sourceProfileRoot: command.sourceProfileRoot,
    destinationProfileRoot: command.output,
  });
  if (!staged.ok) {
    io.stderr(staged.diagnostics);
    return 1;
  }
  io.stdout(profileSummary('stage-profile', command.profile, staged.value));
  return 0;
}

async function runBuildProfile(
  command: Extract<AssetPackerCommand, { readonly kind: 'build-profile' }>,
  io: AssetPackerCliIo,
): Promise<number> {
  const built = await buildAssetProfile(command);
  if (!built.ok) {
    io.stderr(built.diagnostics);
    return 1;
  }
  io.stdout({ ok: true, command: 'build-profile', ...built.value });
  return 0;
}

async function runVerifyPack(
  command: Extract<AssetPackerCommand, { readonly kind: 'verify-pack' }>,
  io: AssetPackerCliIo,
): Promise<number> {
  const verified = await verifyMaterializedAssetPack({
    packRoot: command.packRoot,
  });
  if (!verified.ok) {
    io.stderr(verified.diagnostics);
    return 1;
  }
  io.stdout(materializedSummary('verify-pack', verified.value));
  return 0;
}

export async function runAssetPackerCli(
  args: readonly string[],
  io: AssetPackerCliIo = processIo,
): Promise<number> {
  const command = parseCommand(args);
  if (command === undefined) {
    io.usage();
    return 2;
  }
  switch (command.kind) {
    case 'build':
      return runBuild(command, io);
    case 'verify-pack':
      return runVerifyPack(command, io);
    case 'source-verify':
      return runSourceVerify(command, io);
    case 'profile-check':
      return runProfileCheck(command, io);
    case 'stage-profile':
      return runStageProfile(command, io);
    case 'build-profile':
      return runBuildProfile(command, io);
  }
}

if (import.meta.main) {
  process.exitCode = await runAssetPackerCli(process.argv.slice(2));
}
