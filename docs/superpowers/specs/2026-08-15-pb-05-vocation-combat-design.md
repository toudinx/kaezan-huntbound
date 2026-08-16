# PB-05 — Vocação Knight e combate Canary

**Data:** 2026-08-15
**Status:** design aprovado para documentação
**Escopo:** primeira regra de combate do projeto — ataque, spells, morte e loot
**Depende de:** PB-04 fechado por auditoria aprovada
**Bloqueia:** PB-06 e playbooks posteriores

## Contexto

PB-04 entregou navegação: o jogador anda em oito direções, colide com parede e criatura, desce e
sobe entre andares e vê rotworms nascendo pela tabela de spawn — e proibiu explicitamente qualquer
regra de combate. O resultado é uma hunt tecnicamente completa e ludicamente vazia: não existe forma
de matar nada nem de morrer.

PB-05 fecha essa lacuna e transforma a mesma hunt em caçada. Todo o insumo já está curado:

| Insumo | Onde | Valor relevante |
|---|---|---|
| Vocação Knight | `packages/content/src/generated/pb-01-contract-coverage.json` | `attackSpeedMs 2000`, `baseSpeed 110`, `gainHp 15`, `gainMana 5`, `manaMultiplier 3` |
| Spell Berserk | mesmo bundle | `exori`, level `35`, mana `115`, área quadrada raio `1`, fórmula `skillAttack` |
| Rotworm | mesmo bundle | `health 65`, `speed 58`, melee físico `0–40` a cada `2000 ms`, `8` entradas de loot, resistências zeradas |
| Hunt jogável | `packages/content/src/generated/hunts/venore-rotworm-cave/` | `8` grupos de spawn, `maxLiveActors 12`, `playerStart (21,7,8)` |

Existe ainda uma dívida nomeada por PB-04 que pertence a este playbook:
`docs/content/MAP_REGION_CONTRACT.md` — *"Derivar cooldown de estatística de criatura é trabalho de
PB-05"*. Hoje os blueprints são fixos: `player` inert `10` ticks, `rotworm` wander `20`.

## Objetivos

1. Dar ao kernel combate determinístico: golpe, conjuração, dano, cura, cooldown, morte e loot.
2. Manter o kernel agnóstico de conteúdo e inteiro puro, com toda fórmula Canary resolvida antes de
   entrar nele.
3. Fazer criaturas caçarem: agressão por raio, perseguição gulosa e golpe ao ficar adjacente.
4. Entregar loot automático, sem comando de coleta e sem estado novo no snapshot.
5. Preservar byte a byte os goldens de PB-03 e PB-04 através do bump de schema.
6. Derivar ritmo de passo e de ataque de estatística de criatura, pagando a dívida do PB-04.

## Fora de escopo

- save, IndexedDB, inventário persistido e bolsa entre runs — PB-06;
- outras vocações, segunda hunt e troca de hunt em runtime;
- pathfinding, line of sight, projétil do jogador e área de efeito não quadrada;
- fuga em vida baixa, condições, veneno e summons;
- outfit composto, gacha e helper — PB-07 a PB-09;
- orçamento completo de performance — PB-10;
- reextrair a região: `hunt.json`, `region.json`, `spawns.json` e `transitions.json` permanecem
  byte-idênticos.

## Direção escolhida

### 1. A fórmula é resolvida fora do kernel

Toda fórmula Canary tem float: `manaMultiplier 3`, `levelFactor 0.2`, `minSkillAttackFactor 0.5`,
`finalMultiplier 1.1`. O contrato do kernel proíbe float no estado serializado, e o encoder canônico
recusa número não inteiro com `SIM_STATE_NOT_INTEGER`.

A regra congelada: **`@huntbound/content` resolve a fórmula na construção do cenário e entrega ao
kernel apenas `min` e `max` inteiros.** O kernel sorteia uniformemente entre eles e nada mais sabe. É
o mesmo padrão que o catálogo PB-01 já usa em `chanceBasisPoints` e `chancePerHundredThousand`.

Consequência: mudar a ficha do personagem muda o cenário, não o kernel; e a mesma regra de combate
serve qualquer vocação futura sem tocar em `packages/simulation`.

### 2. Identidade de item e de spell não entra no kernel

`itemKey` nunca cruza a fronteira. O cenário declara `lootTables` com `itemIndex` inteiro, e a
tradução para `item:tibia:*` fica no conteúdo, junto da tabela ordenada `itemKeys` devolvida por
`buildHuntScenario`. A proibição executável em `packages/simulation/src/**` — hoje `serverId`,
`clientId`, `lookType`, `huntId`, `regionId` — ganha `itemKey` e `spellKey`.

