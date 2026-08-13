# PB-02 — Relatório de aceite integrado (PB-02-07)

**Decisão final: `REJECTED`**

PB-02 permanece **aberto**. PB-03 **não** é elegível. A primeira task corretiva é **`PB-02-FIX-01`**.

Nenhum código, schema, fixture, teste ou configuração foi alterado durante esta auditoria.

## 1. Identificação

| Campo | Valor |
|---|---|
| Data | 2026-08-13 |
| Commit auditado | `af31d22231692ab70639ea7affc8d31bf2b91f8a` |
| Branch de auditoria | `codex/pb02-07-integrated-gate` |
| Worktree | `kaezan-huntbound-pb02-07-integrated-gate` |
| SO | Microsoft Windows 11 Home Single Language 10.0.26200.0 |
| Node | `v24.14.0` |
| pnpm | `11.21.0` (Corepack) |
| Browser | Playwright `1.62.1`, Chromium empacotado, `use.browserName: 'chromium'` |
| Auditor | Claude Code / Opus 5 |

## 2. Estado inicial

| Prova | Comando | Resultado |
|---|---|---|
| Origem limpa | `git status --short` em `main` | vazio |
| Commit base | `git rev-parse HEAD` | `af31d22` |
| Worktree criado | `git worktree add … -b codex/pb02-07-integrated-gate main` | ok, `af31d22`, status vazio |
| Install congelado | `pnpm install --frozen-lockfile` | exit 0; lockfile policy passed; **sem** `--config.strict-ssl=false` |

As seis tasks anteriores estão integradas em `main`. As quatro saídas geradas allowlisted
(`.cache/asset-packer`, `apps/game/public/assets/{test,product,personal}`) estavam **ausentes** no
worktree novo; nada precisou ser removido na etapa de limpeza inicial. Todas as remoções posteriores
foram validadas por `Resolve-Path` + prefixo do worktree + igualdade exata com a allowlist.

## 3. Matriz de aceite

| Critério | Comando / prova | Resultado | Evidência curta |
|---|---|---|---|
| Auditoria parte de `main` limpo | `git status --short`, `rev-parse` | ✅ | vazio; `af31d22` |
| Contratos e fixture sem origem externa | `--filter @huntbound/assets test` | ✅ | 36 passed (7 files) |
| Typecheck de contratos | `--filter @huntbound/assets typecheck` | ✅ | exit 0 |
| Golden sintético íntegro | `pnpm assets:check` | ✅ | exit 0; `packSha256 775d56f8…` |
| Fixture = 5 PNGs de 68 bytes | hash de `…/pb02/source/**/*.png` | ✅ | 5/5, todos `431ced69…` |
| Selection/source lock com 5 keys e IDs congelados | leitura + `selectionArtifacts.test.ts` | ✅ | 131/26/3031/12/36 |
| Dupla geração byte-idêntica | duas árvores em `.cache/asset-packer/audit-{a,b}` | ✅ | árvores idênticas (ver §4) |
| Sem timestamp/source root/separador Windows | scan do `pack.json` gerado | ✅ | 6 padrões, 0 ocorrências |
| `--check` contra golden versionado | `assets:test:generate:check` | ✅ | exit 0; 3 arquivos idênticos |
| Origem pessoal confere com hashes congelados | `assets:personal:generate` + `:check` | ✅ | 6/6 hashes (ver §5) |
| Manifests pessoais sem path absoluto | scan de `catalog.json`/`pack.json` | ✅ | 0 drive letter, 0 backslash |
| Provas negativas com código tipado | suítes packer + assets | ✅ | 40 + 36 passed (ver §6) |
| `product` bloqueia catálogo `cipsoft-personal` | `build:product` sobre árvore restrita | ✅ | exit 1, 0 modules transformed |
| `product` permitido passa em seguida | `assets:stage:product` + `build:product` | ✅ | exit 0; 110 modules |
| **`product` não distribui `cipsoft-personal`** | inspeção de `dist/game` após `build:product` | ❌ | **BLOCKER-1** (ver §9) |
| Boundaries falham nos casos proibidos | `node --test tools/architecture/*.test.ts` | ✅ | 13 passed |
| Boundaries sem falso positivo em allowlist | `checkAssetBoundaries` → `[]` | ✅ | diagnostics vazio |
| `architecture:check` verde | `pnpm architecture:check` | ✅ | exit 0 (antes e depois) |
| Browser preload/unload/reload | `playwright test asset-pack.spec.ts` | ✅ | 5 → 0 → 5 keys |
| Sem erro de console/página/rede | asserts do próprio spec | ✅ | 4 arrays vazios |
| Boot ≤ 5 s sob Fast 4G | `playwright test boot-budget.spec.ts` | ✅ | actionable **3131.7 ms** |
| `__huntboundAssetProbe` ausente em `personal`/`product` | teste focal + inspeção de bundle | ⚠️ | runtime ok, string presente (WARN-1) |
| Nenhum asset pessoal/pack gerado tracked | `git ls-files` | ✅ | 0 linhas |
| Exatamente 5 PNGs sintéticos tracked | `git ls-files -- ':(glob)…/source/**/*.png'` | ✅ | 5 |
| Nenhum source path persistido | `git grep -n -I -E …` | ✅ | exit 1 (sem matches) |
| Nenhum PNG tracked = hash real | hash de 11 PNGs tracked | ✅ | 0 coincidências |
| **`verify` passa no worktree** | `pnpm verify` | ❌ | **BLOCKER-2** (ver §9) |
| `git diff --check` limpo | `git diff --check` | ✅ | exit 0 |
| Árvore final sem alteração de implementação | `git status --short` | ✅ | 0 linhas |

