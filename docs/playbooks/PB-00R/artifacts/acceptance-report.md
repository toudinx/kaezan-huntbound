# PB-00R — Relatório final de aceite

**APPROVED_WITH_WARNINGS**

**Data de abertura:** 2026-08-11

**Data de fechamento:** 2026-08-11 · auditoria PB-00R-05 · Claude Opus 5, reasoning alto, runtime
Claude Code (effort efetivo não exposto pelo ambiente)

Nenhum risco grave foi reproduzido. Build e boot são viáveis, o shell fica acionável, não há crash,
corrupção ou perda de dados, não há risco de segurança e nada impede concretamente PB-01. Os quatro
desvios encontrados são warnings com evidência, impacto, gatilho de reabertura e follow-up
registrados abaixo. **PB-01 volta a ser elegível.** A evidência desta seção é fresca e prevalece
sobre relatos anteriores.

**Decisão atual:** PB-00R está concluído. PB-00R-01 e PB-00R-03 foram integradas, PB-00R-FIX-01
resolveu W1/W2 e PB-01 está elegível. PB-00R-02 permanece `done (risco aceito)`: a instrumentação
localizou um congelamento intermitente de ~10,0 s na fronteira da pilha de rede do Chromium e
preservou evidência auditável. Por decisão de produto, 5.000 ms permanece alvo saudável e warning;
boot entre 5.000 e 30.000 ms com shell acionável não bloqueia, e acima de 30.000 ms ou sem shell
acionável bloqueia. O histórico diagnóstico permanece íntegro.

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
| N declarado, host e totais | `artifacts/diagnostics/boot-stall-session.jsonl` |

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

### Evidência da task PB-00R-03 (2026-08-11)

- Implementador: GPT-5 (runtime atual), effort configurado pela task: `xhigh`.
- RED: o contrato de `scripts.test` falhou em `packages/contracts` antes dos manifests.
- GREEN: os sete packages de workspace passaram a declarar scripts `test` não mascarados; os seis
  packages vazios usam `vitest run --passWithNoTests`.
- Descoberta: `corepack pnpm test` observou `33→34→33` com o probe temporário em
  `packages/contracts/src/gate-probe.test.ts`; o probe foi removido antes do commit.
- Gates: `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm architecture:check` e
  `corepack pnpm build` concluíram com exit code 0.
- O runner unitário não coletou `tests/e2e/*.spec.ts`; Playwright permanece restrito a
  `qa:browser`.
- Desvio controlado: `vitest.config.ts` passou a incluir `src/**/*.test.ts`, pois os packages sem
  configuração local herdavam apenas `tests/**/*.test.ts`.
- `pnpm-lock.yaml` e dependências não mudaram; o blob Git permaneceu
  `8ee8585af1fc6cb04accc56b4c90870d026f1060`.

## PB-00R-05 — auditoria final integrada (2026-08-11)

**Veredito: `APPROVED_WITH_WARNINGS`.** Auditoria independente, somente leitura sobre a
implementação: nenhum arquivo de runtime, teste ou toolchain foi alterado por esta task. Budget,
retry, workers, cache e throttling foram inspecionados e continuam intactos.

### Commits auditados

Árvore auditada: `94c4f62` na branch `codex/pb00r-06-diag-harness`, que é a branch de integração das
quatro correções. `main` permanece em `5fca6c2`.

| Task | Commit integrado | Commit da worktree original | Modelo implementador | Effort |
|---|---|---|---|---|
| PB-00R-04 | `c4dc64c` | `c4dc64c` | GPT-5 (runtime Codex) | `xhigh` sugerido; efetivo não exposto |
| PB-00R-02 | `86e6391` | `86e6391` | GPT-5 (Codex) + Claude Opus 5 | não exposto |
| PB-00R-06 | `b3978ff` | `b3978ff` | Claude Opus 5 | não exposto |
| PB-00R-01 | `b5c5612` | `911df51` | GPT-5 (runtime Codex) | `xhigh` sugerido; efetivo não exposto |
| PB-00R-03 | `94c4f62` | `809383e` | GPT-5 (runtime atual) | `xhigh` |

