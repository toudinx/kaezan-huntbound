# PB-00R — Relatório final de aceite

**PENDING — aguardando integração de PB-00R-01 e PB-00R-03**

**Data de abertura:** 2026-08-11

**Decisão atual:** PB-00R-02 está `done (risco aceito)`. A instrumentação localizou um congelamento
intermitente de ~10,0 s na fronteira da pilha de rede do Chromium e preservou evidência auditável.
Por decisão de produto, 5.000 ms permanece alvo saudável e warning; boot entre 5.000 e 30.000 ms
com shell acionável não bloqueia, e acima de 30.000 ms ou sem shell acionável bloqueia. O histórico
diagnóstico permanece íntegro. PB-00R-05 ainda aguarda a integração de PB-00R-01 e PB-00R-03, por
isso PB-01 ainda não está elegível.

O gate final adota severidade proporcional: warnings conhecidos não impedem evolução. `BLOCKED`
fica reservado a falha que impeça build/boot, inutilize fluxo essencial, cause crash ou
corrupção/perda de dados, introduza risco de segurança ou impeça concretamente a próxima iteração.
Na presença apenas de desvios não graves, o fechamento usa `APPROVED_WITH_WARNINGS` e libera a
próxima iteração com follow-ups registrados.

## Evidência inicial

| Critério | Baseline | Estado |
|---|---|---|
| Resize pós-boot | grade limitada à largura inicial após 390×844 → 1366×768 | failing |
| Boot Fast 4G | nova sequência falhou no quarto processo com 12.377,9 ms | blocked |
| Testes por package | seis manifests sem script `test` | failing |
| Output limpo | Vite informa que `dist/game` não será esvaziado | failing no baseline; corrigido em `c4dc64c` |

## Evidência de fechamento

### PB-00R-04 — evidência da branch

- Commit funcional: `c4dc64cff7c885f83cc4a519418cf38e1d664670` (`build: clean game output before Vite build`).
- RED: o contrato falhou porque `gameViteConfig.build?.emptyOutDir` era `undefined`.
- GREEN: o contrato passou com `outDir` inalterado e `emptyOutDir: true`.
- Paths absolutos validados: `C:\Kaezan\kaezan-huntbound-pb00r-04-clean-build\dist` e `C:\Kaezan\kaezan-huntbound-pb00r-04-clean-build\dist\game`.
- Sentinela interna removida pelo build: `C:\Kaezan\kaezan-huntbound-pb00r-04-clean-build\dist\game\pb00r-game-sentinel.txt`.
- Sentinela irmã preservada durante a prova: `C:\Kaezan\kaezan-huntbound-pb00r-04-clean-build\dist\pb00r-parent-sentinel.txt`; removida especificamente após a verificação.
- `corepack pnpm --filter @huntbound/game build` terminou com exit 0 sem o warning de output externo. O warning de chunk Phaser acima de 500 kB permanece aceito e fora de escopo.
- Implementador: GPT-5 no runtime Codex; modelo sugerido GPT-5.6 Luna, effort `xhigh`; effort efetivo não exposto. Validação independente Sol/Opus permanece para PB-00R-05.
- `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm build` e `git diff --check` passaram; o lockfile permaneceu inalterado.
- Integração: commits `c4dc64c` e `acc8318` foram incorporados em `main` por fast-forward; PB-00R-02 tornou-se elegível.

### PB-00R-02 — evidência da branch

**Veredito:** `BLOCKED`. O gate permaneceu em 5.000 ms, com contexto novo, cache desabilitado,
Fast 4G congelado, um worker e zero retry no teste.

Uma primeira sequência de cinco processos frios passou:

| Processo | Actionable | responseEnd | JavaScript mais lento |
|---:|---:|---:|---:|
| 1 | 2.531,2 ms | 181,1 ms | 1.983,7 ms |
| 2 | 2.509,0 ms | 176,9 ms | 1.986,7 ms |
| 3 | 2.554,6 ms | 178,3 ms | 2.004,6 ms |
| 4 | 2.523,8 ms | 180,6 ms | 1.995,5 ms |
| 5 | 2.537,5 ms | 186,2 ms | 2.001,0 ms |

Uma nova sequência com reporter JSON reproduziu a variação e parou na primeira falha:

