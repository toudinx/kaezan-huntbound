# PB-10 — Novas criaturas

**Status:** **esqueleto**. Não elegível. Depende do PB-08 integrado.

**Goal:** a caverna deixa de ter uma espécie. Ganha um trash de massa, um inimigo **ranged** e um
**caster**, e com isso o taunt, a postura e a mobilidade do PB-08 passam a ter contra o que existir.

## O defeito, medido

`packages/content/src/generated/hunts/venore-rotworm-cave/spawns.json` em 2026-08-24: **20 slots,
100% `creature:tibia:rotworm`**. Uma espécie, melee, que corre para o jogador. Contra isso, metade do
kit do Knight é botão morto.

E **cinco espécies têm spawn real na própria região** e foram excluídas por motivos baratos e
declarados em `packages/content/src/selections/hunts/venore-rotworm-cave.json`:

| Espécie | Spawns reais | Motivo declarado | Pipeline que resolve |
|---|---|---|---|
| Snake | 17 | "no catálogo, ausente do asset pack; precisa de sprite" | asset-packer |
| Orc Spearman | 11 | ausente da seleção PB-01 | importer de catálogo |
| Orc | 10 | idem | idem |
| Bat | 2 | idem | idem |
| Bonelord | 1 | idem | idem |

## Por que isto é barato — o ranged já roda

`references/canary/data-otservbr-global/monster/humanoids/orc_spearman.lua`:

```lua
{ name = "combat", interval = 2000, chance = 20, minDamage = 0, maxDamage = -30,
  range = 7, shootEffect = CONST_ANI_SPEAR, target = false }
```

105 HP, exp 38, **0–30 de dano a 7 tiles**. E o kernel **já sabe executar isso**:
`ActorBlueprint.attackRangeTiles` existe, com linha de visão e pathing que para no alcance, em
`packages/simulation/src/kernel/kernel.ts:249` e `:732`. Está implementado e **nenhuma criatura
usa** — rotworm é melee 1.

Orc: 70 HP, exp 25, melee. Snake: 15 HP, exp 10, `Stars` 1 — trash de massa que morre em bloco no
`exori`.

## O caster — e o que ele custa de verdade

`monster/humanoids/orc_shaman.lua`: 115 HP, exp 110, energia 20–31 a 7 tiles, **fogo 5–43 a 7 tiles
com `radius = 1`**, e **autocura 27–43 com chance 60%**. Atira de longe, tem ataque em área e se
cura sozinho — a autocura obriga burst e torna `exori` insuficiente.

**Ele não é conteúdo.** Duas coisas faltam no kernel, e ambas eram as PB-07-09 e PB-07-10 congeladas:

1. **A IA nunca conjura.** `buildHuntScenario.ts:284` dá `abilityIndices: []` a toda criatura, e o
   laço do hunter em `kernel.ts:720-760` só enfileira ataque, wander e movimento.
2. **Elemento é contrato vazio.** `resistances`, `immunities` e `attackElement` estão em
   `ActorBlueprint` e **não são lidos em nenhum arquivo** de `packages/simulation/src/kernel`.

**Decisão de 2026-08-24: conjuração entra, matemática de elemento não.** O Knight não tem dano nem
defesa elemental hoje, então resistência só deixaria o shaman mais duro de um jeito sem resposta. O
shaman registra `element`, o dano entra cheio, e a mitigação liga no PB-11 junto do equipamento que
resiste a ela.

Ele também é o único que precisa de **realocação**: não tem spawn nesta região. Decisão congelada 5
do PB-08 original permite — o layout cola pedaços do mapa real e realoca spawns reais —, desde que a
origem seja declarada em `spawnPlacements`.

## Escopo previsto

Bullets, não tasks. Decomposto por **fronteira de pipeline**.

- **Spawn por identidade estável** — o B9 do PB-08. O snapshot de save referencia spawn por
  `(índice de grupo, índice de slot)`, então toda mudança de conteúdo na hunt invalida todo save;
  custou 8 testes vermelhos e um ciclo de conserto na PB-08-01. Este playbook mexe em conteúdo de
  hunt **três vezes**. **Vem antes de tudo.**
- Catálogo ganha Orc e Orc Spearman — estende a seleção PB-01, que hoje tem 7 roots.
- Asset pack ganha os sprites: Snake `lookType 28`, Orc `5`, Orc Spearman `50`, Orc Shaman `6`.
- A caverna ganha as espécies — `creatures` e `spawnPlacements` da selection da hunt.
- **Criatura conjura** — IA que decide lançar, simétrica ao `queueInternalAttack` existente, e Orc
  Shaman ativo. Regenera golden.

## Invariantes herdados

- **Nenhum spawn é inventado.** Toda criatura sai do catálogo e todo spawn tem origem real em
  `otservbr-monster.xml`, declarada em `spawnPlacements`.
- **O princípio de design do PB-08 vale para criatura.** Espécies não são escada: snake, orc, orc
  spearman e rotworm coexistem porque cada uma se comporta de um jeito visível — massa frágil, melee
  duro, atirador, conjurador. Uma espécie que seja "rotworm com mais HP" não entra.
- `tibia/01` R2: raça dominante + variantes. Rotworm continua dominante.
- `tibia/01` R4, currículo de inimigos: **pack → ranged → caster**. Este playbook cobre os três
  primeiros passos e não deve pular para adiante.

## Dependências

**PB-08 integrado.** O taunt da PB-08-06 só tem valor aqui: contra rotworms, que correm para o
jogador de qualquer jeito, ele não faz nada; contra onze lanceiros atirando a 7 tiles, é a resposta.
