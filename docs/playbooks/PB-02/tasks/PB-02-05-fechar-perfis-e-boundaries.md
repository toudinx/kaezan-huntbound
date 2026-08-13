# PB-02-05 — Fechar perfis, build guard e boundaries

**Status inicial:** pending

**Classe da tarefa:** implementação complexa — cruza licença, build, tooling e arquitetura

**Modelo sugerido:** GPT-5.6 Sol `xhigh`; fallback Claude Code/Opus 5

**Validador sugerido:** Claude Code/Opus 5 quando Sol implementar; Sol quando Opus implementar

**Rota:** `game-studio:web-game-foundations` + `superpowers:test-driven-development` +
`superpowers:verification-before-completion`.

**Paralelismo:** não. Integrador único de PB-02-03/04 quando a onda paralela foi ativada.

## Objetivo

Integrar packer/runtime, criar catálogos e staging por perfil, bloquear `cipsoft-personal` no build
`product`, registrar scripts raiz e instalar uma regra viva contra paths/mídia fora das fronteiras.

## Resultado esperado

`assets:check` reproduz o golden sintético; builds `test` e `product` permitidos passam; uma árvore
`product` restrita faz o próprio build falhar. `architecture:check` detecta path de mídia em
consumidor e dependência de assets na simulation.

## Dependências e leitura mínima

1. esta task, `README.md` e `STATE.md`;
2. spec e docs assets produzidas;
3. implementação PB-02-03/04 e respectivos testes;
4. `package.json`, `.gitignore`, `apps/game/package.json`, `apps/game/vite.config.ts`;
5. `tools/architecture/check-boundaries.ts`, testes e policy JSON.

PB-02-03 e PB-02-04 devem estar integradas serialmente ou disponíveis como branches preservadas.

## Decisões congeladas

- Perfis runtime/build: `test`, `personal`, `product`.
- Golden versionado: `packages/test-fixtures/assets/pb02/expected/test/`.
- Staging público gerado/ignorado: `apps/game/public/assets/<profile>/`.
- Catálogo fica na raiz do perfil e referencia `packs/pb-02-contract-coverage/pack.json`.
- `stage-profile` valida origem e destino, mantém packs/mídia byte a byte e emite no destino um
  catálogo canônico com o profile solicitado somente se todos os grupos permitirem esse target.
- Vite guard roda em `buildStart`, antes de bundle, e valida catálogo + packs transitivos do mode.
- `vite build --mode test` é o build default do app; `--mode product` é o gate de produto.
- O guard não examina packs não referenciados pelo catálogo selecionado.
- Proof restrita usa árvore gerada em path ignorado e é restaurada para a versão permitida.
- `assets:personal:check` é gate local explícito e não entra em `verify` reproduzível.

## Escopo permitido

```text
tools/asset-packer/profile/**
tools/asset-packer/vite/**
tools/asset-packer/testing/createRestrictedProductProof.ts
tools/asset-packer/cli.ts
tools/asset-packer/**/*.test.ts
packages/test-fixtures/assets/pb02/expected/test/catalog.json
tools/architecture/asset-boundaries.ts
tools/architecture/asset-boundaries.test.ts
tools/architecture/check-boundaries.ts
tools/architecture/check-boundaries.test.ts
tools/architecture/dependency-policy.json
package.json
apps/game/package.json
apps/game/vite.config.ts
.gitignore
docs/assets/ASSET_PROFILES.md
docs/playbooks/PB-02/STATE.md
```

## Fora de escopo

- app composition root/provider use em `apps/game/src`;
- DOM probe, Playwright ou screenshot;
- escolher pack/hunt real além do fixture;
- permitir `product` com warning;
- escanear bytes de PNG por licença;
- correções não relacionadas no workspace.

## Interfaces produzidas

