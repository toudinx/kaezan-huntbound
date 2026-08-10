# Kaezan Huntbound — Dossiê de Direção, Pesquisa e Prompts

> **STATUS: HISTÓRICO.** Este dossiê registra a fase de pesquisa que assumia Godot. Os mapeamentos e
> perguntas continuam úteis; os prompts de implementação/stack não devem ser executados sem
> adaptação. A direção vigente é `02_SINTESE_DIRECAO_UNICA.md` +
> `03_ADR_PHASER4_BROWSER_FIRST.md`, e a execução segue
> `04_PLAYBOOK_FUNDAMENTACAO_GAME_STUDIO.md`.

> Documento mestre para orientar a fase de pesquisa e mapeamento antes de qualquer implementação relevante.
>
> Nome de trabalho do projeto: **Kaezan Huntbound**.
>
> Importante: neste primeiro momento, **Kaezan é apenas o nome do projeto/repositório**. Não estamos tentando implementar o universo, personagens, lore ou identidade visual definitiva de Kaezan.

---

# 1. Objetivo do projeto

Criar em **Godot 4.7.1** um RPG single-player/top-down com o **feeling de gameplay do Tibia**, mas sem tentar recriar um MMORPG.

O jogo deve aproveitar aquilo que torna Tibia agradável no combate e progressão — movimentação em grid/tile, hunts, bosses, loot, vocações, runas, progressão de equipamento e sensação de evolução da conta — e remover ou reduzir aquilo que exige grind excessivo ou sessões muito longas.

A ideia central é:

> **“Um Tibia para quem gosta de Tibia, mas não tem tempo para viver no Tibia.”**

O jogador deve conseguir construir personagens fortes ao longo de semanas e meses, mas a progressão cotidiana deve ser baseada principalmente em **gestão da conta, escolhas de conteúdo e consistência**, e não em deixar o jogo rodando 10 ou 20 horas por dia.

---

# 2. Princípios fundamentais

## 2.1 Não é um MMORPG

Não precisamos, no início, de:

- mundo persistente compartilhado;
- centenas de jogadores simultâneos;
- PvP;
- guildas;
- chat;
- economia entre jogadores;
- servidor autoritativo complexo;
- arquitetura de MMO;
- mapa aberto gigantesco.

O jogo será pensado primeiro como uma experiência **single-player**, estruturada em conteúdos selecionáveis.

---

## 2.2 Tibia é referência de gameplay, não prisão de design

Queremos preservar sensações de Tibia, mas podemos modernizar ou simplificar qualquer sistema.

Exemplos de coisas que podem ser mantidas:

- tile/grid;
- movimentação top-down;
- targeting;
- loot;
- bosses;
- hunts;
- runas;
- equipamentos;
- vocações;
- bossiary/bestiary;
- sensação de melhorar lentamente um personagem.

Exemplos de coisas que podem ser alteradas:

- dash;
- postura;
- quantidade de skills;
- progressão de skills;
- estrutura de mapas;
- uso de helpers;
- conteúdo instanciado;
- level sync;
- equipamentos sincronizados;
- sistemas semanais;
- resina/energia;
- modos roguelite;
- estrutura de recompensas.

---

## 2.3 O Arena Fable é a principal referência criativa interna

O projeto **Kaezan Arena Fable** já contém decisões, protótipos e uma camada de produto/UI que não devem ser ignorados.

Devemos mapear especialmente:

### Gameplay e sistemas

- dash;
- postura;
- helper;
- targeting automático;
- uso automático de skills;
- loot automático;
- dungeons curtas;
- bosses;
- lógica de conteúdo;
- assets exportados de Tibia já utilizados como placeholder/protótipo;
- decisões que funcionaram e decisões que ficaram ruins.

### Hub, navegação e UI/UX

O Arena Fable também já possui uma UI/UX relativamente evoluída e deve ser tratado como referência importante de produto.

Devemos mapear:

- tela inicial / hub;
- navegação principal;
- telas de Kaelis/personagens;
- telas de hunts/dungeons;
- telas de gacha/recruit;
- telas e indicadores de resina/energia;
- roster e progressão;
- fluxo de entrada em conteúdo;
- hierarquia visual;
- cards;
- menus;
- estados de recursos;
- feedback de progressão;
- organização dos modos;
- padrões de navegação entre hub e gameplay;
- outras telas de conta, conteúdo e administração que possam trazer decisões reutilizáveis.

Mesmo que algumas dessas telas representem sistemas que não entrarão no MVP — como gacha — elas continuam úteis como referência de **arquitetura de informação, navegação e apresentação de sistemas**.

Não queremos simplesmente “portar” Arena Fable para Godot.

A UI original foi construída em Angular/HTML/CSS. Godot usa outra abordagem, baseada em `Control`, scenes, containers, themes e componentes próprios. Portanto, precisamos separar:

1. conceitos e fluxos de UX que merecem sobreviver;
2. componentes visuais que podem ser reinterpretados;
3. telas que devem ser simplificadas;
4. padrões específicos de web que não devem ser replicados literalmente;
5. elementos que podem servir como wireframe/referência para a nova UI Godot;
6. o que é específico demais da arquitetura Angular/C#.

Queremos descobrir:

1. o que merece ser preservado;
2. o que precisa ser redesenhado;
3. o que pode ser descartado;
4. o que deve ser reconstruído de forma idiomática em Godot.

---

# 3. Stack inicial

## Engine

- **Godot 4.7.1 Stable**
- Windows 64-bit
- Renderer: **Compatibility**
- Projeto já criado
- Cena inicial:
  - `res://scenes/main.tscn`

## Linguagem

Decidir na fase de arquitetura entre:

- GDScript;
- C# no Godot;
- combinação limitada dos dois.

A escolha deve favorecer:

- velocidade de vibe coding;
- manutenção simples;
- facilidade para agentes de código;
- performance suficiente;
- baixo atrito de tooling.

Não escolher C# apenas porque o projeto antigo usava C#.

---

# 4. Fontes de referência

Precisamos estudar cinco grupos de referência.

## 4.0 Localização real dos repositórios e documentação existente

Antes de iniciar qualquer análise de código, o agente deve considerar que **já existe bastante documentação produzida anteriormente**. O objetivo não é refazer o mapeamento do zero, e sim:

1. ler a documentação existente;
2. identificar o que já foi descoberto;
3. validar essas conclusões contra o código atual;
4. atualizar somente o que estiver desatualizado, incompleto ou incompatível com Huntbound.

### Kaezan Arena Fable

Raiz do projeto:

```text
C:\Kaezan\kaezan-arena-fable
```

Documentação existente:

```text
C:\Kaezan\kaezan-arena-fable\docs
C:\Kaezan\kaezan-arena-fable\docs_web
```

O Arena Fable segue uma prática de documentação contínua: **as implementações relevantes costumam ser documentadas**.

Portanto, qualquer auditoria deve começar pelas docs antes de navegar extensivamente pelo código.

As docs podem conter:

- decisões arquiteturais;
- decisões de gameplay;
- regras do helper;
- dash;
- postura;
- dungeons;
- bosses;
- UI/UX;
- hub;
- telas de Kaelis;
- hunts;
- gacha/recruit;
- resina;
- fluxo de navegação;
- asset pipeline;
- decisões descartadas;
- problemas conhecidos;
- histórico de mudanças.

O código atual deve ser usado para confirmar se a documentação continua válida.

### Canary, OTClient e Remere's Map Editor

As referências clonadas estão em:

```text
C:\Kaezan\kaezan-godot\references
```

O agente deve identificar dentro dessa pasta os diretórios correspondentes a:

- Canary;
- OTClient;
- Remere's Map Editor / RME.

Esses repositórios devem ser tratados como **referências de leitura** durante a fase de pesquisa.

Não modificar esses repositórios a menos que um prompt futuro diga explicitamente o contrário.

### Mapeamento histórico do Canary e OTClient

Existe um mapeamento anterior feito aproximadamente dois meses antes da criação deste dossiê.

Canary:

```text
C:\Kaezan\kaezan\mapping\baseline\canary
```

OTClient:

