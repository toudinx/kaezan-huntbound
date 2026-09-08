# PB-15-03 — Completar as caixas das hunts

**Modelo sugerido.** GPT-5.6 Luna, effort `xhigh` — recomendação de `docs/08_POLITICA_MODELOS_AGENTES.md`; o `STATE.md` registra o que foi usado.

**Objetivo.** Trazer Rotworm, Cyclopolis, Dragon Lair e Hero Cave para suas caixas curadas completas
usando o pipeline existente. Preservar circuitos, spawns e transições válidos.

**Onde.** packages/content/src/selections/hunts/, packages/content/src/layouts/hunts/,
tools/map-extractor/, packages/assets/; docs/content/HUNT_BANDS.md e referência histórica PB-10-15.

**Fora de escopo.** Recurar caixas, refazer Orc Fortress, nova espécie ou alterar renderer.

**Decisões congeladas.** PB-15-02 integrado. Fonte Canary e caixas congeladas; não editar gerados.
Identidade de spawn e compatibilidade da sessão devem seguir contratos atuais.

**Gate.** Linhas content/assets de `AGENTS.md`: teste afetado se mudar lógica, content:check e
assets:check; architecture:check para imports; app e typecheck conforme o diff.

**O que olhar no jogo.** Dar uma volta em cada hunt, trocar andares e voltar aos spots com respawn;
conferir que a seleção corresponde ao mapa entregue.
