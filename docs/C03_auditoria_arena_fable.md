# C03 — Auditoria do Kaezan Arena Fable (docs, código e UI/UX)

> **STATUS: EVIDÊNCIA HISTÓRICA.** A auditoria foi produzida para reconstrução em Godot. Medições,
> decisões de produto e inventário de reuso permanecem válidos; equivalentes Godot e recomendações
> de stack foram substituídos por `03_ADR_PHASER4_BROWSER_FIRST.md`.

> **Escopo.** Leitura das duas árvores de documentação (`docs/`, `docs_web/`) do
> `C:\Kaezan\kaezan-arena-fable`, validação contra o código (`backend/`, `frontend/`) e auditoria
> orientada à reconstrução em Godot 4.7.1 (**Kaezan Huntbound**).
>
> **Nada foi modificado no Arena Fable. Nada do Huntbound foi implementado.**
>
> **Método.** As docs foram lidas primeiro; o código foi usado para *confirmar, completar e
> corrigir*. Cada divergência abaixo cita arquivo e (quando útil) linha.
>
> **Achado estrutural mais importante da Fase 1:** o `README.md` da raiz **não é um readme** — é o
> documento vivo do projeto (621 linhas, densidade altíssima) e é a fonte mais precisa que existe.
> O `CLAUDE.md` diz explicitamente "confie nele acima de qualquer outro `.md`", e a validação
> confirma: o README acertou quase tudo que os roadmaps erraram. **Ler o README primeiro economiza
> ~80% do trabalho de redescoberta.**

---

## Sumário executivo (o que importa para o Huntbound)

1. **A documentação é boa e vale ser lida, mas o eixo de confiança é: README > roadmaps `ongoing/`
   > docs de design > roadmaps `done/` > GDD.** O `docs/roadmap/done|ongoing|not started/` é o
   diretório **menos confiável** do repo: pelo menos 3 arquivos estão na pasta errada.
2. **O que sobrevive quase inteiro conceitualmente:** dash por papel, postura/Echo Break, reações
   elementais, helper/autoplay, geração de arena orgânica, cadência de cartas por *beats*, modelo de
   papéis (Knight/Mage/Archer) como eixo mecânico primário, e o design system "Cathedral Ink + Aurum".
3. **O que é acoplamento web e não deve migrar:** SignalR + snapshot a 100ms, renderer Canvas 2D
   manual, `AssetsService` (recolor HSI em runtime), rotas Angular, DOM/CSS como camada de layout,
   `backdrop-filter`, e o painel admin inteiro (10 telas, ~4.900 linhas).
4. **O maior buraco de UI/UX herdado:** **resina/energia não existe como tela.** O backend tem
   `EnergyLedger` completo (cap 300, regen 3/min, 60/run) mas o valor corrente **nunca é serializado
   para o cliente**. O jogador nunca vê quanta energia tem. Se resina entrar no Huntbound, é
   desenho novo, não port.
5. **O acoplamento arquitetural mais caro de replicar em Godot** é o **backend autoritativo com
   determinismo bit-perfeito + replay**. Em single-player Godot isso vira uma decisão consciente:
   manter o *seam* (simulação determinística separada da apresentação) sem manter o transporte.

---

# A. INVENTÁRIO DA DOCUMENTAÇÃO EXISTENTE

**Volume:** 88 arquivos em `docs/` + `docs_web/`; ~25.700 linhas de markdown; + 621 linhas de README
e 79 de `CLAUDE.md` na raiz.

### A.1 — Documentos-âncora (leia estes; o resto é derivado)

| Documento | Assunto | Estado aparente | Implementação relacionada |
|---|---|---|---|
| `README.md` (raiz, 621 l.) | **Documento vivo.** Stack, controles, dash, postura, reações, loop de jogo, helper, mapgen, gacha, Kaelis, equipamento, pipeline de assets, invariantes | ✅ **Atual e preciso** (2 erros pontuais, ver §B) | O projeto inteiro |
| `CLAUDE.md` / `AGENTS.md` (raiz) | Doutrina de agentes, invariantes inegociáveis, convenções de namespace/pasta | ⚠️ Atual em espírito, **1 ponteiro errado** | `Domain/`, `Engine/`, `Meta/`, `Hubs/`, `Api/` |
| `docs/DESIGN_NOTES.md` (446 l.) | Base de conhecimento de design: pilares Kaezan World, Dojo, Boss Posture, Echo Team, Sealed Reward, Mastery, padrões UX do OTClient, notas de mercado gacha, economia de combate | ✅ Excelente como **design**; ⚠️ §11 desatualizada (roster) | Origem conceitual de F-A…F-E |
| `docs/STYLE_GUIDE.md` (89 l.) | Contrato de design tokens: paleta, acento duplo íris/aurum, tipografia, primitivos, motion | ✅ **Atual** — bate com `frontend/src/styles.css` | `styles.css`, `core/ui/*` |
| `docs/design/gameplay_style_guide.md` (158 l.) | Identidade visual do HUD de combate ("Reliquary Combat"): arcos de catedral, rosácea, tinta de elemento, layout, anti-padrões | ✅ **Atual e de altíssimo valor** | `pages/game/game.ts` (1.696 l.) |
| `docs/FABLE_TRACK.md` (384 l.) | Fila de features cross-cutting F-A…F-E, com critérios de "Fable-tier" | ⚠️ **Parcialmente stale** (contagem de roster, multiplicadores de postura) | F-B/F-D/F-E entregues; F-A/F-C não |

### A.2 — Roadmaps de execução (o núcleo do histórico de decisões)

| Documento | Assunto | Estado aparente | Implementação relacionada |
|---|---|---|---|
| `roadmap/ongoing/roadmap_dash_training.md` (296 l.) | **Dash por papel** (Knight blink+cleave / Archer sprint+haste / Mage trail) + **Training Room** | ✅ Trilha **fechada**, DT-01..05 + DT-10 `[x]`, DT-06..09 descartados com veredito. ⚠️ 1 constante divergente | `GameConfig.Dash*`, `GameWorld.PerformMageDash/ArcherSprint/KnightBlink`, `Engine/GameMode.cs` |
| `roadmap/ongoing/roadmap_dungeons.md` (767 l.) | **Lugares & Modos**: costura de modo, qualidade de geração, editor de biomas/Map Lab, modo Arena | ⚠️ **Genuinamente ongoing.** LM-01/02/03/07/08/09/10/11/12 `[x]`; **LM-04/05/06/13 não feitos** | `Engine/GameMode.cs`, `DungeonGenerator.cs`, `Content/TilesetRegistry.cs`, `pages/admin/map-lab.ts` |
| `roadmap/done/roadmap_refactor_gameplay.md` (900 l.) | G-01..G-12: juice de combate, framework de cartas + keywords, reroll/ban, cadência por beats, grafo de salas + minimapa, baús/altar de Eco, painel HELPER, farm/offline | ✅ Entregue. ⚠️ **G-10 foi re-escopado** (ver §B) | `game.ts`, `Domain/Cards.cs`, `GameWorld`, `Meta/SessionOrchestrator.cs` |
| `roadmap/done/roadmap_meta_gameplay.md` (395 l.) | MG-01..MG-09: **modelo de papéis** (Knight/Mage/Archer), `RoleTuning`, resize de AoE, simulador headless `BalanceSim`, calibração de 5 tiers | ✅ **Atual e muito bem documentado** — cada prompt tem resumo com números medidos | `Domain/GameConfig.Roles`, `Domain/Waifus.KaeliRole`, `tools/BalanceSim`, `docs/balance/mg0*.csv` |
| `roadmap/done/roadmap_refactor_kaelis.md` (479 l.) | K-01..K-07: roster 7×5★, classes/kits autorais, traits assinatura, gacha sem 3★/4★ Kaeli | ✅ Entregue e coerente com o código | `Domain/Waifus.cs`, `Domain/Classes.cs` |
| `roadmap/done/FRONTEND_REMAP.md` (494 l.) | **Remap visual do frontend**: design system, `KaeliArtService`, Home Hub, Recrutar+reveal, página Kaelis, shell, telas secundárias, polish, cutscene Remotion | ✅ Entregue (Prompts 0 e 4 sem `[x]` mas feitos). ⚠️ 1 descrição divergente | `styles.css`, `core/ui/*`, `pages/home|recruit|kaelis|hunt|mode|prerun|backpack|bestiary`, `shell/` |
| `roadmap/done/ROADMAP.md` (959 l.) | Fila Codex: T-01..T-54 (conteúdo, UI, juice, bugs, fundação MySQL/classes/mount) | ✅ histórico | disperso |
| `roadmap/done/GDD.md` (122 l.) | GDD original: tese, o que veio do Tibia vs. kaezan-arena, sistemas, dívidas técnicas | ❌ **Obsoleto** (ver §B) | histórico |
| `roadmap/not started/roadmap_kaelis_kit_reformulation.md` (488 l.) | KR-00..KR-08: reformulação kit-a-kit das 7 Kaelis | ❌ **Classificação errada — está IMPLEMENTADO** | `Domain/Classes.cs` |
| `roadmap/not started/roadmap_hunts.md` (579 l.) | H-01..H-09: sensação de hunt, salas orgânicas, box/lure, paredes-maciço, chão em manchas | ⚠️ **Parcial** — H-02/H-07/H-08 ✅ feitos; H-01/03/04/05/06/09 não | `DungeonGenerator.ErodeArena`, `GameConfig` (H-03 explicitamente desabilitado) |
| `roadmap/not started/roadmap_producao_visual.md` (469 l.) | Produção visual em 3 etapas: imagem estática (GPT Image + ComfyUI) · movimento/cutscenes (Remotion) · sprites in-game autorais | 🔜 parcialmente iniciado | `tools/cinematics/`, `tools/pack_kaeli_outfits.py`, `assets/kaelis/` |
| `roadmap/not started/roadmap_skins.md` (554 l.) · `roadmap_comfyui_geracao.md` (217 l.) · `roadmap_fable5_frontier.md` (285 l.) | Pipelines de skin/geração e fronteira de features | 🔜 não iniciados | — |
| `roadmap_i18n_english_migration.md` (201 l.) | Migração PT→EN de UI e código, glossário canônico, ondas P00..P09 | ✅ P00–P09 marcados. ⚠️ **2 resíduos PT** (ver §B) | frontend + backend inteiros |

