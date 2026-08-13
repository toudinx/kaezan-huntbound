# PB-02-04 — Implementar provider, registry e adapters runtime

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — runtime browser reconstruível

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; Sol/Opus somente após gatilho registrado

**Rota:** `game-studio:web-game-foundations` + `superpowers:test-driven-development` +
`superpowers:verification-before-completion`.

**Paralelismo:** pode executar em paralelo com PB-02-03 após PB-02-02. O fluxo padrão é serial.

## Objetivo

Implementar registry puro, quatro adapters por índice, transport browser e provider transacional.
Carregar catálogo/pack/mídia, verificar hashes antes de instalar, resolver stable keys e revogar URLs
no unload sem importar Phaser ou Node.

## Resultado esperado

`@huntbound/assets` oferece um `AssetProvider` browser-safe. Falha parcial não contamina estado;
conflitos são bloqueantes; várias chaves ausentes aparecem juntas; load repetido é idempotente e
unload remove/revoga apenas o pack indicado.

## Dependências e leitura mínima

1. esta task, `README.md` e `STATE.md`;
2. spec e `docs/assets/MANIFEST_CONTRACT.md`;
3. contracts públicos de `@huntbound/assets`;
4. fixture source/selection PB-02 apenas para montar objetos de teste.

PB-02-02 deve estar integrada. Não depende do packer PB-02-03.

## Decisões congeladas

- O provider recebe `catalogUrl` e perfil; paths de pack/mídia vêm somente dos manifests.
- SHA-256 usa `globalThis.crypto.subtle` por dependency injetável, nunca `node:crypto`.
- Mídia verificada vira URL por `AssetMediaUrlStore`; default usa `Blob` +
  `URL.createObjectURL/revokeObjectURL`.
- Nenhuma entry entra no registry antes de todas as mídias do pack passarem.
- Fetches de mídia usam `Promise.allSettled` para agregar falhas.
- Stable key conflitante ou `(kind,id)` conflitante entre packs é bloqueante.
- Recarregar mesmo `packId` + mesmo `pack.sha256` é no-op; mesmo ID com hash diferente falha.
- Adapters resolvem apenas IDs de packs carregados e lançam `AssetProviderError` tipado em ausência.
- `ResolvedAsset` não expõe source path; expõe blob/media URL, hash e presentation metadata.

## Escopo permitido

```text
packages/assets/src/providers/**
packages/assets/src/adapters/ManifestLookTypeAssetAdapter.ts
packages/assets/src/adapters/ManifestClientIdAssetAdapter.ts
packages/assets/src/adapters/ManifestEffectIdAssetAdapter.ts
packages/assets/src/adapters/ManifestMissileIdAssetAdapter.ts
packages/assets/src/adapters/createManifestAssetAdapters.ts
packages/assets/src/index.ts
packages/assets/src/**/*.test.ts
docs/assets/ASSET_PROVIDER.md
docs/playbooks/PB-02/STATE.md
```

## Fora de escopo

- filesystem Node, packer, golden output ou source root;
- build/profile guard Vite e architecture scan;
- app, main.ts, DOM status, Playwright ou Phaser;
- cache persistente/service worker;
- retry/backoff, streaming ou eviction automática;
- alterar schemas sem condição de parada.

## Interfaces produzidas

```ts
export interface ResolvedAsset {
  readonly key: AssetKey;
  readonly category: AssetPackEntry['category'];
  readonly mediaUrl: string;
  readonly mediaSha256: string;
  readonly byteLength: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly columns: number;
  readonly atlasFrameCount: number;
  readonly animations: readonly AssetAnimationGroup[];
  readonly pivot: { readonly x: number; readonly y: number };
  readonly scale: number;
  readonly filtering: 'nearest' | 'linear';
}

export interface AssetProvider {
  readonly adapters: AssetIdAdapters;
  loadPack(packId: string): Promise<void>;
  loadPreloads(): Promise<readonly ResolvedAsset[]>;
  validateKeys(
    keys: readonly AssetKey[],
  ): AssetValidationResult<readonly AssetKey[]>;
  resolve(key: AssetKey): ResolvedAsset;
  unloadPack(packId: string): Promise<void>;
  unloadAll(): Promise<void>;
}

export interface AssetTransport {
  readJson(url: string): Promise<unknown>;
  readBytes(url: string): Promise<Uint8Array>;
}

export interface AssetMediaUrlStore {
  create(bytes: Uint8Array, mimeType: 'image/png'): string;
  revoke(url: string): void;
}

export async function createFetchAssetProvider(input: {
  readonly catalogUrl: string;
  readonly profile: AssetBuildProfile;
  readonly transport?: AssetTransport;
  readonly mediaUrlStore?: AssetMediaUrlStore;
  readonly digestSha256?: (bytes: Uint8Array) => Promise<string>;
}): Promise<AssetProvider>;
```

`AssetProviderError extends Error` possui `code`, `diagnostics` readonly e opcional `cause`. Não
coloque response body, bytes ou source root na mensagem.

### Registry puro

```ts
export class AssetPackRegistry {
  install(input: {
    readonly manifest: AssetPackManifest;
    readonly packSha256: string;
    readonly mediaUrlsBySha256: ReadonlyMap<string, string>;
  }): AssetValidationResult<InstalledAssetPack>;
  resolve(key: AssetKey): ResolvedAsset;
  validateKeys(keys: readonly AssetKey[]): AssetValidationResult<readonly AssetKey[]>;
  resolveSourceIdentity(identity: AssetSourceIdentity): AssetKey;
  uninstall(packId: string): InstalledAssetPack | undefined;
  listPackIds(): readonly string[];
}
```

Registry mantém cinco maps: key e um por `lookType|clientId|effectId|missileId`. Não mantenha map
numérico global.

