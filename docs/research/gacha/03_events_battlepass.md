# W08 — Gachas: eventos e passe de batalha

Pesquisa de referência para **Kaezan Huntbound**.

Prioridades: **Wuthering Waves (WuWa)** e **Honkai: Star Rail (HSR)**.

Escopo: entender como esses jogos produzem metas recorrentes de curto e médio prazo **sem construir um jogo novo a cada patch**.

Sem código. Sem foco em monetização — o interesse aqui é **estrutura de conteúdo e ritmo**, não venda.

> **Nota de método:** dados de duração, preços, tiers e nomes de eventos vêm das fontes listadas no final. Estimativas de **custo de produção** são inferência minha a partir do que o conteúdo exige de assets/código — estão marcadas como `[inferência]` e não são números oficiais.

---

# 1. O ciclo base: patch como unidade de conteúdo

Antes da taxonomia, o ponto mais importante para nós:

**Os dois jogos organizam tudo em torno de uma "versão" (patch) de ~6 semanas.**

| | HSR | WuWa |
|---|---|---|
| Duração da versão | ~42–43 dias | ~41 dias (alguns ciclos mais curtos, ex. 3.4 com 32 dias) |
| Fases por versão | 2 fases de ~3 semanas | 2 fases de ~3 semanas |
| Eventos por versão | ~4–6 (incluindo login e double drop) | ~4–6 |
| Passe de batalha | 45 dias (alinhado à versão) | ~41 dias (alinhado à versão) |

Consequências de design que valem para nós:

1. **O patch é o contêiner.** Passe, eventos, banners e missões periódicas nascem e morrem juntos. Isso cria um "ritmo respiratório" que o jogador aprende.
2. **A fase divide o patch em dois picos.** Evita que a versão inteira seja consumida no primeiro fim de semana e cria um segundo motivo para voltar na semana 3–4.
3. **A maioria dos eventos de uma versão não é conteúdo novo.** É reuso de sistemas já existentes com regras diferentes por cima. Só 1 (às vezes 2) por versão é realmente "novo".

Esse último ponto é a resposta central da pergunta do briefing: **não se faz um jogo novo por patch; faz-se uma camada de regras nova sobre sistemas velhos.**

---

# 2. Taxonomia dos eventos

Classifiquei em **8 famílias**, ordenadas do mais barato ao mais caro de produzir. Cada família traz exemplos reais dos dois jogos.

## 2.1 Login / calendário

**O que é:** entrar no jogo por N dias e coletar. Zero gameplay novo.

- HSR: *Gift of Odyssey* (ciclo de 7 dias, recompensa passes de gacha), *Stellar Companion* (login multi-versão que entrega um 5★ gratuito).
- WuWa: um evento de login de 7 dias **a cada atualização** (*Gifts of Aftertune*, *Gifts of Drifting Mist*).

**Duração:** 7 dias de coleta, janela aberta durante toda a versão.
**Rewards:** moeda de gacha, materiais.
**Função real:** garantir retorno diário na primeira semana do patch, quando o interesse é maior.

## 2.2 Multiplicador de recompensa (double drops)

**O que é:** uma janela em que o conteúdo *já existente* de farm rende o dobro. Nenhum asset novo.

- HSR: *Garden of Plenty* (dobro em Calyx — EXP de personagem, EXP de cone, materiais de trace, créditos), *Planar Fissure* (dobro em ornamentos planares).
- WuWa: *Chord Cleansing* (dobro em Echo e materiais de Echo).

**Duração:** curta e cirúrgica — ~7 a 10 dias, geralmente na segunda metade da versão.
**Cap:** o dobro é **limitado por número de resgates** (ex.: N usos), não é livre. Isso protege a economia.
**Função real:** dar um motivo para gastar estoque acumulado de energia/stamina e sincronizar o farm da população.

## 2.3 Combate com regra modificada (a espinha dorsal)

**O que é:** o combate normal do jogo, com um modificador de regras, um conjunto de buffs temporários e um placar. **Este é o formato mais frequente e o mais rentável em custo/benefício.**

- HSR: *Fate/Star Rail Night* (combate em equipe com mecânica de "Noble Phantasm" sobreposta), eventos de torneio de combate.
- WuWa: *Pincer Maneuver Warriors* (duas equipes, dois campos simulados, buffs especiais), *Virtual Crisis: Quadrant Trials* (boss rush com dificuldade escalonável por estágio), *Lament Recon: Tacet Crisis* (ondas de inimigos com upgrade de skill durante a run), *Ascendant Aces*, *Resonance Sim Realm* (combate cooperativo com habilidades emprestadas).

**Duração:** 2–3 semanas.
**Estrutura típica:** 4–8 estágios, com **desbloqueio escalonado por dia** (nem tudo abre de uma vez).
**Rewards:** moeda de gacha + materiais + moeda de evento.

Padrão recorrente dentro da família:

- **Escalonamento de dificuldade** com recompensa igual até certo ponto (o topo é orgulho, não progressão).
- **Buff emprestado**: o evento entrega poder temporário, o que permite balancear sem depender do build do jogador.
- **Personagens de trial**: o evento empresta personagens que o jogador não tem — vitrine de vendas *e* solução de acessibilidade.

## 2.4 Roguelite recorrente (reuso do modo endgame)

**O que é:** o modo roguelite permanente do jogo, com um tema/conjunto de buffs novo a cada versão. Fronteira entre "evento" e "modo permanente".

- WuWa: *Depths of Illusive Realm* — roguelike que **rotaciona a cada versão**, recompensa reclamável semanalmente até 12 vezes, com reset semanal na segunda-feira.
- HSR: Simulated Universe / Divergent Universe cumprem o mesmo papel, com expansões temáticas ao longo das versões.
- WuWa: *Somnoire* — modo de combate semanal com pontos que destravam recompensas.

