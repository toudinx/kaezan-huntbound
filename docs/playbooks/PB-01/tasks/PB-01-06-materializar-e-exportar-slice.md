# PB-01-06 — Materializar catálogo e exportar o slice curado

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — integração de contratos já congelados

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; GPT-5.6 Sol `xhigh` ou Claude Code/Opus 5 somente se
determinismo, rollback ou boundaries não puderem ser provados, ou após outro gatilho de escalonamento

**Rota:** `game-studio:web-game-foundations` + `superpowers:test-driven-development` +
`superpowers:verification-before-completion`.

**Paralelismo:** não. Integrador único de PB-01-04/05 quando a onda paralela tiver sido ativada.

## Objetivo

Conectar source lock, seleção, parsers, schemas e repository por `ImportCanarySlice`; fechar apenas
as dependências alcançáveis; persistir uma operação curada versionada; reconstruir SQLite; gerar JSON,
golden hash, registry browser-safe e documentação a partir da mesma visão do catálogo.

## Resultado esperado

Um comando explícito compara o snapshot real congelado com a operação curada. Outro reconstrói o DB
sem Canary usando migrations + operação versionada. Duas reconstruções independentes produzem o
mesmo JSON e SHA-256; reimport idêntico é no-op; conteúdo extra, ausente ou órfão falha.

## Dependências e leitura mínima

1. esta task, `README.md` e `STATE.md`;
2. contratos, catalog repository, source lock e seleção;
3. adapters XML/Lua e seus mappings;
4. `docs/content/IDENTITY_POLICY.md` e `PB-01-SELECTION.md`;
5. `package.json`, `packages/content/package.json` e architecture policy.

PB-01-04 e PB-01-05 devem estar integradas ou disponíveis nas branches paralelas exatas.

## Integração da onda opcional

No fluxo serial, crie `codex/pb01-06-materialize-slice` a partir da `main` que já contém PB-01-04/05.
Se a onda paralela foi registrada em `STATE.md`, crie a mesma branch a partir da `main` pós-PB-01-03
e incorpore, nesta ordem:

```powershell
git merge --no-ff codex/pb01-04-xml-importers -m "merge: integrate PB-01 XML importers"
git merge --no-ff codex/pb01-05-lua-importers -m "merge: integrate PB-01 Lua importers"
```

Somente conflito em `docs/playbooks/PB-01/STATE.md` está previamente autorizado: preserve ambos os
handoffs e marque as duas tasks done. Qualquer conflito funcional, manifest ou lockfile bloqueia; não
resolva por descarte. Merges preservam ancestry para `git branch -d`; as branches 04/05 só são
apagadas depois do gate integrado desta task.

## Decisões congeladas

- `ImportCanarySlice` e `ApplyCuratedOperation` são os únicos serviços com acesso ao writer interno;
  ambos passam pela mesma validação/transação. Nenhum repository writer sai no entrypoint.
- Ordem: verificar origem → parsear raízes → descobrir refs → carregar dependências allowlisted →
  validar schemas → calcular GUIDs → persistir operação em transação → validar órfãos → exportar.
- Closure inclui Snake como summon com facets `identity/stats/appearance/combat/conditions`; loot de
  Snake fica explicitamente fora. Itens de loot são fechados somente para Rotworm, Amazon e Orc
  Shaman. Não segue relações textuais, bestiary locations ou catálogo adjacente.
- Nomes de vocation `knight` e `elite knight` de Berserk são referências cruas distintas projetadas
  para `vocation-family:huntbound:knight`. Essa família é uma identidade Huntbound separada da
  entidade Knight `vocation:tibia:knight`; Elite Knight (source ID 8) não vira alias nem entidade sem
  consumidor. A operação de catálogo preserva as duas refs cruas para auditoria; runtime recebe só a
  relação spell-family.
- A operação durável vive em
  `packages/content/catalog/operations/0001-pb01-contract-coverage.json` e contém o bundle normalizado,
  sem código/paths executáveis.
