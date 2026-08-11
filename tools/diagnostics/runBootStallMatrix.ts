import { spawn } from 'node:child_process';
import {
  access,
  appendFile,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { hostname, platform, release } from 'node:os';
import { join } from 'node:path';

import {
  aggregateMatrix,
  type ControlRunRecord,
  STALL_THRESHOLD_MS,
} from './bootStall.ts';
import {
  type ControlId,
  controlDefinitions,
  controlOrder,
  isControlId,
} from './controls.ts';
import {
  previewOrigin,
  previewPort,
  probeOrigin,
  repoRoot,
  startPreview,
} from './previewServer.ts';

/**
 * Reproduces the four PB-00R-02 controls and writes raw, per-execution output
 * plus a generated matrix. Diagnostic only: nothing produced here is acceptance
 * evidence, and it never audits the historical matrix, which stays labelled as
 * an independently unverified report.
 */

const artifactsDirectory = join(
  repoRoot,
  'docs',
  'playbooks',
  'PB-00R',
  'artifacts',
  'diagnostics',
);
const runsPath = join(artifactsDirectory, 'boot-stall-runs.jsonl');
const matrixPath = join(artifactsDirectory, 'boot-stall-matrix.md');
// Line-delimited on purpose. These are generated data artifacts, and Biome
// formats `.json` in this repo: a pretty-printed object would be reported as a
// formatting error on every session, for a file no human writes.
const sessionPath = join(artifactsDirectory, 'boot-stall-session.jsonl');
const runControlPath = join(import.meta.dirname, 'runControl.ts');

interface Options {
  /** Execution count per control, declared before the session starts. */
  readonly runsByControl: ReadonlyMap<ControlId, number>;
  readonly controls: readonly ControlId[];
}

function positiveInteger(raw: string): number {
  const value = Number.parseInt(raw, 10);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Run counts must be positive integers; received "${raw}".`);
  }

  return value;
}

/**
 * `--runs 30` applies one count to every control; `--runs A=30,B=75` declares
 * them individually. Either way the plan is fixed before any execution, so N is
 * never adjusted in response to what the runs show.
 */
function parseOptions(argv: readonly string[]): Options {
  const values = new Map<string, string>();

  for (let cursor = 0; cursor < argv.length; cursor += 2) {
    const flag = argv[cursor];
    const value = argv[cursor + 1];

    if (flag?.startsWith('--') && value !== undefined) {
      values.set(flag.slice(2), value);
    }
  }

  const requested = values.get('runs') ?? '30';
  const runsByControl = new Map<ControlId, number>();

  if (requested.includes('=')) {
    for (const entry of requested.split(',')) {
      const [control, count] = entry.split('=').map((part) => part.trim());

      if (!control || !isControlId(control) || count === undefined) {
        throw new Error(`Unparsable run declaration "${entry}".`);
      }

      runsByControl.set(control, positiveInteger(count));
    }
  } else {
    const shared = positiveInteger(requested);

    for (const control of controlOrder) {
      runsByControl.set(control, shared);
    }
  }

  const controls = controlOrder.filter((control) => runsByControl.has(control));

  if (controls.length === 0) {
    throw new Error('No control was declared for this session.');
  }

  return { runsByControl, controls };
}

async function runChild(
  control: ControlId,
  index: number,
): Promise<Record<string, unknown>> {
  const child = spawn(
    process.execPath,
    [runControlPath, '--control', control, '--index', String(index)],
    { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  let stdout = '';
  let stderr = '';

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });

  const exitCode = await new Promise<number | null>((resolve) => {
    child.once('exit', (code) => resolve(code));
  });

  const [line] = stdout
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('{'))
    .slice(-1);

  if (!line) {
    throw new Error(
      `Control ${control} run ${index} produced no record (exit ${exitCode}).\n${stderr}`,
    );
  }

  return JSON.parse(line) as Record<string, unknown>;
}

function formatMs(value: unknown): string {
  return typeof value === 'number' ? `${value.toFixed(1)}` : '—';
}

function renderMatrix(
  options: Options,
  records: readonly ControlRunRecord[],
  raw: readonly Record<string, unknown>[],
  startedAt: string,
  finishedAt: string,
): string {
  const rows = aggregateMatrix(records);
  const declared = options.controls
    .map(
      (control) =>
        `${controlDefinitions[control].label}=${options.runsByControl.get(control)}`,
    )
    .join(', ');
  const lines = [
    '# PB-00R-06 — Matriz de controles gerada pelo harness versionado',
    '',
    '> Arquivo gerado por `tools/diagnostics/runBootStallMatrix.ts`. Não editar à mão.',
    '',
    `- N declarado antes da sessão: ${declared}.`,
    `- Sessão iniciada em ${startedAt}, encerrada em ${finishedAt}.`,
    `- Host: ${hostname()} — ${platform()} ${release()}, Node ${process.version}.`,
    `- Critério de stall: \`sendEnd - sendStart\` ou \`receiveHeadersStart - sendEnd\` acima de ${STALL_THRESHOLD_MS.toLocaleString('pt-BR')} ms.`,
    '- Esta matriz é diagnóstica. Ela nunca vale como evidência de aceite e não',
    '  audita a matriz histórica, que permanece relato não verificado independentemente.',
    '',
    '| Controle | Cliente | Runner | `vite preview` | Throttling | Fronteira medida | N executado | Stalls | Pior fronteira | Limite pela regra de três |',
    '|---|---|---|---|---|---|---:|---:|---:|---|',
  ];

  for (const row of rows) {
    const definition = controlDefinitions[row.control as ControlId];
    const bound =
      row.upperBoundPercent === null
        ? '— (houve stall)'
        : `taxa real até ~${row.upperBoundPercent}%`;

    lines.push(
      `| ${definition.label} | ${definition.client} | ${definition.runner} | ` +
        `${definition.previewLifecycle === 'reused' ? 'reaproveitado' : 'novo por execução'} | ` +
        `${definition.throttling} | ${definition.boundarySource} | ${row.runs} | ${row.stalls} | ` +
        `${formatMs(row.worstMs)} ms | ${bound} |`,
    );
  }

  const incomplete = raw.filter((record) => record.completed !== true);

  lines.push(
    '',
    `- Execuções que não completaram: ${incomplete.length}.`,
    '- `0/N` não prova ausência; a última coluna é o limite superior compatível com',
    '  a observação, pela regra de três (3/N).',
    '- O controle D não tem timeline CDP: sua fronteira é o TTFB medido em Node,',
    '  reportado no lugar da espera por headers. Não é a mesma medida de A/A′/B.',
    '- Saída bruta por execução: `boot-stall-runs.jsonl`.',
    '',
  );

  return lines.join('\n');
}

