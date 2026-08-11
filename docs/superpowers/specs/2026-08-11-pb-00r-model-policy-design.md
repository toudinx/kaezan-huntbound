# Design — PB-00R e política transversal de modelos

**Data:** 2026-08-11

**Status:** aprovado para detalhamento

**Origem:** auditoria independente do PB-00 na árvore `e93a7c4`

## Objetivo

Criar um playbook corretivo separado, `PB-00R`, que resolva quatro achados da auditoria sem apagar o
histórico do PB-00, e tornar normativa a política de seleção de modelos para todos os playbooks
futuros.

O PB-00 permanece como registro do que foi entregue e auditado. Enquanto o PB-00R estiver aberto, o
roteiro geral deve tratar PB-01 como não elegível. O PB-00R só fecha depois de uma auditoria integrada
com evidência fresca.

## Estrutura documental

O playbook corretivo seguirá `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`:

```text
docs/playbooks/PB-00R/
  README.md
  STATE.md
  artifacts/
    acceptance-report.md
  tasks/
    PB-00R-01-redesenhar-playfield-no-resize.md
    PB-00R-02-estabilizar-budget-de-boot.md
    PB-00R-03-fechar-descoberta-de-testes-por-package.md
    PB-00R-04-limpar-output-de-build.md
    PB-00R-05-revalidar-gate-integrado.md
```

Cada task card será autossuficiente, indicará leitura mínima, paths permitidos, fora de escopo,
procedimento red-green quando houver comportamento testável, comandos obrigatórios, critérios de
parada, handoff e commit esperado.

### Prompt copiável obrigatório

Toda task card terminará com `## Prompt copiável para novo chat`. O bloco será executável por cópia
e cola, sem `TBD`, `TODO`, `<PATH>`, `<MODELO>` ou outro placeholder que exija completar o texto.

Cada prompt deve declarar explicitamente:

- o workspace esperado `C:\Kaezan\kaezan-huntbound` e o path exato da task card;
- a classe da tarefa, o modelo/effort sugerido e as skills obrigatórias;
- que somente a task indicada pode ser executada;
- as leituras mínimas, decisões congeladas e condições de parada da própria task;
- a obrigação de começar por teste falhando quando houver comportamento testável;
- os comandos de verificação, a atualização de `STATE.md` e o commit esperado;
- a proibição de iniciar a próxima task no mesmo chat;
- para tasks da mesma onda paralela, a exigência de worktree e branch isolados antes de editar.

O prompt pode mandar o agente ler a task card em vez de duplicar todo o seu conteúdo, mas não pode
depender de histórico de conversa, anexos não versionados ou instruções que existam apenas no chat
que criou o playbook.

## Decomposição das correções

### PB-00R-01 — Redesenhar o playfield no resize

- Reproduzir o defeito com boot em `390×844` seguido de resize, na mesma página, para `1366×768`.
- Adicionar primeiro um teste Playwright que falhe porque a grade permanece limitada à largura
  original.
- Redesenhar somente a geometria de apresentação em `Phaser.Scale.Events.RESIZE`.
- Remover o listener no shutdown da scene.
- Preservar `SceneBridge`, lifecycle e ausência de gameplay na scene.
- Capturar e revisar screenshot pós-resize; não regenerar baselines sem mudança visual deliberada.

### PB-00R-02 — Estabilizar o budget de boot

- Preservar Fast 4G, cache frio, limite de `5.000 ms`, um worker e ausência de retry para a medição.
- Tornar toda execução diagnóstica: registrar o mark, recursos críticos, transfer size e timings
  suficientes para separar custo real do bundle de flutuação do harness.
- Reproduzir a variação observada: duas execuções abaixo do limite e uma com mark de `12.328,8 ms`.
- Não aumentar o budget, aceitar retry nem aquecer cache para obter aprovação.
- Considerar a task concluída apenas após uma sequência explícita de execuções frias em processos
  limpos, definida na task card, sem falha.

### PB-00R-03 — Fechar descoberta de testes por package

- Criar uma prova negativa: um package com teste, mas sem script `test`, deve fazer o gate de
  configuração falhar.
- Tornar obrigatório um script `test` não mascarado em todo package do workspace.
- Packages ainda vazios devem usar uma forma determinística que aceite ausência de testes sem
  esconder testes futuros.
- Manter Playwright exclusivamente em `qa:browser`.
- Demonstrar que um teste temporário em package passa a ser descoberto sem editar o script raiz.

### PB-00R-04 — Limpar output de build

