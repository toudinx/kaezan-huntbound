# W04 — WAKFU: dungeons moduladas, level sync e gear sync

> Pesquisa de referência para **Kaezan Huntbound**.
> Escopo: como o WAKFU mantém conteúdo antigo relevante via *modulação de nível*, o que dá certo, o que dá errado, e que princípios transferir para um RPG **single-player** com sessões curtas, energia/resina e resets diários/semanais.
> Nenhum número do WAKFU deve ser tratado como regra final do nosso jogo.

---

## 0. Resumo executivo

O WAKFU resolve o problema de "conteúdo antigo morre" com **três sistemas empilhados**, e é importante entender que são *três*, não um:

1. **Modulação de nível (ALS — Adjustable Level System)** — o jogador abaixa voluntariamente o próprio nível. Muda stats, magias e equipamento.
2. **Stasis** — um dial de dificuldade dentro da dungeon, independente do nível, que multiplica dano/HP dos monstros e as recompensas.
3. **Modo Competitivo** — um *flag* na entrada que exige que todos estejam no nível exato da dungeon, e em troca dá o melhor multiplicador de drop, baús mensais e entrada no ladder.

A lição central não é o sync em si. É esta: **o sync só é jogado quando existe recompensa que só existe sincronizada.** No WAKFU isso é literal — Boss Ultimes e dungeons "3 jogadores" *só podem ser enfrentados no nível do conteúdo*, e as pedras de donjon / sublimações (os melhores encantamentos do jogo) só caem em modo modulado/competitivo. Sem essa exclusividade, o modo livre sempre ganha, porque é mais rápido. É exatamente o que acontece em Guild Wars 2, onde o downscale existe mas o conteúdo antigo continua vazio porque a recompensa não acompanha.

A segunda lição é sobre **atrito**. A maior parte da reclamação histórica da comunidade WAKFU não é com o conceito, é com o custo de operação: 13 faixas de nível × (página de equipamento + página de magias + página de aptidões), com apenas 3 páginas grátis de cada e o resto vendido por Ogrines, mais o espaço de inventário para guardar 13 sets. Um jogador resumiu: *"3 páginas de equipamento para cobrir 13 faixas"*. Num jogo single-player esse custo é 100% eliminável — e eliminá-lo é provavelmente a maior vantagem competitiva que Huntbound tem sobre a referência.

A terceira lição é sobre **direção do scaling**. O WoW percorreu o caminho inverso: em 11.0.5 abandonou o downscale do jogador no Timewalking e passou a *subir a dungeon até o jogador*. Isso mata exploits de gear legado e agrada o público casual, mas apaga o sabor de "revisitar a build antiga". Huntbound deve escolher conscientemente: nós queremos o sabor, então **downscale**, mas com salvaguardas contra o efeito "subir de nível me deixou mais fraco" que assombra GW2.

---

## 1. Como o WAKFU faz

### 1.1 Modulação de nível (ALS)

**O que é.** A partir do nível 51, o personagem pode reduzir manualmente o próprio nível a qualquer momento. Um personagem 117 pode se pôr em 20, 50 ou 95.

**Faixas.** Historicamente a modulação era travada em degraus fixos, que coincidem com os tetos das faixas de conteúdo: **20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185** (e depois 200, 215, 230 conforme o cap subiu). O anúncio oficial da 1.49 lista "98" onde a comunidade e as faixas de dungeon indicam 95 — trate 95 como o valor correto e 98 como erro de redação do anúncio. Guias atuais descrevem a modulação como livre para qualquer nível inferior, ou seja, o sistema afrouxou com o tempo.

**O que é modulado.** Três coisas, e cada uma tem um caminho automático e um manual:

| Componente | Modo automático | Modo manual (build própria) |
|---|---|---|
| **Aptidões / características** | O jogo redistribui em um preset genérico "bom para qualquer classe" (basicamente masteria elementar) | Página de aptidões criada pelo jogador para aquele nível |
| **Magias / deck** | Recompõe o deck a partir da build atual, **removendo as magias travadas no novo nível** | Página de magias própria |
| **Equipamento** | Remove todo o equipamento e coloca **um "emblema" único** que concede as características médias de um personagem daquele nível | Página de equipamento com itens reais da faixa |

**Automatização de dungeon.** Na porta de uma dungeon abaixo do seu nível existe uma seta para modular automaticamente. Ao entrar em grupo, todos os membros são forçados à mesma faixa. Exemplo oficial: dois jogadores 200 entrando na Abandoned Scarapit (nível 22) são movidos para a faixa 35. Dentro da dungeon é possível trocar de build livremente — **desde que seja uma build do mesmo nível modulado** (inclusive para trocar antes do boss).

**XP.** Este é o ponto mais subestimado do sistema. O XP ganho em conteúdo modulado é multiplicado por um fator baseado no **nível real** do jogador. A fórmula documentada pela comunidade é `XP × (nível_real / nível_modulado)^c`, com `c` elevado de 1.5 para 2 num patch corretivo. O efeito prático é o que um guia francês descreve como o melhor benefício do sistema: *"Você é nível 187 mas não gosta das dungeons da faixa 185? Volte para o nível 80, bata em Excarnus e pegue um XP enorme fazendo o que você gosta."*

### 1.2 Stasis — o dial de dificuldade

Sistema separado do nível. O líder do grupo escolhe a dificuldade na porta; dentro da dungeon dá para **abaixar** entre combates, mas **não dá para aumentar** depois do primeiro grupo de monstros.

**Histórico da escala** (importante, porque mostra o jogo corrigindo a si mesmo):

- **2016 (1.56)** — lançamento com **50 níveis** em 5 faixas nomeadas: Rapid (1–10), Normal (11–20), Difficult (21–30), Expert (31–40), Master (41–50). Desbloqueio progressivo: precisava limpar em 20 para liberar 21–30, etc.
- **2018 (revamp)** — as curvas foram suavizadas. O diagnóstico oficial é ótimo: *"a dificuldade não pode vir só de os monstros sobreviverem"*. HP passou a começar mais alto e crescer menos exponencialmente; dano levemente reduzido no topo; recompensa aumentada. Modificadores de combate foram reescritos para serem **bônus opcionais** em vez de penalidades a contornar.
- **2019 (1.63)** — modo normal passou a ter 50 níveis (antes 20), **todos os pré-requisitos de desbloqueio foram removidos** (podia escolher qualquer Stasis direto), e as raridades passaram a ser gatilhadas por limiar: Legendary/Epic/Relic só a partir de Stasis 21.
- **Hoje** — a interface trabalha com uma escala curta (documentada como ~1–10, valor base 2). A escala longa foi abandonada na prática.

Bônus máximos documentados na 1.63, com Stasis 50:

| | Normal | Competitivo |
|---|---|---|
| XP | +200% | +600% |
| Loot | +200% | +600% |

Guias atuais mostram a mesma assimetria na escala curta: no exemplo do donjon Moogr em Stasis 5, **+188% de drop em modo normal contra +400% em competitivo modulado**.

Outro detalhe relevante: **Mimics** (baús-monstro que aparecem aleatoriamente no combate e fogem com o loot se não forem mortos em ~3 turnos) têm chance de aparecer **+1% por nível de Stasis**. Dificuldade gerando *eventos de loot*, não só números maiores.

### 1.3 Modo Competitivo

Um checkbox na entrada. Ativá-lo significa: **todos no nível da dungeon, via ALS**. Em troca:

- multiplicador de drop muito maior que o modo normal;
- inscrição no **ladder** daquela dungeon;
- **baús mensais**: 1 baú por nível de Stasis concluído em competitivo nos últimos 30 dias, por dungeon. Exemplo real de um guia: Piou modulado 35 em Stasis 3 + Chacha modulado 20 em Stasis 8 = 3 baús Piou + 8 baús Chacha, entregues na virada do mês, contendo itens da dungeon e **éclats** (recurso de encantamento);
- em modo competitivo, o jogador **não pode exceder o nível da dungeon** — é por isso que a curva de recompensa é maior que a do modo normal, apesar da curva de poder dos monstros ser idêntica.

### 1.4 Conteúdo que *exige* modulação

Aqui está o motor real de adoção:

- **Boss Ultimes** — os melhores equipamentos do jogo. Um Boss Ultime nível 95 só pode ser enfrentado por um time de nível **95 no máximo**. Para um personagem de nível cap, modular não é opcional: é a única porta.
- **Dungeons "3 jogadores"** — itens muito valorizados, também só no nível.
- **Pedras de donjon** — recurso raro que só cai em modo modulado, usado para craftar **sublimações** de itens relíquia/épicos (valiam de 2 a 9 milhões de kamas no servidor Pandora à época do guia).
- **Estelas de donjon** — na sala do boss, o jogador escolhe de **1 a 4 mecânicas extras** que tornam o combate mais difícil; em troca, desbloqueia o drop da maior parte das sublimações do jogo. É, essencialmente, o Pact of Punishment do Hades acoplado a uma tabela de loot.
- **Planos de Espadas de Nação** — exigem estar modulado **e** Stasis 3+ em dungeons de nação, e fazem aparecer "Mimics de Nação".
- Missões da linha principal de Nação em certo ponto **obrigam** a modular para obter um item — decisão criticada, ver §3.

### 1.5 Ranking / sistema competitivo

O **Dungeon Leaderboard** (2017) é o sistema mais bem documentado, e o devblog é explícito sobre a intenção: *"dar valor real às Stasis Dungeons dando motivação forte para tentar os níveis mais altos"*, porque na prática *"a dificuldade escolhida costuma ser um meio-termo entre XP, bônus de loot e tempo gasto, o que sobra pouco espaço para os níveis 21+"*. Ou seja: o ladder existe porque **o incentivo econômico sozinho não levava ninguém à dificuldade alta**.

Mecânica:

- um ranking por dungeon; o personagem entra com o **melhor** resultado, mesmo que tenha rodado com times diferentes;
- **critérios de desempate, nesta ordem**: nível de Stasis → total de turnos da dungeon inteira → turnos no combate do boss → data de entrada no ladder ("first come, first served");
- times inteiros ocupam a mesma posição: os 6 primeiros são "1º", os 6 seguintes são "7º";
- **duas tabelas**: sazonal (resetada, é a que dá recompensa) e permanente/contínua (nunca resetada, é só glória). A permanente guarda só o top 1.000 por limitação de RAM;
- recompensas: *pós* (crafting) pelo melhor score pessoal, com raridade e quantidade definidas pelo Stasis atingido; e *Mystery Boxes* pelo ranking final da temporada — 5 para o 1º lugar, 3 para 2º–30º, 1 para 31º–100º. Guias atuais falam em bolsas de éclats para as 13 melhores equipes, ou seja, até 78 jogadores por dungeon;
- **conquistas por faixa de Stasis**: Difficult (21–30) = 20 tokens, Expert (31–40) = 40 tokens, Master (41–50) = 80 tokens, cada uma valendo também XP equivalente a N monstros do nível real do jogador;
- **coroas** na lista de dungeons como objetivo pessoal fora do ladder. O devblog explica por que a coroa de ouro é em Stasis 21+ e não mais alto: *"queríamos evitar o problema de uma barra de progresso que não pode ser completamente preenchida"*.

Escala operacional citada: mais de **20.000 dungeons por dia** no servidor, e a distribuição mensal podia premiar dezenas de milhares de personagens com até 65 itens cada — o que os forçou a mover as recompensas para um servidor lógico separado.

---

## 2. O que funciona

**1. Exclusividade de recompensa é o motor.** Boss Ultimes travados no nível, pedras de donjon só em modulado, sublimações via estelas. Nada disso é "bônus"; é conteúdo que não existe fora do sync. É a diferença entre WAKFU (onde modular é *"uma parte enorme do jogo"*) e GW2 (onde o downscale existe e o conteúdo antigo continua vazio porque *"não há razão para voltar a uma zona de nível baixo, as recompensas não escalam"*).

**2. Multiplicador de XP pelo nível real.** Desacopla *poder* de *recompensa*. Você fica fraco, mas ganha como um jogador do seu nível verdadeiro. Isso transforma "conteúdo antigo" em uma rota de progressão legítima e resolve o problema de *"só existe um spot HL da moda"*. É o item que a comunidade mais elogia.

**3. Dial de dificuldade separado do nível.** Stasis e ALS são ortogonais: um jogador de nível baixo pode subir Stasis numa dungeon do seu nível; um jogador de nível alto pode modular e subir Stasis. Duas alavancas, uma matriz de experiências, custo de autoria quase zero.

**4. Modificadores escolhidos pelo jogador com loot amarrado.** As estelas (1–4 mecânicas extras → desbloqueia sublimações) são a melhor peça do sistema moderno. O jogador *opta* pela dificuldade, sabe exatamente o que ganha, e a dificuldade vem de **mecânica**, não de inflação de HP. Convergente com o Pact of Punishment do Hades, onde cada condição soma Heat e as *Bounties* são rastreadas **por arma**, então cada configuração tem sua própria escada de recompensa.

**5. Modificadores como bônus, não como punição.** Depois do revamp de 2018, os modificadores de combate passaram a *dar vantagem a quem joga em torno deles* (ex.: colidir com o monstro marcado dá +1 PM ao time). Aleatoriedade que cria decisão, não imposto.

