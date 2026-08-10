# Kaezan Huntbound — Síntese: Direção Única

> **Status: síntese histórica superada para o V0.** A ADR-002
> (`05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`) agora é a fonte de direção de produto. Este documento
> continua válido como banco de pesquisa, hipóteses e desenho de longo prazo, mas não vence a
> ADR-002 nem o roteiro `06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`.
>
> **Nada foi implementado.** Nenhuma pesquisa nova foi feita.
>
> **Data:** 2026-08-09 · **Direção técnica atualizada:** Phaser 4 + TypeScript, browser-first.

### Overrides vigentes para o V0 pessoal

- usar conteúdo, mecânicas e assets Canary/Tibia, sem produzir equivalentes Kaezan;
- escolher qualquer hunt elegível no TibiaRoute e validar seus IDs no snapshot local;
- gacha exclusivamente cosmético de famílias de outfit;
- save local/IndexedDB; backend autoritativo é fase futura de produto;
- Metrônomo, Echoing Den, inimigos Kaezan T1, posturas e ruptura novas não bloqueiam o slice;
- importar uma hunt por vez e carregar assets por pacote.

---

## Como ler este documento

Toda decisão carrega uma etiqueta:

| Etiqueta | Significado |
|---|---|
| **[DECIDIDO]** | Fechado. Só reabre com evidência nova. Pode ser implementado. |
| **[HIPÓTESE]** | Direção escolhida, número/forma provisório. Implementável, mas instrumentado para ser revisto. |
| **[PROTÓTIPO]** | Não decidir em papel. Só o vertical slice responde. |
| **[PESQUISA]** | Falta informação. Não implementar até resolver. |

**Rastreabilidade:** `W01`–`W11` = relatórios de pesquisa externa; `C01`–`C06` = relatórios de
código; `BASE` = `BASE_CONTEXTO_KAEZAN_HUNTBOUND`; `GUIA` = `01_GUIA_DE_EXECUCAO`.

**Fontes lidas:** os 20 relatórios em `docs/`, o dossiê (`00`), o contexto base, o guia, e os
baselines históricos de Canary/OTClient — estes últimos por meio de **C05**, que já os consolidou e
que descobriu três camadas adicionais (`mapping/changes/`, `mapping/canary/`, código
`data-kaezan/` + `game_kaezan_*`) que os prompts originais não apontavam.

---

# §0. Contradições resolvidas

Esta seção existe porque é a razão de ser da síntese. Cada linha era um conflito real entre
documentos. **Nenhuma delas deve ser reaberta sem evidência nova.**