### 3. A região não é reextraída

`buildHuntScenario` compõe o combate a partir do catálogo no momento de construir o cenário: HP,
dano, cooldown, tabela de loot e promoção de `wander` para `hunter` saem de `CreatureDefinition`, e
as habilidades saem de `SpellDefinition` com a ficha congelada.

Isso mantém `HuntDefinition` inalterada e os quatro artefatos gerados da hunt byte-idênticos, o que
elimina qualquer risco de mexer na extração congelada por PB-04. O `hunt:extract:sidecar` continua
verde sem regeneração.

### 4. Autoloot: o corpo é decoração

- A morte **rola o loot dentro do kernel**, porque é aleatoriedade determinística e precisa entrar no
  replay. O evento `loot/granted` nomeia o matador como destinatário.
- **Não existe comando de coleta e não existe bolsa no snapshot.** A bolsa da run é uma projeção
  sobre os eventos, fora do kernel, da mesma natureza que o view model do DOM. O snapshot não cresce,
  a varredura de fronteiras não ganha campo novo, e PB-06 persiste a projeção sem tocar em regra.
- **Corpo e sangue são apresentação pura**, ancorados na posição de `actor/died`, com TTL visual, sem
  estado no kernel e sem bloquear tile. Com autoloot o corpo não guarda nada; serializá-lo custaria
  prova de retomada e não compraria comportamento.
- Consequência aceita: corpo, sangue e o arco de autoloot não são provados pelo golden do replay, e
  sim por teste de apresentação e screenshot — exatamente como `ActorMotion` e `CameraFraming` hoje.
- Gancho futuro: corpo saqueável ou que bloqueia passagem exige promovê-lo a estado do kernel. É
  mudança contida e local, a ser feita quando alguém precisar dela — não agora.

### 5. `hunter` agora, fuga adiada com motivo

`ActorBehavior` ganha `hunter`: dentro do raio de agressão o ator escolhe alvo, dá **um passo guloso**
na direção dele e golpeia ao ficar adjacente. Sem pathfinding, sem contornar parede, sem line of
sight.

Fuga em vida baixa **não** entra. `packages/content/src/importers/canary/lua/parseMonsterLua.ts` não
captura `runOnHealth`, então o limiar teria que ser inventado — e inventar contradiz a regra de usar
apenas conteúdo presente no snapshot congelado. Fica registrado como gancho, junto da extensão de
importer que ele exigiria.

### 6. A ficha do personagem é conteúdo congelado

Sem save no V0, a ficha não é estado persistido: é um documento versionado e validado por schema com
vocação, level, skills, arma e vida/mana máximas.

**Acesso a spell no V0:** `spell.level` no Lua do snapshot é provenance. Huntbound **não** aplica
esse número como gate — as três spells do kit estão disponíveis desde o início da run. Castar é
mecânica do jogo; o mínimo de level existe no Tibia porque ele é um MMORPG com progressão.

**Ficha congelada em PB-05-01:** level `8` (recomendado da hunt), HP Canary `185`, mana loadout
`185` (soma dos três custos: `115+40+30`). A ficha **não** nasce em `35` por causa do Berserk.
Canary no level `8` tem `35` de mana e não pagaria Berserk; sem leveling no V0, o pool é loadout,
não `manamax` de MMORPG. PB-05-02 e PB-05-07 não recusam conjuração por `spell.level`.

## Parâmetros congelados

| Parâmetro | Valor |
|---|---|
| `SIMULATION_SCHEMA_VERSION` | `3` → `4` |
| `SIMULATION_RULES_VERSION` | `2` → `3` |
| Streams RNG | `ai`, `combat`, `loot`, `movement`, `scenario`, `spawn` |
| Fixture da sessão | `pb-05-hunt-combat`, seed `2c3d4e5f60718293`, `900` ticks |
| Retomada | varredura de **todas** as fronteiras `0..900` |
| Spells | `spell:tibia:berserk`, `exori ico`, `exura ico` |
| Alcance de golpe | Chebyshev `1`, mesmo andar |
| Agressão | raio Chebyshev do blueprint, mesmo andar, sem line of sight |
| Dano e cura | inteiro uniforme em `[min, max]` por um `nextBelow(max - min + 1)` do stream `combat` |
| Loot | um `nextBelow(100000)` por entrada na ordem declarada; contagem só quando a entrada cai |
| Mitigação | nenhuma: sem armadura, sem resistência, sem bloqueio |
| Conversão de intervalo | `intervalMs / TICK_DURATION_MS`; não divisível é erro |

