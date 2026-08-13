# PB-01 — Relatório final de aceite

**APPROVED_WITH_WARNINGS**

**Data de fechamento:** 2026-08-13 · auditoria PB-01-07 · Claude Code / Opus 5, reasoning alto
(effort efetivo não exposto pelo ambiente)

**Branch da auditoria:** `codex/pb01-07-integrated-gate`, worktree
`C:\Kaezan\kaezan-huntbound-pb01-07-integrated-gate`, criada da `main` em `5e22a4d`.

Nenhuma falha bloqueante foi reproduzida. Curadoria, identidade, integridade referencial,
determinismo, isolamento de runtime e o gate raiz estão comprovados com evidência fresca desta task.
Os três warnings abaixo possuem evidência, impacto, owner e gatilho de reabertura, e nenhum deles
cria risco concreto para PB-02. **PB-02 fica elegível.**

O gate adota severidade proporcional. `BLOCKED` fica reservado a falha de source lock, FK, rollback,
órfão, idempotência, byte identity, runtime boundary ou `verify`. Nenhuma delas ocorreu.

## Modelos, effort e validador

| Papel | Efetivo | Observação |
|---|---|---|
| Executor da auditoria | Claude Code / Opus 5, reasoning alto | Modelo sugerido pela task; sem fallback |
| Validador independente | **Indisponível nesta sessão** — registrado como desvio | Ver W1 |
| Rota de skills | `superpowers:verification-before-completion` aplicada | `game-studio:web-game-foundations` não está instalada nesta sessão — ver W1 |

Todo veredito abaixo vem de comando executado nesta task. Evidência histórica de PB-01-01 a
PB-01-06 foi tratada como contexto, não como prova.

## Baseline confirmado

| Item | Valor |
|---|---|
| `git status --short` na `main` e na worktree | vazio (exit 0) |
| HEAD de partida | `5e22a4d docs: record PB-01-06 handoff` |
| PB-01-01…06 ancestrais de HEAD | `0b465e4c`, `429d98a2`, `1ee75ca4`, `530cc31d`, `348dcd8`, `e70603d` — todos `True` |
| Node / pnpm | `v24.14.0` / `11.21.0` via Corepack |
| SHA-256 de `pnpm-lock.yaml` | `f1a1f7b741c04f9a810bdc5bb7ee8ef3daec7132d34d6eb19317c797ebc5620f` |
| Commit do snapshot Canary | `157e6f9e21318bd3033eea553fe9275b429faf72` |
| Porta 4173 | livre antes de `verify` (`Get-NetTCPConnection` sem resultado) |
| Sete source paths do lock | `data/XML/vocations.xml`, `data/items/items.xml`, `data/scripts/spells/attack/berserk.lua`, `.../vermins/rotworm.lua`, `.../humans/amazon.lua`, `.../humanoids/orc_shaman.lua`, `.../reptiles/snake.lua` |

`corepack pnpm install --frozen-lockfile` terminou com exit 0 sem alterar o lockfile.

## Instalação congelada e reconstrução limpa

A cache `.cache/content-catalog` foi removida somente após o guard de path da task confirmar
`C:\Kaezan\kaezan-huntbound-pb01-07-integrated-gate\.cache\content-catalog`.

| Comando | Exit |
|---|---:|
| `corepack pnpm install --frozen-lockfile` | 0 |
| `corepack pnpm content:canary:check` | 0 |
| `corepack pnpm content:catalog:rebuild` | 0 |
| `corepack pnpm content:catalog:validate` | 0 |
| `corepack pnpm content:generate:check` | 0 |

## Determinismo

Os três artefatos gerados foram copiados para diretório temporário, a cache específica foi removida,
o catálogo foi reconstruído do zero e regerado.

| Artefato | SHA-256 passe 1 | SHA-256 passe 2 | Bytes idênticos | Tamanho |
|---|---|---|---|---:|
| `packages/content/src/generated/pb-01-contract-coverage.json` | `d9df3338…f3` | `d9df3338…f3` | sim | 28.019 B |
| `packages/content/src/generated/pb-01-contract-coverage.sha256` | `eba6c14e…06` | `eba6c14e…06` | sim | 65 B |
| `docs/content/generated/PB-01-CATALOG.md` | `6d2bcf90…4a` | `6d2bcf90…4a` | sim | 15.152 B |