**6. Reconhecer que HP não é dificuldade.** Diagnóstico literal do revamp: combates estavam ficando longos demais, *"a dificuldade não pode vir só de os monstros sobreviverem"*. Curva de HP achatada, curva de recompensa levantada.

**7. Recompensa em token em vez de drop direto.** Um jogador da época notou que isso *"ajuda os jogadores a conseguirem itens e minimiza o efeito na economia"*, e que separar as diárias em 3 faixas de nível **força a distribuição** em vez de todo mundo achar a dungeon mais fácil e repetir só ela.

**8. Remoção dos pré-requisitos de Stasis (1.63).** Obrigar a limpar em 20 para liberar 21+ era um imposto de repetição. Deixar o jogador escolher direto a dificuldade que quer é quase sempre a decisão certa.

**9. Remoção das chaves de dungeon.** Feito para *"reduzir as punições sofridas em caso de derrota"* e permitir testar as dungeons mais difíceis sem arrependimento. Correto: se você quer que o jogador experimente dificuldade alta, o custo de falhar tem que ser baixo.

**10. Modulação dá utilidade a gear antigo.** *"Alguns equipamentos são basicamente inúteis porque no processo de obtê-los você sobe de nível o bastante para usar outra coisa"* — a modulação conserta isso. Só funciona, porém, se houver onde guardar (ver §3).

---

## 3. O que não funciona

**1. O custo de operação mata a adoção.** O problema número um, repetido por anos:

- 13 faixas de nível contra **3 páginas grátis** de equipamento, 3 de magias, 3 de aptidões. Páginas extras custavam Ogrines (2.000 / 1.500 / 3.000 na época); resetar aptidões custava mais. Um jogador contabilizou *"20€ por personagem"* e ainda ficava sem cobrir tudo, e outro reclamou de não ter onde guardar 13 sets.
- Resultado: os jogadores caem no build automático, e o build automático é ruim (abaixo).
- Resultado secundário e pior: a dificuldade alta modulada vira **conteúdo de elite por tempo/dinheiro investido**, não por habilidade. A troca no fórum é explícita — um veterano defende o sistema com *"mas esse é o objetivo!"*, e a resposta é *"a gente até queria fazer, mas é impossível sem ter tudo que você tem"*.

**2. O build automático desfigura o personagem.**

- O **emblema** dá características médias genéricas. Não tem variante melee/distância/tank. Classes que dependem de um stat específico (Osamodas precisa de Controle) ficam inviáveis. *"Ele é REALMENTE bom por volta do nível 95, mas despenca depois de 125."*
- A **redistribuição de aptidões** ignora a intenção da build: um jogador que tinha resistência maximizada + barreira + %HP era rebaixado para só %HP, "o menos importante dos três".
- O **deck automático corta magias por ordem de slot**. Se sua magia ou passiva importante está num slot tardio, ela some. E não dá para reorganizar dentro da dungeon modulada.
- Efeito de mercado: um jogador montou um set nível 20 por ~3.000 kamas que batia o emblema em quase tudo (+2 PA, +70 masteria melee, mais HP, mais resistência, mais crítico). Ou seja, **o caminho sem atrito é significativamente pior que o caminho com atrito** — a pior combinação possível.

**3. Tempo é o custo real, e o sync perde.** Relato direto: rodar Castuc modulado *"levava pelo menos o dobro do tempo"*, ao ponto de *"a gente teria rodado uma dungeon da lua (conteúdo do nosso nível) mais rápido que isso"*. Se a atividade sincronizada não é competitiva em **recompensa por minuto**, o modo livre vence sempre, e o sistema vira um museu.

**4. Fronteira de faixa é explorável.** Um jogador nível 190 modulando para 185 *"não perde quase nada"* — com bônus de guilda e profissão dá para equipar itens 188 numa build 185 — e assim colhia tokens de faixa alta a custo zero. Ou seja: **quanto mais perto do teto da faixa você está, mais barato é o sync e mais alto é o retorno**. Degraus largos criam esse gradiente.

**5. Espiral de farm de token.** O próprio time reconheceu que a quantidade de tokens em níveis altos gerou uma espiral de farm indesejada. A correção foi **limite diário**: o Modulox Token era 1 por dia, exigia que *todos* do grupo estivessem modulados, e ficava atrás de uma quest desbloqueada só no nível 66. A correção funcionou, mas gerou a reclamação seguinte: *"quantidade limitada de tokens por dia e participação só depois do nível 66"*.

**6. Distorção econômica.** Demanda por gear modulado inverte a curva de preços: *"a gente já vê itens 80 mais caros que itens 200"*, sendo que farmar um item 100 leva 3–5 horas e um 200 é incomparavelmente mais difícil. Um MMO sofre com isso; um single-player não tem mercado, mas **tem economia interna de craft e materiais**, e o mesmo efeito aparece se materiais de faixa baixa virarem gargalo de endgame.

**7. Dungeon fácil + recompensa escalada = todo mundo na dungeon fácil.** Argumento levantado contra escalar dungeons para cima: *"as dungeons de nível baixo são muito mais fáceis em termos de estratégia; se dropassem itens de todos os níveis, todo mundo iria farmar lá. A comunidade inteira acabaria em Astrub."* É por isso que o WAKFU manteve a recompensa amarrada à faixa da dungeon, e não ao nível do jogador.

**8. O sentimento anti-progressão.** A crítica mais visceral, e ela é sobre *fantasia de poder*, não sobre balanceamento: *"eu não joguei o ano inteiro para acabar com passivas a menos, 8 PA e 30% de resistência — se fosse assim eu criava uma conta nova."* É a mesma queixa que persegue o GW2 (*"toda vez que você sobe de nível, você perde stats nas áreas rebaixadas"*) e o oposto do problema do ESO com One Tamriel (*"battle leveling remove o desafio... com personagens de nível baixo você destrói tudo sem dificuldade"*). Os dois extremos falham; a diferença está em **quem escolhe**.

**9. Complexidade agregada afasta.** *"Modulado em dungeon mas também nos Boss Ultimes, com todo um sistema ultra complicado de build/magia/equipamento/aptidão... para um jogador novo entender tudo isso deve ser bem divertido. Eu não entendo mais nada nesse jogo, que quis se diversificar demais em assuntos demais."*

**10. Sync obrigatório em conteúdo narrativo.** Uma quest da linha de Nação exigia deslevelar para obter um item. Transformar um sistema opcional de dificuldade em pedágio de progressão narrativa é a maneira mais rápida de gerar rejeição.

