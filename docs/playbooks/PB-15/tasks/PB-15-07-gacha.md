# PB-15-07 — Gacha cosmético e V0 integrado

**Objetivo.** Conectar moeda obtida jogando ao pool pequeno de outfits, garantia de novidade,
duplicatas e tokens da ADR-05. Fechar o ciclo de coleção integrado às hunts e dungeon.

**Onde.** packages/contracts/src/save/, packages/save/src/, packages/content/src/,
apps/game/src/save/, apps/game/src/ui/; docs/playbooks/PB-15/STATE.md.

**Fora de escopo.** Dinheiro real, poder, novo banner complexo, auditoria obrigatória e correções
independentes não reportadas.

**Decisões congeladas.** Contrato de gacha da ADR-05; débito, prêmio, garantia e duplicata persistem
atomicamente. O fim do V0 é aceite dos marcos, não completar toda a coleção.

**Gate.** Linhas contracts/simulation/save de `AGENTS.md`: teste afetado, golden pertinente e
architecture:check; linha transversal só se aplicável; acrescentar content/assets e app conforme o
diff. Última task: build.

**O que olhar no jogo.** Obter moeda jogando, fazer pulls, conferir garantia/duplicata/tokens e
recarregar. Repetir hunt e dungeon mantendo set, level e coleção.