### A.3 — Design, mapeamento e planos técnicos

| Documento | Assunto | Estado aparente | Implementação relacionada |
|---|---|---|---|
| `design/kaelis_kits_summary.md` (188 l.) | **Snapshot do estado real dos kits** por role (Mages/Archers/Knights) | ✅ Referência prática de leitura rápida | `Domain/Classes.cs` |
| `design/kaelis_combat_archetypes_research.md` (582 l.) | Pesquisa de arquétipos de combate; declara "nada implementado" | ⚠️ Pesquisa **consumida** pela reformulação já implementada | precursor de KR-* |
| `design/kaelis_kit_reformulation.md` (524 l.) | *Decision record* travado (2026-06-30) do redesign kit-a-kit; declara "nada implementado ainda" | ❌ **Header stale** — as decisões foram implementadas | `Domain/Classes.cs` |
| `design/tibia_map_patterns.md` (253 l.) | Estudo acionável de como o Tibia constrói lugares (cidade, hunt circular, sala de boss, arena) | ✅ **Alto valor para o Huntbound** — é design puro, engine-agnóstico | LM-02; informa `DungeonGenerator` |
| `mapping/hunt_anatomy.md` (258 l.) · `boss_room_anatomy.md` (182) · `city_anatomy.md` (151) · `quest_treasure_anatomy.md` (179) | Anatomia empírica de hunts/salas de boss/cidades/quests verificada contra `otservbr.otbm` real | ✅ **Alto valor, engine-agnóstico** — medidas reais de tiles, densidade de spawn, layout | `tools/map-importer`, prefabs |
| `superpowers/plans/2026-07-06-wave1-performance-reliability.md` (870 l.) | Onda 1: instrumentação, seq de eventos + dedup, preload de atlases, overlay F3 | ✅ entregue | `core/event-seq.ts`, `core/perf-ring.ts`, `game.ts` |
| `superpowers/plans/2026-07-06-wave2-mapgen-v2.md` (1.325 l.) | Mapgen v2: lóbulos elípticos, pilares, pockets, anfiteatro, validador | ✅ entregue | `DungeonGenerator.cs` (1.478 l.) |
| `superpowers/plans/2026-07-06-wave3-idle-orchestration.md` (1.440 l.) | Sessões idle encadeadas pelo servidor, energia, progressão offline, painel espectador | ✅ entregue | `Meta/SessionOrchestrator.cs`, `EnergyLedger.cs`, `SessionPlan.cs` |
| `superpowers/plans/2026-07-06-wave4-asset-migration.md` (217 l.) | Migração de assets | ✅ entregue | `tools/AssetExtractor` |
| `superpowers/plans/2026-07-06-cinematic-game-shell-ui.md` (999 l.) | **Shell cinematográfico**: contrato de viewport, dungeon como deploy screen, simplificação da Home, wallpapers de bioma, backdrop effects | ✅ entregue | `pages/hunt|mode|prerun`, `home.ts`, `assets/biomes/*.webp` |
| `superpowers/plans/2026-07-06-authored-maps.md` (908 l.) + `specs/…-design.md` | Pipeline OTBM → prefabs JSON determinísticos | ✅ entregue (F-D) | `Content/PrefabRegistry.cs`, `tools/map-importer` |
| `superpowers/plans/2026-07-07-map-beauty-*.md` (685+539 l.) · `map-composition-rewrite.md` (340) · `map-layout-natural-shape.md` (189) | Beleza de mapa, Map Lab, tilesets do RME, auto-border 47-blob | ✅ entregue | `Content/TilesetRegistry.cs`, `Engine/BorderAutotile.cs`, `WallAutotile.cs`, `pages/admin/map-lab.ts` |
| `superpowers/specs/…-audit.md` + `audit-shots/*.png` (30 screenshots) | **Auditoria visual com referências reais do Tibia** (Thais, Mint Wallin, Orc Throne, Troll Cave, Rotworm Cave) lado a lado com a geração | ✅ **Referência visual interna valiosa** | validação de `DungeonGenerator` |
| `balance/perf_baseline_2026-07.md` (85 l.) | **Baseline de performance medido** + régua de decisão de renderer | ✅ Atual, com números. ⚠️ 1 bug registrado **ainda aberto** | `core/renderer.ts`, overlay F3 |
| `balance/*.csv` (7 arquivos) + `golden_dungeon.txt` | Saídas do `BalanceSim`: baseline 1750 runs, before/after de MG-06/07/08 | ✅ dados reais | `tools/BalanceSim` |
| `KNOWLEDGE_wan_idle_bust.md` (162) · `KNOWLEDGE_wall_mountain_family.md` (93) · `KNOWLEDGE_gen_premium_gap.md` (78) | Receitas validadas e lições aprendidas (ComfyUI/WAN, famílias de parede, gap de qualidade de geração) | ✅ conhecimento operacional | ComfyUI, extractor |
| `WORKFLOW_imagem_e_cutscenes.md` (133 l.) | Metodologia PC↔celular de geração de imagem e cutscene | ✅ operacional | `tools/` |
| `spikes/CUT-01_idle_breathing.md` (41 l.) | Spike de respiração idle | ✅ | `core/ui/kaeli-idle.ts` |
| `prompts/**` (28 arquivos) | Prompts de arte: roster base, skins por coleção (casual/verão/miko/humanas/celestiais-caídas), âncoras de imagem de hunt-redesign | ✅ material de produção | `assets/kaelis/` |

### A.4 — `docs_web/` (trilha Claude Code Web)

| Documento | Assunto | Estado aparente | Implementação relacionada |
|---|---|---|---|
| `docs_web/CLAUDE_WEB.md` (57 l.) | Doutrina da trilha: só markdown, fontes de leitura permitidas, etiquetas de dependência 🟢/🟡/🟠 | ✅ atual | — |
| `docs_web/README.md` (54 l.) | Índice da trilha e o loop "web abastece · desktop executa" | ✅ atual | — |
| `docs_web/roster_digest.md` (139 l.) | **Snapshot manual do roster** (para o web não ler `.cs`) | ⚠️ snapshot manual → risco de deriva | `Domain/Waifus.cs` |
| `roadmap_web_specs|research|lore|marketing|skins|social.md` (297 l. total) | Motores de roadmap/pesquisa/lore/copy/prompts de skin e social | ✅ estrutura pronta | — |
| `docs_web/research/stonegy-online.md` (101 l.) | Pesquisa de franquia rival | ✅ | — |
| `docs_web/{concepts,lore,marketing,skins,social,specs}/` | **Vazias (`.gitkeep`)** | ⛔ **A trilha web foi montada mas quase não foi usada** | — |

**Conclusão da Fase 1.** A prática de documentação contínua é real e de qualidade acima da média:
todo roadmap tem prompts auto-contidos, critério de aceite, verificação e — o mais raro —
**registro de decisões descartadas com veredito** (DT-06..09, LM-06, decisões de não-mudança do
MG-06/MG-07). Isso é o ativo mais valioso do repo para o Huntbound: **não são só as decisões
tomadas, são as rejeitadas e o porquê.**

---

# B. DELTA — DOCUMENTAÇÃO × CÓDIGO

## B.1 — Documentação **atual** (confirmada no código, use sem reverificar)

| Tema | Doc | Confirmação no código |
|---|---|---|
| Roster de 7 Kaelis 5★ | `README.md` | `Domain/Waifus.cs` → `waifu:{eloa,seren,velvet,rin,rynna,lunara,gaia}` |
| Multiplicadores de Echo Break `1.8/2.1/2.4/2.8` | `README.md` | `GameConfig.cs:1075` `PostureDamageMultipliers = [1.8, 2.1, 2.4, 2.8]` |
| Postura: skills pressionam mais, fraqueza ×1.7, decay após 3s | `README.md` | `GameConfig.cs:1059-1067` (`PostureGainPerAuto 7` / `PerSkill 16` / `WeaknessMult 1.7` / `DecayDelayMs 3000`) |
| Dash: Knight blink 2 tiles + cleave 0.70; Archer haste 1800ms ×1.5; cooldown/i-frames compartilhados 2500/300 | `roadmap_dash_training.md` §Referência técnica | `GameConfig.cs:162-190` — **todos batem** |
| Training Room: 18×18 fixo, dummy 200k HP + 4%/s regen | `roadmap_dash_training.md` | `GameConfig.TrainingRoomSize=18`, `TrainingDummyHp/RegenPctPerSec`; `Engine/GameMode.cs:83` `TrainingModeStrategy` |
| Design tokens "Cathedral Ink + Aurum", acento duplo íris/aurum | `STYLE_GUIDE.md` | `frontend/src/styles.css` (409 l.) + `core/ui/{ui-button,ui-panel,currency-pill,rarity-stars}.ts` |
| HUD "Reliquary Combat": arcos de catedral, rosácea do ultimate, `--accent-el` por stance, cartouche de boss, minimap obsidiana | `design/gameplay_style_guide.md` | `pages/game/game.ts` — `.arch`, `.rosette`, `[style.--accent-el]="accentEl()"`, `.cartouche`, `.minimap`, `.arena-veil` |
| Modelo de papéis: role é o eixo primário, weapon é cosmético | `roadmap_meta_gameplay.md` MG-02 | `Domain/Waifus.cs` — `enum KaeliRole { Mage, Archer, Knight }`, comentário explícito "the old melee/ranged dichotomy died as a design concept" |
| Renderer Canvas 2D basta (draw p95 = 2.7ms vs. régua de 12ms) | `balance/perf_baseline_2026-07.md` | `core/renderer.ts` (1.656 l.) continua Canvas 2D |
| Reações elementais data-driven | `README.md`, F-E | `Domain/ElementReactions.cs` (63 l.) |
| Skills data-driven por shape com 11 shapes | `README.md` | `Domain/Classes.cs` — `single, area, cone, beam, nova, chain, ring, field, barrage, summon, buff` |
| Energia: 60/run, cap 300, regen 3/min | `README.md` | `GameConfig.cs:942-945` + `Meta/EnergyLedger.cs` |