PB-00R-01 e PB-00R-03 foram rebaseados da worktree para a branch de integração, então seus hashes
mudaram. A auditoria comparou os dois lados: o diff de código é idêntico em ambos os pares
(`apps/game/src/phaser/scenes/ShellScene.ts`, `tests/e2e/shell.spec.ts` e a screenshot em um;
os seis manifests, `tests/workspace/workspace-config.test.ts` e `vitest.config.ts` no outro). A
única diferença é o texto de `STATE.md`/`acceptance-report.md` resolvido na integração.

**Diversidade de modelo:** o validador (Claude Opus 5) difere do implementador principal das quatro
correções funcionais (GPT-5/Codex), conforme `docs/08_POLITICA_MODELOS_AGENTES.md`. Ele **não**
difere do implementador de PB-00R-06 nem da segunda investigação de PB-00R-02, ambos Opus 5 — ver
warning W4.

### Comandos, exit codes e contagens

| # | Comando | Exit | Resultado |
|---|---|---:|---|
| 1 | `git status --porcelain=v1 --untracked-files=all` | 0 | saída vazia, antes e depois |
| 2 | `git diff --check` | 0 | limpo |
| 3 | `corepack pnpm install --frozen-lockfile` | 0 | `Already up to date`, 8 projetos |
| 4 | `corepack pnpm verify` | **1** | reprova no 1.º gate, `format:check` — warning W1 |
| 5 | `corepack pnpm format:check` | **1** | 12 erros, 1 warning, 60 arquivos |
| 6 | `corepack pnpm architecture:check` | 0 | sem violações |
| 7 | `corepack pnpm typecheck` | 0 | 7 de 8 projetos |
| 8 | `corepack pnpm test` | 0 | **38** testes |
| 9 | `corepack pnpm build` | 0 | só o warning de chunk Phaser |
| 10 | `corepack pnpm qa:browser` | 0 | **7/7** E2E, mark `2.515,9 ms` |
| 11 | `playwright test tests/e2e/boot-budget.spec.ts` ×5 | 0,0,0,0,0 | cinco processos frios |
| 12 | `playwright test shell.spec.ts -g "redraws the playfield…"` | 0 | 1/1, sem atualizar snapshot |

Como `verify` encadeia com `&&`, a reprovação em `format:check` mascara todos os gates seguintes.
Por isso os cinco gates restantes foram executados isoladamente (linhas 6 a 10): **todos passam**.
Nenhuma falha anterior escondeu outro resultado.

**Contagem de testes — 38, não 33.** O número 33 no card da task é anterior às próprias correções
auditadas. A composição fresca é:

| Runner | Arquivos | Testes |
|---|---:|---:|
| `vitest run` na raiz | 3 | 6 |
| `node --test tools/architecture/check-boundaries.test.ts` | 1 | 11 |
| `@huntbound/game` | 5 | 21 |
| 6 packages vazios (`--passWithNoTests`) | 0 | 0 |
| **total** | | **38** |

Os 5 testes a mais em relação a 33 são os 4 de `tests/e2e/support/bootMetrics.test.ts` (PB-00R-02) e
1 de `tests/workspace/vite-build-config.test.ts` (PB-00R-04). Nenhum `*.spec.ts` do Playwright foi
coletado pelo runner unitário.

### Lockfile

SHA-256 idêntico antes e depois de `corepack pnpm install --frozen-lockfile`:

```text
0DFE3DE417C77E90F0FAFA5883A2C29FEBF7214900F7444BE45639476A636651
```

Blob Git inalterado: `8ee8585af1fc6cb04accc56b4c90870d026f1060`. Nenhum gate alterou o lockfile.

### Resize pós-boot revalidado

`redraws the playfield after in-session viewport changes` passou em `1,4 s` **sem** `--update-snapshots`;
a working tree continuou limpa depois, provando que o baseline não foi regravado.

