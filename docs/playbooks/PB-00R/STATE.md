# PB-00R — Estado operacional

**Status geral:** pending

**Próxima onda elegível:** PB-00R-01 e PB-00R-03, em worktrees isolados. PB-00R-02 está
`blocked` por um congelamento intermitente de ~10,0 s dentro da pilha de rede do Chromium sob
`Network.emulateNetworkConditions`, agora isolado por controles com uma variável por vez.

**PB-01:** bloqueado até PB-00R-05 aprovar o gate integrado.

## Tasks

| Task | Status | Branch sugerida | Commit | Evidência |
|---|---|---|---|---|
| PB-00R-01 | pending | `codex/pb00r-01-resize` | — | — |
| PB-00R-03 | pending | `codex/pb00r-03-package-tests` | — | — |
| PB-00R-04 | done | `codex/pb00r-04-clean-build` | `c4dc64c` | RED/GREEN, sentinelas e gates registrados abaixo |
| PB-00R-02 | blocked | `codex/pb00r-02-boot-budget` | este handoff | falha histórica de 12.377,9 ms preservada; reprodução instrumentada em 12.351,5, 12.882,7 e 12.226,5 ms com fronteira isolada no Chromium/CDP |
| PB-00R-05 | pending | `codex/pb00r-05-final-gate` | — | depende de PB-00R-01/02/03/04 |

## Baseline da auditoria

- Árvore auditada: `e93a7c43f6df1a8c46ea04e8452733fedd8c47f1`.
- `corepack pnpm verify` passou em uma execução, com 33 testes unitários/arquiteturais e 6 E2E.
- Repetição do budget: duas aprovações e uma falha com mark de `12.328,8 ms`.
- Resize 390×844 → 1366×768: canvas e DOM atualizaram; grade permaneceu com 390 px de largura.
- Seis packages em `packages/*` não declaram script `test`.
- Build alerta que `dist/game`, externo à raiz Vite, não será esvaziado automaticamente.
- Hash do lockfile observado: `0DFE3DE417C77E90F0FAFA5883A2C29FEBF7214900F7444BE45639476A636651`.

## Protocolo de integração paralela

1. Cada executor da onda 1 trabalha em worktree/branch isolado.
2. Cada executor registra modelo, effort, comandos e resultados no commit de sua task.
3. Um integrador único incorpora os commits e atualiza esta tabela serialmente.
4. Playwright/porta 4173 não executa simultaneamente no mesmo host.
5. PB-00R-02 começa somente após PB-00R-04 integrado.
6. PB-00R-05 começa somente após as quatro correções integradas e árvore limpa.

## Handoff PB-00R-04

- Implementador: GPT-5 no runtime Codex; modelo sugerido pela task: GPT-5.6 Luna, effort `xhigh`.
  O effort efetivo não é exposto por este ambiente. Validação independente Sol/Opus permanece para o gate final.
- Branch/commit: `codex/pb00r-04-clean-build` / `c4dc64cff7c885f83cc4a519418cf38e1d664670`.
- RED: `corepack pnpm exec vitest run tests/workspace/vite-build-config.test.ts` falhou com `emptyOutDir` recebido como `undefined`.
- GREEN: o mesmo comando passou após adicionar somente `emptyOutDir: true` e preservar `outDir: '../../dist/game'`.
- Prova de limite: `C:\Kaezan\kaezan-huntbound-pb00r-04-clean-build\dist\game\pb00r-game-sentinel.txt` foi removida pelo build; `C:\Kaezan\kaezan-huntbound-pb00r-04-clean-build\dist\pb00r-parent-sentinel.txt` permaneceu durante a prova e foi removida especificamente depois.
- Build: `corepack pnpm --filter @huntbound/game build` e `corepack pnpm build` passaram com exit 0. O warning de `outDir` externo desapareceu; permanece apenas o warning conhecido de chunk Phaser acima de 500 kB.
- Gates: `corepack pnpm test` passou com 34 testes no gate raiz, `corepack pnpm typecheck` passou, `git diff --check` passou e o lockfile não mudou.
- Integração: `c4dc64c` e `acc8318` foram incorporados em `main` por fast-forward. PB-00R-02 está elegível; não iniciar PB-00R-02 neste chat.

