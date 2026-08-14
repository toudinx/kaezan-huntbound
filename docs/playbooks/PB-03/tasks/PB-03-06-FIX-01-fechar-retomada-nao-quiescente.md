# PB-03-06-FIX-01 — Fechar retomada não quiescente

**Status inicial:** done

**Classe da tarefa:** correção de contrato — reabre um schema congelado e recongela o golden

**Modelo sugerido:** Claude Opus 5 via Claude Code. Alternativa equivalente, se exposta na sessão:
GPT-5.6 Sol `xhigh`.

**GPT-5.6 Luna está excluída**, em qualquer effort: a task altera schema congelado, o que é ao mesmo
tempo critério de implementação complexa (`docs/08_POLITICA_MODELOS_AGENTES.md`, §Classificação
obrigatória) e gatilho de escalonamento (§Escalonamento Luna-first). Effort mais alto não muda a
classe da tarefa.

**Validador sugerido:** modelo frontier diferente do implementador — GPT-5.6 Sol quando o
implementador for Opus 5. Se a plataforma não oferecer alternativa, registrar o desvio em `STATE.md`
com modelo, effort e motivo, conforme §Diversidade de revisão.

**Rota:** `superpowers:test-driven-development` + `superpowers:systematic-debugging` +
`superpowers:verification-before-completion`.

**Paralelismo:** não.

## Origem

PB-03-06 entregou snapshot, restore, replay, fixture, CLI e gate, e provou a retomada em `117`. No
caminho, mediu um defeito de contrato herdado da spec e de PB-03-01:

`S3 ai` decide no fim do tick `T` uma intent aplicada em `T + 1`. Essa fila interna **não tem campo
no snapshot**. Restaurar uma fronteira com intent interna pendente perde a decisão e diverge no tick
seguinte. A correlação foi medida em 24 fronteiras consecutivas e é exata:
`pendingInternalIntents > 0` se e somente se a retomada diverge.

A mitigação atual é honesta mas é mitigação: `isKernelQuiescent` reporta a fronteira, um teste prova
a divergência de propósito, `tools/replay` recusa retomada não quiescente com `SIM_REPLAY_DIVERGED`,
e o tick `117` da fixture é quiescente. Nada disso torna o restore fiel; apenas impede que ele minta.

## Objetivo

Tornar `restoreSimulationKernel` fiel em **qualquer** fronteira, serializando as intents internas
pendentes no snapshot, com bump de `SIMULATION_SCHEMA_VERSION`. Não mudar nenhuma regra do kernel.

## Resultado esperado

Retomar em qualquer tick `0..200` converge para o mesmo snapshot final e para a mesma cauda de
eventos. `isKernelQuiescent` deixa de existir como condição de fidelidade, e `tools/replay` deixa de
recusar retomada por quiescência.

## Dependências

