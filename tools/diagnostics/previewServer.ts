import { type ChildProcess, spawn } from 'node:child_process';
import { request } from 'node:http';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export const previewPort = 4173;
export const previewOrigin = `http://127.0.0.1:${previewPort}`;

export const repoRoot = join(import.meta.dirname, '..', '..');

/**
 * Same server the gate uses, started without the pnpm/corepack wrappers so the
 * process tree stays one deep and can actually be killed between executions.
 * Vite still resolves `apps/game/vite.config.ts` from this cwd, so the served
 * `dist/game` is identical.
 */
const viteBin = join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const gameDirectory = join(repoRoot, 'apps', 'game');

const readinessTimeoutMs = 60_000;
const releaseTimeoutMs = 20_000;
const probeIntervalMs = 200;

/** Resolves the HTTP status, or `null` when nothing is listening. */
export async function probeOrigin(
  url = `${previewOrigin}/`,
  timeoutMs = 2_000,
): Promise<number | null> {
  return new Promise((resolve) => {
    const attempt = request(url, { method: 'GET' }, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode ?? null));
      response.on('error', () => resolve(null));
    });

    attempt.on('error', () => resolve(null));
    attempt.setTimeout(timeoutMs, () => {
      attempt.destroy();
      resolve(null);
    });
    attempt.end();
  });
}

export interface PreviewServer {
  stop(): Promise<void>;
}

async function waitForExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    child.once('exit', () => resolve());
  });
}

export async function startPreview(): Promise<PreviewServer> {
  const occupied = await probeOrigin();

  if (occupied !== null) {
    throw new Error(
      `Port ${previewPort} is already serving (status ${occupied}); refusing to start a second preview.`,
    );
  }

  const child = spawn(
    process.execPath,
    [
      viteBin,
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(previewPort),
      '--strictPort',
    ],
    { cwd: gameDirectory, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  let exited = false;
  child.once('exit', () => {
    exited = true;
  });

  const deadline = Date.now() + readinessTimeoutMs;

  while (Date.now() < deadline) {
    if (exited) {
      throw new Error('vite preview exited before it started serving.');
    }

    if ((await probeOrigin()) !== null) {
      return {
        async stop() {
          child.kill();
          await waitForExit(child);

          const releaseDeadline = Date.now() + releaseTimeoutMs;

          while (Date.now() < releaseDeadline) {
            if ((await probeOrigin()) === null) {
              return;
            }

            await delay(probeIntervalMs);
          }

          throw new Error(
            `Port ${previewPort} was still serving ${releaseTimeoutMs} ms after stopping vite preview.`,
          );
        },
      };
    }

    await delay(probeIntervalMs);
  }

  child.kill();
  throw new Error(
    `vite preview did not answer on ${previewOrigin} within ${readinessTimeoutMs} ms.`,
  );
}
