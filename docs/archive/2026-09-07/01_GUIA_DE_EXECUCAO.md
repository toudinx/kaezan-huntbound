# Histórico — substituído em 2026-09-07

Links relativos abaixo pertenciam à localização original em `docs/`.

# Kaezan Huntbound — Guia Rápido de Direção e Validação

> **Direção vigente:** leia primeiro `05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`. O V0 é pessoal,
> local-first, usa conteúdo e assets Canary/Tibia, escolhe hunts pelo TibiaRoute e limita o gacha a
> outfits cosméticos existentes.

Este arquivo é a versão curta do dossiê.

Use-o para reler periodicamente e verificar se o projeto continua na direção correta.

---

# 1. Pitch

**Kaezan Huntbound** é um RPG single-player browser-first em Phaser 4 + TypeScript, com gameplay top-down/tile-based inspirado em Tibia.

A proposta:

> **Tibia para quem gosta de Tibia, mas não tem tempo para grind infinito.**

Não é um MMORPG.

O foco é:

- dungeons;
- bosses;
- loot;
- classes;
- equipamentos;
- runas;
- helper;
- progressão de personagem;
- diárias;
- semanais;
- endgame.

---

# 2. O que queremos preservar de Tibia

- sensação de hunt;
- tile/grid;
- combate top-down;
- targeting;
- vocações;
- runas;
- loot;
- equipamentos;
- bosses;
- bestiary/bossiary;
- evolução lenta e perceptível do personagem.

---

# 3. O que NÃO precisamos preservar

- grind de muitas horas;
- mapa MMO gigantesco;
- servidor para centenas de jogadores;
- PvP;
- guildas;
- economia entre jogadores;
- dezenas de skills pouco usadas;
- arquitetura de MMO;
- sistemas de MMO que não forem exigidos pela hunt escolhida.

---

# 4. Arena Fable continua importante

O Arena Fable é nossa principal referência interna.

Queremos avaliar e provavelmente preservar conceitos como:

- dash;
- postura;
- helper;
- targeting;
- auto-skills;
- auto-loot;
- dungeons curtas;
- bosses.

Não queremos simplesmente portar Angular/C#. Reaproveitamos conceitos, regras e dados; a nova
apresentação usa Phaser no playfield e DOM/CSS no HUD, com a simulação isolada em TypeScript puro.

## Direção técnica vigente

- Phaser 4 + TypeScript + Vite;
- browser/PWA primeiro;
- HUD, menus e acessibilidade no DOM;
- regras em pacote TypeScript puro, fora das Phaser scenes;
- fixed tick, seed, command log e replay determinístico;
- save local versionado e transacional via `SaveRepository`/IndexedDB;
- importadores Canary e `AssetProvider` desacoplados da simulação;
- mobile via Capacitor e desktop via PWA/wrapper somente após validação do browser;
- backend e PostgreSQL somente se existir uma futura fase de produto público.

---

# 5. Helper é parte do design

O helper não é uma feature secundária.

Princípio:

> **O helper executa repetição. O jogador toma decisões.**

Helper pode cuidar de:

- target;
- loot;
- skills;
- cura;
- potion;
- kite;
- follow;
- avoid;
- combate.

O jogador continua escolhendo:

- conteúdo;
- personagem;
- build;
- equipamento;
- cartas;
- sigils;
- buffs;
- rota;
- risco;
- gasto de recursos.

Mesmo no endgame, não precisamos desligar o helper.

---

# 6. Resina/energia

Precisamos limitar o ganho de progressão.

Sem isso, um helper rodando 24h recriaria o grind.

A energia deve:

- limitar farm diário;
- permitir rotina curta;
- gerar progresso consistente;
- não exigir muitas horas por dia.

Meta inicial a validar:

**15–30 minutos por dia** para rotina normal.

---

# 7. Classes iniciais

Usar as cinco vocações existentes no snapshot Canary:

1. Knight
2. Paladin
3. Sorcerer
4. Druid
5. Monk

Cada playbook implementa apenas o subconjunto exigido pela hunt selecionada, preservando as regras
de origem. Dash pode ser testado depois como extensão desligável; postura nova não bloqueia o V0.

---

# 8. Hunts

