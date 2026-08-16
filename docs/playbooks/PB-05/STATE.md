# PB-05 — Estado operacional

**Playbook:** `docs/playbooks/PB-05/README.md`

**Estado geral:** execução em andamento. **PB-05-08 bloqueada** (B6): a sessão
congelada de 900 ticks sobre o cenário composto da hunt não consegue emitir
`combat/target-changed` nem `actor/spawned` de respawn de assento. B5
(hunt-budget) segue aberto e não é este bloqueio.

**Última atualização:** 2026-08-16

**Atualização vigente:** o compositor em `tools/replay/generatePb05CombatFixture.ts`
prova que golpe, as três habilidades, recusa de combate, morte e loot saem da
hunt real. Os dois eventos que faltam exigem mudar decisão congelada — fora de
escopo desta task.

**Próxima etapa:** decidir B6 antes de retomar PB-05-08. PB-05-09 (assets) é
paralela após PB-05-01 e não depende da fixture.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-05-01 | done | `grok/pb-05-01-vocation-spell-selection` | `2933012` (ff `2f455d5..2933012`) | `docs/content/PB-05-SELECTION.md` + CLI `check-combat` exit 0; `verify` pós-ff ainda vermelho em hunt-budget (B5) |
| PB-05-02 | done | `grok/pb-05-02-import-spells-character` | `f1e8dab` (ff `624dac7..f1e8dab`) | bundle com 3 spells + ficha; hash `b0b0a0b7…c77c770`; `content:check` 0×2 |
| PB-05-03 | done | `grok/pb-05-03-combat-contracts` | `6cec836` (neste fast-forward) | `packages/contracts/src/simulation/**` v4 + `KERNEL_CONTRACT.md`; 148 testes de contracts |
| PB-05-04 | done | `grok/pb-05-04-kernel-combat` | `188a61a` | kernel v4; journals golden byte-idênticos |
| PB-05-05 | done | `grok/pb-05-05-hunter-ai` | este commit | `hunter` em S6; 20 testes novos; journals PB-03/PB-04 byte-idênticos; `verify` 1 em B5 |
| PB-05-06 | blocked (QA browser) | `codex/pb-05-06-loot-autoloot` | `2f5d07c` (ff `6f36641..2f5d07c`) | `loot/granted` determinístico + projeção da bolsa fora do kernel; gates de código verdes, QA browser B5 vermelho |
| PB-05-07 | done | `grok/pb-05-07-content-to-combat` | `640f18e` (ff `5762fa4..640f18e`) | `buildHuntScenario` com combate; hunt.json `a11941b2…15e8eb6`; 77 testes content |
| PB-05-08 | blocked (B6) | `grok/pb-05-08-combat-fixture` | — | sessão real cobre 10/12 eventos; faltam `target-changed` (aggro 0) e respawn de assento (1800 ticks > 900) |
| PB-05-09 | done | `codex/pb-05-09-combat-assets` | `02b8c4a` | 140 entradas / 9520 bytes; `assets:check` 0 em duas execuções; B5 browser pré-existente mantém `verify` bloqueado |
| PB-05-10 | pending | `<agente>/pb05-10-combat-hud` | — | HUD, input, números de dano, autoloot e overlay de morte |
| PB-05-11 | pending | `<agente>/pb05-11-combat-browser-qa` | — | `artifacts/browser-qa.md` + 4 screenshots + specs estáveis sem `retries` |
| PB-05-12 | pending | `<agente>/pb05-12-integrated-gate` | — | `artifacts/acceptance-report.md` |

## Última task concluída

PB-05-07. Branch `grok/pb-05-07-content-to-combat` a partir de `main`
(`5762fa4`). Worktree irmã `C:\Kaezan\kaezan-huntbound-pb05-07-content`.
Fast-forward para `main` autorizado pela task card.

## Handoff PB-05-08 — 2026-08-16

**Status:** bloqueada (B6). Sem golden, sem `combat:check`, sem registro no
contrato de replay. A task card manda parar se a sessão não exercitar os
eventos exigidos sem alterar regra.

**Base:** `main` em `ecbc25cf2e7fa021f263525391e7ea5da914b85a`.

