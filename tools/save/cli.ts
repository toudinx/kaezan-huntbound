import { resolve } from 'node:path';

import { checkPublishedHashes } from './checkPublishedHashes.ts';
import { generateSaveFixture, verifySaveFixture } from './saveSession.ts';

type SaveCommand =
  | { readonly kind: 'run'; readonly dir: string }
  | { readonly kind: 'verify'; readonly dir: string }
  | { readonly kind: 'check-hashes'; readonly dir: string };

export interface SaveCliIo {
  stdout(value: unknown): void;
  stderr(value: unknown): void;
  usage(): void;
}

const usageText = `Usage:
  node tools/save/cli.ts run --dir <path>
  node tools/save/cli.ts verify --dir <path>
  node tools/save/cli.ts check-hashes --dir <path>

Exit codes: 0 success, 1 divergence, 2 invalid input.`;

const processIo: SaveCliIo = {
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

function readOption(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) {
    return undefined;
  }
  const value = args[index + 1];
  return value === undefined || value.startsWith('--') ? undefined : value;
}

function parseCommand(args: readonly string[]): SaveCommand | undefined {
  const [verb, ...rest] = args;

  if (verb === 'run' || verb === 'verify' || verb === 'check-hashes') {
    const dir = readOption(rest, '--dir');
    return dir === undefined ? undefined : { kind: verb, dir };
  }

  return undefined;
}

const defaultRepoRoot = resolve(import.meta.dirname, '../..');

export async function runSaveCli(
  args: readonly string[],
  io: SaveCliIo = processIo,
  repoRoot: string = defaultRepoRoot,
): Promise<number> {
  const command = parseCommand(args);
  if (command === undefined) {
    io.usage();
    return 2;
  }

  if (command.kind === 'check-hashes') {
    const result = await checkPublishedHashes(command.dir);
    if (!result.ok) {
      if (result.kind === 'invalid-input') {
        io.stderr({ kind: 'invalid-input', errors: result.errors });
        return 2;
      }
      io.stderr({ kind: 'divergence', divergences: result.divergences });
      return 1;
    }
    io.stdout({
      ok: true,
      command: 'check-hashes',
      dir: command.dir,
      digests: result.digests,
    });
    return 0;
  }

  const result =
    command.kind === 'run'
      ? await generateSaveFixture({ repoRoot, dir: command.dir })
      : await verifySaveFixture({ repoRoot, dir: command.dir });

  if (!result.ok) {
    if (result.kind === 'invalid-input') {
      io.stderr({ kind: 'invalid-input', errors: result.errors });
      return 2;
    }
    io.stderr({ kind: 'divergence', divergences: result.divergences });
    return 1;
  }

  io.stdout({
    ok: true,
    command: command.kind,
    dir: command.dir,
    digests: result.digests,
  });
  return 0;
}

if (import.meta.main) {
  process.exitCode = await runSaveCli(process.argv.slice(2));
}