```text
C:\Kaezan\kaezan\mapping\baseline\client
```

Esse material já contém uma quantidade relevante de análise e deve ser aproveitado.

Porém, como os repositórios atuais podem ter evoluído desde então, o agente **não deve assumir que o baseline ainda representa 100% do código atual**.

A abordagem correta é:

```text
documentação antiga
        ↓
hipóteses e mapa já existentes
        ↓
comparação com repositório atual
        ↓
delta / mudanças recentes
        ↓
documentação consolidada para Huntbound
```

### Regra para pesquisa de código

Para Arena Fable, Canary e OTClient, evitar começar com uma varredura cega do repositório.

Preferir esta sequência:

1. localizar e ler documentação/mapeamentos existentes;
2. produzir um resumo do que já está documentado;
3. localizar no código os pontos citados;
4. validar o estado atual;
5. identificar deltas;
6. pesquisar código adicional apenas onde houver lacunas;
7. criar o relatório final já orientado ao Huntbound.

Essa estratégia reduz trabalho duplicado e permite aproveitar decisões e descobertas já feitas.


## 4.1 Repositórios locais

- Canary
- OTClient
- Kaezan Arena Fable
- RME / Remere's Map Editor
- mapeamento antigo feito anteriormente pelo usuário, caso ainda exista

## 4.2 Ecossistema Tibia

- Tibia Wiki
- wikis comunitárias relevantes
- sites/guias de hunts por level
- informações de vocações
- spells
- runas
- bosses
- bestiary
- bossiary
- equipamentos
- loot
- progressão típica por nível
- estrutura de hunts
- mecânicas recentes úteis como referência

## 4.3 WAKFU

Pesquisar especialmente:

- dungeons moduladas;
- ajuste/sincronização de level;
- equipamentos por faixa de nível;
- incentivos para repetir conteúdo antigo;
- rifts/fendas;
- progressão e recompensas de fendas;
- conteúdo que continua relevante mesmo depois que o personagem supera seu level original.

## 4.4 Gachas/live services modernos

Prioridade:

- Wuthering Waves;
- Honkai: Star Rail.

Também podem ser usados outros jogos quando forem referência melhor para um sistema específico.

Pesquisar:

- diárias;
- semanais;
- energia/resina;
- passe de batalha;
- eventos;
- conteúdo endgame;
- bosses semanais;
- roguelite/roguelike recorrente;
- recompensas limitadas por reset;
- auto-play;
- gestão de conta;
- progressão horizontal entre personagens;
- catch-up;
- duração das sessões.

## 4.5 Jogos semelhantes e padrões de design

Quando útil, procurar referências de:

- dungeon crawlers;
- ARPGs;
- games com auto-battle;
- games com auto-clear;
- games com idle/assist sem serem idle games;
- jogos com conteúdo sincronizado;
- jogos com gear caps;
- jogos com temporadas;
- boss rush;
- tower modes;
- wave survival;
- roguelite semanal.

---

# 5. Visão do loop de jogo

A progressão deve ser construída em camadas.

## 5.1 Loop diário

O jogador entra para:

- gastar energia/resina;
- obter materiais;
- obter equipamento;
- evoluir personagem;
- evoluir runas/sistemas equivalentes;
- cumprir objetivos diários;
- eventualmente fazer um boss ou dungeon rápida.

O jogador deve conseguir completar a rotina diária em pouco tempo.

Meta inicial de design:

- **15–30 minutos para uma rotina diária normal**
- conteúdo adicional é opcional.

Isso ainda deverá ser validado na pesquisa.

---

## 5.2 Loop semanal

O jogador volta para:

- bosses semanais;
- desafios sincronizados;
- fendas/rifts;
- torre/desafios;
- conteúdos com limite semanal de recompensas;
- objetivos semanais;
- progressão de passe;
- eventos.

O semanal é onde o jogo pode pedir sessões mais longas e decisões mais relevantes.

---

## 5.3 Loop de longo prazo

O motivo para continuar jogando é:

- deixar os personagens muito fortes;
- completar builds;
- obter BiS;
- melhorar runas;
- vencer conteúdos endgame;
- subir dificuldade;
- construir mais de uma vocação/personagem;
- experimentar novas classes;
- completar coleções/objetivos;
- vencer novas temporadas ou resets.

---

# 6. Progressão por personagem

No primeiro momento, usar apenas as cinco vocações/classes básicas de Tibia como referência:

1. Knight / Kina
2. Paladin / Pala
3. Sorcerer
4. Druid
5. Monk

Não precisamos importar todas as habilidades de Tibia.

A proposta é criar kits enxutos.

Hipótese inicial:

- aproximadamente 4–6 skills realmente relevantes por classe;
- runas como camada adicional;
- ultimate ou habilidade especial apenas se fizer sentido;
- postura como sistema próprio;
- dash como sistema próprio.

Skills não precisam ser liberadas simplesmente em dezenas de níveis diferentes.

Podemos usar uma estrutura de progressão semelhante a:

- árvore/roda de habilidades;
- upgrades qualitativos;
- especializações;
- variantes;
- modificadores;
- passivas.

A “roda de habilidade” de Tibia é uma referência que deve ser estudada, não necessariamente copiada.

---

# 7. Filosofia do helper

O helper é **parte central do jogo**.

Ele não é acessibilidade opcional adicionada depois.

Ele existe porque queremos reduzir tarefas repetitivas.

## 7.1 Funções candidatas

- target automático;
- prioridade de target;
- loot automático;
- uso automático de skills;
- cura;
- potion;
- runas;
- comportamento de distância;
- aproximação;
- kite;
- seguir alvo;
- evitar áreas;
- auto-combate;
- navegação dentro de conteúdo dominado;
- loadouts de comportamento.

## 7.2 Filosofia

> O helper executa repetição. O jogador toma decisões.

O jogador deve poder decidir:

- que conteúdo fazer;
- qual personagem usar;
- qual build usar;
- como gastar recursos;
- quais cartas/modificadores escolher;
- qual rota seguir;
- quando sincronizar nível;
- como configurar o helper.

Não queremos tornar o conteúdo endgame artificialmente manual apenas para “forçar gameplay”.

O endgame pode continuar usando helper.

A manualidade pode vir de:

- construção da build;
- decisões entre salas;
- cartas;
- sigils;
- upgrades;
- lojas;
- seleção de risco/recompensa;
- composição da run;
- estratégia pré-combate.

---

# 8. Limite para automação: energia/resina

Sem um limite, o helper poderia ficar jogando 24 horas por dia e recriar exatamente o grind que queremos eliminar.

Por isso, precisamos pesquisar e desenhar um sistema semelhante a energia/resina.

Objetivos:

- limitar recompensas de progressão diária;
- impedir vantagem por deixar máquina rodando indefinidamente;
- permitir sessões curtas;
- criar rotina;
- preservar sensação de evolução;
- não gerar frustração excessiva.

Devemos pesquisar:

- capacidade máxima;
- regeneração;
- overflow;
- itens de recuperação;
- armazenamento;
- custo por atividade;
- recompensas sem energia;
- energia extra via semanal/evento;
- catch-up.

Evitar monetização predatória nesta fase.

---

# 9. Dungeons

Dungeons são o conteúdo base de farm.

Podem representar hunts clássicas de Tibia em formato instanciado.

Exemplo conceitual:

- conteúdo de minotauros para uma faixa inicial;
- conteúdo de cyclops para faixa seguinte;
- etc.

Sites de hunts por level podem ajudar a transformar progressão tradicional de Tibia em uma sequência organizada de dungeons.

## 9.1 Dois modos de entrada

### Modo Livre

O jogador entra com seu personagem atual.

Exemplo:

- personagem level 100;
- dungeon originalmente level 20;
- entra level 100;
- limpa rapidamente;
- recompensa proporcionalmente reduzida ou focada apenas em drops específicos.

Uso:

- diária rápida;
- farm de material antigo;
- collection;
- bossiary;
- completar tarefas.

### Modo Sincronizado / Modulado

O personagem é ajustado para a faixa da dungeon.

Exemplo:

- dungeon level 20;
- personagem level 100;
- stats são sincronizados para level 20;
- apenas equipamentos adequados à faixa funcionam ou têm efeito completo.

