# PB-03 — Relatório de aceite (PB-03-08)

**Decisão:** `APPROVED_WITH_WARNINGS`

## 1. Identificação

| Item | Valor |
|---|---|
| Data da auditoria | 2026-08-14 |
| Commit auditado | `f885535c0feb8091dfa20bc0b0364682c87027aa` (`docs: record PB-03-07 review hardening`) |
| Branch/worktree | `codex/pb03-08-integrated-gate` em `C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate` |
| SO | Microsoft Windows 11 Home Single Language, `10.0.26200.0` |
| Node | `v24.14.0` |
| pnpm | `11.21.0` via Corepack |
| Playwright | `1.62.1` |
| Browser | Chromium `151.0.7922.34` |

A auditoria é read-only para código, contratos, fixtures, golden e testes. Nenhum arquivo fora dos
cinco paths documentais permitidos foi alterado.

## 2. Estado inicial

```text
git -C C:\Kaezan\kaezan-huntbound status --short   -> vazio (árvore limpa)
git rev-parse HEAD                                 -> f885535c0feb8091dfa20bc0b0364682c87027aa
git worktree add ... -b codex/pb03-08-integrated-gate main -> ok
git -C <worktree> status --short                   -> vazio
corepack pnpm install --frozen-lockfile            -> exit 0; lockfile já atualizado; 70 pacotes
```

A origem estava limpa: PB-03-01 a PB-03-07 integradas em `main`, sem branch em disputa. Existe uma
worktree preexistente do usuário em `C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract`, que não
foi tocada.

## 3. Matriz de critérios

| Critério | Comando / prova | Resultado | Evidência curta |
|---|---|---|---|
| Auditoria parte de `main` limpo | `git status --short`, `git rev-parse HEAD` | PASS | vazio; `f885535` |
| Contratos | `pnpm --filter @huntbound/contracts test` | PASS | exit 0; 41 passed (4 files) |
| Kernel (unitários) | `pnpm --filter @huntbound/simulation test` | PASS | exit 0; 118 passed (12 files) |
| Ferramenta de replay | `vitest run --config tools/replay/vitest.config.ts` | PASS | exit 0; 31 passed (2 files) |
| Typecheck do kernel | `pnpm --filter @huntbound/simulation typecheck` | PASS | exit 0 |
| Typecheck de `tools/replay` | `tsc -p tools/replay/tsconfig.json --noEmit` | PASS | exit 0 |
| Vetores golden de RNG são teste | `packages/simulation/src/random/random.test.ts:203-213` | PASS | três streams, 8 valores cada |
| Custo diagonal é teste | `grid.test.ts:95-103` | PASS | `stepCostTicks(2,'se')=3`, `(3,'se')=5` |
| Precedência de bloqueio é teste | `grid.test.ts:183-282` | PASS | `bounds`/`terrain`/`diagonal-corner`/`occupied` + bounds antes de ocupação |
| Fronteira do kernel (gate) | `pnpm architecture:check` | PASS | exit 0 |
| Fronteira do kernel (varredura) | `git grep -E "Date\|performance\|Math.random\|..."` em `packages/simulation/src` | PASS | exit 1 (zero ocorrência, nem em comentário) |
| Regra viva reprova impureza | mutação em cópia temporária do kernel real | PASS | §9 |
| Kernel sem dependência externa | `packages/simulation/package.json` | PASS | só `@huntbound/contracts`; `vitest` como devDep |
| Kernel sem DOM | `packages/simulation/tsconfig.json` | PASS | `"lib": ["ES2022"]` |
| Duas execuções independentes | `cli.ts run --out .cache/replay/audit-a` e `audit-b` | PASS | §5 |
| Igualdade byte a byte com golden | comparação de bytes contra a fixture versionada | PASS | §5 |
| Retomada em `117` | direta `0→200` vs `0→117` + restore + `117→200` | PASS | §6 |
| Provas negativas e sensibilidade | nove casos em cópias temporárias | PASS | §7 |
| Paridade browser × Node | `playwright test tests/e2e/kernel-replay.spec.ts` | PASS | §8 |
| Probe test-only | inspeção + bundle `product` | PASS | §8 |
| Nenhuma regra em `apps/game` | `git grep` no scan da task | PASS | só `SimulationHost.ts`, importando do contrato |
| `simulation:check` | `pnpm simulation:check` | PASS | exit 0; quatro digests congelados |
| `verify` duas vezes | `pnpm verify` ×2 | PASS | exit 0 e exit 0; 9 E2E passed em cada |
| Idempotência da árvore | `git diff --check`, `git status --short` | PASS | exit 0; só o relatório novo, não rastreado |

