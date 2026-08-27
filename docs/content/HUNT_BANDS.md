# HUNT_BANDS — a escada de hunts do Kaezan

**Entregue por:** PB-10-02. **Congelado em:** 2026-08-26.

A partir deste documento, ele é **a fonte da escada de hunts** (`docs/playbooks/PB-10/README.md`,
fontes normativas, posição 11). Vence a tabela "As cinco faixas do MVP" do README, que era a
proposta. As tasks de conteúdo do PB-10 consomem as faixas 1 a 5; nenhuma delas decide sozinha qual
hunt entra, nem inventa número que não esteja aqui.

O mapa responde três perguntas e só elas: **qual é a escada inteira**, **qual o portão de cada
degrau**, e **o que as faixas 1 a 5 realmente são no snapshot**. Ele não redesenha o princípio de
design nem as decisões congeladas do README — ele os aplica contra o arquivo.

## Proveniência

Toda linha das faixas 1 a 5 carrega `sourceFile` e `sha256`. Snapshot Canary `157e6f9e`, lido em
2026-08-26. Paths de criatura são relativos a `references/canary/data-otservbr-global/monster/`; o
XML de spawn e o OTBM são relativos a `references/canary/data-otservbr-global/world/`;
`data/XML/vocations.xml` da derivação de HP é relativo a `references/canary/`.

Os números foram extraídos **dos arquivos**, não do README, da task card nem do TibiaRoute. TibiaRoute
escolheu *qual* hunt; o Canary fornece IDs, regras e mapa.

`z` no slot de `otservbr-monster.xml` é andar **absoluto**, não offset de `centerz`. É a leitura de
`tools/hunt-selection/validateHuntSelection.ts` (`z: floor` no slot). `x` e `y` do slot são offsets
do centro.

### Equivalência 157e6f9e × 3.4.1

`references/canary` é clone parcial em `157e6f9e`. O mapa global não mora só nele: as quatro cópias
locais de `otservbr.otbm` são **byte-idênticas**.

| Arquivo | SHA-256 | Bytes |
|---|---|---:|
| `otservbr.otbm` (157e6f9e, 3.4.1, `kaezan - world`, Downloads) | `a80de1dda6a9aca3956a9d5b7fb2e0caebb451570d26853fc21beb40d5f31da2` | 184 776 037 |
| `otservbr-monster.xml` 157e6f9e | `7043c114cfea10d5a2a329d1fdff04866e801a5af0b559421eafd49983ff98c7` | 9 856 492 |
| `otservbr-monster.xml` 3.4.1 | `ab5b3203ebd44d2471d8a935139761265084517f144455a962f8a8053a53114a` | 9 669 618 |

O XML **difere globalmente**. Dentro de **todas** as caixas congeladas abaixo, a contagem de espécies
é idêntica entre as duas versões. Por isso o XML já congelado no source lock (`7043c114…`) permanece
a fonte das faixas 1 a 5.

### Export pessoal de `lookType`

`HUNTBOUND_PERSONAL_ASSET_SOURCE` não estava definido no shell desta task. A conferência abriu
`outfits/<lookType>.png` nos dois exports históricos da PB-02 e da PB-04 (Arena Fable tibia e o
extract PB-04). Os dois têm **1 198** outfits; para cada espécie das faixas 1 a 5 os dois arquivos
são byte-idênticos. Conferir é abrir; o hash abaixo é do arquivo aberto, não de um manifesto.

---

## Como contar um degrau

Cada degrau acrescenta um **comportamento que nenhum anterior tem**. "A anterior com números
maiores" não é degrau — é o princípio de design do PB-08 aplicado a hunt.

O **portão** é o que impede escrever a hunt agora. Nas faixas 1 a 5 o portão é este playbook (e, na
2, a criatura que conjura da PB-10-06). Da 6 em diante o portão é kernel que não existe.

---

## Seção 1 — A escada inteira

A lista do usuário de 2026-08-26 vai **inteira**. Ordenar e nomear o portão é o trabalho; descartar
item não é. Uma reordenação: a faixa 4 congela o cluster de Dragon que o snapshot realmente tem
dentro do budget, que é **Ankrahmun Dragon Lairs**, não Darashia — ver faixa 4.

