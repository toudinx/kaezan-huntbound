# W05 — WAKFU: Rifts / Fendas Dimensionais

> Pesquisa de referência para **Kaezan Huntbound**.
> Escopo: descrever fielmente as Dimensional Rifts do WAKFU e propor uma adaptação para um modo semanal/quinzenal em tempo real, top-down, tile-based, com helper.
> **Nenhum código implementado.**

---

## 0. Sumário executivo

**O que são as Fendas do WAKFU (fato):** um combate único, por turnos, de **40 turnos de duração máxima**, para **1 a 4 personagens**, em que **ondas de 4 monstros** aparecem continuamente. Ao limpar cada onda, **2 artefatos** surgem no chão; o time pega **um** andando sobre a célula e **o outro é entregue ao time inimigo**. A dificuldade sobe a cada onda; a recompensa também (**+8% de loot por onda** em fendas clássicas, **+18%** em ultimate). Sobreviver aos 40 turnos = fim normal do combate e recebimento de tudo. **Morrer antes dos 40 turnos = não ganhar nada.**

**Por que isso interessa ao Huntbound:** as Fendas resolvem, com muito pouca estrutura, três problemas que também são nossos:

1. **sessão de duração previsível** com desafio ilimitado (orçamento fixo de turnos, score = profundidade);
2. **decisão humana barata de produzir** (draft de 2 opções com custo de oportunidade real: o que você não pega, o inimigo pega);
3. **variedade de conteúdo a custo quase zero** (misturar famílias de monstros que nunca aparecem juntas, reaproveitando assets existentes).

**Onde o WAKFU erra e nós não devemos copiar:** falha tudo-ou-nada em uma run longa; opacidade total de números; conteúdo assumidamente fácil ("as batalhas não serão difíceis demais", palavras do próprio devblog) que acabou virando torneira de XP/loot farmada com level modulation, não desafio; e ausência de rota, loja, economia interna ou meta-progressão — o "roguelite" das Fendas é literalmente **só o draft de artefatos**, repetido 40 vezes.

**Proposta para o Huntbound (resumo):** Fenda como **modo de pico semanal com identidade rotacionada quinzenalmente**, de **12–18 minutos**, com **3 camadas + abismo opcional**, **orçamento de tempo real substituindo os 40 turnos**, **recompensa bancada por camada** (não tudo-ou-nada), **3 entradas por semana com moeda própria (não resina)**, e três camadas de decisão humana — **Sigilos (meta/permanente) → Cartas (run) → Estilhaços (encontro)** — todas resolvidas por *preparação e escolha*, nunca por execução de 0,2s, porque quem executa o combate é o helper.

---

# PARTE A — Descrição fiel do sistema do WAKFU

> Fonte primária: devblogs oficiais da Ankama (Updates 1.72 e 1.73) e a Wakfu Wiki (wiki.gg). Onde a wiki atual e o devblog original divergem, a divergência está marcada.

## A.1 Origem e intenção declarada

- Introduzidas no **Update 1.72 (devblog de 06/05/2021)**.
- Substituem/evoluem as antigas **Mobile Arenas**, cujo problema declarado era não ter limite de duração: *"They could sometimes go on for hours!"*
- Intenção declarada pela Ankama:
  - oferecer **ondas "infinitas"** de monstros;
  - complementar (não substituir) as dungeons, com **batalhas imprevisíveis, cada uma diferente da anterior**;
  - pedir ao jogador **escolhas adicionais no decorrer de uma batalha**;
  - ser uma **mecânica universal**, divertida em qualquer nível, com qualquer tamanho de grupo e qualquer nível de dificuldade desejado.
- No **Update 1.73 (25/08/2021)** foram adicionadas duas fendas novas (Amakna 110–125 e Osamosa 200–215), o sistema de **artefatos lendários** e aumentos de XP/loot.

## A.2 Acesso, composição e nivelamento de entrada

| Item | Regra |
|---|---|
| Tamanho do grupo | 1 a 4 personagens (Heroes e Sidekicks contam) |
| Requisito de nível | **Todo personagem precisa ter nível ≥ nível da fenda** |
| Custo de entrada (clássica) | Nenhum |
| Custo de entrada (ultimate) | **Chave craftada**, feita com recursos que só dropam em fendas clássicas |
| Acesso físico | Portal visível no mapa-múndi |

**Bônus por grupo reduzido** (compensação para quem entra com menos gente). Fato relevante: o solo é *fortemente* compensado.

| Aliados | Bônus por personagem (fenda clássica) | Bônus por personagem (ultimate) |
|---|---|---|
| 1 (solo) | +9 PA, +5 PM, +1800% do nível em HP, +270 Resistência Elemental, +90 Dano Infligido e Curas | +12 PA, +6 PM, +2400% HP, +360 Res., +120 Dano/Curas |
| 2 | +6 PA, +3 PM, +1200% HP, +180 Res., +60 Dano/Curas | +9 PA, +5 PM, +1800% HP, +270 Res., +90 Dano/Curas |
| 3 | +3 PA, +2 PM, +600% HP, +90 Res., +30 Dano/Curas | +6 PA, +3 PM, +1200% HP, +180 Res., +60 Dano/Curas |
| 4 | **Nenhum** | +3 PA, +2 PM, +600% HP, +90 Res., +30 Dano/Curas |

> Leitura de design: a ultimate rift dá a um grupo cheio o mesmo bônus que a clássica dá a um trio — ou seja, a "dificuldade extra" da ultimate é parcialmente devolvida em stats.

## A.3 Duração

- **Hard cap de 40 turnos.** O combate termina automaticamente.
- O devblog é explícito quanto ao objetivo: *"Your goal will be to survive these 40 turns and defeat as many waves of monsters as you can."*
- O jogador pode jogar no ritmo que quiser: dá para matar **uma única onda** em 40 turnos, ou empilhar muitas.
- Em tempo real de relógio, uma fenda completa de 40 turnos com 4 jogadores é **longa** (dezenas de minutos), porque é um jogo tático por turnos com IA e movimentação. Este é um ponto crítico para a adaptação (ver Parte C).

## A.4 Estrutura de ondas

