# PB-04-FIX-02 — Input edge-triggered Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer cada toque de teclado ou d-pad produzir exatamente uma intenção de movimento, mantendo a repetição de hold por abertura do gate e sem alterar o kernel.

**Architecture:** `InputMap` continuará sendo a fronteira entre eventos DOM e intenções de movimento. A camada guardará uma borda pendente, o conjunto de controles segurados e um contador de oportunidades de repetição; `HuntScene` continuará consumindo no `TickInputGate` existente. Testes unitários provarão a máquina de estado sem browser e um teste Playwright provará o mesmo contrato usando pointer real.

**Tech Stack:** TypeScript, Vitest, Phaser 4, Playwright, pnpm/Corepack.

## Global Constraints

- O kernel não muda; `packages/simulation` fica intacto.
- `HOLD_REPEAT_DELAY_TICKS = 1` é a constante nomeada e documentada para o limiar de hold.
- O primeiro passo é disparado por `keydown`/`pointerdown`; `keydown` repetido pelo sistema operacional não cria nova borda.
- Soltar antes da próxima abertura do gate não cria passo extra, mas uma borda já capturada continua válida para um único `drain()`.
- Teclado e d-pad passam pela mesma máquina de estado.
- `hunt:check` e `simulation:check` devem continuar com os mesmos digests registrados no baseline.
- Não tocar em `packages/simulation`, `packages/contracts`, `packages/content`, fixtures, goldens ou `playwright.config.ts`.
- Não afrouxar a asserção E2E de `turns a short held direction into one paced command`.

---

### Task 1: Escrever as regressões de input antes da implementação

**Files:**
- Modify: `apps/game/src/input/InputMap.test.ts`
- Modify: `tests/e2e/support/huntDriver.ts`
- Modify: `tests/e2e/hunt-mobile.spec.ts`

**Interfaces:**
- Consumes: `createInputMap()`, os eventos de teste de `TestInputTarget`, `TICK_DURATION_MS` e os helpers existentes de estado da hunt.
- Produces: uma expectativa unitária para borda de teclado, uma expectativa unitária para borda de d-pad e `tapDpadFor(page, direction, durationMs)` para o teste pointer real.

- [ ] **Step 1: Alterar o teste unitário para modelar um toque curto de teclado.**

  Em `InputMap.test.ts`, após anexar o alvo, dispatch `KeyW` e `keyup` antes do primeiro `drain()`. O contrato esperado é uma ação norte no primeiro `drain()` e uma lista vazia no segundo:

  ```ts
  target.keyDown('KeyW');
  target.keyUp('KeyW');

  expect(input.drain()).toEqual([{ kind: 'step', direction: 'n' }]);
  expect(input.drain()).toEqual([]);
  ```

  Atualize o teste do d-pad para fazer `pointerDown('nw')` e `pointerUp('nw')` antes da primeira leitura, com a mesma expectativa de uma ação seguida de vazio. Mantenha um teste separado de hold que leia enquanto a direção segue pressionada, para preservar a cadência existente.

- [ ] **Step 2: Rodar o teste unitário para confirmar RED.**

  Run: `corepack pnpm --filter @huntbound/game exec vitest run src/input/InputMap.test.ts`

  Expected: FAIL porque a implementação atual consulta apenas os controles segurados e perde um toque liberado antes de `drain()`; a falha deve apontar a primeira expectativa de teclado ou d-pad, não erro de compilação.

- [ ] **Step 3: Adicionar um helper de toque curto de d-pad usando pointer real.**

  Em `tests/e2e/support/huntDriver.ts`, adicione `tapDpadFor(page, direction, durationMs)` ao lado de `stepWithDpad`. Ele deve reutilizar `beginStep`, localizar `[data-testid="hunt-dpad"] [data-hunt-direction="${direction}"]`, calcular o centro via `boundingBox()`, executar `page.mouse.move`, `page.mouse.down`, `page.waitForTimeout(durationMs)` e `page.mouse.up` em `finally`, aguardar `waitForPlayerAnswer` e retornar `endStep(page, before)`.

- [ ] **Step 4: Adicionar o gate E2E do d-pad.**

  Em `tests/e2e/hunt-mobile.spec.ts`, importe `TICK_DURATION_MS` e `tapDpadFor`. Adicione um teste que aguarde a hunt, faça `tapDpadFor(page, 's', TICK_DURATION_MS - 10)` e exija exatamente um evento de movimento e exatamente um comando:

  ```ts
  const outcome = await tapDpadFor(page, 's', TICK_DURATION_MS - 10);
  expect(movedEvents(outcome)).toHaveLength(1);
  expect(outcome.commands).toHaveLength(1);
  ```

