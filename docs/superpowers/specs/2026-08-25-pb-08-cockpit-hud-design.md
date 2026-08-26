# Cockpit do Huntbound — spec de layout do HUD

**Data:** 2026-08-25
**Escopo:** reescrita de `PB-08-08`, `PB-08-09` e `PB-08-10`.
**Origem:** playtest do usuário sobre o kit fechado na `PB-08-07`, e cinco rodadas de proposta
visual. As quatro primeiras foram recusadas — a direção aprovada está registrada abaixo.

## O problema, medido

O defeito não é estético. São três linhas:

- `apps/game/src/ui/AppShell.ts:102` empilha `header`, `aside`, `controls`, `combatRoot` e
  `inventoryRoot` como irmãos ancorados em cantos absolutos. Não existe layout: existem cinco caixas
  que por acaso não se sobrepõem.
- `apps/game/src/styles.css:204` fixa o HUD de combate em
  `grid-template-columns: minmax(11rem, 16rem)` — a coluna estreita que o usuário recusou.
- `apps/game/src/ui/CombatHud.ts:127` monta as abilities numa lista plana. Dano, cura, postura e
  suporte saem no mesmo `div`, com o mesmo estilo, na ordem do índice.

Consequência: Blood Rage e Protector aparecem como duas hotkeys de magia comuns, quando são **um modo
mutuamente exclusivo**; e Challenge e Haste, que rodam no grupo `support` e **não** são travadas pelo
cooldown de ataque, ficam indistinguíveis das que são.

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

## Decisão de autoridade — a ADR-001 se lê pela área livre

`docs/03_ADR_PHASER4_BROWSER_FIRST.md`, seção "UI", diz:

> Centro e lower-middle do playfield permanecem livres durante combate normal.

`hunt-mobile.spec.ts:95` lê "playfield" como o **canvas inteiro**, e sob essa leitura nenhuma barra
central e nenhum arco são possíveis — o layout resultante é o de caixas espalhadas que o playtest
recusou.

**Decidido pelo usuário em 2026-08-25:** "playfield" passa a significar a **área de jogo visível**, e
a moldura define onde ela termina. É a leitura que Tibia, Diablo e WoW usam.

Consequências obrigatórias, ambas na `PB-08-08`:

1. **A câmera desloca.** O jogador é centrado na área livre, não no meio do canvas. Sem isso o boneco
   fica atrás da barra.
2. **`hunt-mobile.spec.ts:95` é reescrito**, não deletado. O contrato novo que ele prova: a área livre
   tem tamanho mínimo declarado, o jogador está centrado **nela**, e nenhum elemento de HUD invade a
   área livre. Enfraquecer a asserção em vez de trocá-la é o defeito que o `AGENTS.md` proíbe.

## O layout aprovado

Canvas *full-bleed*. A moldura sobrepõe e delimita a área livre.

```
┌──────────────────────────────────────────┬──────────────┐
│   ⌒                                 ⌒    │   MAPA       │
│  (                                   )   │  (quadrado)  │
│  ( vida                        mana  )   ├──────────────┤
│  (          área livre               )   │   ALVO       │
│  (      jogador centrado AQUI        )   │  img · vida  │
│  (                                   )   │  resistência │
│  (      ▣▣▣▣▣ ▏ ▣▣▣  ▏6│7▏           )   ├──────────────┤
│   ⌣      dano   situacional  postura     │   BAG        │
│                                          │  da hunt     │
└──────────────────────────────────────────┴──────────────┘
```

| Região | Âncora | Conteúdo |
|---|---|---|
| `vitals` | arcos curvos flanqueando a área livre | vida à esquerda, mana à direita, número no pé |
| `deck` | centro-baixo | 5 células de dano · vão · 3 situacionais · switch de postura |
| `rail` | coluna direita | mapa quadrado, janela de alvo, bag da hunt |
| `telemetry` | topo-esquerda | fps/tps, discreto |
| `alerts` | topo-centro | rejeição, morte |
| `movement` | base-esquerda, **só em touch** | d-pad |

**Os arcos são a imagem dominante.** São a única forma curva na tela, e é o que sustenta o desenho
longe de dashboard. Barra retangular de vida foi recusada explicitamente.

**Nenhum rótulo de grupo.** A separação entre dano e situacional é o **vão** na barra. Precedente:
Diablo 4 separa básicas do resto exatamente assim. Colorir botão a botão foi recusado.

### Equipamento sai do PB-08