```ts
export async function validateAssetProfileTree(input: {
  readonly profile: AssetBuildProfile;
  readonly profileRoot: string;
  readonly catalogPath: string;
}): Promise<AssetValidationResult<ValidatedAssetProfile>>;

export async function stageAssetProfile(input: {
  readonly profile: AssetBuildProfile;
  readonly sourceProfileRoot: string;
  readonly destinationProfileRoot: string;
}): Promise<AssetValidationResult<StagedAssetProfile>>;

export function createSinglePackAssetCatalog(input: {
  readonly profile: AssetBuildProfile;
  readonly packId: string;
  readonly manifestPath: string;
  readonly requiredKeys: readonly AssetKey[];
}): AssetValidationResult<AssetPackCatalog>;

export function assetProfileGuardPlugin(input: {
  readonly profile: AssetBuildProfile;
  readonly publicDir: string;
}): import('vite').Plugin;

export async function checkAssetBoundaries(
  root: string,
): Promise<readonly string[]>;
```

`validateAssetProfileTree` valida catálogo, preload refs, pack.sha256, pack schema, media size/hash,
group profiles e licenças transitivas. Para `product`, qualquer `cipsoft-personal` retorna
`ASSET_LICENSE_FORBIDDEN`, mesmo que outro field tente permitir product.

`stageAssetProfile` primeiro valida o profile declarado pelo catálogo de origem. Depois valida o
target contra todos os packs transitivos, copia manifests/mídia sem alterar bytes e serializa apenas o
catálogo de destino com `profile` igual ao target. Assim o golden `test` pode alimentar o staging
`product` porque o grupo sintético permite ambos, sem falsificar um pack pessoal.

## Scripts raiz obrigatórios

```json
{
  "assets:test:generate:check": "node tools/asset-packer/cli.ts build --check --selection packages/test-fixtures/assets/pb02/selection.json --source-lock packages/test-fixtures/assets/pb02/source-lock.json --source-root packages/test-fixtures/assets/pb02/source --output packages/test-fixtures/assets/pb02/expected/test/packs/pb-02-contract-coverage",
  "assets:stage:test": "node tools/asset-packer/cli.ts stage-profile --profile test --source-profile-root packages/test-fixtures/assets/pb02/expected/test --output apps/game/public/assets/test",
  "assets:stage:product": "node tools/asset-packer/cli.ts stage-profile --profile product --source-profile-root packages/test-fixtures/assets/pb02/expected/test --output apps/game/public/assets/product",
  "assets:personal:generate": "node tools/asset-packer/cli.ts build-profile --profile personal --selection packages/assets/catalog/selections/pb-02-contract-coverage.json --source-lock packages/assets/catalog/sources/arena-fable-tibia-1b14dee.json --source-root-env HUNTBOUND_PERSONAL_ASSET_SOURCE --output apps/game/public/assets/personal",
  "assets:personal:check": "node tools/asset-packer/cli.ts build-profile --check --profile personal --selection packages/assets/catalog/selections/pb-02-contract-coverage.json --source-lock packages/assets/catalog/sources/arena-fable-tibia-1b14dee.json --source-root-env HUNTBOUND_PERSONAL_ASSET_SOURCE --output apps/game/public/assets/personal",
  "assets:product:check": "node tools/asset-packer/cli.ts profile-check --profile product --profile-root apps/game/public/assets/product",
  "assets:check": "corepack pnpm assets:test:generate:check && node tools/asset-packer/cli.ts profile-check --profile test --profile-root packages/test-fixtures/assets/pb02/expected/test",
  "build": "corepack pnpm assets:stage:test && corepack pnpm --recursive run build"
}
```

Acrescente `corepack pnpm assets:check` ao `check` e ao `verify` antes de build/QA. Não coloque
`assets:personal:check` nesses gates.

`apps/game/package.json` expõe:

```json
{
  "build": "vite build --mode test",
  "build:personal": "vite build --mode personal",
  "build:product": "vite build --mode product"
}
```

## Regras arquiteturais

