# Histórico — substituído em 2026-09-07

Links relativos abaixo pertenciam à localização original em `docs/`.

# Kaezan Huntbound — Contexto Mestre para Agentes

> **Atualização normativa — 2026-08-09:** a ADR-002
> (`05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`) substitui qualquer premissa abaixo que proponha
> conteúdo Kaezan novo, gacha de personagem/poder, backend obrigatório ou assets de Tibia apenas
> como placeholders. O V0 é pessoal, local-first, usa Canary/Tibia integralmente e possui gacha
> cosmético de outfits.

> **Como usar:** envie/anexe este arquivo antes de qualquer prompt de Worker, Codex, Claude Code, ChatGPT ou outro agente.
>
> O prompt específico da tarefa deve vir depois deste contexto.
>
> Este arquivo descreve a essência relativamente estável do projeto. Os prompts específicos dizem **o que o agente deve fazer naquela execução**.

---

# 1. Identidade do projeto

Nome de trabalho: **Kaezan Huntbound**.

Estamos criando um novo RPG **browser-first em Phaser 4 + TypeScript**.

Estado inicial conhecido:

- Phaser 4 como runtime 2D;
- TypeScript como linguagem de cliente e simulação;
- Vite como ferramenta de desenvolvimento e build web;
- navegador/PWA como primeiro canal de distribuição;
- mobile via Capacitor e desktop via PWA/wrapper somente após validação do browser;
- protótipo anterior em Godot vazio, sem custo de migração relevante;
- save local versionado em IndexedDB por trás de `SaveRepository`;
- backend autoritativo e PostgreSQL adiados até existir decisão de produto público.

Neste estágio, **Kaezan é principalmente o nome do projeto**.

Não assuma que lore, personagens, estética ou universo anteriores de Kaezan precisam ser utilizados.

---

# 2. Pitch

Huntbound é um **RPG single-player, 2D, top-down e tile/grid com feeling de Tibia**, mas não é um MMORPG.

A frase central é:

> **“Um Tibia para quem gosta de Tibia, mas não tem tempo para grind infinito.”**

Queremos preservar de Tibia:

- feeling de movimentação e combate;
- hunts;
- bosses;
- loot;
- equipamentos;
- runas;
- vocações;
- bestiary/bossiary;
- construção e evolução de personagem.

Queremos remover ou reduzir:

- grind de muitas horas;
- vantagem por jogar 24/7;
- mundo MMO gigantesco;
- infraestrutura de MMO;
- sistemas herdados sem valor para nosso jogo;
- dezenas de spells pouco relevantes;
- repetição sem decisão.

---

# 3. Estrutura geral

O jogo será inicialmente:

- single-player;
- focado em dungeons e bosses;
- orientado à construção de personagem/conta;
- estruturado em sessões curtas;
- preparado para diárias, semanais e endgame;
- altamente compatível com helper/automação.

Não priorizar agora:

- multiplayer;
- PvP;
- guildas;
- chat;
- economia entre jogadores;
- mundo aberto;
- monetização;
- gacha de personagem, arma ou poder;
- identidade visual definitiva;
- lore complexa.

---

# 4. Filosofia de progressão

A progressão deve acontecer mais por **gestão da conta e consistência** do que por número bruto de horas.

O jogador entra, escolhe o que precisa evoluir, gasta seus recursos, melhora a conta e encerra a sessão.

## Diário

Pode envolver:

- energia/resina;
- materiais;
- equipment farm;
- materiais de personagem;
- runas/sistemas equivalentes;
- pequenas metas.

Meta conceitual inicial:

- cerca de **15–30 minutos** para uma rotina diária normal, ainda sujeita a validação.

## Semanal

Pode envolver:

- bosses;
- dungeons sincronizadas;
- Rift/Fenda;
- torre;
- objetivos semanais;
- passe;
- desafios endgame.

## Longo prazo

O jogador deve querer:

- construir personagens muito fortes;
- completar builds;
- obter BiS/relics;
- evoluir várias classes;
- vencer endgame;
- dominar conteúdo sincronizado;
- construir uma conta progressivamente melhor.

---

# 5. Energia / resina

O helper poderá automatizar grande parte do combate repetitivo.

