# PB-17-01 — A categoria `spell` e os nove ícones

**Status inicial:** pending

**Classe da tarefa:** **pipeline de asset**. Especificada até o número da coluna; o custo é atravessar
export privado, source-lock, manifesto e packer sem quebrar as cinco hunts.

**Modelo sugerido:** camada econômica, effort `xhigh`.

**Rota:** sem skill externa. Operacionais: `playbook-task`, `run-gates`, `hunt-content-pipeline`.

**Paralelismo:** roda sozinha. A PB-17-02 depende dela.

## Objetivo

O deck do Knight passa a poder desenhar os nove ícones de magia do Tibia, no perfil `personal`.
Esta task entrega o **caminho do pixel** — categoria, identidade, recorte, lock, pack e resolução por
chave. Quem desenha na tela é a PB-17-02.

Fecha o **B13**.

## O que já está medido — não refaça

`docs/assets/SPELL_ICON_INDEX.md`, medido em 2026-08-25 contra `C:\Kaezan\kaezan\otclient-4.0`:

- o atlas é `data/images/game/spells/spell-icons-32x32.png`, **5984 × 32**, 187 ícones numa fileira;
- **coluna = `clientId` do OTClient, base zero**. Não é `spell:id` do Canary. Recortar por `spell:id`
  entrega uma runa no lugar do Berserk — isso já foi conferido por imagem e custou a premissa antiga;
- a tabela das nove magias do kit, com `clientId` conferido um a um, está lá. Use-a como está.

Duas restrições do repositório que decidem o desenho:

1. **O packer copia PNG inteiro; ele não fatia atlas** (`docs/assets/ASSET_PACKER.md`, "Validation and
   transformation"). O recorte acontece **antes** do packer.
2. **O `AssetExtractor` externo não conhece fatiamento de folha.** Ele conhece `outfitIds`,
   `objectIds`, `effectIds` e `missileIds`. Fatiar ali é mudar um repositório que não é este.

Onde o recorte vive é **sua escolha** — a mais simples e reversível vence, e vai em uma linha do
commit. Registre em `docs/assets/` como reproduzi-lo, porque o export privado não entra no Git.

## Paths

- `packages/assets/src/manifest/schemas.ts` — sexta entrada em `AssetCategorySchema`; `clientId` como
  identidade já existe e é reaproveitada;
- `packages/assets/src/**` — provider, adapters e source-lock que a categoria nova atravessa;
- `tools/asset-packer/**` — admissão da categoria;
- selection de hunt e/ou perfil pessoal — as nove entradas;
- `docs/assets/SPELL_ICON_INDEX.md` — acrescente a seção de reprodução do recorte;
- `apps/game/src/assets/createAssetRuntime.ts` — a chave por onde a UI pede o ícone.

## Escopo negativo

- **Não** desenhe nada no deck. É a 02.
- **Não** mexa em `outfit`, `creature`, `object`, `effect` ou `missile`.
- **Não** encolha o export privado: a memória do usuário sobre re-rodar o extractor vale — argumentos
  omitidos apagam categorias inteiras do `manifest.json` e derrubam todas as hunts.

## Aceite

`corepack pnpm dev` sobe no perfil `personal` sem `Source identity ... was not found`, e a chave de
um ícone resolve para um `mediaUrl` que abre no browser mostrando o ícone certo. Confira **por
imagem** que o recorte não saiu cisalhado (B18 é de outra folha, mas confirme, não assuma).

## Gates

`assets:check`, `content:check`, `architecture:check` e `corepack pnpm test`. Uma vez cada.
`verify` e `qa:browser` são do usuário.
