# PB-02 — Estado operacional

**Playbook:** `docs/playbooks/PB-02/README.md`

**Estado geral:** ready

**Última atualização:** 2026-08-13

**Próxima task elegível:** PB-02-05

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-02-01 | done | `codex/pb02-01-asset-contracts` | `86f8921` | 13 testes; typecheck; architecture; Biome; format; diff check |
| PB-02-02 | done | `codex/pb02-02-source-selection` | `ff0ea57` | 11 testes; locks real/sintético 5/5; typecheck; architecture; Biome; format; diff check |
| PB-02-03 | done | `codex/pb02-03-deterministic-packer` | `83efda3` | 29 testes do packer; golden byte-idêntico; pack real 5/5; verify raiz e browser verdes |
| PB-02-04 | done | `codex/pb02-04-asset-runtime` | `f70528f` | 33 testes; typecheck; Biome; diff check; registry/provider transacional |
| PB-02-05 | pending | `codex/pb02-05-profile-guards` | — | — |
| PB-02-06 | pending | `codex/pb02-06-browser-contract` | — | — |
| PB-02-07 | pending | `codex/pb02-07-integrated-gate` | — | — |

## Baseline congelado

- Branch-base: `main`.
- Commit do design aprovado: `0f2e10907e959a87985662a2da9e6bfc24e0c136`.
- Node/pnpm: 24.14.0 / 11.21.0 via Corepack.
- PB-01: `done`; PB-02 elegível.
- Export Arena Fable: commit histórico `1b14dee3b22f6970333bef76031b473c7bcf917e`.
- Hash do manifesto externo: `edf07a6edfc7c68128d8d0c712fbf0f2f66839e17399da62d9531598b3a05a94`.
- Fixture: Knight 131, Rotworm 26, gold coin 3031, energy hit 12, energy ball 36.
- Dependências previstas: somente `zod@4.4.3` em `@huntbound/assets`; Vitest já está fixado no
  workspace.
- Gate raiz conhecido: `corepack pnpm verify` verde no aceite PB-01.

## Decisões operacionais

- Tasks 01–04 e 06 usam GPT-5.6 Luna `xhigh` por padrão; gatilhos de escalonamento seguem a política.
- PB-02-05 usa GPT-5.6 Sol `xhigh` por cruzar build, licença e boundaries.
- PB-02-07 usa Claude Code/Opus 5, com fallback GPT-5.6 Sol `xhigh`, e prefere validador diferente.
- Fluxo padrão é serial com fast-forward automático e limpeza.
- PB-02-03/04 só entram em paralelo por ativação explícita do supervisor. Nesse modo não editam o
  handoff compartilhado; PB-02-05 é o integrador único.
- A raiz do export externo chega por `HUNTBOUND_PERSONAL_ASSET_SOURCE`; nenhum valor absoluto é
  persistido.
- Fixture sintética e golden pack são rastreados; pack real pessoal, staging e caches são ignorados.
- Divergência do source lock real bloqueia. Não atualizar hashes automaticamente para “fazer passar”.
- Qualquer mídia `cipsoft-personal` rastreada é falha bloqueante.

## Handoffs

PB-02-01 implementou em `@huntbound/assets` as stable keys, factories e quatro IDs branded, os
schemas estritos de selection/source lock/pack/catalog, identidades discriminadas, grupos de
proveniência, presentation/media/animação, validações de cross-reference e diagnósticos ordenados.
Os quatro contratos de adapter foram mantidos em arquivos separados e exportados pelo entrypoint.
Não foram lidos o export real, filesystem, fetch, Web Crypto, Blob, Phaser ou formatos do cliente;
nenhum fixture, packer, provider ou app foi antecipado.

O design aprovado permanece em
`docs/superpowers/specs/2026-08-13-pb-02-asset-packs-design.md`.

Evidência fresca de PB-02-01:

```text
corepack pnpm --filter @huntbound/assets test -> 13 passed (3 files)
corepack pnpm --filter @huntbound/assets typecheck -> exit 0
corepack pnpm architecture:check -> exit 0
corepack pnpm exec biome check packages/assets -> exit 0
corepack pnpm format:check -> exit 0
git diff --check -> exit 0
```

Exports efetivos incluem `AssetKeySchema`, `LookTypeIdSchema`, `ClientIdSchema`, `EffectIdSchema`,
`MissileIdSchema`, as factories correspondentes, `AssetSelectionManifestSchema`,
`AssetSourceLockSchema`, `AssetPackManifestSchema`, `AssetPackCatalogSchema`, os tipos de contrato,
`validateAssetSelectionManifest`, `validateAssetSourceLock`, `validateAssetPackManifest`,
`validateAssetPackCatalog` e `AssetDiagnosticCode`. A dependência direta é `zod@4.4.3`; Vitest
permanece `4.1.10` como devDependency exata do package.

