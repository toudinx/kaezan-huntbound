# Contrato do kernel determinístico

Este documento congela a linguagem pública compartilhada por `@huntbound/contracts` e pelo kernel
headless. PB-03 entregou tick, RNG, grid de um andar, comandos, eventos, snapshot e replay; PB-04-05
acrescentou andares, transição automática e o sistema de spawn.

## Versões e tempo

| Constante | Valor |
| --- | ---: |
| `SIMULATION_SCHEMA_VERSION` | `3` |
| `SIMULATION_RULES_VERSION` | `2` |
| `TICK_DURATION_MS` | `50` |
| `MAX_FRAME_DELTA_MS` | `250` |

O kernel avança em ticks inteiros de 50 ms e nunca lê relógio. O driver externo pode acumular no
máximo 250 ms por frame, sem descartar ticks. Mudanças incompatíveis de formato exigem incremento de
`SIMULATION_SCHEMA_VERSION`; mudanças semânticas das regras exigem incremento de
`SIMULATION_RULES_VERSION`.

## Identidade e números

Os tipos `TickIndex`, `EntityId`, `Seed` e `StreamLabel` são brands TypeScript. Eles só podem ser
obtidos pelos schemas ou factories públicas depois de validação:

- `TickIndex` é inteiro seguro não negativo e aceita zero.
- `EntityId` é inteiro seguro positivo e começa em um.
- `Seed` é exatamente 16 caracteres hexadecimais minúsculos.
- `StreamLabel` é uma string kebab-case minúscula, como `movement` ou `scenario-spawn`.

Todo número nos schemas do kernel é inteiro seguro. Não existe campo float. Coordenadas têm o formato
`{ x, y, z }`, e todos os eixos são inteiros seguros.

## Cenário

`KernelScenario` v3 contém `schemaVersion`, `scenarioId`, `scenarioRevision`, `width`, `height`,
`floors`, `transitions`, `spawnGroups`, `maxLiveActors`, `blueprints` e `initialActors`. **Não há
compatibilidade com a v2:** `z` e `blockedTiles` no topo do documento foram substituídos por
`floors`, e um documento v2 é reprovado pelo schema estrito.

- `width` e `height` são positivos e valem para todos os andares.
- `floors` é não vazio e estritamente ordenado por `z` ascendente, o que também proíbe `z` repetido.
  Cada `blockedTiles` fica dentro do grid, sem duplicatas e estritamente ordenado por `(y, x)`.
  Terreno é por andar: o mesmo `(x, y)` pode ser livre em um andar e bloqueado em outro.
- `transitions` é uma lista de pares dirigidos `{ from, to }`. `from` e `to` ficam dentro do grid e
  em andares declarados, `to` não pode ser terreno bloqueado, `from` não pode repetir e não pode
  igualar `to`. A ordem da lista não é normativa, porque `from` é único e a tabela é um mapa.
- `spawnGroups` declara `{ center, radius, slots }`; cada slot é
  `{ blueprintId, position, respawnTicks }`. O centro fica dentro do grid e em andar declarado; cada
  slot referencia um blueprint existente, fica em célula livre de terreno do andar do centro e
  dentro do raio Chebyshev do grupo. Centros de grupo são únicos e dois slots do mesmo grupo não
  compartilham célula: as duas unicidades são o que torna a ordem canônica **total**.
- `maxLiveActors` é positivo e é o teto de atores vivos verificado por `S4`.
- `blueprintId` é kebab-case e único.
- `stepCooldownTicks` e `respawnTicks` são inteiros seguros não negativos.
- Cada ator inicial referencia um blueprint existente, está dentro do grid, usa um andar declarado,
  não ocupa terreno bloqueado e não compartilha célula com outro ator.
- Os schemas são estritos: campos desconhecidos são rejeitados.

### Ordem canônica de spawn

`groupIndex` e `slotIndex` **não** são o índice de declaração. O kernel ordena os grupos por
`(center.z, center.y, center.x)` e os slots de cada grupo por `(position.z, position.y, position.x)`,
e numera a partir dessa ordem. Dois documentos com a mesma composição declarada em ordens diferentes
produzem journal e snapshot idênticos.

