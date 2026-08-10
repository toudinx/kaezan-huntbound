# C05 — Consolidação dos Mapeamentos Históricos

> **STATUS: EVIDÊNCIA HISTÓRICA.** Contratos de dados, deltas e lições de Canary/OTClient/RME
> continuam válidos. Traduções específicas para Godot foram substituídas pela arquitetura
> Phaser/TypeScript de `03_ADR_PHASER4_BROWSER_FIRST.md`.

> **Escopo.** Leitura dos baselines históricos de Canary e OTClient, comparação contra o objetivo
> atual do **Kaezan Huntbound**, contra os repositórios atuais em `references/` e contra as
> descobertas do Arena Fable (C03).
>
> **Nada foi implementado. Nada foi modificado em `mapping/`, `references/` ou no Arena Fable.**
>
> **Método.** Os baselines foram lidos primeiro; os repositórios atuais foram usados para validar.
> Os deltas mecânicos já apurados em **C01** (Canary) e **C02** (OTClient) foram *reaproveitados,
> não refeitos* — este documento é a camada de consolidação sobre eles, e aponta o que eles não
> cobriram.
>
> - Data desta análise: **2026-08-09**
> - Canary atual: `references/canary` @ `157e6f9e` (2026-08-06)
> - OTClient atual: `references/otclient` @ `1f5df261` (2026-08-05)
> - RME atual: `references/remeres-map-editor` @ `c136a752` (2026-07-29)

---

## Sumário executivo

