# PB-05 — Seleção congelada de vocação, spells e ficha

**Hunt:** `hunt:tibia:venore-rotworm-cave` (não reextraída)  
**Vocação:** `vocation:tibia:knight`  
**Snapshot usado na medição:** `references/canary` local, lido em 2026-08-16  
**Ferramenta de revalidação:** `tools/hunt-selection/cli.ts check-combat`

## Decisão

A seleção congelada usa exatamente uma vocação, três spells, uma arma e uma ficha de
conteúdo. Nenhuma task posterior redescobre IDs nem reconverte tempos.

| Campo | Valor congelado |
|---|---|
| Vocação | `vocation:tibia:knight` (`sourceId` `4`) |
| Spells | `spell:tibia:berserk` (`exori`), `spell:tibia:brutal-strike` (`exori ico`), `spell:tibia:wound-cleansing` (`exura ico`) |
| Arma | `item:tibia:sword` (`sourceId` `3264`, `attack` `14`) |
| Criatura | `creature:tibia:rotworm` (`speed` `58`, melee `0–40` / `2000 ms`) |
| Ficha | level `8`, sword `10`, magic `0`, `maxHealth` `185`, `maxMana` `185` |
| Acesso a spell | `unrestricted` — `spell.level` do Lua é provenance, não gate |
| Ritmo de passo | `player` `11` ticks, `rotworm` `21` ticks |
| Ritmo de ataque | `player` `40` ticks, `rotworm` `40` ticks |
| Mitigação | zero |

Castar é mecânica do V0, não progressão de MMORPG. As três spells entram no kit desde
o início da run: PB-05-02 e PB-05-07 **não** recusam conjuração por `spell.level`. O
campo `level` no Lua (Berserk `35`, Brutal Strike `16`, Wound Cleansing `8`) permanece
como provenance do snapshot.

A ficha nasce no level recomendado da hunt (`8`), não no maior `spell.level`. A
alternativa da spec — inflar a ficha para `35` ou remover Berserk — **foi rejeitada**.

## Arquivos-fonte

Hashes SHA-256 gerados dos arquivos reais do snapshot em 2026-08-16:

| Path relativo | SHA-256 |
|---|---|
| `data/XML/vocations.xml` | `693a179048d5d5c5af519459c8e542cd01013212af1cec88f7c8eb72634f4350` |
| `data/scripts/spells/attack/berserk.lua` | `819b628608268aebea355be46a1d86e73c24bdf26d1299aa7d3e9af71d10f89f` |
| `data/scripts/spells/attack/brutal_strike.lua` | `08e00c322d9b0d8805f3f9b40776205d579c1481bd72667efbc85a99efbc62c3` |
| `data/scripts/spells/healing/wound_cleansing.lua` | `e0a10fcce56a981a811fe18d687336cc1799cc76087b1d0bfd9a1b5f828e245b` |
| `data-otservbr-global/monster/vermins/rotworm.lua` | `f75ed297cd851013cde4e991113bf2d67ab9930852f20fb0c4e8d0937ddb176b` |
| `data/items/items.xml` | `b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8` |
| `src/creatures/creature.hpp` | `80da5adc1bc8a12b0fcabd8d868e8166fa04c8fe0fa69a2589cd66ac461069b9` |
| `src/creatures/players/player.cpp` | `6c357271577e4bb6bf30783303025f38d49dea2065ed499ade90be758d7af2d4` |
| `src/items/weapons/weapons.cpp` | `7ee611e8506a48aef1d6ff84133cbfa79af602ce9ba184db5dba95d258aff9c0` |
| `src/utils/utils_definitions.hpp` | `c35faffb5cf6a8f8f988cfe8c071b332a929ef3e48489672307b1b77e171d9a8` |
| `src/game/game.hpp` | `1df771ec63ceb6882c30029f94c373c7a25a54f65d2b7295b431a97b29b00402` |
| `schema.sql` | `81b5727b8b7805025f371e2486e28c9027d876d1155cf4667e5768313be54cd7` |

Os quatro primeiros hashes de vocação, Berserk, Rotworm e `items.xml` coincidem com
`packages/content/src/sources/canary-157e6f9e.json`.

## Spells novas

### `exori ico` — Brutal Strike

Fonte: `data/scripts/spells/attack/brutal_strike.lua`

