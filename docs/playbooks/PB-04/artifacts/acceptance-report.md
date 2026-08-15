# PB-04 — Relatório de aceite (PB-04-10)

**Decisão:** `REJECTED`

A hunt é jogável e o aceite de produto do usuário está registrado e honrado. A reprovação **não é do
produto**: é da integridade do gate e da documentação congelada. Três afirmações documentadas por
PB-04-FIX-01 não sobrevivem à reexecução, e um teste que prova um entregável central do FIX-01 falha
de forma determinística, verde apenas porque `retries: 1` o mascara.

## 1. Identificação

| Item | Valor |
|---|---|
| Data da auditoria | 2026-08-15 |
| Commit auditado | `307a3f026c4bdc1238ef86df152d2708c3c394f8` (`feat: refine PB-04 hunt experience`) |
| Branch/worktree | `codex/pb04-10-integrated-gate` em `C:\Kaezan\kaezan-huntbound-pb04-10-integrated-gate` |
| SO | Microsoft Windows 11 Home Single Language, `10.0.26200` |
| Node | `v24.14.0` |
| pnpm | `11.21.0` via Corepack |
| Playwright | `1.62.1` |
| Modelo/effort | Claude Opus 5; effort não é exposto pelo runtime desta sessão |
| Skill obrigatória | `superpowers:verification-before-completion` |

A auditoria é read-only para código, contratos, fixtures, golden e testes. Nenhum arquivo fora dos
paths documentais permitidos foi alterado. Os scripts de jogo escritos para esta auditoria viveram
no scratchpad da sessão e importam Playwright por caminho absoluto justamente para não tocar a
árvore auditada.

## 2. Estado inicial

```text
git status --porcelain=v1 --untracked-files=all   -> vazio (árvore limpa)
git rev-parse HEAD                                -> 307a3f026c4bdc1238ef86df152d2708c3c394f8
git branch codex/pb04-10-integrated-gate main     -> ok
git worktree add ...                              -> ok, HEAD em 307a3f0
corepack pnpm install --prefer-offline            -> exit 0; 70 pacotes; 3,1 s
```

## 3. Matriz de critérios

| Critério | Comando / prova | Resultado | Evidência |
|---|---|---|---|
| Árvore limpa em `main` | `git status --porcelain=v1 -uall` | PASS | saída vazia; `307a3f0` |
| `verify` 1ª execução | `corepack pnpm verify` | PASS | exit `0`; `26 passed`, **`2 flaky`** |
| Árvore inalterada entre execuções | `git status --porcelain=v1 -uall` | PASS | saída vazia |
| `verify` 2ª execução | `corepack pnpm verify` | PASS | exit `0`; `27 passed`, **`1 flaky`** |
| Árvore inalterada após a 2ª | `git status --porcelain=v1 -uall` | PASS | saída vazia |
| Determinismo da simulação | `corepack pnpm simulation:check` | PASS | exit `0`; 4 digests |
| Determinismo da hunt (2×) | `corepack pnpm hunt:check` ×2 | PASS | exit `0`; digests idênticos nas duas passadas |
| Golden do PB-03 byte-idêntico | `sha256sum events.golden.jsonl` | PASS | `31f86d62…555888d4`, igual ao congelado |
| Fronteira de identidade Tibia | `rg 'serverId\|clientId\|lookType\|huntId\|regionId' packages/simulation/src` | PASS | zero ocorrências (exit `1`) |
| Fronteira de relógio/aleatório | `rg 'Date\|performance\|Math.random\|setTimeout\|crypto' packages/simulation/src` | PASS | zero ocorrências (exit `1`) |
| Gate de arquitetura | `corepack pnpm architecture:check` | PASS | exit `0` |
| Sem mídia pessoal versionada | inspeção de todos os `.png` rastreados | PASS | §6 |
| `product` recusa `cipsoft-personal` | `FetchAssetProvider.ts:158`, `validateAssetProfileTree.ts:54` | PASS | recusa em runtime e em empacotamento |
| Hunt jogável de fato | sessão dirigida em Chromium real | PASS | §5 |
| Checklist de seleção | `docs/content/PB-04-SELECTION.md` | PASS com warning | §7 |
| **Teste do gate de input** | `playwright test -g "one paced command" --retries=0 --repeat-each=10` | **FAIL** | **`10 failed`, exit `1`** — D1 |
| **Hashes de replay do FIX-01** | busca literal no repositório | **FAIL** | **5 de 5 não existem** — D2 |
| **Contrato de replay do PB-04** | `docs/simulation/REPLAY_CONTRACT.md` | **FAIL** | fixtures do PB-04 ausentes — D3 |
| `corepack pnpm check` | `biome check .` | **FAIL** | exit `1`; 10 erros, 2 warnings — D4 |