**11. Bugs de estado.** O sistema mexe no nível do personagem, e isso vazou: threads de "permanentemente preso no nível 20 depois de usar dungeon modulada", decks de magias esvaziando ao relogar, dungeons ocasionalmente não entregando token. **Sync é uma máquina de estado, e máquinas de estado que alteram o personagem precisam ser reversíveis por construção.**

**12. Escala de dificuldade longa demais.** 50 degraus é ilusão de escolha. Na prática *"a maioria acaba spammando Stasis 1–10 porque é mais rentável e seguro"*, e mesmo o devblog do ladder admite que a escolha era *"um meio-termo entre XP, loot e tempo, o que sobra pouco espaço para 21+"*. A interface atual voltou a uma escala curta.

---

## 4. Comparações úteis com outros jogos

| Jogo | Mecanismo | O que ensina |
|---|---|---|
| **FFXIV** | *Level Sync* (só para baixo) + *item level sync*: gear acima do teto tem os stats **reduzidos**, não removido. Algumas duties têm um cap de ilvl adicional. Grupos pré-formados podem entrar **unsynced** e limpar rápido. | O modelo mais próximo do que Huntbound quer: **dois modos explícitos** (livre e sincronizado) e sync por *escalonamento de item*, não por confisco de item. Zero atrito de preparação. |
| **WoW — Timewalking** | Até 11.0.4 rebaixava o jogador; em **11.0.5 inverteu** e passou a subir a dungeon ao nível do jogador, igual ao Chromie Time. Loot sai com tag "Timewarped" no ilvl do jogador; badges vão para um vendor sazonal. | A inversão eliminou de vez a otimização de gear legado — e junto com ela, as comunidades que viviam disso. **Escolha consciente: sabor vs. robustez.** Também mostra o padrão de moeda sazonal + vendor, que é limpo. |
| **Guild Wars 2** | Downscale automático e permanente em todo o mapa aberto. | Contraexemplo de incentivo: o sync existe, é bem feito, e **o conteúdo antigo continua morto** porque as recompensas não escalam. Prova que sync sem recompensa exclusiva é decoração. Também gera a queixa "subir de nível me enfraquece". |
| **ESO — One Tamriel** | Todo o mundo aberto nivelado junto, sem escolha de dificuldade. | O extremo oposto: acessibilidade total, desafio zero. *"Remove o desafio."* Nivelamento sem **dial** é achatamento. |
| **Dofus (Ankama) — Idols** | Ídolos craftáveis e equipáveis em 6 slots que **buffavam os monstros** em troca de XP/loot; penalidade se o gap de nível fosse grande demais; bônus aplicado ao grupo inteiro para evitar o problema individualista de Sabedoria/Prospecção. | **Removido na 2.68** e substituído por *Desafios*: escolhidos na fase de preparação do combate, sem craft, sem inventário, com cada jogador optando individualmente se quer o bônus em XP ou em loot. A lição é direta: um sistema de auto-dificuldade **baseado em itens** vira imposto de inventário e craft; o mesmo sistema como **escolha contextual gratuita** sobrevive. |
| **Hades — Pact of Punishment** | Condições opcionais somam *Heat*; cada boss morto no Heat-alvo dropa recurso; o alvo sobe após a vitória. **Bounties são por arma**, e você só resgata o menor Heat ainda não completado. | O melhor modelo single-player de escada de dificuldade: progressão **pessoal**, granular, com "próximo alvo" sempre visível, e recompensa que não se acumula retroativamente (matar em Heat 5 não pula os degraus 2, 3, 4). Resolve o ranking sem precisar de população. |
| **Slay the Spire — Ascension** | 20 níveis de dificuldade, **por personagem**, cada um desbloqueado ao vencer o anterior. | Mesma família: escada longa mas **sequencial e por eixo**, o que gera meta pessoal clara sem inflar o espaço de escolha na hora. |

---

## 5. Proposta de princípios para Huntbound

Nove princípios, em ordem de importância. Se algum item do design brigar com um destes, o princípio ganha.

**P1 — O sync não é a recompensa; ele é o pedágio de acesso a uma recompensa que não existe fora dele.**
Se tudo que o Modo Sincronizado dá é "mais do mesmo, um pouco mais", ele será ignorado. Precisa haver pelo menos uma categoria de item/material/boss que **só** aparece sincronizado.

**P2 — Nível real deve escalar recompensa, nunca poder, dentro do sync.**
Copiar o multiplicador de XP do WAKFU. Você entra fraco, mas ganha como quem você é. Isso é o que impede o sentimento de "progredir me pune" sem quebrar o desafio.

**P3 — O modo livre nunca é castigado; ele só é limitado no teto.**
Modo Livre continua sendo a forma correta de fazer a diária em 6 minutos num dia corrido. Ele dá moeda, materiais comuns e conta para objetivos. O que ele **não** dá é a faixa de raridade alta e os materiais exclusivos. Isso respeita a promessa de "sessões curtas".

**P4 — Atrito zero de preparação. Este é o nosso diferencial sobre o WAKFU.**
Loadouts ilimitados e gratuitos. Loadout por faixa gerado automaticamente e editável. Guarda-roupa que não consome inventário. Um clique na porta da dungeon. Se o jogador precisar "se preparar" por 10 minutos, o sistema morreu — foi o que aconteceu lá.

**P5 — Dificuldade vem de mecânica, não de HP.**
Diagnóstico do próprio WAKFU. Modificadores que mudam *como* se joga, não quanto tempo leva. Combate longo é o inimigo de sessão curta.

**P6 — Poucos degraus, todos significativos.**
~5 faixas de nível e ~5 degraus de dificuldade. 13 × 50 é o erro que o WAKFU levou anos corrigindo.

**P7 — Escolha explícita com preview do resultado.**
Uma tela na porta que mostra, antes de entrar: como sua build fica, qual a dificuldade, e **exatamente** o que muda na recompensa. O WAKFU só fez isso na 1.63, três anos depois.

**P8 — Sync é reversível por construção.**
O sync é uma *view* de combate calculada sobre o personagem real; nunca uma mutação persistida. Se o jogo fechar no meio, o personagem volta intacto. Os bugs de "preso no nível 20" do WAKFU vieram exatamente de tratar isso como mutação.

**P9 — Nunca obrigatório fora do seu próprio loop.**
Nenhuma quest de história, nenhum gate de progressão principal exige sync. O sync é uma trilha paralela opcional com economia própria.

---

## 6. Opções de sync de stats

Cinco desenhos possíveis, do mais simples ao mais fiel.

### A. Preset canônico ("emblema" do WAKFU)
Substitui os stats por um template fixo da faixa, eventualmente por vocação.

