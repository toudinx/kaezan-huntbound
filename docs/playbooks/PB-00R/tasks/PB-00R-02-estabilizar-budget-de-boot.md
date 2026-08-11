# PB-00R-02 — Estabilizar o budget de boot

**Status inicial:** pending

**Classe da tarefa:** implementação complexa e debugging intermitente

**Modelo sugerido:** GPT-5.6 Sol `xhigh` ou Claude Opus 5

**Validador sugerido:** o modelo frontier diferente do implementador

**Rota:** `game-studio:game-playtest` + `superpowers:systematic-debugging` +
`superpowers:test-driven-development` + `superpowers:verification-before-completion`

**Paralelismo:** não. Começa somente depois de PB-00R-04 integrado e sem outro Playwright na porta
4173.

## Objetivo

Eliminar ou explicar com evidência a variação que faz o shell ultrapassar 5.000 ms no perfil Fast
4G, mantendo a medição fria, sem retry e reproduzível em processos limpos.

## Resultado esperado

Toda execução anexa métricas de navegação e recursos. Cinco processos Playwright consecutivos,
iniciados separadamente, observam um único mark `huntbound:shell-actionable` em até 5.000 ms. Se a
causa exigir redução do bundle fora de escopo, a task bloqueia com evidência, sem maquiar o gate.

## Dependências

- PB-00R-04 integrado e `dist/game` limpo por build.
- Working tree limpa na branch `codex/pb00r-02-boot-budget`.
- Porta 4173 livre.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-00R/STATE.md`;
3. `docs/playbooks/PB-00R/artifacts/acceptance-report.md`;
4. `docs/08_POLITICA_MODELOS_AGENTES.md`;
5. `tests/e2e/boot-budget.spec.ts`;
6. `apps/game/src/runtime/performance.ts` e seu teste;
7. `apps/game/src/main.ts`;
8. `playwright.config.ts`;
9. `apps/game/vite.config.ts`;
10. `docs/playbooks/PB-00/artifacts/browser-qa.md`.

## Decisões congeladas

- Budget: 5.000 ms desde navigation start até o primeiro mark acionável.
- Rede: 150 ms de latência, 200.000 bytes/s de download e 93.750 bytes/s de upload.
- Cache desabilitado, contexto novo, um worker e zero retry para o teste de budget.
- Não usar `waitForTimeout` para alterar a medição.
- Não aquecer build/browser, aumentar budget, reduzir throttling ou aceitar média/percentil.
- Code splitting e troca de engine estão fora de escopo.
- Uma execução acima de 5.000 ms falha a sequência inteira.

## Escopo permitido

```text
tests/e2e/boot-budget.spec.ts
tests/e2e/support/bootMetrics.ts
tests/e2e/support/bootMetrics.test.ts
playwright.config.ts
apps/game/src/main.ts
apps/game/src/runtime/performance.ts
apps/game/src/runtime/performance.test.ts
docs/playbooks/PB-00R/STATE.md
docs/playbooks/PB-00R/artifacts/acceptance-report.md
```

Arquivos de produção só mudam após evidência demonstrar causa neles e exigem teste red-green próprio.

## Fora de escopo

- aumentar budget, retry ou worker count;
- code splitting, nova dependência, service worker ou preloading artificial;
- mudar UI, resize, package scripts ou output Vite;
- otimizar por hipótese sem métricas que identifiquem a fase lenta.

## Execução sistemática

- [ ] **1. Confirmar baseline integrado.**

```text
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm exec playwright test tests/e2e/boot-budget.spec.ts --workers=1
```

Registre mark, exit code e se a execução passou. Não use retry.

- [ ] **2. Criar tipos e serialização de métricas com teste primeiro.**

Crie `tests/e2e/support/bootMetrics.test.ts` com casos que exigem ordenação decrescente por duração e
limite de cinco recursos críticos:

```ts
import { describe, expect, it } from 'vitest';

import { criticalResources } from './bootMetrics';

describe('criticalResources', () => {
  it('returns the five slowest resources in descending order', () => {
    const resources = [6, 1, 5, 2, 4, 3].map((duration, index) => ({
      name: `resource-${index}`,
      initiatorType: 'script',
      startTime: index,
      duration,
      transferSize: 100,
      encodedBodySize: 90,
      decodedBodySize: 120,
    }));

    expect(criticalResources(resources).map(({ duration }) => duration)).toEqual([
      6, 5, 4, 3, 2,
    ]);
  });
});
```

Execute `corepack pnpm exec vitest run tests/e2e/support/bootMetrics.test.ts` e confirme RED por módulo
ausente.

- [ ] **3. Implementar helper puro.**

Crie `tests/e2e/support/bootMetrics.ts` com `BootResourceMetric`, `BootNavigationMetric` e função:

```ts
export interface BootResourceMetric {
  readonly name: string;
  readonly initiatorType: string;
  readonly startTime: number;
  readonly duration: number;
  readonly transferSize: number;
  readonly encodedBodySize: number;
  readonly decodedBodySize: number;
}

export interface BootNavigationMetric {
  readonly responseStart: number;
  readonly responseEnd: number;
  readonly domInteractive: number;
  readonly domContentLoadedEventEnd: number;
  readonly loadEventEnd: number;
}

