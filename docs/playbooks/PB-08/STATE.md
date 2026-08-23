# PB-08 — Estado operacional

**Playbook:** `docs/playbooks/PB-08/README.md`

**Estado geral:** em execução. Nenhuma task integrada.
Próxima elegível: **PB-08-01**, que vem sozinha — o resultado dela muda o julgamento das seguintes.

**Última atualização:** 2026-08-23

**Base:** PB-07 congelado na 05 (`e4c1028` em `main`). A máquina de condições, leech e regen
sensível a combate está integrada e sem conteúdo que a use.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-08-01 | in-progress | `claude/pb08-01-cave-density` | — | — |
| PB-08-02 | pending | `<agente>/pb08-02-knight-actions` | — | — |
| PB-08-03 | não escrita | — | — | só se jogar a 01 e a 02 mostrar que faz falta |
| PB-08-04 | pending | `<agente>/pb08-04-selection-gate` | — | — |
| PB-08-05 | pending | `<agente>/pb08-05-run-ends` | — | — |
| PB-08-06 | pending | `<agente>/pb08-06-experience` | — | — |
| PB-08-07 | pending | `<agente>/pb08-07-skill-by-use` | — | — |
| PB-08-08 | pending | `<agente>/pb08-08-level-feeds-character` | — | — |
| PB-08-09 | pending | `<agente>/pb08-09-item-stats` | — | — |
| PB-08-10 | pending | `<agente>/pb08-10-equipment-slots` | — | — |
| PB-08-11 | pending | `<agente>/pb08-11-armor` | — | — |
| PB-08-12 | pending | `<agente>/pb08-12-equipment-loot` | — | — |
| PB-08-13 | pending | `<agente>/pb08-13-acceptance` | — | — |

## Bloqueios

**B1 — aberto.** A árvore de `main` tem WIP não commitado do PB-05-FIX (game feel, `MAX_FRAME_DELTA_MS`
250→100, target ring, `tools/dev`). Não bloqueia execução em worktree, **bloqueia o
`git merge --ff-only` de volta na `main`**. Resolver antes da primeira integração. É a mesma causa
do B3 do PB-07.

**B2 — herdado do PB-07, aberto.** `verify` vermelho por save-persistence/`SAVE_VERSION_UNSUPPORTED`
e snapshots de `shell`. Não bloqueia a trilha deste playbook; não bloqueia merge.

**B3 — informativo.** Hipótese descartada em 2026-08-23: `exori` **não** é single-target. O bundle
de runtime já traz `area: { radiusTiles: 1 }`. A task que ia consertar isso foi retirada; sobrou
apenas o gate de proveniência, rebaixado para PB-08-04.

**B4 — informativo.** Onze worktrees antigas seguem registradas em `git worktree list`, de PB-02 a
PB-07. Limpeza pendente; não bloqueia nada.

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas". Task serial ou paralela sempre faz
`git merge --ff-only` na `main`.

## Métricas

`corepack pnpm qa:budgets` ainda não medido. Vermelho vira task de performance, nunca bloqueio.

## Regra de atualização

Só status/branch/commit na tabela; bloqueio e próxima elegível; narrativa no commit, não aqui.
