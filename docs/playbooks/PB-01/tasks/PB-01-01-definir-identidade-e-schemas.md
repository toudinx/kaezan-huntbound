# PB-01-01 — Definir identidade, schemas e diagnósticos de conteúdo

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — contratos e identidade já congelados

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; GPT-5.6 Sol `xhigh` ou Claude Code/Opus 5 somente se um
gatilho de escalonamento for registrado

**Rota:** `game-studio:web-game-foundations` + `superpowers:test-driven-development` +
`superpowers:verification-before-completion`.

**Paralelismo:** não. Primeira task serial do PB-01.

## Objetivo

Criar a linguagem interna de conteúdo do Huntbound antes de banco ou importers: identidade UUIDv5,
stable keys, proveniência, schemas Zod e diagnósticos estruturados para vocações, criaturas, ataques,
defesas, conditions, summons, itens, loot, spells, slices, projeções por facet e bundles separados
para catálogo/runtime.

## Resultado esperado

`@huntbound/contracts` exporta contratos browser-safe e testados. O mesmo fato de origem sempre gera
o mesmo GUID; valores com unidade ou sinal ambíguos são rejeitados; nenhum tipo conhece Lua, XML,
SQLite, filesystem ou Phaser.

## Dependências

- PB-00R `done` e `main` limpa.
- Spec `docs/superpowers/specs/2026-08-11-pb-01-content-catalog-design.md` aprovada.
- Node 24.14.0 e pnpm 11.21.0 via Corepack.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-01/STATE.md`;
3. `docs/playbooks/PB-01/README.md`;
4. `docs/superpowers/specs/2026-08-11-pb-01-content-catalog-design.md`;
5. `docs/architecture/PACKAGE_BOUNDARIES.md`;
6. `packages/contracts/src/index.ts` e seu `package.json`/`tsconfig.json`.

## Decisões congeladas

- Namespace UUID Huntbound: `471cdc3d-d99e-4bed-9782-9923d845f3d7`.
- UUIDv5 recebe o nome canônico `tibia/<entityKind>/<sourceId>`; snapshot, display name e path não
  participam do GUID.
- Stable keys seguem `<kind>:tibia:<slug>`, são lowercase kebab-case e ficam imutáveis após aceitas.
- `sourceId` é string no contrato para representar IDs numéricos sem perder compatibilidade futura.
- Chances de ação usam `chanceBasisPoints` (`10_000 = 100%`); loot usa
  `chancePerHundredThousand` (`100_000 = 100%`).
- Dano/curas internos usam magnitudes não negativas; sinais negativos Canary são normalizados pelo
  adapter, não preservados no domínio.
- Intervalos/cooldowns são inteiros em milissegundos; ranges/radius são inteiros em tiles.
- `zod@4.4.3` e `uuid@14.0.1` entram com versão exata.
- Proveniência e aliases de importação existem somente no envelope de catálogo. Tipos runtime não
  possuem source path, source hash ou alias de adapter.

## Escopo permitido

```text
packages/contracts/src/content/**
packages/contracts/src/index.ts
packages/contracts/package.json
packages/contracts/src/**/*.test.ts
pnpm-lock.yaml
docs/content/IDENTITY_POLICY.md
docs/playbooks/PB-01/STATE.md
```

## Fora de escopo

- banco, SQL, filesystem, CLI ou source lock;
- fixtures e parsers XML/Lua;
- dados reais de Knight, criaturas, itens ou Berserk;
- `packages/simulation`, `packages/content` e `apps/game`;
- cálculo de dano, loot roll, IA ou comportamento em execução.

## Interfaces produzidas

Os módulos podem ser separados por responsabilidade, mas estes exports são obrigatórios:

```ts
export const HUNTBOUND_CONTENT_NAMESPACE = '471cdc3d-d99e-4bed-9782-9923d845f3d7';

export type EntityKind = 'vocation' | 'creature' | 'item' | 'spell';
export type ContentGuid = string & { readonly __brand: 'ContentGuid' };
export type ContentKey = string & { readonly __brand: 'ContentKey' };
export type VocationFamilyKey = string & { readonly __brand: 'VocationFamilyKey' };

export function createContentGuid(
  kind: EntityKind,
  sourceSystem: 'tibia',
  sourceId: string,
): ContentGuid;