| Processo | Actionable | responseEnd | JavaScript | CSS |
|---:|---:|---:|---:|---:|
| 1 | 2.487,5 ms | 175,0 ms | 1.966,4 ms | 169,6 ms |
| 2 | 2.464,2 ms | 182,5 ms | 1.970,1 ms | 184,2 ms |
| 3 | 2.513,4 ms | 178,3 ms | 2.000,2 ms | 180,8 ms |
| 4 | **12.377,9 ms** | 174,4 ms | **11.846,3 ms** | **10.179,0 ms** |

Os cinco JSONs abaixo são anexos reais preservados por execuções instrumentadas. Os recursos foram
reduzidos aos campos integrais coletados pelo teste; os nomes usam apenas o path estável do asset.

```json
[
  {
    "process": "five-pass-5",
    "actionable": 2537.5,
    "actionableMarkCount": 1,
    "navigation": { "responseStart": 11.6, "responseEnd": 186.2, "domInteractive": 197.4, "domContentLoadedEventEnd": 2514.2, "loadEventEnd": 2536.2 },
    "resources": [
      { "name": "/assets/index-BRMS1RTI.js", "initiatorType": "script", "startTime": 191.7, "duration": 2001.0, "transferSize": 358283, "encodedBodySize": 357983, "decodedBodySize": 1380033 },
      { "name": "/assets/index-D895WUOc.css", "initiatorType": "link", "startTime": 192.0, "duration": 181.3, "transferSize": 959, "encodedBodySize": 659, "decodedBodySize": 1644 }
    ]
  },
  {
    "process": "diagnostic-1",
    "actionable": 2487.5,
    "actionableMarkCount": 1,
    "navigation": { "responseStart": 16.8, "responseEnd": 175.0, "domInteractive": 181.9, "domContentLoadedEventEnd": 2460.5, "loadEventEnd": 2485.9 },
    "resources": [
      { "name": "/assets/index-BRMS1RTI.js", "initiatorType": "script", "startTime": 179.0, "duration": 1966.4, "transferSize": 358283, "encodedBodySize": 357983, "decodedBodySize": 1380033 },
      { "name": "/assets/index-D895WUOc.css", "initiatorType": "link", "startTime": 179.1, "duration": 169.6, "transferSize": 959, "encodedBodySize": 659, "decodedBodySize": 1644 }
    ]
  },
  {
    "process": "diagnostic-2",
    "actionable": 2464.2,
    "actionableMarkCount": 1,
    "navigation": { "responseStart": 12.2, "responseEnd": 182.5, "domInteractive": 189.6, "domContentLoadedEventEnd": 2439.0, "loadEventEnd": 2462.4 },
    "resources": [
      { "name": "/assets/index-BRMS1RTI.js", "initiatorType": "script", "startTime": 186.9, "duration": 1970.1, "transferSize": 358283, "encodedBodySize": 357983, "decodedBodySize": 1380033 },
      { "name": "/assets/index-D895WUOc.css", "initiatorType": "link", "startTime": 187.0, "duration": 184.2, "transferSize": 959, "encodedBodySize": 659, "decodedBodySize": 1644 }
    ]
  },
  {
    "process": "diagnostic-3",
    "actionable": 2513.4,
    "actionableMarkCount": 1,
    "navigation": { "responseStart": 12.7, "responseEnd": 178.3, "domInteractive": 188.4, "domContentLoadedEventEnd": 2486.5, "loadEventEnd": 2509.6 },
    "resources": [
      { "name": "/assets/index-BRMS1RTI.js", "initiatorType": "script", "startTime": 183.2, "duration": 2000.2, "transferSize": 358283, "encodedBodySize": 357983, "decodedBodySize": 1380033 },
      { "name": "/assets/index-D895WUOc.css", "initiatorType": "link", "startTime": 183.6, "duration": 180.8, "transferSize": 959, "encodedBodySize": 659, "decodedBodySize": 1644 }
    ]
  },
  {
    "process": "diagnostic-4-failed",
    "actionable": 12377.9,
    "actionableMarkCount": 1,
    "navigation": { "responseStart": 11.1, "responseEnd": 174.4, "domInteractive": 183.0, "domContentLoadedEventEnd": 12354.4, "loadEventEnd": 12376.4 },
    "resources": [
      { "name": "/assets/index-BRMS1RTI.js", "initiatorType": "script", "startTime": 179.3, "duration": 11846.3, "transferSize": 358283, "encodedBodySize": 357983, "decodedBodySize": 1380033 },
      { "name": "/assets/index-D895WUOc.css", "initiatorType": "link", "startTime": 179.6, "duration": 10179.0, "transferSize": 959, "encodedBodySize": 659, "decodedBodySize": 1644 }
    ]
  }
]
```

