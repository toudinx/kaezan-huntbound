# PB-00R — Relatório final de aceite

**BLOCKED**

**Data de abertura:** 2026-08-11

**Decisão atual:** PB-00R-02 permanece `BLOCKED`: a instrumentação reproduziu o outlier e o isolou
na entrega dos subrecursos sob a rede emulada, mas a causa não é controlável dentro do escopo.
PB-01 não está elegível.

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

PB-00R-05 preencherá o restante desta seção com os commits integrados, modelos/efforts, comandos,
exit codes, contagens, timings, screenshot pós-resize, hash do lockfile e decisão final. O estado
geral permanece `BLOCKED` até a integração e validação das demais tasks.
