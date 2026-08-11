# Harness de diagnóstico do stall de boot (PB-00R-02 / PB-00R-06)

Reproduz os quatro controles A, A′, B e D registrados na receita de
`docs/playbooks/PB-00R/artifacts/acceptance-report.md` e deixa saída bruta
versionada por execução.

**Este harness é diagnóstico e nunca vale como evidência de aceite.** Ele também
não audita a matriz histórica, que permanece rotulada como relato não verificado
independentemente: execuções novas produzem uma matriz nova e separada.

## Pré-requisitos

- `dist/game/index.html` presente (`corepack pnpm build`);
- porta 4173 livre;
- nenhum outro Playwright ou `vite preview` rodando no host.

## Execução

```bash
corepack pnpm diagnostics:boot-stall --runs 30
```

```bash
corepack pnpm diagnostics:boot-stall --runs A=30,A-prime=30,B=75,D=30
```

O N é declarado antes da sessão e não deve ser ajustado depois de ver o
resultado. Aumentar N para caçar uma reprodução invalida a leitura.

## O que cada controle faz

| Id | `vite preview` | Throttling | Cliente |
|---|---|---|---|
| `A` | um único, reaproveitado | on | Chromium via CDP |
| `A-prime` | novo por execução | on | Chromium via CDP |
| `B` | novo por execução | **off** | Chromium via CDP |
| `D` | novo por execução | n/a | três GETs em Node, sem browser |

A, A′ e B fazem `chromium.launch`, `newContext`, `newPage`,
`context.newCDPSession`, enviam `Network.enable` e `Network.setCacheDisabled` e,
exceto em B, `Network.emulateNetworkConditions` com `latency: 150`,
`downloadThroughput: 200_000`, `uploadThroughput: 93_750` e
`connectionType: 'cellular4g'`. Navegam para `http://127.0.0.1:4173/`, esperam
`[data-shell-ready="true"]`, leem o mark `huntbound:shell-actionable` e reportam
o maior `sendEnd - sendStart` e o maior `receiveHeadersStart - sendEnd` de
`Network.responseReceived`. Cada execução roda em um processo Node novo.

D não usa browser: pega o documento, extrai o CSS e o JS do HTML e busca os dois
em paralelo, com o JS reusando o agente do documento, medindo `ttfb` e total.

**Critério de stall:** `sendEnd - sendStart` ou `receiveHeadersStart - sendEnd`
acima de 3.000 ms. D não tem timeline CDP; sua fronteira comparável é o `ttfb`
medido em Node, reportado no lugar da espera por headers e rotulado como
`nodeHttpTtfb` em cada registro. Não é a mesma medida.

## Arquivos

| Arquivo | Papel |
|---|---|
| `bootStall.ts` | parte pura: classificação de stall e agregação da matriz |
| `bootStall.test.ts` | teste unitário da parte pura |
| `vitest.config.ts` | coleta o teste acima, que fica fora do `include` da raiz |
| `controls.ts` | definição dos quatro controles |
| `previewServer.ts` | ciclo de vida do `vite preview` |
| `runControl.ts` | uma execução de um controle, em processo próprio |
| `runBootStallMatrix.ts` | orquestrador; escreve a saída bruta e a matriz |

## Saída

Gerada em `docs/playbooks/PB-00R/artifacts/diagnostics/`, sem edição manual:

- `boot-stall-runs.jsonl` — um registro por execução, com controle, índice,
  timestamps, tempos medidos e veredito de stall;
- `boot-stall-matrix.md` — a matriz agregada, com N executado e o limite pela
  regra de três;
- `boot-stall-session.jsonl` — N declarado, host e totais da sessão.

Cada sessão trunca esses arquivos. Só o resultado de uma sessão completa deve
ser commitado.

A saída bruta é o artefato primário; a matriz e o sidecar da sessão são
derivados dela. Para regerar os derivados sem reexecutar nada:

```bash
corepack pnpm diagnostics:boot-stall --runs A=30,A-prime=30,B=75,D=30 --from-raw
```

Use isso quando o relatório mudar. Reexecutar a matriz substituiria observações
já feitas, e não é o mesmo que corrigir a apresentação delas.

## Teste da parte pura

```bash
corepack pnpm exec vitest run --config tools/diagnostics/vitest.config.ts
```

O I/O do harness fica fora do teste: só a classificação e a agregação são
testadas.
