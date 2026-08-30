# PB-18-02 — A ficha que a hunt escolhe

**Status inicial:** pending. **Depende da PB-18-01.**

**Classe da tarefa:** apresentação **com uma decisão de enquadramento**. Frontier por isso.

**Modelo sugerido:** camada frontier, effort `xhigh`.

**Paralelismo:** roda sozinha.

## Objetivo

A porta diz **com que ficha o jogador vai entrar** — e, com isso, admite em voz alta uma coisa que o
jogo já faz em silêncio.

## O fato que a task existe para mostrar

Não existe um personagem que progride. Existe **uma ficha por hunt**:
`apps/game/src/hunt/readHuntCharacter.ts` resolve `character:huntbound:knight-<hunt>` e **lança** se
faltar — a PB-10-11 removeu de propósito o fallback por vocação. Venore Rotworm Cave entra em nível 8
com 185 HP e uma sword; Cyclopolis, em 45 com 740; Dragon Lair, em 70 com 1115.

**Escolher a hunt é escolher o nível, a arma e quais das nove ações estão desbloqueadas.** As bandas
de kit já existem no contrato (`CharacterKitBand`, com `minLevel`/`maxLevel`), então quais ações
abrem naquele nível é dado disponível, não estimativa.

Nada na tela diz isso hoje. O jogador entra na Dragon Lair e descobre no meio da hunt que está com
outro personagem.

## O que entra

- na porta, a ficha da hunt: nível, HP, mana, arma, e **as ações que abrem naquele nível**;
- a diferença em relação à hunt anterior, se ela ajudar a decidir — sem inventar comparação que o
  dado não sustenta;
- **o assento do dial.** Um lugar declarado na porta onde a modulação e a dificuldade do PB-12 vão
  encaixar. Assento é layout e um rótulo honesto do que ainda não existe — **não** é um controle
  desabilitado que promete o que ninguém implementou, e **não** é um cálculo de recompensa.

## Paths

- `apps/game/src/ui/HuntingPlaces.ts` e seu teste
- `apps/game/src/hunt/readHuntCharacter.ts` — leitura, não mudança de regra
- `apps/game/src/main.ts` — a ficha precisa chegar à tela de seleção; hoje ela é resolvida depois
- `apps/game/src/styles.css`

## A fronteira, e ela é dura

**Você não está implementando level sync.** Ele já está implementado, por construção de conteúdo. Você
está imprimindo o que já acontece. Se em algum momento a task precisar *escolher* um nível, *escalar*
um stat ou *modular* qualquer coisa, ela saiu do PB-18 e entrou no PB-12 — que exige emenda à ADR-05.
Pare e registre no `STATE.md` como B21.

## Aceite

`corepack pnpm dev`: abrir a porta da Dragon Lair e da rotworm e ver, sem entrar, que são
personagens diferentes.

## Gates

`biome check .`, `typecheck`, `corepack pnpm test`.
