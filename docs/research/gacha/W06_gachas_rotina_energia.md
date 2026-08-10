# W06 — Gachas: diárias, semanais, resina e gestão de conta

> Pesquisa de referência para **Kaezan Huntbound**.
> Foco: Wuthering Waves (WuWa) e Honkai: Star Rail (HSR).
> Objetivo: entender como esses jogos limitam progressão para viabilizar **rotina curta diária + conteúdo semanal profundo**, sem grind infinito.
> **Não** estamos estudando gacha de personagem nem monetização. Só a **estrutura de rotina**.
> Dados coletados em agosto/2026 (HSR ~4.4, WuWa ~3.3).

---

## 1. Comparação estruturada

### 1.1 Energia — números-base

| Aspecto | Honkai: Star Rail | Wuthering Waves |
|---|---|---|
| Nome | Trailblaze Power (TP) | Waveplate (WP) |
| Cap ativo | **300** | **240** |
| Regeneração | 1 a cada **6 min** (240/dia) | 1 a cada **6 min** (240/dia) |
| Tempo para encher do zero | 30h | 24h |
| Overflow | **Reserved Trailblaze Power** | **Waveplate Crystal** |
| Cap do overflow | **2400** | **480** |
| Regen do overflow | 1 a cada **18 min** (~30 dias para encher) | 1 a cada **12 min** (~4 dias para encher) |
| Saque do overflow | Até **300 por vez** (converte em TP ativo) | Troca **1:1**, sem limite de saque |
| Buffer total (ativo + reserva) | **2700** (~11 dias de gasto) | **720** (~3 dias de gasto) |
| Recarga paga | Itens de reposição (Fuel) + Stellar Jade | Crystal Solvent (60 WP) + Astrite, até **6×/dia** |

**Leitura importante:** os dois jogos geram exatamente a mesma quantidade de energia por dia (240). A diferença real está no **buffer de ausência**:

- HSR perdoa **~um mês inteiro** de ausência antes de começar a desperdiçar energia.
- WuWa perdoa **~3–4 dias**. Isso força login quase diário só para "não perder resina".

Essa é a diferença de design mais relevante das duas para o nosso caso.

### 1.2 Atividades que gastam energia

**Honkai: Star Rail**

| Atividade | Custo | O que dá | Limite |
|---|---|---|---|
| Calyx (Golden) | 10 | EXP de personagem, EXP de arma, créditos | — |
| Calyx (Crimson) | 10 | Materiais de skill (Traces) e de ascensão de arma | — |
| Stagnant Shadow | 30 | Materiais de ascensão de personagem | — |
| Cavern of Corrosion | 40 | **Relics (gear)** | — |
| Echo of War | 30 | Materiais de skill de nível alto | **3 clears/semana** |

Todos os Calyx permitem enfileirar até 6 runs (60 TP de uma vez), com clear instantâneo em estágios já dominados.

**Wuthering Waves**

| Atividade | Custo | Custo dobrado | O que dá | Limite |
|---|---|---|---|---|
| Simulation Training | 40 | 80 | EXP de personagem/arma, Shell Credits | — |
| Forgery Challenge | 40 | 80 | Materiais de skill/talento | — |
| Tacet Field | 60 | 120 | **EXP de Echo (Sealed Tubes) + Tuners** | — |
| Boss Challenge (campo) | 60 | — | Materiais de ascensão de personagem | — |
| Weekly Boss (Calamity) | 60 | — | Materiais de skill de nível alto | **3 clears/semana** |

WuWa tem a opção explícita de **gastar o dobro para receber o dobro** — reduz cliques e tempo de sessão sem alterar a economia. HSR resolve o mesmo problema com fila de runs.

**Fatiamento prático de 240 energia/dia:**
- HSR: 6 Caverns (gear) **ou** 8 Stagnant Shadows **ou** 24 Calyx.
- WuWa: 4 Tacet Fields **ou** 6 Forgeries/Simulations **ou** 4 bosses.

### 1.3 Materiais — quem gasta energia e quem não gasta

