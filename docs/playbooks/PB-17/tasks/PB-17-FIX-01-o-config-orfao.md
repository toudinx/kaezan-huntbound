# PB-17-FIX-01 — O config órfão

**Objetivo.** `tools/asset-packer/vitest.config.ts` não é invocado por nenhum script, então seus 15
arquivos e 62 testes nunca rodam e `huntArtifacts.test.ts` acumula vermelho sem ninguém ver — três
vezes até agora: PB-17-01 (o B19), PB-10-13-FIX-02 e PB-10-15. Ao fim disto o config está num gate e
o arquivo é verde.

**Onde.**

- `package.json`, script `test`: entram na cadeia `tools/asset-packer/vitest.config.ts` e
  `tools/diagnostics/vitest.config.ts`, órfão pelo mesmo motivo
- `tools/asset-packer/hunt/huntArtifacts.test.ts`, seis asserções que congelam contagens derivadas
  pelo pipeline: linhas 28, 31 e 85 (rotworm, 156 contra 451 de hoje), 98, 99 e 120 (hero cave, 118
  contra 270), 133, 134 e 155 (dragon lair, 226 contra 368)

**Fora de escopo.** Packer, packs, source-locks e qualquer artefato gerado: **nada se regenera
aqui**. Se um `--check` reprovar, o defeito é outro e vira task própria.
`tools/map-extractor/tsconfig.json`, que não compila e também não está em gate nenhum, fica para
depois.

**Decisões congeladas.** A contagem não é a asserção. O caso do Orc no mesmo arquivo já é escrito
derivado — `expect(selection.entries).toHaveLength(selection.hunt?.keys.length ?? 0)`, linha 78 — e
foi o único dos quatro que sobreviveu à PB-10-15 sem manutenção. O que o teste afirma é a **relação**
entre selection, source-lock e chaves derivadas; congelar contagem nova só marca a data da quarta
reincidência.

**A pergunta que sobra.** `sourceLock.files.every((file) => file.byteLength === 68)` deixou de valer
quando os recortes de `spell` entraram na PB-17-01. Decidir o que a fixture sintética afirma sobre
magia é a única parte não mecânica desta task; se travar, registre no `STATE.md` em vez de enfraquecer
a asserção.

**O que você vai ver ao ligar o config.** `tools/asset-packer/cli.test.ts` reprovou uma vez em
2026-08-31 com `expected 3221225477 to be +0` e passou 3/3 isolado: é o access violation do B22, não
código. Pendurar o config no `test` expõe o gate principal a esse flake — se ele reproduzir isolado,
é linha nova no `STATE.md`, nunca `retries`.

**Gate.** Linha "runner ou configuração de testes": `corepack pnpm test` uma vez, no estado final,
mais `biome check .`.

**O que olhar no jogo.** Nada. Isto é gate, não jogo.