## Handoff PB-00R-02

- Veredito: `BLOCKED`. O gate não foi afrouxado e nenhuma produção foi alterada.
- Branch: `codex/pb00r-02-boot-budget`; o hash será registrado pelo integrador após este handoff.
- Instrumentação: toda execução coleta um único mark acionável, navegação, todos os recursos e os
  cinco recursos mais lentos; o JSON é anexado antes das validações de navegação, mark e budget.
- Helper RED/GREEN: o teste falhou por `./bootMetrics` ausente e passou após a implementação pura de
  `criticalResources`, que ordena sem mutar a entrada e limita o resultado a cinco itens.
- Primeira sequência: cinco processos separados passaram com marks `2.531,2`, `2.509,0`, `2.554,6`,
  `2.523,8` e `2.537,5 ms`; `responseEnd` ficou entre `176,9` e `186,2 ms` e o JavaScript entre
  `1.983,7` e `2.004,6 ms`.
- Reprodução diagnóstica: três processos passaram em `2.487,5`, `2.464,2` e `2.513,4 ms`; o quarto
  falhou em `12.377,9 ms` e encerrou a sequência sem retry.
- Causa de fase comprovada: na falha, `responseEnd=174,4 ms`, mas o JavaScript levou `11.846,3 ms`
  e o CSS de 959 bytes levou `10.179,0 ms`. Nos passes, os mesmos recursos levaram cerca de
  `1.966–2.000 ms` e `170–184 ms`. O stall ocorre na entrega dos subrecursos sob o throttling, antes
  de parse/Phaser; o tamanho transferido não mudou.
- Condição de parada: a variação pertence ao host/browser/CDP e não há correção controlável nos paths
  permitidos. Code splitting, retry, aquecimento e mudança de throttling permanecem proibidos.
- Gates antes da reprodução final: helper `1/1`, app `21/21`, typecheck e build passaram; o
  `qa:browser` passou `6/6` com mark de `2.626,7 ms`. A reprodução posterior do budget falhou e
  prevalece sobre esses passes.
- RED/GREEN do runner: `qa:browser` inicialmente tentou coletar o teste Vitest em `support`; passou
  `6/6` após `testIgnore: '**/support/**/*.test.ts'`, sem excluir nenhum `*.spec.ts`.
- Implementador: GPT-5 no runtime Codex; effort efetivo não exposto. Validador solicitado:
  GPT-5.6 Sol, effort `xhigh`; revisão somente leitura confirmou que budget, retry, workers, cache e
  throttling não foram enfraquecidos.

## Handoff PB-00R-02 — segunda investigação (fronteira isolada)

- Veredito: permanece `BLOCKED`. Nenhuma decisão congelada mudou e nenhuma produção foi alterada.
- Instrumentação acrescentada (somente `tests/e2e/**`): eventos CDP `Network.*` com timestamps,
  `response.timing` bruto por request, event-loop lag do processo runner e `timeOrigin` para
  correlacionar com logs do servidor. Helpers puros `summarizeCdpRequests` e
  `summarizeResponseTimings` entraram por RED/GREEN.
- Correção da causa antes registrada: a hipótese anterior atribuía o stall à "entrega dos
  subrecursos sob o throttling". As métricas de fronteira mostram que o atraso aparece em
  `receiveHeadersStart` e em `sendEnd`, que são leituras do socket real e não da camada emulada.
  O tamanho do bundle não participa: o CSS de 959 bytes falha igual porque seu request sequer é
  escrito no socket durante o congelamento.