| Categoria | HSR | WuWa |
|---|---|---|
| EXP de personagem | Energia (Calyx Golden) | Energia (Simulation Training) |
| Créditos/dinheiro | Energia (Calyx Golden) | Energia (Simulation Training) |
| Materiais de skill | Energia (Calyx Crimson + Echo of War) | Energia (Forgery + Weekly Boss) |
| Materiais de ascensão | Energia (Stagnant Shadow) + coleta de mundo | Energia (Boss) + coleta de mundo |
| **Gear (peças)** | **100% energia** (Cavern of Corrosion) | **Grátis** — Echos dropam de inimigos do mundo aberto |
| **Gear (upgrade do gear)** | Incluído no drop | **Energia** (Tacet Field → EXP de Echo + Tuners) |

Este é o segundo ponto estrutural mais importante da pesquisa:

> **WuWa deixou a aquisição de gear fora da energia — e isso reabriu o grind infinito.**
> Jogadores dedicados farmam rotas de Echo por horas, todos os dias, porque não existe teto. O teto está só no *upgrade*.
> HSR fechou essa porta: sem energia, não existe gear novo. A sessão termina quando a energia acaba.

Para um projeto cuja premissa é helper automatizado, o modelo WuWa é **exatamente o que não podemos copiar**.

WuWa mitiga parcialmente com o **Data Bank**: o nível do Data Bank controla a qualidade/raridade dos Echos que dropam e quais rendem Tuners. É um gate de progressão de conta, não de tempo — atrasa o farm, mas não o limita por dia.

### 1.4 Atividades sem energia

**HSR**
- Daily Training (tarefas rotativas) — 500 pontos/dia
- Assignments (expedições passivas, ~20h)
- Simulated Universe / Divergent Universe (roguelite, pontos semanais)
- Memory of Chaos, Pure Fiction, Apocalyptic Shadow, Anomaly Arbitration (endgame rotativo)
- História, eventos, exploração, Nameless Honor (battle pass)

**WuWa**
- Activity diária — 100 pontos/dia
- Mundo aberto, farm de Echos, baús, puzzles
- Tower of Adversity (Hazard Zone rotativa a cada **28 dias**; demais andares permanentes)
- Whimpering Wastes (endgame rotativo, introduzido na 2.1)
- Depths of Illusive Realm (roguelite)
- História, eventos, battle pass

**Padrão comum:** energia paga **materiais**; conteúdo sem energia paga **moeda premium, EXP de conta e prestígio**. Os dois eixos quase não se misturam. Isso permite ao jogador escolher entre "só farmar 8 min" ou "jogar 1h de endgame" sem perder nada.

### 1.5 Dailies

| | HSR | WuWa |
|---|---|---|
| Sistema | Daily Training | Activity |
| Meta | 500 pontos (8 tarefas disponíveis, ~4–5 bastam) | 100 pontos |
| Recompensa | **60 Stellar Jade/dia** (1.800/mês) + mats | 2.000 Union EXP + Astrite + mats |
| Tempo | ~5–10 min | ~2–5 min |
| Reset | Diário (04:00 servidor) | Diário (04:00 servidor) |
| Acumula? | **Não** — perde no reset | **Não** — perde no reset |

Ambos usam o mesmo truque: **oferecem mais tarefas do que o necessário**. O jogador escolhe as 4–5 mais convenientes e ignora as chatas. Isso reduz muito a sensação de tarefa obrigatória sem reduzir a recompensa.

### 1.6 Weeklies e limites semanais

| | HSR | WuWa |
|---|---|---|
| Boss semanal | Echo of War — **3 clears/semana**, 30 TP cada (90 TP) | Calamity Boss — **3 clears/semana**, 60 WP cada (180 WP) |
| Roguelite | Simulated Universe / Divergent Universe — pontos semanais até um teto | Depths of Illusive Realm — recompensas por ciclo |
| Endgame rotativo | MoC / Pure Fiction / Apocalyptic Shadow / Anomaly Arbitration — ciclo escalonado de ~6 semanas, cada modo refresca a cada ~2 semanas | Tower of Adversity (Hazard a cada 28 dias) + Whimpering Wastes |
| Acumula entre semanas? | **Não** | **Não** |

