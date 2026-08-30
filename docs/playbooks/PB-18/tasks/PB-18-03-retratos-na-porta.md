# PB-18-03 — Retratos na porta

**Status inicial:** pending. **Depende da PB-18-01.**

**Classe da tarefa:** apresentação **com um problema de custo de boot**. Frontier por isso.

**Modelo sugerido:** camada frontier, effort `xhigh`.

**Paralelismo:** roda sozinha.

## Objetivo

A porta mostra **quem mora lá** e **o que cai**, com a arte que o pack pessoal já tem, em vez de duas
listas de texto.

## O problema que faz esta task ser frontier

O runtime de asset é criado **depois** da seleção — `apps/game/src/main.ts:363`, dentro do caminho que
só roda quando a hunt já foi escolhida. Antes disso não existe manifesto carregado, e por isso o atlas
é texto puro.

A saída ingênua — carregar os cinco packs no boot para ter retrato — é a errada: a tela de hunting
places foi medida em **~5,27 s de boot** na PB-10-05, e multiplicar pack por cinco ali é como o boot
vira inaceitável. **Escolha outra saída e registre qual em uma linha do commit.** O dado a favor:
`HuntIndexCreature` já carrega `lookType`, então a identidade da arte está no índice, e o que falta é
o caminho até o PNG.

Prefira a opção mais simples e mais fácil de reverter. Carregar arte **só quando a porta abre**, e só
daquela hunt, é uma delas.

## O que entra

- retrato da criatura na porta, um por espécie;
- sprite do item nas linhas de loot;
- degradação honesta: sem arte disponível, a linha de texto de hoje continua valendo. A tela **não**
  pode ficar em branco nem travar o boot porque um sprite faltou — `generatePersonalHuntProfile`
  lança na primeira falta e derruba o `dev` inteiro; a tela de seleção não pode herdar essa
  fragilidade.

## Paths

- `apps/game/src/ui/HuntingPlaces.ts` e seu teste
- `apps/game/src/assets/createAssetRuntime.ts`
- `apps/game/src/main.ts`
- `apps/game/src/styles.css`

## O que você vai ver e não é seu para consertar

Orc é `lookType` 5 e sai **cisalhado** do export pessoal — B18, aberto desde o PB-10, causa fora deste
repositório. Hero (73) sai limpo. Pôr retrato na porta vai **expor** esse defeito onde hoje ele passa
despercebido. Isso é esperado, não é regressão da sua task, e não é ela que conserta.

## Escopo negativo

Sem animação, sem outfit composto, sem troca de cor — é PB-13.

## Aceite

`corepack pnpm dev` no perfil `personal`: a porta da Cyclopolis mostra o Cyclops e os itens do loot, e
o boot do atlas não fica visivelmente mais lento do que hoje.

## Gates

`biome check .`, `typecheck`, `corepack pnpm test`. `qa:budgets` é do usuário — se você quiser um
número de boot, diga a ele qual olhar.
