# PB-01 — Catálogo curado de conteúdo e importação Canary

**Status:** aprovado para planejamento

**Data:** 2026-08-11

**Escopo:** desenho do playbook PB-01; a implementação ocorrerá somente pelas task cards do
playbook, uma task por execução.

## Objetivo

Construir a primeira fundação de conteúdo própria do Huntbound: contratos estáveis, identidade
durável, catálogo relacional local, importadores isolados e exportação determinística para o
runtime. O Canary fornece dados e comportamento de referência para uma migração inicial controlada,
mas a arquitetura, os contratos, a persistência e o fluxo de curadoria pertencem integralmente ao
Huntbound.

O PB-01 deve provar essa arquitetura com um slice pequeno e integralmente utilizável. Ele não importa
o catálogo inteiro e não cria gameplay.

## Decisões de autoridade

O snapshot local do Canary em `references/canary` é a origem auditável dos fatos migrados. O commit
inicial congelado é `157e6f9e21318bd3033eea553fe9275b429faf72`. Ele não é uma dependência de
runtime e não permanece como autoridade operacional depois que uma migração é aceita.

O catálogo Huntbound passa a ser a fonte de verdade interna para conteúdo curado. Alterações futuras
são migrations ou novas importações explícitas, com diff revisável. Nenhum build acompanha o `main`
do Canary, atualiza conteúdo silenciosamente ou consulta arquivos Canary durante o jogo.

O catálogo durável é formado por schema, migrations e operações de conteúdo versionadas em texto. O
arquivo SQLite é uma materialização local reconstruível e não deve ser editado manualmente nem
tratado como um blob opaco de autoria. Bundles JSON canônicos são derivados do catálogo para consumo
do browser.

## Regra de curadoria incremental

Todo conteúdo entra por um `ContentSlice` que registra:

- identificador e objetivo do slice;
- consumidor ou razão verificável de cobertura;
- entidades-raiz selecionadas;
- dependências incorporadas;
- snapshot e arquivos de origem;
- estado da curadoria e versão de exportação.

O importer aceita apenas as raízes declaradas e a menor dependência transitiva necessária para
manter integridade. Não haverá comando para importar todo o Canary no PB-01. Um gate deve reprovar
entidades órfãs, ausentes de qualquer slice e inalcançáveis a partir de suas raízes.

Cada playbook posterior acrescenta somente o conteúdo exigido pelo sistema ou hunt em construção.
Assim, todo dado migrado possui uso concreto e pode receber revisão de significado, não apenas
validação sintática.

## Slice inicial

O primeiro slice se chama `fixture:pb-01-contract-coverage`. Ele é uma prova técnica e não escolhe a
primeira hunt do PB-04.

Entidades-raiz:

- vocação Knight;
- spell Berserk (`exori`);
- criatura Rotworm, como baseline melee e de loot;
- criatura Amazon, como ataque físico à distância com projétil;
- criatura Orc Shaman, como dano elemental à distância, área, cura e summon.

Dependências obrigatórias incluem Snake, invocada por Orc Shaman, e os itens efetivamente
referenciados pelas tabelas de loot selecionadas. Uma dependência só entra quando necessária para
integridade ou para o comportamento coberto; campos Canary sem consumidor no PB-01 devem ser
registrados como não suportados, não importados preventivamente.

As criaturas do slice vêm da mesma raiz
`references/canary/data-otservbr-global/monster/`. Knight, Berserk e os itens vêm das fontes
correspondentes sob `references/canary/data/`. O manifesto de origem fixa paths e SHA-256 antes da
execução do importer.

## Identidade

Cada entidade possui quatro formas complementares de identidade:

1. `guid`: UUIDv5 determinístico em namespace Huntbound, derivado de tipo, sistema de origem e ID
   canônico de origem;
2. `stableKey`: chave semântica imutável e legível, por exemplo `creature:tibia:rotworm`;
3. `sourceId`: ID original Canary/Tibia quando existir, como `raceId`, item ID, spell ID ou vocation
   ID;
4. aliases: nomes anteriores ou chaves externas aceitas apenas na borda de importação.

GUID não é derivado de display name nem de path. Renomear texto ou mover arquivo não altera a
identidade. `guid`, `stableKey` e a tupla `(sourceSystem, entityKind, sourceId)` possuem constraints de
unicidade. Colisões, aliases ambíguos e IDs de origem ausentes quando obrigatórios bloqueiam a
transação.

## Arquitetura

O fluxo usa Ports and Adapters e uma camada anticorrupção explícita:

```text
Canary congelado
      │ adaptadores estáticos; Lua nunca é executado
      ▼
DTOs de importação
      │ schemas + seleção curada + dependências
      ▼
ImportContentSlice
      │ transação única
      ▼
Catálogo SQLite Huntbound
      ├── documentação gerada
      └── bundle JSON canônico para o runtime
```

### Contracts

`packages/contracts/src/content/` define tipos, schemas e diagnósticos compartilhados. O conjunto
mínimo inclui:

- `ContentGuid`, `ContentKey`, `SourceReference` e `ContentAlias`;
- `ContentSliceDefinition` e relações de dependência;
- `VocationDefinition`;
- `CreatureDefinition`, com ataques discriminados, defesas, cura e summons;
- `ItemDefinition` e `LootEntryDefinition`;
- `SpellDefinition` e sua relação com vocações;
- `ContentBundle` e `ContentDiagnostic`.

Os schemas são a fronteira de entrada do domínio. DTOs inválidos não alcançam o banco. Tipos de
combate representam somente dados declarativos necessários ao slice; cálculo de dano, IA, seleção de
alvo, cooldown em execução, summon em execução e loot roll pertencem a playbooks posteriores.

