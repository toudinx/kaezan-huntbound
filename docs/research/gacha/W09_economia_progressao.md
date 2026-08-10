# W09 — Economia e velocidade de progressão

> Pesquisa de referência para **Kaezan Huntbound**.
> Escopo: economia de recursos, currencies, sinks/sources, velocidade de progressão, RNG e catch-up.
> Referências principais: Honkai: Star Rail, Genshin Impact, Wuthering Waves, WoW, FFXIV, Destiny 2, Lost Ark, Dota 2 (PRD), Tibia (linha de base).
> Este documento **consolida** decisões econômicas espalhadas por W01–W08. Onde houve conflito de nome ou de moeda entre docs anteriores, há uma decisão explícita na §7.
> Sem código. Dados coletados em agosto/2026.

---

## 0. Resumo executivo

A promessa do projeto — *"trocar grind de horas por consistência de conta"* — é, no fundo, uma afirmação econômica. Ela só se sustenta se três invariantes forem verdadeiros:

1. **A renda diária de um jogador de 20 minutos completa pelo menos um degrau visível de progressão, todo dia.** Se o menor degrau custar mais que a renda diária, existem dias vazios — e dias vazios são o que mata rotina curta.
2. **A diferença de poder entre "funcional" e "quase-BiS" é de ~40%, não de 300%.** Banda de poder comprimida é o que torna troca de classe, catch-up e conteúdo antigo viáveis. É a decisão mais importante deste documento.
3. **Uma fatia fixa do poder (~15–20%) mora na conta, não no personagem.** É isso que faz "6 meses jogando" significar algo, e é isso que faz a segunda classe nascer forte.

Os números-alvo propostos:

| Marco | Alvo | Observação |
|---|---|---|
| Personagem **funcional** (1º) | **7–10 dias** de rotina normal | Limpa 100% do diário e ~80% do semanal |
| Personagem **funcional** (2º) | **3–5 dias** | Catch-up de conta |
| Personagem **funcional** (3º+) | **2–3 dias** | Piso: nunca abaixo de 2 dias |
| Personagem **confortável** (~85% do poder) | **4–6 semanas** | Endgame acessível |
| **Quase-BiS** (~95% do poder) | **3–4 meses** | Alvo real de longo prazo |
| **BiS literal** (substats perfeitos) | **nunca prometido** | Assíntota deliberada; delta 95%→100% vale <5% de poder |

E a arquitetura de moedas: **3 carteiras permanentes** (Ouro, Insígnia, Selo de Forja), **1 recurso de tempo** (Vigor de Caça), **1 moeda de escopo de run** (Ecos), e **contadores não-gastáveis** para tudo que hoje está proposto como moeda de coleção. Isso é uma redução de ~11 moedas propostas em W01–W08 para 3.

---

## 1. Princípios

Doze regras. As seis primeiras são invariantes de balanceamento; as seis últimas são regras de UX econômica.

### P1 — Renda diária ≥ custo do menor degrau

Todo dia de rotina normal precisa **completar** alguma coisa: um nível, um rank de runa, um aprimoramento de peça, uma entrada de Códex, um marco. Não basta "avançar a barra". Isso é uma restrição de calibragem, não uma feature: os custos dos degraus mais baratos são desenhados **a partir** da renda diária, não o contrário.

### P2 — Banda de poder comprimida

Do personagem funcional ao quase-BiS: **×1,35 a ×1,45** de poder efetivo. Não mais.

Consequências que essa única decisão compra:
- troca de classe deixa de ser suicídio;
- conteúdo antigo continua fazendo sentido;
- catch-up é possível sem invalidar o veterano;
- azar extremo custa semanas, não meses;
- o helper não precisa ser reconfigurado a cada patamar.

O custo: a perseguição de gear precisa entregar **variedade de build**, não multiplicador. Se o eixo vertical é curto, o eixo horizontal precisa ser largo.

### P3 — Uma fatia do poder é da conta, não do personagem

Alvo: **15–20%**. Vem de Códex, Registro de Caça, nível de conta, desbloqueios, marcos. Aplica-se a **todos** os personagens, presentes e futuros.

É a resposta simultânea a "por que jogar 6 meses?" e "por que a segunda classe não é do zero?".

### P4 — RNG decide *quando*, nunca *se*

Nenhum recurso de progressão pode ter como resultado possível "o jogador nunca consegue". Todo sistema aleatório precisa de um pior caso **definido, finito e publicado na UI**.

### P5 — Aleatoriedade só onde há muitas amostras

Substats de equipamento são rolados dezenas de vezes por mês: a variância se dilui e vira eixo de perseguição saudável. Um drop de boss que acontece 3 vezes por semana tem amostra pequena demais — ali a RNG não é tempero, é loteria. **Amostra pequena → determinismo. Amostra grande → RNG.**

### P6 — Contador, não taxa de drop

Herdado de W06 e W03, e vale para toda a economia: quando for preciso limitar farm, use um **teto explícito e visível**, nunca uma redução silenciosa de chance. Auditável, testável, imune a macro, e honesto com o jogador.

### P7 — Se duas moedas compram o que o mesmo jogador quer na mesma semana, são a mesma moeda

Heurística de corte. Duas moedas só coexistem se **competirem por prioridades diferentes em horizontes diferentes**.

### P8 — Se uma moeda tem uma fonte e um destino, ela não é moeda — é um contador

Remova a carteira, mantenha o número. Coleção (Códex, Registro) vira **contador de desbloqueio**, e o **pagamento** sai da carteira única. Isso corta metade do zoo de moedas de um golpe.

### P9 — Nenhum material é lixo

Todo drop indesejado tem uma conversão: para material universal, para tier acima (3:1), ou para Selo de Forja. Um saco de itens sem uso é dívida de design.

### P10 — Desfazer é grátis

Desmanchar, desequipar, respecar, trocar loadout: **100% de devolução dos materiais investidos, sem taxa**. A decisão interessante é *no que investir agora*, não *arrependimento*. Cobrar pedágio por experimentação pune o jogador novo e o jogador que quer trocar de classe — exatamente os dois perfis que este documento existe para proteger.

### P11 — Toda moeda precisa de um sumidouro terminal

Um destino de baixo valor, **infinito**, que absorve excedente sem gerar poder relevante. Sem isso, o jogador de longo prazo acumula moeda morta e a economia comunica "acabou".

### P12 — Teto antigo cai

Quando a conta sobe de patamar, os limites do conteúdo dos patamares anteriores **desaparecem**. Padrão roubado do FFXIV (a tomestone da temporada anterior perde o cap semanal quando entra a nova). É o catch-up mais elegante do gênero porque não precisa de sistema novo: é uma flag.

---

## 2. Modelos comparados

### 2.1 Tabela mestre