## 4. Hashes da fixture

Calculados de forma independente com `Get-FileHash -Algorithm SHA256` (PowerShell), e não apenas
lidos da saída da própria ferramenta:

| Arquivo | SHA-256 |
|---|---|
| `scenario.json` | `056d869682ba13241f7444ae2df39bc68100c867b1ee71d2dca973fec370b3f1` |
| `commands.jsonl` | `c1e815c663dcddf0d2d651bdf0b136d4e2a50f85f66912f2114f78dab0ce0d9c` |
| `snapshot.golden.json` | `9d0c3a249b6e72daf0bce868824eb17a80b0cf4153ab05f6f7b7d50dae5f7260` |
| `events.golden.jsonl` | `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4` |

Os quatro batem com `docs/simulation/REPLAY_CONTRACT.md` §Hashes congelados e com o handoff de
PB-03-06-FIX-01 em `STATE.md`. Hash do snapshot final: `9d0c3a24…`, `tick = 200`.

## 5. Duas execuções independentes do replay

`cli.ts run --out` para `.cache/replay/audit-a` e `.cache/replay/audit-b`, em invocações separadas do
processo. Cada arquivo produzido foi hasheado por `Get-FileHash` e as duas listas foram ordenadas e
comparadas:

```text
commands.sha256        3dd7154b2b49a23e96da8cab4192546b513caa132016949cf30de3bc8e30b938
events.golden.jsonl    31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4
events.golden.sha256   9028f0e2b7a577d27cfdff5f9b05c5b98e444a2e4a9b92810d76fd0ab8cdbd91
scenario.sha256        9653df95c112a42f4f5a530b37677401381736f5222748a1d3a174e17143cb62
snapshot.golden.json   9d0c3a249b6e72daf0bce868824eb17a80b0cf4153ab05f6f7b7d50dae5f7260
snapshot.golden.sha256 c64b7fca870033967e45e40c5373e9c6fa4330cf107d5e7c59cfe46976ac9526
```

- mesmos arquivos relativos nos dois diretórios: sim (6 arquivos);
- `Compare-Object` entre as duas listas: **0 diferenças**;
- igualdade byte a byte com os golden versionados: `snapshot.golden.json` (1003 bytes),
  `events.golden.jsonl` (8100 bytes) e os dois sidecars, todos `identical=True`;
- os sidecars `scenario.sha256` e `commands.sha256` gerados batem com os versionados.

Varredura de contaminação nos artefatos produzidos: `CR_bytes=0`, `backslashes=0`, `abs_paths=0`,
`timestamp_like=0` em ambos os arquivos. Não há timestamp, path absoluto nem separador Windows dentro
do JSON, e as quebras de linha são LF.

Os dois diretórios foram removidos resolvendo cada path com `Resolve-Path` e confirmando que o
resultado começa pelo worktree de auditoria e termina exatamente no caminho esperado.

## 6. Prova de retomada por snapshot

Fronteira congelada `117`, `tickCount = 200`:

```text
INTERMEDIATE_TICK=117
INTERMEDIATE_SNAPSHOT_SHA256=23822a7446a5a3e5a07a7cdc2705332a469b3e33e2fa56870a9ed21fe5b4173a
DIRECT_SNAPSHOT_SHA256=9d0c3a249b6e72daf0bce868824eb17a80b0cf4153ab05f6f7b7d50dae5f7260
SPLIT_SNAPSHOT_SHA256 =9d0c3a249b6e72daf0bce868824eb17a80b0cf4153ab05f6f7b7d50dae5f7260
SNAPSHOT_BYTE_IDENTICAL=true
EVENTS_BYTE_IDENTICAL=true
TAIL_FROM_117 direct=18 split=18 identical=true
EVENT_COUNT=59 FIRST_SEQ=1 LAST_SEQ=59 SEQUENCE_CONTIGUOUS=true
SPLIT_MATCHES_GOLDEN_SNAPSHOT=true  SPLIT_MATCHES_GOLDEN_EVENTS=true  FINAL_TICK=200
```