As direções canônicas, nesta ordem, são:

`n`, `ne`, `e`, `se`, `s`, `sw`, `w`, `nw`.

Os comportamentos de blueprint são `inert` e `wander`.

## Comandos

Todo comando usa o envelope:

```ts
{
  tick: TickIndex,
  issuer: 'player' | 'ai' | 'scenario',
  command: SimulationCommand,
}
```

| Tipo | Payload | Emissor permitido | Prioridade |
| --- | --- | --- | ---: |
| `scenario/spawn-actor` | `blueprintId`, `position`, `facing` | `scenario` | 0 |
| `scenario/despawn-actor` | `entityId` | `scenario` | 0 |
| `actor/face` | `entityId`, `direction` | `player`, `ai` | 1 |
| `actor/move-step` | `entityId`, `direction` | `player`, `ai` | 2 |
| `actor/wait` | `entityId` | `player`, `ai` | 3 |

`commandPriority(type)` devolve a prioridade congelada acima. O schema valida emissor e tipo em
conjunto; uma combinação proibida produz `SIM_COMMAND_FORBIDDEN` nos diagnósticos estruturados.

`SimulationCommandRecord` adiciona `sequence`, um inteiro seguro positivo. No command log, sequences
são estritamente crescentes e ticks são não decrescentes.

## Eventos

Eventos usam o envelope `{ tick, sequence, payload }`. A sequência é um inteiro seguro positivo e é
monotônica global na execução.

| Tipo | Payload |
| --- | --- |
| `actor/spawned` | `entityId`, `blueprintId`, `position`, `facing` |
| `actor/moved` | `entityId`, `from`, `to`, `facing` |
| `actor/move-blocked` | `entityId`, `attempted`, `reason` |
| `actor/faced` | `entityId`, `facing` |
| `actor/despawned` | `entityId` |
| `actor/transitioned` | `entityId`, `from`, `to` |
| `spawn/deferred` | `groupIndex`, `slotIndex`, `reason` |
| `spawn/capped` | `groupIndex`, `slotIndex` |
| `command/rejected` | `commandType`, `commandSequence`, `code` |

As causas de bloqueio são `bounds`, `terrain`, `occupied`, `diagonal-corner`, `cooldown` e
`transition-blocked`. As razões de `spawn/deferred` são `no-free-cell` e `cap-reached`.

## Snapshot

`SimulationSnapshot` referencia `scenarioId` e `scenarioRevision`; ele não copia terreno, ocupação ou
hash do cenário. O formato contém:

```text
schemaVersion, rulesVersion, scenarioId, scenarioRevision, seed, tick,
nextEntityId, nextEventSequence, nextCommandSequence,
randomStreams, actors, pendingCommands, pendingIntents, spawnSlots
```

As coleções têm ordem canônica parte do contrato:

- `randomStreams` por `label`, sem duplicatas;
- `actors` por `entityId`, sem duplicatas;
- `pendingCommands` por `(tick, sequence)`;
- `pendingIntents` por `(tick, entityId)`, estritamente, sem duplicatas;
- `spawnSlots` por `(groupIndex, slotIndex)`, estritamente, sem duplicatas.

`RandomStreamState` guarda `label`, quatro palavras `s0`–`s3` uint32 e `drawCount` não negativo.
`ActorState` guarda `entityId`, `blueprintId`, `position`, `facing`, `readyAtTick` e
`transitionGuard`. `SpawnSlotState` guarda `groupIndex`, `slotIndex`, `readyAtTick` e `entityId`,
que é `null` quando o assento está vago. Um `entityId` de slot que não corresponda a nenhum ator do
snapshot é reprovado.

Dois atores só não podem compartilhar célula no **mesmo** andar; `(x, y)` iguais em `z` diferentes
são estado válido.

### `transitionGuard` e `spawnSlots`

São os dois campos que PB-04-05 acrescentou, e ambos são estado vivo pelo mesmo motivo que
`pendingIntents`: nenhum outro campo os reconstrói.