## 4. Determinismo — números medidos

`simulation:check`, exit `0`:

| Artefato | SHA-256 |
|---|---|
| `scenario.json` | `72d006552742691fbb71cd41bc84a80aebf0afd27faef027e358b4d92fcc23e9` |
| `commands.jsonl` | `88ec73de434a7bf092c68bb3a3601caaef1bfca2b59d9b84f20f334462749d66` |
| `snapshot.golden.json` | `84528f5246c156b65e46343d713851d064943c3550281bba0ab0e5d18d10d341` |
| `events.golden.jsonl` | `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4` |

Os quatro batem com `docs/simulation/REPLAY_CONTRACT.md` §PB-03. O golden do PB-03 sobreviveu ao
bump de schema e a todo o PB-04.

`hunt:check`, exit `0`, **idêntico nas duas execuções consecutivas**:

| Fixture | Artefato | SHA-256 |
|---|---|---|
| `pb04` | `scenario.json` | `f8ecff35694c0ba8557546f40d0f7ad384746a0027f0bc3a5c51b2777f88c6e0` |
| `pb04` | `commands.jsonl` | `8c88860bd1dd355b37ac2e16dc2e989aaa2c324ad55637058bb51d33634c7e67` |
| `pb04` | `snapshot.golden.json` | `2e546b17a6905f5be29393b388df0c7dc37919fa75d09d8bcbb776bd75756816` |
| `pb04` | `events.golden.jsonl` | `6e1206eb2ce7ed7647e9923b6d29a3f08f30ca7ec9ddf01b539d6310818d42e1` |
| `pb04-respawn` | `commands.jsonl` | `01e139f9d8fd41fd7c53fc70dcf15286bb49c08ac874da7f43a82d2c22bc1efa` |
| `pb04-respawn` | `snapshot.golden.json` | `2e968f79b850725dd2942ffc2421108b9f4cc09a82b13bda19995fad43e993d3` |
| `pb04-respawn` | `events.golden.jsonl` | `613079d592335829a8e9e7565877c046cee9e21f0f4478b38af4050b7334ba30` |

Esses valores batem com os `hashes.md` versionados dentro de cada fixture. **As fixtures estão
corretas e determinísticas.** O problema é documental e está em D2.

Conteúdo, conferido por `sha256sum` direto — os três batem com o card do FIX-01:

| Artefato | SHA-256 |
|---|---|
| recipe `layouts/hunts/venore-rotworm-cave.json` | `180aab488ab80426ce5b9c7c5e5472db450a83f44e864abbb16cc1ef3f18702e` |
| `generated/hunts/venore-rotworm-cave/region.json` | `a56697fd75a978ac2ccf270df44bf299de289076827be18ff5b2af0a8d6cf0c5` |
| pack `test` `pb-04-venore-rotworm-cave/pack.json` | `1f5c9f849d2ba577d88bdc6b1b096018b5c74fd2d2d301df1925ca4eee6def6f` |

Região medida: `24 × 24`, andares `[8, 9]`, palette de `133`.

## 5. O produto foi jogado, não só testado

Sessão dirigida pelo auditor em Chromium real (`vite preview --mode test`, porta `4188`), com
teclado real, lendo apenas o `HuntProbe` — o estado que a `HuntScene` de fato desenhou. Não foram
reexecutados os specs do repositório: o roteiro de jogo é do auditor.