Objetivos:

- manter conteúdo antigo relevante;
- valorizar sets antigos;
- criar gameplay desafiadora;
- aumentar diversidade de builds;
- incentivar coleção de equipamentos por faixa.

---

# 10. Sets por faixa de nível

Queremos investigar a viabilidade de o jogador manter loadouts por faixas.

Exemplo hipotético:

- 20
- 40
- 60
- 80
- 100

A pesquisa deve determinar se:

- faixas fixas fazem sentido;
- o sync deve normalizar stats;
- equipamentos devem ser bloqueados;
- equipamentos devem ser reduzidos;
- atributos devem ser escalados;
- recompensas devem melhorar no modo sincronizado.

---

# 11. Incentivos para conteúdo sincronizado

O jogador não deve ser obrigado a sincronizar toda dungeon diária.

Exemplo:

- diária:
  - “complete 3 dungeons”;
  - pode usar personagem forte para fazer rápido.

- semanal:
  - “complete 2 ou 3 dungeons sincronizadas abaixo do seu nível atual”.

Isso gera:

- rotina rápida no dia a dia;
- profundidade em poucos momentos;
- uso de gear antigo;
- variedade.

A quantidade exata precisa ser validada.

---

# 12. Fendas / Rifts

Fendas devem ser tratadas como conteúdo de desafio/endgame, não como substituição das dungeons.

Referência principal:

- WAKFU.

Conceito para Huntbound:

- sequência de waves;
- progressão durante a run;
- recompensa acumulada;
- versões com mobs;
- versões com bosses;
- dificuldade crescente;
- possível escolha de buffs;
- moedas temporárias;
- lojas;
- cartas;
- sigils;
- modificadores;
- risco/recompensa.

Pode existir como:

- semanal;
- quinzenal;
- sazonal.

Queremos evitar que seja apenas “40 waves iguais”.

---

# 13. Endgame

O jogador precisa de um motivo para construir personagens muito fortes.

Possíveis pilares de endgame:

## Bosses semanais

- limite de recompensas;
- dificuldade alta;
- drops especiais;
- chance de BiS/relics;
- talvez 3 recompensas semanais.

## Fendas

- sessão mais longa;
- progressão dentro da própria run;
- buffs/cartas/sigils;
- waves;
- bosses.

## Torre

- salas/andares;
- modificadores;
- resets;
- dificuldade crescente;
- score/recompensa.

## Dungeon sincronizada de alta dificuldade

- conteúdo antigo reutilizado;
- regras especiais;
- rankings pessoais/medalhas opcionais.

## Boss rush

- sequência de bosses;
- recursos limitados;
- decisões entre confrontos.

Não precisamos implementar tudo no MVP.

Precisamos primeiro mapear quais modos geram mais valor por custo de produção.

---

# 14. Roguelite recorrente com helper

Honkai: Star Rail é referência importante.

O ponto não é copiar combate em turnos.

O que interessa é o loop:

1. helper/auto resolve o combate;
2. jogador escolhe após encontros;
3. escolhe buffs/cartas;
4. compra upgrades;
5. escolhe rotas;
6. gerencia recursos temporários;
7. cria uma build dentro da run.

Esse padrão é especialmente interessante porque permite:

- helper continuar forte;
- combate repetitivo não cansar;
- decisões continuarem humanas;
- runs serem diferentes.

Pesquisar como adaptar isso ao combate top-down/tile-based.

---

# 15. Eventos

Eventos devem reutilizar sistemas sempre que possível.

Evitar eventos que exigem uma feature completamente nova toda vez.

Exemplos:

- dungeon com mutator;
- boss especial;
- rift sazonal;
- drop aumentado;
- escolha de facção temporária;
- quests curtas;
- modificadores de helper;
- regras de gear sync.

Precisamos estudar como gachas mantêm variedade com custo controlado de conteúdo.

---

# 16. Passe de batalha

Não é prioridade de implementação.

Pesquisar apenas como estrutura de progressão.

Objetivos:

- recompensar jogar ao longo de semanas;
- criar metas;
- não exigir horas diárias;
- conectar diárias, semanais e eventos.

Nesta fase não é necessário desenhar monetização.

---

# 17. Bossiary e Bestiary

Queremos preservar essa sensação de Tibia.

Bossiary:

- repetir bosses;
- progresso visível;
- milestones;
- recompensas;
- possíveis bônus;
- coleção.

Bestiary:

- matar criaturas;
- conhecer conteúdo;
- desbloquear informações;
- metas de longo prazo.

Precisamos decidir se isso dá:

- power;
- cosmético;
- currency;
- qualidade de vida;
- achievements;
- combinação desses.

Evitar transformar isso em grind obrigatório excessivo.

---

# 18. Assets e identidade visual

Durante prototipagem:

- podemos usar os assets de Tibia já exportados no Arena Fable como placeholders;
- não vamos travar o projeto tentando criar identidade visual própria;
- lore de Kaezan não é prioridade.

Porém:

- uso de assets de terceiros deve ser tratado como **placeholder interno/prototipagem**;
- antes de distribuição pública/comercial, será necessário avaliar direitos e substituir/adaptar assets conforme necessário.

O objetivo inicial é validar jogo e sistemas.

---

# 19. Canary, OTClient e RME

Eles são referências.

## Canary

Estudar:

- criaturas;
- spells;
- combat formulas;
- loot;
- items;
- movement;
- bosses;
- map/world data;
- conditions;
- vocations;
- bestiary/boss systems se aplicável.

Não importar arquitetura de MMO sem necessidade.

## OTClient

Estudar:

- input;
- movimento;
- targeting;
- hotkeys;
- battle list;
- containers;
- feedback visual;
- câmera;
- UX;
- tile selection;
- automações existentes quando relevantes.

Não portar código cegamente.

## RME

Estudar:

- estrutura de mapa;
- tile layers;
- objects;
- spawns;
- houses/zones se útil;
- formatos;
- workflow de edição.

Pergunta principal:

> Vale importar mapas existentes, converter mapas ou simplesmente criar nosso próprio pipeline de mapas Godot inspirado no modelo do Tibia?

---

# 20. Hub e UI/UX como ativo reaproveitável

O Huntbound não começa do zero em produto e navegação.

O Arena Fable já criou uma interpretação inicial de como um jogo com personagens, hunts, recursos, progressão e recrutamento pode ser organizado em uma experiência de hub.

Isso deve ser tratado como **material de design existente**, e não apenas como código legado.

## 20.1 O que queremos extrair

- arquitetura de informação;
- mapa de telas;
- ordem de navegação;
- prioridade visual;
- hierarquia de recursos;
- representação de personagem;
- entrada em hunts;
- leitura de resina;
- progressão;
- cards;
- menus;
- feedback;
- sensação de “jogo gacha/live-service” fora do combate.

## 20.2 O que não queremos fazer

- portar Angular para Godot;
- imitar DOM/CSS com nodes de forma literal;
- reconstruir todas as telas antes do gameplay;
- manter telas apenas porque já existem;
- colocar gacha no MVP só porque já existe uma tela de recruit.

## 20.3 Estratégia esperada

Usar Arena Fable como:

1. wireframe funcional;
2. referência de fluxos;
3. referência de arquitetura de informação;
4. referência visual inicial;
5. inventário de telas e estados.

Depois, reconstruir apenas o que sobreviver à síntese usando práticas idiomáticas do Godot:

- `Control`;
- `Container`;
- scenes reutilizáveis;
- themes;
- custom resources quando úteis;
- navegação desacoplada do gameplay;
- suporte a diferentes resoluções quando necessário.

O primeiro vertical slice pode ter UI mínima, mas a arquitetura não deve impedir um hub completo no futuro.

---

# 21. Princípios de escopo

Antes da implementação:

- pesquisar;
- sintetizar;
- documentar;
- definir decisões;
- só então criar plano técnico.

Evitar:

- começar construindo dezenas de sistemas;
- copiar Canary inteiro;
- copiar OTClient inteiro;
- recriar MMO;
- importar todas as spells;
- importar milhares de itens;
- criar universo visual;
- criar gacha agora;
- criar monetização agora.