| Campo | Valor |
|---|---|
| `spell:id` | `61` |
| `words` | `exori ico` |
| `level` | `16` |
| `mana` | `30` |
| `cooldown` | `6 * 1000` → `6000` ms → `120` ticks |
| `groupCooldown` | `2 * 1000` → `2000` ms → `40` ticks |
| vocações | `knight;true`, `elite knight;true` |
| efeito | `CONST_ME_HITAREA` (`10`) |
| distância | `CONST_ANI_WEAPONTYPE` (`254`) |

`onGetFormulaValues` exato:

```lua
function onGetFormulaValues(player, skill, attack, factor)
	local skillTotal = skill * attack
	local levelTotal = player:getLevel() / 5
	return -(((skillTotal * 0.02) + 4) + levelTotal) * 1.28, -(((skillTotal * 0.04) + 9) + levelTotal) * 1.28
end
```

Essa forma **não** é a allowlist `skillAttack` de `parseSpellLua.ts`. A representação
no schema fica para PB-05-02. Os inteiros `minPower`/`maxPower` já estão resolvidos
abaixo com a ficha congelada.

### `exura ico` — Wound Cleansing

Fonte: `data/scripts/spells/healing/wound_cleansing.lua`

| Campo | Valor |
|---|---|
| `spell:id` | `123` |
| `words` | `exura ico` |
| `level` | `8` |
| `mana` | `40` |
| `cooldown` | `1 * 1000` → `1000` ms → `20` ticks |
| `groupCooldown` | `1 * 1000` → `1000` ms → `20` ticks |
| vocações | `knight;true`, `elite knight;true` |
| efeito | `CONST_ME_MAGIC_BLUE` (`13`) |

`onGetFormulaValues` exato:

```lua
function onGetFormulaValues(player, level, magicLevel)
	local min = (level * 0.2 + magicLevel * 4) + 25
	local max = (level * 0.2 + magicLevel * 7.95) + 51
	return min, max
end
```

Callback `CALLBACK_PARAM_LEVELMAGICVALUE`, não `SKILLVALUE`. O schema atual só
conhece `skillAttack`. **Decisão de contrato adiada para PB-05-02 e PB-05-03.** A
forma acima é a fonte; o kernel continua recebendo só `minPower`/`maxPower`
inteiros.

### `exori` — Berserk (já no catálogo)

Fonte: `data/scripts/spells/attack/berserk.lua` — `spell:id` `80`, level `35`,
mana `115`, cooldown `4000` ms (`80` ticks), groupCooldown `2000` ms (`40` ticks),
área `AREA_SQUARE1X1`, fórmula `skillAttack` já importada.

## Conversão de `speed` → `stepCooldownTicks`

Medida em `Creature::updateCalculatedStepSpeed` e `Creature::getStepDuration`
(`src/creatures/creature.hpp`, `src/creatures/creature.cpp`). Constantes:

| Símbolo | Valor | Fonte |
|---|---:|---|
| `speedA` | `857.36` | `creature.hpp` |
| `speedB` | `261.29` | `creature.hpp` |
| `speedC` | `-4795.01` | `creature.hpp` |
| `groundSpeed` base | `150` | fallback de `Creature::setParent` quando o ground não declara `speed` |
| `SERVER_BEAT` | `0x32` = `50` | `src/game/game.hpp` |

Expressão (passo ortogonal; diagonal e *nearby* não entram no blueprint):

```text
calculatedStepSpeed = max(floor(speedA * ln(speed + speedB) + speedC + 0.5), 1)
durationRawMs       = floor(1000 * groundSpeed / calculatedStepSpeed)
durationMs          = ceil(durationRawMs / SERVER_BEAT) * SERVER_BEAT
stepCooldownTicks   = durationMs / 50
```

`durationMs` é sempre múltiplo de `50` por construção. Resto não nulo seria erro.

### Contas

**Rotworm** `speed = 58`:

```text
ln(58 + 261.29) = ln(319.29)
calculatedStepSpeed = floor(857.36 * ln(319.29) + (-4795.01) + 0.5) = 149
durationRawMs = floor(1000 * 150 / 149) = 1006
durationMs = ceil(1006 / 50) * 50 = 1050
stepCooldownTicks = 1050 / 50 = 21
```

**Knight** `vocation.baseSpeed = 110` (a estatística da vocação, não o speed
composto do personagem):