**Boot:** andar `8`, jogador em `(21, 7, 8)`, `11` criaturas vivas, `visibleRows = 11` (a spec pede
10–12), zoom `2,18`, `641` objetos desenhados (`ground 424`, `objectsBelow 213`, `actors 4`).

**Colisão:** de `(21, 7, 8)`, `n` e `e` são recusados e não movem; `s` e `w` são aceitos. A recusa é
silenciosa e sem exceção.

**Cooldown:** medido em jogo. Um segundo comando dentro da janela responde
`actor/move-blocked reason="cooldown"`. O cooldown do jogador é de `10` ticks (`500 ms`); passos a
cada `290 ms` são recusados, a cada `700 ms` são aceitos.

**Descida:** `w` a partir do start produz `actor/moved (21,7,8) → (20,7,8)` seguido de
`actor/transitioned (20,7,8) → (21,4,9)`, no mesmo tick `39`.

**Subida:** `n` a partir de `(21,5,9)` produz `actor/moved (21,5,9) → (21,4,9)` seguido de
`actor/transitioned (21,4,9) → (20,7,8)`, no tick `75`. **A hunt sobe e desce.** A tabela congelada
tem exatamente as duas transições opostas:

```json
{"from":{"x":20,"y":7,"z":8},"to":{"x":21,"y":4,"z":9}}
{"from":{"x":21,"y":4,"z":9},"to":{"x":20,"y":7,"z":8}}
```

Isso **fecha o W7** herdado de PB-04-04: a hunt não "só desce" mais.

**`transition-blocked` é legítimo.** No boot, três tentativas de `w` foram recusadas com
`reason="transition-blocked"` para `(20,7,8)`, e a quarta passou sem que o jogador tivesse feito
nada diferente. A causa é tráfego de criatura: a entidade `2` estava na célula de destino `(21,4,9)`
e saiu. No tick `77` a própria entidade `2` recebeu `transition-blocked` para `(21,4,9)`. A regra é
coerente — não se toma a escada se o destino está ocupado — e não é defeito.

**Criaturas vivas:** `11` no boot, movendo-se por conta própria (`actor/moved` de entidades `3`,
`4`, `6`, `10`, `12` observados) e sendo bloqueadas por terreno. O respawn real está provado
deterministicamente pela fixture `pb04-respawn` (despawn em ticks `1`/`2`, `actor/spawned` da
entidade `14` no tick `1801`), verificada com exit `0`.

**Erros:** `0` de console, `0` de página, `0` de requisição falha e `0` resposta HTTP `≥ 400` em
toda a sessão.

**`unresolvedGroundCells` não é defeito.** `424` compostas + `152` não resolvidas = `576` = `24 × 24`.
São as células vazias fora do recorte da caverna, não asset faltando. Verificado em
`GroundCompositor.ts:45-62`.

**Limitação declarada:** o profile `test` serve um PNG sintético de `1 × 1` para todas as chaves, então
a screenshot mostra um campo de pontos sobre o backdrop. A sessão prova geometria, colisão,
transição, câmera e cadência — **não** identidade visual. Ver `product-acceptance.md`.

## 6. Política de licença e mídia

- `156` arquivos binários rastreados. Dos `152` PNG fora de `docs/`, **`147` são a mesma fixture
  sintética** (`68` bytes, `431ced69…f265460`).
- Os `5` restantes são **baselines de screenshot do Playwright** em
  `tests/e2e/shell.spec.ts-snapshots/`, com dimensões de viewport (`390×844`, `768×1024`,
  `1366×768` ×2, `1920×1080`). Não são mídia Tibia.
- As `4` screenshots de `docs/playbooks/PB-04/artifacts/screenshots/` são artefato de QA gerado com
  o profile `test`.
- **Nenhuma mídia pessoal está versionada.**
- `product` recusa `cipsoft-personal` em dois pontos independentes: `FetchAssetProvider.ts:158`
  (runtime) e `validateAssetProfileTree.ts:54` (empacotamento).
