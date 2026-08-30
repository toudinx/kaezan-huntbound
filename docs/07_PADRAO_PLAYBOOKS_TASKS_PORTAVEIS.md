# Padrão de playbooks e tasks portáveis

**Status:** aceito
**Aplica-se a:** todos os playbooks
**Política de modelos:** `08_POLITICA_MODELOS_AGENTES.md`

## Para que o playbook existe

Quatro motivos concretos, e nenhum deles é controle de qualidade:

1. **Serializar e paralelizar em chats separados**, para que um único agente não implemente tudo.
2. **Trocar de plataforma livremente** — Claude Code, Codex, Cursor — sem carregar histórico de chat.
3. **Rodar N tasks seguidas sem o usuário presente**, para ele validar tudo depois, de uma vez.
4. **Não escrever prompt a cada task concluída.** O objetivo já está no disco.

Toda regra abaixo serve a um desses quatro. Regra que não serve a nenhum foi removida — e uma regra
nova só entra se você conseguir dizer qual dos quatro ela protege.

Quem faz controle de qualidade é o usuário jogando. Os gates cobrem só o que uma sessão de jogo não
vê, e estão em `AGENTS.md`.

## Estrutura

```text
docs/playbooks/<PB-ID>/
  README.md    objetivo, escopo, decisões congeladas, tabela de tasks, o que é paralelo
  STATE.md     status por task — teto de 60 linhas
  tasks/<PB-ID>-NN-<slug>.md
```

## A task card

**Teto de 40 linhas.** Se passou disso, ou a task é grande demais e deve ser dividida, ou você está
escrevendo a implementação em vez da task.

Seis seções, nesta ordem. Nada além delas:

```markdown
# PB-NN-MM — Título

**Objetivo.** Uma ou duas frases: qual problema limitado some ao fim disto.

**Onde.** Os arquivos ou diretórios que devem mudar. Path, não desenho.

**Fora de escopo.** Os problemas vizinhos que pertencem a outra task.

**Decisões congeladas.** Só o que o executor não pode redesenhar, por referência à spec ou ADR.
Vazio é uma resposta válida e comum.

**Gate.** A linha da tabela de `AGENTS.md` correspondente ao raio deste diff. Uma linha.

**O que olhar no jogo.** Como reproduzir em dois minutos com `corepack pnpm dev` de pé.
```

Se o playbook já for coberto por uma rule de `.cursor/rules/`, a card não repete o conteúdo dela.

### A card diz o quê e onde, nunca como

Esta é a regra que mais economiza tempo, e a que foi mais violada.

Uma card que traz as camadas numeradas, a assinatura do tipo pronta e a decisão de fallback já
implementou a task — em prosa, numa sessão de modelo frontier que não aparece no cronômetro. Depois
um segundo modelo relê tudo e reconstrói o mesmo desenho. O projeto é pago duas vezes e a segunda
paga é a cara.

Se você sabe o desenho a ponto de escrevê-lo, escreva o **código**, não a card. Se não sabe, a card
não deve fingir que sabe: diga o objetivo e o path, e deixe o executor ler o código.

Localizar uma causa já achada é diferente e é bem-vindo: `arquivo.ts:155` numa linha economiza uma
investigação inteira. O que não entra é a solução.

### O que não entra na card

Removidos porque custavam tempo e não protegiam nenhum dos quatro motivos:

- **Prompt copiável.** Era a card inteira duplicada em caixa alta, mantida em dois lugares que
  envelheciam separados. O prompt é o bloco de três linhas no fim deste documento, igual para toda
  task; a única coisa que muda é o path.
- **Definition of Done com checkbox.** Vira lista de comprovação e faz o executor rodar gates para
  produzir evidência em vez de para saber se quebrou. O aceite é o usuário jogando.
- **"Cole a saída fresca no relatório."** Idem.
- **Classe da tarefa, modelo/effort sugerido, validador sugerido, rota de skills.** Modelo e effort
  são escolhidos por quem abre o chat, na hora, conforme `08_POLITICA_MODELOS_AGENTES.md`.
- **Leitura mínima numerada com oito itens.** "Onde" já diz o que ler.
- **Ciclo de conclusão, branch-base, worktree, modo de integração.** Está em `AGENTS.md` e é o mesmo
  para toda task: commite na `main`.
