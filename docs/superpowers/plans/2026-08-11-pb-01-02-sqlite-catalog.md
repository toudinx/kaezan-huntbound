# PB-01-02 SQLite Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o catálogo SQLite reconstruível e transacional do Huntbound, com migrations
monotônicas, round-trip completo de `CatalogContentBundle`, isolamento por slice e capability de
escrita restrita.

**Architecture:** O driver e todo SQL permanecem em `tools/content-catalog/`. Identidade durável é
global e permanente; payloads, proveniência, aliases e projeções são armazenados por slice, com
hashes canônicos para consistência de facets compartilhados. O package `@huntbound/content` define
as portas, mas somente a composition root futura pode obter a capability mutável.

**Tech Stack:** TypeScript 7.0.2, Node 24.14.0, pnpm 11.21.0, Vitest 4.1.10,
`better-sqlite3@13.0.3`, Zod via `@huntbound/contracts`, Biome 2.5.7.

## Global Constraints

- Executor: `gpt-5.6-luna` com reasoning effort `xhigh`.
- Validador independente: `gpt-5.6-sol` após implementação e gates locais.
- Criar `codex/pb01-02-sqlite-catalog` e worktree
  `C:\Kaezan\kaezan-huntbound-pb01-02-sqlite-catalog` a partir de `main`.
- Usar somente `better-sqlite3@13.0.3`, `@types/better-sqlite3@7.6.13` e
  `@types/node@24.13.3` como novas devDependencies raiz.
- Não alterar `packages/contracts/src/content/**` nem `packages/content/src/index.ts`.
- Não criar parsers, fixtures Canary, CLI final, export JSON, docs geradas, gameplay ou save.
- Todo código de produção nasce após teste RED observado; cada task termina com GREEN e commit.
- `PRAGMA foreign_keys = ON`; WAL apenas para banco em arquivo; transações explícitas.
- `transaction()` rejeita `PromiseLike` por tipo e runtime, proíbe nesting e invalida o `tx` ao
  término do callback.
- Nenhum arquivo `.sqlite`, `.sqlite-wal` ou `.sqlite-shm` pode ser rastreado.
- A especificação normativa é
  `docs/superpowers/specs/2026-08-11-pb-01-02-sqlite-catalog-design.md`.

## File Map

- `packages/content/src/catalog/ContentCatalogPort.ts`: porta pública de leitura.
- `packages/content/src/application/internal/CuratedCatalogWriter.ts`: porta interna síncrona de
  escrita.
- `tools/content-catalog/database/openDatabase.ts`: único ponto de abertura/configuração do driver.
- `tools/content-catalog/database/catalogErrors.ts`: erros estáveis de lifecycle/migration/slice.
- `tools/content-catalog/migrations/MigrationRunner.ts`: descoberta, hash e aplicação atômica.
- `tools/content-catalog/migrations/001_initial_catalog.sql`: schema relacional completo.
- `tools/content-catalog/repository/canonicalCatalog.ts`: validação adicional, canonicalização e
  hashes de facet.
- `tools/content-catalog/repository/SqliteContentCatalog.ts`: repository privado e transações.
- `tools/content-catalog/repository/openContentCatalog.ts`: wrapper público read-only.
- `tools/content-catalog/repository/internal/openMutableContentCatalog.ts`: factory mutável
  allowlisted.
- `tools/content-catalog/repository/catalogFixture.test-support.ts`: bundle sintético reutilizado
  pelos testes do adapter.
- `tools/content-catalog/testing/sqliteTestSupport.ts`: diretórios temporários, dump lógico,
  inspeção de schema/FKs e instrumentação de writes usados somente pelos testes.
- `tools/content-catalog/**/*.test.ts`: migrations, constraints, repository, lifecycle,
  reconstrução e boundaries.
- `tools/content-catalog/transaction.type-test.ts`: prova compilada de callback estritamente
  síncrono.

---

### Task 1: Worktree, dependências, configs e portas

**Files:**
- Create: `tools/content-catalog/tsconfig.json`
- Create: `tools/content-catalog/vitest.config.ts`
- Create: `tools/content-catalog/transaction.type-test.ts`
- Create: `packages/content/src/catalog/ContentCatalogPort.ts`
- Create: `packages/content/src/application/internal/CuratedCatalogWriter.ts`
- Modify: `packages/content/package.json`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `CatalogContentBundle`, `ContentGuid` de `@huntbound/contracts`.
- Produces: `ContentCatalogReadPort`, `CuratedCatalogTransactionWriter`,
  `CuratedCatalogWriter`.

- [ ] **Step 1: Criar branch/worktree e instalar dependências exatas**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb01-02-sqlite-catalog main
git worktree add C:\Kaezan\kaezan-huntbound-pb01-02-sqlite-catalog codex/pb01-02-sqlite-catalog
corepack pnpm add -Dw better-sqlite3@13.0.3 @types/better-sqlite3@7.6.13 @types/node@24.13.3
corepack pnpm --filter @huntbound/content add '@huntbound/contracts@workspace:*'
```

- [ ] **Step 2: Criar configs do tooling**

```json
// tools/content-catalog/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["node", "vitest/globals"] },
  "include": ["**/*.ts"]
}
```

```ts
// tools/content-catalog/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tools/content-catalog/**/*.test.ts'],
    pool: 'forks',
  },
});
```

- [ ] **Step 3: Escrever o type-test RED**

```ts
import type { CuratedCatalogWriter } from '../../packages/content/src/application/internal/CuratedCatalogWriter';

declare const writer: CuratedCatalogWriter;

writer.transaction(() => 1);

