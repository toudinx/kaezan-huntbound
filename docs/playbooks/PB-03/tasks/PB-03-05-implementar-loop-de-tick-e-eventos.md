# PB-03-05 — Implementar loop de tick e eventos

**Status inicial:** pending

**Classe da tarefa:** implementação complexa — integra três subsistemas e fixa a semântica do tick

**Modelo sugerido:** GPT-5.6 Sol `xhigh`

**Validador sugerido:** Claude Code/Opus 5 ou gates automatizados com revisão independente antes do
fechamento de PB-03-06

**Rota:** `superpowers:test-driven-development` + `superpowers:systematic-debugging` +
`superpowers:verification-before-completion`.

**Paralelismo:** não. Esta task é o integrador único quando PB-03-02/03/04 rodarem em paralelo.

## Objetivo

Montar o kernel: estado do mundo, pipeline fixo do tick, aplicação de comandos, sistemas de
lifecycle, movimento e IA, e o journal de eventos. Não implementar snapshot, replay, CLI nem app.

## Resultado esperado

`createSimulationKernel(scenario, seed)` devolve um kernel que avança tick a tick, aplica comandos na
ordem congelada, emite eventos ordenados como única saída observável e nunca lê relógio ou
aleatoriedade global. Comando inválido produz `command/rejected` e não muta estado.

## Dependências

