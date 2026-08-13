# PB-02-01 — Definir contratos de assets

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — contratos aprovados na spec PB-02

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; GPT-5.6 Sol `xhigh` ou Claude Code/Opus 5 somente após
gatilho objetivo registrado

**Rota:** `game-studio:web-game-foundations` + `superpowers:test-driven-development` +
`superpowers:verification-before-completion`.

**Paralelismo:** não. Primeira task serial.

## Objetivo

Criar em `@huntbound/assets` a linguagem estável de autoria e runtime: `AssetKey`, IDs tipados,
schemas estritos de selection/source lock/pack/catalog, diagnósticos e interfaces separadas dos
quatro adapters. Não ler arquivos nem implementar packer/provider.

## Resultado esperado

O pacote exporta contratos browser-safe cobertos por testes. Dados inválidos retornam diagnósticos
estruturados; fields extras, paths inseguros, IDs misturados e referências cruzadas inválidas são
rejeitados antes de qualquer I/O.

## Dependências

- PB-01 `done` e `main` limpa.
- Spec PB-02 aprovada no commit `0f2e109`.
- Node 24.14.0 e pnpm 11.21.0 via Corepack.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-02/STATE.md`;
3. `docs/playbooks/PB-02/README.md`;
4. `docs/superpowers/specs/2026-08-13-pb-02-asset-packs-design.md`;
5. `docs/architecture/PACKAGE_BOUNDARIES.md`;
6. `packages/assets/package.json`, `tsconfig.json` e `src/index.ts`;
7. `packages/contracts/src/content/diagnostics.ts` apenas como referência de estilo.

## Decisões congeladas

- `AssetKey` aceita somente `outfit|creature|item|effect|missile`, source namespace e slug
  lowercase kebab-case.
- IDs são inteiros positivos branded: `LookTypeId`, `ClientId`, `EffectId`, `MissileId`.
- `AssetBuildProfile = 'personal' | 'product' | 'test'`.
- `AssetLicenseClass = 'cipsoft-personal' | 'huntbound-owned' | 'huntbound-test'`.
- Hashes são SHA-256 lowercase de 64 hex chars.
- Paths são POSIX relativos sem `..`, `\\`, leading slash, scheme ou drive letter.
- `pivot.x/y` são finitos; `scale` é positiva; filtering é `nearest|linear`.
- Animação preserva `kind`, patterns, layers, `startFrame`, `frameCount` e ranges de duração
  `[minMs,maxMs]`; não inventar timing.
- `zod@4.4.3` entra como dependência direta exata de `@huntbound/assets`.
- Esta task não usa filesystem, fetch, Web Crypto, Blob, Phaser ou Node.

## Escopo permitido

```text
packages/assets/package.json
packages/assets/src/index.ts
packages/assets/src/manifest/**
packages/assets/src/adapters/LookTypeAssetAdapter.ts
packages/assets/src/adapters/ClientIdAssetAdapter.ts
packages/assets/src/adapters/EffectIdAssetAdapter.ts
packages/assets/src/adapters/MissileIdAssetAdapter.ts
packages/assets/src/adapters/AssetIdAdapters.ts
pnpm-lock.yaml
docs/assets/MANIFEST_CONTRACT.md
docs/playbooks/PB-02/STATE.md
```

## Fora de escopo

- manifest ou PNG real/sintético;
- source lock materializado e IDs do fixture;
- filesystem, CLI, packer, staging ou canonical JSON;
- registry, fetch, hashing, provider ou URLs de mídia;
- build profiles em Vite, app e browser QA;
- qualquer alteração em PB-01, simulation ou Phaser.

## Interfaces produzidas

### Identidade e adapters

```ts
export type AssetKey = string & { readonly __brand: 'AssetKey' };
export type LookTypeId = number & { readonly __brand: 'LookTypeId' };
export type ClientId = number & { readonly __brand: 'ClientId' };
export type EffectId = number & { readonly __brand: 'EffectId' };
export type MissileId = number & { readonly __brand: 'MissileId' };

export interface LookTypeAssetAdapter {
  resolveLookType(id: LookTypeId): AssetKey;
}
export interface ClientIdAssetAdapter {
  resolveClientId(id: ClientId): AssetKey;
}
export interface EffectIdAssetAdapter {
  resolveEffectId(id: EffectId): AssetKey;
}
export interface MissileIdAssetAdapter {
  resolveMissileId(id: MissileId): AssetKey;
}
export interface AssetIdAdapters {
  readonly lookTypes: LookTypeAssetAdapter;
  readonly clientIds: ClientIdAssetAdapter;
  readonly effects: EffectIdAssetAdapter;
  readonly missiles: MissileIdAssetAdapter;
}
```

Cada ID possui schema/factory que rejeita zero, negativo, decimal, `NaN` e infinito. Não criar uma
função genérica `resolveNumericId`.

### Tipos de manifesto

Exports obrigatórios, todos derivados de schemas Zod `strict()`:

```ts
AssetKeySchema
LookTypeIdSchema
ClientIdSchema
EffectIdSchema
MissileIdSchema
AssetSelectionManifestSchema
AssetSourceLockSchema
AssetPackManifestSchema
AssetPackCatalogSchema
```

Estruturas discriminadas:

```ts
export type AssetSourceIdentity =
  | { readonly kind: 'lookType'; readonly id: LookTypeId }
  | { readonly kind: 'clientId'; readonly id: ClientId }
  | { readonly kind: 'effectId'; readonly id: EffectId }
  | { readonly kind: 'missileId'; readonly id: MissileId };

export interface AssetPresentation {
  readonly pivot: { readonly x: number; readonly y: number };
  readonly scale: number;
  readonly filtering: 'nearest' | 'linear';
}

export interface AssetSelectionEntry {
  readonly key: AssetKey;
  readonly category: 'outfit' | 'creature' | 'object' | 'effect' | 'missile';
  readonly sourceIdentity: AssetSourceIdentity;
  readonly sourceGroupId: string;
  readonly consumer: string;
  readonly rationale: string;
  readonly presentation: AssetPresentation;
}

export interface AssetMediaReference {
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
  readonly mimeType: 'image/png';
}

export interface AssetAnimationGroup {
  readonly kind: string;
  readonly patternX: number;
  readonly patternY: number;
  readonly patternZ: number;
  readonly layers: number;
  readonly startFrame: number;
  readonly frameCount: number;
  readonly phaseDurationsMs: readonly (readonly [number, number])[];
}

export interface AssetPackEntry {
  readonly key: AssetKey;
  readonly category: AssetSelectionEntry['category'];
  readonly sourceIdentity: AssetSourceIdentity;
  readonly sourceGroupId: string;
  readonly media: AssetMediaReference;
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly columns: number;
  readonly atlasFrameCount: number;
  readonly animations: readonly AssetAnimationGroup[];
  readonly pivot: { readonly x: number; readonly y: number };
  readonly scale: number;
  readonly filtering: 'nearest' | 'linear';
}
```

`AssetSelectionManifest` contém `schemaVersion`, `selectionId`, `packId`, `contentVersion`,
`buildProfiles`, grupos de proveniência e entries. `AssetSourceLock` contém `schemaVersion`,
`source`, `sourceSnapshot`, hash/tamanho de `manifest.json` e lista de arquivos selecionados com
categoria/identity/path/hash/tamanho. `AssetPackManifest` contém versões, grupos e entries.
`AssetPackCatalog` contém `schemaVersion`, `profile`, packs `{packId,manifestPath}` e preloads
`{packId,requiredKeys}`.

Refinements obrigatórios:

- keys únicas;
- `(kind,id)` único dentro do seu namespace;
- `sourceGroupId` existente;
- categoria compatível: lookType somente outfit/creature, clientId somente object, effectId somente
  effect e missileId somente missile;
- `presentation` com pivot finito, scale positiva e filtering conhecido;
- animação com inteiros não negativos/positivos, `minMs <= maxMs`, uma duração por fase de origem,
  `frameCount` igual ao produto de patterns, layers e fases (uma fase implícita quando a lista está
  vazia) e `startFrame + frameCount <= atlasFrameCount`;
- pack IDs únicos no catálogo;
- preload referencia pack existente e required keys únicas;
- `product` nunca aparece em grupo `cipsoft-personal`.

### Diagnósticos

```ts
export type AssetDiagnosticCode =
  | 'ASSET_SCHEMA_INVALID'
  | 'ASSET_PATH_UNSAFE'
  | 'ASSET_KEY_DUPLICATE'
  | 'ASSET_ID_DUPLICATE'
  | 'ASSET_CATEGORY_MISMATCH'
  | 'ASSET_REFERENCE_MISSING'
  | 'ASSET_MEDIA_MISSING'
  | 'ASSET_MEDIA_SIZE_MISMATCH'
  | 'ASSET_MEDIA_HASH_MISMATCH'
  | 'ASSET_ANIMATION_INVALID'
  | 'ASSET_PROFILE_FORBIDDEN'
  | 'ASSET_LICENSE_FORBIDDEN'
  | 'ASSET_PACK_CONFLICT'
  | 'ASSET_PACK_NOT_LOADED'
  | 'ASSET_KEY_UNAVAILABLE';

export interface AssetDiagnostic {
  readonly code: AssetDiagnosticCode;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly path: readonly (string | number)[];
  readonly key?: AssetKey;
  readonly packId?: string;
}

export type AssetValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly diagnostics: readonly AssetDiagnostic[] };
```

Exports públicos:

```ts
validateAssetSelectionManifest(input: unknown): AssetValidationResult<AssetSelectionManifest>;
validateAssetSourceLock(input: unknown): AssetValidationResult<AssetSourceLock>;
validateAssetPackManifest(input: unknown): AssetValidationResult<AssetPackManifest>;
validateAssetPackCatalog(input: unknown): AssetValidationResult<AssetPackCatalog>;
```

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb02-01-asset-contracts main
git worktree add C:\Kaezan\kaezan-huntbound-pb02-01-asset-contracts codex/pb02-01-asset-contracts
```

- [ ] **2. Adicionar dependência exata.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-01-asset-contracts --filter @huntbound/assets add zod@4.4.3
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-01-asset-contracts --filter @huntbound/assets add -D vitest@4.1.10
```

- [ ] **3. Escrever testes RED de keys e IDs.**

Cubra as cinco keys literais do README, rejeite kind extra, maiúscula, underscore, path, slug vazio
e prove que o número 12 pode existir simultaneamente em `LookTypeId` e `EffectId` sem compartilhar
tipo/índice.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-01-asset-contracts --filter @huntbound/assets test -- src/manifest/assetKey.test.ts
```

Esperado: RED por módulos/exports ausentes.

- [ ] **4. Implementar identidade mínima e obter GREEN.**

Use brands somente após parse bem-sucedido. Não use cast público que aceite number/string cru.

- [ ] **5. Escrever testes RED dos quatro manifests.**

Inclua um documento mínimo válido de cada schema e mutações controladas para fields extras, grupo
ausente, key/ID duplicado, categoria trocada, path `../x.png`, `C:\\x.png`, `/x.png`, URL, SHA em
uppercase, duração invertida e preload para pack desconhecido.

- [ ] **6. Implementar schemas/refinements e conversão de Zod diagnostics.**

Não use `passthrough()`, coerção silenciosa, `z.any()` ou unknown persistido. Ordene diagnostics por
path e code para resultado determinístico.

- [ ] **7. Criar interfaces dos adapters em cinco arquivos focados.**

Cada interface nomeia somente seu método; `AssetIdAdapters.ts` apenas agrega os quatro contratos.
Não implementar mapas ou classes ainda.

- [ ] **8. Documentar o contrato.**

`docs/assets/MANIFEST_CONTRACT.md` registra gramática de keys, perfis/licenças, path/hash, as cinco
keys fixture, compatibilidade de categoria e exemplos de selection/pack/catalog sem path absoluto.

- [ ] **9. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-01-asset-contracts --filter @huntbound/assets test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-01-asset-contracts --filter @huntbound/assets typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-01-asset-contracts architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-01-asset-contracts exec biome check packages/assets
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-01-asset-contracts format:check
git -C C:\Kaezan\kaezan-huntbound-pb02-01-asset-contracts diff --check
```

- [ ] **10. Atualizar handoff e commitar.**

Marque PB-02-01 `done`, registre testes e indique PB-02-02.

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb02-01-asset-contracts add packages/assets pnpm-lock.yaml docs/assets/MANIFEST_CONTRACT.md docs/playbooks/PB-02/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb02-01-asset-contracts commit -m "feat: define stable asset contracts"
```

- [ ] **11. Integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb02-01-asset-contracts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/assets test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/assets typecheck
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb02-01-asset-contracts
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb02-01-asset-contracts
```

## Critérios de aceite

- [ ] Todos os tipos, schemas, validators e interfaces obrigatórios são exports públicos.
- [ ] Schemas são strict e cross-references/refinements possuem testes.
- [ ] Paths e hashes obedecem o contrato congelado.
- [ ] Os quatro espaços de ID não compartilham tipo ou método genérico.
- [ ] `product` + `cipsoft-personal` é combinação inválida no schema de grupo.
- [ ] Contratos não importam Node, DOM, fetch, crypto, Blob ou Phaser.
- [ ] Docs, lockfile, handoff, commit, integração e limpeza estão completos.

## Condições de parada

Pare se for necessário mudar stable keys/IDs da spec, aceitar path inseguro, misturar namespaces,
adicionar biblioteca além de Zod/Vitest ou decidir comportamento de I/O/runtime não coberto.

## Persistência e relatório final

Registre em `STATE.md` exports efetivos, contagem de testes, dependências, comandos/exit codes,
modelo/effort, commit integrado, limpeza e PB-02-02 como próxima task. Não crie fixtures ou packer.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna e effort xhigh.
Use obrigatoriamente game-studio:web-game-foundations, superpowers:test-driven-development e
superpowers:verification-before-completion. Escale somente por gatilho objetivo registrado no STATE.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-02\tasks\PB-02-01-definir-contratos-de-assets.md

Crie a branch/worktree indicada, comece por RED, implemente apenas keys, schemas, diagnósticos e
interfaces, execute todos os gates, atualize STATE.md, commite, integre por fast-forward na main,
reverifique e remova worktree/branch. Não leia a origem, não crie fixtures, packer, provider ou app.
Se surgir decisão não coberta, pare e registre o bloqueio. Não inicie PB-02-02.
```