// @ts-expect-error async callbacks are forbidden
writer.transaction(async () => 1);

declare const unionResult: () => void | Promise<void>;
// @ts-expect-error any PromiseLike branch is forbidden
writer.transaction(unionResult);
```

- [ ] **Step 4: Rodar o typecheck e confirmar RED**

Run:

```powershell
corepack pnpm exec tsc --project tools/content-catalog/tsconfig.json
```

Expected: FAIL porque as portas ainda não existem.

- [ ] **Step 5: Implementar as portas mínimas**

```ts
// packages/content/src/catalog/ContentCatalogPort.ts
import type { CatalogContentBundle } from '@huntbound/contracts';

export interface ContentCatalogReadPort {
  readCatalogBundle(sliceKey: string): CatalogContentBundle;
  countRows(): Readonly<Record<string, number>>;
}
```

```ts
// packages/content/src/application/internal/CuratedCatalogWriter.ts
import type { CatalogContentBundle, ContentGuid } from '@huntbound/contracts';

export interface CuratedCatalogTransactionWriter {
  replaceCatalogBundle(bundle: CatalogContentBundle): void;
  listOrphanEntities(): readonly ContentGuid[];
}

export interface CuratedCatalogWriter {
  transaction<Operation extends (tx: CuratedCatalogTransactionWriter) => unknown>(
    operation: Operation &
      (Extract<ReturnType<Operation>, PromiseLike<unknown>> extends never
        ? unknown
        : never),
  ): ReturnType<Operation>;
}
```

- [ ] **Step 6: Rodar typecheck e package tests para confirmar GREEN**

```powershell
corepack pnpm exec tsc --project tools/content-catalog/tsconfig.json
corepack pnpm --filter @huntbound/content test
```

Expected: ambos exit 0; os `@ts-expect-error` são consumidos.

- [ ] **Step 7: Commit**

```powershell
git add package.json pnpm-lock.yaml packages/content/package.json packages/content/src/catalog packages/content/src/application/internal tools/content-catalog/tsconfig.json tools/content-catalog/vitest.config.ts tools/content-catalog/transaction.type-test.ts
git commit -m "feat: define content catalog ports"
```

---

### Task 2: Conexão, migration runner e schema inicial

**Files:**
- Create: `tools/content-catalog/database/catalogErrors.ts`
- Create: `tools/content-catalog/database/openDatabase.ts`
- Create: `tools/content-catalog/migrations/MigrationRunner.ts`
- Create: `tools/content-catalog/migrations/001_initial_catalog.sql`
- Create: `tools/content-catalog/migrations/MigrationRunner.test.ts`
- Create: `tools/content-catalog/testing/sqliteTestSupport.ts`

**Interfaces:**
- Consumes: path SQLite e diretório de migrations.
- Produces: `openDatabase(path)`, `applyMigrations(database, directory)`,
  `readAppliedMigrations(database)` e os helpers de teste abaixo.

```ts
export interface AppliedMigration {
  readonly id: number;
  readonly filename: string;
  readonly sha256: string;
}

export interface TemporaryCatalog {
  readonly directory: string;
  readonly path: string;
  cleanup(): void;
}

export function createTemporaryCatalogFile(): TemporaryCatalog;
export function createTemporaryMigrationDirectory(
  files: Readonly<Record<string, string>>,
): { readonly path: string; cleanup(): void };
export function foreignKeyViolations(database: Database.Database): readonly unknown[];
export function normalizedSqliteSchema(database: Database.Database): readonly string[];
export function logicalDump(database: Database.Database): string;
```

- [ ] **Step 1: Escrever testes RED de conexão e migrations**

```ts
it('enables foreign keys and applies the initial migration once', () => {
  const catalog = createTemporaryCatalogFile();
  const db = openDatabase(catalog.path);
  applyMigrations(db, migrationsDirectory);
  const first = readAppliedMigrations(db);
  applyMigrations(db, migrationsDirectory);

  expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
  expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
  expect(readAppliedMigrations(db)).toEqual(first);
  expect(first).toHaveLength(1);
});

it('does not force WAL for an in-memory database', () => {
  const db = openDatabase(':memory:');
  try {
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(db.pragma('journal_mode', { simple: true })).toBe('memory');
  } finally {
    db.close();
  }
});

it('rejects duplicate ids, retroactive ids, invalid filenames and changed hashes', () => {
  expect(() => applyFixtureMigrations({ '001_one.sql': '', '001_two.sql': '' })).toThrow(/duplicate/i);
  expect(() => applyFixtureMigrations({ 'bad.sql': '' })).toThrow(/filename/i);
  expect(() => applyRetroactiveMigration()).toThrow(/monotonic/i);
  expect(() => applyChangedMigration()).toThrow(/hash/i);
});

it('rolls back schema and migration row when SQL fails', () => {
  const before = snapshotSchemaAndMigrations();
  expect(() => applyFailingMigration('CREATE TABLE leaked(id); SELECT broken')).toThrow();
  expect(snapshotSchemaAndMigrations()).toEqual(before);
});
```

- [ ] **Step 2: Rodar os testes e confirmar RED**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts tools/content-catalog/migrations/MigrationRunner.test.ts
```

Expected: FAIL por módulos ausentes.

- [ ] **Step 3: Implementar conexão e runner mínimo**

```ts
export function openDatabase(path: string): Database.Database {
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  if (path !== ':memory:') db.pragma('journal_mode = WAL');
  return db;
}

const migrationName = /^(\d{3})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/;

export function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}
```

Implementar o runner com esta sequência fechada:

