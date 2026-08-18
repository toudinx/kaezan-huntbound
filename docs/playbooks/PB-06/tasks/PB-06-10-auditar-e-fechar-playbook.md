# PB-06-10 — Auditar o resultado integrado e fechar o playbook

**Status inicial:** pending

**Classe da tarefa:** auditoria independente e gate final — pode **reprovar**

**Modelo sugerido:** Claude Opus 5, GPT-5.6 Sol ou Grok 4.6 `xhigh`, preferindo modelo **diferente**
do que implementou a maior parte do playbook

**Validador sugerido:** — (esta task é a validação)

**Rota:** `superpowers:verification-before-completion`. Skill operacional: `independent-audit`.

**Paralelismo:** não.

## Objetivo

Verificar, em checkout limpo e com evidência fresca, se PB-06 cumpre integralmente seus critérios de
aceite, e emitir um veredito que decide a elegibilidade de PB-07. **A auditoria pode reprovar** — a
do PB-04 reprovou, e reprovar foi o resultado correto.

## Resultado esperado

`docs/playbooks/PB-06/artifacts/acceptance-report.md` com decisão explícita (`APPROVED`,
`APPROVED_WITH_WARNINGS` ou `REJECTED`), matriz de critérios com evidência por linha, e a decisão
sobre PB-07.

## Dependências

- PB-06-01 a PB-06-09 `done` e integradas em `main`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-06/README.md`, seção "Critérios finais de aceite";
3. `docs/playbooks/PB-06/STATE.md` inteiro;
4. `docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`;
5. `docs/playbooks/PB-05/artifacts/acceptance-report.md`, como molde **e** como lista dos erros que
   não podem se repetir;
6. `docs/simulation/REPLAY_CONTRACT.md`;
7. `docs/playbooks/PB-06/artifacts/browser-qa.md`;
8. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`, seção "Persistência e confiança".

## Decisões congeladas

- A auditoria é **read-only** para código, contratos, fixtures, goldens e testes. Só paths
  documentais de PB-06 podem ser escritos.
- Toda afirmação precisa de saída fresca de comando. Nada é herdado de relatório anterior.
- A auditoria roda em **checkout limpo**, em worktree própria, a partir de `main`.
- Scripts auxiliares vivem no scratchpad da sessão, nunca na árvore auditada.
- Um critério não verificável é `FAIL`, não `PASS` por confiança.
- Warning não bloqueante é registrado e priorizado; blocker gera task corretiva `PB-06-FIX-NN`.
- `verify` precisa passar **duas vezes seguidas** com a árvore inalterada. Uma segunda execução
  vermelha já reprovou um playbook aqui.

## Escopo permitido

```text
docs/playbooks/PB-06/artifacts/**
docs/playbooks/PB-06/STATE.md
docs/playbooks/PB-06/README.md               (somente status e resultado)
docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md   (somente status do PB-06 e elegibilidade de PB-07)
docs/README.md                               (somente a linha de status do PB-06)
docs/playbooks/PB-06/tasks/PB-06-FIX-*.md    (somente se houver blocker)
```

## Fora de escopo

- corrigir defeito: a auditoria não conserta o que audita;
- alterar `packages/**`, `apps/**`, `tools/**`, `tests/**`, `package.json` ou `biome.json`;
- regenerar qualquer golden.

## Verificações independentes obrigatórias

Além de reexecutar os gates, a auditoria produz **evidência própria**:

- [ ] **Neutralidade do save.** Confirmar, pelo `save:check`, que retomar do documento importado
      reproduz o snapshot final golden do PB-05, e conferir o SHA-256 gerado agora contra o sidecar
      do PB-05.
- [ ] **Kernel intocado.** `git diff --stat <commit-base-do-PB-06>..HEAD -- packages/simulation`
      precisa sair vazio. Se não sair, é blocker imediato.
