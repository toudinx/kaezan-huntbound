# PB-00 — Relatório final de aceite

**APPROVED**

**Data:** 2026-08-10

**Escopo auditado:** commits PB-00-01 a PB-00-05 e árvore `main` em
`37f3492e93f2312ff1a84f8b56cb38d1d0efae29` antes deste fechamento.

**Browser:** Chromium 151.0.7922.34 (Playwright Chromium v1234), Windows.

**Decisão:** todos os gates finais do PB-00 possuem evidência fresca; PB-01 está elegível.

## Pré-condições e reprodutibilidade

- `git status --porcelain=v1 --untracked-files=all` — exit 0 e saída vazia antes da auditoria.
- `git log --format='%H%x09%s' -5` — exit 0; confirmou, em ordem, os commits
  `test: add browser shell quality gate`, `feat: add responsive browser lifecycle`,
  `feat: add Phaser DOM browser shell`, `build: enforce package boundaries` e
  `chore: initialize Phaser TypeScript workspace`.
- `node --version`, `corepack --version` e `corepack pnpm --version` — exit 0; respectivamente
  24.14.0, 0.34.6 e 11.21.0.
- `corepack pnpm install --frozen-lockfile` com `NODE_OPTIONS=--use-system-ca` no processo — exit 0
  em 2,7 s; oito projetos, `Already up to date`, pnpm 11.21.0.
- SHA-256 de `pnpm-lock.yaml` antes e depois da instalação e dos gates:
  `0DFE3DE417C77E90F0FAFA5883A2C29FEBF7214900F7444BE45639476A636651`.
- Manifests e resolução instalada confirmam versões diretas exatas: Phaser 4.2.1,
  TypeScript 7.0.2, Vite 8.2.1, Biome 2.5.7, Vitest 4.1.10 e Playwright 1.62.1.
  `packageManager` fixa `pnpm@11.21.0`, `engines.node` fixa a linha 24, `.node-version` contém
  24.14.0 e `.npmrc` contém `save-exact=true`.

## Gates executados

| Evidência | Exit code | Resultado |
|---|---:|---|
| `corepack pnpm verify` | 0 | 54,9 s; formato, arquitetura, typecheck dos sete projetos, testes, build e seis testes Playwright aprovados |
| `corepack pnpm architecture:check` | 0 | árvore real aprovada em 4,7 s |
| `corepack pnpm test -- tools/architecture/check-boundaries.test.ts` | 0 | 1 teste Vitest e 11 cenários do checker aprovados em 7,7 s |
| `corepack pnpm --filter @huntbound/game test` | 0 | 5 arquivos e 21 testes aprovados em 3,1 s |
| `git diff --check` | 0 | nenhuma anomalia de whitespace após o fechamento documental |
| `git status --short` | 0 | árvore inicial limpa; somente documentação permitida pertence ao commit de fechamento |
| `git ls-files` | 0 | inventário revisado; nenhum path proibido rastreado |

## Correção PB-00-FIX-01 — 2026-08-10

A auditoria reproduziu as duas lacunas do fechamento anterior antes da edição:

- no gate anterior, `corepack pnpm test` terminou com exit code 0, mas executou 2 arquivos e 12
  testes: 1 arquivo Vitest com 1 teste e 1 arquivo Node com 11 cenários; os 21 testes de
  `apps/game` ficaram fora;
- em um shell novo sem o fallback de `pnpm` do ambiente Codex, `corepack pnpm verify` terminou com
  exit code 1 e `'pnpm' não é reconhecido como um comando interno ou externo`; no shell do ambiente,
  que expõe esse fallback, a mesma invocação histórica terminou com exit code 0. A diferença foi
  confirmada como resolução de PATH, não como falha do runtime.

O gate agora agrega os testes de todos os packages do workspace com `corepack pnpm --recursive run
test` depois dos testes raiz, sem incluir `tests/e2e/*.spec.ts` no Vitest. A forma recursiva foi
escolhida em vez de um filtro por package nomeado para que packages criados a partir do PB-01 entrem
no gate sem edição do script. As contagens observadas antes e depois foram:

| Comando | Antes da correção | Depois da correção |
|---|---|---|
| `corepack pnpm test` | exit 0; 2 arquivos / 12 testes (1 Vitest + 11 Node) | exit 0; 7 arquivos / 33 testes (6 Vitest + 11 Node) |
| `corepack pnpm verify` | exit 0 no shell com fallback; 4 arquivos de teste / 18 testes (2 unitários + 2 specs Playwright) | exit 0; 9 arquivos de teste / 39 testes (7 unitários + 2 specs Playwright) |

O SHA-256 de `pnpm-lock.yaml` foi `0DFE3DE417C77E90F0FAFA5883A2C29FEBF7214900F7444BE45639476A636651`
antes e depois. A via adotada para o PATH foi chamar `corepack pnpm` explicitamente nos scripts
compostos da raiz; não houve instalação global, `corepack enable` ou mudança de configuração do
host. Esta nota corrige a leitura histórica da linha `corepack pnpm verify` acima: o verify de
PB-00-06 não cobria os testes de `apps/game`; essa cobertura passou a existir nesta task.