Por isso, não queremos que deixar o jogo aberto 24 horas seja a estratégia ótima.

Um sistema equivalente a energia/resina/stamina deve limitar **recompensas de progressão**, não necessariamente a capacidade de jogar.

Objetivos:

- reduzir grind;
- preservar sessões curtas;
- criar progresso diário consistente;
- impedir farm automático infinito.

Não assuma monetização de energia.

---

# 6. Helper

O helper é um **pilar de design**.

Princípio:

> **O helper executa repetição. O jogador toma decisões.**

Funções candidatas:

- auto-target;
- prioridade de alvo;
- auto-loot;
- auto-skills;
- cura;
- potion;
- kite;
- follow;
- avoid;
- navegação;
- presets/loadouts de comportamento.

Não desligar ou nerfar automaticamente o helper no endgame.

A estratégia humana pode vir de:

- build;
- equipamento;
- cartas;
- sigils;
- buffs;
- rotas;
- lojas;
- gasto de recursos temporários;
- escolha de dificuldade;
- risco/recompensa;
- preparação.

---

# 7. Classes iniciais

Usar as cinco vocações de Tibia/Canary como conteúdo de origem:

1. Knight;
2. Paladin;
3. Sorcerer;
4. Druid;
5. Monk.

O V0 implementa somente o subconjunto exigido pela primeira hunt, mas seus números, requisitos e
comportamentos vêm do snapshot Canary. Não redesenhar kits antes do primeiro playtest. Dash e helper
são extensões Huntbound opcionais e desligáveis; posturas novas não são requisito do slice.

---

# 8. Dungeons e hunts

