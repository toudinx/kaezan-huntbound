# PB-07-03 — Contrato de combate v5

**Status inicial:** pending

**Classe da tarefa:** contrato, schema e migração; herdada por todas as tasks seguintes

**Modelo sugerido:** GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6, `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** serial. É a raiz técnica do playbook; nada depois dela pode começar antes.

## Objetivo

Abrir espaço no contrato para tudo que o playbook vai precisar, **em um único bump**, com campos
aditivos cujos defaults reproduzem o comportamento v4 exatamente. Nenhuma regra muda nesta task: só
a forma.

## Resultado esperado

`SIMULATION_SCHEMA_VERSION` é `5` e `SIMULATION_RULES_VERSION` é `4`. Rodar os cenários existentes
com os campos novos em seus defaults produz **os mesmos eventos de sempre** — a prova de que o bump
é aditivo. Os goldens são regenerados uma vez, e o diff mostra mudança apenas no envelope do
snapshot, nunca na sequência de eventos.

## Dependências

- **PB-07-01 integrada.** É ela que diz quais campos existem. Começar sem ela é adivinhar o escopo
  do contrato, e um contrato adivinhado custa um segundo bump.
- PB-07-02 é independente e pode estar ou não integrada.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md`, "Decisões congeladas", e `STATE.md`;
3. `docs/content/PB-07-ROTATIONS.md` — **a tabela de slots e a lista "o que o contrato não
   representa"** são o escopo desta task;
4. `.cursor/rules/10-boundaries.mdc`;
5. `docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`;
6. `packages/contracts/src/simulation/{identity,types,schemas}.ts`;
7. `packages/simulation/src/state/snapshot.ts` — serialização e validação do estado;
8. `packages/contracts/src/save/schemas.ts` e `packages/save/src/migrations/**` — o que acontece com
   uma sessão salva quando o schema muda;
9. `packages/test-fixtures/{simulation/pb03,hunt/pb04,hunt/pb04-respawn,hunt/pb05}/`;
10. `tools/replay/cli.ts`, verbos `run`, `verify`, `hash` e `check-hashes`.

## Decisões congeladas

- **Um bump só.** Todo campo que o playbook vai precisar entra aqui. Descobrir na PB-07-09 que falta
  um campo e bumpar de novo é o defeito que esta task existe para evitar.
- **Todo campo é aditivo com default neutro.** Default de leech é `0`; default de regen fora de
  combate é `0`, que faz cair no regen atual; lista de condições nasce vazia; elemento default é
  `physical`; cargas default é ilimitado, representado do jeito que o schema já usa para "sem
  limite" — confira o padrão vizinho antes de inventar um sentinel.
- **Nenhuma regra de combate muda nesta task.** `applyUpkeep`, `applyDamage` e `resolveCast`
  continuam fazendo exatamente o que fazem. Comportamento é PB-07-04 e PB-07-05.
- **`ActorState.groupReadyAtTick` deixa de ser escalar** e vira coleção por grupo de cooldown. Esse é
  o único campo existente que muda de forma; todos os outros só ganham vizinhos. A migração precisa
  mapear o valor antigo para o grupo primário.
- **Estado serializado continua só com inteiros seguros, booleanos e strings.** Nada de `Map`, `Set`,
  ponto flutuante ou `undefined` no snapshot. Percentual vira inteiro por milhar.
- **Ordem canônica em toda coleção nova.** Condições ativas, cooldowns por grupo e cargas são
  ordenados por chave, de forma determinística, do mesmo jeito que `abilityCooldowns` já é ordenado
  por `abilityIndex`. Coleção sem ordem canônica quebra replay.
- **Golden é regenerado uma vez, aqui.** Com prova de que os eventos não mudaram.

## Escopo permitido

```text
packages/contracts/src/simulation/**
packages/contracts/src/index.ts
packages/simulation/src/state/snapshot.ts
packages/simulation/src/state/worldState.ts
packages/simulation/src/kernel/**          (só o que o compilador exigir para os campos novos)
packages/content/src/hunts/buildHuntScenario.ts   (só preencher defaults)
packages/save/src/migrations/**
packages/test-fixtures/**                  (regeneração por CLI, nunca à mão)
docs/simulation/KERNEL_CONTRACT.md
docs/simulation/REPLAY_CONTRACT.md
docs/playbooks/PB-07/STATE.md
```

## Fora de escopo

- qualquer mudança de comportamento — PB-07-04 em diante;
- seleção de conteúdo, vocação nova, magia nova;
- `apps/game`;
- crítico, que a decisão 8 do README manteve fora do playbook.

## Campos a publicar

A lista definitiva sai de `docs/content/PB-07-ROTATIONS.md`, seção "o que o contrato não
representa". O que já está decidido pelo README e **precisa** existir:

| Onde | Campo | Serve a |
|---|---|---|
| `ActorBlueprint` | regen de vida e mana **fora de combate**, com ticks e amount próprios | decisão 1 |
| `ActorBlueprint` | janela em ticks que define "em combate" | decisão 1 |
| `ActorBlueprint` | leech de vida e de mana, por milhar do dano causado | decisão 1 |
| `ActorBlueprint` | elemento do ataque básico | decisão 8, PB-07-09 |
| `ActorBlueprint` | resistências e imunidades por elemento | PB-07-09 |
| `ActorState` | tick do último dano **recebido** | decisão 1 |
| `ActorState` | condições ativas: índice da definição, tick de expiração, chave de exclusividade | decisões 6 e 9 |
| `ActorState` | cooldown por grupo, substituindo `groupReadyAtTick` escalar | decisões 6 e 9 |
| `ActorState` | cargas restantes por habilidade | decisão 3 |
| `AbilityDefinition` | elemento do dano | PB-07-09 |
| `AbilityDefinition` | grupo primário e grupo secundário de cooldown | decisão 6 |
| `AbilityDefinition` | condição aplicada, quando houver | decisões 6 e 9 |
| `AbilityDefinition` | cargas máximas e regra de recarga | decisão 3 |
| `AbilityDefinition` | marca de *toggle*, para a stance que desliga ao ser relançada | decisão 6 |
| `KernelScenario` | tabela de definições de condição, endereçada por índice | decisão 9 |

Condição é endereçada **por índice na tabela do cenário**, como `abilities` e `lootTables` já são.
Não introduza string livre no estado do kernel.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb07-03-contract -b codex/pb07-03-combat-contract-v5 main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-03-contract install --prefer-offline
```

- [ ] **2. Registrar a baseline ANTES de tocar em qualquer coisa.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-03-contract simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-03-contract hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-03-contract combat:check
```

Guarde os `events.golden.jsonl` das quatro fixtures em cópia fora da árvore. Eles são a prova do
passo 6 e você não vai poder recuperá-los depois de regenerar.

- [ ] **3. RED do schema.** Para cada campo novo: um teste de aceitação do valor válido, um de
      recusa do inválido com caminho de diagnóstico correto, e um de que **o default é aplicado
      quando o campo está ausente**. Para as coleções, um teste de que ordem errada é **recusa**, não
      reordenação silenciosa — o precedente é o `stash`/`bag` do PB-06-01.

- [ ] **4. RED da migração de `groupReadyAtTick`.** Um snapshot v4 com `groupReadyAtTick: N` migra
      para v5 com o grupo primário em `N` e nenhum outro grupo. É o único campo que muda de forma, e
      é onde a migração pode silenciosamente perder cooldown.

- [ ] **5. GREEN.** Publique os campos, os defaults e a migração.

- [ ] **6. Provar que o bump é aditivo — o passo que decide se a task está correta.**

Rode os quatro cenários com o código novo e **compare os eventos com a cópia do passo 2**. Os
`events.golden.jsonl` têm que sair **byte-idênticos**. Se um único evento mudou, o bump não foi
aditivo: algum default não é neutro. **Pare e ache o campo** antes de continuar — não regenere o
golden de eventos para acomodar a diferença.

```powershell
node --no-warnings --experimental-transform-types tools\replay\cli.ts run --scenario packages\test-fixtures\hunt\pb05\scenario.json --log packages\test-fixtures\hunt\pb05\commands.jsonl --out <temp>
```

- [ ] **7. Regenerar os goldens de snapshot e os sidecars.**

Só o `snapshot.golden.json` muda, porque carrega `schemaVersion` e os campos novos. Regenere pelo
CLI — nunca à mão — e refaça os `*.sha256` com `hash --file`. Valide com `check-hashes --dir`.

- [ ] **8. Confirmar o comportamento do save.**

O README do PB-06 já projetou: sessão incompatível é descartada **com a bolsa preservada**. Prove que
é isso que acontece com um save v4 sob schema v5. **Se for isso, não escreva migração de sessão** —
já existe. Se não for, pare e registre: é decisão de produto sobre dado salvo.

- [ ] **9. Atualizar `KERNEL_CONTRACT.md` e `REPLAY_CONTRACT.md`** com os campos novos e com o
      registro da regeneração: data, motivo, e a prova de que os eventos não mudaram.

