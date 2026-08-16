# PB-04 — Relatório de aceite (PB-04-10, segunda rodada)

**Decisão final: `APPROVED_WITH_WARNINGS`** em `9f1c14c`.

PB-04 está **fechado**. PB-05 é **elegível**. Os warnings remanescentes estão em §8 e nenhum deles
é risco de produto nem de integridade de gate.

Este relatório tem dois momentos. A auditoria original, sobre `307a3f0` em 2026-08-15, decidiu
**`REJECTED`** por D1–D4; esse registro está preservado no commit da primeira entrega de PB-04-10 e
é resumido em §10. FIX-02, FIX-03 e FIX-04 foram implementados e integrados. Esta reavaliação é
fresca sobre o resultado integrado, em checkout limpo. Nenhuma afirmação de handoff foi aceita sem
reexecução.

Nenhum código, schema, fixture, golden, teste ou configuração foi alterado durante esta auditoria.

## 1. Identificação

| Item | Valor |
|---|---|
| Data da reavaliação | 2026-08-16 |
| Commit auditado | `9f1c14cbf36597471cc08ba28eec3d020df9d723` (`docs: record PB-04-FIX-03 and FIX-04 integration`) |
| Branch/worktree | `codex/pb04-10-integrated-gate` em `C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate` |
| SO | Microsoft Windows 11 Home Single Language, `10.0.26200` |
| Node | `v24.14.0` |
| pnpm | `11.21.0` via Corepack |
| Playwright | `1.62.1`, Chromium `chromium_headless_shell-1234` |
| Modelo/effort | Cursor Grok 4.6; effort não é exposto pelo runtime desta sessão |
| Skill obrigatória | `superpowers:verification-before-completion` |

A política pede Claude Opus 5 (ou GPT-5.6 Sol `xhigh`) e modelo **diferente** dos implementadores.
FIX-02 foi Codex/GPT-5; FIX-03/FIX-04 também não foram Grok. O desvio em relação ao modelo sugerido
está registrado: a plataforma desta sessão é Grok 4.6, que é distinto dos implementadores das
correções auditadas.

A primeira tentativa de `verify` nesta worktree saiu `1` com `29 failed` porque
`PLAYWRIGHT_BROWSERS_PATH` apontava para o cache vazio do sandbox do Cursor
(`…\cursor-sandbox-cache\…\playwright`). Os browsers já existiam em
`%USERPROFILE%\AppData\Local\ms-playwright`. As duas execuções que contam para o aceite rodaram com
esse cache. Isso é limitação de ambiente, não defeito do produto.

## 2. Estado inicial

```text
git status --porcelain=v1 --untracked-files=all   -> vazio (árvore limpa em main)
git rev-parse HEAD                                -> 9f1c14cbf36597471cc08ba28eec3d020df9d723
git branch codex/pb04-10-integrated-gate main     -> ok
git worktree add …                                -> ok, HEAD em 9f1c14c
corepack pnpm install --prefer-offline            -> exit 0; 70 pacotes; 2,3 s
```

FIX-02 (`6cd63c6`), FIX-03 (`911ce2f` + merge `695b6a7`) e FIX-04 (`96c7628` + merge `6aeefec`)
estão em `main`. `retries: 0` em `playwright.config.ts:12`.

## 3. Matriz de critérios

