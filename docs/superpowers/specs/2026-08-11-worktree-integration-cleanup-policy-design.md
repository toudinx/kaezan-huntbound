# Integração e limpeza automática de worktrees

**Status:** aprovado para implementação

**Data:** 2026-08-11

**Aplica-se a:** playbooks e task cards executados em branches ou worktrees temporárias

## Problema

O protocolo atual termina a task no commit e transfere a integração para um responsável posterior.
Isso obriga o usuário a pedir o avanço de `main` e permite que worktrees concluídas permaneçam em
`C:\Kaezan`, acumulando pastas sem utilidade operacional.

## Decisão

Uma task de implementação não termina no commit. O ciclo de conclusão inclui integração local,
verificação do resultado integrado e limpeza dos recursos temporários. Essas operações são parte da
autorização normal da task e não exigem uma confirmação adicional do usuário.

O fluxo canônico para uma task serial é:

1. implementar na worktree isolada;
2. executar os critérios de aceite e criar o commit da task;
3. integrar o commit no branch-base;
4. repetir a verificação relevante no resultado integrado;
5. confirmar que o commit está alcançável pelo branch-base;
6. remover a worktree, executar `git worktree prune` e apagar a branch temporária.

## Integração serial

Quando a task é serial e o branch-base não avançou de forma incompatível, o agente deve usar
`git merge --ff-only`. O agente não deve perguntar se pode fazer o fast-forward: a integração faz
parte da conclusão solicitada.

Se `--ff-only` falhar, o agente não cria merge commit nem faz rebase automaticamente. Ele preserva a
worktree e a branch, registra o estado e reporta o impedimento para que o conflito seja resolvido sem
perder contexto.

## Integração de tasks paralelas

Tasks paralelas continuam produzindo commits independentes. Cada executor deve remover sua worktree
depois que a implementação estiver verificada, a árvore estiver limpa e o commit estiver seguro na
branch temporária, mas deve preservar essa branch até a integração. Remover a worktree não apaga a
branch nem o commit.

O integrador definido pelo playbook incorpora os commits serialmente, resolve somente conflitos de
integração autorizados, atualiza os documentos compartilhados e verifica o conjunto. Após confirmar
que cada commit está representado no branch-base, remove as branches temporárias correspondentes.

## Condições de segurança

A remoção de qualquer worktree só ocorre quando estas condições forem verdadeiras:

- a worktree não contém mudanças não commitadas nem arquivos não rastreados relevantes;
- o commit esperado existe e está preservado em uma branch;
- o path resolvido da worktree corresponde exatamente ao path temporário registrado pelo Git.

A remoção da branch temporária só ocorre quando estas condições adicionais forem verdadeiras:

- a integração terminou sem conflito;
- a verificação do resultado integrado passou;
- o commit da task está alcançável pelo branch-base ou teve equivalência de patch explicitamente
  comprovada quando a integração exigiu rebase ou cherry-pick autorizado;

Falha de teste, conflito, árvore suja, branch-base inesperado ou dúvida sobre o path significa que a
task ainda não terminou. Nesses casos, o agente preserva worktree e branch e reporta o bloqueio.

## Limpeza

O agente deve preferir `git worktree remove PATH_ABSOLUTO_VALIDADO` e depois `git worktree prune`. Se outputs
ignorados impedirem a remoção, ele primeiro valida o path absoluto e pode remover apenas aquele path
temporário por uma operação recuperável, como a Lixeira do Windows. A raiz principal do repositório
nunca é alvo de limpeza.

Depois da remoção da worktree, a branch temporária é apagada com deleção segura, sem força, somente
quando sua integração já estiver comprovada. Branches não integradas ou necessárias para revisão
remota permanecem.

## Exceções

- Fluxos de pull request preservam worktree e branch enquanto houver revisão pendente.
- Tasks explicitamente classificadas como handoff para outro integrador podem remover a worktree
  local após o commit, mas preservam a branch até o integrador concluir.
- Ambientes com worktrees administradas pela plataforma seguem o mecanismo nativo de saída, sem
  apagar diretórios pertencentes ao host.

## Alterações documentais

A implementação desta decisão deve atualizar:

- `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`, tornando integração, verificação pós-integração e
  limpeza partes obrigatórias do protocolo e do checklist de novos playbooks;
- `docs/08_POLITICA_MODELOS_AGENTES.md`, exigindo que prompts copiáveis incluam integração e limpeza;
- a task pendente `PB-00R-FIX-01`, para que o próximo executor aplique imediatamente o novo ciclo.

Task cards históricas já concluídas não serão reescritas.

## Critérios de aceite

- Nenhuma task serial concluída termina apenas com a instrução para o usuário fazer fast-forward.
- Nenhuma worktree concluída permanece no diretório do projeto por omissão do executor.
- Branches temporárias integradas são removidas sem força.
- Falhas e conflitos preservam o estado necessário para correção.
- Tasks paralelas continuam seguras e não tentam fazer fast-forward concorrente de `main`.