**Duração:** semanas a permanente, com **reset semanal** de recompensa.
**Custo marginal por rotação:** baixo — trocam-se as cartas de buff, o pool de inimigos e o tema visual; o loop e a UI ficam.

Esse é o formato de **maior alavancagem** de todos: um sistema caro construído uma vez vira conteúdo "novo" indefinidamente. (Já mapeado em W07 — aqui entra como *fonte de eventos*, não como endgame.)

## 2.5 Minigame / leisure

**O que é:** um gameplay descartável que não é o combate do jogo.

- HSR: *Antigraft Brickbuster* (peças caindo, estilo Tetris, embrulhado em narrativa de invasão de firewall), ritmo, simulação de fazenda, quebra-cabeças.
- WuWa: *The Strings Remember* (gameplay musical com o instrumento Qin), *In Search of Lost Jade* (aventura em navegador), *Lollo Campaign* (coleta de selos + roleta de prêmios), *Glamour Couture* (moda/vestuário).

**Duração:** 1–2 semanas.
**Rewards:** moderadas, e frequentemente **generosas em relação ao esforço** — é conteúdo de descompressão.

**Observação importante de custo:** minigame é *barato em arte* e *caro em código*, porque cada um é um sistema novo que nunca mais será usado. Em HSR/WuWa isso se paga porque a base é gigantesca; para nós, geralmente **não se paga**.

## 2.6 Exploração / coleta / fotografia

**O que é:** enviar o jogador ao mapa já construído com uma checklist nova por cima.

- WuWa: *A Glimpse of Xuanfang* (quests, puzzles e ações designadas no mapa), *Shape of Yesterday* e *Recaptured: Action Highlights* (fotografia), *Mingshen Notices* (casos investigativos por comissão).

**Duração:** 2–6 semanas, frequentemente **permanente** após a estreia.
**Custo:** o mais barato entre os que geram sensação de conteúdo novo — **é curadoria do mapa existente**, não construção. `[inferência]`

## 2.7 Evento de história / "flagship"

**O que é:** o evento âncora da versão. Cutscenes, diálogos, mapa ou arena dedicada, às vezes um sistema exclusivo.

- HSR: os eventos-carro-chefe de cada versão, arquivados depois no *Conventional Memoir*.
- WuWa: quests de evento com região/instância própria.

**Duração:** ~3 semanas.
**Rewards:** o maior bloco de moeda de gacha da versão. Referências públicas citam eventos individuais rendendo de ~500 a ~1200 Stellar Jade.
**Custo:** alto. É o item mais caro do orçamento de conteúdo de uma versão. `[inferência]`

## 2.8 Web / meta-eventos (fora do jogo)

**O que é:** evento em navegador ou rede social, com código de resgate.

- HSR: 1–3 web events por versão; livestream do programa especial entrega ~300 Stellar Jade em três códigos, ~2 semanas antes do patch.
- WuWa: eventos de sign-in via Discord.

**Função real:** marketing e reativação, não gameplay.
**Para nós:** **irrelevante** — Huntbound é single-player e offline. Registrado só para fechar a taxonomia.

---

# 3. Eventos que reutilizam sistemas × eventos totalmente novos

Esta é a distinção mais útil do briefing. Separei por **o que precisa ser construído**.

## 3.1 Reuso puro (nada novo é construído)

- Login (2.1)
- Double drops (2.2)
- Roguelite com buffs rotacionados (2.4)
- Exploração/checklist sobre mapa existente (2.6)

Precisam apenas de: **dados** (tabela de recompensa, lista de objetivos, janela de datas) e talvez um banner de UI.

## 3.2 Reuso com camada de regras (código pequeno, dados grandes)

- Combate com modificador (2.3)
- Boss rush / torre com escalonamento
- Eventos de "buff emprestado" e "personagem emprestado"

Precisam de: **um framework de modificadores** já existente + configuração. O custo real está em construir esse framework **uma vez**.

## 3.3 Sistema novo (caro, não reaproveitável)

- Minigames (2.5)
- Eventos flagship com mecânica exclusiva (2.7)

Precisam de: código dedicado, arte dedicada, QA dedicado, e **serão descartados**.

**A proporção observada em ambos os jogos:** por versão, aproximadamente **1 evento da categoria 3.3, 2–3 da 3.2 e 2–3 da 3.1.**

Ou seja: **~20% do conteúdo de evento é caro; ~80% é composição de peças existentes.** É esse número que responde a pergunta do briefing.

---

# 4. Rewards, moedas de evento e lojas

## 4.1 O padrão de três camadas

Praticamente todo evento médio/grande dos dois jogos usa a mesma arquitetura:

```
[ atividade do evento ]
        ↓ gera
[ moeda de evento ]  ← temporária, expira com o evento
        ↓ gasta em
[ loja de evento ]   ← catálogo com estoque limitado por item
```

- HSR: eventos introduzem moedas próprias ("event tokens"), ganhas em desafios ou gastando Trailblaze Power em estágios do evento; a loja tem taxa de câmbio e estoque finito.
- WuWa: mesmo padrão (pontos do evento → loja de resgate).

**Por que a moeda de evento existe** (e não recompensa direta):

1. **Desacopla esforço de recompensa.** O jogador escolhe o que levar; o designer não precisa acertar a preferência.
2. **Cria um teto natural.** Estoque limitado = o total é fixo e previsível para a economia.
3. **Permite "sobra planejada".** Quando o jogador zera a loja, o excedente vira algo genérico (créditos/materiais comuns), o que evita frustração sem inflar a economia.
4. **É trivialmente reconfigurável.** Trocar a loja é trocar uma tabela.

## 4.2 O que os eventos efetivamente pagam

Composição típica de recompensa por evento:

- **Moeda de gacha** (Stellar Jade / Astrite) — o item que puxa a participação.
- **Materiais de upgrade** — o item que resolve gargalo real.
- **Créditos / moeda mole** — enchimento com função econômica.
- **Cosmético ou item de coleção** — o item que sobrevive ao evento.