```text
ln(110 + 261.29) = ln(371.29)
calculatedStepSpeed = floor(857.36 * ln(371.29) + (-4795.01) + 0.5) = 278
durationRawMs = floor(1000 * 150 / 278) = 539
durationMs = ceil(539 / 50) * 50 = 550
stepCooldownTicks = 550 / 50 = 11
```

O jogador de level `8` teria `baseSpeed + (level - 1) = 117` e derivaria os
mesmos `11` ticks. Isso **não** muda o valor congelado: o blueprint deriva da
estatística da vocação/criatura (`110` → `11`), não da ficha composta. A conta
de um Knight de `35` (`144` → `9` ticks) fica só como referência do que o gate
de MMORPG teria inflado.

### Decisão contra os valores jogáveis atuais

PB-04-FIX-01 deixou `player` `10` e `rotworm` `20`, aprovados pela auditoria como
jogáveis. A derivação fiel produz `11` e `21` — um tick (`50 ms`) de diferença,
cerca de `10%`. Não é um ritmo “muito diferente”.

| Opção | player | rotworm | Impacto |
|---|---:|---:|---|
| A — fiel ao snapshot | `11` | `21` | paga a dívida de `MAP_REGION_CONTRACT.md`; `hunt.json` permanece `10`/`20` (não reextraído); o cenário de combate aplica os novos valores em PB-05-07 |
| B — manter jogável | `10` | `20` | preserva a sensação de PB-04; abandonaria a medição que esta task existe para fazer |

**Escolha: opção A (`11` / `21`).** Retunar em silêncio para `10`/`20` seria o
defeito. A diferença de um tick não justifica descartar a fórmula do servidor.

## Conversão de intervalo de ataque

`TICK_DURATION_MS = 50`. Resto não nulo é erro.

| Fonte | `intervalMs` | `intervalMs / 50` | resto |
|---|---:|---:|---:|
| Knight `attackSpeedMs` | `2000` | `40` | `0` |
| Rotworm melee `interval` | `2000` | `40` | `0` |
| Berserk cooldown | `4000` | `80` | `0` |
| Berserk groupCooldown | `2000` | `40` | `0` |
| Brutal Strike cooldown | `6000` | `120` | `0` |
| Brutal Strike groupCooldown | `2000` | `40` | `0` |
| Wound Cleansing cooldown | `1000` | `20` | `0` |
| Wound Cleansing groupCooldown | `1000` | `20` | `0` |

## Ficha congelada

A ficha é conteúdo versionado, não estado persistido.

| Campo | Valor | Fonte |
|---|---|---|
| vocação | `vocation:tibia:knight` | decisão do playbook |
| level | `8` | level recomendado da hunt / TibiaRoute |
| sword | `10` | default `schema.sql` `skill_sword` |
| magic | `0` | default `schema.sql` `maglevel` |
| arma | `item:tibia:sword` `3264` `attack 14` | loot do Rotworm, já no catálogo PB-01 |
| fightMode | offensive, `attackFactor = 1.0` | `Player::getAttackFactor` |
| `maxHealth` | `185` | conta Canary abaixo |
| `maxMana` | `185` | loadout Huntbound, não `manamax` Canary |
| `spellAccess` | `unrestricted` | kit inteiro desde o início da run |

Skills **não** foram inventadas para “parecer um EK”. O default do snapshot é a
única fonte sem treino. Inventar sword `50` não tem arquivo-fonte.

### Vida e mana

`schema.sql`: level `1` começa com `healthmax = 150`, `manamax = 0`.
`Player` usa `vocation 0` (`gainhp 5`, `gainmana 5`) enquanto `level <= 8`. A
vocação Knight (`gainhp 15`, `gainmana 5`) só entra de `9` em diante — e esta
ficha não passa de `8`.

```text
maxHealth = 150 + 7 * 5 = 185   (Canary)
maxMana   Canary = 0 + 7 * 5 = 35
maxMana   Huntbound = 115 + 40 + 30 = 185
```

Canary no level `8` tem `35` de mana e não paga Berserk (`115`) nem o heal
(`40`). Sem progressão de level no V0, isso deixaria dois terços do kit como
botão morto — o oposto de “castar é mecânica”. O pool congelado é a soma dos
três custos, um loadout, não o `manamax` do MMORPG. HP permanece o Canary da
hunt.

## Fórmulas resolvidas em inteiros

