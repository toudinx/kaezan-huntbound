# Índice do atlas de ícones de magia

**Medido em 2026-08-25**, contra `C:\Kaezan\kaezan\otclient-4.0`. Este documento existe porque a
premissa registrada em `docs/superpowers/specs/2026-08-25-pb-08-cockpit-hud-design.md` estava
**errada** e teria custado uma task inteira.

## A premissa errada

A spec dizia:

> O índice vem do próprio Canary: `berserk.lua` declara `spell:id(80)`.

Não vem. `spell:id` é o id **do servidor**; o atlas é recortado pelo `clientId` **do cliente**, que é
um campo diferente e sem relação numérica com o primeiro. Berserk é `spell:id(80)` e
`clientId = 20`. Recortar pela coluna 80 entrega uma **runa**, não o ícone do Berserk — conferido por
imagem antes de escrever isto.

## Como o recorte realmente funciona

Duas linhas do OTClient definem tudo:

- `modules/gamelib/spells.lua:614` — `Spells.getImageClip(indexClip, profile)` devolve
  `indexClip * 32 .. " 0 32 32"`.
- `modules/game_spelllist/spelllist.lua:219` — `local iconId = tonumber(info.clientId)`.

Ou seja: **coluna = `clientId`, base zero, linha única**.

`data/images/game/spells/spell-icons-32x32.png` mede **5984 × 32**, isto é **187 ícones** de 32 × 32
numa única fileira. O `clientId` de toda magia do kit cabe nessa faixa.

A tabela `SpellInfo` de `modules/gamelib/spells.lua` é a fonte do par `id` → `clientId`. O Canary
fornece o `spell:id`; o OTClient fornece o `clientId`; o atlas é do OTClient.

## As nove do kit do Knight

| Ability (Huntbound) | Canary `spell:id` | **`clientId` (coluna do atlas)** | Ícone conferido |
|---|---|---|---|
| `berserk` | 80 | **20** | rosto enfurecido |
| `brutal-strike` | 61 | **22** | punho de impacto |
| `wound-cleansing` | 123 | **2** | mãos de cura |
| `groundshaker` | 106 | **24** | chão rachado |
| `whirlwind-throw` | 107 | **18** | machado girando |
| `blood-rage` | 133 | **95** | rosto gritando, vermelho |
| `protector` | 132 | **121** | escudo |
| `challenge` | 93 | **96** | espadas cruzadas |
| `haste` | 6 | **100** | figura correndo |

Os nove foram recortados e olhados um a um. Nenhum é ambíguo.

## O que isto ainda não resolve

O packer **copia bytes de PNG inteiros**; ele não fatia atlas (`docs/assets/ASSET_PACKER.md`, seção
"Validation and transformation"). Então um pack de perfil `personal` com arte de magia exige, antes
de qualquer coisa no packer:

1. um recorte de `spell-icons-32x32.png` em `spells/<clientId>.png` dentro do export privado
   (`HUNTBOUND_PERSONAL_ASSET_SOURCE`);
2. as entradas correspondentes no source-lock, com tamanho e SHA-256.

O `AssetExtractor` externo hoje conhece `outfitIds`, `objectIds`, `effectIds` e `missileIds` — não
conhece fatiamento de folha. Esse recorte é o custo real da task, não a categoria nova no schema.

## Reprodução do recorte

O recorte é reproduzível pela ferramenta versionada
`tools/asset-packer/spells/cropSpellIcons.ts`. Ela lê `manifest.json` no diretório indicado por
`HUNTBOUND_PERSONAL_ASSET_SOURCE`, recorta as colunas `clientId` e grava os nove arquivos
`spells/<clientId>.png`, atualizando também o mapa `spells` do manifesto. O atlas pode ficar dentro
do export privado em `spell-icons-32x32.png` ou ser informado explicitamente:

```powershell
$env:HUNTBOUND_PERSONAL_SPELL_ATLAS = 'C:\caminho\privado\spell-icons-32x32.png'
corepack pnpm exec node --no-warnings --experimental-transform-types tools/asset-packer/spells/cropSpellIcons.ts
```

`corepack pnpm assets:hunt:personal:generate` executa esse recorte automaticamente antes de criar
os source-locks das hunts. Os arquivos privados não entram no Git; o source-lock registra o tamanho
e o SHA-256 de cada recorte.

**A armadilha de aceite continua valendo:** o perfil `test` fabrica um placeholder 1 × 1 para
qualquer id pedido, então `verify` fecha verde com zero arte na tela. A prova é screenshot do perfil
`personal`.