Ordem de grandeza do peso dos eventos no orçamento total da versão:

- WuWa, patch de 6 semanas, jogador F2P ativo: ~12.000–16.000 Astrite no total, dos quais **~2.000–3.000 vêm de eventos**, ~60–80/dia de diárias, ~600 de login e ~1.500–2.500 de exploração nova.
- HSR, versões recentes: eventos são citados como **uma das maiores fontes** de Stellar Jade da versão.

**Leitura para nós:** eventos são um **naco relevante mas não majoritário** da economia. As diárias, somadas, ainda são a maior fonte. Eventos são o **pico**, não a **base**. Isso importa muito na hora de dimensionar.

---

# 5. Battle pass — como os dois fazem

## 5.1 Honkai: Star Rail — *Nameless Honor*

| Item | Valor |
|---|---|
| Duração | 45 dias (alinhado à versão) |
| Níveis | 50 marcos principais + até 70 com progressão extra |
| Trilha grátis | *Nameless Gift* |
| Trilha paga | *Nameless Glory* — US$ 9,99 |
| Trilha premium | *Nameless Medal* — US$ 19,99 (ou US$ 11,99 como upgrade), inclui **+10 níveis instantâneos**, cosméticos e recursos extras |
| Recompensa-âncora | **Seletor de Light Cone 4★** (escolha entre 7) |
| Moeda paga | 680 Stellar Jade na trilha paga |
| Fontes de EXP | **Missões diárias, semanais e "period"** (estas últimas duram o passe inteiro) |

## 5.2 Wuthering Waves — *Pioneer Podcast*

| Item | Valor |
|---|---|
| Duração | ~41 dias (alinhado à versão) |
| Níveis | 70 tiers |
| Requisito | Union Level 9 |
| Trilha grátis | *Public Channel* |
| Trilha paga | *Insider Channel* — US$ 9,99 |
| Trilha premium | *Connoisseur Channel* — ~US$ 19,99–20,99, com **+10 níveis automáticos** e sigils sazonais exclusivos |
| Recompensa-âncora | **Seletor de arma 4★** em nível alto |
| Moeda de gacha | 5 Lustrous Tides na trilha grátis (1 a cada 10 níveis até o 50); +2 Lustrous, +5 Radiant e 680 Astrite na paga |
| Fontes de EXP | **Missões diárias, semanais e sazonais** |
| Escape hatch | Níveis podem ser comprados com Astrite perto do fim da temporada |

## 5.3 O que os dois têm em comum (o padrão real)

Isolando o que se repete — e ignorando o preço, que não nos interessa:

1. **O passe não é uma fonte de conteúdo. É um agregador.** Ele não pede nada que o jogador não fosse fazer; ele **conta** o que ele já faz.
2. **Três velocidades de missão:** diária (rápida, repetível), semanal (média, algum esforço), e **período/sazonal** (lenta, cumulativa, atravessa o passe inteiro). É essa terceira camada que garante que quem joga em rajadas não fique para trás.
3. **Marcos a cada 10 níveis.** A recompensa boa não está no nível 37 — está no 10, 20, 30, 40, 50. O jogador consegue enxergar a próxima meta sem abrir planilha.
4. **Uma recompensa-âncora que é uma escolha, não um item.** Seletor de 4★ (cone/arma). Escolher aumenta o valor percebido e elimina o problema do "veio o que eu não precisava".
5. **Cauda além do marco final.** HSR: 50 marcos + 20 níveis extras. WuWa: 70 tiers. Serve para quem joga muito não bater no teto na semana 3 e desengajar.
6. **Válvula de escape paga/temporal.** Comprar níveis existe justamente porque a alternativa (jogador ansioso) é pior que a receita perdida.

---

# 6. Catch-up e FOMO

Aqui HSR é a referência mais interessante do mercado, e a lição é direta.

## 6.1 Conventional Memoir (HSR)

Desde a versão 1.1, HSR arquiva os eventos flagship em um repositório chamado **Conventional Memoir**, onde podem ser rejogados a qualquer momento.

Regras observadas:

- O **conteúdo** (história, gameplay) fica permanentemente disponível.
- As **recompensas limitadas** não podem mais ser reclamadas.
- **Porém:** quem *participou* do evento e não terminou a tempo **pode resgatar o que ficou faltando**, incluindo Stellar Jade.
- Uma parte da moeda original continua obtenível mesmo para quem chegou depois.

Isso separa duas coisas que costumam ser confundidas:

> **FOMO de recompensa** (aceitável, é o que move o retorno) **× FOMO de conteúdo** (destrutivo, o jogador perde a história para sempre).

HSR mantém o primeiro e **elimina o segundo**. É explicitamente citado como vantagem sobre Genshin, onde momentos narrativos relevantes viraram conteúdo irrecuperável.

## 6.2 Permanentização progressiva (WuWa)

WuWa faz algo parecido por outro caminho: uma parcela grande dos eventos **vira permanente** após a janela inicial (*Shape of Yesterday*, *A Glimpse of Xuanfang*, *Mingshen Notices*, *Star Bouncing*, *Into the Land of Paradox*, entre outros).

O evento é "limitado" só no sentido de **quando é destacado na UI e quando paga o pacote cheio**.

## 6.3 Catch-up explícito para quem voltou

- HSR: **Starlit Homecoming** — jogadores sem login há 14+ dias recebem recompensas e **drops dobrados** em Calyx e Relíquias. É catch-up de *recursos*, não de *conteúdo*.
- Ambos: eventos com **desbloqueio escalonado por dia mas janela longa** (2–3 semanas) — não obrigam login diário para completar, só para começar cedo.
- Ambos: eventos de onboarding permanentes para novos jogadores.

## 6.4 Os mecanismos de FOMO que eles realmente usam

Listando com honestidade, porque precisamos decidir o que copiar e o que não:

| Mecanismo | Intensidade | Copiar? |
|---|---|---|
| Janela de evento (2–3 semanas) | Média | Sim, adaptado |
| Estoque limitado na loja do evento | Média | Sim |
| Moeda de evento que expira | Alta | **Não** |
| Passe que reseta com nível não coletado | Alta | **Não** |
| Cosmético exclusivo de temporada | Alta | Talvez |
| Banner limitado de personagem | Muito alta | Não se aplica |

---

# 7. Custo de produção aparente

`[inferência — leitura minha a partir do que cada formato exige, não dado oficial]`

Escala relativa, tomando "1 unidade" como o custo de configurar um evento de double drop.

| Formato | Código novo | Arte nova | Custo relativo | Reaproveitável? |
|---|---|---|---|---|
| Login / calendário | ~0 | banner | **1** | Total |
| Double drops | ~0 | banner | **1** | Total |
| Checklist de exploração | ~0 | banner + ícones | **2** | Total |
| Roguelite com buffs rotacionados | baixo | ícones de buff | **3** | Total (por rotação) |
| Combate com modificador de regra | baixo–médio | UI + talvez 1 arena | **4** | Alta |
| Boss rush escalonado | baixo | reuso de bosses | **3** | Alta |
| Minigame descartável | **alto** | dedicada | **10** | **Zero** |
| Flagship com história e sistema próprio | **alto** | **alta** | **20+** | Parcial (o mapa fica) |

**Conclusão que interessa ao Huntbound:** a curva é brutalmente não-linear. Os dois formatos do topo custam mais que todos os outros somados, e são exatamente os dois que **não se reaproveitam**.

Um estúdio grande banca 1 desses por patch. **Nós não.**

---

# 8. Formatos baratos de produzir

Ranqueados por **valor percebido ÷ custo**, considerando um projeto single-player em Godot.

## 8.1 Multiplicador temporário sobre conteúdo existente — custo 1

"Esta semana: dungeons de floresta dão dobro de loot" / "bosses dropam dobro de material de runa".

Requer: uma tabela de janela × alvo × multiplicador × número de resgates.

É o melhor negócio da lista inteira e deve existir desde o primeiro dia.

## 8.2 Rotação de modificadores no roguelite / hunts — custo 3

Se o roguelite recorrente do W07 existir, cada "evento" é um **conjunto de cartas/buffs diferente + tema**. WuWa faz literalmente isso com *Depths of Illusive Realm* a cada versão.

O jogador percebe como conteúdo novo. Nós percebemos como um arquivo de dados.

## 8.3 Missões de curadoria sobre o mapa existente — custo 2

"Mate 30 mortos-vivos em X", "encontre 8 relíquias em Y", "complete Z sem usar poção".

Zero conteúdo novo. Serve para **redirecionar atenção** a áreas que o jogador abandonou.

## 8.4 Boss rush / gauntlet escalonado — custo 3

Sequência de bosses já existentes, com escalonamento de dificuldade e buff emprestado. WuWa usa exatamente esse molde em *Virtual Crisis: Quadrant Trials*.

## 8.5 Regra global modificada — custo 4

Uma regra que altera todo o combate durante a temporada:
"sem poções", "inimigos com escudo elemental", "vida não regenera fora de combate", "loot dobrado mas morte custa 10% de XP".

Isto exige o **framework de modificadores** — o único investimento estrutural que recomendo fazer cedo. Ele é o que transforma design em configuração.

## 8.6 Loja sazonal — custo 2

Moeda de evento + catálogo com estoque. Pura tabela.

---

# 9. Formatos caros

Listados para **evitarmos**, não para copiarmos.

## 9.1 Minigame descartável — custo ~10, reaproveitamento zero

Tetris de HSR, gameplay musical de WuWa, fotografia, moda. Cada um é um jogo pequeno.

Só faz sentido com uma base de milhões de jogadores onde a variedade em si retém. **Para Huntbound é dinheiro queimado.**

## 9.2 Evento flagship com região e sistema próprios — custo 20+

O evento-âncora de versão. Cutscenes, área nova, mecânica exclusiva, dublagem.

**Se formos fazer isso, não é um evento — é um capítulo do jogo**, e deve ser tratado como conteúdo permanente, não temporário.

## 9.3 Coop / social

*Resonance Sim Realm* (WuWa) e similares. **Fora de escopo:** Huntbound é single-player e o dossiê exclui explicitamente arquitetura de MMO.

## 9.4 Web events

Fora de escopo. Requerem serviço online e conta.

---

# 10. Ideias aplicáveis a Huntbound

Traduzindo tudo acima para o nosso contexto: single-player, offline, Godot, Tibia-like, com hunts, dungeons, bosses, runas, bestiary/bossiary e helper.

## 10.1 O "Ciclo" como unidade — 4 semanas

Adotar o patch como conceito, mas **encurtado**: um jogo single-player sem equipe de live service não sustenta 6 semanas de conteúdo novo, mas sustenta **4 semanas de recombinação**.

Estrutura de um Ciclo:

```
Semana 1  → Ciclo abre. Nova rotação de modificadores. Login/entrada. Passe reseta.
Semana 2  → Abre a segunda metade do desafio sazonal.
Semana 3  → Janela de multiplicador (dobro de loot em um pilar específico).
Semana 4  → Fechamento: bosses do ciclo, loja esvazia, passe finaliza.
```

**Crucial:** o Ciclo deve ser gerado a partir de **dados**, e o jogo deve conseguir rodar Ciclos indefinidamente mesmo sem eu escrever novos — um pool de modificadores combinado proceduralmente evita o "acabou o conteúdo" quando o desenvolvimento parar.

## 10.2 Contrato de Caça (Hunt Contract) — o nosso evento de combate

Equivalente barato ao evento de combate modificado.

