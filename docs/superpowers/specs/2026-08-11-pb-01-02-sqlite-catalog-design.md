# PB-01-02 — Catálogo SQLite transacional

**Status:** revisada após auditoria Sol; aguardando nova aprovação

**Data:** 2026-08-11

## Objetivo

Materializar `CatalogContentBundle` em um catálogo SQLite reconstruível, com migrations
versionadas, integridade referencial, escrita síncrona e transacional e uma porta de leitura que não
exponha SQLite ou SQL ao grafo browser.

Esta task não altera os contratos de PB-01-01. O adapter pode aplicar invariantes relacionais mais
estritas na fronteira de persistência, mas deve parar e retornar a PB-01-01 se algum requisito
somente puder ser atendido mudando `packages/contracts/src/content/**`.

## Fronteiras e interfaces

O driver `better-sqlite3@13.0.3` e APIs Node ficam restritos a `tools/content-catalog/`.
`packages/content/src/catalog/ContentCatalogPort.ts` exporta a porta de leitura pelo próprio módulo.
`packages/content/src/index.ts` não pertence ao escopo permitido de PB-01-02 e permanece inalterado;
PB-01-06, que inclui o entrypoint em seu escopo, poderá reexportar a porta de leitura. A porta de
escrita fica em `packages/content/src/application/internal/CuratedCatalogWriter.ts` e nunca sai no
entrypoint.

A operação transacional usa uma assinatura que rejeita callbacks assíncronos por tipo:

```ts
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

O adapter também verifica o retorno do callback em runtime e lança erro se ele for um thenable. O
objeto `tx` é criado para uma única chamada, fica inválido assim que o callback retorna ou lança e
qualquer método usado depois disso falha. Transações aninhadas são rejeitadas.

Um type-test com `@ts-expect-error` prova que uma função `async` não compila. Um teste runtime cobre
thenables vindos de JavaScript/cast e confirma rollback.

## Lifecycle da conexão

`openContentCatalog(path)` abre a conexão e liga `PRAGMA foreign_keys = ON`. Bancos de arquivo usam
`journal_mode = WAL`; `:memory:` mantém o journal suportado pelo SQLite em memória. `migrate()` é
obrigatório antes de leitura ou transação e é idempotente. Operações anteriores a `migrate()` falham
com erro de catálogo não migrado.

`readCatalogBundle(sliceKey)` falha com erro de slice ausente quando a chave não existe. `close()` é
idempotente; depois do primeiro fechamento, todas as operações exceto `close()` falham com erro de
catálogo fechado. `countRows()` retorna um record de todas as tabelas próprias criadas pelas
migrations, incluindo `schema_migrations`, em ordem lexicográfica e sem tabelas internas `sqlite_*`.

## Migrations monotônicas

Arquivos seguem exatamente `NNN_nome_em_snake_case.sql`, são ordenados pelo ID decimal e têm SHA-256
calculado sobre os bytes originais do arquivo. Antes de tocar no banco, o runner rejeita nome
inválido e dois arquivos com o mesmo ID.

Para cada migration já registrada, o arquivo correspondente deve existir e ter o mesmo hash. Uma
migration não aplicada deve possuir ID maior que o maior ID já registrado; inserir retroativamente
um ID menor é erro. O SQL e a linha de `schema_migrations` são executados na mesma transação
explícita. Falha em qualquer statement não registra a migration nem deixa alterações de schema.
Reexecutar o conjunto inalterado não escreve linhas.

`001_initial_catalog.sql` cria as tabelas mínimas da task card e as tabelas auxiliares necessárias
ao round-trip:

```text
schema_migrations, content_identity_ledger
source_snapshots, source_files
content_slices, content_entities, content_aliases, content_entity_facets
content_slice_roots, content_slice_entities
vocation_families, vocations, vocation_family_members, vocation_skill_multipliers
creatures, creature_attacks, creature_defenses, creature_conditions, creature_summons
creature_resistances, creature_immunities
items, loot_entries
spells, spell_vocation_families, spell_source_vocation_refs
```

## Identidade e proveniência

O banco distingue dois conceitos:

- identidade usa sempre `identity_source_system = 'tibia'`, `entity_kind` e `source_id`; o GUID deve
  ser exatamente `createContentGuid(entityKind, 'tibia', sourceId)`;
- proveniência usa `source.system = 'canary'`, snapshot, path e SHA-256 e referencia
  `source_snapshots`/`source_files`.

GUID, stable key e `(identity_source_system, entity_kind, source_id)` são únicos e não nulos. Antes
da escrita, o adapter recalcula o GUID canônico. Uma stable key já aceita não pode ser associada a
outro GUID/source tuple, e um GUID/source tuple existente não pode receber outra stable key. Aliases
são únicos por `(source_system, alias)` e sempre apontam para a entidade declarada; referências cruas
de spell permanecem somente em `spell_source_vocation_refs`.

`content_identity_ledger` é um ledger permanente, sem timestamp exportável, com GUID, stable key,
identity source system, kind, source ID e first-seen slice. Toda entidade commitada registra primeiro
seu mapeamento no ledger; linhas do ledger nunca são atualizadas nem removidas, mesmo quando a
entidade deixa o último slice. `content_entities` representa somente entidades ativas e referencia o
ledger. `listOrphanEntities()` ignora o ledger. Assim, remover conteúdo ativo não permite reutilizar
historicamente uma stable key, GUID ou source tuple.

O prefixo da stable key deve corresponder ao kind concreto: vocations usam `vocation:tibia:`,
creatures `creature:tibia:`, items `item:tibia:` e spells `spell:tibia:`. A fronteira valida essa
relação antes da escrita e `content_entities` a reforça com `CHECK`.

## Validação da fronteira de escrita

`replaceCatalogBundle` recebe o tipo público por ergonomia, mas não confia no tipo apagado em
runtime. Antes da primeira mutação, executa `CatalogContentBundleSchema.parse(bundle)` e persiste
somente o valor retornado pelo parse. Depois aplica invariantes relacionais que hoje não pertencem
ao schema Zod:

1. roots e dependencies são disjuntos e sua união é exatamente o conjunto de stable keys das
   entidades do bundle;
2. toda entidade inclui obrigatoriamente o facet `identity`, possui exatamente uma projeção e o
   conjunto de `projection.facets` é igual ao de `entity.includedFacets`;
3. toda dependency é alcançável a partir de uma root pelas relações declaradas: summon e loot de
   criatura, spell para família permitida e família para suas vocações;
4. nenhuma relação aponta para entidade ou família ausente e o kind concreto corresponde à tabela
   filha;
5. snapshot/path/hash de cada entidade são consistentes com a proveniência do slice e com
   `source_files`.

Falha Zod, colisão de identidade, alias ambíguo, referência ausente, dependência inalcançável, facet
incompatível ou constraint SQL aborta toda a transação. Essas validações adicionais não mudam os
contratos; apenas estreitam o conjunto persistível para cumprir as regras normativas de curadoria.

O mapeamento campo → facet é fechado e testado:

- `identity`: GUID, stable key, display name, source e aliases;
- `stats`: health, experience e speed de criatura;
- `appearance`: look type;
- `combat`: attacks, defenses, summons, resistances e immunities;
- `conditions`: conditions;
- `loot`: loot;
- `item`: stackable, max stack size e weight;
- `progression`: família, ganhos, velocidades, mana multiplier e skill multipliers de vocação;
- `spell`: palavras, custos, cooldowns, damage type, área, fórmula, famílias permitidas e audits de
  projeção.

Campos obrigatórios implicam seu facet; campos opcionais/listas/records só podem estar presentes ou
não vazios quando o facet correspondente está aprovado. Vocation families são relações internas,
não entidades faceteadas.

## Semântica de substituição e múltiplos slices

Cada bundle representa exatamente o slice identificado por `bundle.slice.key`.
`replaceCatalogBundle` substitui somente esse slice e preserva os demais. A operação:

1. valida e canonicaliza o bundle sem escrever;
2. compara a serialização canônica recebida com a serialização canônica reconstruída para o slice;
   se forem byte a byte iguais, retorna sem executar `INSERT`, `UPDATE` ou `DELETE`;
3. insere entidades/agregados novos e atualiza entidades exclusivas do slice, preservando
   obrigatoriamente os mapeamentos imutáveis de identidade;
4. compartilha uma entidade ou família já usada por outro slice somente quando sua definição
   canônica completa — campos, proveniência, aliases, facets e relações — é idêntica; uma definição
   divergente é colisão e causa rollback;
5. substitui os dados próprios do slice: metadados, roots, memberships, projections/facets e
   projection audits;
6. substitui aliases e relações globais apenas para entidades novas ou exclusivas do slice; dados
   compartilhados idênticos não recebem writes;
7. remove filhos e entidades ativas que deixaram esse slice somente quando não são referenciados por
   outro slice; depois remove famílias e proveniência que ficaram sem referência; agregados
   compartilhados permanecem e o `content_identity_ledger` nunca é removido;
8. executa `listOrphanEntities()` antes do commit e falha se restar qualquer entidade sem slice.

`listOrphanEntities()` retorna GUIDs ordenados de entidades sem linha em `content_slice_entities`.
Ela é pública apenas na porta transacional para permitir o gate de aplicação e diagnóstico; o fluxo
normal não consegue commitar órfãos. O teste de detecção cria um órfão por SQL de fixture dentro do
adapter de teste, nunca por uma API pública.

## Round-trip sem perda e ordenação

`schemaVersion` e `contentVersion` ficam em `content_slices`. Campos escalares de vocação, criatura,
item e spell ficam nas tabelas pai. Fórmula e área de spell são colunas explícitas em `spells`.
Records e listas restantes usam tabelas relacionais: multiplicadores de skill, resistências,
imunidades, famílias, attacks, defenses, conditions, summons, loot e auditorias de spell.

Coleções cuja ordem faz parte do contrato — attacks, defenses, conditions, summons, immunities,
loot e projection audits — persistem um `ordinal` inteiro não negativo e são lidas por ele. Arrays
de identidade são canonicalizados: entidades por `stableKey`, famílias por `key`, roots/dependencies
e source files por chave/path, aliases por `(sourceSystem, alias)`, projections por `entityKey`,
facets pela ordem de `ContentFacetSchema`, members e spell-family por chave. Records são
reconstruídos como objetos com todos os pares, sem prometer ordem observável de propriedades. O
serializador canônico escreve diretamente as chaves de records em ordem lexical, inclusive chaves
integer-like, sem depender da enumeração de propriedades de objetos JavaScript.

O teste principal compara o bundle lido com a forma canônica completa do bundle validado, incluindo
todos os campos e arrays; comparar apenas contagens não é aceito como prova de round-trip.

## Constraints SQL

Todas as projeções concretas referenciam `content_entities(guid)` e verificam o `entity_kind`
esperado. Loot referencia creature e item; summon referencia owner e summoned creature;
spell-family referencia spell e família; vocation member referencia ambos. Conteúdo usa
`ON DELETE RESTRICT`, com remoções válidas executadas explicitamente em ordem filho-primeiro.

`CHECK`s cobrem kinds, UUID/source obrigatórios, hash lowercase de 64 hexadecimais, chance em
0..10.000 ou 0..100.000 conforme a unidade, magnitudes finitas/não negativas exigidas pelo contrato,
intervalos e ordinals não negativos, counts positivos, min <= max, shapes/kinds discriminados e
booleanos 0/1.

## Regra arquitetural executável

Além de `architecture:check`, `tools/content-catalog/architecture.test.ts` varre imports/exportações
TypeScript e prova que:

- `@huntbound/content` não importa `better-sqlite3`, builtins Node nem código de
  `tools/content-catalog`;
- `packages/content/src/index.ts` não exporta o writer interno;
- imports de `application/internal/CuratedCatalogWriter` só são aceitos em
  `ImportCanarySlice.ts`, `ApplyCuratedOperation.ts` e
  `tools/content-catalog/composition/createContentCatalogApplication.ts`.

Em PB-01-02, somente o arquivo de definição referencia o nome `CuratedCatalogWriter`: o adapter
expõe uma API estruturalmente compatível, sem importar a porta interna. A composition root de
PB-01-06 fará a ligação nominal e será a única referência do tooling, preservando a allowlist exata
exigida por PB-01-06/07.

Esse teste dedicado cabe no escopo permitido da task e não exige ampliar agora o checker global,
que ignora imports relativos.

## Testes e evidência

O ciclo RED/GREEN cobre:

- migration inicial, `foreign_keys = 1`, WAL em arquivo, nomes/IDs/hashes inválidos, aplicação
  atômica, repetição no-op e reconstrução idêntica de dois bancos;
- validação runtime, GUID canônico, correspondência stable-key/kind, facet `identity` obrigatório,
  identidade imutável, aliases, source tuple obrigatório, `CHECK`s e FKs reais para loot, summon,
  families e spell-family;
- ledger persistente: aceitar uma entidade, removê-la do último slice e provar que remapear sua
  stable key, GUID ou source tuple continua falhando;
- round-trip canônico completo, duas referências cruas preservadas sem aliases e ordem por ordinal;
- substituição isolada de slice, entidade compartilhada idêntica, colisão compartilhada, remoção de
  stale rows, reimport sem writes e detecção/rejeição de órfãos;
- callback async e retorno union contendo `PromiseLike` rejeitados pelo compilador, thenable
  rejeitado em runtime e handle transacional inválido após o callback;
- lifecycle antes da migration, slice ausente, close repetido e operações após close;
- regra arquitetural dedicada.

Rollback é provado comparando um dump lógico canônico de todas as tabelas antes/depois de uma falha
tardia, não apenas contagens. Idempotência compara também `total_changes()` antes/depois do reimport.
Cada teste de integridade termina com `PRAGMA foreign_key_check` vazio. O teste de migration falha no
meio de um SQL sintético e confirma schema e `schema_migrations` inalterados.

Os gates finais são Vitest do tooling, TypeScript do tooling, `architecture:check`, Biome restrito,
formatação e `git diff --check`. Arquivos SQLite, WAL e SHM ficam ignorados e nenhum banco
materializado é versionado.

## Fora de escopo

Parsers XML/Lua, fixtures Canary, importação/rebuild pública, CLI final, exportação JSON,
documentação gerada, gameplay, save, servidor de banco, alteração dos contratos de PB-01-01 e
alteração do checker arquitetural global. O entrypoint `packages/content/src/index.ts` também não é
alterado nesta task.
