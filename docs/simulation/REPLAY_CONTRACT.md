# Contrato de replay determinístico

**Escopo:** formato canônico, snapshot em disco, command log, CLI `tools/replay`, CLI `tools/save`,
exit codes, hashes congelados das fixtures `pb-03-kernel-coverage`, `pb04`, `pb04-respawn`,
`pb-05-hunt-combat` e `pb-06-save-session`, e política de regeneração de golden.

**Fonte normativa:** `docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md` e
`docs/simulation/KERNEL_CONTRACT.md`.

## Formato canônico

Todo artefato de replay é escrito por `encodeCanonicalJson`: chaves ordenadas por code unit UTF-16,
sem espaço supérfluo, UTF-8, LF. O valor codificado não termina em newline; o **arquivo** termina.

- `snapshot.golden.json` — uma linha de JSON canônico e um LF final.
- `events.golden.jsonl` — uma linha de JSON canônico por evento, LF entre linhas e LF final. Um
  journal vazio é um arquivo vazio, nunca um LF solitário.
- `scenario.json` — JSON canônico com LF final. A canonicidade é verificável: reencodar o documento
  parseado devolve o mesmo byte.
- `commands.jsonl` — cabeçalho na primeira linha, comandos nas seguintes, LF final.

Os arquivos da fixture ficam fora do formatador em `biome.json`, no mesmo padrão já usado pela árvore
de assets de PB-02: o formatador reescreveria o JSON canônico e quebraria os digests.

## Snapshot em disco

Os campos e as ordens canônicas estão em `docs/simulation/KERNEL_CONTRACT.md`, seção "Snapshot".
O snapshot não contém terreno, ocupação nem hash do cenário.

**Retomada é fiel em qualquer fronteira.** As intents decididas por `S6 ai` no fim do tick `T` para o
tick `T + 1` viajam no snapshot em `pendingIntents`, então `buildReplayArtifacts` não recusa mais
retomada por quiescência e `isKernelQuiescent` não existe. A fronteira congelada da fixture continua
sendo o tick `117`; os testes de `tools/replay` cobrem também o tick `13`, que comprovadamente deve
uma intent decidida, e varrem todas as fronteiras de `0` a `24`.

## Command log

JSONL. Primeira linha é o cabeçalho:

```text
{"kind":"header","rulesVersion":3,"scenarioId":"...","scenarioRevision":1,"schemaVersion":4,"seed":"...","tickCount":200}
```

As demais linhas são comandos achatados:

```text
{"issuer":"player","kind":"command","payload":{"direction":"w","entityId":1},"sequence":3,"tick":5,"type":"actor/move-step"}
```

- `tick` não decrescente, `sequence` estritamente crescente.
- O log grava **somente comandos externos**. Decisões de IA são reproduzidas pelo replay e nunca
  gravadas.
- `sequence` é atribuída pelo kernel no intake. No replay, o kernel reatribui as sequências e recusa
  o log com `SIM_REPLAY_DIVERGED` se alguma divergir do valor gravado.
- Uma linha com emissor proibido — por exemplo `issuer: "player"` em `scenario/despawn-actor` — é
  recusada pelo schema do log com `SIM_COMMAND_FORBIDDEN` **antes de simular**. Por isso esse caso
  não pode existir dentro de um log válido e é coberto como fixture negativa nos testes de
  `tools/replay`, não como linha do golden.

## CLI

```text
node --no-warnings --experimental-transform-types tools/replay/cli.ts run    --scenario <path> --log <path> [--out <dir>]
node --no-warnings --experimental-transform-types tools/replay/cli.ts verify --scenario <path> --log <path> --snapshot <path> --events <path>
node --no-warnings --experimental-transform-types tools/replay/cli.ts hash   --file <path>
node --no-warnings --experimental-transform-types tools/replay/cli.ts check-hashes --dir <path>
```

`run` executa o log do tick zero até `header.tickCount`. Com `--out`, escreve `snapshot.golden.json`,
`events.golden.jsonl` e os quatro `.sha256`. Duas execuções limpas produzem arquivos byte-idênticos.

`verify` recalcula os artefatos e compara **byte a byte** contra os golden, e também confere os quatro
digests `.sha256` contra os arquivos que eles descrevem.

`hash` imprime o SHA-256 dos bytes do arquivo.

`check-hashes` lê o `hashes.md` de uma fixture, hasheia os quatro artefatos no disco e compara
**arquivo contra sidecar `.sha256` e contra a tabela publicada**. Divergência sai `1`; tabela
ausente, malformada ou incompleta sai `2`. Não compara prosa contra prosa.

### Exit codes

| Código | Significado | Exemplos |
|---|---|---|
| `0` | sucesso | golden idêntico ao recalculado |
| `1` | divergência | seed, comando ou golden alterado; `rulesVersion`/cenário divergente; digest `.sha256` que não bate |
| `2` | entrada inválida | JSON malformado, arquivo ausente, argumento faltando, emissor proibido, schema reprovado |

