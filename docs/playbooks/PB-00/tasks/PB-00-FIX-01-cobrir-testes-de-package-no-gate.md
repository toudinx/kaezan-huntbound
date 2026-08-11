# PB-00-FIX-01 — Cobrir testes de package no gate e tornar `verify` reproduzível

**Status inicial:** pending  
**Rota Codex:** `superpowers:verification-before-completion` + `game-studio:web-game-foundations`  
**Effort sugerido:** medium.

## Objetivo

O gate integrado do PB-00 aprova sem executar os testes unitários dos packages, e o comando canônico
`corepack pnpm verify` não é executável no host documentado. Esta task fecha as duas lacunas do
próprio gate. Ela não altera comportamento de runtime.

## Problema observado

Auditoria posterior ao fechamento do PB-00, na árvore `7517dce`:

1. **Testes de package fora do gate.** O script `test` da raiz é
   `vitest run && node --test tools/architecture/check-boundaries.test.ts`, e `vitest.config.ts` usa
   `include: ['tests/**/*.test.ts']`. `corepack pnpm test` executa **12 testes** (1 de workspace e 11
   do checker de fronteiras). Os **21 testes** de `apps/game/src` — `SceneBridge`, `AppShell`,
   `RuntimeLifecycle`, `ViewportController` e `performance` — nunca são executados por `test`, `check`
   ou `verify`. Eles só rodaram porque as tasks PB-00-03 a PB-00-06 chamaram
   `corepack pnpm --filter @huntbound/game test` manualmente. Uma regressão em bridge, lifecycle ou
   viewport passa por `verify` sem falhar.
2. **`verify` não reproduzível pelo comando documentado.** Os scripts compostos da raiz
   (`typecheck`, `test`, `build`, `check`, `qa:browser`, `verify`) invocam `pnpm` puro. Executar
   `corepack pnpm verify` falha imediatamente com `'pnpm' não é reconhecido como um comando interno`
   porque não existe binário `pnpm` no `PATH` do host. Isso contradiz
   `artifacts/toolchain-baseline.md`, que afirma "não há dependência de instalação global do pnpm", e
   invalida os tempos de execução registrados em `STATE.md` e `acceptance-report.md`, que só podem ter
   vindo de um shell com `pnpm` resolvível.

Com `pnpm` resolvível no `PATH`, `verify` conclui com exit 0. O defeito é do gate e da instrução de
execução, não da implementação do shell.

## Resultado esperado

Um único comando documentado executa todos os testes do workspace, incluindo os de `apps/game`, e
funciona em um shell limpo do host sem passos manuais não documentados. A contagem de testes do gate
é observável e maior que a atual.

## Dependências

