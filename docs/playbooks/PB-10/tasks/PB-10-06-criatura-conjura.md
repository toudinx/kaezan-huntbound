# PB-10-06 — Criatura conjura

**Status inicial:** pending

**Classe da tarefa:** **implementação complexa** — kernel e IA. Toca o laço determinístico, o stream
de RNG e a tradução de catálogo para blueprint.

**Modelo sugerido:** camada frontier — **GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6** —, effort `xhigh`.
Pela `docs/08_POLITICA_MODELOS_AGENTES.md`, kernel é frontier. Um erro aqui não aparece como exceção:
aparece como golden diferente três tasks depois.

**Validador sugerido:** modelo frontier **diferente** do implementador.

**Rota:** **sem skill externa.** Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** **pode rodar em paralelo com a PB-10-05.** A 06 vive no kernel e em
`buildHuntScenario`; a 05 vive em `apps/game`. Não se cruzam.

**Spec:** `docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`, decisão 6 e a tabela
de portões da decisão 7. Escada: `docs/content/HUNT_BANDS.md`, Seção 5.

## Objetivo

Fazer uma criatura **gastar um ciclo em algo que não é o auto-attack**: lançar habilidade à distância,
área, e curar a si mesma. É o portão da faixa 2 (Orc Fortress), e a única peça de kernel que o MVP
deste playbook exige.

A hunt em si **não entra aqui** — Orc Fortress é task de conteúdo, 07 em diante. Esta task entrega a
capacidade e prova ela com o que já existe no catálogo.

## O que já existe, e é mais do que parece

Verificado no workspace em 2026-08-26. A maquinaria de habilidade está **completa e genérica**; o que
falta é quem puxe o gatilho.

| Peça | Estado |
|---|---|
| `AbilityDefinition` | completo: `shape` (`'self' \| 'target' \| 'area'`), `radius`, `rangeTiles`, `cooldownTicks`, `minPower`/`maxPower`, `element` — `packages/contracts/src/simulation/types.ts:102` |
| Execução | `castAbility` é genérica e não pergunta quem é o dono — `packages/simulation/src/kernel/combat.ts:682`, via `abilityOf` em `:544` |
| `attackRangeTiles` | já decide sight de ranged em `packages/simulation/src/kernel/kernel.ts:249`, e **nenhuma criatura usa** |
| Stream de RNG da IA | `streams.ai` já existe e já é usado para wander em `kernel.ts:345` |
| Dados do shaman | **já no catálogo gerado**: melee 0–15; ranged energia 20–31, `rangeTiles` 7, `chanceBasisPoints` 1500; área fogo 5–43, `radiusTiles` 1, `chanceBasisPoints` 500; e `defenses` com `kind: 'heal'`, 27–43, `chanceBasisPoints` 6000, `intervalMs` 2000 |

O buraco é um só, e tem endereço:

- `packages/content/src/hunts/buildHuntScenario.ts:315` dá `abilityIndices: []` a **toda** criatura;
- `packages/simulation/src/kernel/kernel.ts:384` monta os intents internos da IA a partir de `move` e
  `attack` apenas. **`cast` nunca é emitido pela IA** — só por comando do jogador.

## A decisão que salva os goldens

Esta é a parte cara de errar, e ela tem resposta verificada.

O `README` previa que esta task regenera golden. **Ela não precisa**, se o gatilho for guardado
corretamente. Conferido nos dois fixtures:

| Fixture | Criaturas | `abilityIndices` |
|---|---|---|
| `packages/test-fixtures/hunt/pb04` | rotworm, `hunter` | `[]` |
| `packages/test-fixtures/hunt/pb05` | rotworm, `hunter` | `[]` |
| `pb05`, ator do jogador | `player`, `inert` | `[0..8]`, dirigido por comando |

Ou seja: **nenhum ator dirigido por IA tem habilidade em nenhum golden existente.** Se a IA só
consultar habilidade quando `abilityIndices.length > 0`, nada muda para eles.

**O guard é obrigatório, e o motivo é o RNG.** `streams.ai` é um stream seedado e ordenado: qualquer
sorteio a mais consome um valor e **desloca todas as direções de wander seguintes**. Uma rolagem de
habilidade feita incondicionalmente — mesmo devolvendo "não lança" para um rotworm sem habilidade —
muda a caminhada de toda criatura do `pb04` e reprova o golden sem que nenhum comportamento novo
tenha sido pedido. Rolar **só** quando o ator tem habilidade mantém o stream idêntico.

