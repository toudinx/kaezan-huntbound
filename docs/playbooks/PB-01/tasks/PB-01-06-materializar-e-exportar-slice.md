# PB-01-06 — Materializar catálogo e exportar o slice curado

**Status inicial:** pending

**Classe da tarefa:** implementação complexa — orquestração, integridade e determinismo ponta a ponta

**Modelo sugerido:** GPT-5.6 Sol `xhigh`

**Validador sugerido:** Claude Opus 5

**Rota:** `game-studio:web-game-foundations` + `superpowers:test-driven-development` +
`superpowers:verification-before-completion`.

**Paralelismo:** não. Integrador único de PB-01-04/05 quando a onda paralela tiver sido ativada.

## Objetivo

Conectar source lock, seleção, parsers, schemas e repository por `ImportContentSlice`; fechar apenas
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
git cherry-pick codex/pb01-04-xml-importers
git cherry-pick codex/pb01-05-lua-importers
```

Somente conflito em `docs/playbooks/PB-01/STATE.md` está previamente autorizado: preserve ambos os
handoffs e marque as duas tasks done. Qualquer conflito funcional, manifest ou lockfile bloqueia; não
resolva por descarte. As branches 04/05 só são apagadas depois do gate integrado desta task.

## Decisões congeladas

- `ImportContentSlice` é o único writer de conteúdo curado.
- Ordem: verificar origem → parsear raízes → descobrir refs → carregar dependências allowlisted →
  validar schemas → calcular GUIDs → persistir operação em transação → validar órfãos → exportar.
- Closure inclui Snake e itens de loot efetivamente referenciados por Rotworm, Amazon, Orc Shaman e
  Snake. Não segue relações textuais, bestiary locations ou catálogo adjacente.
- A operação durável vive em
  `packages/content/catalog/operations/0001-pb01-contract-coverage.json` e contém o bundle normalizado,
  sem código/paths executáveis.
- SQLite materializado vive em `.cache/content-catalog/huntbound-content.sqlite` e é descartável.
- Export JSON usa UTF-8, LF, indentação de dois espaços, keys/arrays em ordem canônica e exatamente
  uma newline final.
- Documentação é gerada; edição manual do catálogo gerado deve falhar no modo `--check`.

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
tools/content-catalog/export/**
tools/content-catalog/**/*.test.ts
docs/content/generated/**
package.json
pnpm-lock.yaml (somente se scripts exigirem resolução já fixada; sem nova dependência)
docs/playbooks/PB-01/STATE.md
```

## Interfaces produzidas

```ts
export interface ImportContentSliceDependencies {
  readonly readSource(path: string): string;
  readonly repository: ContentCatalogPort;
}

export function importContentSlice(
  selection: ContentSliceDefinition,
  lock: SourceSnapshotLock,
  dependencies: ImportContentSliceDependencies,
): { readonly bundle: ContentBundle; readonly diagnostics: readonly ContentDiagnostic[] };

export interface ContentRegistry {
  getVocation(key: ContentKey): VocationDefinition;
  getCreature(key: ContentKey): CreatureDefinition;
  getItem(key: ContentKey): ItemDefinition;
  getSpell(key: ContentKey): SpellDefinition;
  has(key: ContentKey): boolean;
}

export function createContentRegistry(bundle: ContentBundle): ContentRegistry;
```

CLI/scripts obrigatórios:

```json
{
  "content:catalog:rebuild": "node tools/content-catalog/cli.ts rebuild",
  "content:catalog:validate": "node tools/content-catalog/cli.ts validate",
  "content:canary:check": "node tools/content-catalog/cli.ts import-canary --check",
  "content:generate": "node tools/content-catalog/cli.ts generate",
  "content:generate:check": "node tools/content-catalog/cli.ts generate --check"
}
```

`content:generate` escreve; `content:generate:check` gera em memória e falha se JSON/hash/docs
divergirem. O gate raiz usa somente a variante `:check`.