PB-00 fechado (`STATE.md` geral `done`), working tree limpa e `pnpm-lock.yaml` inalterado.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-00/STATE.md`;
3. `package.json` da raiz e `apps/game/package.json`;
4. `vitest.config.ts`;
5. `docs/playbooks/PB-00/artifacts/toolchain-baseline.md`, seção "Comandos canônicos";
6. `docs/playbooks/PB-00/artifacts/acceptance-report.md`, seção "Gates executados".

Não releia código de runtime, `references/` ou task cards anteriores sem uma falha que aponte
especificamente para eles.

## Decisões congeladas

- A toolchain permanece a fixada em `toolchain-baseline.md`; esta task não faz upgrade de dependência.
- Nenhum arquivo em `apps/game/src`, `packages/*/src`, `tests/e2e/` ou `tools/architecture/` muda de
  comportamento. Se um teste até agora não executado falhar, isso é um defeito real: pare e registre.
- `verify` continua sendo o gate único e mantém a ordem atual formato → arquitetura → typecheck →
  testes → build → QA browser.
- A escolha entre corrigir o `PATH` por documentação (`corepack enable`) ou por chamada explícita
  (`corepack pnpm` dentro dos scripts) é do agente, desde que o resultado seja executável em um shell
  limpo e a decisão fique registrada. Não introduza dependência de instalação global de pnpm.
- Screenshots baseline não são regeneradas por esta task.

## Escopo permitido

```text
package.json
vitest.config.ts
apps/game/package.json
packages/*/package.json
docs/playbooks/PB-00/STATE.md
docs/playbooks/PB-00/artifacts/toolchain-baseline.md
docs/playbooks/PB-00/artifacts/acceptance-report.md
docs/playbooks/PB-00/README.md
```

Alterações em `packages/*/package.json` são permitidas apenas para declarar um script `test` quando
sua ausência impedir a agregação; não crie testes de conteúdo novo.

## Fora de escopo

- iniciar PB-01;
- adicionar testes novos de comportamento, cobertura ou asserções ao shell;
- CI remoto, GitHub Actions ou execução multiplataforma das baselines;
- code splitting do bundle Phaser;
- estender a política de fronteiras para `tests/`;
- refatorar `SceneBridge`, lifecycle, viewport ou AppShell.

## Instruções de execução

1. Reproduza os dois defeitos antes de editar e registre a evidência:
   - execute o comando canônico exatamente como documentado, em um shell limpo, e capture a falha de
     `PATH`;
   - execute o gate de testes atual e capture a contagem de testes.
2. Torne a execução dos testes agregada. `pnpm --recursive run test` já cobre `apps/game` e ignora
   packages sem script `test`; qualquer alternativa equivalente é aceitável desde que a contagem
   observada inclua os 21 testes de `apps/game`.
3. Garanta que o gate agregado permaneça determinístico e não execute os specs Playwright duas vezes:
   `tests/e2e/*.spec.ts` pertencem a `qa:browser` e não devem ser coletados pelo runner de unidade.
4. Resolva a dependência de `pnpm` no `PATH` pela via escolhida e alinhe a seção "Comandos canônicos"
   de `toolchain-baseline.md` com o que de fato executa. Se a via for `corepack enable`, ela passa a
   ser pré-requisito documentado e a afirmação sobre instalação global precisa ser reescrita para
   descrever o shim do Corepack com precisão.
5. Corrija em `acceptance-report.md` e `STATE.md` a afirmação de que `verify` cobriu os testes de
   `apps/game`, registrando que essa cobertura passou a existir nesta task. Não apague o histórico de
   verificação; anote a correção com data.
6. Se algum dos 21 testes recém-agregados falhar, pare, mantenha a árvore sem correção de runtime e
   relate `BLOCKED` com o teste, o erro e a hipótese de causa.

## Verificação obrigatória

Em um shell novo, sem ajuste manual de `PATH` além do que a documentação passar a exigir:

```text
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm verify
corepack pnpm architecture:check
git diff --check
git status --short
```

O relatório deve registrar, para `test` e `verify`: exit code, contagem de arquivos e de testes antes
e depois da mudança, e o SHA-256 de `pnpm-lock.yaml` antes e depois. "Passou" sem contagem não é
evidência para esta task, porque a contagem é exatamente o defeito.

## Critérios de aceite

- [ ] `corepack pnpm test` executa os 21 testes de `apps/game` além dos 12 já cobertos, com contagem
  registrada.
- [ ] `corepack pnpm verify` conclui com exit 0 em um shell limpo, seguindo apenas a documentação.
- [ ] Nenhum spec Playwright é executado pelo runner de unidade.
- [ ] `pnpm-lock.yaml` tem o mesmo SHA-256 antes e depois.
- [ ] Nenhum arquivo de runtime, teste de runtime ou baseline foi alterado.
- [ ] `toolchain-baseline.md` descreve com precisão como o gate é executado neste host.
- [ ] `acceptance-report.md` e `STATE.md` não afirmam mais cobertura que o gate não tinha.

## Condições de parada

- Um teste antes não executado falha.
- Agregar os testes exige mudar comportamento de runtime.
- A resolução do `PATH` exigiria instalação global de pnpm ou alteração de configuração do host fora
  do repositório.

Em qualquer desses casos: pare, não reduza o critério e relate o bloqueio com o comando e a saída.

## Handoff e commit

Atualize `STATE.md` com a linha `PB-00-FIX-01`, a evidência de contagem e a confirmação de que PB-01
segue elegível. Acrescente a task à tabela do `README.md` do PB-00.

```text
build: cover package tests in the integrated gate
```

Se bloqueado, o commit registra somente a evidência do bloqueio e a task permanece `blocked`.

## Relatório final

Comece com `APPROVED` ou `BLOCKED`. Em seguida: contagem de testes antes e depois, exit codes, a via
escolhida para o `PATH` e sua justificativa, arquivos alterados, desvios e próxima task elegível.
Não execute PB-01.
