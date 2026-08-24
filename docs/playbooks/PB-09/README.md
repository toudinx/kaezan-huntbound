# PB-09 — Progressão

**Status:** **esqueleto**. Não elegível. **Começa por design doc, não por task card.**

**Goal:** decidir o que progressão significa em Huntbound, e só então implementá-la.

## Por que este playbook não tem tasks

O dono, em 2026-08-24: *"essa parte dá lógica à gameplay. E eu acho fundamental, porém ainda não sei
como vamos fazer. Acho que acertar aqui é onde vamos definir se nosso jogo vai ser interessante.
Pois é onde retém os jogadores, onde o grinding e necessidade de evolução vive. **Mas precisamos
pensar bem, pois não somos um MMORPG que nem o Tibia.**"*

Escrever task card antes de responder isso seria escrever a implementação de uma decisão que não foi
tomada. **A primeira entrega deste playbook é um design doc**, em
`docs/superpowers/specs/<data>-progressao-huntbound-design.md`.

## A pergunta que o design doc tem que responder de frente

O PB-08 congelou que **level não destrava spell** — o Knight tem o kit inteiro desde o começo. Isso
torna a pergunta mais afiada, não mais fácil:

> **O que ganhar um level me dá?**

Sem destravar ação, sobram HP, mana e dano. São números. E números subindo por dezenas de horas é
exatamente a progressão de MMO que o dono questionou.

## Entradas obrigatórias

1. **O princípio de design do PB-08** — `docs/playbooks/PB-08/README.md`, seção "O princípio de
   design". Sem escada; coexistência só com distinção visual; orçamento de ações. Progressão que
   viole isso está errada por construção.
2. `docs/research/gacha/W09_economia_progressao.md` — §4.1 eixos de poder e orçamento, §4.2 curva da
   conta, P1–P12.
3. `docs/research/tibia/01_hunts_progression.md` — §3.5 "O que *não* muda — e é justamente o
   problema", R1 (tiers comprimidos, cap baixo), R5 (toda kill alimenta ≥3 contadores), R7
   (substituir o risco de morte, não portá-lo).
4. `docs/research/tibia/02_vocations_spells_runes.md` §10 — Wheel of Destiny. A conclusão relevante:
   *"Spell grades (Regular/Upgraded/Max) resolve o problema central: como dar progressão a longo
   prazo com apenas 5 spells."* É a alternativa mais direta a "números subindo".
5. `docs/research/tibia/03_bestiary_bossiary.md` §7 e §9 — modelo de Códex e os princípios P1–P10,
   com destaque para **P1: o crédito é da run, não do kill**.

## Formas candidatas, a comparar no design doc

| Forma | Essência | Custo | Risco |
|---|---|---|---|
| **Graus de ação** | Cada uma das nove ações tem Regular / Aprimorado / Máximo. Progressão longa sem inflar botões. Casa com o princípio do PB-08 e com arma-como-eixo | médio | precisa de fonte de pontos |
| **Curva do Tibia com multiplicador** | `exp(level)` do Tibia, `experienceRate`. Familiar, aritmética já feita no PB-08 original | baixo | é a progressão de MMO que o dono questionou |
| **Progressão de conta por run** | Sem level de personagem; run concluída paga moeda que compra melhoria permanente | médio | **exige emenda à ADR-05** — maior divergência do Tibia da lista |

Nenhuma é excludente das outras. O design doc recomenda uma e justifica.

## Escopo previsto, depois da decisão

Bullets, não tasks. Nada aqui está congelado.

- XP como projeção de `actor/died`, no molde de `projectRunBag`. **O kernel não precisa saber o que
  é XP** e nenhuma task de projeção regenera golden.
- Skill de sword por uso, projetada de `combat/attacked`.
- `CharacterDefinition` derivada de conteúdo base + progressão. **A tabela de faixas da PB-08-03 já
  existe**; este playbook alimenta o level que ela recebe.
- Save 1→2 com migração.
- **Códex** — para de descartar `monster.Bestiary`, que hoje é lido e jogado fora em
  `packages/content/src/importers/canary/lua/parseMonsterLua.ts:70`. O snapshot já traz `toKill`,
  `Stars`, `CharmsPoints`, `class` e `race` por criatura. Crédito **no fim da run** (P1), o que
  exige o fim da run do PB-11.
- `experienceRate` e progressão persistente são **extensões Huntbound** e precisam de emenda à
  ADR-05 antes de entrar.

## Dependências

- **PB-08 integrado** — a tabela de faixas é onde o level vai desembocar.
- Códex e qualquer contador creditado por run dependem do **fim da run**, que está no PB-11.
- `docs/research/**` é evidência histórica: fatos e medições valem, recomendações de stack não.