- [ ] **Step 5: Rodar os testes de input e pointer para confirmar RED.**

  Run: `corepack pnpm --filter @huntbound/game exec vitest run src/input/InputMap.test.ts`

  Expected: the new unit assertions FAIL.

  Run: `corepack pnpm exec playwright test tests/e2e/hunt-mobile.spec.ts -g "short d-pad tap" --retries=0`

  Expected: FAIL because the level-triggered input can enqueue more than one command during the short pointer hold. If the current browser timing does not expose the failure, keep the unit RED as the required precondition and do not weaken the E2E assertions.

### Task 2: Implementar a máquina edge-triggered no InputMap

**Files:**
- Modify: `apps/game/src/input/InputMap.ts`
- Test: `apps/game/src/input/InputMap.test.ts`

**Interfaces:**
- Consumes: existing `attach(target)`, `detach()` and `drain()` calls from `main.ts` and `HuntScene.update`.
- Produces: `drain(): readonly InputAction[]` que entrega uma borda pendente uma vez e depois repete a direção segurada conforme `HOLD_REPEAT_DELAY_TICKS`.

- [ ] **Step 1: Declarar o limiar nomeado e o estado mínimo.**

  Em `InputMap.ts`, declare `const HOLD_REPEAT_DELAY_TICKS = 1` junto às constantes do módulo. Dentro de `createInputMap()`, adicione `pendingDirection: Direction | undefined` e `holdTicks = 0`, mantendo `heldKeys`, `heldDpadDirections` e a assinatura pública atual.

- [ ] **Step 2: Criar helpers internos para direção atual e captura de borda.**

  Preserve `directionFromAxes` e a prioridade atual do d-pad. Extraia uma leitura `currentDirection()` que devolva primeiro a direção do d-pad e depois os eixos do teclado. Um helper `armEdge()` deve capturar a direção atual em `pendingDirection` quando ela existir e zerar `holdTicks`.

- [ ] **Step 3: Fazer eventos físicos armarem uma única borda.**

  Em `onKeyDown`, ignore códigos não mapeados, chame `preventDefault()`, adicione somente a transição de uma tecla ainda não segurada e arme a borda. Um `keydown` repetido enquanto o mesmo código está em `heldKeys` não pode rearmar a ação. Em `onPointerDown`, faça o mesmo para uma direção que ainda não esteja em `heldDpadDirections`. `keyup` e `pointerup` devem remover o controle e zerar o contador de hold, sem apagar uma borda já capturada.

- [ ] **Step 4: Fazer cancelamento e detach limparem bordas não consumidas.**

  `blur`, `pointercancel` e `detach` devem limpar `heldKeys`, `heldDpadDirections`, `pendingDirection` e `holdTicks`. Um `pointerup` ou `keyup` normal deve preservar `pendingDirection` para que um toque liberado antes do tick ainda produza um passo.

- [ ] **Step 5: Implementar `drain()` com edge primeiro e hold depois.**

  A ordem exata deve ser:

  1. Se `pendingDirection` existir, copie-a, limpe-a, zere `holdTicks` e retorne uma ação congelada.
  2. Se não houver direção segurada, zere `holdTicks` e retorne a lista vazia congelada.
  3. Incremente `holdTicks`; enquanto for menor que `HOLD_REPEAT_DELAY_TICKS`, retorne vazio.
  4. Ao alcançar o limiar, zere `holdTicks` e retorne a direção atual como uma ação congelada.

  Preserve o retorno imutável e o máximo de uma ação por leitura. Não altere `TickInputGate`, `HuntScene`, o driver ou o kernel.

- [ ] **Step 6: Rodar o teste unitário para confirmar GREEN.**

  Run: `corepack pnpm --filter @huntbound/game exec vitest run src/input/InputMap.test.ts`

  Expected: PASS, incluindo o toque de teclado liberado antes da leitura, o toque de d-pad liberado antes da leitura, a repetição de hold e os testes existentes de eixos, detach e teclas desconhecidas.

- [ ] **Step 7: Rodar o teste E2E do d-pad e o gate original uma vez.**

  Run: `corepack pnpm exec playwright test tests/e2e/hunt-mobile.spec.ts -g "short d-pad tap" --retries=0`

  Expected: PASS with exactly one movement and one command.

  Run: `corepack pnpm exec playwright test tests/e2e/hunt-play.spec.ts -g "one paced command" --retries=0`

  Expected: PASS with exactly one command.