- **Prós:** balanceamento perfeito e determinístico; setup zero; testável.
- **Contras:** apaga a identidade da build. Foi a maior reclamação do WAKFU; genérico demais para classes com stat crítico.
- **Uso recomendado:** oferecer como opção "Preset" para quem não quer pensar, **nunca** como único caminho.

### B. Downscale proporcional — **recomendado como padrão**
Mantém a *forma* da build e reescala as magnitudes para o orçamento da faixa. Se você é 70% dano / 20% resistência / 10% crítico no nível 100, continua sendo isso no nível 20, com os valores absolutos de um nível 20 bem equipado.

- **Prós:** preserva identidade e decisões do jogador; setup zero; um só formulário para todo o jogo; é a sugestão que a própria comunidade do WAKFU fez em 2016 e que nunca foi implementada.
- **Contras:** precisa de um "orçamento de poder por nível" bem definido; builds hiperespecializadas podem cair fora de curva.
- **Detalhe:** aplicar o downscale sobre o **total efetivo** (base + equipamento + runas), não sobre cada fonte isoladamente.

### C. Cap por stat (soft cap)
Cada stat individualmente limitado ao máximo alcançável na faixa; o que estiver abaixo passa intacto.

- **Prós:** trivial de entender e implementar.
- **Contras:** um personagem de nível alto estoura *todos* os caps e vira "best-in-slot perfeito da faixa" — mais forte que qualquer jogador legítimo do nível.
- **Uso recomendado:** como um **tier intermediário** de sync ("Sync Leve"), com recompensa também intermediária. Cobre o caso "quero o desafio mas hoje só tenho 15 minutos".

### D. Orçamento de pontos
O jogador recebe um total de "pontos de poder" da faixa e distribui.

- **Prós:** profundidade máxima; espaço de otimização real; ótimo para ladder.
- **Contras:** é uma tela inteira de UI e uma segunda metaprogressão. Viola P4 para a maioria dos jogadores.
- **Uso recomendado:** modo "Autoral", opt-in, para quem quer competir no tempo/turnos.

### E. Rollback verdadeiro de nível
Re-simular o personagem no nível N com as escolhas que ele teria feito.

- **Prós:** o mais fiel.
- **Contras:** exige histórico completo de build ou uma reconstrução heurística; é uma máquina de estado grande; viola P8. **Rejeitar.**

### Sync de habilidades / runas — regra transversal
Independente da opção escolhida acima, o WAKFU errou feio aqui e o conserto é barato:

- habilidades são filtradas por **nível de desbloqueio explícito**, nunca por ordem de slot;
- o jogador monta e **salva um deck por faixa**, uma vez, e ele persiste;
- se o deck salvo ficar inválido após um patch, avisar na porta — não cortar em silêncio;
- runas/consumíveis seguem a mesma regra do equipamento (§7).

---

## 7. Opções de sync de equipment

### 1. Set emprestado ("emblema")
Sem equipamento próprio; um item único concede as stats médias.

- **Prós:** atrito zero absoluto, zero dependência de coleção.
- **Contras:** mata a fantasia de gear, que é metade do RPG; e no WAKFU era mensuravelmente pior que um set barato montado à mão.
- **Uso:** fallback para quando o jogador não tem nada da faixa. Nunca o padrão.

### 2. Cap de item level (FFXIV)
Só entra item com ilvl ≤ teto da faixa; o resto é bloqueado.

- **Prós:** simples e honesto.
- **Contras:** exige que o jogador **possua** gear da faixa. No WAKFU isso significou 13 sets guardados — o gargalo que quebrou o sistema.

### 3. Downscale do item no lugar — **recomendado como padrão**
O item continua equipado; seus stats são recalculados como se ele fosse um item daquela faixa. Nome, arte, afixos e efeito único preservados; magnitudes recalculadas pela curva global de poder por nível.

- **Prós:** atrito zero, mantém a fantasia ("minha espada favorita continua sendo minha espada"), e o jogador não precisa guardar nada.
- **Contras:** efeitos únicos precisam de retuning individual quando não são numéricos (ex.: "concede um turno extra"). Solução: marcar esses efeitos como *level-locked* e desativá-los abaixo da faixa em que foram desenhados, mostrando isso no preview.
- **Pré-requisito arquitetural:** itens precisam ser autorados como **(template + nível)**, não como entradas fixas de tabela. Se isso não for decidido antes da produção de conteúdo, o sync de equipamento se torna inviável depois. **Esta é a decisão mais cara de reverter em todo o documento.**

### 4. Restrição de slots
Menos slots equipáveis nas faixas baixas.

- **Prós:** modela bem a sensação de "eu era pobre no nível 20".
- **Contras:** interage mal com sets/conjuntos; irritante.
- **Uso:** só como parte de um modificador opcional de dificuldade, nunca automático.

### 5. Modo "Autêntico" (gear nativo da faixa) — **opt-in com bônus**
Só entra item cujo nível original é ≤ o teto da faixa. Nada é escalado.

- **Prós:** é o modo que dá **valor real à coleção antiga** — exatamente o que os jogadores de WAKFU citaram como o melhor efeito colateral (*"a modulação dá um propósito para equipamento velho"*). É onde o ladder pessoal deve viver.
- **Contras:** exige coleção e armazenamento — mas em single-player isso custa uma tabela, não dinheiro.
- **Regra:** guarda-roupa ilimitado e fora do inventário, senão vira o problema do WAKFU.

### Recomendação combinada

```
Modo Livre            → sem restrição
Sync Leve (opção C)   → cap por stat, gear intacto
Sync Padrão (B + 3)   → downscale proporcional + itens recalculados na faixa
Sync Autêntico (B + 5)→ downscale + só gear nativo da faixa   [+bônus de recompensa]
```

Quatro linhas, uma escolha, um preview. O jogador que não quiser pensar clica em "Sincronizar" e cai no Padrão.

---

## 8. Faixas de level

O WAKFU usa **degraus de 15 níveis** (20/35/50/65/80/95/110/125/140/155/170/185/200/215/230) — 15+ faixas, e a comunidade lista isso explicitamente como o custo insustentável do sistema. Não copiar.

Assumindo **cap de nível 100** para Huntbound (consistente com o exemplo do briefing: personagem 100, dungeon 20), a proposta é **5 faixas de 20 níveis**, ancoradas no teto:

| Faixa | Intervalo | Nível de sync | Papel narrativo/mecânico |
|---|---|---|---|
| **T1** | 1–20 | 20 | Fundamentos: kit básico, sem runas avançadas |
| **T2** | 21–40 | 40 | Primeiras interações de kit; primeiro boss "de verdade" |
| **T3** | 41–60 | 60 | Kit completo da vocação |
| **T4** | 61–80 | 80 | Otimização; builds alternativas viáveis |
| **T5** | 81–100 | 100 | Endgame nativo (sem sync) |

