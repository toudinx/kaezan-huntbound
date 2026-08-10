# PB-00 — Browser QA

**Data:** 2026-08-10
**Runner:** Playwright 1.62.1, Chromium 151.0.7922.34 (Playwright Chromium
v1234), Windows
**Build servida:** produção local com `vite preview` em `127.0.0.1:4173`

## Cobertura

`tests/e2e/shell.spec.ts` executa em Chromium, com um worker para manter o
cache frio e o throttling reproduzíveis. Cada viewport valida `data-shell-ready`,
um canvas e um overlay raiz, caixas com dimensões dentro do viewport, ausência de
scroll, texto de status legível fora do centro do playfield, erros de console e
`pageerror`. O ciclo blur/focus e hidden/visible confirma `paused` e retorno a
`ready` sem canvas ou overlay duplicados.

| Baseline | Viewport |
|---|---:|
| `tests/e2e/shell.spec.ts-snapshots/shell-mobile-win32.png` | 390 × 844 |
| `tests/e2e/shell.spec.ts-snapshots/shell-tablet-win32.png` | 768 × 1024 |
| `tests/e2e/shell.spec.ts-snapshots/shell-desktop-win32.png` | 1366 × 768 |
| `tests/e2e/shell.spec.ts-snapshots/shell-desktop-wide-win32.png` | 1920 × 1080 |

Os quatro baselines foram revisados no tamanho original: o canvas permanece
dominante, os painéis de borda têm contraste, o centro/lower-middle fica livre e
não há clipping.

## Budget de boot

`tests/e2e/boot-budget.spec.ts` usa CDP com cache desabilitado, contexto novo e
Fast 4G: download de 1,6 Mbit/s (200.000 bytes/s), upload de 750 Kbit/s
(93.750 bytes/s) e 150 ms de latência. A execução fria observada registrou
`huntbound:shell-actionable` em **2.368,4 ms**, abaixo do limite de 5.000 ms.
Esse teste não aceita retry, pois uma repetição aqueceria a compilação JavaScript e
deixaria de representar a primeira carga.

O bundle JavaScript foi servido com gzip (358.283 bytes transferidos); a execução
serial evita concorrência entre páginas throttled, que tornaria a medição de cache
frio não reproduzível.

## Comandos

```text
NODE_OPTIONS=--use-system-ca corepack pnpm exec playwright install chromium
NODE_OPTIONS=--use-system-ca corepack pnpm qa:browser
NODE_OPTIONS=--use-system-ca corepack pnpm verify
```

Relatórios temporários ficam em `test-results/`, `playwright-report/` e
`blob-report/`, todos ignorados pelo Git. Os traces são gerados somente no retry
e screenshots de falha somente quando um teste falha.
