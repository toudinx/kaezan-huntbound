# Design — Supervisor durável de playbooks

**Data:** 2026-08-12

**Status:** aprovado para planejamento

**Aplica-se a:** implementações complexas decompostas em playbooks com uma ou mais task cards

## Contexto

O padrão atual já decompõe um playbook em tasks coesas, executadas em chats independentes. Essa
separação preserva contexto, limita escopo e torna cada resultado verificável. O custo operacional,
porém, ainda recai sobre o usuário: abrir o próximo chat, copiar o prompt da task, acompanhar sua
conclusão, reconhecer dependências liberadas e iniciar o gate integrado.

Esse trabalho manual transforma uma fila tecnicamente automatizável em uma sequência que depende da
presença contínua do usuário. Se seis tasks levarem trinta minutos cada, o usuário precisa retornar a
cada transição mesmo quando nenhuma decisão de produto é necessária.

## Decisão

Criar um **Supervisor durável de playbooks** que trate o playbook como um grafo acíclico dirigido
(DAG), dispare um chat isolado para cada task elegível, espere eventos de conclusão e libere
automaticamente as dependências seguintes.

O supervisor é somente um scheduler. Ele não implementa, revisa código, interpreta logs extensos nem
substitui os gates das task cards. Cada worker continua responsável pelo ciclo integral definido na
task: worktree/branch, implementação, testes, commit, integração aplicável, atualização de `STATE.md`
e limpeza.

Quando o playbook exigir validação integrada, o supervisor cria, após todas as implementações
estarem integradas, um chat novo com GPT-5.6 Sol `high`. Se o gate aprovar, o playbook termina. Se
reprovar, o resultado gera uma proposta de playbook FIX, cuja aprovação humana reinicia o mesmo
fluxo de execução.

## Objetivos

- remover a necessidade de o usuário disparar manualmente cada task;
- preservar um chat e contexto independentes por task;
- executar em paralelo somente tasks elegíveis e isoladas;
- respeitar automaticamente dependências seriais e pontos de fan-in;
- concentrar implementação em GPT-5.6 Luna `xhigh`;
- consultar GPT-5.6 Sol `high` somente por gatilhos técnicos objetivos;
- usar GPT-5.6 Sol `high` no gate integrado, quando o playbook exigir esse gate;
- manter o contexto e o consumo do supervisor pequenos;
- produzir estado e handoffs suficientes para recuperar uma execução interrompida;
- criar um ciclo explícito e auditável entre reprovação integrada e playbook FIX.

## Não objetivos

- transformar o supervisor em implementador ou revisor;
- executar todas as tasks em um único chat;
- eliminar specs, critérios de aceite ou task cards autossuficientes;
- fazer polling frequente de workers;
- copiar logs completos dos workers para o supervisor;
- corrigir findings dentro do chat que executou o gate integrado;
- ampliar silenciosamente o escopo após uma reprovação;
- criar um gate frontier para toda alteração simples por padrão;
- substituir autorização humana para um novo playbook FIX.

## Terminologia

- **Playbook:** unidade aprovada de entrega, composta por task cards e um grafo de execução.
- **Task card:** contrato autossuficiente de uma execução em chat isolado.
- **Supervisor:** chat durável que agenda, acompanha e libera tasks.
- **Worker:** chat GPT-5.6 Luna `xhigh` que executa exatamente uma task de implementação ou correção.
- **Árbitro técnico:** consulta curta a GPT-5.6 Sol `high` usada por um worker após gatilho objetivo.
- **Gate integrado:** validação independente do resultado já integrado, executada por GPT-5.6 Sol
  `high` em chat novo.
- **Playbook FIX:** novo escopo corretivo derivado de findings bloqueantes do gate integrado.
- **Onda:** conjunto de tasks elegíveis que podem executar simultaneamente.
- **Fan-in:** ponto serial que combina ou depende dos resultados de uma onda paralela.

## Artefatos canônicos

Um playbook supervisionável mantém os artefatos humanos existentes e adiciona um manifesto legível
por máquina:

```text
docs/playbooks/<PLAYBOOK>/
  README.md
  STATE.md
  ORCHESTRATION.yaml
  artifacts/
  tasks/
```

### `README.md`

Continua sendo o índice humano, descrevendo objetivo, escopo, critérios integrados e ordem lógica.

### `STATE.md`

