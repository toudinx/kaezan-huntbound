# PB-08-10 — Aceite

**Status inicial:** pending

**Classe da tarefa:** gate final e entrega para aceite de produto

**Modelo sugerido:** camada frontier — **GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6** —, effort `xhigh`.
A `docs/08_POLITICA_MODELOS_AGENTES.md` manda camada frontier para gates finais **mesmo quando o diff
esperado é pequeno**, porque o risco está no julgamento.

**Validador sugerido:** **o usuário jogando.** Não há validador de agente para esta task.

**Rota:** `superpowers:verification-before-completion`. Skills operacionais: `playbook-task`,
`run-gates`.

**Paralelismo:** depende de **todas as anteriores integradas**. É a última.

## Objetivo

Entregar o PB-08 jogável e dizer, em uma página, **o que olhar** e **como reproduzir**.

O `AGENTS.md` é explícito: *"o aceite é o usuário jogando. Playbook não fecha por veredito de
auditoria."* O papel desta task é deixar o jogo de pé e a verificação fácil — não emitir parecer.

## O que esta task NÃO é

- **Não é auditoria.** Auditoria independente roda **depois** do aceite, é opcional, e o que ela
  encontra vira task de correção no backlog — nunca portão para o playbook seguinte.
- **Não é conserto.** Se algo estiver quebrado, isso é defeito de uma task anterior. Registre no
  `STATE.md`, abra a correção como task própria e **diga no relatório**. Não conserte aqui: consertar
  dentro do aceite esconde de qual task veio o defeito.
- **Não inicia o PB-09.** Nenhum playbook espera o fechamento formal de outro; o que o PB-09 espera é
  código integrado na `main` e verde.

## As três entregas

### 1. Gates verdes, com evidência fresca

- `corepack pnpm verify` — **exit 0**, saída colada no relatório.
- `corepack pnpm qa:budgets` — **medido e registrado como número** no `STATE.md`.

**`qa:budgets` é camada informativa e não bloqueia merge.** Vermelho vira task de performance no
backlog. Mas **rodar não é opcional** — o que é opcional é bloquear.

**Antes de teorizar sobre performance, liste o que está rodando.** O B7 do PB-08 original documentou
um `qa:browser` órfão que fez `tools/replay` reprovar por timeout — 642 s contra 73 s com a máquina
livre. Gate lento é sintoma de máquina ocupada antes de ser sintoma de código lento:

```
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like '*kaezan-huntbound*' }
```

### 2. `corepack pnpm dev` de pé

E, se você subir servidor, **derrube o que subiu ao terminar** — ou avise que deixou de pé, de
propósito, para o usuário jogar.

### 3. O roteiro de aceite

Uma página no relatório, e é o entregável que importa. Para **cada um** dos critérios finais do
README, diga **o que apertar** e **o que olhar**:

- [ ] O Knight tem **nove ações**, cinco de dano, disponíveis desde o começo.
- [ ] **Cada ação tem efeito visual próprio** e é identificável sem ler o botão.
- [ ] Nenhum par de ações produz a mesma imagem.
- [ ] Groundshaker acerta **visivelmente mais tiles** que Berserk.
- [ ] Whirlwind Throw acerta um alvo a **5 tiles**, com a arma saindo da mão.
- [ ] Trocar de postura muda a rotação de forma perceptível, e a postura **sobrevive ao `F5`**.
- [ ] Challenge faz criaturas que estavam em outro alvo **virarem para o jogador**.
- [ ] Haste muda a velocidade de passo de forma visível por 30 s.
- [ ] As nove ações cabem no HUD sem que a rotação de dano se confunda com as situacionais.

**Escreva o roteiro como instruções para uma pessoa, não como lista de asserções.** "Puxe quatro
rotworms para o corredor da esquerda, aperte 3 e conte os tiles que acendem; depois aperte 2 e conte
de novo" vale mais que "verificar que Groundshaker tem raio maior".

**Dois critérios pedem cuidado especial:**

- **Challenge** é taunt de **contato**, raio 1 — oito vizinhos, não a tela. O roteiro tem que colocar
  o jogador encostado nas criaturas, senão o teste "não funciona" por estar sendo feito errado.
