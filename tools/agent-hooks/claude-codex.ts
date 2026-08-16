/**
 * Hook adapter for Claude Code and Codex, which share the same PreToolUse protocol.
 *
 * Reads the hook payload on stdin and answers with `hookSpecificOutput`. Silence means "no
 * opinion": the agent's own permission settings decide, so the guard never widens what the user
 * already allows. Any internal failure exits 0 — a broken hook must not block the agent.
 */

import { type Decision, inspectCommand, inspectFileEdit } from './rules.ts';
import { isBundleStale } from './workspace.ts';

interface PreToolUsePayload {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

function candidatePaths(input: Record<string, unknown>): string[] {
  const keys = ['file_path', 'path', 'notebook_path', 'filePath'];
  return keys
    .map((key) => input[key])
    .filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
}

function decide(payload: PreToolUsePayload): Decision {
  const input = payload.tool_input ?? {};

  const command = input.command;
  if (typeof command === 'string' && command.length > 0) {
    return inspectCommand(command, { bundleStale: isBundleStale() });
  }

  for (const path of candidatePaths(input)) {
    const decision = inspectFileEdit(path);
    if (decision.verdict !== 'allow') {
      return decision;
    }
  }

  return { verdict: 'allow' };
}

async function main(): Promise<void> {
  const raw = await readStdin();
  if (raw.trim().length === 0) {
    return;
  }

  const decision = decide(JSON.parse(raw) as PreToolUsePayload);
  if (decision.verdict === 'allow') {
    return;
  }

  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision.verdict,
        permissionDecisionReason: decision.reason,
      },
    })}\n`,
  );
}

main().catch(() => {
  process.exitCode = 0;
});
