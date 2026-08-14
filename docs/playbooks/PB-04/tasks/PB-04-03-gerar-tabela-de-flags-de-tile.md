# PB-04-03 — Gerar a tabela de flags de tile

**Status inicial:** pending

**Classe da tarefa:** implementação sobre formato binário de terceiro — exige leitura tolerante,
prova por fixture construída à mão e uma condição de parada real

**Modelo sugerido:** GPT-5.6 Sol `xhigh`

**Validador sugerido:** gates automatizados; prefira validador diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** sim, com PB-04-05, somente por ativação do supervisor. Paths disjuntos: esta task
toca `tools/tile-flags/**` e `packages/content/**`; PB-04-05 toca `packages/simulation/**` e
`packages/contracts/src/simulation/**`.

## Objetivo

Derivar do snapshot local uma tabela versionada que responda, por `serverId`: se o item é chão, se
bloqueia passagem, se é desenhado acima do ator e se causa mudança de andar. Provar, no mesmo
movimento, que `serverId == clientId` no snapshot congelado. Não recortar mapa e não tocar no kernel.

## Resultado esperado

`packages/content/src/generated/tile-flags.json` com sidecar `.sha256`, reprodutível byte a byte a
partir do mesmo snapshot, e um leitor de protobuf próprio, mínimo e testado por fixture construída à
mão.

## Dependências