`asset-boundaries.ts` usa scanner TypeScript e filesystem, não regex cega sobre `dist`.

Bloqueios:

- import `@huntbound/assets` em `packages/simulation`;
- `phaser`, Node builtin ou filesystem em `packages/assets/src`;
- string literal terminada em `.png|.webp|.jpg|.jpeg|.gif|.avif` em `apps/game/src`,
  `packages/simulation` ou feature packages;
- literal contendo `/packs/` ou `assets/personal` em consumer code;
- `manifestPath`/media path fora de manifest/tooling/fixtures/composition profile.

Allowlist mínima:

```text
packages/assets/catalog/**
packages/test-fixtures/assets/**
tools/asset-packer/**
apps/game/vite.config.ts
apps/game/src/assets/AssetProfile.ts  # somente URL do catálogo, criada em PB-02-06
```

A regra não varre docs, snapshots históricos, `dist`, public gerado, node_modules ou Git internals.

## Execução RED/GREEN

- [ ] **1. Detectar modo serial/paralelo e criar worktree.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree list
git -C C:\Kaezan\kaezan-huntbound branch --list codex/pb02-03-deterministic-packer codex/pb02-04-asset-runtime
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards -b codex/pb02-05-profile-guards main
```

Se as duas tasks já forem ancestrais de `main`, siga. Se branches paralelas existirem, worktrees
delas precisam estar removidas/limpas; dentro da worktree PB-02-05 faça:

```powershell
git merge --ff-only codex/pb02-03-deterministic-packer
git merge --no-ff --no-edit codex/pb02-04-asset-runtime
```

Conflito bloqueia; não faça rebase ou resolução fora dos paths funcionais previstos.

- [ ] **2. Escrever RED de profile validation.**

Em temp dir, cubra test permitido, product permitido, profile ref ausente, pack hash divergente,
media transitiva ausente, group sem product e `cipsoft-personal`. Prove diagnostics agregados.

- [ ] **3. Implementar validate/stage profile.**

Reutilize `verifyMaterializedAssetPack`; não duplique hash/schema. Stage em sibling validado e faça
promoção segura como o packer.

Acrescente `build-profile` como orquestração fina: verificar source lock, materializar o único pack,
criar catálogo canônico com todas as selection keys em preload e validar/promover o profile inteiro.
`--source-root-env` aceita somente o nome allowlisted `HUNTBOUND_PERSONAL_ASSET_SOURCE`, exige valor
absoluto existente e nunca serializa esse valor. `--check` compara a árvore pessoal já gerada,
resolve as cinco required keys pelos contracts públicos e não reescreve arquivos.

- [ ] **4. Criar catálogo test versionado.**

```json
{
  "schemaVersion": "1",
  "profile": "test",
  "packs": [{
    "packId": "asset-pack:fixture:pb-02-contract-coverage",
    "manifestPath": "packs/pb-02-contract-coverage/pack.json"
  }],
  "preloads": [{
    "packId": "asset-pack:fixture:pb-02-contract-coverage",
    "requiredKeys": [
      "creature:tibia:rotworm",
      "effect:tibia:energy-hit",
      "item:tibia:gold-coin",
      "missile:tibia:energy-ball",
      "outfit:tibia:knight"
    ]
  }]
}
```

Ordene required keys canonicamente.

- [ ] **5. Escrever RED e implementar Vite guard.**

Teste plugin diretamente chamando hook com trees temp. `apps/game/vite.config.ts` seleciona
`test|product|personal` somente a partir de `mode`, rejeita outro mode e aponta para
`public/assets/<mode>` sem conhecer pack/media.

- [ ] **6. Criar proof restrita e provar build negativo/positivo.**

Primeiro stage test/product permitido. Depois o helper cria em public product ignorado um pack
válido estruturalmente, mas com group `cipsoft-personal`, e catálogo product referenciando-o.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards assets:stage:product
node C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards\tools\asset-packer\testing\createRestrictedProductProof.ts --output C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards\apps\game\public\assets\product
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards --filter @huntbound/game build:product
```