Dois streams novos em vez de um: separar `combat` de `loot` impede que alterar uma tabela de loot
desloque as rolagens de dano. A derivação por hash do rótulo já foi provada não deslocante quando
`spawn` entrou — ver `docs/simulation/KERNEL_CONTRACT.md`, seção "Aleatoriedade". A mesma prova é
obrigatória aqui para `combat` e `loot`.

**Mitigação zero é decisão, não esquecimento:** todas as resistências do Rotworm são `0` no snapshot,
então armadura e resistência não teriam o que exercitar nesta hunt. Introduzi-las sem conteúdo que as
use seria antecipar sistema sem fonte.

## Contratos v4

### Blueprint

```ts
export type ActorBehavior = 'inert' | 'wander' | 'hunter';

export interface ActorBlueprint {
  readonly blueprintId: string;
  readonly stepCooldownTicks: number;
  readonly behavior: ActorBehavior;
  readonly factionId: number;
  readonly maxHealth: number;
  readonly maxResource: number;
  readonly healthRegenTicks: number;
  readonly healthRegenAmount: number;
  readonly resourceRegenTicks: number;
  readonly resourceRegenAmount: number;
  readonly attackCooldownTicks: number;
  readonly attackMinDamage: number;
  readonly attackMaxDamage: number;
  readonly aggroRadius: number;
  readonly lootTableIndex: number | null;
  readonly abilityIndices: readonly number[];
}
```

Todos os campos são obrigatórios. Um ator sem combate declara valores neutros: `attackMinDamage 0`,
`attackMaxDamage 0`, `aggroRadius 0`, `lootTableIndex null`, `abilityIndices []`, regeneração `0`.
Campo obrigatório com valor neutro é mais simples de validar do que campo opcional, e é o que permite
migrar os fixtures de PB-03 e PB-04 sem mudar comportamento.

`factionId` é inteiro não negativo. **Dano só atravessa facções diferentes**; ator não fere aliado
nem a si mesmo por golpe. Cura só atinge a mesma facção.

### Habilidade

```ts
export interface AbilityDefinition {
  readonly abilityId: string;
  readonly effect: 'damage' | 'heal';
  readonly shape: 'self' | 'target' | 'area';
  readonly radius: number;
  readonly rangeTiles: number;
  readonly resourceCost: number;
  readonly cooldownTicks: number;
  readonly groupCooldownTicks: number;
  readonly minPower: number;
  readonly maxPower: number;
}
```

`abilityId` é kebab-case e único, no mesmo espírito de `blueprintId`. `radius` é `0` fora de `area`;
`rangeTiles` é `0` fora de `target`. `area` é quadrada e centrada no conjurador — a única forma que o
catálogo declara hoje.

### Tabela de loot

```ts
export interface LootEntryDefinition {
  readonly itemIndex: number;
  readonly chancePerHundredThousand: number;
  readonly minCount: number;
  readonly maxCount: number;
}

export interface LootTableDefinition {
  readonly entries: readonly LootEntryDefinition[];
}
```

`KernelScenario` v4 acrescenta `abilities` e `lootTables` ao documento v3. Documento v3 é reprovado
pelo schema estrito, sem compatibilidade — mesma política do salto v2 → v3.

### Estado do ator

`ActorState` ganha:

```ts
readonly health: number;
readonly resource: number;
readonly targetEntityId: EntityId | null;
readonly attackReadyAtTick: number;
readonly groupReadyAtTick: number;
readonly abilityCooldowns: readonly {
  readonly abilityIndex: number;
  readonly readyAtTick: number;
}[];
readonly nextHealthRegenTick: number;
readonly nextResourceRegenTick: number;
```

`abilityCooldowns` é ordenada estritamente por `abilityIndex`, sem duplicata, e só contém índices
declarados no blueprint. Todos os campos são inteiros seguros; `targetEntityId` é `null` ou um
`EntityId` de ator vivo do snapshot.

### Intents internas ganham espécie

`PendingIntentState` deixa de ser só passo:

```ts
export type PendingIntentState =
  | { readonly kind: 'move'; readonly tick: TickIndex; readonly entityId: EntityId; readonly direction: Direction }
  | { readonly kind: 'attack'; readonly tick: TickIndex; readonly entityId: EntityId; readonly targetEntityId: EntityId };
```