- PB-04-02 `done` e integrada em `main`.
- Snapshot local com `references/canary/data/items/appearances.dat` e
  `references/canary/data/items/items.xml`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-04/STATE.md`;
3. `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`, seções “Identidade de item” e
   “Origem das flags de tile”;
4. `references/canary/src/protobuf/appearances.proto`, apenas as mensagens `Appearances`,
   `Appearance` e `AppearanceFlags`;
5. `tools/asset-packer/**` como referência de estrutura de ferramenta e de source lock;
6. `packages/content/src/generated/pb-01-contract-coverage.json` como referência de artefato gerado.

## Decisões congeladas

- **Nenhuma biblioteca de protobuf entra no workspace.** O leitor é próprio e decodifica somente os
  campos necessários, pulando o resto por wire type.
- Campos lidos de `AppearanceFlags`: `bank` (chão), `unpass` (bloqueio), `top`, `clip`, `bottom`,
  `unmove`, `avoid` e a elevação, quando presente.
- Colisão é **exatamente** `unpass`. `avoid`, `unmove`, `clip` e elevação são registrados na tabela
  mas não influenciam colisão nesta versão.
- `floorChange` vem de `items.xml`, atributo `floorchange`, com valores `down`, `north`, `south`,
  `east`, `west` e `up`. Valor fora desse conjunto é erro, não é ignorado.
- A tabela cobre **todos** os `serverId` presentes em `appearances.dat`, não apenas os da região: a
  região ainda não foi extraída nesta task, e uma tabela parcial obrigaria a regerá-la a cada mudança
  de bounding box.
- O JSON gerado é canônico: chaves ordenadas, sem espaço supérfluo, newline final, somente inteiros,
  booleanos e strings.
- O source root vem de `--source-root` ou de `HUNTBOUND_CANARY_SOURCE`; nunca de path literal escrito
  no repositório.

## Escopo permitido

```text
tools/tile-flags/**
packages/content/src/generated/tile-flags.json
packages/content/src/generated/tile-flags.sha256
packages/content/src/sources/canary-157e6f9e.json
package.json
biome.json
docs/content/MAP_REGION_CONTRACT.md
docs/playbooks/PB-04/STATE.md
```

## Fora de escopo

- ler ou parsear OTBM;
- recortar região, camadas, colisão espacial ou spawns;
- `packages/simulation`, `packages/contracts`, `packages/assets` e `apps/game`;
- sprites, imagens e qualquer mídia — `appearances.dat` é lido apenas por suas flags.

## Interfaces produzidas

```ts
export type ProtoWireType = 0 | 1 | 2 | 5;

export interface ProtoField {
  readonly fieldNumber: number;
  readonly wireType: ProtoWireType;
  readonly varint?: bigint;
  readonly bytes?: Uint8Array;
}

export function readProtoFields(buffer: Uint8Array): readonly ProtoField[];

export interface TileFlags {
  readonly serverId: number;
  readonly ground: boolean;
  readonly blocking: boolean;
  readonly top: boolean;
  readonly clip: boolean;
  readonly bottom: boolean;
  readonly unmove: boolean;
  readonly avoid: boolean;
  readonly elevation: number;
  readonly floorChange: 'down' | 'north' | 'south' | 'east' | 'west' | 'up' | null;
}

export interface TileFlagsTable {
  readonly schemaVersion: number;
  readonly sourceCommit: string;
  readonly appearancesSha256: string;
  readonly itemsXmlSha256: string;
  readonly entries: readonly TileFlags[];
}

export function parseAppearanceFlags(appearancesDat: Uint8Array): readonly TileFlags[];
export function readFloorChanges(itemsXml: string): ReadonlyMap<number, TileFlags['floorChange']>;
export function buildTileFlagsTable(
  appearancesDat: Uint8Array,
  itemsXml: string,
  sourceCommit: string,
): TileFlagsTable;
export function encodeTileFlagsTable(table: TileFlagsTable): string;
```

`entries` é ordenado estritamente por `serverId`.

CLI: `node tools/tile-flags/cli.ts build [--check] --source-root <path> --output <path>`. Com
`--check`, não escreve nada e devolve exit 1 se o conteúdo gerado divergir do arquivo em disco,
imprimindo o primeiro offset divergente.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada, e instalar dependências.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb04-03-tile-flags main
git worktree add C:\Kaezan\kaezan-huntbound-pb04-03-tile-flags codex/pb04-03-tile-flags
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-03-tile-flags install --prefer-offline
```

- [ ] **2. Escrever testes RED do leitor de protobuf, sobre bytes construídos à mão.**

Não abra o arquivo de 4,8 MB nesta etapa. Monte buffers pequenos no próprio teste e prove:

- varint de um byte, de múltiplos bytes e no limite de 64 bits;
- wire type 2 devolve o slice exato dos bytes;
- wire type 1 (64 bits) e 5 (32 bits) são pulados com o tamanho certo;
- campo desconhecido de qualquer wire type é pulado sem quebrar a leitura dos seguintes;
- tag com wire type inválido (3 ou 4) lança erro com mensagem própria;
- buffer truncado no meio de um varint lança erro em vez de devolver lixo;
- buffer truncado no meio de um length-delimited lança erro;
- mensagem aninhada é lida recursivamente e devolve os campos do filho.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-03-tile-flags exec vitest run tools/tile-flags
```

Esperado: RED por módulo ausente.

- [ ] **3. Implementar `readProtoFields`; obter GREEN.**

- [ ] **4. Escrever testes RED de `parseAppearanceFlags`, ainda sobre bytes construídos à mão.**

Construa um `Appearances` sintético com três objetos: um chão (`bank`), um bloqueante (`unpass`) e um
desenhado acima (`top`). Prove que cada flag é lida, que a ausência de flag vira `false`, que a
elevação ausente vira `0`, e que um objeto sem `id` é rejeitado com erro próprio. Prove também que um
campo desconhecido dentro de `AppearanceFlags` não corrompe a leitura das flags conhecidas.

Confirme antes os números de campo lendo `appearances.proto`; se algum número divergir do assumido, o
`.proto` do snapshot vence e a divergência entra no relatório.

- [ ] **5. Implementar `parseAppearanceFlags`; obter GREEN.**

- [ ] **6. Escrever testes RED de `readFloorChanges`.**

Use XML sintético inline. Prove: `floorchange` `down` e `north` são lidos; item sem `floorchange`
fica ausente do mapa; valor desconhecido lança erro nomeando o id e o valor; `fromid`/`toid` em faixa
expandem para todos os ids da faixa; o mesmo id declarado duas vezes com valores diferentes lança
erro.

- [ ] **7. Implementar `readFloorChanges`; obter GREEN.**

- [ ] **8. Escrever testes RED de `buildTileFlagsTable` e `encodeTileFlagsTable`.**

Prove: `entries` sai ordenado por `serverId`; um `floorchange` cujo id não existe em
`appearances.dat` lança erro em vez de virar entrada órfã; a codificação é canônica, com newline
final; codificar duas vezes a mesma tabela produz a mesma string.

- [ ] **9. Implementar as duas funções e a CLI; obter GREEN.**

- [ ] **10. Provar `serverId == clientId` sobre o snapshot real.**

Este é o passo que pode reprovar a hipótese central do playbook. Escreva um teste ou uma verificação
da CLI que, contra o snapshot real, confirme que todo `serverId` usado por `items.xml` como item de
mapa existe em `appearances.dat` com o mesmo número, e cruze pelo menos os cinco IDs já congelados
pelo PB-02 (`3031` entre eles).

A divergência é reportada com o código `HUNT_ID_MISMATCH`, nomeando o `serverId` e o que foi
encontrado.

Se a igualdade falhar, **pare**: toda a resolução de asset por `clientId` do PB-02 depende dela, e a
correção é uma decisão de supervisor, não uma adaptação silenciosa nesta task.

- [ ] **11. Gerar a tabela e congelar o hash.**

```powershell
node tools/tile-flags/cli.ts build --source-root C:\Kaezan\kaezan-huntbound\references\canary --output packages/content/src/generated/tile-flags.json
node tools/tile-flags/cli.ts build --check --source-root C:\Kaezan\kaezan-huntbound\references\canary --output packages/content/src/generated/tile-flags.json
```

A segunda execução deve devolver exit 0 sem escrever. Grave o SHA-256 no sidecar e acrescente os dois
arquivos-fonte a `packages/content/src/sources/canary-157e6f9e.json` com seus hashes, no formato que o
arquivo já usa.

- [ ] **12. Registrar scripts e exclusão de formatação.**

Acrescente ao `package.json` da raiz `"content:tileflags:check"` apontando para a CLI com
`--check` e `--source-root-env HUNTBOUND_CANARY_SOURCE`. Ele **não** entra em `check` nem em
`verify`, porque depende de um snapshot ausente em checkout limpo; a verificação que entra no gate é
a comparação do sidecar `.sha256` contra o arquivo, que não precisa do snapshot. Acrescente essa
comparação a `content:check`.

Se o Biome quiser reformatar `tile-flags.json`, acrescente-o a `biome.json` no mesmo padrão já usado
por `packages/test-fixtures/simulation/pb03`. Nunca reformate o arquivo à mão.

- [ ] **13. Documentar.**

Acrescente a `docs/content/MAP_REGION_CONTRACT.md` a seção de flags: origem de cada campo, a regra de
que colisão é exatamente `unpass`, a tabela de `floorchange`, o formato canônico e a política de
regeneração.

- [ ] **14. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-03-tile-flags exec vitest run tools/tile-flags
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-03-tile-flags typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-03-tile-flags exec biome check tools/tile-flags packages/content
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-03-tile-flags format:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-03-tile-flags verify
git -C C:\Kaezan\kaezan-huntbound-pb04-03-tile-flags diff --check
```

- [ ] **15. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-03-tile-flags add tools/tile-flags packages/content package.json biome.json docs
git -C C:\Kaezan\kaezan-huntbound-pb04-03-tile-flags commit -m "feat: derive tile flags from the local snapshot"
```

Em modo paralelo, não edite `STATE.md`: deixe PB-04-06 consolidar o handoff.

- [ ] **16. Integrar e limpar.**

Modo serial:

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb04-03-tile-flags
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb04-03-tile-flags
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb04-03-tile-flags
```

Modo paralelo: remova a worktree limpa após o commit e preserve a branch para PB-04-06.

## Critérios de aceite

- [ ] O leitor de protobuf é próprio, sem dependência externa, e trata varint, os quatro wire types
      válidos, campo desconhecido e buffer truncado com teste próprio.
- [ ] As flags foram provadas sobre bytes construídos à mão antes de tocar no arquivo real.
- [ ] `floorchange` cobre os seis valores, faixas `fromid`/`toid` e conflito duplicado.
- [ ] `serverId == clientId` está provado sobre o snapshot real, incluindo os IDs do PB-02.
- [ ] `tile-flags.json` é canônico, tem sidecar `.sha256` e `--check` devolve exit 0 na segunda
      execução.
- [ ] O source lock registra `appearances.dat` e `items.xml` com hash.
- [ ] Colisão é exatamente `unpass`; nenhum outro flag participa.
- [ ] `corepack pnpm verify` passa antes e depois da integração.

## Condições de parada

**Pare imediatamente** se `serverId != clientId` para qualquer id de mapa: a decisão pertence ao
supervisor. Pare também se `appearances.proto` do snapshot não corresponder ao binário; se
`appearances.dat` exigir descompressão ou container além do protobuf; ou se `floorchange` apresentar
valor fora do conjunto congelado.

## Persistência e relatório final

Registre contagem de testes, número de entradas da tabela, hashes gerados, comandos/exit codes,
modelo/effort, modo de conclusão e a próxima task elegível. Não recorte mapa nem antecipe PB-04-04.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-04\tasks\PB-04-03-gerar-tabela-de-flags-de-tile.md

Leia o STATE.md do playbook PB-04 e apenas os arquivos indicados pela task. Crie a branch/worktree
indicada e rode "corepack pnpm install --prefer-offline" dentro dela antes de qualquer gate.

Escreva um leitor de protobuf proprio e minimo, sem dependencia externa. Comece por RED sobre bytes
construidos a mao; so toque no appearances.dat real depois que o leitor estiver verde. Prove que
serverId == clientId no snapshot e PARE E REPORTE se essa igualdade falhar.

Gere tile-flags.json canonico com sidecar .sha256, confirme idempotencia com --check, execute os
gates, atualize o handoff conforme o modo declarado, commite, integre por fast-forward na main no
modo serial, reverifique e limpe worktree/branch removendo o diretorio antes do prune.

Não parseie OTBM, não recorte região, não toque no kernel, assets, cena ou input. Se surgir decisão
não coberta, pare e registre o bloqueio. Não inicie a próxima task.
```