- SQLite materializado vive em `.cache/content-catalog/huntbound-content.sqlite` e é descartável.
- Export JSON usa UTF-8, LF, indentação de dois espaços, keys/arrays em ordem canônica e exatamente
  uma newline final.
- Documentação é gerada; edição manual do catálogo gerado deve falhar no modo `--check`.
- Operação/DB usam `CatalogContentBundle`; JSON/registry usam `RuntimeContentBundle`, que omite
  source paths, hashes, aliases e provenance.

## Escopo permitido

```text
packages/content/src/application/**
packages/content/src/runtime/**
packages/content/src/generated/**
packages/content/catalog/operations/**
packages/content/src/index.ts
packages/content/tsconfig.json
tools/content-catalog/cli.ts
tools/content-catalog/commands/**
tools/content-catalog/composition/**
tools/content-catalog/export/**
tools/content-catalog/**/*.test.ts
tools/architecture/check-boundaries.ts
tools/architecture/check-boundaries.test.ts
tools/architecture/dependency-policy.json
docs/content/generated/**
package.json
pnpm-lock.yaml (somente se scripts exigirem resolução já fixada; sem nova dependência)
docs/playbooks/PB-01/STATE.md
```

## Fora de escopo

- importar Elite Knight, tratá-la como alias de Knight ou ampliar entidade/facet fora da seleção;
- exportar provenance/aliases para runtime;
- expor writer/repository SQLite fora da composição CLI;
- gameplay, assets, save, editor ou atualização automática Canary.

## Interfaces produzidas

```ts
export interface ImportCanarySliceDependencies {
  readonly readSource(path: string): string;
  readonly writer: CuratedCatalogWriter;
}

export function importCanarySlice(
  selection: ContentSliceDefinition,
  lock: SourceSnapshotLock,
  dependencies: ImportCanarySliceDependencies,
): { readonly bundle: CatalogContentBundle; readonly diagnostics: readonly ContentDiagnostic[] };

export function applyCuratedOperation(
  operations: readonly [CatalogContentBundle, ...CatalogContentBundle[]],
  writer: CuratedCatalogWriter,
): void;

export interface ContentRegistry {
  getVocationFamily(key: VocationFamilyKey): VocationFamilyDefinition;
  getVocation(key: ContentKey): VocationDefinition;
  getCreature(key: ContentKey): CreatureDefinition;
  getItem(key: ContentKey): ItemDefinition;
  getSpell(key: ContentKey): SpellDefinition;
  has(key: ContentKey): boolean;
}

export function projectRuntimeBundle(bundle: CatalogContentBundle): RuntimeContentBundle;
export function createContentRegistry(bundle: RuntimeContentBundle): ContentRegistry;
```

CLI/scripts obrigatórios:

```json
{
  "content:catalog:rebuild": "node tools/content-catalog/cli.ts rebuild",
  "content:catalog:validate": "node tools/content-catalog/cli.ts validate",
  "content:canary:check": "node tools/content-catalog/cli.ts import-canary --check",
  "content:generate": "node tools/content-catalog/cli.ts generate",
  "content:generate:check": "node tools/content-catalog/cli.ts generate --check",
  "content:check": "corepack pnpm content:catalog:rebuild && corepack pnpm content:catalog:validate && corepack pnpm content:generate:check"
}
```

`content:generate` escreve; `content:generate:check` gera em memória e falha se JSON/hash/docs
divergirem. `check` e `verify` da raiz passam a chamar `corepack pnpm content:check`; nenhum deles
chama `content:canary:check`, pois checkout reproduzível não depende de `references/`.

## Execução RED/GREEN

- [ ] **1. Criar branch/worktree e integrar a onda, se aplicável.** Worktree:
  `C:\Kaezan\kaezan-huntbound-pb01-06-materialize-slice`.

```powershell
git -C C:\Kaezan\kaezan-huntbound status --short
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb01-06-materialize-slice -b codex/pb01-06-materialize-slice main
```

