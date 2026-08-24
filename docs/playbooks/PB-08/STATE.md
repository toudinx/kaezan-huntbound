# PB-08 — Estado operacional

**Playbook:** `docs/playbooks/PB-08/README.md`

**Estado geral:** reescrito em 2026-08-24 como "O Knight completo".
Próxima elegível: **PB-08-02**, primeira e sozinha.

**Última atualização:** 2026-08-24

**Base:** PB-07 congelado na 05. A máquina de condições, toggle, cooldown secundário, leech e regen
sensível a combate está integrada e **sem conteúdo que a use** — é o que a PB-08-04 a 07 consomem.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-08-01 | done | `claude/pb08-01-cave-density` | `c23c819` | puxão máximo 4 → 11; tiles com ≥4 pulláveis 3 → 125; **20 slots de rotworm em 13 grupos** (ver B9); goldens PB-04 e PB-05 inalterados |
| PB-08-02 | pending | `<agente>/pb08-02-knight-map` | — | — |
| PB-08-03 | pending | `<agente>/pb08-03-kit-por-tabela` | — | — |
| PB-08-04 | pending | `<agente>/pb08-04-rotacao-de-dano` | — | — |
| PB-08-05 | pending | `<agente>/pb08-05-postura` | — | — |
| PB-08-06 | pending | `<agente>/pb08-06-taunt` | — | — |
| PB-08-07 | pending | `<agente>/pb08-07-mobilidade` | — | — |
| PB-08-08 | pending | `<agente>/pb08-08-hud-nove-acoes` | — | — |
| PB-08-09 | pending | `<agente>/pb08-09-arma-eixo` | — | — |
| PB-08-10 | pending | `<agente>/pb08-10-aceite` | — | — |

## Bloqueios

**B4 — aberto, decisão do usuário.** Doze worktrees antigas em `git worktree list`, de PB-02 a
PB-08, e **cinco branches fora da `main`** com trabalho real: `claude/pb05-fixture-drift`,
`claude/render-resolution-cap`, `codex/fix-dead-run-resume`, `codex/pb00r-01-resize` e
`codex/pb00r-03-package-tests`. Nenhuma verificada contra a `main` atual; as de PB-00R podem ter
sido superadas por commits posteriores. Triagem pendente.

**B9 — aberto, herdado do PB-08 original.** O snapshot de save referencia spawn por
**(índice de grupo, índice de slot)**, então **toda mudança de conteúdo na hunt invalida todo save
existente**. Custou 8 testes vermelhos e um ciclo de conserto na PB-08-01. Endereçar spawn por
identidade estável remove a classe inteira de quebra. **Não é trabalho do PB-08 reescrito** — foi
para o PB-10, que é o playbook que mexe em conteúdo de hunt.

**B10 — fechado em 2026-08-24.** A linha de evidência da PB-08-01 registrava "29 slots (12 rotworm +
17 snake)". A `main` compõe **20 slots, todos rotworm** — `generated/hunts/venore-rotworm-cave/spawns.json`.
O número de snake vinha da intenção original da task; a espécie continua em `excludedCreatures` por
falta de sprite no asset pack. Linha corrigida acima. Entrada de snake foi para o PB-10.

**Bloqueios encerrados do PB-08 original (B1, B2, B3, B5, B6, B7, B8):** resolvidos entre 2026-08-23
e 2026-08-24. Narrativa preservada no histórico do Git; não se repete aqui.

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas". Task serial ou paralela sempre faz
`git merge --ff-only` na `main`.

## Métricas

`corepack pnpm qa:budgets` ainda não medido neste playbook. Vermelho vira task de performance, nunca
bloqueio.

## Regra de atualização

Só status/branch/commit na tabela; bloqueio e próxima elegível; narrativa no commit, não aqui.