- 5–8 contratos por Ciclo.
- Cada um = local existente + modificador + objetivo + recompensa.
- Ex.: *"Purgar o Cemitério — inimigos ressuscitam uma vez. 3 ondas. Sem uso de runas de área."*
- Desbloqueio escalonado (1–2 por dia nos primeiros dias), janela longa o suficiente para não punir ausência.

Custo real: uma cena de configuração e uma tabela. Conecta diretamente com o bestiary/bossiary do W03.

## 10.3 Maré / Ressonância — o multiplicador semanal

Uma janela semanal que dobra o rendimento de **um** pilar: loot de dungeon, material de runa, XP de hunt, material de equipamento.

Com **cap de resgates** (ex.: 10 runs), como o *Garden of Plenty*. Sem cap, destrói a curva de progressão do W09.

Efeito colateral desejável: dá função ao estoque de energia/recurso acumulado e ensina o jogador a **planejar a semana**.

## 10.4 Rotação do roguelite

Se o modo roguelite recorrente do W07 existir, ele é **a nossa fábrica de eventos**. Um pacote novo de cartas/relíquias + tema + tabela de recompensa por Ciclo = conteúdo percebido como novo, por um custo de dados.

Copiar de WuWa: recompensa **reclamável um número limitado de vezes, com reset semanal**. Isso dá razão para voltar toda semana sem exigir grind diário.

## 10.5 Dossiê de Caça — checklist sobre o mundo existente

Equivalente aos eventos de exploração/coleta. Um caderno de objetivos por Ciclo:

- "Mate 50 criaturas do tipo X" (alimenta o bestiary)
- "Derrote o boss Y sem morrer"
- "Complete uma dungeon com o helper desligado"
- "Termine uma hunt abaixo de N minutos"

Custo quase zero, e é o que **liga diárias, semanais e passe** (seção 12).

## 10.6 Loja do Ciclo

Moeda de Ciclo, ganha em qualquer atividade do Ciclo, gasta num catálogo com estoque limitado: materiais, runas raras, cosméticos, tokens de reroll de equipamento.

Regra de desenho: **o catálogo deve ser esvaziável por um jogador dedicado, e o excedente deve converter em algo genérico.** Nunca deixar moeda morrer sem uso — isso é FOMO ruim.

## 10.7 O que **não** fazer

- Minigames descartáveis.
- Eventos com cutscene e área própria descartadas depois.
- Qualquer coisa que exija servidor.
- Conteúdo narrativo que expire.

---

# 11. Estrutura recomendada de passe — "Trilha do Caçador"

Adaptação do padrão HSR/WuWa **sem monetização** (o dossiê é claro: gacha/monetização não é prioridade agora). O passe aqui é **um agregador de metas**, não um produto.

## 11.1 Parâmetros

| Parâmetro | Valor recomendado | Justificativa |
|---|---|---|
| Duração | **4 semanas** (1 Ciclo) | Meia dos ~41–45 dias de HSR/WuWa; ciclo mais curto compensa a menor quantidade de conteúdo |
| Níveis | **30 principais + 15 de cauda (45)** | Proporção equivalente a "50 + 20" do HSR, reescalada |
| Marcos | A cada **5 níveis** | Adaptado do "a cada 10" deles; ciclo mais curto pede marcos mais densos |
| Trilhas | **Uma só, gratuita** | Sem monetização. Se um dia houver, ela entra como trilha paralela sem alterar a grátis |
| Requisito | Desbloqueia após o tutorial/level inicial | Mesmo espírito do "Union Level 9" |
| Reset | Automático no início do Ciclo | — |
| Não coletado | **Não expira** — ver 11.4 | Anti-FOMO |

## 11.2 Fontes de XP do passe — as três velocidades

Cópia direta do padrão dos dois jogos (diária / semanal / período):

| Camada | Quantidade | XP unitário | Refresh | Papel |
|---|---|---|---|---|
| **Diárias** | 4–5 por dia | baixo | 04h diário | Base. Sessão de 15–25 min |
| **Semanais** | 5–7 por semana | médio | segunda-feira | Meta de fim de semana. Recupera quem faltou dias |
| **Sazonais (Ciclo)** | 8–12 por Ciclo | alto, cumulativo | não reseta | **Rede de segurança.** Progride sozinha com o jogo normal |

A camada sazonal é a mais importante e a mais esquecida: ela é o que permite ao jogador **sumir uma semana e ainda terminar o passe**. É exatamente o papel das "period missions" (HSR) e "seasonal quests" (WuWa).

Dimensionar para que **completar diárias + semanais + sazonais chegue ao nível 30 com ~20% de folga**. O jogador deve sentir que terminou com margem, não no limite.

## 11.3 Recompensas

**Trilha principal (1–30):**

- Materiais de upgrade (o gargalo real, ver W09)
- Moeda de Ciclo (gastável na loja do Ciclo)
- Runas / consumíveis
- Slots de estoque, conveniências permanentes
- **Nível 30 — âncora: um seletor.** Copiar o padrão do "seletor 4★": o jogador escolhe **1 entre N** itens de qualidade alta (ex.: uma peça de equipamento, uma runa rara, um sigil). Escolha > sorteio.

**Cauda (31–45):**

- Recompensa repetível e menor a cada 3 níveis (materiais, moeda de Ciclo)
- Sem itens únicos — a cauda existe para não haver teto, não para premiar

**Cosmético:** um item cosmético/título por Ciclo, no nível ~25. É o item que sobrevive ao Ciclo e vira registro de "eu estava lá". Baixo custo, alto valor simbólico.

## 11.4 Regra anti-FOMO do passe

Divergência deliberada de HSR/WuWa:

> **Níveis não coletados no fim do Ciclo não são perdidos.** Ficam num "baú de temporada" e podem ser coletados depois.

Perde-se pressão de retenção. Ganha-se: nenhum jogador single-player pune a si mesmo por ter tido uma semana ruim. **Em jogo sem monetização, pressão de retenção não tem para onde converter — é custo puro.**

