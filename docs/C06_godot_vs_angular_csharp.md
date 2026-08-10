# C06 — Comparação técnica: Godot 4.7.1 vs. continuar Angular/C#

> **STATUS: SUBSTITUÍDO EM 2026-08-09.** A própria condição de reversão #1 deste relatório ocorreu:
> browser tornou-se o canal principal. A decisão vigente é Phaser 4 + TypeScript, browser-first,
> formalizada em `03_ADR_PHASER4_BROWSER_FIRST.md`. As medições e a comparação sob a premissa
> desktop-first permanecem como evidência histórica.

> **Escopo.** Decisão de stack para o gameplay do **Kaezan Huntbound** (2D, top-down, tile/grid,
> single-player, helper, muitos mobs, effects, dash, postura, dungeons, bosses).
>
> **Fontes.** Código e docs do `C:\Kaezan\kaezan-arena-fable` (medidos, não estimados), o projeto
> Godot vazio em `C:\Kaezan\kaezan-godot\kaezan-huntbound`, a auditoria `C03_auditoria_arena_fable.md`
> e a documentação oficial do Godot 4.7.
>
> **Nada foi implementado. Nada foi modificado no Arena Fable.**
>
> **Método.** Cada afirmação sobre o Arena Fable é ancorada em arquivo/linha ou em contagem real.
> Cada afirmação sobre o Godot é de capacidade documentada, não de expectativa. Onde a resposta
> depende de medição que não existe, o item está marcado como **spike**, não como conclusão.

---

## 0. Correção de premissa (antes de comparar)

O enunciado do C06 parte de *"o frontend de gameplay teve problemas de performance/complexidade"*.
Os dados do próprio projeto sustentam **metade** dessa frase, e a distinção muda o peso dos
argumentos:

| Premissa | Veredito | Evidência |
|---|---|---|
| **Performance de render era o problema** | ❌ **Não sustentado** | `docs/balance/perf_baseline_2026-07.md`: `draw p95` de pico = **2,7 ms** contra uma régua de 12 ms (22% do limiar), `frame p95` máx = 12,6 ms ≤ 16 ms, `tick p95` do backend = 0,49 ms em regime. A decisão registrada foi explícita: *"o renderer Canvas 2D atual basta"*. E foi medida em **dev build**, ou seja, é um teto, não um piso |
| **Complexidade / responsabilidades de engine feitas à mão** | ✅ **Sustentado e mensurável** | `core/renderer.ts` = **1.656 linhas** implementando câmera, interpolação entre ticks, suavização de deriva de relógio, atlas, camadas, tile-shade, dissolve por pixel, screen-shake, partículas de atmosfera, telegraph de skill, minimapa e texto de dano — tudo isso é engine, não jogo. Some `AssetsService` (523 l.), `BorderAutotile`/`WallAutotile`, `perf-ring`, `event-seq` |

Três consequências objetivas:

1. **"Migrar por performance" não é um argumento defensável hoje** — não há medição que o suporte.
2. **A baseline não licencia extrapolação para o Huntbound.** Ela foi medida na densidade do Arena
   Fable (`GameConfig.cs:544-545`: `SpawnBudgetBase = 16`, `SpawnBudgetTierGrowth = 0,55`). O
   Huntbound declara **"muitos mobs"** como requisito. Densidade maior é justamente a condição de
   reabertura escrita no próprio documento de baseline. Isso é um **spike**, não um argumento.
3. **O argumento real é de propriedade de código e de alvo de plataforma**, não de FPS. É nesse
   eixo que a comparação abaixo é decidida.

---

## 1. Linha de base medida

### 1.1 — Arena Fable (o que existe hoje)

| Camada | Linhas | Observação |
|---|---:|---|
| `backend/src/**/Engine` + `Domain` | **13.153** | **Simulação + regras + conteúdo.** Varredura de `using`: a **única** dependência de framework em toda a árvore é `Engine/RunManager.cs:4` (`Microsoft.AspNetCore.SignalR`, 274 l.). O resto é C# puro (`System.*` apenas) |
| `backend/src/**/Meta` + `Api` + `Hubs` + `Content` | **8.591** | Conta, endpoints, hub, catálogo. Inclui **4.017 linhas de migrations do EF Core** |
| `backend/tests` | **1.766** | Testes do engine, portáveis junto com o C# |
| `frontend/src` (TS/CSS/HTML) | **16.488** | Dos quais `game.ts` 1.696 · `renderer.ts` 1.656 · `kaelis.ts` 1.249 · **admin ~4.900** |
| **Total** | **~40.000** | Mantido por uma equipe pequena |

