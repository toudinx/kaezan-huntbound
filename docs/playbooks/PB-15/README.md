# PB-15 — Dungeon, modulação e coleção

**Status:** planejado. Depende do código integrado de PB-14.

## Objetivo e escopo

Entregar uma dungeon modulada, completar os mapas existentes e fechar a coleção cosmética. Sem multiplayer, monetização, ranking ou conteúdo procedural.

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
| PB-15-01 | [Dungeon e modulação da build](tasks/PB-15-01-design.md) |
| PB-15-02 | [Renderizar as hunts grandes](tasks/PB-15-02-render.md) |
| PB-15-03 | [Completar as caixas das hunts](tasks/PB-15-03-mapas.md) |
| PB-15-04 | [Dungeon com começo e fim](tasks/PB-15-04-dungeon.md) |
| PB-15-05 | [Modo modulado](tasks/PB-15-05-modulacao.md) |
| PB-15-06 | [Coleção visual de outfits](tasks/PB-15-06-outfits.md) |
| PB-15-07 | [Gacha cosmético e V0 integrado](tasks/PB-15-07-gacha.md) |

## Aceite e validação

Cada implementação entrega o comportamento da card com `corepack pnpm dev` de pé e uma indicação
do que olhar. O usuário valida gameplay e diversão. Rodar só as linhas aplicáveis da tabela de
`AGENTS.md`, uma vez; teste focado e suíte transversal são alternativas salvo mudança do runner.
A última implementação roda build. Browser correctness e `verify` são do usuário. Revisão externa
é opcional pós-aceite; não bloqueia integração. Não executar a próxima card no mesmo chat.
