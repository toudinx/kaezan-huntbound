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
| Ficha | level `35`, sword `10`, magic `0`, `maxHealth` `590`, `maxMana` `170` |
| Ritmo de passo | `player` `11` ticks, `rotworm` `21` ticks |
| Ritmo de ataque | `player` `40` ticks, `rotworm` `40` ticks |
| Mitigação | zero |

A alternativa de baixar o level e remover Berserk **foi rejeitada aqui**. A ficha nasce
no maior level entre as três spells (Berserk `35`). Isso trivializa uma hunt de level
`8`; o risco já estava declarado na spec e fica aceito, não adiado para PB-05-07.

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

O jogador de level `35` teria `baseSpeed + (level - 1) = 144` e derivaria `9`
ticks. Isso **não** é o valor congelado: o blueprint deriva da estatística da
vocação/criatura, não da ficha composta. A conta de `144` fica só como
referência.

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
| level | `35` | maior `spell:level` das três spells |
| sword | `10` | default `schema.sql` `skill_sword` |
| magic | `0` | default `schema.sql` `maglevel` |
| arma | `item:tibia:sword` `3264` `attack 14` | loot do Rotworm, já no catálogo PB-01 |
| fightMode | offensive, `attackFactor = 1.0` | `Player::getAttackFactor` |
| `maxHealth` | `590` | conta abaixo |
| `maxMana` | `170` | conta abaixo |

Skills **não** foram inventadas para “parecer um EK de 35”. O default do snapshot
é a única fonte sem treino. Inventar sword `50` não tem arquivo-fonte.

### Vida e mana

`schema.sql`: level `1` começa com `healthmax = 150`, `manamax = 0`.
`Player` usa `vocation 0` (`gainhp 5`, `gainmana 5`) enquanto `level <= 8`, e a
vocação Knight (`gainhp 15`, `gainmana 5`) de `9` em diante.

```text
maxHealth = 150 + 7 * 5 + (35 - 8) * 15
          = 150 + 35 + 27 * 15
          = 590

maxMana   = 0 + 7 * 5 + (35 - 8) * 5
          = 35 + 135
          = 170
```

Knight de `590` HP contra Rotworm de `0–40` a cada `2 s` trivializa a hunt. Risco
aceito.

## Fórmulas resolvidas em inteiros

Canary lê o retorno Lua com `static_cast<int32_t>(lua_tonumber(...))`, truncando
na direção de zero. Dano sai negativo no Lua; `minPower`/`maxPower` guardam o
valor absoluto para o kernel.

Ficha: `level = 35`, `skill = 10`, `attack = 14`, `magicLevel = 0`.

### Berserk (`skillAttack`)

```text
min = -((35 / 5) + (10 + 14) * 0.5) * 1.1 = -(7 + 12) * 1.1 = -20.9 → -20
max = -((35 / 5) + (10 + 14) * 1.5) * 1.1 = -(7 + 36) * 1.1 = -47.3 → -47
minPower = 20, maxPower = 47
```

### Brutal Strike (`skill * attack`)

```text
skillTotal = 10 * 14 = 140
levelTotal = 35 / 5 = 7
min = -(((140 * 0.02) + 4) + 7) * 1.28 = -13.8 * 1.28 = -17.664 → -17
max = -(((140 * 0.04) + 9) + 7) * 1.28 = -21.6 * 1.28 = -27.648 → -27
minPower = 17, maxPower = 27
```

### Wound Cleansing (`level + magicLevel`)

```text
min = (35 * 0.2 + 0 * 4) + 25 = 32
max = (35 * 0.2 + 0 * 7.95) + 51 = 58
minPower = 32, maxPower = 58
```

### Golpe físico do Knight

`Weapons::getMaxWeaponDamage` (melee) e `WeaponMelee::getWeaponDamage`,
`attackFactor = 1.0`, `meleeDamageMultiplier = 1.0`:

```text
minValue = level / 5 = 35 / 5 = 7          (divisão inteira uint32)
maxValue = round(0.085 * 1.0 * 14 * 10 + 35 / 5)
         = round(11.9 + 7) = round(18.9) = 19
minPower = 7, maxPower = 19
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
| Ficha em level `35` com as três spells, trivialização aceita | este documento + JSON |
| Skills nos defaults do snapshot (`sword 10`, `magic 0`) | este documento |
| Arma `item:tibia:sword` `3264` | este documento |
| Ritmo de passo fiel `11` / `21`, não os `10` / `20` jogáveis | este documento; aplicado em PB-05-07 |
| Fórmula de cura `levelMagic` e Brutal Strike `skillAttackProduct` não cabem no schema atual | forma registrada aqui; schema em PB-05-02 / PB-05-03 |
| Hunt e região **não** reextraídas | já congelado em PB-04 |