Outros fatos verificáveis:

- Dependências de produção do frontend: Angular 21 + `@microsoft/signalr` + rxjs. Nenhuma
  biblioteca de jogo (`package.json`).
- Tick de simulação = **100 ms** (`GameConfig.cs:19`), com interpolação e correção de deriva de
  relógio feitas no cliente (`renderer.ts`: `serverNow`, `recordMotion`, `actorMotionAt`, `updateWarp`).
- Persistência: **MySQL via Pomelo/EF Core** (`.csproj`).
- **`.github/workflows/` está vazio** — não existe CI.
- Um bug de renderer medido e registrado continua aberto (`renderer.ts:1319-1338`, `drawShockwaves`,
  `IndexSizeError`, ~8 frames abortados por sessão).

### 1.2 — Projeto Godot (o que existe hoje)

`project.godot` + uma cena com um `Node2D` vazio. Configuração já feita:

- `config/features = ("4.7", "GL Compatibility")` → método de render **Compatibility** (maior
  alcance de hardware, menor conjunto de efeitos de pós-processamento).
- `rendering_device/driver.windows = "d3d12"`, `window/stretch/mode = "canvas_items"`.
- `3d/physics_engine = "Jolt Physics"` — **irrelevante**, o jogo é 2D. É default do editor.

Ou seja: o custo de B começa **do zero de código**, mas **não** do zero de decisões — as decisões de
design estão nos ~25.700 linhas de markdown do Arena Fable (ver §4).

---

## 2. Comparação por eixo

Legenda do delta: **→B** = vantagem objetiva do Godot · **→A** = vantagem objetiva de continuar ·
**≈** = neutro (o custo é o mesmo, muda apenas quem escreve) · **!** = depende de spike.