| Jogo | Funcional | Quase-BiS | Gate principal | Proteção contra RNG | Catch-up entre personagens | Nº de moedas relevantes |
|---|---|---|---|---|---|---|
| **Honkai: Star Rail** | ~1–2 semanas | 6+ meses (relics) | 240 TP/dia + boss semanal 3× | Pity 90 + 50/50 no gacha; **Self-Modeling Resin** escolhe main stat (e 1–2 substats) na síntese; nenhum pity no drop de relic | Materiais são de conta, mas TP é gargalo comum → 2º personagem **não** é mais rápido | Alto (jade, créditos, mats de trace ×4 tiers, relic remains, resin…) |
| **Genshin Impact** | ~2 semanas | 6–12 meses | 180 resina/dia | Pity 90 (soft em 74) + 50/50 + *Capturing Radiance*; **Artifact Strongbox** 3:1 escolhe o **set**, não a peça nem o stat | Fraco. Materiais locais + 4 mats por personagem | Muito alto |
| **Wuthering Waves** | ~1–2 semanas | indefinido | 240 WP/dia — **mas gear (Echos) está fora da energia** | Echo pity existe; upgrade é gateado por energia | Fraco | Alto |
| **World of Warcraft** (Midnight) | dias | ~2–3 meses/temporada | Lockout semanal + cap de crests | Catalyst converte item em tier (determinismo puro); vendor de ilvl garantido | **O melhor do mercado**: gear *Warbound* atravessa personagens, cargas de Catalyst passam a cair sozinhas, cap semanal que **cresce** a cada semana (2, 4, 6…) — quem entra tarde pega o cap acumulado | Alto e notoriamente inchado |
| **FFXIV** | dias | ~2 meses/patch | **450 tomestones/semana** | Vendor determinístico; loot com sistema de token/lockout | **Poetics sem cap**: a moeda antiga perde o teto e vira catch-up permanente | Médio, e limpo |
| **Destiny 2** | dias | 1–2 meses/temporada | Pinnacle cap semanal | **Focusing**: engrama + custo = item específico | Médio | Alto |
| **Lost Ark** | semanas | 1+ ano | Materiais semanais | **Artisan's Energy**: cada falha acumula `taxa × 0,465`; a 100% o próximo é garantido. Pity matematicamente limpo, sobre taxas-base punitivas | Fraco/pago | Extremo |
| **Dota 2** (referência teórica) | — | — | — | **PRD**: chance sobe a cada falha e cai após sucesso. Elimina sequências extremas nos dois sentidos | — | — |
| **Tibia** (linha de base) | meses | anos | tempo real | Nenhuma | Nenhum | Baixo (ouro + tokens de task) |

### 2.2 Os cinco padrões que valem copiar

1. **Determinismo escalonado por custo** (Destiny/HSR/WoW). O jogador escolhe *quanto* da aleatoriedade quer remover, pagando por cada camada removida. É o único modelo que preserva perseguição de longo prazo e ainda assim protege contra azar.
2. **Cap que cresce e cap que cai** (WoW Midnight / FFXIV Poetics). Cap semanal acumulativo para quem entra tarde; remoção do cap no conteúdo de patamar anterior. Custa quase nada implementar e resolve catch-up sem sistema novo.
3. **Poder de conta, não de personagem** (WoW Warbound). Gear e desbloqueios que atravessam personagens são a diferença entre "quero testar outra classe" e "não vou passar por isso de novo".
4. **Pity visível e acumulativo** (Genshin/Lost Ark). O número na tela transforma azar em contagem regressiva. Azar invisível é o que produz abandono.
5. **Conversão de excedente em alvo** (Artifact Strongbox, Focused Decoding). Três peças indesejadas viram uma tentativa direcionada. Nenhum drop é lixo.

### 2.3 Os cinco erros que valem evitar

1. **Zoo de moedas** (WoW, Lost Ark, Genshin). Quando o jogador precisa de planilha para saber o que otimizar, a economia falhou como interface.
2. **Gear fora da energia** (WuWa). Já registrado em W06 como o erro estrutural mais grave para um jogo com helper.
3. **RNG em amostra pequena** (relics/artifacts). Seis meses de resina para um conjunto é o *feedback loop* mais frustrante do gênero, e é consequência direta de violar P5.
4. **Catch-up que só existe para quem parou** (HSR, WuWa). Ambos têm evento de retorno bom e catch-up estrutural ruim: um personagem novo de um jogador ativo não anda mais rápido que o primeiro. Isso é exatamente o nosso caso de uso.
5. **Custo para desfazer** (Lost Ark, WAKFU, Tibia). Cada taxa de respec/transfer é um imposto sobre experimentação.

---

## 3. As 10 perguntas do brief — respostas diretas

Respostas curtas aqui; o desenvolvimento está nas seções indicadas.

**1. Como fazer o jogador sentir progresso diário?**
Garantindo por calibragem (P1) que a renda de um dia **fecha** pelo menos um degrau. Operacionalmente: manter no mínimo 3 degraus baratos sempre disponíveis (nível de personagem, nível de peça, rank de runa), custando cada um ≤ 60% da renda diária; e uma UI de "Próximos degraus" mostrando as 3 coisas mais próximas de completar. Ver §4.3 e §12.

**2. Quanto tempo para deixar um personagem funcional?**
**7–10 dias** de rotina de 15–20 min para o primeiro. Definição operacional de "funcional": limpa 100% do conteúdo diário e ~80% do semanal sem otimização. Ver §4.2.

**3. Quanto tempo para aproximar-se de BiS?**
**3–4 meses** para ~95%. Os últimos 5% são assíntota deliberada e nunca são prometidos. Ver §4.2 e §8.6.

**4. Como evitar que trocar de classe seja frustrante?**
Sete alavancas, em ordem de impacto: (a) devolução 100% ao desmanchar; (b) equipamento não-arma é da **conta**, equipável por qualquer personagem, um de cada vez; (c) 15–20% do poder é de conta; (d) desbloqueios de conteúdo são de conta; (e) respec e loadout grátis e instantâneos; (f) materiais em banco único; (g) sets por **arquétipo de papel**, não por classe. Ver §9.

**5. Como permitir catch-up para segunda/terceira classe?**
EXP ×3 até 90% do recorde da conta, desconto escalonado (50% / 65%, teto de 70%) sobre patamares já vencidos pela conta, remoção dos caps do conteúdo antigo (P12), e caps semanais bancáveis. Nunca 100% de desconto: o objetivo é **funcional rápido**, não **BiS de graça**. Ver §9.

**6. Materiais universais versus específicos?**
Alvo **70 / 20 / 10**: universais / de arquétipo / de boss específico. Nenhum material específico pode gatear o limiar *funcional* — específicos só aparecem nas 2 últimas de 6 fases de ascensão e nos 2 últimos de 10 ranks de skill. Máximo de **3 materiais específicos por personagem**. Ver §6.

**7. Como limitar farm sem deixar o jogo vazio?**
Separando **poder** de **conteúdo**. Poder tem teto explícito; conteúdo é ilimitado. Depois do teto, o crédito cai para 20% e **nunca para zero** (regra herdada de W03). Atividades sem teto existem — Abismo, mundo livre, coleção, cosmético, desafio — mas não pagam poder. Ver §10.