**Causa de fase:** `responseEnd` do documento permaneceu normal, enquanto JavaScript e CSS
iniciaram por volta de 179 ms e ficaram bloqueados por 10–12 s. O mesmo CSS tem somente 959 bytes e
normalmente termina em cerca de 180 ms; portanto a falha está na entrega intermitente dos subrecursos
sob o throttling, não em parse/execução/Phaser e não no tamanho do bundle.

**Mudança:** adicionada instrumentação diagnóstica e helper unitário. Nenhum arquivo de produção foi
alterado porque o stall pertence ao host/browser/CDP e não há correção controlável no escopo. O
Playwright passou a ignorar somente `support/**/*.test.ts`, após o `qa:browser` demonstrar em RED que
o runner coletava indevidamente o teste Vitest.

**Gates:** helper `1/1`, app `21/21`, typecheck e build com exit 0; `qa:browser` `6/6` com mark de
`2.626,7 ms`; `git diff --check` com exit 0. A reprodução posterior falhou no quarto processo e é o
veredito prevalente.

**Modelos:** implementador GPT-5 no runtime Codex, effort efetivo não exposto; validador solicitado
GPT-5.6 Sol `xhigh`. A revisão somente leitura não encontrou enfraquecimento de budget, retry,
workers, cache ou throttling e exigiu o veredito `BLOCKED` pela ausência de causa controlável.

### PB-00R-02 — segunda investigação: fronteira isolada

**Veredito:** permanece `BLOCKED`. Budget de 5.000 ms, latência de 150 ms, download de 200.000 B/s,
upload de 93.750 B/s, cache desabilitado, contexto novo, um worker e zero retry continuam
inalterados. Nenhum arquivo de produção foi tocado.

A instrumentação anterior media apenas Resource Timing, que não distingue "servidor lento" de
"rede emulada lenta" de "browser congelado". Foram acrescentados, somente em `tests/e2e/**`, os
eventos CDP `Network.requestWillBeSent/responseReceived/dataReceived/loadingFinished/loadingFailed`,
o `response.timing` bruto de cada request, o event-loop lag do processo runner e o `timeOrigin`,
que permite correlacionar o relógio do browser com o log do servidor local.

O campo decisivo é `response.timing`. Todos os seus campos são timestamps registrados pelo
Chromium para a request, não leituras diretas do socket abaixo da camada emulada; o que o servidor
recebeu e escreveu vem exclusivamente do log do servidor. Em execuções sadias esses timestamps
separam duas coisas que o total esconde:

- `receiveHeadersStart` entre 8 e 25 ms — o Chromium já registra headers pouco depois do envio, e
  o log do servidor corrobora com `ttfb` de ~1 ms;
- `receiveHeadersEnd` por volta de 180 ms — o Chromium só marca os headers como completos depois
  da latência aplicada pela rede emulada.

**Correção da causa antes registrada.** O relatório anterior atribuiu a falha à "entrega dos
subrecursos sob o throttling". As três falhas reproduzidas mostram o atraso nos timestamps
`receiveHeadersStart` e `sendEnd` registrados pelo Chromium; a leitura correspondente do lado do
servidor vem do log do probe, que registra a chegada do request só ao fim da janela. O tamanho do
bundle não participa: o CSS de 959 bytes falha junto, sem `sendEnd` registrado durante o
congelamento e sem chegada correspondente no log do servidor.

**Procedência dos números abaixo.** Os valores do gate oficial saem do anexo `boot-metrics` de cada
execução, reproduzível por qualquer revisor com o comando da própria task e lendo o anexo:

```text
$env:PLAYWRIGHT_JSON_OUTPUT_NAME='<caminho>\report.json'
corepack pnpm exec playwright test tests/e2e/boot-budget.spec.ts --workers=1 --reporter=list,json
```

O corpo do anexo vem em base64 no JSON do reporter, em
`suites[0].specs[0].tests[0].results[0].attachments[] | name == 'boot-metrics'`. As linhas
`[boot-budget]`, `[boot-gap]` e `[boot-socket]` no stdout trazem os mesmos campos já resolvidos.

Os tempos do lado do servidor vieram de um probe carregado por `NODE_OPTIONS=--require <probe>.cjs`
em todos os processos Node da execução. O probe embrulha `http.createServer` e registra, por
request, o instante de chegada, o `ttfb` e o fim da resposta, além do event-loop lag do próprio
processo. A correlação entre os dois lados usa o campo `timeOrigin` do anexo e o `Date.now()` do
log do servidor.

