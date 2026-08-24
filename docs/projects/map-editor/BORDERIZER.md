# Borderizer — bordas e preenchimento derivados de tabela medida

**Status:** congelado em 2026-08-23; base das tasks MB-01, MB-02 e MB-03

**Natureza:** precede o editor. Resolve por algoritmo o que o editor resolveria à mão.

**Diretriz de execução:** `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`

## O problema, medido

A Venore Rotworm Cave é uma colagem de quatro retângulos do Canary num grid 24×24. As costuras entre
os blocos não existem no mapa original, então sobram SQMs sem chão. O jogo pinta esses SQMs como
vazio escuro, e os que encostam em chão como face de rocha — a lógica está em
`apps/game/src/hunt/GroundCompositor.ts`.

| Andar | SQM sem chão | dentro da área jogável | viram cinza | viram preto |
|---|---|---|---|---|
| z=8 | 152 | 38 | 27 | 11 |
| z=9 | 201 | 87 | 69 | 18 |

São **125 pontos visíveis** dentro da área jogável, dispostos em faixas retas — as costuras entre os
`copy-rect` — e não como ruído espalhado.

**Os 353 SQMs sem chão já estão todos fora da colisão.** O jogo já os trata como bloqueados. Essa
medição é o que torna a correção barata: preencher com massa sólida preserva a colisão bit a bit.

## O vocabulário já está no pack

Cruzamento da paleta da região com `items.xml` do RME:

| ids | nome | papel | observação |
|---|---|---|---|
| `351`–`355` | cave floor | piso caminhável | brush `cave` do RME |
| `16280`–`16299`, `17238` | muddy floor | piso caminhável | — |
| `4680`–`4701` | swamp | piso e massa | misto |
| `101` + `5711`–`5726` | earth | massa sólida que lê como parede | brush único; `101` aparece **225×** |
| `356`–`367` | dirt wall | transição piso↔massa | **exatamente 12 ids** |

Doze ids é o tamanho de um border set do RME: `n e s w`, quatro cantos, quatro diagonais. O mapa
original foi autorado no RME com automagic ligado; a colagem quebrou isso nas costuras.

Consequência: **um borderizer restrito a esse vocabulário fecha os 125 pontos sem introduzir um único
sprite novo.** `deriveHuntPackKeys` em `packages/assets/src/hunt/HuntPack.ts` deriva as chaves de
asset da paleta da região; se a paleta não ganha id, o pack não muda.

## Por que a tabela é medida e não copiada

O `borders.xml` desta versão do RME não contém o conjunto `356`–`367`. Ele traz "cave border"
(`4785`–`4796`) e "mountain edge" (`4445`–`4456`), nenhum dos dois presente na nossa paleta. A tabela
que o mapa original usou não veio com a distribuição.

Minerar a vizinhança dentro da nossa própria região não serve: quatro das doze peças aparecem uma
única vez, e os dados já estão contaminados pela colagem que queremos consertar.

O `otservbr.otbm` completo está em disco (177 MB, três cópias — ver `AGENTS.md`) e
`tools/map-extractor/otbm.ts` já expõe `readOtbmTiles(bounds)` com janela. Medir a mesma estatística
sobre janelas íntegras do mapa global dá milhares de amostras limpas por peça, em terreno autorado
corretamente. **A tabela deixa de ser julgamento visual e vira medição verificável.**

## Arquitetura

### `packages/map-authoring` — a função pura

TypeScript puro, browser-safe, depende somente de `@huntbound/contracts`. Mesma disciplina de
`packages/simulation`: sem `node:*`, sem DOM, sem Phaser, **sem `Math.random()`**.

```text
borderize(grid, tables, seed) -> grid
```

Determinística e sem I/O. É a mesma função que o editor chamará no browser, e é por isso que ela não
pode conhecer filesystem. Entrada em `tools/architecture/dependency-policy.json` é obrigatória.

### `tools/map-materials` — o minerador

Lê o OTBM por janelas declaradas, conta assinaturas de vizinhança e emite
`packages/content/src/generated/material-borders.json` com sidecar SHA-256 e `--check`.

É cópia do padrão de `tools/tile-flags`, que já resolve exatamente esse problema neste repo: a tabela
vai commitada, o build não precisa do OTBM em disco, e a proveniência fica verificável. O gate que
entra no `verify` é o **sidecar-check**, não a remineração.

### `tools/map-extractor` — a aplicação

Aplica o `borderize` e escreve o resultado no documento de layout. Comando rodado uma vez; o
resultado fica no Git.

## A assinatura de 8 bits

O RME enumera 12 casos porque é o que um humano escreve à mão. Medindo, não precisamos dessa redução:
cada um dos 8 vizinhos é classificado em binário — **mesmo material / diferente** — dando 256 casos.

A tabela guarda, por caso, a peça mais frequente **e a contagem observada**. Isso entrega três coisas:

- **cobertura mensurável** — "212 de 256 casos observados, mínimo de 40 ocorrências" é número para o
  `STATE.md`;
