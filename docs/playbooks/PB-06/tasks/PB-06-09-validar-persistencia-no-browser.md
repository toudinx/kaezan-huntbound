# PB-06-09 — Validar a persistência no browser

**Status inicial:** pending

**Classe da tarefa:** verificação observável em browser real

**Modelo sugerido:** GPT-5.6 Luna `xhigh` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; a auditoria PB-06-10 revisa a evidência

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** serial.

## Objetivo

Provar, no Chromium real, que recarregar a página retoma a run no mesmo tick com o loot intacto, que
o estoque sobrevive entre runs, e que o export do browser é idêntico ao do Node — nos quatro
viewports obrigatórios e sem `retries`.

## Resultado esperado

`docs/playbooks/PB-06/artifacts/browser-qa.md` com medições frescas, screenshots versionadas e a spec
`tests/e2e/save-persistence.spec.ts` estável em dez execuções consecutivas.

## Dependências

- PB-06-07 `done` e integrada em `main`.
- PB-06-08 `done` e integrada em `main`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-06/STATE.md`;
3. `docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`, seção "Gate de browser";
4. `docs/playbooks/PB-05/artifacts/browser-qa.md`, o precedente e o formato;
5. `tests/e2e/save-driver.spec.ts`, entregue por PB-06-05;
6. `tests/e2e/hunt-play.spec.ts` e `tests/e2e/hunt-screenshots.spec.ts`, para o padrão de condução e
   de captura;
7. `playwright.config.ts`.

## Decisões congeladas

- Viewports obrigatórios: `390x844`, `768x1024`, `1366x768` e `1920x1080`.
- `retries: 0`. A estabilidade é provada com `--retries=0 --repeat-each=10`. Reintroduzir `retries`
  para mascarar instabilidade é defeito, não pragmatismo.
- **A spec apaga o banco antes e depois de cada caso.** IndexedDB sobrevive entre specs; um teste que
  depende da ordem de execução é um teste quebrado que ainda não falhou.
- Nenhuma alteração de comportamento nesta task. Se algo estiver errado, registre o defeito e pare —
  corrigir é outra task, com seus próprios testes.
- Hash publicado é hash gerado do artefato real, agora.
- **B2, o hunt-budget, é bloqueio herdado e conhecido.** Distinga com evidência uma falha de
  hunt-budget de uma falha causada pelo save. Não mascare, não ajuste o teto e não declare B2
  fechado sem medição fresca.

## Escopo permitido

```text
tests/e2e/save-persistence.spec.ts
tests/e2e/support/**                        (somente helper de limpeza de banco, se necessário)
docs/playbooks/PB-06/artifacts/**
docs/playbooks/PB-06/STATE.md
```

## Fora de escopo

- corrigir defeito encontrado — registre e pare;
- alterar `packages/**` ou `apps/game/src/**`;
- alterar teto de performance, `playwright.config.ts` ou snapshots de outras specs.

## O que a spec prova

1. jogar até ganhar loot, recarregar a página, e a run retomar **no mesmo tick** com a bolsa intacta;
2. concluir a run, recarregar, e o estoque conter o loot consolidado **uma única vez**;
3. abandonar a run, recarregar, e o estoque conter o loot sem sessão pendente;
4. export no browser produzir a **mesma string** que o Node produz para o mesmo documento —
   comparada contra `packages/test-fixtures/save/pb06/export.golden.txt`;
5. import de documento com `schemaVersion` futuro ser recusado com `SAVE_VERSION_UNSUPPORTED`
   visível na UI, sem destruir o save existente;
6. falha de persistência simulada virar estado de erro observável, sem crash e sem run perdida.

## Execução

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb06-09-qa -b codex/pb06-09-save-browser-qa main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-09-qa install --prefer-offline
```

- [ ] **2. Buildar antes de qualquer Playwright.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-09-qa build
```

A suíte serve o `dist` pré-buildado. Sem build, você mede um bundle velho e teoriza sobre um sintoma
que não existe mais.

- [ ] **3. Escrever a spec com os seis casos.**

- [ ] **4. Rodar nos quatro viewports.**

- [ ] **5. Provar estabilidade.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-09-qa exec playwright test tests/e2e/save-persistence.spec.ts --retries=0 --repeat-each=10
```

- [ ] **6. Capturar as screenshots.**

Uma por viewport, com o painel de inventário visível e o estoque preenchido, em
`docs/playbooks/PB-06/artifacts/screenshots/`.

- [ ] **7. Medir boot e console.**

Registre tempo de boot por viewport e confirme console sem erro. Compare com os números do PB-05 e
registre a diferença atribuível ao save.

- [ ] **8. Escrever o relatório.**

`docs/playbooks/PB-06/artifacts/browser-qa.md`: ambiente, comandos com exit code, tabela por
viewport, paridade de export entre browser e Node, resultado do `--repeat-each=10`, screenshots
referenciadas, e uma seção explícita de problemas encontrados — com a separação entre o que é B2 e o
que é do save.

- [ ] **9. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-09-qa exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-09-qa save:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-09-qa qa:browser
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-09-qa verify
```

- [ ] **10. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb06-09-qa add tests docs
git -C C:\Kaezan\kaezan-huntbound-pb06-09-qa commit -m "test: prove the run survives a reload in the browser"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb06-09-save-browser-qa
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb06-09-qa
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb06-09-save-browser-qa
```

## Verificação

`save:check`, `qa:browser` e `verify` na worktree e no resultado integrado; a spec com
`--retries=0 --repeat-each=10` em dez execuções verdes; `biome check .` em `0`.

## Critérios de aceite

- [ ] Os seis casos da spec passam nos quatro viewports.
- [ ] O reload retoma no mesmo tick, com a bolsa intacta.
- [ ] O estoque consolida uma única vez, provado após reload.
- [ ] O export do browser é idêntico ao golden gerado em Node.
- [ ] Versão futura é recusada sem destruir o save existente.
- [ ] Falha de persistência é observável e não derruba a run.
- [ ] A spec apaga o banco antes e depois de cada caso.
- [ ] Dez execuções verdes sem `retries`.
- [ ] Console sem erro em todos os viewports.
- [ ] Quatro screenshots versionadas, com o inventário visível.
- [ ] `browser-qa.md` traz comandos, exit codes e medições frescas.
- [ ] Falha de hunt-budget, se houver, está separada com evidência do que é do save.
- [ ] Nenhum arquivo de `packages/**` ou `apps/game/src/**` foi alterado.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: a spec só ficar estável com `retries`; o reload perder loot ou tick; o export do browser
divergir do Node; ou se a persistência introduzir erro de console em qualquer viewport. Registre o
defeito no `STATE.md` com evidência e pare — corrigir é outra task.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, resultados por viewport, comandos e exit codes,
modelo e effort usados, defeitos registrados e a próxima task elegível.

## Commit

`test: prove the run survives a reload in the browser`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb06-09-save-browser-qa`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb06-09-qa`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Ambiente, comandos com exit code, tabela por viewport, paridade de export, resultado do
`--repeat-each=10`, screenshots, problemas registrados com a separação de B2, integração, limpeza e
próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-06\tasks\PB-06-09-validar-persistencia-no-browser.md

Leia AGENTS.md, o STATE.md do playbook PB-06 e apenas os arquivos indicados pela task. Confirme que
PB-06-07 e PB-06-08 estao done e integradas e que main esta verde.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb06-09-qa com a branch
codex/pb06-09-save-browser-qa e rode "corepack pnpm install --prefer-offline" dentro dela.

Rode "corepack pnpm build" ANTES de qualquer playwright: a suite serve o dist pre-buildado.

Escreva tests/e2e/save-persistence.spec.ts provando, nos viewports 390x844, 768x1024, 1366x768 e
1920x1080: (1) jogar ate ganhar loot, recarregar, e a run retomar NO MESMO TICK com a bolsa intacta;
(2) concluir a run, recarregar, e o estoque conter o loot UMA unica vez; (3) abandonar, recarregar, e
o estoque conter o loot sem sessao pendente; (4) o export do browser ser identico a
packages/test-fixtures/save/pb06/export.golden.txt; (5) import com schemaVersion futuro ser recusado
com SAVE_VERSION_UNSUPPORTED visivel na UI, sem destruir o save existente; (6) falha de persistencia
simulada virar estado de erro observavel sem crash.

A spec APAGA O BANCO antes e depois de cada caso — IndexedDB sobrevive entre specs.

Prove estabilidade com --retries=0 --repeat-each=10. NAO use retries.

Capture quatro screenshots com o inventario visivel, meça boot e console, e escreva
docs/playbooks/PB-06/artifacts/browser-qa.md com comandos, exit codes, tabela por viewport, paridade
de export e uma secao explicita separando o que e hunt-budget (bloqueio herdado B2) do que e do save.

NAO corrija defeito: registre no STATE.md e pare. Nao altere packages/** nem apps/game/src/**.

Rode biome check ., save:check, qa:browser e verify. Atualize o handoff, commite, integre por
fast-forward na main, reverifique e limpe worktree e branch removendo o diretorio antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
