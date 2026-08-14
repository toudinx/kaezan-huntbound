# PB-04-01 — Selecionar e congelar a hunt

**Status inicial:** pending

**Classe da tarefa:** decisão de conteúdo com evidência executável — o checklist do roteiro é
normativo e a medição substitui a opinião

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; escalonamento somente por gatilho objetivo registrado

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** não. É a primeira task do playbook e congela parâmetros que todas as outras leem.

## Objetivo

Congelar a bounding box, os andares, as criaturas e o orçamento da hunt
`hunt:tibia:venore-rotworm-cave`, provando por medição sobre o snapshot local que ela cumpre o
checklist de seleção do roteiro. Não extrair mapa, não escrever contratos e não tocar no kernel.

## Resultado esperado

Um documento de seleção congelado e um arquivo de seleção legível por máquina, ambos versionados, e
uma ferramenta que revalida a seleção contra o snapshot e falha com diagnóstico quando qualquer
premissa deixar de valer.

## Dependências

- PB-03 fechado por PB-03-08.
- Snapshot local presente em `references/canary/**`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-04/STATE.md`, seção “Fatos medidos no snapshot local”;
3. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`, seção “Contrato para escolher a primeira hunt”;
4. `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`, seções “Hunt escolhida” e
   “Orçamento da região”;
5. `docs/content/generated/PB-01-CATALOG.md`;
6. `packages/content/src/selections/pb-01-contract-coverage.json` como referência de formato.

## Decisões congeladas

- A hunt é `hunt:tibia:venore-rotworm-cave`. Escolher outra exige parar e reportar.
- Tetos: ≤ 3 andares, ≤ 96 × 96 tiles por andar.
- Toda criatura da tabela de spawn deve existir no catálogo PB-01. Hoje isso significa apenas
  `creature:tibia:rotworm`; qualquer outra espécie dentro da box é **excluída** da tabela, com o
  motivo registrado, e nunca importada aqui.
- A bounding box é declarada em coordenadas absolutas Tibia e convertida para coordenadas locais com
  origem no canto `(minX, minY)` do andar mais alto extraído.
- `references/` não é copiado para o repositório em nenhuma hipótese.
- A seleção registra a contagem esperada de transições derrubadas; o valor congelado aqui é o que
  PB-04-04 verifica.

## Escopo permitido

```text
docs/content/PB-04-SELECTION.md
packages/content/src/selections/pb-04-venore-rotworm-cave.json
tools/hunt-selection/**
package.json
docs/playbooks/PB-04/STATE.md
```

## Fora de escopo

- ler ou parsear o OTBM, `appearances.dat` ou qualquer binário;
- gerar região, camadas, colisão ou transições;
- contratos, schemas Zod, kernel, assets, app e browser;
- importar criatura, item ou spell novo para o catálogo.

## Interfaces produzidas

`packages/content/src/selections/pb-04-venore-rotworm-cave.json`:

```json
{
  "key": "hunt:tibia:venore-rotworm-cave",
  "displayName": "Venore Rotworm Cave",
  "sourceUrl": "https://tibiaroute.com/br/hunting-places/<slug-real>",
  "recommendedLevel": 8,
  "soloVocation": "vocation:tibia:knight",
  "region": {
    "minX": 0,
    "minY": 0,
    "maxX": 0,
    "maxY": 0,
    "floors": [8, 9]
  },
  "creatures": ["creature:tibia:rotworm"],
  "excludedCreatures": [{ "name": "", "reason": "absent from PB-01 catalog", "count": 0 }],
  "expectedSpawnGroups": 0,
  "expectedSpawnSlots": 0,
  "expectedDroppedTransitions": 0,
  "budget": { "maxFloors": 3, "maxWidth": 96, "maxHeight": 96 }
}
```

Os zeros acima são o esqueleto do schema, não valores aceitáveis: a task preenche cada um com o
número medido. `minX`, `minY`, `maxX` e `maxY` são absolutos e inclusivos.

Ferramenta. `HuntSelection` é o tipo TypeScript do JSON acima e mora em `tools/hunt-selection`;
PB-04-04 o importa de lá por caminho relativo, como `tools/replay` já importa `packages/**`:

```ts
export interface HuntSelectionRegion {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly floors: readonly number[];
}

export interface HuntSelection {
  readonly key: string;
  readonly displayName: string;
  readonly sourceUrl: string;
  readonly recommendedLevel: number;
  readonly soloVocation: string;
  readonly region: HuntSelectionRegion;
  readonly creatures: readonly string[];
  readonly excludedCreatures: readonly {
    readonly name: string;
    readonly reason: string;
    readonly count: number;
  }[];
  readonly expectedSpawnGroups: number;
  readonly expectedSpawnSlots: number;
  readonly expectedDroppedTransitions: number;
  readonly budget: {
    readonly maxFloors: number;
    readonly maxWidth: number;
    readonly maxHeight: number;
  };
}

export interface HuntSelectionDiagnostic {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export interface HuntSelectionReport {
  readonly ok: boolean;
  readonly width: number;
  readonly height: number;
  readonly floors: readonly number[];
  readonly spawnGroups: number;
  readonly spawnSlots: number;
  readonly creatureNames: readonly string[];
  readonly diagnostics: readonly HuntSelectionDiagnostic[];
}

export function validateHuntSelection(
  selection: unknown,
  monsterXml: string,
  catalogCreatureKeys: readonly string[],
): HuntSelectionReport;
```

Diagnósticos obrigatórios: `HUNT_REGION_OUT_OF_BUDGET`, `HUNT_UNKNOWN_CREATURE`,
`HUNT_SPAWNTIME_NOT_DIVISIBLE`, `HUNT_EMPTY_REGION`. Ordenados por `path` e depois por `code`.

CLI: `node tools/hunt-selection/cli.ts check --selection <path> --source-root <path>`, exit 0 quando
`ok`, exit 1 com diagnósticos legíveis caso contrário. O source root vem de `--source-root` ou de
`HUNTBOUND_CANARY_SOURCE`, jamais de path literal escrito no repositório.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada, e instalar dependências.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb04-01-hunt-selection main
git worktree add C:\Kaezan\kaezan-huntbound-pb04-01-hunt-selection codex/pb04-01-hunt-selection
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-01-hunt-selection install --prefer-offline
```

A instalação resolve do store local em segundos e não altera `pnpm-lock.yaml`. Sem ela, todo gate
falha por `node_modules` ausente.

- [ ] **2. Medir a região antes de escrever qualquer arquivo.**

Rode um script descartável que leia `data-otservbr-global/world/otservbr-monster.xml` e responda,
para candidatas de bounding box em torno de `x ∈ (32800, 33150)`, `y ∈ (31950, 32300)`:

- grupos e slots de Rotworm por andar;
- todas as espécies presentes na box, com contagem;
- largura e altura resultantes.

Escolha a menor box que contenha um agrupamento contíguo de rotworms em `z = 8` e `z = 9`, caiba em
96 × 96 e mantenha as espécies estranhas no menor número possível. Registre os números no relatório.
O script é descartável e **não** é commitado.

- [ ] **3. Escrever testes RED de `validateHuntSelection`.**

Use XML sintético inline nos testes, nunca o arquivo de 9,8 MB. Cubra:

- seleção válida devolve `ok: true`, com `width`, `height`, `spawnGroups` e `spawnSlots` corretos;
- box de 97 tiles de largura → `HUNT_REGION_OUT_OF_BUDGET` em `path` `region.maxX`;
- quatro andares → `HUNT_REGION_OUT_OF_BUDGET` em `path` `region.floors`;
- criatura fora do catálogo e fora de `excludedCreatures` → `HUNT_UNKNOWN_CREATURE`;
- a mesma criatura declarada em `excludedCreatures` → sem diagnóstico, e ausente de `creatureNames`;
- `spawntime="90"` converte para `1800` ticks; `spawntime="0.03"` → `HUNT_SPAWNTIME_NOT_DIVISIBLE`,
  porque 30 ms não é múltiplo de 50 ms; `spawntime="abc"` → `HUNT_SPAWNTIME_NOT_DIVISIBLE` com
  mensagem distinta de valor não numérico. Segundo inteiro sempre converte, e o teste registra isso
  explicitamente para que o diagnóstico não seja confundido com código morto;
- box sem nenhum spawn → `HUNT_EMPTY_REGION`;
- dois diagnósticos no mesmo `path` saem ordenados por `code`.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-01-hunt-selection exec vitest run tools/hunt-selection
```

Esperado: RED por módulo ausente.

- [ ] **4. Implementar `validateHuntSelection` e a CLI; obter GREEN.**

- [ ] **5. Escrever a seleção com os números medidos.**

Preencha `packages/content/src/selections/pb-04-venore-rotworm-cave.json` com os valores do passo 2.
`expectedDroppedTransitions` ainda não é mensurável aqui: declare `0` e registre no documento que
PB-04-04 é quem o confirma ou o corrige com causa. Essa é a única exceção autorizada.

