# PB-18-02 — A ficha que a hunt escolhe

> **Histórico; não executar.** A fila vigente recomeça no [PB-13](../../PB-13/README.md).
> Entregas integradas permanecem; pendências foram absorvidas pelas cards novas.


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
faltar — a PB-10-11 removeu de propósito o fallback por vocação.

Conferido no catálogo gerado em 2026-08-30, e é o dado que a porta vai imprimir:

| Hunt | Nível | HP | Mana | Arma | Sword |
|---|---:|---:|---:|---|---:|
| Venore Rotworm Cave | 35 | 590 | 185 | sword | 60 |
| Orc Fortress | 25 | 440 | 185 | sword | 60 |
| Cyclopolis | 45 | 740 | 185 | sword | 60 |
| Dragon Lair | 70 | 1115 | 185 | sword | 60 |
| Hero Cave | 130 | 2015 | 645 | two-handed sword | 90 |

**Escolher a hunt é escolher o personagem.** O que **não** muda é o kit: `pb-05-knight-combat.json`
declara uma banda só, `minLevel: 1, maxLevel: null`, então as nove ações são as mesmas em toda hunt —
é a regra 4 da curadoria ("nenhuma ação é trancada por level") funcionando. Diga isso também: que a
rotação não muda é informação, não omissão.

Nada na tela diz nada disso hoje. O jogador entra na Dragon Lair e descobre no meio da hunt que está
com outro personagem.

**A linha 1 da tabela é um defeito, não um dado.** Ver B24 no `STATE.md`: a rotworm recomenda nível 8
no índice e entrega uma ficha de 35. Imprima o que existe; consertar conteúdo não é desta task.

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