A unicidade continua sendo `(tick, entityId)`: a IA decide **uma** ação por ator por tick, então a
chave permanece total e nenhum contador de inserção precisa ser serializado. A ordem canônica da
coleção é `(tick, entityId)`.

### Comandos

| Tipo | Payload | Emissor | Prioridade |
|---|---|---|---:|
| `scenario/spawn-actor` | `blueprintId`, `position`, `facing` | `scenario` | 0 |
| `scenario/despawn-actor` | `entityId` | `scenario` | 0 |
| `actor/face` | `entityId`, `direction` | `player`, `ai` | 1 |
| `actor/move-step` | `entityId`, `direction` | `player`, `ai` | 2 |
| `actor/attack` | `entityId`, `targetEntityId` | `player`, `ai` | 3 |
| `actor/cast-ability` | `entityId`, `abilityIndex`, `targetEntityId \| null` | `player`, `ai` | 4 |
| `actor/wait` | `entityId` | `player`, `ai` | 5 |

A duplicata de borda passa a cobrir quatro ações concorrentes: `actor/move-step`, `actor/attack`,
`actor/cast-ability` e `actor/wait`. O mesmo emissor, ator e tick com duas delas recebe
`SIM_COMMAND_DUPLICATE` na segunda. `actor/face` continua não conflitando. **Uma ação por ator por
tick** é a mesma disciplina que PB-04-FIX-02 impôs ao input.

### Eventos

| Tipo | Payload |
|---|---|
| `combat/attacked` | `entityId`, `targetEntityId` |
| `combat/damaged` | `entityId`, `sourceEntityId`, `amount`, `remainingHealth`, `cause` |
| `combat/healed` | `entityId`, `sourceEntityId`, `amount`, `health` |
| `ability/cast` | `entityId`, `abilityIndex`, `targetEntityId` |
| `combat/target-changed` | `entityId`, `targetEntityId` |
| `actor/died` | `entityId`, `killerEntityId`, `position` |
| `loot/granted` | `entityId`, `sourceEntityId`, `itemIndex`, `count` |

`cause` é `'attack'` ou `'ability'`. `actor/died` carrega `position` porque é ela que ancora corpo,
sangue e o arco de autoloot na apresentação — sem isso o renderer teria que rastrear estado do kernel.
`killerEntityId` é `null` quando não há matador identificável.

Recusas continuam saindo por `command/rejected`, com códigos novos: `SIM_TARGET_UNKNOWN`,
`SIM_TARGET_SAME_FACTION`, `SIM_ATTACK_OUT_OF_RANGE`, `SIM_ATTACK_ON_COOLDOWN`,
`SIM_ABILITY_UNKNOWN`, `SIM_ABILITY_ON_COOLDOWN`, `SIM_ABILITY_NO_RESOURCE`,
`SIM_ABILITY_OUT_OF_RANGE`.

## Fases do tick

```text
1. intake    comandos externos do tick + intents internas decididas antes
2. apply     validação e mutação por comando, na ordem (prioridade, sequence)
3. systems   S1 lifecycle -> S2 movement -> S3 upkeep -> S4 combat
                          -> S5 death e loot -> S6 ai -> S7 spawn
4. flush     journal fechado e devolvido; currentTick += 1
```

Cada sistema tem uma única responsabilidade, e a ordem é justificada:

- **S3 upkeep** aplica regeneração de vida e mana antes de qualquer gasto do tick, de forma que o
  recurso regenerado já pode custear uma conjuração do mesmo tick. É puramente aritmético e não
  consome aleatoriedade.
- **S4 combat** resolve golpes e conjurações **depois** do movimento, para que a adjacência avaliada
  seja a do fim do passo, e não a do começo do tick.
- **S5 death e loot** remove quem chegou a `health <= 0`, emite `actor/died` e em seguida os
  `loot/granted` daquela morte. Vir antes de `S6` impede a IA de mirar um morto; vir antes de `S7`
  libera célula e assento de spawn no mesmo tick, exatamente como o despawn já fazia.
- **S6 ai** decide para `currentTick + 1`, como em PB-03.
- **S7 spawn** continua por último, pelas duas razões já congeladas em PB-04.

### Regra de morte

