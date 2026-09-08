# Política de modelos e agentes

**Status:** vigente

**Aplica-se a:** todo playbook, task card, implementação, especificação, auditoria e validação do
Kaezan Huntbound.

## Objetivo

Escolher modelo e effort pelo risco residual da tarefa. GPT-5.6 Luna é o executor padrão de
implementações gerais quando arquitetura, decisões e aceite já estão congelados. Os modelos frontier
— GPT-5.6 Sol, Claude Opus 5 via Claude Code e Grok 4.6 via Cursor — entram por escalonamento quando
a tarefa exige novo julgamento, permanece bloqueada ou é uma auditoria independente. Modelo sugerido
não substitui o playtest, o gate da área nem os critérios de aceite.

## Camada frontier

GPT-5.6 Sol, Claude Opus 5 e Grok 4.6 são intercambiáveis por classe de tarefa: onde a política
admite um, admite os três. A escolha entre eles é do usuário no momento da execução e considera
disponibilidade, custo e a diversidade de revisão recomendada abaixo. Preferência declarada: as tarefas
de maior risco residual vão para Claude Opus 5, sem que isso torne os demais inelegíveis.

Effort na camada frontier é `xhigh` para implementação complexa, especificação, plano e auditoria.
Grok 4.6 pode operar em `high` quando a task for de implementação geral bem especificada e o modelo
econômico não estiver disponível ou não for adequado.

Quem inicia a task escolhe o modelo conforme esta política; o `STATE.md` registra modelo e effort **efetivamente**
usados. Divergência entre sugerido e usado é desvio registrável, não erro — desde que registrada.

## Regra padrão

| Classe da tarefa | Modelo e effort padrão | Validação |
|---|---|---|
| Implementação geral bem especificada | GPT-5.6 Luna, `xhigh` | gates automatizados; camada frontier somente por escalonamento ou marco explícito |
| Especificação, plano, auditoria ou validação | camada frontier, `xhigh` | outro modelo frontier quando houver segunda revisão |
| Implementação complexa | camada frontier, `xhigh` | gate do diff; revisão independente opcional após aceite |

GPT-5.6 Terra não é modelo padrão. Seu uso exige uma avaliação registrada que demonstre melhor
custo total para aquela classe de tarefa, ou indisponibilidade dos modelos preferidos.

## Classificação obrigatória

Uma implementação é **geral e bem especificada** quando todas as condições são verdadeiras:

- resolve um único comportamento ou fronteira coesa;
- aplica arquitetura, schema, persistência e políticas já congelados sem precisar redesenhá-los;
- possui paths e critérios objetivos já conhecidos;
- no kernel/contrato, permite red-green; no resto, entrega jogável verificável pelo usuário;
- opera somente sobre estado local reconstruível ou possui rollback/gates objetivos que limitam o
  impacto da falha;
- ambiguidades relevantes possuem condição de parada e rota explícita de escalonamento.

Quantidade de arquivos, duração estimada ou presença de SQLite/importadores não tornam uma task
complexa por si sós. Uma implementação extensa pode continuar em Luna quando o trabalho é mecânico,
os contratos estão congelados e o resultado é verificável ponta a ponta.

A implementação é **complexa** quando qualquer condição abaixo for verdadeira:

- precisa decidir ou modificar contratos, schema ou arquitetura ainda não congelados;
- envolve dados não reconstruíveis, concorrência, segurança, economia ou migração com risco não
  coberto por rollback e testes objetivos;
- investiga comportamento intermitente, performance ou causa ainda desconhecida;
- atravessa múltiplos subsistemas com dependências sequenciais;
- exige julgamento significativo para definir o resultado correto.

Especificações, auditorias e gates finais usam a camada frontier mesmo quando o diff esperado é
pequeno, pois o risco está no julgamento e não na quantidade de linhas.

## Escalonamento Luna-first

Uma task de implementação **geral e bem especificada** começa em Luna e só troca para a camada
frontier quando ocorrer pelo menos
um dos gatilhos abaixo:

- a mesma causa bloqueia dois ciclos RED/GREEN consecutivos;
- concluir exige mudar decisão congelada, schema, política de identidade, allowlist ou escopo;
- o executor não consegue provar segurança, rollback, determinismo ou isolamento com os gates da
  task;
- aparece comportamento real não coberto pelo contrato e com mais de uma interpretação plausível;
- o usuário pede escalonamento ou a task é explicitamente um marco de auditoria independente.

Antes de escalar, o executor registra em `STATE.md` a evidência do bloqueio, tentativas realizadas,
decisão pendente e modelo de destino. A camada frontier não é validadora obrigatória de toda entrega
Luna; os gates automatizados são o primeiro validador, e revisão frontier fica concentrada nos marcos
e exceções de risco.

## Diversidade de revisão

- Quando uma implementação Luna atingir um marco de revisão frontier ou for escalada, deve preferir
  um modelo da camada frontier para revisão e validação.
- Quando houver revisão opcional pós-aceite, preferir modelo frontier **diferente**: Sol prefere Opus 5 ou
  Grok 4.6; Opus 5 prefere Sol ou Grok 4.6; Grok 4.6 prefere Opus 5 ou Sol.
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

A card tem **teto de 40 linhas** e seis seções (`07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`). Classe da
tarefa, modelo sugerido, effort, validador e rota de skills **saíram do cabeçalho**: quem abre o chat
escolhe modelo e effort na hora, por este documento, e registra no `STATE.md` o que **efetivamente**
usou. Um campo que só era copiado da card para o `STATE.md` não decidia nada.

O `README.md` de cada playbook pode recomendar modelo, effort e motivo por task, como solicitado
pelo usuário para PB-13–15. Essa tabela orienta a abertura do chat; o STATE registra o executor
real. Tasks complexas começam diretamente na camada frontier, conforme a classificação acima.

A card declara paralelismo apenas quando ele existe — o `README.md` do playbook é quem nomeia as
tasks que rodam ao mesmo tempo, e só elas usam branch e worktree.

A card **não** carrega prompt copiável: ele é o bloco genérico de três linhas de
`07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`, igual para toda task, do qual só o path muda. Duplicar a
card dentro dela mesma mantinha dois textos que envelheciam separados.

Commitar na `main` é a autorização normal da task e não exige segunda confirmação. Branch, worktree e
`git merge --ff-only` só existem quando o `README.md` do playbook declara duas tasks paralelas
rodando ao mesmo tempo. Conflito ou árvore suja preservam o estado e impedem declarar a task
concluída.

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
- [xAI — Grok 4.6](https://x.ai/news)

Essas fontes descrevem produtos externos e podem mudar. A regra operacional vigente é este
documento até uma revisão explícita do projeto.

Consulta de 2026-09-07: a [página oficial de Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
confirma o foco em custo e suporte a `xhigh`. A distribuição das tasks é julgamento local pelo risco,
não uma comparação experimental entre fornecedores.
