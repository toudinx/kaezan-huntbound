# PB-00R-06 — Matriz de controles gerada pelo harness versionado

> Arquivo gerado por `tools/diagnostics/runBootStallMatrix.ts`. Não editar à mão.

- N declarado antes da sessão: A=30, A′=30, B=75, D=30.
- Sessão iniciada em 2026-08-11T15:04:54.594Z, encerrada em 2026-08-11T15:12:27.236Z.
- Host: Dhtrix — win32 10.0.26200, Node v24.14.0.
- Critério de stall: `sendEnd - sendStart` ou `receiveHeadersStart - sendEnd` acima de 3.000 ms.
- Esta matriz é diagnóstica. Ela nunca vale como evidência de aceite e não
  audita a matriz histórica, que permanece relato não verificado independentemente.

| Controle | Cliente | Runner | `vite preview` | Throttling | Fronteira medida | N executado | Stalls | Pior fronteira | Limite pela regra de três |
|---|---|---|---|---|---|---:|---:|---:|---|
| A | chromium | none | reaproveitado | on | cdp | 30 | 0 | 116.9 ms | taxa real até ~10% |
| A′ | chromium | none | novo por execução | on | cdp | 30 | 1 | 10010.7 ms | — (houve stall) |
| B | chromium | none | novo por execução | off | cdp | 75 | 0 | 116.0 ms | taxa real até ~4% |
| D | node-http | none | novo por execução | n/a | nodeHttpTtfb | 30 | 0 | 117.0 ms | taxa real até ~10% |

- Execuções que não completaram: 0.
- `0/N` não prova ausência; a última coluna é o limite superior compatível com
  a observação, pela regra de três (3/N).
- O controle D não tem timeline CDP: sua fronteira é o TTFB medido em Node,
  reportado no lugar da espera por headers. Não é a mesma medida de A/A′/B.
- Saída bruta por execução: `boot-stall-runs.jsonl`.