| Critério | Comando / prova | Resultado | Evidência |
|---|---|---|---|
| Árvore limpa em `main` | `git status --porcelain=v1 -uall` | PASS | saída vazia; `9f1c14c` |
| `verify` 1ª execução | `corepack pnpm verify` | PASS | exit `0`; **`29 passed`**, 0 flaky; 139 999 ms |
| Árvore inalterada entre execuções | `git status --porcelain=v1 -uall` | PASS | saída vazia |
| `verify` 2ª execução | `corepack pnpm verify` | PASS | exit `0`; **`29 passed`**, 0 flaky; 139 641 ms |
| Árvore inalterada após a 2ª | `git status --porcelain=v1 -uall` | PASS | saída vazia |
| Lint (fora de `verify`) | `corepack pnpm exec biome check .` | PASS | exit `0`; `Checked 381 files`; **fecha D4** |
| Determinismo da simulação | `corepack pnpm simulation:check` | PASS | exit `0`; 4 digests = contrato |
| Determinismo da hunt (2×) | `corepack pnpm hunt:check` ×2 | PASS | exit `0`; digests idênticos nas duas |
| Hashes publicados = arquivos | `hunt:hashes:check` + `Get-FileHash` | PASS | §4; **fecha D2 e D3** |
| Golden do PB-03 byte-idêntico | `Get-FileHash` de `events.golden.jsonl` | PASS | `31f86d62…555888d4` |
| Fronteira de identidade Tibia | `rg` em `packages/simulation/src` | PASS | zero ocorrências (exit `1`) |
| Fronteira de relógio/aleatório | `rg` em `packages/simulation/src` | PASS | zero ocorrências (exit `1`) |
| Gate de arquitetura | `corepack pnpm architecture:check` | PASS | exit `0` |
| Kernel sem dependência externa | `packages/simulation/package.json` | PASS | só `@huntbound/contracts`; `vitest` como devDep |
| Kernel sem DOM | `packages/simulation/tsconfig.json` | PASS | `"lib": ["ES2022"]` |
| Sem mídia pessoal versionada | `git ls-files '*.png'` + hash | PASS | §6 |
| `product` recusa `cipsoft-personal` | `FetchAssetProvider.ts:158`, `validateAssetProfileTree.ts:54` | PASS | recusa em runtime e em empacotamento |
| Gate de input (D1) | `playwright test -g "one paced command" --retries=0 --repeat-each=10` | PASS | **`20 passed`**, exit `0`; **fecha D1** |
| Hunt jogável de fato | sessão dirigida em Chromium real | PASS | §5 |
| Checklist de seleção | `docs/content/PB-04-SELECTION.md` | PASS | 8/8 com evidência; W13 fechado |
| Aceite de produto | `artifacts/product-acceptance.md` | PASS | `APPROVED` em 2026-08-15; cobre jogabilidade, não mídia pessoal |

## 4. Determinismo — números medidos

`simulation:check`, exit `0`, idêntico ao congelado em `docs/simulation/REPLAY_CONTRACT.md` §PB-03:

| Artefato | SHA-256 |
|---|---|
| `scenario.json` | `72d006552742691fbb71cd41bc84a80aebf0afd27faef027e358b4d92fcc23e9` |
| `commands.jsonl` | `88ec73de434a7bf092c68bb3a3601caaef1bfca2b59d9b84f20f334462749d66` |
| `snapshot.golden.json` | `84528f5246c156b65e46343d713851d064943c3550281bba0ab0e5d18d10d341` |
| `events.golden.jsonl` | `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4` |

O golden do PB-03 sobreviveu ao bump de schema e a todo o PB-04. Conferido por `Get-FileHash`
independente, não só pela ferramenta de replay.

`hunt:check`, exit `0`, **idêntico nas duas execuções consecutivas**, e idêntico a
`REPLAY_CONTRACT.md` §PB-04 e aos `hashes.md` versionados:

| Fixture | Artefato | SHA-256 |
|---|---|---|
| `pb04` | `scenario.json` | `f8ecff35694c0ba8557546f40d0f7ad384746a0027f0bc3a5c51b2777f88c6e0` |
| `pb04` | `commands.jsonl` | `8c88860bd1dd355b37ac2e16dc2e989aaa2c324ad55637058bb51d33634c7e67` |
| `pb04` | `snapshot.golden.json` | `2e546b17a6905f5be29393b388df0c7dc37919fa75d09d8bcbb776bd75756816` |
| `pb04` | `events.golden.jsonl` | `6e1206eb2ce7ed7647e9923b6d29a3f08f30ca7ec9ddf01b539d6310818d42e1` |
| `pb04-respawn` | `commands.jsonl` | `01e139f9d8fd41fd7c53fc70dcf15286bb49c08ac874da7f43a82d2c22bc1efa` |
| `pb04-respawn` | `snapshot.golden.json` | `2e968f79b850725dd2942ffc2421108b9f4cc09a82b13bda19995fad43e993d3` |
| `pb04-respawn` | `events.golden.jsonl` | `613079d592335829a8e9e7565877c046cee9e21f0f4478b38af4050b7334ba30` |