| # | Eixo | A — Angular/C# (estado medido) | B — Godot 4.7.1 | Delta |
|---|---|---|---|---|
| 1 | **Rendering** | Canvas 2D imperativo, 1.656 l. escritas à mão: câmera, escala, atlas, camadas, z-order, tile-shade, minimapa, atmosfera, FX. Performance atual **dentro da régua** | `TileMapLayer` (chão/borda/decor/parede), `Node2D`/`AnimatedSprite2D`, `Camera2D` com `limit_*` + smoothing, `CanvasLayer` p/ HUD, y-sort, `CanvasModulate`, `Light2D`. ~80% do arquivo vira nó | **→B forte** (propriedade de código, não FPS) |
| 2 | **Input** | Eventos DOM + bindings Angular; `screenToTile` manual. Sem mapa de input, sem rebind, sem gamepad | `InputMap` declarativo no editor, remapeamento em runtime, gamepad/deadzone nativos, `Input.is_action_*`. Buffering/repeat continuam manuais nos dois | **→B** (relevante: alvo é desktop) |
| 3 | **Physics** | Não usa física — ocupação por tile (29 ocorrências de walkable/occupied em `GameWorld.cs`). É a escolha certa para um jogo de grid | `Area2D`/`PhysicsServer2D` disponíveis, mas um jogo tile/grid **deve continuar ignorando** física para preservar determinismo. `Area2D` ajuda só em campos/effects | **≈** (não venda física como ganho) |
| 4 | **Navigation** | A*/BFS escritos à mão dentro de `GameWorld.cs` (8 ocorrências) + `DungeonValidator` para conectividade | `AStarGrid2D` (síncrono, grid-nativo, encaixe exato) e `NavigationServer2D`/`NavigationAgent2D` (assíncrono, com avoidance). **Atenção:** o servidor de navegação é assíncrono/threaded — **não** pode entrar num tick determinístico. O caminho correto é `AStarGrid2D` ou manter o A* próprio | **→B fraco** |
| 5 | **Animation** | Fase de sprite, `walkStrideFor`, crossfade e recolor HSI de 133 cores compostos à mão (`assets.service.ts`, 523 l. — reimplementação em TS do `outfit.cpp` do OTClient) | `AnimatedSprite2D`, `AnimationPlayer` (anima **qualquer** propriedade, inclusive de UI), `AnimationTree`/state machine, `Tween` para juice. Recolor vira `ShaderMaterial` de paleta — **ou some**, se a arte for autoral | **→B forte** |
| 6 | **Particles** | `buildAtmoParticles` + FX redesenhados a cada frame no canvas, dentro do orçamento de draw | `GPUParticles2D`/`CPUParticles2D` como nós, editados visualmente, com curvas e materiais. Precisa de spike: quais recursos de partícula o método **Compatibility** entrega no alvo | **→B**, com **!** |
| 7 | **Profiling** | Instrumentação **própria e boa**: `perf-ring.ts`, `event-seq.ts`, overlay F3 permanente, ring de `tick perf` no backend, e uma **régua de decisão escrita** (12 ms / 16 ms / 30 ms / 300 ms) | Profiler, monitores e debugger remoto embutidos + `Performance.add_custom_monitor` para métricas de domínio. Mas o profiler é ferramenta de **editor**: medir build exportado exige instrumentação própria de novo | **→B fraco** — o ativo real de A é a *disciplina*, e ela migra (§4) |
| 8 | **Tooling (conteúdo)** | Painel admin próprio: **~4.900 linhas** em 10 telas (monstros, itens, skins, roles, banners, biomas, Map Lab) | O **editor é o painel admin**: conteúdo vira `Resource` (`.tres`) editado no inspector, com validação por tipo. Map Lab vira cena de dev ou `EditorPlugin` | **→B forte** (~4.900 l. deixam de existir) |
| 9 | **Iteration speed** | `ng serve` com HMR é rápido **para UI**; qualquer mudança de regra exige rebuild do backend + reconexão do hub. **Dois processos + MySQL + handshake** para ver um número mudar | Um processo. F5/F6 roda a cena. GDScript recarrega a quente; **C# exige build** (segundos). Perde-se o DevTools do browser — inspecionar layout de `Control` é mais lento que inspecionar DOM/CSS | **→B** em gameplay · **→A** em UI/layout |
| 10 | **AI (helper)** | Regras já escritas e tunadas: disciplina de AoE (`AutoHelperAoeMinTargets`), orbitar/box por papel, kite em boss, autopilot. É o ativo, não o framework | Godot **não** tem behavior tree embutida. FSM à mão ou addon (LimboAI/Beehave) — mesma situação de A | **≈** (custo = porte, não reescrita conceitual) |
| 11 | **Data** | `ContentStore` (669 l.) + JSON + **EF Core/MySQL** + 4.017 l. de migrations + CRUD admin. Para um produto desktop single-player, é infraestrutura de servidor | `Resource`/`.tres` versionados em texto e editados no inspector; save de conta em `user://` (`ConfigFile`/`ResourceSaver`). **Caveat honesto:** o Godot não tem framework de migração — evolução de formato de save é DIY (em A, o EF resolve isso para conteúdo, não para save de jogo) | **→B forte** |
| 12 | **Build / export** | Produto = SPA + host .NET + MySQL. Publicar **desktop** exige embrulhar tudo (Electron/Tauri + runtime .NET + banco embarcado). Nada disso existe, e **não há CI** | Export templates com um clique: Windows/Linux/macOS, binário + `.pck`. `--headless` para simulação em lote | **→B forte** *se o alvo for desktop* |
| 13 | **Web** | Nativo. É a única vantagem estrutural de A: qualquer build é um link | Export web existe, mas: **projetos C# não podem ser exportados para web no Godot 4.x** (documentação oficial 4.7, explícita). Web só com **GDScript**. Além disso, exige headers COOP/COEP para threads e tem limitações de áudio/fullscreen/persistência | **→A forte** *se web for requisito* |
| 14 | **Desktop** | Nenhum caminho pronto. Trocar MySQL por store embarcado significa reescrever a camada de persistência (`Meta/Persistence`) e descartar as 4.017 l. de migrations de qualquer forma | Alvo de primeira classe. Gamepad, fullscreen, janela, arquivos locais, teclas de sistema — tudo nativo | **→B forte** |
| 15 | **Code reuse** | 100% do código continua, incluindo o que não deveria (ver §3) | **~12.900 linhas de C# de simulação/regra são livres de framework** e portam quase verbatim para Godot .NET, junto com **1.766 l. de testes**. O que não porta é apresentação e transporte — e a auditoria C03 já concluiu que a apresentação deve ser **redesenhada, não portada** | **→B**, com ressalva importante (§2.2) |