| # | Hunt | Faixa | Portão | Comportamento novo |
|---|---|---|---|---|
| 1 | Venore Rotworm Cave | 1 | **este playbook** — já existe | pack melee fraco; a hunt que o jogo já é |
| 2 | Orc Fortress | 2 | **PB-10-06** (IA que conjura) + `attackRangeTiles` que o kernel já tem e nenhuma criatura usa | **ranged** (spearman) e **caster** (shaman) |
| 3 | Cyclopolis | 3 | este playbook | melee que **não morre em dois auto-ataques** no skill ordinário do kit |
| 4 | Dragon Lair (Ankrahmun) | 4 | este playbook; mitigação de fogo fica no PB-11 | ataque de longe **com área** (raio 4), e fogo |
| 5 | Hero Cave | 5 | este playbook | o teto do kit atual: heal que disputa o DPS de filler |
| 6 | começo de Oramond | 6 | **PB-11** — mitigação elemental | `resistances` / `immunities` em `ActorBlueprint` não são aplicados no kernel; `attackElement` já entra no dano de saída |
| 7 | Asura Palace | 7 | **PB-11** — o mesmo portão, outra identidade | hunts cujo *tema* é o elemento; sem mitigação são Dragon de novo, com número maior |
| 8 | Medusa Tower | 8 | condição que trava o jogador | paralisia; o snapshot tem `condition = true` em várias criaturas e o kernel não trava movimento |
| 9 | Deeper Banuta | 9 | onda de área com forma | `AbilityShape` é `'self' \| 'target' \| 'area'`; `length`/`spread` do Canary não rotacionam com o facing |
| 10 | Roshamuul | 10 | criatura que invoca criatura | `monster.summon` existe no Lua (o shaman da faixa 2 já declara Snake) e **não entra** até este portão |
| 11 | livrarias | 11 | o mesmo portão, seções elementais | Secret Library: invocação *e* identidade por elemento — os dois portões 6 e 10 juntos |
| 12 | War Zone 1 | 12 | boss com fase, e fim de run — **PB-11** | o primeiro boss que muda de regra no meio da luta |
| 13 | War Zone 2 | 13 | o mesmo portão | três war zones são três lugares, não três mecânicas; entram quando o portão 12 abrir |
| 14 | War Zone 3 | 14 | o mesmo portão | idem |
| 15 | Cobra Bastion | 15 | boss com fase + elite humanoide | o portão 12 aplicado a fortaleza, não a raid gnômica |
| 16 | Falcon | 16 | armor / shielding — **PB-11** | Falcon Knight `armor = 86` no Lua; `armor` não existe no kernel |
| 17 | selos de Ferumbras | 17 | tudo acima junto | não se escreve antes dos portões 6–16 |

Nenhum degrau da faixa 6 em diante é escrito antes do portão abrir. Escrever a hunt antes da peça
produz conteúdo que o jogo não sabe rodar.

---

## Seção 2 — Faixas 1 a 5, congeladas

Espécie **congelada** é a que a task de conteúdo importa. Espécie **presente** está na caixa e fica
em `excludedCreatures` até ter papel próprio. Nenhuma spawn é inventada.

Budget de região: `maxWidth` 96, `maxHeight` 96, `maxFloors` 3
(`docs/content/MAP_REGION_CONTRACT.md`). Todas as caixas abaixo cabem.

### Faixa 1 — Venore Rotworm Cave — nível 8

Já existe. A geometria jogável é a receita autorada; o envelope OTBM congelado pela PB-04-01 é a
fonte de spawn.

| Campo | Valor | `sourceFile` | `sha256` |
|---|---|---|---|
| Caixa | `33002..33030 × 31995..32027`, z `8, 9` (29 × 33) | `world/otservbr-monster.xml` | `7043c114cfea10d5a2a329d1fdff04866e801a5af0b559421eafd49983ff98c7` |
| Grupos / slots | 8 / 12, 100 % Rotworm | o mesmo XML | o mesmo |
| Mapa | cabe no budget; OTBM global | `world/otservbr.otbm` | `a80de1dda6a9aca3956a9d5b7fb2e0caebb451570d26853fc21beb40d5f31da2` |

