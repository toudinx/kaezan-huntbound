# Cockpit do Huntbound — spec de layout do HUD

**Data:** 2026-08-25
**Escopo:** reescrita de `PB-08-08`, `PB-08-09` e `PB-08-10`.
**Origem:** playtest do usuário sobre o kit fechado na `PB-08-07`. O HUD entrega nove ações numa
coluna única, sem distinguir dano, cura, postura e suporte.

## O problema, medido

O defeito não é estético. São três linhas de código:

- `apps/game/src/ui/AppShell.ts:102` empilha `header`, `aside`, `controls`, `combatRoot` e
  `inventoryRoot` como irmãos ancorados em cantos absolutos. Não existe layout: existem cinco caixas
  que por acaso não se sobrepõem.
- `apps/game/src/styles.css:204` fixa o HUD de combate em
  `grid-template-columns: minmax(11rem, 16rem)` — a coluna estreita que o usuário recusou.
- `apps/game/src/ui/CombatHud.ts:127` monta as abilities numa lista plana. Dano, cura, postura e
  suporte saem no mesmo `div`, com o mesmo estilo, na ordem do índice.

Consequência observada no playtest: Blood Rage e Protector aparecem como duas hotkeys de magia
comuns, quando são **um modo mutuamente exclusivo**; e Challenge e Haste, que rodam no grupo
`support` e **não** são travadas pelo cooldown de ataque, ficam visualmente indistinguíveis das que
são.

## O que já está pronto e não deve ser refeito

Verificado no workspace em 2026-08-25:

| Item | Estado real |
|---|---|
| `Digit1`–`Digit9` | **já ligadas**, mais `Numpad1`–`Numpad9`, em `InputMap.ts:52-71` |
| `Space` / `Enter` / `Tab` / `Escape` | já ligadas: atacar, ciclar alvo, largar alvo |
| `aria-label`, `aria-disabled`, `role="progressbar"`, `data-testid` | presentes em todos os controles |
| Nove abilities no view model | índices 0–8, com `active` para toggle |

O card `PB-08-08` original afirma que só três teclas estão ligadas. **Está desatualizado** — alguma
task entre a 04 e a 07 estendeu o mapa. A reescrita remove essa exigência.

## Restrição que vem de cima

`docs/03_ADR_PHASER4_BROWSER_FIRST.md`, seção "UI":

> Centro e lower-middle do playfield permanecem livres durante combate normal.

A ADR tem autoridade **acima** do playbook e o teste `hunt-mobile.spec.ts:95` já a executa: nenhum
elemento sob `#ui-root` que pinte fundo ou capture ponteiro pode invadir o quinto central do terço
inferior do canvas.

**Isto proíbe a barra de ação centralizada embaixo.** E resolve, de graça, o requisito de
agrupamento: o vão central obrigatório é o separador entre a rotação de dano e as situacionais.
Nenhum CSS de separador precisa existir.

## O chassi — sete regiões nomeadas

O canvas é *full-bleed*: ocupa a viewport inteira e a moldura **sobrepõe**, não encolhe. Cada região
é um contêiner `pointer-events: none` cujos filhos reativam `pointer-events: auto` — o padrão que o
`hunt-mobile.spec.ts:95` já assume ao ignorar contêineres transparentes.

| Região | Âncora | Conteúdo agora | Conteúdo depois |
|---|---|---|---|
| `telemetry` | topo-esquerda | status do shell, fps/tps, viewport | — |
| `rail` | borda direita, coluna única | minimapa → vitals → equipamento → bag → botões de janela | equipamento real (PB-11) |
| `actions` | base-direita, acima da rail | 9 células em duas linhas | — |
| `movement` | base-esquerda | d-pad | — |
| `alerts` | topo-centro | rejeição, morte | — |
| `windows` | camada flutuante | janelas placeholder | exp/level/bestiary (PB-09) |
| `playfield-clear` | quinto central do terço inferior | **nada, sempre** | **nada, sempre** |

A `rail` é a leitura do print do Tibia que o usuário aprovou — equipamento e vitals à direita — mas
como **uma coluna** em vez de seis caixas flutuantes. É o "menos poluído" do pedido.

`playfield-clear` não é uma região de conteúdo: é uma **região negativa**, declarada para que o teste
que já existe tenha um nome no código a que se referir.

## As nove células

Cinco de dano, quatro situacionais, conforme o critério 3 do `README.md` do PB-08.

| Linha | # | Célula | Ação | Tecla |
|---|---|---|---|---|
| dano | 1 | auto-attack | auto-attack | `Space` / `Enter` |
| dano | 2 | Berserk | `cast-ability 0` | `Digit1` |
| dano | 3 | Brutal Strike | `cast-ability 1` | `Digit2` |
| dano | 4 | Groundshaker | `cast-ability 3` | `Digit4` |
| dano | 5 | Whirlwind Throw | `cast-ability 4` | `Digit5` |
| situacional | 6 | Wound Cleansing | `cast-ability 2` | `Digit3` |
| situacional | 7 | **switch de postura** | `cast-ability 5` \| `6` | `Digit6` \| `Digit7` |
| situacional | 8 | Challenge | `cast-ability 7` | `Digit8` |
| situacional | 9 | Haste | `cast-ability 8` | `Digit9` |

### A decisão de numeração

A ordem visual (dano agrupado) e a ordem do índice (ordem do catálogo) **divergem**, e a célula de
postura carrega **duas** teclas.

Duas saídas foram consideradas. Renumerar as teclas para seguir as células é mais bonito de ler, mas
quebra o mapa 1:1 entre `DigitN` e `abilityIndex N-1`, que hoje é direto e honesto, e obriga o
`InputMap` a conhecer o agrupamento — regra de apresentação vazando para input.