Golden hash do bundle runtime:
`d9df3338743365710fed991c185976b9dbbd59e6d5f9d43a679550db8fa154f3`.

A segunda geração deixou `git status --short` e `git diff --stat` vazios (exit 0).

### Reconstrução sem Canary

Com `references/` desanexado da worktree:

| Comando | Exit | Leitura |
|---|---:|---|
| `content:catalog:rebuild` | 0 | o banco reconstrói só da operação versionada |
| `content:catalog:validate` | 0 | catálogo materializado bate com a operação |
| `content:generate:check` | 0 | golden hash inalterado, `d9df3338…f3` |
| `content:canary:check` | **1** | `Snapshot root cannot be resolved: …\references\canary` |

Isto prova as duas metades do critério: o catálogo não depende do Canary para reconstruir, e o
import check compara explicitamente contra o Canary, falhando quando ele não está presente. Com
`references/` restaurado, `content:canary:check` volta a exit 0.

## Provas controladas

Executadas por harness temporário sob `.cache/` (ignorado pelo Git), removido antes do gate raiz.
Nenhuma fonte real foi editada; cada mutação viveu apenas em cópias temporárias.

| # | Prova | Resultado | Evidência |
|---|---|---|---|
| 1 | Hash de source lock alterado falha | PASS | `SHA-256 mismatch for data/XML/vocations.xml: expected 000…001, got 693a1790…50` |
| 1b | Lock real permanece intacto | PASS | sha em disco continua `693a1790…50` |
| 2 | Sexta raiz no slice falha | PASS | `selection.root-set-mismatch: Selection must contain exactly Knight, Berserk, Rotworm, Amazon, and Orc Shaman as roots` |
| 3 | Loot sem item falha por diagnóstico | PASS | removido `item:tibia:dagger` → `Unknown loot item item:tibia:dagger` |
| 3b | Falha faz rollback integral | PASS | `loot_entries 29→29`, `items 27→27`, `content_entities 33→33` |
| 3c | FK loot→item ativa no SQLite | PASS | `PRAGMA foreign_keys=1`; insert com `item_guid` inexistente → `FOREIGN KEY constraint failed` |
| 4 | Entidade sem slice falha como órfã | PASS | `Catalog contains orphan entities: 11111111-2222-3333-4444-555555555555` |
| 5a | Controle: Lua sintética allowlisted parseia | PASS | `Fixture Rotbeast` |
| 5 | Nó Lua não allowlisted falha com linha/coluna | PASS | `lua.unsupported-call: Only mType:register(monster) is allowlisted`, `line: 9, column: 1` — único diagnóstico emitido |
| 6 | Segunda aplicação da mesma operação é no-op | PASS | row counts e hash canônico do bundle idênticos |

**10/10 provas passaram** (exit 0).

### Row counts do catálogo materializado

```text
content_entities 33   content_slice_entities 33   content_identity_ledger 33
content_entity_facets 78   content_slice_roots 5   content_slices 1
creatures 4   items 27   spells 1   vocations 1
loot_entries 29   creature_attacks 7   creature_resistances 40
creature_summons 1   creature_conditions 1   creature_defenses 1   creature_immunities 1
vocation_families 1   vocation_family_members 1   vocation_skill_multipliers 7
content_slice_vocation_families 1   spell_vocation_families 1   spell_source_vocation_refs 2
source_files 7   source_snapshots 1   schema_migrations 1
content_aliases 0   content_alias_registry 0
```

## Auditoria do catálogo e da documentação

Consultas diretas ao SQLite materializado, mais comparação com o JSON gerado e com
`docs/content/generated/PB-01-CATALOG.md`. **12/12 checagens passaram** (exit 0).

### Matriz de facets

| Entidade | Facets | Papel |
|---|---|---|
| `vocation:tibia:knight` | identity, progression | raiz |
| `spell:tibia:berserk` | identity, spell | raiz |
| `creature:tibia:rotworm` | identity, stats, appearance, combat, loot | raiz |
| `creature:tibia:amazon` | identity, stats, appearance, combat, loot | raiz |
| `creature:tibia:orc-shaman` | identity, stats, appearance, combat, loot | raiz |
| `creature:tibia:snake` | identity, stats, appearance, combat, **conditions** | dependência parcial |
| 27 itens de loot | identity, item | dependências alcançáveis |

