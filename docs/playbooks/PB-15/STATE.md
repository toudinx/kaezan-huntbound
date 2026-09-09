# PB-15 — Estado

**Estado:** planejado; nenhuma implementação iniciada.
**Próxima:** PB-15-01, após PB-14 integrado.

| ID | Status | Modelo previsto | Modelo / effort usado | Commit |
|---|---|---|---|---|
| PB-15-01 | pending | Claude Opus 5 `xhigh` | — | — |
| PB-15-02 | pending | GPT-5.6 Sol `xhigh` | — | — |
| PB-15-03 | pending | GPT-5.6 Luna `xhigh` | — | — |
| PB-15-04 | pending | Claude Opus 5 `xhigh` | — | — |
| PB-15-05 | pending | Claude Opus 5 `xhigh` | — | — |

## Escopo retirado em 2026-09-09

As antigas PB-15-06 (famílias de outfit) e PB-15-07 (gacha cosmético) saíram do V0 na revisão dos
playbooks 15, 17 e 18. As cards estão em `docs/archive/2026-09-09/playbooks/PB-15/tasks/` e o motivo
está no `README.md`. Nenhuma linha de gacha existe no código, então não há migração a desfazer. Com
isso a PB-15-05 passou a ser a task de fechamento e roda `build`.

## Bloqueios

**B26 — herdado do PB-13, endereçado pelas PB-15-01 e 05.** Com o level barato e o set da faixa como
eixo de progressão, voltar a uma faixa já superada para completar coleção não tem tensão: a hunt
antiga é trivial e o farm fica vazio. É o que torna a modulação **estruturante e não opcional** neste
playbook. Registrado originalmente no `STATE.md` do PB-13.

## Decisões pendentes

A task 01 registra o design antes da implementação dependente e reconcilia a emenda 09 com a
progressão real entregue pelo PB-13.

Contrato, schema e golden estão autorizados por card; nenhuma migração foi feita por este
planejamento. Modelos/effort efetivos são registrados por task.