### 2.1 — O eixo que não estava na lista, mas decide: o *seam* de rede

O Arena Fable é **servidor autoritativo com snapshot a 100 ms por conexão**. Isso existe para
multiplayer/anti-cheat. O Huntbound é declarado **single-player**.

Custo medido desse seam, que **não desaparece** na opção A:

- `RunManager` (274 l.) + `GameHub` + DTOs + `EventLog` + dedup por `seq` + janela de replay de 10
  ticks + reconexão/toasts + preload de atlas antes do join;
- no cliente: interpolação entre ticks, `snapshotAgeMs`, suavização de deriva de relógio, `updateWarp`;
- e ele **escala com a contagem de atores**: a baseline registra **5.464 eventos ingeridos +
  49.223 deduplicados** numa run T5 — na densidade atual. "Muitos mobs" empurra esse número, mesmo
  rodando em localhost.

Em B esse eixo inteiro deixa de existir: `_physics_process` a 60 Hz, sem serialização, sem
interpolação, sem dedup. **É o maior corte de complexidade da migração e não aparece em nenhum dos
15 eixos pedidos.**

### 2.2 — Dentro de B existem duas opções, e elas não são equivalentes

| | **B1 — Godot + C# (.NET)** | **B2 — Godot + GDScript** |
|---|---|---|
| Simulação | Porta ~**12.900 l.** de `Engine`+`Domain` quase verbatim (remover só `RunManager`) | Reescreve as ~12.900 l. |
| Testes | **1.766 l.** portam | Perdidos; reescrever em GUT/GdUnit |
| Determinismo/replay | Preservado com o mesmo código que já foi validado por `--replay-check` | Precisa ser reconstruído e revalidado |
| Iteração | Build de segundos a cada mudança de script | Reload a quente |
| **Export web** | **Impossível no 4.x** (doc oficial) | Possível |
| Mobile | C# em Android/iOS é suportado desde 4.2, mas **experimental** | Suportado |
| Curva | Equipe já é C# | Linguagem nova |

**B1 e B2 têm perfis de risco opostos.** B1 minimiza custo de porte e risco de regressão de regras,
ao preço de fechar a porta do web. B2 mantém a porta do web aberta, ao preço de reescrever e
revalidar o núcleo mais testado do projeto.

Existe uma decisão que **reduz o custo de errar**: manter a simulação como uma **biblioteca .NET
pura, sem nenhum tipo do Godot** (é praticamente o que ela já é — a varredura de `using` mostra
`System.*` apenas). Assim o núcleo continua re-hospedável, e uma eventual troca de host não é uma
reescrita de regras.

---

## 3. Riscos

### 3.1 — Riscos de A (continuar Angular/C#)

| # | Risco | Probabilidade | Impacto | Evidência / mitigação |
|---|---|---|---|---|
| A1 | **Custo de engine cresce com cada feature declarada.** "Muitos mobs + effects + dash + postura + bosses" cai inteiro no `renderer.ts` e no `GameWorld.cs` (5.673 l.) | Alta | Alto | Não há mitigação estrutural: em A, iluminação, atmosfera, estados de animação e FX são código próprio por definição |
| A2 | **O produto declarado é desktop; o stack não tem caminho de desktop.** Empacotar exige Electron/Tauri + runtime .NET + trocar MySQL por store embarcado | Alta | Alto | Trabalho grande, ainda não iniciado, e a troca de persistência descarta as 4.017 l. de migrations de qualquer forma |
| A3 | **Pagar infra de multiplayer num jogo single-player** (§2.1) | Certa | Médio–alto | Removível em A também — mas remover o hub em A é praticamente reescrever o cliente |
| A4 | **Superfície de manutenção já em ~40.000 l.** com equipe pequena, CI inexistente (`.github/workflows/` vazio) e ao menos um bug medido não corrigido | Alta | Médio | Só melhora com corte de escopo — e a auditoria C03 já lista o que cortar |
| A5 | **Densidade maior invalida a baseline de render** | Média | Médio | A própria baseline define a condição de reabertura (`draw p95 > 12 ms`). Mensurável antes de decidir |
| A6 | **Assets do Tibia (CipSoft) na base visual** | — | Alto (jurídico) | **Independe da escolha de stack.** Não é argumento a favor de nenhuma opção |