- Raízes materializadas: exatamente as cinco congeladas.
- Snake: `conditions` presente com `poison` (`total_damage 15`, `interval_ms 4000`); **0 linhas de
  loot**, exclusão deliberada confirmada no banco, não só na documentação.
- Snake entra só como dependência alcançável: única aresta de summon é
  `orc-shaman → snake` (`count 3`, `chance 2000` bp).
- 78 projeções de facet, **0** sem consumer/rationale; **0** entidades materializadas sem projeção.
- 33 entidades, **0** GUIDs duplicados, **0** stable keys duplicadas.
- **0** órfãos, **0** itens não alcançáveis por loot, **0** criaturas não-raiz sem summon que as
  alcance. Zero extras.
- Família vs. entidade: existe uma única família, `vocation-family:huntbound:knight` (display
  `Knight`), distinta de `vocation:tibia:knight`. As duas referências cruas da Berserk (`knight` e
  `elite knight`) projetam para essa família; **0** entidades Elite Knight materializadas e **0**
  linhas em `content_aliases` / `content_alias_registry`. Refs não viraram aliases.
- Documentação alinhada: as 33 entidades do banco aparecem no JSON gerado e são nomeadas em
  `PB-01-CATALOG.md`; conjunto de entidades JSON == conjunto do catálogo.

## Licença e boundaries

| Verificação | Resultado |
|---|---|
| `git ls-files references` | sem saída — nada de `references/` rastreado |
| `git check-ignore references/canary/data/XML/vocations.xml` | `.gitignore:2:references/` — exclusão confirmada |
| Lua/XML rastreados | 9 arquivos, **todos** sob `packages/test-fixtures/canary/pb01/` |
| Licença | `GPL-2.0-only`, `references/canary/LICENSE` |
| Hash da licença | travado `189b1af9…7b`, lido `189b1af9…7b` — confere |
| Fixtures × fontes Canary | **0 de 9** fixtures rastreadas coincidem byte a byte com qualquer um dos 7 hashes do source lock; as fixtures são sintéticas (nomes `Fixture …`) |

### Buscas de fronteira

- `references/canary|\.lua|\.xml|better-sqlite3|node:fs` em `apps/game`, `packages/simulation`,
  `packages/content/src/runtime`: **nenhuma violação**. O único acerto é
  `contentRegistry.test.ts:40`, um literal de fixture dentro do teste que prova a remoção.
- `sourcePath|sourceSha256|snapshot|aliases|provenance|ImportProjectionAudit|sourceVocation` em
  `packages/content/src/generated` e `.../runtime`: **nenhuma violação**. Todos os acertos estão em
  `contentRegistry.ts:38-40`, que é exatamente o código que destrói `source` e `aliases`, e em
  `contentRegistry.test.ts`, que assere a remoção. O JSON gerado foi varrido por token
  independentemente (`sourcePath`, `sourceSha256`, `snapshot`, `provenance`, `aliases`,
  `projectionAudits`, `rawReference`, `.lua`, `.xml`, `157e6f9e`): **0 vazamentos**.
- `CuratedCatalogWriter` fora de testes: `ImportCanarySlice.ts`, `ApplyCuratedOperation.ts` e a
  definição interna `internal/CuratedCatalogWriter.ts`. A composition root
  `createContentCatalogApplication.ts` está na allowlist da regra mas não precisa nomear o tipo —
  a lista efetiva é mais restrita que a esperada, não mais larga. Nenhuma referência em
  `apps/game` ou `packages/simulation`; o tipo não é exportado por
  `packages/content/src/index.ts`, então pacotes externos não o alcançam pelo nome do pacote.

### Prova viva da regra de arquitetura

Um writer extra foi criado em `packages/content/src/rogueWriter.ts` e depois removido:

| Forma | `architecture:check` | Leitura |
|---|---:|---|
| `import type { CuratedCatalogWriter } from "./application/internal/CuratedCatalogWriter.ts"` | **1** | regra morde: `CuratedCatalogWriter import is only allowed in ImportCanarySlice.ts, ApplyCuratedOperation.ts, or the composition root` |
| `import("./application/internal/CuratedCatalogWriter.ts").CuratedCatalogWriter` | 0 | lacuna da regra — ver W2 |

