# W07 — Gachas: endgame, roguelite recorrente e auto-play

> Pesquisa para **Kaezan Huntbound**. Nenhum código implementado.
>
> Objetivo: entender como gachas constroem endgame recorrente e conteúdo roguelite, e como esses formatos se comportam quando o combate pode ser executado por automação — dado que no Huntbound **o helper é pilar de design e não será nerfado no endgame**.
>
> Convenção: **[F]** = fato observado em fonte citada · **[H]** = hipótese/leitura de design minha.

---

# 1. Escopo e método

Sistemas estudados, em ordem de relevância para o Huntbound:

| Jogo | Sistema | Por que importa aqui |
|---|---|---|
| Honkai: Star Rail | Simulated Universe / Divergent Universe | Roguelite recorrente jogável em auto; referência explícita do projeto |
| Honkai: Star Rail | Memory of Chaos / Pure Fiction / Apocalyptic Shadow / Anomaly Arbitration | Endgame pontuado com rotação sazonal |
| Wuthering Waves | Tower of Adversity | Torre com rotação e times múltiplos |
| Wuthering Waves | Whimpering Wastes | Score por velocidade + draft de tokens/buffs |
| Wuthering Waves | Depths of Illusive Realm | Roguelite com meta-progressão permanente e cap semanal |
| Zenless Zone Zero | Hollow Zero: Lost Void | Grafo de salas + três eixos de buff (Resonium/Cards/Gear) |
| Arknights | Integrated Strategies | Roguelite mais "puro" do gênero: rotas, economia, coleções com downside |
| Genshin Impact | Imaginarium Theater | Restrição de roster como fonte de dificuldade |
| NIKKE | Simulation Room / Overclock | Roguelite em jogo com auto-battle onipresente |
| Limbus Company | Mirror Dungeon | Caso de estudo de roguelite semanal que virou tarefa |

O foco não é copiar sistemas, e sim isolar **quais peças produzem decisão humana quando a execução é automatizada**.

---

# 2. Sistemas comparados

## 2.1 Honkai: Star Rail — Simulated Universe (SU) e Divergent Universe (DU)

**Estrutura da run [F]**
- A run é um grafo de domínios. Tipos observados: combate comum, elite, **Domain—Occurrence** (evento aleatório que costuma pagar Cosmic Fragments, Blessings e Curios), **Domain—Transaction** (loja: projeções de Herta e Screwllum vendendo Curios e Blessings, além de um revive), **Domain—Respite** (Herta oferece opções pontuais; no último Respite é possível comprar *enhancements* de Blessings específicas) e boss final.
- **Paths**: o jogador escolhe um Caminho no início; acumular Blessings daquele Caminho ativa/melhora a **Resonance** do Caminho. Ou seja, a escolha inicial cria um compromisso que as escolhas seguintes confirmam ou desperdiçam.
- **Blessings** = buffs de run, oferecidos em draft. **Curios** = itens passivos, obtidos em Occurrence/Transaction ou comprados com **Cosmic Fragments**, a moeda temporária da run.

**O que o Divergent Universe mudou [F]**
- Dois submodos: **Ordinary Extrapolation** (permanente, cinco dificuldades, com camada extra "Threshold Protocol") e **Cyclical Extrapolation** (renova semanalmente, com bosses rotativos).
- Novos domínios: **Wealth Domain** (caça-níquel que paga Curio/Blessing) e **Escapade Domain** (*Workbench of Creation*, onde se sintetiza Curio de mesma raridade ou se sobrescreve **Weighted Curio**).
- **Weighted Curios**: mais raros e mais fortes, direcionados a um Caminho ou tipo de personagem — RNG enviesado a favor da build declarada.
- **Equations**: buffs que exigem acumular N Blessings de Caminhos específicos para ativar — um objetivo de coleção *dentro* da run.
- **Synchronicity Points** durante a run sobem o *Synchronicity Level*, que paga Stellar Jade e Self-Modeling Resin; **Inspiration** compra buffs permanentes no *Inspiration Circuit*.
- Personagem e equipamento são **ajustados para cima** até o Equilibrium Level se estiverem abaixo, e é possível **reiniciar um combate perdido no meio da run** em vez de perder a run inteira.
- A versão 4.1 (*Arcadian Chronicles*) trocou o sistema anterior (*Protean Hero*) por **Masks, Waypoint Passes e Grand Miracles** — evidência de que a HoYo **rotaciona a gramática do modo**, não só os inimigos.

