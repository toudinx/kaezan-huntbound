# Roteiro compacto do V0

**Vigente desde 2026-09-07.** Substitui a fila anterior; A fila recomeça no PB-13 por pedido do usuário; referências históricas aos antigos PB-13–16
eram previsões, não estes playbooks. O planejamento provisório PB-19–21 foi substituído.
Produto e fontes continuam na ADR-05; arquitetura na ADR-03; gates em `AGENTS.md`.
Diagnóstico e evidências: [validação do projeto](VALIDACAO_PROJETO.md).

## Resultado que queremos terminar

Um RPG solo no browser em que se escolhe uma hunt, prepara uma build, joga ou acompanha o helper,
encerra a run, guarda recompensa e escolhe um próximo objetivo. Knight, um mage e Paladin precisam
produzir combates reconhecíveis. Uma dungeon modulada mantém conteúdo antigo interessante.

Confirmado pelo usuário em 2026-09-07: V0 pessoal/solo e mage inicial = Sorcerer.
Limites de planejamento: cinco hunts existentes e uma dungeon com conteúdo Canary. Isso não
aprova novas fórmulas, schemas ou migrações. Druid fica depois do V0.

## Início, meio e fim

| Ordem | Playbook | Entrega e limite | Aceite do usuário |
|---|---|---|---|
| 1 | [PB-13 — Uma run que vale repetir](playbooks/PB-13/README.md) | Loop com Knight, loot/set/coleção, venda a NPC, gold com uso, level, bestiary/conquistas e helper mínimo. Uma hunt de referência. | Concluir, equipar uma melhoria, recarregar e querer outra run; entender o que o helper faz. |
| 2 | [PB-14 — Três vocações, encontros distintos](playbooks/PB-14/README.md) | Sorcerer, Paladin e três papéis comportamentais de monstros; ampliar só o conteúdo que demonstra esses papéis. | As três classes funcionam no mesmo encontro; assistir revela diferenças de posição, ataque e risco. |
| 3 | [PB-15 — Dungeon, modulação e fechamento](playbooks/PB-15/README.md) | Uma dungeon curta, modo modulado, coleção/gacha cosmético mínimo e fechamento das cinco hunts. | Preparar, completar, receber recompensa, voltar à dungeon antiga com desafio e encerrar a sessão com progresso salvo. |

Execução serial. Nenhuma task declara paralelismo. Uma task por chat; não abrir branch por rotina.
As 22 cards estão escritas: 9 no PB-13, 6 no PB-14 e 7 no PB-15. Cada task depende da anterior;
a task 01 de cada playbook resolve o design necessário às implementações. As cards descrevem
objetivos e paths, sem impor assinaturas ou camadas futuras.

## Motivos para repetir — direção confirmada pelo usuário

A hunt é o lugar onde se mata mobs e se obtém loot e XP. Encerrar a run organiza a saída e a
persistência; não substitui esses ganhos por um baú obrigatório nem faz a hunt depender de boss.
O tratamento de morte/abandono e o momento de consolidar cada ganho ainda precisam ser definidos.

| Motivação | Resultado pretendido | Decisão ainda aberta |
|---|---|---|
| Melhorar o set | Drops equipáveis oferecem upgrades e escolhas de build. | **Decidido em 2026-09-07:** o set da faixa é o eixo de progressão, e completá-lo é o que sustenta a faixa seguinte. Faltam slots e stats. |
| Colecionar rares | Encontrar itens raros tem valor de coleção além de equipar ou vender. | Registrar descoberta ou exigir posse; proteção contra venda acidental. |
| Fazer gold | Vender itens a NPC transforma loot sem uso imediato em dinheiro. | Preços, carteira e regras de compra/venda sem duplicação. |
| Gastar gold | Preparar a próxima hunt com uma compra útil. | **Decidido em 2026-09-07:** buff de próxima hunt. Falta o preço e a duração. |
| Upar | Matar mobs concede XP e avanço de level. | **Decidido:** nasce no nível 1 com o kit inteiro, um personagem persistente, toda hunt aberta, curva **comprimida** que concede ataque e não só vida. Level é ritmo, não o desafio; a curva do Tibia (82 h para as cinco hunts) não é adotada. |
| Completar bestiary e conquistas | Caçar espécies e cumprir objetivos deixa progresso persistente visível. | Faltam metas e recompensas. **Decidido:** morrer perde a bag e o crédito da run, nunca XP nem level. Poder adicional segue fora. |
| Farmar builds para conteúdo modulado | Voltar a uma hunt continua oferecendo itens relevantes à build/coleção. | Como gear é modulado e se haverá variação ou reroll em itens. |

**Consumíveis — decidido em 2026-09-07:** o gasto de gold do V0 é **buff de próxima hunt**,
comprado entre runs e válido pela run seguinte, sem inventário e sem uso manual na luta (PB-13-06).
Poção e runa continuam **não aprovadas**: competiriam com a máquina de cargas por hunt que a ADR-05
já congelou como gratuita, e cobrar por algo que já existe grátis era exatamente o risco a evitar.
O buff é extensão Huntbound nova e entra na ADR-05 antes de ser implementado.

**Itens com RNG/reroll:** hipótese de design levantada pelo usuário, não contrato aprovado. Não
adotar tiers do Tibia como resposta automática. Primeiro provar drop, equipamento e venda; depois
comparar item fixo com variação pequena e legível e reroll opcional de um atributo. Avaliar limites,
custo, preservação do item, interação com sync e se o reroll elimina o motivo de voltar à hunt.
Um item sem roll perfeito deve continuar útil. Affixes novos ou regra Huntbound exigem registrar a
extensão na ADR-05 antes da implementação. Não entram silenciosamente na task de importar itens.