export interface ContentDiagnostic {
  readonly code: string;
  readonly severity: 'warning' | 'error';
  readonly message: string;
  readonly sourcePath?: string;
  readonly line?: number;
  readonly column?: number;
  readonly entityKey?: ContentKey;
}
```

Schemas obrigatórios, todos `strict()` e com tipos inferidos:

```ts
ContentGuidSchema
ContentKeySchema
VocationFamilyKeySchema       // vocation-family:huntbound:knight
SourceReferenceSchema
ContentAliasSchema
ImportProjectionAuditSchema   // refs cruas de origem -> relação interna; somente catálogo
ContentSliceDefinitionSchema
ContentProjectionSchema       // entity key + facets + consumer + rationale
VocationFamilyDefinitionSchema
VocationDefinitionSchema
CreatureAttackDefinitionSchema // discriminated union: melee | ranged | area
CreatureDefenseActionSchema     // inicialmente heal
ConditionDefinitionSchema       // inicialmente poison: totalDamage + intervalMs
CreatureSummonDefinitionSchema
CreatureDefinitionSchema
ItemDefinitionSchema
LootEntryDefinitionSchema
SpellDefinitionSchema
SpellFormulaDefinitionSchema // inicialmente skillAttack com coeficientes declarativos
CatalogContentBundleSchema
RuntimeContentBundleSchema
```

`CreatureDefinition` inclui stats básicos, outfit/lookType, ataques, conditions, ações defensivas,
summons, resistências elementais, imunidades e loot conforme os facets do slice.
`SpellFormulaDefinition` descreve coeficientes, nunca função executável. Os dois bundles possuem
`schemaVersion`, `contentVersion`, `slice`, `vocationFamilies`, `vocations`, `creatures`, `items` e
`spells`.
`CatalogContentBundle` envolve cada entidade com `source` e aliases; `SourceReference` inclui
`system`, `snapshot`, `sourceId`, `sourcePath` e `sourceSha256`. `RuntimeContentBundle` contém somente
`guid`, `stableKey`, `displayName`, `includedFacets` e dados runtime projetados. Arrays são readonly.
`VocationDefinition` aponta para `VocationFamilyKey`; `SpellDefinition` aponta para famílias
permitidas. Referências cruas como `knight`/`elite knight` vivem em `ImportProjectionAudit` somente no
catálogo, nunca como aliases de Knight nem no bundle runtime.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb01-01-content-contracts main
git worktree add C:\Kaezan\kaezan-huntbound-pb01-01-content-contracts codex/pb01-01-content-contracts
```

- [ ] **2. Fixar dependências sem instalação global.**

Na worktree:

```powershell
corepack pnpm --filter @huntbound/contracts add zod@4.4.3 uuid@14.0.1
```

Confirme que somente o manifest correto e `pnpm-lock.yaml` mudaram.

- [ ] **3. Escrever testes de identidade antes da implementação.**

Cubra GUID idêntico para a mesma tupla, GUID diferente entre kinds/source IDs, independência de
display name/path, stable key válida e rejeição de maiúscula, underscore, espaço ou slug vazio.
Inclua estes vetores literais para detectar nome canônico implementado incorretamente:

```text
tibia/creature/26  -> 9a8dd398-e67b-5a98-be03-3406bd581cf9
tibia/item/3031    -> 78974d81-ae2d-5ba6-855e-04d1909ab11a
tibia/spell/80     -> 48bec9e6-c6e6-5fd4-9d59-cc29a6478a4c
tibia/vocation/4  -> e3823a68-9f12-51e1-9b83-fde613163995
```

```powershell
corepack pnpm --filter @huntbound/contracts test -- src/content/identity.test.ts
```

Confirme RED por módulos/exports ausentes.

- [ ] **4. Implementar identidade mínima e obter GREEN.**

Use `v5()` de `uuid`; não implemente UUID manualmente. Congele o namespace e a string de nome
canônica em um único módulo.

- [ ] **5. Escrever testes dos schemas antes dos schemas.**

Cubra bundles mínimos válidos de catálogo/runtime e falhas específicas: GUID inválido, stable key
inválida, chance fora da escala, dano negativo, `min > max`, intervalo não inteiro, poison inválido,
summon sem creature key, loot sem item key, facet sem consumer/rationale, campo fora de facet e
arrays/campos extras. Prove que família ausente falha, que referências cruas não viram aliases e que
provenance/source/aliases/projection audit são rejeitados pelo schema runtime.