A seleção versionada `packages/content/src/selections/hunts/venore-rotworm-cave.json` declara uma
caixa maior (`33002..33065 × 31995..32090`) com Snake 17, Orc Spearman 11, Orc 10 e Bat 2 já
listados em `excludedCreatures`. O envelope **congelado para spawn jogável** continua o da PB-04:
12 Rotworms, nenhuma outra espécie nos andares 8 e 9.

| Espécie | HP | Exp | Dano | Alcance | `lookType` | Lua | `sha256` |
|---|---:|---:|---|---|---:|---|---|
| Rotworm | 65 | 40 | melee 0–40 / 2 000 ms | 1 (`targetDistance`) | 26 | `vermins/rotworm.lua` | `f75ed297cd851013cde4e991113bf2d67ab9930852f20fb0c4e8d0937ddb176b` |

Loot (mesma Lua): gold coin 71 760 ‰ (máx. 17), sword id 3264 3 000 ‰, mace 4 500 ‰, meat 20 000 ‰,
ham 20 120 ‰, worm 3 000 ‰ (máx. 3), lump of dirt 10 000 ‰, legion helmet 1 890 ‰.

**Comportamento novo:** nenhum — é o degrau zero. Pack melee, um hit, sem alcance, sem cura, sem
elemento.

### Faixa 2 — Orc Fortress — nível 25

Ulderek's Rock. A faixa 2 é a que menos pode mudar: orc spearman liga `attackRangeTiles`
(`packages/simulation/src/kernel/kernel.ts:249`) que **nenhuma criatura usa**; orc shaman força a IA
que conjura, hoje `abilityIndices: []` em `packages/content/src/hunts/buildHuntScenario.ts:313`.

| Campo | Valor | `sourceFile` | `sha256` |
|---|---|---|---|
| Caixa | `32896..32960 × 31713..31780`, z `6, 7, 8` (65 × 68) | `world/otservbr-monster.xml` | `7043c114cfea10d5a2a329d1fdff04866e801a5af0b559421eafd49983ff98c7` |
| Grupos / slots | 61 / 157 | o mesmo XML | o mesmo |
| Mapa | 65 × 68 × 3 ≤ 96 × 96 × 3 | `world/otservbr.otbm` | `a80de1dda6a9aca3956a9d5b7fb2e0caebb451570d26853fc21beb40d5f31da2` |

Contagem real na caixa:

| Espécie | Slots | Papel nesta faixa |
|---|---:|---|
| Orc Spearman | 33 | **congelada** — ranged |
| Orc Shaman | 22 | **congelada** — caster |
| Orc Warrior | 24 | presente, melee com número maior que Orc; não é o degrau |
| Orc Berserker | 36 | presente, melee ainda maior; escada do Orc |
| Orc | 13 | **congelada** — melee de pack, a base da raça |
| Orc Leader | 9 | presente, elite melee |
| Orc Warlord | 4 | presente, mini-boss de campo (950 HP no Lua, fora desta faixa) |
| Pig, Wolf, Chicken, War Wolf | 13 | fauna; excluir |
| Orc Rider, Cyclops, Bonelord | 1 cada | excluir |

| Espécie | HP | Exp | Dano / alcance | `lookType` | Lua | `sha256` |
|---|---:|---:|---|---:|---|---|
| Orc | 70 | 25 | melee 0–35, `targetDistance` 1 | 5 | `humanoids/orc.lua` | `fc649f2e6dd8c264f9d6537e2f001c7869e7418276aef14ce538a5676f09c086` |
| Orc Spearman | 105 | 38 | melee 0–25; físico 0–30, `range` 7, chance 20 %, `CONST_ANI_SPEAR`; `targetDistance` 4 | 50 | `humanoids/orc_spearman.lua` | `70ecf85eb75432c161b1537e7e4c9db429d204cbb749cb4e4fc7f1a71b9b58d0` |
| Orc Shaman | 115 | 110 | melee 0–15; energia −20..−31, `range` 7, chance 15 %; fogo −5..−43, `range` 7, `radius` 1, chance 5 %; cura 27–43, chance 60 % / 2 000 ms; `targetDistance` 4 | 6 | `humanoids/orc_shaman.lua` | `cf3fee52b211b9f4b18dc7da2bfbf257e816542a320491b3817a883cfbe17864` |

