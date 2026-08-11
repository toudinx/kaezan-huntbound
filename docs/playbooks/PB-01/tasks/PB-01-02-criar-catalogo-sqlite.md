# PB-01-02 — Criar catálogo SQLite, migrations e repository

**Status inicial:** pending

**Classe da tarefa:** implementação complexa — persistência, migrations e atomicidade

**Modelo sugerido:** GPT-5.6 Sol `xhigh`

**Validador sugerido:** Claude Opus 5

**Rota:** `game-studio:web-game-foundations` + `superpowers:test-driven-development` +
`superpowers:verification-before-completion`.

**Paralelismo:** não. Depende de PB-01-01 integrada.

## Objetivo

Criar o catálogo relacional reconstruível do Huntbound e uma porta/repository transacional que
persista somente contratos validados, com foreign keys, uniqueness, migrations monotônicas,
rollback integral e detecção de órfãos.

## Resultado esperado

Um SQLite temporário pode ser criado do zero, migrado, preenchido em transação e consultado sem SQL
fora do adapter. Repetir migrations é no-op; qualquer referência inválida ou colisão desfaz toda a
unidade de trabalho.

## Dependências e leitura mínima

1. esta task e `docs/playbooks/PB-01/STATE.md`;
2. `docs/playbooks/PB-01/README.md`;
3. `packages/contracts/src/content/**` integrado por PB-01-01;
4. `docs/content/IDENTITY_POLICY.md`;
5. `tools/architecture/dependency-policy.json` e checker.

PB-01-01 deve estar `done` na `main` e a árvore deve estar limpa.

## Decisões congeladas

- Adapter/CLI Node vive em `tools/content-catalog/`; runtime não importa SQLite.
- `better-sqlite3@13.0.3`, `@types/better-sqlite3@7.6.13` e `@types/node@24.13.3` são devDependencies
  raiz exatas. `node:sqlite` não é usado.
- `PRAGMA foreign_keys = ON`, `journal_mode = WAL` para arquivo e transações explícitas.
- GUID é `TEXT PRIMARY KEY`; timestamps são ISO-8601 UTC somente para migrations/proveniência, não
  participam de exportação determinística.
- Migrations e operações são texto versionado; `.sqlite`, `-wal` e `-shm` ficam ignorados.
- Repository recebe `ContentBundle`/entidades validados; não faz parsing de fonte.

## Escopo permitido

```text
tools/content-catalog/database/**
tools/content-catalog/repository/**
tools/content-catalog/migrations/**
tools/content-catalog/**/*.test.ts
tools/content-catalog/tsconfig.json
tools/content-catalog/vitest.config.ts
packages/content/src/catalog/ContentCatalogPort.ts
packages/content/package.json
package.json
pnpm-lock.yaml
.gitignore
docs/playbooks/PB-01/STATE.md
```

## Interfaces produzidas

```ts
export interface ContentCatalogTransactionPort {
  upsertBundle(bundle: ContentBundle): void;
  listOrphanEntities(): readonly ContentGuid[];
}

export interface ContentCatalogPort {
  migrate(): void;
  transaction<T>(operation: (tx: ContentCatalogTransactionPort) => T): T;
  readBundle(sliceKey: string): ContentBundle;
  countRows(): Readonly<Record<string, number>>;
}

export interface OpenContentCatalog extends ContentCatalogPort {
  close(): void;
}

export function openContentCatalog(path: string): OpenContentCatalog;
```

O migration `001_initial_catalog.sql` cria, no mínimo:

```text
schema_migrations
source_snapshots, source_files
content_slices, content_entities, content_aliases
content_slice_roots, content_slice_entities
vocations
creatures, creature_attacks, creature_defenses, creature_summons
items, loot_entries
spells, spell_vocations
```

Todas as tabelas filhas referenciam `content_entities(guid)`; loot referencia creature e item;
summon referencia owner e summoned creature; spell-vocation referencia ambos. Use `CHECK` para
kind, escalas de chance, magnitudes, counts e unidades. Use `ON DELETE RESTRICT` para conteúdo.

## Execução RED/GREEN