**Recompensa e reset [F]**
- Pontos semanais que convertem em Stellar Jade, créditos e materiais; primeira limpeza semanal da *Weekly Extrapolation* dá bônus.
- **Planar Ornament Extraction**: usando **40 Trailblaze Power ou 1 Immersifier** (estoque máximo de 12), o jogador escolhe o boss e recebe Planar Ornaments. Detalhe crucial: **a build da run pode ser salva e reutilizada, permitindo combates rápidos repetidos com o mesmo setup**.

**[H] Leitura:** o DU é o SU com as três dores tratadas — run mais curta, falha não punitiva, e um caminho de *skip* para a parte que já foi dominada. O "Extraction com build salva" é o padrão mais importante desta pesquisa: **a decisão roguelite acontece uma vez; o farm derivado dela é repetível sem repetir as decisões.**

## 2.2 Honkai: Star Rail — o trio pontuado (+ derivados)

**[F]**
- **Memory of Chaos**: andares, sistema de estrelas, dois times, reset a cada **6 semanas** com novo conjunto de inimigos.
- **Pure Fiction**: score por **quantidade de inimigos mortos dentro de 4 ciclos**, com buffs de estágio chamados *Cacophonies*.
- **Apocalyptic Shadow**: score por **derrotar bosses no menor número de ações**.
- **Anomaly Arbitration**: exige full star nos três anteriores para desbloquear; reset também de 6 semanas.
- **Starward Mode** (v4.3): converte o estágio mais difícil de cada um dos três em um desafio de **3 times**, +100 Stellar Jade por modo.
- Recompensa por modo na casa de ~900 Stellar Jade por rotação.

**[H] Leitura:** o eixo de dificuldade não é HP inflado, é **restrição de recurso** — ciclos, ações, número de times. Restrição de recurso é exatamente o tipo de dificuldade que **sobrevive à automação**, porque o teto passa a ser a build e a composição, não a execução.

**[H] Risco copiável:** o trio de 6 semanas + DU semanal + dailies criou um *checklist* pesado. Para um jogo que promete 15–30 min/dia, isso é um alerta direto.

## 2.3 Wuthering Waves — Tower of Adversity

**[F]** Torre dividida em zonas (incluindo camadas estáveis e a de maior dificuldade), exigindo múltiplos times; paga cerca de **800 Astrite** por ciclo, além de materiais e Echoes; rotaciona periodicamente com novos inimigos.

**[H]** É o modo mais "puro" de preparação de conta: a decisão está toda antes de entrar (roster, build, sync de elemento contra o modificador da rotação).

## 2.4 Wuthering Waves — Whimpering Wastes

**[F]**
- Três áreas, **12 estágios**: *Forbidden Waters* (6 estágios, one-time, nunca reseta), *Respawning Waters: Chasm* (5) e *Torrents* (1), que **resetam mensalmente**.
- Cada estágio exige **dois times separados** (até 3 Resonators cada); a nota é o **somatório dos dois times**, em pontos + letra, dependente da velocidade de clear.
- **Tokens** dão buffs — alguns de uso ilimitado, outros limitados; *Golden Tokens* dão efeitos fortes (dano, debuff em inimigos).
- Cada estágio tem um **Environment Report** (buff que afeta as duas metades) mais modificadores únicos por metade.
- Total de **1.600 Astrite**; parte one-time, parte renovável mensal com thresholds crescentes de pontos.

**[H] Leitura:** separação limpa entre **conteúdo one-time** (introduz e ensina) e **conteúdo renovável** (paga a rotina). Ótimo padrão de custo de produção: você entrega a fase nova uma vez e recicla só a parte barata.

## 2.5 Wuthering Waves — Depths of Illusive Realm

**[F]**
- Roguelike com três moedas: **Dream Fragments** (dentro da run), **Illusive Specimen** (troca na *Illusive Store* fora da run) e **Memory Points**.
- **Thought Evolution**: board de progressão **permanente** comprado com Memory Points (HP, dano, crit). Guias afirmam que ele deixa até a dificuldade máxima consideravelmente mais fácil.
- **Ebony Gatekeeper** é a loja intra-run.
- Recompensas semanais **limitadas a 12 claims**, com reset na segunda-feira.

**[H]** O board permanente é bom para acessibilidade e ruim para longevidade se for o único eixo: quando ele satura, o modo deixa de ter tensão e sobra só o cap semanal.

## 2.6 Zenless Zone Zero — Hollow Zero: Lost Void