Observação de custo: WuWa cobra **o dobro de energia** pelo boss semanal (180 vs 90). Como o teto de 3 clears é igual, o boss semanal do WuWa come 75% de um dia inteiro de energia.

**Limites semanais existem para dois fins:**
1. Impedir que um jogador com muito tempo livre pule etapas de progressão (skills de nível alto).
2. Garantir que quem joga pouco **alcance o teto mesmo assim** — 3 runs de 2 minutos é atingível por qualquer perfil.

### 1.7 Catch-up e retorno de jogadores

**HSR — Starlit Homecoming** (permanente, ativa sozinho)
- Elegível: **14+ dias** sem login
- Presentes únicos + check-in de 3 dias
- **Drops dobrados** em Calyx e Relics durante o período
- **+50% de EXP** no battle pass (Nameless Honor)
- **90+ dias ausente:** escolhe um personagem e recebe um **set completo de Relics 5★ no nível máximo com main stats adequadas** (janela 4.0–5.0)
- Evento web de convite: jogadores ativos convidam até 3 retornantes

**WuWa — Reprise of Tides** (permanente)
- Elegível: **30+ dias** sem login, Union Level 8+
- Login de 7 dias + missões de retorno → "Tide Notes" trocáveis por recursos
- Eventos web sazonais complementares ("Back to Solaris", 14+ dias de ausência, aniversário)

**Catch-up estrutural (para quem nunca parou de jogar):** é fraco nos dois. Existe basicamente como:
- Eventos recorrentes de **drop dobrado** (economiza metade da energia por período limitado)
- Reserva de energia (HSR muito melhor aqui)
- Escalonamento de recompensas por nível de conta

Novos jogadores continuam limitados por 240 energia/dia, sem forma de acelerar. É a maior lacuna de design dos dois jogos.

### 1.8 Tempo necessário por dia

| Perfil | HSR | WuWa |
|---|---|---|
| Mínimo (dailies + queimar energia) | ~8–12 min | ~6–10 min |
| Rotina completa com semanais no dia | ~25–40 min | ~25–40 min |
| Semana de reset de endgame | +30–60 min pontuais | +30–60 min pontuais |
| Ceiling real para jogador dedicado | ~limitado pela energia | **Ilimitado** (farm de Echo) |

---

## 2. Padrões que funcionam

1. **Energia é o único cano de progressão.** Uma vez gasta, a sessão acabou. É o que garante rotina curta.
2. **Overflow com regeneração reduzida.** O jogador que some não perde tudo, mas também não é premiado por sumir. Meia-taxa é o número certo.
3. **Buffer longo derrota buffer curto.** A reserva de ~30 dias do HSR é um dos sistemas mais elogiados dos dois jogos; os 4 dias do WuWa geram ansiedade de login.
4. **Mais tarefas diárias do que o necessário.** Escolher 4 de 8 elimina a sensação de checklist obrigatório.
5. **Separação limpa entre eixos:** energia → materiais; conteúdo sem energia → moeda premium e prestígio.
6. **Tetos semanais baixos e facilmente alcançáveis.** 3 clears por semana é atingível por qualquer perfil de jogador.
7. **Endgame rotativo com ciclo longo (2–4 semanas)** e escalonado entre modos, para não empilhar tudo na mesma semana.
8. **Clear instantâneo / fila de runs / custo dobrado.** Reduz o tempo de sessão sem alterar a economia. É a maior alavanca de "minutos por dia" que existe.
9. **Recompensas passivas** (expedições do HSR) dão sensação de progresso mesmo em dias de login de 60 segundos.
10. **Evento de retorno permanente e automático.** Não depende de o jogador descobrir nada; ativa sozinho ao logar.
11. **Determinismo parcial no gear.** HSR introduziu itens que permitem fabricar uma peça com set, slot e atributo principal escolhidos — corta a parte mais frustrante da RNG sem tornar o gear trivial.

---

## 3. Frustrações comuns

