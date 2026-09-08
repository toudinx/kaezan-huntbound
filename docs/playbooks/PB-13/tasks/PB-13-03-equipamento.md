# PB-13-03 — Equipamento e coleção de rares

**Objetivo.** Fazer um subconjunto de drops Canary melhorar ou alterar o set, com comparação e
equipamento persistente. Dar aos rares o registro de coleção definido na 01.

**Onde.** packages/content/src/importers/canary/xml/, packages/content/src/selections/,
packages/contracts/src/, packages/simulation/src/kernel/, packages/save/src/,
apps/game/src/ui/InventoryPanel.ts.

**Fora de escopo.** Importação massiva, affixes, reroll, craft, venda e slots além do recorte
decidido.

**Decisões congeladas.** Design PB-13-01 e ADR-05. Stats defensivos precisam ter efeito real, não só
aparecer na ficha. Gerados saem do pipeline; mudanças de golden devem ser intencionais.

**Gate.** Linhas contracts/simulation/save de `AGENTS.md`: teste afetado, golden pertinente e
architecture:check; linha transversal só se aplicável; acrescentar content/assets e app conforme o
diff.

**O que olhar no jogo.** Obter um item, comparar, equipar e observar seu efeito. Recarregar e
conferir set e coleção; um item pior continua disponível para venda futura.
