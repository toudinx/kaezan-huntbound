# PB-07 — Profundidade de combate, vocações e legibilidade

> **Para agentes executores:** skill obrigatória por task:
> `superpowers:test-driven-development` e `superpowers:verification-before-completion`. Procedimento
> operacional nas skills `playbook-task`, `run-gates` e `worktree-cycle`. Execute uma task card por
> chat. O formato, o handoff e o ciclo automático de integração/limpeza seguem
> `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Status:** escrito e **elegível**. A primeira task é PB-07-01.

**Goal:** transformar um MVP jogável em uma hunt com decisão. O jogador escolhe *quando* recuar em
vez de morrer no fim da mana; três vocações jogáveis cobrem melee, ranged e AoE; criaturas fazem
mais do que morder; e alvo, impacto e borda do mundo são legíveis.

**Architecture:** um bump aditivo de `SIMULATION_SCHEMA_VERSION` 4→5 e `SIMULATION_RULES_VERSION`
3→4 abre espaço para sustentação, condição com duração, elemento de dano, kit de criatura e cargas
de habilidade. Os defaults reproduzem v4, então cada task seguinte só preenche valores em conteúdo.
`@huntbound/contracts` generaliza `CharacterDefinition.skills` e dá condição a `SpellDefinition`;
`packages/simulation` ganha regen sensível a combate, leech, condições ativas e escolha de
habilidade na IA; `@huntbound/content` para de descartar o que o catálogo já modela;
`@huntbound/game` ganha anel de alvo, shake por magnitude e borda tratada.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.4.3 (somente em `@huntbound/contracts`),
Vitest 4.1.10, Vite 8.2.1, Phaser 4, Playwright 1.62.1, Node 24.14.0. **Nenhuma biblioteca nova**
entra no PB-07.

## Fontes normativas

Em caso de conflito, ler nesta ordem:

1. `AGENTS.md`;
2. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`;
3. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`;
4. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`;
5. `docs/08_POLITICA_MODELOS_AGENTES.md`;
6. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`;
7. `docs/architecture/PACKAGE_BOUNDARIES.md`;
8. `docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`;
9. `docs/content/PB-07-ROTATIONS.md`, a partir de PB-07-01;
10. este README;
11. a task card em execução;
12. `STATE.md` apenas para estado operacional.

## O problema, medido

O playbook nasce de sete observações de quem jogou. A investigação mostrou que várias delas têm
causa diferente da aparente, e isso muda o trabalho:

| # | Observação | Causa real |
|---|---|---|
| 1 | "Não existe regen de vida nem de mana" | Existe e está ligado. `applyUpkeep` roda todo tick com os valores fiéis do Canary: **1 HP e 2 mana a cada 6 s**. Falta o *regime*, não o mecanismo. |
| 2 | "Só auto-attack, 2 magias e 1 heal" | O kit é raso por falta de **eixo**, não de magias de dano. Faltam **postura** — o sistema de Stances do Vocation Adjustments 2026 — e **mobilidade** (`utani hur`, `utani tempo hur`). Ambos são `Condition` com duração, que nem o catálogo nem o kernel representam. |
| 3 | "Só uma classe melee" | `CharacterDefinition.skills` é literalmente `{ sword, magic }` e `resolveSpellPower` só lê `skills.sword`. Ataque ranged, porém, **já é suportado** pelo kernel via `attackRangeTiles`. |
| 4 | "Alvo só fica mais escuro" | `sprite.setTint(0xffd166)` — tint é multiplicativo, então escurece em vez de destacar. |
| 5 | "Faltam mobs complexos e bosses" | O catálogo **já modela** `resistances`, `immunities`, `conditions`, `summons` e `defenses`; `composeCreature` descarta tudo e força `abilityIndices: []`. |
| 6 | "Mapa feio, borda preta" | Borda é `backgroundColor: '#060b16'` aparecendo onde `resolveGroundSample` devolve `undefined`. A janela extraída é 29×33 num budget que permite 96×96. |
| 7 | "Shake em todo dano" | O impulso `shake` dispara em todo `combat/damaged` no jogador, sem olhar magnitude. |

## Decisões congeladas

Estas não se redesenham dentro de uma task. Mudá-las é decisão de produto, fora do playbook.

1. **Sem poção de Tibia.** Nada de milhares de cargas nem clique contínuo. Sustentação vem de
   **leech** — que valoriza dano causado em criatura — somada a **regen sensível a combate**: quase
   nada enquanto apanha, forte alguns segundos após o último dano recebido. O loop pretendido é
   *recuar para um spot tranquilo*.
2. **Só o jogador regenera fora de combate.** Criatura ferida continua ferida; lurar e mobar
   permanece lucrativo.
3. **Runa e poção são habilidade com cargas por hunt**, recarregadas fora de combate ou entre runs.
   Sem inventário usável, sem loja, sem comando `actor/use-item`. Reaproveita a máquina de ability
   que já existe.
4. **Knight, Paladin e Sorcerer.** Os dois novos entram juntos, para generalizar
   `CharacterDefinition.skills` e `abilityShapeFromSpell` numa migração só. Druid e Monk existem no
   snapshot `157e6f9e` — são cinco vocações base e cinco promoções — e ficam para depois.
5. **O kit tem seis slots, não quatro.** Auto-attack, dano single-target, dano em área, cura,
   **postura** e **mobilidade**. Os dois últimos são o que faltava: postura é o que diferencia a
   rotação de hunt da rotação de boss, e mobilidade é o que torna jogável o recuo que a decisão 1 já
   assumiu. PB-07-01 confirma ou derruba os seis com evidência.
6. **Postura é o sistema de Stances do Vocation Adjustments 2026** (Tibia `15.25.3a4a52`,
   16/06/2026): uma stance ativa por vez — o Sorcerer pode ter uma *crippling* e uma *elemental* —,
   **toggle** que desliga ao ser relançada, que **persiste entre sessões**, e com canal de cooldown
   secundário próprio. É modo, não botão por segundo: adiciona decisão sem custar game feel.
7. **Port-forward documentado, não fidelidade ao snapshot.** As Stances 2026 são posteriores a
   `157e6f9e`; o snapshot tem a versão anterior, que exigiria nível 60 e 290 de mana num personagem
   level 35 com pool de 185 — inviável sem a poção que a decisão 1 recusou. Adotamos o desenho 2026
   com números da TibiaWiki, **marcados com fonte e versão em vez de `sha256`**. É desvio de
   **proveniência**, não de fidelidade: continua sendo conteúdo Tibia existente. A exceção vale
   **só** para stances; todo o resto sai do snapshot. Exige nota na ADR-05, escrita em PB-07-01 e
   aplicada em PB-07-04.
8. **As stances de Sorcerer são adaptadas.** As três originais dependem de crítico, que não existe
   no kernel e não entra neste playbook. A escolha entre fogo, energia e death permanece; o efeito
   passa a ser expresso em dano base por elemento. Desvio declarado.
9. **Condição com duração é sistema, não caso especial.** Postura, haste e magic shield são
   `Condition`; veneno e paralisia de criatura também. O sistema entra uma vez, em PB-07-05, e serve
   aos dois lados. Junto vem uma correção de forma: `ActorState.groupReadyAtTick` é hoje **um número
   único**, e o sistema de stances exige um canal de cooldown secundário separado do primário.
10. **Um bump de schema, não cinco.** Todo campo novo de `ActorBlueprint`, `ActorState` e
   `AbilityDefinition` entra de uma vez em PB-07-03, aditivo, com defaults que reproduzem v4. Por
   isso a pesquisa vem antes do contrato: é ela que diz quais campos existem.
11. **Golden regenerado uma única vez**, em PB-07-03, com prova escrita de que a mudança é
   intencional. Regenerar golden em qualquer outra task é defeito, não conveniência.
12. **Bestiary/bosstiary como UI fica fora.** PB-07 entrega os *dados* que ela vai ler.

## Restrições globais

Toda task herda esta seção; ela não se repete nos cards.

- Node `24.14.0` e pnpm `11.21.0` via Corepack; zero instalação global; sempre `corepack pnpm`.
- Nenhuma dependência externa nova em qualquer pacote.
- `packages/simulation` continua sem DOM, Phaser, `node:*`, `Date.now()`, `Math.random()` ou I/O.
- Zod vive só em `@huntbound/contracts`.
- O estado serializado do kernel continua só com inteiros seguros, booleanos e strings.
- Artefato gerado não se edita à mão; regenere pelo CLI e valide pelo `--check` correspondente.
- Todo campo novo de contrato é **aditivo com default que reproduz o comportamento anterior**.
- Nenhuma extensão Huntbound entra sem estar listada em
  `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`, seção "Extensões Huntbound permitidas". Leech,
  regen por combate e cargas são extensões e precisam da emenda.
- **A TibiaWiki é fonte declarada apenas para as Stances 2026.** Kit, fórmula, custo, cooldown, loot
  e mapa continuam saindo exclusivamente do snapshot. Número vindo da wiki leva marca de fonte e
  versão no lugar do `sha256`.

## Tasks

| ID | Estado da escrita | Título | Resultado |
|---|---|---|---|
| PB-07-01 | **card escrito** | Kit e rotação de Knight, Paladin e Sorcerer | Tabela de slots derivada do snapshot Canary local: quantas ações o kit precisa e qual papel cada uma cumpre |
| PB-07-02 | **card escrito** | Alvo e impacto legíveis | Anel na tile do alvo; shake só em dano de magnitude. Puro `apps/game` |
| PB-07-03 | **card escrito** | Contrato de combate v5 | Bump aditivo único: regen fora de combate, janela de combate, leech, elemento, cargas e a forma da condição ativa. Goldens regenerados uma vez |
| PB-07-04 | **card escrito** | Sustentação | `applyUpkeep` escolhe taxa pelo relógio de combate; `applyDamage` devolve leech. Emenda à ADR-05 |
| PB-07-05 | **card escrito** | Sistema de condições e stances | Condição com duração e chave de exclusividade; canal de cooldown secundário; toggle que persiste no save. Serve postura, mobilidade e DoT de criatura |
| PB-07-06 | **card escrito** | Skills genéricas e alcance real de magia | `skills` vira record; `resolveSpellPower` escolhe skill pela fórmula; `abilityShapeFromSpell` lê alcance real; `SpellDefinition` ganha condição |
| PB-07-07 | **card escrito** | Paladin | Vocação, skill `distance`, auto-attack ranged pelo `attackRangeTiles` existente, projétil, e as stances Sharpshooter e Divine Defiance |
| PB-07-08 | **card escrito** | Sorcerer | Magias elementais, AoE centrada no conjurador, Magic Shield e as três stances Master of Flames/Thunder/Decay adaptadas |
| PB-07-09 | **card escrito** | Elemento e resistência | Elemento chega ao `applyDamage`; `composeCreature` para de descartar `resistances`/`immunities` |
| PB-07-10 | **card escrito** | Criatura com kit | `composeCreature` para de zerar `abilityIndices`; IA `hunter` escolhe habilidade; veneno e paralisia usam PB-07-05. Primeiro boss solo |
| PB-07-11 | **card escrito** | Rotação com cargas | Runa/poção como habilidade com N cargas; kit ampliado por vocação conforme PB-07-01 |
| PB-07-12 | **card escrito** | Borda do mundo | Célula sem chão deixa de ser buraco; câmera limitada à área com chão |
| PB-07-13 | **card escrito** | Segunda hunt, terreno largo | Nova seleção TibiaRoute, extraída com margem de chão além da área jogável |
| PB-07-14 | **card escrito** | Aceite | `verify` verde, `qa:budgets` medido, `dev` de pé, e o que olhar |

As catorze cards estão escritas. Isso é um **desvio deliberado** de
`07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`, seção "Profundidade de escrita antecipada", que manda
congelar só duas à frente. A decisão é do dono do projeto, de 2026-08-21.

O custo do desvio é conhecido e precisa ser gerenciado: **PB-07-03 em diante define forma, escopo e
gates, mas depende de números que só PB-07-01 vai produzir.** Onde um valor viria da pesquisa, a card
aponta `docs/content/PB-07-ROTATIONS.md` em vez de fixar o número. Ao fechar PB-07-01, releia as
cards seguintes: o que a pesquisa contradisser, corrija na card antes de executá-la. Card
desatualizada que ninguém releu é exatamente como o PB-06 travou.

## Dependências e paralelismo

PB-07-01 e PB-07-02 são **independentes entre si** e podem rodar em paralelo: uma é documento, a
outra é `apps/game`, e não há arquivo em comum.

A partir de PB-07-03 a trilha é serial: 03 → 04 → 05 → 06 → (07, 08) → 09 → 10 → 11. PB-07-07 e
PB-07-08 podem ser paralelas se 06 estiver integrada, mas ambas tocam seleções de conteúdo e a
apresentação de efeito — na dúvida, serial.

PB-07-12 e PB-07-13 são independentes do resto e podem ser puxadas para frente se o mapa incomodar
mais que o combate.

## Fora de escopo

- UI de bestiary/bosstiary;
- Druid e Monk jogáveis — existem no snapshot, ficam para outro playbook;
- item usável, capacidade, peso, loja ou economia de loot;
- XP, level e progressão de personagem;
- outfits, gacha e helper — PB-08, PB-09 e PB-10;
- backend, conta ou telemetria remota.

## Critérios finais de aceite

O playbook fecha quando o usuário joga e aprova. Objetivamente, isso exige:

- [ ] `corepack pnpm verify` verde em `main` integrada.
- [ ] `corepack pnpm qa:budgets` **medido e registrado como número** no `STATE.md`; vermelho aqui
      vira task de performance, nunca bloqueio.
- [ ] Recuar do combate recupera vida e mana em ritmo perceptível; apanhar interrompe.
- [ ] Bater em criatura devolve vida e mana por leech.
- [ ] Knight, Paladin e Sorcerer jogáveis, cada um com fantasia distinta: melee, ranged e AoE.
- [ ] Cada vocação tem postura e mobilidade, e trocar de stance muda a rotação de forma
      perceptível.
- [ ] A stance ativa sobrevive ao `F5`, como no Tibia.
- [ ] Condição com duração existe no kernel e é usada dos dois lados: buff do jogador e veneno de
      criatura.
- [ ] Pelo menos uma criatura conjura, e existe um boss solo.
- [ ] O alvo é marcado por anel, não por escurecimento.
- [ ] Fechar um box de 8 não sacode a tela oito vezes.
- [ ] Nenhuma borda do mapa termina em buraco preto.
- [ ] Duas hunts extraídas pela mesma pipeline.