```text
1. readdir(directory) e rejeitar qualquer arquivo que não case com migrationName;
2. extrair ID decimal, rejeitar IDs repetidos e ordenar por ID;
3. readFile(path) como Buffer e calcular SHA-256 dos bytes originais;
4. carregar schema_migrations ordenada por id;
5. exigir arquivo e hash iguais para cada migration já aplicada;
6. exigir que todo ID novo seja maior que max(applied.id);
7. para cada migration nova, executar exec(sql) e INSERT schema_migrations em uma única
   database.transaction(() => undefined)();
8. retornar sem statements de escrita quando não houver migration nova.
```

- [ ] **Step 4: Criar o schema SQL completo**

O migration deve criar exatamente estas famílias de tabelas e chaves:

```sql
CREATE TABLE schema_migrations (
  id INTEGER PRIMARY KEY CHECK (id > 0),
  filename TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  applied_at TEXT NOT NULL
);

CREATE TABLE content_identity_ledger (
  guid TEXT PRIMARY KEY,
  stable_key TEXT NOT NULL UNIQUE,
  identity_source_system TEXT NOT NULL CHECK (identity_source_system = 'tibia'),
  entity_kind TEXT NOT NULL CHECK (entity_kind IN ('vocation','creature','item','spell')),
  source_id TEXT NOT NULL CHECK (length(trim(source_id)) > 0),
  first_seen_slice_key TEXT NOT NULL,
  UNIQUE(identity_source_system, entity_kind, source_id)
);

CREATE TABLE content_alias_registry (
  source_system TEXT NOT NULL CHECK (source_system = 'tibia'),
  alias TEXT NOT NULL,
  entity_guid TEXT NOT NULL REFERENCES content_identity_ledger(guid) ON DELETE RESTRICT,
  PRIMARY KEY(source_system, alias)
);
```

Além delas, criar explicitamente:

```text
source_snapshots((source_system='canary', snapshot) PK)
source_files((source_system, snapshot, source_path) PK, source_id, source_sha256 lowercase-hex64)
content_slices(slice_key PK, schema_version, content_version, objective, consumer,
               snapshot FK, dependency_mode='reachable-only', curation_state, export_version)
content_entities(guid PK/FK ledger, stable_key UNIQUE, entity_kind, identity_source_system,
                 source_id, kind/stable-key CHECK)
content_aliases((slice_key, source_system, alias) PK, entity_guid,
                FK registry + FK slice membership)
content_entity_facets((slice_key, entity_guid, facet) PK, payload_sha256 lowercase-hex64,
                      consumer, rationale, FK slice membership)
content_slice_roots((slice_key, entity_guid) PK, ordinal >= 0 UNIQUE per slice)
content_slice_entities((slice_key, entity_guid) PK, display_name, source tuple FKs)
content_slice_vocation_families((slice_key, family_key) PK, display_name)
vocation_families(family_key PK)
vocations((slice_key, entity_guid) PK, progression scalar columns)
vocation_family_members((slice_key, family_key, vocation_guid) PK)
vocation_skill_multipliers((slice_key, vocation_guid, skill) PK, multiplier >= 0 finite)
creatures((slice_key, entity_guid) PK, stats/appearance scalar columns)
creature_attacks((slice_key, creature_guid, ordinal) PK, discriminated attack columns)
creature_defenses((slice_key, creature_guid, ordinal) PK, discriminated defense columns)
creature_conditions((slice_key, creature_guid, ordinal) PK, kind/total_damage/interval_ms)
creature_summons((slice_key, creature_guid, ordinal) PK, target_guid/count/chance)
creature_resistances((slice_key, creature_guid, damage_type) PK, finite value)
creature_immunities((slice_key, creature_guid, ordinal) PK, immunity)
items((slice_key, entity_guid) PK, nullable item-facet columns)
loot_entries((slice_key, creature_guid, ordinal) PK, item_guid/chance/min/max)
spells((slice_key, entity_guid) PK, spell scalars + explicit area/formula columns)
spell_vocation_families((slice_key, spell_guid, family_key) PK)
spell_source_vocation_refs((slice_key, spell_guid, ordinal) PK,
                            raw_reference/relation/target_family_key)
```

Cada payload tipado tem FK composta para `content_slice_entities`, inclui `entity_kind` verificável
por FK/`CHECK`, e cada filho referencia o payload pai do mesmo slice. Loot/summon/family usam alvos
do mesmo slice. Aplicar `ON DELETE RESTRICT`, booleanos `0/1`, ordinals não negativos, counts
positivos, chances `0..10_000` ou `0..100_000`, hashes lowercase-hex64, números finitos/não
negativos conforme o contrato e `min <= max`.

