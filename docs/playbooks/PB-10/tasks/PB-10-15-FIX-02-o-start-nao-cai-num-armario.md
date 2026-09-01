# PB-10-15-FIX-02 — O start não cai num armário

**Objetivo.** Na rotworm o `playerStart` fica num bolsão de **35 células — 2 % do mapa andável** — sem
uma única transição alcançável. O jogador entra na faixa 1, vê dois rotworms e não tem para onde ir.
Ao fim disto o start de cada hunt abre a hunt, e o número que prova isso é medido, não estimado.

**Onde.** A escolha de start é da PB-10-13-FIX-01 e vive em `tools/map-extractor/` — é ela que
seleciona "componente com mais grupos → andar com mais grupos → célula de menor caminhada". Reextrair
as cinco depois: `packages/content/src/generated/hunts/**` e `index.json`.

**A medição, feita em 2026-09-01 sobre a `main` em `df0362b`.** Alcançável é BFS de 4 vizinhos a
partir do `playerStart`, atravessando as transições extraídas:

| Hunt | start | alcançável | maior componente plano | transições úteis | grupos/slots |
|---|---|---|---|---|---|
| orc-fortress | 37,40,z7 | 2620/4312 (61 %) | 1324 | 12/12 | 21/46 |
| cyclopolis | 20,15,z8 | 671/1401 (48 %) | 671 | 0/1 | 18/19 |
| hero-cave | 39,30,z9 | 2138/4624 (46 %) | 2138 | 0/0 | 10/13 |
| dragon-lair | 57,40,z5 | 485/2376 (20 %) | 465 | 6/10 | 8/8 |
| **venore-rotworm-cave** | **11,6,z9** | **35/1451 (2 %)** | **267** | **0/8** | **1/2** |

O que a tabela diz: a heurística foi afinada na Orc, onde as transições **costuram** componentes — 2620
alcançáveis contra um maior componente plano de 1324. Na rotworm ela escolheu um bolsão sete vezes
menor que o maior componente e que não costura nada. O critério "mais grupos" não tem termo de
tamanho, e empata mal quando os grupos se espalham por muitos componentes.

**Fora de escopo.** A `PB-10-15-FIX-01` roda **depois** desta: mexer no start muda `hunt.json` e
`spawns.json`, e a fixture do PB-04 teria de ser regenerada duas vezes. Não mexer no filtro de spawn
da PB-10-13-FIX-04 — ele está certo, o start é que está errado. Não recurar caixa: as caixas da
`HUNT_BANDS.md` seguem congeladas.

**Decisões congeladas.** O critério de aceite é numérico e é o que fecha a task: **nenhuma hunt fecha
com menos de 25 % do andável alcançável a partir do start**, e a rotworm precisa recuperar grupos —
ela tem 13 grupos e 20 slots no XML (`expectedSpawnGroups`/`expectedSpawnSlots` da selection) e hoje
entrega 1 e 2. A Dragon Lair em 20 % também entra no conserto. A caixa curada, o teto de
`maxLiveActors` e a regra de descarte de spawn inalcançável não se redesenham aqui.

**Gate.** Linha `packages/content`/gerador: teste diretamente afetado do `map-extractor` +
`content:check`; `assets:check` se algum pack mudar de tamanho; `architecture:check` porque `tools`
muda. `hunt:index` antes do `content:check`, que o índice guarda o tamanho dos artefatos.

**O que olhar no jogo.** `corepack pnpm dev`, entrar na rotworm: sair do ponto inicial, achar mais de
dois rotworms e conseguir descer por um dos oito buracos. Hoje nenhuma das três coisas acontece.