Esperado: exit 1 antes do bundle com `ASSET_LICENSE_FORBIDDEN`. Restaure e prove positivo:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards assets:stage:product
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards assets:product:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards --filter @huntbound/game build:product
```

- [ ] **7. Escrever RED da regra arquitetural.**

Fixtures temporárias devem fazer `checkAssetBoundaries` falhar para import assets na simulation,
`'/assets/personal/packs/x.png'` no app e import Phaser/Node em assets. Prove controles válidos na
allowlist e bootstrap catalog-only.

- [ ] **8. Implementar/integrar boundary e policy.**

Acrescente external rule de `@huntbound/assets`: `allowedDependencies: ['zod']`,
`forbidDomLibraries: ['phaser']`, `forbidNodeBuiltins: true`. Chame `checkAssetBoundaries` pelo gate
existente.

- [ ] **9. Registrar scripts/ignores e executar gates.**

Ignore explicitamente public `test`, `product` e `personal`. Depois:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards assets:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards exec vitest run --config tools/asset-packer/vitest.config.ts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards --filter @huntbound/assets test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards exec biome check tools/asset-packer tools/architecture packages/assets apps/game/vite.config.ts package.json
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards format:check
git -C C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards diff --check
git -C C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards ls-files apps/game/public/assets
```

Último comando não lista mídia/profile gerado.

- [ ] **10. Consolidar STATE e commitar.**

Registre PB-02-03/04 como integradas com seus commits/branches efetivos, PB-02-05 `done`, provas
product e PB-02-06 elegível.

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards add tools/asset-packer tools/architecture packages/test-fixtures/assets/pb02/expected/test/catalog.json package.json apps/game/package.json apps/game/vite.config.ts .gitignore docs/assets/ASSET_PROFILES.md docs/playbooks/PB-02/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards commit -m "feat: enforce asset build profiles"
```

- [ ] **11. Integrar, reverificar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb02-05-profile-guards
corepack pnpm --dir C:\Kaezan\kaezan-huntbound assets:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound build
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb02-05-profile-guards
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb02-05-profile-guards
```

Se onda paralela foi integrada, confirme com `git merge-base --is-ancestor` que ambas branches são
ancestrais da `main`; então apague-as com `git branch -d`.

## Critérios de aceite

- [ ] Profile validation percorre catálogo, packs e mídias transitivamente.
- [ ] Build product controlado falha restrito e passa permitido.
- [ ] Test/profile staging é determinístico, seguro e ignorado.
- [ ] Scripts raiz incluem assets:check em check/verify sem exigir origem pessoal.
- [ ] Regra arquitetural possui provas negativas vivas e zero falso positivo na árvore atual.
- [ ] Integração serial/paralela e limpeza estão comprovadas.

## Condições de parada

Pare em conflito de branches, profile guard contornável, product restrito passando, regra com falso
positivo não resolvido, build vermelho ou necessidade de permitir path/mídia em consumer.

## Persistência e relatório final

Registre modo de integração, commits 03/04/05, proof negativa/positiva, scripts, gates, branches
apagadas e PB-02-06. Não integre provider no app.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol xhigh; fallback Claude Code/Opus 5 com desvio
registrado. Use game-studio:web-game-foundations, superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-02\tasks\PB-02-05-fechar-perfis-e-boundaries.md

Detecte se PB-02-03/04 foram seriais ou branches paralelas, integre somente conforme a card,
implemente profile tree/staging/Vite guard/boundaries por RED/GREEN, prove build product negativo e
positivo, rode gates, consolide STATE, commite, faça fast-forward, reverifique e limpe todas as
branches integradas. Não altere app src nem execute PB-02-06.
```
