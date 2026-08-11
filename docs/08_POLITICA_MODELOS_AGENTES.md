# Política de modelos e agentes

**Status:** vigente

**Aplica-se a:** todo playbook, task card, implementação, especificação, auditoria e validação do
Kaezan Huntbound.

## Objetivo

Escolher modelo e effort pelo risco da tarefa, mantendo implementações pequenas econômicas e usando
capacidade frontier onde julgamento, confiabilidade ou horizonte longo importam. Modelo sugerido não
substitui testes, evidência fresca, revisão nem critérios de aceite.

## Regra padrão

| Classe da tarefa | Modelo e effort padrão | Validação |
|---|---|---|
| Implementação menor e bem especificada | GPT-5.6 Luna, `xhigh` | GPT-5.6 Sol `xhigh` ou Claude Opus 5 |
| Especificação, plano, auditoria ou validação | GPT-5.6 Sol, `xhigh`, ou Claude Opus 5 | outro modelo frontier quando houver segunda revisão |
| Implementação complexa | GPT-5.6 Sol, `xhigh`, ou Claude Opus 5 | modelo frontier diferente do implementador |

GPT-5.6 Terra não é modelo padrão. Seu uso exige uma avaliação registrada que demonstre melhor
custo total para aquela classe de tarefa, ou indisponibilidade dos modelos preferidos.

## Classificação obrigatória

Uma implementação é **menor e bem especificada** somente quando todas as condições são verdadeiras:

- resolve um único comportamento ou fronteira coesa;
- não decide arquitetura, schema, persistência, concorrência, segurança ou economia;
- possui paths e critérios objetivos já conhecidos;
- permite red-green e verificação completa dentro da própria task;
- uma falha não causa perda de dados nem contamina múltiplos playbooks.

A implementação é **complexa** quando qualquer condição abaixo for verdadeira:

- muda contratos entre packages ou decisões arquiteturais;
- envolve determinismo, persistência, concorrência, segurança, economia ou migração;
- investiga comportamento intermitente, performance ou causa ainda desconhecida;
- atravessa múltiplos subsistemas com dependências sequenciais;
- exige julgamento significativo para definir o resultado correto.

Especificações, auditorias e gates finais usam Sol ou Opus 5 mesmo quando o diff esperado é pequeno,
pois o risco está no julgamento e não na quantidade de linhas.

## Diversidade de revisão

- Uma implementação Luna deve preferir Sol ou Opus 5 para revisão e validação.
- Uma implementação Sol deve preferir Opus 5; uma implementação Opus 5 deve preferir Sol.
- O mesmo modelo pode revisar somente quando a plataforma não oferecer alternativa. O desvio deve
  ser registrado em `STATE.md` com modelo, effort e motivo.
- Revisão independente não autoriza reduzir gates nem aceitar o relatório do implementador sem
  reproduzir a evidência relevante.

## Indisponibilidade e fallback

Quando o modelo indicado não estiver disponível:

1. use o modelo frontier disponível mais próximo para tasks complexas, especificações e validações;
2. use o modelo econômico disponível mais capaz para implementações menores;
3. registre modelo, effort, indisponibilidade e impacto esperado no `STATE.md`;
4. preserve integralmente testes, escopo, condições de parada e critérios de aceite.

Indisponibilidade nunca transforma uma task complexa em pequena.

## Contrato das task cards

Toda task deve declarar perto do cabeçalho:

- `Classe da tarefa`;
- `Modelo sugerido` e effort;
- `Validador sugerido`;
- skills/rotas necessárias;
- se pode executar em paralelo e sob quais dependências.

Toda task deve terminar com `## Prompt copiável para novo chat`: um bloco completo, sem placeholders,
que possa ser copiado sem depender da conversa anterior. O prompt inclui workspace, path da task,
modelo/effort, skills, escopo, verificação, handoff, commit, branch-base, modo de integração,
verificação pós-integração, limpeza de worktree/branch e proibição de iniciar a próxima task.

Integração local rotineira e limpeza dos recursos temporários criados pelo executor fazem parte da
autorização normal da task e não exigem uma segunda confirmação do usuário. Tasks seriais usam o
modo declarado — por padrão `git merge --ff-only` —, verificam o resultado integrado e removem
worktree e branch temporárias após o sucesso. Em tasks paralelas, o executor remove a worktree limpa
depois do commit, preserva a branch para o integrador e só o integrador apaga essa branch após
incorporá-la e validar o conjunto. Conflito, teste vermelho, árvore suja ou fast-forward impossível
preservam o estado e impedem declarar a task concluída.

## Avaliação contínua

Comparações de modelos devem medir resultado ponta a ponta: aceite na primeira tentativa, achados de
revisão, regressões, retries, tokens totais, latência e custo total. Taxa por token isolada não decide
o modelo. Uma mudança nesta política exige evidência em tasks representativas e atualização deste
documento.

## Fontes externas

- [OpenAI — orientação da família GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI — GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [OpenAI — GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol)
- [Anthropic — Claude Opus 5](https://www.anthropic.com/claude/opus)

Essas fontes descrevem produtos externos e podem mudar. A regra operacional vigente é este
documento até uma revisão explícita do projeto.