Então o critério de aceite é: `hunt:check`, `combat:check` e `simulation:check` **verdes sem
regenerar nada**. Se um golden mudar, isso é uma mudança de comportamento que você precisa provar
intencional por escrito antes de regenerar — é regra inviolável do `AGENTS.md`, não preferência.

## O que a IA passa a fazer

Traduza o que o catálogo já declara, e nada além:

| Fonte no catálogo | Vira |
|---|---|
| ataque `kind: 'ranged'` com `rangeTiles` | habilidade `shape: 'target'`, `rangeTiles` do arquivo |
| ataque `kind: 'area'` com `radiusTiles` | habilidade `shape: 'area'`, `radius` do arquivo |
| defesa `kind: 'heal'` | habilidade `shape: 'self'`, cura, `minAmount`/`maxAmount` do arquivo |
| `chanceBasisPoints` | a chance por ciclo |
| `intervalMs` | o cooldown, em ticks de 50 ms |

`intervalMs` tem que dividir por 50 exatamente — `ticksFromIntervalMs` já devolve `null` quando não
divide, e o diagnóstico `HUNT_INTERVAL_NOT_DIVISIBLE` já existe para isso. Não arredonde.

**Nenhum número novo é inventado.** Se o valor não está no catálogo, ele não entra. É o mesmo
princípio da PB-10-04, um andar abaixo.

## Fora de escopo — os portões que **não** abrem aqui

Isto é metade do valor do card. `HUNT_BANDS.md` Seção 5 nomeia cada um, com o degrau que espera:

- **Invocação.** O orc shaman **declara `summons` de Snake**, chance 2000 basis points, count 3, e
  está no catálogo gerado. **Não implemente.** É o portão das faixas 10–11 (Roshamuul, livrarias). A
  faixa 2 consome energia à distância e autocura, não invocação.
- **Onda com forma.** `length`/`spread` do Canary não existem em `AbilityShape` e não rotacionam com
  o facing. Faixa 9.
- **Mitigação elemental.** `resistances` e `immunities` estão em `ActorBlueprint` e **não são lidos
  em nenhum arquivo** do kernel. `attackElement` já entra no dano de saída, e é assim que fica: dano
  elemental entra cheio, mitigação é PB-11 (decisão congelada 8).
- **Paralisia e qualquer condição que trave o jogador.** Faixa 8.
- **Armor e shielding.** No Lua, zero no kernel. Faixa 16.
- **A hunt Orc Fortress.** Conteúdo, 07 em diante.

Implementar qualquer um destes por conta própria transforma uma task de kernel numa task de kernel
mais quatro — e produz comportamento que nenhuma hunt do MVP pede.

## Como provar sem conteúdo novo

**O orc shaman já está no catálogo gerado** (`packages/content/src/generated/pb-01-contract-coverage.json`,
uma das quatro criaturas da seleção PB-01). Você não precisa importar espécie nem escrever hunt para
testar: monte um cenário de teste com ele e prove os três comportamentos — projétil a 7 tiles, área de
raio 1, e a barra de vida subindo sozinha.

Isso mantém a task dentro da própria fronteira: kernel e IA, sem conteúdo.

## Determinismo, que aqui não é detalhe

`packages/simulation` não conhece `Date.now()`, `Math.random()`, DOM, Phaser, `node:*` nem I/O. Tick
fixo, RNG seedado, grid inteiro, eventos ordenados. Uma escolha de habilidade que dependa de ordem de
`Map`, de iteração de `Set` ou de qualquer coisa não ordenada passa no teste e diverge no replay.