A distinção é deliberada: `1` significa "o documento foi lido e não corresponde a esta run";
`2` significa "o documento não pôde ser lido".

## Paridade no browser

`apps/game` dirige um `SimulationKernel` por `createSimulationHost`. O host recebe timestamps da
composition root por `advanceTo(nowMs)`, acumula o delta, consome no maximo `MAX_FRAME_DELTA_MS = 250`
ms por chamada e nunca descarta o backlog. Cada tick consumido chama `kernel.advanceOne()`; o host nao
interpola, desenha ou conhece Phaser. `reset(nowMs)` zera somente o acumulador.

No build `test`, a composition root instala `__huntboundKernelProbe` de forma idempotente. O metodo
`replay(scenarioJson, logText)` valida os dois documentos, executa `runReplay`, devolve o snapshot
canonico com o LF final do arquivo, a contagem de eventos e o tick final, e calcula o SHA-256 com Web
Crypto. O kernel nao calcula digest. Builds `personal` e `product` nao instalam o probe; entradas
invalidas sao rejeitadas por `KernelProbeError` com diagnosticos `SimulationDiagnostic` estruturados.

`tests/e2e/kernel-replay.spec.ts` injeta a fixture no processo browser e compara o snapshot byte a byte,
o sidecar SHA-256, `eventCount = 59` e `finalTick = 200`. O mesmo cenario tambem exige console,
pagina e rede sem erros.

## Gate

```text
corepack pnpm simulation:check
corepack pnpm hunt:check
corepack pnpm combat:check
corepack pnpm save:check
```

`simulation:check` verifica a fixture `pb-03-kernel-coverage`. `hunt:check` verifica `pb04` e
`pb04-respawn` por `verify` e, em seguida, por `hunt:hashes:check` (`check-hashes` em cada
diretório). `combat:check` verifica `pb-05-hunt-combat` da mesma forma, com
`combat:hashes:check`. `save:check` verifica `pb-06-save-session`: persistir a run do PB-05 no
tick `1400` e retomá-la até `2700` reproduz o snapshot golden do PB-05. Os quatro entram em
`check` e em `verify`. São idempotentes: duas execuções seguidas devolvem `0`.

## Hashes congelados

Fixture `pb-03-kernel-coverage`, revisão `1`, seed `0f1e2d3c4b5a6978`, `200` ticks, retomada em `117`,
`SIMULATION_SCHEMA_VERSION = 4`, `SIMULATION_RULES_VERSION = 3`:

| Arquivo | SHA-256 |
|---|---|
| `scenario.json` | `36a2aa01ceeed45368de6279fa89dc71b8e27a641b9325f9a2780026422943b5` |
| `commands.jsonl` | `4edbda41497dc4e21e117061bc7e67819973037df2f50447589aa2105bf29a12` |
| `snapshot.golden.json` | `9621f9e02bc5df1d156d9cddced3dfe4d1a78669f1ddf1cbf3794e7359196be0` |
| `events.golden.jsonl` | `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4` |

### Migração de `SIMULATION_SCHEMA_VERSION` `1` para `2`

A versão `2` acrescenta `pendingIntents` ao snapshot e nada mais. Os três documentos que declaram
`schemaVersion` — `scenario.json`, o header de `commands.jsonl` e `snapshot.golden.json` — mudaram de
hash apenas por carregar o número novo, e o snapshot também por ganhar o campo.

`events.golden.jsonl` permanece **byte-idêntico** ao de PB-03-06, com o mesmo
`31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4`. Esse é o critério que separa
mudança de formato de mudança de semântica, e é por isso que `SIMULATION_RULES_VERSION` continua `1`.
Se o journal tivesse mudado, a mudança não seria de formato e a migração teria de parar.

Um snapshot escrito na versão `1` não é migrado automaticamente: falta-lhe `pendingIntents`, o schema
é `.strict()`, e `validateSimulationSnapshot` o recusa com `SIM_VERSION_MISMATCH`. Reproduzir uma run
antiga significa reexecutar o command log, que é a fonte de verdade.

### Migração de `SIMULATION_SCHEMA_VERSION` `2` para `3`

A versão `3` troca `z` e `blockedTiles` do cenário por `floors`, acrescenta `transitions`,
`spawnGroups` e `maxLiveActors` ao cenário, `transitionGuard` ao ator e `spawnSlots` ao snapshot, e
cria o stream `spawn`. `SIMULATION_RULES_VERSION` sobe para `2` porque a semântica mudou de fato: há
transição automática, ordem de sistemas com `S4` e ocupação por andar.