Após a remoção, `git status --short` ficou vazio e `architecture:check` voltou a exit 0.

## Gate raiz

```text
corepack pnpm verify   -> exit 0
git diff --check       -> exit 0
git status --short     -> vazio (exit 0)
```

Detalhe do `verify` (uma execução, porta 4173 reservada e livre):

| Etapa | Resultado |
|---|---|
| `format:check` | 128 arquivos, 0 correções |
| `architecture:check` | exit 0 |
| `typecheck` | 7 projetos, todos `Done` |
| `test` | 6 + 11 + 21 + 22 + 53 testes, 0 falhas |
| `build` | 7 projetos, `dist/game` gerado |
| `content:check` | rebuild + validate + generate --check, exit 0 |
| `qa:browser` | 7 testes Playwright passaram em 11,0 s |

Baseline conhecido reconfirmado: `biome check .` continua reprovando com exatamente **1** erro,
`lint/suspicious/noExportsInTest` em `tests/e2e/shell.spec.ts` — anterior ao PB-01 e fora dos seus
paths. `biome check` restrito aos paths do PB-01 (81 arquivos) passa com exit 0: **nenhuma violação
nova foi introduzida**.

## Critérios de aceite do README

| Critério | Veredito | Evidência |
|---|---|---|
| GUIDs, stable keys, aliases e proveniência com schemas e constraints verificáveis | atendido | 33 entidades, 0 GUID/key duplicados; `content_identity_ledger` com CHECK de kind×prefixo; 0 aliases |
| Catálogo reconstruído do zero por migrations e operações versionadas | atendido | rebuild sem cache e **sem `references/`**, exit 0 |
| FKs ligadas e importação inválida com rollback integral | atendido | provas 3, 3b, 3c |
| Slice só com raízes declaradas, facets aprovados e dependências alcançáveis; zero órfãos ou campos sem consumidor | atendido | 5 raízes, 78 facets com consumer/rationale, 0 órfãos, 0 extras |
| Parsers XML/Lua estáticos, estritos, cobertos por RED/GREEN | atendido | 53 testes de content; prova 5 com linha/coluna e controle 5a |
| Nenhum Lua/XML real do Canary rastreado ou executado | atendido | 9 fixtures sintéticas, 0 coincidências byte a byte, `references/` ignorado |
| Hashes do source lock conferem com o snapshot congelado | atendido | `content:canary:check` exit 0; licença confere; prova 1 falha ao adulterar |
| Mesma importação duas vezes não altera linhas | atendido | prova 6 |
| Duas reconstruções limpas produzem JSON byte-identical e mesmo golden SHA-256 | atendido | 3 artefatos byte-idênticos; `d9df3338…f3` |
| Documentação e bundle derivam da mesma visão consultada | atendido | conjunto de entidades JSON == catálogo; 33/33 nomeadas nos docs |
| Runtime só consome `RuntimeContentBundle`/registry | atendido | buscas de fronteira sem violação; 0 tokens vazados no JSON |
| `corepack pnpm verify` passa no resultado integrado | atendido | exit 0 |
| PB-02 resolve chaves estáveis sem depender de Canary | atendido | rebuild/validate/generate com `references/` ausente, exit 0 |

## Critérios de aceite da task

| Critério | Veredito |
|---|---|
| Gates e provas com evidência fresca e reproduzível | atendido |
| Catálogo só com conteúdo curado e dependências alcançáveis | atendido |
| Facets/consumer/rationale por campo; Snake com poison e sem loot | atendido |
| Família Knight distinta da entidade Knight; refs não viram aliases | atendido |
| Banco reconstrói sem Canary; import check compara com Canary | atendido |
| Idempotência, rollback, FK, órfãos e byte identity demonstrados | atendido |
| Zero código/fonte Canary rastreado; zero provenance/aliases em runtime | atendido |
| Regra de arquitetura prova que nenhum writer adicional contorna os dois services | atendido com warning (W2) |
| Relatório não contradiz README/STATE/roteiro | atendido |
| Integração e limpeza após reverificação | atendido |

## Warnings

Nenhum warning bloqueia PB-02. Todos possuem evidência, impacto, owner e gatilho de reabertura.

### W1 — Auditoria sem validador independente e sem a skill de rota

