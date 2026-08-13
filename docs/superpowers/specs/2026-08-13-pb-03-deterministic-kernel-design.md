# PB-03 — Kernel determinístico (design)

**Status:** aprovado para decomposição em playbook
**Data:** 2026-08-13
**Playbook alvo:** `docs/playbooks/PB-03/`
**Fontes normativas:** `docs/03_ADR_PHASER4_BROWSER_FIRST.md`,
`docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`,
`docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`,
`docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`,
`docs/08_POLITICA_MODELOS_AGENTES.md`,
`docs/architecture/PACKAGE_BOUNDARIES.md`

## Contexto

PB-00/PB-00R entregaram workspace, shell browser e gates. PB-01 congelou o catálogo curado de
conteúdo. PB-02 congelou o contrato de assets e o carregamento por stable keys. Nenhum deles produziu
regra de jogo: `packages/simulation/src/index.ts` ainda é `export {}`.

PB-03 cria o núcleo determinístico que todos os playbooks de gameplay vão consumir. A ADR-001 já
congelou as fronteiras: a simulação usa fixed tick, RNG próprio seedado, ordenação explícita e estado
serializável, e não importa Phaser, DOM, Node, banco ou relógio global. O protocolo de run descrito
na ADR-001 (cliente grava command log determinístico; um verificador re-simula) só é possível se o
kernel for reproduzível byte a byte. PB-03 existe para provar essa propriedade antes que qualquer
regra de combate, loot ou economia dependa dela.

O gate G2 do roteiro (“mesma fixture importada duas vezes produz JSON byte-identical”) tem análogo
direto aqui: mesma seed e mesmo command log produzem snapshot final byte-identical, em Node e no
browser.

## Objetivo

Entregar um kernel headless que:

1. avança em tick fixo, sem ler relógio;
2. deriva toda aleatoriedade de uma seed serializável;
3. representa espaço como grid inteiro com colisão e ocupação;
4. aceita comandos validados e rejeita o inválido com diagnóstico;
5. emite eventos ordenados como única saída observável;
6. serializa e restaura estado sem perda;
7. reproduz um replay golden de forma idêntica em Node e no browser.

O kernel é agnóstico de conteúdo. Ele não conhece vocação, criatura, item, spell, hunt, mapa real,
câmera ou asset.

## Decisões congeladas

### Tempo

- `TICK_DURATION_MS = 50` (20 Hz). Inteiro, imutável nesta versão do kernel.
- O kernel nunca lê relógio. Ele expõe `advance(ticks: number)` e `advanceOne()`.
- O driver externo converte tempo real em ticks. O clamp de frame é `MAX_FRAME_DELTA_MS = 250`,
  isto é, no máximo cinco ticks por frame.
- Ticks nunca são descartados. O excedente permanece no acumulador do driver e roda no frame
  seguinte. Descartar tick quebraria replay; atrasar não quebra.
- Interpolação visual é problema de apresentação e pertence a PB-04.

### Números

- O estado do kernel contém apenas inteiros seguros, booleanos e strings.
- Nenhum float existe no snapshot. Durações, custos e cooldowns são inteiros em ticks ou em
  milissegundos.
- Toda divisão usa aritmética inteira explícita (`Math.trunc`, `Math.ceil`, `Math.floor`).
- A serialização canônica falha com diagnóstico quando encontra número não inteiro, `NaN`,
  `Infinity` ou `-0`.

Motivo: eliminar por construção a classe de divergência mais cara entre runtimes e arquiteturas,
em vez de tentar detectá-la depois por tolerância numérica.

### Aleatoriedade

- Algoritmo: xoshiro128\*\* com aritmética `Uint32`. Sem `BigInt`, sem `Math.random`, sem
  `crypto.getRandomValues`.
- Seed pública é uma string de 16 caracteres hexadecimais minúsculos (64 bits).
- A seed é expandida para o estado interno de quatro palavras de 32 bits por SplitMix32.
- Streams nomeados são derivados por rótulo kebab-case: `derive(label)` mistura o hash FNV-1a 32 do
  rótulo com o estado do pai por SplitMix32 e **não avança o pai**. O mesmo rótulo sobre o mesmo
  estado sempre produz o mesmo stream.
