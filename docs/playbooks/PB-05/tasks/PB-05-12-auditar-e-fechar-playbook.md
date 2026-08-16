# PB-05-12 — Auditar o resultado integrado e fechar o playbook

**Status inicial:** pending

**Classe da tarefa:** auditoria independente e gate final — pode **reprovar**

**Modelo sugerido:** Claude Opus 5 ou Grok 4.6 `xhigh`, preferindo modelo **diferente** do que
implementou a maior parte da trilha de kernel

**Validador sugerido:** — (esta task é a validação)

**Rota:** `superpowers:verification-before-completion`. Skill operacional: `independent-audit`.

**Paralelismo:** não.

## Objetivo

Verificar, em checkout limpo e com evidência fresca, se PB-05 cumpre integralmente seus critérios de
aceite, e emitir um veredito que decide a elegibilidade de PB-06. **A auditoria pode reprovar** — a
do PB-04 reprovou, e reprovar foi o resultado correto.

## Resultado esperado

`docs/playbooks/PB-05/artifacts/acceptance-report.md` com decisão explícita (`APPROVED`,
`APPROVED_WITH_WARNINGS` ou `REJECTED`), matriz de critérios com evidência por linha, e a decisão
sobre PB-06.

## Dependências

- PB-05-01 a PB-05-11 `done` e integradas em `main`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/README.md`, seção "Critérios finais de aceite";
3. `docs/playbooks/PB-05/STATE.md` inteiro;
4. `docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`;
5. `docs/playbooks/PB-04/artifacts/acceptance-report.md`, como molde **e** como lista dos erros que
   não podem se repetir;
6. `docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`;
7. `docs/playbooks/PB-05/artifacts/browser-qa.md`.

## Decisões congeladas

- A auditoria é **read-only** para código, contratos, fixtures, goldens e testes. Só paths
  documentais de PB-05 podem ser escritos.
- Toda afirmação precisa de saída fresca de comando. Nada é herdado de relatório anterior.
- A auditoria roda em **checkout limpo**, em worktree própria, a partir de `main`.
- Scripts auxiliares vivem no scratchpad da sessão, nunca na árvore auditada.
- Um critério não verificável é `FAIL`, não `PASS` por confiança.
- Warning não bloqueante é registrado e priorizado; blocker gera task corretiva `PB-05-FIX-NN`.

## Escopo permitido

```text
docs/playbooks/PB-05/artifacts/**
docs/playbooks/PB-05/STATE.md
docs/playbooks/PB-05/README.md               (somente status e resultado)
docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md   (somente status do PB-05 e elegibilidade de PB-06)
docs/playbooks/PB-05/tasks/PB-05-FIX-*.md    (somente se houver blocker)
```

## Fora de escopo

- corrigir qualquer defeito encontrado;
- alterar código, teste, fixture, golden ou contrato;
- iniciar qualquer trabalho de PB-06.

## Execução

- [ ] **1. Criar worktree de auditoria a partir de `main` limpa.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound rev-parse HEAD
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-12-gate -b claude/pb-05-12-integrated-gate main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-12-gate install --prefer-offline
```

Registre o commit auditado. Ele identifica o veredito.

- [ ] **2. Provar idempotência do gate raiz.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-12-gate verify
git -C C:\Kaezan\kaezan-huntbound-pb05-12-gate status --porcelain=v1 --untracked-files=all
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-12-gate verify
git -C C:\Kaezan\kaezan-huntbound-pb05-12-gate status --porcelain=v1 --untracked-files=all
```

Exit `0` nas duas, árvore vazia nas duas.

- [ ] **3. Rodar o gate que o `verify` não cobre.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-12-gate exec biome check .
```

Foi o defeito D4 do PB-04: lint vermelho passando despercebido pelo `verify`. Exit diferente de `0` é
blocker, com a lista completa de diagnósticos no relatório.

- [ ] **4. Verificar determinismo e regressão.**

`simulation:check`, `hunt:check` e `combat:check`, cada um duas vezes. Confira os digests contra
`REPLAY_CONTRACT.md` e confirme que os journals de PB-03 e PB-04 continuam byte-idênticos.

- [ ] **5. Auditar os hashes publicados.**

Para **cada** SHA-256 citado em cards, spec, `STATE.md` e relatórios do PB-05, gere o hash do arquivo
real e compare. Hash publicado que não existe na árvore é blocker — foi o defeito D2 do PB-04.

- [ ] **6. Auditar a estabilidade das specs de browser.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-12-gate build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-12-gate exec playwright test --retries=0 --repeat-each=10
```

Qualquer falha é blocker. Verde que dependa de `retries` é o defeito D1 reencenado.

- [ ] **7. Auditar as fronteiras executáveis.**

Confirme por busca que `packages/simulation/src` não contém identidade Tibia, `itemKey`, `spellKey`,
relógio, aleatoriedade global, timer ou dependência externa; e que `architecture:check` passa.

- [ ] **8. Auditar a fronteira de conteúdo.**

Confirme que os quatro artefatos gerados da hunt continuam byte-idênticos, que
`hunt:extract:sidecar` sai `0` e que nenhum arquivo de `generated/` foi editado à mão — compare com o
histórico de commits das tasks.

- [ ] **9. Jogar a hunt de fato.**

Sessão dirigida em Chromium real: andar, agredir, apanhar, golpear, conjurar as três habilidades,
matar, receber loot, morrer e reiniciar. Um playbook de combate não fecha sem que alguém tenha
lutado. Registre o que viu, inclusive o que ficou estranho.

- [ ] **10. Verificar a fronteira de conteúdo e de balanceamento declarada.**

Confirme que o risco declarado na spec — ficha em level alto trivializando a hunt — está registrado e
foi conscientemente aceito, e não silenciosamente contornado por números que ninguém congelou.

- [ ] **11. Escrever o relatório de aceite.**

Matriz de critérios com comando e evidência por linha, números medidos, defeitos numerados
`D1..DN` com severidade, warnings priorizados, o veredito e a decisão sobre PB-06.

- [ ] **12. Criar as tasks corretivas, se houver blocker.**

`docs/playbooks/PB-05/tasks/PB-05-FIX-NN-<slug>.md`, no mesmo padrão de 17 itens, cada uma com prompt
copiável. Não corrija nada aqui.

- [ ] **13. Atualizar handoff e roteiro, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-12-gate add docs
git -C C:\Kaezan\kaezan-huntbound-pb05-12-gate commit -m "docs: record the PB-05 integrated audit"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only claude/pb-05-12-integrated-gate
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-12-gate
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d claude/pb-05-12-integrated-gate
```

## Verificação

Todos os gates reexecutados em checkout limpo, com saída fresca registrada. Nenhuma linha da matriz
sem evidência.

## Critérios de aceite

- [ ] O commit auditado está identificado e a árvore estava limpa.
- [ ] `verify` saiu `0` duas vezes com a árvore inalterada.
- [ ] `biome check .` foi executado e seu resultado está registrado.
- [ ] `simulation:check`, `hunt:check` e `combat:check` são determinísticos em duas execuções.
- [ ] Os journals golden de PB-03 e PB-04 continuam byte-idênticos.
- [ ] Todo hash publicado pelo PB-05 existe na árvore e confere.
- [ ] As specs de browser passam `10/10` com `--retries=0`.
- [ ] As fronteiras executáveis do kernel estão limpas.
- [ ] Os artefatos gerados da hunt continuam byte-idênticos.
- [ ] A hunt foi **jogada** e o relato está no relatório.
- [ ] O veredito é explícito e a elegibilidade de PB-06 está decidida.
- [ ] Cada blocker tem task corretiva criada.

## Condições de parada

Esta task não "para": ela **reprova**. Se um critério não puder ser verificado, ele é `FAIL` e o
motivo entra no relatório. A única parada legítima é a árvore de `main` estar suja ou alguma task de
PB-05 não estar realmente integrada — nesse caso, registre e devolva antes de auditar.

## Persistência do handoff

Atualize `STATE.md` com o veredito, o commit auditado, a matriz resumida, os defeitos numerados, as
tasks corretivas criadas, modelo e effort usados, e a decisão sobre PB-06. Atualize também
`docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md` com o status do PB-05.

## Commit

`docs: record the PB-05 integrated audit`

## Ciclo de conclusão

Branch-base `main`; branch `claude/pb-05-12-integrated-gate`; worktree
`C:\Kaezan\kaezan-huntbound-pb05-12-gate`; integração serial por `--ff-only`; limpeza removendo o
diretório antes de `prune` e `branch -d`. Não é necessário reverificar após integrar um commit
somente documental, mas confirme que `main` contém o relatório.

## Relatório final

Veredito, commit auditado, matriz de critérios, números medidos, defeitos e warnings priorizados,
tasks corretivas criadas, relato da sessão jogada, e a decisão sobre PB-06.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Claude Opus 5 ou Grok 4.6 xhigh. Prefira um modelo
diferente do que implementou a trilha de kernel do PB-05.
Use obrigatoriamente superpowers:verification-before-completion e a skill independent-audit.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-12-auditar-e-fechar-playbook.md

Leia AGENTS.md, o README e o STATE.md do playbook PB-05, a spec do PB-05 e o relatorio de aceite do
PB-04 — este ultimo tanto como molde quanto como lista de erros que nao podem se repetir.

Auditoria READ-ONLY para codigo, contratos, fixtures, goldens e testes. Voce so escreve em
docs/playbooks/PB-05/artifacts, no STATE.md, no status do README e no roteiro. Scripts auxiliares
ficam no scratchpad da sessao, nunca na arvore auditada.

Crie a worktree C:\Kaezan\kaezan-huntbound-pb05-12-gate a partir de main limpa, registre o commit
auditado e rode "corepack pnpm install --prefer-offline".

Verifique com evidencia fresca: verify duas vezes com arvore inalterada; biome check . (o verify NAO
cobre lint — foi o defeito D4); simulation:check, hunt:check e combat:check duas vezes cada; journals
golden de PB-03 e PB-04 byte-identicos; TODO hash publicado pelo PB-05 conferido contra o arquivo real
(defeito D2); playwright com --retries=0 --repeat-each=10 apos build (defeito D1); fronteiras do
kernel limpas incluindo itemKey e spellKey; artefatos gerados da hunt byte-identicos.

JOGUE a hunt em Chromium real: ande, apanhe, golpeie, conjure as tres habilidades, mate, receba loot,
morra e reinicie. Um playbook de combate nao fecha sem alguem ter lutado. Relate o que viu, inclusive o
que ficou estranho.

Criterio nao verificavel e FAIL, nunca PASS por confianca. Voce PODE reprovar — a auditoria do PB-04
reprovou e estava certa.

Escreva docs/playbooks/PB-05/artifacts/acceptance-report.md com veredito explicito, matriz com
evidencia por linha, defeitos numerados e a decisao sobre PB-06. Crie uma task corretiva
PB-05-FIX-NN por blocker, sem corrigir nada voce mesmo.

Atualize STATE.md, o status no README e o roteiro. Commite, integre por fast-forward na main e limpe
worktree e branch removendo o diretorio antes do prune. Nao inicie nenhum trabalho de PB-06.
```
