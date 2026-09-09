# PB-14 — Estado

**Estado:** PB-14-01 implementada; 02 a 06 pendentes.
**Próxima:** PB-14-02.

| ID | Status | Modelo previsto | Modelo / effort usado | Commit |
|---|---|---|---|---|
| PB-14-01 | done | Claude Opus 5 `xhigh` | Claude Opus 5 (effort alto) | pendente |
| PB-14-02 | pending | Grok 4.6 `xhigh` | — | — |
| PB-14-03 | pending | GPT-5.6 Luna `xhigh` | — | — |
| PB-14-04 | pending | GPT-5.6 Luna `xhigh` | — | — |
| PB-14-05 | pending | Grok 4.6 `xhigh` | — | — |
| PB-14-06 | pending | GPT-5.6 Sol `xhigh` | — | — |

## Decisões pendentes

**Fechadas pela PB-14-01** em `docs/superpowers/specs/2026-09-09-pb-14-01-kits-design.md`: a conta
guarda **três personagens independentes**, um por vocação, com bestiary e conquistas promovidos à
raiz do save; e o set de uma faixa é **armadura compartilhada, arma filtrada por `weaponType` da
vocação**, com arma inata por vocação e sem economia de munição. O mesmo documento traz os kits
curados, os três papéis de monstro e o inventário de lacunas de contrato que as cards 02 e 05
consomem.

## Bloqueios

**B29 — aberto. Fecha rodando `import-canary` numa máquina com o snapshot.** Metade de itens do B27
do PB-13 continua aberta: `packages/content/src/generated/pb-01-contract-coverage.json` tem 87 itens
e **nenhum** com `slotType`, `weaponType`, `attack`, `armor` ou `defense`. O schema aceita os campos
desde a PB-13-04 e `parseItemsXml` os lê, mas eles só entram pelo import. Enquanto isso nenhum set
resolve, para nenhuma vocação, e o painel de equipamento conta `0 / 0` — o que torna a decisão B da
PB-14-01 inobservável no jogo. A PB-14-01 correu num checkout macOS sem snapshot
(`HUNTBOUND_CANARY_SOURCE` indefinida, `references/` vazia), e por isso nenhum número de Canary foi
congelado: identidade de spell sim, mana/cooldown/fórmula não. As cards 03 e 04 precisam do import
antes de autorar as fichas.

Contrato, schema e golden estão autorizados por card; nenhuma migração foi feita por este
planejamento. Modelos/effort efetivos são registrados por task.