Qualquer hunt catalogada em [TibiaRoute](https://tibiaroute.com/br/hunting-places) é elegível. O
catálogo escolhe a experiência; Canary fornece IDs, regras, loot e mapa. Não raspar TibiaRoute no
runtime.

Implementar uma hunt por vez e empacotar somente seus assets. A região do mapa Canary é convertida
offline para JSON browser; não redesenhar um bioma Kaezan para o V0.

Dois modos:

## Livre

Personagem entra com todo seu poder.

Bom para:

- diária rápida;
- farm antigo;
- drops específicos;
- coleção.

## Sincronizado

Personagem é limitado à faixa de level/gear da dungeon.

Bom para:

- desafio;
- recompensa melhor;
- manter conteúdo antigo relevante;
- valorizar sets antigos.

A diária não deve obrigar sempre o modo sincronizado.

A semanal pode incentivar algumas runs sincronizadas.

---

# 9. Conteúdo semanal/endgame

O jogador farma durante a semana porque quer ficar forte para conteúdos mais difíceis.

Possíveis pilares:

- boss semanal;
- Rift/Fenda;
- torre;
- boss rush;
- dungeon sincronizada difícil.

Não precisamos implementar todos.

---

# 10. Rift/Fenda

Referência: WAKFU + sistemas roguelite de gachas.

Pode ter:

- waves;
- bosses;
- buffs;
- cartas;
- sigils;
- moeda temporária;
- loja;
- rotas;
- dificuldade crescente.

O helper pode combater automaticamente.

A estratégia humana acontece nas decisões durante a run.

---

# 11. Gacha de outfits

O gacha é parte pequena e cosmética do V0:

- recompensa uma família de outfit Tibia;
- libera `lookType`, addons e cores configuráveis;
- não concede poder;
- duplicata vira `outfit_tokens`;
- 10 pulls garantem uma família nova enquanto o banner ainda tiver unlocks;
- tokens compram outfits diretamente;
- moeda é obtida jogando; não existe dinheiro real.

---

# 12. Referências técnicas

## Canary

Usar para estudar:

- regras;
- criaturas;
- loot;
- combat;
- spells;
- items;
- bosses;
- dados.

Não copiar arquitetura de MMO.

## OTClient

Usar para estudar:

- feeling;
- input;
- câmera;
- targeting;
- hotkeys;
- UI;
- containers;
- feedback.

## Arena Fable

Usar para estudar:

- nossas próprias decisões;
- dash;
- postura;
- helper;
- dungeon;
- renderer;
- gargalos.

## RME

Usar para decidir:

- importar mapa;
- converter mapa;
- ou autorar no Tiled e exportar JSON para Phaser — direção escolhida para o MVP.

---

# 13. Assets

O perfil `personal` usa os assets de Tibia existentes como apresentação integral do V0. Eles são
organizados em pacotes por hunt e acessados por manifesto, nunca por paths dentro da simulação.

O perfil `product` bloqueia `licenseClass: "cipsoft-personal"`. Um futuro produto refará a camada
visual atrás do mesmo `AssetProvider`.

---

# 14. Ordem de trabalho

## Fases 1–3 — Pesquisa, mapeamento e síntese — concluídas

Os relatórios W01–W11 e C03–C06 permanecem como evidência. A direção vigente está na síntese e no
ADR web-first.

## Fase 4 — Decisão e readiness — concluída

`05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md` fecha produto e arquitetura; o antigo playbook `04` está
superado. `06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md` define a ordem e os gates.

## Fase 5 — Playbooks de implementação

Escrever PB-00, PB-01 e PB-02; revisar cada plano antes de executar. Gameplay começa depois dos
contratos de workspace, conteúdo e assets.

---

# 15. Primeiro vertical slice

- uma hunt escolhida no TibiaRoute e congelada em `HuntDefinition`;
- região do mapa Canary convertida para runtime browser;
- uma vocação e o subconjunto de spells necessário;
- criaturas, combate, morte, loot e recompensa do snapshot;
- pacote visual pessoal lazy-loaded;
- save IndexedDB;
- coleção e gacha cosmético de outfits;
- determinismo, debug, screenshots e performance.

Objetivo:

> Validar se “Tibia/Canary no browser + coleção gacha de outfits” é divertido o bastante para
> justificar novas hunts e extensões Huntbound.

---

# 16. O que NÃO fazer agora

- monetização;
- mundo aberto;
- backend, conta e banco;
- 5 classes completas antes da primeira funcionar;
- catálogo inteiro carregado no boot;
- todas as hunts ou sistemas do Canary;
- eventos reais;
- passe real;
- várias torres;
- dezenas de bosses;
- lore completa;
- identidade visual definitiva;
- pipeline artístico complexo.

---

# 17. Perguntas de controle

Antes de cada grande implementação, responder:

1. Isso reforça o feeling de Tibia?
2. Isso reduz ou aumenta grind desnecessário?
3. O helper consegue lidar com a parte repetitiva?
4. Existe alguma decisão interessante para o jogador?
5. Isso ajuda a construção da conta/personagem?
6. Isso cria motivo para ficar mais forte?
7. Precisamos disso agora?
8. Estamos copiando uma estrutura de MMO sem necessidade?
9. Dá para testar a hipótese com uma versão menor?
10. Estamos criando conteúdo ou criando infraestrutura infinita?

Se várias respostas forem ruins, reavaliar.

---

# 18. Definição de sucesso da fase atual

A direção está pronta para playbooks quando:

- fontes de verdade e perfis de build estão explícitos;
- contratos de hunt, outfit, asset e save estão fechados;
- a ordem PB-00 → PB-10 está registrada;
- nenhum documento normativo exige conteúdo Kaezan novo no V0;
- cada plano futuro pode entregar um executável testável sem antecipar o próximo.

---

# 19. Frase para proteger o escopo

> **Uma hunt por vez, conteúdo Canary/Tibia fiel, pacote browser pequeno e gacha somente de outfit.**
