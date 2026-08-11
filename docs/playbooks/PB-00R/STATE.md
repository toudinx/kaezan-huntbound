# PB-00R — Estado operacional

**Status geral:** done — `APPROVED_WITH_WARNINGS` em 2026-08-11 (PB-00R-05).

**Próxima task elegível:** nenhuma dentro de PB-00R. PB-00R-FIX-01 está concluída; W1 e W2 foram
resolvidos. PB-00R-02 permanece `done (risco aceito)` por decisão de produto: 5.000 ms permanece
alvo saudável e métrica de warning, enquanto somente boot acima de 30.000 ms ou ausência do shell
acionável volta a bloquear.

**PB-01:** **elegível** desde o commit de fechamento de PB-00R-05. O playbook modular foi
especificado; sua execução ainda não foi iniciada.

## Tasks

| Task | Status | Branch | Commit integrado | Evidência |
|---|---|---|---|---|
| PB-00R-01 | done | `codex/pb00r-01-resize` | `b5c5612` (worktree `911df51`) | E2E pós-resize, screenshot, 21 testes do app, typecheck e build |
| PB-00R-03 | done | `codex/pb00r-03-package-tests` | `94c4f62` (worktree `809383e`) | RED/GREEN nos manifests; probe revalidado `38→39→38`; Playwright fora do runner unitário |
| PB-00R-04 | done | `codex/pb00r-04-clean-build` | `c4dc64c` | RED/GREEN, sentinelas e gates registrados abaixo |
| PB-00R-02 | done (risco aceito) | `codex/pb00r-02-boot-budget` | `86e6391` | stalls de 12,2–12,9 s preservados como warning; métricas e harness permitem detectar regressão acima de 30 s |
| PB-00R-06 | done | `codex/pb00r-06-diag-harness` | `b3978ff` | harness versionado em `tools/diagnostics/`, saída bruta de 165 execuções e matriz nova em `artifacts/diagnostics/` |
| PB-00R-05 | done — `APPROVED_WITH_WARNINGS` | `codex/pb00r-06-diag-harness` (integração) | `4b9dd56` | auditoria integrada completa em `artifacts/acceptance-report.md` |
| PB-00R-FIX-01 | done | `codex/pb00r-fix-01-line-endings` | `91fd968` | `.gitattributes`, `format:check` e `verify` verdes em checkout novo; W1/W2 resolvidos |

PB-00R-01 e PB-00R-03 foram rebaseados da worktree para a branch de integração, então seus hashes
mudaram. PB-00R-05 comparou os dois lados e confirmou diff de código idêntico em ambos os pares; a
única diferença é o texto de documentos resolvido na integração. Os hashes de worktree ficam
registrados entre parênteses para preservar a rastreabilidade.

## Baseline da auditoria

- Árvore auditada: `e93a7c43f6df1a8c46ea04e8452733fedd8c47f1`.
- `corepack pnpm verify` passou em uma execução, com 33 testes unitários/arquiteturais e 6 E2E.
- Repetição do budget: duas aprovações e uma falha com mark de `12.328,8 ms`.
- Resize 390×844 → 1366×768: canvas e DOM atualizaram; grade permaneceu com 390 px de largura.
- Seis packages em `packages/*` não declaram script `test`.
- Build alerta que `dist/game`, externo à raiz Vite, não será esvaziado automaticamente.
- Hash do lockfile observado: `0DFE3DE417C77E90F0FAFA5883A2C29FEBF7214900F7444BE45639476A636651`.

## Handoff PB-00R-01