| Frustração | Origem | Por que dói |
|---|---|---|
| **RNG de gear** | HSR Relics, WuWa Echos | Energia gasta pode render zero progresso. É a queixa nº 1 dos dois jogos. |
| **Ansiedade de overflow** | WuWa (4 dias) | Jogador loga só para "não desperdiçar", o oposto de rotina saudável. |
| **Boss semanal caro + RNG** | WuWa (180 WP/semana) | Teto baixo + drop aleatório = pode levar meses para uma skill. |
| **Endgame como lição de casa** | HSR MoC a cada 2 semanas | Reclear do mesmo conteúdo com o mesmo time vira obrigação, não desafio. |
| **Dailies prescritivas** | Ambos, em menor grau | "Use 3 ultimates", "derrote 20 inimigos de tipo X" força mudar o que se ia fazer. |
| **FOMO de drop dobrado** | Ambos | Evento de 2x faz o jogador **segurar energia semanas antes** — inverteu o objetivo. |
| **Gate duro para novatos** | Ambos | Sem catch-up de materiais, um personagem novo leva semanas. Zero aceleração. |
| **Grind sem teto no mundo aberto** | WuWa (Echos) | Reintroduziu o grind infinito que a energia deveria eliminar. |
| **Perda total no reset diário** | Ambos | Um dia perdido é irrecuperável, mesmo tendo energia sobrando. |
| **Battle pass por EXP de tarefa** | Ambos | Cria uma segunda checklist paralela à diária. |

---

## 4. Recomendações para Huntbound

### 4.1 Princípios

1. **Toda fonte de poder tem um contador, não uma taxa de drop.** Se o helper pode repetir infinitamente, a recompensa precisa ter um teto explícito (diário ou semanal), não uma chance reduzida.
2. **Gear entra pela energia.** Não repetir o erro dos Echos. Peça de equipamento só sai de conteúdo com custo de energia ou com teto semanal.
3. **Energia limita poder; tempo livre compra conteúdo, não força.** Quem quiser jogar 3h joga dungeon, Fenda, torre, coleção — mas não fica mais forte por isso.
4. **Perdoar ausência é barato.** Somos single-player. Não há competição, não há economia entre jogadores, não há monetização. Não existe motivo para punir quem sumiu uma semana.
5. **O helper deve encurtar a sessão, não estendê-la.** Clear instantâneo e run em lote são features de design, não conveniência opcional.

### 4.2 Sistema de energia proposto

Nome de trabalho: **Vigor de Caça (VC)**.

| Parâmetro | Valor | Justificativa |
|---|---|---|
| Cap ativo | **240** | Alinhado ao padrão do gênero; ~4–6 runs/dia. |
| Regeneração | 1 a cada 6 min (**240/dia**) | Enche exatamente em 24h. |
| Reserva ("Vigor Estagnado") | Cap **1440** (6 dias) | Meio-termo entre WuWa (punitivo) e HSR (quase infinito). |
| Regen da reserva | 1 a cada 12 min | Meia-taxa: não premia ausência, mas não pune. |
| **Saque diário da reserva** | **Máx. 240/dia** | **Nossa adição.** Impede que a volta de uma ausência vire uma sessão de 3 horas. Teto real de gasto = 480/dia. |
| Recarga paga | **Nenhuma** | Sem monetização. Opcionalmente, um item raro de quest/boss. |

O limite de saque diário é a peça que HSR e WuWa não têm e que resolve o problema de forma limpa: o buffer existe para **não perder progresso**, não para permitir maratona.

### 4.3 Custos de energia

| Conteúdo | Custo | Recompensa | Runs/dia com 240 |
|---|---|---|---|
| Dungeon de recursos (EXP + ouro) | 20 | EXP de personagem, ouro | 12 |
| Dungeon de materiais de skill/runa | 40 | Materiais de skill | 6 |
| Câmara de equipamento | 60 | **Gear** | 4 |
| Boss de campo (ascensão) | 60 | Materiais de ascensão | 4 |
| Boss semanal | 60 | Materiais de skill de topo | **3/semana** (180 VC) |

Incluir desde o MVP: **fila de runs**, **clear instantâneo** para conteúdo já dominado e **run ×2 por custo ×2**.

