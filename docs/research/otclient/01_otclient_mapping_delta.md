# C02 — Mapeamento do OTClient e Atualização do Baseline

> **Escopo:** OTClient usado **apenas como referência** de *feeling* de gameplay e UX.
> Alvo: **Kaezan Huntbound**, RPG **single-player** em Godot, top-down/tile-based. Não é MMO, não há arquitetura cliente-servidor.
>
> **Nada foi implementado, modificado ou copiado.** Este documento é leitura + delta.
>
> - Repositório analisado: `references/otclient` — `main` @ `1f5df26` (2026-08-05), fork **mehah/otclient** ("OTClient - Redemption") *upstream puro*
> - Baseline lido: `C:\Kaezan\kaezan\mapping\baseline\client\` — 21 documentos, ~740 KB, 14.224 linhas, congelado em **2026-05-25**
> - Fonte real do baseline: `C:\Kaezan\kaezan\otclient-4.0` — snapshot squashed do fork Mehah + **14 commits Kaezan** (HEAD `0eda0b0`, 2026-06-07)
> - Data desta análise: 2026-08-09

---

## 1. Resumo do baseline existente

### 1.1 Inventário

| Documento | Linhas | Conteúdo |
|---|---|---|
| `architecture.md` | 767 | §1–§3: build/CMake/vcpkg, boot (`main.cpp` → `init.lua` → módulos), estrutura de pastas, threading (3 threads), tabela "vanilla vs Redemption", anatomia do `.otmod`, `ModuleManager` |
| `ui_system.md` | 1.182 | §4 + §14: sintaxe `.otui`, estilos globais, catálogo de widget types, manipulação em runtime, `corelib`/`gamelib`, `UIMiniWindow` + docking + persistência por personagem |
| `hud.md` | 1.779 | §6–§9: layout do `gameRootPanel` (14 filhos), API pública de `game_interface`, MiniWindows, ciclo `onGameStart`/`onGameEnd`, os 47 módulos `load-later`, barras de status, **action bar** e **cooldowns** |
| `modules_guide.md` | 1.232 | §11 + §15 + §16: criar módulo do zero, **`game_walk`/`UIGameMap`**, tile widgets/partículas, click handling, `client_options`/`g_settings` |
| `protocol.md` | 1.056 | §5 + §10: superfície completa de bindings Lua↔C++ (`g_game`, `g_map`, `Tile`, `Creature`, `UIWidget`), tabela canônica de eventos Lua, parser de protocolo, extended opcodes |
| `visuals.md` | 1.851 | §12–§13 + §24: shaders, attached effects, skills client-side, StatsBar, paperdolls, sons, notificações/toasts |
| `automation.md` + `vBot/*` | 466 + 425 | §19: `mods/game_bot` (ciclo de vida, sandbox por config, loop de 10 ms, API), configs `cavebot_1.3` e `vBot_4.8` |
| `synthesis.md` | 752 | §17 + §23 + §25: síntese arquitetural **para o projeto MMO anterior**, tabela de extended opcodes, roadmap de sprints |
| `features/*.md` | 4.714 | 11 blueprints de features do *Kaezan: World* (echo forge, daily hub, sealed reward, arena cards, …) |

### 1.2 O que o baseline resolveu bem — **não refazer**

Verificado contra o código atual e ainda válido (só mudaram números de linha):

- **Sistema de módulos** — campos do `.otmod`, `autoload`/`autoload-priority`/`sandboxed`/`dependencies`/`load-later`, resolução recursiva e *eager* de dependências, `discoverModules()` sobre o VFS do PhysFS. `architecture.md` §3.
- **Sintaxe `.otui` e o modelo de widget** — âncoras, estilos, `$states`, herança, `layout: verticalBox/horizontalBox/grid`. `ui_system.md` §4.
- **`UIMiniWindow` + `UIMiniWindowContainer`** — dock/undock, `CharMiniWindows` em `g_settings`, `setupOnStart()`. `ui_system.md` §14.2–14.3.
- **Layout do HUD** — os 14 filhos de `gameRootPanel`, `GameSidePanel`, `bottomSplitter`, e os ~20 getters públicos de `game_interface`. `hud.md` §6.2–6.3. *(A lista de módulos `load-later` mudou — ver §2.3.)*
- **Superfície de bindings Lua** — `g_game.*`, `g_map.*`, `Tile:*`, `Creature:*`, `UIWidget:*`, e a tabela de eventos (`onWalk`, `onHealthPercentChange`, `onAttackingCreatureChange`, …). `protocol.md` §5. Continua correta como *catálogo de capacidades*.
- **Action bar + cooldown** — 9 barras (3 bottom / 3 left / 3 right), 50 slots, `UIProgressRect id: cooldown`, `spellCooldownCache`, opcodes 164/165/166, cooldown **não persiste** entre sessões. `hud.md` §9.
- **`game_walk` — modelo conceitual** — pre-walk, walk lock, fila `nextWalkDir`, smart walk com composição de diagonais, quatro fontes de delay. `modules_guide.md` §15.1. *(Detalhes de implementação mudaram — ver §2.4.)*
- **Pathfinding** — `Map::findPath` é **Dijkstra**, recusa destino em outro `z`, usa tiles vistos/minimap para custo, resultados `Ok/SamePosition/Impossible/TooFar/NoWay`. `modules_guide.md` §15.1.
- **Click no mapa** — cadeia `UIGameMap:onMouseRelease` → coleta `lookThing`/`useThing`/`creatureThing`/`attackCreature` → `game_interface.processMouseAction`. `modules_guide.md` §15.4.
- **Menu de contexto extensível** — `addMenuHook(category, name, callback, condition, shortcut)` + `createThingMenu`. `modules_guide.md` §15.4.
- **Shaders, attached effects, paperdolls, sons** — `visuals.md` §12 e §24 continuam corretos como catálogo de API.
- **`mods/game_bot` / vBot** — arquitetura, sandbox por config, loop de 10 ms, superfície de API. `automation.md` + `vBot/`. Praticamente intocado desde o baseline (§2.4).

### 1.3 Lacunas reais do baseline (nunca foram mapeadas)

Contagem de menções nos 21 documentos:

| Tema (interesse deste projeto) | Cobertura no baseline |
|---|---|
| **Câmera** (`MapView`) | 2 menções soltas; nenhum mecanismo descrito |
| **Tile rendering / draw order** | ausente (só `mapview` citado como coordenada de clique) |
| **Pipeline de input em C++** (`InputEvent`, auto-repeat, `UIManager`) | ausente; `g_keyboard` citado 4×, sem fluxo |
| **`Keybind` — dualidade chat/walk e presets** | citado como "sistema existe"; a semântica `CHAT_MODE.ON/OFF` nunca foi documentada |
| **Targeting** (`attack`/`follow`, squares) | 3 menções, todas dentro do bot |
| **Battle list** (`game_battle`) | 1 menção (linha de tabela) |
| **Containers** (`game_containers`, UI) | citado em contexto de inventário genérico; a UI nunca foi mapeada |
| **Feedback de combate** (nameplate, health bar, animated text) | parcial (`healthinfo` §8, já desatualizado) |
| **Cursores / crosshair / highlight tile** | ausente |
| **Floor fading / floor view modes / luz** | ausente |
| **`awareRange`** | 1 menção |
| **`drawPool`** | 5 menções, todas na tabela de features do fork |

### 1.4 O que do baseline virou peso morto

Todo o eixo **MMO**: tabela de extended opcodes (§17.3/§23.4/§25.7), dependência de patch Canary, os 11 blueprints em `features/`, `synthesis.md` inteiro, e o roadmap de sprints. Kaezan Huntbound é single-player: **não existe canal cliente↔servidor para replicar**. Esse material só serve como catálogo de *ideias de feature*, não de arquitetura.

---

## 2. DELTA DESDE O BASELINE

### 2.1 Mudou a base de comparação, não só o código

O baseline foi escrito sobre `C:\Kaezan\kaezan\otclient-4.0`, que **não é o OTClient upstream**: é um snapshot squashed ("initial commit — kaezan-client (OTClient 4.0 Mehah fork)") com 14 commits Kaezan por cima (módulos `game_kaezan_*`, HealBot, Echo Flask, Dojo, Daily Hub…). A referência atual em `references/otclient` é **mehah/otclient upstream puro**.

Consequência: o delta tem duas naturezas misturadas — **drift do upstream** (57 commits entre 2026-05-20 e 2026-08-05) e **remoção dos hacks Kaezan**. Onde isso importa, está sinalizado abaixo.

### 2.2 Contagens

| Métrica | Baseline (2026-05-25) | Atual (`1f5df26`) | Δ |
|---|---|---|---|
| `.lua` | 327 | **377** | +50 |
| `.otui` | 192 | **208** | +16 |
| `.otmod` | 76 | **83** | +7 |
| `.cpp` | 185 | **188** | +3 |
| `.h` | 213 | **221** | +8 |
| `.frag` / `.vert` | 23 / 2 | **23 / 2** | — |
| módulos em `modules/` | "70" | **76** | +6 |
| módulos em `load-later` de `game_interface` | 47 | **52** | +5 |

### 2.3 Módulos — entradas e saídas

**Novos em `load-later`:** `game_notifications`, `game_tutorial`, `game_inspect`, `game_taskboard`, `game_wheel`, `game_proficiency`.
**Removido:** `game_screenshot` (excluído em `4a87ceb`, 2026-05-20 — a tabela §6.6 do baseline já estava errada no dia em que foi escrita).
**Novos fora do `load-later`:** `dev_otui` (editor visual de `.otui` dentro do cliente, 2026-07-31), `client_assets` (instalação automática de assets modernos, 2026-05-28).
**Desapareceram (eram Kaezan, não upstream):** os 13 módulos `game_kaezan_*` e `mods/game_tasks` continua existindo em `mods/`.

**Reorganização relevante para nós:**

| Antes (baseline) | Agora |
|---|---|
| `game_healthinfo` descrito como o módulo de HP/mana/condições (§8) | `modules/game_healthinfo/healthinfo.lua` tem **70 linhas** e só liga HP/mana à statsbar. As barras vivem em `modules/game_interface/widgets/statsbar.lua` (860 linhas) e os **ícones de condição** em `modules/game_healthcircle/statusiconbar.lua` (857 linhas, adicionado 2026-05-20) |
| `game_battle` = uma linha de tabela | `modules/game_battle/battle.lua` = **2.623 linhas**, com `BattleListManager` **multi-instância** (várias janelas de battle list, cada uma com filtros/ordenação/persistência próprios) |

### 2.4 Comportamentos que mudaram (upstream, pós-baseline)

| Área | Mudança | Onde |
|---|---|---|
| **Render / draw order** | Criaturas andando agora adiam o desenho do tile: `walking_tiles` é acumulado e só é despejado quando o tile *upper-right* não tem criatura andando. Corrige ordem de desenho em diagonal | `references/otclient/src/client/mapview.cpp:145` (`#1779`, `#1793`) |
| **Render** | `Tile::draw`/`drawLight` passaram a receber `MapPosInfo` — a informação de criatura é desenhada dentro do `Tile`, junto do MAP pool | `references/otclient/src/client/tile.cpp:70` |
| **Render** | Desenho de creature information **deixou de ser multithreaded** (causava flicker ao andar); há um `DrawPoolType::CREATURE_INFORMATION` dedicado | `references/otclient/src/client/uimap.cpp` (`#1768`) |
| **Render** | Map e foreground desacoplados; `preLoad` chamado antes do foreground | `#1781`, `#1763` |
| **Movimento** | Custo de passo diagonal agora lê `player.diagonal-walk-speed` / `creature.diagonal-walk-speed` do config (antes hardcoded) | `references/otclient/src/client/creature.cpp:1141` + `references/otclient/data/setup.otml:26` (`#1792`) |
| **Movimento** | Paralisia: era `m_walkTimer.update(-getStepDuration())`; agora `if (isParalyzed() && isWalking() && m_serverWalk) updateWalk()` | `references/otclient/src/client/localplayer.cpp` |
| **Movimento** | Pre-walk virou **fila** (`m_preWalks`, deque) governada por `g_game.getWalkMaxSteps()`; autowalk tem retry (até 3×, 200/300/400 ms) e `onAutoWalkFail` | `references/otclient/src/client/localplayer.cpp:81-215` |
| **Movimento** | `modules.game_interface.lastManualWalk` restaurado (o bot usa `+500 ms` para não brigar com o jogador) | `references/otclient/modules/game_walk/walk.lua:123` (`#1757`) |
| **Movimento** | `GameForceFirstAutoWalkStep` é ligado automaticamente quando o servidor não é Tibia oficial | `references/otclient/modules/game_walk/walk.lua:278` |
| **Input** | **WASD deixou de ser bind fixo.** As teclas de andar WASD/QEZC são ligadas/desligadas dinamicamente conforme o modo de chat | `references/otclient/modules/game_console/console.lua:374-411` |
| **Input** | Novo "chat temporário" estilo Tibia: Enter no modo walk abre o chat marcado com `*`; ao enviar a mensagem volta sozinho para WASD | `references/otclient/modules/game_console/console.lua:431` (`#1769`) |
| **Interação** | Cursores contextuais no mapa (`attack`, `talk`, `containercursor`, `quicklootcursor`, `pointinghand`, `walk`) trocados em `MapView::onMouseMove` | `references/otclient/src/client/mapview.cpp:584` |
| **Interação** | `processMouseAction` foi de **473 → 549 linhas** (linhas 962–1510): três `lootControlMode`, quickloot, "hi" automático em NPC a ≤3 tiles, prioridades diferentes por modo. O baseline (§15.4) só documentou os ~165 primeiros | `references/otclient/modules/game_interface/gameinterface.lua:962` |
| **Interação** | `Tile::getTopMultiUseThing` aceita ground-border como alvo de use-with | `#1750` |
| **Feedback** | Barra de vida/nameplate: largura foi de 25 → **29 px** e o offset de −13.5 → **−15.5**; espaçamento mínimo nome↔barra de 2 px | `references/otclient/src/client/creature.cpp:166` |
| **Feedback** | Novas barras: **mana shield** (mago) e **Harmony/Serene** (vocação Monk, 5 sub-barras) sob a barra de vida | `references/otclient/src/client/creature.cpp:249-305` |
| **Feedback** | `Creature::isHidden()` novo: em protocolo <1273, `healthPercent == 0` significa vida oculta, não morte | `references/otclient/src/client/creature.cpp:68` |
| **Cooldown** | Cache passou a guardar **timestamp de expiração** (não booleano) quando as features de tier/skill stats estão ligadas | `references/otclient/modules/game_cooldown/cooldown.lua` |
| **Shader** | `MapView::setShader(name, fadein, fadeout)` — **assinatura mudou**; os exemplos Lua do baseline (`map:setShader('X')`) estão desatualizados | `references/otclient/src/client/mapview.cpp:945` |
| **Infra** | Protocolo alvo 1412 → **1511**; HTTP/WebSocket migrados para ixwebsocket; logging centralizado em spdlog; flag `--user-dir` | `#1726`, `#1312`, `#1643`, `#1756` |
| **Automação** | `mods/game_bot` praticamente intocado: **1 commit** desde o baseline (`TargetBot.Danger()` exposto em `cavebot_1.3`) | `#1754` |

### 2.5 Referências do baseline que ficaram inválidas

- **Todos os números de linha** de `gameinterface.lua`, `walk.lua`, `mapview.cpp`, `creature.cpp`, `localplayer.cpp`, `game.cpp` (arquivos com 25–300 linhas alteradas).
- `hud.md` §6.6 — tabela dos 47 módulos `load-later` (5 entradas novas, 1 removida).
- `hud.md` §8 — estrutura de `game_healthinfo` (o módulo foi esvaziado).
- `modules_guide.md` §15.1 — `Ctrl+Up` virou `Control+Up`; `canChangeFloor` foi reescrito com `deltaZ` genérico; WASD **não** está em `walk.lua`.
- `modules_guide.md` §15.5 — exemplos com `map:setShader('nome')` (assinatura mudou).
- `synthesis.md` §17/§23/§25 — inteiro, por obsolescência de escopo (MMO).

---

## 3. Mapa dos módulos relevantes atuais

### 3.1 Núcleo C++ (`references/otclient/src/`)

| Arquivo | Linhas | Papel para nós |
|---|---|---|
| `src/client/mapview.cpp` / `.h` | 1.070 / 303 | **Câmera, viewport, floors visíveis, fading, draw order por diagonal, crosshair, highlight tile, cursores contextuais** |
| `src/client/uimap.cpp` / `.h` | 356 | Widget do mapa: zoom, aspect ratio, roteamento de draw, hover |
| `src/client/tile.cpp` / `.h` | 1.161 | **Pilha do tile, elevação, cobertura, ordem de desenho (ground → border → common → creature → top)** |
| `src/client/creature.cpp` / `.h` | 1.498 | **Animação de passo, `walkOffset`, step duration, nameplate, health bar, squares de target** |
| `src/client/localplayer.cpp` / `.h` | 741 | **Pre-walk, walk lock, `canWalk`, autoWalk + retry** |
| `src/client/map.cpp` / `.h` | 1.554 | Grid de tiles, `findPath` (Dijkstra), `findPathAsync`, spectators, widgets ancorados a tiles |
| `src/client/game.cpp` / `.h` | 2.369 | `attack`/`follow`/`use`/`move`/`autoWalk`, modos de luta e chase |
| `src/client/lightview.cpp` | 188 | Luz por tile e ambiente |
| `src/client/animatedtext.cpp` / `statictext.cpp` | — | **Números de dano flutuantes e balões de fala** |
| `src/framework/core/inputevent.h` | 55 | Struct único de input (tipo, tecla, botão, modificadores, `autoRepeatTicks`) |
| `src/framework/platform/platformwindow.cpp` | — | **Auto-repeat de tecla com `delay` por tecla** (`fireKeysPress`) |
| `src/framework/ui/uimanager.cpp` | 778 | Roteamento de input para a árvore de widgets |
| `src/framework/graphics/drawpool*.cpp` | 527+ | Batching por pool e `DrawOrder` |

**Pools de desenho** (`src/framework/graphics/declarations.h:58`): `MAP`, `CREATURE_INFORMATION`, `LIGHT`, `FOREGROUND_MAP`, `FOREGROUND`.
**Ordem dentro do pool MAP** (`DrawOrder`): `FIRST` ground · `SECOND` ground border · `THIRD` itens comuns e criaturas · `FOURTH` efeitos (quando "draw effects on top") · `FIFTH` overlays (ex.: sombra de andar superior).

### 3.2 Módulos Lua relevantes (`references/otclient/modules/`)

| Módulo | Arquivo principal | Linhas | Papel |
|---|---|---|---|
| `game_interface` | `gameinterface.lua` | 2.072 | Layout raiz, `processMouseAction`, menu de contexto, use-with, view modes |
| `game_interface` | `widgets/uigamemap.lua` | 169 | Clique/drag/drop sobre o mapa |
| `game_interface` | `widgets/statsbar.lua` | 860 | Barras de HP/mana/XP (topo e rodapé) |
| `game_walk` | `walk.lua` | 330 | Teclado direcional, smart walk, pre-walk, delays |
| `game_battle` | `battle.lua` | 2.623 | Battle list multi-instância, filtros, ordenação, targeting |
| `game_containers` | `containers.lua` | 1.173 | Janelas de container, páginas, sort, menu de contexto |
| `game_inventory` | `inventory.lua` | 553 | 10 slots de equipamento |
| `game_actionbar` | `game_actionbar.lua` + `logics/*` | 6.319 | 9 barras × 50 slots, hotkeys, drag-drop, cooldown por slot |
| `game_cooldown` | `cooldown.lua` | 315 | Barra global de cooldown de spell e de grupo |
| `game_hotkeys` | `hotkeys_manager.lua` | 1.036 | Editor de hotkeys, `HOTKEY_ACTION`, `hotkeyDelay` |
| `game_console` | `console.lua` | 2.770 | Chat + **chave do modo walk/chat (WASD)** |
| `game_healthcircle` | `statusiconbar.lua` | 857 | Ícones de condição/estado |
| `corelib` | `keybind.lua` | 1.064 | **Keybinds com dualidade `CHAT_MODE` e presets por vocação** |
| `corelib` | `keyboard.lua` | 436 | `g_keyboard.bindKeyDown/Press/Up`, parsing de combos |
| `gamelib` | `ui/uicreaturebutton.lua` | — | Botão de criatura da battle list (cores de target/follow/hover) |
| `client_options` | `data_options.lua` | 863 | Constantes de *feel* (delays, crosshair, floor fading, controles) |
| `mods/game_bot` | `bot.lua`/`executor.lua` | 642 / 439 | Automação legada (loop 10 ms, sandbox por config) |

---

## 4. Fluxo de input

```
SO (Win32/X11/Cocoa/Android/WASM)
  └─ PlatformWindow::processKeyDown/Up            src/framework/platform/platformwindow.cpp
       ├─ mantém m_keyInfo[key] = { state, firstTicks, lastTicks, delay }
       ├─ dispara KeyDown  → em seguida um KeyPress imediato
       └─ PlatformWindow::fireKeysPress()  (a cada ≥2 ms)
            └─ para cada tecla presa, se (now - lastTicks) >= keyInfo.delay → KeyPress
                 com autoRepeatTicks = now - firstTicks
  └─ InputEvent { type, keyCode, keyText, mouseButton, mousePos, mouseMoved,
                  keyboardModifiers, wheelDirection, autoRepeatTicks }
  └─ GraphicalApplication → UIManager::inputEvent()   src/framework/ui/uimanager.cpp:78
       ├─ teclado → m_keyboardReceiver->propagateOnKeyDown/Press/Up   (widget focado, sobe a árvore)
       └─ mouse   → lista de widgets sob o cursor (respeitando phantom)
            onMousePress → onMouseMove/Drag → onMouseRelease → onMouseWheel
  └─ Lua: g_keyboard.bindKeyDown/bindKeyPress/bindKeyUp(combo, fn, widget)
       └─ Keybind (corelib/keybind.lua) por cima: categorias, presets e CHAT_MODE
```

**Os três detalhes que importam:**

1. **Auto-repeat é por tecla, não global.** `game_walk` explora isso: no `keyDown` o delay da tecla cai para **1 ms**, no `keyUp` volta para **30 ms**, e o painel raiz tem `setAutoRepeatDelay(200)`. Resultado: o primeiro passo sai imediato e o *hold* vira uma corrente contínua limitada pelo step duration, não pelo teclado.
   `references/otclient/modules/game_walk/walk.lua:294-305`
2. **`Keybind` tem dois mapas paralelos**: `CHAT_MODE.ON` e `CHAT_MODE.OFF`. Cada ação pode ter tecla diferente em cada modo, e há presets nomeados por vocação (`Druid`, `Knight`, `Paladin`, `Sorcerer`, `Monk`) persistidos em `/controls/keybinds/<preset>.otml` e `/controls/hotkeys/<preset>.otml`.
   `references/otclient/modules/corelib/keybind.lua:1-120`
3. **O modo walk é o console que liga/desliga.** `switchChat(enabled)` chama `unbindMovingKeys()`/`bindMovingKeys()` — WASD, QEZC e `Control+WASD` — e `Keybind.setChatMode(...)`. `Enter` em modo walk abre um chat **temporário** marcado `*`; ao enviar, volta para WASD.
   `references/otclient/modules/game_console/console.lua:374-465`

---

## 5. Fluxo de movimento

### 5.1 Teclado

```
tecla ↓  → changeWalkDir(dir)          empilha em smartWalkDirs; combina cardeais em diagonal
tecla ⟳  → smartWalk(dir) → addWalkEvent(dir)
             └─ só executa se g_keyboard.getModifiers() == KeyboardNoModifier
             └─ walk(smartWalkDir or dir)
tecla ↑  → changeWalkDir(dir, pop)     desempilha
```

`walk(dir)` — `references/otclient/modules/game_walk/walk.lua:76`:

1. aborta se morto ou `player:isWalkLocked()`;
2. cancela follow ativo;
3. se auto-walking / server-walking: `g_game.stop()` + `lockWalk(stepDuration + 50)` e **retorna** (o primeiro toque *para*, o segundo *anda*);
4. se `not player:canWalk()`: guarda `nextWalkDir` (fila de 1) e retorna;
5. com `GameAllowPreWalk`: valida tile destino (`isWalkable()` ou `canChangeFloor(±1)`) e chama `player:preWalk(dir)`;
6. `lastManualWalk = g_clock.millis()`; `g_game.walk(dir)`.

`onWalkFinish` executa o `nextWalkDir` imediatamente sem pre-walk, ou agendado em **50 ms** com pre-walk.

### 5.2 Clique (click-to-move)

```
UIGameMap:onMouseRelease            modules/game_interface/widgets/uigamemap.lua:105
  ├─ autoWalkPos = self:getPosition(mousePosition)     tela → mundo
  ├─ se z do clique ≠ z do player: projeta (x+dz, y+dz, z do player)
  ├─ tile clicado → getTopLookThing / getTopUseThing / getTopCreature
  ├─ tile de autoWalkPos → attackCreature
  └─ game_interface.processMouseAction(...)
       └─ player:autoWalk(autoWalkPos)
            └─ LocalPlayer::autoWalk        src/client/localplayer.cpp:168
                 └─ g_map.findPathAsync(...)  Dijkstra, assíncrono
                      ├─ falha → até 3 retries (200/300/400 ms) → onAutoWalkFail
                      └─ ok    → path limitado a 127 direções → g_game.autoWalk(path, start)
```

### 5.3 Animação e cadência do passo

`Creature::walk(oldPos, newPos)` → `m_walkTimer.restart()`, `m_walkedPixels = 0`, `nextWalkUpdate()`.

`Creature::updateWalk()` — `references/otclient/src/client/creature.cpp:800`:

- `walkTicksPerPixel = getStepDuration(true) / 32`
- `totalPixelsWalked = min(walkTimer.ticksElapsed() / walkTicksPerPixel, 32)` — **monotônico** (`max` com o valor anterior) para não regredir com paralisia
- `updateWalkOffset(px)` → deslocamento sub-tile em pixels por direção
- `updateWalkingTile()` → decide em qual tile a criatura é **desenhada** (não em qual ela *está*): o retângulo virtual da criatura precisa ter o canto inferior-direito dentro do tile; na primeira metade do passo, NW/SE recebem tratamento especial para passar corretamente atrás/na frente de objetos
- ao chegar em 32 px → `terminateWalk()`: aplica o `m_walkTurnDirection` pendente, zera offset, e agenda o reset da fase de animação em `g_game.getServerBeat()`

`getStepDuration()` — `references/otclient/src/client/creature.cpp:1106`:

```
stepDuration = 1000 * groundSpeed / speed          (groundSpeed default 150)
stepDuration = ceil(stepDuration / serverBeat) * serverBeat     (>= client 860)
diagonalDuration = stepDuration * diagonal-walk-speed           (3, de data/setup.otml)
walkDuration = min(stepDuration / 32, 1000/60)                  (tick de update)
```

A cadência é **quantizada pelo server beat** — é isso que dá o "clique" rítmico do passo tibiano. Diagonal custa 3× por padrão.

`updateWalkAnimation()`: `footDelay = clamp(walkSpeed / footAnimDelay, minFootDelay, maxFootDelay)` com `minFootDelay = 20` (30 com `GameEnhancedAnimations`) e `maxFootDelay = 80` (205 se ≤2 fases). Se o passo diagonal dura mais que a animação, a fase trava em 0 em vez de animar em loop.

### 5.4 Delays de *feel* (defaults em `client_options/data_options.lua`)

| Opção | Default | Efeito |
|---|---|---|
| `walkTurnDelay` | **100 ms** | trava o andar depois de virar parado |
| `walkTeleportDelay` | **50 ms** | trava depois de teleporte (offset ≥3 tiles ou ≥2 andares) |
| `walkStairsDelay` | **50 ms** | trava depois de mudança de andar |
| `hotkeyDelay` | **70 ms** | intervalo mínimo entre disparos de hotkey |
| `smartWalk` | off | compor diagonais a partir de duas cardeais |
| `autoChaseOverride` | on | trocar de alvo re-arma o chase |

E, no código: `turn()` usa 50 ms (toque) / 150 ms (repetido); `onCancelWalk` → `lockWalk(50)`; cancelar autowalk → `lockWalk(stepDuration + 50)`; `bindTurnKey` no `keyUp` → `lockWalk(200)`.

---

## 6. Targeting

### 6.1 Estado

`Game` guarda **um** `m_attackingCreature` e **um** `m_followingCreature`, mutuamente exclusivos:

- `Game::attack(creature)` — atacar o alvo atual **cancela** o ataque; atacar com follow ativo cancela o follow; sempre chama `m_localPlayer->stopAutoWalk()`; emite `g_game.onAttackingCreatureChange(new, old)`.
- `Game::follow(creature)` — simétrico, emite `onFollowingCreatureChange`.
- `Game::cancelAttackAndFollow()` — limpa os dois e emite `onCancelAttackAndFollow`.
  `references/otclient/src/client/game.cpp:970-1032`

### 6.2 Como se seleciona um alvo

| Entrada | Caminho |
|---|---|
| Clique no mapa (smart left click) | `processMouseAction` → `g_game.attack(attackCreature or creatureThing)` — NPCs são **excluídos** e viram `talk("hi")` se estiverem a ≤3 tiles no mesmo andar |
| `Alt` + clique | força ataque mesmo fora do smart click |
| Clique na battle list | `onBattleButtonMouseRelease` — esquerdo alterna atacar/cancelar; direito abre o menu de contexto; `Shift`+esquerdo faz look; esquerdo+direito juntos fazem look |
| Menu de contexto | entradas Attack / Follow criadas por `createThingMenu` |
| Teclado | `attackNext(previous)` percorre os botões *visíveis* da battle list principal e ataca o próximo/anterior a partir do que tem `isTarget` |

### 6.3 Marcação visual

Duas marcas, ambas desenhadas em `Creature::draw` **antes** do sprite (`references/otclient/src/client/creature.cpp:79`):

- **static square** — `showStaticSquare(color)` / `hideStaticSquare()`, 32×32, borda de 2 px, persiste enquanto o alvo estiver ativo.
- **timed square** — `addTimedSquare(color8bit)`, 28×28 com offset +2, auto-remove após `volatile-square-duration` (**1000 ms**, `data/setup.otml`). É o "quadrado piscante" de quem te atacou.

`game_battle` só desenha o static square no mundo quando **não** há botão correspondente na lista (`onAttack`, `battle.lua:2041`); com botão, a cor vai para o próprio botão via `UICreatureButton.getCreatureButtonColors()`.

### 6.4 Battle list

`BattleListInstance:checkCreatures()` (`battle.lua:1003`) reconstrói a lista inteira: `getMapPanel():getSpectators()` → filtra → `addCreature`. É chamada em `onCreatureAppear/Disappear/PositionChange/HealthPercentChange` (com `scheduleEvent` para agrupar) e por um `autoSaveEvent` periódico.

Filtros (`doCreatureFitFilters`): exclui o próprio jogador, mortos, andar diferente, `not canBeSeen()`, e aplica os toggles `hidePlayers/hideNPCs/hideMonsters/hideSkulls/hideParty/hideKnights/hidePaladins/hideDruids/hideSorcerers/hideMonks/hideSummons/hideMembersOwnGuild`.
Ordenação: `name`, `distance`, `health`, `age` (tempo de exibição), asc/desc — persistida por instância em `g_settings`.

---

## 7. Feedback

| Sinal | Mecanismo | Onde |
|---|---|---|
| **Números de dano/cura** | `AnimatedText` — sobe verticalmente durante `animated-text-duration` (**1000 ms**), e textos próximos **se fundem somando o valor** se ocorrerem dentro de `duration/2.5` | `src/client/animatedtext.cpp` |
| **Fala / mensagens no mundo** | `StaticText` — duração = `max(min-static-text-duration 3000, static-duration-per-character 60 × nº de chars)` | `src/client/statictext.cpp` + `data/setup.otml` |
| **Barra de vida sobre a criatura** | 31×4 px com borda preta, preenchimento por faixa de % (6 cores, de `#00BC00` a `#850C0F`); cinza `#606060` quando a criatura está coberta | `src/client/creature.cpp:166` |
| **Nome** | mesma cor da barra; NPC em `#66CCFF` se cheio de vida | idem |
| **Mana / mana shield / Harmony** | barras extras empilhadas sob a de vida, só para o jogador local | `src/client/creature.cpp:249` |
| **Skull / party shield / emblema / ícones** | texturas posicionadas em offsets fixos ao redor da barra; o shield **pisca** a cada `shield-blink-ticks` (500 ms) | idem |
| **Cooldown de spell** | `UIProgressRect` animado em passos de 100 ms (`+= 10000/duration`) tanto na barra global quanto no slot da action bar | `modules/game_cooldown/cooldown.lua:173` |
| **Cursor contextual** | troca automática entre `attack`, `talk`, `containercursor`, `quicklootcursor`, `pointinghand`, `walk`, `default` conforme o que está sob o mouse | `src/client/mapview.cpp:584`, sprites em `data/cursors/` |
| **Crosshair** | textura desenhada no tile sob o mouse; opção `crosshair` (`default`/`disabled`/…) | `src/client/mapview.cpp:190` |
| **Highlight tile** | `updateHighlightTile` marca o tile hovered; `setDrawHighlightTarget` liga/desliga | `src/client/mapview.cpp:1046` |
| **Efeitos mágicos** | `Effect` adicionado ao tile pelo protocolo; `effect-ticks-per-frame` = 75 ms | `src/client/effect.cpp` |
| **Toasts / notificações** | `modules/game_notifications` (novo desde o baseline) | — |

---

## 8. Câmera

**Modelo:** a câmera não é um objeto com posição contínua. Ela é `getCameraPosition()`, que devolve **a posição em tiles da criatura seguida** (ou uma posição custom):

```cpp
Position MapView::getCameraPosition() {
    return isFollowingCreature() ? m_followingCreature->getPosition() : m_customCameraPosition;
}
```

A suavidade vem do **framebuffer**, não da câmera: `calcFramebufferSource()` desloca o retângulo de origem pelo `walkOffset` (0–32 px) da criatura seguida.

```cpp
Point drawOffset = ((m_drawDimension - m_visibleDimension - Size(1)).toPoint() / 2) * m_tileSize;
if (isFollowingCreature())
    drawOffset += m_followingCreature->getWalkOffset() * scaleFactor;
```
`references/otclient/src/client/mapview.cpp:828`

**Consequências práticas** (isto *é* o feeling de câmera do Tibia):
- a câmera "gruda" no personagem em sub-pixel enquanto ele anda, mas a **grade lógica salta de tile em tile**;
- o mapa desenhado é sempre `visibleDimension + 3` tiles (margem para o offset) — daí o buffer maior que a viewport;
- não existe smoothing, damping, lookahead ou zoom contínuo: o "zoom" muda a **dimensão visível em tiles** (ímpar, mínimo 3, `m_maxZoomIn = 3`, `m_maxZoomOut = 513`, passo de 2), o que reconstrói geometria e framebuffer;
- `onCameraMove` reorienta o *viewport aware range* na direção do movimento (`updateViewport(direction)`), carregando um tile a mais à frente.

**Andares (o eixo Z é uma câmera dentro da câmera):**
- `calcFirstVisibleFloor` / `calcLastVisibleFloor` decidem a faixa desenhada; abaixo do `sea-floor` (7) o range é limitado por `aware-underground-floor-range` (2);
- `Otc::FloorViewMode`: `NORMAL`, `FADE`, `LOCKED`, `ALWAYS`, `ALWAYS_WITH_TRANSPARENCY` (default = `FADE`);
- `floorFading` = **500 ms** por padrão: ao subir/descer, os andares entram e saem com opacidade interpolada por `Timer` por andar;
- `m_shadowFloorIntensity`: retângulo preto sobre o andar imediatamente acima da câmera;
- em `ALWAYS_WITH_TRANSPARENCY`, tiles perto do jogador ficam com opacidade `.16` e os distantes `.7`.

**Configuração base** (`references/otclient/data/setup.otml`): `viewport: 8 6`, `sprite-size: 32`, `max-z: 15`, `sea-floor: 7`, `tile.max-elevation: 24`, `tile.max-things: 10`.
**Dimensão visível padrão do widget**: 15×11 tiles, `setKeepAspectRatio(true)` (`modules/game_interface/widgets/uigamemap.lua:3`).

---

## 9. UI de combate

| Peça | Onde | O que faz |
|---|---|---|
| **StatsBar** | `modules/game_interface/widgets/statsbar.lua` | HP/mana/XP em barras horizontais no topo e/ou rodapé; dimensão e posição configuráveis (`updateStatsBar(dimension, placement)`) |
| **HealthCircle** | `modules/game_healthcircle/game_healthcircle.lua` (807) | Círculo de HP/mana sobreposto ao mapa (feature exclusiva do fork) |
| **Status icons** | `modules/game_healthcircle/statusiconbar.lua` (857) | Ícones de condição (envenenado, paralisado, etc.) |
| **Battle list** | `modules/game_battle/` | Ver §6.4 |
| **Action bar** | `modules/game_actionbar/` | 9 barras × 50 slots; tipos `UseOnYourself`, `UseOnTarget`, `SelectUseTarget`, `Equip`, `Use`, `chatText`, `passiveAbility`; hotkey por slot (`TriggerActionButton_<bar>.<slot>`); overlay `UIProgressRect` de cooldown; drag-drop de item/spell; persistência em `/settings/clientoptions.json` |
| **Cooldown global** | `modules/game_cooldown/` | Ícones por grupo de spell + ícones individuais, com `SpellProgressRect` |
| **Hotkeys** | `modules/game_hotkeys/hotkeys_manager.lua` | Editor, captura de combo, detecção de conflito com action bar e `Keybind`, `HOTKEY_ACTION` (use yourself / crosshair / target / equip / use / text / text auto / spell) |
| **Modos de luta** | `g_game.setFightMode/setChaseMode/setPVPMode/setSafeFight` | Offensive/Balanced/Defensive + chase on/off |

**Padrão de use-with (crosshair):** `startUseWith(thing)` coloca a UI em modo *mouse grabber*; o próximo clique resolve `onUseWith(clickedWidget, mousePosition)` e chama `g_game.useWith(thing, target)`. `Esc` cancela via keybind "Stop All Actions".
`references/otclient/modules/game_interface/gameinterface.lua:474-556`

---

## 10. Inventário e containers

### 10.1 Inventário

10 slots fixos (`InventorySlotHead/Neck/Back/Body/Right/Left/Leg/Feet/Finger/Ammo`), cada um um `UIItem`. Atualização por evento `onInventoryChange(player, slot, item, oldItem)`. Drag-drop entre slot ↔ container ↔ mapa é o mesmo mecanismo de `UIItem`.
`references/otclient/modules/game_inventory/inventory.lua`

### 10.2 Containers

Modelo C++ (`src/client/container.h`): `id`, `capacity`, `size`, `firstIndex`, `hasPages`, `hasParent`, `unlocked`, `containerItem`, e a lista de itens.

Ciclo (`modules/game_containers/containers.lua`):

```
g_game.open(item)                    → servidor responde
onContainerOpen(container, previous) → cria/reaproveita ContainerWindow (MiniWindow)
   ├─ upButton → g_game.openParent(container)   (visível se hasParent)
   ├─ grid de UIItem dimensionado por layout; altura máxima = linhas × célula + 31 (55 com páginas)
   ├─ paginação quando hasPages
   └─ onClose → g_game.close(container)
onContainerUpdateItem(container, slot, item, oldItem)
onContainerChangeSize(container, size)
```

A janela é uma `MiniWindow`, portanto herda dock/undock nos painéis laterais e **persistência por personagem** via `CharMiniWindows`. Menu de contexto por container: ordenar, mover, fechar todos, etc. (`showContainersContextMenu`, `sortContainerItems`).

**Detalhes de *feel* do container tibiano:** abrir um container dentro de outro **substitui a janela** (mesmo widget, novo id) em vez de abrir uma segunda — é o `previousContainer` no `onContainerOpen`. Isso é o que faz a "navegação por mochilas" parecer um único painel que muda de conteúdo.

---

## 11. Padrões relevantes (arquiteturais)

1. **Controller** (`modules/modulelib/controller.lua`) — objeto de ciclo de vida por módulo: `onInit`/`onTerminate`/`onGameStart`/`onGameEnd`, `registerEvents(obj, {...})`, e cleanup automático de eventos, keybinds e opcodes. Evita o vazamento clássico de `connect` sem `disconnect`.
2. **Declarativo + script** — `.otui` descreve a árvore de widgets e estilos (com âncoras, estados `$hover/$pressed/$on`), `.lua` só liga comportamento. Recarregável sem recompilar.
3. **Eventos globais em vez de polling** — `connect(g_game, {...})`, `connect(LocalPlayer, {...})`, `connect(Creature, {...})`. O C++ chama `callLuaField`/`callGlobalField` nos pontos de mudança de estado.
4. **`scheduleEvent` / `cycleEvent` / `addEvent`** — todo o timing de UI é agendado no dispatcher, single-thread. Nada de `_process` por widget.
5. **Cache de estado derivado com invalidação explícita** — `m_stepCache` (invalidado por mudança de speed/groundSpeed), `m_isCovered` com bits "checked/state", `cachedVisibleTiles` reconstruído só quando a câmera muda.
6. **Separar "posição lógica" de "posição de desenho"** — `getPosition()` (tile) vs `m_walkOffset`/`m_walkingTile`/`getDrawElevation()`. Toda a suavidade visual vive no segundo grupo.
7. **Pools de desenho com ordem explícita** — em vez de z-index por objeto, cinco pools e cinco `DrawOrder` dentro do pool do mapa.
8. **Persistência por personagem** — `CharMiniWindows[charName][widgetId]` guarda painel-pai, índice, altura, minimizado, fechado.

---

## 12. Comportamentos que criam o *feeling* de Tibia

Esta é a lista que importa para o Godot. Cada item é um comportamento observável, com o número concreto:

1. **Movimento em grade com passo quantizado.** O personagem só existe em tiles inteiros; o passo dura `1000 × groundSpeed / speed`, arredondado **para cima** para múltiplo do server beat. É o arredondamento que dá o ritmo — sem ele, o andar parece "escorregadio".
2. **Diagonal custa 3×.** Não é penalidade de distância euclidiana; é multiplicador fixo configurável.
3. **Pre-walk.** O cliente move o sprite **antes** de qualquer confirmação e corrige depois. Latência percebida ≈ 0. Em single-player isso vira "o input nunca espera a simulação".
4. **Sub-tile offset de 0→32 px com animação de pé independente.** O deslocamento é linear em pixels; a troca de frame do pé tem o **próprio** relógio (`footDelay` entre 20 e 205 ms). Os dois desincronizam de propósito.
5. **A câmera é o personagem.** Zero suavização, zero lookahead; a câmera é a posição do tile + o mesmo offset sub-tile do sprite.
6. **Virar não é andar.** Tocar a direção quando parado gira o personagem e trava o andar por `walkTurnDelay` (100 ms). Segurar anda.
7. **O primeiro toque cancela, o segundo age.** Andar durante autowalk/server-walk apenas **para** e trava por `stepDuration + 50`.
8. **Fila de um passo.** Só `nextWalkDir` (um) é bufferizado; com pre-walk ele sai 50 ms após o passo anterior. Isso evita fila infinita de inputs.
9. **Diagonais compostas.** Duas cardeais simultâneas viram diagonal (`smartWalk`), com pilha de direções pressionadas.
10. **Modificador de teclado suspende o andar.** Segurar Ctrl/Alt/Shift enquanto anda **não** anda — o combo é para outra coisa.
11. **Teclado é modal: chat ou movimento.** WASD só existe quando o chat está desligado; `Enter` alterna, e existe o modo "chat temporário" que volta sozinho para o movimento após uma mensagem.
12. **Um clique faz a coisa mais óbvia.** `processMouseAction` é uma cascata de prioridades: NPC próximo → falar; criatura → atacar; item usável → usar; container → abrir; tile andável → autowalk; senão → look.
13. **Um alvo só, e alternar o alvo atual o cancela.** Attack e follow são mutuamente exclusivos.
14. **Duas marcas de alvo com semânticas diferentes:** quadrado estático (meu alvo, persiste) e quadrado temporizado (evento, 1000 ms).
15. **Nameplate compacta e legível:** barra 31×4, nome logo acima, cor da barra = cor do nome, escala por faixas fixas de %.
16. **Números de dano se fundem.** Dois números no mesmo lugar dentro de 400 ms viram um número somado. Sem isso, hunts viram sopa numérica.
17. **Andares desvanecem, não cortam.** Ao subir/descer, os andares entram/saem em 500 ms.
18. **O que está acima de você escurece.** Sombra sobre o andar `z+1`.
19. **Criaturas passam atrás e na frente de objetos corretamente.** `updateWalkingTile()` reatribui o tile de desenho na metade do passo, com casos especiais para NW e SE.
20. **O cursor conta a história antes do clique.** Sete cursores contextuais + crosshair no tile.
21. **Cooldown é sempre um preenchimento radial/retangular sobre o ícone**, nunca um número isolado.
22. **Cooldown não persiste entre sessões**; a configuração da barra, sim.
23. **Cada janela lembra onde estava, por personagem.**
24. **Container filho substitui a janela do pai** (navegação de mochila em um painel só).

---

## 13. O que recriar de forma idiomática em Godot

| Conceito OTClient | Forma idiomática em Godot |
|---|---|
| `Map` (grid esparso de `Tile`) + `MapView` | `TileMapLayer` por andar (Z) + um `Node2D` "MapView" que só controla quais camadas estão visíveis/opacas. **Não** portar a estrutura de tiles em C++ |
| `MapView::calcFramebufferSource` + `walkOffset` | `Camera2D` com `position = tile_origin + walk_offset`, `position_smoothing_enabled = false`. A suavidade vem do offset do ator, não do smoothing da câmera |
| `visibleDimension` ímpar + framebuffer maior | `SubViewport` com resolução fixa em tiles × 32 e `Camera2D` com zoom inteiro. Zoom por **degraus inteiros**, nunca contínuo |
| Loop `updateWalk` a ~60 Hz por criatura | `Tween` por passo, ou um `_physics_process` com o mesmo cálculo `pixels = elapsed / ticks_per_pixel`. O `Tween` é mais idiomático e dá o mesmo resultado se a curva for linear |
| `m_stepCache` (duração de passo) | `@export`ed stats + função pura `step_duration(speed, ground_speed, diagonal)`; cachear só se o profiler pedir |
| `DrawOrder` FIRST..FIFTH dentro do pool MAP | `YSort` (`Node2D.y_sort_enabled`) + `z_index` por camada lógica (ground / border / objects / creatures / top / effects) |
| `updateWalkingTile()` (tile de desenho ≠ tile lógico) | Manter: com YSort, ajustar o `global_position` do sprite pelo offset já resolve a maior parte; os casos NW/SE ainda precisam de regra explícita |
| `InputEvent` + auto-repeat por tecla | `InputMap` + ações; o *hold* contínuo é resolvido por `Input.is_action_pressed()` no `_physics_process` com o próprio cooldown de passo — **não** replicar o auto-repeat do SO |
| `Keybind` com `CHAT_MODE.ON/OFF` | Dois `InputMap` context sets, ou um `input_context` enum que filtra ações. Godot 4 não tem contexts nativos: um `InputContextManager` autoload simples basta |
| `g_keyboard.bindKeyDown(combo, fn, widget)` | Sinais + `_unhandled_input` no nó dono. Nada de registro global de callbacks |
| `processMouseAction` (cascata de prioridades) | Uma função `resolve_click(tile, modifiers, button) -> ClickIntent` que devolve uma intenção (`ATTACK`, `USE`, `OPEN`, `LOOK`, `WALK_TO`), testada por unidade. **Manter a cascata; não manter as 550 linhas** |
| `findPathAsync` (Dijkstra) | `AStarGrid2D` (nativo, já em C++) com `default_compute_heuristic = OCTILE` e custo de terreno via `set_point_weight_scale` |
| `addMenuHook(category, name, cb, condition)` | `PopupMenu` alimentado por um registry de ações com predicado — o padrão em si é bom, vale manter |
| Battle list | `ItemList`/`VBoxContainer` alimentado por um `TargetingService` que já entrega a lista filtrada e ordenada. **Não** reconstruir a lista inteira a cada evento: usar sinais granulares |
| Nameplate + barra de vida em `Creature::drawInformation` | `Control` filho do ator com `top_level = false`, ou um `_draw()` custom. Manter as proporções (31×4, 6 faixas de cor) |
| `AnimatedText` com fusão de números | `Node2D` pool + a regra de merge (mesma posição, < duração/2.5 → soma). A regra é o valor; o resto é trivial |
| MiniWindow + docking + `CharMiniWindows` | `Control` + `ConfigFile`/`user://`. Docking arrastável é caro: avaliar se um layout fixo com painéis colapsáveis não entrega 90% do feeling |
| `Controller` (ciclo de vida de módulo) | `Node` com `_ready`/`_exit_tree` + autoload de serviços. Godot já resolve isto |
| `.otui` | `.tscn` + temas (`Theme` resource). Equivalência direta |
| Cursores contextuais | `Input.set_custom_mouse_cursor(texture, shape, hotspot)` acionado pelo mesmo `resolve_click` que decide a intenção |
| `g_settings` / `data_options.lua` | `ConfigFile` + um `Settings` autoload; **copiar os valores default** (100/50/50/70 ms, 500 ms de fade, 1000 ms de square) |
| `data/setup.otml` | Um `GameConfig` Resource com os mesmos campos (`sprite_size`, `viewport`, `max_elevation`, `diagonal_walk_speed`, durações de animação) |

---

## 14. O que descartar

| Descartar | Motivo |
|---|---|
| Todo o protocolo (`protocolgame*.cpp`, opcodes, extended opcodes, protobuf) | Single-player: não há servidor. O baseline dedica ~1.000 linhas a isso |
| A tabela de extended opcodes do baseline (§17.3/§23.4/§25.7) e os 11 blueprints em `features/` | Escopo MMO extinto |
| Pre-walk como *correção de latência* | Sem rede não há o que corrigir. **Manter só a lição**: input aplica imediatamente. Nada de `m_preWalks`, `adjustInvalidPosEvent`, retries de autowalk |
| `walkMaxSteps`, `serverBeat`, `serverWalk`, `lastAutoWalkPosition` | Idem. O quantum de passo pode virar uma constante local (`STEP_QUANTUM_MS`) se quisermos o ritmo, sem o conceito de "beat do servidor" |
| Sistema de módulos `.otmod` + PhysFS + hot-reload de Lua | Godot já tem cenas, autoloads e recursos |
| `UIWidgetHTML` (72 KB de renderer HTML/CSS) | Curiosidade do fork; irrelevante |
| Threading model de 3 threads + `DrawPool` + `TextureAtlas` | O renderer do Godot resolve isso. Copiar só a **ordem de desenho conceitual** |
| Sistema `.dat`/`.spr` / `ThingType` / `Animator` / appearances protobuf | Vamos usar assets próprios. O que interessa é o conceito de "ticks per frame por categoria" — em `data/setup.otml`: `invisible`/`item`/`effect`/`missile` = **75 ms** (os defaults de `gameconfig.h` são 500/500/75/75 e ficam sobrescritos) |
| `mods/game_bot` / vBot como **automação de jogo** | Bot de MMO não faz sentido em single-player. **Manter como referência de UX de helper**: painéis de configuração declarativos, condições encadeadas, prioridade entre regras — o baseline em `vBot/` já cobre isso e continua válido |
| Battle list multi-instância (`BattleListManager`) | Complexidade de MMO. Uma lista só |
| Modos `classicControl` × `smartLeftClick` × 3 `lootControlMode` | Escolher **um** esquema de controle e cravar. A matriz existe por legado de 20 anos de Tibia |
| Paperdolls, attached effects APNG, shaders por criatura | Interessantes, mas são features do fork, não *feeling* de Tibia. Reavaliar depois do core |
| `game_cyclopedia`, `game_wheel`, `game_forge`, `game_market`, `game_store`, `game_prey`, `game_taskboard`, `game_proficiency` | Sistemas de MMO moderno; fora do escopo do core loop |

---

## 15. Caminhos concretos (referência rápida)

### Movimento e câmera
```
references/otclient/modules/game_walk/walk.lua                       (330)  teclado, smart walk, delays
references/otclient/src/client/localplayer.cpp:33-215                        canWalk, preWalk, autoWalk
references/otclient/src/client/creature.cpp:497-852                          walk, updateWalk, walkingTile, terminateWalk
references/otclient/src/client/creature.cpp:1106                             getStepDuration
references/otclient/src/client/mapview.cpp:828                               calcFramebufferSource (offset da câmera)
references/otclient/src/client/mapview.cpp:733-762                           followCreature / setCameraPosition
references/otclient/src/client/mapview.cpp:846-923                           calcFirst/LastVisibleFloor
references/otclient/src/client/map.cpp                                       findPath (Dijkstra), findPathAsync
references/otclient/data/setup.otml                                          constantes de mundo
```

### Input
```
references/otclient/src/framework/core/inputevent.h                          struct InputEvent
references/otclient/src/framework/platform/platformwindow.cpp:216            fireKeysPress (auto-repeat)
references/otclient/src/framework/ui/uimanager.cpp:78                        roteamento de input
references/otclient/modules/corelib/keyboard.lua                     (436)   g_keyboard
references/otclient/modules/corelib/keybind.lua                      (1064)  Keybind, CHAT_MODE, presets
references/otclient/modules/game_console/console.lua:374-465                 walk mode ⇄ chat mode
```

### Interação e seleção
```
references/otclient/modules/game_interface/widgets/uigamemap.lua     (169)   clique/drag no mapa
references/otclient/modules/game_interface/gameinterface.lua:962             processMouseAction
references/otclient/modules/game_interface/gameinterface.lua:474-556         use-with / trade-with (mouse grabber)
references/otclient/modules/game_interface/gameinterface.lua:589-608         addMenuHook / createThingMenu
references/otclient/src/client/mapview.cpp:584                               cursores contextuais
references/otclient/src/client/mapview.cpp:763-798                           getPosition (tela → mundo)
references/otclient/data/cursors/                                            20 cursores + cursors.otml
```

### Combate
```
references/otclient/src/client/game.cpp:970-1032                             attack / follow / cancel
references/otclient/src/client/creature.cpp:79-115                           squares de target
references/otclient/src/client/creature.cpp:166-365                          nameplate, barras, ícones
references/otclient/modules/game_battle/battle.lua                   (2623)  battle list
references/otclient/modules/gamelib/ui/uicreaturebutton.lua                  cores de target/follow/hover
references/otclient/modules/game_cooldown/cooldown.lua               (315)   cooldown global
references/otclient/modules/game_actionbar/                                  9 barras, hotkeys, cooldown por slot
references/otclient/modules/game_hotkeys/hotkeys_manager.lua                 editor de hotkeys
```

### Rendering
```
references/otclient/src/client/mapview.cpp:124-202                           drawFloor (fade, opacidade, walking_tiles)
references/otclient/src/client/mapview.cpp:306-450                           updateVisibleTiles (ordem diagonal)
references/otclient/src/client/tile.cpp:30-145                               Tile::draw (ordem da pilha)
references/otclient/src/framework/graphics/declarations.h:58                 DrawPoolType / DrawOrder
references/otclient/src/client/lightview.cpp                                 luz
```

### UI / inventário
```
references/otclient/modules/game_containers/containers.lua           (1173)
references/otclient/modules/game_inventory/inventory.lua             (553)
references/otclient/modules/game_interface/widgets/statsbar.lua      (860)
references/otclient/modules/game_healthcircle/statusiconbar.lua      (857)
references/otclient/modules/client_options/data_options.lua          (863)   defaults de feel
```

### Baseline (leitura, não editar)
```
C:\Kaezan\kaezan\mapping\baseline\client\modules_guide.md   §15  walk + UIGameMap  (ainda útil)
C:\Kaezan\kaezan\mapping\baseline\client\hud.md             §6,§9 layout + actionbar/cooldown
C:\Kaezan\kaezan\mapping\baseline\client\protocol.md        §5   catálogo de bindings
C:\Kaezan\kaezan\mapping\baseline\client\ui_system.md       §4,§14 otui + corelib
C:\Kaezan\kaezan\mapping\baseline\client\vBot\             UX de helper (válido)
C:\Kaezan\kaezan\mapping\baseline\client\synthesis.md       OBSOLETO (escopo MMO)
C:\Kaezan\kaezan\mapping\baseline\client\features\          OBSOLETO (escopo MMO)
```

---

## Apêndice — Como este delta foi apurado

- Leitura integral de `architecture.md` e `synthesis.md`; leitura dirigida de `hud.md` (§6, §9), `modules_guide.md` (§15), `protocol.md` (§5.4, §5.6); varredura de cobertura por termo nos 21 documentos do baseline (`camera`, `battle`, `container`, `mapview`, `drawpool`, `g_keyboard`, `targeting`, `awareRange`, …) para localizar as lacunas.
- `git log --since=2026-05-20` em `references/otclient` (57 commits) + `git log --diff-filter=A` para datar a entrada de cada módulo novo.
- **Diff arquivo-a-arquivo** entre `C:\Kaezan\kaezan\otclient-4.0` (fonte do baseline) e `references/otclient` em 20 arquivos-chave, separando drift do upstream de remoção dos hacks Kaezan.
- Leitura de código: `mapview.cpp/.h`, `creature.cpp/.h`, `localplayer.cpp`, `tile.cpp`, `game.cpp`, `uimap.cpp/.h`, `gameconfig.h`, `inputevent.h`, `platformwindow.cpp`, `uimanager.cpp`, `walk.lua`, `uigamemap.lua`, `gameinterface.lua`, `battle.lua`, `containers.lua`, `keybind.lua`, `console.lua`, `cooldown.lua`, `data_options.lua`, `data/setup.otml`.
- Nenhum arquivo em `references/` foi modificado; nenhuma build foi executada.