- Streams congelados em PB-03: `movement`, `ai` e `scenario`. Outros playbooks acrescentam os seus.
- Cada stream serializa `{ label, s0, s1, s2, s3, drawCount }`. `drawCount` é auditoria e entra na
  comparação de snapshot: divergência de consumo de RNG falha cedo.
- `nextBelow(bound)` usa rejeição para eliminar viés de módulo. `nextUint32()` é a primitiva única.

### Espaço

- Coordenada é `{ x: number; y: number; z: number }`, todos inteiros.
- O cenário declara `width`, `height` e um único `z`. Transição entre andares é PB-04.
- Direções fechadas: `'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'`.
- Terreno bloqueante é estático, declarado no cenário e nunca muda em runtime.
- Ocupação é índice derivado do estado dos atores, reconstruído no load do snapshot e não
  serializado. Uma célula comporta no máximo um ator bloqueante.
- Passo diagonal exige que as duas células ortogonais adjacentes não sejam bloqueadas por terreno.
  Ator ocupando essas células não impede o corte; apenas o destino é verificado quanto a ocupação.
- Custo de passo diagonal é `Math.ceil(base * 3 / 2)` ticks, com `base` vindo do blueprint.
- Não há pathfinding, line of sight, área de efeito nem projétil em PB-03.

### Identidade

- `EntityId` é inteiro monotônico alocado pelo kernel a partir de 1. O snapshot carrega
  `nextEntityId`.
- IDs não são reutilizados após despawn.
- Nenhum UUID, timestamp ou valor aleatório participa da identidade de entidade.

### Comandos

Conjunto fechado em PB-03:

| Tipo | Emissor | Payload |
|---|---|---|
| `actor/move-step` | `player`, `ai` | `{ entityId, direction }` |
| `actor/face` | `player`, `ai` | `{ entityId, direction }` |
| `actor/wait` | `player`, `ai` | `{ entityId }` |
| `scenario/spawn-actor` | `scenario` | `{ blueprintId, position, facing }` |
| `scenario/despawn-actor` | `scenario` | `{ entityId }` |

- Envelope: `{ tick, sequence, issuer, type, payload }`.
- `sequence` é monotônico global na run e é atribuído no intake, não pelo chamador.
- Ordenação de aplicação: `tick` crescente, depois prioridade do tipo, depois `sequence`.
  Prioridades congeladas: `scenario/*` = 0, `actor/face` = 1, `actor/move-step` = 2,
  `actor/wait` = 3.
- Um comando destinado a um tick já executado é rejeitado, nunca reordenado para trás.
- Comando inválido não muta estado e produz `command/rejected` com o código de diagnóstico.

### Comandos internos e o command log

O command log grava **somente comandos externos** — os que entram pela borda do kernel. Decisões de
IA são funções puras do estado e do stream `ai`, portanto são reproduzidas pelo replay sem serem
gravadas. Gravá-las tornaria o log redundante e permitiria que um log inconsistente mascarasse um
bug de determinismo.

### Eventos

Conjunto fechado em PB-03:

| Tipo | Payload |
|---|---|
| `actor/spawned` | `{ entityId, blueprintId, position, facing }` |
| `actor/moved` | `{ entityId, from, to, facing }` |
| `actor/move-blocked` | `{ entityId, attempted, reason }` |
| `actor/faced` | `{ entityId, facing }` |
| `actor/despawned` | `{ entityId }` |
| `command/rejected` | `{ commandType, commandSequence, code }` |

- Envelope: `{ tick, sequence, type, payload }`, com `sequence` monotônico global na run.
- `reason` de bloqueio: `'bounds' | 'terrain' | 'occupied' | 'diagonal-corner' | 'cooldown'`.
- Eventos são a única saída observável do kernel. Consumidores não leem o estado interno.
- O journal de eventos do tick é entregue por `advanceOne()` e não é acumulado indefinidamente
  dentro do kernel.

### Pipeline do tick

Ordem fixa, sem exceção:

```text
1. intake      comandos com tick == currentTick saem do buffer e recebem sequence
2. apply       validação e mutação por comando, na ordem congelada
3. systems     S1 lifecycle -> S2 movement -> S3 ai
4. flush       journal do tick é fechado; currentTick += 1
```

