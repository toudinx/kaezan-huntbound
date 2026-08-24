# KNIGHT_BANDS — o mapa da classe Knight

**Entregue por:** PB-08-02. **Congelado em:** 2026-08-24.

A partir deste documento, ele é **a fonte do kit do Knight** (`docs/playbooks/PB-08/README.md`,
fontes normativas, posição 10). As tasks PB-08-03 a 09 consomem este mapa; nenhuma delas decide
sozinha qual forma de cada papel entra.

O mapa responde três perguntas e só elas: **quais ações existem**, **o que é escada** e **o que fica
reservado**. Ele não redesenha o princípio de design nem as decisões congeladas do README — ele os
aplica.

## Proveniência

Toda linha da Seção 1 carrega `sourceFile` e `sha256`. Snapshot Canary `157e6f9e`, lido em
2026-08-24. Paths de magia são relativos a `references/canary/data/scripts/spells/`; o
`data/XML/vocations.xml` da linha do auto-attack é relativo a `references/canary/`.

Os números foram extraídos **dos arquivos**, não do README nem da task card: cada `spell:level`,
`spell:mana`, `spell:cooldown`, `spell:range` e `setArea` desta página foi lido no Lua correspondente.

**Exceção única, herdada do `PB-07-ROTATIONS.md` e já aprovada:** os números de Blood Rage e
Protector saem do Vocation Adjustments 2026 (`fonte: TibiaWiki, Tibia 15.25.3a4a52`), porque o
snapshot é anterior ao sistema. Isso vale **só** para stances.

As formas de área foram lidas de `references/canary/data/scripts/lib/register_spells.lua`
(`sha256: 4e2f228ada43a7a565865295409f8afe57d50de4fa744822c3b92d9ce5b5cc91`), que é onde
`AREA_SQUARE1X1`, `AREA_CIRCLE3X3` e `AREA_WAVE6` estão definidos como tabelas de tiles. Os números
de tiles deste documento são **contados nessas tabelas**, não estimados.

Conversão de tempo: `TICK_DURATION_MS = 50` (`packages/contracts/src/simulation/identity.ts:12`).
1 000 ms = 20 ticks.

## Como contar uma ação

Uma **célula** é um papel com uma imagem. O orçamento do README — no máximo 9, pelo menos 4 de dano
— conta células.

A célula de postura contém **duas magias mutuamente exclusivas**, Blood Rage e Protector. Elas nunca
estão ativas ao mesmo tempo (`exclusivityGroup` compartilhado; no Canary, o mesmo `SubId`), então
ocupam **uma célula e um botão**, que alterna entre as duas. São 9 células e 10 palavras. O critério
de imagem compara ações que **podem coexistir**; duas formas mutuamente exclusivas nunca coexistem,
então o critério não se aplica entre elas — aplica-se entre a célula de postura e as outras oito.

---

## Seção 1 — O conjunto ativo

**9 células, 5 de dano.** Vale do level 1 ao teto: nenhuma faixa gateia (decisão congelada 2; a
selection já declara `spellAccess: "unrestricted"` em
`packages/content/src/selections/pb-05-knight-combat.json:5`).

