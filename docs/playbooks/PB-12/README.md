# PB-12 — Hunts moduladas e level sync

> **Fila encerrada em 2026-09-07:** registro histórico. Implementações e commits abaixo
> permanecem válidos; pendências não são executáveis por esta fila. Destino no
> [roteiro vigente](../../06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md). Status antigos abaixo são históricos.


**Status:** **esqueleto**. Não elegível. **Exige emenda à ADR-05 antes de qualquer task.**

**Goal:** conteúdo de faixa antiga continua jogável e relevante.

## Por que este playbook é obrigatório, não opcional

Ele é **a outra metade do princípio de design do PB-08**, apontada pelo dono em 2026-08-24.

O princípio diz que cada faixa tem a sua forma de cada coisa — magia, criatura, item, equipamento — e
que cruzar a faixa **substitui**. Isso resolve a redundância, mas cria um risco simétrico: **se cada
faixa tem suas formas, o conteúdo da faixa anterior morre no instante em que você a ultrapassa.**
A caverna de rotworm vira conteúdo morto assim que o jogador passa dela.

Sem este playbook, o princípio produz um jogo que descarta o próprio conteúdo. Com ele:

> **Sem redundância dentro da faixa, sem obsolescência entre faixas.**

## O que a pesquisa já resolveu

`docs/research/wakfu/01_modular_dungeons.md` é inteiramente sobre isso — modulação de nível (ALS),
gear sync e dungeons moduladas do WAKFU. As recomendações relevantes:

- **§6 opção B — downscale proporcional de stats**, recomendado como padrão;
- **§7 opção 3 — downscale do item no lugar**, recomendado como padrão;
- **§7 opção 5 — modo "Autêntico"** (gear nativo da faixa) como **opt-in com bônus**;
- **§9 eixo 1** — modo livre vs sincronizado controla **raridade máxima** de recompensa;
- **§12** — escopo mínimo viável e a lista negra do que não copiar do WAKFU.

`docs/research/tibia/01_hunts_progression.md` §10 alavanca 6 chama isso de "relevância retroativa" e
o classifica como custo **médio**.

## A emenda à ADR-05 é pré-requisito

Decisão vinculante 1 da `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`: *"Toda mecânica usada no V0
deve existir no Canary/Tibia ou ser uma extensão Huntbound listada explicitamente neste
documento."*

**A emenda já está escrita e aguarda decisão do dono:**
`docs/09_EMENDA_ADR05_SINCRONIZACAO_DE_FAIXA.md`. Ela autoriza a sincronização de faixa com cinco
propriedades vinculantes, rejeita explicitamente o caminho oposto (escalar a hunt ao jogador) e deixa
o dial de dificuldade fora, para emenda própria depois do PB-11. Aceitá-la é uma edição; até lá este
playbook não é elegível.

**Level sync não existe no Tibia.** Diferente de tudo que está no PB-08 — stances, taunt, magias, kit
— este playbook não pode começar sem que a extensão seja listada por escrito na seção "Extensões
Huntbound permitidas".

## Escopo previsto

Bullets, não tasks. Nada congelado.

- Faixa declarada por hunt, no molde dos tiers discretos que `tibia/01` §14 pergunta 4 recomenda
  ("tiers discretos são muito mais simples de balancear que sync contínuo").
- Downscale proporcional de stats do jogador ao entrar em hunt de faixa inferior.
- Downscale do item no lugar, sem set emprestado.
- Recompensa sensível ao modo: sincronizado paga mais, ou paga coisas que o modo livre não paga.
- Modo "Autêntico" opt-in, se o playtest pedir.

## Dependências

- **PB-09** — sem progressão, não há faixa a sincronizar.
- **PB-11** — sem equipamento, não há gear sync.
- **PB-10** — sem mais de uma hunt ou mais de uma faixa de criatura, não há de onde voltar.

É o último dos cinco por consequência, não por prioridade: ele depende dos outros três terem
produzido o que sincronizar.
