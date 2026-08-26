import { resolve } from 'node:path';
import { listHuntPipelineEntries } from '../asset-packer/hunt/huntRegistry.ts';
import { runHuntSelectionCli } from './cli.ts';

const repositoryRoot = resolve(import.meta.dirname, '../..');

export function checkAllHuntSelections(): number {
  for (const entry of listHuntPipelineEntries()) {
    const status = runHuntSelectionCli([
      'check',
      '--selection',
      resolve(repositoryRoot, entry.selectionPath),
      '--source-root-env',
      'HUNTBOUND_CANARY_SOURCE',
    ]);
    if (status !== 0) return status;
  }
  return 0;
}

if (import.meta.main) {
  process.exitCode = checkAllHuntSelections();
}