`transitionGuard` é `null` ou a célula em que o ator pousou por transição. Ele inibe transição
enquanto vivo — ver "Transições" — logo um snapshot sem ele retoma numa regra diferente.
`spawnSlots` carrega o cronograma de respawn; sem ele a retomada perde quem está vivo em cada
assento e quando o próximo nascimento é devido.

A checagem de que `transitionGuard` cai dentro do grid mora em `restoreSimulationKernel`, não no
schema: o snapshot não declara terreno, então só o cenário permite avaliá-la.

### `pendingIntents`

`S3 ai` decide no fim do tick `T` uma intent aplicada no tick `T + 1`. Essa fila é interna: ela não
passa pelo command log e `pendingCommands` carrega apenas comandos externos. `pendingIntents` é o
campo que a serializa, e é ele que torna `restoreSimulationKernel` fiel em **qualquer** fronteira.

`PendingIntentState` guarda exatamente `tick`, `entityId` e `direction`. `tick` é o tick de
aplicação e satisfaz `tick >= snapshot.tick`; o schema reprova `SIM_TICK_IN_PAST` caso contrário.

Não existe campo `order`, e a omissão é consequência de duas invariantes provadas em
`packages/simulation/src/kernel/ai.test.ts`:

- `S3` percorre cada ator no máximo uma vez por tick e enfileira sempre para `currentTick + 1`, logo
  dois intents internos nunca compartilham `(tick, entityId)`;
- o único empate real é entre intent externa e interna do mesmo ator, e ele é desempatado por
  `sourceRank`, com a externa primeiro — nunca pelo contador de inserção.

Por isso o contador interno `internalOrder` não precisa ser restaurado, e a chave `(tick, entityId)`
basta para ordenar a coleção de forma total.

### `snapshotKernel` e `restoreSimulationKernel`

`snapshotKernel(kernel)` lê o estado vivo do kernel e devolve o snapshot já nas ordens canônicas.
`restoreSimulationKernel(scenario, snapshot)` devolve `SimulationValidationResult<SimulationKernel>`
e recusa, antes de construir qualquer coisa, snapshot que não passe no schema, que declare
`schemaVersion`/`rulesVersion` divergente (`SIM_VERSION_MISMATCH`) ou que pertença a outro cenário ou
outra revisão (`SIM_SCENARIO_MISMATCH`).

O cenário é a autoridade sobre terreno e blueprints; o snapshot é a autoridade sobre atores, RNG,
sequências, comandos pendentes e intents internas pendentes. A ocupação é reconstruída a partir dos
atores restaurados, nunca serializada. Um kernel restaurado em tick maior que zero não reemite os
eventos de boot: ele continua o journal a partir de `nextEventSequence`.

### Fidelidade em qualquer fronteira

Retomar em **qualquer** fronteira `0..N` converge para o mesmo snapshot final e para a mesma cauda de
eventos que um run direto. A propriedade é provada por varredura, não por amostragem: o teste em
`packages/simulation/src/state/snapshot.test.ts` retoma em cada fronteira do intervalo e exige que os
eventos drenados antes do snapshot, seguidos dos eventos drenados depois dele, sejam o run inteiro.

Duas condições sustentam isso:

- as intents internas decididas viajam no snapshot em `pendingIntents`;
- os eventos de boot pertencem ao tick `0` e são emitidos **pelo tick `0`**, não pelo construtor.
  Emiti-los antes deixaria-os num journal não drenado que nenhum campo do snapshot carrega, e um
  snapshot tirado antes do primeiro tick os perderia. O predicado é `world.tick === 0`, exato porque
  o tick `0` os emite e nenhum tick posterior pode: um kernel retomado em `0` ainda os deve, um
  kernel retomado depois nunca deve.

`isKernelQuiescent` não existe mais, e `tools/replay` não recusa retomada por quiescência.

## Serialização canônica

`encodeCanonicalJson(value)` produz JSON com chaves ordenadas por code unit UTF-16, sem espaço
supérfluo e **sem newline final** — o newline pertence ao arquivo, não ao valor. Arrays preservam a
ordem. Strings são escapadas por `JSON.stringify`, o que mantém caractere não ASCII literal em UTF-8
e escapa surrogate solitário, de modo que a saída é sempre well-formed.