async function writeDerivedArtifacts(
  options: Options,
  records: readonly ControlRunRecord[],
  raw: readonly Record<string, unknown>[],
  startedAt: string,
  finishedAt: string,
): Promise<void> {
  await writeFile(
    matrixPath,
    renderMatrix(options, records, raw, startedAt, finishedAt),
    'utf8',
  );
  await writeFile(
    sessionPath,
    `${JSON.stringify({
      schema: 'pb00r-06-boot-stall-session/1',
      startedAt,
      finishedAt,
      declaredRunsPerControl: Object.fromEntries(options.runsByControl),
      controls: options.controls,
      origin: previewOrigin,
      thresholdMs: STALL_THRESHOLD_MS,
      host: {
        hostname: hostname(),
        platform: platform(),
        release: release(),
        node: process.version,
      },
      totals: aggregateMatrix(records),
    })}\n`,
    'utf8',
  );

  console.log(`\nMatrix written to ${matrixPath}`);
}

/**
 * Rebuilds the matrix and the session sidecar from `boot-stall-runs.jsonl`
 * without executing anything.
 *
 * The raw per-execution output is the primary artifact; everything else is
 * derived from it. This exists so a reviewer — or a fix to the reporting side —
 * can regenerate the derived files without re-running the experiment, which
 * would replace observations that have already been made.
 */
async function reportFromRaw(options: Options): Promise<void> {
  const lines = (await readFile(runsPath, 'utf8'))
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('{'));

  if (lines.length === 0) {
    throw new Error(`${runsPath} holds no runs to report on.`);
  }

  const raw = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  const records: ControlRunRecord[] = raw.map((record) => ({
    control: String(record.control),
    index: typeof record.index === 'number' ? record.index : 0,
    stalled: record.stalled === true,
    worstMs: typeof record.worstMs === 'number' ? record.worstMs : null,
  }));
  const stamps = (field: string) =>
    raw
      .map((record) => record[field])
      .filter((value): value is string => typeof value === 'string')
      .sort();

  await writeDerivedArtifacts(
    options,
    records,
    raw,
    stamps('startedAt')[0] ?? 'desconhecido',
    stamps('finishedAt').at(-1) ?? 'desconhecido',
  );
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));

  if (process.argv.includes('--from-raw')) {
    await reportFromRaw(options);
    return;
  }

  await access(join(repoRoot, 'dist', 'game', 'index.html')).catch(() => {
    throw new Error(
      'dist/game/index.html is missing; run `corepack pnpm build` before the harness.',
    );
  });

  const occupied = await probeOrigin();

  if (occupied !== null) {
    throw new Error(
      `Port ${previewPort} is already in use (status ${occupied}); free it before running the harness.`,
    );
  }

  await mkdir(artifactsDirectory, { recursive: true });
  await writeFile(runsPath, '', 'utf8');

  const startedAt = new Date().toISOString();
  const records: ControlRunRecord[] = [];
  const raw: Record<string, unknown>[] = [];

  for (const control of options.controls) {
    const definition = controlDefinitions[control];
    const declaredRuns = options.runsByControl.get(control) ?? 0;
    const shared =
      definition.previewLifecycle === 'reused' ? await startPreview() : null;

    try {
      for (let index = 1; index <= declaredRuns; index += 1) {
        const perRun = shared ? null : await startPreview();

        try {
          const record = await runChild(control, index);

          raw.push(record);
          records.push({
            control,
            index,
            stalled: record.stalled === true,
            worstMs: typeof record.worstMs === 'number' ? record.worstMs : null,
          });
          await appendFile(runsPath, `${JSON.stringify(record)}\n`, 'utf8');
          console.log(
            `[${definition.label}] run ${index}/${declaredRuns} ` +
              `stalled=${record.stalled} worst=${formatMs(record.worstMs)}ms ` +
              `actionable=${formatMs(record.actionableMs)}ms`,
          );
        } finally {
          await perRun?.stop();
        }
      }
    } finally {
      await shared?.stop();
    }
  }

  await writeDerivedArtifacts(
    options,
    records,
    raw,
    startedAt,
    new Date().toISOString(),
  );
}

if (import.meta.main) {
  await main();
}