Recusado como painel fixo. Vai inteiro para o **PB-11**, como janela atrás do `KeyI`, onde existe
stat de item para mostrar. Com isso a `rail` fica com **três painéis que leem dado que já existe** —
zero placeholder na tela.

## As nove células

| Grupo | # | Célula | Ação | Tecla |
|---|---|---|---|---|
| dano | 1 | auto-attack | auto-attack | `Space` / `Enter` |
| dano | 2 | Berserk | `cast-ability 0` | `Digit1` |
| dano | 3 | Brutal Strike | `cast-ability 1` | `Digit2` |
| dano | 4 | Groundshaker | `cast-ability 3` | `Digit4` |
| dano | 5 | Whirlwind Throw | `cast-ability 4` | `Digit5` |
| situacional | 6 | Wound Cleansing | `cast-ability 2` | `Digit3` |
| situacional | 7 | Challenge | `cast-ability 7` | `Digit8` |
| situacional | 8 | Haste | `cast-ability 8` | `Digit9` |
| switch | 9 | **postura** | `cast-ability 5` \| `6` | `Digit6` \| `Digit7` |

### Numeração

A ordem visual e a ordem do índice **divergem**, porque o catálogo põe Wound Cleansing no índice 2,
no meio das magias de dano.

Renumerar as teclas para seguir as células obriga o `InputMap` a conhecer o agrupamento visual —
regra de apresentação vazando para input. **Escolhida: manter o mapa 1:1 `DigitN` → `abilityIndex
N-1` e imprimir a tecla em cada célula.** Reversível numa linha se o playtest reclamar.

### O switch de postura

Uma célula, dois assentos (`Blood Rage` | `Protector`), três estados: nenhum, um, o outro. Clicar no
assento ativo desliga. Tratamento visual deliberadamente diferente do de um botão de magia — é modo,
não conjuração. Precedente: a *stance bar* do warrior de WoW.

