# PB-08 — Estado operacional

**Playbook:** `docs/playbooks/PB-08/README.md`

**Estado geral:** em execução. Nenhuma task integrada.
Próxima ação: **integrar PB-08-01** (B5), que está pronta na branch. Nada mais começa antes disso —
ela muda o mapa e o julgamento de todas as seguintes.

**Última atualização:** 2026-08-23

**Base:** PB-07 congelado na 05 (`e4c1028` em `main`). A máquina de condições, leech e regen
sensível a combate está integrada e sem conteúdo que a use.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-08-01 | aguardando integração | `claude/pb08-01-cave-density` | `1270526`, **não integrado** | ver B5 |
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

**B1 — fechado em 2026-08-23.** O WIP do PB-05-FIX foi commitado na `main` em seis commits,
`4fb17f6..1fef759`. Árvore limpa.

**B2 — fechado em 2026-08-23.** `verify` verde, 73 specs. Eram três defeitos independentes:
`errorText` descartava o `code` do `SaveError`; `save-persistence.spec.ts:616` apontava para
`[data-testid="game-root"]`, que não existe no app; e os cinco baselines de `shell` eram de
`db04d9d` (2026-08-19), anteriores ao painel de save de `ce2d10f` (2026-08-20). `8d698bd` e
`a749c2b`.

**B3 — informativo.** Hipótese descartada em 2026-08-23: `exori` **não** é single-target. O bundle
de runtime já traz `area: { radiusTiles: 1 }`. A task que ia consertar isso foi retirada; sobrou
apenas o gate de proveniência, rebaixado para PB-08-04.

**B4 — aberto.** Onze worktrees antigas em `git worktree list`, de PB-02 a PB-08, e **cinco branches
fora da `main`** com trabalho real: `claude/pb08-01-cave-density` (ver B5),
`claude/render-resolution-cap` (2 commits), `codex/fix-dead-run-resume`, `codex/pb00r-01-resize` e
`codex/pb00r-03-package-tests`. Nenhuma foi verificada contra a `main` atual; as três últimas podem
ter sido superadas por commits posteriores. Triagem pendente, decisão do usuário.

**B5 — aberto, decisão do usuário.** PB-08-01 está **implementada e não integrada** em `1270526`:
janela ampliada para 64×96, oito placements novos, `analyzeBoxDensity`, max pull 4→7 e tiles com
≥4 de 3 para 62. A `main` andou oito commits desde então, então `--ff-only` não passa mais e a
integração exige rebase + gates. **Isso muda o layout da caverna**, logo qualquer trabalho sobre
`layouts/hunts/venore-rotworm-cave.json` deve esperar esta integração.

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas". Task serial ou paralela sempre faz
`git merge --ff-only` na `main`.

## Métricas

`corepack pnpm qa:budgets` ainda não medido. Vermelho vira task de performance, nunca bloqueio.

## Regra de atualização

Só status/branch/commit na tabela; bloqueio e próxima elegível; narrativa no commit, não aqui.
