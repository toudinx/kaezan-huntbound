# PB-14-01 — Kits, comportamento e lacunas reais

**Modelo sugerido.** Claude Opus 5, effort `xhigh` — recomendação de `docs/08_POLITICA_MODELOS_AGENTES.md`; o `STATE.md` registra o que foi usado.

**Objetivo.** Curar Sorcerer, Paladin e três papéis de monstro a partir do Canary. Registrar kits,
equipamentos, elementos, alcance e decisões de helper; definir as lacunas de contrato antes das
próximas cards.

**Onde.** docs/playbooks/PB-14/, docs/superpowers/specs/, docs/content/,
docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md; consultar packages/content/src/,
packages/simulation/src/kernel/, packages/contracts/src/.

**Fora de escopo.** Implementar classes, criar bestiário massivo, Druid ou boss autoral.

**Decisões congeladas.** PB-13 integrado, com as decisões congeladas do seu `README.md`; ADR-05.
Começar por espécies existentes. Não presumir que `attackElement` está inerte; conferir consumidores.
Registrar proveniência e qualquer extensão necessária. **Duas decisões que esta card deve fechar,
porque o PB-13 as criou:** (a) a conta guarda três personagens independentes ou um que troca de
vocação — é decisão de save, não de tela; (b) o set de cada vocação, já que o eixo de progressão é o
set da faixa e Sorcerer e Paladin não herdam o do Knight. Vale a regra 4 da *Curadoria* da ADR-05:
nenhuma ação é trancada por level, então os três kits nascem completos.

**Gate.** Documentação: `corepack pnpm exec biome check .`.

**O que olhar no jogo.** Sem mudança visual. Cada classe e cada papel de mob têm uma diferença
observável de posição, ataque ou resposta.