Conteúdo, conferido por `Get-FileHash` direto:

| Artefato | SHA-256 |
|---|---|
| recipe `layouts/hunts/venore-rotworm-cave.json` | `180aab488ab80426ce5b9c7c5e5472db450a83f44e864abbb16cc1ef3f18702e` |
| `generated/hunts/venore-rotworm-cave/region.json` | `a56697fd75a978ac2ccf270df44bf299de289076827be18ff5b2af0a8d6cf0c5` |
| pack `test` `pb-04-venore-rotworm-cave` | `1f5c9f849d2ba577d88bdc6b1b096018b5c74fd2d2d301df1925ca4eee6def6f` |

`hunt:extract:check` **não foi reexecutado**: `HUNTBOUND_CANARY_SOURCE` está vazio nesta worktree
irmã e `references/` é gitignorado, então o snapshot não veio no checkout. `hunt:extract:sidecar`
entrou em `content:check` dentro de `verify` (exit `0` nas duas). A suíte do extrator passou
`113/113`. Limitação de ambiente, não divergência medida.

## 5. O produto foi jogado, não só testado

Sessão dirigida pelo auditor em Chromium real (`vite preview --mode test`, porta `4188`), teclado
real (`ArrowUp`/`Down`/`Left`/`Right`), lendo apenas o `HuntProbe`. O script viveu em
`%TEMP%\pb04-10-audit-play.mjs` e importou Playwright por `file://` absoluto, para não tocar a
árvore auditada.

**Boot:** andar `8`, jogador em `(21, 7, 8)`, facing `s`, `10` rotworms vivos (mais o jogador = `11`
atores), `visibleRows = 11`, zoom `2,18`, `641` objetos desenhados (`ground 424`, `objectsBelow 213`,
`actors 4`).

**Colisão:** de `(21, 7, 8)`, `n` recusado `terrain` no tick `15` para `(21, 6, 8)`; `e` recusado
`terrain` no tick `34` para `(22, 7, 8)`. Posição inalterada. Sem exceção.

**Passo:** `s` aceito no tick `50`: `(21, 7, 8) → (21, 8, 8)`, **um** comando. Retorno `n` no tick
`66`. Cada toque produziu exatamente um comando — o defeito D1 não se reproduz em jogo.

**Descida:** o primeiro `w` no tick `82` foi `occupied` (criatura na escada). O segundo `w` no tick
`113` emitiu `actor/moved (21,7,8) → (20,7,8)` e `actor/transitioned (20,7,8) → (21,4,9)` no mesmo
tick. Andar desenhado passou a `9`; `613` objetos (`ground 375`, `objectsBelow 225`, `actors 8`,
`objectsAbove 5`); `7` rotworms visíveis no andar `9`.

**Subida:** `s` no tick `131` saiu da célula da escada `(21,4,9) → (21,5,9)`. `n` no tick `148`
emitiu `actor/moved (21,5,9) → (21,4,9)` e `actor/transitioned (21,4,9) → (20,7,8)`. Andar
desenhado voltou a `8`. **A hunt sobe e desce.**

**Criaturas:** `10` rotworms no boot, com posições distintas nos dois andares. Entre boot e
pós-descida, a entidade `3` andou `(14,10,8) → (12,10,8)` e a `4` andou `(12,15,8) → (10,13,8)` —
wander real, não sprite estático. O respawn de `1800` ticks permanece na fixture `pb04-respawn`,
verificada com exit `0` (despawn no tick `1`, `actor/spawned` da entidade `14` no tick `1801`).

**Erros:** `0` de console, `0` de página, `0` de requisição falha e `0` resposta HTTP `≥ 400`.

