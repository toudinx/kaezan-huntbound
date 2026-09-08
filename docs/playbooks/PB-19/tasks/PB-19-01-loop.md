# PB-19-01 — Fechar as decisões do loop

**Objetivo.** Definir o menor loop persistente que dê propósito à run do Knight. Registrar
progressão, saída, recompensa, morte, equipamento inicial e objetivo final num design curto;
materializar a card da próxima implementação com decisões e dependências claras.

**Onde.** `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`, `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`,
`docs/VALIDACAO_PROJETO.md`, `docs/playbooks/PB-19/`, `docs/superpowers/specs/`;
consultar `apps/game/src/main.ts`, `apps/game/src/save/`, `packages/save/src/`,
`packages/contracts/src/` e a seleção de combate para confrontar o plano com o estado real.

**Fora de escopo.** Implementar gameplay, migrar saves, regenerar goldens, criar outras vocações,
dungeons, árvores de talentos ou uma economia completa.

**Decisões congeladas.** ADR-05 e limites do roteiro. Knight e cinco hunts são base; não há spell
trancada por level. Não importar uma decisão antiga de perda de loot sem reconciliar a consolidação
atual. Listar mudanças de contrato/schema propostas e rollback antes de liberar sua implementação.

**Gate.** Documentação: `corepack pnpm exec biome check .`.

**O que olhar no jogo.** Nenhuma mudança visual nesta task. O design deve descrever uma sessão
com início, recompensa útil e próximo objetivo, e distinguir fatos do código de escolhas pendentes.
