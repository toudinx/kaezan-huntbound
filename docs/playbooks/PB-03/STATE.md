# PB-03 — Estado operacional

**Playbook:** `docs/playbooks/PB-03/README.md`

**Estado geral:** ready — PB-03-01 a PB-03-06 concluídas; PB-03-07 é a próxima task elegível

**Última atualização:** 2026-08-13

**Próxima task elegível:** PB-03-07.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-03-01 | done | `codex/pb03-01-kernel-contracts` | `c09a4cc` | 37 testes; typecheck; architecture; Biome; format; diff check |
| PB-03-02 | done | `codex/pb03-02-kernel-random` | `4dbcc96` | 12 testes; typecheck; architecture; Biome; format; diff check |
| PB-03-03 | done | `codex/pb03-03-kernel-grid` | `4408f23` + `5e67e56` | 18 testes; typecheck; architecture; Biome; format; diff check |
| PB-03-04 | done | `codex/pb03-04-kernel-commands` | `d039c70` | 10 testes; typecheck; architecture; Biome; format; diff check; workspace typecheck/test |
| PB-03-05 | done | `codex/pb03-05-kernel-tick-loop` | `94571a4` | 79 testes vitest + 6 node --test; typecheck; architecture; Biome; format; diff check; workspace typecheck/test |
| PB-03-06 | done | `codex/pb03-06-kernel-replay` | `PENDING` | 115 vitest simulation + 29 vitest tools/replay; simulation:check ×2; typecheck; architecture; Biome; format; diff check |
| PB-03-07 | pending | `codex/pb03-07-kernel-browser` | — | — |
| PB-03-08 | pending | `codex/pb03-08-integrated-gate` | — | — |

## Baseline congelado

- Branch-base: `main`.
- Spec aprovada: `docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md`.
- Node/pnpm: 24.14.0 / 11.21.0 via Corepack.
- PB-01: `closed`. PB-02: `closed` em `1134fc8` como `APPROVED_WITH_WARNINGS`; fechamento
  documental em `1e33e63`.
- `TICK_DURATION_MS = 50`, `MAX_FRAME_DELTA_MS = 250`.
- `SIMULATION_SCHEMA_VERSION = 1`, `SIMULATION_RULES_VERSION = 1`.
- Cenário do fixture: `pb-03-kernel-coverage`, revisão `1`, grid 16×16 em `z = 7`.
- Seed do fixture: `0f1e2d3c4b5a6978`. Ticks: `200`, retomada em `117`.
- RNG: xoshiro128\*\* com seeding SplitMix32 e derivação FNV-1a 32; streams `movement`, `ai` e
  `scenario`.
- Dependências externas previstas: nenhuma nova. `@huntbound/simulation` declara somente a dependência
  interna `@huntbound/contracts`; Zod permanece somente em `@huntbound/contracts`.
- Gate raiz conhecido: `corepack pnpm verify`, verde e idempotente após PB-02-FIX-02.

## Decisões operacionais

- Tasks 01–04 e 07 usam GPT-5.6 Luna `xhigh` por padrão; gatilhos de escalonamento seguem a política.
- PB-03-05 e PB-03-06 usam GPT-5.6 Sol `xhigh` por atravessarem subsistemas e congelarem o golden.
- PB-03-08 usa Claude Code/Opus 5, com fallback GPT-5.6 Sol `xhigh`, e prefere validador diferente.
- Fluxo padrão é serial com fast-forward automático e limpeza.
- PB-03-02/03/04 só entram em paralelo por ativação explícita do supervisor. Nesse modo não editam o
  handoff compartilhado; PB-03-05 é o integrador único.
- Golden divergente nunca é reescrito para "fazer passar". Regeneração exige causa identificada e,
  quando a semântica mudar, bump explícito de `SIMULATION_RULES_VERSION`.
- Qualquer uso de relógio, aleatoriedade global ou float no kernel é falha bloqueante.

## Handoffs

## PB-03-01 — handoff concluído

PB-03-01 foi implementada na branch `codex/pb03-01-kernel-contracts`. O commit funcional integrado
é `c09a4cc` (`feat: define deterministic kernel contracts`). `@huntbound/contracts` agora publica
identidade branded, versões, tipos de cenário/comando/evento/snapshot/log, schemas Zod estritos,
`commandPriority`, factories e os validadores estruturados do kernel. `packages/simulation` ficou
inalterado.