- [ ] **Step 5: Rodar migration tests e confirmar GREEN**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts tools/content-catalog/migrations/MigrationRunner.test.ts
corepack pnpm exec tsc --project tools/content-catalog/tsconfig.json
```

- [ ] **Step 6: Commit**

```powershell
git add tools/content-catalog/database tools/content-catalog/migrations
git commit -m "feat: add monotonic catalog migrations"
```

---

### Task 3: Fixture sintético, validação persistível e canonicalização

**Files:**
- Create: `tools/content-catalog/repository/catalogFixture.test-support.ts`
- Create: `tools/content-catalog/repository/canonicalCatalog.ts`
- Create: `tools/content-catalog/repository/canonicalCatalog.test.ts`

**Interfaces:**
- Consumes: `unknown` na fronteira runtime.
- Produces: `validatePersistableBundle(input)`, `canonicalizeCatalogBundle(bundle)`,
  `canonicalJson(value)`, `facetPayloadHash(entity, facet)`.

O arquivo de fixture também exporta todos os construtores de casos usados nas Tasks 3–6:

```ts
export type BundleMutation = (draft: MutableCatalogContentBundle) => void;
export function createCatalogBundleFixture(): CatalogContentBundle;
export function createSecondSliceFixture(): CatalogContentBundle;
export function mutateBundle(
  bundle: CatalogContentBundle,
  mutation: BundleMutation,
): CatalogContentBundle;
export function withoutIdentityFacet(): unknown;
export function creatureWithItemKey(): unknown;
export function withUnreachableDependency(): unknown;
export function withDuplicateSourceFile(): unknown;
export function withDuplicateAlias(): unknown;
export function withDuplicateAllowedFamily(): unknown;
export function withMismatchedFamilyMembership(): unknown;
export function shuffledFixture(): CatalogContentBundle;
```

`MutableCatalogContentBundle` é um tipo de teste recursivo que remove `readonly`; `mutateBundle`
usa `structuredClone`, aplica a mutação e devolve o valor sem parse para permitir fixtures inválidos.

- [ ] **Step 1: Criar fixture canônico completo**

O fixture usa valores determinísticos e contém exatamente:

```text
slice: key slice:huntbound:catalog-a, snapshot canary-test, roots [creature:tibia:dragon]
vocation family: vocation-family:huntbound:knight
vocation: vocation:tibia:4 (family knight; identity + progression)
spell: spell:tibia:80 (identity + spell; duas projection audits: elite knight, knight)
creatures: creature:tibia:dragon e creature:tibia:snake
dragon: melee + ranged + area attacks, heal defense, poison condition, summon snake,
        resistance, immunity e loot do item 3031
snake: stats/appearance e sem facets opcionais
item: item:tibia:3031 (identity + item)
aliases: um alias Tibia por entidade, sempre apontando para a própria stable key
roots/dependencies/projections/sourceFiles: união exata e consistente com todas as entidades
```

Todos os GUIDs vêm de `createContentGuid(kind, 'tibia', sourceId)` e todos os source hashes usam
64 caracteres hexadecimais minúsculos conhecidos (`'a'.repeat(64)`, `'b'.repeat(64)`, etc.).

- [ ] **Step 2: Escrever testes RED de validação adicional**

```ts
it.each([
  ['missing identity facet', withoutIdentityFacet()],
  ['wrong stable-key kind', creatureWithItemKey()],
  ['unreachable dependency', withUnreachableDependency()],
  ['duplicate source file', withDuplicateSourceFile()],
  ['duplicate alias', withDuplicateAlias()],
  ['duplicate spell family', withDuplicateAllowedFamily()],
  ['mismatched vocation family directions', withMismatchedFamilyMembership()],
])('rejects %s before persistence', (_name, input) => {
  expect(() => validatePersistableBundle(input)).toThrow();
});

it('canonicalizes identity arrays but preserves ordered relation arrays', () => {
  const canonical = canonicalizeCatalogBundle(shuffledFixture());
  expect(canonical.creatures.map((value) => value.stableKey)).toEqual([
    'creature:tibia:dragon',
    'creature:tibia:snake',
  ]);
  expect(canonical.creatures[0]?.attacks.map((value) => value.name)).toEqual([
    'bite',
    'bolt',
    'wave',
  ]);
});
```

- [ ] **Step 3: Rodar testes e confirmar RED**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts tools/content-catalog/repository/canonicalCatalog.test.ts
```

- [ ] **Step 4: Implementar validação e serialização canônica**

```ts
export function validatePersistableBundle(input: unknown): CatalogContentBundle {
  const bundle = CatalogContentBundleSchema.parse(input);
  assertUniqueCatalogCollections(bundle);
  assertIdentityAndFacetMatrix(bundle);
  assertReachableClosure(bundle);
  assertBidirectionalVocationFamilies(bundle);
  assertCanonicalGuidsAndKinds(bundle);
  return bundle;
}
```

Implementar a matriz fechada abaixo em `assertIdentityAndFacetMatrix`:

```ts
const allowedFacets = {
  vocation: ['identity', 'progression'],
  creature: ['identity', 'stats', 'appearance', 'combat', 'conditions', 'loot'],
  item: ['identity', 'item'],
  spell: ['identity', 'spell'],
} as const;

const requiredFacets = {
  vocation: ['identity', 'progression'],
  creature: ['identity', 'stats', 'appearance'],
  item: ['identity'],
  spell: ['identity', 'spell'],
} as const;
```

Validar também GUID recalculado, prefixo stable-key/kind, projection única por entidade, igualdade
dos facets entidade↔projection, roots/dependencies disjuntos e exaustivos, closure alcançável,
proveniência/sources coerentes, aliases locais únicos, família↔vocation inversa e arrays que a spec
proíbe duplicar. `canonicalJson` emite tokens JSON recursivamente e ordena `Object.keys(record)` com
`localeCompare`, sem reconstruir objeto intermediário; isso preserva ordem lexical inclusive para
chaves integer-like.

- [ ] **Step 5: Rodar testes e confirmar GREEN**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts tools/content-catalog/repository/canonicalCatalog.test.ts
corepack pnpm exec tsc --project tools/content-catalog/tsconfig.json
```

- [ ] **Step 6: Commit**

```powershell
git add tools/content-catalog/repository/catalogFixture.test-support.ts tools/content-catalog/repository/canonicalCatalog.ts tools/content-catalog/repository/canonicalCatalog.test.ts
git commit -m "feat: validate canonical catalog bundles"
```

---

### Task 4: Repository de um slice e round-trip completo

**Files:**
- Create: `tools/content-catalog/repository/SqliteContentCatalog.ts`
- Create: `tools/content-catalog/repository/internal/openMutableContentCatalog.ts`
- Create: `tools/content-catalog/repository/ContentCatalogRepository.test.ts`

**Interfaces:**
- Consumes: banco migrado e bundle validado.
- Produces: `OpenMutableContentCatalog` estrutural com `migrate`, `close`, leitura, contagem e
  `transaction`.

```ts
export interface OpenContentCatalog extends ContentCatalogReadPort {
  migrate(): void;
  close(): void;
}