Os controles A, A′, B e D foram executados por scripts de diagnóstico mantidos fora do repositório,
em diretório temporário de sessão, porque o escopo de PB-00R-02 não autoriza criar arquivos novos
além dos paths listados na task. Esses scripts **não sobrevivem à sessão** e não deixaram saída
bruta versionada. A receita adiante permite montar **novos** experimentos; ela não audita os
números históricos, que continuam sendo **relato não verificado independentemente**. Quem for
validar deve reconstruir os controles e comparar as próprias taxas, nunca tratar a matriz como
prova. Versionar o harness exige uma task própria que autorize `tools/` ou `scripts/`, e essa task
não é aberta agora.

O mesmo se aplica ao probe do servidor: ele foi carregado por `NODE_OPTIONS` em processos da
sessão e seus logs também não estão versionados. As linhas "servidor recebeu/escreveu" abaixo são
a única fonte legítima para afirmações sobre o servidor, mas são reproduzíveis pela receita, não
auditáveis pelo artefato.

Falha instrumentada de `12.351,5 ms` (todos os valores em ms relativos ao `timeOrigin` da página):

| Fronteira | Documento | CSS (959 B) | JS (358.283 B) |
|---|---:|---:|---:|
| Request iniciado pelo browser | 1,0 | 350,4 | 349,5 |
| `connect` concluído (timestamp do Chromium) | 165,9 | 1,4 após o request | conexão reusada |
| `sendEnd` (timestamp do Chromium) | 166,4 | **10.010,3** | 0,8 |
| Servidor recebeu o request (log do servidor) | -2.534 e 174 | **10.378** | 354 |
| Servidor escreveu headers, `ttfb` (log do servidor) | 1,3 | 0,5 | 1,1 |
| Servidor terminou a resposta (log do servidor) | 175 | 10.381 | **10.383** |
| `receiveHeadersStart` (timestamp do Chromium) | 178,3 | **10.381,6** | **10.361,7** |
| Mark acionável | — | — | 12.351,5 |

Falha instrumentada de `12.882,7 ms`: CSS com `send` de `1,5` a `10.015,9`; JS com
`receiveHeadersStart` em `+10.423,8`; servidor recebeu o JS em `606`, escreveu headers em `1,1 ms`
e só concluiu em `10.643`; o request do CSS chegou ao servidor em `10.631` e foi servido em
`1,8 ms`.

Falha da sequência final de gate, `12.226,5 ms`: `serverHeaders` do CSS em `10.249,7` contra
`requestTime` de `189,0`, e do JS em `10.195,9` contra `187,5`; documento normal com `responseEnd`
de `182,2 ms`.

**O que está descartado, e com qual força.**

Comprovado pelos anexos versionados/reproduzíveis (`boot-metrics` do próprio gate, gerado pelo
teste versionado):

- *Aplicação e tamanho do bundle*: o CSS de 959 bytes congela junto com o JS de 358.283 B, sem
  `sendEnd` registrado durante a janela. Volume transferido não explica a falha.
- *Fase de parse/execução/Phaser*: o `responseEnd` do documento permanece normal e o atraso está
  inteiramente antes do recebimento dos subrecursos.
- *Starvation do processo runner*: o `runnerEventLoop` do anexo fica nas dezenas baixas de ms na
  mesma janela em que a rede fica parada por ~10,0 s.

Hipóteses fortes pendentes de reprodução, apoiadas em logs/scripts de sessão sem saída bruta
versionada — nenhuma delas é descarte definitivo:

- *`vite preview`*: pelo log do probe, o event loop fica saudável durante a janela, o `ttfb` é de
  ~1 ms e a resposta completa sai em 1,8–3 ms assim que o request chega. O probe não está
  versionado, então isso é relato reproduzível pela receita, não artefato auditável.
- *Runner Playwright*: o controle A′ teria reproduzido o congelamento sem o test runner, e o
  processo CLI do Playwright congelaria como sintoma, descongelando junto com a rede. A matriz que
  sustenta isso é relato não verificado independentemente; o runner **não** está definitivamente
  descartado.
- *Necessidade do throttling CDP*: 0/75 com ele desligado contra 3/30 com ele ligado, pela mesma
  matriz e com a mesma limitação.

> Estado posterior destes três itens: PB-00R-06 reproduziu o congelamento sem o runner Playwright
> com saída bruta versionada, então o runner deixa de ser condição necessária. Os outros dois
> continuam hipótese, e a leitura de "0/75 contra 3/30" ficou mais fraca do que este parágrafo
> sugere — ver "PB-00R-06 — harness versionado e matriz nova". Este parágrafo é preservado como
> registro do que se sabia na segunda investigação.

