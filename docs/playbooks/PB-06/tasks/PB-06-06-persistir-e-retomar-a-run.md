# PB-06-06 — Persistir e retomar a run

**Status inicial:** pending

**Classe da tarefa:** composição sutil entre laço de tick, transação e retomada

**Modelo sugerido:** GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6, `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador; gates automatizados como primeiro
validador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** serial.

## Objetivo

Definir e implementar o ciclo de vida da run persistida: checkpoint em fronteira de tick, retomada
compatível, consolidação idempotente da bolsa e descarte que **preserva** o loot já ganho.

## Resultado esperado

Um módulo puro e testável em Node que decide **quando** gravar, **o que** gravar, **se** a sessão
gravada pode ser retomada e **como** a bolsa vira estoque — sem tocar Phaser, sem tocar o kernel e
sem depender de `@huntbound/content`.

## Dependências

- PB-06-02 `done` e integrada em `main`.
- PB-06-04 `done` e integrada em `main`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-06/STATE.md`;
3. `docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`, seções "A bolsa
   persistida existe desde o primeiro loot", "Retomada é snapshot, não command log", "Descarte
   preserva a bolsa" e "Ciclo de vida da sessão";
4. `packages/contracts/src/save/**`;
5. `packages/save/src/repository/**`;
6. `packages/simulation/src/kernel/index.ts`, somente a API de criar kernel a partir de snapshot;
7. `packages/content/src/runtime/runBag.ts`, apenas para **ler** a forma da projeção — não importe
   `@huntbound/content` daqui.

## Decisões congeladas

- **Checkpoint a cada `200` ticks**, mais fim de run, abandono e `pagehide`.
- **A captura é síncrona na fronteira do tick; a escrita nunca é.** O laço de tick não espera
  IndexedDB.
- **Escritas são coalescidas.** No máximo uma escrita em voo e no máximo uma pendente; a pendente
  mais nova substitui a anterior. Uma fila sem teto transformaria uma aba lenta em vazamento.
- **Falha de checkpoint não derruba a run.** Ela vira estado de erro publicado e o checkpoint
  seguinte tenta de novo.
- A sessão é retomável somente quando **todos** batem: `scenarioId`, `scenarioRevision`, `seed`,
  `snapshot.schemaVersion` contra `SIMULATION_SCHEMA_VERSION` e `snapshot.rulesVersion` contra
  `SIMULATION_RULES_VERSION`.
- **Sessão incompatível não é erro e não é retomada forçada:** é descartada, e a bolsa dela é
  consolidada em `stash` **na mesma transação** do descarte. Perder o loot em silêncio e injetar
  estado inválido no kernel são os dois defeitos que esta regra existe para impedir.
- Concluir ou abandonar a run é **uma** transação: `stash += bag`, `completedRuns += 1`,
  `session = null`. Idempotente por construção: a segunda chamada não encontra sessão e não faz nada.
- Abandonar conta como run concluída para `completedRuns`? **Não.** `completedRuns` incrementa apenas
  na conclusão; o abandono consolida a bolsa e zera a sessão sem incrementar.
- A bolsa chega pronta, como `readonly RunBagEntry[]`. `@huntbound/save` **não** importa
  `@huntbound/content` e não projeta eventos.
- O kernel não muda. Retomada é `createKernel` a partir do snapshot persistido, nada mais.

## Escopo permitido

```text
packages/save/src/session/**
packages/save/src/index.ts
docs/playbooks/PB-06/STATE.md
```

## Fora de escopo

- ligar isto ao laço real do jogo, ao `pagehide` real e à UI — PB-06-08;
- a fixture e o gate `save:check` — PB-06-07;
- qualquer arquivo em `packages/simulation`, `packages/content` ou `apps/game`.

## Interfaces produzidas

```ts
export interface RunIdentity {
  readonly huntId: string;
  readonly scenarioId: string;
  readonly scenarioRevision: number;
  readonly seed: Seed;
}

export type ResumeDecision =
  | { readonly kind: 'resume'; readonly session: ActiveRunState }
  | { readonly kind: 'discard'; readonly reason: ResumeRejection }
  | { readonly kind: 'fresh' };

export function decideResume(save: GameSave, identity: RunIdentity): ResumeDecision;

export function consolidateRun(draft: SaveDraft, outcome: 'completed' | 'abandoned'): void;

export interface CheckpointScheduler {
  onTick(tick: number, capture: () => ActiveRunState): void;
  flush(): Promise<void>;
  dispose(): void;
}

export function createCheckpointScheduler(
  repository: SaveRepository,
  options: { readonly everyTicks: number; readonly onError: (error: SaveError) => void },
): CheckpointScheduler;
```