| # | Papel | Nome | Words | Nv origem | Mana | CD | Grupo CD | Forma no contrato | Imagem própria | `sourceFile` | `sha256` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Dano — filler | auto-attack | — | — | 0 | 2 000 ms (40 t) | — | `attackCooldownTicks: 40`, `attackRangeTiles: 1` | O metrônomo: o boneco troca golpes com quem está encostado nele, sozinho, sem o jogador apertar nada | `data/XML/vocations.xml`, `name="Knight"` `attackspeed="2000"` | `693a179048d5d5c5af519459c8e542cd01013212af1cec88f7c8eb72634f4350` |
| 2 | Dano — AoE curta | Berserk | `exori` | 35 | 115 | 4 000 ms (80 t) | 2 000 ms (40 t) | `shape: 'area'`, `radius: 1` | Giro no próprio eixo: acendem **os 8 tiles que encostam em mim**, e nada além | `attack/berserk.lua` | `819b628608268aebea355be46a1d86e73c24bdf26d1299aa7d3e9af71d10f89f` |
| 3 | Dano — AoE larga | Groundshaker | `exori mas` | 33 | 160 | 8 000 ms (160 t) | 2 000 ms (40 t) | `shape: 'area'`, `radius: 3` | Pancada no chão: a onda sai de mim e acende **tudo a três tiles de distância**, um bloco que cobre a tela de perto | `attack/groundshaker.lua` | `779037e4a1a833cf533be5c0d52a3ced03bacb86b44d93d756fcaac1fcaa2e9e` |
| 4 | Dano — ST adjacente | Brutal Strike | `exori ico` | 16 | 30 | 6 000 ms (120 t) | 2 000 ms (40 t) | `shape: 'target'`, `rangeTiles: 1` | O boneco **para o metrônomo** e desce um golpe comprometido em um alvo encostado: uma pancada, não a troca contínua | `attack/brutal_strike.lua` | `08e00c322d9b0d8805f3f9b40776205d579c1481bd72667efbc85a99efbc62c3` |
| 5 | Dano — ST à distância | Whirlwind Throw | `exori hur` | 28 | 40 | 6 000 ms (120 t) | 2 000 ms (40 t) | `shape: 'target'`, `rangeTiles: 5` | **A arma sai da mão** e atravessa até cinco tiles de chão vazio até o alvo. É a única vez em que o Knight machuca alguém sem estar encostado | `attack/whirlwind_throw.lua` | `a98632bf83f2828f29af86df80c36e07c682831778bbd90620537932a3e51769` |
| 6 | Cura | Wound Cleansing | `exura ico` | 8 | 40 | 1 000 ms (20 t) | 1 000 ms (20 t) | `shape: 'self'`, `effect: 'heal'` | A barra de vida **salta de uma vez** e o boneco pisca. Nada acontece com o inimigo | `healing/wound_cleansing.lua` | `e0a10fcce56a981a811fe18d687336cc1799cc76087b1d0bfd9a1b5f828e245b` |
| 7 | Postura | Blood Rage **ou** Protector | `utito tempo` / `utamo tempo` | 20 | 20 | toggle | grupo secundário | `toggle: true`, `appliedConditionIndex`, `exclusivityGroup` | Um **estado que não passa**: a aura fica no boneco até ser trocada. Fúria vermelha e aberta, ou guarda azul e fechada — e o boneco anda com a postura ligada | *ver exceção de proveniência* | `fonte: TibiaWiki, Tibia 15.25.3a4a52` |
| 8 | Taunt | Challenge | `exeta res` | 20 | 30 | 2 000 ms (40 t) | 2 000 ms (40 t) | `shape: 'area'`, `radius: 1`, sem dano | **Ninguém perde vida e todo mundo vira**: as criaturas adjacentes largam o alvo que tinham e apontam para mim. É a única ação em que o que muda está no inimigo, não na barra | `support/challenge.lua` | `a0d65caab9d5e896a0fa8ed5cdc19118f6430f0f35966f4b17f4369353d7f489` |
| 9 | Mobilidade | Haste | `utani hur` | 14 | 60 | 2 000 ms (40 t) | 2 000 ms (40 t) | `speedPermille`, `durationTicks: 600` (30 000 ms) | **O passo encurta**: o boneco atravessa o mesmo corredor visivelmente mais rápido, por 30 s | `support/haste.lua` | `bf754034e892e5bccb2dc2d9d4d626e7ef30549c5cd40ed281824887d68d0d3c` |

**Orçamento conferido:** 9 células ≤ 9. Dano nas células 1–5 = 5 ≥ 4. Nenhum papel vazio.

### Os números de postura, por extenso

Exceção de proveniência declarada. `fonte: TibiaWiki, Tibia 15.25.3a4a52`:

| Postura | Words | Nv / mana 2026 | Ganho | Perda |
|---|---|---|---|---|
| Blood Rage | `utito tempo` | 20 / 20 | +25% sword/axe/club | +15% dano recebido |
| Protector | `utamo tempo` | 20 / 20 | +30% shielding, −15% recebido | −15% dano causado |