**8. Como evitar excesso de moedas?**
Aplicando P7 e P8 sobre o que já foi proposto: 11 moedas espalhadas por W01–W08 colapsam em **3 carteiras**. Ver §7.

**9. Como lidar com drops aleatórios?**
Determinismo em cascata: *se* dropa (sempre) → *slot* (escolhido) → *set* (escolhido) → *main stat* (comprável com Selo) → *substats* (livres, e é aqui que mora o jogo). Quantidade varia ±25%; existência nunca varia. Ver §8.

**10. Como proteger contra azar extremo?**
Cinco camadas: piso garantido, pity visível, roll com memória, reroll que nunca piora, e conversão de duplicata. Mais um alvo mensurável: a distância de poder entre o percentil 10 e o percentil 90 de azar, com o mesmo tempo jogado, deve ficar **abaixo de 10%**. Ver §8.

---

## 4. Proposta de economia conceitual

### 4.1 Os eixos de poder e seu orçamento

A pergunta que define uma economia não é "quanto o jogador ganha", é "**de onde vem o poder dele**". Proposta:

| Eixo | % do poder total | Velocidade | Escopo | Determinismo |
|---|---|---|---|---|
| **Nível do personagem** | 25% | Rápida (dias) | Personagem | Total |
| **Ascensão / patamares** | 10% | Média (semana) | Personagem | Total, com gate de material |
| **Runas e ranks de skill** | 15% | Média/lenta (teto semanal) | Personagem | Total, com gate de tempo |
| **Equipamento (peças + refino)** | 30% | Lenta, cauda longa | **Conta** (§9) | Parcial — RNG só em substats |
| **Camada de conta** (Códex, Registro, marcos, nível de conta) | 15% | Muito lenta, permanente | Conta | Total |
| **Preparo de run** (consumíveis, sigilos, loadout) | 5% | Instantânea | Run | Total |

Leituras importantes:

- **55% do poder é rápido e 100% determinístico** (nível + ascensão + runas). É essa fatia que produz a sensação de progresso diário e que faz um personagem novo ficar funcional em uma semana.
- **30% está no gear**, que é onde a cauda longa vive — mas com escopo de conta, então não se paga duas vezes.
- **15% é conta**, e é a resposta à premissa do projeto.
- **A RNG toca ~20% do poder total** (a parcela de substats dentro dos 30% de gear). Esse número é o teto de exposição a azar, e é o que torna a meta de "spread p10–p90 < 10%" alcançável.

### 4.2 A curva da conta

Rotina normal = 15–20 min/dia, 240 Vigor gastos, semanais feitas.

| Marco | O que o jogador tem | O que ele sente |
|---|---|---|
| **Dia 1** | 1 classe, gear inicial, primeiras dungeons | "Já subi de nível 3 vezes e equipei duas peças" |
| **Dia 3** | Set completo de peças (1 slot/dia garantido), 2 runas | "Todo dia alguma coisa fecha" |
| **Dia 7–10** | **Funcional.** Nível de patamar, 6 slots preenchidos, skills nos ranks médios | "Consigo fazer tudo que aparece hoje" |
| **Semana 3** | Refino de gear em andamento, primeiros marcos de Códex, 1º Sigilo | "Estou escolhendo em que investir" |
| **Semana 4–6** | **Confortável (~85%).** Endgame acessível, Fenda até a Camada III | "O endgame virou rotina, não parede" |
| **Mês 2** | 2ª classe funcional em 3–5 dias, camada de conta visível | "A conta carrega o personagem novo" |
| **Mês 3–4** | **~95%.** Substats bons, sigilos maduros, Códex avançado | "Estou otimizando, não construindo" |
| **Mês 6** | Assíntota. Múltiplas classes, coleção, builds alternativas | "Meu progresso agora é largura, não altura" |

**Regra de forma da curva:** os 7 primeiros dias devem ser os mais densos em degraus completados por dia; a partir daí a densidade cai, mas **nunca chega a zero** — é o sumidouro terminal (P11) que garante isso.

### 4.3 O orçamento diário

Base: 240 Vigor de Caça/dia (definido em W06).

**Dia típico ("construção", primeiros 10 dias):**

| Gasto | VC | Retorno |
|---|---|---|
| 1× Câmara de Equipamento | 60 | **1 peça garantida**, slot escolhido |
| 1× Boss de campo | 60 | Núcleo de arquétipo (ascensão) |
| 2× Dungeon de skill/runa | 80 | Pó de Runa + material de skill |
| 2× Dungeon de recursos | 40 | EXP + Ouro |

**Dia típico ("manutenção", pós-funcional):** o jogador realoca — tipicamente 120 VC em Câmara (2 peças) e 120 em recursos/refino, porque o gargalo migrou de "ter peça" para "melhorar peça".

**Renda sem energia no mesmo dia:** diárias (3 de 6) → Insígnias + 1 Selo de Forja; crédito de Códex (6 runs em Foco); progresso de passe/Ciclo.

**Calibragem exigida por P1** — o custo dos degraus baratos é derivado da renda, nesta ordem:

| Degrau | Custo alvo | Frequência resultante |
|---|---|---|
| Nível de personagem (faixa baixa) | ≤ 25% da renda diária de EXP | 2–4 por dia no início |
| +1 nível de peça de gear | ≤ 30% da renda diária de Ouro+Pó | 2–3 por dia |
| +1 rank de runa (ranks 1–6) | ≤ 60% da renda diária de material de skill | ~1 por dia |
| Fase de ascensão | ~3 dias de Núcleos | ~2 por semana |
| Rank de runa 9–10 | Gate semanal (boss) | ~1 por semana |
| Sigilo / marco de conta | Semanas | Cauda longa |

O padrão que isso produz: **múltiplos degraus baratos por dia + um degrau médio quase todo dia + um degrau grande por semana.** É o formato de recompensa que sustenta rotina curta.

### 4.4 O grafo econômico