## 4. Dupla geração sintética

Duas gerações independentes a partir da mesma fixture, em diretórios distintos:

```text
media/431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460.png | 68   | 431ced69…f265460
pack.json                                                                  | 3338 | 775d56f8…8d97af5
pack.sha256                                                                | 65   | 71f20860…f76c169e
```

- árvores relativas idênticas: **sim** (3 arquivos em ambas);
- hashes idênticos byte a byte: **sim**;
- `packId` idêntico: `asset-pack:fixture:pb-02-contract-coverage`;
- `pack.sha256` idêntico: `775d56f87b156349d9e81410d1703bac1499e1d332a2c1064dce498d18d97af5`;
- JSON canônico: sem CR, termina em LF, sem drive letter, sem barra invertida, sem timestamp;
- os três arquivos batem byte a byte com o golden versionado em
  `packages/test-fixtures/assets/pb02/expected/test/packs/pb-02-contract-coverage/`.

Ambos os diretórios temporários foram removidos após validação de path.

## 5. Verificação da origem pessoal

`HUNTBOUND_PERSONAL_ASSET_SOURCE` não estava definida; a origem foi descoberta apenas para esta
execução e mantida em memória. **O path não é registrado neste relatório nem em nenhum artefato.**

| Entrada | Bytes | SHA-256 | Confere |
|---|---:|---|---|
| `manifest.json` | 808964 | `edf07a6e…b3a05a94` | ✅ |
| `outfits/131.png` | 196361 | `7b131fd5…1fb038cd6` | ✅ |
| `outfits/26.png` | 23500 | `50693364…f1f253ed3f4b` | ✅ |
| `objects/3031.png` | 1301 | `cc44391c…b91d87c59fc33faf1` | ✅ |
| `effects/12.png` | 3967 | `6840bf0e…0b43a4521c35bdb` | ✅ |
| `missiles/36.png` | 12974 | `0a243815…a50efc93cc237a96` | ✅ |

```text
assets:personal:generate -> exit 0; packSha256 a711c757…6a877dff9c; 5 mídias; 241948 bytes
assets:personal:check    -> exit 0; mesmos packId, hash, contagem e byteCount
```

