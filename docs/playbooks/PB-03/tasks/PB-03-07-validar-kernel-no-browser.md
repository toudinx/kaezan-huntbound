# PB-03-07 — Validar o kernel no browser

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — contratos e golden já congelados

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; escalonamento somente por gatilho objetivo registrado

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** não.

## Objetivo

Dirigir o kernel no browser por um acumulador de frame e provar paridade de runtime: o snapshot
canônico produzido no Chromium é idêntico ao golden gerado em Node. Não renderizar nada, não criar
cena Phaser de gameplay e não tocar em regras.

## Resultado esperado

`apps/game` possui um host de simulação que converte tempo real em ticks fixos sem descartar tick, e
um probe test-only que executa o replay da fixture e devolve o snapshot canônico e seu SHA-256. Um
teste Playwright compara esse resultado com o golden do repositório.

## Dependências

- PB-03-06 `done` e integrado em `main`.
- Fixture `pb-03-kernel-coverage` e golden congelados.
- Padrão de probe test-only já estabelecido por `apps/game/src/assets/AssetRuntimeProbe.ts`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-03/STATE.md`;
3. `docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md`, seções “Tempo” e
   “Testes e gates”;
4. `docs/simulation/REPLAY_CONTRACT.md`;
5. `apps/game/src/assets/AssetRuntimeProbe.ts`, `createAssetRuntime.ts` e `main.ts`;
6. `apps/game/src/runtime/RuntimeLifecycle.ts`;
7. `tests/e2e/asset-pack.spec.ts` e `playwright.config.ts`;
8. `packages/simulation/src/index.ts`.

## Decisões congeladas

- `TICK_DURATION_MS = 50` e `MAX_FRAME_DELTA_MS = 250`.
- O host recebe o tempo por parâmetro: `advanceTo(nowMs)`. Ele não chama `performance.now()` nem
  `Date.now()` por conta própria; quem lê o relógio é a composition root.
- O delta por frame é clampado em 250 ms; o resto permanece no acumulador. Tick nunca é descartado.
- O host não interpola, não desenha, não cria sprite e não conhece Phaser.
- O probe só existe quando `import.meta.env.MODE === 'test'`, no mesmo padrão do probe de assets.
- O cenário e o log são injetados pelo processo Node do teste Playwright. PB-03 não publica artefato
  novo em `apps/game/public`.
- O SHA-256 do browser usa Web Crypto dentro de `apps/game`, nunca dentro de
  `packages/simulation`.
- Nenhuma regra de simulação nasce em `apps/game`.

## Escopo permitido

```text
apps/game/src/simulation/**
apps/game/src/index.ts
apps/game/package.json
tests/e2e/kernel-replay.spec.ts
tests/e2e/support/**
docs/simulation/REPLAY_CONTRACT.md
docs/playbooks/PB-03/STATE.md
```

## Fora de escopo

- cena Phaser de gameplay, sprites, câmera, input real e SceneBridge de simulação;
- HUD, DOM de gameplay e telas novas;
- alterar kernel, fixture, golden ou CLI sem defeito reproduzido;
- assets, conteúdo, save e performance de gameplay.

## Interfaces produzidas

```ts
export interface SimulationHost {
  readonly tick: TickIndex;
  advanceTo(nowMs: number): readonly SimulationEvent[];
  reset(nowMs: number): void;
}

export function createSimulationHost(
  kernel: SimulationKernel,
  startNowMs: number,
): SimulationHost;

export interface KernelProbeResult {
  readonly canonicalSnapshot: string;
  readonly snapshotSha256: string;
  readonly eventCount: number;
  readonly finalTick: number;
}

export function installKernelProbe(): void; // somente em MODE === 'test'
```

O probe expõe `globalThis.__huntboundKernelProbe.replay(scenarioJson, logText)` e devolve
`KernelProbeResult`.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb03-07-kernel-browser main
git worktree add C:\Kaezan\kaezan-huntbound-pb03-07-kernel-browser codex/pb03-07-kernel-browser
```

- [ ] **2. Escrever testes RED do acumulador.**

Prove, com relógio injetado: 49 ms não avança tick; 50 ms avança um; 149 ms avança dois e guarda
49 ms; 600 ms avança cinco e o excedente permanece no acumulador, sendo consumido nas chamadas
seguintes; delta negativo ou não finito é tratado como zero; `reset` zera o acumulador sem alterar o
kernel; a soma dos ticks em `n` chamadas fracionadas iguala a de uma chamada única equivalente.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-07-kernel-browser --filter @huntbound/game test
```

- [ ] **3. Implementar `createSimulationHost`; obter GREEN.**

- [ ] **4. Escrever testes RED do probe.**

Prove: o probe não é instalado fora do modo `test`; instalar duas vezes é idempotente; `replay`
devolve snapshot canônico e hash; entrada inválida devolve erro estruturado em vez de lançar string
crua.

- [ ] **5. Implementar o probe e o cálculo de SHA-256 por Web Crypto; obter GREEN.**

- [ ] **6. Escrever o teste Playwright de paridade.**

`tests/e2e/kernel-replay.spec.ts` lê `scenario.json`, `commands.jsonl`, `snapshot.golden.json` e
`snapshot.golden.sha256` no processo Node, injeta cenário e log no probe, e compara:

- o snapshot canônico do browser com o arquivo golden, byte a byte;
- o `snapshotSha256` do browser com o `.sha256` congelado;
- `finalTick` igual a 200;
- ausência de erro de console, erro de página e requisição falha, como já faz `asset-pack.spec.ts`.

- [ ] **7. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-07-kernel-browser --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-07-kernel-browser --filter @huntbound/game typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-07-kernel-browser --filter @huntbound/game build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-07-kernel-browser architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-07-kernel-browser simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-07-kernel-browser exec playwright test kernel-replay.spec.ts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-07-kernel-browser verify
git -C C:\Kaezan\kaezan-huntbound-pb03-07-kernel-browser diff --check
```

- [ ] **8. Provar que nenhuma regra vazou para o app.**

Faça um scan explícito em `apps/game/src/**` procurando por decisão de movimento, cooldown, custo,
direção aleatória ou constante de regra duplicada. O host só converte tempo em ticks e repassa
eventos. Registre o comando e o resultado no handoff.

- [ ] **9. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb03-07-kernel-browser add apps/game tests/e2e docs/simulation docs/playbooks/PB-03/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb03-07-kernel-browser commit -m "feat: prove kernel parity in the browser"
```

- [ ] **10. Integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb03-07-kernel-browser
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb03-07-kernel-browser
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb03-07-kernel-browser
```

## Critérios de aceite

- [ ] O acumulador respeita 50 ms, clampa em 250 ms e nunca descarta tick, com teste por relógio
      injetado.
- [ ] O host não lê relógio, não interpola e não conhece Phaser.
- [ ] O probe existe apenas no modo `test` e é idempotente.
- [ ] O snapshot canônico do browser é byte-idêntico ao golden e o SHA-256 confere.
- [ ] `finalTick` é 200 e não há erro de console, página ou rede no cenário.
- [ ] Nenhuma regra de simulação existe em `apps/game`, provado por scan registrado.
- [ ] `corepack pnpm verify` passa na worktree e no resultado integrado.
- [ ] Docs, handoff, commit, integração e limpeza estão completos.

## Condições de parada

Pare se o browser divergir do Node. Divergência de runtime é defeito de determinismo do kernel, não
de teste: registre o primeiro tick divergente, preserve a evidência e escale, em vez de ajustar o
golden ou relaxar a comparação.

## Persistência e relatório final

Registre em `STATE.md` o hash confirmado no browser, contagem de testes, comandos/exit codes,
modelo/effort, commit integrado, limpeza e PB-03-08 como próxima task. Não inicie a auditoria.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-03\tasks\PB-03-07-validar-kernel-no-browser.md

Leia o STATE.md do playbook PB-03 e apenas os arquivos indicados pela task. Crie a branch/worktree
indicada, comece por RED e implemente apenas apps/game/src/simulation, o probe test-only e o teste
Playwright de paridade. O host recebe o tempo por parâmetro e nunca descarta tick; o probe só existe
no modo test; o cenário e o log são injetados pelo processo Node do teste.

Execute todos os gates, incluindo verify, atualize STATE.md, commite, integre por fast-forward na
main, reverifique e remova worktree/branch.

Se o browser divergir do Node, pare, registre o primeiro tick divergente e escale. Não ajuste o
golden nem relaxe a comparação. Não crie cena Phaser de gameplay. Não inicie PB-03-08.
```
