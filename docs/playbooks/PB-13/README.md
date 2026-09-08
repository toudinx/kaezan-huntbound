# PB-13 — Uma run que vale repetir

**Status:** planejado. PB-13-01 elegível.

## Objetivo e escopo

Fechar o loop de caça do Knight: set, rares, gold, level, bestiary, conquistas e helper. Uma hunt de referência; sem vocações novas ou dungeon.

## Decisões congeladas

Roteiro 06 e ADR-05 regem produto; ADR-03 rege arquitetura. A task 01 registra decisões
pendentes, fontes, mudanças de contrato e rollback num design curto em `docs/superpowers/specs/`.
Cards seguintes leem esse design. Escolhas reversíveis seguem o protocolo; destruição de dado,
contrato/schema/golden integrado seguem as condições de parada de `AGENTS.md`. Não tratar uma
hipótese de RNG, consumível ou modulação como autorização implícita.

## Tasks e dependências

Execução **serial**, uma task por chat. Cada linha depende da anterior; a primeira depende da base
indicada acima. Não há tasks paralelas, branches ou worktrees previstas. Todas as cards existem;
a existência da card não elimina sua dependência. Modelo/effort são escolhidos pela política 08.

| ID | Task |
|---|---|
| PB-13-01 | [Decisões de progressão e economia](tasks/PB-13-01-loop.md) |
| PB-13-02 | [Escolher, concluir e voltar à hunt](tasks/PB-13-02-saida.md) |
| PB-13-03 | [Equipamento e coleção de rares](tasks/PB-13-03-equipamento.md) |
| PB-13-04 | [Level e XP persistentes](tasks/PB-13-04-level.md) |
| PB-13-05 | [Vender loot a NPC](tasks/PB-13-05-venda.md) |
| PB-13-06 | [Comprar preparação com gold](tasks/PB-13-06-preparacao.md) |
| PB-13-07 | [Bestiary por espécie](tasks/PB-13-07-bestiary.md) |
| PB-13-08 | [Conquistas do primeiro loop](tasks/PB-13-08-conquistas.md) |
| PB-13-09 | [Helper mínimo e feedback](tasks/PB-13-09-helper.md) |

## Aceite e validação

Cada implementação entrega o comportamento da card com `corepack pnpm dev` de pé e uma indicação
do que olhar. O usuário valida gameplay e diversão. Rodar só as linhas aplicáveis da tabela de
`AGENTS.md`, uma vez; teste focado e suíte transversal são alternativas salvo mudança do runner.
A última implementação roda build. Browser correctness e `verify` são do usuário. Revisão externa
é opcional pós-aceite; não bloqueia integração. Não executar a próxima card no mesmo chat.
