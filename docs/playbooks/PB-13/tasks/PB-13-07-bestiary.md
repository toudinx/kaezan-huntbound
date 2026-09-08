# PB-13-07 — Bestiary por espécie

**Objetivo.** Registrar progresso persistente da caça por espécie e mostrar metas e recompensas
definidas no design. Evitar crédito duplicado ao retomar a sessão.

**Onde.** packages/contracts/src/save/, packages/save/src/, packages/content/src/,
apps/game/src/save/, apps/game/src/ui/.

**Fora de escopo.** Charms, talentos ou bônus de poder não aprovados; catálogo de espécies fora do
recorte.

**Decisões congeladas.** Design PB-13-01. O momento de crédito e o tratamento da morte são os
definidos para este ganho; não herdar a regra de outro contador por conveniência.

**Gate.** Linhas contracts/simulation/save de `AGENTS.md`: teste afetado, golden pertinente e
architecture:check; linha transversal só se aplicável; acrescentar content/assets e app conforme o
diff.

**O que olhar no jogo.** Caçar uma espécie, ver avanço, recarregar e completar uma meta; conferir
que o progresso não se repete.