---

# 22. Fases do trabalho

## Fase A — Pesquisa externa

Worker/deep research.

## Fase B — Pesquisa de código

Codex.

## Fase C — Síntese

Um agente lê todos os relatórios e cria uma direção única.

## Fase D — Arquitetura

Agente cria plano de Godot.

## Fase E — Implementação por milestones

Somente depois.

---

# 23. Estrutura recomendada para salvar os resultados

```text
/docs
  /research
    /tibia
    /wakfu
    /gacha
    /code
    /economy
    /helper
  /design
  /architecture
  /decisions
```

Sugestão de nomes:

```text
docs/research/tibia/01_hunts_progression.md
docs/research/tibia/02_vocations_spells_runes.md
docs/research/tibia/03_bestiary_bossiary.md
docs/research/wakfu/01_modular_dungeons.md
docs/research/wakfu/02_rifts.md
docs/research/gacha/01_daily_weekly_energy.md
docs/research/gacha/02_endgame_roguelite.md
docs/research/gacha/03_events_battlepass.md
docs/research/code/01_canary.md
docs/research/code/02_otclient.md
docs/research/code/03_arena_fable.md
docs/research/code/04_rme.md
docs/research/helper/01_helper_ux.md
docs/research/economy/01_progression_economy.md
docs/design/00_game_direction.md
docs/architecture/00_implementation_plan.md
```

---

# 24. PROMPTS — WORKER / DEEP RESEARCH

Cada prompt abaixo é autocontido de propósito.

---

## W01 — Tibia: hunts, progressão por level e transformação em dungeons

```text
CONTEXTO DO PROJETO

Estamos planejando um projeto chamado Kaezan Huntbound. O nome Kaezan é apenas um nome de trabalho; não estamos criando lore ou identidade visual agora.

O jogo será feito em Godot 4.7.1 e será um RPG single-player top-down/tile-based com feeling de Tibia, mas não será um MMORPG.

A proposta é criar “um Tibia para quem gosta de Tibia, mas não tem tempo para grind infinito”. Queremos sessões diárias curtas, progressão de conta/personagem ao longo de semanas e meses, helper integrado para tarefas repetitivas, dungeons instanciadas, bosses, runas, equipamentos, vocações e conteúdo endgame.

As cinco classes iniciais usarão como referência Knight, Paladin, Sorcerer, Druid e Monk.

Não implemente código.

TAREFA

Faça uma pesquisa aprofundada sobre a progressão tradicional de hunts em Tibia.

Quero entender:

1. Quais criaturas/hunts são normalmente utilizadas em diferentes faixas de level.
2. Como a dificuldade, densidade, loot e risco mudam conforme o jogador progride.
3. Que hunts são particularmente icônicas ou representativas.
4. Quais hunts funcionariam bem quando transformadas em dungeons instanciadas curtas.
5. Como organizar faixas de progressão sem precisar recriar todo o mapa aberto de Tibia.
6. Quais tipos de monstros poderiam representar cada faixa.
7. Como evitar que a progressão fique repetitiva.
8. Quais hunts dependem demais de particularidades do MMORPG e seriam ruins para nossa proposta.

Pesquise Tibia Wiki e outras fontes públicas relevantes, incluindo guias de hunts por level quando úteis.

SAÍDA

Crie um relatório em Markdown com:

- resumo executivo;
- tabela de faixas de level;
- exemplos de hunts/criaturas por faixa;
- características de gameplay;
- potencial para dungeon;
- possíveis drops/objetivos;
- riscos;
- recomendações para Huntbound;
- lista do que NÃO vale copiar;
- fontes.

Não trate números atuais do Tibia como regras definitivas do nosso jogo. O objetivo é obter padrões de design e referências.
```

---

## W02 — Tibia: vocações, spells e runas essenciais

```text
CONTEXTO DO PROJETO

Kaezan Huntbound será um RPG single-player em Godot 4.7.1 inspirado no feeling de Tibia, mas com escopo muito menor que um MMORPG.

Queremos cinco classes iniciais inspiradas em:
- Knight
- Paladin
- Sorcerer
- Druid
- Monk

Não queremos importar dezenas de skills inúteis ou extremamente situacionais. O objetivo é criar kits modernos e enxutos, provavelmente com aproximadamente 4–6 ações realmente relevantes por classe, além de runas e sistemas próprios como dash e postura.

O helper poderá utilizar skills automaticamente.

Não implemente código.

TAREFA

Pesquise como as cinco vocações funcionam atualmente e historicamente em Tibia, com foco no que realmente define a identidade de gameplay de cada uma.

Mapeie:

1. papel de combate;
2. range;
3. sustain;
4. dano single target;
5. AoE;
6. mobilidade;
7. cura;
8. resource management;
9. spells mais importantes/representativas;
10. spells raramente relevantes;
11. runas importantes;
12. rotação prática típica;
13. diferenças entre solo, hunt e boss;
14. sistemas atuais como a skill wheel quando relevantes.

SAÍDA

Crie Markdown contendo:

- identidade de cada vocação;
- “núcleo obrigatório”;
- “pode ser descartado”;
- sugestão conceitual de kit enxuto para Huntbound;
- possíveis interações com dash;
- possíveis interações com postura;
- possíveis configurações de helper;
- riscos de descaracterização;
- fontes.

Não desenhe o balanceamento final.
```

---

## W03 — Tibia: bosses, bossiary e bestiary

```text
CONTEXTO DO PROJETO

Estamos criando Kaezan Huntbound, um RPG single-player/top-down inspirado no feeling de Tibia.

Queremos que bosses sejam um dos pilares de progressão. O jogador poderá repetir bosses para obter itens, completar objetivos e construir personagens. Também gostamos da sensação de progresso de sistemas como Bossiary/Bestiary.

Como não queremos grind infinito, precisamos adaptar esses sistemas para uma rotina diária/semanal limitada.

Não implemente código.

TAREFA

Pesquise:

- como funciona Bestiary em Tibia;
- como funciona Bossiary e sistemas relacionados;
- tipos de bosses;
- lockouts/cooldowns quando existirem;
- recompensas;
- incentivos para repetição;
- progressão de coleção;
- problemas de grind;
- elementos que jogadores valorizam;
- elementos que geram frustração.

Depois proponha princípios para adaptar essas ideias para um jogo single-player com energia/resina e resets.

SAÍDA

Markdown com:

- funcionamento dos sistemas originais;
- pontos fortes;
- pontos fracos;
- elementos transferíveis;
- elementos a evitar;
- modelo conceitual de Bestiary para Huntbound;
- modelo conceitual de Bossiary para Huntbound;
- como limitar grind sem destruir sensação de progresso;
- fontes.
```

---

## W04 — WAKFU: dungeons moduladas, level sync e gear sync

```text
CONTEXTO DO PROJETO

Kaezan Huntbound será um RPG single-player em Godot com combate top-down/tile-based inspirado em Tibia.

Queremos que conteúdo antigo permaneça relevante.

Exemplo: um personagem level 100 pode entrar em uma dungeon originalmente destinada ao level 20 de duas maneiras:

1. Modo Livre: entra level 100 e limpa rapidamente para farm/diária.
2. Modo Sincronizado: seus stats e/ou equipamentos são limitados à faixa da dungeon, tornando a atividade novamente desafiadora e mais recompensadora.

Gostamos do conceito de dungeons moduladas do WAKFU.

Não implemente código.

TAREFA

Pesquise profundamente como WAKFU trata:

- level modulation;
- dungeons moduladas;
- equipment/gear por faixa;
- builds antigas;
- recompensas por conteúdo modulado;
- sistemas competitivos ou rankings se existirem;
- problemas e exploits;
- percepção da comunidade;
- incentivos para jogar conteúdo abaixo do level atual.

Compare, quando útil, com outros jogos que possuam level sync eficaz.

SAÍDA

Markdown com:

- como WAKFU faz;
- o que funciona;
- o que não funciona;
- proposta de princípios para Huntbound;
- opções de sync de stats;
- opções de sync de equipment;
- faixas de level;
- recompensas;
- relação com diárias/semanais;
- riscos de complexidade;
- recomendação final;
- fontes.
```