A screenshot `tests/e2e/shell.spec.ts-snapshots/shell-mobile-to-desktop-win32.png` foi aberta no
tamanho original (1366×768) e inspecionada:

- a grade cobre os 1366×768 completos, com linhas até as bordas direita e inferior;
- a intensidade é uniforme, sem emenda ou degrau na fronteira dos 390 px iniciais;
- há exatamente um canvas e um overlay — um badge `SHELL READY` e um badge `1366 × 768 · 1.00 DPR`;
- o centro está livre de resíduo geométrico.

Evidência adicional e mais forte que a inspeção visual: a screenshot pós-resize é **byte-idêntica**
à screenshot de um boot nativo em desktop. Ambas têm SHA-256
`CA64A539904EF0E9D628D370A9DF48333268811E9CCB232B0347A231FDC2F9BD`. Redimensionar de 390×844 para
1366×768 produz exatamente o mesmo raster que iniciar já em 1366×768.

O listener é removido no shutdown com a mesma referência de função usada no registro — `redrawGrid`
é propriedade arrow estável, passada tanto para `this.scale.on` quanto para `this.scale.off`. O
teste `recovers lifecycle changes without duplicating shell elements` passou, cobrindo a não
duplicação após recriação.

### Cinco boots em processos frios

Cinco processos Playwright separados, um por execução, sem retry e sem reaproveitar servidor:

| Processo | Exit | Mark acionável | `responseEnd` | `actionableMarkCount` | `reachedShell` |
|---:|---:|---:|---:|---:|---|
| 1 | 0 | **2.517,5 ms** | 182,2 ms | 1 | true |
| 2 | 0 | **2.494,2 ms** | 179,9 ms | 1 | true |
| 3 | 0 | **2.532,3 ms** | 186,0 ms | 1 | true |
| 4 | 0 | **2.518,1 ms** | 179,6 ms | 1 | true |
| 5 | 0 | **2.533,3 ms** | 186,7 ms | 1 | true |

Os cinco marks ficam **abaixo do alvo saudável de 5.000 ms**. Nenhum warning de boot foi necessário
nesta sessão e o congelamento histórico de ~10 s não se reproduziu em nenhuma das sete navegações
instrumentadas do dia (cinco desta sequência mais duas do `qa:browser`). Isso **não** revoga o risco
conhecido: ele é intermitente e a taxa histórica é de poucos por cento.

Anexos `boot-metrics` preservados, um por execução, todos com corpo real:

| Processo | Relatório JSON | Bytes do anexo |
|---:|---|---:|
| 1 | `report-1.json` | 15.216 |
| 2 | `report-2.json` | 15.268 |
| 3 | `report-3.json` | 15.252 |
| 4 | `report-4.json` | 15.248 |
| 5 | `report-5.json` | 15.232 |

Os JSONs foram gravados em diretório temporário de sessão
(`…\scratchpad\boot5\report-<n>.json`), fora do repositório, e **não** são versionados — o escopo
desta task não autoriza adicionar artefatos novos. São reproduzíveis pelo comando da própria task
com `PLAYWRIGHT_JSON_OUTPUT_NAME`. O caminho versionado e auditável para esse tipo de evidência
continua sendo o harness de PB-00R-06 em `artifacts/diagnostics/`.

### Descoberta de testes revalidada

Os sete manifests declaram `test` não mascarado:

| Package | `scripts.test` |
|---|---|
| `apps/game` | `vitest run` |
| `packages/contracts` | `vitest run --passWithNoTests` |
| `packages/simulation` | `vitest run --passWithNoTests` |
| `packages/content` | `vitest run --passWithNoTests` |
| `packages/assets` | `vitest run --passWithNoTests` |
| `packages/save` | `vitest run --passWithNoTests` |
| `packages/test-fixtures` | `vitest run --passWithNoTests` |

`tests/workspace/workspace-config.test.ts` faz cumprir o contrato: rejeita script ausente, vazio, com
`|| true` ou com `exit 0`, nos sete packages e nos sete scripts de raiz.

Probe temporário em `packages/contracts/src/gate-probe.test.ts`, com o script raiz **intocado**:

```text
38  →  39  (probe presente, coletado por packages/contracts)  →  38  (probe removido)
```

O probe foi removido e a working tree voltou a limpa; ele não entra no commit. Nenhum `*.spec.ts`
foi coletado pelo runner unitário em nenhuma das três execuções.

### Limite da limpeza do output

Paths absolutos resolvidos antes da prova:

```text
C:\Kaezan\kaezan-huntbound\dist\game\pb00r-05-game-sentinel.txt     (interna)
C:\Kaezan\kaezan-huntbound\dist\pb00r-05-parent-sentinel.txt        (irmã, externa ao outDir)
```

Depois de `corepack pnpm build` (exit 0): a sentinela **interna foi removida** e a **irmã
permaneceu**. A limpeza respeita a fronteira do `outDir` e não toca paths externos. A sentinela irmã
foi removida especificamente ao fim da prova e `dist/` voltou a conter apenas `game/`.

O warning de output externo não limpo **não aparece mais**. O único warning do build é o de chunk
Phaser acima de 500 kB, limite conhecido e fora de escopo.

### Arquitetura, escopo e tracking

`corepack pnpm architecture:check` exit 0. `git ls-files` lista 126 arquivos; a varredura por
`references/`, `.obsidian/`, `dist/`, `playwright-report/`, `test-results/`, `apps/game/dist/`,
probes, sentinelas, `.env`, segredos, credenciais e chaves não encontrou **nenhum** path rastreado.
`git diff --check` e `git status --short` terminaram limpos ao fim da auditoria.

Todo o intervalo PB-00R (`e93a7c4..HEAD`) toca 25 arquivos fora de `docs/`. A busca por `gacha`,
`IndexedDB`, `serviceWorker`, `service-worker`, runtime `Canary`, `backend`, `outfit`, `inventory`,
`gameplay`, `localStorage` e `fetch(` nas linhas **adicionadas** fora de `docs/` não retornou
ocorrência alguma. Nenhum sistema de playbook posterior foi antecipado.

O único arquivo de produção alterado em todo o PB-00R é
`apps/game/src/phaser/scenes/ShellScene.ts`. As demais mudanças são configuração mínima
(`emptyOutDir: true`; `testIgnore` de `support/**/*.test.ts`; include de `src/**/*.test.ts`),
manifests, testes e o harness de diagnóstico.

**Nada foi afrouxado.** Verificado por leitura direta:

| Controle | Valor no HEAD auditado |
|---|---|
| Budget medido | `expect(duration).toBeLessThanOrEqual(5_000)` |
| Retries | `test.describe.configure({ retries: 0 })` |
| Workers | `workers: 1` |
| Cache | `Network.setCacheDisabled` com `cacheDisabled: true` |
| Throttling | `latency: 150`, `downloadThroughput: 200_000`, `uploadThroughput: 93_750`, `cellular4g` |

O `testIgnore` adicionado ao Playwright cobre apenas `**/support/**/*.test.ts` e não exclui nenhum
`*.spec.ts` — confirmado pelos 7 testes coletados em `qa:browser`.

## Revalidação PB-00R-FIX-01 — 2026-08-11

| Gate | Exit | Evidência fresca |
|---|---:|---|
| `git ls-files --eol` em checkout novo | 0 | **0** arquivos `w/crlf` ou `w/mixed`; arquivos de texto `w/lf` |
| `corepack pnpm format:check` | 0 | Biome verificou **59 arquivos**, sem erros e sem warning `maxSize` |
| `corepack pnpm verify` | 0 | seis gates em sequência; 11 testes de arquitetura, 6 testes raiz + 21 do app, **38 unitários/arquiteturais**, build e **7/7 E2E** |
| lockfile / rastreio | 0 | `pnpm-lock.yaml` inalterado; nenhum artefato novo rastreado |

O build emitiu apenas o warning conhecido de chunk Phaser. `biome.json` não foi alterado e
`files.maxSize` não foi aumentado. `apps/game/dist` estava ausente no checkout novo; a saída atual
foi gerada em `dist/game`.