- **fallback honesto** — caso não observado cai na massa sólida `101`, que nunca fica errado, apenas
  menos bonito;
- **detecção de ambiguidade** — empate entre duas peças num caso reprova a mineração em vez de ser
  desempatado no par ou ímpar.

## Variação de piso sem RNG livre

O brush `earth` é `101` com peso 150 mais dezesseis variantes de peso 1 a 10. É amostragem aleatória,
e a regra inviolável proíbe RNG não semeado na camada pura.

Hash de `(layoutId, x, y, z)` indexa a tabela de pesos. Mesma célula produz sempre o mesmo id, sem
estado e sem depender da ordem de execução. A CLI e o editor no browser chegam ao mesmo resultado,
o que é obrigatório dado que ambos chamam a mesma função.

## A camada `cells`

A camada `cells` recebe **duas** classes de célula, e confundi-las é o erro fácil desta implementação:

1. as **353 células vazias** que ganham massa sólida;
2. as células de massa **já existentes na fronteira com piso**, cujo id é trocado pela peça de borda
   que a assinatura indica.

A segunda classe não aparece na contagem de buracos, mas é o que faz a transição ficar bonita — e é
maior que a primeira. Todas as doze peças `356`–`367` são `blocking=true` e `ground=true`, iguais à
`earth`, então a troca preserva a colisão.

Isso entra como camada explícita no recipe atual, aplicada **depois** das operações de colagem:

```json
{ "cells": [{ "x": 12, "y": 7, "z": 9, "ground": 101 }] }
```

Authoring-time e materializado: o algoritmo rodou, o resultado está escrito, commitado e diffável, e
o retoque manual vai por cima. Não obriga a reescrever o formato inteiro antes de a caverna ficar
boa. Quando o ME-01 materializar tudo em v2, esta camada colapsa dentro dele.

## O que o borderizer não decide

Ele resolve **como** a fronteira entre piso e massa fica bonita. Não resolve **onde** ela está. As
costuras podem virar massa sólida separando salões ou piso unindo tudo.

**Default congelado: preencher tudo com massa sólida.** Preserva a colisão exatamente como está hoje,
mantém os goldens de replay, e é reversível — abrir passagem depois é pintar piso por cima. Decidir o
contrário é melhor feito vendo o mapa, no editor, do que antecipadamente.

## Efeito nos artefatos e nos goldens

- `collision` de `region.json` **não muda**: os SQMs preenchidos já eram bloqueados.
- `palette` e `ground` mudam, logo `region.sha256` e `hunt.sha256` mudam. Isso é regeneração por CLI,
  não reescrita de golden.
- Os goldens de replay de PB-04 e PB-05 **sobrevivem**: a simulação lê colisão, não aparência.
- O pack de assets **não muda**: nenhum id novo entra na paleta.

Se alguma dessas quatro afirmações falhar na execução, é sinal de que o preenchimento saiu do
vocabulário previsto. Pare e registre em vez de regenerar golden.

## Gates

| Gate | O que cobre | Onde entra |
|---|---|---|
| `map:materials:check` | tabela reproduzida do OTBM | manual; exige `HUNTBOUND_CANARY_SOURCE` |
| `map:materials:sidecar` | integridade da tabela commitada | `content:check` |
| testes de `packages/map-authoring` | `borderize` puro e determinismo | `pnpm test` recursivo |
| `architecture:check` | fronteira do package novo | já no `verify` |
| `HUNT_EMPTY_TILE` | zero SQM vazio na área jogável | vira erro após MB-03 |

## Lacuna conhecida, fora de escopo

`assets:check` não roda o profile `personal`. Os fixtures `test` e `product` fabricam placeholder 1×1
para qualquer id pedido, então **`verify` fica verde com arte pessoal faltando** — exatamente o modo
de falha "cinza no jogo". Não afeta este trabalho, porque nenhum id novo é introduzido, mas é
armadilha real para a próxima hunt. Registrado como bloqueio informativo no `STATE.md`, não corrigido
aqui.

## Tasks

| Task | Resultado | Classe | Modelo |
|---|---|---|---|
| MB-01 | minerador, tabela commitada, relatório de cobertura | geral bem especificada | GPT-5.6 Luna `xhigh` |
| MB-02 | `packages/map-authoring` com `borderize` puro | geral bem especificada | GPT-5.6 Luna `xhigh` |
| MB-03 | camada `cells`, aplicação, regeneração, aceite jogando | geral bem especificada | GPT-5.6 Luna `xhigh` |

Nenhuma é complexa pela política de `docs/08_POLITICA_MODELOS_AGENTES.md`: arquitetura e schema saem
congelados desta spec, o red-green cabe dentro de cada task, e o estado é reconstruível — apagar
`cells` devolve o mapa de hoje.

## Aceite

O usuário roda `corepack pnpm dev`, entra na caverna e não encontra ponto cinza nem preto dentro da
área jogável. `HUNT_EMPTY_TILE` reporta zero. `corepack pnpm verify` verde.