## Execução RED/GREEN

- [ ] **1. Criar branch/worktree e integrar a onda, se aplicável.** Worktree:
  `C:\Kaezan\kaezan-huntbound-pb01-06-materialize-slice`.
- [ ] **2. Escrever teste de dependency closure e confirmar RED.** Comece com as cinco raízes; exija
  Snake e loot items usados, zero extras, erro agregado para refs ausentes/ambíguas e ciclo seguro.
- [ ] **3. Implementar closure pura.** Use queue/set por stable source identity. Cada entidade
  incorporada registra `root` ou `dependency` e `requiredBy`; não inferir dependência por substring.
- [ ] **4. Escrever teste transacional de `ImportContentSlice` e confirmar RED.** Prove rollback em
  parser/schema/ref/constraint e idempotência por contagem/hashes antes/depois.
- [ ] **5. Implementar application service.** Borda filesystem é injetada. Nenhum import de
  `node:*` entra em `packages/content`.
- [ ] **6. Executar import real controlado.** Confirme source lock, importe somente o slice e revise
  manualmente a lista final de entities/dependencies. Se houver dependência inesperada, pare antes de
  versionar a operação.
- [ ] **7. Persistir operação curada e provar rebuild sem Canary.** Depois de gerar a operação,
  renomeie/injete um snapshotRoot inexistente no teste de rebuild; migrations + operação devem criar
  o mesmo DB sem ler `references/`.
- [ ] **8. Escrever testes de serialização/golden e confirmar RED.** Em dois diretórios temporários,
  reconstrua DB, consulte, serialize e compare bytes/SHA-256. Inverta ordem de inserts e exija saída
  igual.
- [ ] **9. Implementar export JSON, hash e docs.** Gere:
  - `packages/content/src/generated/pb-01-contract-coverage.json`;
  - `packages/content/src/generated/pb-01-contract-coverage.sha256`;
  - `docs/content/generated/PB-01-CATALOG.md`.
- [ ] **10. Implementar registry browser-safe e testes.** Lookup ausente lança erro contendo key e
  slice; constructor valida bundle uma vez e não permite mutação do objeto armazenado.
- [ ] **11. Adicionar scripts e gate de paths.** `architecture:check` ou checker específico deve
  rejeitar imports de `tools/content-catalog`, `references/canary`, `.lua`, `.xml` ou SQLite por
  `apps/game`, `packages/simulation` e `packages/content/src/runtime`.
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
corepack pnpm build
corepack pnpm check
git diff --check
```

- [ ] **14. Atualizar STATE, commitar, integrar e limpar.** Commit
  `feat: materialize curated content slice`. Fast-forward na `main`, reexecute os quatro scripts
  content + `typecheck` + `architecture:check`, remova worktree/branch 06. Se houve onda paralela e o
  resultado contém os dois commits, apague também branches 04/05 com `git branch -d` e execute
  `git worktree prune`.

## Critérios de aceite

- [ ] Closure contém somente raízes + dependências justificadas e zero órfãos.
- [ ] Import real confere commit/hashes e nunca executa Lua.
- [ ] Operação versionada reconstrói DB sem `references/`.
- [ ] Reimport é idempotente; falha faz rollback.
- [ ] Dois rebuilds produzem JSON/hash/docs idênticos.
- [ ] Registry é browser-safe e tooling não entra no bundle.
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
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol xhigh.
Use game-studio:web-game-foundations, superpowers:test-driven-development e
superpowers:verification-before-completion.
Execute somente C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-01\tasks\PB-01-06-materializar-e-exportar-slice.md.
Confirme PB-01-04/05 integradas ou aplique o protocolo paralelo exato. Faça closure curada,
transação, operação versionada, rebuild SQLite, JSON/hash/docs determinísticos e registry browser-safe
por RED/GREEN. Rode todos os gates, atualize STATE, commite, integre e limpe. Não migre conteúdo
extra, não execute Lua e não inicie PB-01-07.
```
