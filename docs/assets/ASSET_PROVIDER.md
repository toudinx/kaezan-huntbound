# Huntbound asset provider

`@huntbound/assets` fornece o runtime browser-safe que transforma um catálogo de perfil em
`ResolvedAsset`. O consumidor conhece apenas stable keys, metadata de apresentação e uma URL de
mídia criada pelo provider. O pacote não importa Phaser, Node, filesystem ou formatos de extração.

## Bootstrap

O catálogo é a única entrada de bootstrap fora dos manifests. A composition root cria o provider com
a URL do catálogo e o perfil esperado:

```ts
const provider = await createFetchAssetProvider({
  catalogUrl: '/assets/test/catalog.json',
  profile: 'test',
});
```

O catálogo é validado antes de o provider ser devolvido. O perfil declarado no documento precisa ser
igual ao perfil solicitado. Cada pack é validado novamente quando carregado, incluindo schema,
permissão de perfil, licença, hash do manifesto, existência, tamanho e SHA-256 de cada mídia.

O runtime usa `BrowserAssetTransport`, Web Crypto SHA-256 e `BrowserAssetMediaUrlStore` por padrão.
Tests e hosts alternativos podem injetar `AssetTransport`, `digestSha256` e `AssetMediaUrlStore` sem
alterar o registry.

## Lifecycle e transação

`loadPack(packId)` executa estas fases:

1. localiza o pack no catálogo e resolve o manifest path relativo ao catálogo;
2. lê e valida `pack.json` e `pack.sha256`;
3. resolve somente URLs relativas abaixo do diretório do pack;
4. baixa mídias únicas com `Promise.allSettled` e agrega ausências, tamanhos e hashes incorretos;
5. cria URLs em staging para bytes já íntegros;
6. instala o pack no registry em uma única troca de índices;
7. transfere a ownership das URLs ao pack instalado.

Nenhuma entry fica visível antes de todas as mídias passarem. Se download, digest, criação de URL
ou instalação falhar, as URLs criadas nessa tentativa são revogadas e o estado anterior permanece.
Carregar novamente um pack já instalado com o mesmo estado é no-op; `AssetPackRegistry.install`
também rejeita o mesmo `packId` quando o hash informado diverge.

`unloadPack(packId)` primeiro remove o pack do registry e depois revoga somente as URLs pertencentes
a ele. `unloadAll()` processa os IDs em ordem determinística. Descarregar um pack não remove assets
dos demais packs.

## Registry e adapters

O `AssetPackRegistry` mantém um índice de stable keys e quatro índices separados por namespace:
`lookType`, `clientId`, `effectId` e `missileId`. Assim, o mesmo número em namespaces diferentes
continua independente. Os adapters não retornam URL nem textura:

```ts
const key = provider.adapters.effects.resolveEffectId(createEffectId(12));
const effect = provider.resolve(key);
```

Ausência de stable key ou de identidade numérica lança `AssetProviderError` com o código
`ASSET_KEY_UNAVAILABLE`. `validateKeys` retorna todas as chaves ausentes em uma resposta única e
ordenada pela entrada recebida.

## Contratos principais

```ts
export interface AssetTransport {
  readJson(url: string): Promise<unknown>;
  readBytes(url: string): Promise<Uint8Array>;
}

export interface AssetMediaUrlStore {
  create(bytes: Uint8Array, mimeType: 'image/png'): string;
  revoke(url: string): void;
}

export interface AssetProvider {
  readonly adapters: AssetIdAdapters;
  loadPack(packId: string): Promise<void>;
  loadPreloads(): Promise<readonly ResolvedAsset[]>;
  validateKeys(keys: readonly AssetKey[]): AssetValidationResult<readonly AssetKey[]>;
  resolve(key: AssetKey): ResolvedAsset;
  unloadPack(packId: string): Promise<void>;
  unloadAll(): Promise<void>;
}
```

`ResolvedAsset` expõe `mediaUrl`, hash, byte length, atlas, animações, pivô, escala e filtering.
Não expõe path de origem nem dados do source root. O objeto é um descritor de apresentação; textura,
animação e objetos Phaser são responsabilidade do renderer.

## Erros e fronteiras

`AssetProviderError` possui `code`, `diagnostics` e, quando uma API browser subjacente fornece a
causa, `cause`. As mensagens são genéricas e não incluem response body, bytes ou raiz de filesystem.
Os códigos importantes são:

- `ASSET_SCHEMA_INVALID`, `ASSET_CATALOG_PROFILE_MISMATCH` e `ASSET_PROFILE_FORBIDDEN` para
  contratos/perfis;
- `ASSET_PACK_HASH_MISMATCH`, `ASSET_MEDIA_SIZE_MISMATCH` e `ASSET_MEDIA_HASH_MISMATCH` para
  integridade;
- `ASSET_MEDIA_MISSING` e `ASSET_MEDIA_URL_CREATE_FAILED` para falhas de aquisição;
- `ASSET_PACK_CONFLICT` para stable key, identidade ou hash de pack conflitante;
- `ASSET_KEY_UNAVAILABLE` para resolução antes do load ou depois do unload.

O provider não faz retry, streaming, cache persistente, eviction, carregamento de formatos do
cliente ou criação de textura. O packer e os perfis de build permanecem em suas próprias fronteiras.