- **Riscos conhecidos.** Vira a card prescrevendo a solução pela porta dos fundos.

## Decomposição

Tasks são divididas por **fronteira de problema**, nunca por número de arquivos. Uma task coesa que
toca muitos arquivos é melhor que três fragmentos que deixam o workspace quebrado.

Manter junto quando: é um problema só, os arquivos mudam juntos para produzir um estado íntegro, e
separar criaria handoff artificial.

Dividir quando: partes podem ser validadas independentemente, uma decisão desconhecida bloqueia a
seguinte, ou o executor precisaria carregar contexto não relacionado.

## Quantas cards escrever antes de executar

**Quantas você quiser rodar seguidas.** Se o plano é deixar dez tasks rodando enquanto você está na
rua, as dez precisam existir antes.

Isto era proibido, e a proibição fazia sentido quando a card tinha 253 linhas e desenhava a
implementação: dez dessas envelheciam contra o código real e viravam manutenção de documento. Uma
card de 40 linhas que diz objetivo, path e fora de escopo não envelhece — o objetivo não muda porque
a implementação descobriu algo.

O que continua valendo: se uma task descobrir que muda o objetivo de outra, corrija aquela card em
uma linha e siga. Não pare o playbook para replanejar.

## `STATE.md`

Teto de **60 linhas**. Só estado, nunca história:

- status por task: `pending`, `in_progress`, `done`, `blocked`;
- commit integrado de cada task;
- bloqueios abertos e o dado que os remove.

Não entra: saída de gate, justificativa de vermelho, relato de tentativa, histórico de auditoria. Vai
na mensagem de commit — o Git já guarda, data e associa ao diff. O `STATE.md` do PB-05 chegou a 1039
linhas por acumular isso e passou a ser lido por ninguém.

Depois de rodar N tasks sem acompanhar, o que o usuário lê ao voltar é `git log --oneline` e o jogo
de pé. O `STATE.md` diz só onde parou.

## Prompt para executar uma task

Igual para toda task. Só o path muda:

```text
Trabalhe em C:\Kaezan\kaezan-huntbound.

Execute integralmente e somente: <PATH-DA-TASK-CARD>

Leia AGENTS.md e o STATE.md do playbook. Implemente, rode só o gate do raio do seu diff, commite na
main e pare. Não peça confirmação para commitar. Não inicie a próxima task.
```

## Tasks paralelas

Só quando o `README.md` do playbook declarar paths disjuntos. Cada chat usa worktree e branch
isolados, conforme `AGENTS.md`; verificações que disputem porta ou fixture mutável são serializadas,
e **não** se roda `verify` de duas ao mesmo tempo.

Se você está rodando as tasks em sequência — o caso normal — não existe worktree, não existe branch.

## Fechamento do playbook

Fecha quando **o usuário joga e aprova**. É o único aceite normativo.

A última task roda `corepack pnpm verify` uma vez, para o usuário não gastar a sessão num crash, e
registra o número do `qa:budgets`. Aprovado, o `STATE.md` recebe `closed`; apontado, vira
`PB-NN-FIX-MM`.

Auditoria independente é opcional, roda **depois** do aceite, endereça um commit por hash, não exige
árvore limpa e gera task de backlog em vez de veredito. Nenhum playbook espera o fechamento formal de
outro: o que o próximo precisa é código integrado na `main`, confirmável por `git log`.

## Antipadrões

- Card que prescreve a implementação, ou que passa de 40 linhas.
- Duplicar a card num prompt copiável.
- Rodar gate para produzir prova em vez de para saber se quebrou.
- Rodar `verify` ou `qa:browser` em toda task; polir até zero bug antes do playtest.
- Worktree ou branch numa task que roda sozinha em sequência.
- Um único chat para planejar, implementar e depurar o playbook inteiro.
- Transformar `STATE.md` em diário.
- Deixar decisão ou bloqueio só no relatório do chat.
- Absorver problema independente na task corrente.
- Supor que o próximo agente terá acesso a esta conversa.
- Parar porque um comportamento admite mais de uma leitura razoável.