**Limitação declarada:** o profile `test` serve um PNG sintético `1 × 1` de `68` bytes para todas as
chaves. A sessão prova geometria, colisão, transição, câmera e cadência — **não** identidade visual.
Ver `product-acceptance.md`.

## 6. Política de licença e mídia

- `156` PNGs rastreados. **`147` são a fixture sintética** (`68` bytes,
  `431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460`).
- `5` são baselines de `tests/e2e/shell.spec.ts-snapshots/` (viewports). Não são mídia Tibia.
- `4` são screenshots de QA em `docs/playbooks/PB-04/artifacts/screenshots/`, geradas com o profile
  `test`.
- `git ls-files 'apps/game/public/assets/**'` está vazio.
- **Nenhuma mídia pessoal está versionada.**
- `product` recusa `cipsoft-personal` em `FetchAssetProvider.ts:158` (runtime) e
  `validateAssetProfileTree.ts:54` (empacotamento).
- A varredura por `assets/personal` e `references/` em código encontra o guard de fronteira, testes
  do guard, exclusões do Biome/hooks, scripts que escrevem em diretório gitignorado via
  `HUNTBOUND_PERSONAL_ASSET_SOURCE`, e comentários de proveniência em `tools/map-extractor` e
  `tools/tile-flags`. Nenhum path de mídia pessoal ou de `references/` é lido em runtime de jogo.
  `tools/content-catalog` **já não** monta `references/canary` por literal (W16 fechado).

## 7. Checklist de seleção

Os `8` itens do “Contrato para escolher a primeira hunt” têm evidência em
`docs/content/PB-04-SELECTION.md`. Nenhum item é falso. A linha que citava `canary.otbm` como mapa
da hunt está riscada; o mapa nomeado agora é `data-otservbr-global/world/otservbr.otbm`. W13 fechado
por FIX-04.

## 8. Defeitos da rodada anterior — reexecução

| ID | O que a 1ª auditoria mediu | O que esta rodada mediu | Estado |
|---|---|---|---|
| D1 | `one paced command` `10/10 failed` com `--retries=0`; `verify` mascarava com `retries: 1` | `--retries=0 --repeat-each=10` → **`20 passed`**, exit `0`. `playwright.config.ts:12` é `retries: 0`. As duas `verify` saíram `29 passed`, 0 flaky. Em jogo, cada toque gerou 1 comando. | **fechado** |
| D2 | 5 hashes do card FIX-01 inexistentes no repositório | o card aponta para `hashes.md`; `hunt:hashes:check` compara tabela, arquivo e sidecar, exit `0`. Prefixos antigos só aparecem como histórico do defeito. | **fechado** |
| D3 | `REPLAY_CONTRACT.md` sem seção PB-04 | seção “Hashes congelados — PB-04” presente; valores idênticos aos arquivos e aos sidecars. | **fechado** |
| D4 | `biome check .` exit `1`, 13 diagnósticos | `biome check .` exit `0`, `381` arquivos. | **fechado** |
| W13 | seleção citava `canary.otbm` | riscado; mapa é `otservbr.otbm`. | **fechado** |
| W14 | roteiro/README exigiam reextração OTBM | critério passou a materializar o recipe; envelope OTBM é fonte de spawn e material. | **fechado** |
| W15 | `retries: 1` | `retries: 0`. | **fechado** |
| W16 | testes de `content-catalog` fora do `test` | `test` inclui `tools/content-catalog/vitest.config.ts`; nesta worktree `13 passed \| 1 skipped` por ausência do snapshot (`skipIf` declarado). | **fechado** |

Nenhum defeito bloqueante novo.

## 9. Warnings remanescentes, priorizados