- Fronteira provada em três falhas totalmente instrumentadas: o servidor responde em ~1 ms, seu
  event loop fica saudável, o canary ocioso e os demais processos Node não congelam, e mesmo assim
  o Chromium não escreve nem lê seus sockets por ~10,0 s. Os dois sockets são liberados no mesmo
  instante.
- Matriz de controles diagnósticos (nunca evidência de aceite):

| Controle | Cliente | Runner Playwright | `vite preview` | Throttling | Execuções | Stalls ~10 s |
|---|---|---|---|---:|---:|---:|
| Gate oficial | Chromium | sim | novo por execução | on | 71 | 3 |
| A | Chromium | não | reaproveitado | on | 30 | 0 |
| A′ | Chromium | não | novo por execução | on | 30 | 3 |
| B | Chromium | não | novo por execução | **off** | 75 | 0 |
| D | Node HTTP puro | não | novo por execução | n/a | 30 | 0 |

- Leitura da matriz: o runner Playwright não é necessário (A′ reproduz sem ele); o servidor e o
  loopback do host estão descartados (D nunca falha contra o mesmo servidor novo por execução);
  o throttling CDP é necessário (0/75 com ele desligado contra 3/30 com ele ligado).
  O ciclo de vida do servidor é um gatilho de janela temporal, não a causa (0/30 reaproveitando
  contra 3/30 recriando); com amostra dessa ordem esse item permanece correlação forte, não prova.
- O host **não** está descartado. O canary só exclui uma parada global de escalonamento; causas de
  host que atinjam seletivamente a pilha de rede do Chromium seguem possíveis. O controle que
  decidiria isso é repetir a matriz em um segundo host, e ele não foi executado por falta de acesso
  autorizado. A formulação sustentada é "específico do Chromium sob rede emulada neste host".
- Os scripts dos controles A, A′, B e D ficaram fora do repositório, em diretório temporário de
  sessão, porque o escopo da task não autoriza criar arquivos novos. A matriz é auditável pela
  receita registrada no `acceptance-report.md`, não pelo artefato; versionar o harness exige uma
  task que autorize `tools/` ou `scripts/`.
- Condição de parada aplicada: a causa está no Chromium/CDP, fora dos paths permitidos. Reduzir
  throttling, aquecer servidor, adicionar retry ou afrouxar o budget continuariam proibidos e
  apenas mascarariam a falha.
- Sequência final do gate: `2.356,4`, `2.354,6`, `2.352,9`, `2.350,8` e falha em `12.226,5 ms`.
  A sequência parou na primeira falha, sem retry.
- Implementador desta investigação: Claude Opus 5, reasoning alto, no runtime Claude Code; o effort
  efetivo não é exposto por este ambiente. A skill `game-studio:game-playtest` exigida pela task não
  está instalada neste host; o gate `qa:browser` foi usado no lugar e passou `6/6`.
- Validação independente por modelo frontier diferente (GPT-5.6 Sol `xhigh`) continua pendente e é
  obrigatória antes de qualquer mudança de veredito.

## Modelos

Registrar por task: implementador, effort, validador e qualquer fallback. A indisponibilidade do
modelo sugerido não reduz verificações.

## Bloqueios

PB-00R-02 está bloqueada por um congelamento intermitente de ~10,0 s da pilha de rede do Chromium
que só ocorre com `Network.emulateNetworkConditions` ativo. Servidor, bundle, aplicação e runner
Playwright estão descartados por controles de uma variável; o host permanece não descartado por
falta de um segundo host autorizado. Os demais achados ainda impedem o fechamento do playbook.

## Regra de atualização

Ao integrar uma task:

1. registrar status, branch, commit e evidência;
2. atualizar próxima task ou onda realmente elegível;
3. registrar modelo/effort e validador;
4. preservar histórico de falhas; não reescrever uma falha como se nunca tivesse ocorrido;
5. não liberar PB-01 antes do commit de PB-00R-05.