A gameplay, o ritmo e a diversão serão avaliados pelo usuário no jogo. O agente implementa essa
direção e verifica integridade/determinismo; não precisa provar retenção nem inventar uma campanha
para justificar o farm. Os marcos têm fim; o jogo pode continuar oferecendo hunts após o V0.

## Limites de produto e critérios de decisão

- **Progressão:** level/XP, equipamento, coleção, bestiary e conquistas entram no loop. Não
  acrescentar árvore de talentos, skill grind ou Códex com poder por consequência. Morte e forma
  do personagem foram congeladas em 2026-09-07 no README do PB-13; a curva concreta é da PB-13-03,
  e “V0 compacto” não determina um level cap arbitrário.
- **Itens:** arma, armadura e mão secundária compatível com a vocação como escopo inicial proposto.
  Drops devem oferecer uma escolha compreensível; não importar centenas de itens. RNG/reroll
  permanece hipótese separada, conforme a seção de motivações.
- **Helper:** cura, alvo, ações e loot desligáveis, com intervenção manual e motivo de ação legível.
  Navegação autônoma entre hunts, farm offline e editor de scripts ficam fora. A rotina do jogador
  continua sendo preparar a build, escolher o risco e intervir; não apenas esperar um contador subir.
- **IA de mobs:** primeiro perseguidor melee, atacante ranged e conjurador de área/suporte.
  Escolher espécies pelo comportamento Canary disponível; uma nova skin com HP maior não basta.
- **Leitura:** perigo, resposta e resultado precisam aparecer no combate. FX devem explicar o que
  ocorreu, sem encobrir tiles, alvo ou ameaças. Não equiparar mais partículas a diversão.
- **Dungeon:** encontros curados com começo, boss e fim; alvo inicial de sessão de 10–20 minutos,
  hipótese de playtest, não métrica já validada. Sem gerador procedural ou campanha narrativa.
- **Modulação:** virou **estruturante** em 2026-09-07, não mais opcional: se o eixo de progressão é o set da faixa e o level é barato, voltar a uma faixa superada para completar coleção precisa de tensão, e é a modulação que a devolve (B26 no `STATE.md` do PB-13).
  Separar nível efetivo, dificuldade e recompensa. Primeiro modo livre e modulado;
  dial adicional somente se o playtest mostrar necessidade. Nenhuma redução permanente do save.
  A emenda 09 é proposta técnica; seu texto antigo não foi aceito integralmente por este plano.
- **Gacha:** somente outfits, seguindo o contrato já aceito da ADR-05; sem dinheiro real ou poder.

## Destino do backlog antigo

Os arquivos históricos permanecem para proveniência. Seus cabeçalhos retiram as pendências da fila;
nenhum `pending` antigo é autorização para executar. O estado integrado não foi apagado nem
convertido artificialmente em aceite de gameplay.

| Origem | Destino |
|---|---|
| PB-00 a PB-05 | Base integrada preservada; sem reexecução de auditorias. |
| PB-06, pendências de save/QA | PB-13-02 verifica o fluxo afetado; bugs históricos só viram correção se ainda presentes. Browser QA permanece do usuário. |
| PB-07, tasks congeladas | PB-14 absorve vocações e IA; conteúdo já consumido pelo PB-08/PB-10 não é refeito. |
| PB-08 | Knight e cockpit preservados; avisos históricos não são nova fila. |
| PB-09, não implementado | Retirado da fila e absorvido pelo PB-13. |
| PB-11, não implementado | Absorvido pelo PB-13-03/04. Diretório removido em 2026-09-07; o conteúdo está no histórico do Git. |
| PB-10-14/15, mapas pendentes | PB-15-02 (render) e PB-15-03 (caixas); corrigir antes só se impedirem a hunt de referência. |
| PB-12, não implementado | PB-15-01/05; proposta de sync deve ser reconciliada com progressão real. Diretório removido em 2026-09-07; o conteúdo está no histórico do Git. |
| Antiga previsão PB-13 a PB-16 (outfits/gacha/helper/QA) | Cosméticos no PB-15-04; helper no PB-13/20; performance somente diante de problema medido. |
| PB-17, pendência de feedback | PB-13-09 e PB-14-06; ícones, mochila e minimapa integrados preservados. |
| PB-18, não iniciado | Seleção, preview e retorno ao atlas no PB-13-02; não construir controle vazio de dificuldade. |
| PB-19/20/21, planejamento provisório sem implementação | Substituídos por PB-13/14/15; entradas antigas são redirecionamentos. |
| Map Editor / Borderizer | Ferramentas auxiliares sob demanda, sem bloquear o loop do jogo. |

## Depois do fim

Druid, mais hunts/dungeons, subclasses, charms, craft completo, bestiary com poder adicional,
diárias/semanais, desafios sazonais, helper de navegação, touch completo e wrappers ficam numa
reserva de ideias. Nada disso é requisito oculto de fechamento. Multiplayer, mercado entre jogadores,
backend, publicação comercial e substituição visual pertencem a outra fase de produto.

O V0 termina com os três resultados aceitos no playtest, sem tarefa central pendente e sem perda ou
duplicação conhecida no ciclo de recompensa. Bugs menores viram FIX. A última implementação roda
build; não existe playbook extra de auditoria obrigatória nem promessa de zero bugs.
