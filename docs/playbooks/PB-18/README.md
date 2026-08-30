# PB-18 — A porta

> **Para agentes executores:** **nenhuma skill externa é obrigatória.** Skills operacionais do
> repositório: `playbook-task`, `run-gates`. Uma task card por chat. O formato e o handoff seguem
> `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Status:** **elegível**. Roda depois do PB-17. Não espera fechamento formal de ninguém.

**Goal:** a tela de escolha de hunt deixa de ser uma lista e vira uma **porta**, no sentido do WAKFU:
você olha o atlas, escolhe um lugar, vê **o que entrar significa** — quem mora lá, o que cai, e com
que ficha você vai entrar — e só então entra. E volta para o atlas sem recarregar a página.

**Architecture:** `HuntingPlaces.ts` monta a tela inteira a partir do `HuntIndex` gerado, e é a única
peça a mexer fora de `styles.css` e do boot em `main.ts`. **Nenhum dado novo é inventado**: tudo que
este playbook mostra já existe no índice gerado, no catálogo de personagens ou em
`docs/content/HUNT_BANDS.md`.

**Tech Stack:** TypeScript 7.0.2 strict, Vitest 4.1.10, Vite 8.2.1, Phaser 4, Node 24.14.0.
**Nenhuma biblioteca nova.**

## Por que este playbook existe

O PB-10 entregou o catálogo e a tela que o lista. Ela cumpriu o que a task pedia e envelheceu no
mesmo dia em que a quinta hunt entrou: **cada card despeja, inline, todas as criaturas da hunt e a
tabela de loot inteira de cada uma**. Com cinco hunts isso é um muro de texto onde a decisão — *para
onde eu vou agora?* — é a única coisa que não se lê.

Três defeitos concretos, todos verificados no código:

1. **Não há detalhe, só despejo.** `createHuntCard` monta header, fatos, criaturas e loot no mesmo
   card, para todas as hunts ao mesmo tempo. Não existe o passo "estou olhando *esta*".
2. **A tela não mostra arte nenhuma.** O runtime de asset só é criado **depois** da seleção
   (`apps/game/src/main.ts:363`), então o atlas é texto puro — apesar de o índice já carregar o
   `lookType` de cada criatura.
3. **A porta é de mão única.** `onRestart` reinicia *a mesma hunt*; não há caminho de volta ao atlas
   sem recarregar a página. Escolher errado custa um F5.

## O que o WAKFU faz, e o que deste playbook realmente vem de lá

A pesquisa já está no repositório: `docs/research/wakfu/01_modular_dungeons.md`, §1.1 e §1.2. Na
porta de uma dungeon do WAKFU o jogador vê e decide três coisas — **em que nível ele entra**
(modulação/ALS), **em que dificuldade** (o dial de Stasis) e **o que isso muda na recompensa**. O
§12 do mesmo documento lista o escopo mínimo viável, e o item 8 é, literalmente, **"tela de preview
na porta"**.

Deste playbook vem **a porta e o preview**. **Não vem o dial**, e não vem a modulação: isso é
mecânica, é o PB-12, e o PB-12 **exige emenda à ADR-05** antes de qualquer task. O que o PB-18 faz
pelo PB-12 é deixar **o assento pronto** — um lugar na porta onde o dial encaixa sem redesenhar a
tela.

## A descoberta que dá forma a este playbook

**O Huntbound já faz level sync. Ele só não conta a ninguém.**

Não existe um personagem que progride: existe **uma ficha por hunt**, resolvida em
`apps/game/src/hunt/readHuntCharacter.ts` e lançando se faltar. Conferido no catálogo gerado em
2026-08-30: Orc Fortress entra em nível 25 com 440 HP; Cyclopolis, em 45 com 740; Dragon Lair, em 70
com 1115; Hero Cave, em 130 com 2015 HP e uma two-handed sword. **As nove ações são as mesmas em
todas** — o kit tem uma banda só, `minLevel: 1, maxLevel: null`, como manda a regra 4 da curadoria.
O que muda é nível, HP, mana, arma e skill. Escolher a hunt **é** escolher com que personagem se
joga — e nada na tela diz isso.

Isso muda o enquadramento inteiro. A porta do WAKFU não é decoração: é a tela onde o jogo admite o
que a escolha significa. O PB-18 não acrescenta level sync ao Huntbound — ele **torna visível o que
já acontece**, o que é apresentação pura e não encosta na ADR-05.

## Fronteira com os outros playbooks

| Não é deste playbook | É de quem |
|---|---|
| modulação de nível, dial de dificuldade, recompensa por dificuldade | **PB-12** (e exige emenda à ADR-05) |
| level, XP, skill, Códex — progressão de verdade | PB-09 |
| stats de item, fim de run, loot equipável | PB-11 |
| HUD dentro da hunt | PB-17 |
| ordenação, filtro e sugestão automática de hunt | PB-15 (helper) |

Se uma task aqui quiser um dado que o índice gerado não tem, o caminho é **acrescentar ao gerador e
regenerar** — nunca editar artefato gerado à mão, nunca decidir regra na view.

## Fontes normativas

1. `AGENTS.md`;
2. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`;
3. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`;
4. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`;
5. `docs/content/HUNT_BANDS.md` — a escada;
6. `docs/research/wakfu/01_modular_dungeons.md` §1.1, §1.2, §12 — **é pesquisa, não direção**: vale
   como forma e como lista negra, e perde para a ADR-05 em qualquer conflito;
7. `.cursor/rules/40-game.mdc`;
8. este README;
9. a task card em execução;
10. `STATE.md` apenas para estado operacional.

## Tasks

| ID | Entrega | Depende de |
|---|---|---|
| PB-18-01 | o atlas e a porta: a lista deixa de despejar tudo e a hunt escolhida ganha uma tela própria | — |
| PB-18-02 | a porta diz com que ficha você entra — level sync em voz alta — e abre o assento do dial do PB-12 | 01 |
| PB-18-03 | retratos: criatura e loot com sprite na porta, sem estourar o boot | 01 |
| PB-18-04 | a escada e a volta: o atlas mostra as faixas em ordem e a porta vira mão dupla. **Task de fechamento — roda `build`.** | 01 |

**Serial na `main`, sem worktree.** As quatro tocam `HuntingPlaces.ts` e `styles.css`.

## Modelo e effort por task

| ID | Camada | Effort | Por quê |
|---|---|---|---|
| PB-18-01 | econômico | `xhigh` | reorganização de uma tela cujo dado já está todo no índice |
| PB-18-02 | **frontier** | `xhigh` | decide o que a porta afirma e desenha o assento do dial sem implementar o PB-12 |
| PB-18-03 | **frontier** | `xhigh` | carregar arte antes da seleção esbarra no orçamento de boot; a saída é uma decisão |
| PB-18-04 | econômico | `xhigh` | a escada já está declarada; a armadilha é querer persistir histórico — ver a card |

## Definition of Done do playbook

O usuário abre o jogo, e **antes de entrar** sabe para onde está indo, quem mora lá, o que cai e com
que ficha vai lutar. Erra a escolha, volta ao atlas, escolhe outra — sem F5.

**A armadilha de aceite continua a mesma:** o perfil `test` fabrica PNG 1 × 1 para qualquer id, então
`verify` e `qa:browser` ficam verdes com zero arte. A prova de arte é o perfil `personal`, e é do
usuário.
