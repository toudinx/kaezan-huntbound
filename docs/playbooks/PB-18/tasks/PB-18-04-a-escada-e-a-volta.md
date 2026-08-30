# PB-18-04 — A escada e a volta

**Status inicial:** pending. **Depende da PB-18-01. Task de fechamento do playbook.**

**Classe da tarefa:** apresentação, mais um caminho de navegação que hoje não existe.

**Modelo sugerido:** camada econômica, effort `xhigh`.

**Paralelismo:** roda sozinha, por último.

## Objetivo

Duas coisas, e as duas são sobre o jogador não ficar preso.

**1. O atlas vira escada.** `docs/content/HUNT_BANDS.md` declara uma progressão que vai até os selos
de Ferumbras; a tela mostra cinco hunts em fila, sem dizer que uma vem depois da outra. Banda 1 e
banda 5 têm o mesmo peso visual, e o jogador de primeira viagem não tem como saber que a Dragon Lair
é nível 70. Ordene por faixa, mostre a faixa como degrau, e deixe claro o que é o próximo passo e o
que é longe demais por enquanto.

**2. A porta vira mão dupla.** Hoje `onRestart` reinicia **a mesma hunt**
(`apps/game/src/main.ts:450`) e não existe caminho de volta ao atlas: escolher errado custa um F5.
Entra um caminho de volta — do fim de run, e também da hunt em andamento — que desmonta a hunt e
remonta a seleção, sem recarregar a página.

## Paths

- `apps/game/src/ui/HuntingPlaces.ts` e seu teste
- `apps/game/src/main.ts` — o ciclo montar/desmontar; `selectionScreen` e `appShell` já são
  destruídos em pontos separados, e o caminho de volta é o que falta fechar
- `apps/game/src/styles.css`

## A armadilha, e a regra

A escada pede, sozinha, para marcar **"já rodei aqui"**. Isso é estado persistido por hunt, ou seja
**migração de schema de save** — e o `AGENTS.md` manda parar e registrar bloqueio antes de mudar
schema já integrado.

**O default desta task é entregar a escada sem histórico**, com o que já existe: ordem de faixa,
nível recomendado e o que está no índice. Se o usuário quiser histórico, isso vira task própria com a
migração explícita. Registre como B22 no `STATE.md` e siga.

Cuidado simétrico com a volta: o save tem sessão de run, e `saveSession.finish('abandoned')` já
existe no caminho de restart. Voltar ao atlas **não pode** deixar uma run pendurada nem inventar um
estado novo de save.

## Escopo negativo

Sem recorde, sem "melhor tempo", sem sugestão automática de próxima hunt. Isso é PB-09, PB-15 ou
PB-12.

## Aceite

`corepack pnpm dev`: as cinco hunts aparecem em ordem de faixa com o degrau legível; entrar numa
hunt, voltar ao atlas e entrar em outra funciona sem F5 e sem erro de save no console.

## Gates

`biome check .`, `typecheck`, `corepack pnpm test` — e, por ser a última task do playbook,
`corepack pnpm build`. `verify` e `qa:browser` são do usuário.
