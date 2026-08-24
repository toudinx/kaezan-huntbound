# PB-07 — Referência de rotação endgame

**Pergunta:** o kit de quatro ações (auto-attack, duas magias de dano, uma de cura) é raso demais? Se
for, quais papéis faltam?

**Resposta:** sim. Faltam **postura** e **mobilidade**. A hipótese de trabalho de **seis slots** —
auto-attack, dano single-target, dano em área, cura, postura, mobilidade — **confirma-se** com
evidência do snapshot `157e6f9e`. Sete não são necessários; cinco não bastam. A exame está na
[tabela de slots](#tabela-de-slots) e no [exame do sétimo candidato](#exame-do-setimo-candidato).

> **Emenda de 2026-08-24 — a contagem de seis foi superada; os números não.**
>
> A pergunta acima é "quantos **papéis** existem", e a resposta seis continua correta. O PB-08
> reescrito faz uma pergunta diferente — "quantas **imagens distintas** a rotação sustenta" — e chega
> a **nove ações, cinco delas de dano**, porque o papel "dano" sozinho comporta várias formas
> visualmente distinguíveis, e porque o taunt (`exeta res`) é um sétimo papel que esta análise não
> considerou. O critério de corte deixou de ser mecânico e passou a ser de leitura: duas ações só
> coexistem se um espectador distingue as duas olhando.
>
> **Tudo o mais neste documento continua normativo** — kit por faixa, custo, cooldown, fórmula,
> identidade, rotação e proveniência com `sourceFile` + `sha256`. Ver
> `docs/playbooks/PB-08/README.md`, seção "O princípio de design", e `docs/content/KNIGHT_BANDS.md`.

**Snapshot:** `references/canary` local, lido em 2026-08-21. Toda afirmação de kit, custo, cooldown,
duração ou fórmula aponta `sourceFile` + `sha256` na [tabela de fontes](#arquivos-fonte). Números de
stance 2026 levam `fonte: TibiaWiki, Tibia 15.25.3a4a52` no lugar do hash — única exceção de
proveniência, aprovada em 2026-08-21 e limitada a stances.

**Inventário:** 199 arquivos `.lua` em `data/scripts/spells/{attack,healing,support,conjuring,familiar,house,party}`.
133 magias listam Knight, Paladin ou Sorcerer (ou a promoção). O documento não é o inventário: é a
tabela de slots e a evidência que a sustenta. Magias de casa, party, familiar e avatar (nível
200–300) existem e ficam fora do kit V0.

**Rotação:** há mais de uma leitura plausível. A escolhida é a mais simples no nível congelado do
PB-05 (35): um botão por slot, filler = auto-attack, stance 2026 ligada o tempo todo, haste só para
desengajar. Alternativas de endgame preenchem o mesmo slot, não criam slot novo.

---

## Destaque — o que o contrato ainda não representa

Postura, mobilidade (`CONDITION_HASTE` / Charge) e Magic Shield (`CONDITION_MANASHIELD`) são
**Condition com duração**. Hoje:

- `SpellDefinitionSchema` não tem campo de condição, duração, alcance, forma de onda, grupo
  secundário, toggle nem cargas.
- `ConditionDefinitionSchema` é uma união de **um** membro, `poison`, e só é lida em criatura.
- `ActorState` não tem condições ativas.
- `ActorState.groupReadyAtTick` é **um número único**. O snapshot já dispara dois grupos
  (`spell:group("support", "focus")` + `groupCooldown(a, b)`); o sistema 2026 exige canal de
  cooldown secundário próprio ("Stance Spells"), separado do grupo primário de ataque/cura.

Isso define o escopo de PB-07-03 (forma) e PB-07-05 (regra). Sem esses campos, os dois slots que
justificam o playbook não entram no catálogo nem no kernel.

`CharacterDefinitionSchema.skills` é literalmente `{ sword, magic }`. Paladin escala Ethereal Spear
por distance; Protector 2026 escala shielding. `resolveSpellPower` só lê `skills.sword`.
`abilityShapeFromSpell` força `MELEE_RANGE_TILES` em magia que não é área nem cura — Energy Strike
tem `range(3)`, Ethereal Spear tem `range(7)`. Isso é PB-07-06.

`VocationDefinitionSchema` tem `gainHp` / `gainMana` por nível e não tem `gainhpticks` /
`gainhpamount` / `gainmanaticks` / `gainmanaamount` nem `magicshield`. Os quatro números de regen do
Knight vivem como constantes em `combatConversion.ts` porque o V0 só embarcou uma vocação.

---

## Tabela de slots

Uma linha por slot, uma coluna por vocação. Custo e cooldown da magia do snapshot que ocupa o slot
no nível 35; stance 2026 no lugar da stance do snapshot, porque essa é a decisão congelada.

| Slot | Papel | Knight | Paladin | Sorcerer | Contrato hoje |
|---|---|---|---|---|---|
| Auto-attack | filler quando o resto está em cooldown | melee, `attackspeed` 2000 ms, arma `sword` id 3264 attack 14, alcance 1 | distance, arco id 3350 `range` 6 / besta id 3349 `range` 5, sem mana | wand, id 3071 *Wand of Inferno* `range` 3, **1 disparo = 8 mana**, 56–74 fogo (nível 33) | Parcial. `attackRangeTiles` já existe no blueprint (default 1). Skill só `{ sword, magic }`. Wand que consome mana não existe. |
| Dano single-target | burst no alvo da vez | Brutal Strike `exori ico`, nv 16, 30 mana, CD 6000, grupo 2000, `range` 1, `skillAttackProduct` | Ethereal Spear `exori con`, nv 23, 25 mana, CD 2000, grupo 2000, `range` 7; fórmula `(level/5)+(skill+25)/3` — **não é** nenhum `formula.kind` atual | Flame / Energy / Death Strike `exori flam\|vis\|mort`, nv 14/12/16, 20 mana, CD 2000, grupo 2000, `range` 3, `levelMagic` | Parcial. Fórmula de strike cabe em `levelMagic`. Brutal Strike já está no PB-05. Ethereal Spear não cabe. Alcance 3 e 7 viram melee. |
| Dano em área | caixa, pull, lixo | Berserk `exori`, nv 35, 115 mana, CD 4000, grupo 2000, `AREA_SQUARE1X1`, `skillAttack` | Divine Caldera `exevo mas san`, nv 50, 160 mana, CD 4000, grupo 2000, `AREA_CIRCLE3X3`, `levelMagic`, holy | Fire Wave `exevo flam hur`, nv 18, 25 mana, CD 4000, grupo 2000, `AREA_WAVE4`, fogo, precisa direção | Parcial. Berserk já está. Caldera é square-or-nothing. Wave não é `area.shape: square`. |
| Cura | sobreviver ao erro | Wound Cleansing `exura ico`, nv 8, 40 mana, CD 1000, grupo 1000, `levelMagic` | Divine Healing `exura san`, nv 35, 160 mana, CD 1000, grupo 1000, `levelMagic` | Ultimate Healing `exura vita`, nv 30, 160 mana, CD 1000, grupo 1000, `levelMagic` | Sim, como cura instantânea self. Recovery (`utura`, HoT 60 s) e Magic Shield não. |
| Postura | o que diferencia hunt de boss; **toggle que persiste**, não botão por segundo | Blood Rage `utito tempo` **ou** Protector `utamo tempo` (2026, nv 20, 20 mana). Snapshot: Rage nv 60 / 290 mana / 10 s; Protector nv 55 / 200 mana / 13 s | Sharpshooter `utori con` **ou** Divine Defiance `utori hur` (2026, nv 20, 250 mana). Snapshot: Sharpshooter `utito tempo san` nv 60 / 450 mana / 10 s; Swift Foot `utamo tempo san` nv 55 / 400 mana / 10 s — **palavras e magia diferentes** | Master of Flames / Thunder / Decay `uteta flam\|vis\|mort` (2026, nv 20, 400 mana). **Não existem no snapshot.** Crippling (`exori kor` / `exori moe`) existe como magia nv 275, grupo `"crippling"` | Não. Condition, toggle, persistência, exclusividade e canal secundário ausentes. |
| Mobilidade | o que torna jogável o recuo da decisão 1 | Charge `utani tempo hur`, nv 25, 100 mana, CD 2000, duração 5000 ms, `CONDITION_HASTE`; Haste `utani hur`, nv 14, 60 mana, 30 s, como fallback | Haste `utani hur`, nv 14, 60 mana, 30 s. Swift Foot do snapshot *é* haste+pacify e **sai** no 2026 (vira Divine Defiance) | Strong Haste `utani gran hur`, nv 20, 100 mana, CD 2000, duração 22 s; Haste como fallback | Não. `CONDITION_HASTE` com fórmula de speed não existe. |

### Exame do sétimo candidato

Candidatos examinados e recusados como slot compartilhado:

1. **Magic Shield (`utamo vita`).** Condition de 180 s, nv 14, 50 mana, só Sorcerer/Druid
   (`magicshield="1"` em `vocations.xml`). Converte mana em vida efetiva e muda o regime de
   sustentação — PB-07-04 precisa saber que existe. Não é o sétimo slot do kit porque Knight e
   Paladin não o têm (`magicshield="0"`), e o papel não é compartilhado. Entra como Condition no
   mesmo sistema de PB-07-05, ocupando a coluna do Sorcerer na cura/sustentação, não uma linha nova.
2. **Runa.** Amplifica ST, AoE ou cura com cargas. É o mesmo papel, outra fonte. PB-07-11.
3. **Recovery / Intense Recovery.** HoT de 60 s, nv 50, Knight e Paladin. Sustentação, não eixo de
   rotação hunt-vs-boss.
4. **Crippling (Sap Strength / Expose Weakness).** Segunda stance só do Sorcerer (decisão 6). Canal
   extra na coluna de postura, não linha nova. Snapshot: nv 275 — inalcançável no personagem 35;
   números 2026 de custo **não** estão na tabela congelada da task e não são inventados aqui.
   PB-07-08 lê a wiki na mesma exceção de proveniência.
5. **Avatar / familiar (nv 200–300).** Fora do V0.

**Por que cinco não bastam.** Sem postura, a rotação de hunt e a de boss são a mesma sequência de
dano+cura — o playbook não ganha decisão. Sem mobilidade, recuar contra criatura rápida é morrer
andando: o jogador a 11 ticks/passo não se descola de um Black Knight a 10 ticks/passo. Os dois
slots são exatamente o buraco entre “quatro botões” e “escolher quando recuar”.

**Por que seis bastam.** Todo o resto do inventário (133 magias) preenche um desses papéis ou está
fora do V0. A diferença hunt/boss é troca de stance + uso de haste, não um sétimo botão.

---

## Stances 2026 versus snapshot

O sistema adotado é o **Vocation Adjustments 2026**, Tibia `15.25.3a4a52` (16/06/2026),
`fonte: TibiaWiki, Tibia 15.25.3a4a52`. Não está no snapshot. O snapshot tem a versão anterior:
buff cronometrado, nível alto, mana alta, palavras diferentes no Paladin, e zero stances de
Sorcerer.

Regras 2026 (`fonte: TibiaWiki, Tibia 15.25.3a4a52`): uma stance ativa por vez, exceto Sorcerer
(uma *crippling* e uma *elemental* ao mesmo tempo); persiste entre sessões; relançar a ativa
desliga; é válido não ter nenhuma; grupo de cooldown secundário próprio ("Stance Spells").

| Vocação | Stance 2026 | Words 2026 | Nv / mana 2026 | Efeito 2026 | Snapshot (words, nv, mana, duração, efeito) |
|---|---|---|---|---|---|
| Knight | Blood Rage | `utito tempo` | 20 / 20 | +25% sword/axe/club, +15% dano recebido | `utito tempo`, 60 / 290, 10 000 ms, `SKILL_MELEEPERCENT` 135 (+35%), `BUFF_DAMAGERECEIVED` 115, `DISABLE_DEFENSE` |
| Knight | Protector | `utamo tempo` | 20 / 20 | +30% shielding, −15% recebido, −15% causado | `utamo tempo`, 55 / 200, 13 000 ms, `SKILL_SHIELDPERCENT` 220, `BUFF_DAMAGEDEALT` 65, `BUFF_DAMAGERECEIVED` 85 |
| Paladin | Sharpshooter | `utori con` | 20 / 250 | +32% Distance Fighting | `utito tempo san`, 60 / 450, 10 000 ms, distance 140% (145% com wheel), `DISABLE_DEFENSE`, esgota grupos heal e support |
| Paladin | Divine Defiance | `utori hur` | 20 / 250 | +6% de Distance como holy/healing ML, +12% dodge contra não-adjacentes | **não existe.** O par no snapshot é Swift Foot `utamo tempo san`, 55 / 400, 10 000 ms, haste 1.8 + pacify + exhaust de combate |
| Sorcerer | Master of Flames | `uteta flam` | 20 / 400 | +4% dano base de fogo; próxima magia não-fogo vira fogo | **não existe** |
| Sorcerer | Master of Thunder | `uteta vis` | 20 / 400 | +4% chance de crítico em energia; próxima não-energia vira energia | **não existe** |
| Sorcerer | Master of Decay | `uteta mort` | 20 / 400 | +30% dano extra de crítico em death; próxima não-death vira death | **não existe** |

Justificativa da escolha 2026 — não reabre a decisão, documenta o delta que a torna inevitável:

- **Nível 20 em vez de 55–60.** O personagem congelado do PB-05 é level 35. Snapshot trancaria
  postura atrás de um level-up e de um rebalanceamento inteiro.
- **20 de mana no Knight em vez de 290.** Pool Huntbound do Knight é 185; 290 custa mais que a barra
  e só fecha com poção, que a decisão 1 recusou.
- **Toggle que persiste, não cast de 10 s em cooldown.** Vira modo. Adiciona decisão sem custar um
  botão por segundo — o que o kit de quatro ações não tinha.

### Adaptação das stances de Sorcerer — desvio declarado

Crítico não existe no kernel e não entra no PB-07. As três stances são adaptadas. Fantasia e escolha
entre fogo, energia e death permanecem; o efeito de crítico some.

Mapeamento proposto, o mais simples e o mais fácil de reverter:

| Stance | 2026 original | Huntbound (desvio) |
|---|---|---|
| Master of Flames | +4% base de fogo + conversão da próxima não-fogo | **igual:** +4% base de fogo + conversão. Sem desvio de efeito. |
| Master of Thunder | +4% chance de crítico em energia + conversão | **+4% base de energia** + conversão. O 4% muda de unidade (chance → dano). |
| Master of Decay | +30% dano extra de crítico em death + conversão | **+4% base de death** + conversão. O +30% original é condicional a crítico; tratar como +30% de dano base inflaria o slot. +4% alinha as três. |

As três ficam simétricas: `+40` por milhar no elemento da stance, mais um flag de “próxima magia
adota este elemento”. Sem crítico, sem assimetria inventada. O custo de fidelidade é o burst
condicional de Decay. Números de conversão e o +4% são desvio declarado, não conteúdo do snapshot.

Crippling no snapshot: Sap Strength `exori kor`, nv 275, 300 mana, CD 12 000, grupo `support`+
`crippling`, 16 s, `BUFF_DAMAGEDEALT` 90 (−10% causado pelo alvo). Expose Weakness `exori moe`,
nv 275, 400 mana, CD 12 000, 16 s, `BUFF_DAMAGERECEIVED` 105. O grupo `"crippling"` já existe no
Lua; o 2026 o promove a stance persistente. Custos 2026 ficam para PB-07-08 via a mesma exceção de
wiki — não há número local para hashear e a tabela congelada da abertura não os lista.

---

## Knight

### Identidade

`vocations.xml`, `id="4"` name Knight, promoção `id="8"` Elite Knight (`fromvoc="4"`).

| Campo | Knight | Elite Knight | No catálogo |
|---|---|---|---|
| `gainhp` / `gainmana` | 15 / 5 | 15 / 5 | Sim (`gainHp`, `gainMana`) |
| `gainhpticks` / `gainhpamount` | 6000 / 1 | **4000** / 1 | Não. Hardcoded `KNIGHT_HEALTH_REGEN_MS=6000`, `AMOUNT=1` |
| `gainmanaticks` / `gainmanaamount` | 6000 / 2 | 6000 / 2 | Não. Hardcoded `KNIGHT_RESOURCE_REGEN_MS=6000`, `AMOUNT=2` |
| `basespeed` | 110 | 110 | Sim |
| `attackspeed` | 2000 | 2000 | Sim |
| `manamultiplier` | 3.0 | 3.0 | Sim |
| `magicshield` | 0 | 0 | Não |
| skill 0 fist / 1 club / 2 sword / 3 axe | 1.1 / 1.1 / 1.1 / 1.1 | **1.4** / 1.1 / 1.1 / 1.1 | `skillMultipliers` como record `skill:N`; Character não lê |
| skill 4 distance / 5 shield / 6 fishing | 1.4 / 1.1 / 1.1 | 1.1 / 1.1 / 1.1 | idem |

IDs de skill: `SKILL_FIST=0` … `SKILL_FISHING=6` em `creatures_definitions.hpp`. Multiplicador
menor = treino mais rápido. Knight treina melee em 1.1 e distance em 1.4.

Passo a `basespeed` 110: **11 ticks** (550 ms) pela fórmula de `creature.hpp` já portada em
`stepCooldownTicksFromSpeed`. Rotworm `speed` 58: **21 ticks**. Black Knight `speed` 125: **10
ticks**. Assassin `speed` 112: **11 ticks**. Contra rotworm o jogador foge andando; contra Black
Knight, não.

### Kit por faixa de nível

Até 50 (cabe no personagem 35, Caldera do paladin não; Berserk sim):

| Magia | Words | Nv | Mana | CD / grupo (ms) | Fórmula / forma |
|---|---|---|---|---|---|
| Bruise Bane | `exura infir ico` | 1 | 10 | 1000 / (healing) | cura fraca; slot cura, precursor |
| Wound Cleansing | `exura ico` | 8 | 40 | 1000 / 1000 | `levelMagic`: `(level*0.2 + ML*4)+25` … `(level*0.2 + ML*7.95)+51` |
| Haste | `utani hur` | 14 | 60 | 2000 / 2000 | `CONDITION_HASTE` 30 000 ms, fórmula 1.3, 40 |
| Brutal Strike | `exori ico` | 16 | 30 | 6000 / 2000 | `skillAttackProduct`, `range` 1 |
| Charge | `utani tempo hur` | 25 | 100 | 2000 / 2000 | `CONDITION_HASTE` 5 000 ms, fórmula 1.9, 40 |
| Whirlwind Throw | `exori hur` | 28 | 40 | 6000 | ST à distância; mesmo slot ST, não é mobilidade |
| Groundshaker | `exori mas` | 33 | 160 | 8000 | AoE; upgrade do Berserk no mesmo slot |
| Berserk | `exori` | 35 | 115 | 4000 / 2000 | `skillAttack`: `(level/5)+(skill+attack)*0.5\|1.5`, `*1.1`; `AREA_SQUARE1X1` |
| Recovery | `utura` | 50 | 75 | 60 000 / 1000 | HoT 60 s, +20 HP / 3 s — sustentação, não slot |

50–150: Front Sweep `exori min` nv 70 / 200 mana / CD 6000 / `AREA_WAVE6` (AoE direcional);
Intense Wound Cleansing `exura gran ico` nv 80 / 200 mana / CD **600 000** (cura de emergência, não
rotação); Fierce Berserk `exori gran` nv 90 / 340 mana / CD 6000 (AoE); Annihilation
`exori gran ico` nv 110 / 300 mana / CD 30 000 / `range` 1 (ST). Preenchem ST, AoE e cura. Stance
snapshot (Rage 60, Protector 55) cairia aqui — e é exatamente o que o 2026 antecipa para o 20.

150+: Executioner's Throw, Fair Wound Cleansing, Avatar of Steel, familiar. Fora do V0.

### Rotação solo em hunt

Nível 35, stance 2026, hunt tipo rotworm (65 HP, 21 ticks/passo, melee 0–40 / 2000 ms):

1. Blood Rage ligada (toggle; não se recasta). Hunt é caixa: +25% melee vale o +15% recebido
   porque o rotworm mal arranha 590 HP.
2. Aproximar. Auto-attack a cada 40 ticks.
3. Berserk se 2+ adjacentes; senão Brutal Strike no alvo.
4. Wound Cleansing se a barra baixou — no rotworm, quase nunca.
5. Filler: auto-attack.
6. Haste ou Charge **só** para desengajar quando a mana de dano acabar ou a vida pedir o spot
   tranquilo. Contra rotworm o passo 11 vs 21 já descola sem haste; a magia é ensaio para o
   caso que importa.

### Rotação solo contra boss

Black Knight: 1800 HP (~28× rotworm), melee 0–300 / 2000 ms, spear 0–200 `range` 7, speed 125 →
**10 ticks/passo**, mais rápido que o jogador.

1. Protector, não Blood Rage. O +15% recebido da Rage transforma 300 de melee em ameaça; o
   −15% recebido do Protector é o que deixa a barra viver. Sem esse slot, hunt e boss são a
   mesma rotação e o Knight morre no sítio.
2. Brutal Strike no alvo único; Berserk é desperdício de 115 mana.
3. Wound Cleansing no ritmo do grupo de cura (1 s) quando a melee de 300 conectar.
4. Charge (5 s, fórmula 1.9) para abrir espaço. Sem haste o boss anda a 10 ticks e o jogador a
   11: **recuar andando falha**. É a evidência de que mobilidade não é enfeite — é o que torna
   jogável a decisão 1 (recuar para um spot tranquilo).
5. Filler: auto-attack, que **não gasta mana**.

### Runas

Knight não conjura runa de ataque. UH rune id 3160, 1 carga, é a muleta de cura do Canary quando
`exura ico` não chega. Recovery (`utura`) é o HoT nativo. No Huntbound a UH vira carga de cura
(PB-07-11), não inventário. Explosion id 3200 (6 cargas) existe e o Knight não a conjura.

A espada id 3264 já declara imbuement slot de `life leech` e `mana leech`. O Canary coloca leech
no item; o Huntbound, sem imbuing nem inventário, promove leech a regra de personagem (extensão).

### Quando a mana acaba

Auto-attack continua: a sword não cobra mana. Regen fiel: 1 HP e 2 mana a cada 6 s — irrelevante
dentro do combate, suficiente no spot tranquilo se o Knight chegou lá. No Canary a resposta é
poção (id 266 health / 268 mana, líquidos sem `charges`, stack). No Huntbound a poção é recusada;
leech no auto-attack e regen fora de combate substituem. Knight é a vocação que **menos** sofre a
recusa, porque o filler não depende de mana.

### O que o catálogo ainda não representa

| Item do kit | Representável? |
|---|---|
| Brutal Strike, Berserk, Wound Cleansing | Sim — já no PB-05 |
| Charge / Haste como Condition de speed | Não |
| Blood Rage / Protector 2026 (toggle, persistência, %) | Não |
| Recovery HoT | Não (`CONDITION_REGENERATION`) |
| `gain*ticks` / `gain*amount` | Não no `VocationDefinition` |
| Shielding como skill do character | Não |
| Frente Sweep wave | Não (só `square`) |
| Grupo secundário `focus` | Não (`groupReadyAtTick` escalar) |

---

## Paladin

### Identidade

`id="3"` Paladin, promoção `id="7"` Royal Paladin (`fromvoc="3"`).

| Campo | Paladin | Royal Paladin |
|---|---|---|
| `gainhp` / `gainmana` | 10 / 15 | 10 / 15 |
| HP ticks / amount | 8000 / 1 | **6000** / 1 |
| Mana ticks / amount | 4000 / 2 | **3000** / 2 |
| `basespeed` / `attackspeed` | 110 / 2000 | 110 / 2000 |
| `manamultiplier` | 1.4 | 1.4 |
| `magicshield` | 0 | 0 |
| skill 4 distance | **1.1** (o mais rápido das três) | 1.1 |
| skill 0–3 melee | 1.2 | 1.2 |
| skill 5 shield | 1.1 | 1.1 |

Auto-attack é distance. Arco id 3350 `range` 6; besta id 3349 `range` 5. Sem custo de mana. O
kernel já aceita `attackRangeTiles > 1`; o character ainda não tem `skills.distance`.

### Kit por faixa de nível

Até 50:

| Magia | Words | Nv | Mana | CD / grupo | Fórmula / forma |
|---|---|---|---|---|---|
| Light Healing | `exura` | 8 | 20 | 1000 / 1000 | `levelMagic` |
| Haste | `utani hur` | 14 | 60 | 2000 / 2000 | `CONDITION_HASTE` 30 s |
| Intense Healing | `exura gran` | 20 | 70 | 1000 / 1000 | `levelMagic` |
| Ethereal Spear | `exori con` | 23 | 25 | 2000 / 2000 | `(level/5)+(skill+25)/3` … `(level/5)+skill+25`; `range` 7; skill = distance |
| Divine Healing | `exura san` | 35 | 160 | 1000 / 1000 | `(level*0.2+ML*7.22)+44` … `+ ML*12.79 + 79` |
| Divine Missile | `exori san` | 40 | 20 | 2000 / 2000 | `levelMagic`, holy, `range` 4 |
| Divine Caldera | `exevo mas san` | 50 | 160 | 4000 / 2000 | `levelMagic` holy, `AREA_CIRCLE3X3`, self |

50–150: Salvation `exura gran san` nv 60 / 210 mana (cura); Strong Ethereal Spear `exori gran con`
nv 90 / 55 mana / CD 8000 / `range` 7 — fórmula `(2*skill + attack/2500)*2.30 + level/5 + 7`,
**outro** `kind` inexistente. Holy Flash nv 70 é DoT, mesmo papel ST.

150+: Divine Grenade, Divine Empowerment, Avatar of Light. Fora do V0.

Holy Missile rune: conjurar nv 27 / 300 mana; item id 3182, **5 cargas**.

### Rotação solo em hunt

1. Sharpshooter 2026 ligada (+32% distance). Auto-attack a `range` 6 é o DPS de verdade.
2. Ethereal Spear no alvo (25 mana, CD 2 s) — o ST barato.
3. Divine Caldera se o personagem já for 50 e houver caixa; no 35 o slot AoE fica nas cargas de
   Holy Missile (PB-07-11) ou vazio até a magia existir.
4. Divine Healing quando a vida pedir. 160 mana dói no pool; Light/Intense existem como fallback.
5. Filler: auto-attack. Não gasta mana.
6. Haste para desengajar. Assassin (`speed` 112, 11 ticks, melee 0–120 + poison) empata o passo:
   sem haste o recuo não abre.

### Rotação solo contra boss

A diferença **é** a stance. Divine Defiance 2026 dá dodge contra não-adjacentes: o Paladin luta a
`range` 5–6, não ao lado. Sharpshooter no boss corpo-a-corpo é o erro simétrico ao Blood Rage no
Black Knight.

1. Divine Defiance ligada. Kite. Auto-attack e Ethereal Spear (`range` 7) de fora.
2. Sem Caldera — alvo único.
3. Haste quando o boss fechar. Sem este slot o dodge de não-adjacente não tem como ser mantido.
4. Divine Healing / Salvation no erro.

Swift Foot do snapshot (haste + pacify) misturava mobilidade e postura e **proibia** atacar. O
2026 separa os dois slots: Defiance é modo, Haste é botão. É evidência de que postura e
mobilidade são papéis distintos — se fossem o mesmo, o snapshot já teria bastado.

### Runas

Holy Missile id 3182, 5 cargas, `adori san`. IH id 3152 e UH id 3160, 1 carga cada. Paladin conjura
flechas (`exevo con`, nv 13) — no Huntbound munição de arco fica fora (sem inventário); o auto-attack
distance não consome flecha.

### Quando a mana acaba

Arco continua. O Paladin é o meio-termo: DPS principal não depende de mana; ST e cura sim. Poção
de espírito (id 7642 / 23374) é a resposta Canary — recusada. Leech no auto-attack distance vale
mais aqui do que no Knight, porque o Paladin *quer* ficar a 6 tiles e nem sempre apanha o suficiente
para o regen-fora-de-combate disparar tarde.

### O que o catálogo ainda não representa

| Item | Representável? |
|---|---|
| Divine Missile, Divine Healing, Caldera (se square couber) | Fórmula sim; Caldera circle e Missile `range` 4 não |
| Ethereal Spear / Strong Ethereal Spear | **Não** — `formula.kind` novo ou generalização; skill `distance` |
| Sharpshooter / Divine Defiance 2026 | Não |
| Haste | Não |
| `attackRangeTiles` no auto-attack | Sim, no blueprint; Character não declara distance |
| Holy Missile como carga | Não (PB-07-11) |

---

## Sorcerer

### Identidade

`id="1"` Sorcerer, promoção `id="5"` Master Sorcerer (`fromvoc="1"`).

| Campo | Sorcerer | Master Sorcerer |
|---|---|---|
| `gainhp` / `gainmana` | 5 / 30 | 5 / 30 |
| HP ticks / amount | 12 000 / 1 | 12 000 / 1 |
| Mana ticks / amount | 3000 / 2 | **2000** / 2 |
| `basespeed` / `attackspeed` | 110 / 2000 | 110 / 2000 |
| `manamultiplier` | 1.1 | 1.1 |
| `magicshield` | **1** | **1** |
| skill 1–4 armas | 2.0 (lento) | 2.0 |
| skill 6 fishing / 0 fist | 1.1 / 1.5 | 1.1 / 1.5 |

Regen de HP é o mais lento das três (12 s / 1). Regen de mana é o mais rápido (2–3 s / 2). A vocação
é um poço de mana com um palito de vida. Magic Shield existe **porque** essa assimetria existe.

Auto-attack: wand. Wand of Inferno id 3071, nível 33, `range` 3, **8 mana por disparo**, 56–74 fogo.
Wand of Vortex id 3074 (nv 6) cobra 1 mana e dá 8–18. Sem mana o disparo não acontece. O filler do
Sorcerer **é** um dreno de mana — o oposto do Knight.

### Kit por faixa de nível

Até 50:

| Magia | Words | Nv | Mana | CD / grupo | Fórmula / forma |
|---|---|---|---|---|---|
| Light Healing | `exura` | 8 | 20 | 1000 / 1000 | `levelMagic` |
| Energy Strike | `exori vis` | 12 | 20 | 2000 / 2000 | `levelMagic`, `range` 3 |
| Flame Strike | `exori flam` | 14 | 20 | 2000 / 2000 | `(level/5)+(ML*1.403)+8` … `+(ML*2.203)+13`, `range` 3 |
| Magic Shield | `utamo vita` | 14 | 50 | 14 000 / 2000 | `CONDITION_MANASHIELD` 180 000 ms; cap `min(maxMana, 300+7.6*level+7*ML)` |
| Cancel Magic Shield | `exana vita` | 14 | 50 | 2000 / 2000 | remove a Condition |
| Death Strike | `exori mort` | 16 | 20 | 2000 / 2000 | mesma fórmula dos strikes, death, `range` 3 |
| Fire Wave | `exevo flam hur` | 18 | 25 | 4000 / 2000 | wave, fogo, direção |
| Strong Haste | `utani gran hur` | 20 | 100 | 2000 / 2000 | `CONDITION_HASTE` 22 000 ms, fórmula 1.7, 40 |
| Intense Healing | `exura gran` | 20 | 70 | 1000 / 1000 | `levelMagic` |
| Energy Beam | `exevo vis lux` | 23 | 40 | 4000 | beam, não square |
| Ultimate Healing | `exura vita` | 30 | 160 | 1000 / 1000 | `(level/5)+(ML*6.8)+42` … `+(ML*12.9)+90` |
| Energy Wave | `exevo vis hur` | 38 | 170 | 8000 / 2000 | `AREA_SQUAREWAVE5`, energia |

50–150: Lightning nv 55; Rage of the Skies `exevo gran mas vis` nv 55 / 600 mana / CD 40 000
(AoE enorme); Hell's Core `exevo gran mas flam` nv 60 / 1100 mana / CD 40 000. Strong/Ultimate
Flame e Energy Strike (nv 70–100) são o mesmo slot ST com CD maior. Sudden Death se conjura no 45.

150+: Great Death Beam, Restoration, Avatars, Sap/Expose nv 275. Fora do V0 jogável, mas Sap/Expose
viram o canal crippling 2026.

### Rotação solo em hunt

1. Stance elemental 2026 no elemento da hunt (Flames vs sangue/terra, Thunder vs, Decay vs holy —
   a escolha é o conteúdo de PB-07-08/09). Toggle, persiste.
2. Fire Wave (ou Energy Wave no 38) na caixa. 25 mana, CD 4 s.
3. Strike do mesmo elemento como filler mágico (20 mana, CD 2 s, `range` 3).
4. Ultimate Healing se a vida pedir; Light Healing se a mana pedir.
5. Filler verdadeiro: wand — e cada tiro cobra mana.
6. Strong Haste para desengajar. Dragon (`speed` 86 → 14 ticks, 1000 HP, melee 0–120 + fire wave
   60–170) ainda é mais lento que o jogador, mas o palito de HP não permite tankar o recuo.

### Rotação solo contra boss

1. Magic Shield **antes** de abrir. 50 mana, 180 s, cap `min(maxMana, 300+7.6*35+7*ML)`. No pool
   185 do PB-05 o cap é o próprio pool: o shield **é** a barra de vida efetiva, paga em mana.
2. Stance no elemento que o boss não resiste. Black Knight: holy −8%, fire 95%, energy 80%, earth
   100%, ice 100%, death 20%. Strike de death / SD, não Fire Wave.
3. Sudden Death (3 cargas, id 3155) no alvo único; Wave é desperdício.
4. UH se o shield quebrar. Sem shield, 5 HP/nível não tanka melee 300.
5. Strong Haste quando o shield cai — o recuo é o que deixa o regen-fora-de-combate existir. Sem
   este slot o Sorcerer morre no sítio com a barra de mana vazia.

A diferença hunt/boss no Sorcerer é **stance (elemento) + Magic Shield ligado + runa ST no lugar
de wave**. Postura e mobilidade continuam sendo os dois eixos; Magic Shield é o regime de
sustentação, não o sétimo slot.

### Runas

| Runa | Item id | Cargas | Conjurar (nv / mana) | Papel |
|---|---|---|---|---|
| Heavy Magic Missile | 3198 | 10 | 25 / 350 | ST barato |
| Fireball | 3189 | 5 | 27 / 460 | ST fogo |
| Great Fireball | 3191 | 4 | 30 / 530 | AoE fogo |
| Thunderstorm | 3202 | 4 | 28 / 430 | AoE energia |
| Explosion | 3200 | 6 | 31 / 570 | AoE físico |
| Sudden Death | 3155 | **3** | 45 / 985 + 5 soul | ST death de boss |
| Energy Bomb | 3149 | 2 | 37 / 880 | campo |
| Magic Wall | 3180 | 3 | 32 / 750 | controle — fora do V0 de combate |
| UH | 3160 | 1 | (Druid conjura `adura vita`; Sorcerer usa) | cura |
| IH | 3152 | 1 | | cura |

`conjureItem(3147, 3155, 3)` confirma as 3 cargas da SD no Lua, iguais ao `charges` do item. No
Huntbound isso vira N cargas por hunt, sem blank rune, sem soul, sem inventário.

### Quando a mana acaba

O Sorcerer para. Wand cobra mana; shield cobra o pool; strike cobra 20. Regen 2 mana / 3 s no
snapshot é visível fora de combate e irrisório dentro. No Canary a resposta é mana potion (id 268
e a cadeia strong/great/ultimate) em clique contínuo — exatamente o que a decisão 1 recusa. Sem
leech, a vocação não tem filler gratuito. **É a vocação que justifica leech.** Magic Shield é o
outro meio: mana vira HP, então o mesmo leech de mana alimenta a barreira.

### O que o catálogo ainda não representa

| Item | Representável? |
|---|---|
| Strikes `levelMagic` | Fórmula sim; `range` 3 vira melee |
| Fire/Energy Wave | Fórmula sim; wave/beam não |
| Ultimate / Light / Intense Healing | Sim |
| Magic Shield / Cancel | **Não** — Condition `MANASHIELD` com cap calculado |
| Strong Haste | Não |
| Stances 2026 + conversão de elemento | Não; crítico recusado; +4% / conversão é desvio |
| Wand que gasta mana no auto-attack | Não |
| Cargas de runa | Não (PB-07-11) |
| `magicshield="1"` na vocação | Não |
| Regen ticks 3000/12000 vs Knight 6000/6000 | Não no vocation; constantes são de Knight |

---

## Tabela comparativa

| | Knight | Paladin | Sorcerer |
|---|---|---|---|
| Papel | melee tank/dps, caixa | ranged, kite | AoE elemental, barreira de mana |
| Alcance do auto-attack | 1 | 5–6 | 3 (wand) |
| Skill que escala o dano | sword (e axe/club); stance 2026 também shielding | **distance** no spear e no auto-attack; ML no missile/caldera/heal | **magic level** em tudo que importa |
| Dependência de mana | baixa (filler grátis) | média (filler grátis, ST/cura pagos) | **total** (filler pago) |
| Regime de sustentação | melee + leech + regen 6 s; Recovery HoT no 50 | distance + leech; dodge 2026 reduz dano recebido no kite | Magic Shield + leech de mana + regen 2–3 s; HP regen 12 s é o pior |
| O que falta no contrato | Condition (Rage/Protector/Haste), canal secundário, shielding skill | `skills.distance`, fórmula do spear, `range` 7, Defiance (dodge), Haste | Condition (shield, haste, stance+conversão), `range` 3, wave, wand-mana, regen ticks da vocação, cargas |

---

## O que Huntbound adota e o que recusa

Texto pronto para colar na ADR-05, seção “Extensões Huntbound permitidas”. PB-07-04 aplica a emenda.
As quatro decisões de sustentação já estão congeladas no README do PB-07: este texto justifica,
não reabre. A nota de proveniência das stances 2026 entra na mesma emenda porque também é extensão
de fonte, não de regra nova.

> ### Emenda proposta à ADR-05 — sustentação, cargas e stances 2026
>
> O V0 pessoal continua sendo Tibia/Canary no browser. Quatro recusas e uma exceção de proveniência
> passam a ser extensões Huntbound listadas, desligáveis, sem alterar IDs de conteúdo importado.
>
> **1. Recusa da poção de Tibia.** Health potion (id 266), mana potion (id 268) e a cadeia
> strong/great/ultimate/spirit existem no snapshot como líquidos empilháveis, sem `charges`,
> consumidos do inventário em clique contínuo. O V0 não tem inventário usável, não tem comando
> `actor/use-item` e não vai introduzir milhares de cargas. A recusa é de *loop*, não de número:
> o clique de poção substitui a decisão de quando recuar. Fidelidade perdida: o Knight Canary
> fecha Blood Rage de 290 mana com great mana potion; o Huntbound recusa esse fechamento e por
> isso adota a stance 2026 de 20 mana, não a do snapshot.
>
> **2. Adoção de leech.** O snapshot já conhece life leech e mana leech como skills de criatura
> (`SKILL_LIFE_LEECH_*`, `SKILL_MANA_LEECH_*`) e como imbuement da espada id 3264. Sem imbuing e
> sem item usável, o Huntbound promove leech a regra do personagem: fração do dano efetivamente
> aplicado devolve vida e mana à fonte, depois do clamp, sem ultrapassar o máximo. Valoriza bater
> em criatura viva. Fidelidade perdida: some o minigame de imbuir; ganha-se um único número por
> vocação em vez de um slot no item.
>
> **3. Adoção de regen sensível a combate.** O regen fiel do snapshot já está ligado — Knight
> 1 HP e 2 mana a cada 6 s, Paladin 1/8 s e 2/4 s, Sorcerer 1/12 s e 2/3 s. Falta o *regime*.
> “Em combate” = tempo desde o último dano **recebido**. Quase nada enquanto apanha; forte alguns
> segundos após o último hit. Só o jogador regenera fora de combate; criatura ferida continua
> ferida. O loop pretendido é recuar para um spot tranquilo. Fidelidade perdida: o Canary regen
> não olha combate. Sem a mudança, 1 HP / 6 s não é perceptível e a observação “não existe regen”
> continua verdadeira na prática.
>
> **4. Runa vira habilidade com cargas por hunt.** Sudden Death id 3155 carrega 3; GFB id 3191
> carrega 4; HMM id 3198 carrega 10; UH id 3160 carrega 1; Holy Missile id 3182 carrega 5. No
> Canary isso é item no backpack, conjurado com blank rune, soul e mana. No Huntbound a runa
> reaproveita a máquina de ability: N cargas, recarregadas fora de combate ou entre runs, sem
> inventário, sem loja, sem `actor/use-item`. Fidelidade perdida: some conjurar, soul e o peso.
> Fidelidade mantida: o papel (SD de boss, GFB de caixa, UH de emergência) e a ordem de grandeza
> do clip.
>
> **5. Stances do Vocation Adjustments 2026, com desvio de proveniência.** Postura adotada é a de
> Tibia `15.25.3a4a52` (`fonte: TibiaWiki, Tibia 15.25.3a4a52`), não a do snapshot `157e6f9e`. O
> snapshot tem buff de 10–13 s em nível 55–60 e 200–450 de mana; o personagem V0 é level 35 com
> pool de 185. Sem poção, a versão antiga é incastável. O 2026 é toggle que persiste, nível 20,
> e no Knight custa 20 de mana. Continua sendo conteúdo Tibia existente — a exceção é de fonte,
> não de invenção. Vale **só** para stances; kit, fórmula, custo, cooldown, loot e mapa continuam
> saindo do snapshot. As três stances de Sorcerer, que dependem de crítico, são adaptadas para
> +4% de dano base do elemento mais conversão da próxima magia; crítico não entra no kernel.
>
> Magic Shield (`utamo vita`, snapshot nv 14, 50 mana, 180 s) não é recusado nem substituído: é
> Condition do snapshot, a representar em PB-07-05, e o regime de sustentação que distingue o
> Sorcerer. PB-07-04 precisa conhecê-lo antes de escolher os números de leech e regen.

---

## Druid e Monk

**Druid** existe no snapshot (`id="2"`, promoção Elder Druid `id="6"`): `gainhp` 5, `gainmana` 30,
`magicshield="1"`, mana ticks 3000 (2000 na promoção), HP ticks 12 000 — o gêmeo de sustentação do
Sorcerer, com ice/earth no lugar de fire/energy/death, Heal Friend `exura sio` (nv 18, 120 mana,
precisa de alvo jogador, `allowOnSelf(false)`) e summons. Migrá-lo exigiria alvo aliado, criatura
convocada e o par de stances 2026 que a wiki lista para Druid (Shared Conservation / Elemental
Synthesis) — fora deste playbook.

**Monk** existe no snapshot (`id="9"`, promoção Exalted Monk `id="10"`): `gainhp` 10, `gainmana` 10,
fist `skill id="0"` multiplier 1.1, Harmony/Justice/Sustain como grupo `"virtue"` (Virtue of Harmony
`utori virtu`, nv 20, 210 mana, CD 10 s, grupo `support`+`virtue`). Não é um Knight de soco: o kit
gira em torno de virtue, não de stance 2026 de melee. Migrá-lo exigiria o grupo virtue, fist como
skill de personagem e um conjunto de magias que o V0 não vai generalizar agora.

---

## Confrontação com o PB-05

Números do Knight neste documento versus
`packages/content/src/selections/pb-05-knight-combat.json` e `combatConversion.ts`:

| Campo | Snapshot / este doc | PB-05 | Veredito |
|---|---|---|---|
| Vocação id 4, `attackSpeedMs` 2000, `baseSpeed` 110, `gainHp` 15, `gainMana` 5, `manaMultiplier` 3 | `vocations.xml` | json `vocation` | Igual |
| Regen 1 HP / 6 s e 2 mana / 6 s | `gainhpticks="6000"` `gainhpamount="1"` `gainmanaticks="6000"` `gainmanaamount="2"` | `KNIGHT_*_REGEN_*` | Igual |
| Berserk 35 / 115 / 4000 / 2000, `exori` | `berserk.lua` | json `spells[0]` | Igual |
| Brutal Strike 16 / 30 / 6000 / 2000, `exori ico` | `brutal_strike.lua` | json `spells[1]` | Igual |
| Wound Cleansing 8 / 40 / 1000 / 1000, `exura ico` | `wound_cleansing.lua` | json `spells[2]` | Igual |
| Sword id 3264 attack 14 | `items.xml` | json `weapon` | Igual |
| Passo 11 / rotworm 21 | `basespeed` 110, rotworm `speed` 58, fórmula `creature.hpp` | json `conversions.stepCooldownTicks.chosen` | Igual |
| sha256 de vocations, berserk, brutal_strike, wound_cleansing, items, rotworm, `creature.hpp`, `player.cpp`, `game.hpp` | recalculados 2026-08-21 | json `sourceFiles` | **Idênticos** |

**Não há divergência de snapshot que invalide a seleção.** Há uma extensão Huntbound **já
declarada** no próprio json, não descoberta agora: `maxMana` 185 contra “Canary mana at level 35 is
170”, justificada em `character.manaSource` porque 115+40+30 = 185 e o V0 não tem poção. Este
documento não a reabre. `PB-05-SELECTION.md` ainda descreve ficha level 8 — isso é deriva do
documento de seleção contra o json vigente (level 35), fora do escopo desta task.

---

## Arquivos-fonte

Hashes SHA-256 dos arquivos reais do snapshot em 2026-08-21. Caminho relativo ao root de
`references/canary`. Nenhuma leitura em `C:\Kaezan\kaezan\canary-3.4.1\`.

| Path relativo | SHA-256 |
|---|---|
| `data/XML/vocations.xml` | `693a179048d5d5c5af519459c8e542cd01013212af1cec88f7c8eb72634f4350` |
| `data/scripts/spells/attack/berserk.lua` | `819b628608268aebea355be46a1d86e73c24bdf26d1299aa7d3e9af71d10f89f` |
| `data/scripts/spells/attack/brutal_strike.lua` | `08e00c322d9b0d8805f3f9b40776205d579c1481bd72667efbc85a99efbc62c3` |
| `data/scripts/spells/healing/wound_cleansing.lua` | `e0a10fcce56a981a811fe18d687336cc1799cc76087b1d0bfd9a1b5f828e245b` |
| `data/scripts/spells/support/blood_rage.lua` | `00c7a34a617f0360eb3f395ba5d6bc8fe515cd0de6003a77782545703a80840a` |
| `data/scripts/spells/support/protector.lua` | `7263ca8d6f007efb23c54e6dc3a2a35df0639f0380fd0de07f97b5cef3ecd46d` |
| `data/scripts/spells/support/charge.lua` | `8907e6fda8ac25081a8aa339196a8f6a5be4cfe91024b6d33ef5b0f83271313b` |
| `data/scripts/spells/support/haste.lua` | `bf754034e892e5bccb2dc2d9d4d626e7ef30549c5cd40ed281824887d68d0d3c` |
| `data/scripts/spells/support/strong_haste.lua` | `d73c150c773731ba927807aaa8c2821c40baf061e9e96e399197058d6f160b8d` |
| `data/scripts/spells/support/sharpshooter.lua` | `0aeba3456a1f2fa93f9c642fd3831dfb91eecf19d755194ebeeb88e7e53b911f` |
| `data/scripts/spells/support/swift_foot.lua` | `33599050b2f28d59bc58787a88332538af4706cc1fcf27b64b6ab49336a70f4a` |
| `data/scripts/spells/support/magic_shield.lua` | `e6f55699f07ee98b25dbdb3749eb2c746f62a2c5a1fd3b0542a57501b17a3b96` |
| `data/scripts/spells/support/cancel_magic_shield.lua` | `ea907c0dc2e7b84ca2cf0543b6c0ea90fe946b8e097791734b36184283b67663` |
| `data/scripts/spells/support/sap_strength.lua` | `19d65306a65850b533813b10751daba316724b35c507369386e3c7db1a172ea2` |
| `data/scripts/spells/support/expose_weakness.lua` | `6ee5f77f0949d258bbc1cdb2e7ead160f2e4137482a028c2ad3b328826bbae85` |
| `data/scripts/spells/attack/ethereal_spear.lua` | `ad247b008289c3b09306406e36ad64f4c22eb3e706ea86bf6c369c9187109bb3` |
| `data/scripts/spells/attack/divine_missile.lua` | `ab9c889e766da25d2b7d423f2b762767f92528cf3f8ad28d9cd589e712315f85` |
| `data/scripts/spells/attack/divine_caldera.lua` | `7ed4645ba6011ac3fd5a33307475f3663b26b9da292c11b347311a1194c91f1f` |
| `data/scripts/spells/healing/divine_healing.lua` | `a68f5c5caca8c01c2d0aabfc636b8a4901e18a2b63527c32a02836755dfa7568` |
| `data/scripts/spells/attack/flame_strike.lua` | `e73fd5c00d89c636d2a7d583040c8aea709beaabe120d4e0e67b09fc06bb6346` |
| `data/scripts/spells/attack/energy_strike.lua` | `9acadd617771240cb0db0a8ff7ee8d900a38ef6ae2eadf4ee30d4d7da1bcef05` |
| `data/scripts/spells/attack/death_strike.lua` | `93d55db2217c54b94bd4e31d93a305e81fd3e066b9d47ad810b35c61915408f0` |
| `data/scripts/spells/attack/fire_wave.lua` | `632ff5054c81e3abdb9aef752128e42e1fb7dfb282ca524c6dfbb80017c44477` |
| `data/scripts/spells/attack/energy_wave.lua` | `90affaaca7040c550e28e1f1f86b808a7706ca19849a9e35d1cabd387a2e4756` |
| `data/scripts/spells/healing/ultimate_healing.lua` | `724e1dc78c42fd5d46a6499209cacc19d10dc7659884e2368265872036f41b76` |
| `data/scripts/spells/healing/light_healing.lua` | `44d94a09b54b8f86f4d641b72e4eb2c01377051340e47d76ddb384c78fd72ebc` |
| `data/scripts/spells/healing/intense_healing.lua` | `b90837bee6a01956120eb24718013a858f7ed675af78f599ea908aa3ebddbbe0` |
| `data/scripts/spells/healing/recovery.lua` | `6e86fe616c9f41254b7ff6995df50ad26829b5797e279ac10f0f97c274ccbe66` |
| `data/scripts/spells/healing/salvation.lua` | `a7b08835b27830f4fb7227287f600f2e928bdcaa0e93e33f16d39611982e9a02` |
| `data/scripts/spells/healing/intense_wound_cleansing.lua` | `db8ee6c1d3ef32cfbb9e59857347c3b086d2ffaf167929dac300e65e3c9396b5` |
| `data/scripts/spells/healing/heal_friend.lua` | `a5d52d4e08504b23dcaa790199ecc59c9bd16853448aa58cab00c24cf1b61d71` |
| `data/scripts/spells/support/virtue_of_harmony.lua` | `5cbf6d8b5b65e0e0b7139773af80783c6a66945d9495223c4f3010b0ac52565f` |
| `data/scripts/spells/attack/fierce_berserk.lua` | `62a571b97b7b71f779d2bacb2420707287b939c00e4aadc2d91696407301c4be` |
| `data/scripts/spells/attack/front_sweep.lua` | `5a0034ac0cdb69fff13eeca3c898fe79747e672385716512fdc50c0b929f59a9` |
| `data/scripts/spells/attack/annihilation.lua` | `f48fdd991d034501523d433e7ba90b04532fb5c9d27e681b0c2dbf6259052e6f` |
| `data/scripts/spells/attack/strong_ethereal_spear.lua` | `923f50d69c387b56959ab12d1f65b487f9eef6dac6d59a7cc50fb384b2a1d95f` |
| `data/scripts/spells/attack/groundshaker.lua` | `779037e4a1a833cf533be5c0d52a3ced03bacb86b44d93d756fcaac1fcaa2e9e` |
| `data/scripts/spells/attack/whirlwind_throw.lua` | `a98632bf83f2828f29af86df80c36e07c682831778bbd90620537932a3e51769` |
| `data/scripts/spells/attack/lightning.lua` | `08ef3109ebc002cdc757cc9b9e989671ab6dc86fb7fb6ec3735386b6e8ff39bc` |
| `data/scripts/spells/attack/rage_of_the_skies.lua` | `53ed52dd5d06e692d0d8457d98373243af9af5e4bd878b34336cda1a284fffc8` |
| `data/scripts/spells/attack/hells_core.lua` | `5145d5346cf7d4b4210a10eb9eabcfe3c3a5c7826ab5d2dc42c77a9f5b549076` |
| `data/scripts/spells/attack/apprentice's_strike.lua` | `0b739fa2b621aa2add522a1ffd88c1258f1a45d11ce64a1cfc9cdd303e249ac8` |
| `data/scripts/spells/healing/bruise_bane.lua` | `372bf0ebe98e02c7d53071481dee5e05c6f3905eef5bb022cc5be24ec86b7994` |
| `data/scripts/spells/attack/lesser_ethereal_spear.lua` | `68ebc8ba029e78b92fbdfc7612f33edf2e3e4ade5508df62dd48c6c1286d8396` |
| `data/scripts/spells/conjuring/sudden_death_rune.lua` | `40f30f204b5faa78363d434f3cc712bc8258e3cf2bfc43e2444d20f67cbf6f75` |
| `data/scripts/spells/conjuring/great_fireball_rune.lua` | `5e9506387f40a64f20c17e3468cc051555d323082a2440831de1dfc78b8e8715` |
| `data/scripts/spells/conjuring/holy_missile_rune.lua` | `2bc7997aefe9735d1e593f764a6dfd2830055976198afd4e11c0278fe3e75cf6` |
| `data/scripts/spells/conjuring/heavy_magic_missile_rune.lua` | `b802f6a251b0bd59a17c70fb996606de27fea56a4151adaee57b4bfabf17c158` |
| `data/scripts/spells/conjuring/ultimate_healing_rune.lua` | `c85b3351dbc74d594908a7bbc1367c20de95bf3b0e94f6ed725bd10f9745fa8a` |
| `data/items/items.xml` | `b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8` |
| `data-otservbr-global/monster/vermins/rotworm.lua` | `f75ed297cd851013cde4e991113bf2d67ab9930852f20fb0c4e8d0937ddb176b` |
| `data-otservbr-global/monster/bosses/black_knight.lua` | `17956b290e407ace1f97e5048cb01f9ad08c031e0aca5b545bafbe910e0149fd` |
| `data-otservbr-global/monster/dragons/dragon.lua` | `5cf359b04cd7ac0ca47d552c35f224d635d643733af834418c82de22af736ef6` |
| `data-otservbr-global/monster/humans/assassin.lua` | `6e19951d34d02d6877730507c53f961ac73625d226ffba86baafb29f08858be9` |
| `src/creatures/creatures_definitions.hpp` | `8d43db504bc9631bf56fd9ad1310fca8db9e50854f9ca9e9815838e9564433b6` |
| `src/creatures/creature.hpp` | `80da5adc1bc8a12b0fcabd8d868e8166fa04c8fe0fa69a2589cd66ac461069b9` |
| `src/creatures/players/player.cpp` | `6c357271577e4bb6bf30783303025f38d49dea2065ed499ade90be758d7af2d4` |
| `src/game/game.hpp` | `1df771ec63ceb6882c30029f94c373c7a25a54f65d2b7295b431a97b29b00402` |

Stances 2026: `fonte: TibiaWiki, Tibia 15.25.3a4a52`
(`https://tibia.fandom.com/wiki/Stance_Spells`). Nenhum outro assunto usa a wiki.