- Reproduzir o aviso de `outDir` externo não esvaziado.
- Configurar limpeza explícita e limitada de `dist/game` no Vite.
- Provar com um arquivo sentinela dentro de `dist/game` que um build subsequente o remove.
- Não introduzir limpeza genérica, comando destrutivo próprio ou alteração de bundling.
- O aviso de chunk Phaser acima de 500 kB continua fora do escopo.

### PB-00R-05 — Revalidar gate integrado

- Executar instalação congelada e todos os gates com working tree inicialmente limpa.
- Reexecutar o resize pós-boot e revisar a screenshot no tamanho original.
- Executar a sequência fria normativa do budget de boot.
- Provar que todos os packages declaram e executam o contrato de testes.
- Provar que o build limpa somente o output esperado.
- Atualizar `acceptance-report.md`, `STATE.md`, o índice PB-00R e o roteiro geral.
- Liberar PB-01 somente se todos os critérios tiverem evidência fresca.

## Dependências e paralelismo

As tasks não serão executadas simultaneamente no mesmo checkout. Quando houver agentes paralelos,
cada um deve usar worktree isolado e commits independentes; a integração ocorre antes do gate final.

```text
Onda 1 (paralela): PB-00R-01 + PB-00R-03 + PB-00R-04
Onda 2:            PB-00R-02, após PB-00R-04
Onda 3:            PB-00R-05, após PB-00R-01/02/03/04
```

`PB-00R-01` usa o servidor Playwright na porta 4173. Nenhuma outra task que inicialize o mesmo
servidor pode verificar em paralelo no mesmo host. Atualizações em `STATE.md` e `README.md` são
integradas de forma serial para evitar conflitos documentais.

## Política transversal de modelos

Será criado `docs/08_POLITICA_MODELOS_AGENTES.md` e o padrão de playbooks passará a referenciá-lo.
Cada task card deve declarar classe da tarefa, modelo/effort sugerido e perfil do validador.

### Regra padrão

- **Implementação menor e bem especificada:** `gpt-5.6-luna`, effort `xhigh`.
- **Especificação, auditoria e validação:** `gpt-5.6-sol`, effort `xhigh`, ou Claude Opus 5 com
  effort alto equivalente.
- **Implementação complexa:** `gpt-5.6-sol`, effort `xhigh`, ou Claude Opus 5 com effort alto
  equivalente.
- **Terra:** não é modelo padrão; só pode ser escolhido quando uma avaliação registrada demonstrar
  melhor custo total ou disponibilidade exigir fallback.
- **Diversidade de revisão:** validações críticas usam modelo diferente do implementador sempre que
  a plataforma permitir. Uma implementação Luna deve preferir Sol ou Opus 5 na revisão.
- **Indisponibilidade:** usar o modelo frontier disponível mais próximo e registrar o desvio em
  `STATE.md`; a falta do modelo sugerido nunca permite reduzir testes ou critérios.

A política é uma regra operacional do projeto, não uma alegação de equivalência entre fornecedores.
A seleção continua subordinada ao escopo e aos gates objetivos da task. A documentação oficial da
OpenAI classifica Luna para workloads eficientes e de alto volume, Sol para capacidade frontier e
suporta `xhigh`; também recomenda medir a vantagem do effort em tarefas representativas.

## Rotas Game Studio

- `PB-00R-01`: `game-studio:phaser-2d-game` + `game-studio:game-playtest`.
- `PB-00R-02`: `game-studio:game-playtest` + `superpowers:systematic-debugging`.
- `PB-00R-03`: `game-studio:web-game-foundations` + `superpowers:test-driven-development`.
- `PB-00R-04`: `game-studio:web-game-foundations` + `superpowers:test-driven-development`.
- `PB-00R-05`: `game-studio:game-playtest` + `superpowers:verification-before-completion`.

Todas as implementações comportamentais começam por teste falhando. O fechamento usa um modelo de
validação diferente dos implementadores quando possível.

## Critérios de aceite do design

- Os quatro comentários da auditoria possuem uma task corretiva coesa.
- Há uma task separada de fechamento integrado.
- Dependências, ondas paralelas e restrição da porta 4173 estão explícitas.
- PB-01 permanece bloqueado durante o PB-00R.
- A política de modelos vale para todos os playbooks futuros e prevê indisponibilidade.
- Cada task possui prompt de implementação ou validação pronto para copiar em um chat novo.
- Nenhum critério do PB-00 é reduzido para facilitar o fechamento.

## Fora de escopo

- Implementar as quatro correções durante a autoria do playbook.
- Iniciar PB-01.
- Code splitting do Phaser, PWA, multi-browser, gameplay, assets ou backend.
- Automatizar seleção de fornecedor/modelo fora das task cards.