**[F]**
- Cada andar tem **4 a 7 níveis**, com **2 a 3 salas por nível**, cada sala conectando a **1 ou 2 salas** do nível seguinte; a sala final é boss.
- Três eixos de buff: **Resonium** (buffs diretos: crit, dodge, shield), **Cards** e **Gear** — este último invoca um Bangboo estilo ultimate e se divide em *General*, *Exclusive* e *Auxiliary*.
- **Gear exclusiva por personagem muda por temporada** do Lost Void.
- Recompensas de Lost Void + Withered Domain limitadas a **45 claims por semana**.

**[H] Leitura:** o grafo estreito (2–3 salas, 1–2 conexões) é barato de gerar e ainda assim produz sensação de rota. E "Gear exclusiva rotativa por temporada" é uma alavanca de *meta* poderosa: muda quem é bom no modo sem tocar em balanceamento global.

## 2.7 Arknights — Integrated Strategies

**[F]**
- Run atravessa ~5 áreas com nós e caminhos pseudoaleatórios; a 6ª área tem 4 nós fixos.
- **Hope** é o recurso que custeia recrutamento (mais caro quanto maior a raridade do operador) — começa em 6.
- **Originium Ingots** compram no **Rogue Trader**; trocar todos por um Collectible aleatório é explicitamente ruim comparado a comprar vários itens.
- **Collectibles** dão vantagens, e **alguns têm desvantagens**.
- Três dificuldades base (Casual / Regular / Hard) e níveis de ascensão acima disso.
- **Squads rotativos mensais**: completar a exploração com o squad do mês dá recompensa e lore.

**[H] Leitura:** é o sistema com a melhor economia de decisão do grupo — cada escolha gasta um recurso escasso e fecha outra porta. Também é o mais caro de produzir (centenas de coletáveis, eventos escritos, encontros). E o **squad rotativo mensal** é um jeito baratíssimo de refazer a run: mesma dungeon, restrição diferente.

## 2.8 Genshin Impact — Imaginarium Theater

**[F]** Ciclo **mensal**; exige de **8 a 32 personagens** conforme a dificuldade; cada personagem carrega **2 de Vigor**, perdendo 1 por batalha; a temporada sorteia **3 elementos** que definem o roster viável e as *Brilliant Blessings* (compradas com Fantasia Flowers, quase sempre girando em torno de reações); entre atos escolhe-se buffs acumulativos (*Wondrous Boon*).

**[H] Leitura:** dificuldade por **largura de conta**, não por poder. É a alavanca mais imune a automação que existe: nenhum helper resolve "você não tem personagem suficiente daquele elemento".

## 2.9 NIKKE — Simulation Room / Overclock

**[F]** Labirinto diário onde se coletam buffs entre andares; **Overclock** permite salvar buffs farmados e carregá-los para runs seguintes (*Buff Legacy*), com no máximo **8 buffs ativos** e restrições de seleção; o score é o **Core Ratio**, que vai até 50, **mas todas as recompensas destravam em 25**; as recompensas renovam **a cada duas semanas**.

**[H] Leitura:** dois padrões úteis. (1) **Teto de recompensa abaixo do teto de score**: os últimos 50% do score existem só para quem quer, e não geram obrigação — isso é diretamente compatível com sessão curta. (2) Buff carry-over sem decay transforma o modo em "farm de buff antes da run que conta" — cria uma etapa a mais de rotina.

## 2.10 Limbus Company — Mirror Dungeon

**[F]** 5 andares em Normal; nós de encontro Normal / Focused / Risky / Abnormality / Boss, com **nó de loja sempre antes do boss de cada andar**; **E.G.O Gifts** iniciando por um Tier II escolhido entre 10 categorias, ampliáveis por *Gift Search* pago; duas moedas — **Cost** (compras, cura, troca de time) e **Starlight** (buffs, observação de Theme Pack, gifts); **3 cargas de bônus semanal**, e usar as três de uma vez em Hard rende o pacote inteiro (750 Lunacy). Não encontrei, na wiki consultada, menção a auto-battle ou clear expresso.

**[H] Leitura:** as *cargas de bônus semanais* são a solução mais simples de todas para "roguelite longo virou tarefa semanal": em vez de 3 runs, **1 run com 3 cargas**. Vale copiar o conceito quase literal.

---

# 3. A gramática comum (o que todos esses modos têm)

Destilando os dez sistemas, um roguelite recorrente de gacha é sempre a mesma máquina de sete peças:

1. **Grafo curto com rota visível** — 3 a 6 camadas, 2 a 3 nós por camada, 1 a 2 conexões à frente. Barato de gerar, suficiente para gerar arrependimento.
2. **Compromisso declarado cedo** — Path (HSR), squad (Arknights), elemento da temporada (Genshin). Ele transforma drafts posteriores em "confirma ou desperdiça".
3. **Draft de buffs** — Blessings, Resonium, Tokens, E.G.O Gifts, Brilliant Blessings. Sempre 1-de-N, sempre com raridade.
4. **Modificadores persistentes com identidade** — Curios, Collectibles, Cards, Gear. Diferente do buff: são *objetos* que o jogador reconhece e caça.
5. **Moeda temporária + loja** — Cosmic Fragments/Herta, Ingots/Rogue Trader, Cost+Starlight, Dream Fragments/Ebony Gatekeeper. A loja é o que converte sorte em plano.
6. **Nós não-combate** — Occurrence/evento, Respite, Wealth, Escapade/workbench. São o *pacing* e a fonte barata de variedade.
7. **Score + teto de recompensa** — pontos semanais, Core Ratio, estrelas, ciclos/ações. O score existe para dar teto de habilidade; o cap existe para dar teto de obrigação.

E por cima disso, três eixos de renovação:

- **Reset de recompensa** — semanal (SU, Limbus, DoIR 12 claims, ZZZ 45 claims), quinzenal (NIKKE), mensal (Genshin, Whimpering Wastes), 6 semanas (trio HSR).
- **Rotação de conteúdo** — inimigos e modificadores.
- **Rotação de gramática** — Protean Hero → Masks/Waypoint Passes/Grand Miracles; squads mensais; Gear exclusiva por temporada. É como se mantém o modo vivo sem produzir dungeon nova.

---

# 4. Auto-play: o que a indústria realmente faz

| Jogo | Auto no combate | Auto nas decisões | Skip/expresso |
|---|---|---|---|
| HSR | **[F]** Sim, auto-battle global, desbloqueado cedo | Não — draft e rota são manuais | **[F]** Sim: Ornament Extraction com **build salva** |
| ZZZ | Parcial (ação em tempo real; auto limitado) | Não | Caps semanais em vez de skip |
| WuWa | **[F]** Não encontrei auto-combate geral; o combate é de ação e o farm é limitado por Waveplate | Não | Sem skip de run |
| NIKKE | Auto-battle amplamente disponível | Não — draft de buffs é manual | Buff Legacy reduz o custo de repetir |
| Arknights | Só *auto-deploy* de replays idênticos; IS é manual | Não | Não |
| Limbus | Não encontrado na wiki consultada | Não | 3 cargas semanais em 1 run |

**[F] Sobre a qualidade do auto em HSR:** o auto-battle decide skills por Skill Points, fraquezas, HP e status, mas é conhecido por **desperdiçar Skill Points e Ultimates** — o exemplo citado é reaplicar a skill da Tingyun antes da anterior expirar. Em Memory of Chaos, onde cada wave devolve 4 Skill Points e o gasto de SP alimenta a *Memory Turbulence*, jogar em auto reduz dano e compromete o limite de ciclos.

**[H] Conclusão desconfortável e importante para o Huntbound:** parte da resposta da HoYo para "por que o auto não invalida o endgame" é simplesmente **o auto ser ruim de propósito**. Nós **rejeitamos** essa resposta — o helper do Huntbound deve ser competente. Portanto precisamos que **100% da nossa dificuldade venha das outras seis alavancas**, não da execução.

Mecanismos observados que **funcionam mesmo com auto perfeito**:

1. **Decisão fora do combate** — o auto não escolhe rota, sigil, loja ou risco.
2. **Restrição de recurso como dificuldade** — ciclos (Pure Fiction), ações (Apocalyptic Shadow), tempo (Whimpering Wastes). O teto vira build/composição.
3. **Restrição de roster** — 2 times (WuWa, MoC), 3 times (Starward), 8–32 personagens com Vigor (Genshin). Resolve-se na conta, não na luta.
4. **Sync / level cap** — remove "ficar mais forte" como solução; sobra "escolher melhor".
5. **Rotação de modificadores** — invalida periodicamente a build ótima anterior.
6. **Oferta aleatória limitada** — o jogador tem que adaptar o plano ao que apareceu.
7. **Recurso escasso e não-renovável dentro da run** — moeda, HP, revives. É o que cria risco/recompensa real.
8. **Cap semanal de recompensa** — o auto rodando 24h não paga mais nada.
9. **Skip da parte dominada** — Extraction com build salva; cargas semanais do Limbus.

