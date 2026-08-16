/**
 * Hook adapter for Cursor.
 *
 * `beforeShellExecution` can block; `afterFileEdit` is observation only, so an edit to a generated
 * artifact is reported there and blocked later by the `pre-commit` hook. Silence means "no
 * opinion": Cursor's own permission flow decides. Any internal failure exits 0.
 */

import { inspectCommand, inspectFileEdit } from './rules.ts';
import { isBundleStale } from './workspace.ts';

interface CursorPayload {
  hook_event_name?: string;
  command?: string;
  file_path?: string;
}

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

async function main(): Promise<void> {
  const raw = await readStdin();
  if (raw.trim().length === 0) {
    return;
  }

  const payload = JSON.parse(raw) as CursorPayload;
  const event = payload.hook_event_name ?? process.argv[2];

  if (event === 'afterFileEdit') {
    if (typeof payload.file_path === 'string') {
      const decision = inspectFileEdit(payload.file_path);
      if (decision.verdict !== 'allow') {
        process.stderr.write(
          `[huntbound] ${payload.file_path}: ${decision.reason}\n`,
        );
      }
    }
    return;
  }

  if (typeof payload.command !== 'string' || payload.command.length === 0) {
    return;
  }

  const decision = inspectCommand(payload.command, {
    bundleStale: isBundleStale(),
  });
  if (decision.verdict === 'allow') {
    return;
  }

  process.stdout.write(
    `${JSON.stringify({
      permission: decision.verdict,
      user_message: decision.reason,
      agent_message: decision.reason,
    })}\n`,
  );
}

main().catch(() => {
  process.exitCode = 0;
});