### 3.2 — Riscos de B (migrar para Godot)

| # | Risco | Probabilidade | Impacto | Evidência / mitigação |
|---|---|---|---|---|
| B1 | **Curva de aprendizado real** — o repositório inteiro é a prova de que a competência da equipe é Angular/C#; cenas, `Control`, temas e nós são um modelo mental novo | Alta | Médio | Mitigado por B1 (linguagem preservada) e por começar pelo vertical slice, não pelo meta |
| B2 | **O design system depende de CSS que o Godot não tem.** `backdrop-filter` (o "vidro" que é a assinatura), `color-mix()`, `conic-gradient`, cascata de variáveis — tudo vira shader/`Theme`/`BackBufferCopy` | Alta | Médio | C03 §C.4 #9 já propõe o fallback: o *crystal edge* sozinho carrega quase toda a assinatura. **Spike antes de adotar vidro como linguagem base** |
| B3 | **UI densa é mais lenta de construir em `Control` que em CSS.** As telas do Arena Fable são de alta densidade informacional | Média | Médio | Real e sem mitigação elegante. Parcialmente compensado por C03: várias telas devem ser **redesenhadas e simplificadas** de qualquer forma |
| B4 | **Escolher C# fecha o export web no 4.x** (documentado) | Certa (se B1) | Depende de §6 | Decisão consciente, não descoberta tardia |
| B5 | **Método Compatibility pode limitar efeitos** (partículas, pós-processamento) | Média | Baixo–médio | Trocar para Forward+ é uma linha de config, não uma migração. Spike barato |
| B6 | **Determinismo em ambiente novo.** RNG seedado e aritmética inteira são determinísticos, mas *hashes de replay comparáveis entre versões do engine/plataformas* precisam de validação | Média | Médio | Mitigado por manter a simulação como biblioteca .NET pura, fora do engine — foi assim que o determinismo foi conquistado em A |
| B7 | **"Big rewrite" que nunca termina** — o padrão clássico de migração | Média | Alto | Mitigado pelo escopo já definido no Guia §15 (vertical slice) e por C03 §D.10 ("fora do escopo inicial") |
| B8 | **Porte do C# revela acoplamento oculto** que a varredura de `using` não pegou (ex.: dependência de `System.Text.Json` para contrato de rede, `ContentStore` amarrado a arquivos do host) | Média | Baixo | Spike de 1 arquivo: compilar `Engine`+`Domain` como classlib isolada e ver o que quebra |

---

## 4. Custos

Custos expressos em **linhas medidas**, não em horas — não há base para estimar horas com precisão
honesta. As categorias são: **descartado** (deixa de existir), **portado** (move com ajuste local),
**novo** (escrito do zero).

### 4.1 — Opção A: custo de *continuar* até o escopo declarado do Huntbound

Continuar não custa zero. Para chegar em "desktop, muitos mobs, effects, dungeons, bosses":

| Trabalho | Tamanho | Nota |
|---|---|---|
| Reescrever persistência para store embarcado (desktop) | ~1,4k l. reescritas + **4.017 l. descartadas** | As migrations do EF não sobrevivem a uma troca de banco |
| Empacotamento desktop (Electron/Tauri + runtime .NET + instalador) + CI | **Novo**, inexistente hoje | `.github/workflows/` vazio |
| Crescer `renderer.ts` para iluminação, atmosfera por bioma, estados de animação, densidade de FX | **Novo**, sobre 1.656 l. | Cada item é engine escrita à mão |
| Manter o seam de rede vivo a cada feature nova (DTO + evento + seq + dedup) | **Recorrente** | Custo por feature, não custo único |
| Redesenho de telas que C03 já apontou (Backpack, Bestiary, fusão Hunt/Mode, sistema de botões, estados de erro) | **Novo** | **Este custo é idêntico nas duas opções** |
| **Superfície final** | Cresce a partir de ~40.000 l. | Nada é descartado |

### 4.2 — Opção B1: custo de migrar (Godot + C#)