---

# 5. Princípios úteis para o Huntbound

1. **A run é uma sequência de decisões separadas por combates, não o contrário.** Se o jogador toma menos de ~8–12 decisões significativas por run, o modo é um corredor.
2. **Dificuldade por restrição, nunca por HP.** Nossos eixos naturais: tempo/turnos, recursos gastos, mortes permitidas, level/gear sync, número de vocações exigidas.
3. **Compromisso cedo, confirmação depois.** Escolher um Caminho/Postura no início da run e ter sigils que só valem naquele Caminho é o que transforma draft aleatório em construção.
4. **Toda run precisa de uma loja.** É o único lugar onde o jogador converte azar em plano, e é onde a moeda temporária ganha peso de decisão.
5. **Separe conteúdo one-time de conteúdo renovável** (Whimpering Wastes). O one-time ensina e paga bem uma vez; o renovável é barato e sustenta a rotina.
6. **Teto de recompensa abaixo do teto de score** (NIKKE, ratio 25 de 50). O completista tem para onde ir; o jogador de 20 minutos não fica devendo.
7. **Falhar não deve custar a run inteira** (DU permite reiniciar o combate). Com sessão curta, perder 25 minutos por um erro é o fim do modo.
8. **Depois de dominar, deixe pular.** Build salva + ir direto ao boss/recompensa. A repetição é justamente o que o helper deveria matar.
9. **Rotacione a gramática, não só os inimigos.** Uma nova regra sazonal ("nesta rotação, sigils de Caminho custam metade e curas são proibidas") custa um arquivo de dados e renova o modo inteiro.
10. **Restrição de roster é a alavanca anti-automação mais forte e mais barata** que existe — e encaixa perfeitamente no nosso pilar de "construir a conta".

---

# 6. Anti-patterns

| Anti-pattern | Evidência | Por que nos machuca |
|---|---|---|
| Roguelite longo com reset semanal obrigatório | SU original teve que ser encurtado/reformado no DU; Limbus precisou de cargas para reduzir runs | Mata a meta de 15–30 min/dia |
| Muitos modos endgame simultâneos com cadências diferentes | HSR hoje: DU semanal + MoC + Pure Fiction + Apocalyptic Shadow + Anomaly Arbitration | Vira checklist; o jogador sente obrigação, não escolha |
| Score que mede execução (APM, dodge, timing) | Whimpering Wastes é score por velocidade de clear | Com helper competente, o **helper** vira o teto e o jogador some da equação |
| Meta-progressão permanente como único eixo | Thought Evolution do DoIR trivializa a dificuldade máxima | Modo perde tensão assim que o board satura |
| Buff carry-over sem decay | Buff Legacy do NIKKE | Cria uma rotina *antes* da rotina: farmar buff para depois fazer a run que conta |
| Aleatoriedade sem válvula | Arknights é o contraexemplo: Ingots + Rogue Trader dão a válvula | Run decidida no primeiro draft é frustração, não roguelite |
| Nó de evento com texto longo repetido semanalmente | Occurrences do SU | Na 5ª vez vira spam de clique; precisa de skip ou de pool grande |
| Recompensa exclusiva por rotação sem catch-up | Rotações de 6 semanas do trio HSR | FOMO — explicitamente contra a filosofia do projeto |
| Exigir jogo manual para o topo | Auto ineficiente do HSR em MoC | **Proibido pelo nosso design**: seria nerfar o helper por outro nome |
| Difficulty por inflar números | Comum a quase todos | Não gera decisão nova, só exige mais farm |

---

# 7. Propostas de formato para o Huntbound

Premissas comuns às quatro: helper 100% ativo; recompensa com cap semanal; nenhuma exige jogo manual.

## Formato A — "Fenda Longa" (SU / Lost Void completo)

- 25–40 min por run, 4–6 camadas, 15–20 nós, 5 tipos de nó, 4–5 Caminhos com ressonância, 50–70 sigils, curios, duas lojas, board de meta-progressão permanente, 5 dificuldades, boss rotativo semanal.
- **Custo:** alto. É um jogo dentro do jogo — o gargalo não é o grafo, é produzir 60 sigils *interessantes* e dezenas de eventos.
- **Decisões:** as melhores do grupo.
- **Problema:** conflita frontalmente com "sessão curta". **[H]** Não é um MVP; é um destino.

## Formato B — "Fenda Curta" ⭐ *(recomendado)*