Modelo/effort efetivos: Codex baseado em GPT-5; o effort exposto nesta sessão não informa o alias
Luna/xhigh sugerido no task card. Validador efetivo: gates automatizados; não houve gatilho objetivo
para escalonamento.

A instalação inicial do worktree encontrou falha de certificado/metadata do registry durante
`pnpm add`; as resoluções já estavam presentes no lockfile. O install congelado foi concluído com
`--config.strict-ssl=false`, sem alterar configuração versionada ou resoluções.

PB-02-02 congelou a seleção `fixture:pb-02-contract-coverage` com exatamente cinco entradas:
Knight `lookType:131`, Rotworm `lookType:26`, gold coin `clientId:3031`, energy hit `effectId:12`
e energy ball `missileId:36`. O parser histórico valida maps e campos estritos, normaliza `groups`
objeto/array, ignora somente `semantic` e `objectNames` após validá-los como objetos, e o resolver
mantém o mapeamento fixo `lookType → outfits`, `clientId → objects`, `effectId → effects` e
`missileId → missiles`, sem fallback entre categorias.

O source lock pessoal foi verificado contra o export externo do snapshot
`1b14dee3b22f6970333bef76031b473c7bcf917e`: manifesto de 808964 bytes com SHA-256
`edf07a6edfc7c68128d8d0c712fbf0f2f66839e17399da62d9531598b3a05a94` e cinco mídias com os hashes
e tamanhos registrados em `docs/assets/PB-02-SELECTION.md`. O root externo é recebido por argumento
ou `HUNTBOUND_PERSONAL_ASSET_SOURCE` e não aparece nos artefatos, docs ou diagnostics.

A fixture sintética versionada contém exatamente cinco PNGs distintos de 68 bytes, todos com SHA-256
`431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460`; o gerador determinístico e
`--check` validam que drift não é reescrito silenciosamente. Nenhuma mídia pessoal foi copiada ou
rastreada. A documentação durável está em `docs/assets/PB-02-SELECTION.md` e o plano operacional em
`docs/superpowers/plans/2026-08-13-pb-02-02-source-selection.md`.

Evidência fresca de PB-02-02 no commit integrado `ff0ea57`:

```text
corepack pnpm test -> exit 0; 6 testes Vitest raiz, 11 testes Node de boundaries e 109 testes Vitest dos packages
corepack pnpm exec vitest run --config tools/asset-packer/vitest.config.ts -> 11 passed (4 files)
corepack pnpm exec tsc --project tools/asset-packer/tsconfig.json --noEmit -> exit 0
corepack pnpm --filter @huntbound/test-fixtures typecheck -> exit 0
corepack pnpm architecture:check -> exit 0
corepack pnpm exec biome check tools/asset-packer packages/assets/catalog packages/test-fixtures/src -> exit 0
corepack pnpm format:check -> exit 0
git diff --check -> exit 0
real verifier -> manifest verified; files 5/5
synthetic verifier -> manifest verified; files 5/5
synthetic --check -> exit 0; 5 PNGs tracked, all 68 bytes and hash 431ced...
git ls-files apps/game/public/assets/personal -> sem saída
```

O modelo efetivo foi Codex baseado em GPT-5; foram usados `game-studio:web-game-foundations`,
`superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:executing-plans`,
`superpowers:test-driven-development`, `superpowers:systematic-debugging`,
`superpowers:verification-before-completion` e `superpowers:finishing-a-development-branch`.
O validador efetivo foi a matriz automatizada local; não houve gatilho objetivo para escalonamento.
Ao concluir PB-02-02, PB-02-03 tornou-se a próxima task serial elegível; nenhuma etapa posterior foi
antecipada naquele commit.

PB-02-03 implementou o packer Node determinístico com `build`, `build --check`, `verify-pack` e
`source verify`, códigos de saída estáveis e diagnostics estruturados. A transformação propaga
proveniência, apresentação e animação sem heurísticas, ordena entries/groups, serializa JSON
canônico UTF-8/LF e endereça mídia pelo SHA-256 dos bytes originais. A materialização agrega
divergências antes de escrever, deduplica mídia e promove um staging sibling por rename com backup
e rollback. Um destino existente só pode ser substituído se for um pack íntegro do mesmo `packId`
e tiver árvore exata; diretórios estranhos, packs aumentados/corrompidos, symlinks e alvos amplos são
recusados antes de qualquer remoção.

