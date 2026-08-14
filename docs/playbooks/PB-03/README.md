# PB-03 — Kernel determinístico

> **Para agentes executores:** skill obrigatória por task:
> `superpowers:test-driven-development` e `superpowers:verification-before-completion`. Execute uma
> task card por chat. O formato, handoff e ciclo automático de integração/limpeza seguem
> `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Status:** closed — a auditoria integrada PB-03-08 fechou o playbook como `APPROVED_WITH_WARNINGS`
sobre o commit auditado `f885535`. Evidências em
[`artifacts/acceptance-report.md`](artifacts/acceptance-report.md). PB-04 está elegível.

**Goal:** entregar um kernel headless que avança em tick fixo, deriva toda aleatoriedade de uma seed
serializável, resolve espaço em grid inteiro, aceita comandos validados, emite eventos ordenados e
reproduz um replay golden byte a byte em Node e no browser.

**Architecture:** `@huntbound/contracts` publica tipos branded, schemas Zod e diagnósticos.
`@huntbound/simulation` implementa o kernel sem nenhuma dependência externa, sem Node, sem DOM e sem
relógio. `tools/replay` roda e verifica o replay em Node e calcula SHA-256. `apps/game` dirige o
kernel por acumulador de frame e expõe um probe test-only para provar paridade de runtime.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.4.3 (somente em `@huntbound/contracts`),
Vitest 4.1.10, Vite 8.2.1, Playwright 1.62.1, Node 24.14.0. Nenhuma biblioteca de ECS, física,
pathfinding, hashing ou random entra no PB-03.

## Fontes normativas

Em caso de conflito, ler nesta ordem:

1. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`;
2. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`;
3. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`;
4. `docs/08_POLITICA_MODELOS_AGENTES.md`;
5. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`;
6. `docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md`;
7. `docs/architecture/PACKAGE_BOUNDARIES.md`;
8. este README;
9. a task card em execução;
10. `STATE.md` apenas para estado operacional.

## Restrições globais

- Node `24.14.0` e pnpm `11.21.0` via Corepack; zero instalação global.
- `@huntbound/simulation` permanece sem dependência externa: sem Zod, sem uuid, sem Node, sem DOM,
  sem Phaser.
- O kernel nunca lê relógio: `Date`, `performance`, `setTimeout`, `setInterval`, `queueMicrotask` e
  `crypto` são proibidos em `packages/simulation/src/**`.
- `Math.random` é proibido em todo o kernel; a única fonte de aleatoriedade é a seed.
- O estado serializado contém apenas inteiros seguros, booleanos e strings. Nenhum float.
- Tick é `50 ms`; o driver clampa o frame em `250 ms` e nunca descarta tick.
- SHA-256 é calculado fora do kernel; o kernel só produz JSON canônico.
- Comandos e eventos são conjuntos fechados nesta versão; ampliar exige nova task.
- O command log grava somente comandos externos; decisões de IA são reproduzidas pelo RNG.
- Nenhum conteúdo Canary, asset, mapa real ou regra de combate entra no PB-03.
- Toda fixture do kernel é sintética e versionada.

## Resultado independente

O cenário `pb-03-kernel-coverage` roda 200 ticks a partir da seed `0f1e2d3c4b5a6978` e produz sempre
o mesmo snapshot canônico e o mesmo journal de eventos:

| Prova | Verificação |
|---|---|
| Repetição | duas execuções limpas em Node são byte-idênticas |
| Retomada | `0→200` e `0→117` + restore + `117→200` convergem no mesmo snapshot |
| Paridade | browser e Node produzem o mesmo SHA-256 do snapshot canônico |
| Sensibilidade | mudar seed, comando ou `rulesVersion` é detectado como divergência |
| Isolamento | `packages/simulation` não referencia relógio, aleatoriedade global, Node, DOM ou Phaser |

O fixture cobre contratos do kernel; não é uma hunt. PB-04 continua responsável por escolher a
primeira hunt e por mapear `HuntDefinition` para cenário.

## Parâmetros congelados

| Parâmetro | Valor |
|---|---|
| `TICK_DURATION_MS` | `50` |
| `MAX_FRAME_DELTA_MS` | `250` |
| `SIMULATION_SCHEMA_VERSION` | `2` desde PB-03-06-FIX-01 (era `1`) |
| `SIMULATION_RULES_VERSION` | `1` |
| Seed do fixture | `0f1e2d3c4b5a6978` |
| Cenário do fixture | `pb-03-kernel-coverage`, revisão `1`, 16×16, `z = 7` |
| Ticks do fixture | `200`, com retomada em `117` |
| RNG | xoshiro128\*\* com seeding SplitMix32 e derivação FNV-1a 32 |
| Streams | `movement`, `ai`, `scenario` |
| Custo diagonal | `Math.ceil(base * 3 / 2)` ticks |
| Prioridade de comando | `scenario/*` 0, `actor/face` 1, `actor/move-step` 2, `actor/wait` 3 |

## Arquitetura alvo

```text
scenario.json + commands.jsonl
  └─► @huntbound/contracts (schemas, tipos branded, diagnósticos)
        └─► @huntbound/simulation
              ├─► random/    xoshiro128** + streams nomeados
              ├─► grid/      coordenadas, colisão, ocupação, passo
              ├─► commands/  buffer, validação, ordenação
              ├─► events/    journal por tick
              ├─► state/     world state, snapshot, JSON canônico
              └─► replay/    runReplay -> snapshot final + eventos
                    ├─► tools/replay (Node): run, verify, hash SHA-256
                    └─► apps/game/src/simulation: host por acumulador + probe test-only
```

### Fronteiras futuras

```text
packages/contracts/src/simulation/            tipos, schemas, versões e diagnósticos
packages/simulation/src/random/               PRNG e streams
packages/simulation/src/grid/                 espaço, colisão e ocupação
packages/simulation/src/commands/             buffer, validação e ordenação
packages/simulation/src/events/               journal e envelopes
packages/simulation/src/kernel/               loop de tick e sistemas
packages/simulation/src/state/                world state, snapshot e JSON canônico
packages/simulation/src/replay/               runReplay e comparação
packages/test-fixtures/simulation/pb03/       cenário, log, golden e hashes
tools/replay/                                 CLI Node run/verify/hash
tools/architecture/simulation-boundaries.ts   regra viva do kernel
apps/game/src/simulation/                     host, acumulador e probe test-only
docs/simulation/                              contrato do kernel e do replay
```

## Contratos obrigatórios

PB-03-01 congela nomes e assinaturas completos. As fronteiras mínimas são:

```ts
export type TickIndex = number & { readonly __brand: 'TickIndex' };
export type EntityId = number & { readonly __brand: 'EntityId' };
export type Seed = string & { readonly __brand: 'Seed' };
export type StreamLabel = string & { readonly __brand: 'StreamLabel' };

export interface SimulationKernel {
  readonly tick: TickIndex;
  advanceOne(): readonly SimulationEvent[];
  advance(ticks: number): readonly SimulationEvent[];
  enqueue(command: SimulationCommandInput): CommandAcceptance;
  snapshot(): SimulationSnapshot;
}
```

O kernel recebe documentos já validados por `@huntbound/contracts`, revalida somente invariantes
estruturais baratas e nunca depende de I/O. Toda saída observável passa por eventos.

## Ordem das tasks

| ID | Problema coeso | Dependência | Modelo/effort | Status |
|---|---|---|---|---|
| [PB-03-01](tasks/PB-03-01-definir-contratos-do-kernel.md) | tipos, schemas, versões e diagnósticos | PB-02 fechado | Luna `xhigh` | done |
| [PB-03-02](tasks/PB-03-02-implementar-rng-deterministico.md) | PRNG, streams e vetores golden | PB-03-01 | Luna `xhigh` | done |
| [PB-03-03](tasks/PB-03-03-implementar-grid-e-movimento.md) | grid, colisão, ocupação e passo | PB-03-01 | Luna `xhigh` | done |
| [PB-03-04](tasks/PB-03-04-implementar-comandos-e-log.md) | buffer, validação, ordenação e log | PB-03-01 | Luna `xhigh` | done |
| [PB-03-05](tasks/PB-03-05-implementar-loop-de-tick-e-eventos.md) | pipeline de tick, sistemas e journal | PB-03-02/03/04 | Sol `xhigh` | done |
| [PB-03-06](tasks/PB-03-06-fechar-snapshot-e-replay.md) | snapshot, restore, replay, CLI e golden | PB-03-05 | Sol `xhigh` | done |
| [PB-03-07](tasks/PB-03-07-validar-kernel-no-browser.md) | host, probe e paridade de runtime | PB-03-06 | Luna `xhigh` | done |
| [PB-03-08](tasks/PB-03-08-auditar-e-fechar-playbook.md) | auditoria integrada e aceite | PB-03-07 | Opus 5/Sol | done |

PB-03-02, PB-03-03 e PB-03-04 podem executar em paralelo após PB-03-01 porque seus paths funcionais
não se sobrepõem. O padrão é serial. Se o supervisor ativar paralelismo, os três removem worktrees
limpas, preservam branches e não disputam `STATE.md`; PB-03-05 integra os commits, atualiza o handoff
e apaga as branches somente depois dos gates integrados.

## Baseline de qualidade

- Branch-base: `main`.
- Spec aprovada: `docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md`.
- PB-01: `done`, golden bundle
  `d9df3338743365710fed991c185976b9dbbd59e6d5f9d43a679550db8fa154f3`.
- PB-02: `closed` em `1134fc8`, pack sintético
  `775d56f87b156349d9e81410d1703bac1499e1d332a2c1064dce498d18d97af5`.
- `corepack pnpm verify` estava verde e idempotente após PB-02-FIX-02.
- O Biome ignora `docs/**`; tasks validam documentação por `git diff --check` e leitura explícita.
- Fixtures geradas do kernel são texto versionado e entram no `format:check`; se um golden gerado
  conflitar com o formatador, ele é excluído do Biome como as árvores geradas de assets, nunca
  reformatado à mão.

## Critérios finais de aceite

Todos verificados pela auditoria PB-03-08 sobre o commit `f885535`; a evidência de cada um está na
matriz do [relatório de aceite](artifacts/acceptance-report.md).

- [x] Comandos, eventos, snapshot, cenário e log possuem schemas estritos e diagnósticos ordenados.
- [x] `@huntbound/simulation` não declara nem importa dependência externa, Node, DOM ou Phaser.
- [x] Nenhum `Date`, `performance`, `Math.random`, timer ou `crypto` existe no kernel, provado por
      `architecture:check`.
- [x] Nenhum float alcança o snapshot; o encoder canônico falha com diagnóstico próprio.
- [x] RNG tem vetores golden, streams isolados, `drawCount` serializado e `nextBelow` sem viés.
- [x] Fora de limites, terreno, ocupação, corte de canto e cooldown falham com códigos distintos.
- [x] Comando inválido nunca muta estado e sempre emite `command/rejected`.
- [x] Duas execuções limpas do replay produzem snapshot e journal byte-idênticos.
- [x] Retomada por snapshot em `117` converge para o mesmo snapshot final de `200`.
- [x] Browser e Node produzem o mesmo SHA-256 do snapshot canônico.
- [x] Trocar seed, comando ou `rulesVersion` é detectado como divergência explícita.
- [x] `corepack pnpm verify` passa no resultado integrado.
- [x] Relatório de aceite decide a elegibilidade de PB-04.

## Fora de escopo

- combate, dano, morte, loot, spell, vocação e qualquer regra Canary;
- mapa real, OTBM, tiles, camadas, spawn de hunt, câmera e transições;
- pathfinding, line of sight, área de efeito e projétil;
- SceneBridge de gameplay, renderização, interpolação e input real;
- save, IndexedDB, persistência de run e backend;
- helper, gacha, outfit e economia;
- budget de performance de gameplay, que pertence a PB-10;
- alterar PB-01 ou PB-02 sem defeito bloqueante reproduzido.

## Como executar

O playbook está fechado; não há task pendente aqui. O fluxo continua em PB-04, indicado por
`docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`.

Para referência histórica: cada task foi executada em um chat novo a partir do bloco copiável
indicado em `STATE.md`, criando branch/worktree, seguindo RED/GREEN, verificando, atualizando o
handoff, commitando, integrando por `--ff-only` no fluxo serial e removendo seus recursos
temporários.
