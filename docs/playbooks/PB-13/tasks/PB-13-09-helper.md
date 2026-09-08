# PB-13-09 — Helper mínimo e feedback

**Objetivo.** Entregar cura, alvo, ações e loot como módulos desligáveis que respeitam a intervenção
manual, e explicar no cockpit o que o helper fez, o que recusou e o que você ganhou — sem cobrir o
combate.

**Onde.** `apps/game/src/hunt/`, `apps/game/src/ui/cockpit/`, `apps/game/src/simulation/`,
`packages/simulation/src/commands/`, `packages/contracts/src/`. Tocar
`packages/simulation/src/kernel/` só se faltar regra já aprovada.

**Fora de escopo.** Cavebot, navegação entre hunts, farm offline, editor de scripts, vocações novas
e prioridade configurável de rotação.

**Decisões congeladas.** A ADR-05 já lista o helper como extensão permitida, *"inicialmente limitado
a cura, alvo, ações e loot"* — este é o recorte, e ele é **módulo desligável**, não modo de jogo. O
helper emite comandos pelos **caminhos normais**: custo, alcance e cooldown valem para ele como para
você, e uma recusa é informação a mostrar, não a contornar. Retomar o controle é imediato e não
espera fim de ação. Ele opera o buff comprado da PB-13-06 sem exigir spam manual. IA de monstro não
prova helper de jogador pronto — são caminhos diferentes.

**Gate.** Linha `apps/game`: `biome check .`; teste Vitest diretamente afetado onde houver lógica
pura de decisão; `typecheck` se assinatura mudar. Somar a linha de `contracts`/`simulation` se o
diff alcançar comando ou kernel. **Última task do playbook: rodar `corepack pnpm build` uma vez.**

**O que olhar no jogo.** Ligar e desligar cada módulo, jogar manualmente com eles ligados e depois
assistir uma luta inteira. Identificar no cockpit a cura, a troca de alvo, uma recusa e o loot; tomar
o controle no meio e sentir que ele sai da frente na hora.
