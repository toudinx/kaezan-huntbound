---
name: playbook-task
description: Executar uma task card de playbook do Kaezan Huntbound ponta a ponta - leitura mínima, TDD, verificação, STATE.md, commit, integração e limpeza. Use quando receber um path de docs/playbooks/**/tasks/*.md ou quando a instrução for executar uma task de PB.
---

# Executar uma task de playbook

Uma task = um chat. A task card é a fonte de verdade, não a conversa.

## 1. Contexto mínimo

Leia, nesta ordem:

1. a task card indicada;
2. `docs/playbooks/<PB-ID>/STATE.md`;
3. **apenas** os arquivos listados na leitura mínima da task.

Não carregue `docs/` inteiro. Se a task não citar um arquivo e você precisar dele, leia — e registre
essa dependência no relatório final para a task card ser corrigida depois.

Confirme na task: classe da tarefa, modelo/effort sugerido, se é serial ou paralela, branch-base,
branch temporária e modo de integração.

## 2. Inspecionar antes de editar

Verifique o estado real do workspace: `git status --porcelain=v1 --untracked-files=all` limpo, branch
correto, e o que a task assume como pronto realmente está pronto. Estado divergente do `STATE.md` é
condição de parada, não algo a "ajustar de passagem".

## 3. Implementar

- Teste antes da implementação quando o comportamento for testável. Veja o vermelho pela razão certa.
- Preserve decisões congeladas: contrato, schema, política de identidade, allowlist e escopo não se
  redesenham dentro de uma task de implementação.
- Correção pequena e necessária para o critério de aceite fica na task. Problema independente vira
  registro no `STATE.md` ou nova task — nunca expansão silenciosa.
- Não antecipe a próxima task.

## 4. Verificar

Rode exatamente as verificações exigidas pela task. Use a skill `run-gates` para escolher os
focados. `corepack pnpm verify` já inclui `biome check .`. Guarde comando e saída: eles vão para o
relatório. `qa:budgets` é informativo — registre o número, não bloqueie por ele.

## 5. Persistir o handoff

Atualize **só a linha da task** na tabela do `STATE.md`, mais a próxima elegível e os bloqueios
abertos. O arquivo tem teto de 60 linhas.

Comandos, exit codes, hashes, contagens, tentativas, desvios e o modelo/effort usados vão na
**mensagem de commit** da task, não no `STATE.md` — o Git já guarda, data e associa ao diff. Decisão
durável vai para ADR ou spec e é só referenciada.

## 6. Fechar

Commit, integração pelo modo declarado (padrão `git merge --ff-only`), verificação pós-integração e
limpeza de worktree/branch. Isso já está autorizado pela task; não peça confirmação. O procedimento
está na skill `worktree-cycle`.

## 7. Relatar

Resumo de mudanças, verificações com comando e resultado, integração, limpeza, desvios e próxima task
elegível. Depois pare — não inicie a próxima task.

## Ambiguidade não é parada

Comportamento com mais de uma leitura plausível acontece o tempo todo numa implementação. Escolha a
opção mais simples e mais fácil de reverter, registre a escolha em uma linha no commit e siga. Se
estiver errada, o jogo mostra, e reverter uma decisão pequena custa menos que uma ida e volta.

## Condições de parada

Pare, preserve o estado e reporte só quando: for destruir ou migrar dado já salvo sem rollback; for
necessário mudar contrato público, schema ou golden já integrado; a mesma causa bloquear dois ciclos
vermelho/verde seguidos; o `--ff-only` falhar ou a árvore ficar suja.

Não pare por: falta de veredito de auditoria, playbook anterior sem fechamento formal, orçamento de
tempo vermelho, ou `git status` sujo com arquivos que não são da sua task.

Registre o bloqueio no `STATE.md` em uma linha e o detalhe no relatório do chat.
