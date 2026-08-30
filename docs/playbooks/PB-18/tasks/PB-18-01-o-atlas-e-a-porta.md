# PB-18-01 — O atlas e a porta

**Status inicial:** pending

**Classe da tarefa:** apresentação. Reorganiza uma tela cujo dado já está inteiro no índice gerado.

**Modelo sugerido:** camada econômica, effort `xhigh`.

**Paralelismo:** roda sozinha. As outras três dependem dela.

## Objetivo

A tela de hunting places passa a ter **dois estados**: o **atlas**, que lista os lugares de forma
comparável, e a **porta**, que abre um lugar e mostra o que entrar significa.

Hoje é um estado só. `createHuntCard` monta header, fatos, criaturas **e a tabela de loot inteira de
cada criatura** dentro do card, para todas as hunts ao mesmo tempo. Com cinco hunts o jogador rola
por um muro de porcentagens para responder uma pergunta de uma linha: para onde eu vou agora?

## O corte

- **Atlas** — um card por hunt, comparável de relance: nome, banda, nível recomendado, exp/h, quantas
  criaturas, e o suficiente do loot para reconhecer o lugar. Nada de tabela completa.
- **Porta** — a hunt escolhida, com espaço: as criaturas com HP/XP/spawns, a tabela de loot legível, e
  o botão de entrar. É aqui que a PB-18-02 e a PB-18-03 vão pendurar o resto.
- O botão de entrar continua sendo o único caminho para dentro, e continua desabilitando ao clicar —
  esse comportamento e os `data-testid` existentes são usados pelo driver de e2e
  (`tests/e2e/support/huntDriver.ts`). **Preserve os `data-testid` que já existem**; acrescentar é
  livre, renomear quebra a suíte do usuário.

## Paths

- `apps/game/src/ui/HuntingPlaces.ts`
- `apps/game/src/ui/HuntingPlaces.test.ts`
- `apps/game/src/styles.css`
- `apps/game/src/main.ts` — só se a porta precisar de um estado que o boot hoje não tem

## Escopo negativo

Sem filtro, sem ordenação, sem busca — é helper, e helper é PB-15. Sem arte: é a PB-18-03. Sem dial
de dificuldade: é PB-12, e o assento é a PB-18-02.

## Aceite

`corepack pnpm dev`: o atlas cabe na tela com as cinco hunts comparáveis, a porta abre com a hunt
escolhida, e entrar continua funcionando.

## Gates

`biome check .`, mais `typecheck` se assinatura mudou, mais `corepack pnpm test`. O browser é do
usuário.
