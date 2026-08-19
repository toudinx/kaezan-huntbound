# PB-05 — Estado operacional

**Playbook:** [`README.md`](README.md)

**Estado geral:** **correções em execução**. As onze tasks de implementação estão `done` e
integradas. FIX-07, FIX-08 (chão na transição) e FIX-10 (agro/path Canary) entregues. Próximo:
`PB-05-FIX-09` (números de dano).

**Última atualização:** 2026-08-19

**Próxima etapa:** executar `PB-05-FIX-09`. A trilha FIX tem prioridade sobre PB-06 e PB-07.

## Tasks

| ID | Status | Commit integrado | Evidência principal |
|---|---|---|---|
| PB-05-01 | done | `2933012` | `docs/content/PB-05-SELECTION.md` + CLI `check-combat` exit 0 |
| PB-05-02 | done | `f1e8dab` | bundle com 3 spells + ficha; hash `b0b0a0b7…c77c770` |
| PB-05-03 | done | `6cec836` | `packages/contracts/src/simulation/**` v4 + `KERNEL_CONTRACT.md` |
| PB-05-04 | done | `188a61a` | kernel v4; journals golden byte-idênticos |
| PB-05-05 | done | (ver log) | `hunter` em S6; journals PB-03/PB-04 byte-idênticos |
| PB-05-06 | done | `2f5d07c` | `loot/granted` determinístico + projeção da bolsa fora do kernel |
| PB-05-07 | done | `640f18e` | `buildHuntScenario` com combate; hunt.json `a11941b2…15e8eb6` |
| PB-05-08 | done | `2c456b0` | fixture `pb-05-hunt-combat` 2700 ticks; `combat:check` 0×2 |
| PB-05-09 | done | `02b8c4a` | 140 entradas / 9520 bytes; `assets:check` 0×2 |
| PB-05-10 | done | `acf3b3b` | HUD DOM, input, alvo, dano, corpo/sangue/arco, loot e reinício |
| PB-05-11 | done | `d4490e9` | `artifacts/browser-qa.md` + 4 screenshots; combate 4/4; estabilidade `50/50` |
| PB-05-12 | cancelada | — | auditoria deixou de ser gate; ver abaixo |
| PB-05-FIX-01 | done | (este commit) | 134→139; draw-blood 6/6; hit-area 8/8; magic-blue 22/22; personal:check 0; cadáver+loot na tela |
| PB-05-FIX-02 | done | (este commit) | `effectFrame` min; play-once; sprite pool; probe frames; `combat:check` idêntico |
| PB-05-FIX-03 | done | (este commit) | CombatFxTable; attacked→impacto; damaged por cause; combat:check idêntico |
| PB-05-FIX-04 | done | (este commit) | ability/cast + combat/healed; combat:check idêntico; verify 0 |
| PB-05-FIX-05 | done | 9862ef9 | `CombatImpulses`; flash/lunge/hit-stop/shake; cores por causa; probe; `verify` 0; passe visual pessoal |
| PB-05-FIX-06 | cancelada | — | absorvida por FIX-07; o aceite é o usuário jogando, não mais uma spec de cue |
| PB-05-FIX-07 | done | (este commit) | targeting persistente `actor/set-target` + auto-ataque; exori `hit-area`; regen do Knight visível; ficha nível 35 / sword 60; HUD e chão sem rebuild por frame; `verify` 0; três goldens byte-idênticos |
| PB-05-FIX-08 | done | `89e3fd6` | transição alheia atualiza roster sem repintar; ator transicionado permanece filtrado por andar; `floorRebuilds`; frame antes/depois com `over50=0` |
| PB-05-FIX-09 | pending | — | `setText`/`setColor` condicionais; `Text` em pool; `decorationTextWrites` no probe; `fillText/s` antes/depois |
| PB-05-FIX-10 | done | `db04d9d` | agro 11; BFS; LOS melee; e2e sem hole-fall; `huntFloorSync`; `verify` 0 |

PB-05-06 saiu de `blocked (QA browser)` para `done` em 2026-08-18: o único vermelho era B5, que
passou a ser gate informativo. Seus gates de código estavam verdes desde `2f5d07c`.

## Bloqueios

Nenhum bloqueio aberto.

- **B8 — executado em PB-05-FIX-01.** `missile:tibia:weapon-type` saiu; seleção 140→139. `missileId: 254`
  é `CONST_ANI_WEAPONTYPE`, sentinela, não sprite.

- **B5 — reclassificado, não fechado.** `hunt-budget` mediu `5011,7 ms` contra teto de `5000 ms`
  (0,2%) durante PB-05-11. Passou a rodar em `corepack pnpm qa:budgets`, camada informativa, e não
  bloqueia merge. Medição de 2026-08-18 em `qa:budgets`: `actionableMs` `4389,6`, boot `4636,5`,
  `longTasksOverBudget` `0` — **2/2 verdes**, o que confirma dependência de carga da máquina.
  Continua sendo dívida de performance real, priorizada para PB-10.
- **B7 — resolvido** em `d4490e9` (PB-05-11 integrada).
- **B3, B4, B6 — resolvidos.** Detalhes no log de execução.

## Decisões congeladas e histórico

Decisões duráveis vivem na spec do playbook e em `docs/architecture/KERNEL_CONTRACT.md`. Handoffs,
saídas de gate e o histórico completo da execução estão em
[`artifacts/execution-log.md`](artifacts/execution-log.md). Diagnóstico e direção da trilha
`PB-05-FIX` estão em
[`2026-08-18-pb-05-fix-combat-fx-design.md`](../../superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md).

PB-05-12 foi cancelada em 2026-08-18: auditoria deixou de ser gate bloqueante
(`docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`). Auditoria independente do combate continua
desejável como `/code-review` sobre `9f1c14c..d4490e9`, depois do aceite, gerando tasks de correção.
