# PB-05 — Estado operacional

**Playbook:** [`README.md`](README.md)

**Estado geral:** implementação completa e integrada em `main`. Todas as onze tasks de
implementação estão `done`. **Aguardando o aceite do usuário** (jogar e aprovar), que é o
fechamento normativo desde a revisão de processo de 2026-08-18.

**Última atualização:** 2026-08-18

**Próxima etapa:** o usuário joga (`corepack pnpm dev`) e aprova ou aponta correções. PB-06 **não
depende** desse aceite: o que ele precisa do PB-05 é código integrado e `verify` verde, e isso já
existe em `d4490e9`.

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

PB-05-06 saiu de `blocked (QA browser)` para `done` em 2026-08-18: o único vermelho era B5, que
passou a ser gate informativo. Seus gates de código estavam verdes desde `2f5d07c`.

## Bloqueios

Nenhum bloqueio aberto.

- **B5 — reclassificado, não fechado.** `hunt-budget` mediu `5011,7 ms` contra teto de `5000 ms`
  (0,2%) durante PB-05-11. Passou a rodar em `corepack pnpm qa:budgets`, camada informativa, e não
  bloqueia merge. Medição de 2026-08-18 em `qa:budgets`: `actionableMs` `4389,6`, boot `4636,5`,
  `longTasksOverBudget` `0` — **2/2 verdes**, o que confirma dependência de carga da máquina.
  Continua sendo dívida de performance real, priorizada para PB-10.
- **B7 — resolvido** em `d4490e9` (PB-05-11 integrada).
- **B3, B4, B6 — resolvidos.** Detalhes no log de execução.

## PB-05-12 — cancelada

A auditoria integrada bloqueante foi eliminada do processo em 2026-08-18
(`docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`, seção "Fechamento de playbook"). A task exigia
`main` com `git status` limpo, e a sujeira era o PB-06 ainda não versionado; PB-06-01, por sua vez,
esperava o veredito. Impasse circular sem nenhuma causa técnica.

Auditoria independente do combate continua possível e desejável — como `/code-review` sobre o
intervalo `9f1c14c..d4490e9`, depois do aceite, gerando tasks de correção em vez de veredito.

## Decisões congeladas e histórico

Decisões duráveis vivem na spec do playbook e em `docs/architecture/KERNEL_CONTRACT.md`. Handoffs,
saídas de gate e o histórico completo da execução estão em
[`artifacts/execution-log.md`](artifacts/execution-log.md).
