# PB-04-10 — Auditar e fechar o playbook

**Status inicial:** pending

**Classe da tarefa:** auditoria independente com poder de reprovar

**Modelo sugerido:** Claude Opus 5; fallback GPT-5.6 Sol `xhigh`. Prefira modelo **diferente** dos
implementadores das tasks auditadas.

**Validador sugerido:** o próprio auditor, com evidência fresca; nenhuma afirmação herdada de
relatório anterior é aceita sem reexecução.

**Rota:** `superpowers:verification-before-completion`. TDD não se aplica: esta task não implementa
comportamento novo; a evidência é reexecução e inspeção.

**Paralelismo:** não.

## Objetivo

Verificar, no resultado integrado em `main`, se PB-04 cumpre os critérios finais de aceite, e emitir
um veredito que decide a elegibilidade de PB-05. A auditoria pode **reprovar**.

## Resultado esperado

`docs/playbooks/PB-04/artifacts/acceptance-report.md` com veredito `APPROVED`,
`APPROVED_WITH_WARNINGS` ou `REJECTED`, cada critério ligado a evidência fresca, e os warnings
remanescentes priorizados. Se reprovar, cards de correção `PB-04-FIX-NN` criados e o playbook
mantido aberto.

## Dependências

- PB-04-01 a PB-04-09 `done` e integradas em `main`.
- Árvore limpa em `main`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-04/README.md`, seção “Critérios finais de aceite”;
3. `docs/playbooks/PB-04/STATE.md` inteiro;
4. `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`;
5. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`, seções “Gates antes do primeiro playbook de
   gameplay” e “Contrato para escolher a primeira hunt”;
6. `docs/playbooks/PB-02/artifacts/acceptance-report.md` e
   `docs/playbooks/PB-03/artifacts/acceptance-report.md` como referência de formato e de precedente
   de reprovação.

## Decisões congeladas

- A auditoria roda sobre o resultado integrado, **em checkout limpo**, e não reexecuta as tasks.
- Nenhuma afirmação de handoff é aceita sem reexecução. Relatório não é evidência; comando com exit
  code é.
- `verify` roda **duas vezes seguidas** sem alterar a árvore. O PB-02 foi reprovado exatamente por
  falhar na segunda execução.
- O auditor **não corrige** o que encontrar. Ele reprova, descreve e cria card. Corrigir e auditar no
  mesmo chat destrói a independência.
- Um defeito de produto — hunt intransitável, mídia pessoal vazando para `product`, divergência de
  paridade — é `REJECTED`, não warning.
- Warnings não bloqueantes são listados e priorizados, nunca absorvidos silenciosamente.

## Escopo permitido

```text
docs/playbooks/PB-04/artifacts/acceptance-report.md
docs/playbooks/PB-04/tasks/PB-04-FIX-*.md
docs/playbooks/PB-04/README.md
docs/playbooks/PB-04/STATE.md
docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md
```

## Fora de escopo

- corrigir código, fixture, golden, extração, pack, cena ou teste;
- alterar contratos, versões ou orçamento;
- iniciar qualquer trabalho de PB-05.

## Execução

- [ ] **1. Preparar um checkout limpo.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git branch codex/pb04-10-integrated-gate main
git worktree add C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate codex/pb04-10-integrated-gate
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate install --prefer-offline
```

A árvore precisa estar limpa antes de começar. Árvore suja invalida a auditoria.

- [ ] **2. Rodar o gate raiz duas vezes.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate verify
git -C C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate status --porcelain=v1 --untracked-files=all
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate verify
```

O `status` entre as duas execuções deve sair vazio. Se `verify` alterar a árvore ou falhar na
segunda, é `REJECTED`.

- [ ] **3. Verificar determinismo de ponta a ponta.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate hunt:check
```

Confirme os hashes contra os congelados em `docs/simulation/REPLAY_CONTRACT.md`.

- [ ] **4. Verificar a regressão do PB-03.**

Confirme que `packages/test-fixtures/simulation/pb03/events.golden.jsonl` ainda tem hash
`31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4`. Se mudou em algum ponto do
playbook, é `REJECTED` salvo justificativa de mudança semântica com bump de `SIMULATION_RULES_VERSION`
documentado.

- [ ] **5. Verificar as fronteiras de arquitetura.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate architecture:check
rg -n -e 'serverId|clientId|lookType|huntId|regionId' packages/simulation/src
rg -n -e 'Date|performance|Math\.random|setTimeout|crypto' packages/simulation/src
rg -rn 'assets/personal|references/' packages apps tools --glob '!**/*.md'
```