O encoder recusa, com `CanonicalJsonError` carregando `code` e `path`:

| Valor | Código |
|---|---|
| número não inteiro, `NaN`, `Infinity`, `-0`, inteiro não seguro | `SIM_STATE_NOT_INTEGER` |
| `undefined`, função, símbolo, `bigint`, referência cíclica | `SIM_STATE_NOT_SERIALIZABLE` |

O kernel não calcula SHA-256: `@huntbound/simulation` não importa Node nem toca Web Crypto. O digest
dos bytes canônicos é responsabilidade de `tools/replay`.

## Replay

`runReplay(scenario, log)` valida cenário e log, confere cabeçalho contra o cenário, injeta cada
comando do log na borda do kernel e avança `header.tickCount` ticks, devolvendo `{ snapshot, events }`.

O kernel atribui `sequence` no intake. Se a sequência atribuída divergir da sequência gravada no log,
o replay é recusado com `SIM_REPLAY_DIVERGED` em vez de continuar com um log que este kernel não
teria produzido.

O formato dos arquivos, os comandos da CLI, os exit codes e os hashes congelados estão em
`docs/simulation/REPLAY_CONTRACT.md`.

## Aleatoriedade

`@huntbound/simulation` tem uma única fonte de aleatoriedade: `xoshiro128**`. A transição usa quatro
palavras uint32, rotações explícitas, `>>> 0` e `Math.imul`; ela não usa `Math.random`, `BigInt`,
`crypto`, relógio ou estado global.

A `Seed` pública tem 16 dígitos hexadecimais minúsculos. Os oito dígitos superiores e inferiores são
interpretados como duas palavras uint32 e cada metade avança o mixer `SplitMix32` duas vezes,
produzindo `s0`, `s2` e `s1`, `s3`, respectivamente. O mixer incrementa por `0x9e3779b9` e aplica os
finalizadores `0x21f0aaad` e `0x735a2d97`. Se a expansão produzir o estado absorvente zero, o mixer
continua avançando até obter um estado não nulo.

`createSeededRandom(seed, label)` deriva o stream inicial a partir do estado expandido. `derive(label)`
calcula FNV-1a 32 do rótulo kebab-case e mistura esse hash com `s0`–`s3` do estado atual por
`SplitMix32`. A operação não consome o pai; o mesmo rótulo sobre o mesmo estado produz o mesmo filho.
Os streams do kernel são exatamente `movement`, `ai`, `scenario` e `spawn`.

Como a derivação é por hash do rótulo, acrescentar `spawn` **não** desloca os outros três. Isso é
afirmação testável, não suposição: `packages/simulation/src/random/random.test.ts` compara os oito
primeiros `nextUint32()` de `ai`, `movement` e `scenario` com os vetores golden de PB-03-02 e
registra o vetor novo de `spawn` para a seed `0f1e2d3c4b5a6978`:

```text
spawn: c4e46756 97d5fe29 e8f89ef4 2187ecdc 9b4bb0ce e6e26967 236ed8ca ed821c3f
```

`nextUint32()` é a única primitiva que avança o estado e incrementa `drawCount`. `nextBelow(bound)`
aceita um inteiro em `[1, 2^32]`, calcula a maior faixa múltipla de `bound` contida em `2^32`,
descarta valores fora dessa faixa e só então aplica o módulo. Cada valor descartado também incrementa
`drawCount`, portanto o contador audita exatamente o consumo do stream.

O estado serializado é `{ label, s0, s1, s2, s3, drawCount }`. `KernelRandomStreams.serialize()`
ordena os estados por `label`: `ai`, `movement`, `scenario`, `spawn`. Restaurar estado zero, label
ausente, duplicado ou desconhecido é erro, e um conjunto de três estados — a forma do schema `2` — é
recusado por contagem. Trocar o algoritmo, as constantes, a ordem da mistura ou a regra de
rejeição altera a sequência observável e exige incremento de `SIMULATION_RULES_VERSION` com novos
vetores golden.

## Command log

`SimulationCommandLog` tem um header estrito:

```text
kind = "header"
schemaVersion, rulesVersion, scenarioId, scenarioRevision, seed, tickCount
```