Loot (mesmas Luas), itens com chance ≥ 5 000 ‰:

- Orc: gold coin 84 810 ‰ (máx. 14), studded armor 7 860 ‰, studded shield 7 300 ‰, sabre 5 850 ‰, meat 10 160 ‰.
- Spearman: gold coin 25 050 ‰ (máx. 11), meat 30 200 ‰, spear 17 440 ‰, studded legs 10 000 ‰, studded helmet 9 000 ‰.
- Shaman: gold coin 90 000 ‰ (máx. 5), corncob 10 600 ‰ (máx. 2), broken shamanic staff 10 300 ‰, chain armor 8 750 ‰, shamanic hood 6 860 ‰.

**O shaman declara `summon` de Snake (chance 20 %, count 3).** Isso é o portão da faixa 10, não o
desta. A faixa 2 consome energia à distância e autocura. Snake não entra no catálogo desta hunt.

O fogo `radius` 1 a 5 % não é o degrau de área: é um tile. Área de verdade é a faixa 4.

**Comportamento novo:** criatura que machuca **sem estar encostada**, e criatura que **gasta um
ciclo em algo que não é o auto-attack** (projétil de energia + barra que sobe sozinha).

### Faixa 3 — Cyclopolis — nível 45

Edron, andares de cima. Os andares 14–15 da mesma montanha têm Behemoth (4 000 HP) — fora desta
faixa. A caixa congela z 8, 9 e 10, três andares, sem Behemoth.

| Campo | Valor | `sourceFile` | `sha256` |
|---|---|---|---|
| Caixa | `33250..33320 × 31680..31740`, z `8, 9, 10` (71 × 61) | `world/otservbr-monster.xml` | `7043c114cfea10d5a2a329d1fdff04866e801a5af0b559421eafd49983ff98c7` |
| Grupos / slots | 36 / 37 | o mesmo XML | o mesmo |
| Mapa | 71 × 61 × 3 ≤ 96 × 96 × 3 | `world/otservbr.otbm` | `a80de1dda6a9aca3956a9d5b7fb2e0caebb451570d26853fc21beb40d5f31da2` |

| Espécie | Slots | Papel nesta faixa |
|---|---:|---|
| Cyclops | 19 | **congelada** — o melee que não morre em dois golpes |
| Cyclops Drone | 4 | presente; melee 0–105 **e** pedra 0–80 a `range` 7. Ranged já é a faixa 2 |
| Cyclops Smith | 1 | presente; melee 0–150 e `drunk` 4 000 ms. Drunk não existe no kernel — excluir |
| Skeleton, Wereboar, Werebadger, Fire Elemental | 13 | excluir |

| Espécie | HP | Exp | Dano / alcance | `lookType` | Lua | `sha256` |
|---|---:|---:|---|---:|---|---|
| Cyclops | 260 | 150 | melee 0–105 / 2 000 ms, `targetDistance` 1, armor 17 | 22 | `giants/cyclops.lua` | `17ffa298767933be8c5284fe98f81dba8e27d7a384d387d85e9d243a6426707f` |

Loot (mesma Lua), chance ≥ 1 000 ‰: gold coin 82 000 ‰ (máx. 47), meat 30 070 ‰, short sword
8 000 ‰, cyclops toe 4 930 ‰, plate shield 2 500 ‰, battle shield 1 400 ‰, halberd 1 003 ‰.