- `S1 lifecycle` materializa spawns e despawns pendentes, em ordem de `sequence`.
- `S2 movement` resolve intents de passo em ordem crescente de `EntityId`, aplicando cooldown.
- `S3 ai` percorre atores com `behavior: 'wander'` em ordem crescente de `EntityId`, consome o
  stream `ai` e enfileira intents para `currentTick + 1`.
- Nenhum sistema lê relógio, cria promessa, agenda callback ou depende de ordem de iteração de
  estrutura preenchida de forma não determinística.

### Versões

- `SIMULATION_SCHEMA_VERSION = 1` — formato de snapshot, cenário e command log.
- `SIMULATION_RULES_VERSION = 1` — semântica das regras. Muda sempre que o comportamento muda e,
  portanto, invalida golden hashes.
- Snapshot e header do log carregam as duas. Divergência é erro explícito, nunca migração implícita.

### Cenário

O cenário é um documento imutável validado por schema:

```ts
{
  schemaVersion, scenarioId, scenarioRevision,
  width, height, z,
  blockedTiles: readonly (readonly [number, number])[],   // ordenado por (y, x), sem duplicata
  blueprints: readonly { blueprintId, stepCooldownTicks, behavior: 'inert' | 'wander' }[],
  initialActors: readonly { blueprintId, position, facing }[]
}
```

- `initialActors` recebem `EntityId` na ordem de declaração.
- O snapshot referencia `scenarioId` e `scenarioRevision`; não copia o terreno e não carrega hash do
  cenário, evitando dependência circular entre documento e digest.
- A integridade do arquivo de cenário é provada fora do kernel por `scenario.sha256`, no mesmo
  padrão já usado por PB-01 e PB-02.

### Serialização canônica e hash

- `encodeCanonicalJson(value)` produz JSON com chaves ordenadas por code unit UTF-16, sem espaços
  supérfluos, UTF-8, LF e newline final.
- O encoder recusa `undefined`, função, símbolo, `NaN`, `Infinity`, `-0` e qualquer número não
  inteiro, com diagnóstico `SIM_STATE_NOT_INTEGER` ou `SIM_STATE_NOT_SERIALIZABLE`.
- O kernel **não** calcula SHA-256: `@huntbound/simulation` não pode importar Node nem tocar
  Web Crypto. O digest dos bytes canônicos é responsabilidade do harness de replay e da CLI.

### Command log

JSONL com cabeçalho na primeira linha:

```text
{"kind":"header","schemaVersion":1,"rulesVersion":1,"scenarioId":"...","scenarioRevision":1,"seed":"...","tickCount":200}
{"kind":"command","tick":0,"sequence":1,"issuer":"scenario","type":"scenario/spawn-actor","payload":{...}}
```

- Linhas de comando ordenadas por `(tick, sequence)`; `sequence` estritamente crescente.
- Cada linha é JSON canônico; o arquivo termina com newline.
- Log com versão, cenário ou seed divergente do alvo é recusado antes de simular.

## Arquitetura

```text
command log (JSONL)        scenario.json
        │                        │
        └──────────┬─────────────┘
                   ▼
        packages/contracts/src/simulation      schemas, tipos branded, diagnósticos
                   ▼
        packages/simulation/src/kernel         createSimulationKernel
            ├─ random/    xoshiro128** + streams nomeados
            ├─ grid/      coordenadas, colisão, ocupação, passo
            ├─ commands/  buffer, validação, ordenação
            ├─ events/    journal por tick
            ├─ state/     world state + snapshot + JSON canônico
            └─ replay/    runReplay(scenario, log) -> snapshot final
                   ▼
        tools/replay (Node)                    run / verify / hash, SHA-256
        apps/game/src/simulation (browser)     host com acumulador + probe test-only
```

### Fronteiras

- `@huntbound/simulation` continua sem dependência externa: sem Zod, sem uuid, sem Node, sem DOM.
  A validação por schema mora em `@huntbound/contracts`, que já depende de Zod; o kernel recebe
  documentos já validados e revalida apenas invariantes estruturais baratas.
- `@huntbound/contracts` não importa nenhum pacote Huntbound.
- `apps/game` conhece o kernel, mas nenhuma regra vive em cena Phaser, DOM ou probe.
- `tools/replay` é Node puro, como `tools/asset-packer`.

### API pública do kernel