**Branch/worktree:** `grok/pb-05-08-combat-fixture`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-08-fixture`.

**Modelo/effort:** Grok 4.6 no Cursor, effort alto (`xhigh`).

**Desvio de branch:** a task card pedia `codex/pb-05-08-combat-fixture`; a
branch efetiva usa o prefixo `grok/` porque o executor é Grok. Worktree irmã
no path pedido.

**O que a sessão real já cobre** (compositor em
`tools/replay/generatePb05CombatFixture.ts`, seed `2c3d4e5f60718293`, 900
ticks, cenário de `buildHuntScenario` sem alteração):

| Evento | Presente |
|---|---|
| `combat/attacked` | sim |
| `combat/damaged` `cause: attack` | sim |
| `combat/damaged` `cause: ability` | sim |
| `combat/healed` (Wound Cleansing) | sim |
| `ability/cast` das três habilidades | sim |
| `command/rejected` de combate | sim |
| `actor/died` | sim (ticks `219` e `619`) |
| `loot/granted` | sim |
| `combat/target-changed` | **não** |
| `actor/spawned` de respawn de assento | **não** |

**Menor reprodutor de `combat/target-changed`:** `hunter.test.ts` já congela
`never acquires a target when aggroRadius is 0`. O blueprint `rotworm`
composto por PB-05-07 tem `aggroRadius` `0` (`MAP_REGION_CONTRACT.md`). O
kernel recusa aquisição quando o raio é `0`
(`packages/simulation/src/kernel/kernel.ts`, `isAcquirableTarget`). Sem
aquisição não há `combat/target-changed` e as criaturas não golpeiam o
jogador (o "dano recebido" da sessão congelada também não ocorre).

**Menor reprodutor de respawn de assento:** todos os 12 slots da hunt têm
`respawnTicks` `1800`. Mortes em `219` e `619` libertam o assento em
`2019` e `2419`. A sessão termina no tick `900`. O `actor/spawned` do tick
`219` é a entidade `13` em `(17,22,9)` — assento diferido que nasceu quando
o cap `maxLiveActors` `12` (jogador conta) caiu; não é o assento da morte em
`(14,9,8)`.

**Decisão pendente (escolher, não é desta task):**

1. Importar `targetDistance`/`flags` do snapshot e deixar de forçar
   `aggroRadius` `0` na composição — muda tradução de conteúdo (PB-05-07).
2. Subir `tickCount` da fixture para `>= 2419`, ou aceitar que respawn de
   assento de 90 s não cabe em 900 ticks — muda parâmetro congelado da spec
   PB-05 / desta task card.

Inventar raio no `scenario.json` da fixture, encurtar `respawnTicks` à mão
ou alterar o kernel para fazer a cobertura passar é conserto de passagem.
Não feito.

**Verificações:**

| Comando | Exit | Resultado |
|---|---:|---|
| `node --experimental-transform-types tools/replay/generatePb05CombatFixture.ts` | `0` | cobertura acima; `rotwormAggroRadius` `0`; `respawnTicks` `[1800]` |
| teste de cobertura em `tools/replay` (não commitado) | `1` | vermelho só em `targetChanged` e `respawnAfterDeath` |

Sem golden escrito. Sem `combat:check`. Goldens de PB-03/PB-04 não foram
tocados.

**Próxima ação:** devolver B6. PB-05-09 pode seguir em paralelo (depende só
de PB-05-01). Não retomar PB-05-08 sem a decisão.

## Handoff PB-05-09 — 2026-08-16

**Status:** implementação concluída no commit `02b8c4a`; a entrega foi
validada nos gates de código e assets. O `verify` não fechou por B5
(`hunt-budget`), já aberto antes desta task e fora do escopo permitido.

**Base:** `main` em `cda9c4849342dc9131cd5ee8b46ac226d37a68e1`.

**Branch/worktree:** `codex/pb-05-09-combat-assets`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-09-assets`.

**Modelo/effort:** GPT-5 Codex; effort interno não é exposto pelo runtime.
Revisão independente executada por subagente em modelo diferente, sem
alterações no workspace.

**Chaves acrescentadas ao pack `pb-04-venore-rotworm-cave`:**

| Stable key | Identidade de origem |
|---|---|
| `effect:tibia:draw-blood` | `effectId:1` (`CONST_ME_DRAWBLOOD`) |
| `item:tibia:small-splash` | `clientId:2889` (`ITEM_SMALLSPLASH`) |
| `effect:tibia:hit-area` | `effectId:10` (`CONST_ME_HITAREA`) |
| `effect:tibia:magic-blue` | `effectId:13` (`CONST_ME_MAGIC_BLUE`) |
| `missile:tibia:weapon-type` | `missileId:254` (`CONST_ANI_WEAPONTYPE`) |
| `item:tibia:dead-rotworm` | `clientId:5967` (`dead rotworm`) |

O profile `test` usa PNGs sintéticos 1×1 de 68 bytes para as seis chaves.
O índice `0` da palette continua filtrado antes da contagem.

**Orçamento:**

| Medição | Entradas | Bytes de mídia do pack |
|---|---:|---:|
| Antes | 134 | 9112 |
| Depois | 140 | 9520 |
| Folga contra 512 / 6291456 | 372 | 6291936 |

`checkHuntPack` confirmou `entries: 140`, `bytes: 9520` e a região
`a56697fd75a978ac2ccf270df44bf299de289076827be18ff5b2af0a8d6cf0c5`.

**Profiles:**

- `test`: resolve as seis chaves; `assets:check` passou duas vezes seguidas,
  com o mesmo pack `c1b84127206e0321a61dba4cddb9f59c199365afd9fca5a9f0d24f5fe2c1e3ad`.
- `product`: o pack sintético permitido passa; o empacotamento de seleção
  `cipsoft-personal` falhou com `ASSET_PROFILE_FORBIDDEN`; a validação de
  runtime falhou com `ASSET_PROFILE_FORBIDDEN` e `ASSET_LICENSE_FORBIDDEN`.
- `personal`: a origem externa não possui `effectId:1`, `effectId:10`,
  `effectId:13`, `missileId:254`, `clientId:2889` nem `clientId:5967`.
  `assets:pb04:personal:check` e a geração pessoal retornaram exit `1`, sem
  placeholder, sem mídia pessoal e sem alterar seleção ou lock. A seleção
  declarativa de 140 entradas foi atualizada pelo CLI com `--selection-only`;
  o `personal-source-lock.json` permanece com os 134 arquivos disponíveis.

**Verificações:**

| Comando | Exit | Resultado |
|---|---:|---|
| `corepack pnpm --filter @huntbound/assets test` | `0` | 46 testes |
| `corepack pnpm exec vitest run --config tools/asset-packer/vitest.config.ts` | `0` | 49 testes |
| `corepack pnpm exec biome check .` | `0` | 394 arquivos |
| `corepack pnpm format:check` | `0` | formatação válida |
| `corepack pnpm typecheck` | `0` | todos os projetos |
| `corepack pnpm test` | `0` | workspace verde |
| `corepack pnpm assets:check` | `0` | primeira execução |
| `corepack pnpm assets:check` | `0` | segunda execução idêntica |
| `corepack pnpm architecture:check` | `0` | fronteiras verdes |
| `corepack pnpm build` | `0` | build de produção |
| `corepack pnpm content:check` | `0` | conteúdo e sidecars verdes |
| `git diff --check` | `0` | sem whitespace inválido |
| `corepack pnpm verify` | `124` | timeout em 244 s durante QA browser |

Com build fresco, a reprodução direta de `tests/e2e/hunt-budget.spec.ts`
retornou exit `1`: `actionableMs` `4995.7` (dentro do teto), mas `77`
long tasks acima do orçamento, em vez de `<2`. Nenhum arquivo de
`apps/game`, Playwright ou performance foi alterado para mascarar B5.