- A varredura por path de `references/` em código encontrou apenas: comentários de proveniência em
  `tools/map-extractor` e `tools/tile-flags`, os literais do **próprio guard** em
  `tools/architecture/asset-boundaries.*`, e `tools/content-catalog/.../ContentCatalogApplication.test.ts:12`,
  que monta `references/canary` como raiz de leitura — ver W16.

## 7. Checklist de seleção

Os `8` itens do "Contrato para escolher a primeira hunt" têm evidência em
`docs/content/PB-04-SELECTION.md`. Nenhum item é falso. Um item carrega **proveniência obsoleta**:

> "Região localizável e extraível — … O mapa local é `data-canary/world/canary.otbm`;
> `config.lua.dist` declara `mapName = "otservbr"`, pareando o mapa com
> `data-otservbr-global/world/otservbr-monster.xml`."

Essa é exatamente a inferência que PB-04-04 **refutou com medição** e que `STATE.md` já marca como
riscada: `canary.otbm` não contém a caixa congelada; `otservbr.otbm` contém. A conclusão do item
("é extraível") é verdadeira — a região foi extraída —, mas a evidência citada é falsa. Warning W13,
não reprovação.

## 8. Defeitos bloqueantes

### D1 — o teste que prova o gate de input falha 10/10; o gate esconde

`tests/e2e/hunt-play.spec.ts:265` — *"turns a short held direction into one paced command"*.

```text
playwright test -g "one paced command" --retries=0 --repeat-each=10  -> 10 failed, exit 1
```

Falhou também na **primeira tentativa das duas execuções de `verify`**, com dados diferentes
(ticks `11`/`12` e `13`/`14`), e passou no retry das duas. `verify` sai `0` porque
`playwright.config.ts:12` define `retries: 1` — e `trace: 'on-first-retry'` muda o timing o
suficiente para o retry passar. Ou seja: **um teste que falha em 100% das primeiras tentativas é
reportado como suite verde.**

A causa é real e é de produto, não só de teste. `InputMap.drain()` (`InputMap.ts:166-180`) é
**level-triggered**: devolve a direção *segurada* no momento em que o `inputGate` abre, uma vez por
tick. Um toque de `40 ms` contra tick de `50 ms` atravessa duas aberturas de tick conforme a fase, e
vira **dois passos**. Medido em jogo: um toque de `70 ms` gerou `3` comandos numa ocasião e `1` em
outra, sem mudança de intenção do jogador.

O efeito é que **um toque curto não é um passo**: é um ou dois passos, dependendo de onde o toque
cai dentro do tick. Para um jogo de grid isso é precisão de movimento não determinística — o
jogador não consegue dar exatamente um passo de propósito.

O card do FIX-01 e `STATE.md` afirmam "hold curto com um comando por tick" e "`27/27` testes
Playwright passaram". A reexecução não confirma nenhuma das duas.

Card: **PB-04-FIX-02**.

### D2 — os 5 hashes de replay do FIX-01 não existem no repositório

O card `PB-04-FIX-01-corrigir-experiencia-da-hunt.md` publica, como evidência determinística:

| Alegado | Existe no repositório? |
|---|---|
| cenário `pb04` `986b23df…` | não |
| snapshot `pb04` `89879376…` | não |
| eventos `pb04` `74bd1a51…` | não |
| snapshot `pb04-respawn` `0cf24215…` | não |
| eventos `pb04-respawn` `5803374b…` | não |

Busca literal por cada prefixo no repositório inteiro (excluindo `.git` e `node_modules`) retorna
**um único arquivo: o próprio card**. Os valores reais estão em §4 e nos `hashes.md` versionados.

O card ainda diz "Os hashes abreviados acima têm os valores completos nos `hashes.md` de cada
fixture" — o que é falso: os prefixos não batem com nenhum `hashes.md`.

Isso é grave por ser exatamente o que a auditoria existe para pegar: uma tabela de hashes congelados
que não descreve os artefatos. As fixtures estão certas; a documentação de congelamento, não.

Card: **PB-04-FIX-03**.