- [ ] **1. Criar `codex/pb01-02-sqlite-catalog` e worktree
  `C:\Kaezan\kaezan-huntbound-pb01-02-sqlite-catalog` a partir de `main`.**
- [ ] **2. Instalar dependências exatas na raiz.**

```powershell
corepack pnpm add -Dw better-sqlite3@13.0.3 @types/better-sqlite3@7.6.13 @types/node@24.13.3
corepack pnpm --filter @huntbound/content add '@huntbound/contracts@workspace:*'
```

- [ ] **3. Escrever teste de migrations e confirmar RED.**

Em DB temporário: primeira migração cria todas as tabelas/índices; segunda execução não muda
`schema_migrations`; `PRAGMA foreign_keys` retorna `1`.

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts
```

- [ ] **4. Implementar runner de migrations.**

Ordene arquivos pelo prefixo numérico, calcule SHA-256, recuse mesmo ID com hash diferente e aplique
cada arquivo em transação. Não use ORM nem migration global.

- [ ] **5. Escrever testes de constraints/repository e confirmar RED.**

Cubra: bundle mínimo persiste; stable key/GUID/source tuple duplicados falham; loot sem item falha;
summon sem criatura falha; kind filho incompatível falha; erro no último insert deixa contagens
iguais ao baseline; reimport idêntico é idempotente; entidade sem slice aparece como órfã.

- [ ] **6. Implementar repository mínimo e obter GREEN.**

O port fica em `packages/content/src/catalog/ContentCatalogPort.ts`; o adapter em `tools/` o
implementa. Prepared statements ficam privados ao adapter. `transaction()` não aceita promessa; uma operação
assíncrona deve ser rejeitada pelo tipo. `readBundle()` reconstrói arrays ordenados por `stableKey` e
IDs de relação.

- [ ] **7. Provar reconstrução.**

Crie dois DBs temporários independentes, aplique as migrations e compare `sqlite_schema` normalizado
e lista de migration IDs/hashes. Remova os arquivos temporários pelo próprio teste.

- [ ] **8. Atualizar `.gitignore`.**

Adicione somente padrões específicos necessários, por exemplo `.cache/content-catalog/` e
`*.sqlite-wal`/`*.sqlite-shm`; preserve regras existentes.

- [ ] **9. Rodar gates.**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts
corepack pnpm exec tsc --project tools/content-catalog/tsconfig.json
corepack pnpm architecture:check
corepack pnpm check
git diff --check
```

- [ ] **10. Atualizar STATE, commitar, integrar e limpar.**

Commit: `feat: add transactional content catalog`.

Depois do commit, faça `git merge --ff-only codex/pb01-02-sqlite-catalog` na `main`, repita os dois
comandos específicos de teste/typecheck, remova a worktree validada, `git worktree prune` e
`git branch -d codex/pb01-02-sqlite-catalog`.

## Critérios de aceite

- [ ] Schema relacional completo e migrations idempotentes.
- [ ] Foreign keys e checks são testados por falhas reais.
- [ ] Rollback impede estado parcial.
- [ ] Repository não vaza SQL nem aceita dados não validados.
- [ ] DB temporário é reconstruível; nenhum arquivo SQLite está rastreado.
- [ ] Tooling não entra no grafo browser/simulation.
- [ ] Commit integrado e recursos temporários removidos.

## Condições de parada

Pare se for necessário instalar servidor/global, usar API experimental, enfraquecer foreign keys,
versionar blob SQLite, definir gameplay ou alterar contracts sem retornar a PB-01-01.

## Relatório final

Liste schema/migrations, constraints provadas, rollback/idempotência, comandos, commit, integração,
limpeza e PB-01-03 como próxima task.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound.
Use GPT-5.6 Sol xhigh e as skills game-studio:web-game-foundations,
superpowers:test-driven-development e superpowers:verification-before-completion.
Execute somente C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-01\tasks\PB-01-02-criar-catalogo-sqlite.md.
Crie a branch/worktree exatas, implemente migrations e repository por RED/GREEN, use apenas as
dependências exatas da task, rode gates, atualize STATE, commite, integre por fast-forward e limpe
worktree/branch. Não crie fixtures, parsers, dados reais ou gameplay. Não inicie PB-01-03.
```