**Escolhida: manter o mapa 1:1 e imprimir a tecla em cada célula.** O switch de postura mostra `6` e
`7` nos dois segmentos. Custa nada, não move `InputMap.ts`, e é reversível numa linha se o playtest
disser que a numeração salteada incomoda.

### O switch de postura

Uma célula, dois segmentos (`Blood Rage` | `Protector`), três estados: nenhum, um, o outro. Clicar no
segmento ativo desliga. Tratamento visual **deliberadamente diferente** do de um botão de magia — é
um modo, não uma conjuração.

Isto **emenda a decisão congelada 7 do card `PB-08-08` original** ("a postura alterna no mesmo
botão", lida como um botão que cicla). Continua sendo **uma célula** e continua sendo **nove**; o que
muda é que o alvo de clique é segmentado, para que escolher Protector não custe uma conjuração de
Blood Rage no caminho.

### Cooldown por grupo

A exigência mais fácil de errar, e a que mais engana. `Challenge` e `Haste` rodam em
`secondaryCooldownGroup` `support` e **não** são travadas pelo cooldown de ataque. Um HUD que as
escurece junto com as magias de ataque **mente sobre a regra do jogo**.

O `CombatViewModel` precisa expor os dois grupos por ability, e cada célula projeta o cooldown do
**seu** grupo. Regra de jogo não entra em componente de UI: o HUD projeta, não decide.

## Painéis com dado real

### Minimapa — factível hoje, sem asset e sem kernel

`MapRegion` (`packages/contracts/src/hunt/types.ts:30`) carrega `width`, `height` e, por andar,
`collision` e `ground`. Jogador e criaturas vêm da presentation.

Desenho em `<canvas>`, em duas camadas: o terreno vai para um canvas *offscreen* redesenhado **só**
quando região ou andar mudam; os atores vão para uma camada barata por frame. `qa:budgets` é
informativo, mas um minimapa que redesenha o terreno a 60 Hz é regressão de verdade.

### Run bag — o único item que esbarra em asset

O pack da hunt carrega **dois** itens: `item:tibia:dead-rotworm` e `item:tibia:small-splash`. As oito
chaves de loot do `CombatViewModel` (`gold-coin`, `ham`, `meat`, `worm`, `sword`, `mace`,
`legion-helmet`, `lump-of-dirt`) **não têm sprite no pack da hunt**. Só `gold-coin` existe, e no pack
`pb-02-contract-coverage`.

O caminho é upstream do packer: os ids entram em `objectIds` no `content-config.json` do
`AssetExtractor`, o export é regerado, e só então `assets:pb04:personal:generate` resolve.

**A armadilha, e ela é séria:** o perfil `test` **fabrica um placeholder 1×1 para qualquer id
pedido**. Uma task de backpack pode fechar com `verify` verde, `qa:browser` verde e **nenhuma arte no
jogo do usuário**. Por isso a prova de aceite da run bag é **screenshot do perfil `personal`**, não
gate verde.

**Degradação obrigatória:** ícone quando o sprite resolve, rótulo textual quando não. A grade entrega
valor mesmo se o export não for regerado.

### Equipamento e janelas — placeholder reservado

Slots com a silhueta certa e sem função; janelas com moldura, título e botão de fechar, e conteúdo
vazio. O que se prova aqui é que **o sistema de janelas funciona**, não o que elas mostram.

Sem arrastar janela. Arrastar é poço sem fundo e não é o que falta.

Teclas reservadas agora, porque mudar tecla depois é mais caro que reservá-la: `KeyI` inventário,
`KeyM` mapa, `KeyB` bestiary, `KeyC` personagem. Nenhuma colide — movimento usa `KeyW`/`KeyA`/`KeyS`/
`KeyD` e as setas.

## Divisão em tasks

| Task | Entrega | Toca asset? | Toca kernel? |
|---|---|---|---|
| **PB-08-08** | O chassi: sete regiões + nove células agrupadas + switch de postura + cooldown por grupo | não | não |
| **PB-08-09** | Minimapa real + run bag em grade + equipamento e janelas placeholder | só a run bag | não |
| **PB-08-10** | Aceite do hub | não | não |

Divisão por **camada de risco**, não por região da tela: a 08 é DOM e CSS puros, reversíveis, sem
dado novo; a 09 concentra o único risco real (pipeline de sprite) numa task só. Se o export
resistir, ele não segura o chassi.

### O eixo de arma sai do PB-08

`PB-08-09-arma-como-eixo-de-build.md` (skill separada por sword/axe/club e passiva por tipo) **vai
para o PB-11**. O card já se declarava meia-task — *"fecha no PB-11, quando o equipamento existir"* —
e meia-task é exatamente o que o usuário recusou. No PB-11 ele fecha inteiro.

## Fora de escopo

- Barra de atalhos configurável. É helper, e helper é PB-15.
- Arrastar, redimensionar ou empilhar janelas.
- Qualquer ação nova. Estas tasks **apresentam** o que a 04 a 07 entregaram.
- Equipar item, ler XP, popular bestiary. PB-11 e PB-09.

## Critérios de aceite

O aceite é o usuário jogando. Em ordem de importância:

1. A rotação de dano se distingue das situacionais **sem ler rótulo**.
2. A postura se lê como modo, não como magia, e os três estados são distinguíveis.
3. Uma ação de `support` em cooldown **não** escurece as de ataque, nem o contrário.
4. O hub não é uma coluna estreita; a rail à direita agrupa o que o print do Tibia agrupa.
5. Centro e lower-middle do playfield seguem livres nos quatro viewports.
6. O minimapa mostra onde o jogador está.
7. A run bag mostra o que caiu — com ícone no perfil `personal`.
