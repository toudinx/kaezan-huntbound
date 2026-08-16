/**
 * Agent-agnostic guard rules.
 *
 * Pure functions: no filesystem, no process, no agent-specific payload. Every adapter under
 * `tools/agent-hooks/` translates its own hook protocol into these calls, so Cursor, Codex and
 * Claude Code enforce exactly the same rules.
 */

export type Verdict = 'allow' | 'ask' | 'deny';

export interface Decision {
  verdict: Verdict;
  reason?: string;
}

export interface CommandContext {
  /** True when `dist/game` is older than the newest file under `apps/game/src`. */
  bundleStale: boolean;
}

const ALLOW: Decision = { verdict: 'allow' };

const deny = (reason: string): Decision => ({ verdict: 'deny', reason });
const ask = (reason: string): Decision => ({ verdict: 'ask', reason });

const IGNORED_ASSET_PATHS = ['apps/game/public/assets/', 'assets/personal/'];

const normalise = (value: string): string => value.replace(/\\/g, '/');

const segments = (command: string): string[] =>
  command
    .split(/&&|\|\||;|\n/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

const tokens = (segment: string): string[] => segment.split(/\s+/);

const isGitSubcommand = (parts: string[], subcommand: string): boolean =>
  parts[0] === 'git' && parts.includes(subcommand);

function inspectPackageManager(parts: string[]): Decision | undefined {
  const [head] = parts;

  if (head === 'npm' || head === 'yarn') {
    return deny(
      `Este workspace usa pnpm 11.21.0 via corepack. Troque \`${head}\` por \`corepack pnpm\`.`,
    );
  }

  if (head === 'pnpm') {
    return deny(
      'Use `corepack pnpm <script>`; pnpm avulso pode resolver outra versão.',
    );
  }

  return undefined;
}

function inspectGit(segment: string, parts: string[]): Decision | undefined {
  if (parts[0] !== 'git') {
    return undefined;
  }

  if (parts.includes('--no-verify')) {
    return deny(
      '`--no-verify` pula os hooks do repositório. Conserte a causa em vez de pulá-los.',
    );
  }

  if (
    isGitSubcommand(parts, 'push') &&
    (parts.includes('--force') || parts.includes('-f'))
  ) {
    return deny(
      'Force push reescreve histórico compartilhado. Peça confirmação explícita antes.',
    );
  }

  if (isGitSubcommand(parts, 'add') && parts.includes('-f')) {
    const normalised = normalise(segment);
    if (IGNORED_ASSET_PATHS.some((path) => normalised.includes(path))) {
      return deny(
        'Asset pessoal e pack gerado nunca entram no Git. O profile `product` recusa ' +
          '`licenseClass: "cipsoft-personal"` e esses diretórios são ignorados de propósito.',
      );
    }
  }

  if (isGitSubcommand(parts, 'reset') && parts.includes('--hard')) {
    return ask(
      '`git reset --hard` descarta trabalho não commitado. Confirme o que será perdido.',
    );
  }

  if (
    isGitSubcommand(parts, 'clean') &&
    parts.some((part) => /^-[a-z]*f/.test(part))
  ) {
    return ask('`git clean -f` apaga arquivos não rastreados. Confirme antes.');
  }

  if (isGitSubcommand(parts, 'branch') && parts.includes('-D')) {
    return ask(
      '`git branch -D` apaga branch não integrada. Use `-d` depois de comprovar o merge.',
    );
  }

  if (isGitSubcommand(parts, 'worktree') && parts.includes('remove')) {
    return ask(
      '`git worktree remove` costuma falhar com "Directory not empty" por causa de `node_modules`. ' +
        'O caminho conhecido é `rm -rf <path>` seguido de `git worktree prune`.',
    );
  }

  return undefined;
}

function inspectBrowserSuite(
  command: string,
  context: CommandContext,
): Decision | undefined {
  if (!/\bplaywright\s+test\b/.test(command)) {
    return undefined;
  }

  if (/\b(build|qa:browser|verify)\b/.test(command)) {
    return undefined;
  }

  if (!context.bundleStale) {
    return undefined;
  }

  return deny(
    'O Playwright serve o `dist/game` pré-buildado e `apps/game/src` está mais novo que ele. ' +
      'Rode `corepack pnpm build` antes, ou use `corepack pnpm qa:browser`, que builda sozinho.',
  );
}

/** Decide whether a shell command may run. */
export function inspectCommand(
  command: string,
  context: CommandContext,
): Decision {
  const browserSuite = inspectBrowserSuite(command, context);
  if (browserSuite) {
    return browserSuite;
  }

  for (const segment of segments(command)) {
    const parts = tokens(segment);

    const packageManager = inspectPackageManager(parts);
    if (packageManager) {
      return packageManager;
    }

    const git = inspectGit(segment, parts);
    if (git) {
      return git;
    }
  }

  return ALLOW;
}

/** Decide whether a file may be edited by hand. */
export function inspectFileEdit(filePath: string): Decision {
  const normalised = normalise(filePath);

  if (normalised.includes('packages/content/src/generated/')) {
    return deny(
      'Artefato gerado. Mude a entrada (seleção, importador, snapshot) e regenere pelo CLI, ' +
        'depois valide com `corepack pnpm content:check`.',
    );
  }

  if (
    normalised.includes('packages/test-fixtures/') &&
    normalised.includes('/expected/')
  ) {
    return deny(
      'Fixture esperada é saída do asset-packer. Regenere pelo CLI e valide com ' +
        '`corepack pnpm assets:check`.',
    );
  }

  if (normalised.includes('.golden.')) {
    return deny(
      'Golden de replay não se reescreve para passar. Divergência é mudança de comportamento: ' +
        'prove que é intencional, registre no STATE.md e só então regenere.',
    );
  }

  if (IGNORED_ASSET_PATHS.some((path) => normalised.includes(path))) {
    return deny(
      'Pack de asset é saída de `stage-profile`/`build-profile`, não arquivo editável.',
    );
  }

  return ALLOW;
}