Continua sendo o estado operacional versionado: status por task, branch, commit, evidência,
decisões, bloqueios e próxima elegibilidade. Nenhuma decisão durável pode existir somente no chat do
supervisor.

### `ORCHESTRATION.yaml`

Declara o DAG e a política de execução sem duplicar o conteúdo das task cards. O manifesto é
versionado e validado antes de qualquer worker ser criado.

Exemplo equivalente ao restante do PB-01:

```yaml
schemaVersion: 1
playbook: PB-01
baseBranch: main
maxConcurrency: 2

tasks:
  - id: PB-01-04
    kind: implementation
    taskCard: tasks/PB-01-04-importar-vocacao-e-itens-xml.md
    dependsOn: [PB-01-03]
    model: gpt-5.6-luna
    effort: xhigh
    integrationMode: preserve-branch
    exclusiveResources: []

  - id: PB-01-05
    kind: implementation
    taskCard: tasks/PB-01-05-importar-criaturas-e-spell-lua.md
    dependsOn: [PB-01-03]
    model: gpt-5.6-luna
    effort: xhigh
    integrationMode: preserve-branch
    exclusiveResources: []

  - id: PB-01-06
    kind: integration
    taskCard: tasks/PB-01-06-materializar-e-exportar-slice.md
    dependsOn: [PB-01-04, PB-01-05]
    model: gpt-5.6-luna
    effort: xhigh
    integrationMode: fan-in
    exclusiveResources: [git:main]

finalGate:
  task: PB-01-07
  taskCard: tasks/PB-01-07-fechar-gate-integrado.md
  dependsOn: [PB-01-06]
  model: gpt-5.6-sol
  effort: high
  required: true
```

O schema do manifesto deve rejeitar IDs duplicados, dependências ausentes, ciclos, models/efforts
inválidos, task cards inexistentes, `maxConcurrency` menor que um e gate que dependa de task não
declarada ou não concluída.

### Ledger local de execução

Metadados efêmeros da plataforma ficam em
`.cache/playbook-supervisor/<PLAYBOOK>.json`, nunca no Git:

- identificador da execução;
- task/chat ativo e host correspondente;
- cursor do último evento consumido;
- horário da última transição;
- tentativa atual;
- hash do manifesto usado para iniciar a execução.

Esse ledger é reconstruível. `STATE.md`, Git e a lista de chats continuam sendo as fontes para
recuperar uma execução se a cache desaparecer.

## Papéis e política de modelos

| Papel | Modelo | Effort | Escopo |
|---|---|---|---|
| Supervisor | GPT-5.6 Luna | `low` | agenda, espera e transiciona estado |
| Worker | GPT-5.6 Luna | `xhigh` | implementa exatamente uma task |
| Árbitro técnico | GPT-5.6 Sol | `high` | decide uma ambiguidade técnica delimitada |
| Gate integrado | GPT-5.6 Sol | `high` | valida o resultado integrado em contexto limpo |

Luna `low` é suficiente para o supervisor somente porque `ORCHESTRATION.yaml` torna o agendamento
determinístico. Sem manifesto válido, o supervisor não tenta inferir um DAG a partir de prosa.

Esta decisão altera, para playbooks supervisionados, o default vigente que sugere Sol `xhigh` para
todo gate final. A implementação deste design deve atualizar `docs/08_POLITICA_MODELOS_AGENTES.md`
para registrar Sol `high` como padrão do gate integrado, preservando a possibilidade de um playbook
explicitamente justificar outro effort.

## Preflight obrigatório

Antes de criar qualquer worker, o supervisor ou um validador determinístico confirma:

1. `README.md`, `STATE.md`, `ORCHESTRATION.yaml` e todas as task cards existem;
2. o manifesto é válido e não possui ciclos;
3. todas as dependências externas ao manifesto constam como `done` em `STATE.md`;
4. a branch-base e o commit-base esperados existem;
5. a árvore principal está no estado exigido pelo playbook;
6. tasks paralelas não compartilham paths mutáveis, portas ou outputs exclusivos sem declarar um
   recurso de exclusão;
7. cada task possui modelo, effort, critérios de aceite, gates, handoff e protocolo Git;
8. o gate final, quando requerido, possui critérios integrados objetivos;
9. não existe outra execução ativa do mesmo playbook e manifesto.

Falha de preflight não consome uma tentativa de implementação e não cria chats trabalhadores.

## Máquina de estados do supervisor

