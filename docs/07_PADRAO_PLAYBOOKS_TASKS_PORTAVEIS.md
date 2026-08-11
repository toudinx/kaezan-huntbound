# Padrão de playbooks e tasks portáveis

**Status:** aceito  
**Aplica-se a:** PB-00 e todos os playbooks futuros  
**Objetivo:** permitir que cada etapa seja executada em um chat novo, com troca livre entre Codex,
Claude Code ou outro agente competente, sem carregar todo o histórico conversacional.

**Política transversal de modelos:** `08_POLITICA_MODELOS_AGENTES.md`.

## Decisão central

Um playbook não é um prompt monolítico. Ele é um índice de execução composto por **tasks coesas**.
Cada task corresponde, por padrão, a um prompt/chat independente e deixa no workspace toda a
evidência necessária para a próxima execução.

A memória do projeto vive em documentação, código, testes, artefatos de verificação e commits. Ela
não pode depender do histórico de um chat nem de lembranças específicas de um modelo.

## Unidade correta de decomposição

Tasks são divididas por **fronteira de problema**, e não por quantidade de arquivos, linhas ou tempo
estimado.

Uma task pode criar ou alterar muitos arquivos quando isso for necessário para entregar um resultado
coeso. Inicializar um repositório, criar o workspace base ou introduzir um pacote vertical pode
legitimamente tocar configurações, código, testes e documentação no mesmo prompt.

Manter o trabalho na mesma task quando:

- há um único problema claramente delimitado;
- os arquivos mudam juntos para produzir um estado íntegro;
- separar deixaria o workspace quebrado ou criaria handoffs artificiais;
- os critérios de aceite só fazem sentido para o conjunto;
- o contexto necessário continua específico e administrável.

Dividir em tasks diferentes quando:

- existem problemas ou resultados que podem ser validados independentemente;
- uma decisão ainda desconhecida bloqueia a parte seguinte;
- a execução começa a misturar arquitetura, conteúdo, UI, infraestrutura ou correções sem uma
  dependência imediata entre elas;
- partes posteriores podem falhar ou mudar sem invalidar o que já foi concluído;
- o agente precisaria carregar documentação ou código demais e não relacionado ao objetivo atual;
- outra skill, especialidade, modelo ou nível de esforço é mais apropriado para uma parte;
- o prompt acumula vários ciclos independentes de investigar, decidir, implementar e verificar.

Não existe limite normativo de arquivos por task. Uma task pequena não é necessariamente melhor;
uma task **coesa, limitada e retomável** é melhor.

## Estrutura canônica de um playbook

Cada novo playbook deve preferir esta estrutura:

```text
docs/playbooks/<PB-ID>/
  README.md
  STATE.md
  tasks/
    <PB-ID>-01-<slug>.md
    <PB-ID>-02-<slug>.md
    ...
```

### `README.md`

É o mapa do playbook. Deve conter:

- objetivo e resultado final;
- escopo e exclusões;
- decisões congeladas;
- critérios finais de aceite;
- tabela ordenada das tasks;
- dependências e oportunidades de paralelismo;
- arquivos normativos que vencem em caso de conflito.

### `STATE.md`

É o handoff persistente entre chats e modelos. Deve registrar somente estado operacional útil:

- status de cada task: `pending`, `in_progress`, `done` ou `blocked`;
- última task concluída e próxima task elegível;
- commits e artefatos produzidos;
- verificações executadas e seus resultados;
- decisões descobertas durante a execução e onde foram documentadas;
- bloqueios reais e dados necessários para removê-los.

O `STATE.md` não substitui ADRs, specs nem documentação técnica. Decisões duráveis devem ser
registradas na fonte apropriada e apenas referenciadas nele.

### `tasks/*.md`

Cada arquivo é uma task card e também a especificação do prompt daquela execução. A task deve ser
autossuficiente por referências: ela não precisa repetir todo o contexto do projeto, mas deve apontar
exatamente o que o agente precisa ler.

## Contrato obrigatório de uma task card

Cada task deve declarar:

1. **ID e título.**
2. **Objetivo da execução.** Qual problema limitado será resolvido.
3. **Resultado esperado.** Estado observável que deve existir ao final.
4. **Dependências.** Tasks, decisões ou artefatos que precisam estar concluídos.
5. **Leitura mínima.** A própria task, `STATE.md` e somente os arquivos realmente relevantes.
6. **Decisões congeladas.** O que o agente não pode redesenhar.
7. **Escopo permitido.** Áreas que podem ser alteradas; paths exatos quando já forem conhecidos.
8. **Fora de escopo.** Problemas próximos que pertencem a outras tasks.
9. **Instruções de execução.** Passos suficientes para eliminar ambiguidade, sem prescrever detalhes
   irrelevantes que o agente pode descobrir no workspace.
10. **Verificação.** Testes, builds, inspeções, screenshots ou medições obrigatórias.
11. **Critérios de aceite.** Condições objetivas para considerar a task concluída.
12. **Condições de parada.** Decisões novas, inconsistências ou riscos que exigem bloquear e relatar.
13. **Persistência do handoff.** Atualização exigida em `STATE.md` e em ADR/spec quando aplicável.
14. **Commit.** Resultado deve ser versionado quando já existir repositório Git; a task de
    inicialização do repositório cria o primeiro baseline.
