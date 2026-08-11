# PB-01 — Catálogo curado e contratos de conteúdo

> **Para agentes:** execute uma task card por chat. O formato, o handoff e o ciclo automático de
> integração/limpeza seguem `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Status:** ready

**Objetivo:** criar a fundação própria de conteúdo do Huntbound: identidade durável, schemas
TypeScript, catálogo SQLite reconstruível, migração Canary incremental e curada, exportação JSON
determinística e documentação gerada do mesmo catálogo.

**Resultado independente:** o slice `fixture:pb-01-contract-coverage` importa Knight, Berserk,
Rotworm, Amazon, Orc Shaman e somente suas dependências necessárias; duas importações idênticas
produzem o mesmo catálogo e JSON byte-identical. Nenhum código Canary é executado ou copiado.

## Fontes normativas

Em caso de conflito, ler nesta ordem:

1. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`;
2. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`;
3. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`;
4. `docs/08_POLITICA_MODELOS_AGENTES.md`;
5. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`;
6. `docs/superpowers/specs/2026-08-11-pb-01-content-catalog-design.md`;
7. este README;
8. a task card em execução;
9. `STATE.md` apenas para estado operacional.

## Decisões congeladas

- A arquitetura, o schema, os IDs e o catálogo são do Huntbound. Canary fornece fatos de origem e
  proveniência para uma importação explícita; não dita o desenho interno.
- O snapshot inicial é `references/canary` no commit
  `157e6f9e21318bd3033eea553fe9275b429faf72`.
- O catálogo Huntbound é a fonte interna após a migração aceita. SQLite é sua materialização local;
  schema, migrations e operações curadas ficam versionados em texto.
- O browser consome apenas JSON interno validado. Não carrega SQLite, Lua, XML ou paths Canary.
- Cada entidade possui UUIDv5 determinístico, stable key legível, ID original e proveniência.
- GUID não deriva de display name ou path. O namespace UUID do Huntbound é criado uma vez em
  PB-01-01, testado e congelado no contrato.
- Toda entidade pertence a um `ContentSlice` ou é dependência transitiva alcançável. Órfãos falham.
- Não existe importação em massa. Cada playbook migra somente conteúdo com uso concreto.
- Lua é analisado estaticamente por AST e nunca executado.
- Arquivos Canary reais permanecem em `references/`, fora do Git. Fixtures versionadas são
  sintéticas; o resultado interno normalizado e sua proveniência podem ser versionados.
- O PB-01 representa dados. IA, dano, cooldown em execução, summon em execução e loot roll ficam
  fora deste playbook.

## Slice curado inicial

ID: `fixture:pb-01-contract-coverage`.

| Papel | Entidade | Forma coberta |
|---|---|---|
| raiz | Knight | vocação, ganhos, velocidade, multiplicadores e relação com spell |
| raiz | Berserk (`exori`, spell ID 80) | spell instantânea, custo, cooldown, área e vocações |
| raiz | Rotworm | melee puro, defesa e loot misto por nome/ID |
| raiz | Amazon | melee + ataque físico à distância com projétil |
| raiz | Orc Shaman | dano elemental, área, cura e summon |
| dependência | Snake | alvo íntegro do summon do Orc Shaman |
| dependências | itens de loot usados | resolução por item ID e nome sem importar catálogo excedente |

O slice prova cobertura de contratos; não escolhe a primeira hunt de PB-04.

## Arquitetura alvo

```text
references/canary (origem congelada)
  └─► adapters XML/Lua estáticos
        └─► DTOs de importação
              └─► schemas + curadoria + dependency closure
                    └─► ImportContentSlice (transação)
                          └─► catálogo SQLite Huntbound
                                ├─► documentação gerada
                                └─► JSON canônico ──► ContentRegistry browser