O que **mantemos** de escassez: o cosmético do Ciclo e o estoque da loja do Ciclo. Suficiente para dar identidade temporal sem punir.

---

# 12. Como conectar passe, diárias, semanais e eventos

Este é o ponto onde os dois jogos são mais elegantes, e é o que precisa ficar claro na nossa arquitetura.

## 12.1 O princípio

> **Nenhuma camada pede uma atividade própria. Todas observam a mesma atividade e a contam de formas diferentes.**

O jogador faz **uma** dungeon. Essa dungeon:

- avança a diária "complete 2 dungeons";
- avança a semanal "complete 8 dungeons";
- avança a sazonal "complete 40 dungeons no Ciclo";
- avança o Contrato de Caça se ela for o alvo;
- rende moeda de Ciclo;
- rende o dobro se estiver na janela de Maré;
- alimenta o bestiary;
- e cada um desses gera XP de passe.

**Uma ação, sete contadores.** É por isso que o custo de produção é baixo: as camadas são **views sobre o mesmo fluxo de eventos**, não conteúdos separados.

## 12.2 O grafo

```
                    ┌──────────────────────────┐
                    │   ATIVIDADE DO JOGADOR   │
                    │ hunt · dungeon · boss    │
                    │ runa · loot · craft      │
                    └────────────┬─────────────┘
                                 │ (eventos de jogo)
        ┌───────────────┬────────┼────────┬────────────────┐
        ▼               ▼        ▼        ▼                ▼
   ┌─────────┐    ┌──────────┐ ┌──────┐ ┌───────────┐ ┌──────────┐
   │ DIÁRIAS │    │ SEMANAIS │ │ CICLO│ │ CONTRATOS │ │  MARÉ    │
   │ reset   │    │ reset    │ │saz.  │ │ (evento)  │ │ (multip.)│
   │ diário  │    │ semanal  │ │acum. │ │           │ │          │
   └────┬────┘    └────┬─────┘ └──┬───┘ └─────┬─────┘ └────┬─────┘
        │              │          │           │            │
        └──────────────┴────┬─────┴───────────┘            │
                            ▼                              │
                   ┌─────────────────┐                     │
                   │  XP DO PASSE    │                     │
                   │ "Trilha do      │                     │
                   │   Caçador"      │                     │
                   └────────┬────────┘                     │
                            │                              │
                            ▼                              ▼
                   ┌─────────────────┐          ┌─────────────────────┐
                   │ RECOMPENSAS     │─────────▶│  MOEDA DE CICLO     │
                   │ (marcos /5)     │          │        ↓            │
                   └─────────────────┘          │  LOJA DO CICLO      │
                                                └─────────────────────┘
```

## 12.3 Regras de composição

1. **O passe nunca cria trabalho.** Só conta. Se uma missão do passe exige algo que o jogador não faria de qualquer forma, ela está errada.
2. **Diária = 15–25 min.** Fechável em uma sessão curta. É o piso, e o helper deve conseguir carregar boa parte dela (princípio do dossiê: *helper executa repetição, jogador decide*).
3. **Semanal = 2–3 sessões.** Não fechável em um dia — obriga ritmo, não presença diária.
4. **Sazonal = passiva.** Progride sozinha jogando normalmente. Nunca deve exigir uma atividade específica que não seja o loop principal.
5. **Evento (Contrato) alimenta as três.** Um contrato conta como dungeon, como caça e como progresso sazonal. **Nunca é uma economia paralela.**
6. **A Maré multiplica o resultado, não o progresso.** Dobra loot e materiais; **não** dobra XP de passe nem contagem de missão. Senão vira obrigação de agendar o jogo à janela — que é exatamente o tipo de FOMO que queremos evitar.
7. **A moeda de Ciclo é o denominador comum.** Diárias, semanais, contratos e passe todos pagam nela. A loja do Ciclo é o sumidouro único. Isso simplifica o balanceamento a **uma** curva em vez de cinco.

## 12.4 Como isso vira orçamento de progressão

Referência dos dados coletados (WuWa F2P, ~6 semanas): eventos ≈ 2.000–3.000 de ~12.000–16.000 de renda total, com diárias somando a maior fatia.

Proporção-alvo sugerida para um Ciclo de Huntbound `[inferência, a validar no W09]`:

| Fonte | % da renda do Ciclo |
|---|---|
| Diárias | ~35% |
| Semanais | ~20% |
| Passe (marcos) | ~20% |
| Contratos / eventos do Ciclo | ~20% |
| Login / entrada | ~5% |

**Leitura:** eventos são o pico e o tempero, **não** a base. Se eventos passarem de ~25%, quem não joga o evento fica para trás — e num single-player isso é falha de design, não alavanca de retenção.

---

# 13. Riscos

## 13.1 Risco de escopo — o mais grave

**O risco:** copiar a *variedade* de HSR/WuWa sem ter o time deles. Eles produzem 4–6 eventos por patch com centenas de pessoas.

**Mitigação:** aceitar que **~80% dos nossos "eventos" serão configuração de dados**, e que os 20% caros simplesmente não existirão. Se um evento não puder ser descrito como "conteúdo existente + modificador + tabela", ele não é evento — é conteúdo do jogo.

## 13.2 Conteúdo gerado por dados vira repetitivo rápido

**O risco:** o jogador percebe que "Contrato de Caça" é sempre a mesma dungeon com um buff diferente. Em jogo de milhões, a novidade social encobre; num single-player, não.

**Mitigação:**
- Modificadores que mudam **decisão**, não números. "Inimigos com 30% mais vida" é ruído; "sem poções" ou "morte custa progresso do contrato" é uma decisão.
- Combinar 2 modificadores de eixos diferentes gera variedade superlinear a partir de pool pequeno.
- Amarrar cada contrato ao **bestiary/bossiary** (W03) para que renda progresso permanente, não só recompensa temporária.