```ts
export interface SimulationKernel {
  readonly tick: TickIndex;
  advanceOne(): readonly SimulationEvent[];
  advance(ticks: number): readonly SimulationEvent[];
  enqueue(command: SimulationCommandInput): CommandAcceptance;
  snapshot(): SimulationSnapshot;
}

export function createSimulationKernel(
  scenario: KernelScenario,
  seed: Seed,
): SimulationKernel;

export function restoreSimulationKernel(
  scenario: KernelScenario,
  snapshot: SimulationSnapshot,
): SimulationKernel;

export function encodeCanonicalJson(value: unknown): string;
export function runReplay(
  scenario: KernelScenario,
  log: SimulationCommandLog,
): ReplayResult;
```

`CommandAcceptance` é `{ ok: true; sequence } | { ok: false; code }`; enfileirar um comando para um
tick passado falha na borda, sem entrar no buffer.

## Erros e diagnósticos

Códigos congelados em `@huntbound/contracts`:

```text
SIM_SCHEMA_INVALID          documento não passa no schema
SIM_VERSION_MISMATCH        schemaVersion ou rulesVersion divergente
SIM_SCENARIO_MISMATCH       snapshot ou log referencia outro cenário/revisão
SIM_SEED_INVALID            seed fora do formato de 16 hex minúsculos
SIM_TICK_IN_PAST            comando destinado a tick já executado
SIM_COMMAND_UNKNOWN_ENTITY  alvo inexistente
SIM_COMMAND_FORBIDDEN       emissor não pode emitir aquele tipo
SIM_COMMAND_DUPLICATE       mesmo emissor, mesmo ator, mesmo tick, comando conflitante
SIM_MOVE_OUT_OF_BOUNDS      destino fora do grid
SIM_MOVE_BLOCKED_TERRAIN    destino bloqueado por terreno
SIM_MOVE_BLOCKED_OCCUPIED   destino ocupado por outro ator
SIM_MOVE_DIAGONAL_CORNER    diagonal cortando canto bloqueado
SIM_MOVE_ON_COOLDOWN        ator ainda não está pronto
SIM_SPAWN_TILE_UNAVAILABLE  spawn em célula inválida
SIM_STATE_NOT_INTEGER       número não inteiro alcançou a serialização
SIM_STATE_NOT_SERIALIZABLE  valor não serializável alcançou a serialização
SIM_REPLAY_DIVERGED         replay produziu snapshot diferente do esperado
```

Diagnóstico é `{ code, message, path }`, ordenado por `path` e depois `code`, no mesmo padrão de
`@huntbound/contracts/content/diagnostics.ts` e de `@huntbound/assets`.

## Fixture e prova de determinismo

Cenário `pb-03-kernel-coverage`, sintético e versionado:

- grid 16×16 em `z = 7`, com paredes que forçam bloqueio de terreno, corte de canto proibido e
  corredor de largura 1 para provar bloqueio por ocupação;
- três blueprints: `walker` (`stepCooldownTicks: 2`, `inert`), `wanderer` (`stepCooldownTicks: 3`,
  `wander`) e `statue` (`stepCooldownTicks: 0`, `inert`);
- quatro atores iniciais;
- 200 ticks, seed `0f1e2d3c4b5a6978`;
- command log externo cobrindo passo válido, passo em cooldown, diagonal ilegal, destino ocupado,
  fora de limites, comando para entidade inexistente, emissor proibido, spawn e despawn.

Artefatos versionados em `packages/test-fixtures/simulation/pb03/`:

```text
scenario.json           scenario.sha256
commands.jsonl          commands.sha256
snapshot.golden.json    snapshot.golden.sha256
events.golden.jsonl     events.golden.sha256
```

Provas obrigatórias:

1. **Repetição** — duas execuções limpas produzem snapshot e journal byte-idênticos.
2. **Retomada** — executar 0→200 direto e 0→117 + restore + 117→200 produz o mesmo snapshot final e
   a mesma sequência de eventos a partir de 117.
3. **Paridade de runtime** — Node e browser produzem o mesmo JSON canônico e o mesmo SHA-256.
4. **Sensibilidade** — trocar um bit da seed, um comando do log ou `rulesVersion` muda o hash e é
   detectado como divergência, não silenciosamente aceito.
5. **Vetores de RNG** — os primeiros valores de cada stream são congelados como golden; `nextBelow`
   é provado sem viés de módulo por contagem exata em bound não potência de dois.