15. **Relatório final.** Resumo de mudanças, verificações, desvios e próxima task elegível.
16. **Prompt copiável.** Bloco final sem placeholders, pronto para abrir a task em um chat novo, com
    workspace, path da task, modelo/effort, skills, escopo, verificações, handoff e commit.

Testes devem preceder a implementação quando a mudança tiver comportamento testável. Tasks de
auditoria, documentação, infraestrutura inicial ou spikes podem usar outra evidência apropriada, que
deve estar explicitamente definida na task card.

## Protocolo de execução: um prompt por task

1. Abrir um chat novo no agente escolhido.
2. Informar o workspace e o path da task card.
3. Mandar o agente ler `STATE.md` e apenas as referências listadas na task.
4. Executar somente aquela task; não antecipar a seguinte por conveniência.
5. Verificar os critérios de aceite com evidência fresca.
6. Atualizar o handoff persistente.
7. Criar o commit previsto, se Git já estiver disponível.
8. Encerrar o chat com um relatório curto e iniciar a próxima task em outro chat.

Uma correção pequena descoberta durante a execução pode permanecer na mesma task quando for
necessária para alcançar seu critério de aceite. Um problema independente deve ser registrado como
nova task, sem expandir silenciosamente o prompt atual.

## Portabilidade entre agentes e modelos

O conteúdo funcional da task deve ser neutro em relação ao fornecedor. Instruções específicas de
Codex, Claude Code ou skills ficam em um adaptador curto, sem alterar objetivo, escopo ou aceite.

Para permitir troca de agente entre quaisquer duas tasks:

- não usar frases como “continue de onde paramos” sem apontar o estado persistido;
- não depender de anexos ou decisões presentes apenas no chat anterior;
- registrar versões, comandos e paths descobertos durante a execução;
- manter contratos e decisões duráveis em arquivos normativos;
- exigir inspeção do estado real do workspace antes de editar;
- preferir critérios executáveis a descrições subjetivas de conclusão;
- registrar todo desvio aprovado da task original.

A escolha de modelo e effort é feita por task conforme `08_POLITICA_MODELOS_AGENTES.md`. Cada task
declara classe, modelo sugerido, validador sugerido e fallback. A revisão crítica prefere modelo
diferente do implementador. Ausência do modelo recomendado deve ser registrada, sem reduzir gates.

## Tasks paralelas

Tasks só podem executar em paralelo quando o `README.md` do playbook declarar paths e dependências
independentes. Cada chat usa worktree e branch isolados. Verificações que disputem porta, banco,
fixture mutável ou output compartilhado são serializadas. Atualizações concorrentes em `STATE.md` e
`README.md` são integradas por um único responsável depois dos commits funcionais.

## Prompt mínimo para executar uma task

```text
Trabalhe no workspace <PATH-ABSOLUTO>.

Execute integralmente e somente a task:
<PATH-DA-TASK-CARD>

Leia o STATE.md do playbook e apenas os arquivos adicionais indicados pela task.
Inspecione o estado real do workspace antes de editar. Preserve decisões congeladas e não antecipe
tasks posteriores.

Implemente o escopo, execute todas as verificações, atualize o handoff persistente e produza o commit
solicitado quando Git estiver disponível.

Se uma decisão não coberta, inconsistência ou risco impedir a conclusão segura, pare, registre o
bloqueio e informe exatamente o que precisa ser decidido. Não amplie o escopo silenciosamente.
```

Skills ou modos específicos do agente podem ser acrescentados antes desse bloco, mas não substituem
a task card como fonte de verdade.

Cada task card contém sua própria versão preenchida desse prompt. O bloco genérico acima serve apenas
como referência para autores de playbooks e não deve ser entregue ao executor com placeholders.

## Checklist para criar um novo playbook

- [ ] O playbook referencia este padrão como diretriz transversal.
- [ ] O resultado final e o fora de escopo estão explícitos.
- [ ] As tasks foram separadas por problemas, decisões e gates reais, não por número de arquivos.
- [ ] Cada task pode começar em um chat limpo.
- [ ] Cada task declara leitura mínima e não exige carregar toda a documentação.
- [ ] Dependências e possíveis paralelismos estão explícitos.
- [ ] Toda task possui evidência de conclusão adequada ao tipo de trabalho.
- [ ] Toda task declara modelo/effort, validador e prompt copiável sem placeholders.
- [ ] `STATE.md` permite trocar de agente sem reconstruir o histórico.
- [ ] Nenhuma decisão importante existe apenas dentro dos prompts.
- [ ] O fechamento do playbook valida o resultado integrado, sem refazer todas as tasks no mesmo chat.

## Antipadrões proibidos

- Um único chat para planejar, implementar e depurar todo o playbook.
- Fragmentar uma mudança coesa apenas para cumprir limite de arquivos ou linhas.
- Repetir o contexto mestre inteiro em todo prompt quando referências precisas bastam.
- Marcar task como concluída sem verificação fresca.
- Deixar decisões, comandos ou bloqueios apenas no relatório do chat.
- Permitir que uma task absorva problemas independentes encontrados no caminho.
- Presumir que o próximo agente será o mesmo modelo ou terá acesso à conversa anterior.
