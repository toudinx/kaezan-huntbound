# PB-13-07 — Bestiary por espécie

**Objetivo.** Registrar progresso persistente de caça por espécie, com metas visíveis e uma
recompensa por meta cumprida. Não creditar duas vezes ao retomar a sessão.

**Onde.** `packages/contracts/src/save/`, `packages/save/src/`, `packages/content/src/`,
`apps/game/src/save/`, `apps/game/src/ui/`. As espécies são as sete já no catálogo.

**Fora de escopo.** Charms, talentos e bônus de poder de combate; espécies fora do recorte atual;
bestiary com árvore de progressão.

**Decisões congeladas.** README do PB-13, decisão 1: morrer perde a bag e o crédito da **run** — o
que já foi matado antes de morrer continua contado, porque XP e progresso de conta não retroagem. O
momento de crédito é o abate, não a saída; não herdar a regra de outro contador por conveniência.
**Autorizado nesta card:** subir `SAVE_SCHEMA_VERSION` para os contadores, com campo aditivo e
default que reproduz o save anterior, e regenerar os goldens de `packages/test-fixtures/save/pb06`.

**Gate.** Linha `packages/save`/`contracts`: teste afetado + `save:check` + `architecture:check`.
Somar `content:check` se as metas entrarem por catálogo.

**O que olhar no jogo.** Caçar uma espécie, ver o avanço, recarregar no meio e completar a meta.
Conferir que recarregar não repete o progresso nem a recompensa.
