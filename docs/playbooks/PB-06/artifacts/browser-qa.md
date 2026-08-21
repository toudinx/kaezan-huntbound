# PB-06-09 — QA de persistência no browser

**Data:** 2026-08-20  
**Branch:** `codex/pb06-09-save-browser-qa`  
**Ambiente:** Node `v24.14.0`, pnpm `11.21.0`, Playwright `1.62.1`, projeto `correctness`, Chromium, Windows.

## Resultado

O handoff está bloqueado. A especificação e os artefatos foram produzidos, mas o aceite não pode ser
declarado por dois defeitos reproduzidos sem `retries`:

1. a UI não exibe `SAVE_VERSION_UNSUPPORTED` ao rejeitar um save futuro;
2. o caso de reload ainda depende do helper de combate, que falhou em 1 de 10 execuções em
   `1920x1080` com `Target cycling did not select a living combat target`.

Nenhum arquivo em `packages/**` ou `apps/game/src/**` foi alterado.

## Evidência de execução

Pré-condições concluídas:

| Comando | Resultado |
|---|---:|
| `corepack pnpm install --prefer-offline` | exit 0 |
| `corepack pnpm test` (baseline, antes da spec) | exit 0 |
| `corepack pnpm build` (antes do Playwright) | exit 0 |
| `corepack pnpm exec biome check tests/e2e/save-persistence.spec.ts` | exit 0 |
| `corepack pnpm typecheck` | exit 0 |

Casos estáveis, sempre com `--retries=0 --repeat-each=10`, quatro viewports e limpeza do IndexedDB
antes/depois de cada caso:

| Caso | Execuções | Resultado |
|---|---:|---:|
| reload do stash consolidado | 40 | 40 passadas |
| abandono e reload | 40 | 40 passadas |
| export canônico | 40 | 40 passadas |
| falha de persistência | 40 | 40 passadas |

O reload passou 9/10 em uma rodada final focada em `1920x1080`. O vermelho foi no helper existente
`tests/e2e/support/combatDriver.ts:373`, antes da verificação do save. Uma rodada anterior completa
teve 39/40 pelo mesmo viewport, primeiro expondo uma corrida de leitura de checkpoint; o harness foi
ajustado para capturar o primeiro `IndexedDB.get()` usado pelo bootstrap. A corrida do combat driver
permanece e não foi mascarada com retry.

O comando final foi:

```text
corepack pnpm exec playwright test tests/e2e/save-persistence.spec.ts --project=correctness --grep "reload resumes.*1920x1080" --retries=0 --repeat-each=10 --reporter=line
```

Resultado: exit 1, 9 passadas e 1 falha.

## Boot e console

O `save-boot` mede `performance.mark('huntbound:shell-actionable')`. Na rodada completa de reload,
os intervalos observados foram:

| Viewport | `actionable` observado |
|---|---:|
| `390x844` | 461,8–598,6 ms |
| `768x1024` | 441,5–863,5 ms |
| `1366x768` | 473,0–679,0 ms |
| `1920x1080` | 586,8–766,3 ms |

Os casos que passaram executaram `expectQuiet`: zero `console.error`, `pageerror`, request
fracassada ou resposta HTTP `>= 400`. A falha do reload foi de seleção de alvo no helper de
combate, não de console nem de IndexedDB. B2 não foi envolvido: o vermelho não é `hunt-budget`.

## Export e import futuro

Cada viewport gerou duas exportações consecutivas e comparou ambas byte a byte com
`packages/test-fixtures/save/pb06/export.golden.txt`; 40/40 passaram.

O comando final do caso futuro foi:

```text
corepack pnpm exec playwright test tests/e2e/save-persistence.spec.ts --project=correctness --grep "future save version" --retries=0 --reporter=list
```

Resultado: exit 1 em 4/4 viewports. O save existente permaneceu igual antes da asserção que falha.

```text
Expected substring: SAVE_VERSION_UNSUPPORTED
Received: Save replacement failed: Save schema version 2 is newer than supported version 1
```

O código de erro existe no `SaveError`, mas é descartado ao montar a mensagem em
`apps/game/src/save/SaveSession.ts`/UI. Corrigir isso está fora do escopo desta task.

## Screenshots

As quatro imagens foram geradas com `HUNTBOUND_SAVE_SCREENSHOTS=write`; o teste validou assinatura
PNG, dimensões e painel de inventário visível:

- [390x844](screenshots/save-mobile-390x844.png)
- [768x1024](screenshots/save-tablet-768x1024.png)
- [1366x768](screenshots/save-desktop-1366x768.png)
- [1920x1080](screenshots/save-desktop-wide-1920x1080.png)

## Gates não executados

`qa:browser`, `save:check` e `verify` não foram executados após a implementação: o card determina
parar diante da falha de correctness e registrar o defeito, sem integrar uma task vermelha.
