# PB-13-02 — Escolher, concluir e voltar à hunt

**Objetivo.** Entregar seleção com preview, saída explícita e retorno ao atlas sem F5. Consolidar
ganhos uma única vez e preservar retomada, abandono e backup conforme a decisão da 01.

**Onde.** apps/game/src/main.ts, apps/game/src/ui/HuntingPlaces.ts, apps/game/src/save/,
packages/save/src/session/, packages/contracts/src/save/.

**Fora de escopo.** Gear, XP novo, NPC, dungeon e controle vazio de dificuldade.

**Decisões congeladas.** Design PB-13-01. A recompensa nasce da caça, não exclusivamente de um baú
final. Usar os dados existentes do índice; não carregar cinco packs inteiros só para o preview.

**Gate.** Linhas contracts/simulation/save de `AGENTS.md`: teste afetado, golden pertinente e
architecture:check; linha transversal só se aplicável; acrescentar content/assets e app conforme o
diff.

**O que olhar no jogo.** Entrar, obter loot, sair e escolher outra hunt. Recarregar antes e depois
da saída; conferir que a bolsa não duplica.