As hunts elegíveis vêm de [TibiaRoute — Locais de caça](https://tibiaroute.com/br/hunting-places).
O site serve para descobrir e escolher; regras, IDs, loot e mapa são validados no snapshot local do
Canary. O runtime nunca consulta ou raspa TibiaRoute.

Cada slice importa uma hunt por vez. A região do mapa Canary é convertida offline para JSON de
runtime; Tiled é ferramenta opcional de inspeção/correção, não obrigação de redesenho.

Queremos estudar dois modos:

## Livre

O personagem entra com seu poder atual.

Uso:

- diária rápida;
- farm antigo;
- loot específico;
- collection;
- bestiary/bossiary.

## Sincronizado / Modulado

Level/stats/equipamentos são limitados à faixa da dungeon.

Uso:

- manter conteúdo antigo relevante;
- gerar desafio;
- valorizar sets antigos;
- recompensar mastery.

WAKFU é uma referência importante para isso.

---

# 9. Endgame

O jogador precisa de um motivo para ficar forte.

Modos candidatos:

- bosses semanais;
- Rift/Fenda;
- torre;
- boss rush;
- dungeon sincronizada de alta dificuldade;
- roguelite recorrente.

Não transformar todos em requisitos.

Escolher com base em custo/benefício e função no loop.

---

# 10. Rift / Fenda

Referências:

- WAKFU;
- conteúdos roguelite recorrentes de gachas como Honkai: Star Rail.

Possíveis elementos:

- waves;
- bosses;
- dificuldade crescente;
- cartas;
- sigils;
- buffs;
- moedas temporárias;
- lojas;
- rotas;
- escolhas entre confrontos.

O helper pode continuar realizando o combate.

O jogador continua responsável pela construção da run.

---

# 11. Gacha cosmético de outfits

O único gacha do V0 desbloqueia famílias de outfits já existentes em Tibia.

- prêmio não concede poder;
- família agrega os `lookType` correspondentes, addons e cores configuráveis;
- duplicata converte em `outfit_tokens`;
- a cada 10 pulls há uma família nova garantida enquanto restar alguma bloqueada no banner;
- tokens permitem compra direta;
- moeda vem de gameplay local e não existe dinheiro real.

Não criar Kaelis, personagens gacha, constelações, armas gacha ou kits exclusivos.

---

# 12. Arena Fable é a principal referência interna

Existe um projeto anterior chamado **Kaezan Arena Fable**, construído em C# + Angular.

Ele deve ser estudado profundamente.

## Gameplay e sistemas já explorados

- dash;
- postura;
- helper;
- targeting;
- auto-skills;
- auto-loot;
- dungeons curtas;
- bosses;
- assets exportados de Tibia;
- decisões de combate/progressão.

## Hub e UI/UX já existentes

O Arena Fable também possui uma camada de produto relativamente avançada:

- tela inicial / hub;
- telas de Kaelis/personagens;
- telas de hunts/dungeons;
- telas de gacha/recruit;
- telas/indicadores de resina;
- roster/progressão;
- navegação entre sistemas;
- cards;
- menus;
- fluxos de entrada em conteúdo;
- outros estados de conta e jogo.

Mesmo telas ligadas a features fora do MVP continuam úteis como referência de:

- arquitetura de informação;
- hierarquia;
- navegação;
- representação de recursos;
- feedback;
- fluxo de usuário.

**Não portar o Angular do Arena Fable literalmente.**

Extrair o conceito e reconstruir de forma idiomática usando:

- Phaser apenas para playfield, câmera, sprites, animação, áudio e FX;
- TypeScript puro para simulação e regras;
- DOM/CSS para HUD, menus, configurações e acessibilidade;
- componentes reutilizáveis e design tokens por CSS custom properties;
- navegação e overlays apropriados para browser;
- layouts responsivos para desktop e mobile desde a fundação.

---

# 13. Localização dos projetos e documentação

Os agentes devem usar estes caminhos reais quando tiverem acesso ao workspace local.

## Kaezan Arena Fable

Projeto:

```text
C:\Kaezan\kaezan-arena-fable
```

Documentação:

```text
C:\Kaezan\kaezan-arena-fable\docs
C:\Kaezan\kaezan-arena-fable\docs_web
```

O Arena Fable possui cultura de documentação contínua. Antes de analisar profundamente o código, ler as docs existentes e depois validar contra a implementação atual.

## Canary / OTClient / RME atuais

```text
C:\Kaezan\kaezan-huntbound\references
```

Localizar nessa pasta os respectivos clones.

## Baselines históricos

Canary:

```text
C:\Kaezan\kaezan\mapping\baseline\canary
```

OTClient:

```text
C:\Kaezan\kaezan\mapping\baseline\client
```

Esses baselines foram produzidos aproximadamente dois meses antes deste planejamento e contêm bastante trabalho já realizado.

Não refazer esse trabalho sem necessidade.

Fluxo recomendado:

1. ler baseline/docs;
2. entender o que já foi mapeado;
3. comparar com repositório atual;
4. identificar delta;
5. completar apenas lacunas;
6. consolidar informação orientada ao Huntbound.

---

# 14. Repositórios de referência

## Canary

Usar para estudar:

- regras;
- creatures;
- combat;
- items;
- loot;
- vocations;
- spells;
- bosses;
- map/spawns;
- dados.

Não importar arquitetura de MMO sem necessidade.

## OTClient

Usar para estudar:

- feeling;
- input;
- movimento;
- câmera;
- targeting;
- hotkeys;
- battle list;
- containers;
- UI;
- feedback.

## Arena Fable

Usar para estudar:

- gameplay;
- sistemas próprios;
- hub;
- UI/UX;
- fluxos;
- assets;
- decisões já testadas.

## RME / Remere's Map Editor

Usar para estudar:

- mapas;
- tiles;
- floors;
- objects;
- spawns;
- formatos;
- workflow.

Para o MVP, a direção é:

- autorar dungeons pequenas em Tiled;
- exportar JSON para o pipeline Phaser;
- não usar OTBM como formato de runtime;
- considerar conversão/importação somente se autoria manual virar gargalo medido.

## Mapeamento antigo

Pode existir documentação antiga.

Tratar como material histórico e validar contra a direção atual.

---

# 15. Assets

O perfil `personal` usa integralmente o acervo local de Tibia: tiles, objetos, outfits, criaturas,
efeitos, projéteis e itens. Esses assets são a apresentação oficial do V0 pessoal, não placeholders
que precisam ser substituídos antes do playtest.

O catálogo completo não entra no boot. Cada hunt gera um pacote lazy-loaded com manifesto estável.
Todo grupo registra origem, snapshot e `licenseClass: "cipsoft-personal"`.

O perfil `product` deve falhar no build enquanto resolver qualquer asset restrito. Se o projeto virar
produto, a camada visual será refeita atrás de `AssetProvider`, sem reescrever a simulação.

---

# 16. Phaser web-first e legado Angular/C#

A implementação anterior usava:

- C# backend;
- Angular frontend;
- Canvas 2D.

O frontend acabou assumindo responsabilidades típicas de engine. A medição posterior mostrou que
o problema comprovado era **complexidade e propriedade de código**, não FPS. A nova implementação
usa Phaser para as responsabilidades de runtime 2D e mantém regras fora das scenes.

Não assumir:

- que tudo precisa ser reescrito;
- nem que tudo deve ser mantido.

Reaproveitar principalmente:

- conceitos;
- dados;
- lógica;
- documentação;
- hub/UI/UX;
- assets;
- aprendizados.

Não reutilizar como arquitetura:

- regras dentro de components ou Phaser scenes;
- SignalR e snapshots contínuos para um jogo single-player;
- backend, conta ou banco antes de o V0 pessoal provar diversão;
- MySQL/EF como herança automática sem uma necessidade atual.

Fronteiras obrigatórias:

- `simulation`: TypeScript puro, determinístico e sem Phaser/DOM;
- `phaser`: apresentação descartável que apenas projeta o estado;
- `ui`: HUD e menus em DOM;
- `content`: adapters/importers Canary produzem dados TypeScript validados;
- `assets`: `AssetProvider` resolve manifestos por hunt e perfil de build;
- `save`: `SaveRepository` usa IndexedDB transacional e versionado no V0.

Servidor e PostgreSQL voltam apenas em uma fase de produto, usando os contratos de autoridade e
idempotência já pesquisados.

---

# 17. Primeiro vertical slice

O slice importa **uma hunt real** escolhida no TibiaRoute e validada no snapshot local.

Incluir:

- região do mapa e pacote visual da hunt;
- uma vocação, preferencialmente Knight quando compatível;
- movimento, targeting, combate, spells necessárias, morte e loot do subconjunto Canary;
- save local versionado;
- catálogo pequeno de outfits, um banner, pull, garantia, duplicata e tokens;
- troca de outfit e restauração após reload;
- determinismo, replay, debug e budgets de browser.

Helper mínimo e dash entram depois do baseline fiel funcionar e permanecem módulos desligáveis.
Echoing Den, Metrônomo, inimigos Kaezan e arte nova estão fora.

Pergunta central:

> **“Tibia/Canary no browser com coleção gacha de outfits é divertido o bastante para justificar
> evoluir este projeto pessoal?”**

---

# 18. Filosofia de escopo

Não transforme toda ideia boa em requisito.

Pergunte:

1. isso melhora o core loop?
2. isso reduz grind ou só adiciona obrigação?
3. isso cria decisão interessante?
4. isso ajuda a construção da conta/personagem?
5. precisamos disso no milestone atual?
6. dá para validar com uma versão menor?
7. estamos copiando uma limitação de MMO sem necessidade?
8. já existe uma solução conceitual útil no Arena Fable?

---

# 19. Regras padrão para agentes

A menos que o prompt específico diga o contrário:

- não implemente código;
- não modifique repositórios de referência;
- antes de varreduras amplas, leia documentação e baselines existentes;
- use o código atual para validar e identificar deltas;
- não refaça trabalho histórico correto sem necessidade;
- cite arquivos/caminhos ao analisar código;
- diferencie fato observado de hipótese;
- para o V0, preserve fielmente o subconjunto Canary/Tibia selecionado antes de redesenhá-lo;
- não assuma que Arena Fable deve ser portado literalmente;
- preserve a meta de sessões curtas;
- preserve o helper como pilar;
- considere custo de produção de conteúdo;
- prefira soluções data-driven;
- prefira vertical slices;
- evite arquitetura prematura;
- destaque riscos;
- destaque decisões abertas;
- trate UI/UX existente do Arena Fable como referência, não como obrigação.

---

# 20. Regra de ouro

> **Não importamos Tibia inteiro de uma vez. Fechamos uma hunt Canary/Tibia por playbook, jogável no
> browser, e adicionamos somente o gacha cosmético de outfits necessário para testar a proposta.**