```
                        ┌────────────────────────┐
                        │   VIGOR DE CAÇA (VC)   │  240/dia · reserva 1440
                        │  orçamento de TEMPO    │  saque máx. 240/dia
                        └───────────┬────────────┘
                                    │ (único cano de poder)
        ┌──────────────┬────────────┼────────────┬──────────────┐
        ▼              ▼            ▼            ▼              ▼
   ┌─────────┐   ┌──────────┐  ┌─────────┐  ┌─────────┐   ┌──────────┐
   │ RECURSO │   │  SKILL   │  │ CÂMARA  │  │  BOSS   │   │  BOSS    │
   │ EXP+Ouro│   │ Pó Runa  │  │  gear   │  │ campo   │   │ semanal  │
   │  20 VC  │   │  40 VC   │  │  60 VC  │  │  60 VC  │   │ 3×/sem   │
   └────┬────┘   └────┬─────┘  └────┬────┘  └────┬────┘   └────┬─────┘
        │             │             │            │              │
        │        materiais universais (70%)  arquétipo(20%)  boss(10%)
        │             │             │            │              │
        └─────────────┴──────┬──────┴────────────┴──────────────┘
                             ▼
                  ┌─────────────────────┐
                  │   BANCO DE CONTA    │  ← um só, para todos os personagens
                  └──────────┬──────────┘
                             ▼
   ┌──────────────────────────────────────────────────────────┐
   │  SUMIDOUROS: nível · ascensão · runas · refino · sigilos  │
   └──────────────────────────────────────────────────────────┘

   Fora do cano de energia (não pagam poder direto):
   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ DIÁRIAS  │  │ SEMANAIS │  │  FENDA   │  │  CÓDEX   │
   │          │  │          │  │          │  │ Registro │
   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
        └─────────────┴────┬────────┘             │
                           ▼                      ▼
                    ┌─────────────┐        ┌─────────────┐
                    │  INSÍGNIAS  │        │ CONTADORES  │
                    │ (carteira)  │        │ desbloqueiam│
                    └──────┬──────┘        └──────┬──────┘
                           └───────┬───────────────┘
                                   ▼
                        ┌─────────────────────┐
                        │ SIGILOS · MARCOS ·  │  camada de conta (15%)
                        │ LOJA DO CICLO       │
                        └─────────────────────┘

   Excedente indesejado ──▶ SELOS DE FORJA (determinismo) ──▶ forja direcionada
```

---

## 5. Currencies mínimas

### 5.1 O conjunto final

**Três carteiras permanentes. Um recurso de tempo. Uma moeda de run.**

| # | Nome | Tipo | Fonte | Destino | Por que existe separada |
|---|---|---|---|---|---|
| 1 | **Ouro** | Soft, abundante | Quase tudo | Nível de gear, refino, taxas, consumíveis | Precisa ser abundante e barata para nunca bloquear um degrau pequeno |
| 2 | **Insígnia** | Hard, única | Diárias, semanais, Fenda, Ciclo, passe, contratos | Sigilos, loja do Ciclo, forja direcionada, cosméticos | Denominador comum de **tudo que não é energia**. Uma curva de preço, não cinco |
| 3 | **Selo de Forja** | Determinismo | Desmanche de gear (teto semanal), diárias, semanais, marcos | **Só** remover aleatoriedade: escolher set, main stat, reroll dirigido | Precisa de renda **capada e independente** — se fosse comprável com Insígnia, o jogador converteria tudo em determinismo e a camada de RNG colapsaria |
| — | **Vigor de Caça** | Tempo | Regeneração | Entrada em conteúdo | Não é carteira: é orçamento de tempo (W06) |
| — | **Ecos** | Run | Dentro da Fenda | Loja da run | Morre no fim da run (W05) |

**Contadores não-gastáveis** (têm número na tela, **não** têm carteira nem loja):

| Contador | Origem | O que faz |
|---|---|---|
| **Pontos de Códex** | Bestiary (Foco: 6 runs/dia a 100%, depois 20%) | Desbloqueia Sigilos e Marcos do Códex — que são **pagos em Insígnia** |
| **Pontos de Caça** | Registro de Caça (bossiary) | Desbloqueia bônus da Marca de Caça |
| **Nível de Conta** | Toda atividade | Destrava conteúdo, sobe teto de patamar, escala recompensa antiga |
| **XP do Passe** | Toda atividade (W08) | Marcos da Trilha do Caçador |

A distinção é a aplicação de **P8**: coleção mede, carteira paga. Isso remove 4 carteiras sem remover nenhum sistema.

### 5.2 Reconciliação com W01–W08

O que já foi proposto nos documentos anteriores e o que acontece com cada item:

| Moeda proposta | Doc | Decisão |
|---|---|---|
| Vigor de Caça / Vigor Estagnado | W06 | **Manter** — é o recurso de tempo |
| Moeda de Ciclo | W08 | **Fundir → Insígnia** |
| Ressonância (fim de run da Fenda) | W05 | **Fundir → Insígnia** |
| Moeda semanal da Fenda (para Sigilos) | W05 | **Fundir → Insígnia** |
| Moeda de dungeon / loja diária | W04, W06 | **Fundir → Insígnia** |
| Moeda de evento temporária | W08 | **Cortar** — eventos pagam em Insígnia; a escassez fica no **estoque** da loja, não numa moeda que expira |
| Pontos de Estudo (Códex) | W03 | **Virar contador** — desbloqueia; Insígnia paga |
| Pontos de Caça (Registro) | W03 | **Virar contador** |
| Troféus por boss | W03 | **Cortar como moeda** → viram **Fragmento de \<Boss\>**, material específico com via de conversão |
| Ecos | W05 | **Manter** — escopo de run |
| Estilhaços / Estilhaços Lendários | W05 | **Não são moeda** — são draft de buff |
| Fragmentos de Chave | W05 | **Item de acesso**, não moeda |
| Ouro | W01 | **Manter** |
| Moeda premium / gacha | — | **Fora do MVP.** Reservar o conceito, não implementar |
| **Selo de Forja** | **novo (W09)** | **Criar** — é a peça que falta para a proteção contra RNG |

Resultado: **de 11 carteiras propostas para 3.**

### 5.3 Colisões de nome a resolver

Três nomes estão sendo usados para duas coisas diferentes em documentos distintos. Precisam ser resolvidos antes da síntese:

| Nome | Uso A | Uso B | Proposta |
|---|---|---|---|
| **Sigilos** | W03 — buffs por família de criatura (análogo dos Charms) | W05 — camada permanente da Fenda | Códex fica com **Sigilos**; Fenda passa a **Vestígios** |
| **Ressonância** | W05 — moeda de fim de run | W08 — multiplicador semanal | Multiplicador fica **Maré**; a moeda deixa de existir (§5.2) |
| **Marca de Caça** | W03 — bônus de boss | (candidato a nome de moeda) | Reservado para o bônus de boss. A moeda é **Insígnia** |

---

## 6. Materiais: universais versus específicos

### 6.1 A taxonomia em três camadas

| Camada | % do custo total | Exemplos | Escopo | Conversível? |
|---|---|---|---|---|
| **Universais** | **70%** | EXP, Ouro, Pó de Ascensão, Pó de Runa | Todas as classes | Sim, entre tiers (3:1 para cima, livre para baixo) |
| **De arquétipo** | **20%** | Núcleo de Guardião / Arcanista / Ranger / Vidente | Todas as classes do mesmo papel | Sim, com custo (§6.3) |
| **De boss específico** | **10%** | Fragmento de \<Boss\> | Um personagem, ranks de topo | Sim, caro e com teto semanal |

### 6.2 As cinco regras de distribuição