### 4.4 Gear — resolver a RNG antes de ela existir

A frustração nº 1 dos dois jogos vale ser evitada desde o design:

- Drop **garantido** de 1 peça por run (nunca sair de mãos vazias).
- Jogador **escolhe o slot** ao entrar na Câmara (elimina metade da RNG).
- Atributo principal escolhível via item de crafting obtido em conteúdo semanal.
- RNG fica **só nos substats** — o eixo de perseguição de longo prazo.
- Sistema de reroll com custo de material, não de energia.

### 4.5 Catch-up (área onde podemos superar as referências)

1. **Bônus de Descanso (rested).** Cada dia sem jogar acumula "Descanso". As primeiras N runs após voltar rendem **drops dobrados**, consumindo o estoque. Isso substitui os eventos de 2x — mesmo benefício, **zero FOMO**, e recompensa exatamente quem precisa.
2. **Tetos semanais bancáveis.** Semanais não cumpridas acumulam por até **3 semanas**. Quem sumiu 2 semanas volta e faz 9 clears de boss em vez de perder 6.
3. **Escalonamento por progresso de conta.** Conteúdo antigo dá materiais em quantidade maior conforme o jogador avança — evita que personagens novos travem em gates antigos.
4. **Retorno automático.** 14+ dias ausente → pacote de recursos + Descanso cheio + resumo do que mudou. Sem web event, sem código, sem prazo.

---

## 5. Proposta inicial de rotina diária

**Alvo: 15–20 minutos.** (O guia do projeto fixa 15–30 min; a diária deve ficar no piso da faixa, e as semanais consomem o resto.)

| Etapa | Tempo | Conteúdo |
|---|---|---|
| 1. Coleta passiva | ~1 min | Recompensas de expedição/helper offline |
| 2. Diárias | ~5–7 min | **3 tarefas de uma lista rotativa de 6.** Recompensa fixa ao completar as 3. |
| 3. Gastar Vigor | ~7–10 min | 4–6 runs, com fila e clear instantâneo |
| 4. Loja diária (opcional) | ~1 min | Troca de moeda de dungeon |

**Regras da lista diária:**
- Sempre 6 tarefas disponíveis, exige-se 3. O jogador escolhe as convenientes.
- Tarefas descrevem **onde ir**, não **como jogar**. "Complete 1 dungeon" ✅ / "Use 5 dashes" ❌ (esta última luta contra o helper).
- Recompensa: moeda premium + materiais de upgrade.
- **Não acumula** entre dias — mas o Bônus de Descanso compensa quem faltou.

---

## 6. Proposta inicial de rotina semanal

**Alvo: 45–60 minutos**, distribuíveis em qualquer dia da semana.

| Conteúdo | Frequência | Custo | Tempo | Observação |
|---|---|---|---|---|
| **Boss semanal** | 3 clears/semana | 60 VC cada | ~10 min | Materiais de skill de topo. Acumula até 9 clears (3 semanas). |
| **Fenda/Rift (roguelite)** | Pontos semanais até um teto | 0 | ~20–25 min | Buffs, cartas, sigils, rotas. Recompensa por pontos, não por vitória. |
| **Dungeon sincronizada** | 1–2 por semana | Energia normal | ~10 min | Recompensa extra por aceitar o nivelamento. Nunca obrigatória na diária. |
| **Torre / Boss Rush** | Rotação de **4 semanas** | 0 | ~20 min | Ciclo longo, para não virar lição de casa quinzenal. |

**Regras das semanais:**
- Reset semanal em dia fixo, mas **tetos bancáveis por 3 semanas**.
- Rotações de endgame **escalonadas** entre si — nunca dois resets grandes na mesma semana.
- Recompensa **por progresso parcial**, não só por clear total (chegar ao andar 8 de 10 rende 80%).
- Nada de moeda semanal expirável.

---

## 7. Cuidados para não gerar FOMO excessivo