O header e cada `SimulationCommandRecord` são validados antes de qualquer simulação. Versão
incompatível produz `SIM_VERSION_MISMATCH`; seed inválida produz `SIM_SEED_INVALID`; uma sequência
repetida ou regressiva produz `SIM_COMMAND_DUPLICATE`.

### Borda de comandos em `@huntbound/simulation`

O `CommandBuffer` e a unica porta de entrada dos comandos externos. `enqueue` valida o envelope e a
combinacao emissor/tipo antes de mutar o buffer; comandos com `tick < currentTick` retornam
`SIM_TICK_IN_PAST`, e uma recusa nunca consome `sequence`. A primeira sequencia e `1` e cada aceite
incrementa o contador global da run.

Comandos aceitos saem de `drain(tick)` por `(tick, commandPriority(type), sequence)`. As prioridades
sao `scenario/* = 0`, `actor/face = 1`, `actor/move-step = 2` e `actor/wait = 3`. `drain` remove o
tick pedido e uma segunda chamada para o mesmo tick devolve lista vazia. `pending()` nao aplica
comandos e expoe os registros ainda pendentes por `(tick, sequence)`, que e a ordem usada para
snapshot. A duplicata de borda e o mesmo emissor, ator e tick com duas acoes concorrentes
(`actor/move-step` ou `actor/wait`); o segundo retorna `SIM_COMMAND_DUPLICATE`. `actor/face` nao
conflita, e emissores diferentes nao conflitam nesta camada.

O encoder de `@huntbound/simulation` escreve somente comandos externos em JSONL. A primeira linha e
o header; cada linha seguinte usa `kind: "command"`, os campos `tick`, `sequence`, `issuer`, `type`
e um `payload` sem o campo `type`:

```json
{"kind":"command","tick":0,"sequence":1,"issuer":"scenario","type":"scenario/spawn-actor","payload":{"blueprintId":"hero","position":{"x":0,"y":0,"z":0},"facing":"s"}}
```

Cada linha e JSON canonico, com chaves recursivamente ordenadas por code unit, sem espacos, e o
arquivo termina com exatamente um LF. O decoder parseia e valida todas as linhas, exige header,
`kind` conhecido, ticks nao decrescentes e sequences estritamente crescentes; qualquer erro retorna
diagnosticos sem aceitar parcialmente o log. Comandos internos gerados por sistemas nao entram no
arquivo.

## Diagnósticos

Os validadores públicos são:

```ts
validateKernelScenario(input)
validateSimulationSnapshot(input)
validateSimulationCommandLog(input)
```

Todos devolvem `SimulationValidationResult<T>`. Em caso de falha, cada item tem `code`, `message` e
`path`; os itens são ordenados deterministicamente por `path` e depois por `code`. O código genérico
para shape ou invariantes de schema é `SIM_SCHEMA_INVALID`. Os demais códigos públicos estão
declarados em `SimulationDiagnosticCode` e ficam disponíveis para as tasks que implementam a
execução do kernel.

Zod é uma dependência exclusiva de `@huntbound/contracts`. O contrato não importa Node, DOM, Phaser,
filesystem, fetch, Web Crypto, Blob ou qualquer outro pacote Huntbound.

## Espaço e movimento

O espaço do kernel é um grid inteiro estático com múltiplos andares. Cada posição tem `{ x, y, z }`;
o cenário declara `width`, `height` e a lista `floors`, cada uma com seu `z` e seu `blockedTiles`.
Não há pathfinding, line of sight, área de efeito ou projétil.

`createStaticGrid(scenario)` devolve `StaticGrid` com `width`, `height`, `floors` (os `z`
declarados, na ordem do cenário), `hasFloor(z)`, `isInside(position)`, `isBlockedTerrain(position)` e
`transitionAt(position)`. `isInside` exige andar declarado **e** posição dentro de `width`/`height`.
`FloorGrid` é o terreno de um único andar e é o tipo interno que `StaticGrid` indexa por `z`.