A cauda de eventos a partir do tick `117` é idêntica evento a evento, e a `sequence` global é
contígua de `1` a `59` sem salto na emenda.

### Prova adicional além do exigido: varredura de todas as fronteiras

O tick `117` é **quiescente** (`pendingIntents = []`), então sozinho ele não exercita a correção de
PB-03-06-FIX-01. A auditoria varreu portanto as `201` fronteiras de `0` a `200`:

```text
BOUNDARIES_TESTED=201
NON_QUIESCENT_BOUNDARIES=44
DIVERGENT_BOUNDARIES=0
```

As 44 fronteiras com intent interna pendente convergem para o mesmo snapshot e o mesmo journal. A
afirmação "retomada é fiel em qualquer fronteira" de `REPLAY_CONTRACT.md` está medida, não assumida.

## 7. Provas negativas e de sensibilidade

Todas em cópias temporárias da fixture no scratchpad de sessão, fora do repositório. Nenhum arquivo
versionado foi alterado, e todas as cópias foram removidas ao fim.

| Prova | Exigido | Observado | Veredito |
|---|---|---|---|
| um bit alterado na seed do header | exit 1, `SIM_REPLAY_DIVERGED` | exit 1, `kind:"divergence"`, 5 divergências byte a byte | PASS com ressalva (W1) |
| um comando alterado no log | exit 1, `SIM_REPLAY_DIVERGED` | exit 1, `kind:"divergence"` | PASS com ressalva (W1) |
| `rulesVersion` incrementada | exit 1, `SIM_VERSION_MISMATCH` | exit 1, `SIM_VERSION_MISMATCH` | PASS |
| `scenarioRevision` alterada | exit 1, `SIM_SCENARIO_MISMATCH` | exit 1, `SIM_SCENARIO_MISMATCH` | PASS |
| JSON malformado no cenário | exit 2, `SIM_SCHEMA_INVALID` | exit 2, `SIM_SCHEMA_INVALID` | PASS |
| `sequence` não crescente no log | exit 2, diagnóstico de log | exit 2, `SIM_SCHEMA_INVALID` em `["lines",2,"sequence"]`; variante duplicada devolve `SIM_COMMAND_DUPLICATE` | PASS |
| float injetado no snapshot esperado | `SIM_STATE_NOT_INTEGER` | `encodeCanonicalJson` lança `CanonicalJsonError` com `SIM_STATE_NOT_INTEGER`; pelo CLI o mesmo arquivo dá exit 1 `divergence` | PASS com ressalva (W2) |
| comando para entidade inexistente | `command/rejected`, estado inalterado | evento `sequence 19`, `tick 25`, `SIM_COMMAND_UNKNOWN_ENTITY`; estado inalterado provado por diferencial | PASS |
| comando de `player` com tipo `scenario/*` | `SIM_COMMAND_FORBIDDEN` | exit 2, `SIM_COMMAND_FORBIDDEN` | PASS |

Detalhe da prova de seed: a divergência foi detectada em `snapshot.golden.json`
(`877db25dc5f38e78678135f9228656fd506cad3ecd700827100d19a297229322` contra `9d0c3a24…`),
em `events.golden.jsonl` (`3fb0c48009965719d4935ea2d158e94076cc20c5510045f391e6a6755e487ca0` contra
`31f86d62…`) e em três sidecars.

### Preservação de estado no comando rejeitado

Para provar que o comando rejeitado não muta nada, a auditoria removeu do log a linha que aponta para
`entityId 999`, renumerou a cauda de `sequence` e comparou campo a campo o snapshot final contra o
golden:

```text
SAME  actors          SAME  nextEntityId     SAME  pendingCommands
SAME  pendingIntents  SAME  randomStreams    SAME  tick
SAME  rulesVersion    SAME  scenarioId       SAME  scenarioRevision   SAME  schemaVersion   SAME  seed
DIFF  nextCommandSequence   golden=14  sem o rejeitado=13
DIFF  nextEventSequence     golden=60  sem o rejeitado=59
EVENT_TAIL_EQUAL_IGNORING_SEQUENCE=true
```

