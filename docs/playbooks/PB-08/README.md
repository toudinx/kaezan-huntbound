# PB-08 — O Knight completo

> **Para agentes executores:** skill obrigatória por task:
> `superpowers:test-driven-development` e `superpowers:verification-before-completion`. Procedimento
> operacional nas skills `playbook-task`, `run-gates` e `worktree-cycle`. Execute uma task card por
> chat. O formato, o handoff e o ciclo automático de integração/limpeza seguem
> `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Status:** reescrito em 2026-08-24 e **elegível**. A próxima task é PB-08-02.

**Goal:** o Knight sai de quatro ações — das quais só três dão dano — para **nove ações que se
distinguem olhando, cinco delas de dano**, com o mapa da classe inteira congelado para nunca mais
precisar de mudança estrutural.

**Architecture:** quase tudo é **conteúdo sobre máquina pronta**. `rangeTiles`, `radius`,
`speedPermille`, `damageDealtPermille`, `damageReceivedPermille`, `toggle` e `secondaryCooldownGroup`
existem no contrato v5 e estão implementados sem consumidor. Das cinco ações que faltam, **quatro são
preenchimento de conteúdo** e só uma — o taunt — pede kernel.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.4.3 (somente em `@huntbound/contracts`),
Vitest 4.1.10, Vite 8.2.1, Phaser 4, Playwright 1.62.1, Node 24.14.0. **Nenhuma biblioteca nova.**

## Por que este playbook foi reescrito

O PB-08 original — densidade, run que termina, XP, level, skill, equipamento, `armor` — era um
playbook de **substrato**, não de gameplay. Foi escrito rápido, com pouca consulta a
`docs/research/**`, e nenhuma das mecânicas já pesquisadas entrou nele.

O replanejamento de 2026-08-24 dissolveu-o em cinco playbooks e produziu o princípio de design da
seção seguinte. O que sobrou aqui é a classe: o Knight tem **três ações de dano e uma cura**, e isso
é o motivo mais direto de o combate parecer trivial.

O trabalho já integrado da PB-08-01 (densidade da caverna) permanece; ele deu ao Knight um lugar
onde as nove ações fazem diferença.

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
9. `docs/content/PB-07-ROTATIONS.md` — kit, custo, cooldown e fórmula do Knight, com proveniência.
   **Emendado por este README** no ponto da hipótese de seis slots (decisão congelada 3);
10. `docs/content/KNIGHT_BANDS.md` — **entregue e vigente** desde a PB-08-02; é a fonte do kit. Onde
    ele divergir da tabela "O kit alvo" abaixo, **ele vence**: a tabela é a proposta de 2026-08-24,
    o mapa é o resultado;
11. este README;
12. a task card em execução;
13. `STATE.md` apenas para estado operacional.

## O princípio de design — e os três critérios que o operam

Formulado pelo dono em 2026-08-24. **Vale para magia, criatura, item e equipamento**, não só para
este playbook.

### 1. Nada convive com a própria versão obsoleta

`exura` → `exura gran` → `exura vita` é escada: mesma coisa com número maior, e a de baixo vira peso
morto. Em Huntbound cada faixa tem **a sua** forma de cada papel, e cruzar a faixa **substitui**.
Minotauro e demônio não competem — cada um é a forma da sua faixa.

`docs/research/tibia/02_vocations_spells_runes.md` §4.2 já dizia metade: *"Escadas de tier
(light → heavy → great). Uma runa que sobe de qualidade, não cinco runas."*
`docs/research/tibia/01_hunts_progression.md` §13 item 12 recusa "dezenas de spells situacionais e
centenas de itens quase idênticos".

**Faixa decide o que existe, não quando você recebe.** Ver decisão congelada 2.

### 2. O critério de coexistência é de leitura, não de mecânica

> **Duas ações só coexistem se um espectador distingue as duas olhando** — forma no grid, efeito,
> alvo, o que acontece com o inimigo. Se produzem a mesma imagem e só muda o número, é escada,
> **mesmo com cooldowns diferentes**. Cooldown e mana são invisíveis.

O motivo é de produto: **o helper vai executar a rotação**, então o valor dela é ser divertida de
assistir e fácil de identificar. Não é APM.

Consequência direta: **Charge (`utani tempo hur`) é corte declarado** — produz a mesma imagem de
Haste, o boneco andando mais rápido, e difere só em duração e fórmula.

### 3. O orçamento: 8–9 ações, cerca de metade de dano

O teto não é um número pequeno — é **redundância zero**. Dez ações no Tibia global produzem
tendinite; nove no League of Legends são divertidas. A diferença não é a contagem: é que as nove do
LoL são todas distintas.

Referência adotada: **QWER + D/F + 1–2 itens ativáveis + auto-attack ≈ 8–9 ações.**

| Camada | Em Huntbound | Quantidade |
|---|---|---|
| QWER + auto-attack | **rotação de dano** — o que se assiste | **~5** |
| D/F + itens ativáveis | situacionais — cura, postura, taunt, mobilidade | ~4 |

**O mais importante é a rotação de dano.** É ela que produz o espetáculo; utilidade é situacional
por definição. Um kit com quatro utilidades e duas ações de dano gasta o orçamento no lugar errado.

## O kit alvo — nove ações, cinco de dano

Verificado em `references/canary/data/scripts/spells/{attack,support}/*.lua` em 2026-08-24. É o kit
de nível ≤ 35 **inteiro**, menos exatamente uma escada.

| | Ação | Words | Nv | Mana | CD | Imagem própria | Temos? |
|---|---|---|---|---|---|---|---|
| **Dano** | auto-attack | — | — | 0 | 2 s | golpe de espada | ✅ |
| **Dano** | Berserk | `exori` | 35 | 115 | 4 s | giro ao redor, `AREA_SQUARE1X1` | ✅ |
| **Dano** | **Groundshaker** | `exori mas` | 33 | 160 | 8 s | pancada no chão, `AREA_CIRCLE3X3` | ❌ |
| **Dano** | Brutal Strike | `exori ico` | 16 | 30 | 6 s | golpe pesado, `range(1)` | ✅ |
| **Dano** | **Whirlwind Throw** | `exori hur` | 28 | 40 | 6 s | **a arma sai voando**, `range(5)` | ❌ |
| Situacional | Wound Cleansing | `exura ico` | 8 | 40 | 1 s | brilho verde no jogador | ✅ |
| Situacional | **Blood Rage / Protector** | — | ~20 | — | toggle | estado permanente visível | ❌ |
| Situacional | **Challenge** | `exeta res` | 20 | 30 | 2 s | **os oito vizinhos viram para você** | ❌ |
| Situacional | **Haste** | `utani hur` | 14 | 60 | 2 s | o boneco acelera | ❌ |
| ~~corte~~ | ~~Charge~~ | `utani tempo hur` | 25 | 100 | 2 s | mesma imagem de Haste → escada | — |

**Temos 4 das 9.** Faltam Groundshaker, Whirlwind Throw, postura, Challenge e Haste.

Duas observações que ordenam o playbook:

1. **Challenge é a ação mais legível do kit e não compete com nada.**
   `docs/research/tibia/02_vocations_spells_runes.md` §3.1 define a identidade do Knight como *"eu
   escolho onde a luta acontece"*, e §11 lista "AoE centrado em si **+ taunt**" como o diferencial a
   preservar. Ele roda em `group("support")` — **fora do cooldown de ataque** —, então não rouba
   tempo da rotação de dano.
2. **O valor pleno do taunt chega com o PB-10.** Contra rotworms, que correm para o jogador de
   qualquer jeito, taunt não faz nada. Contra inimigos ranged, ele é a resposta.

## Por que isto é barato — as peças ociosas

O achado que define o playbook: **quatro das cinco ações que faltam são preenchimento de conteúdo.**

| Peça | Onde | Estado |
|---|---|---|
| `AbilityDefinition.rangeTiles` | contrato v5 | implementado → Whirlwind Throw é conteúdo |
| `AbilityDefinition.radius` + `shape: 'area'` | contrato v5 | implementado → Groundshaker é conteúdo |
| `speedPermille` | `packages/simulation/src/kernel/conditions.ts:37,63` | **aplicado** → Haste é conteúdo |
| `damageDealtPermille` / `damageReceivedPermille` | `conditions.ts:62`, `combat.ts:303` | **aplicado** → postura é conteúdo |
| `skillModifierPermille` | `conditions.ts:71` | **aplicado** |
| `AbilityDefinition.toggle` | contrato v5 | implementado, **sem consumidor** |
| `secondaryCooldownGroup` | contrato v5 | implementado → o grupo `support` do Challenge cabe |
| `skillMultipliers` (`skill:1` club, `:2` sword, `:3` axe) | catálogo | importado, **Character não lê** |
| `CombatFxTable` chaveada por `abilityId` | `apps/game/src/hunt/CombatFxTable.ts` | existe → FX por ação é preenchimento |
| **alvo forçado (taunt)** | — | **não existe**; a IA escolhe alvo em `isAcquirableTarget` |
| `tickDamageAmount` | `conditions.ts:162` | **recusa `<= 0`** → cura por tick não existe (Recovery) |
| `AbilityShape` | contrato | só `self \| target \| area`; sem onda (Front Sweep) |

## Decisões congeladas

Não se redesenham dentro de uma task. Mudá-las é decisão de produto, fora do playbook.

1. **O princípio de design da seção acima é regra de projeto.** Os três critérios — sem escada,
   coexistência só com distinção visual, orçamento de 8–9 ações com ~5 de dano — valem para magia,
   criatura, item e equipamento, e não só para o Knight.
2. **Level não destrava spell.** Herdada do PB-08 original e **reafirmada**: o Knight tem o kit
   inteiro desde o começo. *"Imagina passar do level 1 ao 15 só dando auto-attack. Isso acontece no
   Tibia porque ele é um MMORPG de mundo aberto e as coisas são mais lentas por lá."* Faixa é
   ferramenta de **curadoria de conteúdo** — decide o que existe e o que é escada —, nunca portão de
   acesso. Se o playtest mostrar que nove ações de saída é demais, a lógica de limitar entra depois,
   **editando dado**.
3. **A hipótese de seis slots do `PB-07-ROTATIONS.md` fica emendada.** Aquele documento perguntava
   quantos *papéis* existem e acertou em seis. A pergunta deste playbook é quantas *imagens
   distintas* a rotação sustenta, e a resposta é maior, porque o papel "dano" sozinho comporta
   cinco. Os números de kit, custo, cooldown e fórmula do PB-07-ROTATIONS continuam normativos.
4. **Seis vocações por arma estão recusadas.** A fantasia entrega-se como **eixo de build dentro do
   Knight**: skill separada por sword/axe/club e passiva por tipo. Seis vocações exigiria emenda à
   ADR-05 e multiplicaria kit, balanceamento e asset por seis para a mesma sensação.
5. **Subclasses de Knight ficam reservadas, não fechadas.** 1 mão × 2 mãos e arquétipos — sword
   balanceado, axe agressivo, club defensivo — são tópico futuro. **O mapa da PB-08-02 é obrigado a
   declarar os eixos de arma reservados por célula**, para que subclasses entrem como conteúdo e não
   como refatoração.
6. **Se o club virar o arquétipo defensivo, ele paga em ofensa.** Defensivo puro é o arquétipo que
   ninguém escolhe. A saída é mitigação **virar dano** — dano derivado do que foi bloqueado, não
   sobrevida. Restrição de design registrada para quando a subclasse for decidida.
7. **Toda ação entra com efeito visual próprio.** `CombatFxTable.ts` já é chaveada por `abilityId`.
   Ação que cai no recipe genérico falha o critério 2 por construção, e a task não fecha.
8. **Golden se regenera só com prova escrita de intencionalidade — e regenera mais vezes do que a
   primeira redação previu.** `packages/test-fixtures/hunt/pb05/scenario.json` carrega a tabela de
   `abilities` e de `conditions` do cenário composto, hoje com exatamente três abilities. **Toda task
   que acrescenta ação ao kit recompõe a fixture**: são as tasks **04, 05, 06 e 07**, não apenas a
   06, como esta decisão afirmava até 2026-08-24. A 06 regenera por dois motivos — kit e kernel.

   As que **não** regeneram são 03 e 09, ambas aditivas com default que reproduz o comportamento
   anterior; nelas, `combat:check` inalterado é a **prova** de que o default está certo, e golden que
   move é defeito, não autorização.

   Vale a lição estrutural do B8: `hunt:check`, `combat:check` e `save:check` conferem bytes contra
   hashes publicados e **nunca recompõem**, então desvio entre fixture e conteúdo é invisível até
   alguém recompor. O gerador é `tools/replay/generatePb05CombatFixture.ts`.

## Tasks

| ID | Estado da escrita | Título | Resultado | Kernel? |
|---|---|---|---|---|
| PB-08-01 | **integrada** | A caverna cabe num box | `c23c819`; permanece como histórico | não |
| PB-08-02 | **card escrita** | O mapa do Knight | `docs/content/KNIGHT_BANDS.md`: papéis × faixas, uma imagem por ação, cortes com motivo, orçamento e eixos de arma reservados. Sem código | não |
| PB-08-03 | **card escrita** | O kit vem de uma tabela | `CharacterDefinition` resolve `abilityIndices` por tabela de faixas — hoje **uma linha, tudo liberado**. Task estrutural | não |
| PB-08-04 | **card escrita** | A rotação de dano se completa | Groundshaker e Whirlwind Throw. **A task mais importante do playbook** | não |
| PB-08-05 | **card escrita** | Postura | Blood Rage e Protector: `toggle` + condição exclusiva, com ganho **e** perda explícitos | não |
| PB-08-06 | **card escrita** | Taunt — Challenge | `exeta res`, raio 1. Alvo forçado não existe no kernel. **Único kernel novo do playbook** | **sim** |
| PB-08-07 | **card escrita** | Mobilidade — Haste | `utani hur`. Charge é corte declarado | não |
| PB-08-08 | **reescrita em 2026-08-25** | O chassi do cockpit | Arcos de vida e mana, deck centrado com vão entre dano e situacional, switch de postura, cooldown por grupo, câmera centrada na área livre | não |
| PB-08-09 | **reescrita em 2026-08-25** | A rail de janelas | Mapa quadrado, janela de alvo e bag da hunt — três painéis sobre dado que já existe. Sprites de loot no extractor | não |
| PB-08-10 | **reescrita em 2026-08-25** | Aceite | `verify` verde, `qa:budgets` medido, `dev` de pé, e um roteiro que julga **leitura antes de mecânica** | — |

### A reescrita de 08 a 10

O playtest de 2026-08-25 fechou o kit e mostrou que o que faltava não era mecânica: as nove ações
existem e funcionam desde a PB-08-07, mas saem numa lista plana onde postura parece magia e uma ação
de `support` parece travada pelo cooldown de ataque.

A spec do redesenho é `docs/superpowers/specs/2026-08-25-pb-08-cockpit-hud-design.md`, e ela carrega
o layout aprovado e as quatro propostas recusadas antes dele. Duas mudanças de escopo vieram junto:

- **`Arma como eixo de build` saiu do PB-08** para `docs/playbooks/PB-11/`. O card já se declarava
  meia-task — *"fecha no PB-11, quando o equipamento existir"* — e o equipamento também foi para lá.
- **O equipamento saiu do HUD do PB-08.** Vira janela no PB-11, onde existe stat de item para
  mostrar. Com isso os três painéis da rail leem dado que já existe, e não sobra placeholder na tela.

**As cards de 01 a 07 continuam como estavam** — estão integradas e viraram histórico.

**As dez cards estavam escritas de uma vez.** Isso **desviava** da regra do `AGENTS.md` de congelar só
duas à frente, e o desvio foi deliberado, pedido pelo dono em 2026-08-24 para distribuir trabalho
entre Codex, Claude e Cursor sem esperar a escrita de cada uma. **A reescrita de 08 a 10 é o preço
desse desvio**: card escrita antecipadamente envelheceu contra o código — a 08 original mandava ligar
nove teclas que já estavam ligadas desde a 04.

O risco que a regra existe para evitar é real e continua: **card escrita antecipadamente envelhece
contra o código**. A mitigação é que 04 a 10 consomem o `KNIGHT_BANDS.md`, que já está congelado —
elas não antecipam decisões, aplicam uma decisão já tomada. Ainda assim, **quem executar uma card
confere se o mapa mudou desde que ela foi escrita**, e corrige a card antes de implementar.

**Bullets contingentes ao mapa da PB-08-02**, que só viram card se ele decidir que fazem falta:
Recovery (`utura`, pede cura por tick em `conditions.ts:162`) e Front Sweep (`exori min`, pede forma
de onda em `AbilityShape`).

## Modelo e effort por task

Classificado por `docs/08_POLITICA_MODELOS_AGENTES.md`. **Vale também para os bullets** — a card
ainda não existe, mas a alocação sim, para que o trabalho possa ser distribuído sem esperar a
escrita. A card, quando escrita, repete a linha no cabeçalho.

Camada frontier = **GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6**, intercambiáveis; a escolha entre eles é
do usuário no momento da execução. Implementação bem especificada = **GPT-5.6 Luna**.

| ID | Classe da tarefa | Modelo e effort | Validador | Por quê |
|---|---|---|---|---|
| **02** | especificação / design | **frontier, `xhigh`** | frontier **diferente** do autor | Decide o conjunto ativo da classe inteira e o que é escada. Risco está no julgamento, não no diff — a política manda frontier "mesmo quando o diff esperado é pequeno" |
| **03** | implementação geral bem especificada | **Luna, `xhigh`** | gates automatizados | Contrato aditivo com **forma congelada na card** e `combat:check` como juiz objetivo: se o golden não mover, a equivalência está provada. Escala se a forma congelada não couber |
| **04** | implementação geral bem especificada | **Luna, `xhigh`** | gates automatizados | Duas magias sobre `radius` e `rangeTiles`, ambos implementados. Números saem do snapshot; nenhuma decisão de contrato |
| **05** | implementação geral bem especificada | **Luna, `xhigh`** | gates automatizados | `toggle` e condição exclusiva estão prontos; os números de Blood Rage e Protector têm proveniência declarada na ADR-05 |
| **06** | **implementação complexa** | **frontier, `xhigh`** | frontier **diferente** do implementador | Alvo forçado **não existe**: muda a política de aquisição de alvo da IA em `isAcquirableTarget`, atravessa kernel e conteúdo e **regenera golden**. Único kernel novo do playbook |
| **07** | implementação geral bem especificada | **Luna, `xhigh`** | gates automatizados | A mais mecânica das dez. `speedPermille` já é aplicado em `conditions.ts:37` |
| **08** | **implementação complexa** | **frontier, `xhigh`** | **o usuário jogando** | Subiu de Luna na reescrita de 2026-08-25. É a superfície que o usuário julga no aceite, e deixou de ser só DOM e CSS: arrasta deslocamento de câmera e a **reescrita** de `hunt-mobile.spec.ts:95`, um teste derivado de ADR |
| **09** | implementação geral bem especificada | **Luna, `xhigh`** | gates + screenshot do perfil `personal` | Três painéis sobre dado que já existe, mais ids novos numa lista que já existe. Nenhuma decisão de contrato. O juiz do painel de bag **não** é gate verde: o perfil `test` fabrica placeholder 1×1 |
| **10** | gate final / aceite | **frontier, `xhigh`** | **o usuário jogando** | A política manda camada frontier para gate final. E o aceite de produto não é veredito de agente |

**Diversidade de revisão.** 02, 06 e 08 são frontier implementando; cada uma é revisada por um
frontier **diferente** — Sol prefere Opus 5 ou Grok 4.6; Opus 5 prefere Sol ou Grok 4.6; Grok 4.6
prefere Opus 5 ou Sol. A 08 é o caso especial: o revisor formal é frontier, mas **quem decide é o
usuário jogando** — leitura de HUD não se audita por texto, e foi um playtest que reprovou o desenho
anterior, não uma revisão. Mesmo modelo revisando só quando a plataforma não oferecer alternativa, e o
desvio vai para o `STATE.md` com modelo, effort e motivo.

**Luna-first e escalonamento.** As tasks Luna começam em Luna e **só** trocam para frontier por um
dos gatilhos da política: a mesma causa bloqueia dois ciclos RED/GREEN; concluir exige mudar decisão
congelada, schema ou escopo; o executor não consegue provar determinismo ou isolamento com os gates
da task; aparece comportamento com mais de uma interpretação plausível; ou o usuário pede. Antes de
escalar, registre no `STATE.md` a evidência do bloqueio, as tentativas e o modelo de destino.

O `STATE.md` registra o modelo e o effort **efetivamente** usados. Divergência entre sugerido e usado
é desvio registrável, não erro — desde que registrada.

## Dependências e paralelismo

```
02 (mapa) --> 03 (kit por tabela) --+-> 04 rotação de dano   <- a mais importante
                                    +-> 05 postura
                                    +-> 06 taunt (kernel, golden)
                                    +-> 07 mobilidade
                                             \--> 08 HUD --> 10 aceite
09 (arma) depende de 03; fecha no PB-11.
```

**PB-08-02 vem primeiro e sozinha.** É a única task cujo resultado muda o julgamento das seguintes:
sem o mapa, não se sabe qual forma de cada papel entra. 04, 05 e 07 são paralelizáveis entre si. 06 é
a única com kernel e golden.

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
  `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`, seção "Extensões Huntbound permitidas". Stances já
  estão listadas; **taunt não é extensão** — `exeta res` existe no snapshot.
- Número de conteúdo sai do snapshot Canary. Onde o Huntbound divergir, a divergência é **declarada
  na selection com campo de origem**, nunca silenciosa. O corte do Charge é divergência declarada.

## Fora de escopo — e para onde foi

O PB-08 original foi redistribuído. **Nada disto entra aqui.**

| Playbook | Conteúdo | Nota |
|---|---|---|
| **PB-09 — Progressão** | XP, level, skill por uso, ficha derivada, Códex | **Começa por design doc**, não por task card. O princípio de design é a entrada dele, e a decisão congelada 2 torna a pergunta *"o que ganhar um level me dá?"* mais afiada, não mais fácil |
| **PB-10 — Novas criaturas** | Snake, Orc, Orc Spearman, Orc Shaman, IA que conjura, spawn por identidade estável | É o playbook que dá valor ao taunt |
| **PB-11 — O loot vira poder** | Stats de item, três slots, `armor` no kernel v6, elemento/resistência, loot equipável, **e o fim da run** | Fecha também o eixo de arma da PB-08-09 |
| **PB-12 — Hunts moduladas e level sync** | Sync de nível e de gear | **A outra metade do princípio de design. Exige emenda à ADR-05** |
| Depois | Runas com cargas, charms/sigilos, contrato de caça, criatura-do-dia, bossiary, trilha Fenda, subclasses de Knight | |

Também fora: outfits, gacha, helper, backend, conta e telemetria remota.

## Critérios finais de aceite

O playbook fecha quando o usuário joga e aprova. Objetivamente, isso exige:

- [ ] `corepack pnpm verify` verde em `main` integrada.
- [ ] `corepack pnpm qa:budgets` **medido e registrado como número** no `STATE.md`.
- [ ] O Knight tem **nove ações**, cinco delas de dano, disponíveis desde o começo.
- [ ] **Cada ação tem efeito visual próprio** e é identificável sem ler o botão.
- [ ] Nenhum par de ações do kit ativo produz a mesma imagem.
- [ ] Groundshaker acerta visivelmente mais tiles que Berserk.
- [ ] Whirlwind Throw acerta um alvo a 5 tiles, com a arma saindo da mão.
- [ ] Trocar de postura muda a rotação de forma perceptível, e a postura sobrevive ao `F5`.
- [ ] Challenge faz criaturas que estavam em outro alvo virarem para o jogador.
- [ ] Haste muda a velocidade de passo de forma visível por 30 s.
- [ ] As nove ações cabem no HUD sem que a rotação de dano se confunda com as situacionais.
