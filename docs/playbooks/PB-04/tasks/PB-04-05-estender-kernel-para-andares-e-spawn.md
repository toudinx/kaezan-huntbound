# PB-04-05 — Estender o kernel para andares, transições e spawn

**Status inicial:** pending

**Classe da tarefa:** alteração de schema congelado e de regra do kernel — gatilho de escalonamento
pela política de modelos

**Modelo sugerido:** GPT-5.6 Sol `xhigh` ou Claude Opus 5. **Luna está excluída em qualquer effort**,
porque a task altera schema congelado e semântica do kernel.

**Validador sugerido:** prefira modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** sim, com PB-04-03, somente por ativação do supervisor. Paths disjuntos: esta task
toca `packages/contracts/src/simulation/**`, `packages/simulation/**`,
`packages/test-fixtures/simulation/pb03/**` e `tools/architecture/**`.

## Objetivo

Dar ao kernel espaço com múltiplos andares, transição automática ao pisar e sistema de spawn
determinístico, subindo `SIMULATION_SCHEMA_VERSION` para `3` e `SIMULATION_RULES_VERSION` para `2`,
e migrar o fixture do PB-03 no mesmo commit para que `main` nunca fique vermelha.

## Resultado esperado

Um kernel que resolve passo em três andares, transiciona sem encadear, nasce criaturas pela tabela do
cenário e continua restaurável em **qualquer** fronteira — com o journal golden do PB-03
byte-idêntico, provando que a mudança é de formato e capacidade, não de regra existente.

## Dependências

