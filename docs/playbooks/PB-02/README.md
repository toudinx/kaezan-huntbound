# PB-02 — Manifesto e asset pack pessoal

> **Para agentes executores:** skill obrigatória por task:
> `superpowers:test-driven-development` e `superpowers:verification-before-completion`. Execute uma
> task card por chat. O formato, handoff e ciclo automático de integração/limpeza seguem
> `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Status:** ready — PB-01 está fechado e PB-02-01 é a próxima task elegível.

**Goal:** materializar um subset visual pessoal por stable keys, empacotá-lo deterministicamente e
carregá-lo sob demanda no browser sem paths ou formatos do cliente vazando para consumidores.

**Architecture:** um packer TypeScript lê um export PNG/JSON externo, somente de leitura, e produz
packs Huntbound content-addressed. `@huntbound/assets` valida catálogos/packs, converte quatro
espaços de IDs por adapters distintos e publica descritores renderer-agnostic; o perfil `product`
recusa transitivamente qualquer grupo `cipsoft-personal`.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.4.3, Vitest 4.1.10, Vite 8.2.1, Playwright 1.62.1,
Web Crypto e APIs browser nativas. Nenhuma biblioteca de imagem, protobuf ou LZMA entra no PB-02.

## Fontes normativas

Em caso de conflito, ler nesta ordem:

1. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`;
2. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`;
3. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`;
4. `docs/08_POLITICA_MODELOS_AGENTES.md`;
5. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`;
6. `docs/superpowers/specs/2026-08-13-pb-02-asset-packs-design.md`;
7. este README;
8. a task card em execução;
9. `STATE.md` apenas para estado operacional.

## Restrições globais

- Node `24.14.0` e pnpm `11.21.0` via Corepack; zero instalação global.
- O export Arena Fable é entrada local externa, configurável e somente de leitura.
- O packer consome PNG + JSON já extraídos; não lê `appearances.dat`, protobuf ou LZMA.
- Stable keys são a única API pública de resolução; paths vivem somente em manifests.
- A URL do catálogo do perfil é o único bootstrap de asset permitido na composition root.
- `lookType`, `clientId`, `effectId` e `missileId` têm tipos, índices e adapters separados.
- JSON canônico usa ordenação determinística, UTF-8, LF e newline final.
- Paths de pack são POSIX relativos, sem `..`, barra invertida, URL absoluta ou drive letter.
- Mídias são content-addressed como `media/<sha256>.png` e verificadas antes de publicar o pack.
- Geração escreve staging e só promove um pack integralmente validado.
- PNGs e packs `cipsoft-personal` permanecem ignorados pelo Git.
- Fixtures `huntbound-test`, selection manifests, source locks, tooling, hashes e docs são versionados.
- `product` falha para qualquer dependência transitiva `cipsoft-personal`; não há warning permissivo.
- `@huntbound/assets` não importa Node ou Phaser; `packages/simulation` não depende de assets.
- Não existe fallback visual silencioso.

## Resultado independente

O cenário `pb-02-contract-coverage` carrega, valida, resolve e descarrega cinco assets exclusivamente
por stable keys e por um provider:

| Papel | Stable key | Adapter | ID |
|---|---|---|---:|
| outfit | `outfit:tibia:knight` | `lookType` | 131 |
| criatura | `creature:tibia:rotworm` | `lookType` | 26 |
| objeto | `item:tibia:gold-coin` | `clientId` | 3031 |
| efeito | `effect:tibia:energy-hit` | `effectId` | 12 |
| projétil | `missile:tibia:energy-ball` | `missileId` | 36 |

O fixture cobre contratos; não é uma hunt. PB-04 continua responsável por escolher a primeira hunt.

## Origem pessoal congelada

O source root não entra nos artefatos. Operacionalmente, o CLI recebe
`HUNTBOUND_PERSONAL_ASSET_SOURCE`; a task pode descobrir a origem pelo sibling repository, mas
persiste somente estes fatos:

| Entrada | Bytes | SHA-256 |
|---|---:|---|
| `manifest.json` | 808964 | `edf07a6edfc7c68128d8d0c712fbf0f2f66839e17399da62d9531598b3a05a94` |
| `outfits/131.png` | 196361 | `7b131fd5e524a72f0196e2c1b44bad6b8c929d4ca63b334fbe102cc1fb038cd6` |
| `outfits/26.png` | 23500 | `50693364cc059e397bad267c8f443f248d387ef38f0417e87351f1f253ed3f4b` |
| `objects/3031.png` | 1301 | `cc44391cf4b0a8ec1573737d954d95e6352b5c942559ad3b91d87c59fc33faf1` |
| `effects/12.png` | 3967 | `6840bf0e4fb9dfbcf7869705d81e8b61a2f12f2b08fb3427b0d43a4521c35bdb` |
| `missiles/36.png` | 12974 | `0a2438152e493b8dfcfdf8131416aa609dd5161bbbf9d0f0a50efc93cc237a96` |

Commit histórico do export: `1b14dee3b22f6970333bef76031b473c7bcf917e`.

## Arquitetura alvo

```text
export PNG/JSON externo
  └─► selection + source lock
        └─► tools/asset-packer
              └─► pack.json + pack.sha256 + media/<sha256>.png
                    └─► catálogo do perfil
                          └─► FetchAssetProvider
                                ├─► adapters de ID → AssetKey
                                ├─► validateKeys / resolve
                                └─► load / unload
