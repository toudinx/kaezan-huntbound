# PB-00 — Estado operacional

**Playbook:** `docs/playbooks/PB-00/README.md`
**Estado geral:** in_progress
**Última atualização:** 2026-08-10
**Próxima task elegível:** `PB-00-03`

## Tasks

| ID | Status | Commit | Evidência principal | Observações |
|---|---|---|---|---|
| PB-00-01 | done | `chore: initialize Phaser TypeScript workspace` | instalação congelada e checks raiz aprovados | Git `main`, workspace pnpm e baseline criados |
| PB-00-02 | done | `build: enforce package boundaries` | policy versionada, checker TypeScript/manifests e prova controlada | simulation sem DOM, Node ou Phaser; PB-00-03 elegível |
| PB-00-03 | pending | — | — | depende das fronteiras |
| PB-00-04 | pending | — | — | depende do shell |
| PB-00-05 | pending | — | — | depende do lifecycle responsivo |
| PB-00-06 | pending | — | — | gate integrado final |

## Toolchain congelada

Registrada em `docs/playbooks/PB-00/artifacts/toolchain-baseline.md`:

- Node 24.14.0 e pnpm 11.21.0 via Corepack;
- Phaser 4.2.1, TypeScript 7.0.2, Vite 8.2.1, Biome 2.5.7, Vitest 4.1.10 e Playwright 1.62.1;
- comandos canônicos de instalação, formato, typecheck, testes, build, check e verify.

## Decisões descobertas durante execução

O app permanece um entrypoint TypeScript compilável neste bootstrap; o `index.html`, Vite runtime e
shell Phaser continuam exclusivamente no escopo da PB-00-03. A razão está no baseline da toolchain.

As fronteiras de package são executadas por `tools/architecture/check-boundaries.ts`: imports estáticos,
reexports e imports dinâmicos literais são analisados com o scanner oficial do TypeScript 7 fixado,
e cada manifest é validado contra `dependency-policy.json`. `simulation` declara `lib: ["ES2022"]`
e o gate rejeita DOM, Node built-ins e Phaser.

## Verificações executadas

PB-00-01 em 2026-08-10:

- `corepack pnpm install --frozen-lockfile` — aprovado, lockfile inalterado;
- `corepack pnpm format:check` — aprovado;
- `corepack pnpm typecheck` — aprovado nos sete packages;
- `corepack pnpm test` — aprovado (teste de configuração do workspace);
- `corepack pnpm build` — aprovado nos sete packages;
- `corepack pnpm check` — aprovado;
- `corepack pnpm verify` — aprovado;
- `git status --short --ignored` e `git ls-files` — confirmados antes do commit: referências,
  Obsidian, dependências, outputs, arquivos `.env*` e assets pessoais permanecem ignorados.

Neste host, os comandos Corepack receberam `NODE_OPTIONS=--use-system-ca` no processo por causa da
cadeia TLS corporativa; a configuração global do host não foi alterada.

PB-00-02 em 2026-08-10:

- `corepack pnpm test -- tools/architecture/check-boundaries.test.ts` — aprovado (onze cenários,
  inclusive fixture Phaser em simulation com exit code 1 e diagnóstico acionável);
- `corepack pnpm architecture:check` — aprovado na árvore real;
- `corepack pnpm typecheck` — aprovado nos sete packages;
- `corepack pnpm check` — aprovado;
- `corepack pnpm verify` — aprovado;
- `git diff --check` e `git status --short` — aprovados antes do commit.

## Bloqueios

Nenhum bloqueio conhecido. A próxima task elegível é `PB-00-03`.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar seu status e commit na tabela;
2. registrar comandos de verificação e resultados relevantes;
3. apontar a próxima task realmente elegível;
4. registrar decisão nova na fonte normativa apropriada;
5. não copiar para cá todo o relatório do chat.
