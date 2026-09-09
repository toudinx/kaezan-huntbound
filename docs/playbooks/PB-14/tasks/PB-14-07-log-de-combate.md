# PB-14-07 — O log de combate

**Modelo sugerido.** Claude Opus 5, effort `xhigh` — recomendação de `docs/08_POLITICA_MODELOS_AGENTES.md`; o `STATE.md` registra o que foi usado.

**Origem.** Era a `PB-17-05`, movida para cá na revisão de 2026-09-09 por ser a única pendência viva
daquela fila e não ter sido absorvida por ninguém: o feed da PB-13-09 narra o que o **helper** fez,
não o que aconteceu com o jogador. A card original, com o raciocínio inteiro, está em
`docs/playbooks/PB-17/tasks/PB-17-05-o-log-de-combate.md` — histórico, mas vale como fonte.

**Objetivo.** Uma linha de texto que diz o que acabou de acontecer com o jogador. O kernel emite e a
tela descarta `combat/damaged`, `combat/healed`, **`combat/leeched`**, **`combat/regenerated`**,
`combat/attacked`, `loot/granted`, `actor/died` e **`command/rejected`**. Os três em negrito são os
que custam: leech e regen foram o PB-07 inteiro e nada na tela diz que existem — a vida sobe sozinha
e não se sabe se é a arma, a magia ou um bug; `command/rejected` é o oposto, o motivo já foi
calculado e jogado fora. Com três vocações no mesmo encontro, ler a diferença entre elas depende
disso.

**Onde.** `apps/game/src/ui/cockpit/` (o componente novo), `apps/game/src/hunt/CombatViewModel.ts`
(evento vira linha), `apps/game/src/ui/CombatHud.ts` e `apps/game/src/ui/cockpit/CockpitLayout.ts`
(a banda), `apps/game/src/styles.css`.

**Fora de escopo — é a metade difícil.** Não é chat, não tem canal nem aba; não repete o que o número
flutuante já diz no mesmo instante e no mesmo lugar (`CombatDecorations` já desenha `damage-number`
sobre o alvo); não escreve evento de simulação cru na tela; não persiste em save; não cobre tiles,
alvo nem ameaças. Rajada se funde: regen dispara em cadência fixa e uma linha por tick vira cachoeira
que apaga o dano que importava.

**Decisões congeladas.** A simulação não aprende que existe texto. `CombatViewModel` é a fronteira de
projeção, e é ali que mora o teste pequeno — fundir uma rajada de regen em uma linha converge mais
rápido com teste do que no browser.

**Gate.** Linha `apps/game`: `biome check .`; o teste Vitest do `CombatViewModel`; `typecheck` se
assinatura mudar.

**O que olhar no jogo.** Entrar numa hunt com cada vocação e bater até quase morrer: o log diz quem
bateu, quanto, quanto a arma devolveu, o que caiu e por que o `6` não saiu.