export interface OpenMutableContentCatalog extends OpenContentCatalog {
  transaction<Operation extends (tx: CuratedCatalogTransactionWriter) => unknown>(
    operation: Operation &
      (Extract<ReturnType<Operation>, PromiseLike<unknown>> extends never
        ? unknown
        : never),
  ): ReturnType<Operation>;
}

export function openMutableContentCatalog(path: string): OpenMutableContentCatalog;
```

- [ ] **Step 1: Escrever teste RED de persistência/round-trip**

```ts
it('persists and reconstructs every catalog field canonically', () => {
  const catalog = openMigratedMutableCatalog();
  const input = createCatalogBundleFixture();

  catalog.transaction((tx) => tx.replaceCatalogBundle(input));

  expect(catalog.readCatalogBundle(input.slice.key)).toEqual(
    canonicalizeCatalogBundle(input),
  );
  expect(foreignKeyViolations(catalog)).toEqual([]);
});

it('preserves two raw spell references without creating aliases', () => {
  const output = persistAndRead(createCatalogBundleFixture());
  expect(output.projectionAudits.map((audit) => audit.rawReference)).toEqual([
    'elite knight',
    'knight',
  ]);
  expect(output.spells[0]?.aliases).not.toContainEqual(
    expect.objectContaining({ alias: 'elite knight' }),
  );
});
```

- [ ] **Step 2: Rodar teste e confirmar RED**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts tools/content-catalog/repository/ContentCatalogRepository.test.ts
```

- [ ] **Step 3: Implementar escrita filho-primeiro e leitura completa**

Prepared statements permanecem campos privados. `replaceCatalogBundle` executa
`validatePersistableBundle` antes do primeiro statement, grava identity ledger/active entity,
slice membership, provenance/aliases, projections/hashes e cada payload com `slice_key`.

```ts
replaceCatalogBundle(input: CatalogContentBundle): void {
  this.assertActiveTransaction();
  const bundle = canonicalizeCatalogBundle(validatePersistableBundle(input));
  this.stageSliceReplacement(bundle);
  this.touchedSlices.add(bundle.slice.key);
}
```

Implementar a substituição nesta ordem explícita dentro da transação externa:

```text
1. canonicalize(validatePersistableBundle(input));
2. registrar o slice em touchedSlices;
3. comparar canonicalJson(input) com canonicalJson(readCatalogBundle(slice)) quando o slice existe;
4. se diferente, remover filhos e payloads do slice em ordem filho-primeiro;
5. inserir/verificar ledger e alias registry permanentes;
6. upsert source snapshots/files, slice, active entities e slice memberships;
7. inserir roots, families, projections/facet hashes e aliases slice-scoped;
8. inserir vocations/skills, creatures e relações ordenadas, items, spells/families/audits;
9. remover content_entities/source/families ativos que ficaram sem participação, nunca ledger/registry;
10. deixar o gate global para o final de transaction().
```

O reader consulta somente payloads do slice pedido, ordena relations por `ordinal`, canonicaliza
arrays de identidade e reconstrói arrays/records vazios e campos opcionais ausentes quando o facet
não foi projetado. O teste principal compara o objeto completo, não contagens.

- [ ] **Step 4: Rodar round-trip e typecheck para confirmar GREEN**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts tools/content-catalog/repository/ContentCatalogRepository.test.ts
corepack pnpm exec tsc --project tools/content-catalog/tsconfig.json
```

- [ ] **Step 5: Commit**

```powershell
git add tools/content-catalog/repository
git commit -m "feat: persist catalog bundles transactionally"
```

---

### Task 5: Constraints, ledger, aliases e rollback forte

**Files:**
- Create: `tools/content-catalog/repository/ContentCatalogConstraints.test.ts`
- Modify: `tools/content-catalog/repository/SqliteContentCatalog.ts`
- Modify: `tools/content-catalog/migrations/001_initial_catalog.sql`

**Interfaces:**
- Consumes: repository da Task 4.
- Produces: identidade permanente, alias registry permanente, FKs/CHECKs e rollback integral.

Adicionar ao fixture support, com cada função retornando um clone cuja única diferença é a falha
indicada pelo nome:

```ts
export function withGuidCollision(): CatalogContentBundle;
export function withStableKeyCollision(): CatalogContentBundle;
export function withSourceTupleCollision(): CatalogContentBundle;
export function withAliasAmbiguity(): CatalogContentBundle;
export function withCrossSliceLootTarget(): CatalogContentBundle;
export function withCrossSliceSummonTarget(): CatalogContentBundle;
export function withWrongChildKind(): CatalogContentBundle;
export function withCrossSliceFamily(): CatalogContentBundle;
```

- [ ] **Step 1: Escrever testes RED parametrizados de constraints**

```ts
it.each([
  ['guid collision', withGuidCollision()],
  ['stable key collision', withStableKeyCollision()],
  ['source tuple collision', withSourceTupleCollision()],
  ['alias ambiguity', withAliasAmbiguity()],
  ['loot target missing in same slice', withCrossSliceLootTarget()],
  ['summon target missing in same slice', withCrossSliceSummonTarget()],
  ['wrong child kind', withWrongChildKind()],
  ['family missing in same slice', withCrossSliceFamily()],
])('rolls back %s', (_name, invalidBundle) => {
  const before = logicalDump(catalog);
  expect(() => catalog.transaction((tx) => tx.replaceCatalogBundle(invalidBundle))).toThrow();
  expect(logicalDump(catalog)).toEqual(before);
  expect(foreignKeyViolations(catalog)).toEqual([]);
});
```

- [ ] **Step 2: Escrever testes RED de memória histórica**

```ts
it('keeps identity and alias mappings after removing the final active slice', () => {
  persist(original);
  replaceSliceWithBundleThatRemovesEntity(original.slice.key);
  expect(() => persist(remappedIdentity)).toThrow(/identity/i);
  expect(() => persist(remappedAlias)).toThrow(/alias/i);
});