- **"Nenhum par produz a mesma imagem"** é o critério central do playbook e o mais fácil de deixar
  passar. O `KNIGHT_BANDS.md` Seção 1b já nomeia o **par mais fraco do mapa** — auto-attack × Brutal
  Strike — com condição de falha escrita. **Ponha esse par no roteiro primeiro.**

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-08/README.md` — "Critérios finais de aceite" e o princípio de design;
3. `docs/content/KNIGHT_BANDS.md` — Seção 1 (a imagem de cada ação) e Seção 1b (o par mais fraco);
4. `STATE.md` — bloqueios abertos;
5. `AGENTS.md` — §"O aceite é o usuário jogando" e §"A task não acaba na árvore de trabalho".

## O que registrar no `STATE.md`

- número de `qa:budgets`;
- bloqueios que sobraram abertos, com o que falta para fechar;
- **as divergências declaradas que o playbook acumulou**, para que o PB-09 e o PB-11 as herdem sem
  arqueologia. São, no mínimo: o quadrado de Chebyshev do Groundshaker, o taunt de raio 1, Challenge
  fora da promoção, o `+30% shielding` do Protector sem onde pousar, e a conversão de `speedPermille`
  do Haste.

## Verificações exigidas

- `corepack pnpm verify` — exit 0, saída fresca.
- `corepack pnpm qa:budgets` — medido, número registrado.
- `git status --porcelain && git branch --no-merged main && git worktree list` — as três linhas do
  `AGENTS.md`, coladas no relatório.

## Definition of Done

- [ ] `verify` verde em `main` integrada, com saída fresca no relatório.
- [ ] `qa:budgets` medido e o número no `STATE.md`.
- [ ] `dev` de pé, ou avisado que foi derrubado.
- [ ] Roteiro de aceite escrito, cobrindo os nove critérios, em linguagem de instrução.
- [ ] Divergências declaradas consolidadas no `STATE.md`.
- [ ] Nenhum conserto feito dentro desta task; defeitos viraram task própria.
- [ ] As três linhas de fechamento coladas no relatório.
- [ ] `STATE.md` atualizado só na linha da task e nas seções de bloqueio e métrica.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:verification-before-completion.
NAO use test-driven-development: esta task nao escreve codigo de produto.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-08\tasks\PB-08-10-aceite.md

Leia AGENTS.md (secoes "O aceite e o usuario jogando" e "A task nao acaba na arvore de trabalho"),
docs/playbooks/PB-08/README.md (Criterios finais de aceite e o principio de design), o STATE.md, e
docs/content/KNIGHT_BANDS.md secoes 1 e 1b.

Trabalhe direto na main; esta task nao precisa de worktree.

ENTREGUE TRES COISAS:

1. GATES VERDES COM EVIDENCIA FRESCA
   - corepack pnpm verify -> EXIT 0, saida colada no relatorio
   - corepack pnpm qa:budgets -> MEDIDO e registrado COMO NUMERO no STATE.md
   qa:budgets e camada informativa e NAO BLOQUEIA MERGE. Vermelho vira task de performance no
   backlog. Mas RODAR NAO E OPCIONAL — o que e opcional e bloquear.
   ANTES DE TEORIZAR SOBRE PERFORMANCE, LISTE O QUE ESTA RODANDO. O B7 documentou um qa:browser
   orfao que fez tools/replay reprovar por TIMEOUT: 642s contra 73s com a maquina livre.
   Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like '*kaezan-huntbound*' }

2. corepack pnpm dev DE PE. Se voce subir servidor, derrube o que subiu ao terminar — ou avise que
   deixou de pe de proposito para o usuario jogar.

3. O ROTEIRO DE ACEITE — e este e o entregavel que importa. Uma pagina, cobrindo os NOVE criterios do
   README, dizendo O QUE APERTAR e O QUE OLHAR. Escreva como INSTRUCOES PARA UMA PESSOA, nao como
   lista de assercoes: "Puxe quatro rotworms para o corredor da esquerda, aperte 3 e conte os tiles
   que acendem; depois aperte 2 e conte de novo" vale mais que "verificar que Groundshaker tem raio
   maior".

   DOIS CRITERIOS PEDEM CUIDADO ESPECIAL:
   - CHALLENGE e taunt DE CONTATO, raio 1 — oito vizinhos, NAO a tela. O roteiro tem que colocar o
     jogador ENCOSTADO nas criaturas, senao o teste "nao funciona" por estar sendo feito errado.
   - "NENHUM PAR PRODUZ A MESMA IMAGEM" e o criterio central do playbook e o mais facil de deixar
     passar. O KNIGHT_BANDS.md secao 1b ja nomeia o PAR MAIS FRACO DO MAPA — auto-attack x Brutal
     Strike — com condicao de falha escrita. PONHA ESSE PAR NO ROTEIRO PRIMEIRO.

O QUE ESTA TASK NAO E:
- NAO E AUDITORIA. Auditoria independente roda DEPOIS do aceite, e opcional, e o que ela encontra
  vira task de correcao no backlog — nunca portao para o playbook seguinte.
- NAO E CONSERTO. Se algo estiver quebrado, e defeito de uma task anterior: registre no STATE.md,
  abra a correcao como task propria e DIGA NO RELATORIO. Consertar dentro do aceite esconde de qual
  task veio o defeito.
- NAO INICIA O PB-09.

REGISTRE NO STATE.md, alem do numero de qa:budgets e dos bloqueios abertos, AS DIVERGENCIAS
DECLARADAS QUE O PLAYBOOK ACUMULOU, para que PB-09 e PB-11 as herdem sem arqueologia. Sao no minimo:
o quadrado de Chebyshev do Groundshaker, o taunt de raio 1, Challenge fora da promocao, o +30%
shielding do Protector sem onde pousar, e a conversao de speedPermille do Haste.

Cole no relatorio a saida de:
git status --porcelain && git branch --no-merged main && git worktree list

NAO inicie a proxima task. Termine dizendo ao usuario o que olhar e como reproduzir.
```
