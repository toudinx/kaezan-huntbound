# PB-04 — Correção da experiência da primeira hunt

**Data:** 2026-08-15  
**Status:** design aprovado para documentação  
**Escopo:** correção do PB-04 antes da auditoria PB-04-10  
**Bloqueia:** PB-05 e playbooks posteriores

## Contexto

PB-04 entregou uma região real da Venore Rotworm Cave, dois andares, transições, spawns,
movimento, câmera e renderização no browser. Os gates técnicos e o QA automatizado provaram
determinismo, execução nos quatro viewports e ausência de erros de runtime, mas o teste humano
revelou que a hunt ainda não representa uma experiência de produto aceitável:

- o enquadramento mostra tiles demais e deixa o jogador pequeno;
- a câmera expõe grandes áreas externas ao espaço útil;
- células sem ground aparecem como quadrados pretos;
- jogador e criaturas parecem mover-se de forma frenética ou trêmula;
- a região extraída contém núcleos de caça visualmente separados, herdados de um mapa de mundo
  aberto, sem que Huntbound possua o mundo que lhes daria contexto;
- os gates atuais interpretam “jogável” como funcionamento técnico, sem exigir legibilidade,
  coerência espacial ou sensação de produto.

O mapa original do Tibia é matéria-prima visual: seus tiles, bordas, salas e detalhes podem ser
reaproveitados porque já formam composições bonitas. Sua geometria não é normativa. Huntbound pode
recortar, mover, conectar, fechar e reorganizar essas partes para construir níveis próprios.

## Objetivos

1. Transformar a hunt atual em uma instância finita, coerente e navegável, sem pressupor mundo
   aberto.
2. Fazer cada andar possuir uma única área caminhável conectada.
3. Usar pequenas dungeons contínuas como topologia padrão e arenas como variação intencional.
4. Aproximar câmera, escala, composição de andares e movimento visual da leitura do Tibia.
5. Preservar o tick determinístico de 50 ms e os contratos do kernel até que exista evidência de
   defeito lógico, em vez de atribuir à simulação um problema de apresentação.
6. Adicionar gates de produto que impeçam PB-04-10 de aprovar novamente uma experiência apenas
   tecnicamente funcional.

## Fora de escopo

- combate, dano, morte, loot, spells ou vocação;
- segunda hunt, mundo aberto, streaming de regiões ou viagem entre hunts;
- geração procedural de mapas em runtime;
- editor visual completo;
- copiar fielmente a geometria original do Tibia;
- alterar o tick global ou a semântica determinística sem uma falha reproduzível no kernel;
- sistemas pertencentes a PB-05 ou posteriores.

## Direção escolhida: remix curado

Foram considerados três caminhos:

1. **Recorte conectado do mapa original:** rápido, mas mantém o level design condicionado pela
   geometria de um mundo aberto.
2. **Mapa inteiramente novo:** oferece controle total, mas descarta composições visuais prontas e
   aumenta o trabalho de authoring.
3. **Remix curado:** reutiliza salas, bordas, objetos e detalhes do mapa original, permitindo
   reorganizar livremente a topologia.

O remix curado é a direção aprovada. A origem Tibia fornece linguagem visual e proveniência de
assets; o layout final pertence a Huntbound.

## Contrato espacial da hunt

### Instância finita

Uma hunt é uma instância autocontida. Ela possui entrada, progressão interna e transições entre
andares, mas não depende de caminhos que continuariam por um mapa externo. O limite da instância
deve parecer uma borda deliberada da dungeon, não um recorte interrompido do mundo.

### Um componente caminhável por andar

Todos os tiles caminháveis de um andar devem pertencer ao mesmo componente conectado, considerando
as oito direções permitidas pelo movimento e as regras vigentes de corte de canto. A validação deve
partir da entrada do andar e alcançar:

- todos os tiles caminháveis;
- todos os slots de spawn;
- todas as origens de transição;
- todos os destinos de transição naquele andar.

Qualquer ilha inacessível, spot isolado ou transição órfã reprova o conteúdo. Células decorativas
não caminháveis podem formar paredes, abismos e molduras sem participar da conectividade.

### Dungeon como padrão

O andar padrão é uma pequena dungeon contínua:

- uma câmara principal que estabelece a identidade do andar;
- uma ou mais câmaras menores conectadas por corredores;
- ao menos um loop ou escolha curta de rota quando a geometria permitir;
- recantos e becos sem saída somente quando tiverem propósito visual, de spawn ou de progressão;
- nenhuma grande área vazia adicionada apenas para preencher a bounding box.