1. **Nenhum poder permanente atrás de janela temporal.** Eventos podem dar recursos e cosméticos; personagens, armas e sistemas ficam permanentes.
2. **Bônus de Descanso no lugar de eventos de drop dobrado.** Evento 2x cria o comportamento tóxico de estocar energia por semanas. Descanso dá o mesmo benefício a quem faltou, sem cronômetro.
3. **Sem streak de login.** Se houver recompensa de presença, que seja "20 dias em 30", não "20 dias seguidos".
4. **Tetos bancáveis** (3 semanas) — a mensagem é "você pode voltar", não "você perdeu".
5. **UI que comunica ausência de perda.** Ao voltar: "Você esteve fora 9 dias. Nada foi perdido: 1.440 de Vigor guardado, 6 clears semanais acumulados, Descanso cheio."
6. **Nenhum contador regressivo visível** fora de eventos genuinamente sazonais.
7. **Rotações longas.** 4 semanas na torre, não 2. Reduz a sensação de esteira.
8. **Conteúdo antigo permanece relevante e recompensador** (é para isso que existe o modo sincronizado).
9. **Sem ranking, sem comparação social.** Somos single-player — não há motivo para criar pressão competitiva artificial.

---

## 8. Cuidados para não permitir grind 24/7 via helper

O helper é o núcleo do projeto: ele executa repetição enquanto o jogador toma decisões. Isso significa que **qualquer fonte de progressão sem teto vira farm automatizado de 24 horas.** É o cenário WuWa/Echo levado ao extremo.

### Regras de contenção

1. **Contador, não taxa.** Nunca resolver excesso de farm reduzindo drop rate. Usar teto explícito: "as primeiras 20 mortes de elite do dia dão material; depois disso, zero". Visível na UI.
2. **Gear só de conteúdo com energia.** Sem exceção. Nenhuma peça de equipamento dropa de repetição livre.
3. **Mundo/hunt livre dropa consumíveis e vendáveis**, não materiais de progressão. Serve para diversão, exploração, coleção e bestiary — não para poder.
4. **Bestiary/Bossiary é conclusão única**, não moeda repetível. Matar 1.000 do mesmo bicho conclui a entrada e acabou.
5. **Sem loop econômico farmável.** Se ouro compra poder e ouro dropa livremente, o helper farma ouro 24h. Ouro relevante vem de dungeon com energia.
6. **Helper offline/expedição substitui a diária, não soma a ela.** Se o jogador coletar o resultado do helper offline, aquilo consome da mesma cota diária.
7. **Instância com contador de entradas por dia**, independente da energia, como cinto de segurança secundário.
8. **Tudo é contador de save, não RNG.** Auditável, testável e imune a macro/reroll.
9. **Teto explícito, nunca oculto.** Quando o teto é atingido, dizer claramente: "Limite diário atingido. Volte amanhã." Nerf silencioso quebra confiança.
10. **Roguelite (Fenda) por pontos semanais com teto.** Runs além do teto continuam liberadas — para quem gosta —, mas não geram poder.

### Teste de sanidade do design

> Se um helper rodar 24 horas seguidas, quanto poder a mais o jogador ganha em relação a alguém que jogou 20 minutos?
>
> **A resposta precisa ser: zero.** A diferença deve estar em coleção, exploração, conquistas e diversão — nunca em stats.

---

## 9. Resumo executivo

| Decisão | Escolha |
|---|---|
| Energia diária | 240 (1 / 6 min) |
| Reserva | 1440 (6 dias), meia-taxa, **saque máx. 240/dia** |
| Gear | Sempre atrás de energia; slot escolhível; RNG só em substats |
| Diária | 3 de 6 tarefas, 15–20 min total |
| Semanal | 3 bosses + Fenda + torre (rotação de 4 semanas), 45–60 min |
| Limites semanais | Bancáveis por 3 semanas |
| Catch-up | Bônus de Descanso (substitui evento 2x) |
| Retorno | Automático a partir de 14 dias, sem prazo |
| Anti-helper-24/7 | Contadores explícitos em toda fonte de poder |

**Erro principal a evitar:** o modelo de Echo do WuWa — deixar aquisição de gear fora da energia. Com helper automatizado, isso recria exatamente o grind infinito que o projeto existe para eliminar.

