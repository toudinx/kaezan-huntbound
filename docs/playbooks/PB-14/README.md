# PB-14 — Três vocações, encontros distintos

**Status:** planejado. Depende do código integrado de PB-13.

## Objetivo e escopo

Entregar Sorcerer e Paladin, suporte necessário aos kits e encontros com comportamento distinto. Reutilizar Knight, cinco hunts, economia e helper; sem Druid.

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
| PB-14-01 | [Kits, comportamento e lacunas reais](tasks/PB-14-01-kits.md) |
| PB-14-02 | [Suporte aos kits curados](tasks/PB-14-02-suporte.md) |
| PB-14-03 | [Sorcerer no loop completo](tasks/PB-14-03-sorcerer.md) |
| PB-14-04 | [Paladin no loop completo](tasks/PB-14-04-paladin.md) |
| PB-14-05 | [Comportamentos dos monstros](tasks/PB-14-05-comportamentos.md) |
| PB-14-06 | [Encontros das três vocações](tasks/PB-14-06-encontros.md) |

## Aceite e validação

Cada implementação entrega o comportamento da card com `corepack pnpm dev` de pé e uma indicação
do que olhar. O usuário valida gameplay e diversão. Rodar só as linhas aplicáveis da tabela de
`AGENTS.md`, uma vez; teste focado e suíte transversal são alternativas salvo mudança do runner.
A última implementação roda build. Browser correctness e `verify` são do usuário. Revisão externa
é opcional pós-aceite; não bloqueia integração. Não executar a próxima card no mesmo chat.