### D3 — `REPLAY_CONTRACT.md` nunca recebeu as fixtures do PB-04

O card do PB-04-10 manda "confirmar os hashes contra os congelados em
`docs/simulation/REPLAY_CONTRACT.md`". Isso é **impossível para o PB-04**: o contrato congela apenas
a fixture `pb-03-kernel-coverage`. Não há nenhuma seção para `pb04` nem `pb04-respawn`.

`STATE.md` declara W11 fechado "com sidecars e hash tables versionados". Sidecars existem; a
atualização do contrato de replay, não. O roteiro (`06_ROTEIRO…`, §gate) lista
`packages/test-fixtures/hunt/pb04/` como área do gate, o que pressupõe o congelamento documental.

Card: **PB-04-FIX-03** (mesmo card de D2 — é a mesma superfície documental).

### D4 — `corepack pnpm check` está vermelho, e o PB-04 piorou o número

```text
biome check .  -> exit 1; Found 10 errors, 2 warnings, 1 info (370 arquivos)
```

- `assist/source/organizeImports`: **10 erros**
- `lint/correctness/noUnusedVariables`: **2 warnings**, ambos em `tools/map-extractor/topology.ts`
- `lint/style/useTemplate`: 1 info

`verify` não pega porque roda `format:check`, não `biome check`. PB-04-09 registrou este warning como
W10 com **6** diagnósticos; agora são **13**. Sete dos arquivos ofensores são território do PB-04:
`apps/game/src/hunt/HuntPresentation.ts`, `apps/game/src/hunt/huntRuntime.ts`,
`apps/game/src/main.ts`, `tools/map-extractor/cli.ts`, `tools/map-extractor/extract.ts`,
`tools/map-extractor/layout.test.ts` e `tools/replay/pb04HuntFixture.test.ts`. E
`topology.ts` — arquivo **novo do FIX-01** — entrou com duas variáveis não usadas.

Um playbook não deve fechar deixando o gate `check` vermelho por código que ele mesmo escreveu.

Card: **PB-04-FIX-04**.

## 9. Warnings priorizados

| ID | Descrição | Classe | Prioridade |
|---|---|---|---|
| W13 | `PB-04-SELECTION.md` cita `canary.otbm` como o mapa da hunt — inferência que PB-04-04 refutou e `STATE.md` já riscou. Conclusão do item continua verdadeira. | `FIXABLE` | alta |
| W14 | A geometria jogável é **autorada por recipe**, não extraída do mapa real. É decisão de supervisor documentada no design do FIX-01, mas o roteiro ainda exige "a região reextraída é byte-idêntica" e o README ainda lista "Reextrair a região do mesmo snapshot produz JSON byte-idêntico". Contrato e realidade divergem. | `FIXABLE` | alta |
| W15 | `verify` esconde falha atrás de `retries: 1`. Independente de D1: qualquer teste que falhe sempre na 1ª tentativa passa no gate. Considerar `retries: 0` local e reportar flaky como falha. | `FIXABLE` | alta |
| W16 | `tools/content-catalog` tem `14` arquivos de teste e `vitest.config.ts` próprio, mas **nenhum script os executa**. O `test` da raiz enumera `replay`, `tile-flags` e `map-extractor` e omite `content-catalog`. São testes que leem `references/canary` e nunca rodam em gate. | `FIXABLE` | alta |
| W9 | Em `390 × 844` a chrome de canto morde o terço centro-inferior do playfield (d-pad `7,0 px`, painel `12,3 px`). Herdado de PB-04-09, não reverificado aqui. | `FIXABLE` | média |
| W12 | Nenhum `tsconfig` inclui `tests/`; specs Playwright não são checadas por tipo em gate nenhum. Herdado de PB-04-09. | `FIXABLE` | média |
| W8 | `region.palette` tem `133` entradas com o índice `0` como marcador de vazio; todo consumidor precisa filtrar antes de contar. Normativo em `MAP_REGION_CONTRACT.md`. | `ACCEPTED` | baixa |
| B2 | `67` dos `137` ids reais da palette não existem na origem pessoal; o profile `personal` do PB-04 não é gerável. **Deixa de ser bloqueante** por decisão de aceite do usuário; migra para pré-requisito de PB-07. | `ACCEPTED` | média |
| W1, W2, W4, W5, W6 | Herdados de PB-03-08, não reverificados. Continuam em `docs/playbooks/PB-03/artifacts/acceptance-report.md` §10. | `ACCEPTED` | baixa |