**Regra geral, independente do cap:** `número de faixas ≈ 5`, `largura = cap / 5`. Se o cap subir para 150 numa expansão, a largura vira 30 — **não** adicione faixas. O custo do sistema é linear no número de faixas (loadouts, tabelas de loot, tuning, UI, testes) e o valor é decrescente.

**Sync sempre para o teto da faixa da dungeon.** Uma dungeon de nível 12 sincroniza para 20, uma de nível 34 sincroniza para 40. Simplifica tudo e é o que o WAKFU faz.

**Mitigação do exploit de fronteira (§3.5).** No WAKFU, um 190 modulando para 185 quase não perde nada. Com faixas de 20 o gradiente é pior ainda, então: **a recompensa exclusiva de uma faixa exige que o jogador esteja *acima* da faixa** (personagem nível 41+ para colher os exclusivos de T1/T2), e o multiplicador de recompensa usa `nível_real / nível_sync` com **teto** — sugestão de ~3× — para que a diferença entre um 45 e um 100 rodando T1 seja de grau, não de ordem de magnitude. Sem teto, você recria a espiral de farm que a Ankama teve que estancar com limite diário.

---

## 9. Recompensas

Três eixos independentes. A regra que amarra tudo: **cada eixo controla uma coisa diferente**, para que o jogador consiga prever o que ganha antes de entrar.

### Eixo 1 — Modo (livre vs. sincronizado): controla **raridade máxima**
Copiando o limiar de raridade da 1.63 do WAKFU, que é um mecanismo limpo:

| | Modo Livre | Sync Leve | Sync Padrão | Sync Autêntico |
|---|---|---|---|---|
| Comum / Incomum | ✔ | ✔ | ✔ | ✔ |
| Raro | ✔ | ✔ | ✔ | ✔ |
| Épico | — | ✔ | ✔ | ✔ |
| **Lendário / material exclusivo** | — | — | ✔ | ✔ |
| Bônus de recompensa | — | +25% | +60% | +100% |

### Eixo 2 — Dificuldade ("Selos"): controla **quantidade e materiais específicos**
Substituto do Stasis. **Máximo 5 degraus.** Cada degrau é um *modificador nomeado* que o jogador escolhe, não um multiplicador anônimo de HP — herda o melhor das estelas do WAKFU e do Pact of Punishment do Hades:

- cada Selo tem um efeito mecânico claro (ex.: "inimigos ganham uma reação ao serem empurrados", "o boss invoca a cada 3 turnos", "sem regeneração fora de combate");
- **cada Selo está amarrado a um material específico** — o jogador que quer o material X sabe qual Selo ativar. Isso é infinitamente mais legível que "Stasis 27 dá +54% de loot";
- pelo menos um Selo por dungeon deve *dar vantagem a quem joga em torno dele* (lição do revamp de 2018), não só punir;
- **nada de inflação de HP como fonte primária de dificuldade** (P5).

### Eixo 3 — Nível real: controla **XP e progressão de conta**
`XP = XP_base_da_faixa × min(nível_real / nível_sync, 3)`. É o que faz T1 continuar sendo uma rota de leveling legítima no nível 90 — o benefício que a comunidade WAKFU mais elogia. O teto de 3× é nosso, para evitar a espiral de farm.

### Exclusivos que só existem sincronizado (P1)
Escolher **um ou dois**, não todos:

1. **Bosses travados na faixa** — o análogo direto dos Boss Ultimes, e o incentivo mais forte que o WAKFU tem. Um boss de T2 que **só** pode ser enfrentado sincronizado em T2, dropando um componente de craft de endgame. Isso sozinho garante que o sistema seja jogado.
2. **Materiais de encantamento/runa** (análogo das pedras de donjon e sublimações) que só caem com Selo ativo.
3. **Cosméticos e títulos** por marco de dificuldade.

### O que evitar nas recompensas
- **Zoo de moedas.** O WAKFU tem tokens por faixa e "machines" por região. Para Huntbound: **uma moeda global** + **um material por faixa**. Ponto.
- **Conversão livre entre faixas.** Se o token de T1 vira token de T5, T1 vira o farm ótimo (e a dungeon fácil é sempre a mais rápida — o argumento do fórum francês sobre "a comunidade inteira em Astrub"). Conversão só *para cima*, com perda, e com limite semanal.
- **Recompensa retroativa por pular degraus.** Modelo Hades: limpar no Selo 4 não entrega os prêmios dos Selos 1–3. Preserva o valor de cada degrau.

---

## 10. Relação com diárias / semanais / energia

Onde o sistema encosta no loop de sessão curta — que é a promessa central do projeto.

**Energia (resina) é a moeda de tempo; o sync não pode ser taxado duas vezes.**
Regra: **o custo em energia é o mesmo nos dois modos.** O que muda é o retorno. Consequência desejada:

- dia corrido → Modo Livre, 6 minutos, gasta a energia, cumpre a diária, ganha o suficiente;
- dia com tempo → Modo Sincronizado, 20 minutos, **mesma energia**, retorno muito maior.

Isso torna o sync a jogada *eficiente* sem torná-lo obrigatório, e é a maneira mais direta de honrar "um Tibia para quem não tem tempo".

**Diárias — rotação forçada entre faixas.**
O WAKFU dividiu as diárias em 3 blocos de faixa (20–65, 66–125, 126–185) justamente para impedir que todos repetissem a dungeon mais fácil, e um jogador da época elogiou isso nominalmente. Adaptação:

- **3 diárias**: uma na faixa atual do jogador, uma sorteada entre as faixas já superadas, uma livre;
- a diária de faixa antiga **só conta em Modo Sincronizado** — é o gancho diário do sistema;
- rotação determinística e visível com antecedência (o jogador de sessão curta precisa planejar).

**Semanais — o baú por degrau, do WAKFU, com reset semanal.**
O modelo mensal do WAKFU (1 baú por nível de Stasis concluído em competitivo nos 30 dias anteriores) é bom, mas mensal é lento demais para o nosso ritmo. Versão semanal:

- **1 baú por Selo distinto** limpo em modo sincronizado durante a semana, **por dungeon**, com teto (ex.: 6 baús/semana no total);
- uma semanal do tipo "limpe conteúdo sincronizado em **3 faixas diferentes**" — força amplitude, que é o objetivo do sistema inteiro;
- o teto semanal é o que substitui o limite diário de token que a Ankama teve que introduzir às pressas contra a espiral de farm. **Projete o teto no dia 1, não depois.**

**Ranking em single-player.**
Não há população para um ladder. Substituir por:

- **recorde pessoal por dungeon × faixa × Selo** — turnos e tempo, com os mesmos critérios de desempate do WAKFU (dificuldade → turnos totais → turnos no boss);
- **"próximo alvo" sempre visível** — modelo Bounty do Hades: o jogo mostra qual é o próximo Selo a bater e o que ele dá;
- **fantasma/replay do próprio recorde**, se o custo permitir;
- **evitar barra impossível de completar** — a razão explícita da Ankama para pôr a coroa de ouro em Stasis 21 e não em 50. Todo marco exibido tem que ser alcançável por um jogador dedicado.

**Interação com o helper — risco específico do nosso projeto.**
Se o helper automatiza combate, o Modo Sincronizado perde o sentido: a dificuldade vira "o helper aguenta ou não". Posição recomendada:

- helper **liberado** no Modo Livre (é exatamente para isso que ele existe: eliminar repetição);
- no Modo Sincronizado, ou o helper é **desligado**, ou fica restrito a funções não-táticas (consumíveis, coleta, navegação) e os exclusivos ficam bloqueados enquanto ele estiver ativo em combate.

Essa é uma decisão de produto, não técnica, e precisa ser tomada explicitamente — senão os dois sistemas se anulam.

---

## 11. Riscos de complexidade

Ordenados por custo real de correção depois que o conteúdo já existir.

**R1 — Curva global de poder de item (crítico, decidir antes de produzir conteúdo).**
Downscale de equipamento exige que todo item seja `(template + nível)` com stats derivados de uma fórmula. Se os itens forem autorados como linhas fixas de tabela, o sync de gear vira retrabalho manual em centenas de itens. O contra-argumento do fórum WAKFU — *"os devs teriam que passar por cada objeto para definir uma curva de evolução"* — só é válido para quem não desenhou assim desde o começo. **Nós ainda podemos.**

**R2 — Explosão combinatória de teste.** `faixas × dungeons × Selos`. Com 5 × 12 × 5 já são 300 configurações. Mitigação: escalonamento 100% formulaico, sem tuning por célula; ajuste manual **só** em bosses; testes automatizados de "TTK dentro da janela esperada" por combinação.

**R3 — Custo de UI, não de matemática.** O sistema é matematicamente simples e caro em interface: preview de build sincronizada, gerenciador de loadouts, seletor de Selos, tela de recompensa, recordes. Foi aqui que o WAKFU sangrou (e monetizou). **Orçar a UI como o item mais caro do sistema.**

**R4 — Legibilidade.** Dois modos × cinco faixas × cinco Selos × três eixos de recompensa é muito para absorver. Mitigação: uma tela na porta que responde três perguntas — *como eu fico*, *quão difícil fica*, *o que eu levo* — e nada mais. Se a tela não couber nisso, o sistema está grande demais.

**R5 — Máquina de estado do sync.** Salvar/carregar no meio de uma run sincronizada, patch de balanceamento invalidando loadout salvo, morte com sync ativo. Mitigação: sync como *view* calculada, nunca persistida (P8); loadouts versionados com revalidação no load.

**R6 — Economia interna.** Materiais de faixa baixa virando gargalo de endgame recria a inversão de preços do WAKFU (*"itens 80 mais caros que itens 200"*). Mitigação: material exclusivo de faixa serve **só** para itens daquela faixa e para **um** sink de endgame de custo alto e teto semanal.

**R7 — Canibalização do conteúdo novo.** Se T1 sincronizado for a melhor razão recompensa/minuto, ninguém joga o conteúdo de nível cap. Mitigação: teto de 3× no multiplicador de XP, teto semanal de baús, e exclusivos de endgame que **não** têm rota sincronizada.

**R8 — Sobreposição com as Rifts (W05).** Rifts também são "conteúdo repetível escalável". Se as duas coisas forem dials de dificuldade com moeda própria, elas competem. **Precisa haver uma divisão de papéis explícita** — sugestão: dungeons moduladas = *conteúdo conhecido, dificuldade escolhida, recompensa determinística*; rifts = *conteúdo variável, dificuldade progressiva, recompensa aleatória*. Resolver isso ao consolidar W04 + W05.

**R9 — Colisão com o helper.** Ver §10. Risco de produto, não de engenharia.

---

## 12. Recomendação final

**Adotar o conceito, rejeitar a implementação.** O WAKFU acertou a *teoria* (poder sincronizado + dial de dificuldade + recompensa exclusiva + XP pelo nível real) e errou a *ergonomia* (13 faixas, páginas pagas, build automático genérico, 50 degraus, runs mais lentas que o conteúdo atual). Em single-player, praticamente todo o erro de ergonomia é gratuito de consertar.

### Escopo mínimo viável (v1) — o que construir primeiro

1. **Dois modos** na porta: **Livre** e **Sincronizado**.
2. **5 faixas** (T1–T5, largura = cap/5), sync sempre para o teto da faixa.
3. **Sync de stats = downscale proporcional (opção B)** aplicado ao total efetivo.
4. **Sync de gear = downscale do item no lugar (opção 3)**, com efeitos únicos marcados como level-locked.
5. **Deck de habilidades por faixa**, salvo, filtrado por nível de desbloqueio, nunca cortado em silêncio.
6. **Recompensa v1 = dois eixos apenas**: modo controla raridade máxima; nível real controla XP (com teto 3×).
7. **Loadouts ilimitados e gratuitos**, guarda-roupa fora do inventário.
8. **Tela de preview** na porta.
9. **Mesmo custo de energia** nos dois modos.

Sem Selos, sem baús semanais, sem recordes. Só isso já entrega a promessa do briefing e é testável ponta a ponta.

### v2 — quando o v1 estiver estável

10. **Selos** (3 a 5 modificadores por dungeon), cada um amarrado a um material específico.
11. **Baús semanais** por Selo distinto, com teto global.
12. **Recordes pessoais** por dungeon × faixa × Selo, com "próximo alvo" visível.
13. **Sync Autêntico** (só gear nativo da faixa) com bônus de recompensa.
14. **Sync Leve** (cap por stat) para sessões curtas que ainda querem desafio.

### v3 — o incentivo definitivo

15. **Bosses travados em faixa** — só enfrentáveis sincronizado, dropando componente de craft de endgame. É o análogo dos Boss Ultimes e, segundo tudo que a pesquisa mostra, é o único mecanismo que realmente garante que o conteúdo antigo seja jogado por quem já passou dele.

### Lista negra — não copiar do WAKFU