As subdivisões não são “spots” independentes. São partes de uma única rota explorável.

### Arena como variação

Uma arena é válida quando for uma escolha explícita de ritmo: uma câmara aberta, concentrada e
facilmente legível. Ela continua obedecendo ao componente único e pode constituir um andar inteiro
ou uma câmara de destaque dentro de uma dungeon. PB-04 usa apenas navegação e spawn; usos futuros
como boss ou sobrevivência não são implementados agora.

## Redesenho da primeira hunt

A região atual de `29 × 33` e os andares `8` e `9` podem continuar como orçamento máximo local, mas
deixam de ser um recorte literal obrigatório.

- **Andar 8 — dungeon de entrada:** entrada legível, câmara principal, duas ou três câmaras menores,
  corredores conectando todas as áreas e uma rota clara até a descida. A geometria deve permitir
  aprender movimento, colisão e leitura das bordas sem mostrar quatro spots independentes.
- **Andar 9 — covil mais aberto:** dungeon curta culminando em uma câmara ampla com caráter de
  arena. Os rotworms e a transição de retorno ficam no mesmo componente conectado.

Salas e trechos visualmente fortes do recorte atual podem ser preservados, reposicionados e unidos.
Trechos redundantes ou isolados podem ser removidos. Spawns e transições são reposicionados depois
da topologia, nunca usados como justificativa para conservar uma ilha ruim.

## Pipeline offline de authoring

O OTBM continua sendo fonte de matéria-prima e proveniência, nunca formato de runtime. Entre a
extração e o `MapRegion` final entra uma receita curada e versionada:

```text
snapshot OTBM
    -> extração de salas/tiles de origem
    -> receita de remix Huntbound
    -> compilação e validação determinísticas
    -> MapRegion + SpawnTable + TransitionTable
    -> pack de assets e runtime
```

A receita pode copiar trechos do recorte, mascarar áreas, preencher conexões e declarar posições
finais de entrada, spawn e transição. Suas operações são aplicadas em ordem explícita e produzem
bytes idênticos para a mesma entrada. Não se cria um editor visual completo neste escopo.

O formato runtime existente deve ser preservado se comportar o resultado. A receita é artefato de
authoring e não entra em `packages/simulation`. Alterar mapa, posições e blueprints da fixture exige
regenerar o golden de PB-04; o golden de PB-03 deve permanecer byte-idêntico.

## Câmera e enquadramento

A câmera deixa de enquadrar a bounding box inteira e passa a priorizar a leitura local ao redor do
jogador.

- `targetVisibleRows = 11`, aceitando de 10 a 12 tiles verticais inteiros no playfield depois das
  safe areas; o zoom é recalculado no resize e respeita os limites definidos para pixel art;
- jogador centralizado durante a navegação normal;
- clamp ou preenchimento de borda não pode produzir grandes faixas pretas nem afastar o jogador;
- o espaço fora da área caminhável usa composição de caverna ou backdrop coerente;
- HUD e controles DOM reservam safe areas sem reduzir silenciosamente a escala do mundo;
- os quatro viewports obrigatórios devem preservar legibilidade do jogador, criaturas e tile grid.

Uma deadzone grande não faz parte da correção. Caso seja mantida, deve ser pequena o suficiente para
não alterar perceptivelmente o enquadramento centrado.

## Composição de andares e células vazias

O valor de palette reservado para ausência de ground não pode ser desenhado como preto puro. Para
cada célula visível, o compositor procura uma superfície válida no andar ativo ou, quando a
geometria representa uma abertura, no andar inferior disponível. Se não existir superfície em
nenhum andar renderizável, usa o backdrop de caverna.

A ordem continua separando ground, objetos abaixo, atores e objetos acima. A composição de ground
entre andares acontece antes dessas camadas e não altera colisão nem estado da simulação.

## Movimento, tick e animação

`TICK_DURATION_MS = 50` permanece. O tick define quando decisões lógicas ocorrem; não define que
todo passo deva ser visualmente comprimido em um único intervalo de 50 ms.

### Input de movimento

O primeiro passo de uma intenção de movimento é edge-triggered: cada `keydown` físico ou
`pointerdown` do d-pad arma no `InputMap` uma única ação pendente. `drain()` consome essa borda
uma vez, mesmo que o controle seja liberado antes da abertura do próximo tick. Eventos de
`keydown` repetidos pelo sistema operacional não criam novas bordas; mudanças reais de direção
continuam podendo armar uma nova intenção.