Toda postura tem **um ganho e uma perda explícitos** (`02_vocations_spells_runes.md` §7.2: "Postura
sem downside é buff, não postura"). Os números do snapshot — Rage nv 60 / 290 mana / 10 s, Protector
nv 55 / 200 mana / 13 s — **não** são usados: são buff cronometrado, não toggle, e 290 de mana
excede a pool de 185 do Knight Huntbound. A justificativa completa está no `PB-07-ROTATIONS.md`
§"Stances 2026 versus snapshot" e não se reabre aqui.

---

## Seção 1b — O critério de imagem, par a par

> Duas ações só coexistem se um espectador distingue as duas olhando. Cooldown e mana são
> invisíveis. (README, critério 2.)

Um par justificado por cooldown, mana ou dano é escada não detectada. Abaixo, **a imagem de cada
lado** — nunca o número.

### Os 10 pares da rotação de dano

| Par | Imagem de A | Imagem de B | Veredito |
|---|---|---|---|
| auto-attack × Berserk | Um alvo encostado, golpe após golpe | 8 tiles acendem de uma vez ao meu redor | **Distintos** — um alvo × oito, contínuo × instantâneo |
| auto-attack × Groundshaker | Um alvo encostado, ritmo constante | Um bloco de 3 tiles de raio acende ao redor | **Distintos** — alcance 1 × 3, um alvo × dezenas |
| auto-attack × Brutal Strike | Troca contínua que o jogador não comanda | Interrupção comprometida: o boneco para e desce **um** golpe | **Distintos** — ver "o par mais fraco" abaixo |
| auto-attack × Whirlwind Throw | Encostado no alvo | A arma voa por até 5 tiles | **Distintos** — a posição do jogador é oposta |
| Berserk × Groundshaker | Anel de 1 tile: só o que encosta em mim | Bloco de 3 tiles: alcança quem está longe de mim | **Distintos por medição** — ver abaixo |
| Berserk × Brutal Strike | Todos os 8 vizinhos acendem juntos | Um único vizinho leva a pancada | **Distintos** — área × alvo |
| Berserk × Whirlwind Throw | Eu estou no meio do pack | Eu estou longe e a arma viaja | **Distintos** — posição oposta |
| Groundshaker × Brutal Strike | O chão inteiro à volta treme | Um alvo encostado leva um golpe | **Distintos** — área larga × alvo |
| Groundshaker × Whirlwind Throw | Tudo num raio de 3 é atingido | Um alvo a até 5 tiles é atingido | **Distintos** — muitos × um, e a arma deixa a mão |
| Brutal Strike × Whirlwind Throw | O alvo está encostado; a arma fica na mão | O alvo está longe; a arma sai da mão e volta | **Distintos** — a posição do jogador é a informação |

### Os 6 pares situacionais

| Par | Imagem de A | Imagem de B | Veredito |
|---|---|---|---|
| Wound Cleansing × Postura | A barra salta e o brilho passa | A aura fica e não passa | **Distintos** — instantâneo × permanente |
| Wound Cleansing × Challenge | Muda a minha barra | Muda para onde o inimigo aponta | **Distintos** — o alvo do efeito é oposto |
| Wound Cleansing × Haste | A barra salta | O passo encurta; a barra não muda | **Distintos** |
| Postura × Challenge | Estado meu, permanente | Reação do inimigo, imediata | **Distintos** |
| Postura × Haste | Não passa até eu trocar | Passa sozinha em 30 s | **Distintos** — a permanência é visível: um relógio na barra × nenhum |
| Challenge × Haste | O inimigo vira para mim | Eu ando mais rápido | **Distintos** |

### Os 20 pares cruzados (dano × situacional)

Regra: **nenhuma das quatro situacionais tira vida de ninguém**, e as cinco de dano tiram. O
espectador distingue "o número vermelho subiu na cabeça do bicho" de "ninguém perdeu vida" sem
esforço. Os 20 pares passam por essa regra, com **um** caso que merece exame explícito:

**Challenge × Berserk** compartilham a forma exata no snapshot — os dois são
`createCombatArea(AREA_SQUARE1X1)`, os mesmos 8 tiles adjacentes. A separação é o que acontece nos
tiles: Berserk **arranca vida dos oito**; Challenge não arranca nada e faz os oito **virarem**. Ação
que muda a barra × ação que muda o comportamento é a distinção mais forte do documento, e ela
sobrevive à forma idêntica. **Distintos.**

### A decisão consequente: Berserk × Groundshaker — medida, não julgada

A task card registrou que a investigação de 2026-08-24 **julgou** que o par passa, e pediu que a
discordância viesse com argumento de imagem. O par passa — e não é preciso julgar: as duas formas
são tabelas de tiles no snapshot, e dá para **contar**.

`register_spells.lua`, `AREA_SQUARE1X1` (Berserk) — grade 3×3, `3` marca o conjurador:

```
1 1 1
1 3 1
1 1 1
```

`register_spells.lua`, `AREA_CIRCLE3X3` (Groundshaker) — grade 7×7:

```
0 0 1 1 1 0 0
0 1 1 1 1 1 0
1 1 1 1 1 1 1
1 1 1 3 1 1 1
1 1 1 1 1 1 1
0 1 1 1 1 1 0
0 0 1 1 1 0 0
```

| | Berserk | Groundshaker | Razão |
|---|---|---|---|
| Células na tabela | 9 | 37 | 4,1× |
| Tiles que podem conter inimigo (menos o do conjurador) | **8** | **36** | **4,5×** |
| Alcance a partir do conjurador | 1 tile | 3 tiles | 3× |
| Sob o contrato (`radius` é Chebyshev — ver Seção 5) | 8 | **48** | **6×** |

**Veredito: os dois ficam.** Não é um par no limite; é a diferença mais visível que existe num jogo
top-down em grade. Berserk acende o anel que encosta no boneco. Groundshaker acende um bloco que vai
até a borda do que o jogador enxerga de perto. Um espectador que nunca leu o kit sabe qual foi qual
no primeiro frame, e nem precisa contar: **um deles alcança criaturas que estavam visivelmente longe
do jogador, e o outro nunca alcança.**

Consequência: a rotação de dano fica em **cinco** ações e nada precisa entrar no lugar de ninguém.

### O par mais fraco do mapa: auto-attack × Brutal Strike

Este é o par que o mapa aceita com a menor margem, e a honestidade sobre isso vale mais do que a
aprovação. Os dois são físicos, `range` 1, exigem arma, e acertam a mesma criatura na mesma posição.
Se a diferença fosse "Brutal Strike dá mais dano", seria escada — dano é número, e número é
invisível.

**A imagem que os separa não é o dano: é quem aperta o botão.** O auto-attack é um metrônomo que o
jogador nunca comanda — ele já está rodando, e continua rodando durante todas as outras oito ações.
Brutal Strike é um **cast**: o boneco interrompe a troca, arma o golpe e desce um só. Em grade
top-down isso é a diferença entre uma animação em loop e uma animação de uma vez, e é exatamente o
padrão que a referência adotada pelo README (QWER + auto-attack) usa sem produzir redundância.

**Condição de falha, escrita para poder ser cobrada:** se a PB-08-04 ou a PB-08-08 entregarem Brutal
Strike com uma animação que seja o swing do auto-attack repintado, o par **falha** o critério 2 e a
célula 4 deve cair — a rotação de dano vai a quatro ações, o que ainda cumpre o orçamento (≥ 4). A
decisão congelada 7 (FX próprio por `abilityId`, `apps/game/src/hunt/CombatFxTable.ts`) é o que
compra a distinção, e aqui ela é obrigatória, não desejável.

**O que fortalece o par no futuro, sem trabalho novo de design:** Brutal Strike declara
`COMBAT_PARAM_BLOCKARMOR, 1` no snapshot — ela **ignora armadura**, e o auto-attack não. Hoje isso é
invisível porque `armor` não existe no kernel (chega no PB-11, v6). Quando chegar, a célula 4 ganha
uma imagem mecânica própria — "o golpe que passa pela armadura" — e o par sai da margem.

### Whirlwind Throw contra a pesquisa — divergência declarada

`02_vocations_spells_runes.md` §3.1 lista Whirlwind Throw como descartável ("existe só para
preencher um vazio de level") e §11 fixa o `Range` do Knight em `1`. **O mapa diverge dos dois, e
declara.**

O motivo de §3.1 não se aplica aqui: em Huntbound **nenhuma faixa gateia** (decisão congelada 2),
então "preenche um vazio de level" deixa de ser uma razão para a magia existir — e deixa de ser uma
razão para cortá-la. O que sobra é a imagem, e a imagem é única: **é a única célula do kit inteiro em
que o Knight machuca alguém sem estar encostado.** Nenhuma outra das oito produz essa figura.

A divergência também não fere a identidade que §3.1 protege. O risco nomeado em §9.2 é "matar o
Knight ao dar dano single target" — e Whirlwind Throw a 40 de mana, com a maior dispersão min–max do
kit (`(level/5)+(skill+attack)/3` a `(level/5)+skill+attack`), não é dano single-target confiável: é
o **abridor**. Ele serve a identidade "eu escolho onde a luta acontece" no único momento em que ela é
literal — o momento de começar a luta. O Knight puxa o pack de longe e depois gira.

---

## Seção 2 — Os cortes

Duas categorias, e a distinção decide se a magia **volta um dia** ou **nunca**.

- **Escada** — está na mesma faixa de uma célula ativa e ficaria **ao lado** dela, com a mesma
  imagem e outro número. **Corte permanente.**
- **Substituição futura** — é a forma de uma faixa que ainda não existe. Ocupa a **mesma célula** de
  uma ação ativa e entra **trocando, não somando**. Nunca coexiste com a forma atual.

### Escada — corte permanente

| Magia | Words | Nv | Mana | CD | Célula que duplicaria | Por que é a mesma imagem |
|---|---|---|---|---|---|---|
| Charge | `utani tempo hur` | 25 | 100 | 2 000 ms | 9 — Haste | Mesma `CONDITION_HASTE`, mesmo `CONST_ME_MAGIC_GREEN`, mesmo self-target: **o boneco anda mais rápido**. Difere só em duração (5 000 ms × 30 000 ms) e fórmula (1.9 × 1.3), e as duas coisas são invisíveis. Corte já declarado pelo README |
| Bruise Bane | `exura infir ico` | 1 | 10 | 1 000 ms | 6 — Wound Cleansing | A barra salta e o boneco pisca. Idêntica, com número menor |
| Cure Poison / Bleeding / Burning / Curse / Electrification | vários | — | — | — | 6 — Wound Cleansing | Cinco botões para "limpar um estado ruim". `02_vocations_spells_runes.md` §3.1: cura de Knight em Huntbound deve ser **uma coisa só, não cinco** |

`sourceFile` / `sha256` dos cortes com número citado:
`support/charge.lua` `8907e6fda8ac25081a8aa339196a8f6a5be4cfe91024b6d33ef5b0f83271313b`;
`healing/bruise_bane.lua` `372bf0ebe98e02c7d53071481dee5e05c6f3905eef5bb022cc5be24ec86b7994`.

### Substituição futura — troca, não soma

| Magia | Words | Nv | Mana | CD | Substitui a célula | Por quê | `sourceFile` / `sha256` |
|---|---|---|---|---|---|---|---|
| Fierce Berserk | `exori gran` | 90 | 340 | 6 000 ms | **2 — Berserk** | Mesmíssima `AREA_SQUARE1X1` e mesmo `CONST_ME_HITAREA`. É Berserk com fórmula maior — o caso puro de escada do README. Numa faixa alta ele **vira** o Berserk; nunca fica ao lado | `attack/fierce_berserk.lua` `62a571b97b7b71f779d2bacb2420707287b939c00e4aadc2d91696407301c4be` |
| Annihilation | `exori gran ico` | 110 | 300 | 30 000 ms | **4 — Brutal Strike** | `range` 1, `needTarget`, ST adjacente. É o "nuke single target com cooldown longo" que a pesquisa §3.1 põe no núcleo obrigatório — a forma de faixa alta da mesma célula | `attack/annihilation.lua` `f48fdd991d034501523d433e7ba90b04532fb5c9d27e681b0c2dbf6259052e6f` |
| Front Sweep | `exori min` | 70 | 200 | 6 000 ms | **3 — Groundshaker** | `02_vocations_spells_runes.md` §3.1 as trata como alternativas da mesma célula: "cone/linha frontal, tipo Front Sweep, **ou** quadrado maior tipo Groundshaker". `AREA_WAVE6` + `needDirection(true)` é AoE direcional — a mesma célula "ler a sala", outra forma. **Pede forma de onda, que o contrato não tem** (Seção 5) | `attack/front_sweep.lua` `5a0034ac0cdb69fff13eeca3c898fe79747e672385716512fdc50c0b929f59a9` |
| Intense Wound Cleansing | `exura gran ico` | 80 | 200 | 600 000 ms | **6 — Wound Cleansing** | Mesma imagem, número maior, faixa acima. `exura` → `exura gran` é o exemplo literal de escada do README | `healing/intense_wound_cleansing.lua` `db8ee6c1d3ef32cfbb9e59857347c3b086d2ffaf167929dac300e65e3c9396b5` |
| Recovery | `utura` | 50 | 75 | 60 000 ms | **6 — Wound Cleansing** | HoT de 60 s, +20 HP / 3 s. A imagem é diferente da cura instantânea (gotejar × salto), mas a célula é a mesma e o orçamento está cheio: cura de Knight é **uma coisa só**. **Pede cura por tick, que o contrato recusa** (Seção 5) | `healing/recovery.lua` `6e86fe616c9f41254b7ff6995df50ad26829b5797e279ac10f0f97c274ccbe66` |
| Executioner's Throw | `exori amp kor` | 300 | 225 | 18 000 ms | **5 — Whirlwind Throw** | `range` 5, arma arremessada. Mesma célula, faixa 150+ | `attack/executioners_throw.lua` `52f8de2c5c041021dc922f884fea5834587e9c4cc30c7ecd187f62b9734d9a28` |
| Fair Wound Cleansing | `exura ico san` | — | — | — | **6 — Wound Cleansing** | Terceiro degrau da mesma escada de cura, faixa 150+ | `healing/fair_wound_cleansing.lua` `a85d74b32d59531a7e20cc9f2f149a6f3213e29f3349570803577961a02eabd8` |

**Todas as magias desta seção estão fora do conjunto ativo, não ao lado dele.** Nenhuma linha da
Seção 1 é uma delas.

### O que o mapa impede

Este documento existe para que a próxima pessoa **não** possa "só adicionar `exori gran` porque está
no snapshot". `exori gran` tem dono: é a célula 2, numa faixa que não existe. Somá-la ao kit ativo
produziria duas ações com a mesma `AREA_SQUARE1X1` e o mesmo efeito, separadas por um número —
exatamente o defeito que o playbook inteiro existe para evitar.

---

## Seção 3 — As faixas futuras

**Esta tabela não tem vigor.** Decisão congelada 2: level não destrava spell, e o Knight tem o kit
inteiro desde o começo. A selection já declara `spellAccess: "unrestricted"`, e é esse campo que
mantém a tabela inerte. Ela documenta **o que existe em cada faixa**, não **quando o jogador
recebe**.

Faixa é ferramenta de **curadoria**: ela responde "qual é a forma desta célula neste ponto do jogo",
e cruzar a faixa **substitui** a forma anterior.

| Célula | Faixa ≤ 50 — **ativa hoje** | Faixa 50–150 | Faixa 150+ |
|---|---|---|---|
| 1 — filler | auto-attack | auto-attack | auto-attack |
| 2 — AoE curta | **Berserk** `exori` | Fierce Berserk `exori gran` (90) | — |
| 3 — AoE larga | **Groundshaker** `exori mas` | Front Sweep `exori min` (70) | — |
| 4 — ST adjacente | **Brutal Strike** `exori ico` | Annihilation `exori gran ico` (110) | — |
| 5 — ST à distância | **Whirlwind Throw** `exori hur` | — | Executioner's Throw `exori amp kor` (300) |
| 6 — cura | **Wound Cleansing** `exura ico` | Recovery `utura` (50) · Intense Wound Cleansing `exura gran ico` (80) | Fair Wound Cleansing `exura ico san` |
| 7 — postura | **Blood Rage / Protector** | as mesmas (toggle não escala por faixa) | as mesmas |
| 8 — taunt | **Challenge** `exeta res` | a mesma | a mesma |
| 9 — mobilidade | **Haste** `utani hur` | a mesma | a mesma |

Três leituras que a tabela torna visíveis:

1. **A célula 5 não tem forma na faixa do meio.** Whirlwind Throw (28) vai direto a Executioner's
   Throw (300). Isso é fato do snapshot, não buraco de desenho: a faixa ativa está preenchida, que é
   o que o orçamento exige. Uma faixa 50–150 futura escolheria entre estender Whirlwind Throw ou
   deixar a célula vazia naquela faixa.
2. **Três células não escalam por faixa.** Postura, taunt e mobilidade têm uma forma só no snapshot
   inteiro. São papéis binários — ou você tem taunt ou não tem —, e escalá-los por número seria
   inventar escada onde o Canary não tem.
3. **A faixa 50–150 preenche a célula 6 duas vezes.** Recovery e Intense Wound Cleansing são formas
   concorrentes da mesma célula naquela faixa; se essa faixa um dia existir, ela escolhe **uma**.

---

## Seção 4 — Eixos de arma reservados

Documentação de **intenção**, não desenho de subclasse. Decisão congelada 5: 1 mão × 2 mãos e os
arquétipos **sword balanceado / axe agressivo / club defensivo** ficam reservados, para que
subclasses entrem como conteúdo e não como refatoração.

O gancho já existe no catálogo: `skillMultipliers` traz `skill:1` club, `skill:2` sword, `skill:3`
axe. O que falta é o `Character` lê-los — hoje `CharacterDefinitionSchema.skills` é literalmente
`{ sword, magic }` (`packages/contracts/src/content/schemas.ts:550`) e `resolveSpellPower` só lê
`character.skills.sword` (`packages/content/src/hunts/combatConversion.ts:168`). É a PB-08-09 que
abre isso.

| Célula | 1 mão × 2 mãos | Sword — balanceado | Axe — agressivo | Club — defensivo |
|---|---|---|---|---|
| 1 — auto-attack | 1 mão + escudo: golpes mais frequentes e menores. 2 mãos: mais lentos e maiores | Ritmo e dano medianos; a referência contra a qual os outros dois se leem | Golpe mais forte, cadência mais lenta | Golpe mais fraco; parte do bloqueado retorna como dano (ver restrição abaixo) |
| 2 — Berserk | O eixo aqui é dano, **não forma**: alargar o anel invadiria a célula 3 | Como está | Mais dano no anel | Menos dano no anel; converte mitigação |
| 3 — Groundshaker | Casa natural do 2 mãos: a pancada no chão pede as duas mãos | Como está | Mais dano no bloco | **Célula mais expressiva do club**: bater no chão é a fantasia do martelo |
| 4 — Brutal Strike | 2 mãos favorecido: golpe comprometido | Como está | **Célula mais expressiva do axe**: o golpe comprometido é a fantasia do machado | Menos dano; converte mitigação |
| 5 — Whirlwind Throw | **1 mão favorecido**: arremessar exige uma arma que saia da mão. 2 mãos penalizado ou indisponível | **Célula mais expressiva do sword** | Arremesso pesado, alcance menor | Arremesso mais fraco |
| 6 — Wound Cleansing | Sem eixo de arma | — | — | — |
| 7 — Postura | 1 mão + escudo favorece Protector; 2 mãos favorece Blood Rage | Neutro entre as duas | Blood Rage mais forte | Protector mais forte |
| 8 — Challenge | 1 mão + escudo: o arquétipo que **quer** ser o alvo | Raio 1, como o snapshot | Raio 1 | Raio maior — o payoff de puxar aggro é do defensivo |
| 9 — Haste | 1 mão mais rápido que 2 mãos | Como está | Menos duração | Mais duração |

### A restrição da decisão congelada 6

**Se o club virar o arquétipo defensivo, ele paga em ofensa.** Defensivo puro é o arquétipo que
ninguém escolhe. A saída é a **mitigação virar dano**: o que foi bloqueado retorna como dano
derivado, **não** como sobrevida extra. Um club que só aguenta mais tempo é um club que nunca é
escolhido; um club que transforma o que aguentou em pancada é uma build.

Isso é restrição de desenho registrada para quando a subclasse for decidida — não é desenho feito
agora, e nenhuma task do PB-08 a implementa.

---

## Seção 5 — O que o contrato ainda não representa

No molde da tabela homônima do `PB-07-ROTATIONS.md`. Cada linha nomeia **o campo que falta**.

| Item | Representável? | Campo que falta | Evidência | Destino |
|---|---|---|---|---|
| **Cura por tick** (Recovery) | **Não** | `ScenarioConditionDefinition` só tem `tickDamageAmount`; não há `tickHealAmount` | `packages/simulation/src/kernel/conditions.ts:162` descarta a condição quando `definition.tickDamageAmount <= 0`, então um valor de cura nunca chega a ser aplicado | Fora do PB-08. Bullet contingente do README; Recovery é substituição futura da célula 6 |
| **+30% shielding** (Protector) | **Não** | `ScenarioConditionDefinition` não carrega `shieldingPermille`, e o kernel não resolve mitigation por shielding | A postura 2026 do Protector exige um bônus declarativo de shielding que o cenário ainda não consegue transportar nem consumir | **PB-11**, junto do eixo de armor/shielding |
| **Forma de onda** (Front Sweep) | **Não** | `AbilityShape` é `'self' \| 'target' \| 'area'`; não há `'wave'` nem direção de conjuração | `packages/contracts/src/simulation/types.ts:48`. `AREA_WAVE6` + `needDirection(true)` exigem uma área que **rotaciona com o facing** | Fora do PB-08. Bullet contingente do README |
| **Alvo forçado** (Challenge) | **Não** | Não existe: a IA escolhe alvo livremente, sem canal para impor um | `packages/simulation/src/kernel/kernel.ts:256` `isAcquirableTarget` | **Entra neste playbook**, pela PB-08-06. É o único kernel novo do PB-08 e a única task que regenera golden |
| **Círculo × quadrado** (Groundshaker) | **Parcial — divergência declarada** | `radius` é escalar e o kernel mede em **Chebyshev**; não há forma de disco | `packages/simulation/src/kernel/combat.ts:117`: `chebyshevDistance(from, to) <= rangeTiles`. `radius: 3` acende um quadrado 7×7 de **49 células**; o `AREA_CIRCLE3X3` do snapshot tem **37**. São **12 tiles de canto a mais** | **Divergência declarada, aceita.** Ver abaixo |
| **`BLOCKARMOR`** (Brutal Strike, Berserk, Groundshaker, Whirlwind Throw) | **Não** | `armor` não existe no kernel | Chega no PB-11 (kernel v6), por `docs/playbooks/PB-08/README.md` §"Fora de escopo" | Fora do PB-08. É o que tira o par auto-attack × Brutal Strike da margem |
| **Skill por tipo de arma** (eixo axe/club) | **Não** | `CharacterDefinitionSchema.skills` é `{ sword, magic }` `.strict()`; `resolveSpellPower` só lê `skills.sword` | `packages/contracts/src/content/schemas.ts:550`; `packages/content/src/hunts/combatConversion.ts:168`. `skillMultipliers` está importado no catálogo e o `Character` não o lê | PB-08-09, fecha no PB-11 |
| **Raio do taunt** (Challenge) | **Sim, raio 1** | Nenhum — mas ver a correção abaixo | `support/challenge.lua` usa `createCombatArea(AREA_SQUARE1X1)`: **8 tiles adjacentes**, não a tela | Correção de expectativa para a PB-08-06 |

### As duas divergências que este mapa cria — e que a PB-08-04 e a PB-08-06 herdam

**1. Groundshaker vira um quadrado.** O contrato mede alcance em distância de Chebyshev, então
`radius: 3` é um quadrado 7×7 (49 células, 48 tiles de inimigo) e não o disco de 37 células do
snapshot. Os 12 tiles de canto entram de graça.

**Berserk não sofre disso.** `AREA_SQUARE1X1` já *é* um quadrado 3×3, que é exatamente a bola de
Chebyshev de raio 1: `radius: 1` reproduz o snapshot célula por célula, sem divergência. O problema
existe só onde o Canary usa disco, e no kit ativo isso é uma magia só.

A saída escolhida é **aceitar o quadrado e declarar**, porque é a opção mais simples e mais fácil de
reverter: nenhum campo novo, nenhuma mudança de kernel, e o `radius` já está implementado. A imagem
sobrevive intacta — a comparação com Berserk fica **mais** favorável, não menos (6× em vez de 4,5×).
Se um dia a forma de disco importar, ela chega junto com a forma de onda do Front Sweep, que precisa
do mesmo tipo de campo.

**2. Challenge não vira a tela — vira os oito vizinhos.** O README descreve a imagem de Challenge
como "a tela inteira vira para você". **O snapshot não faz isso:** `AREA_SQUARE1X1` são os 8 tiles
adjacentes, raio 1. A imagem própria registrada na Seção 1 é a do snapshot, e é ela que vale.

A ação continua sendo a mais legível do kit — é a única em que ninguém perde vida e o inimigo muda de
comportamento —, mas a PB-08-06 precisa saber que está implementando um taunt **de contato**, não de
tela. Se o playtest pedir raio maior, isso é **divergência a declarar com campo de origem**, não uma
leitura do snapshot. Registrado aqui para que a PB-08-06 não decida isso por acidente.

### Uma correção de proveniência para a PB-08-06

`support/challenge.lua` declara `spell:vocation("elite knight;true")` — no snapshot, Challenge é
**exclusiva da promoção**, não do Knight base. Huntbound não tem promoção, e a decisão congelada 2
recusa gating por level. Challenge entra para o Knight desde o começo: **divergência declarada**, com
origem no fato de que o V0 embarca uma vocação só.

---

## O que este mapa congela

1. **Nove células, cinco de dano**, listadas na Seção 1, válidas do level 1 ao teto.
2. **Nenhum par produz a mesma imagem**, verificado par a par na Seção 1b, com o par mais fraco
   nomeado e com condição de falha escrita.
3. **Berserk e Groundshaker coexistem**, por medição (8 × 36 tiles no snapshot; 8 × 48 sob o
   contrato), não por julgamento.
4. **Charge, Bruise Bane e as cinco cures são corte permanente.** `exori gran`, Annihilation, Front
   Sweep, Recovery, Intense e Fair Wound Cleansing e Executioner's Throw são substituições futuras,
   cada uma com **dono de célula** — entram trocando, nunca somando.
5. **Os eixos de arma estão reservados por célula**, com a restrição de que o club paga em ofensa.
6. **Cinco coisas o contrato não representa** — cura por tick, shielding, forma de onda, `armor` e
   skill por arma —, e **uma** entra neste playbook: alvo forçado, pela PB-08-06.

Mudar qualquer um dos seis é decisão de produto, fora de uma task de implementação.