- [ ] **Goldens intocados.** Mesmo diff sobre `packages/test-fixtures/simulation/pb03`,
      `packages/test-fixtures/hunt/pb04`, `pb04-respawn`, `pb05` e
      `packages/content/src/generated`.
- [ ] **Idempotência.** `verify` duas vezes, e `save:check` duas vezes, com a árvore inalterada.
- [ ] **Hashes reais.** Recalcular todo SHA-256 publicado em `hashes.md`, no `REPLAY_CONTRACT.md` e
      nos relatórios do playbook. Hash publicado que não bate com o artefato é blocker — foi a
      dívida D2 do PB-04.
- [ ] **Fixture registrada.** `pb-06-save-session` está em `REPLAY_CONTRACT.md`, e o registro está no
      mesmo commit que criou a fixture — dívida D3.
- [ ] **Lint como gate.** `biome check .` em `0`, separado de `format:check` — dívida D4.
- [ ] **Sem dependência nova.** `git diff` dos `package.json` e do lockfile não introduz pacote
      externo.
- [ ] **Fronteiras.** `architecture:check` verde e `@huntbound/save` sem Zod, sem
      `@huntbound/content` e sem Phaser.
- [ ] **Atomicidade e idempotência do domínio.** Reexecutar os testes que provam rollback,
      serialização concorrente e dupla consolidação, e conferir que eles realmente falham quando a
      garantia é removida — um teste que passa com a garantia desligada não prova nada.
- [ ] **Estabilidade.** `save-persistence.spec.ts` e `save-driver.spec.ts` com
      `--retries=0 --repeat-each=10`.
- [ ] **B2 separado.** Se `qa:browser` reprovar, decidir com evidência se é hunt-budget herdado ou
      regressão introduzida pelo save. Atribuir ao save por falta de análise é tão errado quanto
      atribuir a B2 por conveniência.

## Execução

- [ ] **1. Criar worktree de auditoria a partir de `main` limpo e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb06-10-audit -b codex/pb06-10-integrated-gate main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-10-audit install --prefer-offline
```

- [ ] **2. Reexecutar os gates e registrar comando, exit code e saída relevante.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-10-audit exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-10-audit save:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-10-audit save:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-10-audit simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-10-audit hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-10-audit combat:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-10-audit verify
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-10-audit verify
```

- [ ] **3. Produzir a evidência independente da lista acima.**

- [ ] **4. Escrever a matriz de critérios.**

Uma linha por critério final de aceite do README, cada uma com `PASS`, `FAIL` ou `WARN`, o comando
que a sustenta e a saída relevante. Critério sem comando é `FAIL`.

- [ ] **5. Emitir o veredito e decidir sobre PB-07.**

`APPROVED`, `APPROVED_WITH_WARNINGS` ou `REJECTED`. Em caso de blocker, escreva as task cards
`PB-06-FIX-NN` correspondentes, com escopo mínimo e critério de aceite próprio, e **não** feche o
playbook.

- [ ] **6. Atualizar status.**

`README.md` e `STATE.md` do PB-06, a linha do PB-06 em `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`
e a linha correspondente em `docs/README.md`. Se aprovado, registre a elegibilidade de PB-07 e o
commit auditado.