```text
PRECHECK
  -> READY
  -> DISPATCHING
  -> WAITING
  -> COLLECTING
  -> READY                 enquanto restarem tasks elegíveis
  -> INTEGRATED_GATE       quando todas as implementações terminarem
  -> COMPLETED             em APPROVED
  -> HUMAN_REQUIRED_FIX_APPROVAL   em CHANGES_REQUIRED
```

Estados excepcionais:

```text
NEEDS_ATTENTION            worker pede atenção prevista pelo contrato
BLOCKED                    ambiente ou dependência impede progresso
ABORTED                    manifesto mudou ou a execução foi cancelada
```

O supervisor persiste a transição antes de disparar o próximo efeito externo. Reiniciar uma
transição deve ser idempotente: uma task já associada a um chat ativo não pode ganhar um segundo
worker por repetição acidental.

## Algoritmo de agendamento

Uma task está elegível quando:

- seu status ainda não é `done`;
- todas as entradas de `dependsOn` estão `done` e integradas conforme o contrato;
- nenhum `exclusiveResource` está reservado por outra task ativa;
- existe slot dentro de `maxConcurrency`;
- sua branch/worktree de destino não está associada a outra execução ativa.

O supervisor cria todos os workers elegíveis da mesma onda até o limite de concorrência, registra os
identificadores e espera eventos de conclusão ou atenção. Tempo ocioso não inicia novos ciclos de
inferência nem executa polling periódico.

Ao receber um resultado:

1. valida o envelope de handoff;
2. confirma que `STATE.md` e Git representam o status declarado;
3. libera recursos exclusivos;
4. marca a task como concluída ou necessitando atenção;
5. recalcula a fila elegível;
6. dispara a próxima onda ou o gate final.

O supervisor não julga se o código está correto. Ele verifica somente condições objetivas do
handoff e deixa correção funcional para os gates da task e para o gate integrado.

## Isolamento, paralelismo e integração

- Cada worker escritor usa branch/worktree exclusiva.
- Tasks sem dependência entre si ainda são serializadas se disputarem recurso exclusivo.
- `git:main` é um mutex: duas tasks não integram simultaneamente a branch-base.
- Workers de uma onda paralela removem worktrees limpas após o commit e preservam branches, conforme
  a política vigente.
- O fan-in declarado incorpora branches serialmente e verifica o conjunto.
- Conflito de integração não autoriza merge commit, rebase ou force-delete fora do protocolo da
  task.
- O supervisor não edita código para resolver conflitos.

O PB-01 usa a onda `PB-01-04 + PB-01-05`, seguida do fan-in `PB-01-06` e do gate `PB-01-07`.

## Contrato de autonomia do worker

O worker executa integralmente a task sem pedir orientação sobre escolhas técnicas já cobertas pelo
escopo. Ele pode decidir de forma autônoma quando a escolha:

- aplica decisões congeladas e padrões existentes;
- é local e reversível;
- não amplia escopo nem altera contratos;
- pode ser comprovada pelos testes e gates da task.

### Gatilhos para árbitro Sol `high`

O worker consulta automaticamente um árbitro quando:

- task, spec, arquitetura e código se contradizem;
- há mais de uma interpretação plausível de um contrato;
- concluir exige julgamento arquitetural com impacto em tasks futuras;
- dois ciclos RED/GREEN falham pela mesma causa sem diagnóstico suficiente;
- não é possível provar determinismo, rollback, isolamento ou segurança;
- uma condição de parada técnica da task é atingida.

O árbitro recebe somente um pacote delimitado:

```yaml
problem: descrição objetiva
frozenConstraints: []
evidence: []
options: []
workerRecommendation: decisão preferida e justificativa
requestedDecision: pergunta técnica única
```

Ele responde com `continue_with_decision` ou `blocked`. Em `continue_with_decision`, o worker registra
a decisão em `STATE.md` ou na documentação durável adequada e continua sem intervenção humana. O
árbitro não edita a branch do worker.

## Handoff obrigatório do worker

O retorno final deve ser pequeno e estruturado:

```yaml
status: done
task: PB-01-04
baseCommit: <commit-base-real>
resultCommit: <commit-resultante-real>
branch: codex/pb01-04-xml-importers
integration:
  mode: preserve-branch
  ready: true
gates:
  - command: <comando-real-executado>
    exitCode: 0
decisions: []
risks: []
nextEligible: []
```