### Importers

`packages/content/src/importers/canary/` contém transformações puras de texto para DTOs. Parsers Lua
são estáticos e aceitam somente o subconjunto declarativo documentado; nenhum arquivo Lua é
executado. XML e Lua não vazam para contratos, banco ou runtime.

Campos não suportados produzem diagnóstico estruturado contendo código, severidade, source path,
localização e entidade. Um campo desconhecido que possa alterar significado bloqueia a importação;
metadados explicitamente classificados como irrelevantes podem ser ignorados apenas por regra
versionada e testada.

### Application service

`ImportContentSlice` coordena leitura, parsing, validação, resolução de identidade, fechamento de
dependências e persistência. Ele depende de portas e não conhece detalhes concretos de SQLite ou do
filesystem.

A importação inteira usa uma transação. Qualquer diagnóstico bloqueante, referência ausente,
colisão, conteúdo extra não selecionado ou falha de constraint causa rollback completo. Reimportar o
mesmo slice e as mesmas fontes não altera linhas e produz o mesmo bundle byte a byte.

### SQLite catalog

O adaptador SQLite e a composição CLI vivem em `tools/content-catalog/`; código Node, filesystem e
driver de banco não entram no caminho de runtime de `@huntbound/content`. A API experimental
`node:sqlite` não será usada no baseline. O driver maduro escolhido durante o plano será fixado no
lockfile e validado com Node 24.14.0.

O schema relacional mínimo contém:

- `schema_migrations`;
- `source_snapshots` e `source_files`;
- `content_slices`, `content_slice_roots` e `content_slice_entities`;
- `content_entities` e `content_aliases`;
- `vocations`;
- `creatures`, `creature_attacks`, `creature_defenses` e `creature_summons`;
- `items` e `loot_entries`;
- `spells` e `spell_vocations`.

Foreign keys ficam ligadas em toda conexão. Migrations são monotônicas e atômicas. O repository não
expõe SQL fora do adaptador e não permite escrita que contorne `ImportContentSlice`.

### Runtime and exports

O browser consome somente `packages/content/src/generated/` por uma API de registry. O bundle é
ordenado por identidade, serializado com regra única de newline e validado antes de ser escrito.
SQLite, paths Canary, DTOs de parser e detalhes de proveniência não entram no estado da simulação.

Uma documentação de catálogo é gerada pelas mesmas consultas que produzem o bundle. Ela lista GUID,
stable key, tipo, origem, slice, dependências e campos selecionados. Não existe registro manual
paralelo que possa divergir do banco.

## Fixtures e licença

Fixtures versionadas são sintéticas, mínimas e apenas reproduzem as formas necessárias dos formatos
Canary. Arquivos Lua/XML originais permanecem em `references/`, que continua ignorado pelo Git.

Uma prova local controlada lê as fontes reais congeladas, confere commit, paths e SHA-256, importa o
slice e gera dados internos normalizados. O repositório versiona manifesto de proveniência, operações
curadas, JSON gerado, documentação e golden hash; não versiona código Canary.

## Verificação

O PB-01 exige evidência em quatro níveis:

1. testes unitários RED/GREEN para GUIDs, schemas e cada parser;
2. testes de integração em SQLite temporário para migrations, constraints, rollback, idempotência e
   detecção de órfãos;
3. importação local do snapshot real, repetida duas vezes com JSON byte-identical e golden hash
   estável;
4. gate integrado do workspace, incluindo formato, arquitetura, typecheck, testes, build e QA
   browser já existente.

O gate também busca acessos proibidos a `references/canary`, Lua/XML ou paths de conteúdo fora da
camada de tooling/importação. `packages/simulation` permanece sem dependência de conteúdo físico,
Node, DOM ou Phaser.

## Decomposição do playbook

1. `PB-01-01` — identidade, schemas e diagnósticos;
2. `PB-01-02` — catálogo SQLite, migrations e repository;
3. `PB-01-03` — slice curado, manifesto de origem e fixtures sintéticas;
4. `PB-01-04` — importadores XML para Knight e itens necessários;
5. `PB-01-05` — importadores Lua estáticos para criaturas e Berserk;
6. `PB-01-06` — serviço de importação, dependências, materialização, exportação e documentação;
7. `PB-01-07` — auditoria integrada e fechamento.

PB-01-04 e PB-01-05 podem executar em paralelo depois de PB-01-01, PB-01-02 e PB-01-03 integradas.
PB-01-06 e PB-01-07 são seriais.

## Fora de escopo

- importar o catálogo Canary inteiro;
- escolher ou implementar a primeira hunt;
- IA, pathfinding, combate, dano, cooldown em execução, loot roll ou spawn;
- assets, sprites, mapa, `AssetProvider` ou empacotamento visual;
- save, IndexedDB, backend, conta ou PostgreSQL;
- executar Lua ou reproduzir a arquitetura interna do servidor Canary;
- UI de administração ou editor de conteúdo;
- sincronização automática com versões futuras do Canary.

## Critérios de sucesso

- todo conteúdo migrado pertence ao slice inicial ou é dependência alcançável;
- GUIDs e stable keys são únicos, determinísticos e documentados;
- o catálogo pode ser reconstruído do zero por migrations e operações versionadas;
- nenhum Lua/XML Canary é executado, copiado para o Git ou lido pelo runtime;
- uma falha no meio da importação não deixa estado parcial;
- duas importações idênticas não alteram o catálogo e geram JSON byte-identical;
- documentação, bundle e golden hash derivam da mesma visão validada;
- o gate integrado existente continua verde;
- PB-02 pode consumir chaves estáveis sem conhecer paths Canary.
