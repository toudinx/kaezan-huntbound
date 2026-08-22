# PB-07 — Estado operacional

**Playbook:** `docs/playbooks/PB-07/README.md`

**Estado geral:** em execução. **PB-07-01 a PB-07-04 integradas na `main`.**
PB-07-05 done na branch. Próxima elegível após o ff: **PB-07-06**.
PB-07-12 e PB-07-13 são independentes.

**Última atualização:** 2026-08-22

**Base:** PB-06 integrado em `main`. PB-06-09 bloqueada não impede PB-07.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-07-01 | done | `codex/pb07-01-rotations-reference` | `95f5a42` | `docs/content/PB-07-ROTATIONS.md` — seis slots confirmados |
| PB-07-02 | done | `codex/pb07-02-target-and-impact` | `ead4405` | anel de alvo + shake por magnitude; ff na `main` |
| PB-07-03 | done | `codex/pb07-03-combat-contract-v5` | `b490e2e` | schema 5 / rules 4; events byte-idênticos |
| PB-07-04 | done | `codex/pb07-04-sustain` | `5400ab0` | leech 100‰ + OOC 1 HP/2 mana / 500 ms; janela 4 s; 238 testes de simulação |
| PB-07-05 | done | `codex/pb07-05-conditions` | `e4c1028` | 257 testes; soma permille então `trunc` uma vez; golden PB-05 inalterado |
| PB-07-06 | pending | `<agente>/pb07-06-generic-skills` | — | `exori vis` é `range(3)`, não cinco tiles |
| PB-07-07 | pending | `<agente>/pb07-07-paladin` | — | — |
| PB-07-08 | pending | `<agente>/pb07-08-sorcerer` | — | — |
| PB-07-09 | pending | `<agente>/pb07-09-elements` | — | — |
| PB-07-10 | pending | `<agente>/pb07-10-creature-kit` | — | — |
| PB-07-11 | pending | `<agente>/pb07-11-charges` | — | — |
| PB-07-12 | pending | `<agente>/pb07-12-world-edge` | — | — |
| PB-07-13 | pending | `<agente>/pb07-13-second-hunt` | — | — |
| PB-07-14 | pending | `<agente>/pb07-14-acceptance` | — | — |

## Bloqueios

**B1 — resolvido em 2026-08-21** (`c98e1c7`).

**B2 — aberto.** `verify` ainda vermelho por save-persistence/`SAVE_VERSION_UNSUPPORTED` e
snapshots de `shell`, fora do escopo da 02. Não bloqueia a trilha de combate; não bloqueia merge.

**B3 — resolvido em 2026-08-21.** WIP da `main` em stash temporário; `--ff-only`
de `codex/pb07-04-sustain` em `9ee152d` (inclui PB-07-03). WIP restaurado.

## Decisões congeladas

Vivem no `README.md` e, para composição de modificadores, em `docs/simulation/KERNEL_CONTRACT.md`.
Task serial ou paralela sempre faz `git merge --ff-only` na `main`.

## Métricas

`corepack pnpm qa:budgets` ainda não medido. Vermelho vira task de performance, nunca bloqueio.

## Regra de atualização

Só status/branch/commit na tabela; bloqueio e próxima elegível; narrativa no commit, não aqui.