it.each([
  ['stable key', remapRemovedStableKey],
  ['guid', remapRemovedGuid],
  ['source tuple', remapRemovedSourceTuple],
])('never permits historical %s reuse', (_label, remap) => {
  persist(original);
  replaceSliceWithBundleThatRemovesEntity(original.slice.key);
  expect(() => persist(remap(original))).toThrow(/identity/i);
});

it('rolls back every table after a deliberately late SQL failure', () => {
  persist(original);
  const before = logicalDump(testDatabase);
  installAbortTriggerOnSpellAudit(testDatabase);
  expect(() => persist(bundleWithChangedSpellAudit)).toThrow(/late fixture failure/i);
  dropAbortTrigger(testDatabase);
  expect(logicalDump(testDatabase)).toBe(before);
});
```

- [ ] **Step 3: Rodar testes e confirmar RED**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts tools/content-catalog/repository/ContentCatalogConstraints.test.ts
```

- [ ] **Step 4: Completar constraints e ordem de replacement**

Adicionar FKs compostas para membership, payload pai, loot/summon target e family association;
manter ledger/alias registry fora da limpeza; apagar dados slice-scoped em ordem filho-primeiro.
Os helpers de falha tardia criam/removem um `BEFORE INSERT` trigger somente no DB temporário do
teste. Após o callback e antes do commit, executar exatamente:

```ts
this.assertNoOrphans();
this.assertSharedFacetPayloadsAgree();
this.assertForeignKeyCheckIsEmpty();
```

`assertForeignKeyCheckIsEmpty()` executa literalmente `PRAGMA foreign_key_check` e inclui tabela,
rowid, parent e FK id na mensagem de erro.

- [ ] **Step 5: Rodar testes e confirmar GREEN**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts tools/content-catalog/repository/ContentCatalogConstraints.test.ts
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts
```

- [ ] **Step 6: Commit**

```powershell
git add tools/content-catalog/migrations/001_initial_catalog.sql tools/content-catalog/repository
git commit -m "feat: enforce catalog identity and constraints"
```

---

### Task 6: Múltiplos slices, facets compartilhados e idempotência

**Files:**
- Create: `tools/content-catalog/repository/ContentCatalogMultiSlice.test.ts`
- Modify: `tools/content-catalog/repository/SqliteContentCatalog.ts`
- Modify: `tools/content-catalog/repository/canonicalCatalog.ts`

**Interfaces:**
- Consumes: múltiplas chamadas `replaceCatalogBundle` no mesmo callback.
- Produces: merge aditivo de facets, atualização coordenada e no-op sem writes.

- [ ] **Step 1: Escrever testes RED de múltiplos slices**

```ts
it('adds a new facet to a shared entity without changing the older slice', () => {
  persist(sliceAWithSnakeWithoutLoot);
  const beforeA = catalog.readCatalogBundle(sliceAKey);
  persist(sliceBWithSnakeLoot);
  expect(catalog.readCatalogBundle(sliceAKey)).toEqual(beforeA);
  expect(catalog.readCatalogBundle(sliceBKey).creatures[0]?.loot).not.toHaveLength(0);
});

it('requires coordinated replacement when a shared facet changes', () => {
  persistBothSlicesWithSharedStats();
  expect(() => persist(sliceAWithChangedStats)).toThrow(/shared facet/i);
  catalog.transaction((tx) => {
    tx.replaceCatalogBundle(sliceAWithChangedStats);
    tx.replaceCatalogBundle(sliceBWithChangedStats);
  });
});

it('performs zero writes for an identical reimport but still checks orphans', () => {
  persist(input);
  const changes = totalChanges(); // SELECT total_changes()
  persist(input);
  expect(totalChanges()).toBe(changes);
  injectOrphanThroughTestDatabase();
  expect(() => persist(input)).toThrow(/orphan/i);
});

it('replaces only the addressed slice and removes its stale rows', () => {
  persist(sliceA);
  persist(sliceB);
  const beforeB = catalog.readCatalogBundle(sliceB.slice.key);
  persist(sliceAWithoutSpell);
  expect(catalog.readCatalogBundle(sliceB.slice.key)).toEqual(beforeB);
  expect(catalog.readCatalogBundle(sliceA.slice.key).spells).toEqual([]);
});

it('round-trips distinct provenance, aliases and display metadata per slice', () => {
  persist(sliceAWithSharedSnakeMetadataA);
  persist(sliceBWithSharedSnakeMetadataB);
  expect(readSnake(sliceAKey)).toMatchObject(sharedSnakeMetadataA);
  expect(readSnake(sliceBKey)).toMatchObject(sharedSnakeMetadataB);
});

