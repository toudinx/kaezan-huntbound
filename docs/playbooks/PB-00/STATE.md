# PB-00 — Estado operacional

**Playbook:** `docs/playbooks/PB-00/README.md`
**Estado geral:** in_progress
**Última atualização:** 2026-08-10
**Próxima task elegível:** `PB-00-06`

## Tasks

| ID | Status | Commit | Evidência principal | Observações |
|---|---|---|---|---|
| PB-00-01 | done | `chore: initialize Phaser TypeScript workspace` | instalação congelada e checks raiz aprovados | Git `main`, workspace pnpm e baseline criados |
| PB-00-02 | done | `build: enforce package boundaries` | policy versionada, checker TypeScript/manifests e prova controlada | simulation sem DOM, Node ou Phaser; PB-00-03 elegível |
| PB-00-03 | done | `feat: add Phaser DOM browser shell` | bridge, testes DOM e inspeção local aprovados | shell Phaser + DOM; PB-00-04 elegível |
| PB-00-04 | done | `feat: add responsive browser lifecycle` | lifecycle/viewport controllers, shell responsivo e inspeção local | foco e visibilidade são estado de apresentação; PB-00-05 elegível |
| PB-00-05 | done | `test: add browser shell quality gate` | Chromium em quatro viewports, lifecycle, baselines e budget Fast 4G | build de produção local; PB-00-06 elegível |
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

O `SceneBridge` de `apps/game` conserva o snapshot de apresentação e os listeners do shell; Boot e
Shell scenes apenas publicam transições. `AppShell` assina essa projeção e não acessa objetos Phaser.
O runtime usa `Phaser.Scale.RESIZE`, canvas e overlay DOM no mesmo container, e descarta game, UI e
listener da marca de performance durante HMR.

`RuntimeLifecycle` concentra blur/focus e visibility em um `Set<PauseReason>` injetável; Phaser apenas
suspende e restaura a apresentação anterior. `ViewportController` mede o container real com
`ResizeObserver`, acompanha DPR por `matchMedia` e republica somente a projeção de viewport preservando
os demais campos do `SceneBridge`.

O gate browser executa Chromium Playwright com um worker, build de produção local e baselines
versionados. O mark `huntbound:shell-actionable` é lido por um módulo isolado e o cenário CDP Fast 4G
usa um contexto novo e cache desabilitado para preservar a medição fria.

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

PB-00-03 em 2026-08-10:

- `corepack pnpm --filter @huntbound/game test` — aprovado (oito testes: contrato do bridge e
  projeção/cleanup do AppShell);
- `corepack pnpm architecture:check` — aprovado;
- `corepack pnpm typecheck` — aprovado nos sete packages;
- `corepack pnpm build` — aprovado, incluindo bundle Vite do game;
- `corepack pnpm check` — aprovado;
- inspeção manual em `http://127.0.0.1:4173` — um canvas, um overlay DOM, `ready`,
  `data-shell-ready="true"`, centro livre e console sem warnings ou erros; atualização HMR também
  preservou um único canvas/overlay após aguardar a destruição Phaser;
- `git diff --check` e `git status --short` — aprovados antes do commit.

PB-00-04 em 2026-08-10:

- `corepack pnpm --filter @huntbound/game test` — aprovado (dezoito testes: bridge/AppShell,
  lifecycle com blur/focus, hidden/visible, causas simultâneas, duplicidade e teardown; viewport com
  primeira medição, resize, DPR sem resize, supressão e teardown);
- `corepack pnpm architecture:check` — aprovado;
- `corepack pnpm typecheck` — aprovado nos sete packages;
- `corepack pnpm build` — aprovado; o aviso preexistente de chunk Phaser acima de 500 kB permanece
  fora do escopo desta task;
- `corepack pnpm check` — aprovado; Biome reporta apenas o bundle gerado ignorado acima de 1 MiB;
- inspeção local em `http://127.0.0.1:4173` — 390×844, 768×1024, 1366×768 e 1920×1080 exibiram
  um canvas e overlay alinhados ao container, viewport projetado corretamente e sem overflow; layout
  de bordas e regra CSS de reduced motion confirmados, console sem warnings ou erros; os cenários de
  foco/visibilidade foram exercitados pelos testes determinísticos do lifecycle porque o navegador
  integrado não expõe alteração de visibilidade de aba;
- `git diff --check` e `git status --short` — aprovados antes do commit.

PB-00-05 em 2026-08-10:

- `NODE_OPTIONS=--use-system-ca corepack pnpm exec playwright install chromium` — aprovado;
  Chromium 151.0.7922.34 (Playwright v1234) instalado;
- `corepack pnpm --filter @huntbound/game test -- src/runtime/performance.test.ts` — aprovado
  (três cenários: mark ausente, duplicado e duração válida; 21 testes do game no total);
- `NODE_OPTIONS=--use-system-ca corepack pnpm qa:browser` — aprovado (seis testes: Fast 4G,
  quatro viewports e lifecycle; baselines em `tests/e2e/shell.spec.ts-snapshots/` revisados no tamanho
  original);
- boot Fast 4G com cache frio — `huntbound:shell-actionable` observado em 2.368,4 ms, abaixo do
  budget de 5.000 ms;
- `NODE_OPTIONS=--use-system-ca corepack pnpm verify` — aprovado: formato, arquitetura, typecheck,
  testes, build e QA browser; o aviso preexistente do chunk Phaser acima de 500 kB permanece sem
  falhar o gate;
- `git diff --check` e `git status --short` — aprovados antes do commit.

## Bloqueios

Nenhum bloqueio conhecido. A próxima task elegível é `PB-00-06`.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar seu status e commit na tabela;
2. registrar comandos de verificação e resultados relevantes;
3. apontar a próxima task realmente elegível;
4. registrar decisão nova na fonte normativa apropriada;
5. não copiar para cá todo o relatório do chat.