**O que NÃO está descartado: o host.** Um canary Node ocioso amostrando a 10 ms não congela
durante a janela, os demais processos Node seguem sadios e a memória livre permanece em ~7,7 GB.
Isso exclui apenas uma classe de causa: uma parada global de escalonamento que atingisse todos os
processos. Não exclui causas de host que atinjam seletivamente a pilha de rede do Chromium, como
um filtro WFP, inspeção de rede de antivírus, driver de filtro ou política de energia por processo.
Um canary dentro do mesmo host não pode, por construção, decidir isso.

Descartar o host exige um controle externo: repetir a matriz em um segundo host com imagem
diferente e comparar a taxa de ocorrência. Esse controle **não foi executado** porque este chat não
teve acesso autorizado a outro host, e a task condiciona essa comparação a autorização explícita.
Enquanto ele não existir, a formulação correta é que a falha é *específica do Chromium sob rede
emulada neste host*, e não que o host esteja eliminado.

**Matriz de controles diagnósticos — relato não verificado independentemente.** Não há harness nem
saídas brutas versionadas para nenhuma linha abaixo; os números vêm de scripts que não sobreviveram
à sessão. Controles nunca valem como aceite, e estes em particular não podem ser tratados como
descarte definitivo de nenhum componente.

| Controle | Cliente | Runner | `vite preview` | Throttling | Execuções | Stalls ~10 s |
|---|---|---|---|---:|---:|---:|
| Gate oficial | Chromium | Playwright | novo por execução | on | 71 | 3 |
| A | Chromium | nenhum | reaproveitado | on | 30 | 0 |
| A′ | Chromium | nenhum | novo por execução | on | 30 | 3 |
| B | Chromium | nenhum | novo por execução | **off** | 75 | 0 |
| D | Node HTTP puro | nenhum | novo por execução | n/a | 30 | 0 |

Os stalls do controle A′ mediram `10.011,1`, `10.000,4` e `10.013,9 ms`. A magnitude é
praticamente constante em ~10,00 s nas seis reproduções, o que indica um timeout e não
starvation aleatória.

> Esta matriz **continua** relato não verificado independentemente e não foi corrigida, alterada
> nem fundida com nada. PB-00R-06 versionou o harness e produziu uma matriz **nova e separada**,
> registrada mais abaixo em "PB-00R-06 — harness versionado e matriz nova". Execuções novas não
> auditam estes números: eles seguem sem saída bruta.

**Receita para reconstruir os controles.** Todos usam o mesmo `dist/game` já construído e o mesmo
`vite preview --host 127.0.0.1 --port 4173 --strictPort`.

- *Cliente Chromium sem runner* (A, A′, B): script Node que faz `chromium.launch()`,
  `newContext()`, `newPage()`, `context.newCDPSession(page)`, envia `Network.enable` e
  `Network.setCacheDisabled`, envia `Network.emulateNetworkConditions` com os mesmos
  `latency: 150`, `downloadThroughput: 200_000`, `uploadThroughput: 93_750` e
  `connectionType: 'cellular4g'` (omitido apenas no controle B), navega para
  `http://127.0.0.1:4173/`, espera `[data-shell-ready="true"]`, lê o mark e reporta o maior
  `sendEnd - sendStart` e o maior `receiveHeadersStart - sendEnd` observados em
  `Network.responseReceived`. Um processo Node novo por execução.
- *Cliente sem browser* (D): script Node que faz três GETs em `http://127.0.0.1:4173` — documento,
  depois CSS e JS em paralelo, o JS reusando o agente do documento — e mede `ttfb` e total.
- *Diferença entre A e A′*: em A o `vite preview` é iniciado uma vez e reaproveitado por todas as
  execuções; em A′ ele é iniciado e encerrado a cada execução. Nada mais muda.
- *Critério de stall*: `sendEnd - sendStart` ou `receiveHeadersStart - sendEnd` acima de 3.000 ms.
  O limiar é folgado de propósito: os stalls observados ficam em ~10.000 ms e as execuções sadias
  não passam de ~200 ms, então nenhum caso cai perto da fronteira.

