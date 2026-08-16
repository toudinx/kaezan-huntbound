# PB-05-04 — Implementar o combate no kernel

**Status inicial:** pending

**Classe da tarefa:** mudança de semântica do kernel com bump de versões e migração de fixtures —
gatilho de escalonamento pela política de modelos

**Modelo sugerido:** Claude Opus 5, GPT-5.6 Sol `xhigh` ou Grok 4.6 `xhigh`. **Luna está excluída em
qualquer effort.**

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** não. Esta task integra a branch de PB-05-03 e devolve `main` ao verde.

## Objetivo

Dar ao kernel golpe, conjuração, dano, cura, regeneração, cooldown e morte, com as sete fases
congeladas, e migrar os fixtures de PB-03 e PB-04 no **mesmo commit**, de modo que `main` nunca fique
vermelha.

## Resultado esperado

Um kernel v4 que resolve combate determinístico e continua restaurável em **qualquer** fronteira —
com os journals golden de PB-03 e PB-04 byte-idênticos, provando que a mudança é de capacidade e não
de regra existente.

## Dependências

- PB-05-03 `done`, com a branch `claude/pb-05-03-combat-contracts` **preservada e não integrada**.
- Fixtures de PB-03 e PB-04 verdes no estado atual de `main`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/STATE.md`;
3. `docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`, seções "Fases do tick",
   "Contratos v4", "Regressão obrigatória" e "Parâmetros congelados";
4. `docs/simulation/KERNEL_CONTRACT.md` inteiro;
5. `packages/simulation/src/**` inteiro;
6. `packages/contracts/src/simulation/**` no estado da branch de PB-05-03;
7. `docs/simulation/REPLAY_CONTRACT.md`, para ler os hashes de baseline vigentes.

## Decisões congeladas

- Ordem dos sistemas: `S1 lifecycle` → `S2 movement` → `S3 upkeep` → `S4 combat` →
  `S5 death e loot` → `S6 ai` → `S7 spawn`. **Esta task implementa `S3`, `S4` e a morte de `S5`**; a
  rolagem de loot é PB-05-06 e a IA `hunter` é PB-05-05.
- `S3 upkeep` aplica regeneração antes de qualquer gasto do tick, é puramente aritmético e **não
  consome aleatoriedade**.
- `S4 combat` resolve depois do movimento, para que a adjacência avaliada seja a do fim do passo.
- Golpe: alcance Chebyshev `1`, mesmo andar, alvo de facção diferente, respeitando
  `attackReadyAtTick`. Emite `combat/attacked` e depois `combat/damaged`.
- Conjuração: consome `resourceCost`, respeita `cooldownTicks` e `groupCooldownTicks`, e resolve
  `self`, `target` e `area` quadrada centrada no conjurador.
- Dano e cura: inteiro uniforme em `[min, max]` por **um** `nextBelow(max - min + 1)` do stream
  `combat`. Quando `min == max`, **nenhum sorteio é consumido**.
- Cura só atinge a mesma facção; dano só atravessa facções diferentes. Ninguém fere a si mesmo.
- Mitigação é zero: nada de armadura, resistência ou bloqueio.
- Morte: `health <= 0` no início de `S5` remove o ator, emite `actor/died` com `position` e libera o
  assento de spawn com `readyAtTick = tickDaMorte + respawnTicks`. `EntityId` nunca é reaproveitado.
  O jogador não tem assento e simplesmente sai do mundo; **o kernel não respawna jogador**.
- Recusas saem por `command/rejected`, sem qualquer mutação de estado.
- Proibido em `packages/simulation/src/**`: relógio, `Math.random`, timers, `crypto`, dependência
  externa, e as identidades `serverId`, `clientId`, `lookType`, `huntId`, `regionId`, `itemKey` e
  `spellKey`.

## Escopo permitido

```text
packages/simulation/src/**
packages/contracts/src/simulation/**          (apenas correções decorrentes da integração)
packages/test-fixtures/simulation/pb03/**
packages/test-fixtures/hunt/pb04/**
packages/test-fixtures/hunt/pb04-respawn/**
tools/architecture/simulation-boundaries.ts
tools/architecture/simulation-boundaries.test.ts
tools/replay/**
docs/simulation/KERNEL_CONTRACT.md
docs/simulation/REPLAY_CONTRACT.md
docs/playbooks/PB-05/STATE.md
```

## Fora de escopo

- IA `hunter` — PB-05-05;
- rolagem de loot e `loot/granted` — PB-05-06;
- `packages/content`, `packages/assets`, `apps/game`;
- reextrair região.

## Execução RED/GREEN

- [ ] **1. Criar a worktree a partir da branch de contratos.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-04-kernel -b codex/pb-05-04-kernel-combat claude/pb-05-03-combat-contracts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-04-kernel install --prefer-offline
```

A branch nasce **sobre** a de contratos, e não sobre `main`: é isso que permite um único commit
integrado devolver `main` ao verde.

- [ ] **2. Escrever testes RED de `S3 upkeep`.**

Prove: vida e mana regeneram exatamente a cada `regenTicks`, no valor declarado; a regeneração
respeita `maxHealth` e `maxResource` sem ultrapassar; recurso regenerado no tick `T` já pode custear
uma conjuração do tick `T`; blueprint com regeneração `0` nunca regenera; nenhum sorteio é consumido.

- [ ] **3. Implementar `S3 upkeep`; obter GREEN.**

- [ ] **4. Escrever testes RED do golpe.**

Prove: golpe adjacente em facção diferente aplica dano no intervalo e emite `combat/attacked` seguido
de `combat/damaged`, nessa ordem; alvo a distância Chebyshev `2` é recusado com
`SIM_ATTACK_OUT_OF_RANGE`; alvo em outro andar é recusado; alvo da mesma facção é recusado com
`SIM_TARGET_SAME_FACTION`; alvo inexistente é recusado com `SIM_TARGET_UNKNOWN`; golpe antes de
`attackReadyAtTick` é recusado com `SIM_ATTACK_ON_COOLDOWN`; a adjacência é avaliada **depois** de
`S2`, provado por um caso em que o passo do mesmo tick cria a adjacência; toda recusa deixa o estado
intacto e não consome o stream `combat`.

- [ ] **5. Implementar o golpe em `S4`; obter GREEN.**

- [ ] **6. Escrever testes RED da conjuração.**

Prove: `self` cura o conjurador; `target` exige alcance e facção diferente para dano; `area` atinge
todos os alvos válidos no quadrado de raio declarado, em ordem crescente de `EntityId`; mana
insuficiente recusa com `SIM_ABILITY_NO_RESOURCE` sem gastar recurso; cooldown próprio e cooldown de
grupo recusam com os códigos respectivos; índice de habilidade não declarado no blueprint recusa com
`SIM_ABILITY_UNKNOWN`; uma conjuração de área consome **um** sorteio por alvo, na ordem de
`EntityId`, e o consumo é reprodutível; `min == max` não consome sorteio nenhum.

- [ ] **7. Implementar a conjuração em `S4`; obter GREEN.**

- [ ] **8. Escrever testes RED da morte.**

Prove: `health` chega a `0` e o ator é removido em `S5`, com `actor/died` carregando a posição de
morte; o assento de spawn é liberado com `readyAtTick = tickDaMorte + respawnTicks`; a célula liberada
já pode receber um nascimento de `S7` no mesmo tick; a IA de `S6` não mira um ator morto no mesmo
tick; a morte do jogador remove o ator e **não** agenda respawn; `EntityId` não é reaproveitado;
dano que ultrapassa a vida restante não deixa `health` negativo no evento.

- [ ] **9. Implementar a morte em `S5`; obter GREEN.**

- [ ] **10. Provar que os streams novos não deslocam os antigos.**

Compare os oito primeiros `nextUint32()` de `ai`, `movement`, `scenario` e `spawn` com os vetores
golden já registrados em `docs/simulation/KERNEL_CONTRACT.md`, e registre os vetores novos de
`combat` e `loot`. Se algum vetor antigo divergir, a derivação por rótulo foi quebrada: **pare**.

- [ ] **11. Escrever teste RED de fidelidade de restauração.**

Varra **todas** as fronteiras de um cenário sintético que contenha combate, cura, cooldown de
habilidade e morte, e exija convergência de snapshot final e de cauda de eventos. Amostragem não
satisfaz o critério — é este teste que pega o esquecimento de `abilityCooldowns`, de `targetEntityId`
ou dos contadores de regeneração no snapshot.

- [ ] **12. Implementar a serialização completa; obter GREEN.**

- [ ] **13. Estender a regra executável de fronteira.**

Acrescente `itemKey` e `spellKey` à reprovação em `packages/simulation/src/**`, com teste positivo e
negativo, mantendo as cinco identidades já proibidas.

- [ ] **14. Migrar os três fixtures e provar que a semântica não mudou.**

Acrescente os campos neutros de combate aos blueprints de `pb03`, `pb04` e `pb04-respawn`, e
regenere os snapshots golden pelo CLI de replay. O critério é bloqueante:

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-04-kernel diff --stat packages/test-fixtures/simulation/pb03/events.golden.jsonl packages/test-fixtures/hunt/pb04/events.golden.jsonl packages/test-fixtures/hunt/pb04-respawn/events.golden.jsonl
```

Esperado: **vazio**. Os três journals precisam permanecer byte-idênticos; o de PB-03 tem hash
`31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4`, e os das hunts são lidos de
`docs/simulation/REPLAY_CONTRACT.md`. Se algum journal mudar, a regra mudou: **pare**, identifique a
causa e reporte. Não regenere journal para "fazer passar".

Os `snapshot.golden.json` **vão** mudar, porque ganham os campos de combate. Gere os hashes novos dos
arquivos reais e registre-os.

- [ ] **15. Documentar.**

Atualize `KERNEL_CONTRACT.md` trocando "fases pretendidas" pelas fases implementadas, e
`REPLAY_CONTRACT.md` com os hashes novos e a nota de migração.

- [ ] **16. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-04-kernel exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-04-kernel --filter @huntbound/contracts test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-04-kernel --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-04-kernel exec vitest run --config tools/replay/vitest.config.ts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-04-kernel typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-04-kernel simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-04-kernel hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-04-kernel architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-04-kernel verify
```

Rode `simulation:check`, `hunt:check` e `verify` **duas vezes seguidas**, sem alterar a árvore entre
elas. Idempotência já reprovou uma auditoria neste repositório.

- [ ] **17. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-04-kernel add packages tools docs
git -C C:\Kaezan\kaezan-huntbound-pb05-04-kernel commit -m "feat: give the kernel attacks, spells, upkeep and death"
```

- [ ] **18. Integrar as duas branches e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb-05-04-kernel-combat
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-04-kernel
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb-05-04-kernel-combat
git -C C:\Kaezan\kaezan-huntbound branch -d claude/pb-05-03-combat-contracts
```

O `--ff-only` traz os dois commits porque a branch desta task descende da de contratos. A branch de
PB-05-03 só é apagada **depois** de confirmar que seu commit está em `main`.

## Verificação

Todos os gates acima verdes, `simulation:check`/`hunt:check`/`verify` verdes em duas execuções
consecutivas, `biome check .` em `0`, e os três journals golden byte-idênticos.

## Critérios de aceite

- [ ] O cenário v3 é reprovado e o v4 é aceito, com o kernel operando em v4.
- [ ] `S3 upkeep` regenera sem consumir aleatoriedade e sem ultrapassar os máximos.
- [ ] Golpe e conjuração respeitam alcance, facção, cooldown e recurso, com recusa sem mutação.
- [ ] A adjacência é avaliada depois do movimento, provado por teste.
- [ ] Área consome um sorteio por alvo, em ordem de `EntityId`, de forma reprodutível.
- [ ] `min == max` não consome sorteio.
- [ ] A morte remove, emite `actor/died` com posição, libera o assento e não respawna jogador.
- [ ] Os vetores golden de `ai`, `movement`, `scenario` e `spawn` são idênticos; `combat` e `loot`
      têm vetores novos registrados.
- [ ] A restauração é fiel em **todas** as fronteiras varridas.
- [ ] Os três `events.golden.jsonl` permaneceram byte-idênticos.
- [ ] Todo hash novo publicado foi gerado do arquivo real.
- [ ] A regra de fronteira reprova `itemKey` e `spellKey` e roda em gate agregado.
- [ ] `main` fica verde depois da integração das duas branches.

## Condições de parada

**Pare** se: algum `events.golden.jsonl` mudar; algum vetor golden antigo de RNG divergir; a ordem
`S4` antes de `S5` produzir morte observável no mesmo tick de forma ambígua; combate exigir float,
relógio ou identidade de conteúdo; ou se o `--ff-only` não trouxer o commit de contratos junto.

## Persistência do handoff

Atualize `STATE.md` com status das duas tasks, commits integrados, hashes novos gerados dos arquivos
reais, comandos e exit codes, modelo e effort usados, e a próxima task elegível.

## Commit

`feat: give the kernel attacks, spells, upkeep and death`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb-05-04-kernel-combat`, descendente de
`claude/pb-05-03-combat-contracts`; worktree irmã `C:\Kaezan\kaezan-huntbound-pb05-04-kernel`;
integração serial por `--ff-only`; verificação pós-integração por `verify`; limpeza das **duas**
branches e do diretório antes do `prune`.

## Relatório final

Mudanças, contagem de testes por pacote, vetores de RNG, hashes antes e depois, prova explícita de
que os três journals não mudaram com o comando que provou isso, integração das duas branches,
limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Claude Opus 5, GPT-5.6 Sol xhigh ou Grok 4.6 xhigh.
Nao use Luna nesta task: ela altera semantica do kernel e migra fixtures.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-04-implementar-combate-no-kernel.md

Leia AGENTS.md, o STATE.md do playbook PB-05 e apenas os arquivos indicados pela task. Confirme que a
branch claude/pb-05-03-combat-contracts existe, esta com o commit de contratos e NAO foi integrada.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-04-kernel com a branch
codex/pb-05-04-kernel-combat criada A PARTIR DE claude/pb-05-03-combat-contracts, e rode
"corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Implemente S3 upkeep, S4 combat e a morte de S5, com as sete fases congeladas.
Nao implemente a IA hunter (PB-05-05) nem a rolagem de loot (PB-05-06).

Criterio bloqueante: os tres events.golden.jsonl (pb03, pb04, pb04-respawn) devem permanecer
byte-identicos apos a migracao dos fixtures. Se algum mudar, a regra mudou: PARE e reporte. Nunca
regenere journal para fazer teste passar. Os snapshot.golden.json vao mudar; gere os hashes novos dos
arquivos reais.

Prove a fidelidade de restauracao varrendo TODAS as fronteiras, nao por amostragem. Prove que combat
e loot nao deslocam os vetores golden de ai, movement, scenario e spawn.

Rode biome check ., os testes de contracts e simulation, a suite de tools/replay, typecheck,
simulation:check, hunt:check, architecture:check e verify — os tres ultimos DUAS vezes seguidas com a
arvore inalterada.

Commite, integre por fast-forward na main (o merge traz os dois commits), reverifique, e so entao
apague as DUAS branches temporarias, removendo o diretorio da worktree antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