Ordem de avaliação entre atores, escolha de alvo e desempate precisam ser explícitas e estáveis.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-10/README.md` e o `STATE.md`;
3. a spec, decisões 6, 7 e 8;
4. `docs/content/HUNT_BANDS.md`, Faixa 2 e Seção 5;
5. `docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`;
6. `packages/simulation/src/kernel/combat.ts`, `castAbility` e `abilityOf`;
7. `packages/simulation/src/kernel/kernel.ts`, montagem de intents (`:384`) e wander (`:345`);
8. `packages/content/src/hunts/buildHuntScenario.ts`, `composeCreature` e `composeAbilities`;
9. `packages/simulation/src/random/streams.ts`;
10. `.cursor/rules/10-boundaries.mdc`.

## Passos

1. Rode `hunt:check`, `combat:check` e `simulation:check` **antes de editar**: é a linha de base.
2. Escreva o teste primeiro, com um cenário de orc shaman: ranged, área e autocura.
3. Traduza ataques e defesas do catálogo em `AbilityDefinition` e preencha `abilityIndices`.
4. Emita `cast` na IA, **guardado em `abilityIndices.length > 0`**, com ordem determinística.
5. Prove que os três goldens continuam verdes sem regenerar.
6. Atualize a linha PB-10-06 do `STATE.md`.

## Verificações exigidas

Com saída fresca colada no relatório:

- `corepack pnpm verify` — verde;
- `corepack pnpm simulation:check`, `hunt:check` e `combat:check` — verdes **sem golden regenerado**;
- `git status --porcelain packages/test-fixtures` — **vazio**;
- `corepack pnpm architecture:check` — a simulação não pode ganhar dependência externa;
- **prova de comportamento**: o teste do orc shaman mostrando os três — projétil a 7 tiles, área de
  raio 1, autocura.

## Risco conhecido

**O sorteio a mais no `streams.ai`.** É o modo de falhar desta task e ele é traiçoeiro: o código fica
certo, o comportamento novo funciona, e o `pb04` reprova porque um rotworm virou para o outro lado.
Se um golden mudar, **a primeira hipótese é o stream, não o combate** — conte os saques antes de
investigar dano.

O segundo é mais tentador que difícil: **implementar o `summon` do shaman porque o dado está ali**.
Ele está, e é o portão da faixa 10. Deixe passar.

## Definition of Done

- [ ] Criatura com `abilityIndices` lança à distância, em área, e cura a si mesma.
- [ ] Todos os valores saem do catálogo; nenhum número inventado.
- [ ] `cast` da IA guardado em `abilityIndices.length > 0`.
- [ ] `simulation:check`, `hunt:check` e `combat:check` verdes **sem regenerar golden**, e
      `packages/test-fixtures` sem diff.
- [ ] Ordem de avaliação, alvo e desempate determinísticas e testadas.
- [ ] `summons`, onda com forma, mitigação elemental, paralisia e armor **não** implementados.
- [ ] Nenhuma hunt nova; `apps/game` não tocado.
- [ ] `verify` verde e branch integrada por `git merge --ff-only`.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-10\tasks\PB-10-06-criatura-conjura.md

Leia AGENTS.md, .cursor/rules/10-boundaries.mdc, docs/playbooks/PB-10/README.md, o STATE.md, a spec
docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md (decisoes 6, 7 e 8),
docs/content/HUNT_BANDS.md (Faixa 2 e Secao 5), docs/simulation/KERNEL_CONTRACT.md e
docs/simulation/REPLAY_CONTRACT.md.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb10-06-conjura com a branch
<agente>/pb10-06-criatura-conjura e rode "corepack pnpm install --prefer-offline" dentro dela.

Esta task PODE rodar em paralelo com a PB-10-05: a 06 vive no kernel, a 05 em apps/game.

OBJETIVO: fazer uma criatura GASTAR UM CICLO EM ALGO QUE NAO E O AUTO-ATTACK — lancar a distancia, em
area, e curar a si mesma. E o portao da faixa 2. A HUNT ORC FORTRESS NAO ENTRA AQUI (e 07+).

JA EXISTE, E E MAIS DO QUE PARECE: AbilityDefinition esta completo em
packages/contracts/src/simulation/types.ts:102 (shape 'self'|'target'|'area', radius, rangeTiles,
cooldownTicks, minPower/maxPower, element); castAbility JA E GENERICA e nao pergunta quem e o dono
(packages/simulation/src/kernel/combat.ts:682, via abilityOf em :544); attackRangeTiles ja decide
sight em kernel.ts:249 e nenhuma criatura usa; streams.ai ja existe (kernel.ts:345).

O BURACO E UM SO: buildHuntScenario.ts:315 da abilityIndices: [] a TODA criatura, e kernel.ts:384
monta os intents da IA so com move e attack — 'cast' NUNCA e emitido pela IA, so por comando do
jogador.

A DECISAO QUE SALVA OS GOLDENS — o README previa que esta task regenera golden; ELA NAO PRECISA.
Conferido: em pb04 e pb05 o rotworm tem abilityIndices [] e e 'hunter'; o unico ator com habilidades
e o player, que e 'inert' e dirigido por comando. NENHUM ATOR DIRIGIDO POR IA TEM HABILIDADE EM
GOLDEN NENHUM.

O GUARD E OBRIGATORIO E O MOTIVO E O RNG: streams.ai e seedado e ordenado, e QUALQUER SORTEIO A MAIS
CONSOME UM VALOR E DESLOCA TODAS AS DIRECOES DE WANDER SEGUINTES. Uma rolagem feita
incondicionalmente — mesmo devolvendo "nao lanca" para um rotworm sem habilidade — muda a caminhada
de toda criatura do pb04 e reprova o golden sem comportamento novo nenhum. ROLE SO QUANDO
abilityIndices.length > 0.

CRITERIO DE ACEITE: hunt:check, combat:check e simulation:check VERDES SEM REGENERAR NADA, e
git status --porcelain packages/test-fixtures VAZIO. Se um golden mudar, prove por escrito que e
intencional ANTES de regenerar — golden nao se reescreve para passar.

TRADUZA SO O QUE O CATALOGO DECLARA: ataque kind 'ranged' com rangeTiles -> shape 'target'; ataque
kind 'area' com radiusTiles -> shape 'area'; defesa kind 'heal' -> shape 'self'; chanceBasisPoints ->
chance por ciclo; intervalMs -> cooldown em ticks de 50 ms. intervalMs TEM que dividir por 50 exato —
ticksFromIntervalMs ja devolve null e HUNT_INTERVAL_NOT_DIVISIBLE ja existe. NAO ARREDONDE. NENHUM
NUMERO NOVO E INVENTADO.

FORA DE ESCOPO — OS PORTOES QUE NAO ABREM AQUI:
- INVOCACAO. O orc shaman DECLARA summons de Snake (2000 basis points, count 3) e o dado esta no
  catalogo. NAO IMPLEMENTE. E o portao das faixas 10-11.
- Onda com forma (length/spread): faixa 9.
- Mitigacao elemental: resistances e immunities NAO SAO LIDOS em nenhum arquivo do kernel;
  attackElement ja entra no dano de saida e FICA ASSIM. Dano elemental entra cheio, mitigacao e PB-11.
- Paralisia e qualquer condicao que trave o jogador: faixa 8.
- Armor e shielding: faixa 16.
- A hunt Orc Fortress: 07+.

COMO PROVAR SEM CONTEUDO NOVO: o ORC SHAMAN JA ESTA NO CATALOGO GERADO
(packages/content/src/generated/pb-01-contract-coverage.json, uma das quatro criaturas). Monte um
cenario de teste com ele e prove os tres comportamentos: projetil a 7 tiles, area de raio 1, e a
barra de vida subindo sozinha. Nao importe especie nem escreva hunt.

DETERMINISMO: packages/simulation nao conhece Date.now(), Math.random(), DOM, Phaser, node:* nem I/O.
Uma escolha que dependa de ordem de Map ou Set passa no teste e diverge no replay. Ordem de avaliacao
entre atores, escolha de alvo e desempate TEM que ser explicita e estavel.

RODE hunt:check, combat:check e simulation:check ANTES DE EDITAR: e a linha de base.
TESTE ANTES DA IMPLEMENTACAO.

RISCO CENTRAL: o sorteio a mais no streams.ai. O codigo fica certo, o comportamento novo funciona, e
o pb04 reprova porque um rotworm virou para o outro lado. SE UM GOLDEN MUDAR, A PRIMEIRA HIPOTESE E O
STREAM, NAO O COMBATE — conte os saques antes de investigar dano. O segundo risco e implementar o
summon porque o dado esta ali. Deixe passar.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm verify
- corepack pnpm simulation:check, hunt:check e combat:check verdes SEM golden regenerado
- git status --porcelain packages/test-fixtures (vazio)
- corepack pnpm architecture:check
- o teste do orc shaman mostrando os tres comportamentos

Ao terminar: atualize somente a linha PB-10-06 do STATE.md com o modelo e o effort EFETIVAMENTE
usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com git merge
--ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no relatorio:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