**Por que não é a faixa 2 com HP maior.** Rotworm 65 HP e Orc 70 HP morrem em **um** auto-ataque no
skill ordinário 60 da ficha congelada (`knightMeleeDamage` ≈ 78). Cyclops 260 HP pede
`ceil(260 / 78) = 4` auto-ataques. A imagem muda: o boneco **troca** com o alvo em vez de limpar o
tile num swing. Drone e Smith não são o degrau — um recicla ranged, o outro pede `drunk`.

**Comportamento novo:** o primeiro alvo que sobrevive ao metrônomo o bastante para postura e cura
existirem.

### Faixa 4 — Dragon Lair (Ankrahmun) — nível 70

A proposta citava Darashia. A caixa `33200..33290 × 32240..32320`, z 7–9 — o chute de Darashia —
tem **49 Rotworms e zero Dragons**. O cluster de Dragon que cabe no budget sem misturar Falcon
(Edron) nem Demônios (Pits of Inferno) é Ankrahmun: 31 Dragons. A hunt do usuário continua "Dragon
Lair"; a região que o snapshot entrega é esta. Reordenação justificada pelo arquivo, não pela
memória.

| Campo | Valor | `sourceFile` | `sha256` |
|---|---|---|---|
| Caixa | `33002..33070 × 32640..32700`, z `5, 6, 7` (69 × 61) | `world/otservbr-monster.xml` | `7043c114cfea10d5a2a329d1fdff04866e801a5af0b559421eafd49983ff98c7` |
| Grupos / slots | 40 / 46 | o mesmo XML | o mesmo |
| Mapa | 69 × 61 × 3 ≤ 96 × 96 × 3 | `world/otservbr.otbm` | `a80de1dda6a9aca3956a9d5b7fb2e0caebb451570d26853fc21beb40d5f31da2` |

| Espécie | Slots | Papel nesta faixa |
|---|---:|---|
| Dragon | 31 | **congelada** — área de fogo à distância |
| Dragon Hatchling | 2 | presente; a mesma imagem com número menor (380 HP, fogo −30..−90). Escada. Excluir |
| Dragon Lord | 5 | presente; a mesma imagem com número maior (1 900 HP). Substituição futura, não soma |
| Hydra | 8 | presente; 2 350 HP e multi-alvo. Fora desta faixa |

| Espécie | HP | Exp | Dano / alcance | `lookType` | Lua | `sha256` |
|---|---:|---:|---|---:|---|---|
| Dragon | 1 000 | 700 | melee 0–120; fogo −60..−140, `range` 7, `radius` 4, chance 15 %; fogo −100..−170, `length` 8, `spread` 3, chance 10 %; cura 40–70, chance 15 %; imune a fogo e a paralisia | 34 | `dragons/dragon.lua` | `5cf359b04cd7ac0ca47d552c35f224d635d643733af834418c82de22af736ef6` |

Loot (mesma Lua), chance ≥ 2 000 ‰: gold coin 89 920 ‰ (máx. 102), dragon ham 66 270 ‰ (máx. 2),
steel shield 15 650 ‰, dragon's tail 9 680 ‰, crossbow 9 120 ‰, burst arrow id 3449 8 060 ‰
(máx. 10), longsword 3 830 ‰, steel helmet 3 490 ‰, broadsword 2 700 ‰, plate legs 2 029 ‰.

O Lua traz **dois** ataques de fogo. O congelado para esta faixa é o de `range` 7 + `radius` 4:
é `kind: area` no mapeamento Canary, e o contrato já tem `shape: 'area'`. O de `length` 8 /
`spread` 3 é onda; `AbilityShape` não tem `'wave'`. Fica no portão da faixa 9, mesmo estando neste
arquivo — não se implementa cedo demais, e não se descarta o Dragon por causa dele.

Dano elemental **entra cheio** (decisão congelada 8 do PB-10). `attackElement` já participa do dano
de saída em `packages/simulation/src/kernel/combat.ts:517`. `resistances` e `immunities` não são
lidos para reduzir o que chega. A imunidade a fogo do Dragon não faz nada até o PB-11; o Knight
também não tem defesa elemental, então a assimetria é a mesma dos dois lados.

O fogo `radius` 1 do shaman (faixa 2, 5 %) não é este degrau. Aqui o bloco acende **a quatro tiles
de Chebyshev**, com o Dragon ainda longe.