**Próxima task elegível:** nenhuma enquanto PB-05-08 permanecer bloqueada em
B6. Após resolver B6 e o gate B5, PB-05-10 será a próxima task elegível.

## Handoff PB-05-07 — 2026-08-16

**Status:** implementação concluída e integrada em `640f18e` (ff
`5762fa4..640f18e`). Gates de código verdes na worktree e na `main`. O `verify`
pós-integração falhou no QA browser: B5 (`hunt-budget`) pré-existente, mais um
stall ambiental de ~10 s em `pack.sha256` no `boot-budget` (não visto na
worktree, 28/29).

**Base:** `main` em `5762fa44a6a5e1e79be4af471d8ac023e1ec5d37`.

**Branch/worktree:** `grok/pb-05-07-content-to-combat`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-07-content`.

**Modelo/effort:** Grok 4.6 no Cursor, effort alto (`xhigh`).

**Desvio de branch:** a task card pedia `codex/pb-05-07-content-to-combat`;
a branch efetiva usa o prefixo `grok/` porque o executor é Grok. Worktree irmã
no path pedido.

**Desvio de escopo (correção necessária):** a task listava `apps/game` como
fora de escopo, mas a nova assinatura de `buildHuntScenario` quebra
`apps/game/src/main.ts` e `tests/e2e/support/huntSession.ts`. Os call sites
foram atualizados. O `huntSession` da fixture PB-04 compara só geometria
(floors, transitions, spawns, initialActors), não blueprints/abilities/loot —
a composição de combate não pode invalidar o golden combat-neutral de PB-04.

**Números derivados (ficha level 8, sword 10, attack 14, rotworm speed 58):**

| Campo | Valor |
|---|---:|
| player `maxHealth` / `maxResource` | 185 / 185 |
| player `stepCooldownTicks` / `attackCooldownTicks` | 11 / 40 |
| player melee `attackMinDamage` / `attackMaxDamage` | 1 / 13 |
| rotworm `maxHealth` | 65 |
| rotworm `stepCooldownTicks` / `attackCooldownTicks` | 21 / 40 |
| rotworm melee | 0–40 |
| berserk `minPower`/`maxPower` | 14 / 41 |
| brutal-strike `minPower`/`maxPower` | 10 / 20 |
| wound-cleansing `minPower`/`maxPower` | 26 / 52 |

**Decisões descobertas (documentadas em `MAP_REGION_CONTRACT.md`):**

| Decisão | Valor |
|---|---|
| Facção do jogador | `0` |
| Facção das criaturas | `1` |
| `aggroRadius` | `0` — o catálogo não importa `flags`/`targetDistance`; inventar um raio seria número mágico novo |
| Regeneração da ficha | `0` — a ficha congelada não declara ticks/amount |
| `rangeTiles` de spell `target` | `1` (alcance Chebyshev de golpe já congelado na spec) |

**Artefatos da hunt (byte-idênticos, `hunt:extract:sidecar` exit 0):**

| Arquivo | SHA-256 |
|---|---|
| region | `a56697fd75a978ac2ccf270df44bf299de289076827be18ff5b2af0a8d6cf0c5` |
| transitions | `8c59f8ef4f9a5f9842a06712a4d1bbfe2dbf4a6ef578ecdd1be55bf6e7bc51e7` |
| spawns | `141be183e4603a72f7ee594a7fe694a20265336bf05f1f2eadf3e18116c58520` |
| hunt | `a11941b2640286f95fe279dd6b451388ff592223c8dee598b17f08dfb15e8eb6` |

`git status --porcelain` em `packages/content/src/generated/hunts` ficou vazio.

**Verificações:**

| Comando | Exit | Resultado |
|---|---:|---|
| `corepack pnpm exec biome check .` | `0` | 393 arquivos |
| `corepack pnpm --filter @huntbound/content test` | `0` | 77 testes |
| `corepack pnpm typecheck` | `0` | todos os 7 projetos |
| `corepack pnpm architecture:check` | `0` | fronteiras verdes |
| `corepack pnpm content:check` | `0` | sidecars e catálogo verdes |
| `corepack pnpm hunt:check` | `0` | PB-04 byte-idêntico |
| `corepack pnpm hunt:extract:sidecar` | `0` | hashes acima |
| `corepack pnpm verify` (worktree) | `1` | B5 `hunt-budget`: `overBudget.length` `3` (teto `< 2`), tarefas `70,57,65` ms; `actionableMs` `4332.3`; 28/29 e2e passaram |
| `git merge --ff-only grok/pb-05-07-content-to-combat` | `0` | `main` em `640f18e` |
| `corepack pnpm verify` pós-integração em `main` | `1` | 1ª tentativa: EPERM no restage de `apps/game/public/assets/test` durante `build` (lock Windows, não código). 2ª: gates de código verdes; QA browser 27/29 — B5 `hunt-budget` `overBudget.length` `3` (71, 59, 67 ms; `actionableMs` `4727.3`) e `boot-budget` `actionableMs` `14610.3` com gap de 10197 ms em `pack.sha256` (stall de I/O, não regressão da composição) |
| `corepack pnpm exec biome check .` pós-integração em `main` | `0` | 393 arquivos |

Sem retry, skip ou golden reescrito. B5 é pré-existente; o stall de `boot-budget` na 2ª passagem é ambiental (servir um `.sha256` de pack de fixture). Esta task não toca Playwright nem orçamento de boot.

**Próxima task elegível:** PB-05-08.

## Handoff PB-05-06 — 2026-08-16

**Status:** implementação concluída em `87ef9c5927fdd94cc0d3306f931c6de6067653fb`,
com handoff documental em `2f5d07c304b2abb977d9f86b499b371cf04e5ae7`; integrada
em `main` por fast-forward `6f36641..2f5d07c`. O `verify` pós-integração não
fechou; a worktree foi removida e a branch foi preservada para diagnóstico.

**Base:** `main` em `6f36641cd0809df83d33884c053afadf6490ff8d`.

**Branch/worktree:** a branch `codex/pb-05-06-loot-autoloot` permanece em
`2f5d07c`, sem worktree associada; `C:\Kaezan\kaezan-huntbound-pb05-06-loot`
foi removida após a integração.

**Modelo/effort:** GPT-5 Codex; o effort interno não é exposto pelo runtime.

**Entrega:** `S5` percorre tabelas na ordem declarada pelo stream `loot`, usa
comparação estritamente menor, não sorteia contagem fixa, emite `loot/granted`
depois de `actor/died`, e não rola para morte sem matador, sem tabela ou do
blueprint `player`. `projectRunBag` em `@huntbound/content` agrega por
`itemKey`, é incremental, ordenada e falha explicitamente para índice inválido.
Nenhum campo novo entrou no snapshot e nenhum golden foi alterado.

**Verificações:**

| Comando | Exit | Resultado |
|---|---:|---|
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot exec biome check .` | `0` | 392 arquivos |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot --filter @huntbound/simulation test` | `0` | 212 testes |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot --filter @huntbound/content test` | `0` | 68 testes |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot typecheck` | `0` | todos os 7 projetos |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot architecture:check` | `0` | fronteiras verdes |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot content:check` | `0` | sidecars e catálogo verdes |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot assets:check` | `0` | packs/profile verdes |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot simulation:check` | `0` | PB-03 byte-idêntico |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot hunt:check` | `0` | PB-04 e respawn byte-idênticos |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot build` | `0` | build de produção |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot test` | `0` | agregado do workspace verde |
| `corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot verify` | `124` | timeout em 244 s; QA browser não fechou |
| `git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb-05-06-loot-autoloot` | `0` | `main` em `2f5d07c` |
| `corepack pnpm verify` pós-integração em `main` | `124` | timeout em 244 s; QA browser não fechou |
| `corepack pnpm exec biome check .` pós-integração em `main` | `0` | 392 arquivos |
| `corepack pnpm test` pós-integração em `main` | `0` | workspace verde; simulation 212, content 68, contracts 148, assets 44, game 135 |
| remoção da worktree + `git worktree prune` | `0` | diretório removido; branch preservada |

