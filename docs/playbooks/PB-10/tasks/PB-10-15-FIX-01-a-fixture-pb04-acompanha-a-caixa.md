# PB-10-15-FIX-01 — A fixture PB-04 acompanha a caixa

**Objetivo.** A PB-10-15 reextraiu a rotworm para 64 × 96 × 2 e a fixture congelada do PB-04 ficou em
24 × 24 × 2. O guard que compara as duas dispara, `corepack pnpm test` reprova e quatro specs de
browser caem junto. Ao fim disto a fixture descreve o mapa que o jogo carrega.

**Onde.** Causa localizada, não reinvestigue: `tests/e2e/support/huntSession.ts:161`
(`expectScenarioMatchesHunt`) compara o `scenario.json` congelado com o cenário composto a partir de
`packages/content/src/generated/hunts/venore-rotworm-cave/hunt.json`.

- `packages/test-fixtures/hunt/pb04/` — `scenario.json`, `commands.jsonl`, os dois goldens, o sidecar
- `packages/test-fixtures/hunt/pb04-respawn/` — idem
- `tools/replay/cli.ts` é a ferramenta (`run`, `hash`, `check-hashes`) e não muda

Quem consome, e por isso quebra hoje: `hunt-play`, `hunt-replay`, `hunt-world-edge`, `posture-play` e
`tests/e2e/support/combatDriver.ts`.

**Fora de escopo.** Nada em `packages/simulation` nem em `apps/game`. As outras quatro hunts.

**Esta task roda depois da `PB-10-15-FIX-02`.** O B27 foi investigado em 2026-09-01 e não era
densidade: o `playerStart` da rotworm cai num bolsão de 35 células. Consertá-lo move o start e os
spawns, ou seja, muda o `hunt.json` de novo — regenerar a fixture antes disso é fazer o trabalho
duas vezes.

**Decisões congeladas.** A geometria nova é intencional — decisão congelada 8 do README, a hunt ocupa
a caixa curada inteira. O golden se **regenera** porque o comportamento mudou de propósito, e o
commit registra isso; não se reescreve para passar. `scenarioRevision` é o que declara a mudança.

**O ponto que decide a task, e não é a regeneração.** O `commands.jsonl` do `pb04` é uma caminhada
relativa de 20 comandos e o do `pb04-respawn` são 2, gravados quando o start era `(21,7,8)` com
rotworm no tile ao lado. No mapa novo o start é outro e a vizinhança também. Regenerar o golden é
mecânico e vai passar de qualquer jeito — inclusive se a caminhada virar 20 passos em corredor vazio
que não exercem colisão, transição nem respawn. **Leia os eventos gerados** antes de aceitar: se o
log parou de provar o que o PB-04 provava, o conserto é o log, não o golden.

**Gate.** Linha `packages/simulation`/`contracts`: `hunt:check` mais `corepack pnpm test` uma vez no
estado final — é a suíte que reprova hoje.

**O que olhar no jogo.** Nada: fixture de teste não é conteúdo carregado. A prova é `test` verde.