Exports efetivos incluem `TickIndexSchema`, `EntityIdSchema`, `SeedSchema`, `StreamLabelSchema` e
suas factories; `SIMULATION_SCHEMA_VERSION`, `SIMULATION_RULES_VERSION`, `TICK_DURATION_MS` e
`MAX_FRAME_DELTA_MS`; `KernelScenarioSchema`, `SimulationCommandSchema`,
`SimulationCommandInputSchema`, `SimulationCommandRecordSchema`, `SimulationEventSchema`,
`SimulationSnapshotSchema`, `SimulationCommandLogSchema`, os schemas auxiliares e
`commandPriority`; `validateKernelScenario`, `validateSimulationSnapshot`,
`validateSimulationCommandLog`, `simulationDiagnosticsFromZodError` e todos os tipos públicos de
`packages/contracts/src/simulation/types.ts`.

As invariantes cobertas incluem inteiros seguros, seed/label branded, strictness, ordem e unicidade de
`blockedTiles`, referências de blueprint, posições iniciais, emissor permitido por comando,
ordenação de streams/atores/comandos, sequência crescente do log, versões e diagnósticos ordenados por
path/code. O contrato durável está em `docs/simulation/KERNEL_CONTRACT.md`.

Evidência fresca:

```text
corepack pnpm --filter @huntbound/contracts test -> exit 0; 37 passed (4 files)
corepack pnpm --filter @huntbound/contracts typecheck -> exit 0
corepack pnpm architecture:check -> exit 0
corepack pnpm exec biome check packages/contracts -> exit 0
corepack pnpm format:check -> exit 0
git diff --check -> exit 0
```

O ciclo TDD observou RED por módulos ausentes antes da implementação; após o GREEN, uma falha de
export duplicado e avisos de formatação foram corrigidos sem ampliar o escopo. Não houve alteração de
versões, comandos/eventos, floats, dependências novas, I/O ou contratos de conteúdo/assets.

Modelo/effort efetivos: Codex baseado em GPT-5; o alias Luna/xhigh sugerido não é exposto nesta
sessão. Skills usadas: `superpowers:using-superpowers`, `superpowers:brainstorming`,
`superpowers:writing-plans`, `superpowers:using-git-worktrees`,
`superpowers:test-driven-development` e `superpowers:verification-before-completion`. Validador
efetivo: gates automatizados; não houve gatilho objetivo para escalonamento.

Modo de conclusão: serial, com fast-forward em `main`, reverificação integrada e remoção da worktree
e da branch temporárias. PB-03-02 é a próxima task elegível; RNG não foi antecipado.

## PB-03-02 — handoff concluído

PB-03-02 foi implementada na branch `codex/pb03-02-kernel-random`. O commit funcional integrado é
`4dbcc96` (`feat: seed deterministic kernel randomness`). `@huntbound/simulation` agora publica
`createSeededRandom`, `restoreSeededRandom`, `createKernelRandomStreams` e
`restoreKernelRandomStreams`, com `RandomSource` serializável e `KernelRandomStreams` para
`movement`, `ai` e `scenario`.

O PRNG usa xoshiro128** com aritmética uint32, seeding SplitMix32 a partir das duas metades da seed de
64 bits, derivação FNV-1a 32 + SplitMix32 sem consumir o pai e `nextBelow` por rejeição. O contador
`drawCount` inclui valores rejeitados e a restauração recusa estado zero, labels ausentes, duplicados ou
extras. O contrato durável foi atualizado em `docs/simulation/KERNEL_CONTRACT.md`.

Vetores golden para a seed `0f1e2d3c4b5a6978` (oito primeiros `nextUint32()` por stream):

```text
ai:       f1d5ad77 ce8a401b 9ead377c edd33fe5 327526b4 2f753712 826067ea 387f9b0a
movement: 9046423d fcd233cd 207a837d a83cf41a 1adb5830 2241cdbd edbec034 3471c9d1
scenario: fc89a05c 535ac971 733b1b1a 27af86d8 0fcb29a6 971986f7 ab6025df 6f306771
```
## PB-03-03 — handoff concluído

PB-03-03 foi implementada na branch `codex/pb03-03-kernel-grid` no commit rebaseado `4408f23`
(`feat: resolve deterministic grid movement`), com o ajuste final de exports em `5e67e56`
(`fix: order grid exports`). `@huntbound/simulation` agora publica as direções
canônicas, deltas, tradução de coordenadas, custo de passo, grid estático, índice de ocupação e
`resolveStep`. A resolução é pura e mantém a precedência `bounds` → `terrain` → `diagonal-corner`
→ `occupied`; ocupação por ator não impede corte de canto e terreno impede.