Os dois únicos campos que mudam são contadores de bookkeeping — o comando consumiu uma `sequence` de
comando e a rejeição consumiu uma `sequence` de evento. Todo o estado de mundo (`actors`,
`nextEntityId`, `pendingCommands`, `pendingIntents`, `randomStreams`, `tick`) é idêntico, e o journal
é idêntico exceto pelo próprio evento `command/rejected` removido. O comando rejeitado não mutou
estado.

## 8. Paridade browser × Node

```text
corepack pnpm simulation:check                              -> exit 0
corepack pnpm --filter @huntbound/game build                -> exit 0 (vite build --mode test)
corepack pnpm exec playwright test tests/e2e/kernel-replay.spec.ts -> exit 0; 1 passed
```

`tests/e2e/kernel-replay.spec.ts` executa o replay dentro do Chromium `151.0.7922.34` pelo
`__huntboundKernelProbe` e afirma, com o teste verde como evidência:

- `canonicalSnapshot` byte-idêntico a `snapshot.golden.json`;
- `snapshotSha256` igual ao conteúdo de `snapshot.golden.sha256`, isto é
  `9d0c3a249b6e72daf0bce868824eb17a80b0cf4153ab05f6f7b7d50dae5f7260`, calculado no browser por Web
  Crypto;
- `eventCount = 59` e `finalTick = 200`;
- `consoleErrors`, `pageErrors`, `failedRequests` e `badResponses` todos vazios.

O hash observado no Chromium é portanto o mesmo do Node, byte a byte e digest a digest.

### Probe test-only

Dupla proteção, confirmada por inspeção e por bundle:

- `apps/game/src/main.ts:84-86` só chama `installKernelProbe()` quando o perfil é `test`;
- `apps/game/src/simulation/KernelProbe.ts:112-114` retorna cedo se
  `import.meta.env.MODE !== 'test'`.

Prova empírica: o bundle de `--mode test` contém a string `__huntboundKernelProbe` uma vez; o bundle
de `--mode product` **não a contém** (`grep -c` devolve `0`), porque o Vite substitui
`import.meta.env.MODE` estaticamente e elimina o corpo como código morto.

## 9. Isolamento do kernel

`packages/simulation` não referencia relógio, aleatoriedade global, Node, DOM ou Phaser.

```text
pnpm architecture:check -> exit 0
git grep -n -I -E "Date|performance|Math\.random|setTimeout|setInterval|queueMicrotask|crypto|globalThis|process" \
  -- packages/simulation/src -> exit 1 (nenhuma ocorrência)
node --test tools/architecture/simulation-boundaries.test.ts -> exit 0; 6 passed
```

Além do teste existente, a auditoria provou a regra contra o **kernel real**: uma cópia de
`packages/simulation/src` em diretório temporário do SO, com `checkSimulationBoundaries` aplicada
antes e depois de cada mutação em `kernel/kernel.ts`.

```text
REAL_KERNEL_COPY_DIAGNOSTICS=0
MUTATION=Date.now         -> kernel.ts:426 — "Date" is forbidden in the deterministic kernel
MUTATION=Math.random      -> kernel.ts:426 — "Math.random" is forbidden in the deterministic kernel
MUTATION=external-import  -> kernel.ts: import "seedrandom" is forbidden in the deterministic kernel
RESTORED_DIAGNOSTICS=0
```

O kernel real passa, cada uma das três impurezas é reprovada com diagnóstico próprio, e o kernel
restaurado volta a passar. Nenhum arquivo rastreado sobrou dessas provas: as mutações ocorreram em
`os.tmpdir()` e o diretório foi removido no `finally`.

Complementos estruturais: `packages/simulation/package.json` declara apenas a dependência interna
`@huntbound/contracts` (mais `vitest` como devDependency), e `packages/simulation/tsconfig.json`
declara `"lib": ["ES2022"]`, sem `DOM`.

## 10. Warnings e blockers

**Blockers: nenhum.** Nenhuma falha de produto foi encontrada. Nenhum golden foi regenerado, nenhuma
comparação foi relaxada e nenhum código foi alterado durante a auditoria.

### W1 — a task card promete `SIM_REPLAY_DIVERGED` onde o contrato promete exit 1