- PB-03-06 `done` e integrado em `main` (`aced4bb`).
- **Precede PB-03-07.** Fazer depois obrigaria a regerar os golden que PB-03-07 usa como alvo de
  paridade de runtime.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-03/STATE.md`, handoff de PB-03-06 e a seção de bloqueios;
3. `docs/simulation/KERNEL_CONTRACT.md`, seções “Snapshot” e “Quiescência”;
4. `docs/simulation/REPLAY_CONTRACT.md`;
5. `packages/contracts/src/simulation/{types,schemas,identity}.ts`;
6. `packages/simulation/src/state/{kernelState,snapshot}.ts` e `src/kernel/kernel.ts`;
7. `tools/replay/replayArtifacts.ts`.

## Decisões congeladas

- O snapshot ganha **um** campo: `pendingIntents`.
- Cada entrada é `{ direction, entityId, tick }`. Sem `order` e sem `sourceRank`.
- `tick` é o tick de aplicação e satisfaz `tick >= snapshot.tick`.
- `pendingIntents` é ordenado estritamente por `(tick, entityId)`. O par é único, e o schema
  reprova duplicata.
- Justificativa da ausência de `order`, que deve ser **provada por teste** e não assumida: `S3`
  percorre cada ator no máximo uma vez por tick e enfileira sempre para `currentTick + 1`, logo dois
  intents internos nunca compartilham `(tick, entityId)`; e o desempate entre intent externa e
  interna do mesmo ator é feito por `sourceRank`, nunca por `order`. Portanto o contador
  `internalOrder` não precisa ser restaurado.
- `SIMULATION_SCHEMA_VERSION` passa a `2`. **`SIMULATION_RULES_VERSION` permanece `1`**: o formato
  muda, a semântica não.
- Consequência congelada e verificável: `scenario.json`, `commands.jsonl` e `snapshot.golden.json`
  mudam de hash porque carregam `schemaVersion`; **`events.golden.jsonl` continua byte-idêntico**,
  porque nenhuma regra mudou. Se o journal mudar, a mudança não é de formato e a task deve parar.
- `isKernelQuiescent` sai da superfície pública de `@huntbound/simulation`.
- `tools/replay` deixa de recusar retomada por quiescência.
- Golden divergente nunca é reescrito para “fazer passar”.

## Escopo permitido

```text
packages/contracts/src/simulation/**
packages/simulation/src/state/**
packages/simulation/src/kernel/**
packages/simulation/src/replay/**
packages/simulation/src/index.ts
packages/test-fixtures/simulation/pb03/**
tools/replay/**
docs/simulation/KERNEL_CONTRACT.md
docs/simulation/REPLAY_CONTRACT.md
docs/playbooks/PB-03/STATE.md
```

`packages/simulation/src/kernel/**` está no escopo desta vez: a costura de estado interno criada em
PB-03-06 precisa expor as intents pendentes, não só contá-las.

## Fora de escopo

- app, browser, Playwright e Phaser, que são PB-03-07;
- qualquer mudança de regra do kernel: pipeline, precedência, cooldown, consumo de RNG e eventos
  ficam idênticos;
- conteúdo Canary, assets, mapa real e gameplay;
- performance, profiling e budget.

## Interfaces produzidas

```ts
export interface PendingIntentState {
  readonly tick: TickIndex;
  readonly entityId: EntityId;
  readonly direction: Direction;
}

export interface SimulationSnapshot {
  // ...campos existentes...
  readonly pendingIntents: readonly PendingIntentState[];
}
```

## Execução RED/GREEN

- [x] **1. Criar branch e worktree isolada.**

```powershell
git branch codex/pb03-06-fix-01-pending-intents main
git worktree add C:\Kaezan\kaezan-huntbound-pb03-06-fix-01 codex/pb03-06-fix-01-pending-intents
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-fix-01 install --frozen-lockfile
```

- [x] **2. Escrever o teste RED que expõe o defeito como defeito.**

Em `packages/simulation/src/state/snapshot.test.ts`, substituir o teste que hoje *prova a limitação*
por um que exige fidelidade: para um cenário com wanderer, retomar em **cada** fronteira `0..N` e
exigir snapshot final e cauda de eventos idênticos ao run direto. Esse teste falha hoje exatamente
nas fronteiras não quiescentes, e é ele que teria pego o defeito original.

- [x] **3. Provar a invariante que justifica omitir `order`.**

Teste dedicado: dois intents internos nunca compartilham `(tick, entityId)`; e intent externa e
interna do mesmo ator no mesmo tick são desempatadas por `sourceRank`, com a externa primeiro.

- [x] **4. Estender contrato e schema; obter GREEN.**

`PendingIntentState`, `PendingIntentStateSchema`, campo `pendingIntents` em `SimulationSnapshot` e em
`SimulationSnapshotSchema` com ordenação estrita e unicidade de `(tick, entityId)`, e
`SIMULATION_SCHEMA_VERSION = 2`.

- [x] **5. Expor e restaurar as intents no kernel.**

`KernelStateAccess.pendingInternalIntents` passa de contagem a lista; `KernelRestoreState` recebe
`pendingIntents`; `createSimulationKernel` reidrata `internalIntents`. Remover `isKernelQuiescent`.

- [x] **6. Simplificar `tools/replay`.**

`buildReplayArtifacts` perde a recusa por quiescência. O teste de retomada passa a cobrir uma
fronteira comprovadamente **não** quiescente, além de `117`.

- [x] **7. Recongelar a fixture.**

Atualizar `schemaVersion` para `2` em `scenario.json` e no header de `commands.jsonl`, e regerar:

```powershell
node --no-warnings --experimental-transform-types tools/replay/cli.ts run --scenario packages/test-fixtures/simulation/pb03/scenario.json --log packages/test-fixtures/simulation/pb03/commands.jsonl --out packages/test-fixtures/simulation/pb03
```

Conferir que `events.golden.jsonl` **não** mudou. Se mudou, parar e investigar: houve mudança
semântica não intencional.

- [x] **8. Documentar.**

`KERNEL_CONTRACT.md`: remover a seção “Quiescência” e descrever `pendingIntents`.
`REPLAY_CONTRACT.md`: nova tabela de hashes, `SIMULATION_SCHEMA_VERSION = 2` e nota de migração.

- [x] **9. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-fix-01 --filter @huntbound/contracts test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-fix-01 --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-fix-01 exec vitest run --config tools/replay/vitest.config.ts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-fix-01 exec tsc --project tools/replay/tsconfig.json --noEmit
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-fix-01 simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-fix-01 architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-fix-01 verify
```

Rode `verify` duas vezes seguidas e comprove exit 0 nas duas.

- [x] **10. Handoff, commit, integração e limpeza.**

Registrar os quatro novos SHA-256 em `STATE.md` e em `REPLAY_CONTRACT.md`, e fechar o bloqueio
aberto por PB-03-06. Integrar por fast-forward, reverificar e remover worktree e branch.

## Critérios de aceite

- [x] Retomar em qualquer fronteira `0..N` converge no mesmo snapshot final e na mesma cauda de
      eventos, provado por teste que varre todas as fronteiras.
- [x] A invariante que dispensa `order` está provada por teste, não assumida.
- [x] `pendingIntents` é ordenado por `(tick, entityId)`, sem duplicata, e o schema reprova violação.
- [x] `SIMULATION_SCHEMA_VERSION = 2` e `SIMULATION_RULES_VERSION = 1`.
- [x] `events.golden.jsonl` permanece byte-idêntico ao de PB-03-06.
- [x] `isKernelQuiescent` não existe mais e `tools/replay` não recusa por quiescência.
- [x] Os quatro SHA-256 novos estão em `STATE.md` e em `REPLAY_CONTRACT.md`.
- [x] `verify` é idempotente em duas execuções seguidas.

## Condições de parada

Pare se `events.golden.jsonl` mudar, porque isso significa mudança semântica e não de formato; se a
retomada continuar divergindo em alguma fronteira depois da correção; ou se for necessário alterar
regra do kernel para a retomada convergir. Nenhuma dessas situações se resolve regenerando golden.

## Persistência e relatório final

Registre em `STATE.md` os hashes novos, contagem de testes, comandos/exit codes, modelo/effort,
commit integrado, limpeza e PB-03-07 como próxima task. Não toque no app.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Claude Opus 5 via Claude Code.
Use obrigatoriamente superpowers:test-driven-development, superpowers:systematic-debugging e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-03\tasks\PB-03-06-FIX-01-fechar-retomada-nao-quiescente.md

Comece pelo RED que varre todas as fronteiras de retomada e falha nas não quiescentes. Serialize as
intents internas pendentes no snapshot como pendingIntents {direction, entityId, tick}, ordenado por
(tick, entityId), com SIMULATION_SCHEMA_VERSION = 2 e SIMULATION_RULES_VERSION inalterado em 1.

events.golden.jsonl precisa continuar byte-idêntico: se mudar, pare, porque a mudança deixou de ser
de formato. Nunca regenere golden para fazer um teste passar. Não toque em apps/game, Playwright ou
Phaser. Não inicie PB-03-07.
```
