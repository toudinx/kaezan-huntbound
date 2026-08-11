# PB-00R — Relatório final de aceite

**BLOCKED**

**Data de abertura:** 2026-08-11

**Decisão atual:** os quatro achados da auditoria permanecem reproduzíveis ou estruturalmente
presentes. PB-01 não está elegível.

## Evidência inicial

| Critério | Baseline | Estado |
|---|---|---|
| Resize pós-boot | grade limitada à largura inicial após 390×844 → 1366×768 | failing |
| Boot Fast 4G | uma de três repetições falhou com 12.328,8 ms | flaky |
| Testes por package | seis manifests sem script `test` | failing |
| Output limpo | Vite informa que `dist/game` não será esvaziado | failing |

## Evidência de fechamento

PB-00R-05 preencherá esta seção com commits, modelos/efforts, comandos, exit codes, contagens,
timings, screenshot pós-resize, hash do lockfile e decisão final. Ausência de evidência mantém o
estado `BLOCKED`.
