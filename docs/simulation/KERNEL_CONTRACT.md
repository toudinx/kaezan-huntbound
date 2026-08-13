# Contrato do kernel determinístico

Este documento congela a linguagem pública compartilhada por `@huntbound/contracts` e pelo kernel
headless de PB-03. A task PB-03-01 define somente tipos, schemas e diagnósticos; não implementa RNG,
grid, aplicação de comandos, loop de tick, snapshot/restore ou replay.

## Versões e tempo

| Constante | Valor |
| --- | ---: |
| `SIMULATION_SCHEMA_VERSION` | `1` |
| `SIMULATION_RULES_VERSION` | `1` |
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

`KernelScenario` contém `schemaVersion`, `scenarioId`, `scenarioRevision`, `width`, `height`, `z`,
`blockedTiles`, `blueprints` e `initialActors`.

- `width` e `height` são positivos.
- `blockedTiles` fica dentro do grid, sem duplicatas e estritamente ordenado por `(y, x)`.
- `blueprintId` é kebab-case e único.
- `stepCooldownTicks` é inteiro seguro não negativo.
- Cada ator inicial referencia um blueprint existente, está dentro do grid, usa o `z` do cenário, não
  ocupa terreno bloqueado e não compartilha célula com outro ator.
- Os schemas são estritos: campos desconhecidos são rejeitados.

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
| `command/rejected` | `commandType`, `commandSequence`, `code` |

As causas de bloqueio são `bounds`, `terrain`, `occupied`, `diagonal-corner` e `cooldown`.

## Snapshot

`SimulationSnapshot` referencia `scenarioId` e `scenarioRevision`; ele não copia terreno, ocupação ou
hash do cenário. O formato contém:

```text
schemaVersion, rulesVersion, scenarioId, scenarioRevision, seed, tick,
nextEntityId, nextEventSequence, nextCommandSequence,
randomStreams, actors, pendingCommands
```

As coleções têm ordem canônica parte do contrato:

- `randomStreams` por `label`, sem duplicatas;
- `actors` por `entityId`, sem duplicatas;
- `pendingCommands` por `(tick, sequence)`.

`RandomStreamState` guarda `label`, quatro palavras `s0`–`s3` uint32 e `drawCount` não negativo.
`ActorState` guarda `entityId`, `blueprintId`, `position`, `facing` e `readyAtTick`.

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
Os streams do kernel são exatamente `movement`, `ai` e `scenario`.

`nextUint32()` é a única primitiva que avança o estado e incrementa `drawCount`. `nextBelow(bound)`
aceita um inteiro em `[1, 2^32]`, calcula a maior faixa múltipla de `bound` contida em `2^32`,
descarta valores fora dessa faixa e só então aplica o módulo. Cada valor descartado também incrementa
`drawCount`, portanto o contador audita exatamente o consumo do stream.

O estado serializado é `{ label, s0, s1, s2, s3, drawCount }`. `KernelRandomStreams.serialize()`
ordena os estados por `label`: `ai`, `movement`, `scenario`. Restaurar estado zero, label ausente,
duplicado ou desconhecido é erro. Trocar o algoritmo, as constantes, a ordem da mistura ou a regra de
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

O espaço do kernel é um grid inteiro estático. Cada posição tem `{ x, y, z }`; o cenário declara
uma única camada `z`, `width`, `height` e a lista `blockedTiles`. Não há transição de andar,
pathfinding, line of sight, área de efeito ou projétil em PB-03.

As direções formam um conjunto fechado e são percorridas nesta ordem canônica:
`n`, `ne`, `e`, `se`, `s`, `sw`, `w`, `nw`. Seus deltas são, respectivamente, `(0,-1)`, `(1,-1)`,
`(1,0)`, `(1,1)`, `(0,1)`, `(-1,1)`, `(-1,0)` e `(-1,-1)`. A coordenada `z` é preservada durante
um passo.

O terreno é estático e bloqueia somente as células declaradas em `blockedTiles`. A ocupação é um
índice derivado da lista de `ActorState`; ela é reconstruída ao carregar o estado e não é
serializada. Cada célula comporta no máximo um ator, conforme a validação do cenário e do snapshot.

`resolveStep` é pura: não modifica o ator, o grid ou o índice. Ela calcula o destino e avalia as
causas nesta precedência fixa:

1. `bounds`, quando o destino está fora de `width`, `height` ou usa outro `z`;
2. `terrain`, quando o destino está bloqueado;
3. `diagonal-corner`, quando um dos dois vizinhos ortogonais do passo diagonal está bloqueado por
   terreno;
4. `occupied`, quando o destino está ocupado por outro ator.

O teste de corte de canto considera somente terreno: um ator em um dos vizinhos ortogonais não
impede o passo diagonal. O destino, porém, continua sujeito à verificação de ocupação. Passos
ortogonais custam `baseTicks`; passos diagonais custam `Math.ceil(baseTicks * 3 / 2)` ticks. O
`baseTicks` é o `stepCooldownTicks` do blueprint, e a decisão de `cooldown` pertence ao chamador,
não à camada geométrica.

## Loop de tick

`createSimulationKernel(scenario, seed)` devolve o kernel headless. A API é `tick`, `advanceOne()`,
`advance(ticks)`, `enqueue(command)` e `state()`. Eventos são a única saída observável; `state()`
existe para teste e para o snapshot de PB-03-06 e devolve uma cópia, nunca uma referência interna.

### Boot

Os atores de `initialActors` recebem `EntityId` `1..n` na ordem de declaração, `readyAtTick` `0` e o
`nextEntityId` fica em `n + 1`. O tick inicial é `0`. O boot emite um `actor/spawned` por ator
inicial, em ordem de `EntityId`, começando na sequência `1`; esses eventos ficam no journal e saem
na primeira chamada de `advanceOne()`, que é a que executa o tick `0`.

### Fases

A ordem é fixa e não tem exceção:

```text
1. intake    comandos externos com tick == currentTick saem do buffer já ordenados;
             intents internas decididas em ticks anteriores para este tick entram na fila de passo
2. apply     validação e mutação por comando, na ordem (prioridade, sequence)
3. systems   S1 lifecycle -> S2 movement -> S3 ai
4. flush     o journal do tick é fechado e devolvido; currentTick += 1
```

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

### Determinismo

Nenhum sistema lê relógio, cria promessa, agenda callback ou depende de ordem de inserção de
estrutura preenchida de forma não determinística. `Math.random`, `Date`, `performance`, timers,
`crypto`, `globalThis`, `process` e qualquer import externo são proibidos em
`packages/simulation/src/**` e a regra é executável em `tools/architecture/simulation-boundaries.ts`,
incluída em `architecture:check`. A regra vale para todo arquivo do pacote; `vitest` é o único
pacote externo tolerado, e apenas em arquivos `*.test.ts`.