No modo paralelo, execute dentro da worktree 06 os dois `git merge --no-ff` definidos em
“Integração da onda opcional” antes do RED. No modo serial, não execute esses merges.
- [ ] **2. Escrever teste de dependency/facet closure e confirmar RED.** Comece com as cinco raízes;
  exija Snake com os cinco facets aprovados, loot items somente das três roots, zero extras, erro
  agregado para refs/facets ausentes ou ambíguos e ciclo seguro. Todo campo emitido deve apontar para
  um facet com consumer/rationale.
- [ ] **2a. Testar a família de vocação e confirmar RED.** Knight pertence a
  `vocation-family:huntbound:knight`; Berserk permite essa família; `knight` e `elite knight` ficam
  como duas refs cruas de auditoria no catálogo. Exija falha para família ausente, alias falso de
  Elite Knight ou vazamento das refs cruas ao runtime.
- [ ] **3. Implementar closure pura.** Use queue/set por stable source identity. Cada entidade
  incorporada registra `root` ou `dependency` e `requiredBy`; não inferir dependência por substring.
- [ ] **4. Escrever testes transacionais dos dois serviços e confirmar RED.** Prove rollback em
  parser/schema/ref/constraint e idempotência por contagem/hashes antes/depois.
- [ ] **5. Implementar application services.** `ImportCanarySlice` e `ApplyCuratedOperation` usam a
  mesma função privada de validação+transação. `ApplyCuratedOperation` aceita um array não vazio e
  aplica todos os bundles na mesma transação, permitindo evolução coordenada de facets
  compartilhados; o caso comum passa um elemento. Borda filesystem é injetada. Nenhum import de
  `node:*` entra em `packages/content`; writer não sai no entrypoint.
- [ ] **6. Executar import real controlado.** Confirme source lock, importe somente o slice e revise
  manualmente a lista final de entities/dependencies. Se houver dependência inesperada, pare antes de
  versionar a operação.
- [ ] **7. Persistir operação curada e provar rebuild sem Canary.** Depois de gerar a operação,
  renomeie/injete um snapshotRoot inexistente no teste de rebuild; migrations + operação devem criar
  o mesmo DB sem ler `references/`.
- [ ] **8. Escrever testes de serialização/golden e confirmar RED.** Em dois diretórios temporários,
  reconstrua DB, consulte, serialize e compare bytes/SHA-256. Inverta ordem de inserts e exija saída
  igual.
- [ ] **9. Implementar projeção runtime, export JSON, hash e docs.** Prove por schema/busca estrutural
  que runtime não contém `sourcePath`, `sourceSha256`, `snapshot`, `aliases`, provenance,
  `ImportProjectionAudit` ou refs cruas de vocation. Gere:
  - `packages/content/src/generated/pb-01-contract-coverage.json`;
  - `packages/content/src/generated/pb-01-contract-coverage.sha256`;
  - `docs/content/generated/PB-01-CATALOG.md`.
- [ ] **10. Implementar registry browser-safe e testes.** Lookup ausente lança erro contendo key e
  slice; constructor valida bundle uma vez e não permite mutação do objeto armazenado.
- [ ] **11. Adicionar scripts e gates raiz/path.** Integre `content:check` em `check` e `verify` sem
  adicionar `content:canary:check`. `architecture:check` ou checker específico deve
  rejeitar imports de `tools/content-catalog`, `references/canary`, `.lua`, `.xml` ou SQLite por
  `apps/game`, `packages/simulation` e `packages/content/src/runtime`.
  Adicione também regra testada que permite importar `CuratedCatalogWriter` somente em
  `ImportCanarySlice.ts`, `ApplyCuratedOperation.ts` e na composição
  `tools/content-catalog/composition/createContentCatalogApplication.ts`; qualquer terceira
  referência falha com diagnóstico contendo importer e path proibido.
- [ ] **12. Rodar prova determinística completa.** Execute duas vezes, capturando hashes:

```powershell
corepack pnpm content:canary:check
corepack pnpm content:catalog:rebuild
corepack pnpm content:catalog:validate
corepack pnpm content:generate
corepack pnpm content:canary:check
corepack pnpm content:catalog:rebuild
corepack pnpm content:generate:check
```

O Git deve permanecer sem diff após a segunda passagem.

- [ ] **13. Rodar gates.**

```powershell
corepack pnpm --filter @huntbound/content test
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts
corepack pnpm typecheck
corepack pnpm architecture:check
rg -n "CuratedCatalogWriter" packages tools/content-catalog -g '!**/*.test.ts' -g '!**/*.spec.ts'
corepack pnpm build
corepack pnpm content:check
corepack pnpm exec biome check packages/content tools/content-catalog tools/architecture package.json
corepack pnpm format:check
git diff --check
```

- [ ] **14. Atualizar STATE, commitar, integrar e limpar.** Commit
  `feat: materialize curated content slice`. Fast-forward na `main`, reexecute os quatro scripts
  content + `typecheck` + `architecture:check`, remova worktree/branch 06. Se houve onda paralela e o
  resultado contém os dois commits, apague também branches 04/05 com `git branch -d` e execute
  `git worktree prune`.

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb01-06-materialize-slice add packages/content tools/content-catalog tools/architecture docs/content package.json pnpm-lock.yaml docs/playbooks/PB-01/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb01-06-materialize-slice commit -m "feat: materialize curated content slice"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb01-06-materialize-slice
corepack pnpm --dir C:\Kaezan\kaezan-huntbound content:catalog:rebuild
corepack pnpm --dir C:\Kaezan\kaezan-huntbound content:catalog:validate
corepack pnpm --dir C:\Kaezan\kaezan-huntbound content:canary:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound content:generate:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound architecture:check
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb01-06-materialize-slice
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb01-06-materialize-slice
```

Se a onda paralela foi usada, remova primeiro as worktrees 04/05 já limpas, execute `worktree prune`
e só então apague `codex/pb01-04-xml-importers` e `codex/pb01-05-lua-importers` com `branch -d`.

## Critérios de aceite

- [ ] Closure contém somente raízes + dependências justificadas e zero órfãos.
- [ ] Import real confere commit/hashes e nunca executa Lua.
- [ ] Elite Knight é referência crua auditável projetada para família Huntbound, não alias/entidade.
- [ ] Operação versionada reconstrói DB sem `references/`.
- [ ] Reimport é idempotente; falha faz rollback.
- [ ] Dois rebuilds produzem JSON/hash/docs idênticos.
- [ ] Runtime bundle não contém provenance/aliases; registry é browser-safe e tooling não entra no bundle.
- [ ] Architecture check executável limita imports de `CuratedCatalogWriter` aos dois serviços e à
  composition root permitida.
- [ ] Todos os gates e limpeza passam.

## Condições de parada

Pare se closure exigir conteúdo sem uso, source lock divergir, operação contiver código Canary,
determinismo depender de ordem do SQLite, runtime precisar de Node/SQLite ou integração paralela
tiver conflito funcional.

## Relatório final

Liste raízes/dependências finais, row counts, hash, prova de idempotência/rollback/rebuild, scripts,
commit, integração e limpeza. Indique PB-01-07; não declare PB-01 fechado.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh.
Use game-studio:web-game-foundations, superpowers:test-driven-development e
superpowers:verification-before-completion.
Não escale por cautela genérica; use Sol/Claude somente se determinismo, rollback ou boundaries não
puderem ser provados, ou após outro gatilho objetivo registrado no STATE.
Execute somente C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-01\tasks\PB-01-06-materializar-e-exportar-slice.md.
Confirme PB-01-04/05 integradas ou aplique o protocolo paralelo exato. Faça closure curada,
transação, operação versionada, rebuild SQLite, JSON/hash/docs determinísticos e registry browser-safe
por RED/GREEN. Rode todos os gates, atualize STATE, commite, integre e limpe. Não migre conteúdo
extra, não execute Lua e não inicie PB-01-07.
```