1. **O acervo histórico é ~3× maior do que "os dois baselines".** Além de
   `mapping/baseline/{canary,client}`, existem `mapping/changes/` (118 arquivos, ~24 features,
   até **2026-06-16**), `mapping/canary/` (a cópia *viva* da qual o baseline foi congelado, com
   2 documentos que **nunca foram congelados**), o **GDD v0.5** (648 linhas) e — o mais importante —
   **código implementado** em `canary-3.4.1/data-kaezan/` e nos **13 módulos
   `otclient-4.0/modules/game_kaezan_*`**. O próprio `baseline/README.md` aponta para
   `mapping\changes\`; a instrução de C05 apontava só para o baseline. Ver §0.

2. **O baseline técnico envelheceu bem; o que envelheceu foi o *enquadramento*.** As fórmulas,
   schemas e catálogos continuam corretos (revalidei as principais hoje, §1). O que caducou é o
   pressuposto de que se estava construindo um **MMORPG sobre Canary + OTClient**. Praticamente
   toda "descoberta desatualizada" cai numa de duas categorias: número de linha, ou premissa de MMO.

3. **A camada mais valiosa nunca foi lida por C01/C02/C03: `mapping/changes/`.** Ali estão
   decisões de design **com motivação e alternativas descartadas** para exatamente os pilares que o
   Huntbound declara — **helper, postura, resina, dailies, sealed reward, morte simbólica, dungeon
   instanciada**. Não é especulação: é design que foi levado até a implementação e cujos
   *footguns* estão registrados. Ver §6.

4. **Sete sistemas foram projetados duas vezes** — uma vez no Kaezan: World (Canary/OTClient) e
   outra no Arena Fable (C#/Angular) — sem que os dois se conhecessem. Helper, postura/Echo Break,
   sealed reward, daily/energia, maestria, dungeon curta e companions/Echo Team. Em vários casos as
   duas versões **convergiram na mesma regra**, o que é a evidência mais forte disponível de que a
   regra está certa. Em outros, divergiram. Ver §6.1 — é a contribuição principal deste documento.

5. **Nada do acervo histórico foi validado em runtime.** O `INDEX.md` marca Sprint 0 e Sprint 1 como
   "Implementado — **aguarda teste**", e `changes/features/sprint1_qa/` diz explicitamente
   *"Dominante: nada foi testado em runtime"*. Todo número de balanceamento herdado é hipótese, não
   medição. Ver §7.

6. **A maior lacuna real do acervo é o RME.** Existe baseline de Canary e de OTClient; **não existe
   nenhum mapeamento do Remere's Map Editor**, e a decisão de mapa do Huntbound (converter /
   importar / autorar em Godot) depende dele. Ver §7.

---

## 0. Inventário real do acervo histórico

O material histórico está em **cinco camadas**, com datas e níveis de confiança diferentes.

| # | Camada | Local | Volume | Data | Coberto por |
|---|---|---|---|---|---|
| **A** | Baseline congelado | `kaezan\mapping\baseline\{canary,client}` | 48 arq. · ~1,4 MB | 2026-05-25/26 (vBot: 06-05/06) | C01, C02 |
| **B** | Cópia viva do mapeamento | `kaezan\mapping\canary\` | 54 arq. | 2026-05-24 → 06-01 | **ninguém** |
| **C** | Registro de mudanças | `kaezan\mapping\changes\` | 118 arq. | 2026-05-26 → **06-16** | **ninguém** |
| **D** | Código implementado | `kaezan\canary-3.4.1\data-kaezan\` · `kaezan\otclient-4.0\modules\game_kaezan_*` | ~60 arq. Lua · 13 módulos | até 2026-06 | **ninguém** |
| **E** | Design de produto | `kaezan\KAEZAN_GDD_v0.5.md` · `KAEZAN_SPRINT_0_1_SUMMARY.md` | 648 + 141 linhas | v0.5 | **ninguém** |

**Notas sobre cada camada:**

- **A — Baseline.** É o que a tarefa apontou. `README.md` declara: *"cópia imutável… estado vanilla
  dos engines antes das customizações do Kaezan"*, Canary **3.4.1**, OTClient **4.0 (fork Mehah)**.
  A própria nota diz: *"Para documentar mudanças do Kaezan, use `mapping\changes\`"* — ou seja, o
  baseline **sabe** que não é o acervo completo.

- **B — `mapping/canary/`.** É a árvore gêmea e viva do baseline (mesmos arquivos de `core/`,
  `gameplay/`, `systems/`, `meta/` e `client/`). Contém **dois documentos que nunca foram
  congelados no baseline**:
  - `mapping/canary/visual_content_creation.md` (17,9 KB) — guia transversal de criação de outfits,
    montarias, auras, itens, monstros e FX. Citado como leitura obrigatória no `INDEX.md`.
  - `mapping/canary/CODEBASE_MAP_ORIGINAL_BACKUP.md` (623 KB) — o mapa monolítico original do qual
    todo o baseline foi fatiado. Mesma relação de `OTCLIENT_MAP_ORIGINAL_BACKUP.md` (666 KB) na
    raiz de `mapping/`. São os **originais**; os arquivos do baseline são recortes deles.
  - `mapping/canary/python-scripts/` — 4 scripts de refactor em massa do código C++.

- **C — `mapping/changes/`.** O registro append-only. Estrutura por feature
  (`client.md` / `server.md` / `decisions.md` / `status.md`) para **24 features**, mais quatro
  documentos transversais: `decisions.md` (log de decisões com motivação e alternativas
  descartadas), `catalog.md`, `technical_debt.md` (**116+ entradas** de bugs e limitações reais) e
  `opcodes.md`. **É o material de maior densidade de decisão do acervo inteiro.**

- **D — Código.** `otclient-4.0/modules/` contém 13 módulos implementados:
  `game_kaezan_{boss_posture, character, charinfo, daily_hub, dojo, echo_spots, echo_team, helper,
  hud, mastery, potions, sealed_reward, shared}`. O servidor tem um datapack próprio,
  `canary-3.4.1/data-kaezan/`. **Isto não é documentação: é implementação de referência.**

- **E — GDD v0.5.** O documento de produto do Kaezan: World. É onde vivem as premissas que
  conflitam com o Huntbound (§5).

> **Correção de premissa da tarefa.** "Existem mapeamentos anteriores do Canary e do OTClient" é
> verdade, mas incompleto. Tratar apenas a camada A como "o trabalho anterior" descartaria as
> camadas C, D e E — que são justamente as que falam de **helper, postura, resina e dungeon**, os
> pilares declarados do Huntbound.

---

## 1. Descobertas ainda válidas

### 1.1 Canary — revalidadas contra o código atual **hoje**

Verifiquei diretamente estas, não apenas herdei de C01:

| Descoberta do baseline | Onde | Status |
|---|---|---|
| Fórmula de skill `skillBase[skill] × multiplier^(level − 11)` | `src/creatures/players/vocations/vocation.cpp:275` — hoje escrito `level − (minSkillLevel + 1)` com `minSkillLevel = 10` (`:237`), matematicamente idêntico. `skillBase = {50,50,50,50,30,100,20}` (`:236`) | ✅ **Válida** |
| Fórmula de dano de spell: `normal_random(levelFormula×mina + minb, levelFormula×maxa + maxb)` | `src/creatures/combat/combat.cpp:92-96`; `getLevelFormula` em `:33` | ✅ **Válida** |
| Pipeline de loot `MonsterType:generateLootRoll()` | `data/libs/functions/monstertype.lua:4`, consumido por `data/scripts/eventcallbacks/monster/ondroploot__base.lua:21` | ✅ **Válida** (mudou o caminho — §3) |
| Estrutura de vocação em XML, incluindo **Monk e Exalted Monk** | `data/XML/vocations.xml` — `None, Sorcerer, Druid, Paladin, Knight, Master Sorcerer, Elder Druid, Royal Paladin, Elite Knight, Monk, Exalted Monk` | ✅ **Válida** |
| Volumes de conteúdo | **1.656** monstros e **94** bosses em `data-otservbr-global/monster/` | ✅ **Válida** (confirmado por contagem) |
| Soul Pit / Tibiadrome como arena wave-based | `data-otservbr-global/scripts/quests/soulpit/` + `data/libs/systems/encounters.lua` | ✅ **Válida** |

Adicionalmente válidas (herdadas de C01, sem motivo para reverificar): estrutura completa do
monstro `.lua` (`creatures.md` §15.2), imbuements (`economy.md` §21.4), morte e bênçãos
(`death.md` §40.1-40.2), formato `.otbm`/spawns/teleports (`map.md` §36), bestiary/bosstiary/charms/
prey (`progression.md` §19), sistema de NPC e diálogo (`creatures.md` §35), e o guia
`meta/lua_vs_cpp.md` — que continua o melhor mapa de **"o que é dado" vs "o que é engine"** e é
diretamente reaproveitável como critério de separação `Resource` vs código em Godot.

### 1.2 OTClient — ainda válidas

Conforme C02 §1.2, e sem contestação: sistema de módulos `.otmod`, sintaxe `.otui` e modelo de
widget, `UIMiniWindow` + docking + persistência por personagem, layout do HUD (`gameRootPanel`),
superfície de bindings Lua como **catálogo de capacidades**, action bar + cooldown, modelo
conceitual do `game_walk`, pathfinding Dijkstra, cascata de clique e menu de contexto extensível.

**A adição de maior valor de C02** (que o baseline não tinha) é o §12 — *"comportamentos que criam o
feeling de Tibia"*, com os 24 números concretos (passo quantizado pelo server beat, diagonal ×3,
fila de 1 passo, `walkTurnDelay` 100 ms, fusão de números de dano em `duration/2.5`, fade de andar
500 ms, square temporizado 1000 ms). **Isto é o insumo mais acionável de todo o acervo para o
vertical slice** e deve migrar íntegro (§6).

### 1.3 vBot / `mods/game_bot` — válido como **UX de helper**

`baseline/client/vBot/` (INDEX + architecture + configs) foi escrito **em 2026-06-05, depois** do
congelamento do resto do baseline, e explicitamente *para* fundamentar o helper. C02 confirmou que
`mods/game_bot` recebeu **1 commit** desde então — é o trecho mais estável do acervo.

O próprio INDEX já traz o veredito de reuso, e ele continua correto para o Huntbound:
- **copiar (lógica, não código):** `targetbot` (prioridade/perigo de alvo), `HealBot`/`Sio` (cura por
  threshold/condição), `AttackBot`/`combo` (rotação de spell);
- **não copiar:** `cavebot` (navegação automática), `HTTP`/`BotServer`, `OutputMessage` cru,
  `Equipper`/logística de depot.

### 1.4 Design Kaezan (camada C) que sobrevive **engine-agnóstico**

Estas são regras de produto, não implementação — atravessam a troca de engine intactas:

| Regra | Origem | Por que sobrevive |
|---|---|---|
| **Resina não bloqueia acesso, bloqueia recompensa** | GDD §F08; `baseline/canary/systems/progression.md` §34.12 | Idêntica ao que o Huntbound declara em `BASE_CONTEXTO` §5 |
| **Resina regenera, nunca é vendida; sem overflow (cap duro)** | `progression.md` §34.12 "Como usar resina sem parecer gacha predatório" | Alinha com "não assuma monetização de energia" |
| **Helper: fila única de regras ordenadas, 1 ação por tick, sem jitter** | `changes/features/helper/design.md` | Determinismo — vale mais em Godot que em cliente de MMO |
| **Helper: regra bloqueada permite fallback para a seguinte** | idem | Evita o helper "travar" numa regra impossível |
| **`recentDamage` = HP perdido nos últimos 1000 ms como métrica de cura** | idem | Métrica derivada barata e legível |
| **Helper ≠ bot: sem auto-walk, o jogador navega** | `changes/decisions.md` 2026-06-05 e 2026-06-08 (H3.1) | É exatamente "o helper executa repetição, o jogador toma decisões" |
| **Boss Posture: barra além do HP, ciclos com multiplicador crescente** | GDD §F07 | Convergiu com o Arena Fable (§6.1) |
| **Morte simbólica: perde tempo, não progresso** | GDD §1; `changes/features/death/` | Pilar idêntico ao do Huntbound |
| **Sealed Reward: parte fixa + parte rerollável, coleta deliberada, não perde no logout** | `changes/decisions.md` 2026-05-31 (TASK 13/14) | Design puro |
| **Daily por pontos (100 pts em 5 steps), não por "completar todas"** | `changes/decisions.md` 2026-06-05 (C6.1) | Resolve o problema real de daily inalcançável; dá escolha |
| **Waves procedurais por *budget*, não composições fixas** | `changes/decisions.md` 2026-06-10 (Echo Spots) | `baseBudget × (1+growth×(w−1)) × tier`, pool com custo/peso/minWave, última wave = boss |
| **Custo cobrado na entrada, sem dupla cobrança no baú** | idem | Preserva o momento de abrir o baú |
| **Skill-gating por skill individual com penalidade suave, não bloqueio rígido** | `changes/decisions.md` 2026-06-01 | Bloqueio rígido é punitivo; penalidade preserva agência |

---

## 2. Descobertas desatualizadas

### 2.1 Já catalogadas por C01/C02 — **não repetir o trabalho**

- **Canary:** ver `docs/research/tibia/04_canary_mapping_delta.md` §3.7. Em resumo: modelo de
  concorrência do Dispatcher (`engine.md` §12.1), "dois datapacks de estrutura idêntica"
  (`creatures.md` §15.1), "IA de monstro é monolítica em `Monster::`", inventário de progressão
  (falta Weapon Proficiency), "mapa só via `.otbm` em disco", e **todos os números de linha**.
- **OTClient:** ver `docs/research/otclient/01_otclient_mapping_delta.md` §2.5. Em resumo:
  todos os números de linha, `hud.md` §6.6 (tabela de módulos `load-later`), `hud.md` §8
  (`game_healthinfo` foi esvaziado), `modules_guide.md` §15.1 e §15.5, e `synthesis.md` inteiro.

### 2.2 Desatualizadas — **novas neste documento**

| # | Documento | O que diz | Realidade | Gravidade |
|---|---|---|---|---|
| 1 | `baseline/canary/meta/kaezan_decisions.md` | *"Decisões Tomadas: (vazio — preencher conforme o projeto avança)"*, 5 decisões pendentes | **Superado inteiramente.** `mapping/changes/decisions.md` tem **50+ decisões tomadas**, com data, motivação e alternativas descartadas — inclusive as 5 "pendentes" (morte → simbólica; stamina → resina de conta; vocações → IDs 1-4; HUD → opcode; resina → HUD dedicada) | 🔴 **Não use** — leia `changes/decisions.md` |
| 2 | `baseline/canary/meta/technical_debt.md` | 12 TODOs/FIXMEs do Canary 3.4.1 | Snapshot de 3.4.1. Superado por `mapping/changes/technical_debt.md`, que **preserva** os herdados do Canary *e* adiciona 100+ entradas reais do Kaezan | 🟠 Snapshot histórico |
| 3 | `baseline/canary/meta/customization.md` | *"Crie `data-canary/scripts/spells/meuspell.lua`"* | Spells vivem **uma única vez** em `data/scripts/spells/` desde a reorganização de datapacks. O documento inteiro (7 receitas de "onde mexer") aponta para a topologia antiga | 🟠 Corrigir caminhos |
| 4 | `baseline/README.md` | *"Canary: versão 3.4.1 / OTClient: versão 4.0"* | Correto como descrição do **baseline**; incorreto se lido como descrição de `references/`. Hoje: Canary pós-`v3.6.0`, OTClient com protocolo alvo **1511** (era 1412) | 🟡 Ambiguidade de leitura |
| 5 | `mapping/INDEX.md` (tabela "Status do Projeto") | Estrutura e ponteiros do projeto MMO | Ponteiros para `canary/client/...` (camada B), não `baseline/client/...` (camada A) — **os dois existem** e divergem. O INDEX inteiro descreve um projeto que não é o Huntbound | 🟠 Útil como mapa do acervo, não como direção |
| 6 | `docs/research/tibia/04_canary_mapping_delta.md` §2 | *"pós-tag **v3.6.1**"* | `git describe` no clone atual devolve **`v3.6.0-49-g157e6f9e2`**. A tag `v3.6.1` existe no repositório mas **não é ancestral do HEAD**. Um `git diff v3.4.1..v3.6.1` mediria outra linha do tempo | 🟡 Correção pontual — congele por **commit**, não por tag |
| 7 | Qualquer doc Kaezan que cite vocações `Wizard=1 / Shaman=2 / Sentinel=3 / Warrior=4` | IDs de vocação do Kaezan | Descrevem o **fork** `canary-3.4.1`, onde `vocations.xml` foi renomeado in-place. O `references/canary` atual tem os nomes **vanilla** (Knight/Paladin/Sorcerer/Druid/Monk). Ver `changes/technical_debt.md` 2026-05-30 (TASK 10 QA) | 🟠 Fonte de confusão garantida |
| 8 | `baseline/client/features/*.md` (11 blueprints) | C02 marcou como *"OBSOLETO (escopo MMO)"* | **Parcialmente injusto.** O *código* (`.otui` + Lua + extended opcodes) está morto. A **coreografia de UX** não está — ver §6.2 | 🟡 Reclassificar, não descartar |

---

## 3. Caminhos alterados

### 3.1 Raízes de repositório (o mais importante e o mais fácil de errar)

| Papel | Caminho histórico | Caminho atual |
|---|---|---|
| Canary | `C:\Kaezan\kaezan\canary-3.4.1\` | `C:\Kaezan\kaezan-godot\references\canary` |
| OTClient | `C:\Kaezan\kaezan\otclient-4.0\` | `C:\Kaezan\kaezan-godot\references\otclient` |
| RME | `C:\Kaezan\kaezan\remeres-map-editor\` | `C:\Kaezan\kaezan-godot\references\remeres-map-editor` |
| Datapack Kaezan | `canary-3.4.1\data-kaezan\` | **não existe** em `references/` (é conteúdo do projeto antigo) |
| Módulos Kaezan | `otclient-4.0\modules\game_kaezan_*` | **não existem** em `references/` (upstream puro) |

> **Consequência de C02 §2.1 que vale repetir:** o baseline do cliente foi escrito sobre um OTClient
> **já customizado** (snapshot squashed + 14 commits Kaezan). O `references/otclient` é
> **mehah/otclient upstream puro**. Parte do "delta" é simplesmente a ausência dos hacks Kaezan —
> não é drift do upstream. Ao procurar um comportamento descrito no baseline e não encontrá-lo,
> a primeira hipótese deve ser *"isso era Kaezan"*, não *"foi removido do upstream"*.

### 3.2 Dentro do Canary — reorganização de datapacks

A mudança estrutural mais impactante (detalhada em C01 §3.3): existe hoje um `data/` **compartilhado**
e os dois datapacks viraram **overlays de conteúdo**. Spells, runas, weapons, movements e actions
**não estão mais duplicados por datapack**.

> Regra de releitura: qualquer navegação do baseline para `data-{pack}/scripts/...` deve ser lida
> como `data/scripts/...`. Só monstros, NPCs, raids, mundo e quests continuam por datapack.

Correções pontuais de caminho (C01 §3.4, revalidadas por amostragem): `src/core/webhook.cpp` →
`src/server/network/webhook/webhook.cpp`; `src/enums/enums.hpp` → não existe como arquivo único;
`data/scripts/lib/storages.lua` → `data-{pack}/lib/core/storages.lua`;
`data/monster/animals/` → `data-{pack}/monster/amphibics/` (a categoria `animals` não existe);
`Vocation` → `src/creatures/players/vocations/vocation.{hpp,cpp}`.

### 3.3 Dentro do OTClient

`game_healthinfo` (70 linhas hoje) → barras em `modules/game_interface/widgets/statsbar.lua` (860) e
ícones de condição em `modules/game_healthcircle/statusiconbar.lua` (857).
`game_battle` deixou de ser uma linha de tabela e virou `modules/game_battle/battle.lua` (2.623
linhas, multi-instância).

### 3.4 Dentro do próprio acervo de documentação

O `mapping/INDEX.md` aponta para `canary/client/*` (camada B). O baseline vive em
`baseline/client/*` (camada A). **São arquivos diferentes com o mesmo nome** — a camada B recebeu
edições até 2026-06-01, a A está congelada em 05-25. Ao citar um documento histórico, **sempre
qualificar a camada.**

---

## 4. Sistemas novos desde o baseline

### 4.1 Canary — novo no engine (C01 §3.2, verificado)

| Sistema | Arquivos | Relevância para o Huntbound |
|---|---|---|
| **Refatoração da IA de monstro** | `src/creatures/monsters/monster_{targeting,pathfinding,combat_intention,relevance}.{hpp,cpp}` + `src/map/navigation_snapshot.{hpp,cpp}` | 🟢 **A mais alta.** Funções **puras** sobre snapshots imutáveis: `capturar → decidir puro → aplicar`. É o desenho que se quer em GDScript/C#, e o Canary chegou nele *depois* do baseline. `NavCellFlag` (12 flags) é uma abstração de tile pronta para copiar conceitualmente |
| **Weapon Proficiency** | `src/creatures/players/components/weapon_proficiency.{hpp,cpp}` + `data/items/proficiencies.json` (490 KB, 100 % data-driven) | 🟢 **Alta.** Árvore de perks por arma, XP proporcional à raridade do alvo. C01 recomenda como **um dos dois eixos de progressão** do Huntbound. `ALPHA_STRIKE`/`OMEGA_STRIKE` (bônus por % de vida do alvo) são ganchos baratos de fase de boss |
| **LOD de simulação** | `MonsterRelevancePolicy` — `Visible` vs `Background` com histerese de 3 s | 🟢 Média-alta. Em single-player o "spectator" é sempre o jogador: full tick perto, tick esparso longe |
| Escalonador WDRR + `monster_compute_service` | `src/game/scheduling/` | 🔴 Não portar (existe para milhares de jogadores) |
| `livestream`, `map_download`, `protocol_*`, `transport_codec`, `batch_update` | vários | 🔴 Não portar |
| **Gerador de doc da API Lua** | `src/lua/docgen/lua_api_doc_generator.cpp` | 🟡 Ferramenta — forma mais barata de obter a lista canônica da API Lua |
| Soul Seals, Taskboard, item de treino offline de skill | `data/modules/scripts/` | 🟡 O item de treino de skill é interessante para "less grinding" |

### 4.2 OTClient — novo no cliente (C02 §2.3/§2.4)

Módulos novos: `game_notifications`, `game_tutorial`, `game_inspect`, `game_taskboard`,
`game_wheel`, `game_proficiency`, `dev_otui` (editor visual de `.otui` dentro do cliente),
`client_assets`. Comportamentos novos relevantes ao *feeling*: cursores contextuais no mapa,
chat temporário estilo Tibia (Enter no modo walk abre chat marcado com `*` e volta sozinho),
WASD deixou de ser bind fixo, barras de **mana shield** e **Harmony/Serene** (vocação Monk),
pre-walk virou fila, custo diagonal lido de config.

> **Nota para o Huntbound:** a vocação **Monk** — que o Huntbound lista como uma das cinco classes
> iniciais — tem suporte **novo** no OTClient (5 sub-barras de Harmony) e existe em
> `vocations.xml` do Canary atual. O baseline não cobria isso; é conteúdo de referência fresco.

### 4.3 Novo no sentido *Kaezan* — as 24 features da camada C

Relativas ao baseline, **todas** são novas. As de maior sinergia com o Huntbound:

| Feature | O que entrega | Sinergia |
|---|---|:---:|
| `helper/` | Fundação + HealBot avançado + auto-target + rotação + companions obedecendo o mesmo perfil | **Altíssima** |
| `echo_spots/` | Core loop completo: spot no mundo → resina na entrada → waves por budget → boss → Sealed Reward → daily | **Altíssima** |
| `boss_posture/` + `postura_elemental/` | Stagger com ciclos; postura elemental do jogador | **Alta** |
| `daily_hub/` | Board estilo Weekly Tasks, tipos de daily, pontuação diária, streak com joker | **Alta** |
| `sealed_reward/` | Baú pós-boss com loot fixo + rerollável por Echo Key, coleta deliberada | **Alta** |
| `death/` | Morte simbólica | **Alta** |
| `progression_rebalance/` + `training/` + `skill_gating/` | Stages de XP, treino rápido, gating por skill | Média-alta |
| `potions/` | Echo Flask com 5 tiers e progressão por materiais/NPC | Média |
| `pilot_dojo/` | Dungeon solo com level sync | Média (o *conceito*; a implementação é workaround) |
| `equipment_balance_hub/` + `canary_tools_catalogs/` | Ferramentas locais: 1.694 itens com sprites, 1.655 criaturas, outfit studio, paperdoll drag-and-drop | **Média-alta como pipeline** |
| `companions/` + `echo_team/` + `kaeli_mastery/` | Roster de Kaelis, time de 3, maestria | Baixa — ver §5 |

---

## 5. Premissas incompatíveis com o Huntbound

Ordenadas por custo de contaminação se passarem despercebidas.

| # | Premissa histórica | Por que não vale | O que fazer |
|---|---|---|---|
| 1 | **É um MMORPG** (`INDEX.md`: *"Kaezan: World — MMORPG privado sobre Canary Server + OTClient"*) | Huntbound é single-player em Godot | Bloquear tudo que dependa de servidor: protocolo, extended opcodes, RSA/XTEA, MySQL/KV, party/guild/chat, moderação, houses, market, PvP, livestream, waitlist |
| 2 | **Extended opcodes como mecanismo de UI** | Metade das decisões de `changes/decisions.md` gira em torno de *qual opcode alocar* e *raw vs JSON*. Em Godot é chamada de função | Ler essas decisões extraindo o **contrato de dados** (o payload), descartando o transporte |
| 3 | **Roster de Kaelis + gacha de personagem + Echo Team (1 ativo + 2 companions IA)** | Huntbound: *"não priorizar agora: gacha de personagens"*; single-player com um personagem | ⚠️ **Ver §6.1** — o Arena Fable também projetou isto (F-A) e **também nunca implementou**. Dois projetos, mesma feature, zero entregas: é sinal de custo, não de valor |
| 4 | **Vocações Warrior / Sentinel / Shaman / Wizard** (GDD §3.1, §5) | Huntbound declara as **cinco vocações de Tibia**: Knight, Paladin, Sorcerer, Druid, **Monk** | 🔴 **Conflito direto.** Toda a `kaeli_spell_library`, `kaeli_mastery`, `postura_elemental` e os kits do GDD §5 estão construídos sobre o modelo antigo de 4 classes. Os *kits* podem inspirar; o **mapeamento de classe não transfere** |
| 5 | **"Construir sobre o nativo"** (pilar do GDD §1) | Era a decisão certa *dentro do Canary* — não reinventar Wheel, Reward Chest, Prey, Bestiary, Daily Reward, Imbuements. Em Godot **não existe nativo**: tudo é autoral | Inverter o pilar. Cada decisão do tipo *"reskin do sistema X do Tibia"* vira **desenho novo**. O `MAPPING_TIBIA_FEATURES.md` (veredito por feature vs nativo) perde a validade como guia de construção |
| 6 | **Level compartilhado por conta entre Kaelis** (GDD §3.3) | Foi a premissa que **gerou** o skill-gating (level não servia de gate porque um Kaeli novo herdaria o endgame) | A premissa some com o roster. O **skill-gating pode sobreviver por mérito próprio**, mas precisa de nova justificativa — não herde a antiga |
| 7 | **Level sync por multiplicador de dano recebido** (`changes/technical_debt.md` 2026-05-31) | Workaround explícito: *"as fórmulas core de level/HP/dano são C++; não dá para alterar o level efetivo em Lua"* | 🔴 **Não herdar.** Em Godot não existe essa limitação. A modulação sincronizada (referência WAKFU, `BASE_CONTEXTO` §8) deve ser **modulação real de stats**, não multiplicador de dano recebido clampado em `[0.5, 2.0]` |
| 8 | **Canary não tem instâncias de mapa** (`instances.md` §33; `technical_debt.md` 2026-05-31/06-10) | Consequências herdadas: o Dojo reusa a boss room da Warzone Abyssador; os Echo Spots rodam **numa hunt viva**, com fauna nativa que *"pode ser morta pelo player mas não conta para as waves"* e *"um grupo não participante pode interferir"* | 🔴 **Não herdar a limitação.** O Huntbound é instanciado por construção. O **design** (spot no mundo, resina na entrada, waves por budget, boss, sealed reward) sobrevive; a arquitetura de sala física + lock, não |
| 9 | **Divisão helper cliente/servidor** (`features/helper/design.md`: *"cura do jogador roda no cliente; IA dos companions roda no servidor"*) | Existe só por latência de rede | Processo único. Mantenha o **perfil como fonte de verdade única** e o loop de steps ordenados (Heal 10 → Target 20 → Attack 30); descarte a fronteira |
| 10 | **Stamina 2.0 / bênçãos / penalidade de morte de Tibia** (GDD §F09; `death.md` §41) | Máquina de retenção de MMO. Huntbound já decidiu por resina e sessões curtas | Ler `death.md` §40.7 opção A ("sem penalidade") e §41.6 opção D ("energia de dungeon separada em KV") como as únicas variantes compatíveis |
| 11 | **Assets do Tibia (CipSoft)** | `BASE_CONTEXTO` §15 autoriza como *placeholder* e alerta que não são comercialmente utilizáveis. C03 §C.3 #8 chega à mesma conclusão pelo Arena Fable | Premissa **não resolvida em nenhum dos três projetos**. Continua sendo risco aberto, não decisão tomada |
| 12 | **Multiplayer orgânico / world bosses / economia assíncrona** (GDD §2) | Fora de escopo declarado | Descartar |

---

## 6. Informações que devem migrar para a documentação nova

### 6.1 Matriz de features projetadas duas vezes — **a síntese central deste documento**

Sete sistemas foram desenhados de forma independente no **Kaezan: World** (camadas C/D/E) e no
**Arena Fable** (C03). Onde convergiram, a regra tem duas validações independentes. Onde
divergiram, existe uma decisão a tomar.

| Sistema | Kaezan: World (histórico) | Arena Fable (C03) | Veredito para o Huntbound |
|---|---|---|---|
| **Energia / resina** | F08: *não bloqueia entrada, bloqueia reward*; regenera, nunca vendida; cap duro; custo cobrado na entrada do spot | `EnergyLedger` completo (cap 300, regen 3/min, 60/run); resolução: *"energia só como gate de chaining automático — runs manuais nunca são bloqueadas"*. **UI inexistente** — o saldo nunca é serializado (C03 §B.4.5) | ✅ **Convergência forte.** Ambos chegaram a "energia limita recompensa/encadeamento, não acesso" — e é o que `BASE_CONTEXTO` §5 declara. **Adotar como regra fechada.** ⚠️ Ambos falharam na **UI de saldo**: o Huntbound deve mostrar o saldo desde o dia 1 |
| **Helper / autoplay** | `game_kaezan_helper`: perfil único, loop 50 ms, steps ordenados (Heal 10/Target 20/Attack 30), fila de regras com fallback, 1 ação por tick, sem jitter, **sem auto-walk por decisão** | Painel Combat/Movement/Autopilot; *"sem modo rush/skip de propósito"*; AoE só com ≥N alvos; ranged orbita, melee fecha box; readout em linguagem natural (C03 §C.1 #8-10) | ✅ **Complementares, não conflitantes.** O Kaezan tem o **motor** (fila de regras, métricas, prioridades); o Arena Fable tem a **UX** (readout natural, estilo por papel) e vai além em movimento. **Fundir**: motor do Kaezan + camada de movimento e readout do Arena Fable. ⚠️ Divergência real: Kaezan **recusou** kite/box (exigiria auto-walk); Arena Fable **implementou**. O Huntbound precisa decidir — e `BASE_CONTEXTO` §6 lista `kite` e `follow` como funções candidatas, o que puxa para o lado do Arena Fable |
| **Postura / Echo Break** | F07: stagger = `dano base + X% vida máxima do boss`; ciclos `100% → 120% → 150% → Fury Phase`. Sem pausa real de IA (limitação Lua) | Multiplicadores `1.8 / 2.1 / 2.4 / 2.8`; ganho por auto (7) vs skill (16); fraqueza elemental ×1.7; decay após 3 s (C03 §B.1) | ⚠️ **Mesma mecânica, números incompatíveis.** O Arena Fable tem números **tunados e verificados no código**; o Kaezan tem a estrutura de fases (Fury Phase) que o Arena Fable não tem. **Adotar os números do Arena Fable, a fase final do Kaezan** |
| **Sealed Reward / baú pós-boss** | TASK 13/14: implementado — loot fixo + rerollável, custo 1/2/3 Echo Keys, máx 3 rerolls, sem pity, coleta deliberada, persiste no logout. Blueprint de UX em `baseline/client/features/sealed_reward.md` (1.030 linhas) | `DESIGN_NOTES §5` — marcado 🔜 **há muito tempo, nunca feito** (C03 §C.4 #5) | ✅ **O histórico ganha.** Aqui o material antigo é estritamente superior: está implementado e tem blueprint de UX. **Migrar a especificação do Kaezan** |
| **Daily / rotina** | TASK 16 + C6/C6.1: board estilo Weekly Tasks, tipos (`event`/`kill_generic`/`kill_specific`/`deliver`), **pontuação 100 pts em 5 steps**, streak com joker, reset por `dayIndex` no server save | Contratos no drawer da Home; sem sistema de daily formal | ✅ **O histórico ganha.** O modelo de pontos (fazer 2-3 de 6, não todas) é maduro e resolve um problema real registrado |
| **Dungeon curta / instância** | Echo Spots: waves por budget, boss, resina na entrada. **Rodando em hunt viva** (sem instancing) | `DungeonGenerator` + mapgen v2 (lóbulos, pilares, pockets, anfiteatro), validador fail-fast, tipos de sala com ícone no minimapa (C03 §C.1 #14-16) | ⚠️ **Complementares.** Kaezan tem a **estrutura de sessão** (budget, tiers, reward); Arena Fable tem a **geração de espaço**. **Fundir**: geração do Arena Fable + orquestração de waves do Kaezan |
| **Companions / Echo Team** | F13/F03: implementado — companions com stats próprios, EXP compartilhada, IA por vocação, obedecem o perfil do Helper | F-A: *"a feature mais importante do projeto"* — **nunca implementada** (C03 §C.4 #1) | 🔴 **Fora de escopo do Huntbound** (single-player, um personagem, sem gacha). Registrar como material recuperável se o escopo mudar. **Sinal:** dois projetos, ambos com a feature no topo da lista, apenas um entregou — e o que entregou pagou o preço em IA de companion, anti-bodyblock e balanceamento |

### 6.2 Blueprints de UX do `baseline/client/features/` — reclassificar

C02 marcou os 11 blueprints como obsoletos. O **código** está (`.otui`, Lua, opcodes). A
**coreografia** não está — e é a parte cara de projetar. Exemplo concreto, do `echo_cache.md`:

> shake do box (~240 ms) → flash branco (80 ms) → reveal escalonado dos itens (150 ms × índice,
> fade em 15 passos de 20 ms) → botão "Coletar" após todos revelados; cor da moldura e **som por
> raridade**; os itens **já estão no inventário** — a animação é puramente cosmética.

Isso é uma spec de *game feel* independente de engine, e resolve o mesmo problema que o reveal de
convocação do Arena Fable (C03 §C.2 #8, elogiado como *"excelente em concepção"*). O mesmo vale
para `sealed_reward.md` (fases: toast → modal de preview → reroll → coleta; slot mascarado; fade de
preto para branco na revelação) e para `daily_hub.md` (countdown de reset, estados de task).

**Migrar as coreografias, descartar os `.otui`.**

### 6.3 Lista de migração, com destino sugerido

| # | Conteúdo | Origem | Destino |
|---|---|---|---|
| 1 | **24 comportamentos que criam o feeling de Tibia** (números concretos) | `docs/research/otclient/01_otclient_mapping_delta.md` §12 | Doc de combate/movimento do vertical slice — **é o insumo mais acionável do acervo** |
| 2 | **Tabela conceito OTClient → forma idiomática em Godot** | idem §13 | Doc de arquitetura do slice |
| 3 | **Regra da resina** (não bloqueia acesso; regenera; cap; nunca vendida) | GDD §F08 + `progression.md` §34.12 + C03 §B.4.5 | Doc de economia/energia — **fechar como decisão** |
| 4 | **Motor do Helper** (fila de regras, métricas, operadores, 1 ação/tick, fallback, sem jitter) | `changes/features/helper/design.md` + `decisions.md` H0-H7 | Doc de helper — fundir com a UX do Arena Fable |
| 5 | **Catálogo de "o que um bot avançado de Tibia faz"** | `baseline/client/vBot/configs.md` | Doc de helper, seção de escopo |
| 6 | **Waves por budget** (`baseBudget×(1+growth×(w−1))×tier`, pool com custo/peso/minWave) | `changes/decisions.md` 2026-06-10 | Doc de dungeon |
| 7 | **Daily por pontos** (100 pts, 5 steps, streak com joker) | `changes/decisions.md` 2026-06-05 (C6.1) | Doc de loop diário |
| 8 | **Sealed Reward** (fixo + rerollável, custo escalonado, coleta deliberada) + coreografia de reveal | `changes/decisions.md` TASK 13/14 + `baseline/client/features/sealed_reward.md` | Doc de recompensa |
| 9 | **Separação captura → decisão pura → aplicação** e `NavCellFlag` | `references/canary/src/creatures/monsters/monster_*.hpp` | Doc de arquitetura de IA |
| 10 | **Schema de MonsterType** e as **fórmulas** (skill, spell, loot) | `baseline/gameplay/creatures.md` §15.2, `spells.md` §32.4, `skills.md` §39.2 | Doc de dados — como schema de `Resource`, com as constantes **recalibradas** |
| 11 | **`meta/lua_vs_cpp.md`** como critério dado-vs-engine | `baseline/canary/meta/lua_vs_cpp.md` | Doc de arquitetura — reler como "`Resource` vs código" |
| 12 | **Anatomia empírica de hunts/boss rooms/cidades** | Arena Fable `docs/mapping/*.md` (C03 §C.1 #20) — **não existe equivalente no acervo Kaezan** | Doc de mapa — leitura obrigatória antes de qualquer gerador |
| 13 | **Ferramentas de catálogo** (1.694 itens com sprites, 1.655 criaturas, outfit studio, paperdoll) | `changes/features/{equipment_balance_hub,canary_tools_catalogs}/` | Avaliar como **pipeline de conteúdo** — o trabalho de extração já foi pago |
| 14 | **Footguns registrados** (~116 entradas) | `changes/technical_debt.md` | Doc de riscos — vários são independentes de engine (ex.: crédito de kill em grupo, heurística de AoE sem forma real da área, throttling de push por kill) |
| 15 | **Guia de criação de conteúdo visual** | `mapping/canary/visual_content_creation.md` (17,9 KB, **nunca lido por C01/C02/C03**) | Avaliar antes de decidir o pipeline de arte |

---

## 7. Lacunas que precisam de pesquisa

| # | Lacuna | Por que importa | Estado |
|---|---|---|---|
| 1 | **RME nunca foi mapeado** | Existe baseline de Canary e de OTClient. Não existe **nenhum** documento sobre o Remere's Map Editor em `mapping/` — nem na camada A, B ou C. `BASE_CONTEXTO` §14 declara que é preciso decidir se o MVP converte, importa parcialmente ou autora mapas em Godot | 🔴 **Lacuna real e bloqueante para a decisão de mapa.** O clone existe em `references/remeres-map-editor` @ `c136a752` |
| 2 | **Nada foi validado em runtime** | `INDEX.md`: Sprint 0 e 1 *"Implementado — aguarda teste"*. `sprint1_qa`: *"Dominante: nada foi testado em runtime"*. Todo número de balanceamento herdado (custos de resina 20/30/40/60, 5 resinas/dia, ciclos de postura, curvas de stages) é **hipótese** | 🔴 Tratar como ponto de partida, nunca como validado |
| 3 | **Qual versão adotar nas 7 features duplicadas** | §6.1 dá recomendação por feature, mas 3 casos precisam de decisão de produto: helper com ou sem auto-movimento; números de postura; geração vs orquestração de dungeon | 🟠 Decisão pendente |
| 4 | **Energia: quanto por dia, quanto por run** | Kaezan: 5/dia com custo 20-60 por conteúdo. Arena Fable: cap 300, regen 3/min, 60/run. Huntbound: 15-30 min/dia. Os três modelos **não são conversíveis** sem definir a duração da run | 🟠 Depende do vertical slice |
| 5 | **Modulação sincronizada (WAKFU)** | O histórico só tem o *workaround* (multiplicador de dano recebido). Ninguém pesquisou modulação real de stats. `docs/research/wakfu/01_modular_dungeons.md` existe e deve ser cruzado | 🟡 Pesquisa existe, cruzamento não |
| 6 | **Bestiary/bossiary como compêndio** | C01 recomenda *"bestiary vira compêndio, não grinder de pontos"*. Nenhum dos dois projetos históricos implementou nessa forma | 🟡 Desenho novo |
| 7 | **Custo do "vidro" e do design system em Godot** | Herdado de C03 §C.4 #9 — não há nada no acervo Kaezan sobre isso | 🟡 Spike |
| 8 | **Direitos dos assets** | Não resolvido em nenhum dos três projetos | 🟠 Risco aberto |
| 9 | **Camada B nunca lida** | `mapping/canary/visual_content_creation.md` e os dois `*_ORIGINAL_BACKUP.md` (623 KB + 666 KB) são os **originais** de onde o baseline foi fatiado. Podem conter seções que não sobreviveram ao recorte | 🟡 Varredura dirigida recomendada |
| 10 | **Godot** | Não existe baseline de Godot. Todo o acervo assume Canary/OTClient ou C#/Angular | 🟡 Esperado — é o objeto novo |

---

## 8. Documentos históricos que continuam referência confiável

Ordenados por confiança. **"Confiável"** = pode ser lido e usado sem reverificação, dentro da
ressalva indicada.

### 8.1 Alta confiança — use direto

| Documento | Camada | Assunto | Ressalva |
|---|---|---|---|
| `baseline/canary/meta/lua_vs_cpp.md` | A | Dado vs engine | Corrigir caminhos com C01 §3.3/§3.4. Continua o melhor mapa conceitual do acervo |
| `baseline/canary/gameplay/creatures.md` §15.2 | A | Schema completo de MonsterType | Nenhuma — revalidado |
| `baseline/canary/gameplay/spells.md` §32 | A | Fórmulas de spell | Nenhuma — revalidei `combat.cpp:92-96` hoje |
| `baseline/canary/gameplay/skills.md` §39 | A | Fórmula de skill | Nenhuma — revalidei `vocation.cpp:275` hoje |
| `baseline/canary/gameplay/player.md` §18.1 | A | Estrutura de vocação | Nenhuma — `vocations.xml` confere, Monk incluído |
| `baseline/canary/gameplay/death.md` §40 | A | Morte e bênçãos | §40.7 (customização) é o trecho útil |
| `baseline/canary/systems/rewards.md` §17.1 | A | Pipeline de loot | Só mudou o caminho do `generateLootRoll` |
| `baseline/canary/systems/map.md` §36 | A | `.otbm`, spawns, teleports | O mapa global hoje é baixado em runtime |
| `baseline/canary/systems/progression.md` §19 e **§34.10-34.12** | A | Bestiary/bosstiary/prey; **proposta de resina** | §34.12 é design puro e alinhado ao Huntbound |
| `baseline/canary/systems/instances.md` §29, §33 | A | Soul Pit/arena wave; hunts instanciadas | Ler §33.7 (riscos) como **catálogo de armadilhas**, não como arquitetura |
| `baseline/canary/systems/economy.md` §21.4 | A | Imbuements | Nenhuma |
| `baseline/client/vBot/` (3 arq.) | A | UX de helper avançado | Nenhuma — `game_bot` teve 1 commit desde então |
| `baseline/client/modules_guide.md` §15 | A | Walk, `UIGameMap`, clique | Detalhes de implementação mudaram (C02 §2.4) |
| `baseline/client/hud.md` §6, §9 | A | Layout do HUD; action bar e cooldown | §6.6 e §8 desatualizadas |
| `baseline/client/ui_system.md` §4, §14 | A | `.otui`, `UIMiniWindow` | Nenhuma |
| `baseline/client/protocol.md` §5 | A | Catálogo de bindings Lua | Válido como **catálogo de capacidades**, não como protocolo |
| **`mapping/changes/decisions.md`** | C | **50+ decisões com motivação e alternativas descartadas** | **O documento mais valioso do acervo.** Filtrar o transporte (opcodes), preservar o raciocínio |
| **`mapping/changes/technical_debt.md`** | C | ~116 bugs/limitações reais | Vários independentes de engine |
| **`mapping/changes/features/helper/design.md`** | C | Design vigente do helper | Descartar a fronteira cliente/servidor |
| `mapping/changes/features/echo_spots/` | C | Core loop completo | A arena em hunt viva é workaround |
| `mapping/changes/features/{daily_hub,sealed_reward,boss_posture,death}/` | C | Features de maior sinergia | — |

### 8.2 Confiança média — leia com filtro

| Documento | Camada | Filtro necessário |
|---|---|---|
| `baseline/canary/gameplay/quests.md` §37 | A | Modelo de storage/KV é de MMO; o **padrão de quest multi-estágio** sobrevive |
| `baseline/canary/gameplay/creatures.md` §25, §35 | A | Summons e NPCs — úteis se houver companions/NPCs; §35.8 tem recomendações |
| `baseline/canary/systems/events.md` §20 | A | Raids/GlobalEvents — o conceito de evento de mundo não se aplica; o de **timer** sim |
| `baseline/client/visuals.md` §12, §24 | A | Catálogo de API de shaders/efeitos/sons; o Godot resolve de outro jeito |
| `baseline/client/architecture.md` | A | Só §3 (sistema de módulos) tem valor conceitual |
| `baseline/client/features/*.md` (11) | A | **Só as coreografias de UX** (§6.2). Descartar `.otui`, Lua e opcodes |
| `KAEZAN_GDD_v0.5.md` | E | §1 (pilares) e §F06/F07/F08 alinham; §3 (Kaelis/Echo Team), §5 (kits) e §8 (controles) são de outro jogo |
| `mapping/canary/visual_content_creation.md` | B | Nunca auditado — ler antes de decidir o pipeline de arte |
| `mapping/INDEX.md` | — | Excelente **mapa do acervo**; péssima **direção de produto** |

### 8.3 Não use como referência de estado

| Documento | Motivo |
|---|---|
| `baseline/client/synthesis.md` (752 linhas) | Síntese arquitetural **para o MMO**; roadmap de sprints extinto |
| `baseline/canary/meta/kaezan_decisions.md` | Vazio; superado por `changes/decisions.md` |
| `baseline/canary/meta/technical_debt.md` | Snapshot de 3.4.1; superado por `changes/technical_debt.md` |
| `baseline/canary/meta/customization.md` | Todos os caminhos apontam para a topologia antiga de datapacks |
| `baseline/canary/core/{engine.md §12.1, network.md, database.md, build.md}` | Dispatcher desatualizado; rede/DB/build fora de escopo |
| `baseline/canary/systems/{pvp.md, social.md, housing.md}` | PvP, guild/party/hireling e houses fora de escopo. `pvp.md` §42.5 ("como desativar") é a única parte com uso residual |
| `MAPPING_TIBIA_FEATURES.md` (citado no GDD) | O veredito "feature X já existe nativa no Canary" perde sentido em Godot |

---

## Apêndice — Como esta consolidação foi apurada

- Leitura integral de: `baseline/README.md`, os 4 documentos de `baseline/canary/meta/`,
  `baseline/client/vBot/INDEX.md`, `baseline/client/features/echo_cache.md`,
  `mapping/INDEX.md`, `mapping/changes/decisions.md`, `mapping/changes/technical_debt.md`,
  `mapping/changes/features/helper/design.md`.
- Leitura dirigida das seções **"Potencial / Customização para o Kaezan"** dos baselines — que
  C01/C02 não cobriram: `progression.md` §34.10-34.12 (resina), `instances.md` §29.8 e §33.5-33.8
  (arena wave e hunt instanciada), `death.md` §40.7 e §41.6 (morte e stamina).
- Extração da árvore de cabeçalhos de **todos** os documentos de `baseline/canary/` e
  `baseline/client/features/` para localizar cobertura e lacunas.
- Leitura de C01, C02 e C03 na íntegra (as três análises anteriores), para consolidar em vez de
  repetir.
- **Verificação direta contra `references/canary` e `references/otclient`:** existência de 15
  caminhos-chave; `git log`/`describe`/`tag` nos três repositórios; fórmulas de skill
  (`vocation.cpp:236-275`) e de spell (`combat.cpp:33, 92-96`); localização real de
  `generateLootRoll`; conteúdo de `vocations.xml`; contagem de monstros (1.656) e bosses (94).
- **Descoberta de escopo:** varredura de `C:\Kaezan\kaezan\` que revelou as camadas B, C, D e E
  (`mapping/canary/`, `mapping/changes/` com 118 arquivos, `canary-3.4.1/data-kaezan/`,
  os 13 módulos `otclient-4.0/modules/game_kaezan_*`, `KAEZAN_GDD_v0.5.md`).

**Nada foi modificado.** O baseline permanece imutável, `mapping/changes/` intacto, os repositórios
de referência intocados e nenhum código do Huntbound foi escrito.