## 13.3 FOMO num single-player é veneno

**O risco:** aplicar mecanismos de retenção desenhados para jogos com monetização diária. Num single-player, a pressão não converte em nada — só faz o jogador sentir que está jogando errado, ou pior, largar por culpa.

**Mitigação:**
- Passe não expira recompensa não coletada (11.4).
- Conteúdo de Ciclo passado permanece acessível — nosso equivalente do *Conventional Memoir*.
- Nada narrativo é temporário. Nunca.
- Se houver modo offline com relógio, **considerar Ciclos ancorados ao progresso do jogador** e não ao calendário real. Um jogador que compra o jogo dois anos depois não deve encontrar um esqueleto de conteúdo expirado.

## 13.4 Diárias viram obrigação

**O risco:** o problema clássico do gênero. Diária deixa de ser oportunidade e vira imposto — e o jogador para de jogar pela dungeon e passa a jogar pela checkbox. Isso colide de frente com a proposta do dossiê ("Tibia para quem não tem tempo para grind infinito").

**Mitigação:**
- Diárias **acumuláveis** (perder um dia não zera; até N dias de estoque). É a melhor mitigação existente e vale mais que qualquer outra.
- A camada sazonal existe justamente para desarmar o pânico de perder o dia.
- Helper deve conseguir absorver a parte mecânica.
- **Testar:** conseguir terminar o passe jogando **só nos fins de semana**. Se não der, está apertado demais.

## 13.5 Multiplicador quebra a curva de progressão

**O risco:** "dobro de loot" sem cap destrói o balanceamento do W09 e transforma o resto do Ciclo em conteúdo obsoleto.

**Mitigação:** cap explícito de resgates, exatamente como o *Garden of Plenty* faz. E o multiplicador nunca deve tocar a **fonte de gargalo principal** do endgame — só as fontes secundárias.

## 13.6 Complexidade de UI e carga cognitiva

**O risco:** cinco camadas simultâneas (diária, semanal, sazonal, contrato, maré) = cinco listas, cinco badges, cinco telas. O jogador se perde e o menu vira o jogo.

**Mitigação:**
- **Uma tela única de Ciclo** com tudo. HSR/WuWa erram aqui e não devem ser copiados nesse ponto.
- O jogador precisa responder "o que eu faço agora?" em **um clique**.
- Sugestão: uma linha de "próxima meta" que mostra a coisa mais próxima de completar, entre todas as camadas.

## 13.7 Manutenção após o lançamento

**O risco:** desenhar um sistema de Ciclos que exige um humano preparando cada Ciclo. Se o desenvolvimento parar, o jogo apodrece.

**Mitigação:** o gerador de Ciclos deve funcionar com **pool + regras de combinação**, produzindo Ciclos válidos indefinidamente. Ciclos curados são um bônus por cima, não o requisito.

## 13.8 Framework de modificadores como dependência estrutural

**O risco:** metade das ideias deste documento assume que existe um sistema genérico de modificadores de regra aplicável a hunts, dungeons, bosses e roguelite. Se ele não for desenhado cedo, cada evento vira código específico — e voltamos ao custo alto.

**Mitigação:** tratar o **framework de modificadores** como dependência arquitetural de primeira classe, junto com o sistema de missões/objetivos. São os dois pilares que tornam o resto barato. Registrar isso no plano de implementação (W-arquitetura).

---

# 14. Resumo executivo

1. **Patch/Ciclo é o contêiner.** ~6 semanas nos dois jogos; recomendo **4** para nós.
2. **~80% dos eventos são recombinação de sistemas existentes.** Só ~20% é conteúdo caro — e é o que devemos cortar.
3. **O passe não gera conteúdo; ele conta o que o jogador já faz.** Três velocidades: diária, semanal, sazonal.
4. **Moeda de evento + loja de estoque limitado** é o padrão universal e é quase de graça de implementar.
5. **Eventos são o pico da economia, não a base.** ~20–25%, com diárias na maior fatia.
6. **A melhor lição de HSR é o Conventional Memoir:** separar FOMO de recompensa de FOMO de conteúdo, e eliminar o segundo.
7. **A melhor lição de WuWa é o roguelite rotativo:** um sistema caro construído uma vez vira conteúdo novo indefinidamente.
8. **A dependência crítica é um framework de modificadores de regra.** Sem ele, nada disso é barato.

---

# 15. Fontes