**Bloqueio reproduzido:** com build fresco, `asset-pack.spec.ts` passou; `boot-budget.spec.ts`
falhou com `actionableMs = 5235.6` (`<= 5000`); `hunt-budget.spec.ts` falhou com
`actionableMs = 4895.2`, mas `longTasksOverBudget = 147` (`< 2`). O problema é
pré-existente e fora do escopo: PB-05-05 já registrava `hunt-budget` vermelho,
e esta task não altera `apps/game`, Playwright ou performance. Não aplicar retry,
skip, timeout aumentado ou ajuste de golden.

**Próxima ação:** resolver o gate browser de baseline e rerodar `verify` em
`main`; só depois liberar PB-05-07. Não iniciar a próxima task.

## Próxima task elegível

PB-05-09 (assets de combate) — paralela após PB-05-01, não depende da
fixture. PB-05-08 permanece bloqueada em B6. B5 permanece aberto e não é
este bloqueio.

## Verificações executadas

PB-05-05, worktree `C:\Kaezan\kaezan-huntbound-pb05-05-hunter`, 2026-08-16.
Base da branch = `188a61a` (`main` / PB-05-04).

Journals byte-idênticos (`git diff --stat` vazio nos três `events.golden.jsonl`):

| Fixture | events SHA-256 (inalterado) |
|---|---|
| pb03 | `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4` |
| pb04 | `6e1206eb2ce7ed7647e9923b6d29a3f08f30ca7ec9ddf01b539d6310818d42e1` |
| pb04-respawn | `613079d592335829a8e9e7565877c046cee9e21f0f4478b38af4050b7334ba30` |

Dois wanderers, 9 ticks, sem `hunter`: 4 movimentos (nw, se, s, sw) e
`ai.drawCount` `4`. Hunter sozinho sem alvo: stream `ai` idêntico ao wanderer
na mesma célula. Varredura de restauração (16 fronteiras) com perseguição, troca
de alvo e golpe por IA: journal e snapshot final idênticos.

| Comando | Exit |
|---|---:|
| `corepack pnpm exec biome check .` | `0` (388 files) |
| `corepack pnpm --filter @huntbound/simulation test` | `0` (203 testes; 183 pré-existentes + 20 em `hunter.test.ts`) |
| `corepack pnpm typecheck` | `0` |
| `corepack pnpm architecture:check` | `0` |
| `corepack pnpm simulation:check` | `0` |
| `corepack pnpm hunt:check` | `0` |
| `corepack pnpm verify` | `1` em `qa:browser` / `hunt-budget.spec.ts` |

`verify` passou `format:check`, `assets:check`, `simulation:check`, `hunt:check`,
`architecture:check`, `typecheck`, `test`, `build` e `content:check`. Falhou em
`tests/e2e/hunt-budget.spec.ts`: `actionableMs` `4328.7` (teto `5000` ok),
`overBudget.length` `2` (teto `< 2`), tarefas `71,55` ms. Os outros 28 specs e2e
passaram. Sem retry mascarado. Esta task não toca `apps/game`; é B5 reproduzido.

PB-05-04, worktree `C:\Kaezan\kaezan-huntbound-pb05-04-kernel`, 2026-08-16.
Base da branch = `93b8517` (`grok/pb-05-03-combat-contracts`). Snapshot via
`HUNTBOUND_CANARY_SOURCE` apontando para
`C:\Kaezan\kaezan-huntbound\references\canary`.

Journals byte-idênticos (`git diff --stat` vazio nos três `events.golden.jsonl`):

| Fixture | events SHA-256 (inalterado) |
|---|---|
| pb03 | `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4` |
| pb04 | `6e1206eb2ce7ed7647e9923b6d29a3f08f30ca7ec9ddf01b539d6310818d42e1` |
| pb04-respawn | `613079d592335829a8e9e7565877c046cee9e21f0f4478b38af4050b7334ba30` |

