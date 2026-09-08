# PB-05 — Vocação e combate Canary

> **Fila encerrada em 2026-09-07:** registro histórico. Implementações e commits abaixo
> permanecem válidos; pendências não são executáveis por esta fila. Destino no
> [roteiro vigente](../../06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md). Status antigos abaixo são históricos.


> **Para agentes executores:** skill obrigatória por task:
> `superpowers:test-driven-development` e `superpowers:verification-before-completion`. Procedimento
> operacional nas skills `playbook-task`, `run-gates` e `worktree-cycle`. Execute uma task card por
> chat. O formato, o handoff e o ciclo automático de integração/limpeza seguem
> `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Status:** escrito e **elegível**. PB-04 fechou como `APPROVED_WITH_WARNINGS` em `9f1c14c`
(registro `d8253dc`). A execução começa em PB-05-01.

**Goal:** transformar a primeira hunt em caçada. O Knight golpeia, conjura três spells, mata rotworms
e recebe o loot automaticamente; as criaturas agridem, perseguem e podem matar o jogador — tudo com a
reprodutibilidade byte a byte que PB-03 e PB-04 provaram.

**Architecture:** `@huntbound/contracts` publica `KernelScenario` v4 com `abilities` e `lootTables`,
blueprint de combate e o `ActorState` estendido. `@huntbound/simulation` ganha `S3 upkeep`,
`S4 combat`, `S5 death e loot` e o comportamento `hunter`, e continua sem conhecer Tibia.
`@huntbound/content` importa as spells que faltam, congela a ficha do personagem e resolve toda
fórmula float em inteiros ao construir o cenário. `@huntbound/assets` empacota efeitos, corpo e
sangue. `apps/game` entrega HUD de combate, input de ataque e conjuração, números de dano e o arco de
autoloot.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.4.3 (somente em `@huntbound/contracts`),
Vitest 4.1.10, Vite 8.2.1, Phaser 4, Playwright 1.62.1, Node 24.14.0. **Nenhuma biblioteca nova**
entra no PB-05 — nem ECS, nem pathfinding, nem engine de regras.

## Fontes normativas

Em caso de conflito, ler nesta ordem:

1. `AGENTS.md`;
2. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`;
3. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`;
4. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`;
5. `docs/08_POLITICA_MODELOS_AGENTES.md`;
6. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`;
7. `docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`;
8. `docs/architecture/PACKAGE_BOUNDARIES.md`;
9. `docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`;
10. este README;
11. a task card em execução;
12. `STATE.md` apenas para estado operacional.

## Restrições globais

Toda task herda esta seção; ela não se repete nos cards.

- Node `24.14.0` e pnpm `11.21.0` via Corepack; zero instalação global; sempre `corepack pnpm`.
- Nenhuma dependência externa nova em qualquer pacote.
- `@huntbound/simulation` continua sem dependência externa, sem Node, sem DOM, sem Phaser, sem
  relógio e sem `Math.random`.
- O kernel continua agnóstico de conteúdo: `serverId`, `clientId`, `lookType`, `huntId`, `regionId`
  e, a partir deste playbook, `itemKey` e `spellKey` são proibidos em `packages/simulation/src/**`,
  com regra executável.
- O estado serializado contém apenas inteiros seguros, booleanos e strings. Nenhum float.
- `TICK_DURATION_MS = 50` e `MAX_FRAME_DELTA_MS = 250` permanecem.
- SHA-256 é calculado fora do kernel, sobre o JSON canônico.
- A região extraída **não é regenerada**: `region.json`, `spawns.json`, `transitions.json` e
  `hunt.json` permanecem byte-idênticos.
- Artefato gerado não se edita à mão; regenere pelo CLI e valide pelo `--check` correspondente.
- Golden não se reescreve para passar.
- Mídia `cipsoft-personal` continua fora do repositório; o profile `product` a recusa.

## Resultado independente

A hunt `hunt:tibia:venore-rotworm-cave` deixa de ser passeio: o Knight ataca por tecla e por toque,
conjura `exori`, `exori ico` e `exura ico`, mata rotworms que o perseguem e o ferem, recebe o loot
sem precisar catá-lo, e morre quando erra a leitura da luta.

| Prova | Verificação |
|---|---|
| Repetição | duas execuções limpas da sessão em Node são byte-idênticas |
| Retomada | todas as fronteiras `0..2700` convergem no mesmo snapshot final |
| Paridade | browser e Node produzem o mesmo SHA-256 do snapshot canônico |
| Sensibilidade | mudar seed, comando ou `rulesVersion` é detectado como divergência |
| Regressão | os journals golden de PB-03 e PB-04 permanecem byte-idênticos |
| Extração | os quatro artefatos da hunt permanecem byte-idênticos, sem reextração |
| Isolamento | `packages/simulation` não referencia Tibia, item, spell, asset, relógio, DOM ou Node |
| Jogabilidade | screenshots nos quatro viewports, sem erro de console, specs estáveis sem `retries` |

## Parâmetros congelados

| Parâmetro | Valor |
|---|---|
| Vocação | `vocation:tibia:knight` |
| Spells | `spell:tibia:berserk`, `exori ico`, `exura ico` |
| `SIMULATION_SCHEMA_VERSION` | `3` → `4` |
| `SIMULATION_RULES_VERSION` | `2` → `3` |
| Streams RNG | `ai`, `combat`, `loot`, `movement`, `scenario`, `spawn` |
| Fixture da sessão | `pb-05-hunt-combat`, seed `2c3d4e5f60718293`, `2700` ticks |
| Retomada | varredura completa de `0..2700` |
| Alcance de golpe | Chebyshev `1`, mesmo andar |
| Agressão | raio Chebyshev do blueprint, mesmo andar, sem line of sight |
| Dano e cura | inteiro uniforme em `[min, max]`, um sorteio do stream `combat` |
| Loot | um `nextBelow(100000)` por entrada; contagem só quando a entrada cai |
| Mitigação | nenhuma — todas as resistências do Rotworm são `0` no snapshot |
| Conversão de intervalo | `intervalMs / 50`; não divisível é erro |
| Ordem dos sistemas | `S1 lifecycle` → `S2 movement` → `S3 upkeep` → `S4 combat` → `S5 death e loot` → `S6 ai` → `S7 spawn` |

## Arquitetura alvo

```text
catálogo PB-01 (vocação, spells, criatura, itens)
        │
        ├─► ficha congelada do personagem ─┐
        │                                   ▼
        └────────────────────────► @huntbound/content
                                     buildHuntScenario(hunt, character, registry, seed)
                                     resolve float → inteiro, monta abilities e lootTables
                                                  │
                                                  ▼
                                     @huntbound/simulation  (KernelScenario v4)
                                     S3 upkeep | S4 combat | S5 death e loot | hunter
                                                  │
                          ┌───────────────────────┴───────────────────────┐
                          ▼                                               ▼
              tools/replay (Node)  ── mesmo SHA-256 ──►  KernelProbe (browser)
                                                                          │
                                                                          ▼
                                                              apps/game — HUD, dano,
                                                              corpo, sangue, autoloot
```

### Fronteiras futuras

```text
packages/contracts/src/simulation/           KernelScenario v4, comandos, eventos, snapshot
packages/contracts/src/content/schemas.ts    fórmula de cura, CharacterDefinition
packages/content/src/importers/canary/lua/   exori ico e exura ico
packages/content/src/selections/             slice curada estendida
packages/content/src/generated/              bundle regenerado por CLI + ficha congelada
packages/content/src/hunts/                  combate na construção do cenário
packages/simulation/src/kernel/              upkeep, combate, morte, loot, hunter
packages/simulation/src/state/               ActorState de combate
packages/test-fixtures/hunt/pb05/            sessão golden pb-05-hunt-combat
packages/assets/catalog/selections/          efeitos, corpo e sangue
apps/game/src/{hunt,ui,input}/               HUD, números de dano, autoloot, morte
tools/architecture/simulation-boundaries.ts  proibir itemKey e spellKey
docs/content/PB-05-SELECTION.md              seleção congelada de vocação, spells e ficha
docs/simulation/KERNEL_CONTRACT.md           contrato v4
docs/simulation/REPLAY_CONTRACT.md           fixture e hashes do PB-05
```

## Ordem das tasks

| ID | Problema coeso | Dependência | Modelo/effort | Status |
|---|---|---|---|---|
| [PB-05-01](tasks/PB-05-01-selecionar-vocacao-spells-e-ficha.md) | seleção e congelamento de vocação, três spells, ficha, arma e conversões medidas | PB-04 fechado | Opus 5 / Sol / Grok 4.6 `xhigh` | pending |
| [PB-05-02](tasks/PB-05-02-importar-spells-e-ficha.md) | importar `exori ico` e `exura ico`, fórmula de cura no schema, ficha congelada | PB-05-01 | Sol / Grok 4.6 `xhigh` | pending |
| [PB-05-03](tasks/PB-05-03-definir-contratos-de-combate.md) | contratos v4: blueprint, facção, abilities, lootTables, comandos, eventos, snapshot | PB-05-01 | Opus 5 / Sol / Grok 4.6 `xhigh` | pending |
| [PB-05-04](tasks/PB-05-04-implementar-combate-no-kernel.md) | golpe, conjuração, dano, cura, cooldown, upkeep, morte; migração dos fixtures | PB-05-03 | Opus 5 / Sol / Grok 4.6 `xhigh` | pending |
| [PB-05-05](tasks/PB-05-05-implementar-ia-hunter.md) | agressão, alvo, perseguição gulosa e golpe adjacente | PB-05-04 | Sol / Grok 4.6 `xhigh` | pending |
| [PB-05-06](tasks/PB-05-06-implementar-loot-e-autoloot.md) | rolagem de loot na morte, `loot/granted`, projeção da bolsa fora do kernel | PB-05-04 | Luna `xhigh` / Grok 4.6 `high` | pending |
| [PB-05-07](tasks/PB-05-07-traduzir-conteudo-em-combate.md) | conteúdo → cenário: HP, dano e cooldown por estatística, abilities, tabelas de loot | PB-05-02, PB-05-03 | Sol / Grok 4.6 `xhigh` | pending |
| [PB-05-08](tasks/PB-05-08-fixture-e-gate-de-combate.md) | fixture `pb-05-hunt-combat`, golden, varredura, `combat:check`, contrato de replay | PB-05-05, PB-05-06, PB-05-07 | Sol / Grok 4.6 `xhigh` | pending |
| [PB-05-09](tasks/PB-05-09-empacotar-assets-de-combate.md) | efeitos, corpo e sangue no pack; tetos e recusa do profile `product` | PB-05-01 | Luna `xhigh` / Grok 4.6 `high` | pending |
| [PB-05-10](tasks/PB-05-10-renderizar-combate-e-hud.md) | HUD, input de ataque e conjuração, números de dano, corpo, sangue, autoloot, morte | PB-05-08, PB-05-09 | Luna `xhigh` / Grok 4.6 `high` | pending |
| [PB-05-11](tasks/PB-05-11-validar-combate-no-browser.md) | quatro viewports, screenshots, paridade de replay, estabilidade sem `retries` | PB-05-10 | Luna `xhigh` / Grok 4.6 `high` | pending |
| [PB-05-12](tasks/PB-05-12-auditar-e-fechar-playbook.md) | auditoria integrada e aceite; decide a elegibilidade de PB-06 | PB-05-11 | Opus 5 / Grok 4.6 `xhigh` | pending |

PB-05-02 e PB-05-03 podem executar em paralelo após PB-05-01: uma toca `packages/content` e os
importers, a outra toca `packages/contracts/src/simulation`. PB-05-09 pode executar em paralelo com
toda a trilha de kernel após PB-05-01. PB-05-05 e PB-05-06 tocam os mesmos arquivos de
`packages/simulation/src/kernel/` e são **seriais por padrão**; só rodam em paralelo por ativação
explícita do supervisor. O restante é serial. Em modo paralelo, os executores removem worktrees
limpas, preservam branches e não disputam `STATE.md`; a task dependente integra, atualiza o handoff e
apaga as branches após os gates integrados.

## Correções pós-aceite — PB-05-FIX

O usuário jogou em 2026-08-18 e apontou: caminhada funcional, mas ataque, magia e spell **sem
animação nenhuma — só números na tela**. Conforme `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`,
aceite apontado vira task `PB-05-FIX-MM`. O playbook permanece aberto até elas passarem e o usuário
aprovar; PB-06 e PB-07 ficam atrás na fila.

Diagnóstico e direção em
[`docs/superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md`](../../superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md).
Metade do sintoma é regressão, não feature ausente: o pack pessoal ficou defasado em seis chaves de
combate, e asset ausente era descartado em silêncio — então cadáver, sangue e o arco de autoloot,
entregues em PB-05-10, nunca chegaram à tela.

| ID | Problema coeso | Dependência | Modelo/effort | Status |
|---|---|---|---|---|
| [PB-05-FIX-01](tasks/PB-05-FIX-01-restaurar-assets-de-combate.md) | pack pessoal regenerado; asset ausente vira diagnóstico observável em vez de silêncio | PB-05-11 | Luna `xhigh` / Grok 4.6 `high` | done |
| [PB-05-FIX-02](tasks/PB-05-FIX-02-animar-efeitos-de-combate.md) | `EffectAnimation` puro no relógio de render; pool de sprites; efeito deixa de congelar no frame 0 | PB-05-FIX-01 | Luna `xhigh` / Grok 4.6 `high` | done |
| [PB-05-FIX-03](tasks/PB-05-FIX-03-impacto-de-golpe.md) | `CombatFxTable.ts` + `combat/attacked` e `combat/damaged` por `cause`: todo golpe tem impacto | PB-05-FIX-02 | Luna `xhigh` / Grok 4.6 `high` | done |
| [PB-05-FIX-04](tasks/PB-05-FIX-04-conjuracao-e-cura.md) | `ability/cast` e `combat/healed`: área, alvo, self e número de cura | PB-05-FIX-03 | Luna `xhigh` / Grok 4.6 `high` | pending |

Conforme `AGENTS.md`, só as duas próximas nascem como task card. O resto fica em bullets até chegar
a vez:

- **PB-05-FIX-05** — `CombatImpulses.ts`: flash no atingido, hit-stop, shake de câmera, lunge do
  atacante e cor de número por causa. É o passe de game feel, o que mais pede iteração no olho.
- **PB-05-FIX-06** — `HuntProbe` expõe os cues planejados; spec Playwright no projeto `correctness`
  afirmando planejamento e não pixel; `qa:budgets` registrado; entrega jogável para o aceite.

Invariantes de toda a trilha: nada toca `packages/simulation` ou `packages/contracts`;
`combat:check` sai byte-idêntico — golden que mexer é bug, não descoberta; sem `Math.random()` no
planejador, a variação deriva de `entityId` e `tick`.

## Política de modelos

Grok 4.6 entra como terceiro frontier, intercambiável com GPT-5.6 Sol e Claude Opus 5 por classe de
tarefa, e pode operar em `high` nas tasks de implementação bem especificada — PB-05-06, PB-05-09,
PB-05-10 e PB-05-11. A revisão prefere modelo diferente do implementador: Sol prefere Opus 5 ou Grok;
Opus 5 prefere Sol ou Grok; Grok prefere Opus 5 ou Sol.

**Luna está excluída em qualquer effort** de PB-05-03, PB-05-04 e PB-05-05: as três alteram schema
congelado e semântica do kernel. `docs/08_POLITICA_MODELOS_AGENTES.md` é normativo; modelo e effort
efetivamente usados vão para o `STATE.md`.

## Baseline de qualidade

- Branch-base: `main`. Branch temporária: `<agente>/pb05-NN-<slug>`.
- Spec aprovada: `docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`.
- PB-01: `closed`, golden bundle
  `d9df3338743365710fed991c185976b9dbbd59e6d5f9d43a679550db8fa154f3`.
- PB-02: `closed` em `1134fc8`.
- PB-03: `closed` como `APPROVED_WITH_WARNINGS`, commit auditado `f885535`; journal golden
  `31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4`.
- PB-04: `closed` como `APPROVED_WITH_WARNINGS`; commit auditado `9f1c14c`, registro `d8253dc`. Os
  hashes de baseline das fixtures de hunt são lidos de `docs/simulation/REPLAY_CONTRACT.md` no
  momento da execução — este README não os copia, para não repetir o defeito D2.
- Gate raiz: `corepack pnpm verify`, que deve continuar verde e idempotente, **mais** `biome check .`,
  que o `verify` não cobre.

## Obrigações herdadas da auditoria do PB-04

Estas são critério de aceite em todas as tasks aplicáveis, não recomendação:

- **D1 — estabilidade real.** `playwright.config.ts` tem `retries: 0` (FIX-04). Spec nova é
  provada com `--retries=0 --repeat-each=10`; reintroduzir `retries` para mascarar instabilidade é
  defeito.
- **D2 — hash existe ou não se publica.** Todo SHA-256 citado em card, spec, relatório ou `STATE.md`
  é gerado do artefato real e verificável na árvore.
- **D3 — fixture entra no contrato.** `pb-05-hunt-combat` é registrada em
  `docs/simulation/REPLAY_CONTRACT.md` no mesmo commit que a cria.
- **D4 — lint é gate.** `biome check .` roda explicitamente antes de declarar qualquer task
  concluída.

## Armadilhas conhecidas

Detalhe em `AGENTS.md`; resumo do que já custou tempo neste repositório:

1. Worktree nova não tem `node_modules`. Rode `corepack pnpm install --prefer-offline` dentro dela
   antes de qualquer gate.
2. `git worktree remove` falha com "Directory not empty" por causa de `node_modules`. Apague o
   diretório e só então rode `git worktree prune` e `git branch -d`.
3. Playwright serve o `dist` pré-buildado. Toda edição em `apps/game/src/**` é invisível para o
   browser até `corepack pnpm build`.
4. Servidor vite preso na worktree impede a remoção do diretório. Mate o listener antes de apagar.

## Critérios finais de aceite

- [ ] A seleção de vocação, spells, ficha e arma está congelada e todo ID existe no snapshot.
- [ ] As três spells estão no catálogo curado, com fórmula validada por schema.
- [ ] O kernel resolve golpe, conjuração, cura, morte e loot sem conhecer item, spell ou vocação.
- [ ] Nenhum float entra no estado serializado.
- [ ] Criaturas agridem, perseguem e golpeiam; a perseguição não usa pathfinding.
- [ ] O loot chega ao matador sem comando de coleta e sem campo novo no snapshot.
- [ ] `stepCooldownTicks` e `attackCooldownTicks` derivam de estatística de criatura, pagando a
      dívida declarada por PB-04 em `docs/content/MAP_REGION_CONTRACT.md`.
- [ ] Os journals golden de PB-03 e PB-04 permaneceram byte-idênticos.
- [ ] Os quatro artefatos gerados da hunt permaneceram byte-idênticos.
- [ ] Duas execuções limpas da sessão produzem snapshot e journal byte-idênticos.
- [ ] A retomada converge em todas as fronteiras `0..2700`, com vida, mana, alvo e cooldowns
      serializados.
- [ ] Browser e Node produzem o mesmo SHA-256 do snapshot canônico da sessão.
- [ ] `combat:check` entra em `check` e `verify` e está registrado em `REPLAY_CONTRACT.md`.
- [ ] A hunt é jogável nos quatro viewports, com screenshots versionadas e specs estáveis sem
      `retries`.
- [ ] `corepack pnpm verify` passa duas vezes seguidas e `biome check .` sai `0`.
- [ ] O relatório de aceite decide a elegibilidade de PB-06.

## Fora de escopo

- save, IndexedDB, inventário persistido e bolsa entre runs — PB-06;
- outras vocações, segunda hunt e troca de hunt em runtime;
- pathfinding, line of sight, projétil do jogador e área de efeito não quadrada;
- fuga em vida baixa, condições, veneno e summons;
- outfit composto, addons e cores — PB-07;
- gacha, economia e helper — PB-08 e PB-09;
- spike de densidade e orçamento completo de performance — PB-10;
- reextrair a região ou alterar a extração congelada por PB-04;
- alterar PB-01, PB-02, PB-03 ou PB-04 sem defeito bloqueante reproduzido.

## Como executar

Abra um chat novo e envie o bloco copiável da próxima task indicada em `STATE.md`. Execute somente
uma task. A task cria branch/worktree, instala dependências, segue RED/GREEN, verifica, atualiza o
handoff, commita, integra por `--ff-only` no fluxo serial e remove seus recursos temporários. Não
antecipe a seguinte.