1. **Nenhum material específico gateia o limiar funcional.** Específicos só aparecem nas fases 5–6 de 6 da ascensão e nos ranks 9–10 de 10 das skills. Antes disso, tudo é universal ou de arquétipo. É isso que faz o "funcional em 7–10 dias" ser robusto a azar e a bosses ainda não desbloqueados.
2. **Máximo de 3 materiais específicos por personagem.** Genshin exige quatro linhagens de material + gema + semanal + especialidade local por personagem; o resultado é uma matriz que só se navega com planilha externa. Três é o teto de carga cognitiva.
3. **Cada material específico tem exatamente uma fonte primária óbvia** e uma via de conversão cara. O jogador nunca deve precisar procurar de onde vem alguma coisa.
4. **Material de arquétipo é a alavanca de catch-up mais barata que existe.** Segunda classe do mesmo arquétipo reaproveita 20% do custo direto. É de graça implementar e é sentido imediatamente.
5. **Tiers convertem para cima 3:1, com teto semanal; para baixo, livre e sem teto.** Conversão para cima sem teto vira farm de tier baixo com helper (o problema do W06); conversão para baixo sem teto é inofensiva e resolve o "tenho 900 de material T2 e preciso de T1".

### 6.3 Transmutação — a válvula de escape

Um sumidouro que converte **universal → arquétipo → específico**, a taxas ruins e com teto semanal:

| Conversão | Taxa | Teto |
|---|---|---|
| Universal T\<n\> → Universal T\<n+1\> | 3:1 | Semanal |
| Universal → Arquétipo | 5:1 + Ouro | Semanal |
| Arquétipo → Fragmento de Boss | 8:1 + Ouro + Selo de Forja | 1 por semana, por boss |

Papel: garantir que **azar ou ausência nunca travem completamente** um jogador em um material. A taxa é deliberadamente má — a via normal deve continuar sendo obviamente melhor. É rede de segurança, não atalho.

---

## 7. Sources — de onde vem tudo

Regra transversal (W06): **toda fonte de poder tem contador; toda fonte sem contador não paga poder.**

| Fonte | Custo | Paga | Teto | Bancável? |
|---|---|---|---|---|
| Dungeon de recursos | 20 VC | EXP, Ouro | Via Vigor | Via reserva |
| Dungeon de skill/runa | 40 VC | Pó de Runa, material de skill | Via Vigor | Via reserva |
| Câmara de Equipamento | 60 VC | **1 peça garantida** (slot escolhido) + Ouro | Via Vigor | Via reserva |
| Boss de campo | 60 VC | Núcleo de arquétipo | Via Vigor | Via reserva |
| Boss semanal | 60 VC | Fragmento de Boss (topo) | **3/semana** | **3 semanas** |
| Diárias (3 de 6) | 0 | Insígnia, **1 Selo de Forja**, material | Diário | Não (compensado pelo Descanso) |
| Semanais | 0 | Insígnia, Selos, material | Semanal | **3 semanas** |
| Fenda (roguelite) | 0 | Insígnia por pontos | Teto semanal de pontos; além dele, 20% | Parcial |
| Códex / Registro | 0 | Contadores → marcos | Foco de 6 runs/dia a 100%, depois **20%** | Não |
| Passe / Ciclo | 0 | Insígnia, material, Selos | Sazonal | Até o fim do Ciclo |
| Desmanche de gear | 0 | **Selo de Forja** + Pó | **Teto semanal de Selos** | Não |
| Mundo livre / hunt aberta | 0 | Ouro (pouco), consumíveis, entradas de Códex | **Sem teto — e sem poder** | — |
| Bônus de Descanso | acumulado por ausência | ×2 nas primeiras N runs | Estoque | Sim |
| Maré (multiplicador semanal) | 0 | ×2 em loot/material | Janela | Não |

**Proporção-alvo da renda de um Ciclo** (refinando a estimativa deixada em aberto no W08):

| Fonte | % da renda de Insígnia |
|---|---|
| Diárias | 35% |
| Semanais | 20% |
| Passe (marcos) | 20% |
| Contratos / eventos do Ciclo | 20% |
| Login / entrada | 5% |

Restrição associada: **eventos nunca acima de 25%**. Num single-player, quem pula o evento não pode ficar para trás.

---

## 8. Sinks — para onde vai tudo

### 8.1 Tabela de sumidouros

| Sumidouro | Moeda/material | Papel econômico | Tem fim? |
|---|---|---|---|
| Nível de personagem | EXP | Degrau diário barato | Sim (cap de patamar) |
| Ascensão | Núcleos + Ouro | Degrau semanal | Sim (6 fases) |
| Ranks de runa/skill | Material de skill + Ouro | Degrau médio; ranks 9–10 gateados por semanal | Sim (10 ranks) |
| **Nível de peça de gear** | **Ouro + Pó** | **Principal sumidouro de Ouro** | Sim (por peça) |
| **Refino de substat** | **Ouro + Selo de Forja** | **Sumidouro terminal, infinito** | **Não** |
| Forja direcionada (set / main stat) | Selo de Forja + Insígnia | Anti-RNG | Não |
| Sigilos e Vestígios | Insígnia | Camada de conta | Sim (slots limitados) |
| Loja do Ciclo (estoque limitado) | Insígnia | Sazonal, esvaziável | Sim, por Ciclo |
| Transmutação de materiais | Material + Ouro + Selo | Válvula de escape | Teto semanal |
| Consumíveis de run | Ouro | Preparo (5% do poder) | Não |
| Cosméticos, hub, títulos | Insígnia / Ouro | Terminal sem poder | Não |
| Reroll de tarefa diária | Ouro | Conveniência / agência | Não |
| Respec, loadout, troca de Sigilo | **Grátis** | **Deliberadamente não é sumidouro** (P10) | — |

### 8.2 O sumidouro terminal

**Refino de substat com custo crescente e retorno decrescente**, sem topo:

- cada refino custa mais que o anterior (curva geométrica em Ouro e linear em Selos);
- o ganho de poder acumulado por refino satura em **+5%** sobre a peça;
- **nunca piora** o resultado (§9.3).

Função: absorver o excedente de Ouro e de Selos do jogador de mês 6+ sem inflacionar poder e sem comunicar "acabou". É o mecanismo que mantém P1 verdadeiro indefinidamente — mesmo no mês 12, um dia de rotina fecha alguma coisa.

**Regra de saúde econômica:** se em playtest mais de 15% dos jogadores tiverem qualquer moeda parada acima de 3× a renda semanal daquela moeda, falta sumidouro — e a correção é adicionar sumidouro, nunca cortar fonte.

---

## 9. Proteção contra RNG

### 9.1 A cascata de determinismo

Aplicando P4 e P5, a aleatoriedade é empurrada para o único lugar onde tem muitas amostras:

| Pergunta | Quem decide | Custo |
|---|---|---|
| A run dá alguma peça? | **Determinístico — sempre dá** | — |
| Qual slot? | **Jogador**, ao entrar na Câmara | Grátis |
| Qual set? | **Jogador** | Selo de Forja |
| Qual main stat? | **Jogador** | Selo de Forja (custo maior) |
| Quais substats? | **RNG** | — |
| Quanto material vem junto? | RNG de **quantidade** (±25%) | — |

O jogador escolhe quanto da aleatoriedade quer remover — e paga por camada. Modelo do Destiny 2 (*Focused Decoding*) e do HSR (*Self-Modeling Resin*), com uma diferença: aqui a camada gratuita (slot) já elimina a parte mais frustrante.

### 9.2 As cinco camadas de proteção