A prova controlada do checker criou uma fixture temporária com `simulation -> phaser`, recebeu exit
code 1 e confirmou o diagnóstico com arquivo, linha, import e regra DOM. Os demais cenários cobriram
import dinâmico, reexport, Node builtin, dependência interna e dependências de manifest.

## Auditoria de arquitetura, tracking e escopo

- `packages/simulation` contém apenas `export {}`, usa `lib: ["ES2022"]`, não declara dependências e
  não apresentou nenhuma ocorrência de Phaser, DOM, Node, storage ou globais de browser.
- A política executável coincide com `PACKAGE_BOUNDARIES.md`: simulation só pode depender de
  contracts e proíbe Phaser, bibliotecas DOM, Node built-ins e dependências externas.
- O filtro do inventário rastreado não encontrou `references/`, `.obsidian/`, `.env*`, secrets,
  `node_modules`, `dist`, `test-results`, `playwright-report` ou `blob-report`.
- Os únicos binários de mídia rastreados são os quatro screenshots Playwright aprovados abaixo;
  nenhum asset pessoal ou proprietário está versionado.
- As buscas em `apps/`, `packages/`, `tests/` e `tools/` não encontraram Canary runtime,
  IndexedDB, backend, service worker, gacha, gameplay, combate, hunt ou paths diretos de assets.
  Os packages `assets` e `save` permanecem apenas como stubs tipados previstos pela estrutura PB-00.

## QA browser e inspeção visual

Uma sessão instrumentada adicional na build de produção, com cache desabilitado e o perfil Fast 4G
normativo, observou `huntbound:shell-actionable` uma única vez em **2.412,6 ms**, abaixo do budget de
5.000 ms. Boot, blur/focus e hidden/visible percorreram
`ready -> paused -> ready -> paused -> ready`. Resizes para 390×844 e 1920×1080 mantiveram documento,
canvas e overlay exatamente no viewport, com um canvas, um overlay, projeção de tamanho atualizada e
zero `console.error` ou `pageerror`.

Uma alteração observada pelo Vite recarregou o shell em desenvolvimento; após o teardown havia um
canvas, um overlay e fase `ready`, sem erro. Os testes unitários complementares cobrem descarte
idempotente de bridge, AppShell, lifecycle e viewport.

Os quatro baselines foram abertos e revisados no tamanho original:

| Screenshot | Viewport | Inspeção |
|---|---:|---|
| `tests/e2e/shell.spec.ts-snapshots/shell-mobile-win32.png` | 390×844 | canvas dominante, painéis nas bordas, centro livre, sem clipping e texto legível |
| `tests/e2e/shell.spec.ts-snapshots/shell-tablet-win32.png` | 768×1024 | canvas dominante, painéis nas bordas, centro livre, sem clipping e texto legível |
| `tests/e2e/shell.spec.ts-snapshots/shell-desktop-win32.png` | 1366×768 | canvas dominante, painéis nas bordas, centro livre, sem clipping e texto legível |
| `tests/e2e/shell.spec.ts-snapshots/shell-desktop-wide-win32.png` | 1920×1080 | canvas dominante, painéis nas bordas, centro livre, sem clipping e texto legível |

## Mapeamento dos critérios finais do README

| Critério | Evidência fresca | Resultado |
|---|---|---|
| Git raiz e exclusões | `git rev-parse`, `git ls-files`, filtros de paths e mídia | aprovado |
| Toolchain fixada e instalação congelada | versões locais, manifests, resolução pnpm, hash do lockfile e instalação frozen | aprovado |
| `pnpm verify` integrado | execução completa em 54,9 s, exit 0 | aprovado |
| Violação `simulation -> phaser` rejeitada | fixture temporária, exit 1 e diagnóstico acionável | aprovado |
| Boot Fast 4G em até 5 s | mark único em 2.412,6 ms | aprovado |
| Canvas e DOM sincronizados | Playwright, sessão instrumentada e screenshots | aprovado |
| Focus/visibility sem duplicidade | transições instrumentadas e teste Playwright | aprovado |
| Sem overflow nos quatro viewports | asserts Playwright e revisão visual | aprovado |
| Quatro screenshots capturados e revisados | paths e inspeção individual acima | aprovado |
| Sem conteúdo posterior | buscas de runtime/paths, inventário Git e diff | aprovado |

## Limites conhecidos

O bundle Phaser permanece com 1.380,03 kB minificado e 359,69 kB gzip, acima do aviso de chunk de
500 kB; o bundle gerado também excede o limite informativo de 1 MiB do Biome. Ambos são avisos
preexistentes, não falham `verify` e otimização/code splitting estão fora do PB-00. Suporte
multi-browser completo, PWA, touch gameplay, assets, save real, backend e gameplay continuam fora do
escopo e não são tratados como falhas deste gate.

## Conclusão

PB-00 está aprovado integralmente. O próximo playbook elegível é PB-01; esta auditoria não o iniciou.