---

## W05 — WAKFU: Rifts/Fendas

```text
CONTEXTO DO PROJETO

Kaezan Huntbound será um RPG single-player em Godot inspirado em Tibia.

O conteúdo base será formado por dungeons de farm e bosses. Queremos também conteúdo endgame recorrente.

Gostamos do conceito de Rifts/Fendas de WAKFU: desafios mais longos com múltiplos combates/waves e recompensas progressivas.

Em Huntbound, o combate será em tempo real/top-down/tile-based, não em turnos.

O helper poderá continuar jogando automaticamente. A decisão humana deve acontecer através de build, escolhas durante a run, cartas, sigils, lojas, rota e gerenciamento de recursos.

Não implemente código.

TAREFA

Pesquise exatamente como funcionam as Rifts/Fendas de WAKFU, incluindo variações com bosses quando existirem.

Mapeie:

- duração;
- número/estrutura de ondas;
- progressão;
- dificuldade;
- condições de vitória;
- condições de falha;
- recompensas;
- escalonamento;
- repeatability;
- interação com level modulation;
- percepção dos jogadores.

Depois analise como transformar o conceito em um modo semanal/quinzenal para Huntbound.

SAÍDA

Markdown com:

- descrição fiel do sistema do WAKFU;
- pontos fortes/fracos;
- proposta adaptada para tempo real;
- possíveis tipos de Rift;
- estrutura de waves;
- progressão temporária;
- buffs/cartas/sigils;
- relação com helper;
- relação com energia/resina;
- duração recomendada;
- frequência de reset;
- fontes.
```

---

## W06 — Gachas: diárias, semanais, resina e gestão de conta

```text
CONTEXTO DO PROJETO

Kaezan Huntbound será um RPG single-player/top-down inspirado em Tibia, mas com estrutura de progressão semelhante a live services/gachas modernos.

Não estamos implementando gacha de personagens neste momento.

Queremos estudar os sistemas de rotina porque a proposta é evitar grind infinito.

O jogador deve entrar, gastar recursos, melhorar personagens e sair. Queremos uma rotina diária curta e conteúdos semanais mais profundos.

Prioridade de pesquisa:
- Wuthering Waves
- Honkai: Star Rail

Use outros jogos apenas quando forem referências úteis.

Não implemente código.

TAREFA

Compare como esses jogos estruturam:

- energia/resina;
- regeneração;
- capacidade máxima;
- armazenamento/overflow;
- atividades que gastam energia;
- atividades sem energia;
- materiais de personagem;
- materiais de skills;
- gear;
- bosses;
- dailies;
- weeklies;
- limites semanais;
- catch-up;
- retorno de jogadores;
- tempo necessário por dia.

SAÍDA

Markdown com:

- comparação estruturada;
- padrões que funcionam;
- frustrações comuns;
- recomendações para Huntbound;
- proposta inicial de rotina diária;
- proposta inicial de rotina semanal;
- cuidados para não gerar FOMO excessivo;
- cuidados para não permitir grind 24/7 via helper;
- fontes.
```

---

## W07 — Gachas: endgame, roguelite recorrente e auto-play

```text
CONTEXTO DO PROJETO

Kaezan Huntbound terá helper forte: auto-target, auto-loot, auto-skills e possivelmente navegação/combat assistido.

Não queremos nerfar artificialmente o helper no endgame.

A ideia é que a estratégia humana venha de decisões como:

- build;
- cartas;
- sigils;
- rotas;
- lojas;
- uso de moeda temporária;
- risco/recompensa;
- seleção de buffs;
- preparação.

Honkai: Star Rail é uma referência importante porque parte de seus conteúdos roguelite pode ser jogada em auto, mas o jogador continua tomando decisões entre confrontos.

Wuthering Waves também deve ser estudado.

Não implemente código.

TAREFA

Pesquise sistemas endgame/roguelite recorrentes de HSR, Wuthering Waves e outros gachas relevantes.

Investigue:

- estrutura das runs;
- resets;
- rewards;
- auto-play;
- escolhas;
- buffs;
- curios/cards/blessings/sigils equivalentes;
- lojas;
- eventos internos;
- caminhos/paths;
- score;
- difficulty;
- seasonal rotation;
- como evitam que o auto torne a experiência irrelevante.

SAÍDA

Markdown com:

- sistemas comparados;
- princípios úteis;
- anti-patterns;
- proposta de 2–4 formatos possíveis para Huntbound;
- qual formato parece ter melhor custo/benefício;
- como manter helper ativo sem retirar estratégia;
- fontes.
```

---

## W08 — Gachas: eventos e passe de batalha

```text
CONTEXTO DO PROJETO

Kaezan Huntbound pretende ter estrutura de conteúdo recorrente semelhante a um live service, mesmo sendo inicialmente single-player.

Gacha/monetização não é prioridade agora.

Queremos entender como eventos e passes conseguem gerar metas de curto e médio prazo sem exigir desenvolvimento de um jogo novo a cada patch.

Prioridades:
- Wuthering Waves
- Honkai: Star Rail

Não implemente código.

TAREFA

Pesquise:

- tipos de eventos recorrentes;
- eventos que reutilizam sistemas;
- eventos totalmente novos;
- duração;
- cadence;
- rewards;
- battle pass;
- daily/weekly mission integration;
- event currencies;
- lojas de evento;
- catch-up;
- FOMO;
- custo de produção aparente.

SAÍDA

Markdown com:

- taxonomia dos eventos;
- formatos baratos de produzir;
- formatos caros;
- ideias aplicáveis a Huntbound;
- estrutura recomendada de passe;
- como conectar passe, diárias, semanais e eventos;
- riscos;
- fontes.
```

---

## W09 — Economia e velocidade de progressão

```text
CONTEXTO DO PROJETO

Kaezan Huntbound quer trocar grind de horas por consistência de conta.

O jogador deve sentir que, depois de semanas ou meses jogando regularmente, sua conta ficou muito mais forte.

Teremos:
- personagens/classes;
- levels;
- equipamento;
- runas/sistemas equivalentes;
- bosses;
- itens BiS/relics;
- energia/resina;
- dailies;
- weeklies;
- endgame.

Helper reduzirá repetição.

Não implemente código.

TAREFA

Estude boas práticas de economia/progressão de RPGs live-service e gachas para responder:

1. Como fazer o jogador sentir progresso diário?
2. Quanto tempo deve levar para deixar um personagem funcional?
3. Quanto tempo para aproximar-se de BiS?
4. Como evitar que trocar de classe seja frustrante?
5. Como permitir catch-up para segunda/terceira classe?
6. Como distribuir materiais universais versus materiais específicos?
7. Como limitar farm sem deixar o jogo vazio?
8. Como evitar excesso de moedas?
9. Como lidar com drops aleatórios?
10. Como proteger o jogador contra azar extremo?

SAÍDA

Markdown com:

- princípios;
- modelos comparados;
- proposta de economia conceitual;
- currencies mínimas;
- sinks;
- sources;
- proteção contra RNG;
- catch-up;
- riscos;
- métricas que precisaremos testar;
- fontes.
```

---

## W10 — UX do helper e confiança do jogador

```text
CONTEXTO DO PROJETO

O helper é um pilar de Kaezan Huntbound.

Funções candidatas:
- target automático;
- loot automático;
- skills automáticas;
- cura;
- potions;
- kite;
- follow;
- avoid;
- navegação;
- presets.

Não queremos que o jogador precise microgerenciar dezenas de regras.

Também não queremos uma “caixa preta” que tome decisões inexplicáveis.

Não implemente código.

TAREFA

Pesquise referências de UX para:

- auto-battle;
- companion AI;
- programmable helpers;
- gambits;
- priority systems;
- bot-like automation em jogos;
- loadouts de AI;
- feedback de decisões;
- override manual.

Inclua jogos fora do gênero se forem boas referências.

SAÍDA

Markdown contendo:

- modelos de configuração;
- comparação;
- nível ideal de complexidade;
- proposta de UX para Huntbound;
- presets recomendados;
- regras avançadas opcionais;
- feedback visual;
- override manual;
- logging/debug;
- riscos de frustração;
- fontes.
```

