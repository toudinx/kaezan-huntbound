import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildHuntScenario,
  createContentRegistry,
  loadHuntDefinition,
  projectRunBag,
} from '../../packages/content/src/index.ts';
import {
  type GameSave,
  type KernelScenario,
  parseGameSave,
  RuntimeContentBundleSchema,
  type SimulationCommandLog,
  type SimulationDiagnostic,
  validateKernelScenario,
} from '../../packages/contracts/src/index.ts';
import {
  createMemorySaveDriver,
  createSaveRepository,
  encodeSaveDocument,
  migrateSaveDocument,
  SaveError,
} from '../../packages/save/src/index.ts';
import {
  decodeCommandLog,
  encodeCanonicalJson,
  prepareReplayKernel,
  restoreSimulationKernel,
  snapshotKernel,
} from '../../packages/simulation/src/index.ts';

import {
  checkPublishedHashes,
  digestPathFor,
  SAVE_PUBLISHED_HASH_ARTIFACTS,
  type SavePublishedHashArtifact,
  sha256Bytes,
} from './checkPublishedHashes.ts';

export const CHECKPOINT_TICK = 1400;
export const FINAL_TICK = 2700;

const PB05_RELATIVE = 'packages/test-fixtures/hunt/pb05';
const HUNT_DEFINITION_RELATIVE =
  'packages/content/src/generated/hunts/venore-rotworm-cave/hunt.json';
const CATALOG_RELATIVE =
  'packages/content/src/generated/pb-01-contract-coverage.json';

export interface SaveSessionPaths {
  readonly repoRoot: string;
  readonly dir: string;
}

export interface FileDivergence {
  readonly file: string;
  readonly expected: string;
  readonly actual: string;
}

export type SaveSessionResult =
  | { readonly ok: true; readonly digests: Readonly<Record<string, string>> }
  | {
      readonly ok: false;
      readonly kind: 'divergence';
      readonly divergences: readonly FileDivergence[];
    }
  | {
      readonly ok: false;
      readonly kind: 'invalid-input';
      readonly errors: readonly string[];
    };

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function digestLine(digest: string): string {
  return `${digest}\n`;
}

function huntIdFromScenarioId(scenarioId: string): string {
  const prefix = 'scenario:';
  return scenarioId.startsWith(prefix)
    ? scenarioId.slice(prefix.length)
    : scenarioId;
}