- **8–15 min por run.** 3 camadas × 2–3 nós + boss. Rota visível **uma camada à frente**.
- **Compromisso inicial:** escolher um *Selo* (equivalente ao Path) entre 3, que enviesa os drafts e desbloqueia um bônus de ressonância ao acumular N sigils do mesmo Selo.
- **Draft:** 1-de-3 sigils por nó vencido; ~24–32 sigils no total inicial, distribuídos entre 3–4 Selos + neutros.
- **Economia:** uma moeda temporária (ex.: *Estilhaços de Fenda*) ganha por combate/evento; **uma loja obrigatória antes do boss** (comprar sigil, reroll, cura, ou remover um debuff da rotação).
- **Nós não-combate:** 1 evento por run, sorteado de um pool pequeno (10–15), com efeito mecânico e não só texto.
- **Risco/recompensa:** nós marcados como perigosos pagam mais Estilhaços; HP não regenera entre camadas sem gastar.
- **Dificuldade:** Fenda I..V, escalando por **restrição** (menos revives, menos tempo, sync mais apertado, debuff da rotação mais forte) — nunca por HP puro.
- **Score:** pontos por camada + bônus por eficiência (turnos/tempo restante) + bônus por objetivos da rotação.
- **Reset:** recompensa pontuada limitada a **N runs por semana** (sugestão: 3), com runs extras liberadas para treino/coleção **sem recompensa**. Rotação de modificador e boss a cada **2–4 semanas**.
- **Skip:** depois de fechar a Fenda V com uma build, permitir **salvar a build** e usar uma "Extração" que vai direto ao boss para farm (custa energia/resina), à la Ornament Extraction.
- **Custo:** médio-baixo. Reusa dungeons, monstros e o helper existentes; o conteúdo novo é **dados** (sigils, eventos, modificadores).

## Formato C — "Torre Sincronizada"

- N andares com **level/gear sync** (aproveita direto a pesquisa W04 de WAKFU), modificador fixo por rotação, exigência de **duas vocações diferentes** em andares distintos, 3 estrelas por andar, reset a cada 4–6 semanas.
- **Custo:** baixo. Praticamente só combate + regra de sync + tabela de recompensa.
- **Decisões:** quase todas de **preparação** (roster, build, equipamento antigo relevante). Quase nenhuma decisão in-run.
- **[H]** Excelente complemento, péssimo substituto: sozinha, ela não usa nada do que aprendemos sobre roguelite.

## Formato D — "Caçada de Eficiência" (boss rush pontuado)

- 2–3 bosses do bossiary, score por **turnos/tempo e dano recebido**, um buff global rotativo, reset de 4–6 semanas.
- **Custo:** muito baixo — recicla bossiary inteiro.
- **Decisões:** build, consumíveis, runas, preparação, ordem dos bosses.
- **[H]** É o modo de melhor razão "recompensa de retenção / hora de desenvolvimento" **depois** que o bossiary existir.

## Comparação

| Critério | A — Fenda Longa | **B — Fenda Curta** | C — Torre Sync | D — Eficiência |
|---|---|---|---|---|
| Custo de produção | Alto | **Médio-baixo** | Baixo | Muito baixo |
| Decisões por minuto | Alta | **Alta** | Baixa | Média |
| Reuso de conteúdo existente | Médio | **Alto** | Alto | Muito alto |
| Encaixe em 15–30 min/dia | Ruim | **Bom** | Bom | Bom |
| Sobrevive a helper perfeito | Sim | **Sim** | Sim (via sync/roster) | Parcial (depende do score) |
| Risco de virar tarefa | Médio | **Baixo (com cap de 3 runs)** | Baixo | Baixo |
| Caminho de crescimento | — | **Vira A** | Vira conteúdo sazonal | Vira C |

---

# 8. Recomendação de custo/benefício

**Formato B — "Fenda Curta" — é a escolha.**

Razões:

1. É o único dos quatro que produz **decisão humana densa com o helper ligado**, que é literalmente o problema que este documento tinha que resolver.
2. O conteúdo novo é majoritariamente **data-driven** (sigils, eventos, modificadores, tabelas de score) — alinhado com a regra do projeto de preferir dados a código.
3. Reaproveita dungeons e monstros já necessários para o loop diário; não exige uma segunda pipeline de conteúdo.
4. **Cresce para o Formato A** sem refazer nada: mais camadas, mais Selos, mais nós, board permanente.
5. O cap de 3 runs pontuadas/semana mantém a promessa de sessão curta e torna o farm 24/7 por helper economicamente inútil.