---

## W11 — Boss design para combate tile-based com dash e helper

```text
CONTEXTO DO PROJETO

Kaezan Huntbound terá combate top-down/tile-based inspirado em Tibia, mas possui sistemas modernos como dash e postura.

O helper poderá cuidar de targeting e skills.

Portanto, bosses precisam desafiar mais do que apenas DPS e HP.

Não queremos copiar bosses específicos.

Não implemente código.

TAREFA

Pesquise padrões de boss design que funcionem bem em:

- top-down;
- grid/tile;
- ARPG;
- bullet patterns controlados;
- telegraphs;
- hazards;
- position checks;
- interrupts;
- phase changes;
- posture/stagger;
- movement skills.

SAÍDA

Markdown com:

- biblioteca de padrões;
- padrões adequados ao nosso jogo;
- padrões ruins para helper;
- como dash pode ser relevante;
- como postura pode ser relevante;
- como criar dificuldade legível;
- ideias de bosses low-cost;
- fontes.
```

---

# 25. PROMPTS — CODEX

Para os prompts Codex, use preferencialmente os diretórios reais já existentes em disco.

### Projeto Godot / referências externas

```text
C:\Kaezan\kaezan-godot
C:\Kaezan\kaezan-godot\references
```

Dentro de `references`, localizar os clones atuais de:

- Canary;
- OTClient;
- Remere's Map Editor / RME.

### Arena Fable

```text
C:\Kaezan\kaezan-arena-fable
```

Documentação:

```text
C:\Kaezan\kaezan-arena-fable\docs
C:\Kaezan\kaezan-arena-fable\docs_web
```

### Baselines históricos

Canary:

```text
C:\Kaezan\kaezan\mapping\baseline\canary
```

OTClient:

```text
C:\Kaezan\kaezan\mapping\baseline\client
```

As referências devem ser tratadas como somente leitura durante esta fase.

**Importante:** antes de mapear Canary, OTClient ou Arena Fable do zero, leia os documentos existentes e faça uma análise de delta contra os repositórios atuais.

---

## C01 — Mapear o Canary e atualizar o baseline existente

```text
CONTEXTO DO PROJETO

Estamos planejando Kaezan Huntbound, um RPG single-player em Godot 4.7.1 com gameplay top-down/tile-based inspirado em Tibia.

Não será um MMORPG.

Queremos usar o Canary APENAS como referência para entender regras, conteúdo e dados de Tibia.

O projeto final deve evitar carregar arquitetura de MMO desnecessária.

Sistemas que nos interessam:
- movement/grid;
- creatures;
- vocations;
- combat;
- spells;
- runes;
- items;
- equipment;
- loot;
- bosses;
- conditions;
- map/spawns;
- bestiary/boss systems quando existirem.
- imbuiments

LOCALIZAÇÕES

Os clones atuais de referência estão em:

C:\Kaezan\kaezan-godot\references

Localize dentro dessa pasta o repositório Canary atual.

Existe também um mapeamento histórico do Canary feito aproximadamente dois meses atrás:

C:\Kaezan\kaezan\mapping\baseline\canary

Esse baseline contém bastante informação e DEVE ser lido antes de uma varredura ampla do repositório.

Não presuma, porém, que ele está completamente atualizado.

Não implemente nada.
Não modifique o Canary.
Não copie código para o projeto Godot.

TAREFA

1. Leia primeiro todo o material relevante em:
   C:\Kaezan\kaezan\mapping\baseline\canary

2. Produza internamente um mapa do que já foi documentado.

3. Compare esse baseline com o Canary atual encontrado em:
   C:\Kaezan\kaezan-godot\references

4. Identifique:
   - informações ainda válidas;
   - mudanças no código;
   - módulos novos;
   - módulos removidos;
   - caminhos alterados;
   - lacunas do baseline;
   - conclusões antigas que precisam ser revistas.

5. Só depois aprofunde a leitura do código onde houver delta ou informação faltante.

Mapeie especialmente:

- estrutura dos sistemas;
- modelos de dados;
- fórmulas;
- criaturas;
- itens;
- spells;
- loot;
- bosses;
- vocations;
- mapas/spawns;
- bestiary/boss systems;
- scripts/data-driven content;
- dependências específicas de servidor/MMO.

SAÍDA

Crie um arquivo Markdown com:

1. resumo do baseline existente;
2. estado do Canary atual;
3. seção "DELTA DESDE O BASELINE";
4. mapa consolidado do repositório;
5. caminhos importantes;
6. fluxo dos sistemas relevantes;
7. conceitos que podemos reutilizar;
8. dados úteis como referência;
9. partes que NÃO devemos portar;
10. riscos;
11. recomendações para uma arquitetura Godot single-player.

Sempre cite caminhos/arquivos concretos do repositório atual e, quando relevante, documentos do baseline.

Não refaça trabalho que o baseline já resolveu corretamente.
```

---

## C02 — Mapear o OTClient e atualizar o baseline existente

```text
CONTEXTO DO PROJETO

Kaezan Huntbound será um RPG single-player em Godot inspirado no feeling de gameplay e UX de Tibia.

Queremos estudar o OTClient para entender o cliente, não para portá-lo.

Não teremos arquitetura MMO inicialmente.

Interesses:
- câmera;
- tile rendering;
- movimentação;
- input;
- click-to-move;
- targeting;
- battle list;
- containers;
- hotkeys;
- cooldown feedback;
- selection;
- interaction;
- UI;
- automation/helper quando houver algo relevante.

LOCALIZAÇÕES

Os clones atuais de referência estão em:

C:\Kaezan\kaezan-godot\references

Localize dentro dessa pasta o repositório OTClient atual.

Existe um mapeamento histórico do client feito aproximadamente dois meses atrás:

C:\Kaezan\kaezan\mapping\baseline\client

Esse baseline DEVE ser analisado antes da varredura extensiva do código atual.

Não presuma que o baseline está totalmente atualizado.

Não implemente nada.
Não modifique o OTClient.

TAREFA

1. Leia primeiro:
   C:\Kaezan\kaezan\mapping\baseline\client

2. Entenda o que já foi documentado sobre:
   - input;
   - movimento;
   - rendering;
   - câmera;
   - targeting;
   - battle list;
   - containers;
   - hotkeys;
   - UI;
   - automações.

3. Compare as conclusões com o OTClient atual em:
   C:\Kaezan\kaezan-godot\references

4. Identifique deltas, mudanças e lacunas.

5. Aprofunde a análise apenas onde o baseline for insuficiente, desatualizado ou contradito pelo código atual.

SAÍDA

Markdown com:

- resumo do baseline;
- seção "DELTA DESDE O BASELINE";
- mapa dos módulos relevantes atuais;
- fluxo de input;
- fluxo de movimento;
- targeting;
- feedback;
- câmera;
- UI de combate;
- inventário/containers;
- padrões relevantes;
- comportamentos que criam o feeling de Tibia;
- o que deve ser recriado de forma idiomática em Godot;
- o que deve ser descartado;
- caminhos de arquivos concretos.

Não refaça trabalho já resolvido pelo baseline sem motivo.
```

---

## C03 — Auditoria do Kaezan Arena Fable, documentação e UI/UX