Hashes novos gerados dos arquivos reais (`Get-FileHash -Algorithm SHA256` e
confirmados por `simulation:check` / `hunt:check`):

**pb03** (`schemaVersion` 4, `rulesVersion` 3)

| Arquivo | SHA-256 |
|---|---|
| `scenario.json` | `36a2aa01ceeed45368de6279fa89dc71b8e27a641b9325f9a2780026422943b5` |
| `commands.jsonl` | `4edbda41497dc4e21e117061bc7e67819973037df2f50447589aa2105bf29a12` |
| `snapshot.golden.json` | `9621f9e02bc5df1d156d9cddced3dfe4d1a78669f1ddf1cbf3794e7359196be0` |

**pb04**

| Arquivo | SHA-256 |
|---|---|
| `scenario.json` | `2d56f2848eec061821d48e19bd23bf6bfdec3b00aa0a10007eb1fd04aa88b758` |
| `commands.jsonl` | `d18c520a5d90614f30ceb4c8989de67578c736e3a2d59516f0b04dc92d9e3636` |
| `snapshot.golden.json` | `56f68258d004c869c47a4f46e84c8a9f7289da9d0dffb7f133cae9c6fac42bca` |

**pb04-respawn** — mesmo cenário; commands `14df54ca…00abf5`; snapshot
`93cbf723…e28bf`.

Vetores RNG seed `0f1e2d3c4b5a6978`: `ai`/`movement`/`scenario`/`spawn` idênticos
aos golden de PB-03-02. Novos:

```text
combat: e66fd11d 3b856526 99ce4fa0 9df4f5bc c7d62962 92ff8526 819a261f 1538ef49
loot:   26036bf2 c88e45ba 04a57152 0645c023 785f789f 9ce1127a 5b7213ef 937f21c9
```

`hunt.json` regenerado só nos blueprints combat-neutral
(`a11941b2640286f95fe279dd6b451388ff592223c8dee598b17f08dfb15e8eb6`).
`region`/`transitions`/`spawns` inalterados. Não é composição de combate
(PB-05-07); é o mínimo para `HuntDefinition` validar ActorBlueprint v4.

| Comando | Exit |
|---|---:|
| `corepack pnpm exec biome check .` | `0` (387 files) |
| `corepack pnpm --filter @huntbound/contracts test` | `0` (148 testes) |
| `corepack pnpm --filter @huntbound/simulation test` | `0` (183 testes) |
| `corepack pnpm exec vitest run --config tools/replay/vitest.config.ts` | `0` (47 testes) |
| `corepack pnpm typecheck` | `0` |
| `corepack pnpm architecture:check` | `0` |
| `corepack pnpm simulation:check` (1ª) | `0` |
| `corepack pnpm simulation:check` (2ª) | `0` |
| `corepack pnpm hunt:check` (1ª) | `0` |
| `corepack pnpm hunt:check` (2ª) | `0` |
| `corepack pnpm verify` (1ª) | `0` (29 e2e; hunt-budget `overBudget.length` `1`) |
| `corepack pnpm verify` (2ª) | `0` (29 e2e; hunt-budget `overBudget.length` `1`) |

`git status --porcelain` idêntico entre as duas execuções de `verify`. B5 não
reproduziu nesta sessão; permanece historicamente aberto e não foi mascarado.

PB-05-03, worktree `C:\Kaezan\kaezan-huntbound-pb05-03-contracts`, 2026-08-16.
Base `main` = `3482381`.

| Comando | Exit |
|---|---:|
| `corepack pnpm exec biome check .` | `0` (385 files) |
| `corepack pnpm --filter @huntbound/contracts test` | `0` (148 testes; 119 pré-existentes + 29 novos em `combatV4.test.ts`) |
| `corepack pnpm --filter @huntbound/contracts typecheck` | `0` |
| `corepack pnpm architecture:check` | `0` |
| `git diff --check` | `0` |
| `corepack pnpm typecheck` (workspace) | `1` em `@huntbound/content` (faltam `abilities`/`lootTables` e campos de combate no blueprint) |
| `corepack pnpm --filter @huntbound/simulation typecheck` | `1` (`ActorState` incompleto, `PendingIntentState` sem `kind`) |

`simulation:check`, `hunt:check` e `verify` **não** foram executados como gate
de aceite: o kernel ainda fala v3. A vermelhidão do `typecheck` agregado é a
mesma composição — declarada, não mascarada. `packages/simulation` não teve
nenhum arquivo alterado.

PB-05-02, worktree `C:\Kaezan\kaezan-huntbound-pb05-02-import`, 2026-08-16.
Snapshot via `HUNTBOUND_CANARY_SOURCE` apontando para
`C:\Kaezan\kaezan-huntbound\references\canary` (não commitado). O CLI de catálogo
passa a honrar essa variável; worktree irmã não copia `references/`.

Hash do bundle **antes:** `d9df3338743365710fed991c185976b9dbbd59e6d5f9d43a679550db8fa154f3`  
Hash do bundle **depois:** `b0b0a0b7a079ab12d89b323bce56f9c8e6d675dfd50967915c83c8ac8c77c770`  
(SHA-256 do arquivo real; conferido com `Get-FileHash -Algorithm SHA256`.)

`content:check` duas vezes seguidas, exit `0`, `git status --porcelain` idêntico entre
elas. `import-canary --check` exit `0` (reimport byte-idêntico à operation versionada).
Sidecars da hunt inalterados.

| Comando | Exit |
|---|---:|
| `corepack pnpm exec biome check .` | `0` (384 files) |
| `corepack pnpm --filter @huntbound/contracts test` | `0` (119 testes) |
| `corepack pnpm --filter @huntbound/content test` | `0` (65 testes) |
| `corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts` | `0` (53 testes) |
| `corepack pnpm typecheck` | `0` |
| `corepack pnpm architecture:check` | `0` |
| `corepack pnpm content:check` (1ª) | `0` |
| `corepack pnpm content:check` (2ª) | `0` |
| `node tools/content-catalog/cli.ts import-canary --check` | `0` |
| `corepack pnpm verify` | `1` em `qa:browser` |