Os três documentos que declaram versão — `scenario.json`, o header de `commands.jsonl` e
`snapshot.golden.json` — mudaram de hash. O cenário também mudou de forma, e o snapshot ganhou os
dois campos novos e o quarto stream.

`events.golden.jsonl` permanece **byte-idêntico**, com o mesmo
`31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4` de PB-03-06 e da migração
anterior. A fixture tem um único andar, `transitions` e `spawnGroups` vazios e nenhum ator sob teto,
então `S4` não emite nada e a transição nunca dispara: a regra que a fixture exercita não mudou. Esse
é o critério que separou mudança de formato de mudança de regra nesta migração, e ele foi bloqueante.
Se o journal tivesse mudado, a migração teria de parar.

Um snapshot ou cenário escrito na versão `2` é recusado pelo schema estrito, e um snapshot com três
streams de RNG é recusado por contagem na restauração.

### Migração de `SIMULATION_SCHEMA_VERSION` `3` para `4`

A versão `4` acrescenta `abilities` e `lootTables` ao cenário, os campos de combate ao blueprint e ao
`ActorState`, a união `kind` em `pendingIntents`, os comandos `actor/attack` e `actor/cast-ability`,
os eventos de combate e os streams `combat` e `loot`. `SIMULATION_RULES_VERSION` sobe para `3` porque
o kernel passa a ter sete fases, golpe, conjuração, regeneração e morte.

Os três documentos que declaram versão — `scenario.json`, o header de `commands.jsonl` e
`snapshot.golden.json` — mudaram de hash. O cenário ganhou campos neutros de combate (`abilities`
e `lootTables` vazios, dano e regeneração zero). O snapshot ganhou os campos de combate nos atores e
os dois streams novos. Os journals de PB-03 e PB-04 **não** mudaram: blueprints neutros não emitem
evento de combate, e a ordem `S6 ai` / `S7 spawn` preserva o consumo de `ai` e `spawn`.

`events.golden.jsonl` de PB-03 permanece **byte-idêntico**, com o mesmo
`31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4` de PB-03-06 e das migrações
anteriores. Os journals de `pb04` e `pb04-respawn` permanecem com
`6e1206eb2ce7ed7647e9923b6d29a3f08f30ca7ec9ddf01b539d6310818d42e1` e
`613079d592335829a8e9e7565877c046cee9e21f0f4478b38af4050b7334ba30`. Esse é o critério bloqueante
desta migração: se algum journal tivesse mudado, a regra existente teria mudado e a migração teria
de parar.

Um snapshot ou cenário escrito na versão `3` é recusado pelo schema estrito, e um snapshot com quatro
streams de RNG é recusado por contagem na restauração.

## Cobertura da fixture

Grid 16×16 com um único andar `z = 7`, declarado em `floors`. Parede horizontal em `y = 8`, corredor
de largura 1 em `x = 5` entre paredes em `x = 4` e `x = 6`, e um único tile em `(2,1)` que serve de
terreno bloqueante e de canto proibido. `transitions` e `spawnGroups` são vazios e `maxLiveActors` é
`64`, o teto congelado da região: a fixture cobre a regra de PB-03 e nada mais.

Blueprints: `walker` (`stepCooldownTicks: 2`, `inert`), `wanderer` (`stepCooldownTicks: 3`, `wander`)
e `statue` (`stepCooldownTicks: 0`, `inert`). Quatro atores iniciais.

O log de 13 comandos cobre passo válido, cooldown, fora de limites, terreno, diagonal ilegal, destino
ocupado, entidade inexistente, spawn e despawn, além de `actor/face` e `actor/wait`. A run emite 59
eventos e exercita os seis tipos de evento e as cinco causas de bloqueio.

## Hashes congelados — PB-04

Fixture `pb04`, revisão `2`, seed `1a2b3c4d5e6f7a8b`, `600` ticks, `1663` eventos, tick final `600`,
`SIMULATION_SCHEMA_VERSION = 4`, `SIMULATION_RULES_VERSION = 3`. Retomada fiel em todas as fronteiras
`0..600`.

| Arquivo | SHA-256 |
|---|---|
| `scenario.json` | `2d56f2848eec061821d48e19bd23bf6bfdec3b00aa0a10007eb1fd04aa88b758` |
| `commands.jsonl` | `d18c520a5d90614f30ceb4c8989de67578c736e3a2d59516f0b04dc92d9e3636` |
| `snapshot.golden.json` | `56f68258d004c869c47a4f46e84c8a9f7289da9d0dffb7f133cae9c6fac42bca` |
| `events.golden.jsonl` | `6e1206eb2ce7ed7647e9923b6d29a3f08f30ca7ec9ddf01b539d6310818d42e1` |