**Comportamento novo:** o chão entre o jogador e o alvo acende, e o número é fogo.

### Faixa 5 — Hero Cave — nível 130

Edron. A caixa mistura o Hero clássico com o overlay moderno (Renegade Knight, Vile Grandmaster,
Vicious Squire). Congela **Hero**. O resto espera armor, condição e faixa própria.

A spec disse que Hero traz fogo. **O Lua não traz.** Melee físico e flecha física. A divergência
fica escrita: o teto do kit é o heal 200–250, não o elemento.

| Campo | Valor | `sourceFile` | `sha256` |
|---|---|---|---|
| Caixa | `33270..33340 × 31550..31620`, z `8, 9, 10` (71 × 71) | `world/otservbr-monster.xml` | `7043c114cfea10d5a2a329d1fdff04866e801a5af0b559421eafd49983ff98c7` |
| Grupos / slots | 101 / 184 | o mesmo XML | o mesmo |
| Mapa | 71 × 71 × 3 ≤ 96 × 96 × 3 | `world/otservbr.otbm` | `a80de1dda6a9aca3956a9d5b7fb2e0caebb451570d26853fc21beb40d5f31da2` |

| Espécie | Slots | Papel nesta faixa |
|---|---:|---|
| Hero | 24 | **congelada** |
| Renegade Knight, Vile Grandmaster, Vicious Squire | 114 | overlay Edron moderno; excluir |
| Blood Priest, Bonebeast, Undead Gladiator, Necromancer, Lich, Ghoul | 46 | undead / condição; excluir |

| Espécie | HP | Exp | Dano / alcance | `lookType` | Lua | `sha256` |
|---|---:|---:|---|---:|---|---|
| Hero | 1 400 | 1 200 | melee 0–240; físico 0–120, `range` 7, chance 20 %, `CONST_ANI_ARROW`; cura 200–250, chance 20 % / 2 000 ms; `targetDistance` 1; armor 35; imune a paralisia | 73 | `humans/hero.lua` | `8c7add3d9e2baf5ab0e91934588d0e59f3b309a48d46d2f181605297220cb089` |

Loot (mesma Lua), chance ≥ 5 000 ‰: gold coin 59 500 ‰ (máx. 100), scroll id 2815 45 000 ‰, arrow
26 000 ‰ (máx. 13), red rose 20 450 ‰, grapes 19 850 ‰, bow 13 300 ‰, sniper arrow 11 400 ‰
(máx. 4), green tunic 8 000 ‰, meat 8 200 ‰ (máx. 3), scroll of heroic deeds 5 000 ‰.

O shaman já cura 27–43 a 60 %. Hero cura **200–250 a 20 %**. Não é a mesma imagem com outro número
na barra inimiga: o filler do Knight (~78 / 2 s no skill 60) **não vence** o valor esperado
(`0,20 × 225 / 2 s = 22,5 HP/s` de heal contra `39 HP/s` de auto-ataque — vence por pouco, e some
quando o Hero também atira). O degrau é **obrigar o kit de burst** (Berserk / Brutal Strike /
Groundshaker) a existir. Auto-attack sozinho empata ou perde o trade.

Ranged físico já é a faixa 2. Aqui o Hero é melee (`targetDistance` 1) que **também** atira — dual
role, não spearman de novo.

**Comportamento novo:** o alvo que se cura o bastante para o metrônomo não bastar.

**Correção de 2026-08-27.** A conta acima usava a ficha do nível 35 (sword 60, sword atk 14) para
julgar a faixa 5, e ela sobrestimava a folga: o `39 HP/s` só olha a corrida de dano e ignora que o
Hero devolve ~60 HP/s em cima de 2 015 de vida. Jogado, era invencível, não "vence por pouco". A
ficha `character:huntbound:knight-hero-cave` passou a seguir o nível 130 — sword 90, two handed
sword (`3265`, atk 30), 645 de mana pela progressão do Canary — o que põe o filler em ~70 HP/s e o
tempo de morte de um Hero em ~29 s só de auto-ataque. O degrau segue sendo obrigar o burst: com a
rotação inteira o Hero cai em ~13 s, e a mana acaba antes do terceiro.