### Task 3: Provar mutação, preservar digests e executar o gate completo

**Files:**
- Verify: `apps/game/src/input/InputMap.ts`, `apps/game/src/input/InputMap.test.ts`, `tests/e2e/hunt-play.spec.ts`, `tests/e2e/hunt-mobile.spec.ts`, `docs/superpowers/specs/2026-08-15-pb-04-corrective-hunt-experience-design.md`

**Interfaces:**
- Consumes: a implementação verde da Task 2 e os digests baseline registrados antes da alteração.
- Produces: evidência de que a regressão volta a falhar quando o input retorna a level-triggered, depois todos os gates verdes sem mudança de digest.

- [ ] **Step 1: Rodar a mutação controlada no input.**

  Faça uma alteração temporária apenas em `InputMap.ts` que remova o consumo de `pendingDirection` e volte `drain()` a depender somente de `currentDirection()`/estado segurado. Rode:

  ```text
  corepack pnpm --filter @huntbound/game exec vitest run src/input/InputMap.test.ts
  ```

  Expected: FAIL nas expectativas de toque curto. Restaure a implementação edge-triggered com `apply_patch` e rode o mesmo comando novamente; Expected: PASS. Não commitá a mutação.

- [ ] **Step 2: Reexecutar a reprodução original 10× sem retry.**

  Run: `corepack pnpm exec playwright test tests/e2e/hunt-play.spec.ts -g "one paced command" --retries=0 --repeat-each=10`

  Expected: exit `0` e `10 passed`, com nenhuma tentativa repetida ou flaky.

- [ ] **Step 3: Comparar os checks determinísticos com o baseline.**

  Run: `corepack pnpm hunt:check`

  Expected: exit `0` e estes digests inalterados:

  ```text
  pb04 scenario f8ecff35694c0ba8557546f40d0f7ad384746a0027f0bc3a5c51b2777f88c6e0
  pb04 commands 8c88860bd1dd355b37ac2e16dc2e989aaa2c324ad55637058bb51d33634c7e67
  pb04 snapshot 2e546b17a6905f5be29393b388df0c7dc37919fa75d09d8bcbb776bd75756816
  pb04 events 6e1206eb2ce7ed7647e9923b6d29a3f08f30ca7ec9ddf01b539d6310818d42e1
  pb04-respawn scenario f8ecff35694c0ba8557546f40d0f7ad384746a0027f0bc3a5c51b2777f88c6e0
  pb04-respawn commands 01e139f9d8fd41fd7c53fc70dcf15286bb49c08ac874da7f43a82d2c22bc1efa
  pb04-respawn snapshot 2e968f79b850725dd2942ffc2421108b9f4cc09a82b13bda19995fad43e993d3
  pb04-respawn events 613079d592335829a8e9e7565877c046cee9e21f0f4478b38af4050b7334ba30
  ```

  Run: `corepack pnpm simulation:check`

  Expected: exit `0` e estes digests inalterados:

  ```text
  scenario 72d006552742691fbb71cd41bc84a80aebf0afd27faef027e358b4d92fcc23e9
  commands 88ec73de434a7bf092c68bb3a3601caaef1bfca2b59d9b84f20f334462749d66
  snapshot 84528f5246c156b65e46343d713851d064943c3550281bba0ab0e5d18d10d341
  events 31f86d62195354fc0ec324d49f24a6b65385b91e6f395d62b0a1d211555888d4
  ```

- [ ] **Step 4: Rodar a verificação completa e inspecionar o relatório Playwright.**

  Run: `corepack pnpm verify`

  Expected: exit `0`, todos os testes passando, e o relatório não mostrando tentativas flaky ou falhas recuperadas por retry.

- [ ] **Step 5: Confirmar escopo e qualidade antes do commit final.**

  Run: `git diff --check`

  Expected: sem whitespace errors.

  Run: `git status --short` e `git diff --name-only HEAD~2..HEAD`

  Expected: somente os arquivos permitidos pela task, além do plano/spec e da infraestrutura de worktree já registrada; nenhum arquivo em `packages/simulation`, fixtures, goldens ou `playwright.config.ts`.

- [ ] **Step 6: Commitar a implementação verificada.**

  ```text
  git add apps/game/src/input/InputMap.ts apps/game/src/input/InputMap.test.ts tests/e2e/support/huntDriver.ts tests/e2e/hunt-mobile.spec.ts
  git commit -m "fix: make hunt taps single-step input"
  ```
