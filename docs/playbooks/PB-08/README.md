# PB-08 — O loop de farm do Knight

> **Para agentes executores:** skill obrigatória por task:
> `superpowers:test-driven-development` e `superpowers:verification-before-completion`. Procedimento
> operacional nas skills `playbook-task`, `run-gates` e `worktree-cycle`. Execute uma task card por
> chat. O formato, o handoff e o ciclo automático de integração/limpeza seguem
> `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Status:** escrito e **elegível**. A primeira task é PB-08-01.

**Goal:** dar à run começo, fim e recompensa, e ao Knight a rotação que justifica farmar. O jogador
puxa um box de rotworms, fecha com `exori`, o leech o segura, decide quando sair com o loot, vê o
level subir e equipa a espada que dropou.

**Architecture:** quase tudo é **projeção de evento e conteúdo**, não kernel novo. `composePlayer`
já monta o blueprint do jogador a partir de um `CharacterDefinition`; basta essa definição deixar de
ser JSON congelado e passar a ser derivada de conteúdo + save + equipamento. XP e skill por uso são
projeções no molde de `projectRunBag`. Um único campo novo entra no kernel — `armor` — e só ele
regenera golden.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.4.3 (somente em `@huntbound/contracts`),
Vitest 4.1.10, Vite 8.2.1, Phaser 4, Playwright 1.62.1, Node 24.14.0. **Nenhuma biblioteca nova**
entra no PB-08.

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
9. `docs/content/PB-07-ROTATIONS.md` — continua vigente para kit e rotação de Knight;
10. este README;
11. a task card em execução;
12. `STATE.md` apenas para estado operacional.

## O problema, medido

O playbook nasce de cinco reclamações de quem jogou. A investigação mostrou que **quatro das cinco
são conteúdo ou conversão, não sistema faltando** — o que torna o playbook muito mais barato do que
o sintoma sugere.

| # | Observação | Causa real |
|---|---|---|
| 1 | "Não fecha box" | **`exori` não é área no nosso jogo.** O snapshot diz `createCombatArea(AREA_SQUARE1X1)` — 3×3, até 8 alvos. A selection não declara `area`, então `abilityShapeFromSpell` devolve `shape:'target'` com alcance 1. O box-closer do Knight bate em um mob |
| 2 | "Os mobs são poucos" | **12 slots em 8 grupos** num 24×24 de dois andares; grupos de 1–2 slots, raio 2–3, respawn 90 s. Box é geometricamente impossível. O `budget` da própria selection permite 96×96 |
| 3 | "O leech não funciona" | Pool de 185 de mana, `exori` custa **115 (62% da barra)** com CD 4 s, e rotworm tem 65 HP. Não circula dano suficiente para 100‰ significar algo, nem sobra mana para gastar de novo |
| 4 | "A run é infinita e sem propósito" | **`finish('completed')` não é chamado em lugar nenhum do código.** Só `finish('abandoned')`, no `pagehide`. `completedRuns` é permanentemente 0. Não existe momento de recompensa |
| 5 | "Não existe level nem farm de equips" | `CreatureDefinition.stats.experience` **já existe** no catálogo (rotworm = 40) e é descartado na conversão — `ActorBlueprint` não tem o campo. `ItemDefinition` é só `{stackable, maxStackSize, weight}`; `parseItemsXml` descarta `attack`, `defense`, `armor`, `slot` e `weaponType` **de propósito** |

O PB-07-03/04/05 entregaram a máquina que falta ligar: `ScenarioConditionDefinition`,
`AbilityDefinition.toggle`, cooldown secundário, leech e regen sensível a combate estão em `main` e
**não têm conteúdo que os use**. As stances de Knight são conteúdo, não código novo.

## Decisões congeladas

Estas não se redesenham dentro de uma task. Mudá-las é decisão de produto, fora do playbook.

1. **PB-07 congela na 05.** Paladin, Sorcerer, elemento/resistência, criatura com kit, boss e segunda
   hunt saem do caminho. O que o Knight precisa do PB-07 é absorvido aqui; o resto espera. A trilha
   de combate volta depois do PB-09.
2. **Level não destrava spell.** Level é grinding puro e influencia **HP, mana e dano**. O Knight
   começa com o kit inteiro; `exori` deixa de ser um portão de nível. É desvio declarado do Tibia,
   e é deliberado: o prazer de upar não pode depender de o kit estar incompleto até lá.
3. **Progressão é persistente, estilo Tibia.** Level, XP e skills vivem no `GameSave` e sobem entre
   runs. Skill de sword sobe **por uso**. Isso derruba a decisão do roteiro de que "a ficha do
   personagem é conteúdo congelado, não save": a ficha passa a ser **derivada** de conteúdo base +
   progressão + equipamento.
4. **A run termina por escolha do jogador.** Sair fora de combate consolida bag → stash e conta a
   run. Morrer perde a bag e uma fração do XP. É o que dá peso à decisão de recuar que o PB-07-04
   assumiu e nunca cobrou.
5. **Densidade vem do mapa real.** A caverna é re-extraída com a área maior que o budget já permite.
   **Nenhum spawn é inventado.**
6. **Set reduzido: arma, armadura, escudo.** Helmet, legs, boots, amulet e ring ficam para depois.
7. **Curva do Tibia mantida, com multiplicador Huntbound.** `experienceRate` é um número na selection,
   valor inicial `10`. Extensão declarada — exige emenda à ADR-05, como leech e cargas já têm.
8. **Um único campo novo no kernel: `armor`.** Aditivo, default `0`, mitigação **determinística**
   (sem novo draw de RNG, para não deslocar os streams). Bump `SIMULATION_SCHEMA_VERSION` 5→6 com
   defaults que reproduzem v5.
9. **Golden regenerado uma única vez**, na task do `armor`, com prova escrita de que a mudança é
   intencional. Regenerar golden em qualquer outra task é defeito, não conveniência.
10. **Bestiary e charms ficam para o PB-09.** Este playbook não entrega contador de criatura nem
    bônus por espécie.

## Por que isto é barato — a costura

O achado que define o playbook está em `packages/content/src/hunts/buildHuntScenario.ts`:
`composePlayer` já monta o `ActorBlueprint` do jogador inteiramente a partir de um
`CharacterDefinition`. Basta essa definição deixar de ser JSON congelado:

```
CharacterDefinition = base da vocação (conteúdo)
                    + progressão (save: level, XP, skills)
                    + equipamento (save: arma, armadura, escudo)
