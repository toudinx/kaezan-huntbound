# PB-14-04 — Paladin no loop completo

**Objetivo.** Entregar Paladin selecionável com kit ranged, equipamento, apresentação, persistência
e helper coerentes no loop existente.

**Onde.** packages/content/src/selections/, packages/content/src/hunts/, packages/assets/,
apps/game/src/hunt/, apps/game/src/ui/, apps/game/src/save/.

**Fora de escopo.** Subclasses, munição como nova economia não decidida, novas hunts.

**Decisões congeladas.** Design PB-14-01. Distância e posição precisam importar conforme o kit
curado. Não importar decisões de munição de uma card congelada sem reconciliação. O Paladin entra com
o **set da faixa dele**, curado na 01, pelo mesmo motivo da 03.

**Gate.** Linhas content/assets de `AGENTS.md`: teste afetado se mudar lógica, content:check e
assets:check; architecture:check para imports; app e typecheck conforme o diff. Aplicar linhas
simulation/save somente se tocadas.

**O que olhar no jogo.** Jogar com Paladin e helper, mudar distância/alvo, equipar seu loot e
recarregar; distinguir seu combate do Sorcerer e Knight.
