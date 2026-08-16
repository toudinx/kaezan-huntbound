# PB-05-07 — Traduzir conteúdo curado em cenário de combate

**Status inicial:** pending

**Classe da tarefa:** tradução de conteúdo com resolução de fórmula float em inteiro — decide números
que aparecem em toda partida

**Modelo sugerido:** GPT-5.6 Sol `xhigh` ou Grok 4.6 `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `hunt-content-pipeline`, `run-gates`, `worktree-cycle`.

**Paralelismo:** não.

## Objetivo

Fazer `buildHuntScenario` compor o combate a partir do catálogo: vida, dano, cooldowns e ritmo de
passo derivados de estatística de criatura, habilidades derivadas das spells com a ficha congelada, e
tabelas de loot derivadas do loot curado — com **toda** fórmula float resolvida em inteiro nesta
fronteira.

Esta task paga a dívida que PB-04 registrou em `docs/content/MAP_REGION_CONTRACT.md`: *"Derivar
cooldown de estatística de criatura é trabalho de PB-05"*.

## Resultado esperado

Um `KernelScenario` v4 completo, construído a partir de `HuntDefinition` + ficha + catálogo, com os
quatro artefatos gerados da hunt **byte-idênticos** — porque nada é reextraído.

## Dependências

- PB-05-02 `done` e integrada: catálogo com três spells e a ficha congelada.
- PB-05-03 e PB-05-04 `done` e integradas: contrato e kernel em v4.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/STATE.md`;
3. `docs/content/PB-05-SELECTION.md` — as conversões medidas e a ficha, que são a fonte dos números;
4. `docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`, seções "A fórmula é resolvida
   fora do kernel", "Identidade de item e de spell não entra no kernel" e "A região não é reextraída";
5. `packages/content/src/hunts/buildHuntScenario.ts` e seus testes;
6. `packages/content/src/runtime/contentRegistry.ts`;
7. `packages/contracts/src/hunt/types.ts` e `packages/contracts/src/simulation/types.ts`;
8. `docs/content/MAP_REGION_CONTRACT.md`, seção "Spawns e blueprints".

## Decisões congeladas

- **A região não é reextraída.** `region.json`, `spawns.json`, `transitions.json` e `hunt.json`
  permanecem byte-idênticos. `HuntDefinition` **não** muda de forma. O combate é composto em tempo de
  construção do cenário.
- `stepCooldownTicks` e `attackCooldownTicks` derivam de estatística, pela conversão exata medida e
  congelada em `PB-05-SELECTION.md`. Nenhum número mágico novo entra aqui.
- Conversão de tempo: `intervalMs / 50`; resto não nulo é erro, nunca arredondamento silencioso.
- Toda fórmula é resolvida **aqui**, em `min`/`max` inteiros. Nenhum float atravessa para o cenário.
- Criatura com ataque vira `hunter`; criatura sem ataque permanece `wander`; o jogador é `inert`,
  porque quem o dirige é o comando externo.
- Facções: jogador e criaturas em facções diferentes. O valor concreto é escolhido aqui e
  documentado.
- `itemIndex` é posição na tabela `itemKeys` devolvida junto do cenário; a tabela é ordenada de forma
  determinística e é a única ponte entre índice e `item:tibia:*`.
- Ficha, spells e conversões são exatamente as de `PB-05-SELECTION.md`. Esta task **não** reabre
  seleção nem rebalanceia.

## Escopo permitido

```text
packages/content/src/hunts/**
packages/content/src/runtime/**
packages/contracts/src/hunt/**              (somente se um diagnóstico faltar)
docs/content/MAP_REGION_CONTRACT.md         (encerrar a dívida registrada)
docs/playbooks/PB-05/STATE.md
```

## Fora de escopo

- `packages/simulation`, `packages/assets`, `apps/game`;
- `tools/map-extractor` e qualquer reextração;
- a fixture golden e o gate `combat:check` — PB-05-08;
- importar conteúdo novo — PB-05-02.

## Interfaces produzidas

```ts
export interface HuntScenarioBuild {
  readonly scenario: KernelScenario;
  readonly itemKeys: readonly string[];
  readonly abilityKeys: readonly string[];
}

export function buildHuntScenario(
  hunt: HuntDefinition,
  character: CharacterDefinition,
  registry: ContentRegistry,
  seed: Seed,
): SimulationValidationResult<HuntScenarioBuild>;
```