`capture` é uma função porque o agendador decide **se** vale capturar; capturar o snapshot em todo
tick para descartar em 199 deles seria desperdício puro.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb06-06-session -b codex/pb06-06-run-persistence main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-06-session install --prefer-offline
```

- [ ] **2. Escrever testes RED da decisão de retomada.**

Prove, um caso por campo: sessão ausente devolve `fresh`; sessão compatível devolve `resume` com a
sessão; `scenarioId` diferente, `scenarioRevision` diferente, `seed` diferente,
`snapshot.schemaVersion` diferente e `snapshot.rulesVersion` diferente devolvem, cada um, `discard`
com a razão correspondente. Cinco campos, cinco casos — não um caso genérico.

- [ ] **3. Escrever testes RED da consolidação.**

Prove: concluir soma `bag` em `stash` respeitando ordenação e unicidade, incrementa `completedRuns` e
zera `session`; itens que já existiam no `stash` somam contagem em vez de duplicar entrada; abandonar
consolida e zera **sem** incrementar `completedRuns`; consolidar duas vezes soma uma vez só;
consolidar sem sessão é no-op silencioso, não erro.

- [ ] **4. Escrever teste RED do descarte que preserva a bolsa.**

Prove que descartar uma sessão incompatível deixa a bolsa dela no `stash` e a sessão em `null`,
**numa única transação** — verificado por um driver que conta escritas.

- [ ] **5. Escrever testes RED do agendador.**

Prove: `onTick` só captura em múltiplos de `everyTicks`; `capture` não é chamada nos demais ticks;
uma escrita em voo mais três checkpoints novos resultam em **uma** escrita adicional, com o estado
mais novo; `flush` grava o pendente e resolve; erro de escrita chama `onError` e **não** propaga para
`onTick`; `dispose` cancela o pendente.

O teste da coalescência é o que separa esta implementação de uma que vaza: sem ele, a fila cresce e
ninguém percebe até a aba travar.

- [ ] **6. Implementar `packages/save/src/session/**`; obter GREEN.**

- [ ] **7. Escrever teste RED de neutralidade e obter GREEN.**

Rode um kernel alguns ticks, capture, grave, releia e **retome** do snapshot persistido; continue até
o fim e prove que o snapshot final é idêntico ao de uma execução que nunca passou pelo save. Aqui é
um cenário pequeno próprio da task; a prova sobre a fixture do PB-05 é PB-06-07.

- [ ] **8. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-06-session exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-06-session --filter @huntbound/save test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-06-session typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-06-session architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-06-session simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-06-session hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-06-session combat:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-06-session verify
```

- [ ] **9. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb06-06-session add packages docs
git -C C:\Kaezan\kaezan-huntbound-pb06-06-session commit -m "feat: checkpoint, resume and consolidate the hunt run"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb06-06-run-persistence
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb06-06-session
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb06-06-run-persistence
```

## Verificação

Testes de `@huntbound/save`, `typecheck`, `architecture:check`, `simulation:check`, `hunt:check`,
`combat:check` e `verify` verdes na worktree e no resultado integrado; `biome check .` em `0`.

## Critérios de aceite

- [ ] Os cinco campos de compatibilidade têm caso próprio de descarte.
- [ ] Descarte preserva a bolsa em `stash`, numa única transação.
- [ ] Consolidação é idempotente: duas vezes somam uma vez.
- [ ] Abandono consolida sem incrementar `completedRuns`.
- [ ] A soma no `stash` mantém ordenação e unicidade.
- [ ] `capture` só é chamada nas fronteiras.
- [ ] Escritas são coalescidas: uma em voo, no máximo uma pendente, a mais nova vence.
- [ ] Erro de escrita não propaga para o tick e não derruba a run.
- [ ] Retomar do snapshot persistido produz o mesmo snapshot final de uma execução sem save.
- [ ] `packages/save` não importa `@huntbound/content`.
- [ ] `packages/simulation` não teve uma linha alterada, provado por `git diff --stat`.
- [ ] Os goldens de PB-03, PB-04 e PB-05 continuam byte-idênticos.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: a retomada exigir persistir o command log; a consolidação exigir `runId`, ledger ou
chave de idempotência; o agendador só ficar correto acoplado ao laço do Phaser; ou se qualquer teste
só passar alterando `packages/simulation`.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, contagem de testes, comandos e exit codes, evidência
de que os goldens não mudaram, modelo e effort usados, e a próxima task elegível.

## Commit

`feat: checkpoint, resume and consolidate the hunt run`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb06-06-run-persistence`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb06-06-session`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, evidência da coalescência, evidência da idempotência, confirmação de
que o kernel e os goldens não mudaram, integração, limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-06\tasks\PB-06-06-persistir-e-retomar-a-run.md

Leia AGENTS.md, o STATE.md do playbook PB-06 e apenas os arquivos indicados pela task. Confirme que
PB-06-02 e PB-06-04 estao done e integradas e que main esta verde.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb06-06-session com a branch
codex/pb06-06-run-persistence e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Implemente em packages/save/src/session o ciclo da run persistida:

decideResume compara CINCO campos — scenarioId, scenarioRevision, seed, snapshot.schemaVersion contra
SIMULATION_SCHEMA_VERSION e snapshot.rulesVersion contra SIMULATION_RULES_VERSION — e devolve resume,
discard com razao, ou fresh. Um caso de teste por campo.

consolidateRun soma bag em stash mantendo ordem e unicidade, zera session e incrementa completedRuns
apenas na CONCLUSAO; abandono consolida sem incrementar. Consolidar duas vezes soma UMA vez.
Consolidar sem sessao e no-op.

Descartar sessao incompativel PRESERVA a bolsa: bag vai para stash na MESMA transacao do descarte.

createCheckpointScheduler grava a cada 200 ticks, mais flush explicito. A captura e sincrona na
fronteira; a escrita e assincrona e COALESCIDA: uma em voo, no maximo uma pendente, a mais nova
vence. Erro de escrita chama onError e NAO propaga para onTick.

packages/save NAO importa @huntbound/content: a bolsa chega pronta como RunBagEntry[].
packages/simulation NAO pode mudar uma linha — prove com git diff --stat.

Prove neutralidade num cenario proprio: retomar do snapshot persistido produz o mesmo snapshot final
de uma execucao que nunca passou pelo save. A prova sobre a fixture do PB-05 e PB-06-07.

Nao ligue nada ao jogo, ao pagehide real nem a UI: isso e PB-06-08.

Rode biome check ., os testes de save, typecheck, architecture:check, simulation:check, hunt:check,
combat:check e verify. Atualize o handoff, commite, integre por fast-forward na main, reverifique e
limpe worktree e branch removendo o diretorio antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