it('preserves an unreferenced family through explicit slice membership', () => {
  persist(sliceWithUnreferencedFamily);
  expect(catalog.readCatalogBundle(sliceKey).vocationFamilies).toContainEqual(
    unreferencedFamily,
  );
});
```

- [ ] **Step 2: Rodar testes e confirmar RED**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts tools/content-catalog/repository/ContentCatalogMultiSlice.test.ts
```

- [ ] **Step 3: Implementar staging e gate final**

O transaction context mantém `touchedSlices`, permite divergência temporária e calcula o no-op por
serialização canônica slice-scoped. O gate de órfãos roda antes do fast path e novamente no final.
Mesmo uma chamada no-op adiciona seu slice a `touchedSlices`, permitindo uma atualização coordenada
posterior no mesmo callback. Hashes compartilhados incluem somente payload do facet e excluem
source, aliases, display name, consumer/rationale e projection audits. O gate agrupa por
`(entity_guid, facet)`, compara primeiro `payload_sha256` e, quando os hashes coincidem, compara a
serialização canônica reconstruída para proteger contra bug de persistência.

- [ ] **Step 4: Rodar testes e confirmar GREEN**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts tools/content-catalog/repository/ContentCatalogMultiSlice.test.ts
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts
```

- [ ] **Step 5: Commit**

```powershell
git add tools/content-catalog/repository
git commit -m "feat: support curated catalog slices"
```

---

### Task 7: Lifecycle, capability read-only e boundary arquitetural

**Files:**
- Create: `tools/content-catalog/repository/openContentCatalog.ts`
- Create: `tools/content-catalog/repository/ContentCatalogLifecycle.test.ts`
- Create: `tools/content-catalog/architecture.test.ts`
- Modify: `tools/content-catalog/database/catalogErrors.ts`
- Modify: `tools/content-catalog/repository/internal/openMutableContentCatalog.ts`

**Interfaces:**
- Consumes: repository mutável privado.
- Produces: `openContentCatalog(path): OpenContentCatalog` sem propriedade `transaction` e factory
  mutável allowlisted.

- [ ] **Step 1: Escrever testes RED de lifecycle/capability**

```ts
it('requires migrate and closes idempotently', () => {
  const catalog = openContentCatalog(path);
  expect(() => catalog.countRows()).toThrow(/not migrated/i);
  catalog.migrate();
  catalog.close();
  catalog.close();
  expect(() => catalog.countRows()).toThrow(/closed/i);
  expect(() => catalog.readCatalogBundle('slice:huntbound:catalog-a')).toThrow(/closed/i);
  expect(() => catalog.migrate()).toThrow(/closed/i);
});

it('rejects mutable operations before migrate and after close', () => {
  const catalog = openMutableContentCatalog(path);
  expect(() => catalog.transaction(() => undefined)).toThrow(/not migrated/i);
  catalog.migrate();
  catalog.close();
  expect(() => catalog.transaction(() => undefined)).toThrow(/closed/i);
});

it('does not expose transaction on the public handle', () => {
  const catalog = openContentCatalog(path);
  expect('transaction' in catalog).toBe(false);
  expect((catalog as unknown as { transaction?: unknown }).transaction).toBeUndefined();
});

it('rejects thenables, nested transactions and expired transaction handles', () => {
  const catalog = openMigratedMutableCatalog();
  expect(() => catalog.transaction(() => ({ then: () => undefined }) as never)).toThrow(/thenable/i);
  expect(() => catalog.transaction(() => catalog.transaction(() => undefined))).toThrow(/nested/i);

  let leaked: CuratedCatalogTransactionWriter | undefined;
  catalog.transaction((tx) => {
    leaked = tx;
  });
  expect(() => leaked?.listOrphanEntities()).toThrow(/expired/i);
});

it('rolls back a write performed before a runtime thenable is returned', () => {
  const before = logicalDump(testDatabase);
  expect(() =>
    catalog.transaction((tx) => {
      tx.replaceCatalogBundle(input);
      return { then: () => undefined } as never;
    }),
  ).toThrow(/thenable/i);
  expect(logicalDump(testDatabase)).toBe(before);
});

it('reports missing slices and lexically ordered counts for every owned table', () => {
  const catalog = openContentCatalog(path);
  catalog.migrate();
  expect(() => catalog.readCatalogBundle('slice:huntbound:missing')).toThrow(/missing slice/i);
  const names = Object.keys(catalog.countRows());
  expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right)));
  expect(names).toContain('schema_migrations');
  expect(names.some((name) => name.startsWith('sqlite_'))).toBe(false);
});
```

- [ ] **Step 2: Escrever boundary test RED**

O teste percorre `.ts/.tsx/.mts/.cts`, interpreta imports/exports literais e exige:

```ts
const mutableFactoryAllowlist = [
  /tools\/content-catalog\/composition\/createContentCatalogApplication\.ts$/,
  /tools\/content-catalog\/.*\.(test|spec)\.ts$/,
];

const sqliteImportAllowlist = [
  /tools\/content-catalog\/(database|migrations|repository)\//,
];
```

Também rejeita export público contendo `Database`, `Statement`, `prepare`, `exec` ou `pragma`, e
garante que `CuratedCatalogWriter` só aparece na definição, dois services futuros e composition
root.

- [ ] **Step 3: Rodar testes e confirmar RED**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts tools/content-catalog/repository/ContentCatalogLifecycle.test.ts tools/content-catalog/architecture.test.ts
```

- [ ] **Step 4: Implementar wrapper, erros e regras**

```ts
export function openContentCatalog(path: string): OpenContentCatalog {
  const repository = createSqliteContentCatalog(path);
  return {
    migrate: () => repository.migrate(),
    close: () => repository.close(),
    readCatalogBundle: (sliceKey) => repository.readCatalogBundle(sliceKey),
    countRows: () => repository.countRows(),
  };
}
```