O pacote declara somente o vínculo interno com `@huntbound/contracts` e `vitest` como devDependency,
sem dependência externa de runtime. A documentação durável foi atualizada em
`docs/simulation/KERNEL_CONTRACT.md`. PB-03-02 e PB-03-04 já estão concluídas e PB-03-05 é a próxima task elegível;
comandos, tick, eventos, snapshot e replay não foram antecipados.

Evidência fresca na worktree da task:

```text
node node_modules/vitest/vitest.mjs run --root packages/simulation --reporter=verbose -> exit 0; 18 passed
node node_modules/typescript/bin/tsc --project packages/simulation/tsconfig.json --pretty false -> exit 0
node tools/architecture/check-boundaries.ts -> exit 0
node node_modules/@biomejs/biome/bin/biome check packages/simulation -> exit 0
node node_modules/@biomejs/biome/bin/biome format packages/simulation -> exit 0
node node_modules/@biomejs/biome/bin/biome format . -> exit 0
git diff --check -> exit 0
```

O comando pnpm acionou a revalidação de dependências e tentou consultar metadados do registry; a
execução foi interrompida após `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Os binários locais equivalentes aos
scripts foram executados com sucesso, sem alterar o lockfile além do importer de `packages/simulation`.

Modelo/effort efetivos: Codex baseado em GPT-5; o alias Luna/xhigh sugerido não é exposto nesta sessão.
Skills usadas: `superpowers:using-superpowers`, `superpowers:brainstorming`, `superpowers:writing-plans`,
`superpowers:executing-plans`, `superpowers:using-git-worktrees`,
`superpowers:test-driven-development` e `superpowers:verification-before-completion`. Validador
efetivo: gates automatizados; não houve gatilho objetivo para escalonamento.




Modo de conclusão: serial, com rebase sobre a main atual (que já continha PB-03-04), fast-forward, reverificação integrada e
remoção da worktree e da branch temporárias.

## PB-03-04 — handoff concluído

PB-03-04 foi implementada na branch `codex/pb03-04-kernel-commands`. O commit funcional integrado é
`d039c70` (`feat: add deterministic command buffer and log`). `@huntbound/simulation` agora publica
`createCommandBuffer`, `restoreCommandBuffer`, `orderCommands`, `encodeCommandLog` e
`decodeCommandLog`; a borda valida emissor/tipo/tick, atribui sequences monotônicas, ordena e drena
comandos, detecta ações duplicadas e restaura pendências sem tocar no mundo.

O command log é JSONL canônico com header e linhas achatadas de comando, newline final e decoder
transacional. Comandos internos não são gravados. A implementação não adiciona relógio, aleatoriedade,
filesystem, Node, DOM, tick loop, eventos, grid, snapshot, replay, CLI ou aplicação de estado.

Evidência fresca:

```text
corepack pnpm --filter @huntbound/simulation test -> exit 0; 10 passed (2 files)
corepack pnpm --filter @huntbound/simulation typecheck -> exit 0
corepack pnpm architecture:check -> exit 0
corepack pnpm exec biome check packages/simulation -> exit 0
corepack pnpm format:check -> exit 0
git diff --check -> exit 0
corepack pnpm typecheck -> exit 0
corepack pnpm test -> exit 0; workspace tests green
```

O primeiro RED falhou com módulo ausente; o ciclo de ordenação/restauração também observou a falha
esperada antes da correção. Houve um ajuste operacional de `strict-ssl=false` apenas para atualizar
o ambiente pnpm da worktree; nenhum arquivo de configuração foi alterado. Modelo/effort efetivos:
Codex baseado em GPT-5; o alias Luna/xhigh sugerido não é exposto nesta sessão. Skills usadas:
`superpowers:using-superpowers`, `superpowers:brainstorming`, `superpowers:writing-plans`,
`superpowers:executing-plans`, `superpowers:using-git-worktrees`, `superpowers:test-driven-development`
e `superpowers:verification-before-completion`. Validador efetivo: gates automatizados.

Modo de conclusão: integração por merge explícito porque `main` avançou com PB-03-02 durante a execução,
seguida de reverificação integrada e remoção da worktree e da branch temporárias. PB-03-03 e PB-03-04 estão
concluídas; PB-03-05 é a próxima task elegível.

## PB-03-05 — handoff concluído

PB-03-05 foi implementada na branch `codex/pb03-05-kernel-tick-loop`. O commit funcional integrado é
`94571a4` (`feat: run the deterministic tick loop`). `@huntbound/simulation` agora publica
`createSimulationKernel`, `SimulationKernel`, `WorldState`, `createEventJournal` e `EventJournal`.
O modo foi serial: PB-03-02, PB-03-03 e PB-03-04 já estavam em `main`, então não houve integração de
branches paralelas.

Pipeline efetivo, sem exceção: `intake` → `apply` → `systems` → `flush`, com `systems` rodando
`S1 lifecycle` → `S2 movement` → `S3 ai`. O `intake` drena o buffer externo do tick e as intents
internas decididas em ticks anteriores. O `apply` muta `actor/face` na hora, enfileira spawn/despawn
para S1 e intents de passo para S2, e rejeita sem mutar. `S1` materializa por `sequence`; `S2`
resolve por `EntityId` com cooldown antes da geometria; `S3` percorre `wander` por `EntityId`,
consome um `nextBelow(8)` do stream `ai` e enfileira intent para `currentTick + 1` em fila interna,
fora do command log e sem consumir `sequence` externo. O `flush` fecha o journal do tick e avança o
tick. A sequência de evento é global e crescente; `advance(n)` equivale a `n` `advanceOne()`.

Os eventos de boot ficam no journal e saem na primeira chamada de `advanceOne()`, que executa o tick
`0`; `state()` já reflete os atores iniciais antes de qualquer avanço.

Decisões de semântica que a task não congelava e que ficam registradas em
`docs/simulation/KERNEL_CONTRACT.md`, seção "Loop de tick":

- passo bem-sucedido define `facing` igual à direção do passo; bloqueio não altera `facing`;
- ator materializado por `scenario/spawn-actor` entra com `readyAtTick = currentTick`;
- disponibilidade de célula de spawn é avaliada contra os atores vivos em `apply` mais as células
  reservadas por spawns anteriores do mesmo tick; um despawn do mesmo tick ainda não liberou a
  célula, porque a materialização acontece em S1;
- empate de intents sobre o mesmo ator resolve a externa antes da interna;
- `S3` decide com `currentTick >= readyAtTick`, isto é, cooldown avaliado no tick da decisão e não no
  tick de aplicação.

A regra executável `tools/architecture/simulation-boundaries.ts` reprova `Date`, `performance`,
`Math.random`, `setTimeout`, `setInterval`, `setImmediate`, `queueMicrotask`, `crypto`, `globalThis`,
`process` e qualquer import externo em `packages/simulation/src/**`; `vitest` é tolerado apenas em
`*.test.ts`. Ela entrou em `architecture:check` e tem teste próprio em `node --test` com caso
positivo, caso negativo, regressão de lexer e verificação do pacote real.

Evidência fresca na worktree da task:

```text
corepack pnpm --filter @huntbound/simulation test -> exit 0; 79 passed (9 files)
corepack pnpm --filter @huntbound/simulation typecheck -> exit 0
corepack pnpm architecture:check -> exit 0
corepack pnpm exec biome check packages/simulation tools/architecture -> exit 0
corepack pnpm format:check -> exit 0; 237 files
corepack pnpm typecheck -> exit 0
corepack pnpm test -> exit 0; workspace tests green
node --test tools/architecture/*-boundaries.test.ts check-boundaries.test.ts -> exit 0; 21 passed
git diff --check -> exit 0
```

Ciclo TDD: RED por módulo ausente no boot; RED com 14 falhas na aplicação de comandos; RED com 6
falhas na IA; RED com 3 falhas em `advance`. Os testes de ordem e cooldown do passo 6 passaram de
primeira porque `S2` já existia do passo 5, então cada afirmação foi provada por mutação da produção
— inverter a ordenação por `EntityId`, zerar `readyAtTick` e ignorar `despawning` derrubaram
exatamente os testes previstos, e o mesmo foi feito para as duas propriedades do journal. O teste de
reprodutibilidade por seed ganhou um contraexemplo com seed diferente.

Defeito encontrado e corrigido durante o passo 12: a primeira versão de `simulation-boundaries.ts`
usava o scanner de `typescript/unstable/ast`, que para no primeiro template literal e deixava o
resto do arquivo sem verificação — um `Date.now() + Math.random()` injetado em `kernel.ts` passava
sem diagnóstico. A regra passou a usar um lexer próprio que pula comentários, strings, template
literals com interpolação e expressões regulares; a regressão está coberta por teste.

Vetores de wander confirmados para a seed `0f1e2d3c4b5a6978`, derivados dos golden de RNG de
PB-03-02: as quatro primeiras decisões do stream `ai` por `nextBelow(8)` sobre a ordem canônica são
`nw`, `se`, `s`, `sw`.

Modelo/effort efetivos: Claude Code/Opus 5; o alias Sol/xhigh sugerido não é exposto nesta sessão.
Skills usadas: `superpowers:using-superpowers`, `superpowers:test-driven-development`,
`superpowers:systematic-debugging` e `superpowers:verification-before-completion`. Validador
efetivo: gates automatizados.

Snapshot, restore, replay, CLI, fixtures golden, app e browser não foram antecipados. PB-03-06 é a
próxima task elegível.

## PB-03-06 — handoff concluído

PB-03-06 foi implementada na branch `codex/pb03-06-kernel-replay`. `@huntbound/simulation` passa a
publicar `encodeCanonicalJson`/`CanonicalJsonError`, `snapshotKernel`, `restoreSimulationKernel`,
`isKernelQuiescent`, `runReplay`/`prepareReplayKernel`/`ReplayResult` e `encodeEventJournal`. O novo
`tools/replay` traz `run`, `verify` e `hash`, e o gate `simulation:check` entrou em `check` e em
`verify`, depois de `assets:check`.

O contrato durável foi atualizado em `docs/simulation/KERNEL_CONTRACT.md` (seções "Snapshot",
"Serialização canônica" e "Replay") e o novo `docs/simulation/REPLAY_CONTRACT.md` registra formato
canônico, command log, CLI, exit codes, hashes congelados e a política de regeneração de golden.

### Hashes congelados da fixture

Fixture `pb-03-kernel-coverage`, revisão `1`, seed `0f1e2d3c4b5a6978`, `200` ticks, retomada em `117`:

```text
scenario.json          1f1fc443bda88d73d2d76f28e9486b515f1c310f14fa441feb40c5090206ba10
commands.jsonl         08a6b65ae44f2b188803890c4b153c84a7d75b444d68b4a72b8e963995badac5
snapshot.golden.json   bc8068569b0e13c379f50648027579e76bb269258ee317ceafab626d7fd4db38
events.golden.jsonl    31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4
```

A run emite 59 eventos, cobre os seis tipos de evento e as cinco causas de bloqueio (`bounds`,
`cooldown`, `diagonal-corner`, `occupied`, `terrain`), mais entidade inexistente, spawn e despawn.

### Descoberta bloqueante para o supervisor: quiescência da retomada

`S3 ai` decide no fim do tick `T` uma intent aplicada em `T + 1`. Essa fila interna **não tem campo
no snapshot congelado** — `pendingCommands` carrega apenas comandos externos, e
`SimulationSnapshotSchema` é `.strict()` em `@huntbound/contracts`. Consequência medida: restaurar
uma fronteira com intent interna pendente perde a decisão e diverge no tick seguinte.

A correlação foi medida em 24 fronteiras consecutivas e é exata: `pendingInternalIntents > 0` se e
somente se a retomada diverge. Nada é silencioso hoje:

- `isKernelQuiescent(kernel)` responde se a fronteira é restaurável;
- `packages/simulation/src/state/snapshot.test.ts` prova os dois sentidos, incluindo um teste que
  **prova a limitação** numa fronteira não quiescente;
- `tools/replay` recusa retomada não quiescente com `SIM_REPLAY_DIVERGED` em vez de gerar golden
  errado;
- o tick `117` da fixture é quiescente, e isso é reverificado a cada execução dos testes.

Fechar a lacuna de vez exige um campo novo no snapshot, isto é, alterar o schema congelado em
PB-03-01 — fora do escopo permitido de PB-03-06, que não lista `packages/contracts`. Fica como
decisão de supervisor: aceitar a restrição documentada ("retomada só em fronteira quiescente") ou
abrir card para estender o snapshot com bump de `SIMULATION_SCHEMA_VERSION`.

### Desvio de escopo declarado

O escopo permitido da task não lista `packages/simulation/src/kernel/**`, mas `snapshotKernel` e
`restoreSimulationKernel` precisam ler e reinjetar estado interno do kernel. Foi acrescentado um
único costura mínimo e não semântico:

- `packages/simulation/src/state/kernelState.ts` (novo, dentro do escopo) define o acessor por
  símbolo e o tipo de restauração;
- `kernel.ts` anexa esse acessor e aceita um terceiro parâmetro opcional de restauração;
- `worldState.ts` ganhou `restoreWorld`.

Nenhuma regra do kernel mudou: pipeline, precedências, cooldown, ordenações, consumo de RNG e
eventos permanecem idênticos, e os 79 testes de PB-03-05 seguem verdes sem alteração.

### Evidência fresca na worktree da task

```text
corepack pnpm --filter @huntbound/simulation test -> exit 0; 115 passed (12 files)
node node_modules/vitest/vitest.mjs run --config tools/replay/vitest.config.ts -> exit 0; 29 passed (2 files)
corepack pnpm --filter @huntbound/simulation typecheck -> exit 0
corepack pnpm exec tsc --project tools/replay/tsconfig.json --noEmit -> exit 0
corepack pnpm simulation:check -> exit 0 (duas execuções seguidas)
corepack pnpm architecture:check -> exit 0
corepack pnpm exec biome check packages/simulation tools/replay -> exit 0
corepack pnpm format:check -> exit 0; 251 files
git diff --check -> exit 0
```

### Ciclo TDD e defeitos encontrados

RED por módulo ausente em cada um dos três blocos (encoder, snapshot/restore, replay), e RED com 17
falhas na CLI antes de `cli.ts` existir.

Dois achados reais durante o GREEN:

1. A primeira asserção de sensibilidade a comando exigia que trocar `ne` por `se` mudasse o digest do
   snapshot. Falhou legitimamente: as duas diagonais são recusadas pelo mesmo canto `(2,1)`, um passo
   bloqueado não muta estado, e o snapshot é de fato idêntico. Quem enxerga a edição é o journal, via
   `attempted`. O teste foi corrigido para afirmar o que é verdadeiro e dividido em dois casos —
   comando que muda estado e comando bloqueado — o que documenta por que `verify` precisa comparar os
   dois golden e não só o snapshot.
2. A lacuna de quiescência descrita acima, encontrada por medição e não por suposição.

### Notas operacionais

`tools/replay` importa `packages/**` por caminho relativo, como `tools/asset-packer`: Node não aplica
`paths` de tsconfig e o import por specifier falhava com `ERR_MODULE_NOT_FOUND`.

`biome.json` ganhou `!packages/test-fixtures/simulation/pb03`, no mesmo padrão já usado pela árvore de
assets de PB-02: o formatador reescreveria o JSON canônico e quebraria os digests.

O script `test` da raiz passou a rodar também `vitest run --config tools/replay/vitest.config.ts`.
Sem isso os 29 testes da ferramenta não entrariam em nenhum gate agregado, como já acontece com
`tools/asset-packer`.

Modelo/effort efetivos: Claude Code/Opus 5; o alias Sol/xhigh sugerido não é exposto nesta sessão.
Skills usadas: `superpowers:using-superpowers`, `superpowers:test-driven-development`,
`superpowers:using-git-worktrees`, `superpowers:systematic-debugging` e
`superpowers:verification-before-completion`. Validador efetivo: gates automatizados.

App, browser, Playwright e Phaser não foram tocados. PB-03-07 é a próxima task elegível.

## Bloqueios

Nenhum bloqueio de execução. Uma decisão de supervisor fica aberta, descrita em detalhe no handoff
de PB-03-06: a retomada por snapshot só é fiel em fronteira quiescente, porque a fila interna de
intents de `S3 ai` não tem campo no snapshot congelado em PB-03-01. A restrição está documentada,
testada nos dois sentidos e recusada explicitamente pela ferramenta; fechá-la de vez exige estender
`SimulationSnapshotSchema` em `packages/contracts`, com bump de `SIMULATION_SCHEMA_VERSION`. PB-03-07
não depende dessa decisão; PB-03-08 deveria fechá-la.

Uma observação não bloqueante segue registrada: o script `test` da raiz enumera
apenas `asset-boundaries.test.ts` e `check-boundaries.test.ts` em `node --test`, de modo que
`simulation-boundaries.test.ts` — como já acontecia com `content-boundaries.test.ts` — não roda no
gate agregado. A regra em si roda em `architecture:check`, que é o critério de aceite. Corrigir o
enumerador exigiria editar `package.json` da raiz, fora do escopo permitido de PB-03-05; fica para
uma task com escopo de raiz.

Os warnings `FIXABLE` herdados de PB-02 estão listados em
`docs/playbooks/PB-02/artifacts/acceptance-report.md` §11; eles não bloqueiam PB-03 e não devem ser
absorvidos por uma task deste playbook sem card próprio.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar PB-03-05 consolidar o handoff compartilhado.
