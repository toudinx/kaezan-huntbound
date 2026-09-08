# PB-15-01 — Dungeon e modulação da build

**Objetivo.** Definir uma dungeon curta com conteúdo Canary, encontros/boss, saída e recompensa.
Decidir modo livre/modulado, tratamento de level/gear e compatibilidade de save; reconciliar emenda
09 e ADR-05.

**Onde.** docs/09_EMENDA_ADR05_SINCRONIZACAO_DE_FAIXA.md,
docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md, docs/playbooks/PB-15/, docs/superpowers/specs/,
docs/content/; consultar packages/contracts/src/, packages/save/src/, packages/content/src/.

**Fora de escopo.** Implementação, dial Stasis obrigatório, ranking, novos afixos ou aprovação
automática de reroll.

**Decisões congeladas.** PB-14 integrado. Sync deriva da build real e não reduz progresso
permanentemente. Recompensa/minuto é hipótese, não igualdade garantida. Rares, set e gold devem
continuar úteis.

**Gate.** Documentação: `corepack pnpm exec biome check .`.

**O que olhar no jogo.** Sem mudança visual. O design explica por que revisitar conteúdo e o que
muda ao modular; explicita decisões de contrato antes de implementar.
