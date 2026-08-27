import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

import { listHuntPipelineEntries } from '../../tools/asset-packer/hunt/huntRegistry.ts';

const execFileAsync = promisify(execFile);

async function gitLsFiles(relativePath: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['ls-files', relativePath], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  return stdout.trim();
}

async function isGitIgnored(relativePath: string): Promise<boolean> {
  try {
    await execFileAsync(
      'git',
      ['check-ignore', '-q', '--no-index', relativePath],
      { cwd: process.cwd() },
    );
    return true;
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 1
    ) {
      return false;
    }
    throw error;
  }
}

describe('hunt personal source locks', () => {
  const lockPaths = listHuntPipelineEntries().map(
    (entry) => `${entry.assetFixtureRoot}/personal-source-lock.json`,
  );

  it('does not version a per-hunt pin of the private export manifest', async () => {
    for (const relativePath of lockPaths) {
      expect(await gitLsFiles(relativePath), relativePath).toBe('');
    }
  });

  it('ignores the pack-time lock so adding a hunt cannot dirty another hunt', async () => {
    for (const relativePath of lockPaths) {
      expect(await isGitIgnored(relativePath), relativePath).toBe(true);
    }
  });
});
