# PB-14-03 — Sorcerer no loop completo

**Modelo sugerido.** GPT-5.6 Luna, effort `xhigh` — recomendação de `docs/08_POLITICA_MODELOS_AGENTES.md`; o `STATE.md` registra o que foi usado.

**Objetivo.** Entregar Sorcerer selecionável com kit, equipamento, apresentação, persistência e
helper coerentes. A mesma hunt deve funcionar com sua identidade mágica.

**Onde.** packages/content/src/selections/, packages/content/src/hunts/, packages/assets/,
apps/game/src/hunt/, apps/game/src/ui/, apps/game/src/save/.

**Fora de escopo.** Druid, subclasses, segunda economia e novas hunts.

**Decisões congeladas.** Design PB-14-01 e suporte da 02. Usar manifesto para FX/ícones. Custos,
habilidades e dados seguem a curadoria; não copiar o Knight mudando números. O Sorcerer entra com o
**set da faixa dele**, curado na 01 — o eixo de progressão é o set, e herdar o do Knight esvazia o
farm da classe.

**Gate.** Linhas content/assets de `AGENTS.md`: teste afetado se mudar lógica, content:check e
assets:check; architecture:check para imports; app e typecheck conforme o diff. Aplicar linhas
simulation/save somente se tocadas.

**O que olhar no jogo.** Selecionar Sorcerer, combater manualmente e com helper, obter/equipar loot
e retomar o save; identificar as magias olhando a luta.
