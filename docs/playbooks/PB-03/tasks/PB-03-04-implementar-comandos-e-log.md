# PB-03-04 — Implementar comandos e command log

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — envelope, ordenação e formato congelados

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; escalonamento somente por gatilho objetivo registrado

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** sim, com PB-03-02 e PB-03-03 após PB-03-01, somente por ativação do supervisor.
Paths funcionais disjuntos: esta task só toca `packages/simulation/src/commands/**`.

## Objetivo

Implementar a borda de entrada do kernel: buffer de comandos por tick, atribuição de `sequence`,
validação independente de estado, ordenação determinística e codificação/decodificação do command
log em JSONL. Não implementar aplicação de comando ao mundo, loop de tick nem eventos.

## Resultado esperado

Comandos entram por uma única porta, recebem sequência monotônica, ficam agrupados por tick e saem
sempre na mesma ordem. Comando destinado a um tick já executado é recusado na borda com
`SIM_TICK_IN_PAST`; emissor proibido é recusado com `SIM_COMMAND_FORBIDDEN`. O log codificado e
decodificado é estável em ida e volta.

## Dependências

- PB-03-01 `done` e integrado em `main`.
- Tipos `SimulationCommand`, `SimulationCommandInput`, `SimulationCommandRecord`,
  `SimulationCommandLog`, `commandPriority` e `SimulationDiagnosticCode` disponíveis em
  `@huntbound/contracts`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-03/STATE.md`;
3. `docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md`, seções “Comandos”,
   “Comandos internos e o command log” e “Command log”;
4. `docs/simulation/KERNEL_CONTRACT.md`;
5. `packages/simulation/package.json`, `tsconfig.json` e `src/index.ts`;
6. `packages/contracts/src/simulation/**` apenas para os tipos consumidos.

## Decisões congeladas

- `sequence` é atribuído pelo buffer, monotônico global na run, começando em 1. O chamador nunca
  informa `sequence`.
- Ordem de saída: `tick` crescente, depois `commandPriority(type)`, depois `sequence`.
- Prioridades: `scenario/*` 0, `actor/face` 1, `actor/move-step` 2, `actor/wait` 3.
- `enqueue` com `tick < currentTick` falha na borda com `SIM_TICK_IN_PAST` e não entra no buffer.
- `scenario/*` só aceita `issuer: 'scenario'`; `actor/*` só aceita `'player'` ou `'ai'`. Violação é
  `SIM_COMMAND_FORBIDDEN` na borda.
- Duplicata é definida como o mesmo `issuer`, mesmo `entityId` e mesmo tick com dois comandos de ação
  concorrentes (`actor/move-step` ou `actor/wait`). O segundo é recusado com `SIM_COMMAND_DUPLICATE`.
  `actor/face` não conflita com ação.
- O log grava somente comandos externos. Comandos gerados por sistemas internos jamais entram no log.
- Uma linha do log é JSON canônico; o arquivo começa pelo header e termina com newline.
- Não existe validação de estado do mundo nesta camada: entidade inexistente, cooldown e geometria
  são decididos na aplicação, em PB-03-05.
- Proibido: `Math.random`, `Date`, `performance`, timers, `crypto`, filesystem, dependência externa.

## Escopo permitido

```text
packages/simulation/src/commands/**
packages/simulation/src/index.ts
docs/simulation/KERNEL_CONTRACT.md
docs/playbooks/PB-03/STATE.md
```

## Fora de escopo

- aplicação de comando ao estado, movimento, IA, eventos e tick;
- leitura ou escrita de arquivo; a CLI é PB-03-06;
- snapshot, replay e fixtures versionadas;
- app, browser e Playwright.

## Interfaces produzidas

```ts
export type CommandAcceptance =
  | { readonly ok: true; readonly sequence: number }
  | { readonly ok: false; readonly code: SimulationDiagnosticCode };

export interface CommandBuffer {
  readonly nextSequence: number;
  enqueue(input: SimulationCommandInput, currentTick: TickIndex): CommandAcceptance;
  drain(tick: TickIndex): readonly SimulationCommandRecord[];
  pending(): readonly SimulationCommandRecord[];
}

export function createCommandBuffer(startSequence?: number): CommandBuffer;
export function restoreCommandBuffer(
  pending: readonly SimulationCommandRecord[],
  nextSequence: number,
): CommandBuffer;

export function orderCommands(
  records: readonly SimulationCommandRecord[],
): readonly SimulationCommandRecord[];

export function encodeCommandLog(log: SimulationCommandLog): string;
export function decodeCommandLog(
  text: string,
): SimulationValidationResult<SimulationCommandLog>;
```

`drain(tick)` remove e devolve os comandos daquele tick já ordenados. `pending()` devolve todos os
comandos ainda não drenados, ordenados por `(tick, sequence)`, para entrar no snapshot.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb03-04-kernel-commands main
git worktree add C:\Kaezan\kaezan-huntbound-pb03-04-kernel-commands codex/pb03-04-kernel-commands
```

- [ ] **2. Escrever testes RED de borda e sequência.**

Prove: `sequence` começa em 1 e cresce um a um, inclusive entre ticks diferentes; comando para tick
futuro é aceito; comando para o tick atual é aceito; comando para tick passado devolve
`SIM_TICK_IN_PAST` e não aparece em `pending()`; `scenario/spawn-actor` emitido por `player` devolve
`SIM_COMMAND_FORBIDDEN`; `actor/wait` emitido por `scenario` devolve `SIM_COMMAND_FORBIDDEN`;
recusa na borda não consome `sequence`.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-04-kernel-commands --filter @huntbound/simulation test
```

Esperado: RED por módulo ausente.

- [ ] **3. Implementar `createCommandBuffer` e a validação de borda; obter GREEN.**

- [ ] **4. Escrever testes RED de ordenação e duplicata.**

Prove: comandos inseridos fora de ordem saem por `(tick, prioridade, sequence)`; dois comandos de
mesma prioridade saem por `sequence`; `scenario/despawn-actor` precede `actor/move-step` no mesmo
tick; segunda ação para o mesmo ator, mesmo emissor e mesmo tick devolve `SIM_COMMAND_DUPLICATE`;
`actor/face` seguido de `actor/move-step` para o mesmo ator é aceito; a mesma ação vinda de emissores
diferentes não é duplicata nesta camada.

- [ ] **5. Implementar ordenação, `drain` e detecção de duplicata; obter GREEN.**

`drain` deve ser idempotente para um tick já drenado: devolve lista vazia, não relança.

- [ ] **6. Escrever testes RED do log.**

Prove: ida e volta de um log com header e comandos preserva conteúdo e ordem; cada linha é JSON
canônico com chaves ordenadas; o texto termina com newline; decodificar header ausente, linha vazia
no meio, JSON inválido, `sequence` não crescente, `kind` desconhecido, versão divergente e `tick`
decrescente produz diagnóstico específico; a decodificação nunca aceita parcialmente.

- [ ] **7. Implementar `encodeCommandLog`/`decodeCommandLog`; obter GREEN.**

A codificação canônica local pode ser um helper interno desta task; PB-03-06 promove o encoder
canônico definitivo em `state/`. Se o encoder já existir naquele momento, reutilize-o em vez de
duplicar.

- [ ] **8. Documentar.**

Acrescente a `docs/simulation/KERNEL_CONTRACT.md` a seção de comandos: envelope, atribuição de
sequência, tabela de prioridades, regras de emissor, definição de duplicata, formato do log e a
decisão de não gravar comandos internos.

- [ ] **9. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-04-kernel-commands --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-04-kernel-commands --filter @huntbound/simulation typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-04-kernel-commands architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-04-kernel-commands exec biome check packages/simulation
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-04-kernel-commands format:check
git -C C:\Kaezan\kaezan-huntbound-pb03-04-kernel-commands diff --check
```

- [ ] **10. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb03-04-kernel-commands add packages/simulation docs/simulation/KERNEL_CONTRACT.md docs/playbooks/PB-03/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb03-04-kernel-commands commit -m "feat: order and persist kernel commands"
```

Em modo paralelo, não edite `STATE.md`: deixe PB-03-05 consolidar o handoff.

- [ ] **11. Integrar e limpar.**

Modo serial:

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb03-04-kernel-commands
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound architecture:check
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb03-04-kernel-commands
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb03-04-kernel-commands
```

Modo paralelo: remova a worktree limpa após o commit e preserve a branch para PB-03-05.

## Critérios de aceite

- [ ] `sequence` é atribuído pelo buffer, monotônico, e recusa na borda não o consome.
- [ ] Ordem de saída é `(tick, prioridade, sequence)` e está provada com inserção embaralhada.
- [ ] `SIM_TICK_IN_PAST`, `SIM_COMMAND_FORBIDDEN` e `SIM_COMMAND_DUPLICATE` têm teste próprio.
- [ ] `drain` de tick já drenado devolve lista vazia sem lançar.
- [ ] `pending()` está ordenado e serve ao snapshot.
- [ ] Ida e volta do log preserva conteúdo, ordem e canonicidade; decodificação parcial é impossível.
- [ ] Nenhum filesystem, relógio, aleatoriedade ou dependência externa entra no kernel.
- [ ] Docs, commit, integração e limpeza no modo declarado estão completos.

## Condições de parada

Pare se a definição de duplicata, a tabela de prioridades ou o formato do log precisar mudar, ou se
surgir necessidade de validar estado do mundo nesta camada.

## Persistência e relatório final

Registre contagem de testes, comandos/exit codes, modelo/effort, modo de conclusão e a próxima task
elegível. Não implemente aplicação de comando, tick ou eventos.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-03\tasks\PB-03-04-implementar-comandos-e-log.md

Leia o STATE.md do playbook PB-03 e apenas os arquivos indicados pela task. Crie a branch/worktree
indicada, comece por RED e implemente apenas packages/simulation/src/commands. A validação aqui é de
borda: não valide estado do mundo. Execute todos os gates, atualize o handoff conforme o modo
declarado, commite, integre por fast-forward na main no modo serial, reverifique e remova
worktree/branch.

Não implemente RNG, grid, eventos, loop de tick, snapshot, replay, CLI ou app. Se surgir decisão não
coberta, pare e registre o bloqueio. Não inicie a próxima task.
```