**Causa raiz, no nível em que a evidência sustenta:** com `Network.emulateNetworkConditions`
ativo, o Chromium deixa de registrar progresso de envio e de recepção por ~10,0 s, em ambas as
direções e em conexões distintas, liberando tudo no mesmo instante; no lado do servidor, o log do
probe mostra o request chegando só ao fim dessa janela. Isso é a *fronteira observada* — "Chromium
sob rede emulada neste host" —, não um culpado definitivo. O ciclo de vida do servidor deslocaria
a janela em que isso acontece, mas 0/30 contra 3/30 vem da matriz não auditável e é, no máximo,
correlação a reproduzir.

**Limites desta conclusão, explicitados.** A evidência localiza a falha *na fronteira* da pilha de
rede do Chromium; ela não identifica o componente interno nem a constante de ~10,0 s, e não
distingue um defeito do próprio Chromium de uma interação entre o Chromium e algo específico deste
host. Sem o controle em segundo host, "Chromium/CDP" é a fronteira observada, não o culpado
provado.

**Mudança realizada:** apenas instrumentação diagnóstica e helpers puros com teste, em
`tests/e2e/boot-budget.spec.ts`, `tests/e2e/support/bootMetrics.ts` e
`tests/e2e/support/bootMetrics.test.ts`. Os handlers CDP e o sampler de event loop executam no
processo do runner, e o domínio `Network` já emitia esses eventos por causa da própria emulação de
rede. Não existe prova de overhead zero: nada aqui mede o custo do runner sobre o mark. O que há é
um limite observado — o lag de event loop registrado em `runnerEventLoop` ficou nas dezenas baixas
de milissegundos em todas as execuções coletadas —, e o outlier de aproximadamente 10 s já existia
antes desta instrumentação, na sequência histórica que falhou em `12.377,9 ms`.

**Garantia de anexo em timeout.** O teste passou a fixar `navigationTimeoutMs` e
`readinessTimeoutMs` em 15.000 ms cada, `pageMetricsTimeoutMs` em 5.000 ms e `teardownTimeoutMs`
em 5.000 ms, com `test.setTimeout` em 50.000 ms. Isso deixa uma janela garantida de 20.000 ms para
coletar métricas best-effort, anexar `boot-metrics` e relançar o erro original, em vez de deixar um
`page.goto` travado consumir todo o timeout do teste. O budget medido continua em exatamente
5.000 ms e retry, workers, cache e throttling permanecem inalterados. Revalidado com readiness
deliberadamente quebrada (`[data-shell-ready="never"]`): falha em 17,6 s com `boot-metrics`
presente, `reachedShell=false` e o erro `expect(locator).toHaveCount(expected) failed` visível. E
com navegação travada (`latency: 600_000`): falha em 30,2 s, status `failed` e não `timedOut`, com
`boot-metrics` presente, `reachedShell=false`, `pageMetricsCollected=false` e o erro
`TimeoutError: page.goto: Timeout 15000ms exceeded` visível.

**Proposta para desbloquear:** executar o gate em um runner dedicado e reproduzível, com Chromium
e sistema fixados por imagem, sem outras cargas concorrentes, e medir a taxa de ocorrência lá antes
de aceitar o budget. Se o congelamento persistir em runner limpo, o caminho é registrar o defeito
contra o Chromium/CDP com esta evidência de fronteira, não afrouxar o gate.

**Gates desta investigação:** `bootMetrics` `4/4`; `@huntbound/game` `21/21`; `typecheck` exit 0;
`build` exit 0; `qa:browser` `6/6` com mark de `2.360,2 ms`; `git diff --check` exit 0. A sequência
oficial de cinco processos passou em `2.356,4`, `2.354,6`, `2.352,9` e `2.350,8 ms` e falhou no
quinto com `12.226,5 ms`, encerrando a sequência sem retry. Essa falha prevalece sobre os passes.

**Achado fora de escopo, não corrigido:** `corepack pnpm format:check` já falhava antes desta
investigação. `apps/game/vite.config.ts` e `tests/workspace/vite-build-config.test.ts` estão com
CRLF na working tree por causa de `core.autocrlf`, e `tests/e2e/shell.spec.ts` viola
`lint/suspicious/noExportsInTest`. Nenhum desses arquivos pertence ao escopo de PB-00R-02.

**Modelos:** implementador desta investigação Claude Opus 5, reasoning alto, no runtime Claude
Code; o effort efetivo não é exposto pelo ambiente. A skill `game-studio:game-playtest` exigida
pela task não está instalada neste host e foi substituída pelo gate `qa:browser`. A validação
independente por modelo frontier diferente permanece pendente e é obrigatória.

### PB-00R-06 — harness versionado e matriz nova