## Warnings

Nenhum warning abaixo atinge a barra de bloqueio congelada. Todos têm evidência fresca, impacto,
gatilho de reabertura e follow-up.

### W1 — RESOLVIDO: `pnpm verify` reprova em `format:check` por fim de linha da working tree

- **Resolução (PB-00R-FIX-01).** `.gitattributes` com `* text=auto eol=lf` foi versionado. Em checkout
  novo com `core.autocrlf=true`, `git ls-files --eol` reportou 0 arquivos `w/crlf`/`w/mixed`,
  `corepack pnpm format:check` terminou em exit 0 e o `verify` completo terminou em exit 0.

- **Evidência.** `corepack pnpm format:check` exit 1: `Found 12 errors. Found 1 warning.` Os 12
  arquivos com erro são **exatamente** os 12 arquivos rastreados que `git ls-files --eol` reporta
  como `i/lf w/crlf`: `apps/game/src/phaser/scenes/ShellScene.ts`, `apps/game/vite.config.ts`, os
  seis `packages/*/package.json`, `tests/e2e/shell.spec.ts`,
  `tests/workspace/vite-build-config.test.ts`, `tests/workspace/workspace-config.test.ts` e
  `vitest.config.ts`. `core.autocrlf` está em `true` e não existe `.gitattributes` no repositório.
- **Prova de que a causa é só essa.** O conteúdo de `HEAD` desses 12 arquivos foi extraído para um
  diretório temporário com fim de linha LF e submetido a `biome format`: `Checked 13 files. No
  fixes applied.`, **exit 0**. O 13.º arquivo do lote é o `biome.json` copiado junto. Não existe
  defeito de formatação no conteúdo versionado.
- **O warning restante não participa.** O `!` de 1,3 MiB vem de `apps/game/dist/assets/index-BAWoqgt4.js`.
  Rodar `biome format apps/game/dist` isoladamente termina em **exit 0**, então o warning não
  contribui para a reprovação. Ver W2.
- **Impacto.** O comando canônico de gate fica vermelho em qualquer checkout Windows com
  `core.autocrlf=true`, e para no primeiro gate, escondendo os cinco seguintes. É atrito de fluxo e
  risco de mascaramento, não defeito de produto: os cinco gates substantivos passam quando
  executados isoladamente e o conteúdo commitado está correto.
- **Gatilho de reabertura.** Passa a bloquear se algum arquivo aparecer com defeito real de
  formatação no conteúdo commitado — isto é, se a reprodução com LF deixar de terminar em exit 0.
- **Follow-up.** Encerrado por [PB-00R-FIX-01](../tasks/PB-00R-FIX-01-normalizar-fim-de-linha-do-checkout.md).

### W2 — RESOLVIDO: saída de build obsoleta em `apps/game/dist` é varrida pelo Biome

- **Resolução (PB-00R-FIX-01).** `apps/game/dist` estava ausente no checkout novo e o `verify` não
  emitiu warning `maxSize`; o build gerou `dist/game`, conforme o output corrente. `biome.json` ficou
  inalterado e `files.maxSize` não foi aumentado.

- **Evidência.** `apps/game/dist/` contém `index.html`, `assets/index-1Ku5mUUX.css` e
  `assets/index-BAWoqgt4.js` (1.378.104 B), todos com data de 2026-08-10 — anteriores a PB-00R-04,
  que passou a emitir em `dist/game`. O Biome varre o diretório e emite o warning de `maxSize`.
- **Impacto.** Baixo e local. O diretório é ignorado pelo Git (`.gitignore:7:dist/`), não está
  rastreado e não existe em clone novo. Não afeta build, testes nem o exit code do gate.
- **Gatilho de reabertura.** Passa a importar se algum gate começar a ler esse diretório obsoleto
  como se fosse a saída corrente.
- **Follow-up.** Encerrado; se um output obsoleto voltar a ser gerado fora de `dist/game`, abrir task
  própria para avaliar o padrão de inclusão sem alterar `files.maxSize`.