`health <= 0` no início de `S5` remove o ator, emite `actor/died` e libera o assento de spawn com
`readyAtTick = tickDaMorte + respawnTicks`, reaproveitando o caminho que `scenario/despawn-actor` já
usa. `EntityId` nunca é reaproveitado. Um ator sem assento — o jogador — apenas sai do mundo; **o
kernel não tem respawn de jogador**, e o que fazer depois disso é decisão da apresentação.

### Regra de loot

Para o ator morto com `lootTableIndex` não nulo, na ordem declarada das entradas:

1. um `nextBelow(100000)` do stream `loot`; a entrada cai quando o valor sorteado é menor que
   `chancePerHundredThousand`;
2. quando cai e `minCount < maxCount`, um `nextBelow(maxCount - minCount + 1)` do mesmo stream define
   a contagem; quando `minCount == maxCount`, **nenhum sorteio é consumido**;
3. cada entrada que cai emite um `loot/granted` para o matador.

Sem matador identificável, o loot **não é rolado** e nenhum sorteio é consumido — o que mantém o
stream auditável pelo `drawCount`.

### Regra de IA `hunter`

Para cada ator `hunter` fora de cooldown, em ordem crescente de `EntityId`:

1. **manutenção de alvo:** o alvo atual é descartado se morreu, mudou de andar ou saiu do raio de
   agressão. Mudança de alvo emite `combat/target-changed`.
2. **aquisição:** sem alvo, escolhe o ator vivo de facção diferente, no mesmo andar, dentro do raio,
   com menor distância Chebyshev; empate resolve pelo menor `EntityId`. Nenhuma aleatoriedade é
   consumida.
3. **ação:** alvo adjacente enfileira intent interna de ataque para `currentTick + 1`; alvo distante
   enfileira intent de passo guloso, com a direção dada pelo sinal de `dx` e `dy` na ordem canônica
   de direções.
4. **sem alvo:** o ator cai no comportamento `wander` e consome exatamente um `nextBelow(8)` do
   stream `ai`, como em PB-03.

O item 4 é o que preserva os goldens: um cenário sem `hunter` consome o stream `ai` exatamente como
antes, e nenhum ator `inert` ou `wander` muda de consumo.

## Regressão obrigatória

O bump `3 → 4` é de formato e capacidade, nunca de regra existente. Prova, no mesmo commit que sobe o
schema:

- `packages/test-fixtures/simulation/pb03/events.golden.jsonl` permanece byte-idêntico, com hash
  `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4`;
- os journals golden das duas fixtures de hunt do PB-04 permanecem byte-idênticos;
- os vetores golden de `ai`, `movement`, `scenario` e `spawn` são idênticos aos registrados, e
  `combat` e `loot` recebem vetores golden novos.

Os `snapshot.golden.json` **vão** mudar, porque ganham os campos de combate. Isso é esperado; os
journals, não. Journal diferente significa regra diferente: **pare e reporte**, nunca regenere para
fazer passar.

## Gates

Além dos gates existentes, PB-05 acrescenta `combat:check` a `check` e a `verify`, no mesmo formato de
`hunt:check`, verificando a fixture `pb-05-hunt-combat` contra snapshot e journal golden.

A fixture nova é registrada em `docs/simulation/REPLAY_CONTRACT.md` **no mesmo commit que a cria** —
foi exatamente a ausência desse registro para o PB-04 que virou o defeito D3 da auditoria PB-04-10.

## Lições do PB-04 que viram critério de aceite

| Defeito | Obrigação em PB-05 |
|---|---|
| D1 — teste instável mascarado por `retries: 1` | toda spec Playwright nova é provada com `--retries=0 --repeat-each=10` |
| D2 — hash publicado que não existe na árvore | todo SHA-256 citado é gerado do artefato real e verificável |
| D3 — fixture fora de `REPLAY_CONTRACT.md` | registro no mesmo commit que cria a fixture |
| D4 — `biome check` vermelho passando pelo `verify` | `biome check .` roda explicitamente em toda task |

## Critérios de aceite do design

- [ ] O kernel resolve combate sem conhecer item, spell, vocação ou identidade Tibia.
- [ ] Nenhum float entra no estado serializado.
- [ ] Autoloot funciona sem comando de coleta e sem campo novo no snapshot.
- [ ] Criaturas agridem, perseguem e golpeiam; nenhuma foge.
- [ ] O jogador morre e a apresentação decide o que fazer; o kernel não respawna jogador.
- [ ] Os journals golden de PB-03 e PB-04 sobrevivem byte-idênticos.
- [ ] A região extraída não é regenerada.
- [ ] `combat:check` entra em `check` e `verify` e está registrado no contrato de replay.
