# PB-14-06 — Encontros das três vocações

**Objetivo.** Compor encontros com as espécies selecionadas nas hunts existentes e ajustar a leitura
e o helper de cada classe. Corrigir somente impedimentos concretos ao combate integrado.

**Onde.** packages/content/src/selections/hunts/, packages/content/src/layouts/hunts/,
apps/game/src/hunt/, apps/game/src/ui/cockpit/, packages/assets/.

**Fora de escopo.** Sexta hunt, rebalanceamento ilimitado, novo sistema de combate e auditoria
obrigatória.

**Decisões congeladas.** Design PB-14-01. Não substituir mapa por arena fabricada; manter fonte
Canary e identidade estável de spawns. Aceite de diversão é do usuário.

**Gate.** Linhas content/assets de `AGENTS.md`: teste afetado se mudar lógica, content:check e
assets:check; architecture:check para imports; app e typecheck conforme o diff. Última task: build.

**O que olhar no jogo.** Jogar e assistir ao helper no mesmo encontro com as três classes;
identificar perigo, resposta e resultado sem o HUD ocultar tiles.