Saída gravada em `apps/game/public/assets/personal` (ignorada). Scan dos manifests gerados:
sem drive letter, sem barra invertida, sem nome do repositório de origem. As ocorrências de
`arena-fable-tibia` são o `sourceGroupId` e o `source` (`arena-fable-tibia-export`) declarados no
source lock versionado — rótulos de proveniência, não paths.

## 6. Provas negativas e códigos observados

| Prova exigida | Cobertura fresca | Código / resultado |
|---|---|---|
| duas stable keys ausentes | `buildAssetPack.test.ts` — agrega 2 identidades ausentes + 1 mismatch de categoria em ordem estável | erro agregado único ✅ |
| path `../escape.png` | `sourceManifest.test.ts` "rejects unsafe source path"; `sourceLock.test.ts` "rejects media symlinks that escape the source root"; `assetManifests.test.ts` | `ASSET_PATH_UNSAFE` ✅ |
| byte de mídia corrompido | `materializeAssetPack.test.ts` "aggregates corrupt source media before creating the destination parent or staging" | `ASSET_MEDIA_HASH_MISMATCH` ✅ |
| promoção com falha após staging | `materializeAssetPack.test.ts` "preserves the previous output when a staging write fails" + "rolls the previous output back when staging promotion fails" | pack anterior byte a byte ✅ |
| mesmo `packId` com hash diferente | `AssetPackRegistry.test.ts` "is idempotent for the same pack hash and rejects a changed hash"; `FetchAssetProvider.test.ts` | `ASSET_PACK_CONFLICT` ✅ |
| `effectId: 12` como `missileId` | `ManifestAssetAdapters.test.ts` "resolves each typed namespace without mixing equal numeric IDs" + "throws a typed unavailable error" | lookup ausente, sem colisão ✅ |
| catálogo `product` com grupo `cipsoft-personal` | `build:product` real sobre árvore restrita | `ASSET_PROFILE_FORBIDDEN` + `ASSET_LICENSE_FORBIDDEN`, `0 modules transformed`, exit 1 ✅ |
| catálogo `product` sintético permitido | `assets:stage:product` + `assets:product:check` + `build:product` logo em seguida | exit 0 / exit 0 / 110 modules ✅ |
| falha parcial no provider | `FetchAssetProvider.test.ts` "revokes staged URLs when URL creation fails" + "revokes every URL from a conflicting pack and does not replace the first pack" | registry e URLs anteriores válidos ✅ |

Contagens frescas: packer **40 passed (11 files)**; `@huntbound/assets` **36 passed (7 files)**;
app **36 passed (9 files)**; boundaries **13 passed**. Nenhuma fixture versionada foi editada para
fabricar estas provas.

O guard restrito foi exercido em duas etapas. Com o catálogo copiado ainda declarando
`profile: personal`, o guard curto-circuita em `ASSET_CATALOG_PROFILE_MISMATCH`. Ajustando somente a
saída gerada ignorada para declarar `profile: product`, os dois códigos exigidos aparecem antes do
bundle.

## 7. Browser

```text
asset-pack.spec.ts  -> 1 passed; preload 5 keys, unload {state:'unloaded',count:0,keys:[]}, reload 5 keys
                       consoleErrors=[] pageErrors=[] failedRequests=[] badResponses=[]
boot-budget.spec.ts -> 1 passed; actionable 3131.7 ms (limite 5000 ms) sob Fast 4G
total               -> 2 passed (7.9s)
```

O consumidor busca `/assets/test/catalog.json` e daí deriva `pack.json`, `pack.sha256` e
`media/431ced69….png` — nenhum pack ID ou path de mídia hardcoded.

## 8. Arquivos tracked / ignored