`verify` passou `format:check`, `assets:check`, `simulation:check`, `hunt:check`,
`architecture:check`, `typecheck`, `test`, `build` e `content:check`. Falhou em
`qa:browser` (2 specs):

1. `tests/e2e/hunt-budget.spec.ts` — B5. `actionableMs` `4246.8` (teto `5000` ok),
   `overBudget.length` `2` (teto `< 2`), tarefas `68,61` ms. Sem retry mascarado.
2. `tests/e2e/hunt-mobile.spec.ts` — timeout de 15s em
   `#shell-root[data-assets-ready="true"]` no teste de câmera. Os três testes
   anteriores do mesmo arquivo passaram o mesmo `waitForHunt`. Esta task não toca
   `apps/game` nem assets. Não reexecutado para pescar verde.

Os outros 27 specs e2e passaram. Goldens de PB-03 e PB-04 byte-idênticos.

Pós-integração em `C:\Kaezan\kaezan-huntbound` (`main` = `f1e8dab`), 2026-08-16:

| Comando | Exit |
|---|---:|
| `git merge --ff-only grok/pb-05-02-import-spells-character` | `0` (`624dac7..f1e8dab`) |
| `corepack pnpm verify` (1ª, cache SQLite de 2026-08-13) | `1` em `content:check`: `FOREIGN KEY constraint failed` ao aplicar `002_spell_formulas_and_characters.sql` |
| `corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts` | `0` (54 testes, incluindo rebuild com child rows) |
| `corepack pnpm content:check` (após o fix do runner, mesmo cache) | `0` |
| `corepack pnpm exec biome check .` | `0` (384 files) |

Causa: `PRAGMA foreign_keys` é no-op dentro de transação; o cache da `main` já tinha a 001
com linhas em `spell_vocation_families`. A worktree criou cache vazio e não reproduziu.
Correção: desligar foreign keys **ao redor** da transação em `MigrationRunner`. Sem retry
mascarado no `verify` vermelho.

PB-05-01, worktree `C:\Kaezan\kaezan-huntbound-pb05-01-selection`, 2026-08-16. Snapshot via
`HUNTBOUND_CANARY_SOURCE` apontando para `C:\Kaezan\kaezan-huntbound\references\canary` (não
commitado).

| Comando | Exit |
|---|---:|
| `corepack pnpm exec biome check .` | `0` (384 files) |
| `corepack pnpm typecheck` | `0` |
| `corepack pnpm test` | `0` na segunda execução; a primeira falhou por timeout de 5s em `ContentCatalogApplication.test.ts` (teste pré-existente, 5269 ms) |
| `corepack pnpm content:check` | `0`; sidecars da hunt inalterados |
| `corepack pnpm exec vitest run --config tools/hunt-selection/vitest.config.ts` | `0` (24 testes, freeze revisado) |
| `node ... cli.ts check-combat --selection packages/content/src/selections/pb-05-knight-combat.json --source-root-env HUNTBOUND_CANARY_SOURCE` | `0` |
| `git diff --check` | `0` |
| `corepack pnpm verify` | `1` em `qa:browser` |
| `corepack pnpm qa:browser` (reexecução) | `1` em `hunt-budget.spec.ts` |

Saída do verificador de IDs (exit `0`):

```text
{"command":"check-combat","ok":true,"presentIds":["vocation:4","spell:80","spell:61","spell:123","item:3264","effect:CONST_ME_DRAWBLOOD","effect:CONST_ME_HITAREA","effect:CONST_ME_MAGIC_BLUE","effect:CONST_ANI_WEAPONTYPE","item:5967","item:2889","creature:rotworm"],"diagnostics":[]}
```

Freeze revisado nesta sessão (spells irrestritas, ficha level `8`): `biome check .` exit `0`
(384 files); `vitest` hunt-selection exit `0` (24 testes); `pb05:selection:check` exit `0` no
mesmo snapshot. `typecheck`/`test`/`content:check`/`verify` não foram reexecutados nesta
revisão — `verify` continua B5.

Pós-integração em `C:\Kaezan\kaezan-huntbound` (`main` = `2933012`), 2026-08-16:

| Comando | Exit |
|---|---:|
| `git merge --ff-only grok/pb-05-01-vocation-spell-selection` | `0` (`2f455d5..2933012`) |
| `corepack pnpm exec biome check .` | `0` (384 files) |
| `corepack pnpm verify` | `1` em `qa:browser` / `hunt-budget.spec.ts` |

`verify` passou `format:check`, `assets:check`, `simulation:check`, `hunt:check`,
`architecture:check`, `typecheck`, `test`, `build` e `content:check`. Falhou em
`tests/e2e/hunt-budget.spec.ts`: `actionableMs` `4467` (teto `5000` ok),
`overBudget.length` `8` (teto `< 2`), tarefas `122,54,83,64,92,54,56,58` ms. Os outros
28 specs e2e passaram. Sem retry mascarado.

Fatos de baseline da autoria (commit `420b6fb`, 2026-08-15) permanecem válidos e não foram
remeados aqui.

## Decisões fechadas em PB-05-07

| Decisão | Onde está documentada |
|---|---|
| Facção jogador `0`, criaturas `1` | `MAP_REGION_CONTRACT.md`; `combatConversion.ts` |
| `aggroRadius` `0` até o catálogo importar alcance de agressão | `MAP_REGION_CONTRACT.md` |
| Regeneração `0` porque a ficha não congela ticks/amount | `MAP_REGION_CONTRACT.md`; `PB-05-SELECTION.md` |
| `buildHuntScenario` devolve `HuntScenarioBuild` com `itemKeys`/`abilityKeys` | `packages/content/src/hunts/buildHuntScenario.ts` |
| Fixture PB-04 compara geometria, não combate composto | `tests/e2e/support/huntSession.ts` |

