# Contrato de replay determinístico

**Escopo:** formato canônico, snapshot em disco, command log, CLI `tools/replay`, exit codes, hashes
congelados da fixture `pb-03-kernel-coverage` e política de regeneração de golden.

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

**Retomada é fiel em qualquer fronteira.** As intents decididas por `S3 ai` no fim do tick `T` para o
tick `T + 1` viajam no snapshot em `pendingIntents`, então `buildReplayArtifacts` não recusa mais
retomada por quiescência e `isKernelQuiescent` não existe. A fronteira congelada da fixture continua
sendo o tick `117`; os testes de `tools/replay` cobrem também o tick `13`, que comprovadamente deve
uma intent decidida, e varrem todas as fronteiras de `0` a `24`.

## Command log

JSONL. Primeira linha é o cabeçalho:

```text
{"kind":"header","rulesVersion":1,"scenarioId":"...","scenarioRevision":1,"schemaVersion":2,"seed":"...","tickCount":200}
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
```

`run` executa o log do tick zero até `header.tickCount`. Com `--out`, escreve `snapshot.golden.json`,
`events.golden.jsonl` e os quatro `.sha256`. Duas execuções limpas produzem arquivos byte-idênticos.

`verify` recalcula os artefatos e compara **byte a byte** contra os golden, e também confere os quatro
digests `.sha256` contra os arquivos que eles descrevem.

`hash` imprime o SHA-256 dos bytes do arquivo.

### Exit codes

| Código | Significado | Exemplos |
|---|---|---|
| `0` | sucesso | golden idêntico ao recalculado |
| `1` | divergência | seed, comando ou golden alterado; `rulesVersion`/cenário divergente; digest `.sha256` que não bate |
| `2` | entrada inválida | JSON malformado, arquivo ausente, argumento faltando, emissor proibido, schema reprovado |

A distinção é deliberada: `1` significa "o documento foi lido e não corresponde a esta run";
`2` significa "o documento não pôde ser lido".

## Gate

```text
corepack pnpm simulation:check
```

Está incluído em `check` e em `verify`, depois de `assets:check`. É idempotente: duas execuções
seguidas devolvem `0`.

## Hashes congelados

Fixture `pb-03-kernel-coverage`, revisão `1`, seed `0f1e2d3c4b5a6978`, `200` ticks, retomada em `117`,
`SIMULATION_SCHEMA_VERSION = 2`, `SIMULATION_RULES_VERSION = 1`:

| Arquivo | SHA-256 |
|---|---|
| `scenario.json` | `056d869682ba13241f7444ae2df39bc68100c867b1ee71d2dca973fec370b3f1` |
| `commands.jsonl` | `c1e815c663dcddf0d2d651bdf0b136d4e2a50f85f66912f2114f78dab0ce0d9c` |
| `snapshot.golden.json` | `9d0c3a249b6e72daf0bce868824eb17a80b0cf4153ab05f6f7b7d50dae5f7260` |
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

## Cobertura da fixture

Grid 16×16 em `z = 7`. Parede horizontal em `y = 8`, corredor de largura 1 em `x = 5` entre paredes
em `x = 4` e `x = 6`, e um único tile em `(2,1)` que serve de terreno bloqueante e de canto proibido.

Blueprints: `walker` (`stepCooldownTicks: 2`, `inert`), `wanderer` (`stepCooldownTicks: 3`, `wander`)
e `statue` (`stepCooldownTicks: 0`, `inert`). Quatro atores iniciais.

O log de 13 comandos cobre passo válido, cooldown, fora de limites, terreno, diagonal ilegal, destino
ocupado, entidade inexistente, spawn e despawn, além de `actor/face` e `actor/wait`. A run emite 59
eventos e exercita os seis tipos de evento e as cinco causas de bloqueio.

## Política de regeneração de golden

Golden divergente **nunca** é reescrito para fazer um teste passar. Regenerar exige, nesta ordem:

1. causa identificada e reproduzida;
2. quando a semântica das regras mudou, bump explícito de `SIMULATION_RULES_VERSION`;
3. `run --out` sobre a fixture, com os quatro `.sha256` regerados juntos;
4. atualização desta tabela de hashes e do handoff em `docs/playbooks/PB-03/STATE.md`;
5. registro da causa no handoff.

Divergência intermitente, golden que muda sem causa identificada e necessidade de alterar regra do
kernel para o replay passar são condições de parada, não de regeneração.