Os valores entre sinais de menor/maior são notação de schema nesta spec; task cards e resultados
reais não podem manter placeholders.

Status válidos:

- `done`: task, gates e protocolo Git terminaram conforme o contrato;
- `needs_attention`: existe uma ação prevista e recuperável antes de continuar;
- `blocked`: não há progresso seguro possível com as fontes e autorizações disponíveis.

Saída textual livre pode acompanhar o envelope, mas não o substitui.

## Política proporcional de validação

Validação frontier não é obrigatória por contagem de arquivos nem por duração. O manifesto escolhe
uma das políticas:

| Cenário padrão | Execução | Validação final |
|---|---|---|
| Uma implementação simples e coesa | um worker Luna `xhigh` | gates da própria task |
| Playbook com múltiplas tasks integradas | supervisor executa o DAG | Sol `high` integrado |
| FIX simples e localizado | uma task Luna `xhigh` | aceite específico e gates da task |
| FIX complexo ou distribuído | novo playbook supervisionado | novo gate Sol `high` |

Uma task única de risco elevado pode exigir gate integrado por decisão explícita. Um playbook com
várias tasks totalmente independentes pode dispensá-lo somente quando cada resultado possuir aceite
completo e não existir comportamento integrado a validar.

## Gate integrado

O gate começa somente quando todas as tasks requeridas estão integradas, a branch-base está no
commit esperado e o workspace está limpo. O chat usa contexto novo e lê specs, playbook, estado,
diffs integrados e critérios de aceite; não herda transcripts dos workers.

O gate:

- reproduz evidência fresca;
- valida interações entre tasks;
- não aceita apenas os relatos dos workers;
- não altera código do produto;
- não transforma falha bloqueante em warning para concluir;
- retorna um envelope estruturado.

Resultado aprovado:

```yaml
verdict: approved
blockingFindings: []
warnings: []
evidence: []
```

Resultado reprovado:

```yaml
verdict: changes_required
findings:
  - id: PB-01-FIX-01
    problem: descrição reproduzível
    evidence: comando ou artefato
    affectedScope: []
    acceptance: critérios objetivos da correção
```

## Ciclo de playbook FIX

`changes_required` não autoriza correção silenciosa no mesmo ciclo. O finding representa novo
escopo e precisa virar uma proposta explícita. Depois de emitir o veredito, o mesmo chat Sol do gate
pode criar somente os artefatos documentais dessa proposta; ele não implementa a correção nem altera
código do produto:

1. findings simples e independentes podem formar uma única task FIX;
2. findings relacionados, distribuídos ou dependentes formam um novo playbook FIX;
3. o playbook FIX referencia o playbook e o gate que o originaram;
4. sua spec congela escopo, aceite, dependências e política de validação;
5. o supervisor entra em `HUMAN_REQUIRED_FIX_APPROVAL`;
6. após aprovação humana, o FIX volta ao início do mesmo algoritmo;
7. FIX simples pode terminar pelos gates da própria task;
8. FIX complexo executa novo gate Sol `high` e pode produzir outro ciclo.

O loop termina somente em `approved`, cancelamento explícito ou bloqueio externo sem solução dentro
das autorizações do projeto. Findings repetidos entre ciclos devem ser preservados no histórico; não
podem ser renomeados para esconder recorrência.

## Fronteira humana

Durante uma execução válida e completamente especificada, não há checkpoint humano entre tasks. A
aprovação humana acontece fora ou na fronteira do ciclo:

1. aprovação do playbook inicial antes de iniciar o supervisor;
2. aprovação de um playbook FIX após `changes_required`.

O segundo caso é o único estado `human_required` planejado durante a execução supervisionada. Ele
não pede ao usuário que resolva a implementação; pede somente aprovação do novo escopo corretivo
antes de consumir outra rodada de execução.

Decisões técnicas intermediárias seguem a rota Luna → árbitro Sol `high` → continuação. Falhas de
infraestrutura, credenciais ausentes, fonte externa indisponível ou ação que exija nova autoridade
são abortos excepcionais, não checkpoints normais do desenho.

## Eficiência de contexto e tokens

O supervisor deve representar uma fração pequena do consumo total. Para isso:

- usa Luna `low`;
- lê o manifesto e resumos, não o código do produto;
- recebe apenas envelopes de handoff;
- espera por eventos, sem polling frequente;
- não incorpora logs completos ao transcript;
- mantém estado durável em arquivos;
- compacta seu contexto quando necessário;
- cria workers com contexto novo e leitura mínima;
- envia ao árbitro Sol apenas o pacote de decisão;
- reserva o gate Sol para entregas que exigem validação integrada.

Paralelismo reduz tempo de parede, não tokens totais dos workers. O objetivo do supervisor é evitar
overhead significativo e impedir que um chat monolítico carregue o histórico de todas as tasks em
cada etapa.

## Recuperação e idempotência

Após reinício do app ou do chat supervisor:

1. ler `ORCHESTRATION.yaml` e comparar seu hash com o ledger;
2. ler `STATE.md` e Git para reconstruir tasks concluídas;
3. reconciliar chats ainda ativos pelo identificador registrado;
4. nunca redisparar uma task com worker ativo;
5. nunca aceitar `done` sem commit/gates exigidos;
6. recalcular a fila somente após a reconciliação;
7. exigir novo preflight se o manifesto mudou.

Criar um worker e registrar seu identificador deve funcionar como uma única transição lógica. Se a
plataforma falhar entre as duas operações, a reconciliação procura o chat pelo ID/título de execução
antes de criar outro.

## Observabilidade

O supervisor emite atualizações somente em transições relevantes:

- playbook/preflight iniciado;
- onda disparada;
- task concluída, bloqueada ou pedindo atenção;
- fan-in liberado;
- gate integrado iniciado;
- veredito aprovado;
- proposta de FIX aguardando revisão.

O relatório final lista playbook, duração, tasks, modelos/efforts efetivos, commits integrados,
gates, consultas Sol, findings, ciclos FIX e veredito. Métricas de avaliação futura incluem tempo de
parede, tokens do supervisor, tokens dos workers, número de escalonamentos, retries e findings por
gate.

## Segurança operacional

- O supervisor não amplia permissões de workers.
- Cada task mantém sandbox e política de aprovação aplicáveis ao workspace.
- Worktrees e branches só são removidas pelas regras seguras vigentes.
- Nenhuma execução concorrente escreve no mesmo checkout.
- Recursos exclusivos são declarados, não inferidos durante a disputa.
- Ações externas, destrutivas ou irreversíveis continuam exigindo autorização explícita quando não
  estiverem claramente incluídas no playbook aprovado.
- O gate não ganha autoridade para corrigir ou integrar findings.

## Critérios de aceite do design

- Um playbook aprovado pode avançar por todas as tasks sem disparos manuais intermediários.
- Cada task executa em chat isolado e recebe somente seu contrato e leitura mínima.
- O supervisor paraleliza o DAG sem permitir disputa de checkout, branch-base ou recurso exclusivo.
- Dependências seriais e fan-ins são liberados somente após handoffs objetivos.
- Workers Luna `xhigh` consultam Sol `high` apenas após gatilhos registrados.
- O gate integrado usa Sol `high` em chat novo e não edita código.
- Implementações e FIXes simples podem dispensar gate independente.
- Reprovação integrada produz proposta de task/playbook FIX e aguarda aprovação humana.
- Reinício não duplica workers nem perde tasks já integradas.
- `STATE.md`, Git e artefatos preservam evidência suficiente sem depender do transcript.
- O supervisor espera por eventos e não consome tokens continuamente enquanto workers executam.

## Impactos documentais de uma implementação futura

Uma implementação aprovada deste design deverá:

- atualizar `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md` com manifesto, handoff e execução
  supervisionada;
- atualizar `docs/08_POLITICA_MODELOS_AGENTES.md` com supervisor Luna `low`, árbitro Sol `high` e
  gate integrado Sol `high`;
- definir o schema versionado de `ORCHESTRATION.yaml`;
- definir o schema de handoff do worker e do gate;
- criar o mecanismo reutilizável que inicia, espera e reconcilia chats;
- migrar um playbook piloto antes de tornar o supervisor padrão para novos playbooks.

## Fora de escopo desta spec

- implementar agora o supervisor;
- migrar o PB-01 durante a autoria deste documento;
- alterar task cards ou políticas vigentes antes de um plano aprovado;
- criar automação agendada ou CI para executar playbooks com o app fechado;
- estimar preço exato de uma execução no plano do usuário;
- escolher um fornecedor alternativo quando os modelos declarados estiverem disponíveis.
