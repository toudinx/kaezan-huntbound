# PB-13-01 — Decisões de progressão e economia

**Objetivo.** Registrar num design curto os ganhos por caça, XP/level, loot/set/rares, venda a NPC,
um uso inicial de gold, bestiary/conquistas e morte. Resolver o que falta para executar as cards
seguintes e reconciliar ADRs necessárias.

**Onde.** docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md, docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md,
docs/playbooks/PB-13/, docs/superpowers/specs/; consultar apps/game/src/save/, packages/save/src/,
packages/contracts/src/ e packages/content/src/selections/.

**Fora de escopo.** Implementação, migração de save, goldens, todas as alternativas de consumíveis e
reroll.

**Decisões congeladas.** Motivações de farm do roteiro estão aprovadas. Não reabrir sua inclusão.
Definir alterações de contrato e rollback antes das implementações; propostas não resolvidas ficam
explícitas.

**Gate.** Documentação: `corepack pnpm exec biome check .`.

**O que olhar no jogo.** Sem mudança visual. O design descreve caçar, vender, preparar outra hunt e
o que acontece ao morrer ou recarregar.