---

## Seção 3 — `lookType` conferido, espécie por espécie

Arquivo aberto: `outfits/<lookType>.png`. Hash do PNG, não do Lua. As duas origens pessoais
concordam em todos os casos abaixo. **Nenhuma espécie congelada falta.** B15 fecha nas faixas 1 a 5.

| Espécie | `lookType` | Bytes | SHA-256 do PNG | Resultado |
|---|---:|---:|---|---|
| Rotworm | 26 | 23 500 | `50693364cc059e397bad267c8f443f248d387ef38f0417e87351f1f253ed3f4b` | presente (bate com o lock PB-02) |
| Orc | 5 | 17 470 | `c54450c38b0bb5dc67486ea8ec1b9e2b2c5cff5e0889e88207ea2decfe30af8c` | presente |
| Orc Spearman | 50 | 24 122 | `c1a92264be653ffe85483784f0bb543d5181c7b4f7eb4705ed1620d85eabb770` | presente |
| Orc Shaman | 6 | 26 965 | `0e2b8fb99da374071fb2c5fd2ee61fc2468b81f040fe7fcfb2ea6b91bb63bda9` | presente |
| Cyclops | 22 | 108 158 | `57fef029d1b2e972c69c7a5ec3a4c9751d0c3bef8d40819aab7716b5b5bafb1d` | presente |
| Dragon | 34 | 87 139 | `10dd545c7768e72b07eb3fcc01eb17b943541377891fbf70ba8898db26298b46` | presente |
| Hero | 73 | 16 491 | `0c2ddac39735e77fdc8ec1687c07c52dbdce1ecc1f5b8cc156f6c287334ef245` | presente |

Espécies presentes nas caixas, conferidas, **não congeladas** (para a task de conteúdo saber que a
arte existe se um dia o papel mudar):

| Espécie | `lookType` | PNG presente |
|---|---:|---|
| Orc Warrior | 7 | sim |
| Orc Berserker | 8 | sim |
| Cyclops Drone | 280 | sim |
| Cyclops Smith | 277 | sim |
| Dragon Hatchling | 271 | sim |
| Dragon Lord | 39 | sim |

---

## Seção 4 — Nível recomendado, derivado

Não copiado do TibiaRoute. A ficha do Knight nesta máquina:

```text
HP(L) = 185 + 15 × (L − 8)    para L ≥ 8
```

Origem: `healthmax = 150` no nível 1; +5 nos níveis 2–8; `gainhp = 15` do Knight a partir do 9
(`packages/content/src/selections/pb-05-knight-combat.json`, `healthSource`; `gainhp` em
`data/XML/vocations.xml`, `name="Knight"`, `sha256`
`693a179048d5d5c5af519459c8e542cd01013212af1cec88f7c8eb72634f4350` — o mesmo da linha de
auto-attack em `KNIGHT_BANDS.md`).

Conferência: HP(35) = 185 + 15 × 27 = 590, o `maxHealth` já congelado na selection PB-05.

Auto-ataque no skill ordinário 60, arma attack 14 (a espada id 3264 da mesma selection):

```text
maxMelee = round(0.085 × 14 × 60 + floor(L / 5))
```

(`knightMeleeDamage` em `packages/content/src/hunts/combatConversion.ts`). Em L ≥ 35 isso fica ≈ 78.

Regra usada, a mesma em todas as faixas: **quatro hits da ameaça nova consomem cerca de metade da
barra**, e a ameaça **não morre em dois auto-ataques** nesse skill. Onde a desigualdade já vale
antes, o nível sobe pelo comportamento (faixa 2) ou pelo pack (faixa 3).