**Acerto principal a copiar:** a reserva de energia do HSR — perdoar ausência sem premiá-la.

---

## 10. Fontes

**Wuthering Waves**
- [Waveplate — Wuthering Waves Wiki (Fandom)](https://wutheringwaves.fandom.com/wiki/Waveplate)
- [Waveplate Recharge Rate and How to Restore — Game8](https://game8.co/games/Wuthering-Waves/archives/454091)
- [Daily Activities and Rewards — Game8](https://game8.co/games/Wuthering-Waves/archives/457261)
- [Guidebook/Activity — Wuthering Waves Wiki](https://wutheringwaves.fandom.com/wiki/Guidebook/Activity)
- [How to Farm Echoes and Echo Pity — Game8](https://game8.co/games/Wuthering-Waves/archives/454120)
- [Data Bank and Echo Farming Guide — HostedGG](https://hostedgg.com/blog/wuthering-waves-data-bank-echo-farming-guide)
- [Tower of Adversity Guide — Game8](https://game8.co/games/Wuthering-Waves/archives/453474)
- [Whimpering Wastes challenge guide — Sportskeeda](https://sportskeeda.com/esports/wuthering-waves-whimpering-wastes-challenge-guide)
- [Reprise of Tides (evento de retorno) — Wuthering Waves Wiki](https://wutheringwaves.fandom.com/wiki/Reprise_of_Tides)
- [Back to Solaris Sharing Board — Game8](https://game8.co/games/Wuthering-Waves/archives/546269)
- [Waveplates System Explained — 1v9](https://1v9.gg/blog/wuthering-waves-wuwa-waveplates-system-explained)

**Honkai: Star Rail**
- [Trailblaze Power — Honkai: Star Rail Wiki (Fandom)](https://honkai-star-rail.fandom.com/wiki/Trailblaze_Power)
- [Reserved Trailblaze Power — Honkai: Star Rail Wiki](https://honkai-star-rail.fandom.com/wiki/Reserved_Trailblaze_Power)
- [What is Reserved Trailblaze Power? — Game8](https://game8.co/games/Honkai-Star-Rail/archives/420191)
- [Trailblaze Power Explained — Icy Veins](https://www.icy-veins.com/honkai-star-rail/trailblaze-power)
- [What You Should be Doing Daily and Weekly — Icy Veins](https://www.icy-veins.com/honkai-star-rail/dailies)
- [Interastral Peace Guide / Daily Training — Honkai: Star Rail Wiki](https://honkai-star-rail.fandom.com/wiki/Interastral_Peace_Guide/Daily_Training)
- [Echo of War — Honkai: Star Rail Wiki](https://honkai-star-rail.fandom.com/wiki/Echo_of_War)
- [Game modes — Prydwen](https://www.prydwen.gg/star-rail/guides/game-modes)
- [Returning Player Guide and How to Catch Up — Game8](https://game8.co/games/Honkai-Star-Rail/archives/600195)
- [Starlit Homecoming — Honkai: Star Rail Wiki](https://honkai-star-rail.fandom.com/wiki/Starlit_Homecoming)
- [HSR 4.4 Anomaly Arbitration, Pure Fiction, Apocalyptic Shadow e Memory of Chaos — datas — Sportskeeda](https://www.sportskeeda.com/esports/honkai-star-rail-hsr-4-4-anomaly-arbitration-pure-fiction-apocalyptic-shadow-memory-chaos-release-dates)
- [Memory of Chaos, Pure Fiction & Apocalyptic Shadow — ciclo de endgame — Gachia](https://gachia.com/en/starrail/guides/endgame-cycle-guide)
- [Daily and Weekly Checklist — HostedGG](https://hostedgg.com/blog/honkai-star-rail-daily-weekly-checklist-guide)

> **Nota sobre precisão:** valores de cap, regeneração e custo foram cruzados entre pelo menos duas fontes. Cadências de endgame e conteúdos de versão recente (Anomaly Arbitration, Whimpering Wastes) mudam a cada patch — reconferir antes de usar como base numérica definitiva.