export function criticalResources(
  resources: readonly BootResourceMetric[],
): BootResourceMetric[] {
  return [...resources]
    .sort((left, right) => right.duration - left.duration)
    .slice(0, 5);
}
```

Execute o teste até GREEN.

- [ ] **4. Anexar métricas em toda execução do budget.**

Faça o teste receber `testInfo`. Depois do shell ready e antes da assertion, leia:

- mark acionável e quantidade de marks;
- `PerformanceNavigationTiming`: `responseStart`, `responseEnd`, `domInteractive`,
  `domContentLoadedEventEnd`, `loadEventEnd`;
- todos os `PerformanceResourceTiming`: name, initiatorType, startTime, duration, transferSize,
  encodedBodySize e decodedBodySize;
- cinco recursos mais lentos via `criticalResources`.

Anexe JSON com `testInfo.attach('boot-metrics', { body, contentType: 'application/json' })` e imprima
uma linha `[boot-budget] actionable=<ms> responseEnd=<ms> slowest=<nome>:<ms>`. A assertion de 5.000
ms permanece depois do anexo para que falhas preservem diagnóstico.

- [ ] **5. Executar sequência diagnóstica em processos separados.**

No PowerShell, execute:

```powershell
1..5 | ForEach-Object {
  corepack pnpm exec playwright test tests/e2e/boot-budget.spec.ts --workers=1
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

Cada iteração inicia novo processo Playwright/Chromium. Registre os cinco marks e métricas. Se houver
falha, pare a sequência e classifique com evidência:

- `responseEnd` alto: rede/servidor/transferência;
- `responseEnd` normal e mark alto: parse/execução/Phaser;
- recurso individual alto: request específico;
- marks ausentes/duplicados: instrumentação/lifecycle.

- [ ] **6. Formular e testar uma hipótese por vez.**

Registre no `STATE.md` a métrica que sustenta a hipótese. Faça somente a menor mudança capaz de
alterar essa métrica. Antes da mudança, adicione teste que reproduza o mecanismo quando ele for
determinístico. Reexecute uma vez o teste isolado e depois a sequência de cinco processos.

Se nenhuma causa controlável for demonstrada, não edite produção: marque `BLOCKED` com os cinco JSONs
e a fase responsável.

- [ ] **7. Executar gates finais da task.**

Após obter cinco passes consecutivos:

```text
corepack pnpm exec vitest run tests/e2e/support/bootMetrics.test.ts
corepack pnpm --filter @huntbound/game test
corepack pnpm typecheck
corepack pnpm build
corepack pnpm qa:browser
git diff --check
git status --short
```

- [ ] **8. Revisão independente e commit.**

Um Sol/Opus diferente do implementador revisa métricas, causalidade e proibição de enfraquecer o
gate. Atualize `STATE.md` e `acceptance-report.md` com cinco marks, causa, fix, modelos e veredito.

```text
git add tests/e2e/boot-budget.spec.ts tests/e2e/support/bootMetrics.ts tests/e2e/support/bootMetrics.test.ts playwright.config.ts apps/game/src/main.ts apps/game/src/runtime/performance.ts apps/game/src/runtime/performance.test.ts docs/playbooks/PB-00R/STATE.md docs/playbooks/PB-00R/artifacts/acceptance-report.md
git commit -m "test: stabilize cold boot budget evidence"
```

Adicione ao commit somente arquivos realmente alterados; não crie alterações vazias nos paths
permitidos.

## Critérios de aceite

- [ ] Toda execução, inclusive falha, preserva JSON diagnóstico.
- [ ] Helper de métricas possui teste unitário aprovado.
- [ ] Causa da variação está demonstrada por métricas, não inferida por timing total.
- [ ] Cinco processos frios consecutivos ficam em até 5.000 ms.
- [ ] Rede, cache, retries, workers e budget permanecem congelados.
- [ ] QA browser completo, testes do app, typecheck e build passam.
- [ ] Validador diferente confirma que o gate não foi enfraquecido.

## Condições de parada

Pare e reporte `BLOCKED` se a causa exigir code splitting/nova dependência, se o host externo impedir
cinco execuções confiáveis, se a única solução for afrouxar o teste ou se as métricas não distinguirem
rede de execução. Preserve anexos e não declare PB-01 elegível.

## Relatório final

Comece com `APPROVED` ou `BLOCKED`; liste cinco marks, fase lenta, hipótese comprovada, mudança,
comandos/exit codes, modelos implementador/validador, commit e elegibilidade de PB-00R-05. Não
execute PB-00R-05.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound.

Use GPT-5.6 Sol com effort xhigh ou Claude Opus 5. A validação deve usar o outro modelo frontier.
Use obrigatoriamente as skills game-studio:game-playtest, superpowers:systematic-debugging,
superpowers:test-driven-development e superpowers:verification-before-completion.

Execute integralmente e somente a task:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-00R\tasks\PB-00R-02-estabilizar-budget-de-boot.md

Antes de editar, confirme que PB-00R-04 está integrado, que a working tree está limpa, que a branch
é codex/pb00r-02-boot-budget e que a porta 4173 está livre. Esta task não pode rodar em paralelo com
outra verificação Playwright.

Leia o STATE.md e somente as referências listadas. Não aumente budget, retry, workers, cache ou
throttling. Use debugging sistemático: primeiro anexe métricas em toda execução, depois rode cinco
processos frios, classifique a fase lenta e altere somente uma causa comprovada por vez. Se a causa
exigir code splitting ou não for controlável neste escopo, registre BLOCKED sem maquiar o gate.

Execute todas as verificações, obtenha revisão do modelo frontier diferente, atualize STATE.md e
acceptance-report.md, crie o commit test: stabilize cold boot budget evidence e encerre com evidências,
modelos/efforts e hash. Não execute PB-00R-05 neste chat.
```
