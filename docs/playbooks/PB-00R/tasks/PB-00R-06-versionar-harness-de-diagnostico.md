# PB-00R-06 — Versionar o harness de diagnóstico do stall de boot

**Status inicial:** pending

**Classe da tarefa:** ferramental de diagnóstico e auditabilidade de evidência

**Modelo sugerido:** Claude Opus 5 ou GPT-5.6 Sol `xhigh`

**Validador sugerido:** o modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Game Studio não se aplica: nada de gameplay, render ou UI é tocado.

**Paralelismo:** não. Ocupa a porta 4173 durante toda a execução da matriz e não pode rodar junto com
outro Playwright ou `vite preview` no mesmo host.

## Objetivo

Transformar a matriz de controles A/A′/B/D de relato de sessão em experimento reexecutável. Os
scripts que produziram a matriz histórica rodaram em diretório temporário, não sobreviveram à sessão
e não deixaram saída bruta; por isso os descartes de `vite preview`, runner Playwright e da
necessidade do throttling continuam hipótese. Esta task versiona o harness e passa a gerar saída
bruta auditável por execução.

## Resultado esperado

O harness vive em `tools/diagnostics/`, reproduz os quatro controles exatamente conforme a receita já
registrada, roda um processo Node novo por execução e escreve, sem edição manual, um registro por
execução em `docs/playbooks/PB-00R/artifacts/diagnostics/`. A parte pura — classificação de stall e
agregação da matriz — tem teste unitário RED/GREEN. Uma matriz nova, separada da histórica, é gerada
com o N realmente executado e o limite pela regra de três por controle.

## Dependências

- PB-00R-02 registrada como `blocked`, com a receita dos controles no `acceptance-report.md`.
- Working tree limpa na branch `codex/pb00r-06-diag-harness`, criada a partir de
  `codex/pb00r-02-boot-budget`.