- Implementador: GPT-5 nesta sessão; a task sugeria GPT-5.6 Luna. Effort: `xhigh` conforme task.
- Validador: Playwright/Vitest/typecheck/build locais; validação externa por outro modelo não foi executada nesta sessão.
- RED: após boot em `390×844` e resize para `1366×768`, canvas e DOM mudavam, mas a grade permanecia limitada a aproximadamente 390 px; o E2E falhou inicialmente por baseline ausente.
- Implementação: `ShellScene` agora mantém uma `Graphics`, redesenha com `clear()` a partir de `gameSize`, escuta `Phaser.Scale.Events.RESIZE` e remove o mesmo listener em `SHUTDOWN`.
- Regressão: o E2E cobre dois ciclos adicionais, garante um canvas/overlay e aguarda a pintura WebGL antes do screenshot.
- Screenshot revisada no tamanho original: `tests/e2e/shell.spec.ts-snapshots/shell-mobile-to-desktop-win32.png`; a grade cobre `1366×768` e os quatro baselines existentes não foram regenerados.
- Comandos e resultados: `corepack pnpm install --frozen-lockfile` (exit 0); `corepack pnpm --filter @huntbound/game test` (21/21); `corepack pnpm exec playwright test tests/e2e/shell.spec.ts --workers=1` (6/6); `corepack pnpm typecheck` (exit 0); `corepack pnpm build` (exit 0, somente warnings conhecidos de `dist/game` e chunk grande); `git diff --check` (exit 0).
- Próximo passo: integrar este commit serialmente; não iniciar PB-00R-02 nesta task.

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
  subrecursos sob o throttling". O anexo `boot-metrics` mostra o atraso em `receiveHeadersStart` e
  em `sendEnd`, que são timestamps registrados pelo Chromium para cada request, não leituras
  diretas do socket abaixo da camada emulada. Quando o servidor recebeu e escreveu dados só pode
  ser afirmado pelos logs do servidor, e eles mostram o request chegando apenas ao fim da janela.
  O tamanho do bundle não participa: o CSS de 959 bytes falha igual, sem `sendEnd` registrado
  durante o congelamento e sem chegada correspondente no log do servidor.
- Fronteira observada em três falhas instrumentadas: pelos logs do servidor, o `vite preview`
  recebe o request só ao fim da janela e responde em ~1 ms, com event loop saudável; o canary
  ocioso e os demais processos Node não congelam. Nos timestamps do Chromium, `sendEnd` e
  `receiveHeadersStart` das duas conexões saltam ~10,0 s e são liberados no mesmo instante.
- Matriz de controles diagnósticos — **relato não verificado independentemente**, sem harness nem
  saídas brutas versionadas; nunca evidência de aceite:

| Controle | Cliente | Runner Playwright | `vite preview` | Throttling | Execuções | Stalls ~10 s |
|---|---|---|---|---:|---:|---:|
| Gate oficial | Chromium | sim | novo por execução | on | 71 | 3 |
| A | Chromium | não | reaproveitado | on | 30 | 0 |
| A′ | Chromium | não | novo por execução | on | 30 | 3 |
| B | Chromium | não | novo por execução | **off** | 75 | 0 |
| D | Node HTTP puro | não | novo por execução | n/a | 30 | 0 |

- Leitura da matriz, toda ela hipótese forte pendente de reprodução e não conclusão comprovada:
  o runner Playwright não seria necessário (A′ reproduz sem ele); servidor e loopback do host não
  falhariam sozinhos (D nunca falha); o throttling CDP seria necessário (0/75 desligado contra
  3/30 ligado); o ciclo de vida do servidor deslocaria a janela sem ser a causa (0/30 contra
  3/30). Nenhum desses descartes pode ser tratado como definitivo: os números vêm de scripts que
  não sobreviveram à sessão e ninguém além do executor os viu rodar.
- O host **não** está descartado. O canary só exclui uma parada global de escalonamento; causas de
  host que atinjam seletivamente a pilha de rede do Chromium seguem possíveis. O controle que
  decidiria isso é repetir a matriz em um segundo host, e ele não foi executado por falta de acesso
  autorizado. A formulação sustentada é "específico do Chromium sob rede emulada neste host".