- PB-03-01, PB-03-02, PB-03-03 e PB-03-04 `done`.
- Em modo paralelo, as branches `codex/pb03-02-kernel-random`, `codex/pb03-03-kernel-grid` e
  `codex/pb03-04-kernel-commands` presentes e integráveis por fast-forward em série.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-03/STATE.md`;
3. `docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md`, seções “Pipeline do
   tick”, “Comandos internos e o command log” e “Eventos”;
4. `docs/simulation/KERNEL_CONTRACT.md`;
5. `packages/simulation/src/random/**`, `src/grid/**` e `src/commands/**`;
6. `packages/contracts/src/simulation/**`.

## Decisões congeladas

- Pipeline por tick, sem exceção: `intake` → `apply` → `systems` → `flush`.
- `systems` roda `S1 lifecycle`, `S2 movement` e `S3 ai`, nessa ordem.
- `S1` materializa spawns e despawns pendentes em ordem de `sequence`.
- `S2` resolve intents de passo em ordem crescente de `EntityId`.
- `S3` percorre atores `wander` em ordem crescente de `EntityId`, consome o stream `ai` e enfileira
  intent para `currentTick + 1`.
- Comandos internos gerados por `S3` não entram no command log e não consomem `sequence` de comando
  externo; eles usam uma fila interna própria, também ordenada por `EntityId`.
- `sequence` de evento é monotônico global na run.
- `advanceOne()` devolve os eventos daquele tick; o kernel não acumula journal indefinidamente.
- Cooldown: um ator só age quando `tick >= readyAtTick`. Movimento bem-sucedido define
  `readyAtTick = tick + stepCostTicks(...)`. `actor/face` e `actor/wait` não consultam cooldown;
  `actor/wait` também não o altera.
- Ordem de decisão do movimento: cooldown primeiro, geometria depois. Cooldown produz
  `actor/move-blocked` com `reason: 'cooldown'`.
- Um comando de ator para entidade inexistente produz `command/rejected` com
  `SIM_COMMAND_UNKNOWN_ENTITY`.
- `scenario/spawn-actor` em célula fora do grid, bloqueada ou ocupada produz `command/rejected` com
  `SIM_SPAWN_TILE_UNAVAILABLE`.
- Blueprint inexistente em `scenario/spawn-actor` produz `command/rejected` com
  `SIM_SCHEMA_INVALID`.
- Nenhum sistema lê relógio, cria promessa, agenda callback ou depende de ordem de inserção.
- `Math.random`, `Date`, `performance`, timers, `crypto` e dependência externa continuam proibidos.

## Escopo permitido

```text
packages/simulation/src/kernel/**
packages/simulation/src/events/**
packages/simulation/src/state/worldState.ts
packages/simulation/src/index.ts
tools/architecture/simulation-boundaries.ts
tools/architecture/simulation-boundaries.test.ts
tools/architecture/check-boundaries.ts
docs/simulation/KERNEL_CONTRACT.md
docs/playbooks/PB-03/STATE.md
```

## Fora de escopo

- serialização canônica, snapshot, restore e replay, que são PB-03-06;
- CLI, fixtures versionadas e golden;
- app, browser, Playwright e Phaser;
- combate, dano, loot, spell e qualquer regra Canary;
- reescrever RNG, grid ou buffer sem defeito reproduzido.

## Interfaces produzidas

```ts
export interface WorldState {
  readonly tick: TickIndex;
  readonly actors: readonly ActorState[];
  readonly nextEntityId: number;
}

export interface SimulationKernel {
  readonly tick: TickIndex;
  advanceOne(): readonly SimulationEvent[];
  advance(ticks: number): readonly SimulationEvent[];
  enqueue(command: SimulationCommandInput): CommandAcceptance;
  state(): WorldState;
}

export function createSimulationKernel(
  scenario: KernelScenario,
  seed: Seed,
): SimulationKernel;
```

`state()` devolve uma visão somente leitura para teste e para o snapshot de PB-03-06; consumidores de
gameplay usam eventos. `advance(ticks)` concatena os journals na ordem dos ticks e rejeita `ticks`
negativo ou não inteiro.

## Execução RED/GREEN

- [ ] **1. Integrar dependências e criar branch/worktree.**

Em modo serial:

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb03-05-kernel-tick-loop main
git worktree add C:\Kaezan\kaezan-huntbound-pb03-05-kernel-tick-loop codex/pb03-05-kernel-tick-loop
```

Em modo paralelo, antes disso: integre em `main` por `--ff-only`, em série, as branches de
PB-03-02, PB-03-03 e PB-03-04; rode os gates do pacote no resultado integrado; consolide o handoff
das três no `STATE.md`; e apague cada branch com `git branch -d` somente após comprovar a integração.

- [ ] **2. Escrever testes RED do boot do mundo.**

Prove: atores iniciais recebem `EntityId` 1..n na ordem de declaração; `nextEntityId` é `n + 1`;
`readyAtTick` inicial é 0; o boot emite um `actor/spawned` por ator inicial, em ordem de `EntityId`,
com `sequence` começando em 1; o tick inicial é 0.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-05-kernel-tick-loop --filter @huntbound/simulation test
```

- [ ] **3. Implementar `worldState` e o boot; obter GREEN.**

- [ ] **4. Escrever testes RED da aplicação de comandos.**

Cubra: `actor/face` muda facing e emite `actor/faced`; `actor/wait` não muta posição nem cooldown e
não emite evento de movimento; `actor/move-step` válido emite `actor/moved` com `from`/`to`
corretos; ator em cooldown emite `actor/move-blocked` com `cooldown`; destino bloqueado emite a causa
vinda do grid; alvo inexistente emite `command/rejected` com `SIM_COMMAND_UNKNOWN_ENTITY`; spawn em
célula ocupada emite `command/rejected` com `SIM_SPAWN_TILE_UNAVAILABLE`; blueprint inexistente emite
`command/rejected` com `SIM_SCHEMA_INVALID`; todo caso rejeitado deixa o estado idêntico ao anterior,
comparado campo a campo.

- [ ] **5. Implementar `apply` e `S1 lifecycle`; obter GREEN.**

- [ ] **6. Escrever testes RED de ordem e de cooldown.**

Prove: dois atores movendo para a mesma célula no mesmo tick resolvem pelo menor `EntityId`, e o
segundo recebe `occupied`; `readyAtTick` usa custo ortogonal e diagonal corretos; um ator com
`stepCooldownTicks: 0` pode mover em ticks consecutivos; `scenario/despawn-actor` no mesmo tick de um
`actor/move-step` do mesmo ator é aplicado primeiro por prioridade, e o movimento vira
`SIM_COMMAND_UNKNOWN_ENTITY`.

- [ ] **7. Implementar `S2 movement`; obter GREEN.**

- [ ] **8. Escrever testes RED da IA.**

Prove: um ator `wander` só gera intent quando está fora de cooldown; a decisão consome o stream `ai`
e é reproduzível para a mesma seed; dois atores `wander` consomem o stream em ordem de `EntityId`;
remover um ator `wander` muda as decisões seguintes de forma determinística; um ator `inert` nunca
consome o stream `ai`; a intent gerada é aplicada no tick seguinte, não no atual.

- [ ] **9. Implementar `S3 ai`; obter GREEN.**

Wander escolhe a direção por `nextBelow(8)` sobre a ordem canônica de direções. Um bloqueio não gera
nova tentativa no mesmo tick.

- [ ] **10. Escrever testes RED do journal e de `advance`.**

Prove: `sequence` de evento é global e crescente entre ticks; `advanceOne()` devolve só os eventos do
tick corrente; `advance(0)` não avança e devolve vazio; `advance(-1)` e `advance(1.5)` lançam;
`advance(n)` equivale a `n` chamadas de `advanceOne()`, comparando estado e journal concatenado.

- [ ] **11. Implementar journal e `advance`; obter GREEN.**

- [ ] **12. Criar a regra executável de fronteiras do kernel.**

`tools/architecture/simulation-boundaries.ts` falha quando `packages/simulation/src/**` referencia
`Date`, `performance`, `Math.random`, `setTimeout`, `setInterval`, `setImmediate`, `queueMicrotask`,
`crypto`, `globalThis`, `process` ou importa qualquer pacote externo. A regra tem teste próprio em
`node --test` e entra em `architecture:check`, no mesmo padrão de `asset-boundaries.ts` e
`content-boundaries.ts`. Inclua um caso positivo e um negativo no teste.

- [ ] **13. Documentar.**

Acrescente a `docs/simulation/KERNEL_CONTRACT.md` a seção de tick: fases, ordem dos sistemas, regra
de cooldown, semântica de wander, ordem de resolução por `EntityId` e a garantia de que rejeição não
muta estado.

- [ ] **14. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-05-kernel-tick-loop --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-05-kernel-tick-loop --filter @huntbound/simulation typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-05-kernel-tick-loop architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-05-kernel-tick-loop exec biome check packages/simulation tools/architecture
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-05-kernel-tick-loop format:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-05-kernel-tick-loop test
git -C C:\Kaezan\kaezan-huntbound-pb03-05-kernel-tick-loop diff --check
```

- [ ] **15. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb03-05-kernel-tick-loop add packages/simulation tools/architecture docs/simulation/KERNEL_CONTRACT.md docs/playbooks/PB-03/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb03-05-kernel-tick-loop commit -m "feat: run the deterministic tick loop"
```

- [ ] **16. Integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb03-05-kernel-tick-loop
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound architecture:check
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb03-05-kernel-tick-loop
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb03-05-kernel-tick-loop
```

## Critérios de aceite

- [ ] O pipeline `intake → apply → systems → flush` está implementado na ordem congelada e provado.
- [ ] `S1`, `S2` e `S3` rodam na ordem declarada, com iteração por `EntityId`.
- [ ] Todo comando inválido emite `command/rejected` e deixa o estado inalterado.
- [ ] Cooldown precede geometria e produz `reason: 'cooldown'`.
- [ ] IA é reproduzível pela seed, consome o stream `ai` em ordem estável e não entra no log.
- [ ] `sequence` de evento é global e crescente; `advance(n)` equivale a `n` `advanceOne()`.
- [ ] `simulation-boundaries` falha para relógio, aleatoriedade global, timers e import externo, e
      está incluída em `architecture:check`.
- [ ] `corepack pnpm test` passa na worktree e no resultado integrado.
- [ ] Docs, handoff, commit, integração e limpeza estão completos, inclusive das branches paralelas
      quando esse modo tiver sido usado.

## Condições de parada

Pare se a ordem das fases, a semântica de cooldown, a regra de wander ou a decisão de não gravar
comandos internos precisar mudar. Pare também se um teste de determinismo falhar de forma
intermitente: isso é defeito de projeto, não de flake, e exige investigação antes de prosseguir.

## Persistência e relatório final

Registre em `STATE.md` o pipeline efetivo, contagem de testes, comandos/exit codes, modelo/effort,
integração das branches paralelas quando aplicável, commit integrado, limpeza e PB-03-06 como
próxima task. Não implemente snapshot, replay ou CLI.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development, superpowers:systematic-debugging e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-03\tasks\PB-03-05-implementar-loop-de-tick-e-eventos.md

Leia o STATE.md do playbook PB-03 e apenas os arquivos indicados pela task. Se PB-03-02, PB-03-03 e
PB-03-04 tiverem rodado em paralelo, integre as três branches por fast-forward em série antes de
começar, consolide o handoff e apague cada branch só depois de comprovar a integração.

Crie a branch/worktree indicada, comece por RED e implemente o estado do mundo, o pipeline do tick,
os três sistemas, o journal de eventos e a regra executável tools/architecture/simulation-boundaries.
Execute todos os gates, atualize STATE.md, commite, integre por fast-forward na main, reverifique e
remova worktree/branch.

Não implemente snapshot, restore, replay, CLI, app ou browser. Se surgir decisão não coberta, pare e
registre o bloqueio. Não inicie PB-03-06.
```