| Categoria | Linhas | Detalhe |
|---|---:|---|
| **Portado quase verbatim** | **12.879** | `Engine` (13.153) menos `RunManager` (274) + `Domain` — C# livre de framework |
| **Portado (testes)** | **1.766** | Continuam válidos como rede de regressão do porte |
| **Convertido em dados** | **~1.250** | `Content/` (`ContentStore` 669 + `TilesetRegistry` 307 + `PrefabRegistry` 276) → `.tres` + importador |
| **Descartado — infra de rede/conta** | **~7.600** | `Meta`+`Api`+`Hubs` (o restante das 8.591 l. de `Meta`+`Api`+`Hubs`+`Content`, das quais **4.017 são migrations do EF**) + `RunManager` (274) |
| **Descartado — admin** | **~4.900** | Substituído pelo inspector do Godot |
| **Descartado — renderer + assets service** | **~2.200** | Substituídos por nós |
| **Reconstruído — telas e HUD** | ~9.400 l. de Angular viram cenas | **Mas veja abaixo** |
| **Novo — pipeline de conteúdo** | migração JSON → `.tres` | Mecânico, script-ável |

**O ajuste mais importante do cálculo de custo:** a auditoria C03 já concluiu, *independentemente
de engine*, que boa parte da UI deve ser **redesenhada, não portada** — Backpack (117 l.) e Bestiary
(64 l.) são placeholders, Hunt+Mode+Prerun devem virar 2 telas em vez de 3, e o admin deve sumir.
Ou seja: **uma fração relevante do "custo de migração" é trabalho que a opção A também teria que
pagar.** O custo *diferencial* de B é bem menor que a soma bruta das linhas reconstruídas.

### 4.3 — Opção B2 (GDScript): delta sobre B1

`+` reescrever ~12.900 l. de simulação · `+` reescrever 1.766 l. de testes · `+` revalidar
determinismo e replay do zero · `−` iteração mais rápida · `−` porta do web aberta.

### 4.4 — Custo de adiar a decisão

Não-trivial e crescente: cada feature nova do Huntbound construída em A aumenta o volume de porte,
e cada semana em A adiciona linhas ao seam de rede que será descartado. Se a migração é provável,
**adiar é a opção mais cara das três.**

---

## 5. O que pode ser reaproveitado

Ordenado por valor por unidade de esforço.

| # | Ativo | Volume | Forma de reuso | Serve em A? | Serve em B? |
|---|---|---:|---|:--:|:--:|
| 1 | **Documentação e decision records** (README de 621 l. como spec, `DESIGN_NOTES`, `gameplay_style_guide`, `STYLE_GUIDE`, roadmaps com **decisões descartadas e o porquê**) | ~25.700 l. de markdown | Leitura direta. É o ativo mais valioso do Arena Fable e é **engine-agnóstico** | ✅ | ✅ |
| 2 | **Simulação e regras em C#** (`Engine` sem `RunManager` + `Domain`) | **~12.900 l.** | **B1:** porte quase verbatim · **B2:** especificação executável para reescrita | ✅ | ✅ (B1 forte) |
| 3 | **Testes do engine** | 1.766 l. | Rede de regressão do porte | ✅ | ✅ (B1) |
| 4 | **Números tunados** (`GameConfig.cs`, 1.504 l.: dash 2 tiles/1.800 ms/×1.5, i-frames 300 ms, cooldown 2.500 ms, postura 7/16/×1,7/3.000 ms, multiplicadores 1,8/2,1/2,4/2,8) | 1.504 l. | Migram como valores, mesmo numa reescrita total. **Foram tunados em bancada dedicada** | ✅ | ✅ |
| 5 | **`DungeonGenerator` + `DungeonValidator`** (lóbulos, pilares, pockets, anfiteatro, fail-fast) | 1.478 + validator | Algoritmo puro — porta direto | ✅ | ✅ |
| 6 | **`BalanceSim`** (1.750 runs, CSVs before/after) | tool + dados | Em B vira `godot --headless`, ou continua rodando contra a classlib .NET sem mudança nenhuma | ✅ | ✅ |
| 7 | **Disciplina de determinismo + replay** (seed + command log + hashes SHA-256 + `--replay-check` com bissecção) | `Replay.cs`, `GameWorld.Replay.cs` | **Manter a disciplina, jogar fora o transporte.** É o que permitiu adicionar hit-stop, shake e slow-mo sem quebrar o engine | ✅ | ✅ |
| 8 | **Fronteira apresentação ↔ simulação** ("o cliente é burro de propósito") | doutrina | C03 chama de "o único item de arquitetura que eu recomendaria copiar literalmente" | ✅ | ✅ |
| 9 | **Regras do helper** (AoE só com ≥N alvos, orbitar/box por papel, kite em boss, readout em linguagem natural) | `game.ts` + `GameConfig` | Regra de produto; o código não porta, a regra sim | ✅ | ✅ |
| 10 | **Modelo de papéis + `RoleTuning`** (validado por 1.750 runs) | `Domain` | Vira `Resource` em B | ✅ | ✅ |
| 11 | **Anatomia empírica de mapas de Tibia** (`docs/mapping/*`, medidas reais do `.otbm`) | ~770 l. | Design puro, engine-agnóstico | ✅ | ✅ |
| 12 | **Prefabs OTBM → JSON** (`Content/PrefabRegistry` + `tools/map-importer`) | 276 l. + tool | Formato JSON é neutro; em B vira importador para `TileMapLayer`/`.tres` | ✅ | ✅ |
| 13 | **Pipeline de arte** (ComfyUI, `tools/*.py`, perfis de estilo, KNOWLEDGE_*) | tools | Externo ao jogo — sobrevive intacto | ✅ | ✅ |
| 14 | **Linguagem visual** (Cathedral Ink + Aurum, regra de acento duplo, HUD Reliquary, §10 de anti-padrões) | style guides | Doutrina + tokens. O **CSS** não migra; a **linguagem** sim | ✅ | ✅ |