- Os scripts dos controles A, A′, B e D ficaram fora do repositório, em diretório temporário de
  sessão, porque o escopo da task não autoriza criar arquivos novos. A receita registrada no
  `acceptance-report.md` permite montar novos experimentos, mas não audita os números históricos:
  as execuções já feitas não deixaram saída bruta nenhuma. Versionar o harness exige uma task que
  autorize `tools/` ou `scripts/`, e ela não é aberta agora.
- Conclusão comprovada, sustentada só pelos anexos versionados/reproduzíveis (`boot-metrics` do
  próprio gate): o documento chega dentro do normal enquanto os subrecursos ficam ~10,0 s sem
  progresso nos timestamps do Chromium; o CSS de 959 bytes congela junto com o JS de 358.283 B,
  logo o volume transferido não explica a falha; e o event loop do runner permanece nas dezenas
  baixas de ms na mesma janela.
- Garantia de anexo em timeout: navegação e readiness passaram a ter 15.000 ms cada, coleta de
  métricas 5.000 ms e teardown 5.000 ms, sob `test.setTimeout` de 50.000 ms, deixando 20.000 ms
  garantidos para coletar, anexar `boot-metrics` e relançar o erro original. Budget medido segue em
  exatamente 5.000 ms; retry, workers, cache e throttling não mudaram.
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

## Handoff PB-00R-06 — harness de diagnóstico versionado

- Escopo: somente ferramental de diagnóstico. Nenhum arquivo de produção foi tocado;
  `tests/e2e/boot-budget.spec.ts` e `playwright.config.ts` não foram editados, e budget, retry,
  workers, cache e throttling continuam exatamente como estavam.
- Harness versionado em `tools/diagnostics/`: `bootStall.ts` (parte pura), `controls.ts`,
  `previewServer.ts`, `runControl.ts` (uma execução por processo Node) e `runBootStallMatrix.ts`
  (orquestrador). Script de execução: `corepack pnpm diagnostics:boot-stall`.
- RED/GREEN da parte pura: `tools/diagnostics/bootStall.test.ts` falhou com
  `Cannot find module './bootStall.ts'` e passou `13/13` depois de implementar classificação de
  stall, regra de três e agregação da matriz. O I/O do harness ficou fora do teste. O `include` do
  Vitest da raiz cobre só `tests/**`, então o teste usa `tools/diagnostics/vitest.config.ts`
  próprio; a configuração da raiz não mudou.
- Sessão executada em 2026-08-11, com N declarado **antes** de rodar e igual ao da matriz histórica:
  A=30, A′=30, B=75, D=30. 165 execuções, nenhuma incompleta. N não foi ajustado depois do
  resultado e a sessão não foi repetida.
- Matriz nova, **separada** da histórica, gerada pelo harness:

| Controle | `vite preview` | Throttling | N executado | Stalls | Pior fronteira | Limite pela regra de três |
|---|---|---|---:|---:|---:|---|
| A | reaproveitado | on | 30 | 0 | 116,9 ms | taxa real até ~10% |
| A′ | novo por execução | on | 30 | 1 | 10.010,7 ms | — |
| B | novo por execução | **off** | 75 | 0 | 116,0 ms | taxa real até ~4% |
| D | Node HTTP puro | n/a | 30 | 0 | 117,0 ms | taxa real até ~10% |

- Reprodução auditável do congelamento, `A′` execução 28, registro versionado em
  `boot-stall-runs.jsonl`: documento normal (`send` 88,6 ms, espera por headers 13,4 ms); CSS com
  `sendEnd - sendStart` de **10.008,9 ms**; JS com `receiveHeadersStart - sendEnd` de
  **10.010,7 ms**; mark acionável em **12.436,1 ms**. A magnitude bate com as falhas históricas de
  12.226,5 a 12.882,7 ms e com o padrão de ~10,00 s praticamente constante.