Fixture `pb04-respawn`, mesmo cenário e seed, `1805` ticks, `1185` eventos, tick final `1805`. Prova
o respawn real: despawn da entidade `2` no tick `1` e `actor/spawned` da entidade `14` no tick `1801`.
Retomada nas fronteiras `0`, `1`, `2`, `1800`, `1801` e `1805`.

| Arquivo | SHA-256 |
|---|---|
| `scenario.json` | `2d56f2848eec061821d48e19bd23bf6bfdec3b00aa0a10007eb1fd04aa88b758` |
| `commands.jsonl` | `14df54ca5ee4d2731fba85368e1d8df055e2f5ea0b47b1dfcc69fa7c5f00abf5` |
| `snapshot.golden.json` | `93cbf723d7e8e7b795d6b25a60e678a804f707861f58efcf97e7e19fabea28bf` |
| `events.golden.jsonl` | `613079d592335829a8e9e7565877c046cee9e21f0f4478b38af4050b7334ba30` |

A fonte operacional desses digests é o `hashes.md` de cada fixture
(`packages/test-fixtures/hunt/pb04/hashes.md` e
`packages/test-fixtures/hunt/pb04-respawn/hashes.md`). `hunt:hashes:check` compara a tabela
publicada com o arquivo e com o sidecar `.sha256`. Task cards não republicam esses valores.

## Hashes congelados — PB-05

Fixture `pb-05-hunt-combat`, revisão `2`, seed `2c3d4e5f60718293`, `2700` ticks, `2240` eventos,
tick final `2700`, `SIMULATION_SCHEMA_VERSION = 4`, `SIMULATION_RULES_VERSION = 3`. Retomada fiel
em todas as fronteiras `0..2700`.

O `tickCount` `2700` é a resolução de B6: todo assento da hunt tem `respawnTicks` `1800`, então
900 ticks não cabiam morte + respawn. `aggroRadius` do rotworm é `1` (`targetDistance` Canary);
sem isso o hunter nunca emite `combat/target-changed`.

| Arquivo | SHA-256 |
|---|---|
| `scenario.json` | `c34813d1e1a278c9e6fd0b7869e5e55f06cf0c5c8e4b530b04b332f38b1cb8cf` |
| `commands.jsonl` | `356eee11220f96aea4d3f5cc0f0673deb614cd893c1d7f2060414a4fbc7a1e7b` |
| `snapshot.golden.json` | `44c1812203282bbad6797ede4961c971ff868d7d23905287edcaaf241eb7416a` |
| `events.golden.jsonl` | `92515975046756dc2aeafb53d811cb016903ff653f08d9a89e9be2ec8d361394` |

A fonte operacional desses digests é `packages/test-fixtures/hunt/pb05/hashes.md`.
`combat:hashes:check` compara a tabela publicada com o arquivo e com o sidecar `.sha256`.

## Hashes congelados — PB-06

Fixture `pb-06-save-session`, derivada de `pb-05-hunt-combat` (mesmo cenário, mesmo log, mesma
seed `2c3d4e5f60718293`). Checkpoint no tick `1400`, retomada até o tick `2700`. O documento
gravado, o export e a migração de `legacy.json` (documento sem `schemaVersion`) são o mesmo
`GameSave` canônico; o SHA-256 do snapshot retomado é o do sidecar do PB-05,
`44c1812203282bbad6797ede4961c971ff868d7d23905287edcaaf241eb7416a`.

| Arquivo | SHA-256 |
|---|---|
| `checkpoint.golden.json` | `ae3fc532c2481fd9e5aa907bccfcd9cfc518bd25f758fcc494533ac367908e01` |
| `export.golden.txt` | `ae3fc532c2481fd9e5aa907bccfcd9cfc518bd25f758fcc494533ac367908e01` |
| `legacy.json` | `07eef04155d2f1dd57ef074c12ba4310ac7a15584980d1a9e8dec2a9206ead7f` |
| `migrated.golden.json` | `ae3fc532c2481fd9e5aa907bccfcd9cfc518bd25f758fcc494533ac367908e01` |

A fonte operacional desses digests é `packages/test-fixtures/save/pb06/hashes.md`.
`save:hashes:check` compara a tabela publicada com o arquivo e com o sidecar `.sha256`.
`save:check` entra em `check` e em `verify`.

## Política de regeneração de golden

Golden divergente **nunca** é reescrito para fazer um teste passar. Regenerar exige, nesta ordem:

1. causa identificada e reproduzida;
2. quando a semântica das regras mudou, bump explícito de `SIMULATION_RULES_VERSION`;
3. `run --out` sobre a fixture, com os quatro `.sha256` e o `hashes.md` regerados juntos;
4. atualização desta tabela de hashes e do handoff no `STATE.md` do playbook correspondente;
5. registro da causa no handoff.

Divergência intermitente, golden que muda sem causa identificada e necessidade de alterar regra do
kernel para o replay passar são condições de parada, não de regeneração.