```text
CONTEXTO DO PROJETO

Kaezan Huntbound é uma nova implementação em Godot 4.7.1.

O projeto anterior Kaezan Arena Fable é nossa principal referência criativa interna.

RAIZ DO ARENA FABLE

C:\Kaezan\kaezan-arena-fable

DOCUMENTAÇÃO EXISTENTE

C:\Kaezan\kaezan-arena-fable\docs
C:\Kaezan\kaezan-arena-fable\docs_web

O Arena Fable foi desenvolvido com uma prática de documentação contínua: implementações e decisões relevantes costumam possuir documentação.

Portanto, NÃO comece fazendo uma varredura cega do código.

Leia primeiro as duas árvores de documentação e utilize o código para confirmar, completar e atualizar o que já está descrito.

GAMEPLAY E SISTEMAS JÁ EXPLORADOS

- dash;
- postura;
- helper;
- targeting;
- uso automático de skills;
- loot;
- dungeons;
- bosses;
- assets exportados de Tibia;
- gameplay top-down.

UI/UX JÁ EXISTENTE

O Arena Fable possui uma camada de UI/UX relativamente avançada em Angular, incluindo:

- tela inicial / hub;
- telas de Kaelis/personagens;
- telas de hunts/dungeons;
- telas de gacha/recruit;
- telas/indicadores de resina;
- roster/progressão;
- navegação entre sistemas;
- cards;
- menus;
- fluxos de progressão;
- outras telas de conta e conteúdo.

Alguns desses sistemas podem não entrar no MVP do Huntbound, mas sua arquitetura de informação, navegação e apresentação são referências valiosas.

A nova implementação será em Godot.

NÃO queremos converter Angular/HTML/CSS literalmente.

Queremos extrair:
- fluxo;
- hierarquia;
- estados;
- componentes conceituais;
- arquitetura de informação;
- regras de produto;
- decisões de UX;

e reconstruir apenas o que sobreviver ao novo design usando recursos idiomáticos de Godot, como Control nodes, scenes, containers, themes e componentes reutilizáveis.

Não modifique o Arena Fable.
Não implemente o Huntbound nesta tarefa.

TAREFA

FASE 1 — DOCUMENTAÇÃO

Leia recursivamente:

C:\Kaezan\kaezan-arena-fable\docs
C:\Kaezan\kaezan-arena-fable\docs_web

Crie um inventário do que já está documentado.

Identifique documentação sobre:

- gameplay;
- dash;
- postura;
- helper;
- targeting;
- dungeons;
- bosses;
- progression;
- resina;
- hub;
- Kaelis/personagens;
- hunts;
- recruit/gacha;
- UI;
- navegação;
- asset pipeline;
- decisões arquiteturais;
- performance;
- problemas conhecidos;
- decisões abandonadas.

FASE 2 — VALIDAÇÃO NO CÓDIGO

Use:

C:\Kaezan\kaezan-arena-fable

para validar se as docs continuam correspondendo ao estado atual do projeto.

Identifique:
- docs corretas;
- docs desatualizadas;
- features implementadas sem docs;
- docs de features que foram removidas;
- divergências importantes.

FASE 3 — AUDITORIA PARA HUNTBOUND

Mapeie:

1. gameplay implementado;
2. dash;
3. postura;
4. helper;
5. targeting;
6. combat loop;
7. dungeons;
8. bosses;
9. data models;
10. asset pipeline;
11. renderer;
12. performance bottlenecks;
13. acoplamentos frontend/backend;
14. sistemas incompletos;
15. decisões que merecem sobreviver;
16. estrutura do hub;
17. mapa de telas e rotas;
18. telas de Kaelis/personagens;
19. telas de hunts/dungeons;
20. telas de gacha/recruit;
21. resina/energia e sua representação na UI;
22. roster/progressão;
23. componentes reutilizados;
24. hierarquia de navegação;
25. estados vazios/loading/error quando existirem;
26. padrões visuais que podem ser reinterpretados como componentes Godot;
27. padrões específicos de Angular/web que NÃO devem ser migrados literalmente.

SAÍDA

Crie quatro seções principais.

A. INVENTÁRIO DA DOCUMENTAÇÃO EXISTENTE

- documento;
- assunto;
- estado aparente;
- implementação relacionada.

B. DELTA DOCUMENTAÇÃO × CÓDIGO

- documentação atual;
- documentação desatualizada;
- código sem documentação;
- divergências.

C. AUDITORIA GERAL

Divida sistemas em:
- KEEP;
- REDESIGN;
- DROP;
- UNKNOWN / NEEDS TEST.

D. AUDITORIA ESPECÍFICA DE UI/UX

Produza:
- mapa de todas as telas relevantes;
- fluxo de navegação;
- responsabilidade de cada tela;
- componentes recorrentes;
- informações apresentadas;
- estados;
- padrões de interação;
- referências visuais internas quando for possível;
- proposta conceitual de reconstrução em Godot;
- telas que podem sobreviver quase integralmente como conceito;
- telas que devem ser redesenhadas;
- telas fora do escopo inicial.

Para cada conclusão:
- explique por quê;
- cite a documentação original quando houver;
- cite arquivos/caminhos concretos do código quando necessário;
- descreva como o conceito poderia existir em Godot;
- não escreva implementação.

Não desperdice tempo redescobrindo algo que as docs já explicam corretamente.
```

---

## C04 — Mapear RME / mapas de Tibia

```text
CONTEXTO DO PROJETO

Kaezan Huntbound terá dungeons instanciadas e mapas top-down/tile-based inspirados em Tibia.

Não teremos um mundo MMO gigante no início.

Estamos analisando o Remere's Map Editor / RME para entender estrutura de mapa, tiles, objects, spawns e workflows.

Pergunta central:

É melhor:
A) importar/converter mapas existentes;
B) criar um importador parcial;
C) criar mapas novos em Godot usando conceitos semelhantes;
D) desenvolver uma ferramenta própria apenas mais tarde?

Não implemente nada.
Não modifique RME.

TAREFA

Analise o repositório e/ou formato suportado pelo RME.

Mapeie:

- representação de mapa;
- tiles;
- floors;
- objects;
- metadata;
- spawns;
- zones;
- serialization;
- formats;
- asset references;
- limitações.

SAÍDA

Markdown com:

- arquitetura relevante;
- formatos;
- caminhos;
- dificuldade estimada de conversão;
- alternativas;
- recomendação objetiva para MVP;
- recomendação para longo prazo;
- riscos.
```

---

## C05 — Consolidar os mapeamentos históricos

```text
CONTEXTO DO PROJETO

Existem mapeamentos anteriores do Canary e do OTClient produzidos aproximadamente dois meses atrás.

Estamos criando Kaezan Huntbound, um RPG single-player em Godot.

Esses materiais podem conter muito trabalho já útil, mas os repositórios atuais podem ter evoluído.

LOCALIZAÇÕES

Baseline Canary:

C:\Kaezan\kaezan\mapping\baseline\canary

Baseline OTClient:

C:\Kaezan\kaezan\mapping\baseline\client

Repositórios atuais:

C:\Kaezan\kaezan-godot\references

Arena Fable e documentação:

C:\Kaezan\kaezan-arena-fable
C:\Kaezan\kaezan-arena-fable\docs
C:\Kaezan\kaezan-arena-fable\docs_web

Não implemente nada.

TAREFA

Leia integralmente os baselines antigos.

Compare-os com:

- objetivo atual do Huntbound;
- Canary atual;
- OTClient atual;
- descobertas do Arena Fable quando relevantes.

Não trate "antigo" como "inválido".

Seu objetivo é preservar trabalho correto e identificar somente o delta.

SAÍDA

Markdown com:

- descobertas ainda válidas;
- descobertas desatualizadas;
- caminhos alterados;
- sistemas novos desde o baseline;
- premissas incompatíveis com o Huntbound;
- informações que devem migrar para a documentação nova;
- lacunas que precisam de pesquisa;
- lista de documentos históricos que continuam sendo referência confiável.
```

---

## C06 — Comparação técnica: Godot vs continuar Angular/C#

```text
CONTEXTO DO PROJETO

Já existe um protótipo anterior em Angular + C#, mas o frontend de gameplay teve problemas de performance/complexidade e acabamos construindo muitas responsabilidades típicas de engine manualmente.

Agora existe um projeto Godot 4.7.1 criado.

Kaezan Huntbound será:
- 2D;
- top-down;
- tile/grid;
- single-player inicialmente;
- helper;
- muitos mobs;
- effects;
- dash;
- postura;
- dungeons;
- bosses.

Não implemente nada.

TAREFA

Com base no Arena Fable e no projeto Godot vazio, produza uma comparação técnica objetiva entre:

A) continuar evoluindo Angular/C#;
B) migrar gameplay para Godot.

Considere:
- rendering;
- input;
- physics;
- navigation;
- animation;
- particles;
- profiling;
- tooling;
- iteration speed;
- AI;
- data;
- build/export;
- web;
- desktop;
- code reuse.

SAÍDA

Markdown com:
- comparação;
- riscos;
- custos;
- o que pode ser reaproveitado;
- recomendação;
- condições que fariam a recomendação mudar.

Não use preferência pessoal como argumento.
```

