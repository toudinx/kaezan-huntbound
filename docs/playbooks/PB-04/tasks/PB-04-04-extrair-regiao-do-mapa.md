# PB-04-04 — Extrair a região do mapa

**Status inicial:** pending

**Classe da tarefa:** implementação sobre formato binário de terceiro com saída congelada por hash

**Modelo sugerido:** GPT-5.6 Sol `xhigh`

**Validador sugerido:** gates automatizados; prefira validador diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** não. Ela consome PB-04-03 e destrava PB-04-06 e PB-04-07.

## Objetivo

Converter offline a região congelada do OTBM em `MapRegion`, `TransitionTable`, `SpawnTable` e
`HuntDefinition` validados, versionados e reprodutíveis byte a byte. Não tocar no kernel, nos assets,
na cena nem no input.

## Resultado esperado

`packages/content/src/generated/hunts/venore-rotworm-cave/` com `region.json`, `spawns.json`,
`hunt.json` e sidecars `.sha256`, mais uma CLI que regenera e confere. Reextrair do mesmo snapshot
produz bytes idênticos.

## Dependências

- PB-04-02 e PB-04-03 `done` e integradas em `main`.
- `packages/content/src/generated/tile-flags.json` congelada.
- `packages/content/src/selections/pb-04-venore-rotworm-cave.json` congelada.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-04/STATE.md`;
3. `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`, seções “Camadas do mapa”,
   “Transições”, “Spawn” e “Orçamento da região”;
4. `docs/content/MAP_REGION_CONTRACT.md`;
5. `docs/content/PB-04-SELECTION.md`;
6. `packages/contracts/src/hunt/**`;
7. `references/remeres-map-editor/source/iomap_otbm.*` apenas como referência do formato OTBM;
8. `tools/tile-flags/**` para reusar o padrão de CLI e source lock.

## Decisões congeladas

- **Nenhuma biblioteca de OTBM entra no workspace.** O leitor é próprio e mínimo.
- OTBM é um formato de nó binário com escape: `0xFE` inicia nó, `0xFF` termina nó, `0xFD` escapa o
  byte seguinte. O escape vale dentro de propriedades e é a fonte clássica de corrupção silenciosa;
  ele tem teste próprio.
- O leitor **não** carrega o mapa inteiro em memória como árvore: ele percorre os nós e descarta
  tudo que cai fora da bounding box congelada. O arquivo tem 19,7 MB e 40000 × 40000 tiles.
- Colisão é exatamente `tile-flags.blocking` de qualquer item do tile, incluindo o chão.
- Camadas: o item com `ground` vira `ground`; itens com `top` vão para `objectsAbove`; o restante vai
  para `objectsBelow`, preservando a ordem de empilhamento do OTBM.
- Um tile sem item de chão é tratado como vazio: fica fora da palette, entra em `collision` e não
  recebe objeto.
- Destinos de transição seguem a tabela congelada na spec. Destino fora da região, em tile de colisão
  ou em andar não extraído é **derrubado**, contabilizado em `TransitionTable.dropped` e listado no
  diagnóstico.
- `spawntime` converte por `segundos * 1000 / 50`; valor não divisível é erro.
- Criatura ausente do catálogo PB-01 é excluída conforme a seleção, nunca importada aqui.
- Coordenadas locais têm origem em `(selection.region.minX, selection.region.minY)`.
- O JSON gerado é canônico e só contém inteiros, booleanos e strings.

## Escopo permitido

```text
tools/map-extractor/**
packages/content/src/generated/hunts/venore-rotworm-cave/**
packages/content/src/sources/canary-157e6f9e.json
packages/content/src/selections/pb-04-venore-rotworm-cave.json
package.json
biome.json
docs/content/MAP_REGION_CONTRACT.md
docs/content/PB-04-SELECTION.md
docs/playbooks/PB-04/STATE.md
```

## Fora de escopo

- `packages/simulation`, `packages/contracts`, `packages/assets` e `apps/game`;
- `buildHuntScenario`, replay, fixture de sessão e gate `hunt:check`, que pertencem a PB-04-06;
- empacotar mídia, que pertence a PB-04-07;
- alterar `tile-flags.json`, que pertence a PB-04-03.

## Interfaces consumidas

- `HuntSelection` de `tools/hunt-selection`, produzido por PB-04-01.
- `TileFlagsTable` e `TileFlags` de `tools/tile-flags`, produzidos por PB-04-03.
- `HuntDefinition`, `MapRegion`, `TransitionTable`, `SpawnTable` e `validateHuntDefinition` de
  `@huntbound/contracts`, produzidos por PB-04-02.

Importe `packages/**` e `tools/**` por caminho relativo, como `tools/replay` e `tools/asset-packer`
já fazem: Node não aplica `paths` de tsconfig e o import por specifier falha com
`ERR_MODULE_NOT_FOUND`.

## Interfaces produzidas

```ts
export interface OtbmNode {
  readonly type: number;
  readonly props: Uint8Array;
  readonly children: readonly OtbmNode[];
}

export interface OtbmBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly floors: readonly number[];
}

export interface OtbmTile {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly items: readonly number[];
}

export function unescapeOtbmProps(raw: Uint8Array): Uint8Array;
export function readOtbmTiles(buffer: Uint8Array, bounds: OtbmBounds): readonly OtbmTile[];

export interface ExtractionDiagnostic {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export interface ExtractionResult {
  readonly hunt: HuntDefinition;
  readonly diagnostics: readonly ExtractionDiagnostic[];
}

export function extractHunt(
  otbm: Uint8Array,
  monsterXml: string,
  tileFlags: TileFlagsTable,
  selection: HuntSelection,
): ExtractionResult;
```

CLI: `node tools/map-extractor/cli.ts build [--check] --selection <path> --source-root <path>
--tile-flags <path> --output <dir>`. Com `--check`, não escreve e devolve exit 1 na primeira
divergência, imprimindo arquivo e offset.

Códigos: `HUNT_TRANSITION_DROPPED`, `HUNT_UNKNOWN_CREATURE`, `HUNT_SPAWNTIME_NOT_DIVISIBLE`,
`HUNT_REGION_OUT_OF_BUDGET`, `HUNT_EMPTY_TILE`.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada, e instalar dependências.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb04-04-map-extractor main
git worktree add C:\Kaezan\kaezan-huntbound-pb04-04-map-extractor codex/pb04-04-map-extractor
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-04-map-extractor install --prefer-offline
```

- [ ] **2. Escrever testes RED do escape e do parser de nós, sobre bytes construídos à mão.**

Não abra os 19,7 MB nesta etapa. Prove:

- `0xFD 0xFE` vira `0xFE` literal e não abre nó;
- `0xFD 0xFF` vira `0xFF` literal e não fecha nó;
- `0xFD 0xFD` vira `0xFD` literal;
- escape no último byte do buffer lança erro em vez de ler além do fim;
- nó aninhado três níveis é lido com os filhos na ordem do arquivo;
- nó não fechado lança erro nomeando o tipo;
- propriedade vazia é lida como `Uint8Array` de comprimento zero, não como `undefined`.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-04-map-extractor exec vitest run tools/map-extractor
```

Esperado: RED por módulo ausente.

- [ ] **3. Implementar `unescapeOtbmProps` e o percurso de nós; obter GREEN.**

- [ ] **4. Escrever testes RED de `readOtbmTiles`.**

Construa um OTBM sintético mínimo com dois `tile area` em `z` diferentes. Prove: tile dentro da box é
devolvido com coordenadas absolutas corretas; tile fora da box é descartado; andar fora de `floors` é
descartado; a ordem dos itens dentro do tile é preservada; `tile area` cujo canto está fora da box mas
que contém tiles dentro dela é processado, e não descartado inteiro.

O último caso é o erro fácil: a área tem 256 tiles e o descarte precisa ser por tile, não por área.

- [ ] **5. Implementar `readOtbmTiles`; obter GREEN.**

- [ ] **6. Escrever testes RED de camadas e colisão.**

Com tiles sintéticos e uma `TileFlagsTable` sintética, prove: o item `ground` vai para `ground`; item
`top` vai para `objectsAbove`; os demais vão para `objectsBelow` na ordem original; qualquer item com
`blocking` põe o índice em `collision`; chão bloqueante também bloqueia; tile sem chão entra em
`collision` e fica fora de `objectsBelow`; a palette sai ordenada, sem duplicata, e os índices de
`ground` apontam para ela.

- [ ] **7. Implementar a montagem de `MapRegion`; obter GREEN.**

- [ ] **8. Escrever testes RED de transições.**

Prove cada linha da tabela congelada: `down` → `(x, y, z+1)`; `north` → `(x, y-1, z-1)`; `south`,
`east`, `west` análogos; `up` → `(x, y-1, z-1)`. Prove os três motivos de derrubada — destino fora da
região, destino em colisão, destino em andar não extraído — cada um incrementando `dropped` e
emitindo `HUNT_TRANSITION_DROPPED` com o `from` no `path`. Prove que duas transições nunca
compartilham `from`.

- [ ] **9. Implementar a montagem de `TransitionTable`; obter GREEN.**

- [ ] **10. Escrever testes RED de spawns.**

Prove: grupo dentro da box vira `SpawnGroupDefinition` com centro em coordenada local; slot com
offset que cai fora da região é descartado com diagnóstico; `spawntime="90"` vira `1800`;
`spawntime="0.03"` → `HUNT_SPAWNTIME_NOT_DIVISIBLE`; criatura listada em `excludedCreatures` da
seleção é omitida sem erro; criatura ausente do catálogo e ausente das exclusões →
`HUNT_UNKNOWN_CREATURE`; grupos saem na ordem canônica `(z, y, x)`.

- [ ] **11. Implementar a montagem de `SpawnTable` e de `HuntDefinition`; obter GREEN.**

O resultado passa obrigatoriamente por `validateHuntDefinition` de `@huntbound/contracts` antes de
ser escrito. Falha de schema é falha da extração, nunca motivo para afrouxar o schema.

- [ ] **12. Extrair a região real e congelar os hashes.**

```powershell
node tools/map-extractor/cli.ts build --selection packages/content/src/selections/pb-04-venore-rotworm-cave.json --source-root C:\Kaezan\kaezan-huntbound\references\canary --tile-flags packages/content/src/generated/tile-flags.json --output packages/content/src/generated/hunts/venore-rotworm-cave
node tools/map-extractor/cli.ts build --check --selection packages/content/src/selections/pb-04-venore-rotworm-cave.json --source-root C:\Kaezan\kaezan-huntbound\references\canary --tile-flags packages/content/src/generated/tile-flags.json --output packages/content/src/generated/hunts/venore-rotworm-cave
```

A segunda execução deve devolver exit 0 sem escrever. Registre os quatro hashes no relatório.

- [ ] **13. Reconciliar `expectedDroppedTransitions` na seleção.**

PB-04-01 declarou `0` porque o número só é mensurável aqui. Se a extração derrubar transições,
atualize a seleção com o número medido e explique cada derrubada em `docs/content/PB-04-SELECTION.md`.
Se qualquer transição derrubada for necessária para atravessar a hunt, **encolha ou desloque a
bounding box** e reextraia — não aceite uma hunt intransitável.

- [ ] **14. Registrar scripts e exclusão de formatação.**

Acrescente `"hunt:extract:check"` ao `package.json`, com `--check` e
`--source-root-env HUNTBOUND_CANARY_SOURCE`. Ele fica **fora** de `check` e `verify` porque exige o
snapshot; a verificação que entra em `content:check` é a comparação dos sidecars `.sha256` contra os
arquivos. Exclua a árvore gerada do Biome no padrão já usado por
`packages/test-fixtures/simulation/pb03`.

- [ ] **15. Documentar.**

Atualize `docs/content/MAP_REGION_CONTRACT.md` com o formato OTBM lido, a regra de escape, a
classificação de camadas, a tabela de destinos de transição, a política de derrubada e os hashes
congelados.

- [ ] **16. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-04-map-extractor exec vitest run tools/map-extractor
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-04-map-extractor typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-04-map-extractor exec biome check tools/map-extractor packages/content
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-04-map-extractor format:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-04-map-extractor verify
git -C C:\Kaezan\kaezan-huntbound-pb04-04-map-extractor diff --check
```

- [ ] **17. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-04-map-extractor add tools/map-extractor packages/content package.json biome.json docs
git -C C:\Kaezan\kaezan-huntbound-pb04-04-map-extractor commit -m "feat: extract the first hunt region"
```

- [ ] **18. Integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb04-04-map-extractor
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb04-04-map-extractor
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb04-04-map-extractor
```

## Critérios de aceite

- [ ] O escape OTBM tem teste próprio para os três bytes especiais e para o escape truncado.
- [ ] `tile area` parcialmente fora da box é filtrada por tile, provado por teste.
- [ ] Camadas, palette e colisão seguem exatamente a regra congelada, com teste por caso.
- [ ] As seis linhas da tabela de transição têm teste, e os três motivos de derrubada também.
- [ ] Duas transições nunca compartilham `from`.
- [ ] Conversão de `spawntime` e exclusão de criatura estão provadas.
- [ ] A saída passa por `validateHuntDefinition` antes de ser escrita.
- [ ] `--check` devolve exit 0 na segunda execução; os quatro sidecars `.sha256` existem.
- [ ] `expectedDroppedTransitions` da seleção bate com o medido, e nenhuma transição necessária foi
      derrubada.
- [ ] Nenhum byte de `references/` entrou no repositório.
- [ ] `corepack pnpm verify` passa antes e depois da integração.

## Condições de parada

Pare se o OTBM exigir versão, compressão ou atributo não previsto; se a região extraída não for
atravessável sem transição derrubada e nenhuma box vizinha resolver; se a região estourar qualquer
teto; ou se `tile-flags.json` não cobrir algum `serverId` presente na região.

## Persistência e relatório final

Registre contagem de testes, tiles e spawns extraídos, transições e derrubadas, os quatro hashes,
comandos/exit codes, modelo/effort, modo de conclusão e a próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-04\tasks\PB-04-04-extrair-regiao-do-mapa.md

Leia o STATE.md do playbook PB-04 e apenas os arquivos indicados pela task. Crie a branch/worktree
indicada e rode "corepack pnpm install --prefer-offline" dentro dela antes de qualquer gate.

Escreva um leitor de OTBM proprio e minimo, sem dependencia externa. Comece por RED sobre bytes
construidos a mao, cobrindo o escape 0xFD e o descarte por tile dentro de tile area parcial; so
toque no canary.otbm real depois que o leitor estiver verde. Valide a saida por
validateHuntDefinition antes de escrever, e confirme idempotencia com --check.

Se alguma transicao necessaria for derrubada, encolha ou desloque a bounding box e reextraia.
Nenhum byte de references/ entra no repositorio. Execute os gates, atualize o handoff, commite,
integre por fast-forward na main, reverifique e limpe worktree/branch removendo o diretorio antes
do prune.

Não toque no kernel, nos assets, na cena nem no input. Se surgir decisão não coberta, pare e
registre o bloqueio. Não inicie a próxima task.
```
