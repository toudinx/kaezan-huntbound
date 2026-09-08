# PB-15-06 — Coleção visual de outfits

**Modelo sugerido.** GPT-5.6 Luna, effort `xhigh` — recomendação de `docs/08_POLITICA_MODELOS_AGENTES.md`; o `STATE.md` registra o que foi usado.

**Objetivo.** Entregar um pool pequeno de famílias de outfit do acervo com preview, seleção, addons
e cores conforme ADR-05. Preparar a coleção persistente usada pelo gacha.

**Onde.** packages/assets/, packages/content/src/, packages/contracts/src/save/, packages/save/src/,
apps/game/src/hunt/, apps/game/src/ui/.

**Fora de escopo.** Arte nova, catálogo inteiro, compra de poder e sorteio nesta task.

**Decisões congeladas.** Contrato de família da ADR-05. Asset pessoal não entra no Git; apresentação
por manifesto. Equipar outfit não modifica ficha de combate.

**Gate.** Linhas content/assets de `AGENTS.md`: teste afetado se mudar lógica, content:check e
assets:check; architecture:check para imports; app e typecheck conforme o diff. Aplicar linha save
para persistência.

**O que olhar no jogo.** Visualizar uma família, trocar apresentação/cores e recarregar; conferir
que o visual persiste e atributos de combate não mudam.
