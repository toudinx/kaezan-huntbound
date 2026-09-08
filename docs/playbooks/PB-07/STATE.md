# PB-07 — Estado operacional

> **Fila encerrada em 2026-09-07:** registro histórico. Implementações e commits abaixo
> permanecem válidos; pendências não são executáveis por esta fila. Destino no
> [roteiro vigente](../../06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md). Status antigos abaixo são históricos.


**Playbook:** `docs/playbooks/PB-07/README.md`

**Estado geral:** **CONGELADO em 2026-08-23, por decisão do dono do projeto.**
PB-07-01 a PB-07-05 estão integradas na `main` e são a base do PB-08. **PB-07-12 também está
integrada**, por pedido do dono depois do congelamento: já estava pronta e verde. As demais tasks
06 a 14 **não são elegíveis** — retomam depois do PB-09.

Motivo: antes de criar mobs, bosses e vocações novas, a run precisa ser divertida e ter propósito.
Isso virou `docs/playbooks/PB-08/README.md`. O que o Knight precisa do PB-07 — alcance real de
magia, stances como conteúdo, cargas — foi absorvido pelo PB-08; Paladin, Sorcerer, elemento,
criatura com kit, boss e segunda hunt esperam.

**Última atualização:** 2026-08-23

**Base:** PB-06 integrado em `main`. PB-06-09 bloqueada não impede PB-07.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-07-01 | done | `codex/pb07-01-rotations-reference` | `95f5a42` | `docs/content/PB-07-ROTATIONS.md` — seis slots confirmados |
| PB-07-02 | done | `codex/pb07-02-target-and-impact` | `ead4405` | anel de alvo + shake por magnitude; ff na `main` |
| PB-07-03 | done | `codex/pb07-03-combat-contract-v5` | `b490e2e` | schema 5 / rules 4; events byte-idênticos |
| PB-07-04 | done | `codex/pb07-04-sustain` | `5400ab0` | leech 100‰ + OOC 1 HP/2 mana / 500 ms; janela 4 s; 238 testes de simulação |
| PB-07-05 | done | `codex/pb07-05-conditions` | `e4c1028` | 257 testes; soma permille então `trunc` uma vez; golden PB-05 inalterado |
| PB-07-06 | frozen | `<agente>/pb07-06-generic-skills` | — | `exori vis` é `range(3)`, não cinco tiles |
| PB-07-07 | frozen | `<agente>/pb07-07-paladin` | — | — |
| PB-07-08 | frozen | `<agente>/pb07-08-sorcerer` | — | — |
| PB-07-09 | frozen | `<agente>/pb07-09-elements` | — | — |
| PB-07-10 | frozen | `<agente>/pb07-10-creature-kit` | — | — |
| PB-07-11 | frozen | `<agente>/pb07-11-charges` | — | — |
| PB-07-12 | done | `codex/pb07-12-world-edge` | `90830fc` | rocha `#241812` com face `#3a281c` num Graphics reaproveitado, depth −1; câmera presa ao box de chão; composição inalterada (z8 424/152, z9 375/201), `untreatedVisibleCells` = 0 |
| PB-07-13 | frozen | `<agente>/pb07-13-second-hunt` | — | — |
| PB-07-14 | frozen | `<agente>/pb07-14-acceptance` | — | — |

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