| # | Conflito | Onde aparecia | Decisão |
|---|---|---|---|
| 1 | **"Postura" significa duas coisas** | `BASE §7` e W02 usam para *stance do jogador*; C03/Arena Fable usa para *barra de stagger do boss* (`PostureGainPerAuto`, `PostureDamageMultipliers`); W11 §0 registrou a ambiguidade sem poder resolver | **Resolvido:** **Postura** = stance do jogador (2 por classe). **Ruptura** = barra do inimigo. Nomes separados na UI, no código e nos dados. **[DECIDIDO]** |
| 2 | **Energia existe ou não** | `BASE §5` e `GUIA §6` pedem; Arena Fable `DESIGN_NOTES §12` lista "stamina/energia" em **Evitar**; o backend do Arena Fable implementou mesmo assim | **Resolvido:** existe, mas **limita recompensa, nunca acesso**. Kaezan: World e Arena Fable convergiram nessa mesma regra por caminhos independentes (C05 §6.1) — é a evidência mais forte do acervo. **[DECIDIDO]** |
| 3 | **Helper desligado no conteúdo sincronizado** | W04 §10 sugere desligar ou restringir o helper no Modo Sincronizado; `BASE §6`, W07 §9 e W11 §5.3 proíbem nerfar o helper | **Resolvido: rejeitada a sugestão do W04.** O helper nunca é desligado, nerfado ou penalizado, em nenhum modo. Se o sync perder sentido com helper ativo, o problema é do sync, não do helper. **[DECIDIDO]** |
| 4 | **Helper move o personagem?** | Kaezan: World **recusou** auto-walk por decisão registrada; Arena Fable **implementou** movimento por papel (orbitar/box/kite); `BASE §6` lista kite/follow/avoid como candidatos | **Resolvido:** helper faz **movimento tático** (espaçamento, kite, follow, avoid). **Não** faz **navegação de rota** (cavebot) no MVP. É a fronteira que separa helper de bot. **[DECIDIDO]** |
| 5 | **Quantas faixas de progressão** | W01 propõe 8 tiers (T0–T8, ~20 dungeons); W04 propõe 5 faixas de sync (cap/5) | **Resolvido: 5 faixas.** T1–T5, largura 20, cap 100. 2–3 dungeons por faixa = **10–15 dungeons** no primeiro ciclo, não 20. O currículo de inimigos do W01 §12 R4 é comprimido nessas 5. **[DECIDIDO]** |
| 6 | **Colisão de nomes de moeda** | W03 chama de *Sigilos* os buffs por família; W05 chama de *Sigilos* a meta-progressão da Fenda; *Ressonância* é moeda em W05 e multiplicador em W08 | **Resolvido (W09 §5.3):** Códex fica com **Sigilos**; Fenda usa **Vestígios**; o multiplicador semanal é **Maré**; a moeda de fim de run da Fenda **deixa de existir** (vira Insígnia). **[DECIDIDO]** |
| 7 | **11 moedas propostas** | W01–W08 propuseram 11 carteiras diferentes | **Resolvido (W09 §5):** **3 carteiras** — Ouro, Insígnia, Selo de Forja — + Vigor (tempo) + Ecos (escopo de run). Coleção vira **contador**, não carteira. **[DECIDIDO]** |
| 8 | **Bestiary dá poder ou é enciclopédia** | W01 R6 e W03 §7 querem charms alocáveis (poder); C01 §11.3 recomenda "compêndio, não grinder de pontos" | **Resolvido:** o Códex dá poder **modesto e de conta** (Sigilos por família + marcos), e o crédito é **por run concluída**, nunca por kill. Isso remove a parte "grinder" sem remover o valor. **[DECIDIDO]** |
| 9 | **Level sync = multiplicador ou stats reais** | O acervo histórico só tem o *workaround* (multiplicador de dano recebido clampado, imposto por limitação de Lua/C++ do Canary); W04 pede downscale proporcional real | **Resolvido:** modulação **real de stats**. A limitação que gerou o workaround não existe na nova simulação autoral. **Não herdar workarounds de plataforma abandonada.** **[DECIDIDO]** |
| 10 | **Números de Ruptura** | Kaezan: World usava `2.5/3.5/5/6.5×`; Arena Fable re-tunou para `1.8/2.1/2.4/2.8×` e o registro antigo ficou congelado (C03 §B.2 #3) | **Resolvido:** valem os números do Arena Fable (medidos no código, `GameConfig.cs:1075`); vale a **estrutura de fase final** (*Fury Phase*) do Kaezan: World, que o Arena Fable não tem. **[DECIDIDO]** |
| 11 | **Vocações** | GDD histórico usa Warrior/Sentinel/Shaman/Wizard; Arena Fable usa Knight/Mage/Archer; `BASE §7` declara as 5 de Tibia | **Resolvido:** **Knight, Paladin, Sorcerer, Druid, Monk.** Todo kit/maestria/postura elemental construído sobre os modelos antigos é inspiração, não mapeamento. **[DECIDIDO]** |
| 12 | **Cadência de rotação** | W05 pede Fenda quinzenal; W07 pede 2–4 semanas; W08 propõe Ciclo de 4 semanas | **Resolvido:** **uma** cadência — o **Ciclo de 4 semanas** é o contêiner de tudo (passe, loja, rotação de Fenda, modificadores). Nada roda em cadência própria. **[DECIDIDO]** |
| 13 | **A Fenda consome energia** | W05 diz não; W07 prefere cap de runs + "Extração" paga em energia; W09 lista custo 0 | **Resolvido:** a Fenda **não consome Vigor**; é limitada por **3 entradas semanais**. **[DECIDIDO]** |
| 14 | **Migrar por performance** | O enunciado original do C06 assumia problema de performance | **Resolvido (C06 §0): premissa falsa.** O renderer do Arena Fable estava a 22% da régua medida. A migração se justifica por **propriedade de código e alvo de plataforma**, não por FPS. **[DECIDIDO]** |
| 15 | **Companions / Echo Team** | Kaezan: World implementou; Arena Fable chamou de "a feature mais importante" e nunca entregou | **Resolvido: fora de escopo.** Dois projetos, mesma feature no topo da lista, uma entrega — e a que entregou pagou em IA de companion, anti-bodyblock e balanceamento. É sinal de custo, não de valor. **[DECIDIDO]** |
| 16 | **Desktop/Godot ou browser/Phaser** | C06 recomendou Godot+C# porque desktop era requisito e web era non-goal; a direção de produto posterior priorizou alcance por link, mobile futuro e integridade online | **Resolvido:** **Phaser 4 + TypeScript + Vite, browser/PWA first.** Mobile usa Capacitor e desktop usa PWA/wrapper somente após tração. Progressão e economia são autoritativas no servidor. C06 permanece evidência histórica sob premissas superadas. **[DECIDIDO]** |

---

# §1. Visão do jogo em uma página

**Kaezan Huntbound** é um RPG **single-player**, 2D, **top-down e tile-based**, feito em **Phaser 4
+ TypeScript** para **browser/PWA primeiro**, com o feeling de movimentação e combate de Tibia — e
sem o grind de Tibia.

> **Um Tibia para quem gosta de Tibia, mas não tem tempo para grind infinito.**

O jogador escolhe uma vocação, entra em **dungeons instanciadas curtas** que reinterpretam as hunts
clássicas (rotworms, minotauros, ciclopes, dragões), mata, loota, evolui, e sai. Um **helper**
executa a repetição do combate; o jogador decide **o que jogar, com que build, com que risco e onde
gastar recursos**. Um medidor de **Vigor de Caça** garante que 20 minutos por dia entregam
progresso real e que 10 horas por dia **não entregam mais poder** — só mais conteúdo.

A progressão acontece em três camadas que se alimentam: o **dia** entrega materiais e degraus
pequenos; a **semana** entrega bosses, desafios sincronizados e o pico de dificuldade; os **meses**
entregam uma conta cada vez mais forte — coleção, marcos permanentes, múltiplas vocações, builds
alternativas.

O jogo não tem mundo aberto, PvP, guildas, chat, economia entre jogadores nem gacha de personagem.
Não usa servidor de simulação contínua como um MMO, mas possui backend autoritativo para conta,
runs, inventário, moedas e recompensas. Não tem centenas de spells, milhares de itens, nem
penalidade de morte que apaga progresso. **Não estamos construindo Tibia inteiro — estamos extraindo
o que é divertido em Tibia e encaixando numa estrutura curta, automatizável e orientada à
construção de conta.**

O critério de sucesso da direção: *seis meses depois, um jogador de nível máximo escolhe
voluntariamente entrar numa dungeon T1 sincronizada num dia em que tem tempo — e não se sente burro
por isso.*

---

# §2. Pilares

Sete. Se uma feature briga com um pilar, o pilar ganha.

### P1 — O feeling de Tibia é inegociável **[DECIDIDO]**
Movimento em grade com passo quantizado, câmera colada no personagem sem suavização, targeting,
loot, nameplate compacta, números de dano que se fundem. Os 24 comportamentos concretos do
C02 §12 são a especificação — é o insumo mais acionável de todo o acervo.

### P2 — O helper executa repetição; o jogador toma decisões **[DECIDIDO]**
O helper é pilar de design, não acessibilidade. **Nunca é desligado, nerfado ou penalizado** — em
nenhum conteúdo, em nenhuma dificuldade. Consequência dura: **100% da dificuldade tem que morar
fora da execução** (build, rota, economia, preparação, configuração do próprio helper).

### P3 — Energia limita recompensa, nunca acesso **[DECIDIDO]**
Jogar é sempre livre. **Progredir** tem teto diário. Teste de sanidade (W06 §8): *um helper rodando
24h dá quanto poder a mais que uma sessão de 20 minutos?* **A resposta tem que ser zero.**

### P4 — Toda run paga alguma coisa; nenhuma run devolve zero **[DECIDIDO]**
Quando um teto é atingido, o crédito **cai para 20%**, nunca para zero. Zerar ensina o jogador a
fechar o jogo.

### P5 — Progressão é da conta, não só do personagem **[DECIDIDO]**
15–20% do poder mora na conta e se aplica a todos os personagens. É o que faz "6 meses jogando"
significar algo e a segunda vocação nascer forte.

### P6 — RNG decide *quando*, nunca *se* **[DECIDIDO]**
Todo sistema aleatório tem pior caso **finito, definido e publicado na UI**. Aleatoriedade só onde
há muitas amostras (substats); onde a amostra é pequena (drop de boss semanal), determinismo.

### P7 — Variedade vem de modificadores e camadas, não de metros quadrados **[DECIDIDO]**
Não temos orçamento para a solução do Tibia (mais mapa). Nossa variedade vem de mutators, camadas
paralelas de motivo (Códex, tarefas, materiais) e recombinação — ~80% do conteúdo "novo" tem que
ser **dados**, não código.

---

# §3. Non-goals

**Não construímos, nesta direção, em nenhum milestone previsto:**

| Não-goal | Por quê |
|---|---|
| **Multiplayer, PvP, guildas, chat, party, economia entre jogadores** | `BASE §3`. E é o maior corte de complexidade da migração (C06 §2.1) |
| **Gacha de personagem, roster, skins, Echo Team / companions** | `BASE §3`; §0 #15 |
| **Monetização** | `BASE §5` |
| **Mundo aberto** | Dungeons instanciadas por construção |
| **Clientes nativos simultâneos no MVP** | Browser/PWA é o único alvo inicial. Mobile via Capacitor e desktop via wrapper entram apenas após evidência de demanda |
| **Painel admin completo** | Conteúdo nasce em arquivos tipados e ferramentas focadas; não reconstruir as ~4.900 linhas do admin anterior |
| **Importar/converter mapas OTBM** | C04 §8A. O custo não é ler o formato, é reimplementar o renderer do Tibia e depender de assets proprietários |
| **Minigames descartáveis e eventos flagship com área própria** | W08 §9. Custo 10× e 20× com reaproveitamento zero |
| **Penalidade de morte que apaga progresso (perda de XP/equipamento, blessings)** | W01 §13. Sem mundo persistente, é só punição |
| **Imbuements com duração em horas de relógio, ou qualquer manutenção com timer** | W01 R12. Manutenção é veneno para sessão de 20 minutos |
| **Cooldowns de relógio como gargalo primário** | W03 A2. Gargalo tem que produzir **escolha**, não **espera** |
| **Escala de coleção do Tibia** (1,25M kills) | W03 W1 |
| **Dezenas de spells por classe, centenas de itens quase idênticos** | `GUIA §3` |
| **Cards de modo "aspiracionais"** (Arena, Boss Rush, Endless, Squad Raid) | C03 §D.10. No Arena Fable ocupavam 60% da tela de modos sem entregar nada |
| **Forja/craft antes de o recurso ter sumidouro** | C03 §C.4 #6. Não introduza o recurso antes do sumidouro |
| **Scripting/DSL para o helper (nível N5)** | W10 §1. O meta migraria para "baixe o script certo" — fatal num jogo cujo pilar é o helper |
| **Ranking, leaderboard, comparação social** | Single-player. Substituído por marcos pessoais |
| **Streak de login, moeda de evento que expira, passe que perde recompensa não coletada** | W08 §6.4. FOMO num jogo sem monetização é custo puro |

---

# §4. Core loop

**[DECIDIDO]** O loop atômico do jogo é a **run de dungeon**, e ela tem quatro tempos:

```
   [HUB]  decidir            →  [ENTRADA] comprometer  →  [RUN] executar  →  [HUB] investir
   alvo do dia               custo em Vigor              helper combate     gastar recursos
   o que falta no Códex      modo Livre/Sincronizado     jogador intervém   subir degraus
   qual material                                          3–6 vezes          ver o próximo marco
   qual Sigilo levar         preview do que ela vale
```

**A regra que define tudo:** *tudo que decide o resultado da run está decidido antes ou entre os
combates. O combate é a verificação, não a decisão.* (W07 §9)

**Onde mora a decisão humana** — em ordem de peso:

1. **Preparação** — build, gear, runas, Sigilo, consumíveis, preset do helper.
2. **Escolha de conteúdo** — qual dungeon, qual modo, qual dificuldade, qual risco.
3. **Intervenção pontual** — 3–6 momentos por boss em que o jogador assume o controle (W11 §1.1 T3).
4. **Investimento pós-run** — em que degrau gastar a renda do dia.

**Onde a decisão humana explicitamente NÃO mora:** rotação de skills, timing de poção, escolha de
alvo, esquiva de telegraph com margem folgada. O helper faz isso melhor, e cobrar dificuldade aí
produz mecânica trivial para quem usa helper ou impossível para quem não usa (W11 §5.1).

**Uma kill alimenta pelo menos três contadores** (W01 R5): experiência, loot e progresso invisível.
É a implementação mais barata e de maior retorno de todo o acervo.

---

# §5. Daily loop

**Alvo: 15–20 minutos.** **[HIPÓTESE]** — é a métrica M10 e precisa de instrumentação.

| Etapa | Tempo | Conteúdo |
|---|---|---|
| 1. Hub — ler o dia | ~1 min | Alvo do dia, tarefas ativas, o que está mais perto de fechar |
| 2. Diárias | ~5 min | **3 tarefas de uma lista rotativa de 6** |
| 3. Gastar Vigor | ~10 min | 4–6 runs, com **fila de runs** e **clear instantâneo** em conteúdo dominado |
| 4. Investir | ~2 min | Subir degraus, ajustar Sigilo, ver o próximo marco |

### Regras do diário **[DECIDIDO]**

- **Sempre mais tarefas do que o necessário** (3 de 6). Escolher elimina a sensação de checklist.
- **Tarefas dizem *onde ir*, nunca *como jogar*.** "Complete 1 dungeon" ✅ / "use 5 dashes" ❌ — a
  segunda luta contra o helper e contra o pilar P2.
- **Nenhum dia de rotina normal termina sem fechar pelo menos um degrau** (W09 P1). Isso é
  restrição de calibragem: os custos dos degraus baratos são derivados da renda diária, não o
  contrário.
- **A diária nunca obriga o Modo Sincronizado** (`GUIA §8`).
- **Perder um dia não é catastrófico:** o Bônus de Descanso compensa (§15).
- **Fila de runs, clear instantâneo e run ×2 por custo ×2 entram desde o MVP.** É a maior alavanca
  de "minutos por dia" que existe (W06 §2.8) e é coerente com P2: o helper deve **encurtar** a
  sessão, não estendê-la.

**Alvo de composição do gasto de Vigor** **[HIPÓTESE]**: 1 câmara de equipamento (60), 1 boss de
campo (60), 2 dungeons de skill/runa (80), 2 de recursos (40). Depois do personagem funcional, o
jogador realoca sozinho — o gargalo migra de "ter peça" para "melhorar peça".

---

# §6. Weekly loop

**Alvo: 45–60 minutos adicionais**, distribuíveis em qualquer dia. **[HIPÓTESE]**

| Conteúdo | Cadência | Custo | Tempo |
|---|---|---|---|
| **Boss semanal** | 3 clears/semana | 60 Vigor cada | ~10 min |
| **Fenda** | 3 entradas/semana | 0 | ~20–25 min |
| **Dungeon sincronizada** | 1–2 por semana (semanal incentiva) | Vigor normal | ~10 min |
| **Pacote de tarefas semanais** | reset semanal | 0 | diluído |

### Regras do semanal **[DECIDIDO]**

- **Tetos bancáveis por 3 semanas.** Quem sumiu duas semanas volta e faz 9 clears de boss, não
  perde 6. A mensagem é "você pode voltar", nunca "você perdeu".
- **Reset em dia fixo**, mas nenhuma recompensa expira dentro do Ciclo.
- **Nunca dois resets grandes na mesma semana.** O erro do HSR (DU semanal + 4 modos de endgame
  rotativos) transforma endgame em lição de casa (W07 §6).
- **Recompensa por progresso parcial**, não só por clear total: chegar à camada 2 de 3 paga.
- **O semanal é onde o sync é incentivado** — nunca onde ele é obrigado.

**A cadência de compromisso é semanal; a cadência de produção é o Ciclo de 4 semanas.** São coisas
diferentes e não devem ser confundidas.

---

# §7. Long-term loop

**Alvo: 3–4 meses até ~95% do poder.** Depois disso, largura, não altura. **[HIPÓTESE]**

| Marco | O que o jogador tem | O que ele sente |
|---|---|---|
| **Dia 7–10** | Personagem **funcional**: limpa 100% do diário e ~80% do semanal | "Consigo fazer tudo que aparece hoje" |
| **Semana 3** | Refino em andamento, primeiros marcos de Códex, 1º Sigilo | "Estou escolhendo em que investir" |
| **Semana 4–6** | **Confortável (~85%)**: endgame acessível | "O endgame virou rotina, não parede" |
| **Mês 2** | 2ª vocação funcional em 3–5 dias | "A conta carrega o personagem novo" |
| **Mês 3–4** | **~95%**, Códex avançado | "Estou otimizando, não construindo" |
| **Mês 6+** | Múltiplas vocações, coleção, builds alternativas | "Meu progresso agora é largura" |

**As quatro razões de continuar** **[DECIDIDO]**:

1. **Construir a conta** — a camada permanente (15–20% do poder) que melhora tudo retroativamente.
2. **Completar o Códex** — finito, datado e **comemorável** (8–12 semanas). Um jogo cuja coleção
   nunca termina só tem jogadores cansados (W03 P3).
3. **Evoluir outras vocações** — barato por design, e é o que dá vida útil ao conteúdo já vencido.
4. **Subir dificuldade** — Pressão da Fenda, Selos de dungeon, marcos pessoais.

**BiS literal nunca é prometido.** Os últimos 5% são assíntota deliberada; o delta 95%→100% vale
menos de 5% de poder (W09 §0).

---

# §8. Classes iniciais

**[DECIDIDO]** Cinco vocações, referência direta de Tibia: **Knight, Paladin, Sorcerer, Druid,
Monk**.

**[DECIDIDO]** Estrutura fixa e igual para todas: **5 ações + 1 dash + 1 postura = 7 inputs**, dos
quais 2 são sistemas compartilhados. Isso fica dentro da hipótese de 4–6 ações do `BASE §7` e —
achado importante do W02 — **é aproximadamente o que Tibia já é na prática**, uma vez removido o
entulho histórico. Não estamos simplificando Tibia; estamos formalizando o que ele faz.

| Classe | Recurso | Alcance | Spam | Burst | Diferencial preservado | Diferencial reinventado |
|---|---|---|---|---|---|---|
| **Knight** | Cooldowns + poções | 1 tile | AoE ao redor de si | Execução single | AoE centrado no próprio corpo + taunt | Payoff de tanking em single-player |
| **Paladin** | Munição | 4–7 | Projétil | Marca que detona | Dano vem do ataque automático **em movimento** | Marca (Divine Grenade) como pilar, não topo de progressão |
| **Sorcerer** | Mana | 3–8 | Onda (cone) | Cataclismo | Geometria de AoE + mana como vida | **Elemento é build, não 15 spells** |
| **Druid** | Mana | 3–8 | Vendaval | Inverno | Gelo/terra + runas | **Controle** substitui cura de party |
| **Monk** | Harmonia 0–5 | 1 (+dash 7) | Builder | Spender + Foco | Builder/spender exponencial, cura acoplada ao ciclo | Estado "Sereno" com gatilho de combate, não de party |

### Decisões de classe

- **[DECIDIDO] O Monk é o modelo, não a exceção.** É a única vocação de Tibia desenhada depois de
  28 anos de aprendizado: kit pequeno, recurso próprio visível, builder/spender, cura acoplada,
  posturas explícitas. As outras quatro devem ser lidas *através* dele.
- **[DECIDIDO] O Druid ganha um pilar mecânico próprio: controle de movimento** (raiz, lentidão,
  terreno). Em single-player "curar aliados" vale zero, e sem isso Sorcerer e Druid viram skins um
  do outro — o risco mais alto do W02 §9.1.
- **[DECIDIDO] "Sereno" do Monk é reinterpretado.** No Canary, o Monk perde Serene apenas em party
  lotada; em single-player estaria **permanentemente** no modo forte. Novo gatilho: perde ao tomar
  dano pesado ou ao ficar cercado; recupera após alguns segundos sem ser atingido.
- **[DECIDIDO] Postura = par ofensivo/defensivo por classe** (Monk tem três). Toda postura tem
  **um ganho e uma perda explícitos** — postura sem downside é buff, não postura. Trocar custa
  (cooldown curto ou ramp-up), senão vira micro de combate. **A postura modifica as ações
  existentes; nunca adiciona ações novas** — é isso que mantém o kit em 5.
  *(Nota: o Arena Fable usava stance elemental. Descartado: o elemento vira escolha de build.)*
- **[DECIDIDO] Progressão de kit por graus, não por quantidade.** Cada uma das 5 ações tem 3 graus
  (Regular / Aprimorado / Máximo) — modelo *spell grades* da Wheel of Destiny. 5 ações × 3 graus dá
  progressão longa sem inflação de botões. **Não copiar a Wheel** (milhares de pontos, dezenas de
  fatias, gems): é conteúdo de endgame de um MMO de 28 anos.
- **[HIPÓTESE] Runas são universais**, consumíveis com cargas, preparadas fora do combate, em 4
  categorias que sobrevivem: AoE no alvo, nuke single, cura instantânea, controle/bloqueio. **Risco
  conhecido (W02 §9.6):** runa forte universal apaga a identidade de AoE das classes. Mitigação: a
  eficácia escala com um atributo em que as classes diferem, **e** usar runa **gera 1 carga de
  Harmonia** no Monk (senão a runa compete com o ciclo dele).
- **[DECIDIDO] Garantir caminho viável para as 5 classes em todas as faixas.** Tibia falha nisso
  historicamente e é frustração pura. Cada faixa precisa de pelo menos uma dungeon confortável para
  cada arquétipo.
- **[PROTÓTIPO] O Knight contra boss.** Ele é bom em pack e ruim em alvo único — isso não é bug, é
  a razão de Paladin e Monk existirem. Se o jogo for majoritariamente boss, o Knight fica sem
  função. O payoff dele tem que vir de mitigação e controle, e isso não se resolve em papel.
  *(O Arena Fable mediu exatamente esse buraco: 11–65 mortes de Knight em T3–T5, por spike de
  pacote, e a correção apontada — defesa por papel — nunca foi feita. C03 §C.4 #7.)*

**MVP: uma classe só.** Ver §24.

---

# §9. Combat model

### 9.1 O que é fixo **[DECIDIDO]**

- **Tempo real, tile-based, top-down.** Grid de 32×32 px, viewport ~15×11 tiles.
- **Movimento em passo quantizado.** O personagem só existe em tiles inteiros; o passo tem duração
  fixa e o deslocamento visual é sub-tile (0→32 px). **O arredondamento é o que dá o ritmo** — sem
  ele o andar parece escorregadio (C02 §12.1).
- **A câmera é o personagem.** Zero suavização, zero lookahead, zero damping: posição do tile + o
  mesmo offset sub-tile do sprite. Zoom só em degraus inteiros.
- **Virar não é andar.** Tocar a direção quando parado gira e trava o andar (~100 ms). Segurar anda.
- **Fila de um passo só.** Nada de fila infinita de input.
- **Input aplica imediatamente** (a lição do pre-walk, sem a máquina de estado de rede).
- **Números de dano se fundem** quando ocorrem próximos no tempo e no espaço. Sem isso, hunt vira
  sopa numérica.
- **Um alvo só.** Attack e follow são mutuamente exclusivos; atacar o alvo atual cancela.
- **Duas marcas de alvo com semânticas distintas:** quadrado estático (meu alvo, persiste) e
  quadrado temporizado (evento, ~1000 ms).
- **Separar posição lógica de posição de desenho.** Toda a suavidade visual vive na segunda.

Os defaults de *feel* do OTClient (100/50/50/70 ms, fade de andar 500 ms, square 1000 ms) são o
ponto de partida, copiados literalmente (C02 §13).

### 9.2 Dash **[DECIDIDO]**

- **Dash-posição, não dash-tempo.** Deslocamento instantâneo de 2–3 tiles, com invulnerabilidade
  **apenas durante o trânsito** (~300 ms). A pergunta que o jogador responde é **"para onde?"**,
  não **"quando?"**. Dash com i-frames longos vira "aperte no momento certo" — que o helper resolve
  melhor que qualquer humano.
- **Cargas visíveis e contáveis.** Cooldown ~2500 ms. Números iniciais herdados do Arena Fable,
  que os tunou em bancada dedicada (`GameConfig.cs:154-197`).
- **Riders por classe**, mesma função básica: Knight atravessa e puxa aggro; Paladin recua sem
  quebrar o tiro automático; Sorcerer ganha cast acelerado depois do dash; Druid deixa rastro
  lento; Monk aproxima e gera 1 carga de Harmonia.
- **Dash é MANUAL.** É um dos dois slots por classe fora do alcance do helper. É o que preserva a
  sensação de estar jogando.
- **[PROTÓTIPO] Regras de colisão do dash** (atravessa inimigo? parede? para no primeiro
  obstáculo?) e **[PROTÓTIPO] custo da diagonal** (Tibia usa 3×). Ambos mudam completamente o valor
  da mecânica e **todo o tuning de telegraph**. Decidir **antes** de balancear qualquer boss.
- **[DECIDIDO] Dash não fica no Shift.** Cinco toques em Shift abrem o popup de Teclas de Aderência
  do Windows — lição concreta e barata herdada do Arena Fable.

### 9.3 Ruptura (a barra do inimigo) **[DECIDIDO]**

Híbrido de Sekiro + Honkai: Star Rail, com a fase final do acervo histórico:

1. A barra **enche com pressão** (dano e ações) e **regenera quando não pressionada**. Isso é o
   antídoto do kite infinito: se o jogador configurar o helper para "manter distância e nunca
   arriscar", a barra regenera e **a luta nunca termina**. Pune a estratégia degenerada sem timer
   artificial.
2. A barra tem **afinidade**: certos tipos de dano/ação enchem muito mais. Isso move a dificuldade
   para **build** — o eixo que o helper não resolve.
3. Ao romper: **janela curta de vulnerabilidade** (dano amplificado, boss não age, mecânicas
   suspensas), com multiplicador crescente por ciclo — `1.8 / 2.1 / 2.4 / 2.8×`, ganho 7 por auto e
   16 por skill, fraqueza elemental ×1.7, decay após 3 s de ociosidade.
4. Após o último ciclo, **fase final** com padrão novo.

Isso produz o ritmo que queremos: *pressionar (helper faz) → romper (a build do jogador decide se é
possível) → janela (o jogador decide como gastar) → boss volta diferente*.

**[PROTÓTIPO] O jogador tem barra de ruptura própria?** Seria elegante (tankar tudo passa a ter
teto explícito), mas 2 barras do jogador + 2 do boss = 4 barras em tela pequena com sprites
pequenos. Se entrar, tem que **substituir** outra peça de UI, não somar.

### 9.4 A regra técnica que sustenta tudo **[DECIDIDO]**

> **Toda mecânica do tipo "pare de fazer X" ou "faça Y agora" precisa existir como estado nomeado
> no modelo de dados — nunca apenas como VFX.**

Estados obrigatórios: `refletindo`, `invulneravel`, `absorvendo_cura`, `conjurando_<nome>`,
`rompido`, `enraivecido`, `imune_a_<tipo>`, `nao_atacar`, `zona_perigosa(tile)`.

Sem isso: o helper continua atacando durante reflect e mata o jogador sem que ele entenda o porquê;
é impossível escrever regras legíveis; é impossível dar feedback honesto. **É o requisito de
arquitetura mais importante que sai de toda a pesquisa** e é pré-requisito de várias mecânicas de
boss.

---

# §10. Helper philosophy

### 10.1 A tese **[DECIDIDO]**

> **O helper é a linguagem em que o jogador escreve sua resposta ao conteúdo.**
> O boss não testa os dedos do jogador; testa se ele entendeu o problema e preparou a resposta.

A formulação intuitiva — *"preciso de mecânicas que o helper não consiga resolver"* — está errada e
leva direto a bosses ruins (W11 §1). Um bot com informação perfeita reage melhor que um humano.

**Rejeitamos explicitamente a solução da indústria:** parte da resposta da HoYoverse para "por que
o auto não invalida o endgame" é simplesmente **o auto ser ruim de propósito**. Nosso helper deve
ser **competente**.

### 10.2 Arquitetura: 6 módulos independentes **[DECIDIDO]**

Cada um com estado próprio e **pausável separadamente** — padrão validado por duas décadas de bots
de Tibia, cuja utilidade mais citada é "pausar a navegação mantendo o healing".

| # | Módulo | Default no MVP |
|---|---|---|
| 1 | **Sobrevivência** (cura, poção, escape) | **sempre ligado, não desligável no MVP** |
| 2 | **Alvo** | ligado |
| 3 | **Ações** | ligado |
| 4 | **Movimento** (espaçamento, kite, follow, avoid) | ligado, escopo reduzido |
| 5 | **Loot** | ligado |
| 6 | **Navegação de rota** | **fora do MVP** |

Sobrevivência é especial porque é onde a confiança nasce e morre, e porque é o módulo mais fácil de
acertar (dois thresholds). Navegação fica de fora porque é a fronteira que separa "helper" de
"cavebot".

### 10.3 Complexidade: três camadas **[DECIDIDO]**

| Camada | Quem usa | O que expõe | Meta |
|---|---|---|---|
| **0 — Nada** | todos | preset por classe, já preenchido | **100% limpam a diária sem abrir nada** |
| **1 — Ajuste** | interessado | 3 sliders de intenção + ordem das ações + chips de condição | 40–60% mexem alguma vez |
| **2 — Regras** | otimizador | 3 slots condicionais (até 6 no endgame) | **<25% usam — e isso é sucesso** |

**Contrato de design, testável e vinculante:**

> **Nenhum conteúdo do jogo pode exigir uma regra da Camada 2 para ser vencido.**
> Camada 2 é eficiência (tempo, consumo, consistência), nunca viabilidade.

Nível **N5 (scripting) nunca**: quando a IA é programável de verdade, o meta migra para "baixe o
script certo" e a decisão deixa de ser do jogador. Fatal aqui, onde o helper é o pilar.

### 10.4 As regras de produto **[DECIDIDO]**

- **Input humano sempre vence.** Sem confirmação, sem diálogo, sem penalidade, sem cooldown.
  Precedência: `jogador > Sobrevivência > regras avançadas > prioridade de ações > postura`.
- **Suspensão é por módulo.** Mover-se manualmente **não** pode desligar a cura.
- **A tela começa preenchida, não vazia.** Slots vazios comunicam "você tem trabalho a fazer"; um
  preset preenchido comunica "isto já funciona; mexa se quiser".
- **Sliders de intenção mostram a tradução embaixo, em linguagem de jogo.** "Econômico → poção só
  abaixo de 45% HP". É a correção direta do erro do Dragon's Dogma (postura opaca = frustração).
- **Chips de condição dentro da linha da ação**, não regras separadas. Funde os níveis N3 e N4: o
  jogador ganha 80% do poder de gambits sem nunca montar uma regra.
- **Percentuais são sempre relativos, nunca absolutos** — requisito não-negociável por causa do
  Modo Sincronizado, que muda stats absolutos e quebraria qualquer regra escrita em valores brutos.
- **O helper nunca muda a própria configuração sozinho.** Lição direta das inclinações que mudam
  sozinhas no Dragon's Dogma.
- **Preset salvo por personagem**, copiável e exportável como código curto.
- **A decisão do helper é função pura de (estado, configuração).** Sem aleatoriedade na escolha de
  ação. Se precisar de variação para não parecer robô, que seja em *timing*/animação, nunca em
  *escolha*. Isso dá modelo mental construível, bug reportável e comportamento testável.

### 10.5 A feature de confiança com melhor custo/benefício **[DECIDIDO]**

**Caixa-preta de morte.** Ao morrer, "O que aconteceu?" abre a linha do tempo dos últimos ~5 s,
decisão a decisão, mostrando **inclusive as decisões negativas**:

```
-2.4s  HP 61%  → Golpe Pesado          [cura não disparou: limiar 45%]
-1.2s  HP 38%  → poção de HP           [em recarga 0.8s]
-0.4s  HP 11%  → cura                  [tarde demais]
 0.0s  morte
```

Com um botão "ajustar limiar para 60%" ali mesmo. **A morte deixa de ser arbitrária e vira um
número errado que o jogador pode consertar.** Praticamente nenhuma referência do mercado mostra o
*porquê* de uma decisão — é o espaço vazio onde o Huntbound pode morar.

### 10.6 Riscos assumidos

- **[HIPÓTESE] "Override vira configuração"** — o jogo observa overrides repetidos e *oferece*
  virar regra, no relatório pós-run, no máximo 1 por run, com "não perguntar" permanente. Se
  calibrado mal, vira assistente intrusivo. Candidato a teste no slice, não certeza.
- **[PROTÓTIPO] O helper pode abortar a run para preservar recursos?** Protege o jogador ou tira
  agência? Não se resolve em papel.
- **[DECIDIDO] O risco de "agência dissolvida" não se resolve na UX do helper.** Se o combate
  automatizado for a única coisa que acontece na sessão, nenhuma quantidade de feedback visual
  salva. Resolve-se no design do jogo: energia limitando ganho e decisão concentrada em build,
  rota, dificuldade e gasto.

---

# §11. Dungeon model

### 11.1 Formato canônico **[DECIDIDO]**

> **Uma raça dominante + variantes + uma elite + um boss temático + um bioma reconhecível.**

É literalmente o padrão que o sistema de tasks do Tibia já usa, e é o que a memória do jogador
reconhece. **Nada de dungeons genéricas com mistura de temas.**

```
[Entrada]
 Sala 1 — introdução da raça (densidade baixa)
 Sala 2 — densidade (o "corredor de rotworm": muitos, fracos)
 Sala 3 — variante (arqueiro/caster; força priorização)
 Sala 4 — elite + escolha (rota A: mais risco/mais loot | rota B: seguro)
 Sala 5 — pressão (pack misto; teste real da build)
[Boss] — elite temático da raça
[Recompensa] — loot + Códex + progresso de tarefa
```

| Formato | Salas | Duração | Uso |
|---|---|---|---|
| **Curto** | 3 + boss | 4–6 min | Diária rápida, material específico |
| **Padrão** | 5 + boss | 8–12 min | Conteúdo principal |
| **Longo** | 8–10 + mini-boss + boss | 15–20 min | Semanal, sincronizado |

**A duração cresce pouco entre faixas (4 → 20 min).** É intencional: uma dungeon de fim de jogo
precisa caber numa sessão sozinha.

### 11.2 Dificuldade **[DECIDIDO]**

**Densidade e composição de pack são o eixo primário; HP e dano ficam em segundo plano.** As hunts
que a comunidade de Tibia considera boas em nível alto não são as com monstros mais fortes — são as
com **respawn denso em layout circular**. Numa dungeon instanciada, densidade é uma variável de
design pura. É a nossa maior vantagem estrutural sobre a referência.

**Currículo de inimigos, na ordem do Tibia** (máximo 2 novidades por faixa):
`pack → ranged → caster → condição (veneno) → armor alta → elemento → multi-alvo → invocação →
dreno → swarm`.

### 11.3 O que substitui o risco de morte **[DECIDIDO]**

Em Tibia o risco é **externo ao combate** (perda de XP, de equipamento, de suprimento). Nada disso
existe aqui, e sem substituto a dungeon vira formalidade.

- **Morte não tira progresso da conta.** Nunca. Sem perda de XP, sem perda de item.
- **A recompensa é proporcional ao progresso da run.** Morrer na sala 4 paga as salas 1–3.
- **O Vigor gasto não volta.** É o custo real.
- **Modos de alto risco são opcionais** (Selos), aumentam recompensa e podem remover retentativas.

### 11.4 Dois modos de entrada **[DECIDIDO]**

- **Livre** — entra com todo o poder. Diária rápida, farm de material antigo, coleção, Códex.
- **Sincronizado** — modulado para a faixa. Desafio, raridade máxima, materiais exclusivos.

**O custo em Vigor é o mesmo nos dois modos.** O que muda é o retorno. Isso é o que torna o sync a
jogada *eficiente* sem torná-lo obrigatório — e é a maneira mais direta de honrar a promessa do
pitch.

### 11.5 Anti-repetição, em ordem de custo/benefício **[DECIDIDO]**

| Prioridade | Alavanca | Custo |
|---|---|---|
| **MVP** | Múltiplos contadores por kill (≥3) | Muito baixo |
| **MVP** | Rotação diária de destaque (dungeon/família em foco, com bônus) | Baixo |
| **MVP** | Objetivo de contagem que libera variante de boss | Baixo |
| Depois | Sigilos alocáveis por família | Médio |
| Depois | **Mutators/Selos por dungeon** — nossa maior oportunidade real | Médio |
| Depois | Relevância retroativa (sync + coleções por faixa) | Médio |
| Tarde | 2–3 layouts sorteáveis por dungeon | Alto |
| Tarde | Escolha dentro da run (rotas, cartas) — vem da Fenda | Alto |

**Orçamento de conteúdo do primeiro ciclo:** 10–15 dungeons (2–3 por faixa), 1 layout cada no
início. **[DECIDIDO]**

### 11.6 Geração de espaço **[HIPÓTESE]**

O Arena Fable resolveu "quadradão eroído" com mapgen v2 (lóbulos elípticos, pilares, pockets,
anfiteatro) + **validador fail-fast** que aborta a run com mensagem clara se algo sair injogável.
Cada peça tem função: pilares são cover que a IA orbita; pockets são risco/recompensa; anfiteatro é
palco de boss. **O algoritmo é puro e porta direto.**

A **orquestração de waves por budget** vem do acervo histórico:
`baseBudget × (1 + growth × (w−1)) × tier`, pool com custo/peso/minWave, última wave = boss. Os dois
lados são complementares — espaço do Arena Fable, sessão do Kaezan: World (C05 §6.1).

**O validador entra desde o dia 1.** É rede de segurança barata e de altíssimo valor.

---

# §12. Level / gear sync

### 12.1 A lição central **[DECIDIDO]**

> **O sync só é jogado quando existe recompensa que só existe sincronizada.**

É a diferença entre WAKFU (onde modular é "uma parte enorme do jogo") e Guild Wars 2 (onde o
downscale é bem feito e o conteúdo antigo continua vazio, porque as recompensas não escalam). Sync
sem exclusividade é decoração.

**E a segunda lição:** a maior reclamação histórica do WAKFU não é o conceito, é o **atrito de
operação** — 13 faixas contra 3 páginas grátis de equipamento, inventário para guardar 13 sets,
build automática pior que um set barato montado à mão. **Em single-player, praticamente todo esse
custo é gratuito de eliminar. É a nossa maior vantagem competitiva sobre a referência.**

### 12.2 O desenho **[DECIDIDO]**

- **5 faixas**, teto 20/40/60/80/100. Sync sempre para o **teto da faixa da dungeon**.
  Regra geral: `nº de faixas ≈ 5`, `largura = cap / 5`. Se o cap subir numa expansão, a largura
  aumenta — **nunca o número de faixas**. O custo do sistema é linear no número de faixas e o valor
  é decrescente.
- **Stats: downscale proporcional** aplicado ao **total efetivo** (base + equipamento + runas).
  Mantém a *forma* da build e reescala as magnitudes. Preserva identidade e tem setup zero.
- **Gear: downscale do item no lugar.** O item continua equipado; nome, arte, afixos e efeito único
  preservados; magnitudes recalculadas. O jogador não precisa guardar nada.
- **Habilidades filtradas por nível de desbloqueio explícito**, nunca por ordem de slot, e **nunca
  cortadas em silêncio**.
- **Atrito zero de preparação.** Loadouts ilimitados e gratuitos, guarda-roupa fora do inventário,
  um clique na porta. Se o jogador precisar se preparar por 10 minutos, o sistema morreu.
- **Tela de preview na porta**, respondendo três perguntas e nada mais: *como eu fico*, *quão
  difícil fica*, *o que eu levo*. Se a tela não couber nisso, o sistema está grande demais.
- **Sync é uma *view* de combate calculada sobre o personagem real, nunca uma mutação persistida.**
  Os bugs de "preso no nível 20" do WAKFU vieram exatamente de tratar isso como mutação.
- **Nunca obrigatório fora do seu próprio loop.** Nenhuma quest, nenhum gate de progressão
  principal exige sync.

### 12.3 Recompensa, em dois eixos **[HIPÓTESE]**

- **Modo controla raridade máxima.** Livre: até Raro. Sincronizado: Épico, Lendário e materiais
  exclusivos.
- **Nível real controla XP:** `XP = XP_base_da_faixa × min(nível_real / nível_sync, 3)`. É o
  benefício que a comunidade do WAKFU mais elogia — você entra fraco, mas **ganha como quem você
  é**. O teto de 3× é nosso, para evitar a espiral de farm que a Ankama teve que estancar.
- **Mitigação do exploit de fronteira:** os exclusivos de uma faixa exigem estar **acima** dela.

### 12.4 A decisão mais cara de reverter **[DECIDIDO — decidir agora, entregar depois]**

> **Itens são autorados como `(template + nível)`, com stats derivados de fórmula — nunca como
> linhas fixas de tabela.**

Sem isso, o sync de equipamento vira retrabalho manual em centenas de itens. O contra-argumento do
fórum do WAKFU (*"os devs teriam que passar por cada objeto"*) só vale para quem não desenhou assim
desde o começo. **Nós ainda podemos — e é por isso que essa decisão vale hoje, mesmo com o sync
entregando depois do MVP.**

### 12.5 O que não copiar

13+ faixas · loadouts limitados ou pagos · build automática genérica que ignora a intenção do
jogador · deck cortado por ordem de slot · 50 degraus de dificuldade · dificuldade construída sobre
inflação de HP · pré-requisito "limpe em N para liberar N+1" · sync obrigatório em quest de história
· moeda separada por faixa · sync persistido no personagem · chaves para entrar.

---

# §13. Boss model

### 13.1 Onde a dificuldade mora **[DECIDIDO]**

| Tier | Pressão | O que o jogador faz | Alvo de composição |
|---|---|---|---|
| **T1** | **Configuração** | ajusta preset antes da luta | ~60% |
| **T2** | **Preparação** | build, gear, resistência, runa, consumível | ~25% |
| **T3** | **Intervenção** | assume o controle em 3–6 momentos | ~15% |
| **T4** | **Execução contínua** | reação frame a frame por minutos | **0% — antipadrão** |

Métrica de sucesso derivada: **se o jogador vence 100% da luta sem tocar em nada, o boss falhou no
T3. Se ele precisa tocar o tempo todo, falhou no T4.**

### 13.2 Núcleo de padrões a construir **[DECIDIDO]**

Doze primitivas cobrem praticamente qualquer boss que vamos querer:

`A1 área fixa` · `A3 linha/beam` · `A2 cone/wave` · `A4 donut` · `B1 campo persistente` ·
`C8 ciclo fixo` · `C4 ruptura com regeneração` · `C5 ruptura condicional` ·
`D1/D2 prioridade e proibição de alvo` · `E5 objeto interativo` · `F1 fase por HP` ·
`G2 pressão sobre o dash`.

**Composição é o produto, não o padrão isolado.** 6 camadas × ~4 opções ≈ centenas de combinações
estruturalmente distintas, das quais talvez 30 sejam boas — suficiente para um jogo inteiro.

**Destaques:** o **donut** e a **proximidade** são os padrões mais valiosos porque invertem o
instinto de fuga e quebram helpers mal configurados. **Objeto interativo** é o gerador mais barato
de intervenção humana ("vá até aquele tile e aperte"). **Pressão econômica** (dreno de dash, de
cura, de recurso) torna a preparação obrigatória **sem inventar mecânica nova**.

### 13.3 Regras duras **[DECIDIDO]**

- **Janela de telegraph é função de distância, não de drama:**
  `tiles × tempo_por_tile + 0,40 s de reconhecimento + 0,15 s de folga`.
  Abaixo disso o padrão não é difícil, é **injusto** — e o helper passa enquanto o humano morre.
- **Nenhum telegraph exige precisão de 1 tile em fase inicial.** Áreas seguras de ≥2 tiles.
- **Nunca introduzir um padrão novo em cima de outro padrão novo.**
- **Cada transição de fase adiciona no máximo um padrão e, de preferência, remove um.**
- **HP/dano é o dial mais fraco.** Escalar por: combinar padrões conhecidos → encurtar janelas →
  adicionar modificadores → velocidade → múltiplos inimigos.
- **Mais VFX / telegraph menor: proibido.** É o caso Diablo IV — o telegraph existe mas é invisível.
- **Toda mecânica que pune uma ação que o helper toma por padrão** (reflect, alvo proibido, cura ao
  tomar dano, on-death hazard) **só pode existir com os três**: estado nomeado, telegraph, e uma
  regra de helper capaz de responder. Sem os três, é bug de design, não dificuldade.
- **Soft enrage, nunca enrage duro.** Enrage duro sintonizado escolhe um público e exclui o outro.
- **Interrupt só como recurso escasso** (1–2 cargas por fase). Um bot nunca perde um kick.
- **Sem mecânicas anti-bot.** Punir automação num jogo cujo pilar é automação é uma contradição que
  o jogador percebe imediatamente.

### 13.4 Linguagem visual, fechada e jamais reutilizada **[DECIDIDO]**

| Cor / forma | Significado |
|---|---|
| **Vermelho** (preenchimento no chão) | dano evitável **por posição** |
| **Laranja/âmbar** (contorno pulsante) | exige ação **não-posicional** |
| **Ciano** | zona segura ou benéfica |
| **Roxo** (ícone sobre a unidade) | **não ataque este alvo** |
| **Branco/pontilhado** | pré-aviso |

Regras de renderização inegociáveis: decals acima do chão e **abaixo** das unidades; **VFX de skill
do jogador nunca usa a faixa cromática do perigo**; áudio dedicado por família de padrão (em telas
densas o som é o canal que não satura); contraste garantido **em cima dos tiles do bioma**, não só
em fundo neutro; redução de efeitos disponível cedo.

### 13.5 O contrato **[DECIDIDO]**

1. Toda morte tem uma frase de uma linha que a explique.
2. Essa frase nunca é "eu não vi".
3. Se a frase for "o helper fez algo que eu não mandei", **é bug de design**.

### 13.6 Bosses baratos

Nove bosses projetados, ~5 assets novos no total. O custo real está nos **sistemas**, não na arte.
Destaques: **O Metrônomo** (boss-professor, ensina a linguagem visual inteira, 3 telegraphs); **A
Vigília** (usa o kit e o sprite da classe do jogador — custo de arte **zero**); **O Relojoeiro**
(nenhum ataque novo, só dreno de dash e recurso: prova que pressionar economia é conteúdo).

### 13.7 Categorias e acesso **[DECIDIDO]**

- **Chefe de dungeon** — fim de run normal, sem custo extra, repetível.
- **Boss semanal** — 3 clears/semana, 60 Vigor cada, **bancável por 3 semanas**.
- **Boss raro em run** — chance baixa de substituir um encontro. Alta surpresa, custo de UI zero.
- **Alvo do dia** — 1 boss destacado por dia, crédito ×3, e **a tentativa do dia não consome o
  orçamento semanal**. Destaque sem acessibilidade é frustração pura — é o detalhe pequeno de maior
  consequência do Bosstiary.
- **Piso garantido:** todo boss dropa **Fragmentos** de forma garantida, que compram os itens
  assinatura numa loja. O drop aleatório continua existindo e continua sendo o momento bom.
  **Variance vira tempero; determinismo vira o piso.** É a diferença entre "o jogo respeitou meu
  tempo" e "joguei 3 semanas para nada".
- **Sem cooldown de relógio.** Orçamento produz escolha; cooldown produz espera.

---

# §14. Rift / Endgame

### 14.1 Escolha de formato **[DECIDIDO]**

Quatro formatos foram avaliados (Fenda Longa, Fenda Curta, Torre Sincronizada, Caçada de
Eficiência). **A Fenda Curta é a escolha**: é o único que produz decisão humana densa **com o helper
ligado** — que é literalmente o problema que o endgame tinha que resolver — e seu conteúdo novo é
majoritariamente **dados**.

Ordem de construção: **Fenda Curta** → Caçada de Eficiência (barata, recicla o Registro de Caça
inteiro) → Torre Sincronizada (evolução natural do trabalho de sync) → Fenda Longa **apenas se** a
Curta demonstrar retenção real.

### 14.2 A Fenda **[HIPÓTESE]**

- **12–18 min** (alvo 15), **3 camadas × 6 nós**, relógio real (não turnos).
- **Compromisso declarado cedo:** escolher um Selo entre 3 no início, que enviesa os drafts e
  desbloqueia ressonância ao acumular. Transforma draft aleatório em construção.
- **Três camadas de decisão:** *Vestígios* (conta, permanente) → *Cartas* (run) → *Estilhaços*
  (encontro).
- **A mecânica-assinatura, preservada literal do WAKFU:** dois Estilhaços caem; você pisa em um;
  **o outro é absorvido pela Fenda** e aplica o efeito espelhado a todos os inimigos até o fim da
  run. Uma única regra gera decisão, tensão e escalada emergente — e é decisão **humana** mesmo com
  o helper ativo.
- **Recompensa bancada por camada.** Corrige explicitamente o pior defeito do WAKFU (wipe antes do
  turno 40 = zero). Perder 18 minutos de run automatizada e receber nada é inaceitável num jogo cuja
  premissa é "não tenho tempo".
- **Aposta opcional:** ao fim de cada camada, não bancar dobra aquela camada. Push-your-luck vira
  **decisão explícita**, não default punitivo.
- **Loja obrigatória antes do boss.** É o único lugar onde o jogador converte azar em plano.
- **Orbes de vida** ao matar (perecíveis, ~6 s): sustentação vira problema de **posicionamento**,
  não de composição. Trivial em tempo real, ótimo com helper.
- **Cartas mudam política, não números.** Critério de aceitação: *precisa ser configurável no
  perfil do helper*. Se exige reação humana, não entra.
- **Transparência total:** tabela de recompensa por camada e por Pressão **na tela de entrada**, e
  pity visível. Não repetir a situação do WAKFU, onde quatro anos depois a comunidade ainda não
  conhecia as drop rates do modo.
- **3 entradas/semana + Fenda de Treino ilimitada sem recompensa.** O Treino é o pressure-release
  que impede que as restrições pareçam punição.

### 14.3 Regra de ouro do endgame **[DECIDIDO]**

> **Score sensível a build, insensível a execução.**
> Teste: *se dois jogadores com o mesmo helper e a mesma build tiram scores muito diferentes, o
> score está medindo a coisa errada.*

Isso descarta score por velocidade de clear e qualquer métrica de APM/timing.

**Dificuldade por restrição, nunca por HP:** tempo, recursos gastos, mortes permitidas, level/gear
sync, número de vocações exigidas. **Restrição de roster/vocação é a alavanca anti-automação mais
forte e mais barata que existe** — nenhum helper resolve uma conta estreita — e reforça o pilar de
construção de conta.

**Rotacione a gramática, não só os inimigos.** Uma regra sazonal nova custa um arquivo de dados e
renova o modo inteiro. Isso, e não a dificuldade, é o que mantém o modo pensado.

**Depois de dominar, deixe pular.** Build salva + ir direto ao boss para farm. A repetição é
justamente o que o helper deveria matar.

### 14.4 Risco principal **[PESQUISA]**

**Solver.** Com helper determinístico e sigilos públicos, a comunidade converge para uma build ótima
e a Fenda vira script. Mitigações conhecidas: rotação de modificadores, oferta aleatória, restrição
de roster, e sigilos **com desvantagem**. *A última é uma decisão de produto ainda aberta.*

---

# §15. Progression / Economy

### 15.1 Os três invariantes **[DECIDIDO]**

1. **A renda diária de 20 minutos fecha pelo menos um degrau visível, todo dia.** Se o menor degrau
   custar mais que a renda diária, existem dias vazios — e dias vazios matam rotina curta.
2. **A banda de poder do funcional ao quase-BiS é de ~40%, não de 300%** (`×1,35–1,45`). É a
   decisão mais importante da economia: compra troca de classe viável, conteúdo antigo relevante,
   catch-up possível e azar que custa semanas em vez de meses.
3. **15–20% do poder mora na conta.**

**Contrapartida obrigatória de (2):** se o eixo vertical é curto, **o eixo horizontal precisa ser
largo** — sets que mudam comportamento, builds alternativas, sinergia com Sigilos. Se o gear só der
número, a perseguição esvazia. É o risco R1 da economia.

### 15.2 Vigor de Caça **[HIPÓTESE]**

| Parâmetro | Valor |
|---|---|
| Cap ativo | **240** (1 a cada 6 min = 240/dia) |
| Reserva ("Vigor Estagnado") | **1440** (6 dias), meia-taxa |
| **Saque diário da reserva** | **máx. 240/dia** |
| Recarga paga | **nenhuma** |

O limite de saque é a peça que nem HSR nem WuWa têm e que resolve o problema limpo: **o buffer
existe para não perder progresso, não para permitir maratona.** Um jogador que sumiu 5 dias volta e
faz uma sessão boa — não uma sessão de 3 horas.

**Custos:** 20 (recursos) · 40 (skill/runa) · 60 (equipamento) · 60 (boss de campo) · 60 (boss
semanal, 3/semana).

**A regra estrutural mais importante da economia inteira** **[DECIDIDO]**:

> **Gear só sai de conteúdo com custo de energia. Sem exceção.**

Foi o erro do WuWa (Echos fora da energia reabriram o grind infinito). Com helper automatizado, é
exatamente o vetor que o projeto existe para fechar.

**Corolário:** mundo/hunt livre dropa consumíveis e vendáveis, alimenta o Códex e é diversão —
**nunca paga poder**.

### 15.3 Moedas **[DECIDIDO]**

**3 carteiras.** `Ouro` (abundante, nunca bloqueia degrau pequeno) · `Insígnia` (denominador comum
de tudo que não é energia) · `Selo de Forja` (renda **capada e independente**, só remove
aleatoriedade — se fosse comprável com Insígnia, o jogador converteria tudo em determinismo e a
camada de RNG colapsaria).

**Contadores não-gastáveis** (número na tela, sem carteira): Pontos de Códex, Pontos de Caça, Nível
de Conta, XP do Passe. *Coleção mede; carteira paga.*

### 15.4 Materiais **[HIPÓTESE]**

**70% universais / 20% de arquétipo / 10% de boss específico.** Nenhum material específico gateia o
limiar **funcional** — só aparecem nas 2 últimas de 6 fases de ascensão e nos 2 últimos de 10 ranks.
**Máximo 3 materiais específicos por personagem** (Genshin exige mais e o resultado é uma matriz que
só se navega com planilha externa). **Nada é lixo:** todo excedente converte, a taxas ruins e com
teto semanal.

### 15.5 Proteção contra RNG **[DECIDIDO]**

Cascata de determinismo: *a run dá peça?* sempre → *qual slot?* jogador, **grátis** → *qual set?*
Selo → *qual atributo principal?* Selo → *quais substats?* **RNG**.

O jogador escolhe quanto da aleatoriedade quer remover e paga por camada — e a camada gratuita já
elimina a parte mais frustrante.

Cinco proteções: piso garantido · pity visível · roll com memória · reroll que nunca piora ·
conversão de duplicata.

**Para todo sistema aleatório, o pior caso é um número publicado na UI.** "Você nunca esperará mais
de 4 clears por este material." Isso não é transparência por virtude — é o que transforma azar em
contagem regressiva. Azar sem número visível é a origem do abandono.

**Métrica que valida a seção inteira:** a diferença de poder entre percentil 10 e percentil 90 de
sorte, com o mesmo tempo jogado por 30 dias, **abaixo de 10%**.

### 15.6 Catch-up **[DECIDIDO]**

**Entre personagens** (o caso principal — temos 5 classes; se a segunda custar como a primeira,
ninguém experimenta a segunda):
equipamento não-arma é **da conta** (um personagem por vez) · camada de conta já pronta · banco
único · EXP ×3 até 90% do recorde · desconto por patamar vencido (−50% / −65%, teto −70%) ·
arquétipo compartilhado · desbloqueios de conta · **teto do conteúdo antigo cai** conforme o nível
de conta sobe · respec e loadout sempre grátis.

**Nunca 100% de desconto.** O alvo é **funcional em 3–5 dias**, não pronto no login: um personagem
que aparece pronto apaga a única coisa que havia para fazer com ele e comunica ao veterano que o
esforço do primeiro foi desperdiçado.

**Para quem parou:** **Bônus de Descanso** — ausência acumula estoque, as primeiras N runs de volta
rendem ×2. Substitui evento de drop dobrado com o mesmo benefício e **zero FOMO** (evento 2× produz
o comportamento tóxico de estocar energia por semanas). Retorno automático a partir de 14 dias, sem
prazo e sem código.

### 15.7 Sumidouros **[DECIDIDO]**

**Desfazer é grátis. 100% de devolução, sempre.** Trocar Sigilo, loadout, preset, respec, desmanche.
A decisão interessante é *no que investir agora*, não *arrependimento*. Cobrar pedágio por
experimentação pune o jogador novo e beneficia quem já sabe a resposta ótima. Se precisarmos de
fricção, ela é **estrutural** (só no hub, ou 1× por reset), **nunca monetária**.

**Sumidouro terminal:** refino de substat, custo crescente, ganho saturando em +5% por peça, **sem
topo**. É o que mantém verdadeiro o invariante #1 mesmo no mês 12 — um dia de rotina sempre fecha
alguma coisa — e absorve o excedente sem inflacionar poder.

*Regra de saúde: se >15% dos jogadores tiverem moeda parada acima de 3× a renda semanal dela, falta
sumidouro — e a correção é adicionar sumidouro, nunca cortar fonte.*

### 15.8 Ciclo, passe e eventos **[HIPÓTESE]**

- **Ciclo de 4 semanas** é o contêiner de tudo. Semana 1 abre e reseta; semana 2 abre a segunda
  metade; semana 3 tem a janela de **Maré** (multiplicador com **cap de resgates**); semana 4 fecha.
- **Trilha do Caçador**: 30 níveis + 15 de cauda, marcos a cada 5, **uma trilha, gratuita**.
  Recompensa-âncora no 30: **um seletor** (escolha 1 entre N), não um item.
- **Três velocidades de missão:** diária, semanal e **sazonal cumulativa**. A terceira é a mais
  importante e a mais esquecida: é o que permite sumir uma semana e ainda terminar o passe.
- **O passe nunca cria trabalho — ele conta o que o jogador já faz.** Se uma missão exige algo que
  ele não faria de qualquer forma, a missão está errada.
- **Uma ação, sete contadores.** As camadas são *views* sobre o mesmo fluxo de eventos, não
  conteúdos separados. É por isso que o custo de produção é baixo.
- **Anti-FOMO, divergindo deliberadamente das referências:** níveis não coletados **não expiram**;
  moeda de evento não existe (eventos pagam em Insígnia, e a escassez fica no **estoque** da loja);
  nada narrativo é temporário; conteúdo de Ciclo passado permanece acessível.
- **Eventos são o pico, não a base.** Teto de 25% da renda do Ciclo — num single-player, quem pula
  o evento não pode ficar para trás.
- **A Maré multiplica o resultado, não o progresso.** Dobra loot e materiais; **não** dobra XP de
  passe nem contagem de missão. Senão vira obrigação de agendar a vida à janela.
- **[DECIDIDO] O gerador de Ciclos funciona com pool + regras de combinação**, produzindo Ciclos
  válidos indefinidamente. Ciclos curados são bônus, não requisito. Se o desenvolvimento parar, o
  jogo não pode apodrecer.

### 15.9 Códex e Registro de Caça **[DECIDIDO]**

- **Crédito por run concluída, em lote — nunca por kill individual.** Consequências, todas
  desejáveis: o helper rodando 24h numa dungeon **não gera progresso**; o progresso é previsível
  ("esta run vale 3 de 35"); some toda a classe de regras invisíveis (janela de tag, quem deu mais
  dano, summons contam?).
- **Quatro estados por entrada:** Desconhecido → Avistado → Estudado → **Dominado**, revelando
  informação a cada degrau. A recompensa por matar é **saber onde matar melhor** — o jogador
  desbloqueia o próprio guia de hunt.
- **Escala ~50× menor que Tibia.** 50–80 entradas, 2–6 runs por entrada, Códex completo em
  **8–12 semanas**. **Largura acima de profundidade:** 60 entradas de 4 runs valem mais que 15 de
  16 — mesmo tempo, 4× mais eventos de conclusão.
- **A raridade da entrada é função da disponibilidade, não da força.** Criatura que aparece pouco
  pede menos kills. É o que faz todas as entradas custarem aproximadamente o mesmo *tempo de
  calendário* e é a razão de o sistema parecer justo com um catálogo heterogêneo.
- **Sigilos são atribuídos a uma FAMÍLIA, não a uma espécie.** Numa run de 8 minutos com 5 tipos de
  inimigo, um buff de +5% contra uma espécie é imperceptível — o design do charm de Tibia é acoplado
  à duração de sessão do Tibia.
- **Bônus de coleção = roll extra, nunca aumento de drop chance.** Preserva a forma da distribuição:
  o item raro continua sendo um evento; você só compra mais bilhetes.
- **Marcos densos no início, esparsos depois** (5, 10, 20, 30, 45, 60 entradas). É o que impede a
  camada de conta de virar parede para o jogador novo.
- **[DECIDIDO] O medidor de Foco de Estudo fica FORA do MVP.** Energia + Foco + Entradas são três
  recursos com três regras de reposição — exatamente o erro de ilegibilidade que criticamos em
  Tibia. No MVP, o Códex credita por run com teto simples. Se a instrumentação mostrar abuso, o
  Foco entra depois.

---

# §16. Data / content pipeline

### 16.1 Arquitetura de camadas **[DECIDIDO]**

```
┌────────────────────────────────────────────────────────────────┐
│ Apresentação Phaser  (tilemap, sprites, câmera, animação, FX)  │
│ UI DOM/CSS           (HUD, menus, settings, acessibilidade)     │
│   Puramente reativas. ZERO regra de jogo.                       │
├────────────────────────────────────────────────────────────────┤
│ Simulação TypeScript  (GridWorld, fixed tick, command log)      │
│   Estado mutável serializável. Aplica decisões. Emite eventos.  │
├────────────────────────────────────────────────────────────────┤
│ Regras TypeScript PURO — sem Phaser, DOM, Node ou banco         │
│   CombatResolver · TargetRanker · Pathfinder · LootRoller       │
│   ConditionResolver · ProgressionCurves · HelperPolicy          │
│   ← roda igual no browser, testes e verificador do servidor     │
├────────────────────────────────────────────────────────────────┤
│ Dados validados (JSON + schemas TypeScript)                     │
│   CreatureDef · ItemDef · SpellDef · LootTable · VocationDef    │
│   BossPattern · DungeonDef · ModifierDef                        │
└────────────────────────────────────────────────────────────────┘
```

**A fronteira apresentação ↔ simulação é o único item de arquitetura que copiamos literalmente** do
Arena Fable. É ela que permitiu adicionar hit-stop, screen-shake, slow-mo e dissolve por pixels **sem
tocar o engine e sem quebrar determinismo**. Regra: *a apresentação nunca decide nada; ela lê o
estado que a simulação produziu. A intensidade do juice vem do dado, nunca de RNG no front.*

**Padrão de IA, copiado do Canary pós-refatoração:** `capturar snapshot → decidir puro → aplicar`.
Funções puras sobre snapshots imutáveis, estado mutável só na borda. O Canary chegou nesse desenho
tarde; nós começamos com ele.

### 16.2 Determinismo e replay **[DECIDIDO]**

Manter a disciplina: **seed + command log + hashes**, com um modo de re-simulação que bissecta o
primeiro tick divergente. É o teste de regressão que protege o jogo, torna o `BalanceSim` possível
e permite ao servidor validar uma run sem simular continuamente cada jogador. Sem snapshots de MMO,
sem interpolação de rede e sem regra de recompensa no cliente.

**A decisão do helper é função pura de (estado, configuração)** — sem isso, nada disso vale.

### 16.3 Stack **[DECIDIDO]**

- **Runtime:** Phaser 4, com versão exata fixada no lockfile e upgrades deliberados.
- **Linguagem:** TypeScript em modo estrito.
- **Build:** Vite.
- **Distribuição inicial:** browser responsivo + PWA, hospedado como assets estáticos em CDN.
- **UI:** DOM/CSS sobre o canvas; Phaser não renderiza menus text-heavy por conveniência.
- **Simulação:** pacote TypeScript puro, determinístico, sem dependência de Phaser, DOM ou Node.
- **Backend:** TypeScript/Node, API stateless e PostgreSQL como fonte de verdade.
- **Mobile:** Capacitor depois de validar controles, safe areas e performance no browser móvel.
- **Desktop:** PWA primeiro; wrapper/Steam somente se o canal justificar o custo.

O argumento não é que Phaser tenha mais FPS que Godot. A escolha decorre de **alcance por link,
uma base TypeScript compartilhável entre browser e servidor, UI web madura e menor atrito de
distribuição**. O protótipo Godot estava vazio, portanto não existe custo afundado relevante.

**Spikes que validam a fundação antes do vertical slice:**

| Spike | Pergunta | Régua |
|---|---|---|
| **S1 — Core compartilhado** | O mesmo seed + command log produz o mesmo hash no browser e no Node? | 10.000 replays sem divergência; primeira divergência bissetável por tick |
| **S2 — Densidade web** | O playfield sustenta 50/150/300 atores + FX no hardware-alvo? | 60 fps no desktop-alvo e orçamento mobile definido por tier, sem long tasks recorrentes |
| **S3 — UI responsiva** | HUD+canvas continuam legíveis e operáveis em desktop e mobile? | Viewports de referência passam sem cobrir centro/lower-middle e com touch targets válidos |
| **S4 — Autoridade** | Repetição, corrida e adulteração de conclusão conseguem pagar duas vezes? | Zero duplicação sob testes concorrentes; `run_id` e idempotency key consumidos uma única vez |

### 16.4 Conteúdo como dados **[DECIDIDO]**

- Conteúdo é **JSON validado por schema**, versionado em texto e consumido pelos mesmos tipos no
  browser, simulador e servidor. Tiled é a ferramenta de autoria de mapa; ferramentas customizadas
  só entram quando um gargalo real justificar.
- **Schema de criatura**: portar o **schema** do MonsterType do Canary (maduro, testado por 1.656
  monstros) para schemas TypeScript/JSON. Usar os dados do Canary como **tabela de referência de balanceamento por
  faixa**, jamais como meta de conteúdo.
- **Ficha de padrão de boss como dado**, não script: `nome · gatilho · forma · tiles_afetados ·
  janela_de_telegraph · cor · som · efeito · classe_de_mobilidade · estados_aplicados ·
  regra_de_helper_sugerida`. Com `classe_de_mobilidade` e `regra_de_helper_sugerida` no dado, tuning
  de dificuldade e configuração de helper viram **consultas**, não trabalho manual por boss.
- **Framework de modificadores é dependência arquitetural de primeira classe.** Metade das ideias de
  evento, Selo, mutator e Ciclo assume que ele existe. Se não for desenhado cedo, cada evento vira
  código específico e o custo volta a ser alto.
- **Loot:** roll com chance em base 100000 + **um** `factor` multiplicativo que concentra todos os
  modificadores. Resolução fina sem floats.
- **Elementos e imunidades como percentuais** por criatura (`100` = imune, negativo = vulnerável).
  Uma tabela resolve todo o sistema de resistências.
- **Fórmulas parametrizadas**: duas constantes por spell + ruído — permite balancear dezenas de
  ações sem escrever código por ação.
- **Persistência confiável:** PostgreSQL no servidor. IndexedDB/local storage pode manter cache,
  preferências e retomada temporária, mas nunca é autoridade de inventário, moedas ou recompensa.
- **Toda mutação econômica** usa `run_id`/idempotency key, transação atômica e ledger append-only.

### 16.5 Licença **[DECIDIDO]**

O Canary é **GPL**. Reimplementar mecânicas a partir da compreensão é seguro; **transcrever código
não é**. Documentar a origem de qualquer tabela numérica reutilizada. Congelar o commit de
referência (`157e6f9e`) e **não perseguir o `main`** — 158 commits em 6 meses.

---

# §17. Mapa

**[DECIDIDO] Criar mapas em Tiled e exportar JSON para Phaser, com os conceitos do Tibia. Sem OTBM
e sem importador proprietário no MVP.**

O custo real de importar não é ler o formato binário (é fácil) — é **reimplementar o renderer do
Tibia** (ordem de pilha, elevação, borders, sprites multi-tile, hangables) **e depender
estruturalmente de `appearances.dat` e sprites da CipSoft**. O formato não é o gargalo; o renderer e
os assets são. E mapas de OT são mundos contínuos de dezenas de milhares de tiles — Huntbound quer
dungeons pequenas e instanciadas.

### Concretamente **[DECIDIDO]**

1. **Um tilemap Tiled por dungeon**, com camadas explícitas por andar. Comece com **um andar**.
   Multi-floor entra quando a primeira dungeon exigir.
2. **Grid 32×32** — mantém a proporção do Tibia e faz os placeholders encaixarem sem escala.
3. **Duas camadas visuais por andar:** `ground` e `objects`. É o modelo do RME na prática e o do
   editor que vocês já construíram.
4. **Colisão e walkability em propriedades tipadas do tileset/mapa**, não derivadas de IDs mágicos.
5. **Flags de tile como custom properties.** Copiar o vocabulário útil do RME; ignorar PvP, houses,
   towns e depots.
6. **Entidades em object layers tipadas** (`MonsterSpawner`, `Door`, `Stairs`, `Trigger`,
   `ChestReward`, `BossArena`) — **nunca** itens com `actionId` mágico. O loader valida o schema e
   instancia adapters Phaser; a simulação recebe apenas dados puros.
7. **Spawner com a semântica do RME** — centro + raio + lista ponderada + `spawntime`. É o único
   conceito do formato que vale copiar quase literal: validado por 20 anos e mapeia direto para
   wave/hunt.
8. **Dungeon = JSON validado + manifesto de assets.** Carregar, instanciar, rodar e descartar.
9. **Assets de Tibia como placeholder recortado à mão** para um atlas Phaser — **não** via
   pipeline de `appearances.dat`/LZMA. Recorte manual é descartável; pipeline é dívida.

**Anatomia empírica antes de qualquer gerador** **[DECIDIDO]**: `docs/mapping/*.md` do Arena Fable
tem medidas reais tiradas do `.otbm` (densidade de spawn, dimensões de sala, layout de câmara de
boss). É design puro, engine-agnóstico, e **não existe equivalente no acervo Kaezan**. Leitura
obrigatória.

**Gatilho para reabrir** **[DECIDIDO]**: se a autoria manual virar gargalo, o caminho barato existe
e **não exige tocar no código do RME** — ele embarca Lua com `app.map`, `tile.items`, `json.encode` e
`app.storage():save()`. Um exportador curto roda dentro do editor e já resolve o banco de itens
(as flags vêm resolvidas). Regra: **importador roda offline, o produto é JSON/Tiled validado, e
`.otbm` nunca é formato de runtime.**

---

# §18. Hub e arquitetura de informação

### 18.1 Princípios **[DECIDIDO]**

1. **A Home é a vitrine do personagem, não um menu.** É o que dá cara de produto e não de launcher.
2. **Duas etapas até jogar**, nunca quatro. *Onde* (modo + faixa + briefing numa tela) → *Quem/Como*
   (deploy). Num jogo cuja tese é sessão de 15 minutos, 4 cliques de menu é contradição de produto.
3. **Barra persistente com os recursos**, sempre visível: Ouro, Insígnia, **Vigor (atual/cap)**,
   Nível de conta.
4. **O combate fica FORA do shell.** Full-bleed, sem chrome de navegação. Cena separada.
5. **Informação secundária mora em drawer sobre scrim**, nunca na tela principal. É o que mantém as
   telas-vitrine limpas.
6. **Seleção-então-confirmação.** Todo rail seleciona e atualiza um painel; um CTA separado avança.
   Dá liberdade de explorar antes de commitar.
7. **Uma tela única de Ciclo.** Diária + semanal + sazonal + contrato + Maré em **um** lugar, com uma
   linha de "próxima meta" que mostra o que está mais perto de fechar, entre todas as camadas. O
   jogador precisa responder *"o que eu faço agora?"* em um clique. HSR e WuWa erram aqui e **não
   devem ser copiados nesse ponto**.

### 18.2 O buraco herdado que precisa ser desenhado do zero **[DECIDIDO]**

> **Resina/energia não existe como tela em lugar nenhum do acervo.**

O Arena Fable tem `EnergyLedger` completo no backend (cap 300, regen 3/min, 60/run) e **o saldo
nunca é serializado para o cliente**. A UI mostra apenas o *custo planejado*. O jogador nunca soube
quanta energia tinha.

Se Vigor entra — e entra —, ele precisa de: **(a)** pill persistente com `atual/cap`, **(b)** timer
da próxima regeneração, **(c)** previsão "cheio às HH:MM", **(d)** custo projetado onde se gasta, e
**(e)** o estado de reserva. **Nada disso pode ser portado. Tem que ser desenhado.**

Corolário de UX de ausência: ao voltar depois de dias, a tela diz **"nada foi perdido"** com os
números — 1.440 de Vigor guardado, 6 clears semanais acumulados, Descanso cheio. A mensagem nunca
é "você perdeu".

---

# §19. Mapa de telas

### 19.1 MVP **[DECIDIDO]**

| Tela | Responsabilidade única |
|---|---|
| **Home** | Vitrine do personagem + estado da conta + o que fazer hoje |
| **Caçada** | *Onde*: faixa + dungeon + briefing + modo (Livre/Sincronizado) + preview do que a run vale |
| **Run** | Jogar. Fora do shell |
| **Personagem** | Kit, postura, runas, equipamento, progressão |
| **Helper** | Preset, sliders de intenção, prioridade de ações, alvo |
| **Códex** | Coleção com sprite + progresso por entrada |
| **Mochila** | Grade com filtro por slot/tier, ordenação, ação em lote |
| **Ciclo** | Diárias + semanais + sazonais + próxima meta, num lugar só |

**Overlays:** relatório pós-run · caixa-preta de morte · drawer de detalhes · confirmação de gasto.

### 19.2 Pós-MVP

Fenda · Registro de Caça · Loja (Insígnia / Fragmentos) · Trilha do Caçador · Forja · Seleção de
personagem (só quando houver mais de uma vocação).

### 19.3 O que NÃO replicar do Arena Fable **[DECIDIDO]**

- **Hunt + Mode + Prerun como três telas.** Fundir em duas.
- **Cards de modo aspiracionais** (`Soon`). Ocupavam 60% da tela entregando nada.
- **Bestiary e Mochila como listas de texto** (64 e 117 linhas). O Códex é **pilar declarado** —
  merece uma tela de verdade.
- **Painel admin completo.** Conteúdo usa JSON tipado, Tiled e ferramentas focadas; não reconstruir o CRUD genérico antigo.
- **Rota separada de seleção de personagem** enquanto houver só uma vocação jogável.

### 19.4 Estados obrigatórios **[DECIDIDO]**

- **Vazio:** copiar o **tom** do Arena Fable literalmente — ele converte vazio em ação ("Empty
  backpack — go hunt!"). Foi a parte mais bem executada da UI antiga.
- **Loading:** com produção (o loading do combate com rosácea girando e copy de mundo era o único
  bem-feito). **Nada de polling com `setInterval`** — usar Promise/evento e estado explícito.
- **Erro:** **não existia no Arena Fable.** Toda tela que carrega dados precisa de estado de falha
  com retry.
- **Bloqueado:** cadeado + mensagem do que destrava, nunca botão morto sem explicação.

---

# §20. Princípios de UI/UX a preservar do Arena Fable

Ordenados por valor. Todos **[DECIDIDO]** salvo indicação.

1. **Regra de acento duplo — íris = ação de UI; aurum = recompensa/premium. Nunca troque os
   papéis.** É a decisão de UI mais valiosa do projeto anterior: simples, aplicável e verificável.
2. **"Um clímax só" por tela.** Uma peça carrega o momento; o resto sustenta.
3. **A linguagem do HUD de combate ("Reliquary Combat")** — arco como slot de ação, rosácea como
   clímax, tinta do elemento em runtime, cartouche de boss, minimapa. **Portar a linguagem, não o
   CSS.** A lista de anti-padrões do guia de gameplay vira **checklist de revisão** de toda tela.
4. **Rail de seleção lateral.** O componente mais reusado do jogo inteiro; funciona em modo, faixa,
   roster, banner.
5. **Palco/alcova central + painel de intel lateral.** A gramática das telas cinematográficas.
6. **Fundo full-bleed em 3 camadas:** imagem → gradiente de legibilidade → conteúdo.
7. **Eyebrow rotula com verdade, nunca decoração.**
8. **Drawer sobre scrim** para tudo que é secundário.
9. **Feedback de impacto client-side com intensidade vinda do dado**, nunca de RNG no front.
   Hit-stop, shake proporcional, números com outline, crit maior e dourado, dissolve por pixels.
10. **Readout do helper em linguagem natural** — *"Explorando e lootando · atacando o mais próximo ·
    curando automaticamente."* A melhor ideia da tela do helper. **Manter literalmente.**
11. **Configuração do helper salva por personagem**, e recarregada na próxima run dele.
12. **Indicador de destino do autopilot** — marcador pulsante no tile-alvo, seta na borda quando
    fora da tela. É o que torna o autoplay **legível** em vez de misterioso.
13. **Legibilidade do helper em combate:** retículo animado no alvo + linha de intenção. E manter a
    **rejeição** do telegraph de footprint — "tirava o ar do jogo". Decisões descartadas com veredito
    também são ativo.
14. **Loot voa até o personagem no abate.** Remove o atrito de pisar em tiles.
15. **Baú dinâmico e saída dinâmica** — o baú cai no corpo a cada N mortes; a saída abre no corpo do
    último mob. Elimina baú fixo espalhado e backtracking.
16. **Riscos telegrafados, nunca gotcha** — baú amaldiçoado/mímico marcado no mundo **e** no
    minimapa.
17. **Cadência de escolhas por *beats*** — level-up dá status pequeno automático; escolhas pesadas só
    em momentos antecipáveis (fim de andar, santuário), ~3 por run. Resolve o "menu a cada 40s".
18. **Skip respeitoso** em reveals e cutscenes.
19. **Estados vazios que convertem em ação.**
20. **Contrato de arte por personagem** com **fallback gracioso** (o serviço devolve `null` e o
    componente cai para sprite ou gradiente do elemento). **Nunca reusar a arte de um personagem em
    outro.**

### O que corrigir explicitamente **[DECIDIDO]**

| Erro herdado | Correção |
|---|---|
| **Emoji como ícone** (`🪙`, `✦`, `⚔`) — contradiz a própria regra do style guide | **Ícones autorais desde o dia 1** |
| **Três vocabulários de botão coexistindo** | **Um**, com variantes |
| **Estados de erro inexistentes** | Toda tela que carrega dados tem falha + retry |
| **Tematização por tela via variáveis ad-hoc, não documentada** | **Um** contrato: toda tela contextual declara `accent` e `deep` |
| **Saldo de energia invisível** | §18.2 |
| **4 cliques até o combate** | 2 |

---

# §21. Estratégia de reconstrução da UI em Phaser + DOM

### 21.1 A regra **[DECIDIDO]**

> **Migrar não é copiar o Angular antigo.** Portamos **conceitos, coreografias, tokens úteis e regras
> de produto**. O playfield vive no Phaser; HUD, menus, settings e acessibilidade vivem no DOM.

E: **não reconstruir telas antes do gameplay.** A UI do vertical slice pode ser mínima — mas a
arquitetura não pode inviabilizar o hub depois.

### 21.2 Arquitetura de superfícies **[DECIDIDO]**

```
WebApp
├── SimulationCore              # TypeScript puro, fixed tick, RNG seedado
├── PhaserCanvas
│   ├── BootScene               # preload e manifesto
│   └── GameplayScene           # tilemap, sprites, câmera, animação, FX
├── AppShell (DOM)
│   ├── PersistentBar           # recursos, nível, acesso a menus
│   ├── HudLayer                # informação crítica de combate
│   ├── ScreenStack             # hub e telas de produto
│   ├── OverlayLayer            # drawers, modais, relatório, caixa-preta
│   └── ToastLayer
└── SceneBridge                 # única ponte entre simulação, Phaser e UI
```

### 21.3 Mapa de tradução **[DECIDIDO]**

| Arena Fable / OTClient | Phaser + web idiomático |
|---|---|
| Shell + RouterOutlet | `AppShell` DOM + `ScreenStack`; nenhum framework de UI é obrigatório antes do spike de UI |
| Rail de seleção | Componente DOM `SelectionRail` com roving focus, teclado, pointer e `item_selected(id)` |
| Palco/alcova | Componente DOM/CSS `CharacterStage`; Phaser apenas quando movimento ou composição em canvas justificar |
| Fundo full-bleed + veil | CSS `background`/pseudo-elements com gradiente de legibilidade e imagem responsiva |
| Drawer + scrim | Componente DOM acessível, focus trap, Escape e animação reduzível |
| Design tokens (`:root`) | CSS custom properties tipadas por convenção; toda tela contextual declara `accent` e `deep` |
| Vidro (`backdrop-filter`) | CSS com fallback *crystal edge*; medir GPU/composição no spike de UI responsiva |
| Arco de catedral / rosácea | SVG/CSS no HUD; shader Phaser apenas quando fizer parte do playfield |
| Cooldown | Shader/mask no canvas para ação do mundo; `conic-gradient` no DOM para HUD |
| Reveal | Timeline Phaser + partículas no canvas, com cards/labels acessíveis no DOM |
| Atmosfera de bioma | Tint/pipeline Phaser + partículas + overlay CSS de vinheta |
| Números de dano | Pool `FloatingNumber` no Phaser + **regra de fusão** (mesma posição, < duração/2.5 → soma) |
| Battle list / lista de alvos | DOM alimentado por selector granular e estável — não reconstruir a lista inteira a cada tick |
| `processMouseAction` (cascata de 550 linhas) | `resolve_click(tile, modifiers, button) -> ClickIntent`. **Manter a cascata de prioridades; não manter as 550 linhas** |
| Input com auto-repeat do SO | `InputActionMap` + estado consultado no fixed tick, com cooldown próprio. **Não replicar auto-repeat do SO** |
| Modo texto vs. movimento | `InputContextManager` único, compartilhado por DOM e Phaser; modal sempre captura o contexto |
| Pathfinding | A* de grid puro na simulação. Nunca depender do ciclo de vida de uma Phaser Scene |
| Catálogo de conteúdo + admin | JSON + schema + Tiled + validação em CI; ferramentas focadas somente quando necessárias |
| `AssetsService` (recolor HSI, 523 l.) | Eliminar com arte autoral; se necessário, pipeline/shader de paleta isolado no adapter Phaser |
| Cutscene Remotion | Manter vídeo pré-renderizado ou usar timeline Phaser; escolher por custo de download e acessibilidade |

### 21.4 Onde browser-first cobra custo **[DECIDIDO]**

Uma base de código não significa uma única interface. Desktop, pointer, teclado e touch exigem
breakpoints, safe areas, tamanhos de alvo e densidades diferentes. Além disso, Phaser e DOM têm
ciclos de render separados: estado duplicado entre eles produz bugs de sincronização. A mitigação é
um `SceneBridge` único, selectors granulares, snapshots imutáveis para apresentação e testes visuais
em viewports reais.

O browser também pausa tabs em background. Nenhum timer de energia, recompensa ou progresso pode
depender do relógio do cliente; o servidor usa seu próprio tempo. O helper não progride escondido em
background.

**Consequência de escopo:** construir a UI **na ordem do jogo**, não na ordem do inventário de
telas antigas.

---

# §22. Riscos

Ordenados por dano esperado.

| # | Risco | Grav. | Sinal de alerta | Mitigação |
|---|---|---|---|---|
| R1 | **Agência dissolvida** — o helper faz tudo e o jogador vira espectador | 🔴 | Sessão sem nenhuma decisão significativa | Não se resolve na UX do helper. Resolve-se em energia limitando ganho + decisão concentrada em build/rota/risco. **É a hipótese central do vertical slice** |
| R2 | **Banda de poder comprimida esvazia a perseguição de gear** | 🔴 | "Gear não importa" em playtest | O eixo vertical curto **obriga** eixo horizontal largo: sets que mudam comportamento. Se o gear só der número, R2 se concretiza |
| R3 | **Big rewrite que nunca termina** | 🔴 | Milestone sem jogável ao fim | Vertical slice antes de tudo; §3 (non-goals) tratado como lista de bloqueio; UI na ordem do jogo |
| R4 | **Helper reabre farm infinito por uma fresta** | 🔴 | Qualquer fonte de poder sem contador | **Auditoria obrigatória: toda nova fonte de recompensa declara seu contador antes de existir** |
| R5 | **Morte inexplicável destrói a confiança no helper** | 🔴 | Mortes/hora com helper acima do baseline manual | Caixa-preta de morte; Sobrevivência sempre ativo e prioritário; estados nomeados |
| R6 | **Escopo: copiar a variedade de HSR/WuWa sem ter o time deles** | 🔴 | Um "evento" que precisa de código novo | Se um evento não puder ser descrito como *conteúdo existente + modificador + tabela*, **não é evento — é conteúdo do jogo** |
| R7 | **Reescrita TypeScript superestima o reuso do Arena Fable** | 🟠 | Porte linha a linha de classes/waifus/economia antiga | Reusar especificações, testes, algoritmos e números; portar código apenas quando o contrato novo coincidir |
| R8 | **Phaser 4 vira dono das regras** | 🟠 | Lógica em `Scene.update()` ou estado preso a sprite/tween | Simulação TypeScript pura + `SceneBridge`; scenes finas e objetos de render descartáveis |
| R9 | **Explosão combinatória de teste** (faixas × dungeons × Selos) | 🟠 | Tuning célula a célula | Escalonamento 100% formulaico; ajuste manual **só** em bosses; teste automatizado de "TTK dentro da janela" |
| R10 | **Custo de UI subestimado** — o sync é matematicamente simples e caro em interface | 🟠 | — | **Orçar a UI como o item mais caro do sistema de sync.** Foi onde o WAKFU sangrou |
| R11 | **Legibilidade:** 3 carteiras + 4 contadores + 3 camadas de material + 2 modos + 5 faixas | 🟠 | Jogador precisando de planilha | Introdução escalonada: Ouro e EXP no dia 1; Insígnia na semana 1; Selo quando desmanchar a 1ª peça; Códex na faixa 2 |
| R12 | **Solver** — build ótima converge e o endgame vira script | 🟠 | Uma build dominando toda a Fenda | Rotação de modificadores, oferta aleatória, restrição de vocação, sigilos com downside (§14.4) |
| R13 | **Sobreposição visual em 2D top-down** — telegraph que existe mas não pode ser visto | 🟠 | Mortes atribuídas a "não vi" > 10% | Linguagem cromática fechada, decals abaixo das unidades, áudio por família, redução de efeitos cedo |
| R14 | **Assets do Tibia** — não resolvido em **nenhum** dos três projetos | 🟠 | — | Placeholder recortado à mão, zero pipeline; **§23 #1** |
| R15 | **Determinismo diverge entre browser e Node** | 🟡 | Mesmo seed/log produz hash diferente | Inteiros/fixed-point onde importa, RNG próprio, ordenação explícita e corpus de 10.000 replays cross-runtime |
| R16 | **Conteúdo gerado por dados vira repetitivo rápido** | 🟡 | "É sempre a mesma dungeon com um buff" | Modificadores que mudam **decisão**, não números; combinar eixos diferentes; amarrar tudo ao Códex para render progresso permanente |
| R17 | **Manutenção pós-lançamento** — Ciclos que exigem um humano preparando cada um | 🟡 | — | Gerador com pool + regras de combinação; Ciclos curados são bônus |
| R18 | **Herdar workarounds e premissas de MMO sem filtro** | 🟡 | Sync por multiplicador; arena em "hunt viva"; opcodes virando arquitetura | C05 §5 é a lista de bloqueio. Ao ler o acervo, extrair o **contrato de dados**, descartar o transporte |
| R19 | **Cliente vira autoridade econômica por conveniência** | 🔴 | Endpoint aceita quantidade, item ou recompensa calculada no browser | Servidor emite `run_id`, recalcula recompensa, usa idempotência, transação atômica, constraints e ledger |
| R20 | **Build/PWA antiga conversa com conteúdo novo** | 🟠 | Replay ou schema falha após deploy | Handshake obrigatório de `client_version`, `simulation_version` e `content_version`; deploy compatível ou bloqueio com refresh |

---

# §23. Decisões ainda abertas

Ordenadas por urgência. **Nada aqui deve ser implementado antes de resolver.**

| # | Questão | Tipo | Quando resolver |
|---|---|---|---|
| 1 | **Direitos dos assets.** Placeholder está autorizado; o caminho para distribuição não existe em nenhum dos três projetos | **[PESQUISA]** | Antes de qualquer compromisso público. Quanto menos o pipeline depender de formatos do cliente, mais barata a troca |
| 2 | **Custo da diagonal e regras de colisão do dash** | **[PROTÓTIPO]** | **Antes de balancear qualquer boss** — muda toda a tabela de janelas de telegraph |
| 3 | **O helper pode abortar a run para preservar recursos?** Protege ou tira agência? | **[PROTÓTIPO]** | Vertical slice |
| 4 | **O jogador tem barra de ruptura própria?** 4 barras em tela pequena é risco real | **[PROTÓTIPO]** | Depois do boss-professor |
| 5 | **Quantos momentos de intervenção por luta** são aceitáveis para quem escolheu o jogo *pela* automação? A hipótese é 3–6; pode ser 1–2 | **[PROTÓTIPO]** | Vertical slice |
| 6 | **Sigilos/cartas com desvantagem?** É a mitigação mais forte contra solver e a mais arriscada para legibilidade | **[PESQUISA]** | Antes da Fenda |
| 7 | **Ranks finais de skill atrás de boss semanal** produzem cauda longa ou frustração? É o mecanismo mais criticado de HSR/WuWa e estamos reproduzindo deliberadamente | **[HIPÓTESE]** | Instrumentar desde o MVP |
| 8 | **Equipamento de conta "um por vez"** é gerenciável ou vira micro-gestão entre 3 personagens? | **[PROTÓTIPO]** | Quando a 2ª vocação existir |
| 9 | **Renda de Selo de Forja: fixa semanal ou proporcional ao desmanche?** Proporcional recompensa quem farma mais gear — o que reabre a porta do helper 24/7 | **[HIPÓTESE]** | Antes do gear entrar |
| 10 | **Nível de conta separado, ou o nível de conta É o Códex + Registro?** | **[HIPÓTESE]** | Antes do meta |
| 11 | **"Override vira regra"** entra no slice ou depois da validação? | **[PROTÓTIPO]** | Slice |
| 12 | **Preset de helper separado por modo** (Livre vs. Sincronizado) — necessário ou complexidade prematura? | **[HIPÓTESE]** | Quando o sync existir |
| 13 | **O Modo Sincronizado muda os padrões dos bosses ou só os números?** Se muda padrões, o custo de conteúdo dobra | **[HIPÓTESE]** | Antes de produzir bosses em volume |
| 14 | **Convenção de versionamento e migração de conta/save.** Backend, cache local e conteúdo precisam de contratos independentes | **[PESQUISA]** | Antes do primeiro dado persistido |
| 15 | **Camada B do acervo histórico nunca foi lida** (`visual_content_creation.md` e os dois backups originais de 623 KB + 666 KB, dos quais o baseline foi fatiado) | **[PESQUISA]** | Antes de decidir o pipeline de arte |
| 16 | **Quais algoritmos/testes do C# viram especificação ou porto TypeScript?** Reuso bruto por linhas deixou de ser meta | **[PESQUISA]** | Inventário de reuso no playbook de fundamentação |
| 17 | **Matriz mínima de browsers e dispositivos.** Sem ela, "browser-first" não define orçamento | **[PESQUISA]** | Antes do spike de densidade |
| 18 | **Modelo de conta inicial.** Guest com upgrade, login obrigatório ou ambos | **[PESQUISA]** | Antes do primeiro endpoint de progressão |
| 19 | **Orientação mobile.** Landscape obrigatório ou UI adaptável a portrait fora do combate | **[PROTÓTIPO]** | Spike de UI responsiva |

**Explicitamente NÃO abertas** (para evitar relitígio): energia existe · helper nunca é nerfado ·
5 faixas · 3 carteiras · 5 vocações de Tibia · Phaser 4 + TypeScript · browser/PWA first · mapas em
Tiled/JSON · backend autoritativo · sem progresso confiável totalmente offline · sem gacha · sem
multiplayer · crédito de coleção por run.

---

# §24. MVP recomendado

Duas etapas. **A primeira não é um MVP — é a validação da hipótese central.** Não avance sem ela.

## Etapa 1 — Vertical slice: "isso é divertido?"

**Pergunta única:** *Tibia-like + dash + postura + helper é divertido no browser — e o jogador ainda
sente que a run foi dele?*

**Incluir:**

- **1 dungeon** (faixa T1, tema único, 3 salas + mini-boss), 1 andar, layout autorado.
- **1 classe: Knight.** 5 ações + dash + par de posturas.
- **2 tipos de inimigo + 1 elite.** Currículo: pack → ranged.
- **1 boss: O Metrônomo** — ciclo fixo, 3 telegraphs, ruptura simples sem afinidade. Se o jogador
  não vence isto, todo o resto está mal ensinado.
- **Helper camadas 0 e 1**, 4 módulos (Sobrevivência, Alvo, Ações, Loot). **Movimento com escopo
  reduzido. Sem navegação de rota. Sem regras avançadas.**
- **Preset "Assistido"** (só cura e loot automáticos) visível desde o começo — é ele que valida se o
  **combate** é divertido antes de validar o helper.
- **Caixa-preta de morte** e relatório pós-run.
- **Auto-loot** e recompensa simples ao fim.
- **Determinismo + replay** desde a primeira linha.
- **Estados nomeados** no modelo de dados (§9.4) — mesmo com poucos estados usados.
- **Item = `(template + nível)`** (§12.4) — mesmo sem sync.
- **Overlay de instrumentação** (o análogo do F3): mortes/hora, overrides/minuto por módulo,
  consumíveis por run, tempo de run.

**Excluir:** hub, energia, moedas, Códex, sync, Fenda, semanal, Ciclo, passe, gacha, as outras 4
classes, geração procedural de mapa, multi-floor, arte definitiva.

**As perguntas que o slice tem que responder, em ordem** (W10 §12):

1. Preset **Assistido**: o combate é divertido com só cura e loot automáticos?
2. Preset **Padrão**: a run é limpa **sem tocar em nada**? *(É o teste do contrato de §10.3.)*
3. Os sliders de intenção com tradução visível são compreendidos?
4. A caixa-preta de morte faz o jogador **ajustar e voltar**, ou desligar o helper?
5. Quantas intervenções por luta o jogador quer de fato?
6. A dungeon dá vontade de repetir **sem** nenhuma camada de meta em cima?

**Critério de parada honesto:** se a resposta a (1) ou (6) for não, **nenhuma quantidade de sistemas
conserta.** Volte ao combate.

**Em paralelo, os três spikes:** S1 (classlib), S2 (densidade), S3 (vidro).

## Etapa 2 — MVP jogável: "isso é um jogo?"

Só depois que a Etapa 1 passar.

**Adicionar:**

- **Vigor de Caça** completo, com a UI que nunca existiu (§18.2): saldo, timer, previsão, reserva.
- **3 dungeons** (2 em T1, 1 em T2), formato canônico completo (5 salas + boss).
- **Loop diário:** 3 tarefas de 6, alvo do dia com destaque, fila de runs + clear instantâneo.
- **1 boss semanal** com 3 clears bancáveis e piso garantido em Fragmentos.
- **Códex reduzido** — 15–20 entradas, crédito por run, 2 marcos de conta, 1 Sigilo por família.
- **Economia mínima:** Ouro + Insígnia. **Selo de Forja e Fenda ficam fora.**
- **Gear** com slot escolhido na entrada, drop garantido, RNG só em substats.
- **Hub** com 5 telas (Home, Caçada, Personagem, Helper, Códex) + 2 cliques até o combate.
- **Helper camada 2** (3 slots), com detector de regra morta e contador de disparos.
- **Save local.**

**Fora do MVP, em ordem de entrada depois dele:**
Modo Sincronizado → 2ª classe (Monk, por ser o modelo) → Registro de Caça → Selo de Forja e forja
direcionada → Ciclo + Trilha do Caçador → **Fenda** → Selos/mutators → as 3 classes restantes →
multi-floor → geração de layout.

**As 4 métricas que decidem se o MVP funcionou** (as três primeiras são mensuráveis com uma dungeon
e uma classe):

| Métrica | Alvo |
|---|---|
| **Degraus completados por dia de rotina** | ≥ 2 nos dias 1–14; **≥ 1 sempre** |
| **Dias de rotina com progresso zero** | **0 em 30 dias** |
| **Runs que não pagam nenhum contador** | **0%** |
| **Poder(3 h/dia) ÷ Poder(25 min/dia) após 30 dias** | **< 1,15** |

A última é a validação numérica do pilar P3 e da tese inteira do projeto. Se ela falhar, o jogo é um
grinder com passos extras.

---

## Frase de proteção de escopo

> **Não construir Tibia inteiro. Extrair o que é divertido em Tibia e encaixar numa estrutura
> moderna, curta, automatizável e orientada à construção de conta.**

E o teste que acompanha toda decisão nova:

> **Isso melhora o core loop? Reduz grind ou só adiciona obrigação? Cria decisão interessante?
> Precisamos disso neste milestone? Dá para validar com uma versão menor?**
> Se várias respostas forem ruins, não entra.