async function readUtf8(
  filePath: string,
): Promise<
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly error: string }
> {
  try {
    return { ok: true, text: await readFile(filePath, 'utf8') };
  } catch (error) {
    return {
      ok: false,
      error: `Cannot read ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function invalid(
  errors: readonly string[],
): Extract<SaveSessionResult, { ok: false; kind: 'invalid-input' }> {
  return { ok: false, kind: 'invalid-input', errors };
}

function divergence(
  divergences: readonly FileDivergence[],
): Extract<SaveSessionResult, { ok: false; kind: 'divergence' }> {
  return { ok: false, kind: 'divergence', divergences };
}

function diagnosticMessages(
  diagnostics: readonly SimulationDiagnostic[],
): readonly string[] {
  return diagnostics.map(
    (item) => `${item.code}: ${item.message} at ${item.path.join('.')}`,
  );
}

async function loadPb05ItemKeys(
  repoRoot: string,
  seed: SimulationCommandLog['header']['seed'],
): Promise<
  | { readonly ok: true; readonly itemKeys: readonly string[] }
  | { readonly ok: false; readonly errors: readonly string[] }
> {
  const huntFile = await readUtf8(join(repoRoot, HUNT_DEFINITION_RELATIVE));
  const catalogFile = await readUtf8(join(repoRoot, CATALOG_RELATIVE));
  if (!huntFile.ok || !catalogFile.ok) {
    return {
      ok: false,
      errors: [huntFile.ok ? catalogFile.error : huntFile.error],
    };
  }

  let huntRaw: unknown;
  let catalogRaw: unknown;
  try {
    huntRaw = JSON.parse(huntFile.text) as unknown;
    catalogRaw = JSON.parse(catalogFile.text) as unknown;
  } catch (error) {
    return {
      ok: false,
      errors: [
        `Content documents are not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  const hunt = loadHuntDefinition(huntRaw);
  if (!hunt.ok) {
    return { ok: false, errors: diagnosticMessages(hunt.diagnostics) };
  }

  const runtime = RuntimeContentBundleSchema.safeParse(catalogRaw);
  if (!runtime.success) {
    return {
      ok: false,
      errors: runtime.error.issues.map((issue) => issue.message),
    };
  }

  const character = runtime.data.characters[0];
  if (character === undefined) {
    return { ok: false, errors: ['Catalog is missing the hunt character'] };
  }

  const built = buildHuntScenario(
    hunt.value,
    character,
    createContentRegistry(runtime.data),
    seed,
  );
  if (!built.ok) {
    return { ok: false, errors: diagnosticMessages(built.diagnostics) };
  }

  return { ok: true, itemKeys: built.value.itemKeys };
}

async function loadPb05Documents(repoRoot: string): Promise<
  | {
      readonly ok: true;
      readonly scenario: KernelScenario;
      readonly log: SimulationCommandLog;
      readonly scenarioText: string;
      readonly logText: string;
      readonly finalSnapshotText: string;
      readonly finalSnapshotDigest: string;
      readonly itemKeys: readonly string[];
    }
  | { readonly ok: false; readonly errors: readonly string[] }
> {
  const pb05 = join(repoRoot, PB05_RELATIVE);
  const scenarioFile = await readUtf8(join(pb05, 'scenario.json'));
  const logFile = await readUtf8(join(pb05, 'commands.jsonl'));
  const snapshotFile = await readUtf8(join(pb05, 'snapshot.golden.json'));
  const snapshotSidecar = await readUtf8(join(pb05, 'snapshot.golden.sha256'));
  const unreadable = [
    scenarioFile,
    logFile,
    snapshotFile,
    snapshotSidecar,
  ].filter((entry) => !entry.ok);
  if (
    unreadable.length > 0 ||
    !scenarioFile.ok ||
    !logFile.ok ||
    !snapshotFile.ok ||
    !snapshotSidecar.ok
  ) {
    return {
      ok: false,
      errors: unreadable.map((entry) => (entry.ok ? '' : entry.error)),
    };
  }

  let scenarioJson: unknown;
  try {
    scenarioJson = JSON.parse(scenarioFile.text) as unknown;
  } catch (error) {
    return {
      ok: false,
      errors: [
        `scenario.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  const scenario = validateKernelScenario(scenarioJson);
  if (!scenario.ok) {
    return { ok: false, errors: diagnosticMessages(scenario.diagnostics) };
  }

  const log = decodeCommandLog(logFile.text);
  if (!log.ok) {
    return { ok: false, errors: diagnosticMessages(log.diagnostics) };
  }

  const itemKeys = await loadPb05ItemKeys(repoRoot, log.value.header.seed);
  if (!itemKeys.ok) {
    return itemKeys;
  }

  return {
    ok: true,
    scenario: scenario.value,
    log: log.value,
    scenarioText: scenarioFile.text,
    logText: logFile.text,
    finalSnapshotText: snapshotFile.text,
    finalSnapshotDigest: snapshotSidecar.text.trim(),
    itemKeys: itemKeys.itemKeys,
  };
}

async function persistCheckpoint(
  scenario: KernelScenario,
  log: SimulationCommandLog,
  itemKeys: readonly string[],
): Promise<
  | {
      readonly ok: true;
      readonly document: GameSave;
      readonly exported: string;
    }
  | { readonly ok: false; readonly errors: readonly string[] }
> {
  const prepared = prepareReplayKernel(scenario, log);
  if (!prepared.ok) {
    return { ok: false, errors: diagnosticMessages(prepared.diagnostics) };
  }

  const events = prepared.value.advance(CHECKPOINT_TICK);
  const snapshot = snapshotKernel(prepared.value);
  const bag = projectRunBag(events, itemKeys);
  const repository = createSaveRepository(createMemorySaveDriver());
  await repository.transact((draft) => {
    draft.session = {
      huntId: huntIdFromScenarioId(scenario.scenarioId),
      scenarioId: scenario.scenarioId,
      scenarioRevision: scenario.scenarioRevision,
      seed: log.header.seed,
      snapshot,
      bag,
    };
  });

  const document = await repository.load();
  const exported = await repository.export();
  const exportedAgain = await repository.export();
  if (exported !== exportedAgain) {
    return {
      ok: false,
      errors: ['Two consecutive exports were not identical'],
    };
  }

  return { ok: true, document, exported };
}

function encodeMigrated(legacyText: string): SaveSessionResult & {
  migratedText?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(legacyText) as unknown;
  } catch (error) {
    return invalid([
      `legacy.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    ]);
  }

  let migrated: unknown;
  try {
    migrated = migrateSaveDocument(parsed);
  } catch (error) {
    if (
      error instanceof SaveError &&
      error.code === 'SAVE_VERSION_UNSUPPORTED'
    ) {
      return divergence([
        {
          file: 'legacy.json',
          expected: 'schemaVersion 1',
          actual: error.message,
        },
      ]);
    }
    return invalid([error instanceof Error ? error.message : String(error)]);
  }

  const parsedSave = parseGameSave(migrated);
  if (!parsedSave.ok) {
    return invalid(
      parsedSave.diagnostics.map(
        (item) => `${item.code}: ${item.message} at ${item.path.join('.')}`,
      ),
    );
  }

  return {
    ok: true,
    digests: {},
    migratedText: encodeSaveDocument(parsedSave.value),
  };
}

async function resumeImported(
  scenario: KernelScenario,
  imported: GameSave,
  finalSnapshotText: string,
  finalSnapshotDigest: string,
): Promise<SaveSessionResult> {
  if (imported.session === null) {
    return invalid(['Imported save has no active session to resume']);
  }

  const restored = restoreSimulationKernel(scenario, imported.session.snapshot);
  if (!restored.ok) {
    return invalid(diagnosticMessages(restored.diagnostics));
  }

  restored.value.advance(FINAL_TICK - CHECKPOINT_TICK);
  const resumedText = `${encodeCanonicalJson(snapshotKernel(restored.value))}\n`;
  const resumedDigest = sha256Hex(resumedText);
  const divergences: FileDivergence[] = [];

  if (resumedText !== finalSnapshotText) {
    divergences.push({
      file: `${PB05_RELATIVE}/snapshot.golden.json`,
      expected: sha256Hex(finalSnapshotText),
      actual: resumedDigest,
    });
  }
  if (resumedDigest !== finalSnapshotDigest) {
    divergences.push({
      file: `${PB05_RELATIVE}/snapshot.golden.sha256`,
      expected: finalSnapshotDigest,
      actual: resumedDigest,
    });
  }

  if (divergences.length > 0) {
    return divergence(divergences);
  }
  return { ok: true, digests: { snapshot: resumedDigest } };
}

function hashesMarkdown(
  digests: Readonly<Record<SavePublishedHashArtifact, string>>,
): string {
  const rows = SAVE_PUBLISHED_HASH_ARTIFACTS.map(
    (artifact) => `| \`${artifact}\` | \`${digests[artifact]}\` |`,
  );
  return [
    '# PB-06 save session hashes',
    '',
    'Generated from `pb-05-hunt-combat` (same scenario, command log and seed),',
    'checkpoint tick `1400`, final tick `2700`. This table is the published source',
    'of the four digests; `check-hashes` compares each row to the file bytes and to',
    'the sidecar `.sha256`.',
    '',
    '| Artifact | SHA-256 |',
    '|---|---|',
    ...rows,
    '',
    'The gate proves that persisting the run cannot change the simulation: a kernel',
    'resumed from the imported checkpoint snapshot and advanced to tick `2700`',
    'reproduces `packages/test-fixtures/hunt/pb05/snapshot.golden.json` byte for byte.',
    '',
  ].join('\n');
}

export async function generateSaveFixture(
  paths: SaveSessionPaths,
): Promise<SaveSessionResult> {
  const documents = await loadPb05Documents(paths.repoRoot);
  if (!documents.ok) {
    return invalid(documents.errors);
  }

  const captured = await persistCheckpoint(
    documents.scenario,
    documents.log,
    documents.itemKeys,
  );
  if (!captured.ok) {
    return invalid(captured.errors);
  }

  const legacy = await readUtf8(join(paths.dir, 'legacy.json'));
  if (!legacy.ok) {
    return invalid([legacy.error]);
  }

  const migrated = encodeMigrated(legacy.text);
  if (!migrated.ok) {
    return migrated;
  }
  if (migrated.migratedText === undefined) {
    return invalid(['Migration did not produce a document']);
  }

  const checkpointText = encodeSaveDocument(captured.document);
  await mkdir(paths.dir, { recursive: true });
  const files: Record<SavePublishedHashArtifact, string> = {
    'checkpoint.golden.json': checkpointText,
    'export.golden.txt': captured.exported,
    'legacy.json': legacy.text,
    'migrated.golden.json': migrated.migratedText,
  };

  const digests = {} as Record<SavePublishedHashArtifact, string>;
  await Promise.all(
    SAVE_PUBLISHED_HASH_ARTIFACTS.map(async (artifact) => {
      const body = files[artifact];
      const bytes = Buffer.from(body, 'utf8');
      digests[artifact] = sha256Bytes(bytes);
      if (artifact !== 'legacy.json') {
        await writeFile(join(paths.dir, artifact), body, 'utf8');
      }
      await writeFile(
        digestPathFor(join(paths.dir, artifact)),
        digestLine(digests[artifact]),
        'utf8',
      );
    }),
  );
  await writeFile(
    join(paths.dir, 'hashes.md'),
    hashesMarkdown(digests),
    'utf8',
  );

  return { ok: true, digests };
}

export async function verifySaveFixture(
  paths: SaveSessionPaths,
): Promise<SaveSessionResult> {
  const documents = await loadPb05Documents(paths.repoRoot);
  if (!documents.ok) {
    return invalid(documents.errors);
  }

  const checkpointPath = join(paths.dir, 'checkpoint.golden.json');
  const exportPath = join(paths.dir, 'export.golden.txt');
  const legacyPath = join(paths.dir, 'legacy.json');
  const migratedPath = join(paths.dir, 'migrated.golden.json');
  const [checkpointFile, exportFile, legacyFile, migratedFile] =
    await Promise.all([
      readUtf8(checkpointPath),
      readUtf8(exportPath),
      readUtf8(legacyPath),
      readUtf8(migratedPath),
    ]);
  const unreadable = [
    checkpointFile,
    exportFile,
    legacyFile,
    migratedFile,
  ].filter((entry) => !entry.ok);
  if (
    unreadable.length > 0 ||
    !checkpointFile.ok ||
    !exportFile.ok ||
    !legacyFile.ok ||
    !migratedFile.ok
  ) {
    return invalid(unreadable.map((entry) => (entry.ok ? '' : entry.error)));
  }

  const captured = await persistCheckpoint(
    documents.scenario,
    documents.log,
    documents.itemKeys,
  );
  if (!captured.ok) {
    const messages = captured.errors;
    if (messages.some((message) => message.includes('consecutive exports'))) {
      return divergence([
        {
          file: exportPath,
          expected: sha256Hex(exportFile.text),
          actual: 'non-identical consecutive exports',
        },
      ]);
    }
    return invalid(messages);
  }

  const computedCheckpoint = encodeSaveDocument(captured.document);
  const divergences: FileDivergence[] = [];

  if (computedCheckpoint !== checkpointFile.text) {
    divergences.push({
      file: checkpointPath,
      expected: sha256Hex(checkpointFile.text),
      actual: sha256Hex(computedCheckpoint),
    });
  }

  if (captured.exported !== exportFile.text) {
    divergences.push({
      file: exportPath,
      expected: sha256Hex(exportFile.text),
      actual: sha256Hex(captured.exported),
    });
  }

  const importedRepo = createSaveRepository(createMemorySaveDriver());
  try {
    await importedRepo.import(exportFile.text);
  } catch (error) {
    if (error instanceof SaveError) {
      return invalid([error.message]);
    }
    throw error;
  }
  const imported = await importedRepo.load();
  const importedText = encodeSaveDocument(imported);
  if (importedText !== computedCheckpoint) {
    divergences.push({
      file: exportPath,
      expected: sha256Hex(computedCheckpoint),
      actual: sha256Hex(importedText),
    });
  }

  const resumed = await resumeImported(
    documents.scenario,
    imported,
    documents.finalSnapshotText,
    documents.finalSnapshotDigest,
  );
  if (!resumed.ok) {
    if (resumed.kind === 'divergence') {
      divergences.push(...resumed.divergences);
    } else {
      return resumed;
    }
  }

  const migrated = encodeMigrated(legacyFile.text);
  if (!migrated.ok) {
    if (migrated.kind === 'divergence') {
      divergences.push(...migrated.divergences);
    } else {
      return migrated;
    }
  } else if (
    migrated.migratedText !== undefined &&
    migrated.migratedText !== migratedFile.text
  ) {
    divergences.push({
      file: migratedPath,
      expected: sha256Hex(migratedFile.text),
      actual: sha256Hex(migrated.migratedText),
    });
  }

  const hashes = await checkPublishedHashes(paths.dir);
  if (!hashes.ok) {
    if (hashes.kind === 'invalid-input') {
      return invalid(hashes.errors);
    }
    divergences.push(...hashes.divergences);
  }

  if (divergences.length > 0) {
    return divergence(divergences);
  }

  return {
    ok: true,
    digests: hashes.ok ? hashes.digests : {},
  };
}

export type { SimulationDiagnostic };