| Faixa | Ameaça | 4 × hit | HP no nível | 4 hits / HP | Auto-ataques para matar | Nível |
|---|---|---:|---:|---:|---:|---:|
| 1 | Rotworm 40 | 160 | HP(8) = 185 | 87 % — tutorial, a barra quase some se errar o kit | 65/78 < 1 no skill 60; no skill 10 da ficha crua são 5 | **8** (já existe; Wound Cleansing destrava em 8) |
| 2 | Spearman 30 / Shaman fogo 43 | 172 | HP(25) = 440 | 39 % | Orc 70 morre em 1; o degrau não é HP, é ranged+caster. Skill interpolado 10→60 entre 8 e 35 cruza o heal esperado do shaman (10,5 HP/s) em L ≈ 22; **25** é margem de pack | **25** |
| 3 | Cyclops 105 | 420 | HP(45) = 740 | 57 % | 260/78 ≈ 3,3 → **4** auto-ataques. Em L 25, 4 × 105 = 95 % da barra — corrida, não troca | **45** |
| 4 | Dragon fogo 140 (área) | 560 | HP(70) = 1 115 | 50 % | 1 000/78 ≈ 13 auto-ataques, e o fogo chega enquanto se aproxima | **70** |
| 5 | Hero melee 240 | 960 | HP(130) = 2 015 | 48 % | 1 400 HP + cura 200–250; o filler empata, o burst decide | **130** |

A proposta do README era 8 / ~25 / ~45 / ~70 / ~130. O snapshot **confirma** os cinco. Nada foi
derrubado por número. O que foi derrubado por arquivo: Darashia como região da faixa 4, e fogo no
Hero.

Até o PB-09, escolher a hunt escolhe este nível (e a faixa). É a emenda da ADR-05.

---

## Seção 5 — O que o contrato ainda não representa

No molde da tabela homônima do `KNIGHT_BANDS.md`. Cada linha nomeia o campo que falta e o degrau
que espera.

| Item | Representável hoje? | Campo / leitura que falta | Destino |
|---|---|---|---|
| Ranged (`range` + `shootEffect`) | **Sim, não usado** | `attackRangeTiles` já decide sight em `kernel.ts:249` | Faixa 2 |
| Caster (ability de criatura) | **Não** | `abilityIndices: []` em toda criatura | **PB-10-06**, consome a faixa 2 |
| Invocação | **Não** | `monster.summon` não vira ator | Faixas 10–11; o shaman espera |
| Área `radius` | **Sim** (Chebyshev) | já no contrato; Dragon `radius` 4 | Faixa 4 |
| Onda `length`/`spread` | **Não** | não há `'wave'` em `AbilityShape` | Faixa 9; o segundo ataque do Dragon espera |
| Dano elemental | **Parcial** | `attackElement` entra no dano de saída; `resistances` / `immunities` não reduzem o que chega | Faixa 4 entra cheio; mitigação **PB-11** |
| Paralisia / drunk | **Não** | condição que trava | Faixas 8 e Smith |
| Armor / shielding | **Não** | `armor` no Lua, zero no kernel | Faixa 16 Falcon; Hero 35 fica inerte |
| Boss com fase | **Não** | um blueprint, uma vida | Faixas 12–15 |
| Fim de run | **Não** | PB-11 | Faixas 12–17 |

---

## O que este mapa congela

1. **A escada inteira** da Seção 1, com o portão de cada degrau. Nada some, nada se escreve cedo
   demais.
2. **Faixas 1 a 5** com caixa, espécies congeladas, números, loot, `lookType` e nível derivado.
3. **Três espécies na faixa 2** (Orc, Spearman, Shaman). Warrior, Berserker, Leader e Warlord estão
   na caixa e não entram ao lado — são a mesma imagem melee com outro HP.
4. **Cyclops só**, na faixa 3. Drone recicla ranged; Smith pede `drunk`.
5. **Dragon só**, na faixa 4, na região de Ankrahmun. Hatchling e Lord são escada. Hydra é outra
   faixa. A onda `length`/`spread` não se implementa nesta faixa.
6. **Hero só**, na faixa 5. Sem fogo. O teto é o heal.
7. **Todo `lookType` congelado existe** no export pessoal. B15 fecha para estas cinco hunts.

Mudar qualquer um dos sete é decisão de produto, fora de uma task de implementação.