```

Consequências que valem como restrição de projeto:

- **XP, skill por uso e qualquer contador são projeção de evento**, no molde de `projectRunBag`.
  `actor/died` já carrega `killerEntityId`; `combat/attacked` já existe. **O kernel não precisa
  saber o que é XP, e nenhuma dessas tasks regenera golden.**
- **Level e equipamento não tocam o kernel.** Entram pelo `CharacterDefinition` e saem como
  `maxHealth`, `maxResource`, `attackMinDamage` e `attackMaxDamage` — campos que já existem.
- **Só `armor` é kernel**, porque mitigação de dano é regra de combate e não cabe em projeção.

## Curva de XP — a aritmética

`exp(level) = (50·L³ − 150·L² + 400·L) / 3`, a fórmula do Tibia, permanece. 35 → 100 custa ≈ **15,5 M**
de experiência. Rotworm dá 40; num box denso, ~30 kills/min ⇒ ~1.200 exp/min bruto.

A `experienceRate = 10`: ~12.000 exp/min ⇒ **≈5 min por level no 35**, **≈40 min por level no 99**,
level 100 em ~20–25 h. Se estiver lento ou rápido demais, muda-se a constante e nada mais.

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
  `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`, seção "Extensões Huntbound permitidas".
  `experienceRate`, progressão persistente e equipamento são extensões e precisam da emenda.
- Número de conteúdo sai do snapshot Canary. Onde o Huntbound divergir, a divergência é **declarada
  na selection com campo de origem**, nunca silenciosa.

## Tasks

| ID | Estado da escrita | Título | Resultado |
|---|---|---|---|
| PB-08-01 | **card escrito** | `exori` fecha o box | `area` fiel ao snapshot na selection; um cast atinge todos os adjacentes |
| PB-08-02 | **card escrito** | A caverna cabe num box | Região re-extraída até o budget; existe grupo com ≥4 slots |
| PB-08-03 | bullet | Economia de mana e ações do Knight | Kit recustado à pool; stances `utito tempo` e `utamo tempo` como conteúdo sobre a máquina do PB-07-05 |
| PB-08-04 | bullet | Mobilidade | `utani hur` como condição de velocidade; o recuo vira jogável |
| PB-08-05 | bullet | A run termina | Sair fora de combate → `finish('completed')`, bag → stash; morte perde a bag |
| PB-08-06 | bullet | XP | `projectRunProgress` sobre `actor/died`; `experienceRate`; save 1→2 com migração |
| PB-08-07 | bullet | Skill de sword por uso | Projetada de `combat/attacked` |
| PB-08-08 | bullet | Level realimenta o personagem | `CharacterDefinition` derivada; HP, mana e dano por level |
| PB-08-09 | bullet | Item ganha stat | `parseItemsXml` para de descartar `attack`/`defense`/`armor`/`slot`/`weaponType` |
| PB-08-10 | bullet | Três slots equipáveis | Save e `InventoryPanel`; `weaponAttack` vem do item |
| PB-08-11 | bullet | `armor` no kernel | Campo aditivo v6, mitigação determinística, escudo. **Única task que regenera golden** |
| PB-08-12 | bullet | Loot equipável | Peça equipável nas tabelas, com drop legível |
| PB-08-13 | bullet | Aceite | `verify` verde, `qa:budgets` medido, `dev` de pé, e o que olhar |

Conforme `AGENTS.md`, só **duas cards** estão congeladas. As demais são bullets até chegar a vez —
o PB-07 escreveu catorze antecipadas e pagou por isso.

## Dependências e paralelismo

PB-08-01 e PB-08-02 são **independentes entre si** e podem rodar em paralelo: uma é selection de
combate, a outra é selection de mapa, e não há arquivo em comum.

A partir daí: 03 e 04 dependem de 01 e 02 integradas (é preciso ver o box para recustar o kit).
05 é independente e pode ser puxada para frente. 06 → 07 → 08 é serial. 09 → 10 → 11 → 12 é serial.

## Fora de escopo

- Bestiary, charms e contador de criatura — PB-09;
- Paladin, Sorcerer, elemento/resistência, criatura com kit e boss — PB-07 congelado;
- helmet, legs, boots, amulet, ring; capacidade, peso, loja ou economia de loot;
- outfits, gacha e helper;
- backend, conta ou telemetria remota.

## Critérios finais de aceite

O playbook fecha quando o usuário joga e aprova. Objetivamente, isso exige:

- [ ] `corepack pnpm verify` verde em `main` integrada.
- [ ] `corepack pnpm qa:budgets` **medido e registrado como número** no `STATE.md`.
- [ ] Um `exori` com quatro rotworms adjacentes atinge os quatro.
- [ ] Existe pelo menos um spot onde dá para puxar 4+ rotworms para o mesmo box.
- [ ] Durante o box, a barra de vida **sobe** pelo leech em vez de só cair.
- [ ] Trocar de stance muda a rotação de forma perceptível, e a stance sobrevive ao `F5`.
- [ ] Sair da hunt consolida o loot e incrementa a contagem de runs.
- [ ] Matar criatura dá XP; o level sobe; HP, mana e dano máximos aumentam junto.
- [ ] Bater com a espada faz a skill de sword subir ao longo de várias runs.
- [ ] Existe arma, armadura e escudo equipáveis, dropados pela hunt, e equipar muda o número.
- [ ] Morrer com a bag cheia custa a bag.