| Camada | Mecanismo | Referência |
|---|---|---|
| **L1 — Piso garantido** | Nenhuma run devolve zero. Toda run paga pelo menos um contador de progresso | W03 (P2 de lá) |
| **L2 — Pity visível** | Contador na UI: "material X garantido em no máximo N clears". O número é público | Genshin (soft 74 / hard 90), Lost Ark (*Artisan's Energy*) |
| **L3 — Roll com memória** | Peças abaixo da mediana incrementam um contador que garante uma peça acima da mediana dentro de N runs. Suaviza sequências, nos dois sentidos | Dota 2 (PRD) |
| **L4 — Reroll que nunca piora** | Ao refinar/rerolar, o resultado pior é descartado. Elimina o arrependimento de gastar | — |
| **L5 — Conversão de duplicata** | 3 peças indesejadas → 1 tentativa direcionada. Nada é lixo (P9) | Genshin (*Artifact Strongbox*) |

### 9.3 Onde a RNG **não** pode entrar

- **Acesso a conteúdo.** Nunca. Entrada em dungeon, boss ou Fenda é sempre determinística.
- **Quantidade de material específico de boss.** Aqui a amostra é pequena (3 clears/semana). Quantidade **fixa**, sem variação. Violar isso é o erro do boss semanal do WuWa.
- **Desbloqueios.** Nenhum desbloqueio de sistema, classe, slot ou receita atrás de sorte.
- **Progresso de contador.** Códex, Registro, passe, diária: sempre determinísticos.

### 9.4 O pior caso é um número publicado

Para todo sistema aleatório o design precisa declarar — e a UI mostrar — o **pior caso**:

> "Você nunca esperará mais de **4 clears** por este material."
> "Você nunca precisará de mais de **N runs** para uma peça acima da mediana."

Isso não é transparência por virtude; é o que transforma azar em contagem regressiva. Azar sem número visível é a origem do abandono.

**Métrica associada:** a diferença de poder entre o percentil 10 e o percentil 90 de sorte, com o mesmo tempo jogado por 30 dias, deve ficar **abaixo de 10%**. Esse é o teste que valida toda esta seção.

---

## 10. Catch-up

Duas coisas diferentes são chamadas de catch-up e precisam de mecanismos diferentes.

### 10.1 Catch-up de personagem (2ª e 3ª classe) — o caso principal

O projeto tem 5 classes. Se a segunda custar como a primeira, ninguém experimenta a segunda.

| Alavanca | Regra | Efeito |
|---|---|---|
| **Equipamento é da conta** | Toda peça não-arma é equipável por qualquer personagem, **uma de cada vez**. Sem duplicação, sem re-farm | O maior salto isolado. Remove ~30% do custo |
| **Camada de conta** | 15–20% do poder já vem pronto | Personagem novo nasce acima do zero |
| **Banco único de materiais** | Nenhum material é preso a um personagem | Remove atrito e gestão |
| **EXP ×3 até 90% do recorde** | Enquanto abaixo de 90% do maior nível da conta | Nível deixa de ser gargalo |
| **Desconto por patamar já vencido** | 2º personagem: −50%; 3º: −65%; **teto de −70%** | Ascensão e runas encurtam |
| **Reaproveitamento de arquétipo** | 20% do custo é material de arquétipo, compartilhado | 2ª classe do mesmo papel é a mais barata |
| **Desbloqueios são de conta** | Bosses, dungeons, receitas, patamares: desbloqueados uma vez | Zero re-farm de acesso |
| **Cap antigo cai** (P12) | Conteúdo 2+ patamares abaixo do nível de conta perde teto e ganha clear instantâneo | Recuperação rápida da base |
| **Respec e loadout grátis** | Sempre | Experimentar não custa |

**Por que o teto de −70% e não 100%:** um segundo personagem que aparece pronto (a) apaga a única coisa que havia para fazer com ele e (b) comunica ao veterano que o esforço do primeiro foi desperdiçado. O alvo é **funcional em 3–5 dias**, não pronto no login.

**O que NÃO acelera:** ranks 9–10 das skills e refino de substats continuam no mesmo ritmo do primeiro personagem. Catch-up leva ao **funcional**, nunca ao **BiS**.

### 10.2 Catch-up de conta (jogador que parou ou entrou tarde)

Já definido em W06; aqui só o que é econômico:

| Mecanismo | Regra |
|---|---|
| **Bônus de Descanso** | Ausência acumula estoque; as primeiras N runs de volta rendem ×2. Substitui evento de drop dobrado, sem FOMO |
| **Tetos bancáveis** | Semanais acumulam por 3 semanas |
| **Reserva de Vigor** | 1440, meia-taxa, saque máx. 240/dia |
| **Cap crescente** | Um teto semanal não usado **cresce** em vez de simplesmente ficar disponível — quem entra na semana 6 encontra um cap maior. Modelo do WoW Midnight (2, 4, 6…), limitado a 3 semanas de acúmulo |
| **Escalonamento retroativo** | Conteúdo antigo paga mais conforme o nível de conta sobe |
| **Retorno automático** | 14+ dias: pacote + Descanso cheio + resumo, sem prazo e sem código |

---

## 11. Riscos

| # | Risco | Gravidade | Por que acontece | Mitigação |
|---|---|---|---|---|
| R1 | **Banda comprimida esvazia a perseguição de gear** | Alta | Se do funcional ao quase-BiS são só 40%, o jogador pode concluir que gear não importa | O eixo vertical curto **obriga** um eixo horizontal largo: sets que mudam comportamento, builds alternativas, sinergia com Sigilos. Se o gear só der número, R1 se concretiza |
| R2 | **Camada de conta vira parede para o jogador novo** | Alta | 15–20% de poder de conta é 15–20% que o novato não tem | Os marcos de conta precisam ser **densos no início e esparsos depois** (5, 10, 20, 30, 45, 60 entradas). Os primeiros vêm sozinhos ao jogar |
| R3 | **Determinismo generoso demais esgota o conteúdo no mês 2** | Alta | Num single-player não há competição para sustentar interesse; se tudo é alcançável rápido, acaba | Sumidouro terminal (§8.2) + custo escalonado do determinismo (Selos têm renda capada) + largura de build |
| R4 | **Carteira única torna o balanceamento frágil** | Média | Uma curva de preço errada em Insígnia quebra Sigilos, Ciclo e forja ao mesmo tempo | Preços em **faixas** documentadas por categoria, não ad-hoc; e um teste de regressão econômica por Ciclo |
| R5 | **Devolução 100% remove peso das decisões** | Média | Se desfazer é grátis, não há escolha real | A decisão passa a ser **tempo e slot**, não arrependimento. Aceitável e proposital — mas precisa ser verificado em playtest se o jogador sente as escolhas |
| R6 | **Gear de conta cria micro-gestão** | Média | "Uma peça, um personagem por vez" pode virar troca constante entre 3 personagens | Presets de loadout com um clique + aviso claro de qual personagem perde a peça. Se virar planilha, considerar duplicação com custo |
| R7 | **Inflação de Ouro no fim** | Média | Ouro é a moeda mais abundante e seus sinks são finitos | Refino terminal com curva geométrica é o sink de Ouro que não satura |
| R8 | **Catch-up forte demais pune o veterano** | Média | "Por que eu me esforcei?" | Catch-up leva ao funcional, nunca ao topo. E a camada de conta do veterano é intransferível para fora da conta |
| R9 | **Helper reabre farm infinito por uma fresta** | Alta | Qualquer fonte sem contador vira 24h de automação | Auditoria obrigatória: toda nova fonte de recompensa precisa declarar seu contador antes de existir (W06) |
| R10 | **Complexidade percebida** | Média | 3 carteiras + 4 contadores + 3 camadas de material ainda é muito para a primeira hora | Introdução escalonada: Ouro e EXP no dia 1; Insígnia na semana 1; Selo de Forja quando a primeira peça for desmanchada; Códex no patamar 2 |
| R11 | **Números deste doc são hipótese** | Alta | Toda a §4 é derivada de referências externas, não de playtest | §12. Nenhum número aqui deve ir para produção sem instrumentação |

---

## 12. Métricas que precisaremos testar

Todas com definição operacional e alvo. Isto é a lista de instrumentação mínima da economia.

### 12.1 Velocidade

| # | Métrica | Definição | Alvo |
|---|---|---|---|
| M1 | **TTF₁** | Dias de rotina normal até o 1º personagem limpar 100% do diário e 80% do semanal | **7–10 dias** |
| M2 | **TTF₂ / TTF₁** | Razão entre o tempo do 2º e do 1º personagem | **0,35–0,50** |
| M3 | **TTF₃ / TTF₁** | 3º personagem | **0,25–0,35**, nunca < 0,2 |
| M4 | **T-85** | Dias até 85% do poder de referência | **28–42** |
| M5 | **T-95** | Dias até 95% | **90–120** |
| M6 | **Banda de poder** | Poder(quase-BiS) / Poder(funcional) | **1,35–1,45** |

### 12.2 Sensação diária

| # | Métrica | Definição | Alvo |
|---|---|---|---|
| M7 | **Degraus por dia** | Nº de itens completados (nível, rank, peça, marco) numa sessão de rotina | **≥ 2** nos dias 1–14; **≥ 1** sempre |
| M8 | **Dias de progresso zero** | Dias de rotina sem nenhum degrau completado | **0 em 30 dias** |
| M9 | **Runs de recompensa nula** | % de runs que não pagam nenhum contador | **0%** |
| M10 | **Tempo de sessão (p50)** | Rotina diária completa | **15–20 min** |

### 12.3 Equidade e variância

| # | Métrica | Definição | Alvo |
|---|---|---|---|
| M11 | **Spread de azar** | Poder(p90 de sorte) / Poder(p10 de sorte), mesmo tempo jogado, 30 dias | **< 1,10** |
| M12 | **Prêmio por tempo livre** | Poder(3h/dia) / Poder(25min/dia) após 30 dias | **< 1,15** |
| M13 | **Pity observado** | Distância máxima observada até o item garantido, em playtest | Igual ao número publicado na UI, **sempre** |

### 12.4 Saúde econômica

| # | Métrica | Definição | Alvo |
|---|---|---|---|
| M14 | **Moeda parada** | % de jogadores com alguma moeda acima de 3× a renda semanal dela | **< 15%** |
| M15 | **Carteiras ativas** | Nº de moedas que o jogador precisa acompanhar | **≤ 3** (+ Vigor) |
| M16 | **Razão universal/específico** | Gasto real medido, não o gasto planejado | **70 / 20 / 10 (±5)** |
| M17 | **Uso da transmutação** | % de jogadores que usam a válvula de escape | **5–20%.** Acima de 20% = a via normal está mal calibrada; 0% = a válvula é cara demais para existir |
| M18 | **Cobertura do sumidouro terminal** | % do excedente de Ouro absorvido pelo refino no mês 3+ | **> 70%** |

### 12.5 Percepção (survey, não telemetria)

| # | Pergunta | Alvo |
|---|---|---|
| M19 | "Minha conta está mais forte que na semana passada" | **> 80% concorda**, em todas as semanas do mês 1–3 |
| M20 | "Sei o que fazer para ficar mais forte" | **> 85% concorda** |
| M21 | "Trocar de classe parece caro" | **< 25% concorda** |
| M22 | "Perdi tempo em uma run que não rendeu nada" | **< 10% concorda** |

**Ordem de prioridade para o vertical slice:** M7, M8, M9, M1. As três primeiras são mensuráveis com uma dungeon e uma classe, e são as que validam a premissa central do projeto. As demais exigem semanas de conteúdo.

---

## 13. Perguntas em aberto

1. **Equipamento de conta com "um por vez" é gerenciável na prática, ou vira micro-gestão?** (R6). Alternativa: peças duplicáveis por custo de material, com devolução total.
2. **O eixo horizontal (sets que mudam comportamento) cabe no escopo do MVP?** Se não couber, R1 vira o risco mais provável de se concretizar, e a banda de poder talvez precise ser esticada para 1,6× no MVP.
3. **A renda de Selo de Forja deve ser semanal fixa ou proporcional ao desmanche?** Fixa é previsível e à prova de exploit; proporcional recompensa quem farma mais gear — o que pode reabrir a porta do helper 24/7.
4. **A camada de conta deve escalar com o número de classes jogadas?** Tentador (incentiva variedade), mas cria pressão de "precisa jogar todas as 5", que é o oposto da premissa.
5. **Fenda paga Insígnia por pontos — mas com que peso relativo às diárias?** Precisa de um número; a §7 propõe uma distribuição, não uma calibragem.
6. **Ranks 9–10 gateados por boss semanal produzem a cauda longa desejada ou frustração?** É o mecanismo mais criticado do HSR e do WuWa, e está sendo reproduzido aqui deliberadamente. Precisa de validação.
7. **Vale ter nível de conta separado de nível de personagem?** Ou o nível de conta pode ser simplesmente o Códex + Registro?

---

## 14. Resumo das decisões

| Tema | Decisão |
|---|---|
| Banda de poder funcional → quase-BiS | **×1,35–1,45** |
| Poder na camada de conta | **15–20%** |
| Exposição total à RNG | **~20% do poder** (só substats) |
| Funcional 1º / 2º / 3º personagem | **7–10 d / 3–5 d / 2–3 d** |
| Quase-BiS (95%) | **3–4 meses**; BiS literal não é prometido |
| Carteiras permanentes | **3** — Ouro, Insígnia, Selo de Forja |
| Contadores não-gastáveis | Pontos de Códex, Pontos de Caça, Nível de Conta, XP do Passe |
| Materiais | **70% universal / 20% arquétipo / 10% boss** |
| Máx. de materiais específicos por personagem | **3** |
| Determinismo | Slot grátis; set e main stat por Selo; substats livres |
| Piso | Nenhuma run devolve zero |
| Pity | Visível, com pior caso publicado |
| Desfazer | **Grátis, 100% de devolução** |
| Equipamento | **Da conta**, um personagem por vez |
| Catch-up de classe | EXP ×3, desconto até −70%, arquétipo compartilhado |
| Teto de conteúdo antigo | **Cai** conforme o nível de conta sobe |
| Sumidouro terminal | Refino de substat, infinito, +5% de teto de ganho |
| Excedente | Sempre conversível — nada é lixo |

**A frase que resume a economia:**

> **A energia decide quanto o jogador progride por dia. O determinismo decide que ele sempre progride. A camada de conta decide que meses de jogo significam alguma coisa. E a banda comprimida decide que trocar de classe não é recomeçar.**

---

## 15. Fontes

### 15.1 Consultadas nesta pesquisa

**Pity, determinismo e proteção contra RNG**
- [Pity System in Banners Explained — Game8 (Genshin)](https://game8.co/games/Genshin-Impact/archives/305937)
- [What are Pity, Soft Pity, and 50-50 in Genshin Impact — Sportskeeda](https://sportskeeda.com/esports/what-pity-soft-pity-50-50-genshin-impact-banner-drop-rates-explained)
- [Genshin Impact Pity System Guide: 90-Pull Guarantee & 50/50 — BitTopup](https://news.bittopup.com/news/genshin-impact-pity-system-guide-90-pull-guarantee-50-50)
- [Self-Modeling Resin — Honkai: Star Rail Wiki (Fandom)](https://honkai-star-rail.fandom.com/wiki/Self-Modeling_Resin)
- [How to Use Self-Modeling Resin — Game8](https://game8.co/games/Honkai-Star-Rail/archives/409249)
- [HSR 3.0 relic crafting com main e substats customizados — Sportskeeda](https://www.sportskeeda.com/esports/news-honkai-star-rail-3-0-feature-allow-crafting-relics-custom-main-sub-stats)
- [Artifact Strongbox — Genshin Impact Wiki (Fandom)](https://genshin-impact.fandom.com/wiki/Artifact_Strongbox)
- [Mystic Offering Guide / Artifact Strongbox — Game8](https://game8.co/games/Genshin-Impact/archives/342915)
- [Honing (Artisan's Energy) — Lost Ark Wiki](https://lostark.fandom.com/wiki/Honing)
- [Gear Honing System — Maxroll (Lost Ark)](https://maxroll.gg/lost-ark/resources/gear-honing-system)
- [Pseudo Random Distribution — Liquipedia (Dota 2)](https://liquipedia.net/dota2/Pseudo_Random_Distribution)
- [Pseudo-Random Mechanics — Dotabuff](https://www.dotabuff.com/blog/2016-01-03-pseudorandom-mechanics--and-how-to-use-them-to-your-advantage)
- [Destiny 2 Engram Focusing System Guide — LFCarry](https://blog.lfcarry.com/d2-engram-focusing-system-guide/)
- [Focused Decoding — light.gg](https://www.light.gg/db/vendors/1248953136/focused-decoding/)

**Catch-up e caps**
- [Catch-up Gear in Midnight Patch 12.0.5 — Method (WoW)](https://www.method.gg/guides/catch-up-gear-in-midnight-patch-12-0-5)
- [Alt Gearing in WoW Midnight: The Warband-Wide Catch-Up Guide](https://wowcarry.com/blog/wow/alt-gearing-improved-maximize-every-advantage-midnight-s1)
- [WoW Midnight Catalyst Guide — Tier sets from Warbound](https://boostmatch.gg/blog/wow/articles/wow-midnight-catalyst-guide)
- [Allagan Tomestones — FFXIV Wiki (Console Games Wiki)](https://ffxiv.consolegameswiki.com/wiki/Allagan_Tomestones)
- [Upcoming Changes to Allagan Tomestones — The Lodestone (Square Enix)](https://na.finalfantasyxiv.com/lodestone/topics/detail/412adbb060cf5defdd57a21c97ada64b0dbb5dbf)
- [FFXIV Allagan Tomestones Guide — EpicCarry](https://epiccarry.com/blogs/ff-xiv-allagan-tomestones-guide/)

**Velocidade de construção de personagem**
- [Trailblaze Power Explained — Icy Veins (HSR)](https://www.icy-veins.com/honkai-star-rail/trailblaze-power)
- [Trailblaze Power Guide: Where to Spend Your Stamina First — HostedGG](https://hostedgg.com/blog/honkai-star-rail-trailblaze-power-guide)
- [Trace Leveling Priority Guide — HostedGG](https://hostedgg.com/blog/honkai-star-rail-trace-leveling-priority-guide)
- [Trailblaze Power Efficiency — iGV](https://blog.igv.com/en/honkai-star-rail-trailblaze-power-efficiency/)

**Teoria de economia de jogos**
- [Game Economy Design: Metagame, Monetization and Live Operations (excerto) — Game Developer](https://www.gamedeveloper.com/design/book-excerpt-game-economy-design-metagame-monetization-and-live-operations)
- [What is an in-game economy — Unity (parte 1)](https://unity.com/how-to/what-game-economy-guide-part-1)
- [Building an in-game economy — Unity (parte 2)](https://unity.com/how-to/building-game-economy-guide-part-2)
- [Balance Levers for Game Economies — PulseGeek](https://pulsegeek.com/articles/balance-levers-for-game-economies-practical-guide/)

### 15.2 Documentos internos utilizados

- [W01 — Tibia: hunts e progressão](../tibia/01_hunts_progression.md) — tiers, taxonomia de drops, materiais de sistema
- [W02 — Tibia: vocações, spells e runas](../tibia/02_vocations_spells_runes.md) — eixo de runas
- [W03 — Tibia: bosses, Bossiary e Bestiary](../tibia/03_bestiary_bossiary.md) — Foco de Estudo, piso garantido, Sigilos, contadores
- [W04 — WAKFU: dungeons moduladas](../wakfu/01_modular_dungeons.md) — modo livre vs. sincronizado, "uma moeda global + um material por faixa"
- [W05 — WAKFU: Rifts](../wakfu/02_rifts.md) — Ecos, Estilhaços, Vestígios, moeda de fim de run
- [W07 — Endgame e roguelite](02_endgame_roguelite.md) — moeda temporária e loja de run
- [W08 — Eventos e battle pass](03_events_battlepass.md) — Ciclo, Maré, loja sazonal, grafo de camadas
- [W06 — Rotina, energia e resina](W06_gachas_rotina_energia.md) — Vigor de Caça, reserva, contadores, Descanso

### 15.3 Nota de confiabilidade

Os dados externos de **pity, caps semanais, custos e mecanismos de catch-up** foram verificados em fontes públicas e estão citados acima. Os **números-alvo de velocidade** (§0, §4.2), a **banda de poder** (P2), os **percentuais de orçamento** (§4.1, §6.1, §7) e os **alvos de métrica** (§12) são `[HIPÓTESE]` — derivados por analogia com as referências, não medidos. São exatamente o que a instrumentação da §12 existe para validar ou refutar.