`itemKeys` e `abilityKeys` são as tabelas de tradução que a apresentação e a projeção da bolsa usam.
Elas saem daqui porque é aqui que o índice é atribuído.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-07-content -b codex/pb-05-07-content-to-combat main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-07-content install --prefer-offline
```

- [ ] **2. Escrever testes RED da derivação de blueprint.**

Prove: `maxHealth` do rotworm vem de `stats.health`; `attackMinDamage`/`attackMaxDamage` vêm do ataque
melee curado; `attackCooldownTicks` vem de `intervalMs / 50` e um intervalo não divisível produz
diagnóstico; `stepCooldownTicks` segue exatamente a conversão congelada; criatura com ataque vira
`hunter` e criatura sem ataque permanece `wander`; o jogador é `inert` e recebe vida, mana e
regeneração da ficha; jogador e criatura ficam em facções diferentes.

- [ ] **3. Implementar a derivação de blueprint; obter GREEN.**

- [ ] **4. Escrever testes RED das habilidades.**

Prove: as três spells viram `AbilityDefinition` com `cooldownTicks` e `groupCooldownTicks`
convertidos de ms, `resourceCost` igual ao custo de mana, `shape` e `radius` coerentes com o catálogo,
e `minPower`/`maxPower` **inteiros** iguais aos valores congelados em `PB-05-SELECTION.md`; uma spell
não permitida à família do Knight é rejeitada com diagnóstico; `abilityIndices` do jogador aponta para
as três, em ordem determinística.

O teste que vale mais: comparar `minPower`/`maxPower` produzidos com os números que a seleção
congelou. Se divergirem, ou a conta desta task está errada, ou a seleção está — e as duas hipóteses
precisam ser investigadas antes de qualquer ajuste.

- [ ] **5. Implementar as habilidades; obter GREEN.**

- [ ] **6. Escrever testes RED das tabelas de loot.**

Prove: as oito entradas de loot do rotworm viram uma `LootTableDefinition`, na ordem determinística
declarada; `chancePerHundredThousand`, `minCount` e `maxCount` são preservados sem conversão; cada
`itemKey` vira um `itemIndex` estável, e a tabela `itemKeys` é ordenada de forma determinística; um
`itemKey` ausente do catálogo produz diagnóstico único listando **todos** os ausentes; o blueprint do
jogador tem `lootTableIndex` nulo.

- [ ] **7. Implementar as tabelas de loot; obter GREEN.**

- [ ] **8. Provar que nenhum float atravessa.**

Escreva o teste que valida o cenário construído contra o encoder canônico: qualquer float produziria
`SIM_STATE_NOT_INTEGER`. Esse é o teste que impede uma fórmula mal arredondada de vazar.

- [ ] **9. Provar que a extração continua intacta.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-07-content status --porcelain=v1 -- packages/content/src/generated/hunts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-07-content hunt:extract:sidecar
```

Esperado: saída vazia no `status` e exit `0` no sidecar. Os quatro artefatos da hunt não podem mudar
nesta task.

- [ ] **10. Encerrar a dívida documentada.**

Atualize `docs/content/MAP_REGION_CONTRACT.md` trocando a nota *"Derivar cooldown de estatística de
criatura é trabalho de PB-05"* pela regra agora implementada, com a conversão exata e a referência a
`PB-05-SELECTION.md`.

- [ ] **11. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-07-content exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-07-content --filter @huntbound/content test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-07-content typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-07-content content:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-07-content hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-07-content architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-07-content verify
```

- [ ] **12. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-07-content add packages docs
git -C C:\Kaezan\kaezan-huntbound-pb05-07-content commit -m "feat: compose combat blueprints, abilities and loot tables from content"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb-05-07-content-to-combat
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-07-content
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb-05-07-content-to-combat
```

## Verificação

Testes de `@huntbound/content`, `content:check`, `hunt:check`, `architecture:check` e `verify` verdes
na worktree e no resultado integrado; `hunt:extract:sidecar` em `0` sem regeneração; `biome check .`
em `0`.

## Critérios de aceite

- [ ] Vida, dano, cooldown de ataque e ritmo de passo derivam de estatística, pela conversão
      congelada.
- [ ] Nenhum número mágico novo foi introduzido.
- [ ] `intervalMs` não divisível por `50` produz diagnóstico, não arredondamento.
- [ ] As três habilidades têm `minPower`/`maxPower` inteiros iguais aos congelados na seleção.
- [ ] As tabelas de loot preservam chance e contagem, com `itemIndex` estável e `itemKeys`
      determinística.
- [ ] `itemKey` ausente produz diagnóstico único com todos os ausentes.
- [ ] Nenhum float atravessa para o cenário, provado pelo encoder canônico.
- [ ] Os quatro artefatos gerados da hunt permaneceram byte-idênticos.
- [ ] A dívida de `MAP_REGION_CONTRACT.md` está encerrada com a regra implementada.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: os `minPower`/`maxPower` calculados divergirem dos congelados em `PB-05-SELECTION.md`;
algum intervalo não dividir exatamente por `50`; a derivação exigir um dado que a seleção não
congelou; algum artefato gerado da hunt mudar; ou se resolver a fórmula exigir manter float no
cenário.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, os números derivados, comandos e exit codes, modelo e
effort usados, e a próxima task elegível.

## Commit

`feat: compose combat blueprints, abilities and loot tables from content`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb-05-07-content-to-combat`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-07-content`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, tabela dos números derivados (vida, dano, cooldowns, ritmo, poderes de
habilidade), prova de que os artefatos da hunt não mudaram, integração, limpeza, desvios e próxima
task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol xhigh ou Grok 4.6 xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-07-traduzir-conteudo-em-combate.md

Leia AGENTS.md, o STATE.md do playbook PB-05, docs/content/PB-05-SELECTION.md e apenas os arquivos
indicados pela task. Confirme que PB-05-02, PB-05-03 e PB-05-04 estao done e integradas.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-07-content com a branch
codex/pb-05-07-content-to-combat e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Faca buildHuntScenario compor o combate a partir do catalogo: vida, dano,
attackCooldownTicks e stepCooldownTicks derivados de estatistica pela conversao ja congelada na
selecao; habilidades derivadas das tres spells com a ficha; tabelas de loot derivadas do loot curado,
com itemIndex estavel e uma tabela itemKeys deterministica. Resolva TODA formula float em inteiro
aqui: nenhum float pode atravessar para o cenario.

Compare os minPower/maxPower que voce calcular com os congelados em PB-05-SELECTION.md. Se
divergirem, PARE e investigue qual dos dois esta errado — nao ajuste por conveniencia.

NAO reextraia a regiao. Os quatro artefatos gerados da hunt precisam permanecer byte-identicos; prove
com git status no diretorio e com hunt:extract:sidecar em 0.

Encerre a divida de docs/content/MAP_REGION_CONTRACT.md sobre derivar cooldown de estatistica.

Rode biome check ., os testes de content, typecheck, content:check, hunt:check, architecture:check e
verify. Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe worktree e
branch removendo o diretorio antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