- Porta 4173 livre e nenhum outro Playwright no host.
- `dist/game` construído por `corepack pnpm build`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-00R/STATE.md`;
3. `docs/playbooks/PB-00R/artifacts/acceptance-report.md`, em especial "Receita para reconstruir os
   controles" e a matriz A/A′/B/D;
4. `docs/playbooks/PB-00R/tasks/PB-00R-02-estabilizar-budget-de-boot.md`;
5. `tests/e2e/boot-budget.spec.ts`;
6. `tests/e2e/support/bootMetrics.ts`;
7. `playwright.config.ts`;
8. `tools/architecture/check-boundaries.ts`.

## Decisões congeladas

- Budget, retry, workers, cache e throttling do gate não mudam. `tests/e2e/boot-budget.spec.ts` e
  `playwright.config.ts` não são editados por esta task.
- O harness é diagnóstico. Nenhuma saída dele vale como evidência de aceite.
- A matriz histórica permanece rotulada "relato não verificado independentemente". Execuções novas
  não a auditam: produzem uma matriz nova e separada, e as duas não se fundem.
- Critério de stall: `sendEnd - sendStart` ou `receiveHeadersStart - sendEnd` acima de 3.000 ms.
- N é declarado antes da sessão. Não aumentar N para caçar reprodução.
- `0/N` não prova ausência: todo controle sem stall registra o limite superior pela regra de três.
- "Chromium sob rede emulada neste host" continua fronteira observada, não culpado. O host segue não
  descartado enquanto não houver o controle em segundo host.
- PB-00R-02 permanece `BLOCKED` e PB-00R-05 permanece inelegível ao fim desta task, qualquer que seja
  o resultado da matriz.

## Escopo permitido

```text
tools/diagnostics/**
docs/playbooks/PB-00R/artifacts/diagnostics/**
docs/playbooks/PB-00R/tasks/PB-00R-06-versionar-harness-de-diagnostico.md
docs/playbooks/PB-00R/STATE.md
docs/playbooks/PB-00R/artifacts/acceptance-report.md
package.json (somente para registrar o script de execução do harness)
```

Nenhum arquivo de produção.

## Fora de escopo

- alterar budget, retry, workers, cache ou throttling;
- editar `tests/e2e/**` ou `playwright.config.ts`;
- suprimir ou afrouxar `architecture:check`;
- corrigir as falhas pré-existentes de `format:check` (CRLF em `apps/game/vite.config.ts` e
  `tests/workspace/vite-build-config.test.ts`; `noExportsInTest` em `tests/e2e/shell.spec.ts`);
- executar a matriz em segundo host sem autorização explícita;
- iniciar PB-00R-05.

## Execução red-green

- [ ] **1. Confirmar pré-condições.**

Working tree limpa, porta 4173 livre, nenhum Playwright ou `vite preview` no host, `dist/game`
construído.

- [ ] **2. Escrever o teste da parte pura antes do módulo.**

Crie `tools/diagnostics/bootStall.test.ts` no padrão de `tests/e2e/support/bootMetrics.test.ts`,
cobrindo a classificação de stall nas duas fronteiras, o limite da regra de três e a agregação da
matriz por controle. O `include` do Vitest da raiz é `tests/**`, então o teste precisa de
`tools/diagnostics/vitest.config.ts` próprio; a configuração da raiz não muda.

```text
corepack pnpm exec vitest run --config tools/diagnostics/vitest.config.ts
```

Confirme RED por módulo ausente.

- [ ] **3. Implementar `tools/diagnostics/bootStall.ts` e obter GREEN.**

Só a parte pura: limiar, classificação, regra de três e agregação. Nenhum I/O.

- [ ] **4. Construir o harness em volta da parte pura.**

`controls.ts` com as definições dos quatro controles, `previewServer.ts` com o ciclo de vida do
`vite preview`, `runControl.ts` com uma execução em processo próprio e `runBootStallMatrix.ts` como
orquestrador. Registre o script de execução em `package.json`. O I/O fica fora do teste unitário.

- [ ] **5. Declarar N e executar a matriz uma vez.**

Declare o N por controle antes de rodar e registre a declaração no artefato. Execute uma sessão
completa e não a repita para obter outro resultado.

- [ ] **6. Registrar o resultado como ele saiu.**

Se o harness não reproduzir o stall em nenhuma execução, esse é o resultado e deve ser registrado
como tal, com o limite pela regra de três. Não force reprodução e não reclassifique o veredito.

- [ ] **7. Executar os gates.**

```text
corepack pnpm exec vitest run --config tools/diagnostics/vitest.config.ts
corepack pnpm exec biome check .
corepack pnpm typecheck
corepack pnpm architecture:check
corepack pnpm build
corepack pnpm qa:browser
git diff --check
git status --short
```

Se `architecture:check` reprovar por causa de `tools/diagnostics`, resolva a política de dependência
de verdade; não suprima a checagem. `format:check` já falhava antes desta task; apenas confirme que
não piorou.

- [ ] **8. Documentar e commitar.**

Atualize `STATE.md` e `acceptance-report.md` com a matriz nova, o N por controle, os limites da regra
de três e o que mudou de hipótese para conclusão — se é que algo mudou. Preserve o histórico de
falhas.

```text
git commit -m "test: version the PB-00R-02 diagnostic harness"
```

## Critérios de aceite

- [ ] Harness versionado reproduz A, A′, B e D conforme a receita registrada.
- [ ] Um processo Node novo por execução; A reaproveita um único `vite preview` e A′ o recicla.
- [ ] Saída bruta por execução versionada, com controle, índice, timestamp, tempos e veredito.
- [ ] Parte pura tem teste unitário que falhou antes de existir e passa depois.
- [ ] Matriz nova gerada pelo harness, com N executado e limite pela regra de três por controle.
- [ ] Matriz histórica continua rotulada como relato não verificado independentemente e separada.
- [ ] Nenhum arquivo de produção alterado; budget, retry, workers, cache e throttling intactos.
- [ ] PB-00R-02 continua `BLOCKED` e PB-00R-05 continua inelegível.

## Condições de parada

Pare e reporte se a execução da matriz exigir alterar o gate, se `architecture:check` só passar por
supressão, ou se a única forma de reproduzir o stall for mudar throttling, budget ou N declarado.

## Relatório final

Mapeie cada entregável ao arquivo criado, apresente a matriz nova com N e limites, liste comandos e
exit codes, registre implementador/effort/validador e diga explicitamente o que continua hipótese.
Depois pare para validação independente por modelo frontier diferente.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound.

Crie a branch codex/pb00r-06-diag-harness a partir de codex/pb00r-02-boot-budget. Confirme antes:
working tree limpa, porta 4173 livre e nenhum outro Playwright rodando neste host.

Execute integralmente e somente a task:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-00R\tasks\PB-00R-06-versionar-harness-de-diagnostico.md

Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Não altere budget, retry, workers, cache ou throttling, e não toque em nenhum arquivo de produção.
Declare o N por controle antes de rodar a matriz e não o aumente depois. Registre o limite da regra
de três para todo controle sem stall. A matriz histórica permanece rotulada como relato não
verificado independentemente e não é auditada por execuções novas.

Execute todos os gates, atualize STATE.md e acceptance-report.md, crie o commit
test: version the PB-00R-02 diagnostic harness e pare para validação independente. PB-00R-02
permanece BLOCKED e PB-00R-05 permanece inelegível.
```