**Veredito de PB-00R-02: continua `BLOCKED`.** Esta task é diagnóstica. Nenhum arquivo de produção
foi tocado, `tests/e2e/boot-budget.spec.ts` e `playwright.config.ts` não foram editados, e budget,
retry, workers, cache e throttling permanecem exatamente como estavam. Nada abaixo vale como
evidência de aceite.

**O que mudou de status.** Os controles A, A′, B e D deixaram de ser scripts de sessão. O harness
está versionado em `tools/diagnostics/` e escreve saída bruta por execução, sem edição manual, em
`docs/playbooks/PB-00R/artifacts/diagnostics/`:

| Entregável | Arquivo |
|---|---|
| Parte pura, sob teste | `tools/diagnostics/bootStall.ts` |
| Teste unitário RED/GREEN | `tools/diagnostics/bootStall.test.ts` |
| Coleta do teste fora de `tests/**` | `tools/diagnostics/vitest.config.ts` |
| Definição dos quatro controles | `tools/diagnostics/controls.ts` |
| Ciclo de vida do `vite preview` | `tools/diagnostics/previewServer.ts` |
| Uma execução, um processo Node | `tools/diagnostics/runControl.ts` |
| Orquestrador e escrita da saída | `tools/diagnostics/runBootStallMatrix.ts` |
| Saída bruta por execução | `artifacts/diagnostics/boot-stall-runs.jsonl` |
| Matriz gerada | `artifacts/diagnostics/boot-stall-matrix.md` |
| N declarado, host e totais | `artifacts/diagnostics/boot-stall-session.json` |

O harness reproduz a receita já registrada: `chromium.launch`, `newContext`, `newPage`,
`context.newCDPSession`, `Network.enable`, `Network.setCacheDisabled` e
`Network.emulateNetworkConditions` com `latency: 150`, `downloadThroughput: 200_000`,
`uploadThroughput: 93_750` e `connectionType: 'cellular4g'` — omitido apenas em B. Navega para
`http://127.0.0.1:4173/`, espera `[data-shell-ready="true"]`, lê o mark e reporta o maior
`sendEnd - sendStart` e o maior `receiveHeadersStart - sendEnd` de `Network.responseReceived`.
A reaproveita um único `vite preview`; A′ inicia e encerra um a cada execução; nada mais difere.
D não usa browser: documento, depois CSS e JS em paralelo com o JS reusando o agente do documento.
Critério de stall: qualquer das duas fronteiras acima de 3.000 ms.

**N declarado antes da sessão**, igual ao da matriz histórica para permitir comparação direta:
A=30, A′=30, B=75, D=30. Foram 165 execuções em 2026-08-11, nenhuma incompleta. O N não foi
ajustado depois de ver o resultado e a sessão não foi repetida.

**Matriz nova — gerada pelo harness versionado, com saída bruta.** Ela não substitui nem audita a
matriz histórica, que permanece relato não verificado independentemente. As duas não se fundem.

| Controle | Cliente | Runner | `vite preview` | Throttling | Fronteira medida | N executado | Stalls | Pior fronteira | Limite pela regra de três |
|---|---|---|---|---|---|---:|---:|---:|---|
| A | Chromium | nenhum | reaproveitado | on | CDP | 30 | 0 | 116,9 ms | taxa real até ~10% |
| A′ | Chromium | nenhum | novo por execução | on | CDP | 30 | 1 | 10.010,7 ms | — |
| B | Chromium | nenhum | novo por execução | **off** | CDP | 75 | 0 | 116,0 ms | taxa real até ~4% |
| D | Node HTTP puro | nenhum | novo por execução | n/a | TTFB em Node | 30 | 0 | 117,0 ms | taxa real até ~10% |

O controle D não tem timeline CDP. Sua fronteira comparável é o TTFB medido em Node, reportado no
lugar da espera por headers e rotulado `nodeHttpTtfb` em cada registro. Não é a mesma medida de
A/A′/B, e a linha de D deve ser lida com essa ressalva.

**A reprodução auditável.** Controle A′, execução 28, registro completo em `boot-stall-runs.jsonl`:

| Recurso | `sendEnd - sendStart` | `receiveHeadersStart - sendEnd` | Bytes |
|---|---:|---:|---:|
| Documento | 88,6 ms | 13,4 ms | 238 |
| CSS | **10.008,9 ms** | 20,8 ms | 346 |
| JS | 0,6 ms | **10.010,7 ms** | 356 |