- **Promovido a conclusão**, sustentado pela saída bruta versionada desta task: o congelamento
  ocorre **sem o runner Playwright**, em processo Node isolado; e não é explicado por volume
  transferido, porque o CSS de 346 B congelou junto com o JS na mesma execução enquanto o documento
  passou normal. Uma reprodução basta para existência; ela **não** sustenta afirmação de taxa.
- **Continua hipótese, e uma leitura histórica ficou mais fraca:** com N realmente executado,
  `0/75` em B limita a taxa a ~4% e a estimativa pontual de A′ é 1/30 ≈ 3,3%. O limite de B
  **não exclui** uma taxa igual à observada em A′, então "o throttling CDP é necessário" segue
  hipótese, com discriminação menor do que o texto histórico sugeria. O mesmo vale para o ciclo de
  vida do servidor: `0/30` em A limita a ~10% e é compatível com 3,3%, logo A e A′ não se separam
  nesta sessão. `0/30` em D limita a ~10% e mede TTFB em Node, que não é a mesma fronteira do CDP.
- O host continua **não** descartado. O controle que decidiria isso é repetir a matriz em um segundo
  host e ele não foi executado. "Chromium sob rede emulada neste host" segue fronteira observada,
  não culpado definitivo.
- A matriz histórica permanece rotulada "relato não verificado independentemente". Esta sessão não a
  audita e as duas não foram fundidas.
- Gates: teste do harness `13/13`; `typecheck` exit 0; `architecture:check` exit 0 sem supressão —
  a checagem varre apenas `apps/` e `packages/`, então `tools/diagnostics` não entra na política e
  nada precisou ser afrouxado; `build` exit 0; `qa:browser` `6/6`; `git diff --check` exit 0.
  `biome check .` continua falhando apenas pelos achados pré-existentes e fora de escopo (CRLF em
  `apps/game/vite.config.ts` e `tests/workspace/vite-build-config.test.ts`; `noExportsInTest` em
  `tests/e2e/shell.spec.ts`); nenhum arquivo novo entrou nessa lista.
- PB-00R-02 permanece `BLOCKED` e PB-00R-05 permanece inelegível, independentemente desta matriz.
- Implementador: Claude Opus 5, reasoning alto, no runtime Claude Code; o effort efetivo não é
  exposto por este ambiente. Validação independente por modelo frontier diferente permanece
  pendente e é obrigatória antes de qualquer mudança de veredito.

## Decisão de produto — risco de boot aceito

- Em 2026-08-11, o responsável pelo produto aceitou os stalls instrumentados de 12,2–12,9 s como
  risco compatível com a fase atual do projeto.
- O alvo de 5.000 ms não é apagado: permanece como métrica de saúde e warning para regressão.
- Boot entre 5.000 e 30.000 ms, com shell acionável e anexo diagnóstico preservado, não bloqueia
  PB-00R-02 nem PB-00R-05.
- Boot acima de 30.000 ms, shell não acionável, ausência de métricas ou regressão funcional continua
  bloqueante.
- PB-00R-02 passa a `done (risco aceito)`. A decisão substitui o efeito operacional dos vereditos
  históricos `BLOCKED`, sem apagar ou reinterpretar as evidências que os sustentaram.
- PB-00R-05 ainda depende da integração de PB-00R-01 e PB-00R-03; esta decisão não dispensa esses
  pré-requisitos.

## Modelos

Registrar por task: implementador, effort, validador e qualquer fallback. A indisponibilidade do
modelo sugerido não reduz verificações.

## Risco conhecido de boot