| Aspecto | Regra |
|---|---|
| Monstros por onda | **4** (clássica); **2 bosses** (ultimate) |
| Posicionamento | Semi-aleatório |
| Spawn da onda seguinte | **Imediato** ao limpar a anterior — não espera o próximo turno |
| Timeline | Os novos monstros são intercalados na timeline com os personagens, permitindo antecipação |
| Escalonamento | *"For each new wave, the difficulty will increase: the monsters will be a little stronger and a little tougher."* |
| Contador | Um **contador de ondas** no canto superior esquerdo é a métrica de dificuldade e de recompensa |
| Onda inicial | **Não é sempre 1.** Depende do *gap* entre o nível da fenda e o nível dos personagens; escala **pelo jogador de maior nível do grupo** |
| Composição | Cada fenda mistura **famílias de monstros que normalmente não aparecem juntas** (ex.: Tainela = Gobballs + Tofus + Treechnees + Skeletons) |
| Aleatoriedade entre tentativas | Composição e posição das ondas + quais artefatos são oferecidos e onde aparecem |

> A decisão de "começar em uma onda mais alta" é elegante: mantém a **duração constante (40 turnos)** e usa a **dificuldade inicial** como variável de escala. O devblog declara isso explicitamente: times poderosos ainda encontram desafio em fendas de nível baixo porque avançam rápido no contador.
>
> A fórmula exata do *gap de nível → onda inicial* **não é pública**. Não encontrei documentação oficial nem datamining em inglês. Tratar como hipótese.

## A.5 Artefatos — a mecânica-assinatura

Ao limpar cada onda, **2 artefatos** (4 na ultimate) surgem no campo em posições parcialmente aleatórias.

- O personagem **anda sobre a célula** para pegar. O artefato pega é atribuído ao **time do jogador**.
- **O artefato não pego é automaticamente atribuído ao time dos monstros.** (Na ultimate: 4 aparecem, jogadores pegam 2, monstros ficam com 2.)
- Se ninguém pegar nada até a próxima onda, os artefatos são **distribuídos aleatoriamente entre os dois times**.
- Bônus são **empilháveis** e duram **até o fim do combate**. Os artefatos são perdidos ao fim da luta (nada é permanente).
- Pergunta de design colocada pelo próprio devblog: *"should you focus on choosing the right artifact for your own team, or the artifact that you don't want to give to the monsters' team?"*

### Raridades (versão atual, conforme wiki)

| Raridade | Bônus | Malus |
|---|---|---|
| **Wakfu** | Base (ex.: 6% Dano Melee, −6% Dano Recebido, +6 Curas, +50% Esquiva) | Nenhum |
| **Stasis** | **2×** o base | Time inteiro sofre **12% do HP máximo** de dano |
| **Shushu** | **3×** o base | Time inteiro sofre **−100 PM e fica Estabilizado por 1 turno** |

Aparências/efeitos catalogados: Amuleto (Vontade), Machado (Dano de Área), Botas e Anel (Esquiva), Arco (Dano à Distância), Adaga (Dano pelas Costas), Martelo (Dano Melee), Escudo (Dano Recebido), Cajado (Armadura concedida), Espada (Dano Alvo Único), Varinha (Curas).

> **Divergência documentada:** o devblog de 1.72 anunciava **4 categorias** — Wakfu, Stasis, Shushu (bônus extremos durando **1 turno**) e **Divine** (bônus grandes, time imobilizado 1 turno). A wiki atual descreve **3 raridades**, com o Shushu absorvendo o malus de imobilização que era do Divine. Ou seja: **o plano publicado e a versão entregue divergem.** Usar a wiki como estado atual.

### Artefatos lendários (Update 1.73)

- **A cada 5 ondas**, no lugar dos artefatos normais, aparecem **2 lendários** (4 na ultimate).
- São **efeitos passivos que mudam a forma de jogar**, não apenas números. Objetivo declarado: *"add more surprises and key decision branches, and thus make rifts more replayable."*

Exemplos oficiais (lista não exaustiva à época):

| Lendário | Efeito |
|---|---|
| Fountain of Youth | Aliado que perde PM/alcance ou é movido recupera 5% do HP máximo |
| Anvil | Se o personagem não se mover no turno, ganha Armadura = 20% do HP máximo |
| Cracked Pearl | +20% Dano Infligido para atacantes com 100% de HP |
| Moogrrose | Primeiro ataque do turno causa +40% de dano; ataques seguintes, −40% |
| Teapot | Se não causar dano no turno, recupera 50% do HP faltante |
| Dragon Scale | Se não tomar dano fora do próprio turno, ganha Armadura = 10% do HP máx. |
| Small Whistle | Converte 50% do Lock em Domínio à Distância (o Lock convertido é perdido) |
| Sundial | Turnos ímpares +2 PM / turnos pares −2 PM |
| Boots of Alacrity | +2 PM para personagens acima de 90% de HP |
| Compass | No fim do turno, troca de lugar com o aliado ou inimigo mais próximo |

> Padrão notável: quase todos são **condicionais comportamentais** ("se você não se mover", "se não causar dano", "se estiver com HP cheio"). Eles **reescrevem a política de jogo**, não o dano. Isso é diretamente reaproveitável em tempo real e, importante para nós, é exatamente o tipo de regra que um **helper com perfis** consegue obedecer.

## A.6 Life Orbs

- Quando um monstro morre, um **orbe de vida** aparece na célula dele.
- Andar sobre o orbe recupera **uma porcentagem do HP perdido**.
- O orbe permanece no campo por **1 turno**.
- Justificativa declarada: permitir lutas com muitos inimigos **sem exigir um healer forte no time**.

> Isso é uma das melhores ideias do sistema para nós: transforma sustentação em **problema de posicionamento** em vez de problema de composição. Em top-down em tempo real, é praticamente gratuito de implementar e o helper resolve bem.

## A.7 Condições de vitória e de falha

| Condição | Resultado |
|---|---|
| Sobreviver até o fim do turno 40 | Combate encerra; jogador recebe **tudo** o que acumulou |
| Limpar ondas | Não há "vitória" no sentido de zerar — não existe fim de conteúdo, só profundidade |
| Wipe antes do turno 40 | *"if you lose the fight before the 40 turns are up, you won't win anything!"* — **perda total** |

Consequência direta: o design **empurra para o conservadorismo**. O devblog admite: *"You'll need to be cautious and avoid taking any unnecessary risks."* O push-your-luck existe, mas o custo do erro é a run inteira.

## A.8 Recompensas

- Ao fim da luta, o jogador recebe **tudo associado aos monstros que derrotou**: experiência, recursos, itens — o loot normal daquelas criaturas, como se estivessem fora da fenda.
- **Bônus cumulativo por onda alcançada** (valores pós-1.73):
  - **Fenda clássica: +8% de loot por onda** (era 6%);
  - **Fenda ultimate: +18% de loot por onda** (era 12%).
