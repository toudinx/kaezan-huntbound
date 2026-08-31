# PB-10-15 — As outras quatro hunts ocupam suas caixas

**Objetivo.** Rotworm, Cyclopolis, Dragon Lair e Hero Cave continuam recortadas em 24 × 24 enquanto
suas caixas curadas são 64 × 96, 71 × 61, 69 × 61 e 71 × 71. As quatro passam a ocupar a caixa
inteira, pela máquina que a PB-10-13 destravou e com o render que a PB-10-14 preparou.

**Onde.** `packages/content/src/selections/hunts/` — `venore-rotworm-cave.json`, `cyclopolis.json`,
`dragon-lair.json`, `hero-cave.json` — as receitas correspondentes em
`packages/content/src/layouts/hunts/`, e os gerados em
`packages/content/src/generated/hunts/**` mais o `index.json`.

**Fora de escopo.** Orc Fortress, que é a PB-10-13. Render, que é a PB-10-14. Espécie nova, loot
novo, kernel, mitigação. Nenhuma caixa se recurar.

**Decisões congeladas.**

- As caixas são as da `docs/content/HUNT_BANDS.md`, congeladas com `sha256` desde 2026-08-26.
- **"Recorte apertado, densidade acima de área" (PB-10-08) fica revogada.** O que impede a hunt de ser
  vazia é o circuito mais o respawn, não a compressão. A Cyclopolis é o caso extremo — 19 Cyclops em
  71 × 61 × 3 — e é exatamente ela que o Tibia joga como volta, não como pátio.
- O Dragon Lair já teve o mapa refeito em 2026-08-30 para três `copy-rect` reais. Aqui ele é
  reextração como as outras, não conserto.
- `maxLiveActors` 64 fica. A rotação vem dele.

**Gate.** Mesmo da PB-10-13: teste diretamente afetado do `map-extractor` + `content:check`;
`assets:check` se o pack mudou; `architecture:check` se `tools` mudar. Goldens de replay podem se
mover; justifique no commit.

**O que olhar no jogo.** Uma volta em cada uma, com `corepack pnpm dev` de pé: sair do ponto inicial,
limpar dois ou três spots, voltar pelo mesmo caminho e encontrar o primeiro repovoado. Na Cyclopolis,
confirmar que a caminhada entre spots é a hunt — e não um vazio.