PB-00R-02 registrou um congelamento intermitente de ~10,0 s observado na fronteira da
pilha de rede do Chromium, em todas as reproduções com `Network.emulateNetworkConditions` ativo.
"Chromium sob rede emulada neste host" é a fronteira observada, não o culpado definitivo. O
tamanho do bundle está descartado pelos anexos versionados. Depois de PB-00R-06, o runner
Playwright está descartado como condição necessária: o harness versionado reproduziu o
congelamento sem ele, com saída bruta auditável. O servidor e a necessidade do throttling
continuam hipóteses — os `0/N` da matriz nova limitam a taxa a ~4% (B) e ~10% (A e D), o que não
exclui a taxa observada em A′ — e o host permanece não descartado por falta de um segundo host
autorizado. O risco foi aceito para a fase atual e não bloqueia mais PB-00R-02; permanece registrado
para refinamento futuro e volta a bloquear se ultrapassar 30.000 ms ou impedir o shell acionável.

### PB-00R-03 — bloqueio reproduzido em 2026-08-11

- Implementador: GPT-5 (runtime atual); effort configurado pela task: `xhigh`.
- O contrato de `scripts.test` falhou antes dos manifests em `packages/contracts` e passou depois da
  adição do script mínimo aos seis packages.
- `corepack pnpm test` permaneceu com 33 testes funcionais após o GREEN; os packages vazios passaram
  com `vitest run --passWithNoTests`.
- A prova exigida em `packages/contracts/src/gate-probe.test.ts` não elevou a contagem para 34:
  os packages sem configuração Vitest local herdaram o `vitest.config.ts` da raiz, que inclui apenas
  `tests/**/*.test.ts`. Uma configuração local temporária com `src/**/*.test.ts` fez o probe passar,
  confirmando a causa, mas esse arquivo e a alteração de `vitest.config.ts` estão fora do escopo
  permitido da task.
- O probe temporário foi removido; naquela tentativa ainda não havia evidência válida de `33→34→33`
  e a task permaneceu bloqueada até a correção de configuração registrada abaixo.

### PB-00R-03 — resolução em 2026-08-11

- Após a autorização de continuidade, `vitest.config.ts` passou a incluir também `src/**/*.test.ts`;
  esse foi o único desvio do escopo congelado, necessário porque os packages sem configuração local
  herdavam o include raiz e não coletavam o probe exigido.
- RED foi reproduzido novamente com o probe em `packages/contracts/src/gate-probe.test.ts` (33 testes,
  sem coleta do probe); GREEN coletou o probe (34 testes: 1 workspace, 11 arquitetura, 21 game e 1
  probe); após remover o probe, o gate retornou a 33.
- `corepack pnpm test` não coletou `tests/e2e/*.spec.ts`; os seis packages vazios passaram com
  `vitest run --passWithNoTests`.
- `pnpm-lock.yaml` permaneceu com o mesmo blob Git (`8ee8585af1fc6cb04accc56b4c90870d026f1060`) e
  nenhuma dependência foi adicionada.

## Handoff PB-00R-05 — auditoria final integrada

- Veredito: `APPROVED_WITH_WARNINGS`. Nenhum risco grave reproduzido. PB-01 liberado, não iniciado.
- Auditor: Claude Opus 5, reasoning alto, runtime Claude Code; effort efetivo não exposto pelo
  ambiente. Difere do implementador das quatro correções funcionais (GPT-5/Codex) e **coincide** com
  o de PB-00R-06 e da segunda investigação de PB-00R-02 — desvio registrado como warning W4, com
  GPT-5.6 Sol indisponível nesta plataforma.
- Skills: `superpowers:verification-before-completion` aplicada. `game-studio:game-playtest` e
  `game-studio:web-game-foundations` continuam **não instaladas** neste host; a revalidação visual e
  de performance usou os gates versionados `qa:browser`, o teste de resize com screenshot e a
  sequência de cinco processos frios.
- Nenhum arquivo de runtime, teste ou toolchain foi alterado. Só documentos mudaram.
- Árvore auditada: `94c4f62` em `codex/pb00r-06-diag-harness`, branch de integração das quatro
  correções. `main` continua em `5fca6c2` e ainda não recebeu a integração.