- [ ] **6. Implementar schemas estritos e diagnósticos.**

Use `z.discriminatedUnion('kind', ...)` para ataques. Não use `z.any()`, `z.unknown()` persistido,
`passthrough()` ou coerções silenciosas. Converta `ZodError` para `readonly ContentDiagnostic[]` por
uma função pública:

```ts
export function validateCatalogContentBundle(input: unknown):
  | { readonly ok: true; readonly value: CatalogContentBundle }
  | { readonly ok: false; readonly diagnostics: readonly ContentDiagnostic[] };

export function validateRuntimeContentBundle(input: unknown):
  | { readonly ok: true; readonly value: RuntimeContentBundle }
  | { readonly ok: false; readonly diagnostics: readonly ContentDiagnostic[] };
```

- [ ] **7. Documentar política de identidade.**

`docs/content/IDENTITY_POLICY.md` registra namespace, nome UUIDv5, stable keys, aliases, IDs de
origem, regra de renome e exemplos dos quatro kinds. Não registrar dados do slice ainda.

- [ ] **8. Executar gates da task.**

```powershell
corepack pnpm --filter @huntbound/contracts test
corepack pnpm --filter @huntbound/contracts typecheck
corepack pnpm architecture:check
corepack pnpm exec biome check packages/contracts
corepack pnpm format:check
git diff --check
```

- [ ] **9. Atualizar handoff, revisar e commitar.**

Atualize `STATE.md`, marque PB-01-01 `done`, registre contagens/resultados e indique PB-01-02.

```powershell
git add packages/contracts docs/content/IDENTITY_POLICY.md docs/playbooks/PB-01/STATE.md pnpm-lock.yaml
git commit -m "feat: define stable content contracts"
```

- [ ] **10. Integrar e limpar automaticamente.**

Na raiz `C:\Kaezan\kaezan-huntbound`, confirme raiz e worktree limpas, faça:

```powershell
git switch main
git merge --ff-only codex/pb01-01-content-contracts
corepack pnpm --filter @huntbound/contracts test
corepack pnpm --filter @huntbound/contracts typecheck
git worktree remove C:\Kaezan\kaezan-huntbound-pb01-01-content-contracts
git worktree prune
git branch -d codex/pb01-01-content-contracts
```

## Critérios de aceite

- [ ] Todos os exports obrigatórios existem e são cobertos por testes.
- [ ] UUIDv5 é determinístico e independente de nome/path/snapshot.
- [ ] Unidades e ranges são explícitos e validados.
- [ ] Schemas rejeitam campos extras e dados ambíguos.
- [ ] Família de vocação é identidade própria; refs externas cruas não se tornam aliases.
- [ ] Schema runtime rejeita provenance, aliases e projection audits do catálogo.
- [ ] Contracts não importam Node, DOM, Phaser, SQLite, XML ou Lua.
- [ ] Dependências exatas e lockfile estão versionados.
- [ ] Handoff, commit, integração e limpeza foram concluídos.

## Condições de parada

Pare se um campo exigir decidir regra de combate, se UUID depender de display name/path, se o schema
precisar aceitar dado desconhecido silenciosamente ou se a dependência exigir mudar a fronteira de
packages.

## Relatório final

Liste contratos, namespace/padrão UUIDv5, testes RED/GREEN, comandos/exit codes, dependências,
commit integrado, limpeza e PB-01-02 como próxima task. Não crie banco ou importer.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound.

Use GPT-5.6 Luna com effort xhigh. Use obrigatoriamente game-studio:web-game-foundations,
superpowers:test-driven-development e superpowers:verification-before-completion.
Não escale por cautela genérica; use Sol/Claude somente após um gatilho objetivo da política,
registrado no STATE.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-01\tasks\PB-01-01-definir-identidade-e-schemas.md

Crie branch/worktree conforme a task, comece pelos testes RED, implemente apenas contratos e
identidade, rode todos os gates, atualize STATE.md, commite, integre por fast-forward na main,
reverifique e remova worktree/branch. Não crie banco, fixtures, importers ou gameplay. Se surgir
decisão não coberta, pare e registre o bloqueio. Não inicie PB-01-02.
```
