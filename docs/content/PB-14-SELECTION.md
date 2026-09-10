# PB-14 — Seleção congelada do Sorcerer

**Vocação:** `vocation:tibia:sorcerer`
**Snapshot:** `references/canary` em `157e6f9e21318bd3033eea553fe9275b429faf72`, lido em 2026-09-09
**Arquivo:** `packages/content/src/selections/pb-14-03-sorcerer.json`
**Revalidação:** os SHA-256 estão em `packages/content/src/sources/canary-157e6f9e.json`

## Por que este documento existe

A primeira integração do PB-14-03 foi escrita num host **sem** o snapshot. A curadoria do PB-14-01
tinha deixado explícito que nada de número seria congelado ali — *"Nada de mana, cooldown,
coeficiente de fórmula, `gainhp`/`gainmana`/`manaMultiplier` ou `baseSpeed` foi congelado aqui, e
nenhum deve ser inventado pelas cards seguintes. Eles entram pelo `import-canary`"* — e a card
seguinte inventou todos eles, porque não havia o que ler. Este documento é o import que faltou.

O desenho não mudou: as oito ações, suas formas e seus papéis continuam os da curadoria PB-14-01
§3.1. O que mudou foram os números, que agora vêm do snapshot.

## Vocação — `data/XML/vocations.xml`, `<vocation id="1" name="Sorcerer">`

| Campo Huntbound | Atributo Canary | Valor | Antes |
|---|---|---|---:|
| `baseSpeed` | `basespeed` | 110 | 105 |
| `gainHp` | `gainhp` | 5 | 5 |
| `gainMana` | `gainmana` | 30 | 30 |
| `gainCapacity` | `gaincap` | 10 | 10 |
| `manaMultiplier` | `manamultiplier` | 1.1 | 1.1 |
| `attackSpeedMs` | `attackspeed` | 2000 | 2000 |
| `healthRegenMs` / `healthRegenAmount` | `gainhpticks` / `gainhpamount` | 12000 / 1 | ausentes |
| `manaRegenMs` / `manaRegenAmount` | `gainmanaticks` / `gainmanaamount` | 3000 / 2 | ausentes |
| `skillMultipliers` | `<skill id=… multiplier=…>` | 1.5, 2.0, 2.0, 2.0, 2.0, 1.5, 1.1 | 1.1 nos sete |

`basespeed` **é importado como número e não como mecânica.** Velocidade não deriva de nível neste
jogo: é decisão congelada e divergência deliberada do Tibia.

## Spells

Forma, elemento e papel são da curadoria. `level`, `mana`, `cooldown`, `groupCooldown` e a fórmula
são do snapshot. `spell.level` continua **provenance, não gate** — a mesma política do
`PB-01-SELECTION.md` e do `PB-05-SELECTION.md`, e é por isso que um Sorcerer nível 1 casta Sudden
Death.

A fórmula do Lua é `min = (level / 5) + (maglevel * a) + b`. Ela mapeia em `levelMagic` como
`levelFactor` 0.2, `minMagicFactor`/`maxMagicFactor` = os dois `a`, `minAddend`/`maxAddend` = os
dois `b`.

| Spell | Arquivo | level | mana | cd / grp | fórmula (min / max) |
|---|---|---:|---:|---:|---|
| Energy Strike | `spells/attack/energy_strike.lua` | 12 | 20 | 2000 / 2000 | ×1.403 +8 / ×2.203 +13 |
| Fire Wave | `spells/attack/fire_wave.lua` | 18 | 25 | 4000 / 2000 | ×1.25 +4 / ×2 +12 |
| Great Fireball | `runes/great_fireball.lua` | 30 | 0 | 2000 / 2000 | ×1.2 +7 / ×2.8 +17 |
| Sudden Death | `runes/sudden_death.lua` | 45 | 0 | 2000 / 2000 | ×4.605 +28 / ×7.395 +46 |
| Ultimate Healing | `spells/healing/ultimate_healing.lua` | 30 | 160 | 1000 / 1000 | ×6.8 +42 / ×12.9 +90 |
| Magic Shield | `spells/support/magic_shield.lua` | 14 | 50 | 14000 / 2000 | — (condição) |
| Arcane Stance | — | 1 | 0 | 0 / 2000 | — (condição) |
| Haste | `spells/support/haste.lua` | 14 | 60 | 2000 / 2000 | — (condição) |

### As duas runas custam carga, não mana

`great_fireball.lua` declara `rune:charges(4)` e `sudden_death.lua` declara `rune:charges(3)` —
`buildHuntScenario.ts` carregava 3 e 2, inventados. A mana de 530 e 985 que aparece nos scripts de
`conjuring` é o preço de **fabricar** o item, e a ADR-05 substituiu a fabricação por recarga fora de
combate, sem inventário e sem loja. Então `mana` é 0 nas duas e o custo é a carga. É a leitura fiel
das duas fontes; se um dia o V0 ganhar inventário, é aqui que a decisão se desfaz.

### Arcane Stance não vem do snapshot, e isso é autorizado

O slot 7 é o desvio de proveniência que a ADR-05 já permite: TibiaWiki `15.25.3a4a52`, não o
Canary. Está declarado em `provenanceDeviations` dentro da seleção para que ninguém volte a procurar
um `.lua` que não existe. Ele é `damageDealtPermille` 150 e **não** bônus de skill, porque
`outgoingDamagePermille` só soma `skillModifierPermille` quando o elemento é `physical` e o dano do
Sorcerer é inteiramente elemental.

## O que continua sendo escolha Huntbound

| Valor | Onde | Por quê |
|---|---|---|
| `maxHealth` base 150 | `sorcererProgression.ts` | `healthmax` default do `schema.sql` do Canary |
| `maxMana` base 200 | `sorcererProgression.ts` | escolha Huntbound; `manamax` default do `schema.sql` é 0, e o Knight congelou 185 pelo mesmo motivo |
| ganho por nível 5 HP / 30 mana | `sorcererProgression.ts` | é `gainhp`/`gainmana` da vocação |
| forma e raio de área das três spells de dano | seleção | curadoria PB-14-01 §3.1; o Canary dá `AREA_WAVE4` e `AREA_CIRCLE3X3`, que não têm tradução direta no grid do V0 |
| bandas do kit (uma só, 1→∞) | seleção | PB-14-03; a escada é o set, não a spell |

## Proveniência

Cada arquivo acima está em `canary-157e6f9e.json` com seu SHA-256, e a seleção lista os dez em
`sourceFiles`. Os hashes do lock foram medidos num checkout **CRLF**; num host Unix o clone vem LF e
todos os quinze arquivos de texto batem errado. Ver `references/README` do `AGENTS.md` — a correção
é `git config core.autocrlf true` no clone de referência, nunca reescrever o lock.