**Ordem sugerida [H]:** B primeiro (é o que valida a tese de design do projeto) → D depois, quando o bossiary existir (barato, recicla tudo) → C como evolução natural do trabalho de sync do W04 → A apenas se B demonstrar retenção real.

**Escopo mínimo para um vertical slice da Fenda:** 3 camadas, 1 boss, 12 sigils em 2 Selos, 1 loja, 3 eventos, 2 dificuldades, score simples. Se **isso** já gerar conversa sobre build, não precisamos de 60 sigils para saber que o formato funciona.

---

# 9. Como manter o helper ativo sem retirar estratégia

Regra de ouro derivada da pesquisa:

> **Tudo que decide o resultado da run deve estar decidido antes ou entre os combates. O combate é a verificação, não a decisão.**

Alavancas concretas, em ordem de eficácia:

1. **Score sensível a build, insensível a execução.** O score deve ser função de dano/turno, recursos gastos e objetivos cumpridos — não de precisão, esquiva ou timing. Teste de validade: *se dois jogadores com o mesmo helper e a mesma build tiram scores muito diferentes, o score está medindo a coisa errada.*
2. **Restrição de roster/vocação.** Andares ou camadas que exigem vocações diferentes. Nenhum helper resolve uma conta estreita. É a alavanca mais barata que temos e reforça o pilar "construção de conta".
3. **Sync agressivo no endgame.** Com level/gear travados, "ficar mais forte" para de ser resposta e "escolher melhor" vira a única.
4. **Recursos escassos e irreversíveis dentro da run.** Estilhaços, HP que não regenera de graça, um único reroll, um único revive. Escassez é o que transforma escolha em decisão.
5. **Informação parcial na rota.** Mostrar apenas a camada seguinte cria aposta; mostrar tudo cria planilha.
6. **Rotação que invalida a build ótima.** A cada 2–4 semanas, um modificador que quebra a solução da rotação anterior. Isso, e não a dificuldade, é o que mantém o modo pensado.
7. **O próprio helper como objeto de decisão.** Presets/loadouts de comportamento (prioridade de alvo, gatilho de cura, política de dash, uso de runa) escolhidos **por rotação de Fenda**. Configurar o helper para o modificador da semana é estratégia legítima — e é uma feature que o Arena Fable já explorou.
8. **Telemetria pós-run.** Mostrar onde o dano foi perdido, quanto tempo se gastou por camada, qual sigil rendeu menos. Sem esse feedback o jogador não aprende a decidir, e o modo vira sorte percebida.

**O que explicitamente NÃO fazer:** desligar helper em dificuldade alta, adicionar QTE/inputs manuais obrigatórios, ou dar bônus de score para jogo manual. Qualquer uma dessas é o nerf do helper com outro nome e quebra o pilar declarado do projeto.

---

# 10. Decisões em aberto e riscos

- **[H] Risco principal — solver.** Com helper determinístico e sigils públicos, a comunidade converge para uma build ótima e a Fenda vira script. Mitigações observadas na pesquisa: rotação de modificadores, oferta aleatória, restrição de roster, e sigils com *downside* (Collectibles do Arknights). **Decisão em aberto:** aceitamos sigils com desvantagem?
- **Quantos sigils são o mínimo viável?** HSR/ZZZ operam com centenas. **[H]** Chute de trabalho: ~24–32 no lançamento do modo, ~12 no vertical slice. Precisa de validação.
- **A Fenda consome energia/resina?** Se consumir, compete com o farm diário; se não consumir, precisa do cap de runs. **[H]** Preferir cap de runs pontuadas + Extração pagando energia.
- **Score global ou por camada?** Score global favorece runs longas; por camada favorece consistência e é mais legível para sessão curta.
- **A Fenda paga gear ou moeda?** **[H]** Moeda de loja endgame + material de upgrade tardio é mais controlável que drop aleatório de gear, e não canibaliza o loop diário.
- **Catch-up.** Se a rotação dura 2–4 semanas, o jogador que perde uma rotação perde recompensa permanentemente? A filosofia do projeto diz que não deveria — falta desenhar o mecanismo.
- **Onde o modo entra na cadência?** Semanal (3 runs pontuadas) parece o encaixe correto com o W06, mas isso depende do resultado consolidado da pesquisa de economia (W09).

---

# 11. Fontes

