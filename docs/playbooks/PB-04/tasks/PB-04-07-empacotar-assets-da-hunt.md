# PB-04-07 — Empacotar os assets da hunt

**Status inicial:** pending

**Classe da tarefa:** extensão de subsistema existente com orçamento verificável

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; escalonamento somente por gatilho objetivo registrado

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** sim, com PB-04-05 e PB-04-06, somente por ativação do supervisor. Paths disjuntos:
esta task toca `packages/assets/**`, `tools/asset-packer/**` e `packages/test-fixtures/assets/**`.

## Objetivo

Estender a seleção e o packer do PB-02 para cobrir todos os tiles da região extraída, mais a criatura
e o outfit do jogador, sob orçamento verificável e com chave faltante falhando em validação única.
Não renderizar e não tocar em `apps/game/src`.

## Resultado esperado

O pack `pb-04-venore-rotworm-cave` existe nos profiles `test` e `personal`, resolve toda chave usada
pela região, respeita os tetos de 512 entradas e 6 MB, e o profile `product` continua recusando
mídia `cipsoft-personal`.

## Dependências

- PB-04-04 `done` e integrada em `main`.
- `packages/content/src/generated/hunts/venore-rotworm-cave/region.json` congelada.
- PB-02 fechado, com adapters `lookType`, `clientId`, `effectId` e `missileId` funcionando.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-04/STATE.md`;
3. `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`, seções “Assets da hunt” e
   “Orçamento da região”;
4. `docs/assets/MANIFEST_CONTRACT.md`, `docs/assets/ASSET_PACKER.md`, `docs/assets/ASSET_PROFILES.md`
   e `docs/assets/ASSET_PROVIDER.md`;
5. `docs/assets/PB-02-SELECTION.md`;
6. `packages/assets/**` e `tools/asset-packer/**`;
7. `packages/test-fixtures/assets/pb02/**` como referência de fixture sintética.

## Decisões congeladas

- Namespace novo de stable key: `tile:tibia:<clientId>`, resolvido pelo adapter `clientId` já
  existente. **Nenhum adapter novo.**
- Tile de mapa não exige entrada no catálogo PB-01: ele é geometria e decoração, não conteúdo de
  regra.
- A lista de chaves do pack é **derivada** de `region.palette`, nunca escrita à mão. Uma seleção
  divergente da palette é erro.
- O pack inclui, além dos tiles: `creature:tibia:rotworm` (`lookType: 26`) e `outfit:tibia:knight`
  (`lookType: 131`), ambos já congelados pelo PB-02.
- Tetos: ≤ 512 entradas de mídia e ≤ 6 MB por pack. Estourar é falha de gate.
- O profile `test` usa a mesma fixture sintética 1×1 do PB-02 para todas as chaves; o profile
  `personal` resolve mídia real do source root externo; o profile `product` recusa
  `licenseClass: "cipsoft-personal"`.
- Nenhum path literal de mídia existe fora do manifesto.
- Mídia real nunca entra no repositório.

## Escopo permitido

```text
packages/assets/catalog/selections/pb-04-venore-rotworm-cave.json
packages/assets/src/**
tools/asset-packer/**
packages/test-fixtures/assets/pb04/**
package.json
biome.json
docs/assets/PB-04-SELECTION.md
docs/playbooks/PB-04/STATE.md
```

## Fora de escopo

- `apps/game/src`, cena, câmera e input;
- `packages/simulation`, `packages/contracts` e `tools/map-extractor`;
- alterar a região extraída ou `tile-flags.json`;
- outfit composto, addons e cores, que pertencem a PB-07.

## Interfaces produzidas

```ts
export interface HuntPackSelection {
  readonly packKey: string;
  readonly huntId: string;
  readonly regionSha256: string;
  readonly keys: readonly string[];
  readonly budget: { readonly maxEntries: number; readonly maxBytes: number };
}

export interface HuntPackDiagnostic {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export function deriveHuntPackKeys(region: MapRegion): readonly string[];

export function validateHuntPack(
  selection: HuntPackSelection,
  region: MapRegion,
  resolvedEntries: readonly { readonly key: string; readonly bytes: number }[],
): readonly HuntPackDiagnostic[];
```

`deriveHuntPackKeys` devolve `tile:tibia:<clientId>` para cada `serverId` da palette, ordenado
estritamente.

Códigos: `HUNT_ASSET_KEY_MISSING`, `HUNT_ASSET_KEY_UNEXPECTED`, `HUNT_PACK_OVER_ENTRIES`,
`HUNT_PACK_OVER_BYTES`, `HUNT_PACK_REGION_STALE`.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada, e instalar dependências.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb04-07-hunt-assets main
git worktree add C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets codex/pb04-07-hunt-assets
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets install --prefer-offline
```

- [ ] **2. Escrever testes RED de `deriveHuntPackKeys`.**

Com uma `MapRegion` sintética, prove: cada `serverId` da palette vira exatamente uma chave
`tile:tibia:<id>`; a saída é estritamente ordenada; palette vazia devolve lista vazia; a função não
inventa chave de criatura nem de outfit.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets --filter @huntbound/assets test
```

Esperado: RED por módulo ausente.

- [ ] **3. Implementar `deriveHuntPackKeys`; obter GREEN.**

- [ ] **4. Escrever testes RED de `validateHuntPack`.**

Prove, cada um com seu código: chave da palette ausente da seleção → `HUNT_ASSET_KEY_MISSING`; chave
da seleção que não existe na palette e não é criatura/outfit → `HUNT_ASSET_KEY_UNEXPECTED`; 513
entradas → `HUNT_PACK_OVER_ENTRIES`; soma de bytes acima de 6 MB → `HUNT_PACK_OVER_BYTES`;
`regionSha256` diferente do hash atual da região → `HUNT_PACK_REGION_STALE`.

Prove também que **todas** as chaves faltantes saem numa única validação, não uma por execução. Esse
é o requisito do gate G4 do roteiro e é o erro fácil: parar no primeiro problema.

- [ ] **5. Implementar `validateHuntPack`; obter GREEN.**

- [ ] **6. Gerar a seleção derivada da palette.**

Escreva `packages/assets/catalog/selections/pb-04-venore-rotworm-cave.json` a partir da região real,
por ferramenta, não à mão. Inclua `creature:tibia:rotworm` e `outfit:tibia:knight`. Grave
`regionSha256` com o hash de `region.json`.

- [ ] **7. Construir a fixture sintética do profile `test`.**

Siga exatamente o padrão de `packages/test-fixtures/assets/pb02`: manifest sintético, PNG 1×1
transparente de 68 bytes reusado por todas as chaves, source lock gerado por
`createAssetSourceLock`, e um `--check` que confere sem reescrever.

- [ ] **8. Empacotar e verificar os três profiles.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets assets:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets assets:stage:test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets assets:product:check
```

O `product` deve **falhar** se receber mídia `cipsoft-personal`, e passar com a fixture sintética.
Prove os dois lados, não apenas o que passa.

Se `HUNTBOUND_PERSONAL_ASSET_SOURCE` estiver definido no ambiente, rode também
`assets:personal:check` e registre o resultado. Se não estiver, registre a ausência: `personal` é
opt-in e não bloqueia a task.

- [ ] **9. Registrar scripts e exclusões.**

Estenda `assets:check` para cobrir o pack da hunt no profile `test`. Exclua a árvore gerada do Biome
no padrão já usado pela árvore de assets do PB-02.

- [ ] **10. Documentar.**

Crie `docs/assets/PB-04-SELECTION.md` no formato de `docs/assets/PB-02-SELECTION.md`: chaves
congeladas, categorias, identidades de origem, orçamento medido, fixture sintética e a fronteira de
escopo. Não escreva nenhum path real de mídia pessoal.

- [ ] **11. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets --filter @huntbound/assets test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets assets:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets exec biome check packages/assets tools/asset-packer
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets format:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets verify
git -C C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets diff --check
```

Rode `verify` **duas vezes seguidas**: o PB-02 já reprovou uma auditoria exatamente por falhar na
segunda execução consecutiva.

- [ ] **12. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets add packages tools package.json biome.json docs
git -C C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets commit -m "feat: pack the first hunt assets"
```

Em modo paralelo, não edite `STATE.md`: deixe PB-04-08 consolidar o handoff.

- [ ] **13. Integrar e limpar.**

Modo serial:

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb04-07-hunt-assets
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb04-07-hunt-assets
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb04-07-hunt-assets
```

Modo paralelo: remova a worktree limpa após o commit e preserve a branch para PB-04-08.

## Critérios de aceite

- [ ] As chaves do pack são derivadas da palette por ferramenta, não escritas à mão.
- [ ] `tile:tibia:<clientId>` resolve pelo adapter `clientId` existente; nenhum adapter novo entrou.
- [ ] Todas as chaves faltantes saem em uma única validação.
- [ ] Os tetos de 512 entradas e 6 MB são recusados por gate, com o valor medido registrado.
- [ ] `regionSha256` detecta seleção desatualizada.
- [ ] O profile `product` foi provado nos dois sentidos: recusa `cipsoft-personal` e passa com a
      fixture sintética.
- [ ] Nenhum path literal de mídia existe fora do manifesto, e nenhuma mídia real entrou no repo.
- [ ] `verify` passa em duas execuções consecutivas.

## Condições de parada

Pare se a região exigir mais de 512 entradas ou mais de 6 MB e nenhuma redução de bounding box for
autorizada; se algum `clientId` da palette não existir no manifesto de origem; se a resolução exigir
adapter novo; ou se o profile `product` passar com mídia `cipsoft-personal`.

## Persistência e relatório final

Registre número de chaves, entradas, bytes medidos, resultado dos três profiles, comandos/exit codes,
modelo/effort, modo de conclusão e a próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-04\tasks\PB-04-07-empacotar-assets-da-hunt.md

Leia o STATE.md do playbook PB-04 e apenas os arquivos indicados pela task. Crie a branch/worktree
indicada e rode "corepack pnpm install --prefer-offline" dentro dela antes de qualquer gate.

Comece por RED. Derive as chaves do pack da palette da regiao por ferramenta, nunca a mao. Prove que
todas as chaves faltantes saem numa unica validacao, e prove o profile product nos dois sentidos:
recusa cipsoft-personal e passa com a fixture sintetica. Nenhum adapter novo, nenhuma midia real no
repositorio, nenhum path literal fora do manifesto.

Rode verify duas vezes seguidas sem alterar a arvore. Atualize o handoff conforme o modo declarado,
commite, integre por fast-forward na main no modo serial, reverifique e limpe worktree/branch
removendo o diretorio antes do prune.

Não toque em apps/game, no kernel nem na regiao extraida. Se surgir decisão não coberta, pare e
registre o bloqueio. Não inicie a próxima task.
```
