# PB-10-13 — Orc Fortress ocupa a caixa que já foi curada

**Objetivo.** A Orc Fortress é jogada num recorte de 32×32 enquanto a caixa curada e congelada pela
PB-10-02 tem 65×68×3. A hunt passa a ocupar a caixa inteira, com o circuito real do mapa em vez de um
pátio só, e o custo de paint do andar sai medido para a PB-10-14 decidir o culling em cima de número.

**Onde.**

- `tools/map-extractor/cli.ts:313` — a validação que exige receita de layout. **O resto do extractor
  já sabe extrair sem ela**: região direto do OTBM (`extract.ts:185`), travessias derivadas dos
  floorchange reais (`extract.ts:206`), `playerStart` escolhido (`extract.ts:231`) e spawns por
  offset absoluto (`spawns.ts:91`).
- `packages/content/src/selections/hunts/orc-fortress.json` e a receita em
  `packages/content/src/layouts/hunts/orc-fortress.json`.
- `packages/content/src/generated/hunts/orc-fortress/**` e `generated/hunts/index.json` — gerados,
  regenere pelo tool.

**Fora de escopo.** As outras quatro hunts, que são a PB-10-15. Culling de render, que é a PB-10-14 —
aqui o custo só se mede. Kernel, mitigação, espécie nova, loot novo.

**Decisões congeladas.**

- A caixa é a da `docs/content/HUNT_BANDS.md`, faixa 2, congelada com `sha256`. **Não recurar.**
- O budget de região é 96 × 96 × 3 (`extract.ts:66`); a caixa cabe com folga.
- `maxLiveActors` 64 fica como está. É o teto que força a rotação em vez de deixar a caixa inteira
  viva de uma vez.
- Nenhum spawn inventado. Sem receita, `spawnPlacements` deixa de existir, mas a origem de cada slot
  continua sendo o `otservbr-monster.xml` real.
- **"Recorte apertado, densidade acima de área" (PB-10-08) não vale mais.** Ver o README, seção "A
  correção de mapa".

**Gate.** Linha de `packages/content` ou gerador: teste diretamente afetado do `map-extractor` +
`content:check`; `assets:check` se o pack mudou; `architecture:check` pelo diff em `tools`. Golden de
replay pode se mover — é mudança de comportamento intencional e vai justificada na mensagem de commit.

**O que olhar no jogo.** `corepack pnpm build` e entre na Orc Fortress. A hunt deve ter corredores e
salas separadas, e as escadas devem ser as reais do mapa. Limpe um spot, ande até o próximo, volte
pelo mesmo caminho: em torno de 90 s o primeiro repovoou. Registre no commit quantos sprites o
primeiro paint do andar cria.