```

### Fronteiras de código

```text
packages/contracts/src/content/        tipos, schemas, IDs e diagnósticos
packages/content/src/importers/canary/ parsers e mappers puros; sem filesystem/SQLite
packages/content/src/runtime/          registry browser-safe
packages/content/src/generated/        JSON interno validado e golden hash
packages/test-fixtures/canary/         fixtures sintéticas e manifestos de teste
tools/content-catalog/                  filesystem, SQLite, migrations, CLI e geração de docs
docs/content/                           catálogo e política de identidade gerados/documentados
```

## Dependências congeladas pelo plano

Todas entram com versão exata e lockfile revisado:

| Package | Versão | Uso |
|---|---:|---|
| `zod` | `4.4.3` | schemas TypeScript e validação na fronteira |
| `uuid` | `14.0.1` | UUIDv5 conforme RFC 9562 |
| `better-sqlite3` | `13.0.3` | adapter SQLite de tooling; Node `>=22` |
| `@types/better-sqlite3` | `7.6.13` | tipos do adapter |
| `@types/node` | `24.13.3` | tipos alinhados ao Node 24 fixado |
| `fast-xml-parser` | `5.10.1` | parsing XML estático |
| `luaparse` | `0.3.1` | AST Lua estática |
| `@types/luaparse` | `0.2.13` | tipos do AST Lua |

`node:sqlite` não entra no baseline porque ainda emite `ExperimentalWarning` no Node 24.14.0 deste
workspace. Nenhum servidor de banco, Docker ou instalação global é necessário.

## Ordem das tasks

| ID | Problema coeso | Dependência | Modelo/effort | Status |
|---|---|---|---|---|
| [PB-01-01](tasks/PB-01-01-definir-identidade-e-schemas.md) | identidade, schemas e diagnósticos | PB-00R fechado | Sol `xhigh` | pending |
| [PB-01-02](tasks/PB-01-02-criar-catalogo-sqlite.md) | migrations, catálogo e repository transacional | PB-01-01 | Sol `xhigh` | pending |
| [PB-01-03](tasks/PB-01-03-congelar-slice-e-proveniencia.md) | seleção curada, fixtures e source lock | PB-01-02 | Sol `xhigh` | pending |
| [PB-01-04](tasks/PB-01-04-importar-vocacao-e-itens-xml.md) | importadores XML de Knight e itens | PB-01-03 | Sol `xhigh` | pending |
| [PB-01-05](tasks/PB-01-05-importar-criaturas-e-spell-lua.md) | AST Lua para criaturas e Berserk | PB-01-03 | Sol `xhigh` | pending |
| [PB-01-06](tasks/PB-01-06-materializar-e-exportar-slice.md) | serviço, dependency closure, DB, JSON e docs | PB-01-04/05 | Sol `xhigh` | pending |
| [PB-01-07](tasks/PB-01-07-fechar-gate-integrado.md) | auditoria integrada e aceite | PB-01-06 | Opus 5 ou Sol `xhigh` | pending |

PB-01-04 e PB-01-05 possuem paths funcionais independentes e podem ser executadas em paralelo por
branches isoladas depois de PB-01-03. O fluxo padrão continua serial. Se o paralelismo for ativado,
ambas removem suas worktrees e preservam branches; PB-01-06 é o integrador único, incorpora os dois
commits, resolve somente o handoff documental e apaga as branches depois do gate integrado.

## Critérios finais de aceite

- [ ] GUIDs, stable keys, aliases e proveniência possuem schemas e constraints verificáveis.
- [ ] O catálogo é reconstruído do zero por migrations e operações versionadas.
- [ ] Foreign keys permanecem ligadas e importação inválida faz rollback integral.
- [ ] O slice contém apenas raízes declaradas e dependências alcançáveis; zero órfãos.
- [ ] Parsers XML/Lua são estáticos, estritos e cobertos por RED/GREEN.
- [ ] Nenhum arquivo Lua/XML real do Canary é rastreado no Git ou executado.
- [ ] Os hashes do source lock conferem com o snapshot local congelado.
- [ ] A mesma importação executada duas vezes não altera linhas.
- [ ] Duas reconstruções limpas produzem JSON byte-identical e o mesmo golden SHA-256.
- [ ] Documentação e bundle derivam da mesma visão consultada do catálogo.
- [ ] Runtime consome somente o registry/JSON interno e não conhece tooling ou source paths.
- [ ] `corepack pnpm verify` passa no resultado integrado.
- [ ] PB-02 pode resolver chaves estáveis sem depender de Canary.

## Fora de escopo

- catálogo Canary completo ou qualquer importação sem consumidor;
- primeira hunt, mapa, assets, sprites ou `AssetProvider`;
- IA, simulação, combate, spawn, loot roll ou gameplay Phaser;
- editor/admin de conteúdo;
- save, IndexedDB, backend, PostgreSQL ou sincronização remota;
- atualização automática do snapshot Canary.

## Como executar

Abra um chat novo e envie o bloco copiável da próxima task indicada em `STATE.md`. Execute somente
uma task por chat. A task cria sua branch/worktree, verifica, commita, integra por `--ff-only` no
fluxo serial e remove recursos temporários após sucesso. Não antecipe a task seguinte.

