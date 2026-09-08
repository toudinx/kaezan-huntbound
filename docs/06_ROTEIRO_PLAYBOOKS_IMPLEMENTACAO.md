# Roteiro compacto do V0

**Vigente desde 2026-09-07.** Substitui a fila anterior; IDs antigos não são reutilizados.
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
| 1 | [PB-19 — Uma run que vale repetir](playbooks/PB-19/README.md) | Loop completo com Knight, saída, loot útil, progressão curta e helper mínimo. Uma hunt de referência. | Concluir, equipar uma melhoria, recarregar e querer outra run; entender o que o helper faz. |
| 2 | [PB-20 — Três vocações, encontros distintos](playbooks/PB-20/README.md) | Sorcerer, Paladin e três papéis comportamentais de monstros; ampliar só o conteúdo que demonstra esses papéis. | As três classes funcionam no mesmo encontro; assistir revela diferenças de posição, ataque e risco. |
| 3 | [PB-21 — Dungeon, modulação e fechamento](playbooks/PB-21/README.md) | Uma dungeon curta, modo modulado, coleção/gacha cosmético mínimo e fechamento das cinco hunts. | Preparar, completar, receber recompensa, voltar à dungeon antiga com desafio e encerrar a sessão com progresso salvo. |

Execução serial. Nenhuma task declara paralelismo. Uma task por chat; não abrir branch por rotina.
A primeira card está escrita. Os demais itens são resultados delimitados; suas cards nascem
quando as decisões e o código anterior existirem. O plano não impõe assinaturas ou camadas futuras.

## Limites de produto e critérios de decisão

- **Progressão:** começar por level/XP curto e equipamento; não acrescentar árvore de talentos,
  skill grind e Códex com poder simultaneamente. PB-19-01 decide curva, fim e tratamento da morte.
- **Itens:** arma, armadura e mão secundária compatível com a vocação como escopo inicial proposto.
  Drops devem oferecer uma escolha compreensível; não importar centenas de itens nem affixes novos.
- **Helper:** cura, alvo, ações e loot desligáveis, com intervenção manual e motivo de ação legível.
  Navegação autônoma entre hunts, farm offline e editor de scripts ficam fora. A rotina do jogador
  continua sendo preparar a build, escolher o risco e intervir; não apenas esperar um contador subir.
- **IA de mobs:** primeiro perseguidor melee, atacante ranged e conjurador de área/suporte.
  Escolher espécies pelo comportamento Canary disponível; uma nova skin com HP maior não basta.
- **Leitura:** perigo, resposta e resultado precisam aparecer no combate. FX devem explicar o que
  ocorreu, sem encobrir tiles, alvo ou ameaças. Não equiparar mais partículas a diversão.
- **Dungeon:** encontros curados com começo, boss e fim; alvo inicial de sessão de 10–20 minutos,
  hipótese de playtest, não métrica já validada. Sem gerador procedural ou campanha narrativa.
- **Modulação:** separar nível efetivo, dificuldade e recompensa. Primeiro modo livre e modulado;
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
| PB-06, pendências de save/QA | PB-19-02 verifica o fluxo afetado; bugs históricos só viram correção se ainda presentes. Browser QA permanece do usuário. |
| PB-07, tasks congeladas | PB-20 absorve vocações e IA; conteúdo já consumido pelo PB-08/PB-10 não é refeito. |
| PB-08 | Knight e cockpit preservados; avisos históricos não são nova fila. |
| PB-09 e PB-11, não implementados | Retirados da fila e absorvidos pelo PB-19. |
| PB-10-14/15, mapas pendentes | PB-21-04; corrigir antes apenas se impedirem a hunt escolhida para uma entrega. |
| PB-12, não implementado | PB-21-01/03; proposta de sync deve ser reconciliada com progressão real. |
| PB-13 a PB-16, só previstos no roteiro | Cosméticos no PB-21-04; helper no PB-19/20; performance somente diante de problema medido. |
| PB-17, pendência de feedback | PB-19-05 e PB-20-04; ícones, mochila e minimapa integrados preservados. |
| PB-18, não iniciado | Seleção, preview e retorno ao atlas no PB-19-02; não construir controle vazio de dificuldade. |
| Map Editor / Borderizer | Ferramentas auxiliares sob demanda, sem bloquear o loop do jogo. |

## Depois do fim

Druid, mais hunts/dungeons, subclasses, charms, craft/imbuing, bestiary com progressão própria,
diárias/semanais, desafios sazonais, helper de navegação, touch completo e wrappers ficam numa
reserva de ideias. Nada disso é requisito oculto de fechamento. Multiplayer, mercado entre jogadores,
backend, publicação comercial e substituição visual pertencem a outra fase de produto.

O V0 termina com os três resultados aceitos no playtest, sem tarefa central pendente e sem perda ou
duplicação conhecida no ciclo de recompensa. Bugs menores viram FIX. A última implementação roda
build; não existe playbook extra de auditoria obrigatória nem promessa de zero bugs.
