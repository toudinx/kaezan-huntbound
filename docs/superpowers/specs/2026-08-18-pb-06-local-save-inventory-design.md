# PB-06 — Save local e inventário

**Status:** aprovado
**Data:** 2026-08-18
**Playbook:** `docs/playbooks/PB-06/README.md`
**Fontes normativas:** `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md` (seção "Persistência e
confiança"), `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md` (contrato transversal de save),
`docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`, `docs/architecture/PACKAGE_BOUNDARIES.md`,
`docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`.

## Contexto

PB-03, PB-04 e PB-05 entregaram uma caçada determinística: o Knight anda, golpeia, conjura, mata
rotworms e recebe loot, e a sessão inteira é reproduzível byte a byte em Node e no browser. Nada
disso sobrevive a um `F5`. Recarregar a página descarta a run e o loot.

O que já existe e este playbook **reaproveita**:

- `SimulationSnapshot` v4 é serializável, sem float, e a retomada por snapshot converge em todas as
  fronteiras — provado por `simulation:check`, `hunt:check` e `combat:check`.
- `projectRunBag` (`packages/content/src/runtime/runBag.ts`) dobra os eventos `loot/granted` numa
  bolsa ordenada e incremental, **fora** do kernel.
- `encodeCanonicalJson` (`packages/simulation/src/state/canonicalJson.ts`) é o codificador canônico
  de todos os goldens da árvore.
- `packages/save` existe como esqueleto (`export {}`) e a política de dependências já o autoriza a
  depender de `@huntbound/contracts` e `@huntbound/simulation`.
- `KernelProbe` e `AssetRuntimeProbe` são o padrão estabelecido para provar no browser aquilo que o
  Node não consegue exercitar.

A interface do repositório **já está congelada** pela ADR-05:

```ts
export interface SaveRepository {
  load(): Promise<GameSave>;
  transact<T>(operation: (draft: GameSave) => T): Promise<T>;
  export(): Promise<string>;
  import(serialized: string): Promise<void>;
}
```

## Objetivos

1. Persistir e retomar uma run em andamento sem alterar uma única regra do kernel.
2. Consolidar o loot da run numa bolsa persistente entre runs, sem duplicação acidental.
3. Provar que persistir, exportar, importar e retomar **não altera a simulação**: o snapshot final
   continua sendo o mesmo SHA-256 golden do PB-05.
4. Deixar a máquina de migração testada e usada, para que PB-07 e PB-08 acrescentem seus campos sem
   inventar persistência nova.
5. Manter `verify` verde e idempotente, com um gate `save:check` no mesmo padrão dos anteriores.

## Fora de escopo

- Equipar item, trocar arma, usar consumível, capacidade e peso.
- XP, level e progressão de skill. A ficha continua sendo conteúdo congelado do PB-05.
- Coleção de outfits, `outfitTokens` e moeda de gacha — PB-07 e PB-08.
- Segunda hunt, seleção de hunt em runtime e menu de mundo.
- Backend, conta, sincronização remota.
- Criptografia, assinatura ou anti-tamper do save.
- Qualquer alteração em `packages/simulation`, no schema do kernel ou nos goldens de PB-03, PB-04 e
  PB-05.

## Direção escolhida

### 1. Um documento, uma transação

O save é **um** registro `GameSave` na object store `save`, sob a chave `'default'`, no banco
`huntbound-save` versão `1`.

`transact` abre uma transação `readwrite`, lê o documento, entrega o rascunho à operação, valida o
resultado pelo schema e grava — tudo dentro da **mesma** transação IndexedDB. Se a operação lançar,
a transação aborta e nada é escrito.

A alternativa — múltiplas stores com um ledger de operações — foi rejeitada. O V0 é pessoal e de um
único documento pequeno; um ledger custaria complexidade real para resolver um problema que não
existe. A ADR já diz que o objetivo é impedir corrupção e duplicação acidental, não impedir o dono
de editar seus dados.

### 2. A bolsa persistida existe desde o primeiro loot, não só no fim da run

`projectRunBag` continua sendo a projeção fora do kernel. O save guarda `session.bag` **junto** do
snapshot, no mesmo checkpoint.

Concluir ou abandonar a run é uma transação única: `session.bag` soma em `stash`, `session` vira
`null`, `completedRuns` incrementa.

Isso torna a consolidação **idempotente por construção**: uma segunda tentativa não encontra sessão e
não faz nada. Não existe `runId`, chave de idempotência, ledger nem contador de reconciliação —
porque a única fonte da bolsa não consolidada é a própria sessão, e ela é destruída no mesmo ato que
a consolida.

Também torna o loot **resistente a crash**: se a aba morrer no meio da run, o checkpoint seguinte já
tem a bolsa, e a retomada continua de onde parou com o loot intacto.

### 3. Retomada é snapshot, não command log

O save persiste `SimulationSnapshot` e nada mais da simulação. O command log fica fora.

PB-03 provou que a retomada por snapshot converge em qualquer fronteira, e PB-04 e PB-05 varreram
todas as fronteiras das suas fixtures. Persistir o log seria pagar crescimento sem teto durante a run
para reprovar algo que já está provado.

Consequência aceita: o save **não** guarda o histórico da run. Depuração de uma run específica
continua sendo trabalho de `tools/replay` sobre uma fixture, não do save.

### 4. Descarte preserva a bolsa

Uma sessão persistida é retomável somente quando **todos** estes campos batem com o cenário do boot:

| Campo | Comparado contra |
|---|---|
| `session.scenarioId` | `scenario.scenarioId` |
| `session.scenarioRevision` | `scenario.scenarioRevision` |
| `session.seed` | a seed do cenário construído |
| `session.snapshot.schemaVersion` | `SIMULATION_SCHEMA_VERSION` |
| `session.snapshot.rulesVersion` | `SIMULATION_RULES_VERSION` |

Divergência em qualquer um deles **não** é erro e **não** é retomada forçada: a sessão é descartada
com diagnóstico, e a bolsa dela é consolidada em `stash` na mesma transação do descarte.

A regra existe porque este caso é certo, não hipotético: todo bump de `SIMULATION_SCHEMA_VERSION`
invalida as sessões gravadas por qualquer build anterior. Descartar em silêncio perderia o loot já
ganho; retomar à força injetaria estado inválido no kernel. Consolidar e descartar é a única saída
que não mente para o jogador nem para o kernel.

### 5. Núcleo puro, driver na borda

```text
@huntbound/contracts   GameSave v1 · SaveDraft · ActiveRunState · RunBagEntry · schema Zod
        │
@huntbound/save        SaveRepository ── porta SaveDriver ──┬── MemorySaveDriver    (Node, testes)
                       migrações · export/import canônico   └── IndexedDbSaveDriver (browser)
        │
@huntbound/game        autosave · retomada no boot · painel DOM · SaveProbe
```

O driver IndexedDB não é testável em Vitest sem dependência externa nova, e dependência nova está
proibida. Ele é provado onde roda: Playwright mais `SaveProbe`, no padrão de `KernelProbe` e
`AssetRuntimeProbe`. Todo o resto — schema, migração, semântica de transação, fila serial,
export/import — é testado em Node sobre `MemorySaveDriver`, sem browser e sem mock de IndexedDB.

A porta é estreita de propósito:

```ts
export interface SaveDriver {
  /** Devolve o documento opaco gravado, ou `null` quando a chave nao existe. */
  read(): Promise<unknown>;
  runTransaction<T>(operation: (current: unknown) => TransactionOutcome<T>): Promise<T>;
  close(): void;
}

export interface TransactionOutcome<T> {
  readonly document: unknown;
  readonly result: T;
}
```

O driver não conhece `GameSave`, versão nem migração. Ele move documentos opacos e garante
atomicidade. Toda regra vive no repositório.

### 6. `RunBagEntry` muda de casa

`RunBagEntry` sai de `packages/content/src/runtime/runBag.ts` e passa a ser declarada em
`@huntbound/contracts`. `@huntbound/save` não pode depender de `@huntbound/content`, e `content` já
depende de `contracts`.

`projectRunBag` **permanece** em `@huntbound/content` — é ela que sabe traduzir `itemIndex` em
`itemKey`, e essa tradução é conhecimento de catálogo. Só o tipo migra; a função e seus testes
seguem no lugar, reimportando o tipo.

Esta é a única refatoração de código existente prevista pelo playbook.

### 7. Sem checksum no export

O documento exportado é JSON canônico e nada mais. Não há checksum, assinatura nem HMAC.

A ADR é explícita: no V0 pessoal, o dono modificar o próprio save **não é ameaça**. Um checksum
bloquearia exatamente o uso sancionado — editar um save à mão para depurar — e não protegeria contra
nada que a validação de schema já não pegue. JSON truncado falha no parse; documento fora do schema
falha na validação; versão desconhecida é recusada explicitamente.

Isto é uma **redução deliberada** em relação ao esboço aprovado em conversa, e está registrada aqui
para não ser reintroduzida por engano.

### 8. A migração é provada por um caso real

`SAVE_SCHEMA_VERSION = 1`. O registro de migrações tem exatamente uma entrada, e ela é honesta: um
documento **sem** `schemaVersion` — um save legado, ou editado à mão, ou gravado por um build anterior
ao versionamento — é migrado para v1.

Não se inventa uma "v0 histórica" que nunca existiu para dar aparência de cobertura. O que precisa
estar provado é a máquina: aplicar a cadeia em ordem, parar na versão corrente, recusar versão futura
desconhecida em vez de rebaixar em silêncio, e falhar alto quando um documento não corresponde a
nenhuma forma conhecida.

## Parâmetros congelados

| Parâmetro | Valor |
|---|---|
| `SAVE_SCHEMA_VERSION` | `1` |
| Banco IndexedDB | `huntbound-save`, versão `1` |
| Object store | `save`, chave explícita `'default'` |
| `SIMULATION_SCHEMA_VERSION` | `4` — **inalterado** |
| `SIMULATION_RULES_VERSION` | `3` — **inalterado** |
| Cadência de checkpoint | a cada `200` ticks (`10 s` a `50 ms/tick`) |
| Checkpoints extras | fim de run, abandono de run e `pagehide` |
| Fixture do gate | `pb-06-save-session`, derivada de `pb-05-hunt-combat` |
| Tick do checkpoint congelado | `1400` |
| Tick final da retomada | `2700`, o mesmo do PB-05 |
| Codificação do export | `encodeCanonicalJson` mais um LF final |
| Ordenação de `stash` e `bag` | por `itemKey`, code unit UTF-16 crescente |

## Contratos

### `GameSave` v1

```ts
export const SAVE_SCHEMA_VERSION = 1;

export interface RunBagEntry {
  readonly itemKey: string;
  readonly count: number;
}

export interface ActiveRunState {
  readonly huntId: string;
  readonly scenarioId: string;
  readonly scenarioRevision: number;
  readonly seed: Seed;
  readonly snapshot: SimulationSnapshot;
  readonly bag: readonly RunBagEntry[];
}

export interface GameSave {
  readonly schemaVersion: number;
  readonly stash: readonly RunBagEntry[];
  readonly completedRuns: number;
  readonly session: ActiveRunState | null;
}
```

Regras do schema, todas executáveis por Zod em `@huntbound/contracts`:

- `count` é inteiro `>= 1`; entrada com `count` zero não existe, é ausência.
- `itemKey` é único dentro de `stash` e dentro de `bag`.
- `stash` e `bag` estão ordenadas por `itemKey`; ordem errada é documento inválido, não algo a
  corrigir em silêncio.
- `completedRuns` é inteiro `>= 0`.
- `snapshot` é validado pelo schema de snapshot que já existe em
  `packages/contracts/src/simulation/schemas.ts`; PB-06 não escreve um segundo validador de snapshot.

### Rascunho mutável

A ADR congela `transact<T>(operation: (draft: GameSave) => T): Promise<T>`. `GameSave` é `readonly`
em toda leitura, então o rascunho recebe o tipo espelho mutável:

```ts
export type SaveDraft = {
  -readonly [K in keyof GameSave]: GameSave[K];
};

transact<T>(operation: (draft: SaveDraft) => T): Promise<T>;
```

**Desvio declarado:** a forma do contrato, seus quatro métodos e sua semântica são as da ADR; muda
apenas o tipo do parâmetro, de `GameSave` para seu espelho mutável, porque um rascunho `readonly` não
é rascunho. PB-06-01 registra a nota em `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`.

### Erros

Uma classe, no padrão de `AssetProviderError`:

```ts
export type SaveErrorCode =
  | 'SAVE_UNAVAILABLE'
  | 'SAVE_QUOTA_EXCEEDED'
  | 'SAVE_TRANSACTION_FAILED'
  | 'SAVE_DOCUMENT_INVALID'
  | 'SAVE_VERSION_UNSUPPORTED'
  | 'SAVE_UPGRADE_BLOCKED';

export class SaveError extends Error {
  readonly code: SaveErrorCode;
}
```

| Código | Causa |
|---|---|
| `SAVE_UNAVAILABLE` | `indexedDB` ausente, modo privado que o recusa, `open` rejeitado |
| `SAVE_QUOTA_EXCEEDED` | `QuotaExceededError` na escrita |
| `SAVE_TRANSACTION_FAILED` | transação abortada por erro do driver |
| `SAVE_DOCUMENT_INVALID` | JSON ilegível, ou documento reprovado pelo schema |
| `SAVE_VERSION_UNSUPPORTED` | `schemaVersion` maior que `SAVE_SCHEMA_VERSION` |
| `SAVE_UPGRADE_BLOCKED` | outra aba segura a versão antiga do banco (`blocked`) |

Nenhum deles é engolido. `apps/game` mostra o estado de erro; o jogo não finge ter salvo.

## Ciclo de vida da sessão

```text
boot
 └─► load()
      ├─ session compatível ......► retoma o kernel a partir de session.snapshot
      ├─ session incompatível ....► transação: bag → stash, session = null, e começa run nova
      └─ session ausente .........► começa run nova

durante a run
 └─► a cada 200 ticks, no fim do tick: captura síncrona do snapshot e da bolsa,
     escrita assíncrona fora do laço, coalescida — o checkpoint mais novo vence

fim ou abandono da run
 └─► transação única: stash += bag, completedRuns += 1, session = null
```

Três regras que a implementação não pode violar:

1. **A captura é síncrona na fronteira do tick; a escrita nunca é.** O laço de tick não espera
   IndexedDB.
2. **Escritas são coalescidas, nunca enfileiradas sem teto.** Se um checkpoint chega enquanto outro
   está em voo, o mais novo substitui o pendente. Existe no máximo uma escrita em voo e no máximo
   uma pendente.
3. **Falha de checkpoint não derruba a run.** Ela é publicada como estado de erro e o jogo continua;
   o checkpoint seguinte tenta de novo.

## Export e import

`export()` devolve `encodeCanonicalJson(document)` mais um LF final. Duas chamadas com o mesmo
documento devolvem a mesma string, byte a byte.

`import(serialized)` faz, nesta ordem:

1. `JSON.parse`; falha vira `SAVE_DOCUMENT_INVALID`;
2. lê `schemaVersion`; maior que `SAVE_SCHEMA_VERSION` vira `SAVE_VERSION_UNSUPPORTED`;
3. aplica a cadeia de migrações;
4. valida pelo schema; falha vira `SAVE_DOCUMENT_INVALID`;
5. **substitui** o documento inteiro numa transação única.

Import é substituição, não fusão. Fundir dois saves exigiria uma política de conflito por item que
ninguém pediu e que não tem resposta única.

## O gate `save:check`

A fixture `pb-06-save-session` deriva de `pb-05-hunt-combat` e vive em
`packages/test-fixtures/save/pb06/`, com sidecars `.sha256` e `hashes.md` no mesmo padrão das
fixtures de replay.

O CLI `tools/save/cli.ts verify` prova, em ordem:

1. rodar o cenário e o log do PB-05 do tick `0` ao `1400`, gravar o save por `MemorySaveDriver`, e
   comparar com `checkpoint.golden.json` byte a byte;
2. `export()` bate com `export.golden.txt` byte a byte, e duas exportações são idênticas;
3. `import()` do golden num repositório limpo, `load()`, e o documento carregado é igual ao gravado;
4. retomar o kernel a partir do snapshot **importado**, aplicar os comandos de `1400` a `2700`, e
   obter snapshot final byte-idêntico a `packages/test-fixtures/hunt/pb05/snapshot.golden.json`,
   com o mesmo SHA-256 do sidecar do PB-05;
5. migrar `legacy.json` e obter `migrated.golden.json` byte a byte;
6. `check-hashes` sobre o diretório da fixture.

O passo 4 é o coração do playbook: **persistir não pode alterar a simulação**. Se o save mexer em uma
única casa do snapshot, o SHA-256 do PB-05 denuncia.

`save:check` entra em `check` e em `verify`, e é registrado em `docs/simulation/REPLAY_CONTRACT.md`
no mesmo commit que cria a fixture.

## Gate de browser

`SaveProbe`, instalado apenas no profile `test`, expõe leitura, export, import e limpeza do save.
`tests/e2e/save-persistence.spec.ts` prova:

- jogar alguns ticks, recarregar a página, e a run retomar no mesmo tick com a bolsa intacta;
- concluir a run, recarregar, e o `stash` conter o loot consolidado uma única vez;
- export no browser produzir a mesma string que o Node produz para o mesmo documento;
- import de documento com versão futura ser recusado com `SAVE_VERSION_UNSUPPORTED` visível na UI;
- falha de persistência virar estado de erro observável, sem crash e sem run perdida.

Sem `retries`. A spec é provada com `--retries=0 --repeat-each=10`.

## Regressão obrigatória

| Artefato | Exigência |
|---|---|
| `packages/test-fixtures/simulation/pb03/**` | byte-idêntico |
| `packages/test-fixtures/hunt/pb04/**` e `pb04-respawn/**` | byte-idêntico |
| `packages/test-fixtures/hunt/pb05/**` | byte-idêntico |
| `packages/content/src/generated/hunts/venore-rotworm-cave/**` | byte-idêntico |
| `packages/content/src/generated/pb-01-contract-coverage.json` | byte-idêntico |
| `packages/simulation/src/**` | **nenhuma alteração** |

PB-06 não toca o kernel. Se alguma task precisar tocar, ela para e reporta.

## Lições anteriores que viram critério de aceite

- **D1 — estabilidade real.** `retries: 0`; spec nova provada com `--repeat-each=10`.
- **D2 — hash existe ou não se publica.** Todo SHA-256 citado é gerado do artefato real na árvore.
- **D3 — fixture entra no contrato.** `pb-06-save-session` é registrada em `REPLAY_CONTRACT.md` no
  mesmo commit que a cria.
- **D4 — lint é gate.** `biome check .` roda explicitamente antes de declarar qualquer task
  concluída, porque `verify` só roda `format:check`.
- **B5 — hunt-budget.** É bloqueio herdado e conhecido do PB-05; PB-06 não o mascara, não o
  contorna com retry e não o declara fechado sem evidência fresca.

## Critérios de aceite do design

- [ ] O save é um documento único, versionado, gravado e lido em transação atômica.
- [ ] `transact` que lança não escreve nada.
- [ ] Duas `transact` concorrentes não interleavam leitura e escrita.
- [ ] A bolsa da run é consolidada exatamente uma vez, provado por dupla consolidação.
- [ ] Sessão incompatível é descartada com a bolsa preservada em `stash`.
- [ ] Export é canônico, estável e idêntico em Node e no browser.
- [ ] Import recusa versão futura e documento inválido com códigos distintos.
- [ ] A migração do documento sem versão para v1 é byte-idêntica ao golden.
- [ ] Retomar do save importado reproduz o snapshot final golden do PB-05.
- [ ] `packages/simulation` não mudou e todos os goldens continuam byte-idênticos.
- [ ] `save:check` está em `check` e `verify` e registrado em `REPLAY_CONTRACT.md`.
- [ ] A persistência é jogável e observável nos quatro viewports, sem `retries`.