### W3 — congelamento intermitente de boot continua conhecido e não descartado

- **Evidência desta sessão.** Sete navegações instrumentadas, zero stalls; marks entre 2.494,2 e
  2.533,3 ms, todos abaixo do alvo saudável de 5.000 ms. A ausência de reprodução em sete tentativas
  **não** refuta um evento cuja taxa histórica é de poucos por cento; o intervalo é largo demais.
- **Evidência que permanece válida.** PB-00R-02 e PB-00R-06 registram marks de 12,2 a 12,9 s
  com o congelamento de ~10,00 s na fronteira da pilha de rede do Chromium sob rede emulada, com
  saída bruta versionada em `artifacts/diagnostics/boot-stall-runs.jsonl`. O host não está
  descartado; o controle que decidiria isso é repetir a matriz em um segundo host.
- **Impacto.** Aceito por decisão de produto de 2026-08-11 para a fase atual. 5.000 ms segue alvo
  saudável e métrica de warning.
- **Gatilho de reabertura.** Mark acima de 30.000 ms, shell não acionável, `actionableMarkCount`
  diferente de 1, anexo `boot-metrics` ausente, ou aumento perceptível da taxa de ocorrência.
- **Follow-up (prioridade média).** Repetir a matriz de `tools/diagnostics/` em um segundo host com
  imagem diferente, quando houver acesso autorizado, e medir a taxa lá.

### W4 — validação independente parcial e imprecisões documentais

- **Evidência.** O validador desta auditoria é Claude Opus 5, que difere do implementador das quatro
  correções funcionais (GPT-5/Codex) mas **coincide** com o implementador de PB-00R-06 e da segunda
  investigação de PB-00R-02. `docs/08_POLITICA_MODELOS_AGENTES.md` pede modelo diferente; a
  plataforma desta sessão não oferecia GPT-5.6 Sol, e o desvio fica registrado aqui e em `STATE.md`.
  Além disso: o `STATE.md` registrava para PB-00R-01 e PB-00R-03 os hashes das worktrees
  (`911df51`, `809383e`) e não os hashes integrados (`b5c5612`, `94c4f62`); a tabela de entregáveis
  de PB-00R-06 citava `boot-stall-session.json`, mas o arquivo em disco é `boot-stall-session.jsonl`.
  Ambos corrigidos neste fechamento.
- **Impacto.** Nenhum sobre o produto. Afeta rastreabilidade e a força da revisão cruzada sobre a
  parte diagnóstica; a parte funcional tem revisão cruzada de modelo.
- **Gatilho de reabertura.** Qualquer mudança de veredito sobre PB-00R-02 exige, como as duas
  investigações já registram, validação por modelo frontier diferente de Opus 5.
- **Follow-up (prioridade baixa).** Submeter o harness de PB-00R-06 e este fechamento a GPT-5.6 Sol
  `xhigh` quando disponível.

## Achados fora de escopo não corrigidos

- `biome check .` (usado por `pnpm check`, **não** por `pnpm verify`) segue reprovando por
  `lint/suspicious/noExportsInTest` em `tests/e2e/shell.spec.ts`. Pré-existente e fora do escopo
  desta task.
- Chunk Phaser acima de 500 kB no build: limite conhecido, explicitamente fora de escopo do PB-00R.

## Decisão

`APPROVED_WITH_WARNINGS`. Após a integração da PB-00R-FIX-01 (`91fd968`), `format:check` e o
`verify` completo passam em checkout novo. O build passa, o shell fica acionável em ~2,5 s em cinco
processos frios, o resize redesenha o playfield completo, a descoberta de testes é comprovada por
probe e a limpeza do output respeita sua fronteira. O warning remanescente de
`lint/suspicious/noExportsInTest` pertence ao `biome check .` usado por `pnpm check`, não ao fluxo
`verify`, e permanece registrado como achado pré-existente fora do escopo.

**PB-01 está elegível a partir do commit de fechamento `4b9dd56`.** Seu playbook modular foi
especificado posteriormente; a implementação não foi iniciada neste fechamento.