## Testes e gates

- Todo comportamento entra por RED/GREEN. Cada task declara os arquivos de teste que cria.
- `packages/simulation` roda com Vitest, sem DOM, sem Node.
- Nova regra em `tools/architecture/simulation-boundaries.ts`: `packages/simulation/src/**` não pode
  referenciar `Date`, `performance`, `Math.random`, `setTimeout`, `setInterval`, `queueMicrotask`,
  `crypto`, `globalThis` nem importar pacote externo. A regra entra em `architecture:check`.
- `tools/replay` ganha `verify`, incluído no script `verify` da raiz.
- Um teste Playwright compara o snapshot canônico produzido no browser com o golden do repositório.
  O log e o cenário são injetados pelo processo Node do teste; PB-03 não publica artefato novo em
  `apps/game/public`.

## Fora de escopo

- combate, dano, morte, loot, spell, vocação e qualquer regra Canary;
- mapa real, OTBM, tiles, camadas, spawn de hunt, câmera e transições;
- pathfinding, line of sight, área de efeito e projétil;
- SceneBridge de gameplay, renderização, interpolação e input real;
- save, IndexedDB, persistência de run e backend;
- helper, gacha, outfit e economia;
- profiling e budget de performance de gameplay, que pertencem a PB-10;
- alterar PB-01 ou PB-02 sem defeito bloqueante reproduzido.

## Decomposição em tasks

| ID | Problema coeso | Dependência |
|---|---|---|
| PB-03-01 | contratos, tipos branded, schemas, versões e diagnósticos | PB-02 fechado |
| PB-03-02 | RNG determinístico, streams e vetores golden | PB-03-01 |
| PB-03-03 | grid, colisão, ocupação e regra de passo | PB-03-01 |
| PB-03-04 | comandos, validação, ordenação e log | PB-03-01 |
| PB-03-05 | loop de tick, pipeline de sistemas e journal de eventos | PB-03-02/03/04 |
| PB-03-06 | snapshot, restore, replay, CLI e fixture golden | PB-03-05 |
| PB-03-07 | driver browser headless, probe e paridade de runtime | PB-03-06 |
| PB-03-08 | auditoria integrada e fechamento | PB-03-07 |

PB-03-02, PB-03-03 e PB-03-04 têm paths funcionais disjuntos e podem executar em paralelo depois de
PB-03-01. O padrão continua serial; paralelismo exige ativação explícita do supervisor, e PB-03-05 é
o integrador único nesse modo.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Divergência numérica entre runtimes | estado só com inteiros; encoder canônico recusa float |
| Ordem de iteração não determinística | ordenação explícita por `EntityId` e por `sequence`; sem depender de ordem de inserção |
| Consumo de RNG divergente | `drawCount` por stream entra no snapshot comparado |
| Golden frágil por mudança legítima de regra | `rulesVersion` explícita; mudança de regra exige bump e regeneração declarada |
| Kernel absorvendo gameplay antes da hora | conjunto de comandos e eventos fechado na spec; ampliar exige nova task |
| Vazamento de relógio ou aleatoriedade global | regra executável em `architecture:check` |

## Critérios de aceite do playbook

- [ ] Comandos, eventos, snapshot, cenário e log têm schema estrito e diagnóstico estruturado.
- [ ] O kernel não importa Node, DOM, Phaser nem pacote externo.
- [ ] Nenhum float, `Date`, `performance`, `Math.random` ou timer existe em `packages/simulation`.
- [ ] RNG possui vetores golden, streams isolados e `nextBelow` sem viés.
- [ ] Grid rejeita fora de limites, terreno, ocupação, corte de canto e cooldown com códigos
      distintos.
- [ ] Comando inválido nunca muta estado e sempre emite `command/rejected`.
- [ ] Duas execuções limpas do replay são byte-idênticas.
- [ ] Retomada por snapshot intermediário converge para o mesmo snapshot final.
- [ ] Browser e Node produzem o mesmo SHA-256 do snapshot canônico.
- [ ] Alterar seed, comando ou `rulesVersion` é detectado como divergência.
- [ ] `corepack pnpm verify` passa no resultado integrado.
- [ ] O relatório de aceite decide a elegibilidade de PB-04.
