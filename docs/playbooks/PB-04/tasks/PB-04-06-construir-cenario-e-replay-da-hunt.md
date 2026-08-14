# PB-04-06 — Construir o cenário e o replay da hunt

**Status inicial:** pending

**Classe da tarefa:** integração de subsistemas com congelamento de golden

**Modelo sugerido:** GPT-5.6 Sol `xhigh`

**Validador sugerido:** prefira modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** não. Ela é a integradora de PB-04-04 e PB-04-05 e consolida o handoff se aquelas
tiverem rodado em paralelo.

## Objetivo

Traduzir `HuntDefinition` em `KernelScenario` v3, congelar a sessão golden `pb-04-hunt-session` e
colocá-la em gate por `hunt:check`. Não renderizar, não empacotar mídia e não tocar em `apps/game`.

## Resultado esperado

`buildHuntScenario` em `@huntbound/content` e um fixture de 600 ticks que reproduz snapshot e journal
byte-idênticos em execuções limpas, converge em todas as fronteiras e detecta divergência ao mudar
seed, comando ou `rulesVersion`.

## Dependências

- PB-04-04 e PB-04-05 `done` e integradas em `main`.
- Região gerada em `packages/content/src/generated/hunts/venore-rotworm-cave/`.
- Kernel com andares, transições e spawn.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-04/STATE.md`;
3. `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`, seções “Fronteira kernel ×
   conteúdo” e “Fixture e prova de determinismo”;
4. `docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`;
5. `docs/content/MAP_REGION_CONTRACT.md`;
6. `packages/content/src/**` e `packages/contracts/src/hunt/**`;
7. `tools/replay/**`;
8. `packages/test-fixtures/simulation/pb03/**` como referência de formato de fixture.

## Decisões congeladas

- `buildHuntScenario` mora em `@huntbound/content`, que depende somente de `@huntbound/contracts`.
  `packages/simulation` **não** ganha dependência nenhuma.
- A tradução é total e sem heurística: `region.collision` vira `floors[].blockedTiles`;
  `transitions.entries` vira `scenario.transitions`; `spawns.groups` vira `scenario.spawnGroups`;
  `blueprints` e `playerStart` vêm da `HuntDefinition`.
- Nenhuma identidade Tibia atravessa: `palette`, `creatureKey`, `serverId` e `regionId` ficam no lado
  do conteúdo. `blueprintId` é a única ponte, e é kebab-case.
- `scenarioId` é derivado de `huntId` de forma determinística e documentada; `scenarioRevision` vem
  de `huntRevision`.
- Fixture: `pb-04-hunt-session`, seed `1a2b3c4d5e6f7a8b`, `600` ticks, retomada em `313`.
- O command log da sessão contém somente comandos externos, e o jogador é o único emissor `player`.
- Cobertura obrigatória do log: passo nos dois andares, uma transição em cada sentido, um respawn
  completo, um `spawn/deferred`, uma colisão com criatura e um comando rejeitado.
- Golden divergente nunca é reescrito para "fazer passar".

## Escopo permitido

```text
packages/content/src/hunts/**
packages/content/src/index.ts
packages/test-fixtures/hunt/pb04/**
tools/replay/**
package.json
biome.json
docs/simulation/REPLAY_CONTRACT.md
docs/playbooks/PB-04/STATE.md
```

## Fora de escopo

- `packages/simulation`, `packages/contracts`, `packages/assets`, `apps/game`;
- `tools/map-extractor` e `tools/tile-flags`;
- renderização, câmera, input, sprites e mídia.

## Interfaces consumidas

- `HuntDefinition`, `KernelScenario` v3, `Seed`, `SimulationValidationResult` e
  `validateKernelScenario` de `@huntbound/contracts`.
- `runReplay`, `snapshotKernel`, `restoreSimulationKernel` e `encodeCanonicalJson` de
  `@huntbound/simulation`, inalterados desde PB-03-06.

## Interfaces produzidas

```ts
export function buildHuntScenario(
  hunt: HuntDefinition,
  seed: Seed,
): SimulationValidationResult<KernelScenario>;

export function loadHuntDefinition(raw: unknown): SimulationValidationResult<HuntDefinition>;
```

Fixture em `packages/test-fixtures/hunt/pb04/`:

```text
scenario.json           cenário v3 derivado da HuntDefinition
commands.jsonl          command log externo da sessão
snapshot.golden.json    snapshot canônico do tick 600
events.golden.jsonl     journal completo
hashes.md               os quatro SHA-256 congelados
```

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada, e instalar dependências.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb04-06-hunt-replay main
git worktree add C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay codex/pb04-06-hunt-replay
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay install --prefer-offline
```

Se PB-04-04 e PB-04-05 rodaram em paralelo, integre as duas branches serialmente **antes** de
começar, rode `verify` no conjunto e só então crie esta branch. Não faça rebase nem merge commit sem
necessidade comprovada.

- [ ] **2. Escrever testes RED de `buildHuntScenario`, com `HuntDefinition` sintética.**

Use uma hunt de 4 × 4 com dois andares construída no próprio teste, nunca a região real. Prove:

- `collision` de cada andar vira `blockedTiles` na ordem `(y, x)`;
- `transitions.entries` atravessa sem perda e mantém a ordem canônica;
- `spawns.groups` atravessa com centro, raio, slots e `respawnTicks` preservados;
- `playerStart` vira o ator inicial com `playerBlueprintId`;
- o cenário resultante passa em `validateKernelScenario`;
- **nenhuma** chave do cenário contém `palette`, `serverId`, `clientId`, `creatureKey` ou `regionId`,
  provado por varredura do JSON serializado, não por inspeção visual;
- `scenarioId` é determinístico: construir duas vezes a mesma hunt dá a mesma string;
- hunt com `blueprintId` de slot ausente devolve diagnóstico em vez de cenário.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay --filter @huntbound/content test
```

Esperado: RED por módulo ausente.

- [ ] **3. Implementar `buildHuntScenario` e `loadHuntDefinition`; obter GREEN.**

- [ ] **4. Construir o cenário real e inspecioná-lo antes de gravar o golden.**

Gere o cenário a partir da região extraída e confira: número de andares, tiles bloqueados por andar,
número de transições e de grupos de spawn. Compare com os números registrados por PB-04-04. Uma
divergência aqui é defeito de tradução, não motivo para ajustar o golden.

- [ ] **5. Escrever o command log da sessão.**

Componha `commands.jsonl` cobrindo, cada um deliberadamente:

- passos no andar de entrada até a transição;
- a transição para o andar inferior;
- passos no andar inferior, incluindo um bloqueado por criatura;
- a transição de volta;
- um `scenario/despawn-actor` que force respawn dentro dos 600 ticks;
- um comando inválido que produza `command/rejected`.

Documente, linha a linha no relatório, qual cobertura cada bloco de comandos entrega. Um log que
"passa" mas não cobre não satisfaz o critério.

- [ ] **6. Escrever testes RED do replay da hunt.**

Prove: duas execuções limpas produzem snapshot e journal byte-idênticos; a retomada converge em
**todas** as fronteiras `0..600`; trocar a seed muda o digest; trocar um comando que muda estado muda
o digest; trocar um comando bloqueado muda o journal e não o snapshot; declarar `rulesVersion`
diferente é recusado com `SIM_VERSION_MISMATCH`; o journal contém pelo menos um
`actor/transitioned`, um `spawn/deferred` e um `command/rejected`.

- [ ] **7. Gerar e congelar os goldens; obter GREEN.**

Registre os quatro SHA-256 em `hashes.md` e no relatório.

- [ ] **8. Criar o gate `hunt:check`.**

Acrescente ao `package.json` da raiz um script que rode `replay verify` sobre a sessão da hunt, no
mesmo formato de `simulation:check`. Insira-o em `check` e em `verify`, **depois** de
`simulation:check`. Ele não depende de `references/` — o fixture é versionado — então pode entrar no
gate agregado.

Se o Biome quiser reformatar os goldens, exclua-os em `biome.json` no padrão já usado por
`packages/test-fixtures/simulation/pb03`.

- [ ] **9. Documentar.**

Atualize `docs/simulation/REPLAY_CONTRACT.md` com a sessão da hunt: formato, hashes, cobertura do
log, exit codes e política de regeneração.

- [ ] **10. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay --filter @huntbound/content test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay exec vitest run --config tools/replay/vitest.config.ts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay format:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay verify
git -C C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay diff --check
```

Rode `hunt:check` e `verify` **duas vezes seguidas**, sem alterar a árvore entre elas.

- [ ] **11. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay add packages tools package.json biome.json docs
git -C C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay commit -m "feat: reproduce the first hunt session"
```

Consolide em `STATE.md` os handoffs de PB-04-04 e PB-04-05 se elas rodaram em paralelo, e apague as
branches delas somente depois de comprovar a integração.

- [ ] **12. Integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb04-06-hunt-replay
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb04-06-hunt-replay
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb04-06-hunt-replay
```

## Critérios de aceite

- [ ] `buildHuntScenario` traduz colisão, transições, spawns e ator inicial sem perda.
- [ ] Nenhuma identidade Tibia atravessa para o cenário, provado por varredura do JSON.
- [ ] `scenarioId` é determinístico.
- [ ] O command log cobre os seis casos exigidos, com o mapeamento registrado.
- [ ] Duas execuções limpas produzem snapshot e journal byte-idênticos.
- [ ] A retomada converge em todas as fronteiras `0..600`.
- [ ] Seed, comando e `rulesVersion` divergentes são detectados, com o caso de comando bloqueado
      distinguido do caso que muda estado.
- [ ] `hunt:check` existe, entra em `check` e `verify`, e passa em duas execuções consecutivas.
- [ ] Os quatro hashes estão registrados em `hashes.md` e no relatório.

## Condições de parada

Pare se a tradução exigir heurística ou dado ausente da `HuntDefinition`; se o cenário real divergir
dos números medidos por PB-04-04; se a região não permitir cobrir os seis casos em 600 ticks; ou se
algum golden divergir sem causa identificada.

## Persistência e relatório final

Registre contagem de testes, números do cenário real, cobertura linha a linha do command log, os
quatro hashes, comandos/exit codes, modelo/effort, modo de conclusão e a próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-04\tasks\PB-04-06-construir-cenario-e-replay-da-hunt.md

Leia o STATE.md do playbook PB-04 e apenas os arquivos indicados pela task. Se PB-04-04 e PB-04-05
rodaram em paralelo, integre as duas branches serialmente e rode verify no conjunto antes de comecar.
Crie a branch/worktree indicada e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED com HuntDefinition sintetica; so use a regiao real depois de verde. Prove por
varredura do JSON que nenhuma identidade Tibia atravessa para o cenario. Componha o command log
cobrindo deliberadamente passo nos dois andares, transicao nos dois sentidos, respawn, spawn/deferred,
colisao com criatura e comando rejeitado, e registre linha a linha qual bloco entrega qual cobertura.

Prove a retomada em TODAS as fronteiras 0..600. Congele os quatro hashes, crie o gate hunt:check em
check e verify, e rode hunt:check e verify duas vezes seguidas sem alterar a arvore.

Golden divergente nunca e reescrito para fazer passar: se divergir, pare e identifique a causa.
Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe worktree/branch
removendo o diretorio antes do prune.

Não renderize, não empacote midia e não toque em apps/game. Se surgir decisão não coberta, pare e
registre o bloqueio. Não inicie a próxima task.
```