- [ ] **10. Executar gates, commitar, integrar e limpar.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-03-contract verify
git -C C:\Kaezan\kaezan-huntbound-pb07-03-contract add packages docs
git -C C:\Kaezan\kaezan-huntbound-pb07-03-contract commit -m "feat: open the combat contract to sustain, conditions and elements"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-03-combat-contract-v5
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb07-03-contract
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-03-combat-contract-v5
```

## Verificação

`verify` verde na worktree e no resultado integrado. `simulation:check`, `hunt:check` e
`combat:check` verdes contra os goldens regenerados. Diff dos quatro `events.golden.jsonl` **vazio**
contra a cópia do passo 2 — anexe o comando e o resultado ao relatório.

## Critérios de aceite

- [ ] `SIMULATION_SCHEMA_VERSION` é `5` e `SIMULATION_RULES_VERSION` é `4`.
- [ ] Todo campo da tabela existe, com default neutro e teste do default.
- [ ] Toda coleção nova tem ordem canônica, e ordem errada é recusa com diagnóstico localizado.
- [ ] `groupReadyAtTick` virou coleção por grupo, com migração testada a partir de um snapshot v4.
- [ ] Os quatro `events.golden.jsonl` são byte-idênticos aos da baseline.
- [ ] Só `snapshot.golden.json` e seus `*.sha256` mudaram; `check-hashes` verde nas quatro fixtures.
- [ ] Nenhum arquivo gerado foi editado à mão.
- [ ] Nenhuma regra de combate mudou — nenhum `if` novo em `applyUpkeep`, `applyDamage` ou
      `resolveCast`.
- [ ] Save v4 sob v5 descarta a sessão preservando a bolsa, provado por teste.
- [ ] `KERNEL_CONTRACT.md` e `REPLAY_CONTRACT.md` registram a regeneração e sua prova.
- [ ] `corepack pnpm verify` sai `0` depois da integração.

## Condições de parada

**Pare e registre no `STATE.md`** se: um evento mudar no passo 6 e a causa não for um default não
neutro corrigível; a migração de `groupReadyAtTick` não puder preservar o cooldown vigente; o save v4
**não** descartar a sessão preservando a bolsa; ou se a tabela de slots da PB-07-01 exigir um campo
que não caiba em inteiro/booleano/string.

## Persistência do handoff

`STATE.md`: status, branch, commit, contagem de testes, resultado do diff de eventos, modelo e effort,
e próxima task elegível.

## Commit

`feat: open the combat contract to sustain, conditions and elements`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-03-combat-contract-v5`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb07-03-contract`; integração por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Campos publicados, defaults, o diff de eventos com o comando que o produziu, o que mudou nos
goldens, comportamento do save confirmado, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07\tasks\PB-07-03-contrato-de-combate-v5.md

Leia AGENTS.md, .cursor/rules/10-boundaries.mdc, docs/playbooks/PB-07/README.md, o STATE.md,
docs/content/PB-07-ROTATIONS.md e apenas os arquivos indicados pela task.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb07-03-contract com a branch
codex/pb07-03-combat-contract-v5 e rode "corepack pnpm install --prefer-offline" dentro dela.

ANTES DE TOCAR EM QUALQUER COISA: rode simulation:check, hunt:check e combat:check, e copie os
quatro events.golden.jsonl para fora da arvore. Eles sao a prova do passo final e nao dao para
recuperar depois.

Suba SIMULATION_SCHEMA_VERSION para 5 e SIMULATION_RULES_VERSION para 4. Publique os campos listados
na tabela da task: regen fora de combate, janela de combate, leech por milhar, elemento, resistencia,
tick do ultimo dano recebido, condicoes ativas, cooldown por grupo, cargas, grupo primario e
secundario, condicao aplicada, toggle, e a tabela de definicoes de condicao no cenario. A lista
definitiva sai da secao "o que o contrato nao representa" de PB-07-ROTATIONS.md.

TODO CAMPO E ADITIVO COM DEFAULT NEUTRO. NENHUMA REGRA DE COMBATE MUDA nesta task: nenhum if novo em
applyUpkeep, applyDamage ou resolveCast.

groupReadyAtTick deixa de ser escalar e vira colecao por grupo. E o unico campo que muda de forma:
teste a migracao de um snapshot v4 preservando o cooldown no grupo primario.

Estado serializado continua so com inteiro seguro, booleano e string. Percentual vira inteiro por
milhar. Toda colecao nova tem ordem canonica, e ordem errada e RECUSA com diagnostico localizado,
como stash/bag no PB-06-01. Condicao e endereçada por INDICE na tabela do cenario, nunca por string.

PROVA DECISIVA: rode os quatro cenarios com o codigo novo e compare os events.golden.jsonl com a
copia da baseline. Tem que sair BYTE-IDENTICO. Se um evento mudou, algum default nao e neutro: PARE
e ache o campo. NAO regenere golden de eventos para acomodar diferenca.

Depois regenere so os snapshot.golden.json pelo CLI (tools/replay/cli.ts run), refaca os .sha256 com
hash --file e valide com check-hashes --dir. Nunca edite artefato gerado a mao.

Confirme que um save v4 sob schema v5 descarta a sessao PRESERVANDO A BOLSA, como o PB-06 projetou.
Se for isso, nao escreva migracao de sessao. Se nao for, PARE.

Registre a regeneracao em KERNEL_CONTRACT.md e REPLAY_CONTRACT.md com data, motivo e a prova.

Rode verify. Atualize o STATE.md, commite, integre por fast-forward na main, reverifique e limpe
worktree e branch removendo o diretorio antes do prune.

Pare se um evento mudar sem causa corrigivel, se a migracao perder cooldown, se o save nao preservar
a bolsa, ou se algum campo nao couber em inteiro/booleano/string. Nao inicie a proxima task.
```