- Lockfile: SHA-256 `0DFE3DE417C77E90F0FAFA5883A2C29FEBF7214900F7444BE45639476A636651` idêntico
  antes e depois de `install --frozen-lockfile`; blob `8ee8585af1fc6cb04accc56b4c90870d026f1060`.
- Gates isolados: `architecture:check` 0, `typecheck` 0, `test` 0 com **38** testes, `build` 0,
  `qa:browser` 0 com **7/7**. `verify` reprova no primeiro gate, `format:check`, e por isso os
  demais foram executados isoladamente para provar que nada ficou mascarado.
- Cinco boots frios: `2.517,5`, `2.494,2`, `2.532,3`, `2.518,1` e `2.533,3 ms`, todos **abaixo** do
  alvo saudável de 5.000 ms, todos com `boot-metrics`, `actionableMarkCount=1` e `reachedShell=true`.
  O congelamento histórico não se reproduziu; sete tentativas não refutam um evento de poucos por
  cento e o risco W3 continua registrado.
- Resize: teste passou sem atualizar snapshot e a screenshot pós-resize é **byte-idêntica**
  (`CA64A539…`) à de um boot nativo em desktop.
- Descoberta: probe temporário em `packages/contracts/src/gate-probe.test.ts` mediu `38→39→38` sem
  editar o script raiz; removido antes do commit. A contagem histórica de 33 ficou desatualizada
  pelos 4 testes de `bootMetrics` (PB-00R-02) e 1 de `vite-build-config` (PB-00R-04).
- Limpeza: sentinela interna removida pelo build, sentinela irmã em `dist/` preservada e depois
  removida especificamente. Warning de output externo não aparece mais.
- Warnings registrados no `acceptance-report.md`: W1 `format:check` por CRLF e W2 saída obsoleta em
  `apps/game/dist` foram resolvidos por PB-00R-FIX-01; W3 stall de boot conhecido; W4 validação
  cruzada parcial e imprecisões documentais corrigidas.
- Correções documentais deste fechamento: hashes integrados de PB-00R-01/03 passaram a constar na
  tabela acima ao lado dos hashes de worktree, e a referência a `boot-stall-session.json` virou
  `boot-stall-session.jsonl`, que é o arquivo real em disco.

## Handoff PB-00R-FIX-01

- Implementação: `.gitattributes` fixa `* text=auto eol=lf` e declara `*.png binary`; nenhuma regra
  do Biome, `files.maxSize`, runtime, teste, budget, retry, worker, cache ou throttling foi alterada.
- RED: no checkout Windows anterior à política, `corepack pnpm format:check` terminou em exit 1 por
  diferenças CRLF na working tree; `core.autocrlf=true` e não havia `.gitattributes`.
- GREEN: em worktree nova derivada do commit da task, `git ls-files --eol` reportou **0** entradas
  `w/crlf`/`w/mixed`; `corepack pnpm format:check` terminou em exit 0 e verificou **59 arquivos**.
- Gate completo: `corepack pnpm verify` terminou em exit 0; `architecture:check` passou com 11 testes,
  a suíte Vitest passou com 6 testes raiz + 21 testes do app (**38 testes unitários/arquiteturais** no
  total) e `qa:browser` passou com **7/7 E2E**. O build só emitiu o warning conhecido de chunk Phaser.
- W2: `apps/game/dist` estava ausente no checkout novo; o build gerou somente `dist/game`, sem warning
  `maxSize`. O lockfile permaneceu inalterado e nenhum artefato novo foi rastreado.

## Regra de atualização

Ao integrar uma task:

1. registrar status, branch, commit e evidência;
2. atualizar próxima task ou onda realmente elegível;
3. registrar modelo/effort e validador;
4. preservar histórico de falhas; não reescrever uma falha como se nunca tivesse ocorrido;
5. não liberar PB-01 antes do commit de PB-00R-05.
