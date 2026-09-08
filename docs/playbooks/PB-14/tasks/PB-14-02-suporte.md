# PB-14-02 — Suporte aos kits curados

**Objetivo.** Implementar somente as lacunas de combate compartilhadas identificadas na 01 que
impedem os kits selecionados. Preservar o comportamento existente onde a mudança não é intencional.

**Onde.** packages/contracts/src/, packages/simulation/src/kernel/, packages/content/src/hunts/,
packages/save/src/ quando houver compatibilidade de sessão afetada.

**Fora de escopo.** Framework genérico para habilidades futuras, classes completas e comportamento
não selecionado.

**Decisões congeladas.** Design PB-14-01. Se a capacidade já existir, reutilizar e registrar
ausência de diff necessária; não reimplementar. Contratos e goldens seguem a decisão registrada.

**Gate.** Linhas contracts/simulation/save de `AGENTS.md`: teste afetado, golden pertinente e
architecture:check; linha transversal só se aplicável; acrescentar content/assets e app conforme o
diff.

**O que olhar no jogo.** No cenário afetado, comparar alcance, linha de visão e resposta elemental
relevantes; o Knight continua funcionando.