As direções formam um conjunto fechado e são percorridas nesta ordem canônica:
`n`, `ne`, `e`, `se`, `s`, `sw`, `w`, `nw`. Seus deltas são, respectivamente, `(0,-1)`, `(1,-1)`,
`(1,0)`, `(1,1)`, `(0,1)`, `(-1,1)`, `(-1,0)` e `(-1,-1)`. A coordenada `z` é preservada durante
um passo.

O terreno é estático e bloqueia somente as células declaradas no `blockedTiles` **do andar**. A
ocupação é um índice derivado da lista de `ActorState`; ela é reconstruída ao carregar o estado e não
é serializada. **A chave do índice inclui `z`**: dois atores em andares diferentes podem ocupar o
mesmo `(x, y)`, e uma chave só de `(x, y)` faria um ator de baixo bloquear a coluna de cima.

`resolveStep` é pura: não modifica o ator, o grid ou o índice. Ela calcula o destino e avalia as
causas nesta precedência fixa:

1. `bounds`, quando o destino está fora de `width`, `height` ou num andar não declarado;
2. `terrain`, quando o destino está bloqueado no andar de origem;
3. `diagonal-corner`, quando um dos dois vizinhos ortogonais do passo diagonal está bloqueado por
   terreno **no andar de origem**;
4. `occupied`, quando o destino está ocupado por outro ator;
5. `transition-blocked`, quando o destino declara transição e a célula de chegada está ocupada.

O teste de corte de canto considera somente terreno, e somente o do andar de origem: não existe
passo diagonal entre andares, porque `translate` preserva `z`. Um ator em um dos vizinhos ortogonais
não impede o passo diagonal. Passos ortogonais custam `baseTicks`; passos diagonais custam
`Math.ceil(baseTicks * 3 / 2)` ticks. O `baseTicks` é o `stepCooldownTicks` do blueprint, e a decisão
de `cooldown` pertence ao chamador, não à camada geométrica.

`StepOutcome` bem-sucedido ganha `transitionedTo`, presente somente quando o passo dispara uma
transição. `to` continua sendo o destino geométrico; `transitionedTo` é onde o ator termina o tick.

## Transições

Uma transição dispara **ao entrar no tile por passo**, no fim de `S2 movement`, nunca por comando.
Não existe comando novo e `commandPriority` está inalterado.

O disparo emite `actor/moved` e, em seguida, `actor/transitioned` — nessa ordem, no mesmo tick. Uma
transição não consome aleatoriedade.

A regra do guard, congelada:

- ao chegar, `transitionGuard` recebe a posição de chegada;
- o guard é limpo pelo passo que sai da célula guardada, e **esse mesmo passo não dispara
  transição**: o ator "só volta a poder disparar qualquer transição depois de sair dessa célula", e o
  passo que sai ainda está coberto. É exatamente isso que torna o guard estado vivo e observável, e
  o que a varredura de fronteiras detecta se ele não for serializado;
- por consequência, chegar num tile que também é transição não encadeia no mesmo tick, e sair e
  voltar ao tile de chegada volta a permitir a transição;
- enquanto o guard está ativo a transição é ignorada por inteiro, inclusive para efeito de bloqueio:
  um passo guardado nunca devolve `transition-blocked`;
- um guard que não corresponde à posição do ator é estado inconsistente, não comportamento. O kernel
  falha o tick lançando `KernelInvariantError` com `code: 'SIM_TRANSITION_CHAINED'` em vez de
  continuar.

Destino ocupado bloqueia o passo inteiro com `transition-blocked`: o ator fica na origem e **não**
emite `actor/moved`.

## Loop de tick

`createSimulationKernel(scenario, seed)` devolve o kernel headless. A API é `tick`, `advanceOne()`,
`advance(ticks)`, `enqueue(command)` e `state()`. Eventos são a única saída observável; `state()`
existe para teste e para o snapshot de PB-03-06 e devolve uma cópia, nunca uma referência interna.

### Boot