**Honkai: Star Rail — eventos**
- [All Events and Schedule | Honkai: Star Rail — Game8](https://game8.co/games/Honkai-Star-Rail/archives/408749)
- [Honkai Star Rail events August 2026 — Pocket Tactics](https://www.pockettactics.com/honkai-star-rail/events)
- [Honkai: Star Rail Doubles Planar Ornament Drops for a Limited Time — Game Rant](https://gamerant.com/honkai-star-rail-planar-ornament-drops-doubled-limited-time/)
- [Honkai Star Rail 1.5 Planar Fissure event: Double drops and more — Sportskeeda](https://sportskeeda.com/esports/news-honkai-star-rail-1-5-planar-fissure-event-double-drops)
- [Honkai Star Rail Calyx Double Drop Events Guide — BitTopup](https://bittopup.com/article/Honkai-Star-Rail-Calyx-Double-Drop-Events-Guide-Dec-2025)
- [Honkai: Star Rail 4.4 Phase 2: New Characters, Events, and Rewards — Lotkeys](https://www.lotkeys.com/en/blog/detail/honkai-star-rail-4-4-phase-2-new-characters-events-and-rewards)
- [Honkai: Star Rail Event Guide — sammypiccolo.com](https://sammypiccolo.com/hsr-event-guide/)

**Honkai: Star Rail — battle pass (Nameless Honor)**
- [Nameless Honor Battle Pass Guide — Icy Veins](https://www.icy-veins.com/honkai-star-rail/battle-pass)
- [How To Unlock And Finish The Battle Pass In Honkai: Star Rail — TheGamer](https://www.thegamer.com/honkai-star-rail-nameless-honor-battle-pass-guide/)
- [Honkai: Star Rail: Nameless Honor Explained and How to Rank Up — Push Square](https://www.pushsquare.com/guides/honkai-star-rail-nameless-honor-explained-and-how-to-rank-up)
- [All Honkai Star Rail Nameless Honor Battle Pass rewards — Sportskeeda](https://sportskeeda.com/esports/all-honkai-star-rail-nameless-honor-battle-pass-rewards)
- [Honkai Star Rail Nameless Honor: A Complete Guide — TopUpLive](https://www.topuplive.com/news/hsr-nameless-honor.html)

**Honkai: Star Rail — catch-up e FOMO**
- [Honkai Star Rail Conventional Memoir: Replay time-limited events — GamingOnPhone](https://gamingonphone.com/news/honkai-star-rail-conventional-memoir-replay-time-limited-events/)
- [How to Replay Older Events in Honkai: Star Rail — Prima Games](https://primagames.com/tips/how-to-replay-older-events-in-honkai-star-rail)
- [Returning Player Guide and How to Catch Up — Game8](https://game8.co/games/Honkai-Star-Rail/archives/600195)
- [Best Permanent Honkai: Star Rail Events, Ranked — TheGamer](https://www.thegamer.com/honkai-star-rail-best-permanent-events/)

**Honkai: Star Rail — economia**
- [Honkai Star Rail Stellar Jade Guide — BitTopup](https://bittopup.com/article/Honkai-Star-Rail-Stellar-Jade-Guide-2025-14310-F2P-Income)
- [HSR Currency Complete Guide — LDShop](https://www.ldshop.gg/blog/honkai-star-rail/currency-complete-guide.html)
- [How many Pulls in Honkai Star Rail 3.5 — LDShop](https://www.ldshop.gg/blog/guide/how-many-pulls-hsr-3-5.html)

**Wuthering Waves — eventos**
- [List of Events and Schedule | Wuthering Waves — Game8](https://game8.co/games/Wuthering-Waves/archives/453473)
- [Wuthering Waves events schedule — Pocket Tactics](https://www.pockettactics.com/wuthering-waves/events)
- [Category:Recurring Events — Wuthering Waves Wiki](https://wutheringwaves.fandom.com/wiki/Category:Recurring_Events)
- [Depths of Illusive Realm — Wuthering Waves Wiki](https://wutheringwaves.fandom.com/wiki/Depths_of_Illusive_Realm)
- [1.4 Depths of Illusive Realm Guide — Game8](https://game8.co/games/Wuthering-Waves/archives/453491)
- [Somnoire: Illusive Realms — Wuthering Waves Wiki](https://wutheringwaves.fandom.com/wiki/Somnoire:_Illusive_Realms)
- [WuWa Version 1.4 Patch Notes — GuildJen](https://guildjen.com/wuwa-version-1-4-when-the-night-knocks-patch-notes/)

**Wuthering Waves — battle pass (Pioneer Podcast)**
- [Pioneer Podcast Battle Pass Guide — Game8](https://game8.co/games/Wuthering-Waves/archives/454355)
- [How to unlock Wuthering Waves Pioneer Podcast battle pass and all rewards — Dot Esports](https://dotesports.com/wuthering-waves/news/how-to-unlock-wuthering-waves-pioneer-podcast-battle-pass-and-all-rewards)
- [Wuthering Waves Battle Pass Rewards, Which Weapon to Pick — Gfinity Esports](https://www.gfinityesports.com/article/wuthering-waves-battle-pass-pioneer-podcast)
- [WuWa Pioneer Broadcast Battle Pass Guide — TopUpLive](https://www.topuplive.com/news/wuwa-battle-pass-guide.html)
- [Lustrous Tide — Wuthering Waves Wiki](https://wutheringwaves.fandom.com/wiki/Lustrous_Tide)

**Wuthering Waves — cadência e economia**
- [All Version Updates and Release Dates — Game8](https://game8.co/games/Wuthering-Waves/archives/559680)
- [Wuthering Waves Event Calendar 2026 — WuWa Tools](https://wuwa.uk/event-calendar)
- [Wuthering Waves 3.4: How Many Pulls & Astrite Count — TopUpLive](https://www.topuplive.com/news/wuthering-waves-3-4-how-many-pulls-astrite-count.html)
- [Wuthering Waves 3.5: How Many Pulls & How Much Astrite — TopUpLive](https://www.topuplive.com/news/wuthering-waves-3-5-pulls-count.html)
- [WuWa F2P Astrite Optimization — 30-Day Income Routine 2026 — GameMarket.gg](https://gamemarket.gg/news/wuthering-waves/wuwa-f2p-astrite-optimization-30-day-income-routine-2026)
- [Wuthering Waves Pull Strategy 2026 — WuWa Tools](https://wuwa.uk/articles/pull-strategy-2026)

**Cadência de patch e design de live service (geral)**
- [Version | Genshin Impact Wiki](https://genshin-impact.fandom.com/wiki/Version)
- [Examining Live Service Design — SUPERJUMP Magazine](https://www.superjumpmagazine.com/examining-live-service-design/)
- [The Variety of Design With Live Service Games — Game Wisdom](https://game-wisdom.com/critical/live-service-games)
- [The Gameplay of Gacha — SUPERJUMP](https://www.superjumpmagazine.com/the-gameplay-of-gacha/)
- [Gacha Game Analysis and Design (paper, Tsinghua)](https://magickd.github.io/papers/gacha.pdf)
- [Gacha Game Design: The Core Elements and Systems — Alchemy of Game Design](https://oozbey.blog/2023/03/28/gacha-game-design-the-core-elements-and-systems/)

---

*Documento W08. Sem implementação de código, conforme o briefing.*