- **XP:** no 1.73 a Ankama removeu a penalidade de XP quando o nível total do time de monstros excedia o do time do jogador. Objetivo declarado: *"give players experience gains in rifts that are competitive with those in dungeons."*
- **Recompensas exclusivas de fenda:**
  - **Sublimações específicas por fenda** (4 por fenda, ver tabela A.9);
  - **Pets** — objetivo declarado de que as fendas se tornem a via para obter **todos os pets antes monetizados na loja**;
  - **Recursos novos**, incluindo os **fragmentos de chave** para as fendas ultimate (ex.: *Tainela Rift Key Fragment*).
- **Ranking mensal (anunciado no 1.72):** personagens ranqueados pelo número de monstros derrotados; só conta quando a batalha chega ao turno 40; um ranking por fenda, todos os formatos de time juntos; **sem recompensas exclusivas**, apenas as usuais em maior quantidade. *Não consegui confirmar na wiki atual se esse ranking continua ativo — tratar como estado incerto.*

## A.9 Catálogo de fendas (estado atual segundo a wiki)

| Fenda | Tipo | Nível | Local | Sublimações |
|---|---|---|---|---|
| Tainela | Clássica | 21 | Tainela | Arcana, Strong Hand, Vital Return, Lock Steal |
| Sufokia | Clássica | 66 | Terrana Dune | Solid Weapon, Counterattack, Nature, Wakfu Influence |
| Frigost | **Ultimate** | 111 | Harebourg Castle | Courage, Berserk Wakfu, Light Weapons Expert, About-Turn |
| Amakna | Clássica | 111 | Riktus Plain | Reinvigoration, Technical Critical, Precaution, Abandon |
| Bonta | Clássica | 141 | Thicket of Yurbut | Destruction, Armor Length, Flaming Return, Dodge Steal |
| Moon | Clássica | 171 | Moon | Altruism, Poisoned Weapon, Mania, Social Relations |
| Mount Zinit | **Ultimate** | 201 | Summit | Last Breath, Firm Foot, Sensitivity, Raw Power |
| Osamosa | Clássica | 201 | Dorsal Forest | Offensive Block, Tactical Critical, Neutrality, Pretension |
| Shusuft | Clássica | 216 | Fallen Souls' Crossing | Ambition, Brawling, Critical Preparation, Locking |
| Shusuft | **Ultimate** | 216 | Fallen Souls' Crossing | Delay, Carapace, Heavy Armor, Featherweight |