Isto **emenda a decisão congelada 7 do card `PB-08-08` original** ("a postura alterna no mesmo
botão", lida como um botão que cicla). Continua uma célula e continua nove; o que muda é que escolher
Protector não custa mais uma conjuração de Blood Rage no caminho.

### Cooldown por grupo

A exigência mais fácil de errar. `Challenge` e `Haste` rodam em `secondaryCooldownGroup` `support` e
**não** são travadas pelo cooldown de ataque. Um HUD que as escurece junto com as de ataque **mente
sobre a regra do jogo**.

O `CombatViewModel` precisa expor os dois grupos por ability, e cada célula projeta o cooldown do
**seu** grupo. Regra de jogo não entra em componente de UI: o HUD projeta, não decide.

## Ícone de ação

### A arte existe e é endereçável

`C:\Kaezan\kaezan\otclient-4.0\data\images\game\spells\` contém `spell-icons-32x32.png`,
`spell-icons-20x20.png` e `spellgroup-icons-20x20.png`. A arte de magia do Tibia é **fatiamento de
atlas por índice**, não caça a asset.

> **Correção de 2026-08-25.** A versão anterior deste parágrafo dizia que o índice vinha do Canary,
> via `spell:id(80)` do `berserk.lua`. **Está errado.** O atlas é recortado pelo `clientId` do
> OTClient, que é outro campo: Berserk é `spell:id(80)` e `clientId(20)`, e a coluna 80 entrega uma
> runa. Medido por imagem antes da correção. A tabela verificada das nove magias, as duas linhas do
> OTClient que definem o recorte e o custo real da task estão em
> `docs/assets/SPELL_ICON_INDEX.md`.

O `spellgroup-icons-20x20.png` ainda entrega os ícones de grupo — attack, healing, support —, que
fazem o cooldown de grupo se explicar sem legenda.

Isto **estende o escopo do `AssetExtractor`**, que hoje conhece `outfitIds`, `objectIds`, `effectIds`
e `missileIds` e não conhece fatiamento de folha. Trabalho de pipeline, e por isso **task própria**
(ver B13 no `STATE.md`), não a `PB-08-09`.

### O fallback é informação, não tapa-buraco

Enquanto o atlas não é fatiado — e sempre que um id não resolver — a célula desenha a **área de
efeito da própria ação** num grid 5×5: Berserk é o anel de raio 1, Groundshaker o círculo de raio 3,
Whirlwind a linha que sai, Wound Cleansing a cruz no próprio tile, Challenge o anel de vizinhos.

Isso cumpre sozinho a exigência "identificável sem ler o rótulo" e garante que a `PB-08-08` **feche
sem depender de asset nenhum**.

## Painéis da rail

### Mapa — quadrado, sem asset, sem kernel

`MapRegion` (`packages/contracts/src/hunt/types.ts:30`) carrega `width`, `height` e, por andar,
`collision` e `ground`. Jogador e criaturas vêm da presentation.

Duas camadas: terreno num canvas *offscreen* redesenhado **só** quando região ou andar mudam; atores
numa camada barata por frame. Minimapa que redesenha terreno a 60 Hz é regressão de verdade.

### Alvo — real hoje, honesto no que falta

Imagem do mob, nome e vida saem do estado do ator. Resistência e fraqueza **não**: o contrato tem
`ElementResistance[]` (`packages/contracts/src/simulation/types.ts:44`) e o schema valida ordenação,
mas o rotworm sai com `"resistances":[]` no cenário.

A janela nasce com as linhas de elemento mostrando `—`. Ela não inventa dado e não esconde a lacuna;
o valor aparece quando o **PB-11** popular elemento e resistência.

### Bag da hunt — o único item que esbarra em asset

O pack da hunt carrega **dois** itens: `item:tibia:dead-rotworm` e `item:tibia:small-splash`. As oito
chaves de loot do `CombatViewModel` (`gold-coin`, `ham`, `meat`, `worm`, `sword`, `mace`,
`legion-helmet`, `lump-of-dirt`) **não têm sprite no pack da hunt**. Só `gold-coin` existe, e no pack
`pb-02-contract-coverage`.

O caminho é upstream do packer: os ids entram em `objectIds` no `content-config.json` do
`AssetExtractor`, o export é regerado, e só então `assets:pb04:personal:generate` resolve.

**A armadilha, e ela é séria:** o perfil `test` **fabrica um placeholder 1×1 para qualquer id
pedido**. Uma task de bag pode fechar com `verify` verde, `qa:browser` verde e **nenhuma arte no jogo
do usuário**. A prova de aceite da bag é **screenshot do perfil `personal`**, não gate verde.

Mesma regra do ícone de ação: ícone quando resolve, rótulo textual quando não.

## Divisão em tasks

Por **camada de risco**, não por região da tela.

| Task | Entrega | Asset? | Kernel? |
|---|---|---|---|
| **PB-08-08** | Chassi: arcos, deck agrupado pelo vão, switch de postura, cooldown por grupo, deslocamento de câmera e reescrita do teste da ADR. Ícones pelo fallback de área de efeito | não | não |
| **PB-08-09** | Rail: mapa quadrado, janela de alvo, bag da hunt. Atlas de magia fatiado e ids de loot no extractor | sim | não |
| **PB-08-10** | Aceite do hub | não | não |

A 08 é DOM, CSS e câmera — reversível, sem dado novo, e **fecha sozinha**. A 09 concentra todo o
risco de pipeline numa task só; se o export resistir, ele não segura o chassi.

### O eixo de arma sai do PB-08

`PB-08-09-arma-como-eixo-de-build.md` (skill separada por sword/axe/club e passiva por tipo) vai para
o **PB-11**. O card já se declarava meia-task — *"fecha no PB-11, quando o equipamento existir"* — e
meia-task foi o que o usuário recusou. No PB-11 ele fecha inteiro, junto com o equipamento.

## Fora de escopo

- Barra de atalhos configurável. É helper, e helper é PB-15.
- Arrastar, redimensionar ou empilhar janelas.
- Qualquer ação nova. Estas tasks **apresentam** o que a 04 a 07 entregaram.
- Equipar item, ler XP, popular bestiary, resistência elemental. PB-11 e PB-09.

## Critérios de aceite

O aceite é o usuário jogando. Em ordem de importância:

1. Não parece planilha: os arcos dominam, a tela tem vazio, nada tem rótulo de grupo.
2. A rotação de dano se distingue das situacionais **sem ler rótulo**.
3. A postura se lê como modo, não como magia, e os três estados são distinguíveis.
4. Uma ação de `support` em cooldown **não** escurece as de ataque, nem o contrário.
5. O jogador está centrado na área livre nos quatro viewports, e nenhum elemento a invade.
6. O mapa mostra onde o jogador está.
7. A janela de alvo mostra vida real e diz `—` no que ainda não existe.
8. A bag mostra o que caiu — com ícone no perfil `personal`.
