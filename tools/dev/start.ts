import { spawn } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { listHuntPipelineEntries } from '../asset-packer/hunt/huntRegistry.ts';

export type DevProfile = 'test' | 'personal';

type DevEnvironment = Readonly<Record<string, string | undefined>>;

export type DevStep = {
  readonly command: string;
};

type DevPlan =
  | {
      readonly ok: true;
      readonly commands: readonly DevStep[];
      readonly environment: DevEnvironment;
      readonly message?: string;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

const personalSourceVariable = 'HUNTBOUND_PERSONAL_ASSET_SOURCE';

export function parseEnvFile(content: string): Record<string, string> {
  const environment: Record<string, string> = {};

  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

    const assignment = trimmed
      .replace(/^export\s+/u, '')
      .match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
    if (assignment === null) continue;

    const [, key, rawValue] = assignment;
    if (key === undefined || rawValue === undefined) continue;

    const value = rawValue.trim();
    environment[key] =
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
        ? value.slice(1, -1).replace(/\\\\/gu, '\\').replace(/\\"/gu, '"')
        : value;
  }

  return environment;
}

export function createDevPlan(
  profile: DevProfile,
  environment: DevEnvironment,
  options: {
    readonly devServerRunning?: boolean;
    readonly personalProfileExists?: boolean;
  } = {},
): DevPlan {
  if (
    profile === 'personal' &&
    (environment[personalSourceVariable] === undefined ||
      environment[personalSourceVariable]?.trim().length === 0)
  ) {
    return {
      ok: false,
      message: [
        `${personalSourceVariable} is missing.`,
        'Add it once to .env.local (this file is ignored by Git), then run corepack pnpm dev:personal.',
        'Example: HUNTBOUND_PERSONAL_ASSET_SOURCE=C:\\path\\to\\personal-assets',
      ].join('\n'),
    };
  }

  if (options.devServerRunning) {
    return {
      ok: true,
      commands: [],
      environment,
      message: 'Dev server already running at http://localhost:5173/.',
    };
  }

  return {
    ok: true,
    commands:
      profile === 'test'
        ? [
            { command: 'corepack pnpm assets:stage:test' },
            {
              command:
                'corepack pnpm --filter @huntbound/game exec vite --mode test',
            },
          ]
        : [
            ...(options.personalProfileExists
              ? []
              : [{ command: 'corepack pnpm assets:hunt:personal:generate' }]),
            {
              command:
                'corepack pnpm --filter @huntbound/game exec vite --mode personal',
            },
          ],
    environment,
  };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function isDevServerRunning(): Promise<boolean> {
  for (const url of ['http://127.0.0.1:5173/', 'http://[::1]:5173/']) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) return true;
    } catch {
      // Try the other loopback address before starting another server.
    }
  }
  return false;
}

async function arePersonalHuntProfilesPresent(root: string): Promise<boolean> {
  for (const entry of listHuntPipelineEntries()) {
    if (
      !(await pathExists(
        resolve(
          root,
          'apps/game/public/assets/personal',
          entry.runtimeDirectory,
        ),
      ))
    ) {
      return false;
    }
  }
  return true;
}

async function loadLocalEnvironment(
  root: string,
): Promise<Record<string, string>> {
  try {
    return parseEnvFile(await readFile(resolve(root, '.env.local'), 'utf8'));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function runCommand(
  command: string,
  root: string,
  environment: DevEnvironment,
): Promise<number> {
  process.stdout.write(`\n> ${command}\n`);

  return new Promise((resolveCode) => {
    let settled = false;
    const child = spawn(command, {
      cwd: root,
      env: environment,
      shell: true,
      stdio: 'inherit',
    });

    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      resolveCode(code);
    };

    child.once('error', (error) => {
      console.error(error.message);
      finish(1);
    });
    child.once('exit', (code) => finish(code ?? 1));
  });
}

function readProfile(args: readonly string[]): DevProfile | undefined {
  if (args.length !== 2 || args[0] !== '--profile') return undefined;
  const profile = args[1];
  return profile === 'test' || profile === 'personal' ? profile : undefined;
}

export async function runDevLauncher(
  profile: DevProfile,
  root: string,
  processEnvironment: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  const localEnvironment = await loadLocalEnvironment(root);
  const environment = { ...localEnvironment, ...processEnvironment };
  const plan = createDevPlan(profile, environment, {
    devServerRunning: await isDevServerRunning(),
    personalProfileExists:
      profile === 'personal' && (await arePersonalHuntProfilesPresent(root)),
  });

  if (!plan.ok) {
    console.error(plan.message);
    return 1;
  }

  if (plan.message !== undefined) {
    console.log(plan.message);
  }

  for (const step of plan.commands) {
    const exitCode = await runCommand(step.command, root, plan.environment);
    if (exitCode !== 0) return exitCode;
  }

  return 0;
}

if (import.meta.main) {
  const profile = readProfile(process.argv.slice(2));
  if (profile === undefined) {
    console.error('Usage: node tools/dev/start.ts --profile <test|personal>');
    process.exitCode = 2;
  } else {
    process.exitCode = await runDevLauncher(profile, process.cwd());
  }
}
