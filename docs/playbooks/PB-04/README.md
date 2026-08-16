# PB-04 — Primeira hunt ponta a ponta

> **Para agentes executores:** skill obrigatória por task:
> `superpowers:test-driven-development` e `superpowers:verification-before-completion`. Execute uma
> task card por chat. O formato, handoff e ciclo automático de integração/limpeza seguem
> `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Status:** **aberto — `REJECTED`** pela auditoria integrada PB-04-10 sobre o commit `307a3f0`, em
2026-08-15. A hunt é jogável e o aceite de produto do usuário está registrado em
[`artifacts/product-acceptance.md`](artifacts/product-acceptance.md); a reprovação é de integridade
de gate e de documentação. Veredito e evidência em
[`artifacts/acceptance-report.md`](artifacts/acceptance-report.md). Desbloqueiam o fechamento:
`PB-04-FIX-02`, `PB-04-FIX-03` e `PB-04-FIX-04`. **PB-05 não está liberado.**

**Goal:** entregar a primeira hunt jogável no browser: região real do mapa extraída offline, colisão
e transições derivadas do snapshot, criaturas nascendo por tabela de spawn determinística, câmera
seguindo o jogador e input real — preservando a reprodutibilidade byte a byte que PB-03 provou.

**Architecture:** `tools/tile-flags` deriva flags de tile de `appearances.dat` e `items.xml`;
`tools/map-extractor` recorta a região do OTBM e os spawns do XML para JSON validado e versionado.
`@huntbound/contracts` publica `HuntDefinition`, `MapRegion`, `SpawnTable`, `TransitionTable` e
`KernelScenario` v3. `@huntbound/content` traduz `HuntDefinition` em cenário do kernel.
`@huntbound/simulation` ganha andares, transições e sistema de spawn, e continua sem conhecer Tibia.
`@huntbound/assets` empacota os tiles por stable key. `apps/game` renderiza tilemap, câmera e input.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.4.3 (somente em `@huntbound/contracts`),
Vitest 4.1.10, Vite 8.2.1, Phaser 4, Playwright 1.62.1, Node 24.14.0. **Nenhuma biblioteca nova**
entra no PB-04 — nem protobuf, nem parser OTBM, nem pathfinding, nem ECS.

## Fontes normativas

Em caso de conflito, ler nesta ordem:

1. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`;
2. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`;
3. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`;
4. `docs/08_POLITICA_MODELOS_AGENTES.md`;
5. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`;
6. `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`;
7. `docs/architecture/PACKAGE_BOUNDARIES.md`;
8. `docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`;
9. este README;
10. a task card em execução;
11. `STATE.md` apenas para estado operacional.

## Restrições globais

Toda task herda esta seção; ela não se repete nos cards.

- Node `24.14.0` e pnpm `11.21.0` via Corepack; zero instalação global.
- Nenhuma dependência externa nova em qualquer pacote. O leitor de protobuf e o leitor de OTBM são
  próprios e mínimos.
- `@huntbound/simulation` continua sem dependência externa, sem Node, sem DOM, sem Phaser, sem
  relógio e sem `Math.random`.
- O kernel continua agnóstico de conteúdo: `serverId`, `clientId`, `lookType`, `huntId` e `regionId`
  são proibidos em `packages/simulation/src/**` e a proibição é executável.
- O estado serializado contém apenas inteiros seguros, booleanos e strings. Nenhum float.
- `TICK_DURATION_MS = 50` e `MAX_FRAME_DELTA_MS = 250` permanecem.
- SHA-256 é calculado fora do kernel, sobre o JSON canônico.
- OTBM nunca é formato de runtime; a conversão é offline e o resultado é JSON validado.
- `references/` é a única fonte da extração, permanece fora do repositório e nunca é copiada para
  dentro dele.
- Mídia `cipsoft-personal` continua fora do repositório; o profile `product` a recusa.
- Nenhuma regra de combate, dano, morte, loot ou spell entra no PB-04.

## Resultado independente

A hunt `hunt:tibia:venore-rotworm-cave` abre no browser e é jogável: o jogador anda em oito direções,
colide com parede e criatura, desce e sobe entre andares por transição, e vê rotworms nascendo pela
tabela de spawn.

| Prova | Verificação |
|---|---|
| Extração | reextrair a região do mesmo snapshot produz JSON byte-idêntico |
| Repetição | duas execuções limpas da sessão em Node são byte-idênticas |
| Retomada | todas as fronteiras `0..600` convergem no mesmo snapshot final |
| Paridade | browser e Node produzem o mesmo SHA-256 do snapshot canônico |
| Sensibilidade | mudar seed, comando ou `rulesVersion` é detectado como divergência |
| Regressão | `events.golden.jsonl` do fixture PB-03 permanece byte-idêntico |
| Isolamento | `packages/simulation` não referencia Tibia, asset, relógio, DOM ou Node |
| Jogabilidade | screenshots nos quatro viewports obrigatórios, sem erro de console |

## Parâmetros congelados

| Parâmetro | Valor |
|---|---|
| Hunt | `hunt:tibia:venore-rotworm-cave` |
| Andares por região | ≤ 3 |
| Tiles por andar | ≤ 96 × 96 |
| Entradas de mídia no pack | ≤ 512 |
| Bytes do pack | ≤ 6 MB |
| Atores vivos simultâneos | ≤ 64 |
| `SIMULATION_SCHEMA_VERSION` | `2` → `3` |
| `SIMULATION_RULES_VERSION` | `1` → `2` |
| Streams RNG | `movement`, `ai`, `scenario`, `spawn` |
| Fixture da sessão | `pb-04-hunt-session`, seed `1a2b3c4d5e6f7a8b`, `600` ticks, retomada em `313` |
| Colisão | exatamente `flags.unpass` de `appearances.dat` |
| Transição | automática ao entrar por passo, sem encadeamento, com `transitionGuard` serializado |
| Conversão de `spawntime` | `segundos * 1000 / 50` ticks; não divisível é erro |
| Pack da hunt | `pb-04-venore-rotworm-cave` |
| Namespace de tile | `tile:tibia:<clientId>` |

## Arquitetura alvo

```text
references/canary/**  (fora do repo)
  ├─ data/items/appearances.dat ─┬─► tools/tile-flags ─► content/generated/tile-flags.json
  ├─ data/items/items.xml ───────┘
  ├─ data-canary/world/canary.otbm ────────┬─► tools/map-extractor
  └─ data-otservbr-global/world/otservbr-monster.xml ─┘
                                             └─► content/generated/hunts/venore-rotworm-cave/
                                                   region.json | spawns.json | hunt.json | *.sha256
                     ┌───────────────────────────────┴───────────────────────┐
                     ▼                                                       ▼
        @huntbound/content                                        @huntbound/assets
          buildHuntScenario(hunt, seed) ─► KernelScenario v3        pack pb-04-venore-rotworm-cave
                     │                                                       │
                     ▼                                                       ▼
        @huntbound/simulation                                       apps/game
          floors | transitions | spawn                               HuntScene | Camera | InputMap
                     └─► tools/replay (Node) ── mesmo SHA-256 ──► KernelProbe (browser)
```

### Fronteiras futuras

```text
packages/contracts/src/hunt/                    HuntDefinition, MapRegion, SpawnTable, TransitionTable
packages/contracts/src/simulation/              KernelScenario v3, eventos e snapshot novos
packages/content/src/hunts/                     buildHuntScenario e loaders de runtime
packages/content/src/generated/tile-flags.json  tabela de flags por serverId
packages/content/src/generated/hunts/           região, spawns e hunt definition versionados
packages/simulation/src/grid/                   espaço multi-floor e transições
packages/simulation/src/kernel/                 sistema de spawn e sistema de transição
packages/assets/catalog/selections/             selection do pack da hunt
packages/test-fixtures/hunt/pb04/               sessão golden da hunt
tools/tile-flags/                               leitor de appearances.dat + items.xml
tools/map-extractor/                            recorte OTBM e spawns
apps/game/src/phaser/scenes/HuntScene.ts        tilemap, sprites e câmera
apps/game/src/input/                            InputMap, teclado e dpad
docs/content/PB-04-SELECTION.md                 seleção congelada da hunt
docs/content/MAP_REGION_CONTRACT.md             contrato da região extraída
```

## Ordem das tasks

| ID | Problema coeso | Dependência | Modelo/effort | Status |
|---|---|---|---|---|
| [PB-04-01](tasks/PB-04-01-selecionar-e-congelar-a-hunt.md) | seleção da hunt, bounding box, andares, criaturas e budget medido | PB-03 fechado | Luna `xhigh` | done |
| [PB-04-02](tasks/PB-04-02-definir-contratos-de-mundo.md) | `HuntDefinition`, `MapRegion`, `SpawnTable`, `TransitionTable` e `KernelScenario` v3 | PB-04-01 | Luna `xhigh` | done |
| [PB-04-03](tasks/PB-04-03-gerar-tabela-de-flags-de-tile.md) | leitor protobuf mínimo, `floorchange` e prova de `serverId == clientId` | PB-04-02 | Sol `xhigh` | done |
| [PB-04-04](tasks/PB-04-04-extrair-regiao-do-mapa.md) | recorte OTBM, recipe, camadas, colisão, transições e spawns | PB-04-03 | Sol `xhigh` | done |
| [PB-04-05](tasks/PB-04-05-estender-kernel-para-andares-e-spawn.md) | andares, transições, spawn, stream novo, bump de versões e migração do fixture PB-03 | PB-04-02 | Sol `xhigh` | done |
| [PB-04-06](tasks/PB-04-06-construir-cenario-e-replay-da-hunt.md) | `buildHuntScenario`, fixture, golden e gate `hunt:check` | PB-04-04, PB-04-05 | Sol `xhigh` | replay fixed by FIX-01; audit pending |
| [PB-04-07](tasks/PB-04-07-empacotar-assets-da-hunt.md) | selection `tile:tibia:*`, budget, profiles e gate de chave faltante | PB-04-04 | Luna `xhigh` | done for test; personal blocked by B2 |
| [PB-04-08](tasks/PB-04-08-renderizar-hunt-e-input.md) | `HuntScene`, camadas, câmera e `InputMap` | PB-04-06, PB-04-07 | Luna `xhigh` | done; corrected by FIX-01 |
| [PB-04-09](tasks/PB-04-09-validar-hunt-no-browser.md) | quatro viewports, screenshots, paridade de replay e orçamento de boot | PB-04-08 | Luna `xhigh` | done; rerun by FIX-01 |
| [PB-04-FIX-01](tasks/PB-04-FIX-01-corrigir-experiencia-da-hunt.md) | corrigir remix, composição, câmera, movimento, input e replay da hunt | PB-04-09 | Codex/GPT-5 | automated done; personal acceptance pending |
| [PB-04-10](tasks/PB-04-10-auditar-e-fechar-playbook.md) | auditoria integrada e aceite | PB-04-FIX-01 + aceite pessoal | Opus 5 | blocked pending acceptance |

PB-04-03 e PB-04-05 podem executar em paralelo após PB-04-02: uma toca `tools/` e
`packages/content`, a outra toca `packages/simulation` e `packages/contracts/src/simulation`.
PB-04-07 pode executar em paralelo com PB-04-05 e PB-04-06 após PB-04-04. O padrão é serial. Em modo
paralelo, os executores removem worktrees limpas, preservam branches e não disputam `STATE.md`; a
task dependente integra, atualiza o handoff e apaga as branches após os gates integrados.

## Baseline de qualidade

- Branch-base: `main`.
- Spec aprovada: `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`.
- PB-01: `closed`, golden bundle
  `d9df3338743365710fed991c185976b9dbbd59e6d5f9d43a679550db8fa154f3`.
- PB-02: `closed` em `1134fc8`, pack sintético
  `775d56f87b156349d9e81410d1703bac1499e1d332a2c1064dce498d18d97af5`.
- PB-03: `closed` em `7097b67` como `APPROVED_WITH_WARNINGS`, commit auditado `f885535`, sem
  blockers. Fixture `pb-03-kernel-coverage`, snapshot golden
  `9d0c3a249b6e72daf0bce868824eb17a80b0cf4153ab05f6f7b7d50dae5f7260`, journal golden
  `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4`.
- Gate raiz: `corepack pnpm verify`, que deve continuar verde e idempotente.
- O Biome ignora `docs/**`; tasks validam documentação por `git diff --check` e leitura explícita.
- Árvores geradas grandes entram no `format:check` como texto versionado ou são excluídas do Biome no
  mesmo padrão de `packages/test-fixtures/simulation/pb03`, nunca reformatadas à mão.

## Armadilhas conhecidas de worktree

Registradas porque atingiram uma vez por task no PB-03:

1. Worktree nova não tem `node_modules`. Rode `corepack pnpm install --prefer-offline` dentro dela
   antes de qualquer gate; resolve do store local em segundos e não altera `pnpm-lock.yaml`.
2. `git worktree remove` falha com "Directory not empty" por causa de `node_modules`. Apague o
   diretório e só então rode `git worktree prune` e `git branch -d`.

## Critérios finais de aceite

- [ ] A seleção da hunt cumpre integralmente o checklist do roteiro e está congelada.
- [ ] Toda criatura da tabela de spawn existe no catálogo PB-01.
- [ ] `serverId == clientId` está provado para todos os IDs da região.
- [ ] A tabela de flags é gerada do snapshot, versionada e reprodutível byte a byte.
- [ ] Materializar o recipe versionado duas vezes produz JSON byte-idêntico. A geometria jogável é
      autorada por `packages/content/src/layouts/hunts/venore-rotworm-cave.json` e compilada
      deterministicamente; o envelope OTBM é fonte de spawn e de material, não de geometria.
      ~~Reextrair a região do mesmo snapshot produz JSON byte-idêntico.~~
- [ ] Nenhuma transição necessária foi derrubada; a contagem bate com a seleção.
- [ ] O kernel resolve andares, transições e spawn sem conhecer Tibia, asset ou path.
- [ ] `events.golden.jsonl` do fixture PB-03 permaneceu byte-idêntico após o bump de schema.
- [ ] Duas execuções limpas da sessão produzem snapshot e journal byte-idênticos.
- [ ] Retomada converge em todas as fronteiras `0..600`, com `transitionGuard` e `spawnSlots`
      serializados.
- [ ] Browser e Node produzem o mesmo SHA-256 do snapshot canônico da sessão.
- [ ] Todo tile da região resolve por stable key; chave faltante falha em validação única.
- [ ] A hunt é jogável nos quatro viewports obrigatórios, com screenshots versionadas.
- [ ] `corepack pnpm verify` passa no resultado integrado.
- [ ] O relatório de aceite decide a elegibilidade de PB-05.

## Fora de escopo

- dano, morte, loot, spell, vocação e qualquer regra de combate — PB-05;
- pathfinding, line of sight, área de efeito, projétil e click-to-move;
- save, IndexedDB e persistência de run — PB-06;
- segunda hunt, streaming de região, mapa completo e troca de hunt em runtime;
- outfit composto, addons e cores — PB-07;
- gacha, economia e helper — PB-08 e PB-09;
- spike de densidade e orçamento completo de performance — PB-10;
- importar criatura, item ou spell novo para o catálogo — PB-01;
- alterar PB-01, PB-02 ou PB-03 sem defeito bloqueante reproduzido.

## Como executar

Abra um chat novo e envie o bloco copiável da próxima task indicada em `STATE.md`. Execute somente
uma task. A task cria branch/worktree, instala dependências, segue RED/GREEN, verifica, atualiza o
handoff, commita, integra por `--ff-only` no fluxo serial e remove seus recursos temporários. Não
antecipe a seguinte.