A repetição de hold é level-triggered somente depois da borda inicial e usa o limiar congelado
`HOLD_REPEAT_DELAY_TICKS = 1`. Portanto, após a primeira entrega, a próxima abertura do
`inputGate` pode produzir uma intenção adicional; as aberturas seguintes ficam limitadas a no
máximo uma intenção enquanto a direção estiver segurada. Soltar o controle antes dessa abertura
não produz passo extra. `blur`, `pointercancel` e `detach` limpam tanto as direções seguradas
quanto as bordas ainda não consumidas.

Teclado e d-pad percorrem a mesma máquina de estado de input. Essa camada não altera o tick, o
`TickInputGate`, o cooldown de movimento nem o kernel; ela apenas transforma a borda física em
uma intenção determinística antes do consumo em `HuntScene.update`.

Cada movimento aceito cria um segmento visual por ator:

- origem e destino do evento `actor/moved`;
- tick inicial;
- duração derivada do custo real do passo em ticks;
- progresso visual monotônico entre 0 e 1;
- facing e frames de caminhada derivados da direção e da distância percorrida.

O ator percorre o tile durante toda a duração do passo. Movimento bloqueado não cria segmento. Um
novo evento aceito encerra ou encadeia o segmento anterior sem teleporte, oscilação ou reinício de
frame. Jogador e criaturas mantêm estado visual independente; o `alpha` global do host pode
participar do cálculo, mas não pode ser a única memória da interpolação.

O input sustentado emite no máximo uma intenção por oportunidade lógica, não uma rajada por frame de
render. Os valores de `stepCooldownTicks` do cenário podem ser ajustados após a interpolação estar
correta. PB-03 só será reaberto se um teste demonstrar que o kernel agenda ou aceita movimentos em
ticks incorretos.

## Validação automática

PB-04 ganha verificações que falham quando:

- um andar contém mais de um componente caminhável;
- entrada, spawn ou transição não é alcançável;
- uma transição aponta para fora do componente válido;
- uma célula visível resulta em preto puro por ausência de composição;
- o playfield mostra menos de 10 ou mais de 12 tiles verticais inteiros em qualquer viewport;
- movimento aceito não usa a duração lógica do passo;
- movimento bloqueado interpola;
- input sustentado produz mais de uma intenção por oportunidade lógica;
- a mudança altera o journal golden de PB-03;
- Node e browser divergem no replay corrigido da hunt.

Screenshots continuam úteis para regressão, mas não substituem o gate humano.

## Gate humano de produto

Antes de PB-04-10, o usuário joga a hunt no profile pessoal e confirma:

1. o enquadramento lembra a leitura local do Tibia;
2. jogador e rotworms são fáceis de acompanhar;
3. não existem quadrados pretos nem grandes vazios de recorte;
4. cada andar parece uma dungeon ou arena deliberada, não quatro spots soltos;
5. todas as áreas visíveis fazem parte de uma rota compreensível;
6. caminhar e trocar de andar parecem contínuos e estáveis.

Falhar nesse gate reabre a correção; não se classifica o problema como warning não bloqueante. PB-05
só se torna elegível após o aceite humano e a auditoria integrada PB-04-10.

## Impacto nos playbooks

- PB-04 permanece em andamento e recebe tarefas corretivas antes de PB-04-10.
- PB-04-09 é repetido sobre o resultado corrigido, incluindo screenshots e QA real de produto.
- PB-03 permanece fechado enquanto seus contratos determinísticos estiverem corretos.
- PB-05 e todos os playbooks posteriores permanecem bloqueados.
- PB-10 continua responsável pelo playtest e performance abrangentes, mas não substitui o aceite de
  produto de cada vertical slice anterior.

## Critérios de aceite do design implementado

- [ ] Cada andar possui exatamente um componente caminhável e todos os pontos funcionais são
      alcançáveis.
- [ ] O mapa final é um remix Huntbound e não depende de fidelidade geométrica ao Tibia.
- [ ] Dungeon contínua é a estrutura predominante; qualquer arena é deliberada e conectada.
- [ ] A câmera tem alvo de 11 e mostra de 10 a 12 tiles verticais inteiros, mantendo o jogador como
      foco.
- [ ] Nenhuma célula visível vira preto puro por falta de ground.
- [ ] Passos são interpolados durante sua duração lógica e não parecem frenéticos.
- [ ] O tick de 50 ms e o golden de PB-03 permanecem intactos, salvo evidência nova e reproduzível.
- [ ] Replays Node/browser e retomada da hunt continuam determinísticos após regenerar a fixture.
- [ ] O usuário aprova manualmente aparência, navegação e estabilidade antes de PB-04-10.
- [ ] Nenhum sistema de PB-05 ou posterior foi implementado.