Warnings herdados de PB-02 (`FIXABLE`) continuam em
`docs/playbooks/PB-02/artifacts/acceptance-report.md` §11 e não foram absorvidos.

## 10. O que passou e deve ser dito

A reprovação é estreita. Estas coisas foram medidas e estão corretas:

- `verify` é **idempotente**: exit `0` duas vezes, árvore byte-idêntica entre e depois.
- O golden do PB-03 sobreviveu ao bump de `SIMULATION_SCHEMA_VERSION` e ao PB-04 inteiro.
- `hunt:check` é determinístico e as fixtures batem com seus próprios sidecars.
- O kernel continua sem identidade Tibia, sem relógio e sem aleatoriedade global.
- Nenhuma mídia pessoal foi versionada, e `product` recusa `cipsoft-personal` em dois pontos.
- **A hunt é jogável de verdade**: anda, colide, desce, sobe, respeita cooldown, tem criaturas vivas
  e não emite um único erro. O W7 está fechado.
- O aceite de produto do usuário está registrado em `product-acceptance.md` e é honrado.

## 11. Elegibilidade de PB-05

**PB-05 NÃO está liberado.**

O motivo é D1: PB-05 é combate, e combate se dá em cima do mesmo caminho de input que hoje entrega
um número não determinístico de passos por toque. Construir combate sobre um input que não distingue
toque de hold significa herdar o defeito em ataque, alvo e posicionamento — onde ele custa muito
mais caro para corrigir.

D2, D3 e D4 são baratos e devem ser resolvidos junto, porque são a superfície documental e de gate
que a próxima auditoria vai reusar como baseline.

PB-04 permanece **aberto**. Os cards que o desbloqueiam são `PB-04-FIX-02`, `PB-04-FIX-03` e
`PB-04-FIX-04`. Quando os três estiverem `done` e integrados, uma nova rodada de PB-04-10 decide o
fechamento.

## 12. Comandos executados, com exit code

```text
git status --porcelain=v1 -uall (main)                    -> 0, vazio
git rev-parse HEAD                                        -> 307a3f026c4bdc1238ef86df152d2708c3c394f8
git worktree add                                          -> 0
corepack pnpm install --prefer-offline                    -> 0
corepack pnpm verify                            (1ª)      -> 0   [26 passed, 2 flaky]
git status --porcelain=v1 -uall (worktree)                -> 0, vazio
corepack pnpm verify                            (2ª)      -> 0   [27 passed, 1 flaky]
git status --porcelain=v1 -uall (worktree)                -> 0, vazio
playwright test -g "one paced command" --retries=0
                --repeat-each=10                          -> 1   [10 failed]
corepack pnpm simulation:check                            -> 0
sha256sum events.golden.jsonl                             -> 31f86d62…555888d4
corepack pnpm hunt:check                        (1ª)      -> 0
corepack pnpm hunt:check                        (2ª)      -> 0, digests idênticos
corepack pnpm architecture:check                          -> 0
rg identidade Tibia em packages/simulation/src            -> 1 (zero ocorrência)
rg relógio/aleatório em packages/simulation/src           -> 1 (zero ocorrência)
sha256sum recipe / region / pack                          -> conferem com o card do FIX-01
busca literal dos 5 hashes de replay do FIX-01            -> só o próprio card
corepack pnpm exec biome check .                          -> 1   [10 errors, 2 warnings, 1 info]
sessão de jogo dirigida em Chromium (auditor)             -> 0, zero erro de runtime
prova dirigida das duas transições                        -> 0, descida e subida confirmadas
git status --porcelain=v1 -uall (final)                   -> 0, vazio
```