`createSqliteContentCatalog` é um constructor/factory adapter-internal definido no módulo do
repository; não é a capability mutável restrita. `openMutableContentCatalog` usa o mesmo constructor
e retorna explicitamente os métodos do writer. O wrapper público não importa a factory mutável, não
usa spread nem retorna o objeto mutável. Erros internos estáveis cobrem closed, not migrated,
missing slice, nested transaction, runtime thenable e expired transaction handle. O callback fica
marcado como encerrado em `finally`, antes de propagar retorno ou erro.

- [ ] **Step 5: Rodar testes e confirmar GREEN**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts tools/content-catalog/repository/ContentCatalogLifecycle.test.ts tools/content-catalog/architecture.test.ts
corepack pnpm architecture:check
```

- [ ] **Step 6: Commit**

```powershell
git add tools/content-catalog/database tools/content-catalog/repository tools/content-catalog/architecture.test.ts
git commit -m "feat: restrict catalog mutation capability"
```

---

### Task 8: Reconstrução, ignore, STATE e gates finais

**Files:**
- Create: `tools/content-catalog/reconstruction.test.ts`
- Modify: `.gitignore`
- Modify: `docs/playbooks/PB-01/STATE.md`

**Interfaces:**
- Consumes: schema, migration runner e repository completos.
- Produces: evidência de reconstrução, handoff PB-01-02 e PB-01-03 elegível.

- [ ] **Step 1: Escrever teste RED de reconstrução independente**

```ts
it('rebuilds identical schema and migration hashes in independent databases', () => {
  const left = buildTemporaryCatalog();
  const right = buildTemporaryCatalog();
  expect(normalizedSqliteSchema(left)).toEqual(normalizedSqliteSchema(right));
  expect(readAppliedMigrations(left)).toEqual(readAppliedMigrations(right));
});
```

- [ ] **Step 2: Rodar teste e confirmar RED se faltarem normalizadores/cleanup**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts tools/content-catalog/reconstruction.test.ts
```

- [ ] **Step 3: Implementar normalização/cleanup e atualizar `.gitignore`**

Adicionar somente:

```gitignore
.cache/content-catalog/
*.sqlite
*.sqlite-wal
*.sqlite-shm
```

O teste usa diretórios temporários, fecha conexões no `finally` e remove os arquivos criados.

- [ ] **Step 4: Rodar todos os gates frescos**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts
corepack pnpm exec tsc --project tools/content-catalog/tsconfig.json
corepack pnpm architecture:check
corepack pnpm exec biome check tools/content-catalog packages/content/src/catalog packages/content/src/application/internal package.json
corepack pnpm format:check
git diff --check
git ls-files '*.sqlite' '*.sqlite-wal' '*.sqlite-shm'
```

Expected: todos exit 0; `git ls-files` sem saída.

- [ ] **Step 5: Atualizar STATE com evidência real**

Ainda não marcar `done`: registrar uma seção de evidência candidata com branch, executor
`gpt-5.6-luna xhigh`, contagem de testes e resultados dos gates, mantendo PB-01-02 `in_progress` até
a auditoria Sol e os gates pós-correção.

- [ ] **Step 6: Commit da implementação candidata**

```powershell
git add tools/content-catalog packages/content package.json pnpm-lock.yaml .gitignore
git commit -m "feat: add transactional content catalog"
```

- [ ] **Step 7: Revisão independente Sol e correções TDD**

Enviar o diff completo e a evidência dos gates ao `gpt-5.6-sol` `xhigh`. Cada finding funcional deve
ganhar teste RED reproduzível antes da correção; reexecutar todos os gates após o último ajuste.

Para cada correção, criar commit focado; quando Sol responder sem findings P0–P3, capturar o hash do
último commit de código:

```powershell
$implementationCommit = git rev-parse HEAD
git status --porcelain=v1 --untracked-files=all
```

Expected: hash de 40 caracteres e árvore contendo somente a atualização pendente de STATE, se ela
já tiver sido preparada.

- [ ] **Step 8: Fechar STATE com evidência não recursiva**

Atualizar PB-01-02 para `done`, gravar `$implementationCommit` na coluna `Commit integrado`, listar
os gates pós-Sol, registrar executor `gpt-5.6-luna xhigh`, validador `gpt-5.6-sol xhigh` e definir
PB-01-03 como próxima task. O commit documental fica separado para não tentar registrar o próprio
hash dentro de si.

```powershell
git add docs/playbooks/PB-01/STATE.md
git commit -m "docs: record PB-01-02 completion"
git status --porcelain=v1 --untracked-files=all
```

Expected: exit 0 e nenhuma saída no status.

- [ ] **Step 9: Integrar por fast-forward, verificar e limpar recursos temporários**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb01-02-sqlite-catalog
corepack pnpm --dir C:\Kaezan\kaezan-huntbound exec vitest run --config tools/content-catalog/vitest.config.ts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound exec tsc --project tools/content-catalog/tsconfig.json
corepack pnpm --dir C:\Kaezan\kaezan-huntbound architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound exec biome check tools/content-catalog packages/content/src/catalog packages/content/src/application/internal package.json
corepack pnpm --dir C:\Kaezan\kaezan-huntbound format:check
git -C C:\Kaezan\kaezan-huntbound diff --check
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb01-02-sqlite-catalog
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb01-02-sqlite-catalog
```

Expected: todos os gates exit 0, status sem saída, fast-forward concluído e worktree/branch removidos.