---

# 26. PROMPT DE SÍNTESE

Rodar somente quando os relatórios principais existirem.

Pode ser executado no ChatGPT/Worker/Claude/Opus, desde que o agente consiga ler todos os documentos.

```text
CONTEXTO

Estamos planejando Kaezan Huntbound, um RPG single-player em Godot 4.7.1 inspirado no feeling de Tibia.

Já realizamos pesquisas separadas sobre:

- hunts/progressão de Tibia;
- vocações;
- runas;
- bossiary/bestiary;
- WAKFU modulation;
- WAKFU Rifts;
- gachas/live-service;
- energia/resina;
- dailies/weeklies;
- endgame;
- eventos;
- battle pass;
- economia;
- helper;
- boss design;
- Canary;
- OTClient;
- Arena Fable;
- RME;
- Godot vs Angular/C#.

Além dos relatórios novos, existem documentação e baselines históricos que também devem ser considerados:

- C:\Kaezan\kaezan-arena-fable\docs
- C:\Kaezan\kaezan-arena-fable\docs_web
- C:\Kaezan\kaezan\mapping\baseline\canary
- C:\Kaezan\kaezan\mapping\baseline\client

Os relatórios de código mais recentes devem indicar os deltas entre esses documentos e os repositórios atuais.

TAREFA

Leia TODOS os documentos disponíveis.

Priorize as versões consolidadas mais recentes quando houver conflito, mas preserve decisões históricas úteis.

Não faça pesquisa nova inicialmente.
Não implemente código.

Sua função é eliminar contradições e transformar os relatórios em UMA direção coerente de jogo.

Crie:

1. visão do jogo em uma página;
2. pilares;
3. non-goals;
4. core loop;
5. daily loop;
6. weekly loop;
7. long-term loop;
8. classes iniciais;
9. combat model;
10. helper philosophy;
11. dungeon model;
12. level/gear sync;
13. boss model;
14. rift/endgame;
15. progression/economy;
16. data/content pipeline;
17. mapa;
18. hub e arquitetura de informação;
19. mapa de telas;
20. princípios de UI/UX a preservar do Arena Fable;
21. estratégia de reconstrução da UI em Godot;
22. riscos;
23. decisões ainda abertas;
24. MVP recomendado.

Marque cada decisão como:

- DECIDIDO
- HIPÓTESE
- PRECISA DE PROTÓTIPO
- PRECISA DE MAIS PESQUISA

Não transforme toda ideia interessante em requisito.

O objetivo é REDUZIR escopo e criar uma fundação clara.
```

---

# 27. PROMPT DE PLANEJAMENTO DE IMPLEMENTAÇÃO

Usar depois da síntese aprovada.

```text
CONTEXTO

Kaezan Huntbound é um RPG single-player em Godot 4.7.1.

Existe um documento de direção de jogo já aprovado e relatórios de pesquisa.

O objetivo agora é planejar implementação, não escrever código ainda.

O MVP deve validar primeiro o combat feeling e o helper.

TAREFA

Leia:

- documento mestre de direção;
- relatórios técnicos Canary/OTClient/Arena Fable/RME;
- projeto Godot existente.

Crie um plano de implementação incremental.

O plano deve privilegiar vertical slices.

O primeiro slice deve ser o menor possível capaz de responder:

“É divertido jogar um Tibia-like em Godot com dash, postura e helper?”

Planeje:

- cenas;
- nodes;
- scripts;
- resources;
- data schemas;
- input;
- movement;
- combat;
- enemy;
- helper;
- loot;
- dungeon;
- boss;
- save;
- progression;
- hub;
- UI;
- navigation;
- Godot Control architecture;
- themes/components;
- testing;
- debug tooling.

Divida em milestones.

Para cada milestone:

- objetivo;
- systems;
- arquivos previstos;
- dependências;
- critérios de aceite;
- testes;
- riscos;
- o que NÃO fazer ainda.

Não implementar.

Ao final, proponha a melhor divisão de tarefas para múltiplos agentes sem permitir que dois agentes alterem os mesmos sistemas simultaneamente.
```

---

# 28. PROMPT PARA QUEBRAR O PLANO EM TAREFAS DE CODEX

```text
CONTEXTO

Temos:
- direção de jogo aprovada;
- arquitetura aprovada;
- milestones definidos.

Agora queremos transformar o próximo milestone em tarefas executáveis por agentes Codex.

TAREFA

Leia apenas o próximo milestone ainda não concluído.

Quebre-o em tarefas pequenas e verificáveis.

Cada tarefa deve incluir:

- contexto;
- objetivo;
- arquivos permitidos;
- arquivos proibidos;
- critérios de aceite;
- testes;
- comandos de verificação;
- dependências;
- rollback simples.

Organize tarefas que possam ser paralelas em grupos independentes.

Evite duas tarefas paralelas editando o mesmo arquivo.

Não implemente nada neste passo.
```

---

# 29. Ordem recomendada de execução

## Pesquisa externa

1. W01 — Hunts
2. W02 — Classes/spells
3. W03 — Bossiary/Bestiary
4. W04 — WAKFU Modulation
5. W05 — WAKFU Rifts
6. W06 — Daily/Weekly/Resina
7. W07 — Endgame/Roguelite
8. W08 — Eventos/Battle Pass
9. W09 — Economia
10. W10 — Helper UX
11. W11 — Boss design

Esses prompts podem ser parcialmente paralelizados.

## Pesquisa de código

1. C01 — Canary
2. C02 — OTClient
3. C03 — Arena Fable
4. C04 — RME
5. C05 — mapeamento antigo
6. C06 — Godot vs Angular/C#

Também podem rodar em paralelo se os agentes estiverem apenas lendo.

## Depois

1. Síntese
2. Revisão humana
3. Planejamento de implementação
4. Revisão humana
5. Quebra em tarefas
6. Primeiro vertical slice

---

# 30. Primeira hipótese de vertical slice

Ainda NÃO é plano final.

O primeiro protótipo deveria provavelmente conter apenas:

- uma pequena dungeon;
- grid;
- player;
- movimento;
- click-to-move ou input equivalente;
- uma vocação;
- um ataque básico;
- 2–3 skills;
- dash;
- postura;
- 1 inimigo melee;
- 1 inimigo ranged;
- targeting;
- helper;
- auto-loot;
- um mini-boss;
- drop;
- tela simples de recompensa;
- reset da dungeon.

Não incluir inicialmente:

- 5 classes completas;
- resina real;
- gacha;
- passe;
- eventos;
- rifts;
- torre;
- bossiary completo;
- gear sync completo;
- centenas de itens;
- mundo aberto.

A função do slice é validar **feel + helper + legibilidade**.

---

# 31. Critério para começar a implementar

Não começar implementação maior enquanto não conseguirmos responder claramente:

1. Qual é o core loop?
2. Qual é o papel do helper?
3. O que o jogador decide?
4. O que o helper decide?
5. Qual o tempo de sessão esperado?
6. Como energia impede grind infinito?
7. Como dungeon normal difere de sincronizada?
8. Por que um jogador quer melhorar o personagem?
9. Qual é o primeiro endgame?
10. Qual é o menor vertical slice?
11. O que aproveitamos do Arena Fable?
12. O que NÃO importamos de Canary/OTClient?
13. Como mapas serão criados no MVP?
14. Qual stack Godot será usada?
15. Quais fluxos/telas do Arena Fable merecem sobreviver?
16. Como a UI será reconstruída de forma idiomática em Godot?
17. Quais sistemas estão explicitamente fora de escopo?

Quando isso estiver claro, implementar.

---

# 32. Regra de ouro

> **Não estamos construindo Tibia inteiro. Estamos extraindo o que é divertido em Tibia e colocando isso dentro de uma estrutura moderna, curta, automatizável e orientada à construção de conta.**