- ❌ 13+ faixas de nível
- ❌ Loadouts/páginas limitados ou pagos
- ❌ Build automática genérica que ignora a intenção do jogador
- ❌ Deck de magias cortado por ordem de slot, em silêncio
- ❌ 50 degraus de dificuldade
- ❌ Dificuldade construída sobre inflação de HP
- ❌ Pré-requisito de "limpe em N para liberar N+1"
- ❌ Sync obrigatório em quest de história
- ❌ Moeda separada por faixa + máquinas de troca por região
- ❌ Sync persistido no personagem (origem dos bugs de "preso no nível 20")
- ❌ Chaves/consumíveis para entrar (a própria Ankama removeu)

### Critério único de sucesso

Se, seis meses depois do lançamento, um jogador de nível cap **escolhe voluntariamente** rodar uma dungeon T1 sincronizada num dia em que tem tempo — e não se sente burro por isso — o sistema funcionou. Se ele só roda T1 no Modo Livre para bater a diária, ele virou decoração, e a causa quase certamente será uma destas três: recompensa exclusiva insuficiente (P1), atrito de preparação (P4), ou recompensa por minuto pior que o conteúdo atual (§3.3).

---

## 13. Fontes

**Oficiais — WAKFU (Ankama)**
- [Update 1.49: the Adjustable Level System](https://www.wakfu.com/en/mmorpg/news/announcements/587874-update-1-49-adjustable-level-system) — introdução do ALS, degraus de nível, dungeon automática, mentoria
- [Devblog: The Stasis Dungeons](https://www.wakfu.com/en/mmorpg/news/devblog/tickets/599946-devblog-stasis-dungeons) — 50 níveis em 5 faixas, desbloqueio progressivo, remoção das chaves, mimics
- [Devblog: Dungeon Leaderboard](https://www.wakfu.com/en/mmorpg/news/devblog/tickets/660540-devblog-dungeon-leaderboard) — intenções de design, critérios de desempate, ranking sazonal vs. permanente, recompensas, conquistas por faixa de Stasis, escala do servidor
- [Devblog: Stasis Dungeons Revamp](https://www.wakfu.com/en/mmorpg/news/devblog/tickets/879338-devblog-stasis-dungeons-revamp) — correção das curvas de HP/dano/recompensa, modificadores como bônus, Boss Ultimes em competitivo
- [Devblog: ... and Stasis (1.63)](https://www.wakfu.com/en/mmorpg/news/devblog/tickets/978392-devblog-stasis) — 50 níveis em modo normal, tabela de bônus normal vs. competitivo, limiares de raridade, remoção dos pré-requisitos

**Comunidade — WAKFU**
- [[Guide] Adjustable Level System: How does it work?](https://www.wakfu.com/en/forum/143-guides/210371-guide-adjustable-level-system-how-does-work) — build manager, emblema, limites de páginas e preços, fórmula de XP
- [I love Adjustable Level System](https://www.wakfu.com/en/forum/8-general-discussions/210106-i-love-adjustable-level-system) — crítica detalhada do emblema, da redistribuição de aptidões, do corte de deck; comparação emblema vs. set barato; elogio ao modelo de tokens e às diárias por faixa
- [Stasis Dungeons and Adjustable Levels Tokens](https://www.wakfu.com/en/forum/8-general-discussion/211346-stasis-dungeons-adjustable-levels-tokens) — Modulox Token 1/dia, gate de nível 66, quest obrigatória com modulação, mimics +1%/Stasis
- [Donjon compétitif à niveau réel (FR)](https://www.wakfu.com/fr/forum/22-combat-strategie/412237-donjon-competitif-niveau-reel) — o debate down-sync vs. up-scale; custo em páginas e inventário; "todo mundo em Astrub"; inversão de preços de itens; a queixa anti-progressão
- [La modulation de niveau : le tuto — Wakfu.Guide](https://wakfu.guide/modulation/) — estado atual do sistema: modulação a partir do nível 51, Boss Ultimes travados no nível, bônus de drop competitivo (188% vs. 400%), baús mensais por Stasis, ladders, pedras de donjon, estelas, planos de espada de nação, multiplicador de XP
- [Dungeon — The Wakfu Wiki (wiki.gg)](https://wakfu.wiki.gg/wiki/Dungeon) — lista de dungeons e níveis de acesso (faixas de 15), modo competitivo, Boss Ultimes, Rifts
- [Adjustable Level System — Wakfu Wiki (Fandom)](https://wakfu.fandom.com/wiki/Adjustable_Level_System)

**Comparações**
- [Level Sync — FFXIV Wiki](https://ffxiv.consolegameswiki.com/wiki/Level_Sync) — sync só para baixo, item level sync, unsynced parties
- [Timewalking — Warcraft Wiki](https://warcraft.wiki.gg/wiki/Timewalking) e [nota sobre a mudança de escalonamento em 11.0.5](https://wowcarry.com/blog/wow/timewalking-content-to-scale-with-player-levels-in-patch-1105-eliminating-the-need-for-timewalking-gear-optimization) — inversão de downscale para upscale
- [Level scaling is fundamentally broken — fórum GW2 (arquivo)](https://forum-en.gw2archive.eu/forum/game/gw2/Level-scaling-is-fundamentally-broken) — a crítica do downscale permanente e das recompensas que não escalam
- [Difficulty regarding One Tamriel — fórum ESO](https://forums.elderscrollsonline.com/en-GB/discussion/277907/difficulty-regarding-one-tamriel) — nivelamento sem dial de dificuldade
- [The Idol System — Devblog DOFUS](https://www.dofus.com/en/mmorpg/news/devblog/tickets/435206-idol-system) e [BETA 2.68 — Challenges Without Idols](https://www.dofus.com/en/forum/1173-2-68-challenges-without-idols-beta-server/341965-beta-2-68-challenges-without-idols) — auto-dificuldade baseada em item, e sua substituição por escolha contextual gratuita
- [Pact of Punishment — Hades Wiki](https://hades.fandom.com/wiki/Pact_of_Punishment) — Heat, Bounties por arma, resgate sequencial de recompensa

---

### Notas de confiabilidade

- Os degraus de modulação aparecem como **95** na comunidade e nas faixas de dungeon, e como **98** no anúncio oficial da 1.49. Tratei 95 como correto.
- A escala de Stasis mudou várias vezes (20 → 50 → escala curta atual). Os números de bônus citados (+200%/+600%) são da 1.63; os de 188%/400% vêm de um guia recente na escala curta. **Não são comparáveis entre si** e nenhum dos dois deve ser copiado como valor.
- A fórmula de XP `(nível_real / nível_modulado)^2` vem de um guia de comunidade de 2016, não de fonte oficial. O *formato* é confiável (o patch corretivo que elevou o expoente de 1.5 para 2 é citado em fonte oficial); os valores exatos hoje, não.
- Não encontrei devblog recente (2024–2026) revisitando ALS ou Stasis. A descrição do estado atual vem de guia de comunidade e wiki, não de fonte oficial recente.