- **Evidência:** a task pede validador frontier diferente do executor e a rota
  `game-studio:web-game-foundations`. Nesta sessão só havia o executor Claude Opus 5, e a skill não
  está instalada — a listagem de skills disponíveis não a contém.
- **Impacto:** baixo. Toda conclusão vem de comando com exit code, row count ou hash reproduzível,
  não de julgamento do modelo. As provas negativas foram desenhadas para falhar de forma explícita.
- **Owner:** supervisor do playbook.
- **Gatilho de reabertura:** se PB-02 encontrar defeito de contrato no slice que esta auditoria
  deveria ter pego, reexecutar PB-01-07 com validador independente.

### W2 — Regra de writer não cobre a forma `import("…").Tipo`

- **Evidência:** prova viva acima. `packages/content/src/rogueWriter.ts` com
  `import type { … } from "…"` reprova (`architecture:check` exit 1); o mesmo arquivo escrito como
  `import("…").CuratedCatalogWriter` passa (exit 0). A regex em
  `tools/architecture/content-boundaries.ts:98` exige `import` seguido de espaço.
  `tools/content-catalog/transaction.type-test.ts` já usa essa forma e por isso não é sinalizado.
- **Impacto:** baixo e **não é bypass de runtime**. `import("…").T` é uma type query do TypeScript:
  produz apenas tipo, nunca um valor. Para escrever no catálogo é preciso uma instância real do
  writer, que só sai da composition root e dos dois application services. Além disso
  `CuratedCatalogWriter` não é reexportado por `packages/content/src/index.ts`, então nenhum pacote
  o alcança pelo nome do pacote. Hoje há zero writers extras no repositório.
- **Owner:** dono de `tools/architecture`.
- **Gatilho de reabertura:** endurecer a regex antes de qualquer playbook que adicione um novo
  caminho de escrita no catálogo, ou imediatamente se um arquivo fora da allowlist passar a
  referenciar o writer por type query.

### W3 — `format:check` varre `.cache/`, que é ignorado pelo Git

- **Evidência:** `biome.json` exclui `references`, `node_modules`, `dist`, `coverage`,
  `test-results`, `playwright-report` e os dois diretórios gerados, mas não `.cache`. Durante esta
  auditoria, scripts temporários em `.cache/pb0107-proofs/` fizeram `corepack pnpm verify` reprovar
  em `format:check` antes de qualquer código de produção rodar. Movidos para fora da árvore, o
  `verify` passou com exit 0.
- **Impacto:** baixo e só de ergonomia. Nenhum artefato de produção é afetado e nada disso entra em
  commit, já que `.gitignore` cobre `.cache/`. O risco é diagnóstico enganoso: um `.cache/` local
  com TypeScript reprova o gate raiz por motivo alheio ao projeto.
- **Owner:** dono da configuração de tooling.
- **Gatilho de reabertura:** adicionar `!.cache` a `biome.json` quando o próximo playbook precisar
  de scratch local dentro da árvore.

### Nota operacional (não é warning)

Worktrees novas não recebem `references/`, porque o diretório é ignorado pelo Git e existe só no
checkout principal. Esta auditoria criou uma junction
`…-pb01-07-integrated-gate\references → C:\Kaezan\kaezan-huntbound\references`, confirmou que ela
permanece ignorada (`git check-ignore` exit 0, `git status` vazio) e a usou apenas para as provas
que exigem o Canary real. Tasks futuras que rodem `content:canary:check` fora do checkout principal
precisam repetir esse passo. Nenhum arquivo Canary entrou no commit.

## Riscos remanescentes para PB-02

Nenhum risco concreto. O bundle runtime é resolvível por chave estável sem Canary, sem SQLite e sem
tooling; o golden hash é estável entre reconstruções limpas; e o slice cobre vocação, spell, quatro
criaturas e 27 itens com facets declarados. PB-02 consome esse contrato sem tocar em proveniência.

## Fechamento

- Veredito: **APPROVED_WITH_WARNINGS**.
- PB-01: `done`.
- PB-02: **elegível**.
- Commit de fechamento: `docs: close PB-01 curated content gate`.
- Nenhum código, schema, conteúdo ou tooling foi alterado por esta task. Nenhuma task
  `PB-01-FIX-01` é necessária.