**O que explicitamente não se reaproveita em B:** SignalR/ASP.NET/EF/MySQL, `renderer.ts`,
`assets.service.ts`, rotas Angular, CSS, painel admin, dedup por `seq`, preload de atlas,
`AssetExtractor`/`convert-monsters` (dependem de assets do Tibia), e a nomenclatura `waifu:*`.

---

## 6. Recomendação

> **B1 — migrar o gameplay para Godot 4.7.1, com a simulação em C# mantida como biblioteca .NET
> pura (sem tipos do Godot), e a apresentação reconstruída em cenas.**

A recomendação decorre de quatro fatos medidos, nenhum deles de preferência:

1. **O escopo declarado é single-player e desktop.** Sob esse escopo, o ativo central de A — o
   servidor autoritativo com snapshot a 100 ms — é infraestrutura sem função, e A **não tem caminho
   de distribuição desktop**, enquanto B tem export de um clique. Este é o argumento decisivo: os
   outros são de magnitude, este é de direção.
2. **A maior parte do que A construiu à mão é engine, e em B é nó.** 1.656 l. de renderer, 523 l. de
   composição de sprite, autotiling, câmera, interpolação, atmosfera — contra `TileMapLayer`,
   `AnimationPlayer`, `Camera2D`, `GPUParticles2D`. O ganho não é FPS (§0), é **deixar de manter
   engine**. Some ~4.900 l. de admin substituídas pelo editor.
3. **O custo de porte é muito menor do que parece,** por duas razões independentes: ~12.900 l. de C#
   estão livres de framework (única exceção medida: `RunManager.cs`) e portam quase verbatim com
   seus 1.766 l. de testes; e boa parte da UI que "seria portada" já está marcada em C03 para ser
   **redesenhada de qualquer forma** — esse custo é comum às duas opções, não diferencial de B.
4. **Continuar em A não é o cenário de custo zero.** Trocar MySQL por store embarcado, empacotar
   desktop, montar CI (inexistente) e crescer o renderer para "muitos mobs + effects" são trabalhos
   novos e grandes, sobre uma superfície de ~40.000 l. que só cresce.

**Escopo da recomendação — o que ela não diz:**

- Não recomenda portar telas 1:1. C03 §D.10 já separou o que sobrevive como conceito do que deve ser
  redesenhado. **Migrar não é traduzir.**
- Não recomenda começar pelo meta (conta, gacha, energia). Começar pelo vertical slice do Guia §15.
- Não recomenda desligar o Arena Fable. Ele continua sendo referência executável e bancada de
  comparação de feeling durante a migração.
- Não afirma que o renderer de A é lento. A medição diz o contrário (§0).

**Antes de tratar a decisão como fechada, três spikes com régua de aprovação** (baratos, e cada um
pode falsificar parte da recomendação):