- [ ] **7. Commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb06-10-audit add docs
git -C C:\Kaezan\kaezan-huntbound-pb06-10-audit commit -m "docs: record the PB-06 integrated acceptance verdict"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb06-10-integrated-gate
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb06-10-audit
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb06-10-integrated-gate
```

## Verificação

Todos os comandos do passo 2 executados em checkout limpo, com saída registrada; a evidência
independente produzida; a matriz completa.

## Critérios de aceite

- [ ] Cada critério final do README tem linha na matriz com comando e saída.
- [ ] Nenhum critério foi marcado `PASS` sem evidência fresca.
- [ ] `git diff` prova que `packages/simulation` e todos os goldens anteriores estão intocados.
- [ ] Todo SHA-256 publicado foi recalculado e bate.
- [ ] `verify` e `save:check` passaram duas vezes com a árvore inalterada.
- [ ] As specs de save passaram dez vezes sem `retries`.
- [ ] Nenhuma dependência externa nova entrou no workspace.
- [ ] O veredito é explícito e a decisão sobre PB-07 está registrada.
- [ ] Blockers, se houver, viraram task cards `PB-06-FIX-NN`.
- [ ] Nenhum arquivo fora do escopo documental foi alterado.

## Condições de parada

**Pare e reprove** se: `packages/simulation` mudou; algum golden anterior mudou; um hash publicado não
bate; `verify` não é idempotente; a neutralidade do save não se sustenta; ou uma spec só é estável
com `retries`.

## Persistência do handoff

Atualize `STATE.md` com o veredito, o commit auditado, os comandos e exit codes, os warnings
priorizados, os blockers com suas task cards e a decisão sobre PB-07.

## Commit

`docs: record the PB-06 integrated acceptance verdict`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb06-10-integrated-gate`; worktree
`C:\Kaezan\kaezan-huntbound-pb06-10-audit`; integração serial por `--ff-only`; limpeza removendo o
diretório antes de `prune` e `branch -d`.

## Relatório final

Veredito, matriz resumida, blockers e warnings, comandos com exit code, commit auditado, integração,
limpeza e decisão sobre PB-07.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Claude Opus 5, GPT-5.6 Sol ou Grok 4.6 em xhigh,
preferindo modelo DIFERENTE do que implementou a maior parte do PB-06.
Use obrigatoriamente superpowers:verification-before-completion e a skill independent-audit.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-06\tasks\PB-06-10-auditar-e-fechar-playbook.md

Leia AGENTS.md, o README e o STATE.md do PB-06, a spec do PB-06 e o acceptance-report do PB-05.
Confirme que PB-06-01 a PB-06-09 estao done e integradas.

Crie a worktree de auditoria C:\Kaezan\kaezan-huntbound-pb06-10-audit a partir de main limpo, com a
branch codex/pb06-10-integrated-gate, e rode "corepack pnpm install --prefer-offline" dentro dela.

A auditoria e READ-ONLY para codigo, contratos, fixtures, goldens e testes. Voce so escreve em
docs/playbooks/PB-06/**, na linha do PB-06 em docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md e em
docs/README.md. Scripts auxiliares ficam no scratchpad, nunca na arvore auditada.

Reexecute biome check ., save:check DUAS vezes, simulation:check, hunt:check, combat:check e verify
DUAS vezes, registrando comando, exit code e saida.

Produza evidencia propria: git diff --stat provando que packages/simulation e os goldens de pb03,
pb04, pb04-respawn, pb05 e content/generated estao INTOCADOS; recalculo de TODO SHA-256 publicado;
confirmacao de que pb-06-save-session esta registrada no REPLAY_CONTRACT.md; ausencia de dependencia
nova; architecture:check e ausencia de Zod, @huntbound/content e Phaser em packages/save; e as specs
de save com --retries=0 --repeat-each=10.

Verifique tambem que os testes de rollback, serializacao concorrente e dupla consolidacao realmente
FALHAM quando a garantia e removida — um teste que passa com a garantia desligada nao prova nada.

Se qa:browser reprovar, decida COM EVIDENCIA se e o hunt-budget herdado (B2) ou regressao do save.

Escreva docs/playbooks/PB-06/artifacts/acceptance-report.md com uma linha por criterio final do
README, cada uma com PASS/FAIL/WARN, comando e saida. Criterio sem comando e FAIL. Emita
APPROVED, APPROVED_WITH_WARNINGS ou REJECTED e decida a elegibilidade de PB-07. Blocker vira task
card PB-06-FIX-NN e o playbook NAO fecha.

Commite, integre por fast-forward na main e limpe worktree e branch removendo o diretorio antes do
prune.
```
