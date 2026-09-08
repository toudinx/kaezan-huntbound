# PB-14-01 — Kits, comportamento e lacunas reais

**Objetivo.** Curar Sorcerer, Paladin e três papéis de monstro a partir do Canary. Registrar kits,
equipamentos, elementos, alcance e decisões de helper; definir as lacunas de contrato antes das
próximas cards.

**Onde.** docs/playbooks/PB-14/, docs/superpowers/specs/, docs/content/,
docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md; consultar packages/content/src/,
packages/simulation/src/kernel/, packages/contracts/src/.

**Fora de escopo.** Implementar classes, criar bestiário massivo, Druid ou boss autoral.

**Decisões congeladas.** PB-13 integrado; ADR-05. Começar por espécies existentes. Não presumir que
attackElement está inerte; conferir consumidores. Registrar proveniência e qualquer extensão
necessária.

**Gate.** Documentação: `corepack pnpm exec biome check .`.

**O que olhar no jogo.** Sem mudança visual. Cada classe e cada papel de mob têm uma diferença
observável de posição, ataque ou resposta.