Os atores de `initialActors` recebem `EntityId` `1..n` na ordem de declaração, `readyAtTick` `0` e o
`nextEntityId` fica em `n + 1`. O tick inicial é `0`. O boot emite um `actor/spawned` por ator
inicial, em ordem de `EntityId`, começando na sequência `1`; esses eventos são emitidos pelo próprio
tick `0`, antes do `intake`, e saem na primeira chamada de `advanceOne()`. Emitir no construtor
produziria os mesmos eventos, mas deixaria um journal não drenado que o snapshot não carrega — ver
"Fidelidade em qualquer fronteira".

### Fases

A ordem é fixa e não tem exceção:

```text
1. intake    comandos externos com tick == currentTick saem do buffer já ordenados;
             intents internas decididas em ticks anteriores para este tick entram na fila de passo
2. apply     validação e mutação por comando, na ordem (prioridade, sequence)
3. systems   S1 lifecycle -> S2 movement (com transição no fim) -> S3 ai -> S4 spawn
4. flush     o journal do tick é fechado e devolvido; currentTick += 1
```

`S4` é o último por duas razões congeladas: o nascimento do tick `T` só pode ser observado a partir
de `T`, e ele nunca disputa célula com um passo do mesmo tick — uma célula liberada por `S2` já pode
receber um nascimento no mesmo tick, e o recém-nascido só é considerado por `S3` no tick seguinte.

`advance(ticks)` concatena os journals na ordem dos ticks e é equivalente a `ticks` chamadas de
`advanceOne()`. `advance(0)` não avança e devolve vazio; `ticks` negativo, fracionário ou `NaN`
lança `RangeError`.

A `sequence` de evento é monotônica global na run e nunca reinicia entre ticks. O kernel não acumula
journal: `advanceOne()` devolve os eventos daquele tick e esvazia o buffer.

### `apply`

| Comando | Efeito em `apply` |
| --- | --- |
| `scenario/spawn-actor` | valida blueprint e célula, reserva a célula e enfileira o spawn para S1 |
| `scenario/despawn-actor` | enfileira o despawn para S1 e torna a entidade inendereçável no tick |
| `actor/face` | muda `facing` e emite `actor/faced` imediatamente |
| `actor/move-step` | enfileira a intent de passo para S2 |
| `actor/wait` | não muta nada e não emite evento |

Rejeições congeladas, todas com `command/rejected` e sem qualquer mutação de estado:

- comando de ator para entidade inexistente: `SIM_COMMAND_UNKNOWN_ENTITY`;
- `scenario/despawn-actor` para entidade inexistente: `SIM_COMMAND_UNKNOWN_ENTITY`;
- `scenario/spawn-actor` com blueprint inexistente: `SIM_SCHEMA_INVALID`;
- `scenario/spawn-actor` fora do grid, em terreno bloqueado, em célula ocupada ou em célula já
  reservada por um spawn anterior do mesmo tick: `SIM_SPAWN_TILE_UNAVAILABLE`.

Como `scenario/*` tem prioridade `0` e `actor/move-step` tem prioridade `2`, um despawn aplicado no
mesmo tick precede o passo do mesmo ator, e o passo vira `SIM_COMMAND_UNKNOWN_ENTITY`. A entidade
deixa de ser endereçável já em `apply`, embora só saia do mundo em S1.

A disponibilidade da célula de spawn é avaliada contra os atores vivos no momento de `apply` e
contra as células reservadas por spawns anteriores do mesmo tick. Um despawn do mesmo tick ainda não
liberou a célula quando o spawn é validado, porque a materialização acontece em S1.

### Sistemas

`S1 lifecycle` materializa spawns e despawns pendentes em ordem de `sequence`. Um spawn aceito
recebe o próximo `EntityId`, entra com `readyAtTick = currentTick` e emite `actor/spawned`. Um
despawn remove o ator e emite `actor/despawned`. `EntityId` nunca é reaproveitado.

`S2 movement` resolve as intents em ordem crescente de `EntityId`. Empate no mesmo ator resolve
primeiro a intent externa e depois a interna, e dentro de cada origem por ordem de entrada. Para
cada intent:

1. **cooldown antes da geometria.** Um ator só age quando `currentTick >= readyAtTick`. Caso
   contrário o passo emite `actor/move-blocked` com `reason: 'cooldown'` e `attempted` igual à
   célula que o passo teria alcançado;
