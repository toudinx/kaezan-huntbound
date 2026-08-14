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

**Retomada só é fiel em fronteira quiescente.** `S3 ai` decide no fim do tick `T` uma intent aplicada
em `T + 1`, e essa fila interna não tem campo no snapshot. `isKernelQuiescent(kernel)` responde se a
fronteira é restaurável; `tools/replay` recusa uma retomada não quiescente com `SIM_REPLAY_DIVERGED`.
A fronteira congelada da fixture, o tick `117`, é quiescente, e isso é verificado a cada execução dos
testes de `tools/replay`.

## Command log

JSONL. Primeira linha é o cabeçalho:

```text
{"kind":"header","rulesVersion":1,"scenarioId":"...","scenarioRevision":1,"schemaVersion":1,"seed":"...","tickCount":200}
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
`SIMULATION_SCHEMA_VERSION = 1`, `SIMULATION_RULES_VERSION = 1`:

| Arquivo | SHA-256 |
|---|---|
| `scenario.json` | `1f1fc443bda88d73d2d76f28e9486b515f1c310f14fa441feb40c5090206ba10` |
| `commands.jsonl` | `08a6b65ae44f2b188803890c4b153c84a7d75b444d68b4a72b8e963995badac5` |
| `snapshot.golden.json` | `bc8068569b0e13c379f50648027579e76bb269258ee317ceafab626d7fd4db38` |
| `events.golden.jsonl` | `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4` |

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
