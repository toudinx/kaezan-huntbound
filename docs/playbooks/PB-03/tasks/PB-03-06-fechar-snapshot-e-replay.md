# PB-03-06 — Fechar snapshot e replay

**Status inicial:** pending

**Classe da tarefa:** implementação complexa — congela o golden e a prova de determinismo

**Modelo sugerido:** GPT-5.6 Sol `xhigh`

**Validador sugerido:** Claude Code/Opus 5, preferencialmente diferente do implementador de PB-03-05

**Rota:** `superpowers:test-driven-development` + `superpowers:systematic-debugging` +
`superpowers:verification-before-completion`.

**Paralelismo:** não.

## Objetivo

Fechar a serialização canônica, o snapshot com restore fiel, o replay a partir de command log e a CLI
Node que executa, verifica e calcula SHA-256. Congelar a fixture `pb-03-kernel-coverage` com seus
golden. Não tocar no app nem no browser.

## Resultado esperado

Duas execuções limpas do replay produzem snapshot e journal byte-idênticos; retomar de um snapshot
intermediário converge para o mesmo resultado final; e `corepack pnpm simulation:check` falha quando
seed, comando, cenário ou versão de regras diverge.

## Dependências

- PB-03-05 `done` e integrado em `main`.
- Kernel funcional com `state()`, `advanceOne()`, `advance()` e `enqueue()`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-03/STATE.md`;
3. `docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md`, seções “Serialização
   canônica e hash”, “Command log” e “Fixture e prova de determinismo”;
4. `docs/simulation/KERNEL_CONTRACT.md`;
5. `packages/simulation/src/**`;
6. `tools/asset-packer/cli.ts` e `package.json` da raiz, como referência de CLI e de script;
7. `packages/test-fixtures/package.json` e `tsconfig.json`.

## Decisões congeladas

- `encodeCanonicalJson` ordena chaves por code unit UTF-16, sem espaço supérfluo, e termina com
  newline no arquivo, não na string de valor.
- O encoder recusa `undefined`, função, símbolo, `NaN`, `Infinity`, `-0` e número não inteiro, com
  `SIM_STATE_NOT_INTEGER` ou `SIM_STATE_NOT_SERIALIZABLE`.
- O kernel não calcula SHA-256. O digest fica na CLI e nos testes de nível de ferramenta.
- Snapshot contém `schemaVersion`, `rulesVersion`, `scenarioId`, `scenarioRevision`, `seed`, `tick`,
  `nextEntityId`, `nextEventSequence`, `nextCommandSequence`, `randomStreams`, `actors` e
  `pendingCommands`. Não contém terreno, ocupação nem hash do cenário.
- `actors` ordenado por `entityId`; `randomStreams` por `label`; `pendingCommands` por
  `(tick, sequence)`.
- `restoreSimulationKernel` recusa cenário, revisão ou versões divergentes com
  `SIM_SCENARIO_MISMATCH` ou `SIM_VERSION_MISMATCH`.
- Cenário do fixture: `pb-03-kernel-coverage`, revisão `1`, grid 16×16 em `z = 7`.
- Seed do fixture: `0f1e2d3c4b5a6978`. Execução de `200` ticks, com retomada em `117`.
- Blueprints do fixture: `walker` (`stepCooldownTicks: 2`, `inert`), `wanderer`
  (`stepCooldownTicks: 3`, `wander`) e `statue` (`stepCooldownTicks: 0`, `inert`).
- O log do fixture cobre passo válido, passo em cooldown, diagonal ilegal, destino ocupado, fora de
  limites, entidade inexistente, emissor proibido, spawn e despawn.
- Golden divergente nunca é reescrito para “fazer passar”. Regeneração exige causa identificada e,
  quando a semântica mudar, bump de `SIMULATION_RULES_VERSION`.

## Escopo permitido

```text
packages/simulation/src/state/**
packages/simulation/src/replay/**
packages/simulation/src/index.ts
packages/test-fixtures/simulation/pb03/**
tools/replay/**
package.json
docs/simulation/KERNEL_CONTRACT.md
docs/simulation/REPLAY_CONTRACT.md
docs/playbooks/PB-03/STATE.md
biome.json
```

`biome.json` só pode ser tocado para excluir árvore gerada do formatador, se e somente se um golden
gerado conflitar com o `format:check`, no mesmo padrão já usado por assets.

## Fora de escopo

- app, browser, Playwright e Phaser, que são PB-03-07;
- alterar regras do kernel sem defeito reproduzido;
- conteúdo Canary, assets, mapa real e gameplay;
- performance, profiling e budget.

## Interfaces produzidas

```ts
export function encodeCanonicalJson(value: unknown): string;

export function snapshotKernel(kernel: SimulationKernel): SimulationSnapshot;
export function restoreSimulationKernel(
  scenario: KernelScenario,
  snapshot: SimulationSnapshot,
): SimulationValidationResult<SimulationKernel>;

export interface ReplayResult {
  readonly snapshot: SimulationSnapshot;
  readonly events: readonly SimulationEvent[];
}

export function runReplay(
  scenario: KernelScenario,
  log: SimulationCommandLog,
): SimulationValidationResult<ReplayResult>;
```

CLI em `tools/replay/cli.ts`:

```text
run     --scenario <path> --log <path> [--out <path>]
verify  --scenario <path> --log <path> --snapshot <path> --events <path>
hash    --file <path>
```

`verify` compara byte a byte o snapshot canônico e o journal canônico contra os golden, e devolve
exit code estável: 0 sucesso, 1 divergência, 2 entrada inválida.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb03-06-kernel-replay main
git worktree add C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay codex/pb03-06-kernel-replay
```

- [ ] **2. Escrever testes RED do encoder canônico.**

Prove: chaves ordenadas por code unit, incluindo chaves com dígito, maiúscula e acento; arrays
preservam ordem; string com aspas, barra invertida, newline e caractere não ASCII é escapada de forma
estável; `1.5`, `NaN`, `Infinity`, `-0`, `undefined`, função e símbolo falham com o código correto;
inteiro negativo e zero são aceitos; a saída de dois objetos com as mesmas chaves em ordens
diferentes é idêntica.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay --filter @huntbound/simulation test
```

- [ ] **3. Implementar `encodeCanonicalJson`; obter GREEN.**

- [ ] **4. Escrever testes RED de snapshot e restore.**

Prove: `snapshotKernel` produz as ordenações congeladas; restore reconstrói ocupação e continua a
simulação de forma idêntica; `drawCount` e estados de RNG sobrevivem ao restore; comandos pendentes
para ticks futuros sobrevivem; snapshot de outro `scenarioId` ou de outra revisão é recusado; versão
divergente é recusada; o snapshot não contém terreno nem ocupação.

- [ ] **5. Implementar snapshot e restore; obter GREEN.**

- [ ] **6. Escrever testes RED do replay em memória.**

Prove: `runReplay` aplica cada comando no seu tick; log com header divergente do cenário é recusado;
executar duas vezes o mesmo log produz snapshot e eventos idênticos; dividir a execução em `0→117` e
`117→200` com restore produz o mesmo snapshot final e a mesma cauda de eventos.

- [ ] **7. Implementar `runReplay`; obter GREEN.**

- [ ] **8. Criar a fixture versionada.**

Escreva `packages/test-fixtures/simulation/pb03/scenario.json` e `commands.jsonl` à mão ou por um
gerador determinístico versionado. O cenário precisa conter parede que force `terrain`, canto que
force `diagonal-corner` e corredor de largura 1 que force `occupied`. O log precisa cobrir os nove
casos listados nas decisões congeladas.

- [ ] **9. Implementar a CLI e gerar os golden.**

```powershell
node --no-warnings --experimental-transform-types tools/replay/cli.ts run --scenario packages/test-fixtures/simulation/pb03/scenario.json --log packages/test-fixtures/simulation/pb03/commands.jsonl --out packages/test-fixtures/simulation/pb03
```

Gere `snapshot.golden.json`, `events.golden.jsonl` e os arquivos `.sha256` de `scenario.json`,
`commands.jsonl`, `snapshot.golden.json` e `events.golden.jsonl`.

- [ ] **10. Escrever testes RED da CLI e das provas de determinismo.**

Em `tools/replay/*.test.ts`, prove: `verify` em exit 0 sobre os golden; exit 1 ao trocar um bit da
seed no header; exit 1 ao alterar um comando do log; exit 1 ao alterar `rulesVersion`; exit 2 para
JSON inválido; `hash` estável entre execuções; `run` duas vezes produz arquivos byte-idênticos,
comparados por digest.

- [ ] **11. Registrar o script de gate.**

Acrescente ao `package.json` da raiz:

```text
"simulation:check": "node --no-warnings --experimental-transform-types tools/replay/cli.ts verify --scenario packages/test-fixtures/simulation/pb03/scenario.json --log packages/test-fixtures/simulation/pb03/commands.jsonl --snapshot packages/test-fixtures/simulation/pb03/snapshot.golden.json --events packages/test-fixtures/simulation/pb03/events.golden.jsonl"
```

Inclua `simulation:check` em `check` e em `verify`, depois de `assets:check`.

- [ ] **12. Documentar.**

`docs/simulation/REPLAY_CONTRACT.md` registra formato canônico, snapshot, formato do log, comandos da
CLI, exit codes, os hashes congelados e a política de regeneração de golden.

- [ ] **13. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay --filter @huntbound/simulation typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay exec tsc --project tools/replay/tsconfig.json --noEmit
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay exec biome check packages/simulation tools/replay
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay format:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay verify
git -C C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay diff --check
```

Rode `verify` duas vezes seguidas e comprove exit 0 nas duas, como exigido desde PB-02-FIX-02.

- [ ] **14. Atualizar handoff e commitar.**

Registre em `STATE.md` os quatro SHA-256 congelados da fixture.

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay add packages/simulation packages/test-fixtures tools/replay package.json biome.json docs/simulation docs/playbooks/PB-03/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay commit -m "feat: reproduce deterministic kernel replay"
```

- [ ] **15. Integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb03-06-kernel-replay
corepack pnpm --dir C:\Kaezan\kaezan-huntbound simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb03-06-kernel-replay
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb03-06-kernel-replay
```

## Critérios de aceite

- [ ] O encoder canônico é estável e recusa float e valor não serializável com código próprio.
- [ ] Snapshot respeita as ordenações congeladas e não contém terreno nem ocupação.
- [ ] Restore reconstrói ocupação, RNG, `drawCount` e comandos pendentes.
- [ ] `0→200` e `0→117` + restore + `117→200` convergem no mesmo snapshot e na mesma cauda de
      eventos.
- [ ] Duas execuções limpas de `run` produzem arquivos byte-idênticos.
- [ ] `verify` devolve 0, 1 e 2 nos casos corretos, incluindo seed, comando e `rulesVersion`
      alterados.
- [ ] A fixture cobre `terrain`, `diagonal-corner`, `occupied`, `bounds`, `cooldown`, entidade
      inexistente, emissor proibido, spawn e despawn.
- [ ] `simulation:check` está em `check` e em `verify`, e `verify` é idempotente em duas execuções
      seguidas.
- [ ] Os quatro SHA-256 da fixture estão registrados em `STATE.md` e no contrato de replay.
- [ ] Docs, commit, integração e limpeza estão completos.

## Condições de parada

Pare se o determinismo falhar de forma intermitente, se o golden divergir sem causa identificada, se
for necessário alterar regra do kernel para fazer o replay passar, ou se o encoder precisar aceitar
float. Nenhuma dessas situações se resolve regenerando o golden.

## Persistência e relatório final

Registre em `STATE.md` os hashes congelados, contagem de testes, comandos/exit codes, modelo/effort,
commit integrado, limpeza e PB-03-07 como próxima task. Não toque no app.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development, superpowers:systematic-debugging e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-03\tasks\PB-03-06-fechar-snapshot-e-replay.md

Leia o STATE.md do playbook PB-03 e apenas os arquivos indicados pela task. Crie a branch/worktree
indicada, comece por RED e implemente serialização canônica, snapshot, restore, replay, a fixture
pb-03-kernel-coverage, a CLI tools/replay e o script simulation:check incluído em check e verify.

Prove repetição, retomada por snapshot em 117 e sensibilidade a seed, comando e rulesVersion. Rode
verify duas vezes seguidas e comprove exit 0 nas duas. Registre os quatro SHA-256 da fixture no
STATE.md, commite, integre por fast-forward na main, reverifique e remova worktree/branch.

Nunca regenere golden para fazer um teste passar. Não toque em apps/game, Playwright ou Phaser. Se
surgir decisão não coberta, pare e registre o bloqueio. Não inicie PB-03-07.
```