```

### Fronteiras futuras

```text
packages/assets/src/manifest/          keys, schemas, canonicalização e diagnósticos
packages/assets/src/adapters/          quatro contratos e implementações por namespace
packages/assets/src/providers/         transport, registry e provider transacional
packages/assets/catalog/               selections e source locks versionados
packages/test-fixtures/assets/pb02/    origem sintética e golden pack
tools/asset-packer/                     validação, geração, perfis e CLI Node
tools/architecture/                     regra viva de paths/assets
docs/assets/                            política, seleção e evidência gerada
apps/game/src/assets/                   composition root e probe test-only
apps/game/public/assets/personal/       output local ignorado
```

## Contratos obrigatórios

PB-02-01 congela os nomes e assinaturas completos. As fronteiras mínimas são:

```ts
export type AssetBuildProfile = 'personal' | 'product' | 'test';
export type AssetLicenseClass =
  | 'cipsoft-personal'
  | 'huntbound-owned'
  | 'huntbound-test';

export interface AssetProvider {
  readonly adapters: AssetIdAdapters;
  loadPack(packId: string): Promise<void>;
  loadPreloads(): Promise<readonly ResolvedAsset[]>;
  validateKeys(keys: readonly AssetKey[]): AssetValidationResult;
  resolve(key: AssetKey): ResolvedAsset;
  unloadPack(packId: string): Promise<void>;
  unloadAll(): Promise<void>;
}
```

O provider recebe a URL do catálogo, baixa e valida o pack inteiro, verifica SHA-256 com Web Crypto,
cria URLs de mídia por uma abstração injetável e só então comita a nova visão no registry. Falha
revoga URLs de staging e preserva o estado anterior.

## Ordem das tasks

| ID | Problema coeso | Dependência | Modelo/effort | Status |
|---|---|---|---|---|
| [PB-02-01](tasks/PB-02-01-definir-contratos-de-assets.md) | keys, schemas, diagnósticos e interfaces | PB-01 fechado | Luna `xhigh` | pending |
| [PB-02-02](tasks/PB-02-02-congelar-origem-e-selecao.md) | source lock, seleção e fixture sintética | PB-02-01 | Luna `xhigh` | pending |
| [PB-02-03](tasks/PB-02-03-materializar-packs-deterministicos.md) | packer transacional e golden pack | PB-02-02 | Luna `xhigh` | pending |
| [PB-02-04](tasks/PB-02-04-implementar-provider-e-registry.md) | provider, registry, adapters e unload | PB-02-02 | Luna `xhigh` | pending |
| [PB-02-05](tasks/PB-02-05-fechar-perfis-e-boundaries.md) | perfis, build guard, scripts e arquitetura | PB-02-03/04 | Sol `xhigh` | pending |
| [PB-02-06](tasks/PB-02-06-validar-contrato-no-browser.md) | composition root, preload e browser QA | PB-02-05 | Luna `xhigh` | pending |
| [PB-02-07](tasks/PB-02-07-auditar-e-fechar-playbook.md) | auditoria integrada e aceite | PB-02-06 | Opus 5/Sol | pending |

PB-02-03 e PB-02-04 podem executar em paralelo após PB-02-02 porque seus paths funcionais não se
sobrepõem. O padrão é serial. Se o supervisor ativar paralelismo, ambos removem worktrees limpas,
preservam branches e não disputam `STATE.md`; PB-02-05 integra os dois commits, atualiza o handoff e
apaga as branches somente depois dos gates integrados.

## Baseline de qualidade

- Branch-base: `main`.
- Spec aprovada: commit `0f2e109`.
- PB-01: `done`, golden bundle
  `d9df3338743365710fed991c185976b9dbbd59e6d5f9d43a679550db8fa154f3`.
- `corepack pnpm verify` estava verde no fechamento de PB-01.
- O Biome ignora `docs/**`; tasks validam documentação por `git diff --check` e leitura/scan explícito.
- `.cache/` pode afetar `format:check` se contiver TypeScript; temporários executáveis ficam fora da
  árvore ou em formatos ignorados pelo Biome.

## Critérios finais de aceite

- [ ] Selection, source lock, pack e catálogo possuem schemas estritos e diagnósticos estruturados.
- [ ] Os quatro namespaces numéricos usam adapters e índices separados.
- [ ] O fixture contém exatamente as cinco entradas congeladas.
- [ ] Source lock real confere com manifesto e PNGs externos sem persistir path absoluto.
- [ ] Várias ausências são informadas em uma única validação.
- [ ] Paths absolutos, traversal, categoria errada, mídia ausente e hash divergente falham.
- [ ] Duas gerações limpas são byte-identical e staging falho preserva output válido.
- [ ] Pack real permanece ignorado; zero mídia `cipsoft-personal` é rastreada.
- [ ] `product` passa com `huntbound-test` e falha com dependência `cipsoft-personal`.
- [ ] Provider instala packs atomicamente, resolve cinco keys e descarrega/revoga URLs.
- [ ] Browser faz preload pelo catálogo, sem pack ID ou path de mídia hardcoded no consumidor.
- [ ] `packages/simulation` permanece sem assets, DOM, Phaser ou paths de mídia.
- [ ] Trilha sintética reproduzível e trilha pessoal local passam com evidência fresca.
- [ ] `corepack pnpm verify` passa no resultado integrado.
- [ ] Relatório de aceite decide a elegibilidade de PB-03.

## Fora de escopo

- portar/reimplementar o extrator C#;
- ler protobuf, `appearances.dat`, LZMA, XML, Lua ou OTBM no runtime;
- primeira hunt, mapa, tiles, spawn, câmera, combate ou gameplay;
- textura/animação Phaser final;
- compositor, addons, cores ou catálogo completo de outfits;
- catálogo visual Tibia em massa;
- fallback visual silencioso;
- distribuição de `cipsoft-personal`;
- save, backend, service worker ou cache persistente;
- alterar PB-01 sem defeito bloqueante reproduzido.

## Como executar

Abra um chat novo e envie o bloco copiável da próxima task indicada em `STATE.md`. Execute somente
uma task. A task cria branch/worktree, segue RED/GREEN, verifica, atualiza o handoff, commita,
integra por `--ff-only` no fluxo serial e remove seus recursos temporários. Não antecipe a seguinte.