| ID | Descrição | Classe | Prioridade |
|---|---|---|---|
| W9 | Em `390 × 844` a chrome de canto morde o terço centro-inferior do playfield (d-pad `7,0 px`, painel `12,3 px`). O quinto central, onde a câmera mantém o jogador, está livre. Fechar exige encolher as caixas de canto — layout, não gate. Medido em `artifacts/browser-qa.md` §4. | `FIXABLE` | média |
| W12 | Nenhum `tsconfig` inclui `tests/`; specs Playwright não entram em typecheck de gate. Herdado de PB-04-09. | `FIXABLE` | média |
| W17 | `biome.json` ainda não exclui `.worktrees`. Worktree aninhada derruba `format:check` na raiz. Esta auditoria usou worktree irmã e não foi atingida. Pertence a higiene de workspace, não ao produto da hunt. | `FIXABLE` | média |
| W8 | Palette com índice `0` = vazio `serverId 0`; consumidores precisam filtrar antes de contar. Normativo em `MAP_REGION_CONTRACT.md`. | `ACCEPTED` | baixa |
| B2 | Profile `personal` do PB-04 não é gerável neste workspace (`HUNTBOUND_PERSONAL_ASSET_SOURCE` vazio; lock exige manifesto que não é o de `kaezan-arena-fable`). Aceite de produto cobre jogabilidade, não identidade visual. Pré-requisito de **PB-07**. | `ACCEPTED` | média |
| W1, W2, W4, W5, W6 | Herdados de PB-03-08, não reverificados. Continuam em `docs/playbooks/PB-03/artifacts/acceptance-report.md` §10. | `ACCEPTED` | baixa |

Warnings `FIXABLE` herdados de PB-02 continuam em
`docs/playbooks/PB-02/artifacts/acceptance-report.md` §11 e não foram absorvidos.

## 10. Auditoria original (`REJECTED` em `307a3f0`)

Em 2026-08-15 a primeira PB-04-10 reprovou o playbook: D1 (input level-triggered mascarado por
retry), D2 (hashes de replay publicados e inexistentes), D3 (`REPLAY_CONTRACT.md` sem as fixtures
do PB-04) e D4 (`biome check` vermelho). A hunt já era jogável e o aceite de produto já existia. O
texto integral dessa reprovação está no commit da primeira entrega de PB-04-10; esta reavaliação o
substitui como veredito vigente.

## 11. Elegibilidade de PB-05

**PB-05 está liberado.**

O motivo da retenção era D1: combate sobre um input que não distinguia toque de hold. D1 não se
reproduz. D2–D4, a superfície documental que a próxima auditoria reusa como baseline, também
fecharam. Os warnings remanescentes não atravessam a fronteira de combate.

A primeira task elegível é `PB-05-01`. Este chat **não** a inicia.

## 12. Comandos executados, com exit code

```text
git status --porcelain=v1 -uall (main)                    -> 0, vazio
git rev-parse HEAD                                        -> 9f1c14cbf36597471cc08ba28eec3d020df9d723
git worktree add                                          -> 0
corepack pnpm install --prefer-offline                    -> 0
corepack pnpm verify   (sandbox browsers)                 -> 1   [29 failed; Chromium ausente no cache]
corepack pnpm verify                            (1ª)      -> 0   [29 passed, 0 flaky]
git status --porcelain=v1 -uall (worktree)                -> 0, vazio
corepack pnpm verify                            (2ª)      -> 0   [29 passed, 0 flaky]
git status --porcelain=v1 -uall (worktree)                -> 0, vazio
corepack pnpm exec biome check .                          -> 0   [381 files]
corepack pnpm simulation:check                            -> 0
corepack pnpm hunt:check                        (1ª)      -> 0
corepack pnpm hunt:check                        (2ª)      -> 0, digests idênticos
corepack pnpm architecture:check                          -> 0
Get-FileHash events.golden.jsonl (PB-03)                  -> 31f86d62…555888d4
rg identidade Tibia em packages/simulation/src            -> 1 (zero ocorrência)
rg relógio/aleatório em packages/simulation/src           -> 1 (zero ocorrência)
playwright test -g "one paced command" --retries=0
                --repeat-each=10                          -> 0   [20 passed]
sessão de jogo dirigida em Chromium (auditor)             -> 0, zero erro de runtime
prova dirigida das duas transições                        -> descida tick 113, subida tick 148
git status --porcelain=v1 -uall (final, pré-docs)         -> 0, vazio
```