As duas primeiras varreduras devem sair vazias. A terceira não pode encontrar path literal de mídia
pessoal ou de `references/` em código.

- [ ] **6. Verificar a política de licença.**

Confirme que `product` recusa `cipsoft-personal`, que nenhuma mídia real foi commitada e que as
screenshots do PB-04-09 usam a fixture sintética. Mídia pessoal no repositório é `REJECTED`
imediato.

- [ ] **7. Verificar o produto, e não apenas os gates.**

Suba o app e jogue de fato: ande, colida, desça, suba, veja rotworm nascer. Um playbook cujos gates
passam mas cuja hunt é intransitável ou invisível não está aprovado. O PB-02 só foi reprovado porque
a auditoria olhou o produto, não só o exit code.

- [ ] **8. Conferir o checklist da seleção.**

Percorra item a item o “Contrato para escolher a primeira hunt” do roteiro contra
`docs/content/PB-04-SELECTION.md`. Item sem evidência é warning; item falso é `REJECTED`.

- [ ] **9. Escrever o relatório de aceite.**

Estruture: veredito; critério a critério com comando, exit code e número; defeitos bloqueantes;
warnings priorizados com classificação `FIXABLE`/`ACCEPTED`; e a decisão explícita sobre a
elegibilidade de PB-05.

- [ ] **10. Se reprovar, criar os cards de correção.**

Um card `PB-04-FIX-NN` por defeito independente, no mesmo formato das demais tasks, com prompt
copiável sem placeholder. Mantenha o playbook aberto e registre em `STATE.md` que PB-04 está
`REJECTED` e quais cards o desbloqueiam.

- [ ] **11. Se aprovar, fechar o playbook.**

Atualize `README.md` e `STATE.md` para `closed`, e atualize
`docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`: marque PB-04 como fechado, com commit e veredito, e
declare PB-05 como o próximo a executar.

- [ ] **12. Commitar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate add docs
git -C C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate commit -m "docs: record the PB-04 integrated audit"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb04-10-integrated-gate
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb04-10-integrated-gate
```

## Critérios de aceite

- [ ] `verify` passou duas vezes consecutivas sem alterar a árvore.
- [ ] `simulation:check` e `hunt:check` passaram, com hashes conferidos contra os congelados.
- [ ] `events.golden.jsonl` do PB-03 permanece byte-idêntico.
- [ ] As varreduras de identidade Tibia e de relógio no kernel saíram vazias.
- [ ] Nenhuma mídia pessoal e nenhum path de `references/` existe em código ou no repositório.
- [ ] A hunt foi jogada de fato, não apenas testada.
- [ ] Cada item do checklist de seleção tem evidência.
- [ ] O relatório liga cada critério a comando, exit code e número.
- [ ] O veredito está explícito e a elegibilidade de PB-05 está decidida.
- [ ] Se reprovado, existe um card por defeito independente e o playbook segue aberto.

## Condições de parada

Pare e reprove se a árvore estiver suja, se `verify` não for idempotente, se algum hash divergir sem
causa documentada, se houver mídia pessoal versionada ou se a hunt não for jogável. Não corrija nada
neste chat.

## Persistência e relatório final

Registre veredito, cada comando com exit code, hashes conferidos, warnings priorizados, cards
criados, modelo/effort e a decisão sobre PB-05.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Claude Opus 5, ou GPT-5.6 Sol effort xhigh como fallback.
Prefira um modelo diferente dos implementadores das tasks auditadas.
Use obrigatoriamente superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-04\tasks\PB-04-10-auditar-e-fechar-playbook.md

Leia o README.md e o STATE.md do playbook PB-04 e a spec de PB-04. Crie a branch/worktree indicada e
rode "corepack pnpm install --prefer-offline" dentro dela.

Audite o resultado integrado em checkout limpo. Nenhuma afirmacao de handoff e aceita sem
reexecucao: relatorio nao e evidencia, comando com exit code e. Rode verify duas vezes seguidas e
confirme que a arvore nao muda entre elas. Confira os hashes contra os congelados, varra o kernel
por identidade Tibia e por relogio, e confirme que nenhuma midia pessoal foi versionada.

Suba o app e JOGUE a hunt de fato: ande, colida, desca, suba, veja rotworm nascer. Gates verdes com
hunt intransitavel e REJECTED.

Voce NAO corrige nada. Se encontrar defeito, reprove, descreva e crie um card PB-04-FIX-NN por
defeito independente, mantendo o playbook aberto. Se aprovar, feche o playbook e atualize o roteiro
declarando PB-05 como proximo.

Não inicie nenhum trabalho de PB-05.
```