## B.2 — Documentação **desatualizada**

| # | Doc | O que diz | O que o código diz | Gravidade |
|---|---|---|---|---|
| 1 | `roadmap/done/GDD.md` | "13 waifus"; "Cards de oferta **não** pausam o jogo (decisão de design)"; kits por waifu; 29 espécies | 7 Kaelis; cartas **pausam** o relógio (README + `GameWorld`); kits por **classe**; 50 monstros Kaezan autorais | 🔴 **Obsoleto** — documento histórico, não use |
| 2 | `DESIGN_NOTES.md` §11 | "roster caiu de 13 para **9 Kaelis** (3 por raridade, 4 classes)"; traits `executioner/fortress/chiller`; personagens Sylwen/Kaela/Mira/Aurora | 7 Kaelis, todas 5★; traits `judgment/discipline/decay/contagion/static_charge/shatter/prey`. Os kinds antigos existem só como *reserve* (`Waifus.cs`, comentário) | 🟠 Uma revisão (7×5★) passou por cima e a §11 não foi atualizada |
| 3 | `FABLE_TRACK.md` F-E (nota de entrega) | Multiplicadores de stagger `2.5 / 3.5 / 5 / 6.5×` | `GameConfig.cs:1075` → `[1.8, 2.1, 2.4, 2.8]` | 🟠 Foram re-tunados depois; a nota de entrega ficou congelada |
| 4 | `FABLE_TRACK.md` F-A · `DESIGN_NOTES.md` §4 | "depois de puxar **19 waifus**" | 7 | 🟡 Texto de motivação, não spec |
| 5 | `roadmap_dash_training.md` §Referência técnica + veredito DT-07 | `DashTrailFieldSpreadChance / …Generations = **20 / 1**` ("o spread fraco atual…") | `GameConfig.cs:196-197` → **0 / 0**, com comentário explícito: *"The dash trail does NOT spread (Contagion is a CAST-field identity, not a dash one)"* | 🟠 **Decisão revertida depois do doc.** O `README.md` também está errado aqui ("campos fracos que **se alastram** — Contágio") |
| 6 | `README.md` (linha do Painel Helper) | "abre o **editor de táticas** (gambit)" | Não existe. `grep -i gambit` no código: **zero ocorrências**. O painel tem Combat/Movement/Autopilot (on/off + slider) | 🟠 O próprio `roadmap_refactor_gameplay.md` G-10 documenta o re-escopo; o README manteve a frase antiga |
| 7 | `CLAUDE.md` / `AGENTS.md` | "Skills são data-driven por *shape* (`single\|beam\|nova\|area\|cone\|buff`) em **`Domain/Waifus.cs`**" | Skills vivem em **`Domain/Classes.cs`**; `Waifus.cs` tem identidade/trait/skins. São **11** shapes, não 6 | 🟠 Ponteiro errado — manda o agente ao arquivo errado |
| 8 | `FRONTEND_REMAP.md` Prompt 3 (nota de conclusão) + `README.md` | Rail da Home com **5 destinos** (Caçada/Kaelis/Recrutar/Mochila/Bestiário com subtítulos) | `pages/home/home.ts` — rail tem **3 itens**: `Start Hunt`, `Recruit`, `Contracts` (drawer). Nav completa migrou para a topbar do shell | 🟡 Simplificado depois pelo plano `cinematic-game-shell-ui` (Task 3, "Simplify Home Navigation") — a nota antiga ficou |
| 9 | `roadmap_i18n_english_migration.md` P09 | "varredura PT **zerada** fora de docs" | 2 resíduos: `pages/kaelis/kaelis.ts:32` `aria-label="Selecionar Kaeli"` · `pages/recruit/recruit.ts:121` `<span class="eyebrow">Resultados</span>` | 🟡 Aceite declarado sem estar 100% |
| 10 | `design/kaelis_kit_reformulation.md` (header) | "**Nada implementado ainda**" | Implementado: `Astral Sweep`, `Star Lance`, `Duelist's Call`, `War Cadence`, `Zenith`, `Dawn Ring`, `Storm Heart` em `Domain/Classes.cs` | 🟠 Header nunca atualizado |
| 11 | `design/kaelis_combat_archetypes_research.md` (header) | "**Nada implementado**" | Idem — a pesquisa foi consumida | 🟡 |
| 12 | `README.md` (links de "Documentos de planejamento") | Aponta para `docs/ROADMAP.md`, `docs/GDD.md`, `docs/FRONTEND_REMAP.md` | Os arquivos foram movidos para `docs/roadmap/done/` — **todos esses links estão quebrados** | 🟡 Higiene |
| 13 | `balance/perf_baseline_2026-07.md` §Achado novo | "`drawShockwaves` lança `IndexSizeError` (raio negativo)… Fix pontual: clampar `t = max(0, age)/SHOCKWAVE_MS`. Registrado como task separada" | `core/renderer.ts:1319-1338` — **o clamp não foi aplicado**; `const t = age / SHOCKWAVE_MS` sem `Math.max(0, …)` | 🟠 **Bug conhecido ainda aberto** |

## B.3 — Código **sem documentação** (ou com documentação apenas incidental)

| Área | Onde | Observação |
|---|---|---|
| **Tela `/hunt/:modeId` (`pages/mode/mode.ts`, 621 l.)** | frontend | Nenhum doc descreve esta tela como *seletor de tier*. Ela concentra: rail de 5 tiers, palco do boss, painel de intel (mobs/elites/clears/loot do boss), **seletor de tentativas 1–5**, custo de energia planejado e o **drawer de Queue Settings** (config de sessão idle). É a tela mais densa em regras de produto do jogo — e a menos documentada |
| **Catálogo de modos (`core/game-modes.ts`)** | frontend | 5 modos declarados (`Expedition` live, `Training Room` live, `Endless Abyss`/`Boss Rush`/`Squad Raid` `soon`). O array de modos "aspiracionais" que preenchem a tela não aparece em nenhum roadmap |
| **`startIdleSession` na tela de modo** | `mode.ts:600-620` | O fluxo alternativo "sessão idle encadeada pelo servidor + entrar como espectador" existe no código e no painel `session-panel` do `game.ts`, mas o **botão que o dispara não está no template** — código alcançável só via API. Sistema meio-conectado |
| **Modo Arena** | `Engine/GameMode.cs:43` | `GameMode.Arena = 1` existe no contrato cliente↔hub, mas `GameModeStrategy.For` faz `throw new NotImplementedException("Arena mode arrives in LM-04")`. **Seam pronto, implementação ausente** — documentado como pendente em `roadmap_dungeons.md`, mas não no README |
| **Painel admin (10 componentes, ~4.900 linhas)** | `pages/admin/*` | Descrito em prosa no README (bem), mas **sem doc de design/UX próprio**. `FRONTEND_REMAP.md` explicitamente o excluiu ("Admin é ferramental — NÃO redesenhar") |
| **`AccountState.Energy` não é serializado** | `Meta/AccountState.cs:39` vs `Api/MetaEndpoints.cs:58-60` | O endpoint expõe só a **config** (`energyPerRun/Cap/RegenPerMinute`), nunca o **valor corrente**. Nenhum doc registra essa lacuna |
| **9 classes para 7 Kaelis** | `Domain/Classes.cs:378-482` | `Sentinel` e `Barbarian` não têm Kaeli associada — classes órfãs/legado. Nenhum doc menciona |
| **Bug de crossfade / `sprite-lift`, `--rc`, `--bc`, `--bd`, `--mt` (variáveis CSS ad-hoc por tela)** | `prerun.ts`, `mode.ts`, `hunt.ts` | Convenção de tematização por tela **não** está no `STYLE_GUIDE.md` |

## B.4 — Divergências importantes (resumo priorizado)

1. **🔴 A pasta `docs/roadmap/{done,ongoing,not started}/` não é confiável como estado.**
   `roadmap_kaelis_kit_reformulation.md` está em *not started* e está implementado;
   `roadmap_hunts.md` está em *not started* com 3 de 9 prompts ✅;
   `roadmap_dungeons.md` está em *ongoing* e é o único que a classificação acerta.
   → **Para o Huntbound: derive estado dos marcadores `[x]`/`✅` dentro do arquivo, nunca do diretório.**
2. **🟠 Duas features "documentadas como existentes" não existem:** o *editor de táticas gambit*
   (README) e o *spread da trilha do dash do mago* (README + roadmap de dash).
3. **🟠 Um seam público exposto sem implementação:** `GameMode.Arena` no contrato cliente↔hub.
4. **🟠 Um bug medido e registrado, nunca corrigido:** `drawShockwaves` (`IndexSizeError`, ~8 frames
   abortados por sessão).
5. **🟡 Resina/energia é o maior descompasso doc↔produto:** existe backend completo, existe menção no
   README ("A UI **já mostra a conta de energia planejada** … para encaixar no sistema de resina"),
   e a UI de fato só mostra o **custo planejado** — nunca o saldo. Nem o README nem os docs marcam
   isso como incompleto.

---

# C. AUDITORIA GERAL — KEEP / REDESIGN / DROP / UNKNOWN

> Critério: **KEEP** = o conceito e as regras sobrevivem quase intactos; **REDESIGN** = a intenção
> sobrevive, a implementação não; **DROP** = específico do stack web/servidor ou decisão superada;
> **UNKNOWN** = precisa de teste/decisão antes de julgar.

## C.1 — KEEP (conceito comprovado, migra com custo baixo)