## Decisões fechadas em PB-05-05

| Decisão | Onde está documentada |
|---|---|
| `hunter` em S6: manutenção, aquisição Chebyshev no mesmo andar com empate por menor `EntityId`, passo guloso, golpe adjacente, fallback `wander` | `KERNEL_CONTRACT.md`, seção Sistemas / S6 |
| Aquisição e perseguição não consomem o stream `ai`; sem alvo consome um `nextBelow(8)` | `KERNEL_CONTRACT.md`; `hunter.test.ts` |
| Alvo morto é limpo mesmo com o hunter em cooldown, porque o snapshot recusa `targetEntityId` de ator morto | `KERNEL_CONTRACT.md`; schema v4 já exigia alvo vivo |
| `greedyStepDirection` mapeia o sinal de `dx`/`dy` na ordem canônica | `packages/simulation/src/grid/directions.ts` |

## Decisões fechadas em PB-05-04

| Decisão | Onde está documentada |
|---|---|
| Sete fases implementadas: S3 upkeep, S4 combat, S5 death (sem loot), S6 wander, S7 spawn | `KERNEL_CONTRACT.md`, seção Fases |
| `CommandBuffer` cobre as quatro ações concorrentes | `commandBuffer.ts`; `isConcurrentActorAction` |
| Streams serializados: `ai`, `combat`, `loot`, `movement`, `scenario`, `spawn` | `streams.ts`; `KERNEL_CONTRACT.md` |
| `itemKey` e `spellKey` reprovados na fronteira do kernel | `simulation-boundaries.ts` |
| Blueprints da hunt extraída ficam combat-neutral; composição real é PB-05-07 | `extract.ts`; `hunt.json` hash `a11941b2…15e8eb6` |
| Eventos novos de combate são não-estruturais na apresentação; `actor/died` remove o sprite | `HuntPresentation.ts`; HUD fica para PB-05-10 |

## Decisões fechadas em PB-05-03

| Decisão | Onde está documentada |
|---|---|
| Documento v3 é reprovado; `schemaVersion: 3` num documento v4 produz `SIM_VERSION_MISMATCH` | `KERNEL_CONTRACT.md`; `combatV4.test.ts` |
| `health > maxHealth` e `abilityCooldowns` com índice fora do blueprint **não** cabem no schema isolado do snapshot (o snapshot não carrega blueprints). Seguem o padrão de `transitionGuard`: checagem em `restoreSimulationKernel`, PB-05-04 | `KERNEL_CONTRACT.md`, seção Snapshot |
| Entrada de loot do kernel não se chama `LootEntryDefinition` no export público: esse nome já pertence ao catálogo (`itemKey`). O kernel usa o shape inline em `LootTableDefinition.entries` (`itemIndex`) | `packages/contracts/src/simulation/types.ts` |
| `isConcurrentActorAction` publica as quatro ações da duplicata de borda; o `CommandBuffer` ainda só cobre `move-step`/`wait` até PB-05-04 | `KERNEL_CONTRACT.md`; `schemas.ts` |
| Fases S3–S7 eram contrato pretendido em PB-05-03; implementadas em PB-05-04 | `KERNEL_CONTRACT.md`, seção Fases |

## Decisões descobertas durante a autoria

| Decisão | Onde está documentada |
|---|---|
| Fórmula float é resolvida no conteúdo; o kernel só recebe `min`/`max` inteiros | spec, "Direção escolhida" §1 |
| `itemKey` e `spellKey` entram na proibição executável do kernel | spec, §2 |
| A região **não** é reextraída; o combate é composto em `buildHuntScenario` | spec, §3 |
| Autoloot sem comando de coleta; bolsa é projeção de eventos fora do kernel | spec, §4 |
| Corpo e sangue são apresentação pura, sem estado no kernel | spec, §4 |
| Fuga em vida baixa fica fora por ausência de fonte no importer | spec, §5 |
| `spell.level` é provenance; kit irrestrito desde o início da run | spec, §6; `PB-05-SELECTION.md` |
| Mitigação zero porque todas as resistências do Rotworm são `0` | spec, "Parâmetros congelados" |
| Sete sistemas por tick, com `upkeep` antes de `combat` e morte antes de `ai` | spec, "Fases do tick" |

## Decisões fechadas em PB-05-01

| Decisão | Onde está documentada |
|---|---|
| Spells irrestritas; ficha no level `8` da hunt; HP `185` Canary; mana loadout `185` | `docs/content/PB-05-SELECTION.md` |
| Skills nos defaults do snapshot (`sword 10`, `magic 0`), não treino inventado | idem |
| Arma `item:tibia:sword` `3264` `attack 14` | idem |
| Ritmo de passo fiel `player 11` / `rotworm 21`, não os `10`/`20` jogáveis de PB-04-FIX-01 | idem |
| `exura ico` usa `CALLBACK_PARAM_LEVELMAGICVALUE`; schema fica para PB-05-02/03 | idem |
| `exori ico` usa `skill * attack`, forma fora da allowlist `skillAttack`; schema em PB-05-02 | idem |

## Decisões fechadas em PB-05-02

| Decisão | Onde está documentada |
|---|---|
| Brutal Strike não cabe em `skillAttack`; kind novo `skillAttackProduct` (`skill * attack` + addends) | `docs/content/CANARY_LUA_MAPPING.md`; schema em `packages/contracts/src/content/schemas.ts` |
| Wound Cleansing não cabe em `skillAttack`; kind novo `levelMagic` (`level` + `magicLevel`, cura positiva) | idem |
| Ficha é conteúdo Huntbound (`character:huntbound:…`), não entidade Tibia | `CANARY_LUA_MAPPING.md`; `CharacterDefinitionSchema` |
| `setArea` é opcional; spells sem área omitem o campo | parser + schema |
| Forma de fórmula não reconhecida → `lua.invalid-formula`, nunca aceitação silenciosa | `parseSpellLua.ts` + testes |
| `PRAGMA foreign_keys` no-op dentro de transação; o runner desliga FK ao redor do apply | `tools/content-catalog/migrations/MigrationRunner.ts` |

