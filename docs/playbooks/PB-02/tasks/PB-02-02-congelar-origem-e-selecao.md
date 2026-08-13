# PB-02-02 — Congelar origem, seleção e fixture sintética

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — verificação local reconstruível

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; Sol/Opus somente após gatilho registrado

**Rota:** `game-studio:web-game-foundations` + `superpowers:test-driven-development` +
`superpowers:verification-before-completion`.

**Paralelismo:** não. PB-02-03/04 só ficam elegíveis após esta integração.

## Objetivo

Congelar o selection manifest de cinco entradas, o source lock do export real e uma origem sintética
equivalente. Implementar somente leitura/validação do formato Arena Fable e criação/verificação de
source lock; não materializar pack Huntbound.

## Resultado esperado

O repositório possui inputs versionados, hashes reais comprovados e cinco PNGs sintéticos mínimos.
Um verificador Node agrega divergências sem copiar arquivos reais nem persistir o source root.

## Dependências e leitura mínima

1. esta task, `README.md` e `STATE.md`;
2. spec PB-02;
3. `docs/assets/MANIFEST_CONTRACT.md`;
4. schemas/validators públicos de `@huntbound/assets`;
5. `packages/content/catalog/operations/0001-pb01-contract-coverage.json` para conferir Rotworm e
   gold coin;
6. `tools/content-catalog/source/sourceLock.ts` apenas como referência de separação I/O/schema.

PB-02-01 deve estar integrada na `main`.

## Decisões congeladas

- Selection ID e pack ID: `fixture:pb-02-contract-coverage` e
  `asset-pack:fixture:pb-02-contract-coverage`.
- Versões iniciais: schema `1`, content `pb-02-contract-coverage@1`.
- Grupo real: `arena-fable-tibia`, source `arena-fable-tibia-export`, snapshot commit
  `1b14dee3b22f6970333bef76031b473c7bcf917e`, licença `cipsoft-personal`, perfil `personal`.
- Grupo sintético: `huntbound-test`, source `huntbound-synthetic-fixture`, snapshot
  `pb02-synthetic-v1`, licença `huntbound-test`, perfis `test` e `product`.
- A origem sintética usa as mesmas categories/IDs/keys, mas não copia pixels reais.
- Cinco PNGs transparentes 1×1 podem compartilhar bytes; paths e entries continuam distintos.
- O source root real chega por argumento/env e nunca entra em JSON, docs geradas ou diagnostics
  versionados.

## Escopo permitido

```text
tools/asset-packer/tsconfig.json
tools/asset-packer/vitest.config.ts
tools/asset-packer/source/**
tools/asset-packer/testing/createPb02SyntheticSource.ts
packages/assets/catalog/selections/pb-02-contract-coverage.json
packages/assets/catalog/sources/arena-fable-tibia-1b14dee.json
packages/test-fixtures/assets/pb02/source/**
packages/test-fixtures/assets/pb02/selection.json
packages/test-fixtures/assets/pb02/source-lock.json
packages/test-fixtures/src/index.ts
docs/assets/PB-02-SELECTION.md
docs/playbooks/PB-02/STATE.md
```

## Fora de escopo

- copiar PNG real para o workspace;
- `pack.json`, `pack.sha256`, media content-addressed ou golden pack;
- staging/promoção, profile catalog, provider ou app;
- alterar selection/IDs por descoberta automática;
- atualizar hashes reais para aceitar origem divergente;
- decodificar formatos do cliente.

## Interfaces produzidas

```ts
export interface ArenaFableSourceEntry {
  readonly file: string;
  readonly cellW: number;
  readonly cellH: number;
  readonly cols: number;
  readonly groups: readonly ArenaFableAnimationGroup[];
}

export interface SelectedSourceEntry {
  readonly selection: AssetSelectionEntry;
  readonly sourcePath: string;
  readonly source: ArenaFableSourceEntry;
}

export function parseArenaFableSourceManifest(
  input: unknown,
): AssetValidationResult<ArenaFableSourceManifest>;

export function resolveSelectedSourceEntries(
  selection: AssetSelectionManifest,
  source: ArenaFableSourceManifest,
): AssetValidationResult<readonly SelectedSourceEntry[]>;

export async function createAssetSourceLock(input: {
  readonly sourceRoot: string;
  readonly selection: AssetSelectionManifest;
  readonly source: string;
  readonly sourceSnapshot: string;
}): Promise<AssetValidationResult<AssetSourceLock>>;

export async function verifyAssetSourceLock(input: {
  readonly sourceRoot: string;
  readonly lock: AssetSourceLock;
}): Promise<AssetValidationResult<AssetSourceLock>>;
```

`parseArenaFableSourceManifest` aceita o envelope histórico com maps `outfits`, `objects`, `effects`
e `missiles`; ignora somente top-level `semantic` e `objectNames` depois de validar que são objetos.
Dentro de uma entry, campos desconhecidos falham. `groups` pode vir como objeto único ou array e é
normalizado para array readonly. Ranges históricos `[min,max]` permanecem ranges.

## Selection obrigatório