Não é risco de produto; é imprecisão da tabela do card PB-03-08 contra o contrato durável.

Alterar a seed ou um comando produz exit `1` com `kind:"divergence"` e a lista de divergências byte a
byte, sem o código `SIM_REPLAY_DIVERGED`. Esse código é reservado, em
`packages/simulation/src/replay/runReplay.ts:123-134`, ao caso em que o kernel reatribui uma
`sequence` diferente da gravada no log. `docs/simulation/REPLAY_CONTRACT.md` §Exit codes já descreve o
comportamento observado — exit `1` para "seed, comando ou golden alterado" — então implementação e
contrato durável concordam entre si; quem diverge é a tabela do card. A detecção acontece, é tipada e
tem o exit code contratado. **Ação sugerida:** ajustar a tabela do card, não o código.

### W2 — `SIM_STATE_NOT_INTEGER` é do encoder, não do comparador do `verify`

Não é risco de produto. Um float no snapshot **esperado** é detectado por `verify` como divergência
de bytes (exit 1), porque `verify` compara texto e nunca reencoda o arquivo esperado.
`SIM_STATE_NOT_INTEGER` é emitido por `encodeCanonicalJson` quando um float tenta **sair** do kernel,
que é a fronteira que importa; a auditoria exercitou esse caminho diretamente e obteve o código
exigido. Os dois comportamentos estão corretos e são complementares.

### W3 — `simulation-boundaries.test.ts` não entra no gate agregado

Herdado e já registrado em `STATE.md` §Bloqueios desde PB-03-05. O script `test` da raiz
(`package.json:15`) enumera em `node --test` somente `asset-boundaries.test.ts` e
`check-boundaries.test.ts`, então `simulation-boundaries.test.ts` — como `content-boundaries.test.ts`
— não roda por `pnpm test`. A **regra** roda em `architecture:check`, que é o critério de aceite, e
esta auditoria executou o teste manualmente com exit 0. Corrigir o enumerador exige escopo de raiz.

### W4 — `build:product` exige staging prévio do perfil `product`

Não é risco de produto e é de escopo PB-02. Em árvore limpa,
`pnpm --filter @huntbound/game build:product` falha com `Asset profile validation failed` porque
`apps/game/public/assets/product/` é gitignored e só existe após `pnpm assets:stage:product`. Depois
do staging, o build sai em exit 0. O gate `verify` não é afetado: ele constrói apenas o modo `test`.

### W5 — aviso de tamanho de chunk no build

Pré-existente e fora do escopo do PB-03. O Vite avisa que o chunk principal passa de 500 kB
(`1.515,24 kB`, `396,52 kB` gzip), dominado por Phaser. Pertence ao orçamento de PB-10.

### W6 — warnings herdados de PB-02

Continuam listados em `docs/playbooks/PB-02/artifacts/acceptance-report.md` §11. Não bloqueiam PB-03 e
não foram absorvidos por este playbook.

## 11. Decisão

**`APPROVED_WITH_WARNINGS`.**

Todos os critérios de aceite do PB-03 foram satisfeitos com evidência fresca sobre o commit
`f885535`. Os seis warnings são não-risco, explicados e não deixam critério pendente: W1 e W2 são
imprecisões de redação do card diante de um contrato durável que já descreve o comportamento correto,
W3 e W4 são hipóteses de higiene de tooling com escopo fora deste playbook, e W5 e W6 são herdados e
já priorizados noutro relatório.

| Item | Valor |
|---|---|
| Decisão | `APPROVED_WITH_WARNINGS` |
| Commit auditado | `f885535c0feb8091dfa20bc0b0364682c87027aa` |
| Commit de fechamento | `docs: close PB-03 deterministic kernel gate` (esta mudança) |
| Gates | `contracts test`, `simulation test`, `replay test`, `typecheck`, `architecture:check`, `simulation:check`, `playwright`, `verify` ×2 — todos exit 0 |
| Blockers | nenhum |
| Warnings | W1–W6, todos não bloqueantes |
| PB-04 | **elegível** |

`PB-03` fica `closed`. `PB-04 — Primeira hunt ponta a ponta` fica elegível. Nenhuma task corretiva é
necessária; `PB-03-FIX-01` não foi aberta.