Mark acionável nessa execução: **12.436,1 ms**. A mediana de A′ nas outras 29 execuções ficou em
2.363,3 ms. A magnitude bate com as falhas históricas de 12.226,5, 12.351,5, 12.377,9 e 12.882,7 ms,
e as duas fronteiras ficaram novamente em ~10,00 s praticamente constantes.

**Promovido de hipótese a conclusão, sustentado pela saída bruta versionada desta task:**

- *O runner Playwright não é condição necessária.* O congelamento ocorreu em um processo Node
  isolado, sem test runner, e o registro está versionado. Uma reprodução basta para estabelecer
  existência.
- *O volume transferido não explica a falha, agora também fora do gate.* Na mesma execução o CSS de
  346 B segurou a fronteira de envio por 10.008,9 ms enquanto o documento passou normal.

**Continua hipótese — e uma leitura histórica ficou explicitamente mais fraca.**

`0/N` não prova ausência. Com o N realmente executado:

- *Necessidade do throttling CDP*: B ficou em `0/75`, compatível com taxa real de até ~4%. A
  estimativa pontual de A′ nesta sessão é `1/30` ≈ 3,3%. O limite de B **não exclui** uma taxa
  igual à de A′, então esta sessão não estabelece que o throttling seja necessário. O texto
  histórico tratava `0/75` contra `3/30` como discriminação forte; com estes números a
  discriminação não está disponível.
- *Ciclo de vida do `vite preview`*: A ficou em `0/30`, compatível com até ~10%, o que também
  cobre 3,3%. A e A′ não se separam nesta sessão.
- *`vite preview` como causa*: D ficou em `0/30`, até ~10%, e mede outra fronteira. Não descarta o
  servidor.

**O host continua não descartado.** Nenhuma execução desta task rodou em segundo host, e o controle
que decidiria isso permanece o mesmo: repetir a matriz em um host com imagem diferente e comparar a
taxa. "Chromium sob rede emulada neste host" segue sendo a fronteira observada, não o culpado
definitivo.

**Comando de reexecução:**

```text
corepack pnpm build
corepack pnpm diagnostics:boot-stall --runs A=30,A-prime=30,B=75,D=30
```

**RED/GREEN.** `tools/diagnostics/bootStall.test.ts` falhou com
`Cannot find module './bootStall.ts'` e passou `13/13` depois de implementar a classificação de
stall, a regra de três e a agregação da matriz. O I/O do harness ficou fora do teste. O `include`
do Vitest da raiz cobre apenas `tests/**`; o teste usa `tools/diagnostics/vitest.config.ts`
próprio e a configuração da raiz não mudou.

**Gates desta task:** harness `13/13`; `typecheck` exit 0; `architecture:check` exit 0 **sem
supressão** — a checagem varre somente `apps/` e `packages/`, então `tools/diagnostics` não entra
na política de dependência e nada precisou ser afrouxado; `build` exit 0; `qa:browser` `6/6`;
`git diff --check` exit 0. `biome check .` continua reprovando apenas pelos achados pré-existentes
e fora de escopo já registrados abaixo; nenhum arquivo novo entrou nessa lista.

**Modelos:** implementador Claude Opus 5, reasoning alto, no runtime Claude Code; o effort efetivo
não é exposto pelo ambiente. Validação independente por modelo frontier diferente permanece
pendente e obrigatória.

PB-00R-02 permanece `BLOCKED` e PB-00R-05 permanece inelegível, independentemente desta matriz.

### Decisão de produto posterior — risco aceito

Em 2026-08-11, o responsável pelo produto aceitou os boots instrumentados de 12,2–12,9 s para a
fase atual. Esta decisão é posterior ao veredito histórico acima e altera seu efeito operacional,
sem apagar a evidência: PB-00R-02 passa a `done (risco aceito)`. O alvo de 5.000 ms permanece como
warning mensurável; o limite bloqueante passa a ser 30.000 ms, shell não acionável ou métricas
ausentes. O tema deve ser refinado quando houver crescimento do projeto, dados de usuários reais ou
regressão do tempo de boot.

Esta aceitação remove PB-00R-02 da lista de bloqueios do gate final. PB-00R-05 continua aguardando
somente a integração e validação das tasks restantes, inclusive PB-00R-01 e PB-00R-03.

PB-00R-05 preencherá o restante desta seção com os commits integrados, modelos/efforts, comandos,
exit codes, contagens, timings, screenshot pós-resize, hash do lockfile e decisão final. O estado
geral permanece `BLOCKED` até a integração e validação das demais tasks.