Observações:
- Cobertura de níveis **21 → 216**, ou seja, a fenda é conteúdo de **toda a curva**, não só endgame.
- As ultimate reaproveitam **bosses já existentes do jogo** (ex.: Shusuft ultimate junta Sor'Hon, Vaal'Enthia, Ar'Nan, Crateros). Custo de produção quase nulo.

## A.10 Variação com bosses: Ultimate Rifts

| Diferença | Clássica | Ultimate |
|---|---|---|
| Entrada | Livre | **Chave craftada** (recursos exclusivos de fendas clássicas) |
| Composição da onda | 4 monstros normais | **2 bosses** |
| Artefatos por onda | 2 aparecem, 1 escolhido | **4 aparecem, 2 escolhidos** |
| Lendários (a cada 5 ondas) | 2 | 4 |
| Bônus de loot por onda | +8% | **+18%** |
| Bônus de grupo | Grupo cheio não ganha nada | Grupo cheio ainda ganha bônus |

> Design de gate: a ultimate é **alimentada pela clássica**. Isso cria um pipeline de dois estágios sem precisar de sistema de energia — o limitador é o consumo de chaves. **Padrão diretamente reaproveitável.**

## A.11 Repeatability

- **Fendas clássicas: repetição ilimitada, sem cooldown, sem custo de entrada.**
- **Fendas ultimate: limitadas por chaves**, cuja produção depende de farmar fendas clássicas.
- Não há trava diária/semanal declarada. A limitação real é **tempo humano por run** (40 turnos táticos) e a **chave** para o modo difícil.
- O único elemento com cadência periódica anunciado é o **ranking mensal**.

## A.12 Interação com level modulation (Adjustable Level System)

Contexto do sistema (para conectar com o W04):
- O WAKFU permite ao jogador **baixar o próprio nível** para patamares fixos: **20, 35, 50, 65, 80, 98, 110, 125, 140, 155, 170, 185**.
- O XP ganho é multiplicado por `(nível real / nível ajustado do time)^2`, o que **recompensa modular para baixo** em vez de punir.

Interação com Fendas:
- A fenda exige **nível ≥ nível da fenda**; a escala usa o **maior nível do grupo**. Um personagem modulado para baixo entra numa fenda de nível compatível **começando em uma onda mais baixa** e enfrentando monstros que ele derruba com eficiência de um personagem de nível real muito maior.
- **Consequência observada na comunidade:** a combinação *fenda + ALS* virou estratégia conhecida de XP (existem guias públicos do tipo *"How to Sufokia Rift on NEW ENI (80 ALS) XP CHEAT!!!"*). Ou seja, **o sistema de modulação transformou a fenda de "desafio infinito" em "torneira de XP otimizada"**.
- Isso não é bug; é a consequência de somar: (a) conteúdo declaradamente não muito difícil, (b) bônus generoso para solo, (c) multiplicador de XP por modulação, (d) repetição ilimitada.

**Lição para o Huntbound:** se existir modulação de nível *e* um modo de ondas com recompensa por profundidade *e* repetição ilimitada, o jogador vai encontrar o ponto ótimo e farmar ele para sempre. O limitador tem que ser **estrutural** (entradas/semana), não de dificuldade.

## A.13 Percepção dos jogadores

> **Aviso de método.** O Reddit está bloqueado por política nesta sessão e a busca disponível é focada em resultados dos EUA, então **não consegui amostragem ampla de opinião**. O que segue são sinais verificados em fontes públicas acessíveis (fórum oficial, guias, títulos de conteúdo da comunidade), não uma pesquisa de sentimento. Marcado o que é fato observado vs. inferência.

**Fatos observados:**

1. **As fendas viraram conteúdo de referência para build.** Existe guia de classe no fórum oficial explicitamente escrito *"kinda focused on rifts"*, com recomendações do tipo "para fendas você usa esta skill para acertar dois ou mais inimigos". Ou seja, a fenda **pauta a construção de personagem** — sinal forte de conteúdo relevante.
2. **Descoberta é ruim.** Thread do fórum oficial (out/2022) de um jogador nível 193 perguntando **quais fendas existem e para qual nível cada uma serve**; a resposta foi "aperte D e pesquise 'Rift'". Um jogador de nível alto não sabia onde o conteúdo estava.
3. **Opacidade de números é reclamação real.** Thread de out/2025 pedindo as **drop rates das sublimações de fenda**; a resposta da comunidade: *"I believe this information is not available"*, e que a taxa depende de "em que nível você roda a fenda, PP/poção de loot e quantas ondas você limpa". Quatro anos depois do lançamento, **os jogadores ainda não sabem a matemática da recompensa principal do modo**.
4. **A comunidade otimizou a fenda como farm de XP via ALS**, não como pico de dificuldade (ver A.12).
5. **Solo é viável e popular** — há conteúdo de comunidade de fendas ultimate solo em nível máximo.

**Inferências (não confirmadas por survey):**

- O modo é percebido como **bom farm e boa fonte de sublimações/pets**, e apenas secundariamente como desafio — coerente com a intenção declarada da Ankama de que "as batalhas não serão difíceis demais".
- A tensão real do modo mora quase toda na **escolha de artefato**, não no combate. Sem essa mecânica, seriam 40 turnos de trash.
- O tamanho da run (40 turnos por turnos) combinado com **perda total em wipe** é o ponto mais caro para o jogador — e a razão pela qual o devblog precisa dizer "evite riscos desnecessários".

---

# PARTE B — Pontos fortes e fracos

## B.1 Pontos fortes (copiar)

| # | Força | Por que funciona | Aplicabilidade no Huntbound |
|---|---|---|---|
| 1 | **Orçamento fixo (40 turnos) com profundidade variável** | Duração previsível + teto de desafio inexistente. Resolve o problema histórico das Mobile Arenas ("horas") | **Alta.** É exatamente o que precisamos para proteger a sessão curta |
| 2 | **Escala por onda inicial, não por duração** | Personagem forte não faz a run mais longa, faz mais difícil | **Alta.** Protege o tempo de sessão em qualquer estágio de conta |
| 3 | **Draft de 2 com custo de oportunidade dupla** ("o que você recusa, o inimigo ganha") | Uma única regra gera decisão, tensão e escalada de dificuldade emergente | **Altíssima.** Barato, legível, e é decisão *humana* mesmo com helper |
| 4 | **Lendários a cada 5 ondas** | Cria batida/ritmo e ponto de virada; efeitos condicionais mudam política, não só números | **Alta.** Vira nosso "marco de camada" |
| 5 | **Mistura de famílias de monstros** | Variedade a custo ~zero, reaproveitando assets. Gera "sinergias inesperadas" | **Altíssima.** Nosso maior gargalo é custo de conteúdo |
| 6 | **Life orbs** | Sustentação vira posicionamento; dispensa healer dedicado | **Alta.** Trivial em tempo real, ótimo com helper |
| 7 | **Bônus de loot por onda (+8% / +18%)** | Push-your-luck legível em uma linha | **Alta**, com ressalva (ver B.2 #1) |
| 8 | **Ultimate alimentada pela clássica (chave craftada)** | Pipeline de dois estágios sem sistema de energia | **Alta.** Casa com nosso modelo de recursos |
| 9 | **Bônus de composição para grupo pequeno** | Solo é conteúdo de primeira classe | **Média.** Somos single-player; vira "bônus por restrição voluntária" |
| 10 | **Aleatorização entre tentativas** (composição, posição, artefatos ofertados) | Replay sem produzir mais conteúdo | **Alta** |

## B.2 Pontos fracos (não copiar / corrigir)

| # | Fraqueza | Consequência observada | Correção proposta |
|---|---|---|---|
| 1 | **Tudo-ou-nada:** wipe antes do turno 40 = zero recompensa | O próprio devblog recomenda jogar com cautela. Push-your-luck com punição desproporcional vira aversão a risco | **Bancar recompensa por camada.** Aposta é opcional e explícita |
| 2 | **Dificuldade deliberadamente baixa** ("won't be too hard") + bônus solo generoso | O modo virou farm otimizado, não pico de desafio | **Separar formalmente** o eixo Desafio (Pressão escolhida) do eixo Farm (modo livre, recompensa menor) |
| 3 | **Opacidade total** de drop rates, fórmula de onda inicial e escalonamento | 4 anos depois, comunidade não sabe as taxas; impossível otimizar de forma informada | **Mostrar a tabela de recompensa na tela de entrada.** Pity visível |
| 4 | **Estrutura monótona:** 40 ondas idênticas em estrutura, um único mapa, nenhuma rota | O "roguelite" é só o draft. Não há loja, economia interna, nem escolha de caminho | **Nós/rota + loja + moeda temporária + tipos de encontro variados** |
| 5 | **Zero meta-progressão dentro do modo** | Nada que se construa entre runs; artefatos morrem no fim da luta | **Sigilos**: camada permanente comprada com moeda da Fenda |
| 6 | **Exploração via level modulation** | Fenda de nível baixo com ALS vira melhor XP do jogo | **Modulação para baixo obrigatória no modo semanal** + entradas limitadas |
| 7 | **Descoberta ruim** (jogador nível 193 não sabia quais fendas existiam) | Conteúdo bom, invisível | **Uma única entrada no hub**, com a Fenda da quinzena em destaque |
| 8 | **Duração real longa e imprevisível** (40 turnos táticos, 4 jogadores) | Incompatível com sessão curta | **Relógio real, não turnos.** 12–18 min |
| 9 | **Sem gate de repetição na clássica** | Sem entrada limitada, o ótimo é repetir infinitamente | **Entradas semanais.** Crítico para nós por causa do helper |
| 10 | **Ranking mensal competitivo** de status incerto | Baixo valor em single-player | **Substituir por marcos pessoais de profundidade** |

---

# PARTE C — Proposta adaptada para o Huntbound

## C.0 Princípios da tradução turnos → tempo real

| Elemento WAKFU (turnos) | Tradução Huntbound (tempo real) | Justificativa |
|---|---|---|
| 40 turnos de orçamento | **Relógio de Estabilidade** (contagem regressiva de tempo real) | Mesmo contrato: recurso finito, gasto no ritmo do jogador |
| "Sobreviver 40 turnos" | "Sobreviver até a Fenda colapsar" | Idêntico |
| Onda inicial mais alta por nível | **Pressão inicial** mais alta | Mantém duração fixa e escala dificuldade |
| Andar na célula do artefato | **Andar sobre o Estilhaço** em uma janela de tempo | Traduz literal: decisão física com custo posicional |
| Artefato recusado vai ao inimigo | Estilhaço recusado é **absorvido pela Fenda** e modifica todos os inimigos futuros | Mesma tensão, e escalada fica visível |
| Timeline intercalada permitindo antecipar | **Telegrafia de spawn**: marcadores no chão 1,5 s antes | Antecipação é o que substitui a leitura de timeline |
| Life orb dura 1 turno | Orbe dura **6 s** e some | Mesma função: sustentação posicional e perecível |
| Bônus de grupo pequeno | **Bônus por restrição voluntária** (sem poções, sem cura do helper, classe única) | Somos single-player; o eixo vira autoimposição |

**Regra de ouro da adaptação, por causa do helper:**

> Nenhuma mecânica da Fenda pode ter como única solução uma reação de menos de meio segundo. Toda mecânica precisa ter uma resposta de **preparação** (build, carta, sigilo, resistência, perfil de helper, rota). Caso contrário, ou o helper trivializa, ou o helper falha e o jogador não tem agência.

## C.1 Forma geral do modo

**Nome de trabalho:** Fenda.

**Formato:** run única, contínua, single-player, com um personagem, contra ondas em salas de arena, sob um relógio global.

**Camadas de decisão (as três que sustentam o modo):**

| Camada | Quando é decidida | Escopo | Papel |
|---|---|---|---|
| **Sigilos** | No hub, antes de entrar | Permanente / conta | Construção de conta. Comprados com moeda semanal da Fenda |
| **Cartas** | Durante a run, em marcos | Só aquela run | Constrói a run; muda comportamento, não só números |
| **Estilhaços** | Depois de cada encontro | Só aquela run | Micro-decisão com custo de oportunidade contra a Fenda |

E, transversal: **Ecos** (moeda temporária) → **Loja** dentro da run.

## C.2 Estrutura de ondas — beat sheet

Rejeitamos explicitamente "40 ondas iguais" (preocupação já registrada no dossiê). Estrutura proposta:

```
ENTRADA  →  CAMADA I  →  CAMADA II  →  CAMADA III  →  [ABISMO opcional]
             6 nós        6 nós         6 nós          ondas infinitas
```

**Cada camada tem 6 nós**, dos quais 4 são combate. Ao fim de cada camada há um **Guardião** (elite/boss) e a **recompensa da camada é bancada**.

| Nó | Tipo | Duração alvo | Conteúdo |
|---|---|---|---|
| 1 | Onda comum | ~40 s | 6–10 inimigos de 2 famílias misturadas + draft de Estilhaço |
| 2 | Escolha de rota | — | 2 caminhos: "Denso" (mais inimigos, mais Ecos) vs "Instável" (modificador hostil, melhor Estilhaço) |
| 3 | Onda comum ou Evento | ~40 s | Evento = risco/recompensa sem combate (ex.: sacrificar 15% do HP máx. por uma Carta) |
| 4 | Onda de elite | ~60 s | 2 elites com afixos + draft de Estilhaço Lendário |
| 5 | Santuário / Loja | — | Gastar Ecos: cura, remover uma carta ruim, reroll, comprar fragmento de Chave |
| 6 | **Guardião** | ~90 s | Boss da camada. Ao vencer: **Carta (1 de 3)** + **banco da recompensa** |

**Por que 3 camadas de 6 nós:** dá ~14–16 minutos, tem três picos claros (os Guardiões), tem duas janelas de loja (decisão econômica repetida) e produz uma curva de tensão em vez de uma reta.

**Abismo (opcional, pós-Camada III):** ondas verdadeiramente infinitas com Pressão crescente rápida, até o relógio acabar ou o jogador morrer. Rende **apenas score e moeda de Sigilo**, nunca itens BiS. É aqui que mora a fantasia de "ondas infinitas" do WAKFU, sem torná-la obrigatória.

## C.3 Progressão temporária dentro da run

| Recurso | Origem | Uso | Sobrevive à run? |
|---|---|---|---|
| **Estilhaços** | 1 de 2 após cada onda | Bônus empilhável até o fim da run | ❌ |
| **Estilhaços Lendários** | Após cada elite (nós 4) e Guardião | Efeito condicional que muda a política de jogo | ❌ |
| **Cartas** | 1 de 3 após cada Guardião + eventos | Modifica skills, dash, postura, helper | ❌ |
| **Ecos** | Drop de inimigos, bônus por velocidade | Loja interna (cura, reroll, remoção, chave) | ❌ |
| **Fragmentos de Chave** | Loja + Guardiões | Craftar a chave da **Fenda Selada** | ✅ |
| **Ressonância** (moeda de fim de run) | Profundidade × Pressão | Comprar/subir **Sigilos** no hub | ✅ |

**Curva alvo de poder na run:** ao chegar no Guardião III o personagem deve estar em torno de **2,5×–3× o poder de entrada**, e os inimigos em torno de **3,5×–4×**. A run deve *parecer* uma escalada de poder e ainda assim ficar mais apertada — é isso que produz a decisão "banco agora ou empurro?".

## C.4 Buffs / Cartas / Sigilos — taxonomia

### Estilhaços (nível de encontro) — herdeiros diretos dos artefatos

Regra central preservada do WAKFU, com o twist:

> Dois Estilhaços caem no chão da arena. Você tem **8 segundos** para pisar em um. **O outro é absorvido pela Fenda** e aplica seu efeito espelhado a **todos os inimigos até o fim da run**. Se você não pegar nenhum, a Fenda fica com os dois.

Raridades, herdando o padrão bônus-com-malus:

| Raridade | Bônus | Malus |
|---|---|---|
| **Comum** | Base | Nenhum |
| **Instável** | 2× base | Perde 10% do HP máximo permanentemente na run |
| **Corrompido** | 3× base | Fenda ganha +1 nível de Pressão imediato |

Exemplos de efeito base (números ilustrativos, a validar): +8% dano melee; −8% dano recebido; +10% velocidade de movimento; +1 carga de dash; +12% de raio das runas; +15% de cura de orbes.

### Cartas (nível de run) — mudam comportamento

Devem seguir o padrão dos **artefatos lendários** do WAKFU: condicionais que reescrevem a política, não bônus percentuais.

Exemplos:
- *Bigorna* — se você não se mover por 2 s, ganha escudo = 20% do HP máx.
- *Pêndulo* — dash não tem cooldown, mas cada dash consome 3% do HP atual.
- *Sanguessuga* — orbes de vida curam o dobro, mas só surgem de inimigos mortos por corpo a corpo.
- *Metrônomo* — a cada 5 s alterna +30% dano / −30% dano recebido.
- *Voto de Silêncio* — você não pode usar runas; +45% de dano de arma.

Critério de aceitação de uma Carta: **precisa ser configurável no perfil do helper**. Se a carta exige que um humano reaja, ela não entra.

### Sigilos (nível de conta) — a meta-progressão que falta no WAKFU

Equipados no hub antes de entrar; 3 slots iniciais, expansíveis. Comprados com **Ressonância**.

Exemplos:
- *Sigilo do Presságio* — você vê o tipo do próximo nó antes de escolher a rota.
- *Sigilo do Avarento* — começa a run com 150 Ecos.
- *Sigilo do Ourives* — o draft de Cartas mostra 4 opções em vez de 3.
- *Sigilo do Colecionador* — Estilhaços Comuns ganham +1 raridade uma vez por camada.
- *Sigilo do Teimoso* — sobrevive a uma morte por run com 25% de HP (uma vez).

Este é o eixo que responde "por que eu volto na semana que vem" e conecta a Fenda à filosofia de **construção de conta** do projeto.

## C.5 Tipos de Fenda

Rotação — **não produzir todos**. MVP = tipos 1 e 2.

| # | Tipo | Identidade | Alvo |
|---|---|---|---|
| 1 | **Fenda Comum** | Ondas de trash misturando 3–4 famílias de criaturas | Baseline semanal; farm de materiais e Ressonância |
| 2 | **Fenda Selada** *(equivalente à Ultimate)* | Cada onda é composta por **2 elites/mini-bosses**; exige **Chave** craftada com fragmentos da Comum | Pico de dificuldade; drops raros/BiS |
| 3 | **Fenda do Enxame** | Muitos inimigos, HP baixo, dano alto em grupo | Testa AoE, kite e o helper; premia builds de área |
| 4 | **Fenda Modulada** | Level/gear sincronizados para baixo, reaproveita dungeons antigas (liga direto com o W04) | Manter conteúdo antigo relevante; valorizar sets antigos |
| 5 | **Fenda de Provação** | Sem poções e sem cura automática do helper; sustentação só por orbes | Alta dificuldade sem inflar números de inimigo |
| 6 | **Fenda de Campeões** *(boss rush)* | Sem trash: 6 bosses seguidos, recursos não regeneram entre eles | Endgame; decisão entre confrontos |
| 7 | **Fenda Sazonal** | Comum + **regra global da temporada** (ex.: "inimigos explodem ao morrer") | Reciclagem barata de conteúdo a cada 8 semanas |

**Regra de produção:** um tipo novo de Fenda deve custar principalmente **regras**, não assets. Se um tipo exige arte nova, ele não é candidato a rotação.

## C.6 Escalonamento e relação com level modulation

**Dois eixos independentes, ambos visíveis para o jogador:**

**Eixo 1 — Profundidade (automático).** A cada nó, inimigos ganham HP, dano e densidade. Curva alvo: ~+9% de poder efetivo por nó, mais o que a Fenda absorve dos Estilhaços recusados. Ao fim da Camada III o inimigo está ~4× a linha de base.

**Eixo 2 — Pressão (escolhida na entrada, 1–10).** Análogo direto ao **Stasis** do WAKFU. Cada nível: inimigos mais fortes + multiplicador de recompensa. Pressão é o que dá longevidade sem produzir conteúdo novo.

**Level modulation:**

- Na **Fenda semanal, a modulação para baixo é obrigatória**: o personagem é limitado ao teto de nível/gear da Fenda daquela quinzena. Isso mata de raiz a exploração observada no WAKFU (fenda de nível baixo + ALS = melhor XP do jogo) e transforma a Fenda em teste real de build.
- A escala de personagem acima do teto vira **Pressão inicial**, não onda inicial — igual à ideia do WAKFU, mas preservando a duração de sessão.
- Existe também a **Fenda de Treino**: mesma run, poder total, **sem recompensa de progressão**, entradas ilimitadas. Serve para aprender e testar build — e é o pressure-release que impede que "modulação obrigatória" pareça punição.

## C.7 Condições de vitória e de falha

| Situação | Resultado |
|---|---|
| Concluir Camada III | **Fenda Fechada** — vitória canônica; recompensa completa da dificuldade escolhida |
| Concluir Camadas I e II, morrer na III | Fica com o **bancado das camadas I e II** + progresso parcial |
| Relógio zera no meio de uma camada | Run acaba; recebe o bancado + fração proporcional dos nós concluídos |
| Morte com Sigilo do Teimoso | Revive uma vez, com penalidade de tempo (−90 s no relógio) |
| Abismo | Só acrescenta score/Ressonância; nunca coloca em risco o que já foi bancado |

**Isso corrige explicitamente o pior defeito do WAKFU.** Perder 18 minutos de run automatizada e receber zero é inaceitável num jogo cuja premissa é "não tenho tempo para grind infinito".

**Aposta opcional (para preservar a tensão):** ao fim de cada camada o jogador pode escolher **não bancar** e dobrar a recompensa daquela camada — mas perde-a se morrer antes de bancar de novo. Push-your-luck vira **decisão explícita**, não default punitivo.

## C.8 Relação com o helper

**Divisão de responsabilidade:**

| Helper executa | Jogador decide |
|---|---|
| Movimento, kite, follow, avoid | Sigilos equipados |
| Targeting e prioridade de alvo | Nível de Pressão |
| Rotação de skills e runas | Rota (nó 2 de cada camada) |
| Poções e cura | Draft de Cartas (1 de 3) |
| Auto-loot e coleta de orbes | Perfil de prioridade de Estilhaço |
| Pegar Estilhaço **conforme o perfil configurado** | Gasto de Ecos na loja |
| — | Bancar vs. apostar |
| — | Entrar no Abismo ou sair |

**Regras de design não negociáveis:**

1. **O helper nunca é desligado ou nerfado na Fenda.** (Diretriz do dossiê.)
2. **Perfis de helper são um item de build.** O jogador configura, antes da run, "Perfil de Enxame" (prioriza AoE, agrupa), "Perfil de Boss" (single target, mantém distância), "Perfil de Sobrevivência" (prioriza orbes, cura cedo). Escolher o perfil errado para o tipo de Fenda é um erro real e legível.
3. **Prioridade de Estilhaço é uma lista ordenada configurada pelo jogador** (ex.: "sobrevivência > dano melee > movimento"). O helper obedece à lista. Se o jogador quiser decidir na hora, existe modo de **pausa tática** no draft — opcional, nunca obrigatório.
4. **Nenhum mecanismo exige input humano em tempo real.** Se um boss tem uma mecânica, a resposta é preparação (resistência, carta, posicionamento pré-configurado), não reflexo.
5. **A run precisa ser vencível 100% pelo helper com uma build boa.** A dificuldade tem que morar em *build, rota, economia e Pressão* — que é exatamente onde a filosofia do projeto quer que ela more.

## C.9 Relação com energia / resina

**Recomendação: a Fenda NÃO consome resina.**

Motivos:
1. Resina é o orçamento **diário** de farm. Se a Fenda comer resina, ela compete com a rotina diária e cria a sensação de "não posso jogar o conteúdo bom porque preciso dos materiais".
2. O que precisamos limitar aqui não é *throughput de farm*, é **número de tentativas premiadas** — porque o helper joga sozinho e, sem trava, o ótimo seria rodar Fenda 24 h.

**Modelo proposto:**

| Recurso | Quantidade | Reset |
|---|---|---|
| **Chaves de Fenda** (entradas premiadas) | 3 | Semanal |
| **Chave Selada** (Fenda de boss) | 1 por craft, fragmentos vindos da Fenda Comum | Limitado por farm |
| **Fenda de Treino** | Ilimitada, **zero recompensa de progressão** | — |

Isso replica o padrão que o WAKFU já usa bem (ultimate alimentada pela clássica) e resolve o que ele não resolve (repetição infinita da clássica).

**Interação com resina:** a Fenda pode *devolver* resina como recompensa menor (ex.: fechar a Camada III devolve uma fração do orçamento diário), reforçando "semanal alimenta a diária" em vez de competir com ela.

## C.10 Duração recomendada

| Modo | Duração alvo | Racional |
|---|---|---|
| **Fenda Comum** | **12–18 min** (alvo 15) | Uma sentada. Acima da diária (15–30 min), abaixo do ponto em que perder dói demais |
| **Fenda Selada (boss)** | 20–25 min | Pico da semana; ainda cabe numa sessão |
| **Fenda de Treino** | Livre, sai quando quiser | Laboratório de build |
| **Abismo** | +5–10 min opcionais | Só para quem quer score |
| **Compromisso semanal total** | **~40–55 min** (3 entradas) | Compatível com "não tenho tempo para grind infinito" |

**Orçamento interno da run de 15 min:** ~10,5 min de combate (12 nós de combate) + ~2,5 min de decisão (drafts, loja, rota) + ~2 min de transição. Se o tempo de decisão passar de ~20% do total, o modo vira menu; se ficar abaixo de ~10%, vira o problema do WAKFU (40 ondas de trash com um draft por cima).

## C.11 Frequência de reset

| Elemento | Cadência | Racional |
|---|---|---|
| **Entradas (3 Chaves)** | **Semanal** | Ritmo de compromisso; casa com boss semanal |
| **Identidade da Fenda** (tipo + mutador + foco de recompensa) | **Quinzenal** | Semana 1 o jogador aprende e monta build; semana 2 ele otimiza e empurra Pressão. Trocar toda semana desperdiça o aprendizado e queima orçamento de produção |
| **Marcos de profundidade** (recompensas de pico pessoal) | Quinzenal, junto com a rotação | Alvo claro por ciclo |
| **Regra global sazonal** | **8 semanas** | Reciclagem barata: mesmo conteúdo, regra nova |
| **Loja de Sigilos** | Permanente, sem reset | É construção de conta, não FOMO |

**Recomendação forte: quinzenal para a identidade, semanal para as entradas.** Isso dá o melhor dos dois: cadência de hábito semanal, sem custo de produção semanal.

## C.12 Recompensas propostas

| Camada de recompensa | Onde | Função |
|---|---|---|
| Materiais de upgrade de gear | Bancado por camada | Alimenta a progressão principal |
| **Ressonância** | Por profundidade × Pressão | Compra Sigilos — o eixo de conta |
| **Fragmentos de Chave Selada** | Loja interna + Guardiões | Pipeline Comum → Selada |
| Chance de BiS/relic | Apenas **Fenda Selada**, Camada III | Motivo real de existir para o modo difícil |
| Cosmético/troféu de pico | Marco quinzenal de profundidade | Substitui o ranking mensal competitivo do WAKFU |
| Resina parcial | Fechar Camada III | Semanal alimenta a diária |

**Transparência (correção direta do defeito #3 do WAKFU):** a tela de entrada mostra a **tabela exata de recompensa por camada e por Pressão**, e todo drop raro tem **pity visível**. Não repetir a situação de a comunidade não conhecer as drop rates quatro anos depois.

## C.13 Riscos e decisões em aberto

**Riscos:**

1. **A Fenda canibalizar as dungeons.** No WAKFU, o XP de fenda foi deliberadamente equiparado ao de dungeon e a fenda virou o farm padrão. Mitigação: a Fenda dá **Ressonância e materiais de pico**, não os materiais básicos do dia a dia.
2. **Draft com helper virar "clicar em qualquer coisa".** Se os Estilhaços forem todos "+x% de dano", o jogador aceita o default e a decisão morre. Mitigação: pelo menos **1 em cada 3 drafts precisa ter trade-off direcional real** (defesa vs. dano, mobilidade vs. área).
3. **Explosão de escopo.** Sigilos + Cartas + Estilhaços + Ecos + loja + rota + 7 tipos de Fenda é um jogo inteiro. Mitigação: MVP na seção C.14.
4. **Tempo real + muitos inimigos = problema de performance.** O Enxame é o tipo mais arriscado tecnicamente; validar densidade máxima no vertical slice antes de prometer o tipo 3.
5. **Legibilidade.** 15 Estilhaços empilhados em tempo real precisam ser lidos em um painel; caso contrário o jogador não entende por que morreu.
6. **Modulação obrigatória pode frustrar.** Mitigada pela Fenda de Treino, mas precisa de teste.

**Decisões em aberto (precisam de definição humana):**

- A Fenda entra no MVP ou só depois do loop diário estar validado? *(Recomendação: depois. É conteúdo de pico e assume que existe build para testar.)*
- Cartas devem alterar **skills de classe** (mais caro, mais interessante) ou apenas sistemas genéricos (dash, postura, runas)? *(Recomendação para o MVP: genéricos.)*
- Vale existir a Fenda Modulada (tipo 4) ou o level sync deve viver só nas dungeons (W04)?
- A Ressonância deve ser exclusiva da Fenda ou compartilhada com outros conteúdos semanais?
- Morte deve custar tempo (−90 s) ou uma das 3 Chaves? *(Recomendação: tempo. Perder uma entrada semanal por um erro é caro demais.)*

## C.14 MVP mínimo da Fenda

Se e quando o modo for implementado, o corte mínimo que ainda prova a hipótese:

**Incluir:**
- 1 tipo (Fenda Comum), 1 arena, 3 famílias de criaturas já existentes;
- 3 camadas × 6 nós, com apenas 3 tipos de nó (combate, loja, guardião) — **sem escolha de rota no MVP**;
- Estilhaços: 6 efeitos base × 2 raridades, com a regra "o recusado vai para a Fenda";
- 8 Cartas;
- Ecos + loja com 3 opções (cura, reroll, remover carta);
- Relógio de 15 min; banco por camada;
- Pressão 1–3;
- 3 entradas semanais.

**Cortar do MVP:** Sigilos, Abismo, Estilhaços Lendários, tipos 2–7, aposta/dobra, marcos quinzenais, modulação obrigatória.

**Hipótese a validar:** *"Com o helper executando o combate, o jogador ainda sente que a run foi dele?"* Se a resposta for não, o problema não é falta de sistemas — é que as decisões oferecidas não têm peso suficiente, e adicionar Sigilos não conserta isso.

---

## Anexo — Tabela de decisão rápida (WAKFU → Huntbound)

| Aspecto | WAKFU | Huntbound (proposto) |
|---|---|---|
| Duração | 40 turnos (longo em tempo real) | 12–18 min de relógio |
| Estrutura | Ondas contínuas, sem estrutura | 3 camadas × 6 nós + Abismo opcional |
| Progressão na run | Artefatos empilhados | Estilhaços + Cartas + Ecos/loja |
| Meta-progressão | **Nenhuma** | Sigilos comprados com Ressonância |
| Escolha por onda | 1 de 2, o resto vai ao inimigo | Idêntico (preservado) |
| Sustentação | Life orbs (1 turno) | Orbes (6 s) |
| Falha | Perde tudo | Banco por camada; aposta opcional |
| Escala | Onda inicial por gap de nível | Pressão inicial (1–10) + modulação para baixo |
| Repetição | Ilimitada (clássica) | 3 entradas/semana + Treino sem recompensa |
| Modo boss | Ultimate, chave craftada, 2 bosses/onda | Fenda Selada, mesma lógica de chave |
| Grupo | 1–4, bônus para grupo pequeno | Single-player; bônus por restrição voluntária |
| Competição | Ranking mensal | Marcos pessoais de profundidade |
| Transparência | Opaca | Tabela de recompensa e pity visíveis |
| Reset | Nenhum (só ranking mensal) | Entradas semanais; identidade quinzenal; regra sazonal a cada 8 semanas |

---

## Fontes

**Oficiais (Ankama):**
- [Devblog: Dimensional Rifts (Update 1.72, 06/05/2021)](https://www.wakfu.com/en/mmorpg/news/devblog/tickets/1335574-devblog-dimensional-rifts) — intenção de design, 40 turnos, artefatos, life orbs, ranking mensal, ultimate rifts.
- [Devblog: New Rifts and Legendary Artifacts (Update 1.73, 25/08/2021)](https://www.wakfu.com/en/mmorpg/news/devblog/tickets/1372404-devblog-new-rifts-legendary-artifacts) — artefatos lendários, bônus de loot 8%/18%, remoção da penalidade de XP.
- [Update 1.49: the Adjustable Level System](https://www.wakfu.com/en/mmorpg/news/announcements/587874-update-1-49-adjustable-level-system) — sistema de modulação de nível.
- [Tainela Rift Key Fragment (Encyclopedia)](https://www.wakfu.com/en/mmorpg/encyclopedia/miscellaneous/29709-tainela-rift-key-fragment) — confirma a economia de fragmentos de chave.

**Wiki:**
- [Dimensional Rifts — The Wakfu Wiki](https://wakfu.wiki.gg/wiki/Dimensional_Rifts) — estado atual: bônus de grupo, tabela de artefatos por raridade, catálogo de fendas/níveis/sublimações, regras de onda e de ultimate rift.
- [Adjustable Level System — Wakfu Wiki (Fandom)](https://wakfu.fandom.com/wiki/Adjustable_Level_System) — patamares de modulação e fórmula de XP.
- [Dungeon — The Wakfu Wiki](https://wakfu.wiki.gg/wiki/Dungeon) — Stasis 1–10, referência para o eixo de Pressão.

**Comunidade (percepção):**
- [The drop rates of Sublimation Scrolls of rifts (fórum oficial, out/2025)](https://www.wakfu.com/en/forum/537-general-discussions/245340-drop-rates-sublimation-scrolls-rifts) — opacidade das taxas; fatores citados: nível em que se roda, PP/poção, ondas limpas.
- [Rifts and their levels (fórum oficial, out/2022)](https://www.wakfu.com/en/forum/8-general-discussions/242606-rifts-levels) — problema de descoberta do conteúdo.
- [Sram Guide for pve (kinda focused on rifts) (fórum oficial, nov/2022)](https://www.wakfu.com/en/forum/48-sram/242662-sram-guide-pve-kinda-focused-rifts) — fendas pautando construção de build.
- [How to Sufokia Rift on NEW ENI (80 ALS) — YouTube](https://www.youtube.com/watch?v=5_JkMIVdCks) — fenda + modulação de nível como estratégia otimizada de XP.
- [Wakfu — Shushu Rift Sram Solo 230 — YouTube](https://www.youtube.com/watch?v=9BAn9kKvthk) — viabilidade solo em nível máximo.

**Limitações desta pesquisa (declaradas):**
- O Reddit está bloqueado por política nesta sessão e a busca web disponível é orientada a resultados dos EUA; **não houve amostragem ampla de opinião de jogadores**. A seção A.13 distingue fatos observados de inferências.
- A **fórmula exata de onda inicial por gap de nível** e as **drop rates de sublimações** não são públicas.
- O **status atual do ranking mensal** (anunciado em 1.72) não foi confirmado nas fontes atuais.
- A tabela de artefatos lendários está incompleta na wiki (`TODO` explícito); a lista usada é a do devblog de 1.73, que a própria Ankama marcou como **não exaustiva e sujeita a mudança antes do lançamento**.