- [ ] **6. Rodar a CLI contra o snapshot real.**

```powershell
node tools/hunt-selection/cli.ts check --selection packages/content/src/selections/pb-04-venore-rotworm-cave.json --source-root C:\Kaezan\kaezan-huntbound\references\canary
```

Esperado: exit 0. Se falhar, ajuste a box — nunca o teto.

- [ ] **7. Escrever `docs/content/PB-04-SELECTION.md`.**

O documento cumpre item a item o checklist do roteiro: URL individual, nome e nível recomendado,
compatibilidade solo com Knight, existência de todas as criaturas no snapshot, localização e
extraibilidade da região, existência de tiles/objetos/outfits/efeitos no dump local, ausência de
dependência de party/quest/world event, e caber no budget da ADR-001. Cada item traz o número ou o
fato que o sustenta, não uma afirmação.

- [ ] **8. Registrar o script no `package.json` da raiz.**

Acrescente `"hunt:selection:check"` apontando para a CLI com a seleção congelada e
`--source-root-env HUNTBOUND_CANARY_SOURCE`. **Não** o acrescente a `check` nem a `verify`: ele
depende de um snapshot que não existe em checkout limpo. Documente essa escolha no relatório.

- [ ] **9. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-01-hunt-selection exec vitest run tools/hunt-selection
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-01-hunt-selection exec biome check tools/hunt-selection packages/content
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-01-hunt-selection format:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-01-hunt-selection typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-01-hunt-selection verify
git -C C:\Kaezan\kaezan-huntbound-pb04-01-hunt-selection diff --check
```

- [ ] **10. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-01-hunt-selection add docs packages/content tools/hunt-selection package.json
git -C C:\Kaezan\kaezan-huntbound-pb04-01-hunt-selection commit -m "docs: freeze the first hunt selection"
```

- [ ] **11. Integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb04-01-hunt-selection
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb04-01-hunt-selection
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb04-01-hunt-selection
```

`git worktree remove` falha com "Directory not empty" por causa de `node_modules`; por isso a remoção
é por `Remove-Item` seguida de `prune`.

## Critérios de aceite

- [ ] A seleção declara URL, nível, vocação solo, box absoluta, andares, criaturas e orçamento.
- [ ] Cada item do checklist do roteiro tem número ou fato que o sustenta.
- [ ] `width ≤ 96`, `height ≤ 96` e `floors.length ≤ 3` estão provados pela ferramenta.
- [ ] Toda criatura da tabela existe no catálogo PB-01; as excluídas têm motivo e contagem.
- [ ] A CLI devolve exit 0 contra o snapshot real e exit 1 com diagnósticos ordenados quando a
      premissa quebra.
- [ ] `hunt:selection:check` existe e está **fora** de `check` e `verify`, com justificativa
      registrada.
- [ ] Nenhum byte de `references/` entrou no repositório.
- [ ] `corepack pnpm verify` passa antes e depois da integração.

## Condições de parada

Pare e reporte se: nenhuma box de 96 × 96 contiver agrupamento jogável de rotworms nos dois andares;
a região exigir criatura ausente do catálogo para fazer sentido; o `otservbr-monster.xml` não
corresponder ao OTBM presente; ou o checklist do roteiro exigir dado que o snapshot não contém.

## Persistência e relatório final

Registre a box escolhida, os números medidos, as espécies excluídas, comandos e exit codes,
modelo/effort efetivos, modo de conclusão e a próxima task elegível. Atualize `STATE.md` com a seção
`## PB-04-01 — handoff concluído`.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-04\tasks\PB-04-01-selecionar-e-congelar-a-hunt.md

Leia o STATE.md do playbook PB-04 e apenas os arquivos indicados pela task. Crie a branch/worktree
indicada e rode "corepack pnpm install --prefer-offline" dentro dela antes de qualquer gate.

Meça a região no snapshot local antes de escrever arquivo, comece por RED nos testes da ferramenta
de validação, e só então congele a seleção com os números medidos. Nenhum byte de references/ entra
no repositório. Execute todos os gates, atualize o handoff, commite, integre por fast-forward na
main, reverifique e limpe worktree/branch removendo o diretório antes do prune.

Não parseie OTBM ou appearances.dat, não escreva contratos, kernel, assets, cena ou input. Se surgir
decisão não coberta, pare e registre o bloqueio. Não inicie a próxima task.
```