**Honkai: Star Rail**
- [Divergent Universe Guide — Game8](https://game8.co/games/Honkai-Star-Rail/archives/457407)
- [Endgame Guide — Game8](https://game8.co/games/Honkai-Star-Rail/archives/477238)
- [Memory of Chaos Guide — Game8](https://game8.co/games/Honkai-Star-Rail/archives/419660)
- [Simulated Universe and Divergent Universe Guide: Paths, Blessings, and Weekly Rewards — HostedGG](https://hostedgg.com/blog/honkai-star-rail-simulated-universe-guide)
- [Simulated Universe — Honkai: Star Rail Wiki](https://honkai-star-rail.fandom.com/wiki/Simulated_Universe)
- [Divergent Universe / Domains — Honkai: Star Rail Wiki](https://honkai-star-rail.fandom.com/wiki/Divergent_Universe/Domains)
- [Cosmic Fragment — Honkai: Star Rail Wiki](https://honkai-star-rail.fandom.com/wiki/Cosmic_Fragment)
- [Immersifier Location and How to Use — Game8](https://game8.co/games/Honkai-Star-Rail/archives/409382)
- [Divergent Universe: Arcadian Chronicles — Icy Veins](https://www.icy-veins.com/honkai-star-rail/news/honkai-star-rail-divergent-universe-arcadian-chronicles/)
- [Auto-Battle — Honkai: Star Rail Wiki](https://honkai-star-rail.fandom.com/wiki/Auto-Battle)
- [How to get the most out of Honkai: Star Rail's polarizing auto-battle system — Digital Trends](https://www.digitaltrends.com/gaming/honkai-star-rail-auto-battle/)

**Wuthering Waves**
- [Whimpering Wastes Guide (3.5) — Game8](https://game8.co/games/Wuthering-Waves/archives/498614)
- [Tower of Adversity Guide — Game8](https://game8.co/games/Wuthering-Waves/archives/453474)
- [Depths of Illusive Realm Guide — Game8](https://game8.co/games/Wuthering-Waves/archives/453491)
- [Wuthering Waves: Depths of Illusive Realm Guide — TheGamer](https://www.thegamer.com/wuthering-waves-depths-of-illusive-realm-guide/)
- [Whimpering Wastes — Wuthering Waves Wiki](https://wutheringwaves.fandom.com/wiki/Whimpering_Wastes)
- [Tacet Field Locations and Rewards — Game8](https://game8.co/games/Wuthering-Waves/archives/457265)

**Zenless Zone Zero**
- [Hollow Zero Lost Void Guide — Game8](https://game8.co/games/Zenless-Zone-Zero/archives/491520)
- [Complete Hollow Zero Lost Void Guide — TheGamer](https://www.thegamer.com/zenless-zone-zero-complete-hollow-zero-lost-void-guide/)
- [Lost Void / Resonium — Zenless Zone Zero Wiki](https://zenless-zone-zero.fandom.com/wiki/Lost_Void/Resonium)

**Arknights**
- [Integrated Strategies — Arknights Terra Wiki](https://arknights.wiki.gg/wiki/Integrated_Strategies)
- [Integrated Strategies Guide — Arknights Wiki (Fandom)](https://arknights.fandom.com/wiki/Integrated_Strategies/Guide)
- [Arknights: Integrated Strategies Explained — GamePress](https://ak.gamepress.gg/core-gameplay/arknights-cn-integrated-strategies-explained)

**Genshin Impact**
- [Imaginarium Theater — Genshin Impact Wiki](https://genshin-impact.fandom.com/wiki/Imaginarium_Theater)
- [Imaginarium Theater Guide — Game8](https://game8.co/games/Genshin-Impact/archives/401979)

**NIKKE**
- [Simulation Room Overclock Overview and Guide — nikke.gg](https://nikke.gg/simulation-room-overlock-overview-and-guide/)
- [Simulation Room — Prydwen](https://www.prydwen.gg/nikke/guides/game-modes-simulation)

**Limbus Company**
- [Mirror Dungeon — Limbus Company Wiki](https://limbuscompany.wiki.gg/wiki/Mirror_Dungeon)

> Observação de método: páginas do Fandom e do Icy Veins bloquearam acesso direto durante a pesquisa (HTTP 402/403); nesses casos os dados vieram de guias equivalentes (Game8, TheGamer, GamePress, wiki.gg) ou de resumos de busca, e foram marcados como **[F]** apenas quando havia trecho citável. Números de recompensa e datas de reset mudam a cada versão — tratar como ordem de grandeza, não como constante.