Canary lê o retorno Lua com `static_cast<int32_t>(lua_tonumber(...))`, truncando
na direção de zero. Dano sai negativo no Lua; `minPower`/`maxPower` guardam o
valor absoluto para o kernel.

Ficha: `level = 8`, `skill = 10`, `attack = 14`, `magicLevel = 0`.

### Berserk (`skillAttack`)

```text
min = -((8 / 5) + (10 + 14) * 0.5) * 1.1 = -(1.6 + 12) * 1.1 = -14.96 → -14
max = -((8 / 5) + (10 + 14) * 1.5) * 1.1 = -(1.6 + 36) * 1.1 = -41.36 → -41
minPower = 14, maxPower = 41
```

### Brutal Strike (`skill * attack`)

```text
skillTotal = 10 * 14 = 140
levelTotal = 8 / 5 = 1.6
min = -(((140 * 0.02) + 4) + 1.6) * 1.28 = -8.4 * 1.28 = -10.752 → -10
max = -(((140 * 0.04) + 9) + 1.6) * 1.28 = -16.2 * 1.28 = -20.736 → -20
minPower = 10, maxPower = 20
```

### Wound Cleansing (`level + magicLevel`)

```text
min = (8 * 0.2 + 0 * 4) + 25 = 26.6 → 26
max = (8 * 0.2 + 0 * 7.95) + 51 = 52.6 → 52
minPower = 26, maxPower = 52
```

### Golpe físico do Knight

`Weapons::getMaxWeaponDamage` (melee) e `WeaponMelee::getWeaponDamage`,
`attackFactor = 1.0`, `meleeDamageMultiplier = 1.0`:

```text
minValue = level / 5 = 8 / 5 = 1          (divisão inteira uint32)
maxValue = round(0.085 * 1.0 * 14 * 10 + 8 / 5)
         = round(11.9 + 1) = round(12.9) = 13
minPower = 1, maxPower = 13
```

### Melee do Rotworm

Já no catálogo: `0–40` a cada `2000` ms. Sem conversão de fórmula; só o intervalo.

## Assets necessários

A seleção do pack é PB-05-09. Aqui congela **o que** precisa existir:

| Uso | ID no snapshot | Fonte |
|---|---|---|
| golpe físico vs raça `blood` e sangue | `CONST_ME_DRAWBLOOD = 1` | `utils_definitions.hpp`; `Game::combatGetTypeInfo` |
| splash de sangue | `ITEM_SMALLSPLASH = 2889` | `utils_definitions.hpp` |
| Berserk e Brutal Strike | `CONST_ME_HITAREA = 10` | Lua das spells |
| Wound Cleansing | `CONST_ME_MAGIC_BLUE = 13` | Lua da spell |
| distância de Brutal Strike | `CONST_ANI_WEAPONTYPE = 254` (`0xFE`) | Lua da spell |
| corpo do Rotworm | item `5967` `dead rotworm` | `monster.corpse = 5967` |

## Revalidação

Com o snapshot local presente:

```powershell
node --no-warnings --experimental-transform-types tools/hunt-selection/cli.ts check-combat `
  --selection packages/content/src/selections/pb-05-knight-combat.json `
  --source-root-env HUNTBOUND_CANARY_SOURCE
```

O script raiz equivalente é `pb05:selection:check`. Fica fora de `check` e
`verify` pelo mesmo motivo de `hunt:selection:check`: checkout limpo não contém
`references/canary`. Sem `HUNTBOUND_CANARY_SOURCE` o comando não roda — limitação
de ambiente, não bloqueio de playbook.

## Decisões fechadas nesta task

| Decisão | Onde vale |
|---|---|
| Spells irrestritas; `spell.level` é provenance, não gate | este documento + JSON |
| Ficha no level `8` da hunt; HP Canary `185`; mana loadout `185` | este documento + JSON |
| Skills nos defaults do snapshot (`sword 10`, `magic 0`) | este documento |
| Arma `item:tibia:sword` `3264` | este documento |
| Ritmo de passo fiel `11` / `21`, não os `10` / `20` jogáveis | este documento; aplicado em PB-05-07 |
| Fórmula de cura `levelMagic` e Brutal Strike `skillAttackProduct` não cabem no schema atual | forma registrada aqui; schema em PB-05-02 / PB-05-03 |
| Hunt e região **não** reextraídas | já congelado em PB-04 |
