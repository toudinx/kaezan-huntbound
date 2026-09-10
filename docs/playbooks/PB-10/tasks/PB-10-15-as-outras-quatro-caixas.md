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

**A máquina já está pronta e provada numa hunt.** O que a PB-10-13 e suas quatro correções deixaram
funcionando, e que você não precisa reinventar: selection sem receita extrai a caixa inteira;
`playerStart` sai por conectividade — componente com mais grupos, andar com mais grupos, célula de
menor caminhada; escada (`type="ladder"`) vira transição de subida com a geometria do
`Position:moveUpstairs`; e assento de spawn inalcançável a partir do start é descartado na extração.

**A receita por hunt, na ordem:**

1. Tire `"layout"` da selection e apague a receita em `packages/content/src/layouts/hunts/`.
2. Extraia **uma selection por processo** — `cli.ts build --selection … --source-root-env
   HUNTBOUND_CANARY_SOURCE`. O `build-all` lê o OTBM de 184 MB cinco vezes no mesmo processo e
   segfalha de forma intermitente nesta máquina; rodar de novo resolve, mas por selection é mais
   barato que descobrir isso.
3. `expectedDroppedTransitions` vai mudar: a caixa cheia tem buracos e escadas que caem fora dos
   andares congelados. **Meça e atualize** — é guarda, não decisão. `expectedSpawnGroups` e
   `expectedSpawnSlots` **ficam**: eles são conferidos contra o XML do Canary pelo
   `hunt:selection:check` e descrevem a caixa, não a hunt.
4. Pack: `corepack pnpm assets:hunt:artifacts:check` reprova com `HUNT_PACK_OVER_ENTRIES` se a caixa
   derivar mais que o teto (1.024 desde a PB-10-13-FIX-02; a Orc precisou de 541). Confira também
   `maxBytes`, 6 MiB — a Orc ficou em 2,6 MB com 523 mídias. Depois de regenerar os artefatos, o
   pack de fixture se reescreve com `corepack pnpm assets:hunt:pack`.
5. **O export privado vai faltar sprite.** `corepack pnpm assets:hunt:personal:generate` morre no
   primeiro id ausente com `Source identity clientId:<id> was not found`, e isso **derruba o `dev`**
   antes do Vite subir. O conserto é a montante e está em
   `.claude/…/memory/huntbound-private-export-rerun.md`: somar os ids ao `objectIds` do
   `content-config.json` do AssetExtractor e re-rodar o extractor **com o conjunto completo de
   argumentos**, `--dry-run` antes e backup do `manifest.json`. A Orc precisou de 119 ids.

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
mover; justifique no commit. `content:check` reprova em `hunt:index:check` até você rodar
`corepack pnpm hunt:index` — o índice guarda o tamanho dos artefatos.

**O que olhar no jogo.** Uma volta em cada uma, com `corepack pnpm dev` de pé: sair do ponto inicial,
limpar dois ou três spots, voltar pelo mesmo caminho e encontrar o primeiro repovoado. Na Cyclopolis,
confirmar que a caminhada entre spots é a hunt — e não um vazio.