```text
git ls-files apps/game/public/assets                -> 0 linhas
git ls-files apps/game/public/assets/personal       -> 0 linhas
git status --short --ignored -- …/assets/personal   -> !! (ignorado)
git ls-files …/pb02/source/**/*.png                 -> exatamente 5
git ls-files **/*.png                               -> 11 (5 fixture + 1 golden 68 B + 5 snapshots de shell)
hash dos 11 PNGs tracked vs 5 hashes reais          -> 0 coincidências
git grep -E "[A-Za-z]:[/\\]|frontend/public/assets/tibia" … -> exit 1 (nenhum match)
```

## 9. Blockers e warnings

### BLOCKER-1 — RESOLVIDO por PB-02-FIX-01: emissão isolada por perfil

**Risco histórico de produto e de licença. Resolvido na branch
`codex/pb02-fix-01-profile-emission`; não altera a decisão histórica
`REJECTED` deste relatório.**

`apps/game/vite.config.ts` passa `publicDir` apenas para `assetProfileGuardPlugin`, que o usa para
**validar** o perfil pedido. O `publicDir` do próprio Vite continua sendo o default
`apps/game/public`, então **toda** a árvore é copiada para `dist/`, incluindo
`apps/game/public/assets/personal`.

Prova fresca, `dist/` apagado antes e apenas `build:product` executado:

```text
build:product                                   -> exit 0
dist/game/assets/                               -> personal, product, test
dist/game/assets/personal                       -> 8 arquivos, 242324 bytes
mídias reais congeladas presentes               -> 5 de 5
pack.json com licenseClass cipsoft-personal     -> presente
```

O guard recusa um **catálogo** `product` que referencie `cipsoft-personal` (§6), mas não impede que
os **bytes** pessoais sejam emitidos no artefato `product`. O catálogo de produto não os referencia,
porém eles são servidos e distribuíveis. Isso contraria a decisão congelada "`product` falha para
qualquer dependência transitiva `cipsoft-personal`; não há warning permissivo" e o critério "O build
`product` bloqueia `cipsoft-personal`".

Só se manifesta quando `assets:personal:generate` já foi executado na máquina — que é exatamente o
fluxo local-first previsto pelo playbook. Um checkout novo de CI não reproduz.

#### Revalidação após PB-02-FIX-01

`publicDir: false` foi configurado no Vite e o guard passou a emitir a árvore
validada do perfil ativo, preservando `assets/<profile>/...`. A saída pessoal
foi gerada localmente apenas para a prova e permaneceu fora do Git.

```text
assetProfileGuardPlugin.test.ts                         -> 6 passed
build:product com personal presente                     -> exit 0; diretórios: product; personal: 0 arquivos
build:personal                                           -> exit 0; diretórios: personal; 8 arquivos
build (test)                                             -> exit 0; diretórios: test; 4 arquivos
product: mídias reais cipsoft-personal no dist           -> 0 de 5
árvore emitida product vs origem validada                -> 4 arquivos; bytes idênticos
dev server: catálogo ativo                               -> 200; perfil inativo -> 404
corepack pnpm exec playwright test asset-pack.spec.ts boot-budget.spec.ts -> 2 passed
corepack pnpm verify                                     -> exit 0; QA browser 8 passed
git ls-files apps/game/public/assets                     -> 0 linhas
```

O blocker de `verify` não é alterado por esta correção: `biome.json` continua
fora do escopo e PB-02-FIX-02 permanece a próxima task.

### BLOCKER-2 — `verify` não é idempotente

**Bloqueia o critério "`verify` passa no worktree e novamente em `main` após integração".**

`biome.json` exclui `apps/game/public/assets/personal` e
`packages/test-fixtures/assets/pb02/expected`, mas **não** exclui `apps/game/public/assets/test` nem
`apps/game/public/assets/product`. Como `pnpm test` e `pnpm build` executam `assets:stage:test`, e
`format:check` é o **primeiro** passo de `verify`, a segunda execução encontra o JSON canônico
gerado e falha.

Prova fresca (red/green), sem nenhuma alteração de fonte entre as duas execuções:

```text
[saídas staged removidas]
pnpm verify  (execução 1) -> exit 0
pnpm verify  (execução 2) -> exit 1
  apps/game/public/assets/test/catalog.json                            format ×
  apps/game/public/assets/test/packs/pb-02-contract-coverage/pack.json format ×
  Found 4 errors  (com product staged também: 4 arquivos)
```

Os handoffs de PB-02-05 e PB-02-06 registram `verify` exit 0 porque cada um rodou o gate uma única
vez sobre uma árvore em que essas saídas ainda não existiam.

### WARN-1 — `__huntboundAssetProbe` presente nos bundles `personal`/`product`

O probe é gated em runtime (`if (profile !== 'test') return;`), e o teste focal
`AssetRuntimeProbe.test.ts` "installs the probe only for test" passa. Porém o perfil é um valor de
runtime, não uma constante de compilação, então a função e o literal sobrevivem ao tree-shaking e a
string aparece 1 vez nos bundles `personal` e `product`. **Nenhuma API de probe é exposta em
runtime** nesses modos. Não é risco de produto; a exigência literal "ausente nos bundles" não está
satisfeita.

### WARN-2 — aviso de chunk > 500 kB

Os três builds emitem o aviso do Vite sobre chunk acima de 500 kB (bundle Phaser, ~1,47 MB).
Pré-existente, não-risco, sem critério pendente no PB-02.

### WARN-3 — worktree/branch de PB-02-06 não removidos

`kaezan-huntbound-pb02-06-browser-contract` e `codex/pb02-06-browser-contract` continuam presentes,
ambos em `af31d22` — sem divergência em relação a `main`, portanto sem disputa. Não foram removidos:
limpar estado preexistente do usuário está fora do escopo desta task.

### Desvio registrado

`--project=chromium` não existe em `playwright.config.ts`; o Chromium é selecionado por
`use.browserName`. Os cenários foram executados sem esse filtro nominal, como já registrado no
handoff de PB-02-06.

## 10. Decisão

**`REJECTED`.**

Dois blockers reproduzíveis foram encontrados em produto, não em ferramenta de auditoria:

1. o artefato `product` distribui as cinco mídias reais `cipsoft-personal`;
2. `verify` falha na segunda execução consecutiva.

Nenhum deles foi corrigido aqui — esta task é read-only para implementação.

| Campo | Valor |
|---|---|
| Decisão | `REJECTED` |
| Commit auditado | `af31d22231692ab70639ea7affc8d31bf2b91f8a` |
| Commit de fechamento | — (playbook não foi fechado) |
| Gates verdes | contratos, fixture, determinismo, origem pessoal, provas negativas, boundaries, browser, política Git, `verify` em 1ª execução |
| Gates vermelhos | distribuição `product`, `verify` idempotente |
| Warnings | WARN-1, WARN-2, WARN-3 |
| PB-02 | **aberto** |
| PB-03 | **não elegível** |
| Próxima task | **`PB-02-FIX-01`** |

### Escopo sugerido para `PB-02-FIX-01`

1. Fazer o build de cada perfil emitir **somente** a árvore de assets daquele perfil — por exemplo
   definindo o `publicDir` do Vite para `apps/game/public/assets/<mode>` com o restante do
   `public/` tratado explicitamente, ou materializando a saída do perfil em um diretório próprio.
   Cobrir com um teste que falhe quando `dist` contiver qualquer grupo não permitido pelo perfil.
2. Tornar `verify` idempotente — excluir as saídas geradas `apps/game/public/assets/test` e
   `apps/game/public/assets/product` do Biome, do mesmo modo que `personal` e `expected` já são.
   Cobrir com uma execução dupla de `verify` no gate.
3. Opcional (WARN-1): eliminar o probe dos bundles não-`test` por constante de compilação, ou
   ajustar o critério para "não instalado em runtime", que é o que está de fato garantido.

Após a correção, reexecutar esta matriz completa antes de reconsiderar o fechamento do PB-02.