2. `resolveStep` avalia `bounds`, `terrain`, `diagonal-corner` e `occupied` nessa precedência, e o
   bloqueio emite `actor/move-blocked` com a causa vinda do grid;
3. um passo bem-sucedido move o ator, define `facing` igual à direção do passo, define
   `readyAtTick = currentTick + stepCostTicks(base, direção)` e emite `actor/moved`.

Como a resolução é sequencial, dois atores disputando a mesma célula no mesmo tick são decididos
pelo menor `EntityId`: o primeiro move e o segundo recebe `occupied`. Pelo mesmo motivo, a célula
liberada por um ator já pode ser ocupada por um ator de `EntityId` maior no mesmo tick.

`S3 ai` percorre os atores com `behavior: 'wander'` em ordem crescente de `EntityId` e decide
somente para quem está fora de cooldown no tick corrente. A decisão consome exatamente um
`nextBelow(8)` do stream `ai` e indexa a ordem canônica de direções; um bloqueio não gera nova
tentativa no mesmo tick. A intent resultante é enfileirada para `currentTick + 1` e nunca para o
tick corrente. Ator `inert` jamais consome o stream `ai`, portanto acrescentar ou remover atores
inertes não altera as decisões de wander; remover um ator `wander` altera as decisões seguintes de
forma determinística, porque muda o consumo do stream.

Comandos internos gerados por `S3` usam uma fila interna própria, ordenada por `EntityId`. Eles não
entram no command log e não consomem `sequence` de comando externo.

`S4 spawn` percorre a tabela do cenário em ordem `(groupIndex, slotIndex)` — a ordem canônica
descrita acima, não a de declaração. Para cada slot vago cujo `readyAtTick` já chegou:

1. se o número de atores vivos já alcançou `maxLiveActors`, emite `spawn/capped` e, em seguida,
   `spawn/deferred` com `cap-reached`, e passa ao próximo slot;
2. nasce na posição declarada quando ela está dentro do grid, livre de terreno e desocupada;
3. senão, sorteia uniformemente entre as células livres do raio pelo stream `spawn`, percorrendo o
   quadrado do raio em ordem row-major `(y, x)` e consumindo exatamente um `nextBelow(n)`;
4. sem nenhuma célula livre, emite `spawn/deferred` com `no-free-cell`, **não** consome
   aleatoriedade e tenta de novo no tick seguinte.

Um ator nascido por `S4` entra com `facing: 's'`, `readyAtTick = currentTick` e
`transitionGuard = null`, e emite `actor/spawned` como qualquer outro nascimento. Quando o ator de um
slot é removido por `scenario/despawn-actor`, o assento fica `null` e
`readyAtTick = tickDoDespawn + respawnTicks`. Não existe morte em PB-04; o despawn é a única saída.

O teto vale apenas para `S4`. Um `scenario/spawn-actor` externo continua governado pelas rejeições de
`apply`, e não por `maxLiveActors`.

### Determinismo

Nenhum sistema lê relógio, cria promessa, agenda callback ou depende de ordem de inserção de
estrutura preenchida de forma não determinística. `Math.random`, `Date`, `performance`, timers,
`crypto`, `globalThis`, `process` e qualquer import externo são proibidos em
`packages/simulation/src/**` e a regra é executável em `tools/architecture/simulation-boundaries.ts`,
incluída em `architecture:check`. A regra vale para todo arquivo do pacote; `vitest` é o único
pacote externo tolerado, e apenas em arquivos `*.test.ts`.

## Fronteira kernel × conteúdo

O kernel recebe geometria e comportamento, nunca identidade Tibia. As identidades `serverId`,
`clientId`, `lookType`, `huntId` e `regionId` são proibidas em `packages/simulation/src/**` e a
mesma regra executável as reprova. Diferente dos globais acima, elas são reprovadas em **qualquer**
posição — acesso a propriedade e declaração incluídos —, porque é exatamente assim que um campo
desses vaza. Comentários e strings continuam fora do escaneamento.

`simulation-boundaries.test.ts` e `content-boundaries.test.ts` entram no enumerador de `node --test`
do script `test` da raiz, portanto a regra roda no gate agregado.