| Spike | Pergunta | Régua |
|---|---|---|
| **S1 — Classlib** | `Engine`+`Domain` compilam como biblioteca .NET isolada, fora do ASP.NET? | Se exigir mais que remover `RunManager` e trocar o host, o valor do reuso cai e B2 volta à mesa |
| **S2 — Densidade** | N mobs + FX simultâneos a 60 fps no hardware alvo, com o método **Compatibility** | Se falhar: trocar para Forward+ (config) antes de questionar a engine. Se falhar em Forward+ também, o requisito "muitos mobs" precisa de número, não de adjetivo |
| **S3 — Vidro** | Custo de `BackBufferCopy` + blur por painel, contra a alternativa só-*crystal-edge* | Se caro: adotar o fallback já proposto em C03 §C.4 #9. Não é motivo para questionar a engine |

---

## 7. Condições que mudariam a recomendação

Cada linha é falsificável: se a condição se tornar verdadeira, a conclusão muda no sentido indicado.

| # | Condição | Muda para | Por quê |
|---|---|---|---|
| 1 | **Distribuição em browser vira requisito duro** (playtest público por link, demo em portal web, marketing jogável) | **B2** (Godot + GDScript) se web e desktop forem ambos requisitos · **A** se web for o canal *principal* | Documentação oficial 4.7: projetos C# **não** exportam para web no 4.x. B1 fecha essa porta por construção |
| 2 | **Multiplayer/co-op autoritativo entra no roadmap de curto prazo** | **A** ganha muito peso | Todo o custo que hoje é passivo (SignalR, tick autoritativo, dedup, EF/MySQL, admin, contas) vira ativo já construído e já validado |
| 3 | **O escopo do Huntbound encolhe para "Arena Fable com 2–3 sistemas novos"** (sem aumento de densidade, sem novo alvo de plataforma) | **A** | Migração não se amortiza: paga-se o porte para entregar o que o stack atual já entrega dentro da régua medida |
| 4 | **S1 falha** — a simulação em C# revela acoplamento profundo ao host | **B2** ou migração em fases | O principal redutor de custo de B1 é o reuso quase verbatim. Sem ele, B1 e B2 se aproximam, e B2 tem a vantagem de iteração e web |
| 5 | **S2 falha em Forward+ também** (densidade alvo inatingível em 2D no Godot no hardware alvo) | Reabrir a comparação **com números** | Seria a primeira evidência de performance na discussão — hoje não existe nenhuma, em nenhuma direção |
| 6 | **Prazo duro para um jogável em poucas semanas, com zero horas de Godot na equipe** | **A** para o protótipo, decisão de stack adiada | Curva de aprendizado é custo real (risco B1). Ressalva: §4.4 — adiar tem custo crescente, então esta condição precisa de uma data, não de uma sensação |
| 7 | **A assinatura visual em vidro/`backdrop-filter` é declarada inegociável e S3 mostra custo proibitivo** | Reavaliar a *linguagem visual*, **não** a engine | C03 já registra que o *crystal edge* sozinho carrega quase toda a assinatura. Trocar de engine por causa de um efeito de UI seria desproporcional |
| 8 | **O helper evoluir para IA pesada por mob** (dezenas de agentes com planejamento por tick) | Neutro entre A e B; **muda a arquitetura**, não o stack | Nenhuma das duas opções entrega behavior tree pronta; o custo é o mesmo dos dois lados (§2, eixo 10) |
| 9 | **Godot 4.x passar a suportar export web com C#** | Remove a condição #1 como restrição de B1 | Verificar na documentação oficial antes de assumir; hoje (4.7) está explicitamente não suportado |

---

## Anexo — Resumo em uma tela

- **Não migre por performance.** A medição do próprio projeto diz que o renderer está a 22% da régua.
- **Migre por propriedade de código e alvo de plataforma.** ~4.900 l. de admin, ~1.656 l. de renderer,
  ~523 l. de composição de sprite e todo o seam de rede deixam de ser mantidos por vocês.
- **A migração é mais barata do que parece:** ~12.900 l. de C# livres de framework + 1.766 l. de
  testes portam; e parte do "custo de migração" da UI é trabalho que a opção A também pagaria.
- **A decisão real dentro de B é linguagem:** C# (reuso máximo, sem web) vs. GDScript (iteração e web,
  reescrita do núcleo).
- **A única condição que reverte tudo é de produto, não de técnica:** web como canal principal, ou
  multiplayer no curto prazo.