## Fluxo de load

```text
catalog validado
  → localizar packId
  → fetch pack.json e pack.sha256
  → validar hash do pack.json + schema + perfil
  → fetch allSettled de mídias únicas
  → validar size/hash de todas
  → criar URLs para bytes já íntegros
  → registry.install atômico
  → commit ownership de URLs pelo pack
```

Se URL creation ou install falhar, revogue todas as URLs criadas nesta tentativa. `unloadPack`
primeiro remove do registry e depois revoga URLs do pack removido. `unloadAll` usa pack IDs ordenados.

## Execução RED/GREEN

- [ ] **1. Criar branch/worktree.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb02-04-asset-runtime -b codex/pb02-04-asset-runtime main
```

- [ ] **2. Escrever RED do registry.**

Monte manifest válido in-memory com as cinco keys. Cubra install/resolve, validateKeys com três
ausências ordenadas, conflitos de key e identity, idempotência por pack hash, uninstall seletivo e
estado anterior intacto após falha.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-04-asset-runtime --filter @huntbound/assets test -- src/providers/AssetPackRegistry.test.ts
```

Esperado: RED por classe ausente.

- [ ] **3. Implementar registry mínimo e errors.**

Construa todos os maps candidatos antes de trocar referências internas. Nunca faça mutação parcial
seguida de rollback map a map.

- [ ] **4. Escrever RED dos quatro adapters.**

Prove lookType 131/26, clientId 3031, effectId 12 e missileId 36. Inclua simultaneamente lookType 12
e effectId 12 em fixture controlada e prove resolução separada. Ausência usa
`ASSET_KEY_UNAVAILABLE`.

- [ ] **5. Implementar quatro classes e aggregator.**

Cada classe delega uma `AssetSourceIdentity` de kind fixo ao registry. Não aceite `number` genérico
sem factory/schema do ID correspondente.

- [ ] **6. Escrever RED do provider transacional.**

Use fake transport e fake URL store. Cubra:

- catálogo/pack válido e cinco mídias;
- JSON/hash/schema inválido;
- duas mídias ausentes agregadas;
- size/hash incorreto;
- URL create falha no terceiro item e revoga os dois anteriores;
- registry conflict revoga todas as URLs da tentativa;
- load idempotente não refaz fetch/create;
- unload revoga somente URLs do pack;
- loadPreloads carrega packs e valida todas as required keys.

- [ ] **7. Implementar transport, digest e provider.**

`BrowserAssetTransport` verifica `response.ok`; lê JSON como text + parse para distinguir JSON
inválido. `digestSha256` converte bytes para hex lowercase. Resolva URLs com `new URL(relative,
base)`, depois prove que origin/path continuam abaixo do catálogo/pack esperado e que a entrada era
relativa validada pelo schema.

- [ ] **8. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-04-asset-runtime --filter @huntbound/assets test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-04-asset-runtime --filter @huntbound/assets typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-04-asset-runtime architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-04-asset-runtime exec biome check packages/assets
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-04-asset-runtime format:check
git -C C:\Kaezan\kaezan-huntbound-pb02-04-asset-runtime diff --check
rg -n "from ['\"](?:node:|phaser)|require\(" C:\Kaezan\kaezan-huntbound-pb02-04-asset-runtime\packages\assets\src
```

O scan final não produz saída.

- [ ] **9. Documentar provider.**

`docs/assets/ASSET_PROVIDER.md` inclui lifecycle, transação, ownership de URLs, interfaces, erros e
exemplo `adapter → AssetKey → resolve`, sem path de mídia literal.

- [ ] **10. Concluir no modo serial padrão.**

Atualize `STATE.md`, marque PB-02-04 `done`, indique PB-02-05 e faça:

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb02-04-asset-runtime add packages/assets docs/assets/ASSET_PROVIDER.md docs/playbooks/PB-02/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb02-04-asset-runtime commit -m "feat: load validated asset packs"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb02-04-asset-runtime
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/assets test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/assets typecheck
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb02-04-asset-runtime
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb02-04-asset-runtime
```

- [ ] **11. Alternativa somente em onda paralela ativada.**

Não edite `STATE.md` no commit funcional. Commit packages/docs provider, remova a worktree limpa e
preserve `codex/pb02-04-asset-runtime`; PB-02-05 integra e apaga a branch após gates.

## Critérios de aceite

- [ ] Registry instala atomicamente e mantém cinco índices separados.
- [ ] Quatro adapters resolvem o fixture e não misturam ID 12 entre namespaces.
- [ ] Provider verifica catálogo, pack, size e hashes antes de instalar.
- [ ] Falhas agregam mídia e preservam registry/URLs anteriores.
- [ ] Load é idempotente; unload/unloadAll revogam ownership correto.
- [ ] `@huntbound/assets` não importa Node nem Phaser.
- [ ] Docs, testes, handoff, commit e limpeza estão completos.

## Condições de parada

Pare se Web Crypto/Blob não atender sem Node, se precisar mudar manifest schema, se URL puder escapar
do base validado, se atomicidade não puder ser provada ou se Phaser entrar na fronteira.

## Persistência e relatório final

Registre testes, conflicts/failure proofs, URL counts, modelo/effort, commit, modo serial/paralelo,
limpeza e próxima task. Não integre app ou build guard.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh. Use
game-studio:web-game-foundations, superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-02\tasks\PB-02-04-implementar-provider-e-registry.md

Use fluxo serial salvo ativação explícita da onda PB-02-03/04. Implemente registry, adapters e
provider por RED/GREEN, prove transação e revogação, rode gates, documente e conclua integração/
limpeza conforme o modo. Não implemente filesystem packer, perfis, app ou Phaser. Não inicie a
próxima task.
```