| # | Sistema | Por quê | Fonte | Como existe em Godot (conceito) |
|---|---|---|---|---|
| 1 | **Dash por papel (3 assinaturas)** | Trilha fechada com A/B feito em bancada dedicada; DT-06..09 descartados **com veredito escrito**. É a mecânica mais bem tunada do projeto | `roadmap_dash_training.md`; `GameConfig.cs:154-197` | Uma `Ability` com resolução por `role`: Blink (teleporte curto + AoE no pouso), Sprint (varredura ignorando corpos + `speed_modifier` temporário), Trail (slide + `Area2D` de campo). Cooldown/i-frames compartilhados. Cardinal-only |
| 2 | **Postura / Echo Break** | O sistema que transforma boss de "saco de HP" em dança de ritmo. Regras completas e tunadas: ganho por auto vs. skill, ×1.7 no elemento fraco, multiplicador por ciclo, bônus de %maxHP com CD interno, decay por ociosidade | `DESIGN_NOTES §3`; `FABLE_TRACK F-E`; `GameConfig.cs:1054-1082` | Segunda barra no recurso do boss + `stagger_until`; multiplicador de dano lido de uma tabela; sinal `posture_broken` que a apresentação escuta |
| 3 | **Reações elementais** | Matriz data-driven pequena (6 pares), dano **fracionário** (não multiplicador explosivo) — decisão de balance explícita e correta | `Domain/ElementReactions.cs`; F-E | `Resource` de matriz (`.tres`) + marca elemental por ator; lookup `(marca, gatilho)` no caminho de dano |
| 4 | **Modelo de papéis Knight/Mage/Archer como eixo primário** | Foi a maior correção arquitetural do projeto (MG-02): matou a dicotomia melee/ranged, tornou `weapon` cosmético e deu uma alavanca única de tuning (`RoleTuning`: dano auto/skill, intervalo, alcance, escala de AoE). **Validado por 1.750 runs simuladas** | `roadmap_meta_gameplay.md` MG-02/06/07/08 | `RoleTuning` como `Resource`; personagem referencia um role; kit vem da classe, não do personagem |
| 5 | **Skills data-driven por *shape*** | 11 shapes cobrem todo o roster sem dispatch paralelo. Invariante explícito: "para skill nova, prefira parametrizar um shape existente" | `Domain/Classes.cs`; `CLAUDE.md` | `SkillDef` como `Resource` com `shape` + params opcionais; um resolvedor de shape → tiles afetados |
| 6 | **Cadência de escolhas por *beats* (G-06)** | Level-up dá status pequeno **automático**; escolhas pesadas (1 de 3, máx 3 stacks) só em beats antecipáveis (fim de andar, Santuário de Eco). Alvo ~3/run. Resolve o problema clássico de "menu a cada 40s" | `roadmap_refactor_gameplay.md` G-06 | Idêntico — é regra de produto pura |
| 7 | **Reroll + banir cartas (Hades-style) + reroll pago** | Baixo custo, alto retorno de agência. Loja da run = reroll pago quando os grátis acabam | G-05, G-09 | Idêntico |
| 8 | **Helper / autoplay como *controle*, não como bot** | O jogo é autoplay-first; o painel expõe Combat (target/skills/ult + prioridade), Movement (Stand/Follow/Avoid), Autopilot (auto-heal com slider, auto-pick, auto-loot). **"Sem modo rush/skip de propósito"** é uma decisão de produto excelente | G-10; `game.ts:177-255` | Idêntico — as decisões são de design, não de stack |
| 9 | **Disciplina de skill do helper** | AoE só dispara com ≥N alvos (ou boss/elite); campo não é repintado onde já há fogo. Mata o "spam de skill no nada" | `README.md`; `GameConfig.AutoHelperAoeMinTargets` | Regra de utilidade no controlador de IA |
| 10 | **Estilo de helper por papel** | Ranged **orbita o centro** (ponto fixo → sem tremor) amontoando mobs pra AoE; melee **fecha box** e cleava; contra boss ranged **kita** e só planta no Echo Break | G-10; `README.md` | Estados de um behaviour tree/state machine |
| 11 | **Loot coletado automaticamente no abate** | Moedas/itens voam em arco até o personagem. Remove o atrito de pisar em tiles | `README.md` | Tween de arco + som; regra idêntica |
| 12 | **Baú dinâmico + saída dinâmica** | Baú **cai no corpo** a cada N mortes (surge no meio da luta); saída só abre como **teleporte no corpo do último mob**. Elimina "baú fixo espalhado" e o backtracking | G-09; `README.md` | Idêntico |
| 13 | **Baús amaldiçoados + mímicos telegrafados** | Magenta no mundo **e no minimapa** — risco legível, não gotcha | G-09 | Idêntico |
| 14 | **Arena orgânica por lóbulos + pilares + pockets + anfiteatro** | Mapgen v2 resolveu "quadradão eroído". Cada peça tem função de gameplay (pilares = cover que a IA orbita; pockets = risco/recompensa; anfiteatro = palco de boss) | `wave2-mapgen-v2.md`; `DungeonGenerator.cs` | Algoritmo puro — porta direto para GDScript/C# em Godot |
| 15 | **Validador de dungeon fail-fast** | `DungeonValidator` roda no fim de `Generate` e **aborta a run com mensagem clara** se algo sair injogável (entry bloqueado, floor desconectado, baú/escada inacessível) | `Engine/DungeonValidator.cs` | Idêntico — é rede de segurança barata e de alto valor |
| 16 | **Tipos de sala + ícone por tipo no minimapa** | Elite `!`, miniboss `×`, evento `?`, boss `★`. Salas fora do caminho crítico viram detour de risco/recompensa. Rota antecipável | G-07 | Idêntico |
| 17 | **Bioma por tier com atmosfera** | 5 biomas (caverna de terra → abismo), cada um com color-grade + névoa + vinheta + partículas | `Domain/Biomes.cs`; `core/renderer.ts:drawAtmosphere` | `CanvasModulate` + `WorldEnvironment` + `GPUParticles2D` por bioma. **Muito mais barato em Godot que em Canvas 2D** |
| 18 | **Design system "Cathedral Ink + Aurum"** | Regra de acento duplo (**íris = ação de UI; aurum = recompensa/premium — nunca troque os papéis**) é a decisão de UI mais valiosa do projeto. Simples, aplicável e verificável | `STYLE_GUIDE.md` | `Theme` do Godot + paleta em `.tres`; a regra de acento é doutrina, não código |
| 19 | **HUD "Reliquary Combat"** | Arco de catedral = slot de ação; rosácea = clímax (ultimate); tinta de elemento em runtime; **"um clímax só"** | `design/gameplay_style_guide.md` | `Control` custom com `draw_arc`/`NinePatchRect`; a rosácea vira um shader radial. §10 ("o que NÃO fazer") é uma checklist de anti-padrões pronta |
| 20 | **Anatomia empírica do Tibia (hunt/boss/city/quest)** | Medidas reais tiradas do `otservbr.otbm` — densidade de spawn, dimensões de sala, layout de câmara de boss | `docs/mapping/*.md`; `design/tibia_map_patterns.md` | Puro design. **Leitura obrigatória antes de qualquer gerador no Huntbound** |
| 21 | **Determinismo por seed + replay como *gate* de refactor** | Toda run gera replay (seed + command log + hashes SHA-256); `--replay-check` re-simula e bissecta o primeiro tick divergente. É o teste de regressão que protege o engine | `README.md` §Invariantes; `Engine/Replay.cs`, `GameWorld.Replay.cs` | **KEEP como disciplina, não como transporte** (ver C.2 #4) |
| 22 | **Simulador headless de balance** | `tools/BalanceSim` roda 1.750 runs e emite pivôs. Transformou balanceamento de "achismo" em dados — os CSVs before/after de MG-06/07/08 provam | MG-01; `docs/balance/*.csv` | Um `--headless` do Godot rodando a simulação sem render. **Alta prioridade** |
| 23 | **"Less grinding, more playing" + morte não-catastrófica** | Pilares herdados; derrota mantém metade do ouro + XP. Alinha 1:1 com a tese do Huntbound | `DESIGN_NOTES §1` | Doutrina |
| 24 | **Dupes nunca são lixo · pity transparente** | Padrão de mercado consolidado. Roll que não acerta personagem entrega **1 item aleatório** (nada de roll vazio) | `DESIGN_NOTES §12`; `Meta/GachaService.cs` | Regra de produto |

## C.2 — REDESIGN (a intenção sobrevive; a implementação não migra)

| # | Sistema | Problema no port | Direção em Godot |
|---|---|---|---|
| 1 | **Renderer** | `core/renderer.ts` = 1.656 linhas de Canvas 2D imperativo: câmera, escala por frame, atlas manual, interpolação, camadas, tile-shade, minimap, FX, texto de dano. Em Godot, ~80% disso é **engine** | `TileMapLayer` (chão/borda/decor/parede), `Node2D`/`AnimatedSprite2D` por ator, `Camera2D` com `limit_*` e smoothing, `CanvasLayer` para HUD. **Sobrevivem apenas as decisões**: ~11 tiles verticais visíveis (câmera Tibia), buffer de 1 tick de histórico, suavização de deriva de relógio |
| 2 | **`AssetsService` (523 l.)** | Recolor de outfit HSI (133 cores) em runtime + patterns/phases + atlas merge. É reimplementação em TS do `outfit.cpp` do OTClient | Se o Huntbound usar **arte autoral chibi** (que o Arena Fable já preferia: `lookType 900101–900108`), a recoloração em runtime **some**. Se precisar: `ShaderMaterial` com paleta — 1 shader vs. 523 linhas |
| 3 | **`prerun` / `mode` / `hunt` como 3 rotas** | Três telas full-bleed para escolher *modo → tier → personagem*. Muito clique para um jogo que quer "sessão de 15 min" | Ver §D.7 — proposta de fusão em **2 passos** |
| 4 | **Backend autoritativo + SignalR (tick 100ms, snapshot por conexão)** | Não faz sentido em single-player Godot; é o maior custo de complexidade herdado (`RunManager`, `GameHub`, dedup de eventos por `seq`, janela de replay de 10 ticks, reconexão, toasts de conexão) | **Manter o *seam*, jogar fora o transporte.** Um `SimulationCore` puro (sem `Node`, sem input direto, sem `randf()` global — só um `RandomNumberGenerator` seedado) avança por tick fixo e emite eventos; a camada de apresentação **só consome**. Preserva determinismo, replay e o `BalanceSim` — sem rede |
| 5 | **Painel Helper (UI)** | O painel atual é bom em regras e denso em DOM. Em Godot merece ser uma cena reutilizável | `PanelContainer` + `VBoxContainer` de seções; toggles como `Button` `toggle_mode`; o *readout* em linguagem natural ("Exploring & looting · hitting the nearest foe · auto-healing.") **é a melhor ideia da tela — manter literalmente** |
| 6 | **Sessão idle / auto-repeat / progressão offline** | Existe e funciona (`SessionOrchestrator`, `SessionPlan`, `EnergyLedger`), mas é meio-conectado na UI (drawer de Queue Settings sem botão de start visível) e conflita com o pilar declarado "evitar stamina/energia" (`DESIGN_NOTES §12`) | Decidir **antes** de portar: (a) sem energia, auto-repeat livre; (b) energia só como gate de *chaining* automático (foi a resolução do Arena Fable — runs manuais nunca são bloqueadas), com **saldo visível**. Ver §D.5 |
| 7 | **Página Kaelis (1.249 l., 5 abas)** | Perfil/Maestria/Equipamento/Informação/Skins numa única tela full-bleed. Conceito ótimo, arquivo monolítico | Cena `KaeliAtelier` + uma cena por aba (`TabContainer` ou troca manual). Rail de roster como `ItemList`/`GridContainer` |
| 8 | **Reveal de convocação (CSS puro, 2 fases)** | Charge (círculo arcano + raios na cor da maior raridade) → burst → cards em cascata. Excelente em concepção; implementado como ~300 linhas de CSS+timers | Em Godot é **mais fácil**: `AnimationPlayer` + `GPUParticles2D` + shader de light-sweep. A **coreografia** (antecipar a raridade na cor **antes** do reveal) é o que vale |
| 9 | **Cutscene Remotion (`tools/cinematics`)** | Projeto React separado que renderiza `.webm` e copia para `public/assets/` | Godot faz isso nativo: `AnimationPlayer` numa cena de cutscene, ou `VideoStreamPlayer` se o vídeo pré-renderizado for mantido |
| 10 | **Tematização por tela via CSS vars ad-hoc** (`--bc`, `--bd`, `--mt`, `--rc`, `--el`) | Padrão real e útil (cada tela se tinge pelo bioma/raridade/elemento do contexto) mas **não documentado** e espalhado | Em Godot: `theme_override` propagado + `material.set_shader_parameter("accent", …)`. Formalizar como **um** contrato ("toda tela contextual declara `accent` e `deep`") |
| 11 | **Bestiary (64 l.) e Backpack (117 l.)** | As duas telas mais rasas do jogo — grid simples, sem filtro, sem busca, sem agrupamento. O Backpack ainda usa emoji `🪙` como ícone de moeda (violando a própria regra §10 do gameplay style guide) | Merecem redesenho, não port. Bestiary → grade com sprite + progresso por rank; Backpack → grade com filtro por slot/tier e ação em lote |
| 12 | **Admin (10 telas, ~4.900 l.)** | Editor de conteúdo (monstros, itens, skins, roles, banners, biomas, Map Lab). Foi explicitamente excluído do design system | **O editor do Godot já é isso.** Conteúdo vira `Resource` (`.tres`) editado no inspector; o Map Lab vira uma cena de dev (ou um plugin `EditorPlugin`). Ganho enorme: 4.900 linhas → configuração nativa |

## C.3 — DROP (não migrar)

| # | Item | Por quê |
|---|---|---|
| 1 | **SignalR / ASP.NET Core / EF Core / MySQL** | Infra de servidor para um jogo single-player. Save local (`user://`) resolve. `docs/DESIGN_NOTES §7.5d` já dizia "nada de DB dentro do tick" — em Godot, nada de DB, ponto |
| 2 | **Reconexão, toasts `Reconnecting…`/`Connection lost`, resume de run estacionada por 60s** | Só existem porque há rede |
| 3 | **Dedup de eventos por `seq` + janela de replay de 10 ticks** | Solução para snapshot perdido/coalescido. Sem rede, o problema não existe |
| 4 | **Preload de atlases antes do join** | Godot tem preload/`ResourceLoader` assíncrono nativo |
| 5 | **Angular (standalone components, signals, `@if`/`@for`, `RouterLink`, lazy `loadComponent`)** | Substituído inteiramente por cenas Godot |
| 6 | **CSS: `backdrop-filter`, `color-mix()`, `clamp()`, `conic-gradient`, media queries, budgets de CSS por componente** | Godot não tem cascata. `backdrop-filter` (o "vidro" que é a assinatura do design) precisa de `BackBufferCopy` + shader de blur — **avaliar custo antes de adotar como linguagem base** |
| 7 | **`prefers-reduced-motion`** | Vira uma opção explícita no menu de acessibilidade do jogo (melhor: o jogador escolhe, não o SO) |
| 8 | **Sprites/assets do Tibia (CipSoft)** | O próprio README marca: *"propriedade da CipSoft — uso apenas em projeto privado/educacional"*. **Não é base defensável para um produto.** O caminho autoral já estava começando (`assets/kaelis/<slug>/outfit-cardinal.png`, `lookType 900101+`) |
| 9 | **`tools/AssetExtractor` (protobuf + LZMA + header CIP)** | Existe só para extrair assets do Tibia. Sem assets do Tibia, sem extractor |
| 10 | **`tools/convert-monsters` (Lua → JSON via wasmoon)** | Idem. O Arena Fable já migrou para **50 monstros Kaezan autorais**; as espécies Lua ficaram só como biblioteca visual/legado |
| 11 | **Terminologia `waifu:*` no código** | ID estável no Arena Fable por compatibilidade de conta. O Huntbound começa limpo — não herde o débito de nomenclatura (a UI já dizia "Kaeli" enquanto o código dizia "waifu") |
| 12 | **Migração i18n PT→EN e o roadmap de switch de idioma** | Débito específico do Arena Fable. Huntbound: **decida o idioma no dia 1** e, se houver mais de um, use `TranslationServer` desde o começo |
| 13 | **Angular CSS budgets (`anyComponentStyle` elevado para 14/16kB)** | Sintoma de telas monolíticas. Não é um problema a herdar |

## C.4 — UNKNOWN / NEEDS TEST

| # | Item | O que precisa ser decidido/testado |
|---|---|---|
| 1 | **Echo Team (F-A) — 1 ativo + 2 companions IA** | **Nunca implementado.** `DESIGN_NOTES §4` e `FABLE_TRACK F-A` chamam de "a feature mais importante do projeto" (o elo coleção→gameplay). O Huntbound tem gacha no escopo? Se sim, isto é a decisão #1. Riscos já mapeados: determinismo da IA, anti-bodyblock, `CompanionEfficiency` como alavanca de balance |
| 2 | **Resina/energia** | Backend completo, UI inexistente, e o próprio `DESIGN_NOTES §12` lista "stamina/energia" em **"Evitar"**. Precisa de decisão de produto explícita antes de qualquer tela |
| 3 | **Modo Arena (survival waves)** | Seam exposto (`GameMode.Arena = 1`) + `NotImplementedException`. LM-04/05 nunca rodaram. Vale como 2º modo do Huntbound? |
| 4 | **Desafio Diário + leaderboard (F-C)** | Depende de determinismo por seed de data. Não implementado. Encaixa em single-player? |
| 5 | **Sealed Reward / Echo Cache** | `DESIGN_NOTES §5` — baú pós-boss com parte fixa + parte rerollável, coleta persistente estilo reward chest. Marcado 🔜 há muito tempo, nunca feito. Barato e de alto retorno |
| 6 | **Forge / craft com Material de Eco** | Os `Estilhaço de Eco · T{tier}` **já dropam** e aparecem na aba Equipamento, mas o README diz "forja/craft fica para depois". **Recurso sem sumidouro** — sistema pela metade |
| 7 | **Sobrevivência do Knight nos tiers altos** | Resíduo explícito e medido do MG-08: Seren/Rynna com 11–65 mortes em T3–T5; morrem por *spike de pacote*, não atrito. O fix apontado é **defesa por papel** (campo novo em `RoleTuning`) — nunca feito. **Se o Huntbound reusar o modelo de papéis, este é um buraco conhecido a fechar** |
| 8 | **Ordem de blocos do `RoleTuning`** | `RoleTuning` não tem alavanca de HP/defesa. MG-07 documenta isso como gap estrutural |
| 9 | **Custo do "vidro" (glass/backdrop blur) em Godot** | O design system inteiro é construído sobre vidro com `backdrop-filter` + crystal edge. Em Godot exige `BackBufferCopy`+blur por painel. **Fazer um spike de performance antes de adotar** — se sair caro, o crystal edge (hairline de luz no topo) sozinho já carrega quase toda a assinatura |
| 10 | **Alvo de plataforma** | O Arena Fable é browser com responsivo até 375px. O Huntbound é Godot desktop (`renderer Compatibility`, Windows 64-bit). Todo o trabalho de responsivo/mobile do Arena Fable pode ser **descartado** — mas isso muda densidade de informação e tamanho de alvo de clique |
| 11 | **Pausa de simulação em oferta de carta** | O GDD original decidiu "não pausar" (action roguelike); o estado atual **pausa**. Reversão nunca documentada como decisão. Qual é a intenção final? |

---

# D. AUDITORIA ESPECÍFICA DE UI/UX

## D.1 — Mapa de telas (estado real do código)

Rotas em `frontend/src/app/app.routes.ts`:

| Rota | Componente | Linhas | Papel |
|---|---|---:|---|
| `/` | `pages/home/home.ts` | 418 | **Home Hub** — vitrine da Kaeli fixada |
| `/hunt` | `pages/hunt/hunt.ts` | 265 | **Seletor de modo** (5 modos, 2 live) |
| `/hunt/:modeId` | `pages/mode/mode.ts` | 621 | **Seletor de tier + briefing + plano de farm** |
| `/play/:tier` | `pages/prerun/prerun.ts` | 427 | **Deploy** — escolha da Kaeli |
| `/game/:tier` | `pages/game/game.ts` | 1.696 | **Run** (canvas + HUD) — **fora do shell** |
| `/recruit` | `pages/recruit/recruit.ts` | 869 | **Gacha** — banner, pity, reveal |
| `/kaelis` | `pages/kaelis/kaelis.ts` | 1.249 | **Ateliê de personagem** (5 abas) |
| `/backpack` | `pages/backpack/backpack.ts` | 117 | Inventário + venda |
| `/bestiary` | `pages/bestiary/bestiary.ts` | 64 | Ranks por espécie |
| `/admin` | `pages/admin/*` | ~4.900 | Ferramental (7 abas) |
| — | `shell/shell.ts` | 349 | **Topbar persistente** (envolve tudo menos `/game`) |

**Decisão estrutural herdada, e é a certa:** `/game/:tier` fica **fora do shell**. Combate é
full-bleed sem chrome de navegação. Em Godot: cena de jogo separada da cena de menus.

## D.2 — Fluxo de navegação

```
                    ┌───────────────── SHELL (topbar persistente) ─────────────────┐
                    │  logo · Home Hunt Kaelis Recruit Backpack Bestiary           │
                    │  Lv · 🪙 gold · ✦ kaeros · [offline +N] · ⚙ tools           │
                    └──────────────────────────────────────────────────────────────┘
                                              │
      ┌────────────┬──────────────┬───────────┼───────────┬────────────┬──────────┐
      ▼            ▼              ▼           ▼           ▼            ▼          ▼
   / (Home)     /hunt         /kaelis     /recruit    /backpack   /bestiary   /admin
      │            │              ▲           ▲                                (⚙)
      │            │              │           │
      │  ┌─────────┘              │           │
      │  ▼                        │           │
      │ /hunt/dungeon ────────────┼───────────┘
      │  (tier + attempts         │
      │   + queue settings)       │
      │         │                 │
      │         ▼                 │
      │  /play/:tier ─── "Details" ┘        [Home → CTA "DROP RATE UP"] ──► /recruit
      │  (escolha da Kaeli)                 [Home → rail "Start Hunt"] ──► /hunt
      │         │                           [Home → drawer "Contracts"] (in-place)
      │         ▼
      └──► /game/:tier   ◄── atalho: /hunt → Training Room pula o tier (mode=training)
             │  (FORA do shell)
             ├─ overlay: card offer (pausa a simulação)
             ├─ overlay: hunt backpack (B)
             ├─ overlay: perf F3 · seed panel (só Training)
             └─ overlay: run end ──► "Play again" (loop) | "Back to Hunt"
```

**Profundidade até o combate:** Home → Hunt → Mode → Prerun → Game = **4 cliques**.
Com o atalho de Training Room: **2 cliques**.

## D.3 — Responsabilidade de cada tela

| Tela | Responsabilidade única | Informação apresentada | Ações |
|---|---|---|---|
| **Home Hub** | Ser a *vitrine da personagem fixada* — identidade, não navegação | Wallpaper full-bleed · tag de elemento · estrelas · nome (display) · título · descrição · pin-picker de roster · CTA do banner ativo · contador de contratos prontos | Trocar destaque · ir para Hunt/Recruit · abrir drawer de contratos · resgatar contrato |
| **Hunt (modos)** | Escolher **que tipo de jogo** jogar | Rail de 5 modos (ícone, nome, tagline, badge `Soon`) · descrição do modo · "The descent — 5 strata" (5 tiers com cor de bioma) · fatos (5 tiers / 2 andares / 1 boss) | Selecionar modo · `Enter expedition` |
| **Mode (tier)** | Escolher **onde** e **quanto** — briefing + plano de farm | Rail de 5 tiers (romano, nome, bioma, ×mult, ✓clears, 🔒lock) · **sprite do boss em palco** · nome do boss · descrição · fatos (mult/mobs/elites/clears) · lista nominal de mobs e elites · **faixa de loot do boss (ícones)** · slider de tentativas 1–5 · **custo de energia planejado** · Queue Settings | Selecionar tier · ajustar tentativas · abrir drawer de fila · `Choose Kaeli` |
| **Prerun (deploy)** | Escolher **quem** — e nada mais | Numeral romano gigante de fundo · badge de tier/bioma/mult · "Choose who will face **{boss}**" · roster próprio (retrato, elemento, estrelas) · herói full-body da selecionada · plano de runs | Selecionar Kaeli · `Details` (→ /kaelis) · `Continue` |
| **Game (run)** | Jogar | Plaque (classe, stance, HP, XP, Lv, kills/gold/tier, equip) · chips de buff/condição · **passiva assinatura com barra viva** · cartouche de boss (HP + postura) · minimap · action bar (4 arcos + rosácea + poção + dash) · helper panel · pills de sistema | Mover · dash · skills · ult · poção · bag · toggle stance · helper · sair |
| **Recruit** | Convocar | Arte do banner full-bleed · rail de banners · nome · **pity ("Kaeli in N summons" + barra + 80)** · garantia de destaque · callout da destacada com `UP!` · modal de taxas | ×1 · ×10 · trocar banner · abrir taxas · skip/close no reveal |
| **Kaelis (ateliê)** | Aprofundar uma personagem | Ambiente full-bleed com a arte da própria Kaeli desfocada · rail de roster (com cadeado nas não-possuídas) · idle rotativo + rosácea + floor-glow do elemento · identidade · **5 abas**: Perfil (ATK/HP/afinidade/ascensão/trait/personalidade) · Maestria (3 ramos × nós) · Equipamento (paperdoll + tier set + Materiais de Eco) · Informação (lore/ecos) · Skins | Presentear · ascender · gastar/respec maestria · equipar · trocar skin |
| **Backpack** | Vender loot | Grade de itens (ícone, nome, ×N, slot+stats ou "Sell value loot") | Vender 1 · vender tudo |
| **Bestiary** | Mostrar progresso por espécie | Nome · kills · rank · barra | — (somente leitura) |

## D.4 — Componentes recorrentes (o vocabulário real da UI)

**Primitivos formais** (`core/ui/`, contratados no `STYLE_GUIDE.md`):

| Componente | Uso | Variantes |
|---|---|---|
| `<ui-button>` | Ações | `primary` (íris) · `gold` (recompensa) · `ghost` · `loading` · `disabled` |
| `<ui-panel>` | Cartão de vidro | `header`, `eyebrow`, `solid`, slot `[actions]` |
| `<currency-pill>` | Moeda | `icon`, `value`, `tone="gold"`, botão `+` opcional |
| `<rarity-stars>` | Raridade | `rarity`, `size` |
| `<app-kaeli-idle>` | Idle rotativo | 3 poses, crossfade sem flash, 7s, fallback para sprite |
| `<app-outfit-preview>` / `<app-outfit-thumb>` | Sprite de personagem | recolor + addons + mount |
| `<app-item-icon>` | Ícone de item | `itemId`, `size`, moldura por tier, marca dourada de relíquia |

**Padrões informais recorrentes** (não estão no style guide, mas são o esqueleto de todas as telas):

| Padrão | Onde aparece | Descrição |
|---|---|---|
| **Rail de seleção lateral** | hunt (modos) · mode (tiers) · recruit (banners) · kaelis (roster) · prerun (roster) | Coluna vertical de itens; item ativo tinge pelo contexto. **É o componente mais reusado do jogo** |
| **Palco/alcova central** | mode (boss) · prerun (Kaeli) · kaelis (Kaeli) | Sprite/arte em destaque com `floor-glow`, vinheta e (em Kaelis) rosácea pulsante |
| **Painel de intel lateral** | mode · prerun · kaelis (dossiê) | Bloco de texto+dados à direita do palco |
| **Fundo full-bleed + `scrim`/`wash`/`veil`** | todas as telas cinematográficas | 3 camadas: imagem → gradiente de legibilidade → conteúdo |
| **Eyebrow** | todas | Rótulo uppercase com tracking; regra: *"rotulam com verdade, nunca decoração"* |
| **Faixa de fatos** (`.facts` / `.mode-facts`) | hunt · mode | Números grandes em display + label pequeno uppercase |
| **Drawer + scrim** | home (contratos) · mode (queue settings) · recruit (taxas) | Painel deslizante sobre scrim clicável — **o padrão de "informação secundária" do jogo** |
| **Barra de progresso com `fill`** | ~15 usos | HP, XP, postura, afinidade, pity, contrato, bestiary |
| **Chip/pill de estado** | game (buffs, condições, stance, sys) · kaelis (classe/arma) | Retângulo arredondado tingido pelo contexto |
| **Botão `.pill-btn`** | hunt · mode · prerun | CTA principal das telas cinematográficas (fora do sistema `ui-button` — **inconsistência real**) |
| **Numeral romano gigante fantasma** | prerun (`.tier-ghost`) | Marca d'água de tier |
| **Tematização por contexto** | `--bc`/`--bd` (bioma) · `--rc` (raridade) · `--el`/`--accent-el` (elemento) | Variável CSS setada no elemento raiz da tela e herdada |

## D.5 — Informação apresentada por sistema (e onde ela falta)

| Sistema | Onde é mostrado | Estado |
|---|---|---|
| **Ouro / Kaeros / Nível de conta** | Topbar do shell (`currency-pill`) — persistente | ✅ Sempre visível |
| **Recompensa offline** | Topbar (`offline-pill`, condicional) | ✅ |
| **XP de conta** | Drawer de contratos da Home | 🟡 Escondido |
| **Contratos diários** | Drawer da Home + badge de contagem no rail | ✅ |
| **Pity de gacha** | Recruit, faixa dedicada ("Kaeli in N summons" + barra + /80 + garantido) | ✅ Transparente, padrão de mercado |
| **Progresso de tier (clears)** | Rail de tiers (mode) `✓N` | ✅ |
| **Gate de nível de conta** | Rail de tiers `🔒` + mensagem "Unlocks at account level N" | ✅ |
| **Afinidade / ascensão / maestria** | Kaelis (abas) | ✅ |
| **Materiais de Eco** | Kaelis → aba Equipamento (faixa) | 🟡 Recurso sem sumidouro (craft não existe) |
| **⚠️ ENERGIA / RESINA (saldo)** | **Em lugar nenhum** | 🔴 **Só o *custo planejado* aparece (mode.ts:110-111). O saldo corrente (`AccountState.Energy`) nunca é serializado.** O jogador não sabe quanta energia tem, nem quando regenera |

**Implicação para o Huntbound:** se resina entrar, ela precisa de (a) pill persistente na topbar
com `atual/cap`, (b) timer de próxima regeneração, (c) previsão "cheia às HH:MM" e (d) o custo
projetado onde se gasta. **Nada disso pode ser portado — tem que ser desenhado.**

## D.6 — Estados (vazio / loading / erro)

| Estado | Cobertura | Exemplos concretos |
|---|---|---|
| **Vazio** | ✅ **Bom** | Home: *"Your arena awaits — Recruit a Kaeli from the banner to pin her here as your protagonist"* + CTA (excelente: converte vazio em ação) · Prerun: *"You have not recruited any Kaelis yet"* · Backpack: *"Empty backpack — go hunt!"* · Bestiary: *"No kills recorded yet — go hunt!"* · Bag da run: *"Nothing collected yet — go hunt!"* · Loot do boss: *"Loot not cataloged."* |
| **Loading** | 🟡 **Irregular** | Prerun: `"Loading tier..."` (texto cru) · Home drawer: `"Loading contracts..."` · Game: overlay com **rosácea girando** + copy de mundo (*"Preparing the hunt…"* / *"Entering the dungeon…"* / *"Shaping the dungeon…"*) — **o único loading com produção**. Prerun e Kaelis usam **polling com `setInterval(150ms)`** até o catálogo chegar (anti-padrão herdado, corrigido só quanto ao vazamento de timer no Prompt 9) |
| **Erro** | 🔴 **Fraco** | Sem tela de erro. Só há: toasts de conexão SignalR (`Reconnecting…` âmbar / `Connection lost` vermelho) e `DungeonValidator` abortando a run com mensagem. **Nenhuma tela trata falha de carregamento de catálogo/conta** — ficam em loading indefinido |
| **Bloqueado / gated** | ✅ | Tier travado: item do rail com `🔒` + `.lock-msg` no lugar do CTA · Modo `soon`: badge + botão desabilitado · Kaeli não possuída: cadeado no rail de roster · Botões de pull desabilitados sem saldo |
| **Progresso/pendência** | ✅ | Contrato pronto: botão `Claim` dourado; resgatado: `✓ Claimed`; em progresso: barra + `N/M` |

## D.7 — Padrões de interação

| Padrão | Descrição | Julgamento |
|---|---|---|
| **Seleção-então-confirmação** | Todo rail seleciona e atualiza um painel; um CTA separado confirma e avança | ✅ **Manter** — dá liberdade de explorar antes de commitar |
| **Drawer sobre scrim** | Info secundária nunca ocupa a tela principal (contratos, queue settings, taxas) | ✅ **Manter** — é o que mantém as telas-vitrine limpas |
| **Overlay que pausa** | Oferta de carta pausa a simulação; timeout de 20s aplica a primeira opção | ✅ Manter, com o auto-pick do helper como padrão |
| **Atalhos de teclado no jogo** | WASD/setas + QEZC (diagonais) · Espaço (dash) · 1-4 (skills) · R (ult) · T (poção) · B (bag) · Tab (stance) · V (mirar) · F (interagir) · F3 (perf) · ESC (sair) | ✅ Bem distribuído. **Nota de design real:** o dash saiu de Shift porque *5× Shift abre o popup de Teclas de Aderência do Windows* — lição concreta a herdar |
| **Skip / reduced-motion no reveal** | Clique no fundo pula enquanto revela, fecha quando concluído; botões explícitos | ✅ **Manter** — respeito ao tempo do jogador |
| **Configuração persistida por personagem** | Helper: `Save as default` grava por Kaeli e recarrega na próxima run dela | ✅ **Excelente** — a config segue o personagem, não a conta |
| **Auto-repeat de lote** | Slider 1–5 tentativas; o cliente reinicia o mesmo tier após cada encerramento | ✅ Manter conceitualmente |
| **Indicador de destino do autopilot** | Marcador pulsante no tile-alvo (na tela) ou seta na borda (fora da tela); roxo = baú/altar, ciano = saída. **Vem do backend (`run.navTarget`); o cliente só desenha** | ✅ **Manter** — é o que torna o autoplay legível |
| **Legibilidade do helper** | Retículo animado no alvo + linha de intenção (dourados quando há skill pronta). O *telegraph* de footprint foi **removido** — "tirava o ar do jogo" | ✅ Manter, **incluindo a rejeição do telegraph** |
| **Feedback de impacto client-side** | Hit-stop, screen-shake proporcional, números com outline/pop, crit maior e dourado, proc text, flash aditivo, dissolve por pixels. **Intensidade sempre vinda do dado do servidor, nunca de RNG no front** | ✅ **Manter, incluindo o princípio** — apresentação não inventa dados |
| **Emoji como ícone** | `🪙` `✦` (topbar, backpack) · `⚔` `🎯` `♾` `👑` `🛡` (modos) · `🔒` `☠` `📜` | 🔴 **Contradiz a própria regra** (`gameplay_style_guide.md` §10: *"Emoji como ícone de botão/moeda"* está na lista do que NÃO fazer). O HUD de combate obedece; o resto do app não. **Corrigir no Huntbound: ícones autorais desde o dia 1** |
| **Polling com `setInterval` para esperar dados** | `prerun.ts`, `kaelis.ts` | 🔴 Anti-padrão. Em Godot: `await` no sinal de carregamento |
| **Dois sistemas de botão coexistindo** | `<ui-button>` (Recruit) vs `.pill-btn` (hunt/mode/prerun) vs `.btn`/`.btn.gold` (home/kaelis/backpack) | 🟠 **3 vocabulários de botão.** Consolidar em **um** no Huntbound |

## D.8 — Referências visuais internas disponíveis

Material visual já capturado no repo, útil como referência de direção:

| Caminho | O que é |
|---|---|
| `docs/superpowers/specs/audit-shots/ref-{thais-city,mint-wallin,orc-throne,troll-cave,rotworm-cave}.png` | **Referências reais do Tibia** usadas como alvo de qualidade da geração |
| `docs/superpowers/specs/audit-shots/t{1..5}-s{101,202,303}[-boss][-t5-after].png` (25 imagens) | Antes/depois da geração por tier e seed — auditoria visual do mapgen |
| `docs/superpowers/plans/task10-authored-prefabs-preview.png` | Preview de prefabs autorais |
| `docs/prompts/hunt-redesign/{hunt-menu,hunt-dungeon,prerun}-anchor.png` | **Âncoras visuais das 3 telas de caçada** — o alvo do redesign cinematográfico |
| `frontend/public/assets/biomes/tier-{1..5}.webp` | Wallpapers panorâmicos por bioma (usados como fundo de hunt/mode/prerun) |
| `frontend/public/assets/kaelis/<slug>/{idle-1..3,wallpaper,bg-landscape,bg-portrait,banner,thumb}.png` | **Contrato de arte por personagem** — 8 assets com papéis definidos |
| `frontend/public/assets/cinematics/gacha-5star.webm` | Cutscene de invocação 5★ (15s, Remotion) |

**Contrato de arte por personagem — vale herdar literalmente.** É a decisão que permitiu telas
full-bleed com fallback gracioso:

| Asset | Papel |
|---|---|
| `idle-1/2/3` | Poses de corpo inteiro, fundo transparente → rotação com crossfade (7s) na tela de personagem |
| `wallpaper` | Cena completa landscape (personagem **dentro**) → Home Hub |
| `bg-landscape` | Cenário vazio landscape → camada de parallax |
| `bg-portrait` | Cenário 9:16 → fundo da tela de personagem |
| `banner` | 2:1, personagem à direita → tela de gacha |
| `thumb` | Busto quadrado → rails, cards, reveal |

**Regra de fallback (também vale herdar):** o serviço devolve `null` quando falta arte; o
componente cai para (a) sprite in-game ou (b) gradiente pelo elemento. **Nunca reusar a arte de um
personagem em outro.**

## D.9 — Proposta conceitual de reconstrução em Godot

> Conceitual e apenas conceitual: cenas, nós e responsabilidades. Sem implementação.

### Arquitetura de cenas

```
Main (Node)
├── SimulationCore            # sem Node de render, sem input, RNG seedado → determinismo + replay
├── ScreenStack (CanvasLayer) # gerencia a "rota" atual (substitui o Router do Angular)
│    └── <tela ativa>
├── PersistentBar (CanvasLayer)   # equivalente ao shell: moedas, nível, acesso a menus
├── OverlayLayer (CanvasLayer)    # drawers, modais, reveal, oferta de carta
└── ToastLayer (CanvasLayer)
```

### Mapa de componentes conceituais

| Conceito do Arena Fable | Equivalente idiomático em Godot |
|---|---|
| Shell + `RouterOutlet` | `ScreenStack` trocando cenas (`PackedScene`); `PersistentBar` num `CanvasLayer` acima |
| Rail de seleção | Cena `SelectionRail` reutilizável: `VBoxContainer` de `SelectionRailItem` (`Button` `toggle_mode` + `ButtonGroup`), emitindo `item_selected(id)` |
| Palco/alcova | Cena `CharacterStage`: `TextureRect` de fundo + `AnimatedSprite2D`/`TextureRect` da figura + `floor_glow` (`ColorRect` com shader radial) + vinheta |
| Painel de intel | `PanelContainer` + `VBoxContainer`, alimentado por um `Resource` de dados |
| Fundo full-bleed + veil | `TextureRect` (`STRETCH_KEEP_ASPECT_COVERED`) + `ColorRect` com `ShaderMaterial` de gradiente. Mais barato que os 4 gradientes CSS empilhados |
| Drawer + scrim | Cena `Drawer`: `Control` full-rect (scrim, `mouse_filter = STOP`) + `PanelContainer` animado por `AnimationPlayer` |
| Eyebrow | `Label` com `LabelSettings` compartilhado (uppercase + spacing) — **um** recurso, não uma classe CSS |
| Barra de progresso | `ProgressBar` com `StyleBoxFlat` por papel (hp/xp/postura/afinidade/pity) |
| Chip/pill | Cena `Chip`: `PanelContainer` + `Label`, cor via `theme_override` ou shader param |
| `currency-pill` | Cena `CurrencyPill`: ícone (`TextureRect`, **não emoji**) + `Label` + `+` opcional |
| `rarity-stars` | `HBoxContainer` de `TextureRect`, cor pelo token de raridade |
| Design tokens (`:root` CSS vars) | Um `Theme` global + um `Resource` `KaezanPalette.tres` (cores, raridades, elementos). Tematização contextual = `shader_parameter` propagado, não herança de cascata |
| Vidro (`backdrop-filter`) | `BackBufferCopy` + `ShaderMaterial` de blur no `PanelContainer`. **Fazer spike de custo antes de adotar como base** — o *crystal edge* (hairline no topo) sozinho já carrega quase toda a assinatura |
| Arco de catedral (slot de skill) | `NinePatchRect` com a silhueta ogival, ou `Control` com `_draw()` custom |
| Rosácea do ultimate | `Control` com shader: anel cônico preenchido pelo gauge + raios `repeating` no miolo, tingido pelo elemento |
| Cooldown (varredura cônica) | Mesmo shader com parâmetro `progress` — **não** a "cortina subindo" |
| Idle rotativo com crossfade | `AnimationPlayer` alternando alpha de dois `TextureRect`, ou `AnimatedSprite2D` com frames longos |
| Reveal de gacha | Cena `SummonReveal` com `AnimationPlayer` (charge → burst → cascata) + `GPUParticles2D` + shader de light-sweep. Coreografia idêntica |
| Tela de run (HUD) | Cena separada: `SubViewport`/`Node2D` do mundo + `CanvasLayer` de HUD. Sem `PersistentBar` |
| Minimap | `SubViewport` com `Camera2D` própria ou textura desenhada — moldura "espelho de obsidiana" via `StyleBoxFlat` |
| Atmosfera de bioma | `CanvasModulate` (color-grade) + `GPUParticles2D` (partículas) + `ColorRect` de vinheta. **Substitui código de renderer por nós** |
| Números de dano | Cena `FloatingNumber` com `AnimationPlayer`, cor pelo tipo de dano, crit maior e dourado |
| `AssetsService` | **Elimina-se** com arte autoral. Se precisar recolorir: `ShaderMaterial` de paleta |
| Catálogo de conteúdo (`ContentStore` + `.data/content/*.json` + admin) | `Resource` (`.tres`) editado no inspector do Godot. **O editor já é o painel admin** |
| Persistência de conta (JSON/MySQL) | `ConfigFile` ou `ResourceSaver` em `user://` |
| Replay (`seed + command log + hashes`) | Idêntico, contra o `SimulationCore`. **Vale muito manter** |
| `tools/BalanceSim` | `godot --headless --script sim.gd` |

### Princípio-guia da reconstrução

O `DESIGN_NOTES §8` isola o princípio transversal que o Arena Fable herdou do OTClient:
**"o cliente é burro de propósito — ele renderiza o que o servidor descreve."**

Em single-player Godot isso não morre; ele **muda de forma**: a **apresentação** (cenas, HUD, FX,
juice) nunca decide nada — ela lê o estado que o `SimulationCore` produziu. É por isso que o Arena
Fable conseguiu adicionar hit-stop, screen-shake, slow-mo do Echo Break e dissolve por pixels **sem
tocar o engine e sem quebrar determinismo**. É a fronteira mais valiosa do projeto inteiro e o
único item de arquitetura que eu recomendaria copiar literalmente.

## D.10 — Veredito por tela

### Sobrevivem quase integralmente como conceito

| Tela | Por quê | Ajuste ao portar |
|---|---|---|
| **Home Hub** | A tese ("a Home é a vitrine da personagem, não um menu") está certa e é o que dá cara de gacha premium. O padrão wallpaper → scrim → identidade no canto inferior esquerdo → rail contextual à direita é sólido | Trocar emoji por ícones. Decidir se o pin-picker continua na Home ou vai pro ateliê |
| **Prerun / Deploy** | A tela mais limpa do jogo e a de melhor decisão de escopo: *"o pré-run é apenas o seletor cinematográfico de personagem; detalhes e equipamentos ficam na página de personagem"*. Recusar-se a virar tela de build é o acerto | Manter a recusa. O botão `Details` (→ ateliê) é a válvula de escape correta |
| **HUD de run ("Reliquary Combat")** | O trabalho mais maduro do projeto. Layout, hierarquia, tinta de elemento por stance, "um clímax só", e a §10 de anti-padrões | Portar a **linguagem**, não o CSS. §10 vira checklist de revisão |
| **Painel Helper** | Regras e agrupamento (Combat/Movement/Autopilot) + readout em linguagem natural + save por personagem | Manter estrutura; reconstruir como cena |
| **Recruit / pity** | Pity transparente com "faltam N" + garantia de destaque = padrão de mercado bem executado | Manter. Reconstruir o reveal com `AnimationPlayer` (fica mais simples que em CSS) |
| **Estados vazios** | Copy que converte vazio em ação | Copiar o tom literalmente |

### Devem ser redesenhadas

| Tela | Problema | Direção |
|---|---|---|
| **Hunt + Mode + Prerun (3 telas)** | 4 cliques até jogar, num jogo cuja tese é "sessão de 15 min". Hunt (modos) tem 5 cards para 2 modos jogáveis — 60% da tela é aspiracional | **Fundir em 2 passos:** (1) *Onde* — modo + tier + briefing numa tela só (o rail de tier já é lateral; o rail de modo pode virar um segmento no topo); (2) *Quem* — o deploy atual, intocado. Reduz para **2 cliques** |
| **Mode (tier)** | A tela mais sobrecarregada: briefing + loot + slider de tentativas + energia + Queue Settings. Mistura *"me convença a entrar"* com *"configure meu farm"* | Separar as duas intenções: briefing na tela; plano de farm/fila num drawer único (o drawer já existe — mover o slider pra dentro dele) |
| **Backpack** | 117 linhas, grade sem filtro/busca/agrupamento, emoji de moeda, sem noção de tier/raridade na grade | Grade com filtro por slot/tier, ordenação, seleção múltipla, e a moldura por tier que o `ItemIcon` já sabe desenhar |
| **Bestiary** | 64 linhas, texto puro, sem sprite da criatura | Grade com o sprite + progresso por rank. O Bestiary/Bossiary é **pilar declarado do Huntbound** — merece ser uma tela de verdade, não uma lista |
| **Kaelis (ateliê)** | Conceito ótimo, 5 abas num arquivo de 1.249 linhas | Uma cena por aba. Avaliar se Maestria e Equipamento merecem tela própria (são os dois fluxos mais densos) |
| **Resina/energia** | Não existe | Desenhar do zero, se o sistema entrar. Ver §D.5 |
| **Sistema de botões** | 3 vocabulários coexistindo | Um só, com variantes |
| **Estados de erro** | Não existem | Toda tela que carrega dados precisa de um estado de falha com retry |

### Fora do escopo inicial

| Tela / sistema | Por quê |
|---|---|
| **Admin (7 abas, ~4.900 l.)** | O editor do Godot substitui. Conteúdo como `Resource`; Map Lab vira cena de dev |
| **Sessão idle / spectator panel / progressão offline** | Depende da decisão sobre energia; e é o sistema mais meio-conectado do Arena Fable |
| **Modo Arena, Boss Rush, Endless, Squad Raid** | Cards `soon` que nunca saíram do papel. **Não replique cards aspiracionais no MVP** — eles ocupam 60% da tela de modos sem entregar nada |
| **Echo Team (companions)** | Flagship nunca implementada. Se entrar, é uma feature-âncora, não um port |
| **Cutscene de invocação em vídeo** | Produção, não fundação |
| **Skins / Outfit Studio / gacha de skins** | Todo o eixo cosmético depende de pipeline de arte que não existe ainda no Huntbound |
| **Forja / craft de Material de Eco** | Nunca implementado. Não introduza o **recurso** antes do **sumidouro** |
| **Responsivo mobile (375px), `prefers-reduced-motion` como media query** | Alvo do Huntbound é desktop. Motion reduzido vira opção no menu |

---

## Anexo — Onde olhar primeiro (ordem de leitura recomendada)

Para quem for construir o Huntbound e quiser o máximo de valor pelo mínimo de leitura:

1. `README.md` (raiz) — 621 linhas, cobre 80% do sistema. **Trate como spec.**
2. `docs/design/gameplay_style_guide.md` — a melhor peça de design do repo; §10 é uma checklist
   de anti-padrões pronta para usar.
3. `docs/STYLE_GUIDE.md` — a regra de acento duplo.
4. `docs/DESIGN_NOTES.md` §1, §3, §4, §8, §12 — pilares, postura, Echo Team, UX do OTClient,
   notas de mercado gacha.
5. `docs/design/tibia_map_patterns.md` + `docs/mapping/hunt_anatomy.md` +
   `docs/mapping/boss_room_anatomy.md` — design de lugar engine-agnóstico, verificado empiricamente.
6. `docs/roadmap/ongoing/roadmap_dash_training.md` — o melhor exemplo de trilha fechada com
   decisões **descartadas** registradas.
7. `docs/roadmap/done/roadmap_meta_gameplay.md` MG-02, MG-06, MG-07, MG-08 — o modelo de papéis
   e como balancear com dados em vez de achismo.
8. `docs/balance/perf_baseline_2026-07.md` — como medir e como escrever uma régua de decisão de
   renderer antes de otimizar.

**O que deliberadamente não vale ler:** `docs/roadmap/done/GDD.md` (obsoleto),
`docs/prompts/**` (material de produção de arte), `docs_web/**` (estrutura montada, quase não
usada), e qualquer coisa em `docs/roadmap/not started/` sem antes checar os marcadores `[x]`
dentro do arquivo.