## Modelo e effort

- **Executor PB-05-08:** Grok 4.6 no Cursor, effort alto (`xhigh`). Task
  bloqueada em B6; sem golden e sem gate.
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`,
  `test-driven-development`, `verification-before-completion`.
- **Desvio de branch:** a task card pedia `codex/pb-05-08-combat-fixture`; a
  branch efetiva é `grok/pb-05-08-combat-fixture`.

- **Executor PB-05-07:** Grok 4.6 no Cursor, effort alto (`xhigh`).
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`, `hunt-content-pipeline`,
  `test-driven-development`, `verification-before-completion`.
- **Validador:** ainda não; a auditoria do playbook é PB-05-12.
- **Desvio de branch:** a task card pedia `codex/pb-05-07-content-to-combat`; a
  branch efetiva é `grok/pb-05-07-content-to-combat` porque o executor é Grok.
  Worktree irmã no path pedido.

- **Executor PB-05-05:** Grok 4.6 no Cursor, effort alto (`xhigh`).
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`,
  `test-driven-development`, `verification-before-completion`.
- **Validador:** ainda não; a auditoria do playbook é PB-05-12.
- **Desvio de branch:** a task card pedia `codex/pb-05-05-hunter-ai`; a branch
  efetiva é `grok/pb-05-05-hunter-ai` porque o executor é Grok. Worktree irmã
  no path pedido.

- **Executor PB-05-04:** Grok 4.6 no Cursor, effort alto (`xhigh`).
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`,
  `test-driven-development`, `verification-before-completion`.
- **Validador:** ainda não; a auditoria do playbook é PB-05-12.
- **Desvio de branch:** a task card pedia `codex/pb-05-04-kernel-combat` a partir
  de `claude/pb-05-03-combat-contracts`; a branch efetiva é
  `grok/pb-05-04-kernel-combat` a partir de `grok/pb-05-03-combat-contracts`
  porque o executor é Grok e as tasks 01–03 usaram o mesmo prefixo.

- **Executor PB-05-03:** Grok 4.6 no Cursor, effort alto (`xhigh`).
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`,
  `test-driven-development`, `verification-before-completion`.
- **Validador:** ainda não; a auditoria do playbook é PB-05-12.
- **Desvio de branch:** a task card pedia `claude/pb-05-03-combat-contracts`; a
  branch efetiva é `grok/pb-05-03-combat-contracts` porque o executor é Grok.
  Worktree irmã no path pedido. Integração em `main` pertence a PB-05-04.

PB-05-02 (histórico):

- **Executor PB-05-02:** Grok 4.6 no Cursor, effort alto.
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`, `hunt-content-pipeline`,
  `test-driven-development`, `verification-before-completion`.
- **Validador:** ainda não; a auditoria do playbook é PB-05-12.
- **Desvio de branch:** a task card pedia `codex/pb-05-02-import-spells-character`; a branch
  efetiva é `grok/pb-05-02-import-spells-character` porque o executor é Grok. Worktree irmã
  no path pedido.

PB-05-01 (histórico):

- **Executor:** Grok 4.6 no Cursor, effort alto.
- **Skills:** `playbook-task`, `worktree-cycle`, `run-gates`, `test-driven-development`,
  `verification-before-completion`.
- **Validador:** ainda não; a auditoria do playbook é PB-05-12.
- **Desvio de branch:** a task card pedia `claude/pb-05-01-vocation-spell-selection`; a branch
  efetiva é `grok/pb-05-01-vocation-spell-selection` porque o executor é Grok. Worktree irmã no
  path pedido. `tools/hunt-selection` entrou no script `test` da raiz para os testes novos rodarem
  em `verify`.

## Bloqueios

- ~~**B3 (bloqueante, externo ao PB-05):** PB-04 aberto.~~ **Resolvido em 2026-08-16** pela
  reavaliação PB-04-10: veredito `APPROVED_WITH_WARNINGS` sobre `9f1c14c`, registro `d8253dc`.
  Warnings remanescentes do PB-04 (W9, W12, W17, W8, B2) não bloqueiam combate; B2 é pré-requisito
  de PB-07.

- ~~**B4 (bloqueante, pré-requisito de instrução):** `AGENTS.md` vivia só em
  `claude/agent-instructions-shared`.~~ **Resolvido em 2026-08-16** pelo merge `5aeb8bb`. Fast-forward
  era impossível (a branch tinha divergido); o merge commit integrou `AGENTS.md`, `CLAUDE.md`,
  `.cursor/rules`, `.cursor/skills` e o motor de hooks. `docs/08_POLITICA_MODELOS_AGENTES.md` com
  Grok 4.6 está em `main`.

- **B6 (bloqueante de PB-05-08):** a fixture `pb-05-hunt-combat` (900 ticks)
  sobre o cenário composto da hunt não emite `combat/target-changed` nem
  respawn de assento. Causa: `aggroRadius` `0` (PB-05-07, catálogo sem
  `targetDistance`) e `respawnTicks` `1800` em todos os slots. Evidência no
  handoff PB-05-08. Não consertado aqui.

- **B5 (historicamente aberto; reproduziu em PB-05-05):** `qa:browser` /
  hunt-budget já foi vermelho em PB-05-01 (`overBudget.length` `8`) e PB-05-02
  (`2`). Em PB-05-04 passou com `1`. Em PB-05-05 falhou com `overBudget.length`
  `2` (teto `< 2`), tarefas `71,55` ms, `actionableMs` `4328.7`. Sem retry
  mascarado. Esta task não toca `apps/game` nem o renderer; o kernel `hunter`
  não entra na hunt jogável até PB-05-07. Não se declara B5 fechado.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos — gerados do artefato real;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar a task dependente consolidar o handoff compartilhado.