O JSON versionado declara exatamente:

```json
{
  "schemaVersion": "1",
  "selectionId": "fixture:pb-02-contract-coverage",
  "packId": "asset-pack:fixture:pb-02-contract-coverage",
  "contentVersion": "pb-02-contract-coverage@1",
  "buildProfiles": ["personal"],
  "groups": [{
    "groupId": "arena-fable-tibia",
    "source": "arena-fable-tibia-export",
    "sourceSnapshot": "1b14dee3b22f6970333bef76031b473c7bcf917e",
    "licenseClass": "cipsoft-personal",
    "buildProfiles": ["personal"]
  }],
  "entries": [
    {"key":"outfit:tibia:knight","category":"outfit","sourceIdentity":{"kind":"lookType","id":131},"sourceGroupId":"arena-fable-tibia","consumer":"PB-02 browser contract fixture","rationale":"Covers a player outfit with layers and patterns.","presentation":{"pivot":{"x":0.5,"y":1},"scale":1,"filtering":"nearest"}},
    {"key":"creature:tibia:rotworm","category":"creature","sourceIdentity":{"kind":"lookType","id":26},"sourceGroupId":"arena-fable-tibia","consumer":"PB-02 browser contract fixture","rationale":"Binds the PB-01 Rotworm appearance to a stable asset key.","presentation":{"pivot":{"x":0.5,"y":1},"scale":1,"filtering":"nearest"}},
    {"key":"item:tibia:gold-coin","category":"object","sourceIdentity":{"kind":"clientId","id":3031},"sourceGroupId":"arena-fable-tibia","consumer":"PB-02 browser contract fixture","rationale":"Binds a PB-01 loot item to an object appearance.","presentation":{"pivot":{"x":0.5,"y":0.5},"scale":1,"filtering":"nearest"}},
    {"key":"effect:tibia:energy-hit","category":"effect","sourceIdentity":{"kind":"effectId","id":12},"sourceGroupId":"arena-fable-tibia","consumer":"PB-02 browser contract fixture","rationale":"Covers an animated combat effect.","presentation":{"pivot":{"x":0.5,"y":0.5},"scale":1,"filtering":"nearest"}},
    {"key":"missile:tibia:energy-ball","category":"missile","sourceIdentity":{"kind":"missileId","id":36},"sourceGroupId":"arena-fable-tibia","consumer":"PB-02 browser contract fixture","rationale":"Covers the Orc Shaman projectile represented in PB-01.","presentation":{"pivot":{"x":0.5,"y":0.5},"scale":1,"filtering":"nearest"}}
  ]
}
```

O fixture sintético deriva esse documento substituindo apenas source/sourceSnapshot do grupo,
license class e os profiles tanto do manifesto quanto do grupo; keys, categories, IDs e presentation
não mudam. O resultado derivado é versionado em
`packages/test-fixtures/assets/pb02/selection.json` com profiles `test` e `product` e license class
`huntbound-test`.

## Source lock real obrigatório

O lock versionado contém os valores do README, incluindo:

```text
manifest.json      808964  edf07a6edfc7c68128d8d0c712fbf0f2f66839e17399da62d9531598b3a05a94
outfits/131.png    196361  7b131fd5e524a72f0196e2c1b44bad6b8c929d4ca63b334fbe102cc1fb038cd6
outfits/26.png      23500  50693364cc059e397bad267c8f443f248d387ef38f0417e87351f1f253ed3f4b
objects/3031.png     1301  cc44391cf4b0a8ec1573737d954d95e6352b5c942559ad3b91d87c59fc33faf1
effects/12.png       3967  6840bf0e4fb9dfbcf7869705d81e8b61a2f12f2b08fb3427b0d43a4521c35bdb
missiles/36.png     12974  0a2438152e493b8dfcfdf8131416aa609dd5161bbbf9d0f0a50efc93cc237a96
```

## Execução RED/GREEN

- [ ] **1. Criar branch/worktree.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb02-02-source-selection -b codex/pb02-02-source-selection main
```

- [ ] **2. Escrever testes RED do parser/selection resolution.**

Cubra entry única/array de groups, as cinco resoluções, IDs ausentes agregados, category map correto,
field extra, path inseguro e ID em map errado.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-02-source-selection exec vitest run --config tools/asset-packer/vitest.config.ts tools/asset-packer/source/sourceManifest.test.ts
```

Esperado: RED por módulos ausentes.

- [ ] **3. Implementar parser puro e resolver seleção.**

Mapeamento fixo: lookType lê `outfits`; clientId lê `objects`; effectId lê `effects`; missileId lê
`missiles`. Nunca procure o mesmo número em outra category como fallback.

- [ ] **4. Escrever RED de source lock.**

Em `node:os.tmpdir()`, crie origem mínima, prove lock determinístico e verificação agregada de dois
arquivos adulterados. Diagnostics versionados usam paths relativos; não incluem temp root.

- [ ] **5. Implementar create/verify lock com SHA-256 Node.**