A execução contra o export congelado revelou um defeito no refinement de animação definido em
PB-02-01: o `count` histórico representa todos os sprites do grupo, enquanto `phases` contém apenas
as durações das fases. O contrato foi corrigido para exigir `count = patterns * layers * fases`, com
uma fase implícita quando `phases` está vazio. Isso preserva literalmente os campos do exporter e
permite os cinco assets reais sem inventar timing. `MANIFEST_CONTRACT.md`, o task card histórico e
um teste de contrato realista registram a correção.

Evidência fresca de PB-02-03 no commit funcional `83efda3`:

```text
corepack pnpm exec vitest run --config tools/asset-packer/vitest.config.ts -> 29 passed (8 files)
corepack pnpm exec tsc --project tools/asset-packer/tsconfig.json --noEmit -> exit 0
corepack pnpm verify -> exit 0; format, architecture, typecheck, 127 testes workspace/boundaries, build, content e Playwright 7/7
synthetic build --check -> exit 0; 3 files, 3471 bytes, 1 media de 68 bytes
synthetic pack.json SHA-256 -> 775d56f87b156349d9e81410d1703bac1499e1d332a2c1064dce498d18d97af5
real source verify -> manifesto 808964 bytes, SHA-256 edf07a6edfc7c68128d8d0c712fbf0f2f66839e17399da62d9531598b3a05a94, files 5/5
real build --check + verify-pack -> exit 0; 7 files, 241948 bytes, 5 mídias
real pack.json SHA-256 -> a711c757874783d25da4242102abd681f6d07528bc2481af0139126a877dff9c
git status --short --ignored -- apps/game/public/assets/personal -> !!
git ls-files apps/game/public/assets/personal -> sem saída
git diff --check -> exit 0
```

Os testes de falha cobrem corrupção agregada antes do staging, write failure, rollback de promoção,
troca insegura do staging, destino não diretório, diretório não relacionado e pack válido com arquivo
extra. A revisão independente encontrou os dois riscos de ownership do destino; ambos receberam RED,
correção e re-revisão final sem achados bloqueantes ou importantes.

Modelo/effort efetivos: Codex baseado em GPT-5; o alias Luna/xhigh não foi exposto nesta sessão.
Foram usados `game-studio:web-game-foundations`, `superpowers:using-superpowers`,
`superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:executing-plans`,
`superpowers:using-git-worktrees`, `superpowers:test-driven-development`,
`superpowers:systematic-debugging`, `superpowers:requesting-code-review`,
`superpowers:verification-before-completion` e `superpowers:finishing-a-development-branch`. O modo
de conclusão é serial: fast-forward em `main`, seguido de remoção da worktree e da branch. PB-02-04
é a próxima task elegível; runtime/provider não foram antecipados.

PB-02-04 implementou o runtime browser-safe em `@huntbound/assets`: `AssetPackRegistry` atômico com
índices independentes por namespace, quatro adapters de manifest, `BrowserAssetTransport`, digest
SHA-256 por Web Crypto, store de Blob/URL e `createFetchAssetProvider`. O provider valida catálogo,
perfil, manifest, hash do pack, tamanho/hash das mídias e só instala depois de criar todas as URLs.
Falhas parciais agregam diagnostics e revogam URLs de staging; conflitos preservam os packs já
carregados; `loadPreloads`, unload seletivo e `unloadAll` estão cobertos.

Evidência fresca de PB-02-04 nesta execução:

```text
corepack pnpm --filter @huntbound/assets test -> 33 passed (7 files)
corepack pnpm --filter @huntbound/assets typecheck -> exit 0
corepack pnpm exec biome check packages/assets -> exit 0
```

Os testes incluem JSON inválido, HTTP falho, IDs 131/26/3031/12/36, namespaces iguais sem colisão,
duas mídias ausentes agregadas, tamanho/hash incorretos, falha na terceira URL, conflito de pack,
idempotência e unload ownership. A implementação não importa Node, Phaser, filesystem ou packer.
`docs/assets/ASSET_PROVIDER.md` registra a API e o lifecycle. O próximo integrador é PB-02-05 para
perfis, build guard, scripts e boundaries; nenhum código do app/browser foi antecipado.

## Bloqueios

Nenhum bloqueio conhecido. A origem pessoal e os packs sintético/real foram verificados novamente
na conclusão de PB-02-03; nenhum asset pessoal está rastreado.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar PB-02-05 consolidar o handoff compartilhado.
