---
name: playbook-task
description: Executar uma task card de playbook do Kaezan Huntbound ponta a ponta - leitura mínima, implementação jogável, o gate do raio do diff, commit na main. Use quando receber um path de docs/playbooks/**/tasks/*.md ou quando a instrução for executar uma task de PB.
---

# Executar uma task de playbook

Uma task = um chat. A card é a fonte de verdade, não a conversa. `AGENTS.md` tem o resto.

Isto é um piloto. O aceite é o usuário jogando; bug no playtest vira `PB-NN-FIX-MM`, não outra hora
de suíte. **O custo do processo é proporcional ao raio do diff** — um rename e uma mudança de kernel
não pagam a mesma conta.

## 1. Antes de editar

`git status`. Árvore suja ou branch fora da `main` é sua primeira tarefa: leia o diff, rode o gate,
commite. Integrar já é autorização normal da task que gerou aquilo.

Leia a card, o `STATE.md` do playbook e **apenas** os paths que a card citar. Não carregue skills de
plugin (Superpowers e afins) a menos que a card as nomeie.

Se precisar de um arquivo que a card não citou, leia — e diga isso no relatório para a card ser
corrigida.

## 2. Implementar

- O tempo vai para arquitetura, padrão do arquivo vizinho e a funcionalidade jogável.
- **A card diz o quê e onde.** Se ela trouxer um desenho pronto, ele é sugestão; o código real vence.
- TDD só no kernel e em contrato. HUD, layout, mapa e conteúdo entregam jogável.
- **Escreva o teste pequeno, nunca a suíte.** O que prova que a coisa funciona é bem-vindo, e no
  kernel vem antes do código; cobrir caso que ninguém reportou, não.
- Não antecipe a próxima task. Não polia até zero bug — quem aponta é o playtest.
- Correção pequena necessária ao aceite fica na task. Problema independente vira linha no `STATE.md`.
- Preserve decisões congeladas: contrato, schema, identidade e escopo não se redesenham aqui.

## 3. Gate

Só o do raio do seu diff — a tabela está em `AGENTS.md` e na skill `run-gates`. Pare no primeiro
vermelho, não empilhe.

Rode para **saber se quebrou**, nunca para produzir prova, e nunca duas vezes. Card antiga que exige
`verify` + `qa:browser` + os `--check`: execute a linha da tabela, não a card.

`test` (51 s), `qa:browser` (4,6 min), `verify` (~6 min) e `qa:budgets` **são do usuário** — não rode
nem espere. A última task do playbook roda `corepack pnpm build`.

## 4. Fechar

Commite na `main`. Sem branch, sem worktree — eles só existem quando o `README.md` declara duas
tasks paralelas rodando ao mesmo tempo.

A narrativa do que foi feito vai na **mensagem de commit**; no `STATE.md`, só a linha da task.

## 5. Relatar

Um parágrafo: o que mudou, o gate que rodou, o que olhar no jogo com `corepack pnpm dev` de pé.

Depois **pare**. Funcionalidade rodando + gate verde = acabou. Não releia o diff atrás de melhorias,
não rode gate de novo, não escreva teste para caso não reportado, não inicie a próxima task.

Estas três linhas precisam responder vazio:

```bash
git status --porcelain && git branch --no-merged main && git worktree list
```

## Ambiguidade não é parada

Escolha a opção mais simples e mais fácil de reverter, registre em uma linha no commit e siga.

Pare só quando: for destruir dado salvo sem rollback; for mudar contrato, schema ou golden já
integrado; ou a mesma causa bloquear dois ciclos vermelho/verde. Não pare por suíte incompleta,
orçamento vermelho ou playbook anterior sem fechamento formal.