Leia bytes com `node:fs/promises` e use `createHash('sha256')`. Ordene arquivos por key. Não siga
symlink para fora do source root; compare `realpath` da mídia com o realpath root antes de ler.

- [ ] **6. Criar a origem sintética por gerador determinístico.**

`createPb02SyntheticSource.ts` escreve o manifest histórico mínimo e cinco arquivos com estes bytes
base64 fixos:

```ts
const transparentPixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
```

O arquivo possui 68 bytes e SHA-256
`431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460`. Os cinco paths são os mesmos
do lock real. O manifest declara cell 1×1, uma coluna e um group de um frame por entry. O comando
`--check` compara bytes existentes e falha sem reescrever.

- [ ] **7. Gerar fixture e lock sintético; versionar selection e lock real.**

```powershell
node C:\Kaezan\kaezan-huntbound-pb02-02-source-selection\tools\asset-packer\testing\createPb02SyntheticSource.ts
node C:\Kaezan\kaezan-huntbound-pb02-02-source-selection\tools\asset-packer\testing\createPb02SyntheticSource.ts --check
$env:HUNTBOUND_PERSONAL_ASSET_SOURCE = (Resolve-Path C:\Kaezan\kaezan-huntbound-pb02-02-source-selection\..\kaezan-arena-fable\frontend\public\assets\tibia).Path
node C:\Kaezan\kaezan-huntbound-pb02-02-source-selection\tools\asset-packer\source\verifySourceLock.ts --source-root $env:HUNTBOUND_PERSONAL_ASSET_SOURCE --lock C:\Kaezan\kaezan-huntbound-pb02-02-source-selection\packages\assets\catalog\sources\arena-fable-tibia-1b14dee.json
```

O último comando precisa reportar 5/5 mídias e manifesto íntegros. Não copie esses arquivos.

- [ ] **8. Conferir vínculos PB-01.**

Teste/documente que Rotworm possui `lookType: 26`, gold coin `sourceId: 3031` e Orc Shaman usa
`projectile: "energyball"`. Se divergirem, pare; não altere PB-01 nesta task.

- [ ] **9. Documentar seleção e executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-02-source-selection exec vitest run --config tools/asset-packer/vitest.config.ts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-02-source-selection exec tsc --project tools/asset-packer/tsconfig.json --noEmit
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-02-source-selection --filter @huntbound/test-fixtures typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-02-source-selection architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-02-source-selection exec biome check tools/asset-packer packages/assets/catalog packages/test-fixtures/src
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-02-source-selection format:check
git -C C:\Kaezan\kaezan-huntbound-pb02-02-source-selection diff --check
git -C C:\Kaezan\kaezan-huntbound-pb02-02-source-selection ls-files apps/game/public/assets/personal
git -C C:\Kaezan\kaezan-huntbound-pb02-02-source-selection ls-files -- ':(glob)packages/test-fixtures/assets/pb02/source/**/*.png'
```

O primeiro scan não produz saída; o segundo lista exatamente cinco PNGs. Todos têm 68 bytes e o hash
sintético congelado; nenhum coincide com os hashes reais do README.

- [ ] **10. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb02-02-source-selection add tools/asset-packer packages/assets/catalog packages/test-fixtures docs/assets/PB-02-SELECTION.md docs/playbooks/PB-02/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb02-02-source-selection commit -m "feat: freeze PB-02 asset selection"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb02-02-source-selection
corepack pnpm --dir C:\Kaezan\kaezan-huntbound exec vitest run --config tools/asset-packer/vitest.config.ts
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb02-02-source-selection
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb02-02-source-selection
```

## Critérios de aceite

- [ ] Selection possui exatamente cinco entries e IDs congelados.
- [ ] Parser não mistura maps/categories nem tolera fields desconhecidos.
- [ ] Lock real confere com os seis hashes/tamanhos registrados.
- [ ] Fixture contém cinco PNGs sintéticos, não derivados da origem real.
- [ ] Lock sintético é regenerável e `--check` não altera a árvore.
- [ ] Verificador agrega divergências e não persiste source root.
- [ ] Zero PNG real/pessoal entra no Git.
- [ ] Handoff, commit, integração e limpeza estão completos.

## Condições de parada

Pare se a origem real divergir, algum ID não existir, o vínculo PB-01 falhar, um path sair do source
root, for necessário copiar pixels reais ou mudar schema/selection da task anterior.

## Persistência e relatório final

Registre source snapshot, hash do manifest, 5/5 mídias, hash do fixture, testes, commit/limpeza e
PB-02-03 como próxima task serial. Informe que PB-02-03/04 ficam paralelizáveis, mas não os inicie.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh. Use
game-studio:web-game-foundations, superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-02\tasks\PB-02-02-congelar-origem-e-selecao.md

Crie branch/worktree, implemente parser e source lock por RED/GREEN, gere somente a fixture
sintética versionada, verifique a origem real sem copiá-la, documente, rode gates, atualize STATE,
commite, integre por fast-forward e limpe. Não materialize pack, provider, perfis ou app. Divergência
da origem bloqueia; não atualize hashes para fazê-la passar. Não inicie PB-02-03/04.
```
