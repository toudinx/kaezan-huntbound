# PB-01-02 — Catálogo SQLite transacional

**Status:** aprovado pelo usuário em 2026-08-11

## Objetivo

Materializar `CatalogContentBundle` em um catálogo SQLite reconstruível, com migrations
versionadas, integridade referencial, escrita transacional e uma porta de leitura consumível pelo
runtime sem expor SQLite ou SQL ao grafo browser.

## Arquitetura

O driver `better-sqlite3@13.0.3` ficará restrito a `tools/content-catalog/`. O adapter abrirá a
conexão, habilitará `PRAGMA foreign_keys = ON`, usará WAL em bancos de arquivo e aplicará migrations
SQL ordenadas por ID numérico. Cada migration será registrada com SHA-256; reaplicações serão no-op
e alterações de conteúdo com o mesmo ID serão rejeitadas.

O repository receberá somente um `CatalogContentBundle` validado. A operação de substituição do
catálogo grava snapshot, arquivos, slice, entidades, facets e relações na mesma transação. Todas
as consultas ficarão encapsuladas no adapter; a reconstrução ordenará entidades por `stableKey` e
relações por suas chaves/IDs determinísticos.

As portas serão separadas: `ContentCatalogReadPort` em `packages/content/src/catalog/` será a
superfície de leitura, enquanto `CuratedCatalogWriter` em `packages/content/src/application/internal/`
será interno e não será exportado por `packages/content/src/index.ts`.

## Schema e invariantes

`001_initial_catalog.sql` criará `schema_migrations`, proveniência (`source_snapshots`,
`source_files`), slices e projeções, identidade (`content_entities`, `content_aliases`), vocações,
criaturas, itens, spells e todas as tabelas filhas definidas na task card.

GUID, stable key e a tupla `(source_system, entity_kind, source_id)` serão únicos. Todas as tabelas
filhas referenciarão `content_entities(guid)`; loot exigirá creature/item, summons exigirá criatura
owner/alvo, famílias exigirão entidade pai e referências cruas de spell ficarão em tabela própria,
sem serem aliases. `CHECK`s restringirão kinds, escalas de chance, magnitudes, contagens, intervalos
e unidades. Conteúdo usará `ON DELETE RESTRICT`.

`listOrphanEntities()` retornará entidades que não estão associadas a nenhum slice. A escrita deverá
falhar para bundles inválidos, aliases ambíguos, referências ausentes, kinds incompatíveis e IDs
obrigatórios ausentes. Qualquer falha desfará a unidade de trabalho inteira.

## Testes e verificação

Os testes criarão bancos temporários, testarão migrations idempotentes e reconstrução independente,
validarão `foreign_keys`, constraints e preservação de duas referências cruas de spell, e
compararão contagens antes/depois de uma falha tardia. Também provarão reimport idêntico sem mudança
de estado e detecção de órfãos.

Os gates da task serão executados para Vitest do tooling, TypeScript do tooling, checker de
arquitetura, Biome restrito, formatação e `git diff --check`. Arquivos SQLite, WAL e SHM ficarão
ignorados e nenhum banco materializado será versionado.

## Fora de escopo

Parsers XML/Lua, fixtures, importação pública, exportação JSON, documentação gerada, gameplay,
save, servidor de banco e alteração dos contratos de PB-01-01.