- PB-04-02 `done` e integrada em `main`.
- Fixture `pb-03-kernel-coverage` verde no estado atual.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-04/STATE.md`;
3. `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`, seções “Transições”, “Spawn”,
   “Versões e RNG”, “Regressão obrigatória do fixture PB-03”, “Fronteira kernel × conteúdo” e
   “Estado novo no snapshot”;
4. `docs/simulation/KERNEL_CONTRACT.md` inteiro;
5. `packages/simulation/src/**` inteiro;
6. `packages/contracts/src/simulation/**` inteiro;
7. `tools/architecture/simulation-boundaries.ts`.

## Decisões congeladas

- `SIMULATION_SCHEMA_VERSION`: `2` → `3`. `SIMULATION_RULES_VERSION`: `1` → `2`.
- `KernelScenario` v3 substitui `z` e `blockedTiles` por `floors`, e ganha `transitions` e
  `spawnGroups`. Não há compatibilidade com v2.
- Stream RNG novo: `spawn`. Os labels canônicos passam a ser `movement`, `ai`, `scenario`, `spawn`.
- `ActorState` ganha `transitionGuard: GridPosition | null`. `SimulationSnapshot` ganha
  `spawnSlots`.
- Transição dispara **ao entrar no tile por passo**, no fim de `S2 movement`, nunca por comando.
- Transição **não encadeia**: ao chegar, `transitionGuard` recebe a posição de chegada; ele é limpo
  quando o ator sai dessa célula. Disparo com guard ativo é defeito interno, não comportamento: o
  kernel falha o tick com `SIM_TRANSITION_CHAINED` em vez de continuar com estado inconsistente.
- Destino ocupado bloqueia o passo inteiro com causa `transition-blocked`; o ator fica na origem.
- Passo diagonal continua exigindo os dois ortogonais livres de terreno, **no andar de origem**.
  Transição não altera essa regra e não existe passo diagonal entre andares.
- Ordem dos sistemas passa a ser `S1 lifecycle` → `S2 movement` (com transição no fim) →
  `S3 ai` → `S4 spawn`. `S4` é o último para que o nascimento do tick `T` só possa ser observado a
  partir de `T`, e nunca dispute célula com um passo do mesmo tick.
- `S4` percorre grupos em ordem `(groupIndex, slotIndex)`; nasce na posição declarada quando livre;
  senão sorteia entre as células livres do raio pelo stream `spawn`; sem célula livre, emite
  `spawn/deferred` com `no-free-cell`; acima do teto, emite `spawn/capped` e `spawn/deferred` com
  `cap-reached`.
- Ator nascido entra com `readyAtTick = currentTick` e `transitionGuard = null`.
- Nenhum comando novo. O command log continua gravando somente comandos externos.
- Proibido em `packages/simulation/src/**`: relógio, `Math.random`, timers, `crypto`, dependência
  externa, **e** as identidades `serverId`, `clientId`, `lookType`, `huntId`, `regionId`.

## Escopo permitido

```text
packages/contracts/src/simulation/**
packages/simulation/src/**
packages/test-fixtures/simulation/pb03/**
tools/architecture/simulation-boundaries.ts
tools/architecture/simulation-boundaries.test.ts
tools/replay/**
package.json
docs/simulation/KERNEL_CONTRACT.md
docs/simulation/REPLAY_CONTRACT.md
docs/playbooks/PB-04/STATE.md
```

`tools/replay` entra no escopo apenas para acompanhar a mudança de schema; nenhuma funcionalidade
nova de CLI pertence a esta task.

## Fora de escopo

- `packages/content`, `packages/assets`, `tools/map-extractor`, `tools/tile-flags` e `apps/game`;
- `buildHuntScenario` e o fixture da hunt, que pertencem a PB-04-06;
- combate, dano, morte, loot, pathfinding e line of sight.

## Interfaces produzidas

```ts
export interface FloorGrid {
  readonly z: number;
  isBlockedTerrain(position: GridPosition): boolean;
}

export interface StaticGrid {
  readonly width: number;
  readonly height: number;
  readonly floors: readonly number[];
  hasFloor(z: number): boolean;
  isInside(position: GridPosition): boolean;
  isBlockedTerrain(position: GridPosition): boolean;
  transitionAt(position: GridPosition): GridPosition | undefined;
}

export function createStaticGrid(scenario: KernelScenario): StaticGrid;

export type StepOutcome =
  | {
      readonly ok: true;
      readonly to: GridPosition;
      readonly costTicks: number;
      readonly transitionedTo?: GridPosition;
    }
  | { readonly ok: false; readonly reason: MoveBlockedReason; readonly attempted: GridPosition };

export interface SpawnSlotRuntime {
  readonly groupIndex: number;
  readonly slotIndex: number;
  readonly readyAtTick: number;
  readonly entityId: EntityId | null;
}
```

`resolveStep` mantém a assinatura de PB-03-03 e ganha a resolução de transição no resultado.
`snapshotKernel` e `restoreSimulationKernel` mantêm as assinaturas e passam a carregar
`transitionGuard` e `spawnSlots`.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada, e instalar dependências.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb04-05-kernel-floors-spawn main
git worktree add C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn codex/pb04-05-kernel-floors-spawn
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn install --prefer-offline
```

- [ ] **2. Escrever testes RED do cenário v3 e do snapshot estendido.**

Em `packages/contracts`: cenário com `z`/`blockedTiles` é rejeitado; `floors` vazio ou fora de ordem
é rejeitado; transição com `from` ou `to` em andar ausente é rejeitada; `transitionGuard` fora do
grid é rejeitado; `spawnSlots` fora de ordem `(groupIndex, slotIndex)` ou com par repetido é
rejeitado; `spawnSlots.entityId` apontando para ator ausente é rejeitado; snapshot com
`schemaVersion: 2` é rejeitado com `SIM_VERSION_MISMATCH`.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn --filter @huntbound/contracts test
```

Esperado: RED.

- [ ] **3. Implementar o cenário v3, o snapshot estendido e as versões; obter GREEN.**

Acrescente `spawn` aos labels canônicos no mesmo passo.

- [ ] **4. Provar que o stream novo não desloca os antigos.**

Escreva um teste que, para a seed `0f1e2d3c4b5a6978`, compare os oito primeiros `nextUint32()` de
`movement`, `ai` e `scenario` com os vetores golden registrados em PB-03-02:

```text
ai:       f1d5ad77 ce8a401b 9ead377c edd33fe5 327526b4 2f753712 826067ea 387f9b0a
movement: 9046423d fcd233cd 207a837d a83cf41a 1adb5830 2241cdbd edbec034 3471c9d1
scenario: fc89a05c 535ac971 733b1b1a 27af86d8 0fcb29a6 971986f7 ab6025df 6f306771
```

Registre também os oito primeiros de `spawn` como vetor golden novo. Se algum dos três antigos
divergir, a derivação por label foi quebrada: **pare**.

- [ ] **5. Escrever testes RED do grid multi-floor.**

Prove: `hasFloor` responde pelos andares declarados; `isInside` rejeita `z` ausente; terreno é por
andar e o mesmo `(x, y)` pode ser livre em um andar e bloqueado em outro; ocupação é global e dois
atores em andares diferentes podem compartilhar `(x, y)`; corte de canto diagonal usa o andar de
origem.

O caso de ocupação entre andares é o erro fácil: o índice de PB-03 usava chave derivada de `(x, y)`.
A chave passa a incluir `z`, e o teste que prova isso é obrigatório.

- [ ] **6. Implementar o grid multi-floor; obter GREEN.**

- [ ] **7. Escrever testes RED de transição.**

Prove: passo para tile com transição move o ator e emite `actor/moved` seguido de
`actor/transitioned`, nessa ordem; `transitionGuard` fica igual à posição de chegada; um segundo
passo que retorne ao tile de origem limpa o guard; chegar num tile que também é transição não
encadeia no mesmo tick; sair e voltar ao tile de chegada volta a permitir transição; destino ocupado
bloqueia com `transition-blocked` e o ator permanece na origem, sem emitir `actor/moved`; transição
não consome RNG.

- [ ] **8. Implementar a transição no fim de `S2`; obter GREEN.**

- [ ] **9. Escrever testes RED do sistema de spawn.**

Prove: slot nasce na posição declarada quando livre; posição ocupada leva ao sorteio pelo stream
`spawn` entre células livres do raio, e o sorteio é reprodutível para a mesma seed; sem célula livre
emite `spawn/deferred` com `no-free-cell` e tenta de novo no tick seguinte; `readyAtTick` respeita
`respawnTicks` após `scenario/despawn-actor`; o teto de atores vivos emite `spawn/capped`; `S4` roda
depois de `S3`, provado por um caso em que um passo do mesmo tick libera a célula e o nascimento a
ocupa; grupos e slots são percorridos na ordem canônica, provado por duas ordens de entrada com a
mesma composição.

- [ ] **10. Implementar `S4 spawn`; obter GREEN.**

- [ ] **11. Escrever teste RED de fidelidade de restauração.**

Varra **todas** as fronteiras de um cenário sintético que contenha transição e spawn, e exija
convergência de snapshot final e de cauda de eventos. Amostragem não satisfaz o critério. Este é o
teste que pega o esquecimento de `transitionGuard` ou de `spawnSlots` no snapshot.

- [ ] **12. Implementar a serialização dos dois campos; obter GREEN.**

- [ ] **13. Estender a regra executável de fronteira.**

Acrescente a `tools/architecture/simulation-boundaries.ts` a reprovação de `serverId`, `clientId`,
`lookType`, `huntId` e `regionId` em `packages/simulation/src/**`, com teste positivo e negativo.
Corrija também o enumerador de `node --test` no `package.json` da raiz para incluir
`simulation-boundaries.test.ts` e `content-boundaries.test.ts`, que hoje ficam fora do gate agregado.
Essa correção é obrigatória aqui porque a regra nova precisa entrar em gate.

- [ ] **14. Migrar o fixture do PB-03 e provar que a semântica não mudou.**

Converta `packages/test-fixtures/simulation/pb03/scenario.json` para a forma v3 com um único andar
(`floors: [{ z: 7, blockedTiles: [...] }]`, `transitions: []`, `spawnGroups: []`) e regenere o
snapshot golden.

O critério é bloqueante:

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn diff --stat packages/test-fixtures/simulation/pb03/events.golden.jsonl
```

Esperado: **vazio**. `events.golden.jsonl` deve permanecer byte-idêntico, com hash
`31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4`. Se o journal mudar, a regra
mudou: pare, identifique a causa e reporte. Não regenere o journal para "fazer passar".

O `snapshot.golden.json` **vai** mudar, porque ganha `transitionGuard` e `spawnSlots`. Registre o
hash novo.

- [ ] **15. Documentar.**

Atualize `docs/simulation/KERNEL_CONTRACT.md` com andares, transições, `S4`, `transitionGuard`,
`spawnSlots`, o stream `spawn`, os eventos novos e as versões. Atualize
`docs/simulation/REPLAY_CONTRACT.md` com os hashes novos e a nota de migração.

- [ ] **16. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn --filter @huntbound/contracts test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn exec vitest run --config tools/replay/vitest.config.ts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn format:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn verify
git -C C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn diff --check
```

Rode `simulation:check` e `verify` **duas vezes seguidas**, sem alterar a árvore entre elas, e
confirme que o segundo run também passa. Idempotência já reprovou uma auditoria neste repositório.

- [ ] **17. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn add packages tools package.json docs
git -C C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn commit -m "feat: give the kernel floors, transitions and spawn"
```

Em modo paralelo, não edite `STATE.md`: deixe PB-04-06 consolidar o handoff.

- [ ] **18. Integrar e limpar.**

Modo serial:

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb04-05-kernel-floors-spawn
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb04-05-kernel-floors-spawn
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb04-05-kernel-floors-spawn
```

Modo paralelo: remova a worktree limpa após o commit e preserve a branch para PB-04-06.

## Critérios de aceite

- [ ] O cenário v3 rejeita o formato v2 com diagnóstico próprio.
- [ ] Os vetores golden de `movement`, `ai` e `scenario` são idênticos aos de PB-03-02, e `spawn` tem
      vetor golden novo registrado.
- [ ] Ocupação distingue andares; a chave do índice inclui `z`, provado por teste.
- [ ] Transição move, emite `actor/transitioned`, não encadeia e libera o guard ao sair.
- [ ] Destino ocupado bloqueia com `transition-blocked` sem emitir `actor/moved`.
- [ ] `S4 spawn` roda depois de `S3`, percorre em ordem canônica e cobre `no-free-cell` e
      `cap-reached`.
- [ ] A restauração é fiel em **todas** as fronteiras varridas, com `transitionGuard` e `spawnSlots`
      serializados.
- [ ] `events.golden.jsonl` do PB-03 permaneceu byte-idêntico.
- [ ] A regra de fronteira reprova identidade Tibia no kernel e roda em gate agregado.
- [ ] `simulation:check` e `verify` passam em duas execuções consecutivas.
- [ ] Nenhum comando novo entrou; `commandPriority` está inalterado.

## Condições de parada

**Pare** se `events.golden.jsonl` mudar; se algum vetor golden de RNG antigo divergir; se a ordem
`S3` antes de `S4` produzir disputa de célula não resolvível deterministicamente; ou se transição ou
spawn exigirem comando novo, float ou leitura de relógio.

## Persistência e relatório final

Registre contagem de testes por pacote, mutações executadas, hashes antes e depois, comandos/exit
codes, modelo/effort, modo de conclusão e a próxima task elegível. Declare explicitamente que
`events.golden.jsonl` não mudou e mostre o comando que provou isso.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol e effort xhigh, ou com Claude Opus 5.
Nao use Luna nesta task: ela altera schema congelado e semantica do kernel.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-04\tasks\PB-04-05-estender-kernel-para-andares-e-spawn.md

Leia o STATE.md do playbook PB-04 e apenas os arquivos indicados pela task. Crie a branch/worktree
indicada e rode "corepack pnpm install --prefer-offline" dentro dela antes de qualquer gate.

Comece por RED. Suba o schema para 3 e as rules para 2, implemente andares, transicao automatica sem
encadeamento e o sistema de spawn como S4, e serialize transitionGuard e spawnSlots. Prove a
fidelidade de restauracao varrendo TODAS as fronteiras, nao por amostragem.

Criterio bloqueante: packages/test-fixtures/simulation/pb03/events.golden.jsonl deve permanecer
byte-identico apos a migracao do fixture. Se ele mudar, a regra mudou: PARE e reporte. Nunca
regenere o journal para fazer teste passar.

Rode simulation:check e verify duas vezes seguidas sem alterar a arvore. Atualize o handoff conforme
o modo declarado, commite, integre por fast-forward na main no modo serial, reverifique e limpe
worktree/branch removendo o diretorio antes do prune.

Não toque em packages/content, packages/assets, tools/map-extractor, tools/tile-flags ou apps/game.
Se surgir decisão não coberta, pare e registre o bloqueio. Não inicie a próxima task.
```
