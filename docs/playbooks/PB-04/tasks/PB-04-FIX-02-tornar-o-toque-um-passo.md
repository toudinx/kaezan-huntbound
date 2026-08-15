# PB-04-FIX-02 — Tornar um toque igual a um passo

**Status inicial:** pending

**Classe da tarefa:** correção de defeito de produto com teste vermelho reproduzido

**Modelo sugerido:** GPT-5.6 Luna `xhigh`; fallback Claude Opus 5. Prefira modelo **diferente** do
auditor que abriu este card.

**Rota:** `superpowers:test-driven-development`, depois
`superpowers:verification-before-completion`.

**Paralelismo:** pode paralelizar com PB-04-FIX-03 e PB-04-FIX-04; não tocam os mesmos arquivos.

## Defeito

`InputMap.drain()` é **level-triggered**: devolve a direção que está segurada no instante em que o
`inputGate` abre, uma vez por tick. Como o tick é de `50 ms`, um toque curto atravessa uma ou duas
aberturas de tick conforme a fase em que cai — e vira **um ou dois passos**, sem que o jogador tenha
mudado nada.

Consequência de produto: **não é possível dar exatamente um passo de propósito.** Num jogo de grid
isso é precisão de movimento não determinística.

Consequência de gate: `tests/e2e/hunt-play.spec.ts:265` falha em 100% das primeiras tentativas e é
mascarado por `retries: 1` em `playwright.config.ts:12`.

## Reprodução medida pela auditoria PB-04-10

```powershell
corepack pnpm exec playwright test tests/e2e/hunt-play.spec.ts -g "one paced command" --retries=0 --repeat-each=10
```

Resultado: `10 failed`, exit `1`. Esperado `1` comando, observados `2`, em ticks consecutivos.

Também falhou na primeira tentativa das duas execuções de `corepack pnpm verify` da auditoria, com
ticks `11`/`12` e `13`/`14`, passando no retry das duas.

Em jogo, com teclado real, um toque de `70 ms` a partir de `(21,7,8)` produziu `3` comandos numa
ocasião e `1` em outra.

## Resultado esperado

Um toque produz **exatamente um** passo, de forma independente da fase do tick. Segurar continua
produzindo cadência de um passo por abertura de gate, respeitando o cooldown de `10` ticks.

A distinção correta é **edge vs level**: o primeiro passo vem do `keydown`/`pointerdown` (borda), e a
repetição só engata depois de um limiar de hold declarado. Congele o limiar como constante nomeada,
não como número solto.

## Dependências

Nenhuma. O defeito está isolado em `apps/game/src/input/` e no consumo em `HuntScene.update`.

## Leitura mínima

1. este card;
2. `docs/playbooks/PB-04/artifacts/acceptance-report.md`, §8 D1;
3. `apps/game/src/input/InputMap.ts` inteiro;
4. `apps/game/src/phaser/scenes/HuntScene.ts:195-230`;
5. `tests/e2e/hunt-play.spec.ts:265-297` e `tests/e2e/support/huntDriver.ts:159-180`;
6. `docs/superpowers/specs/2026-08-15-pb-04-corrective-hunt-experience-design.md`, seção de input.

## Decisões congeladas

- O kernel **não muda**. Esta é uma correção de camada de input; `packages/simulation` fica intacto.
- `hunt:check` e `simulation:check` devem continuar saindo `0` com **os mesmos digests** de §4 do
  relatório de aceite. Se um digest mudar, o passo mudou semântica e isso exige justificativa
  explícita, não regeneração silenciosa.
- O d-pad por pointer tem de receber o mesmo tratamento do teclado: um toque é um passo.
- Não "consertar" o teste afrouxando a asserção. A asserção está certa; o comportamento é que não
  está.

## Escopo permitido

```text
apps/game/src/input/**
apps/game/src/phaser/scenes/HuntScene.ts
tests/e2e/hunt-play.spec.ts
tests/e2e/support/huntDriver.ts
docs/superpowers/specs/2026-08-15-pb-04-corrective-hunt-experience-design.md
```

## Fora de escopo

- `packages/simulation`, `packages/contracts`, `packages/content` e qualquer fixture ou golden;
- `playwright.config.ts` — a política de retry pertence a PB-04-FIX-04;
- qualquer trabalho de PB-05.

## Execução

- [ ] **1. Reproduzir o vermelho antes de tocar em código.** Rode o comando de reprodução acima e
      registre `10 failed` com exit `1`. Sem esse registro não há prova de que a correção corrigiu
      algo.
- [ ] **2. Escrever o teste unitário que falta.** `InputMap.test.ts` deve provar, sem browser, que
      duas leituras consecutivas de `drain()` sob um único `keydown` não produzem duas bordas.
      Entre RED por ausência do comportamento.
- [ ] **3. Tornar o primeiro passo edge-triggered**, preservando a cadência de hold e o gate por
      tick.
- [ ] **4. Cobrir o d-pad** com o mesmo invariante, por pointer real.
- [ ] **5. Provar por mutação.** Reverter a correção tem de derrubar o teste novo. Restaure e
      confirme verde.
- [ ] **6. Rodar o vermelho original**, agora com `--retries=0 --repeat-each=10`, e exigir
      `10 passed`.
- [ ] **7. Confirmar que os digests não se moveram:** `hunt:check` e `simulation:check` exit `0` com
      os mesmos SHA-256.
- [ ] **8. Gate completo:** `corepack pnpm verify` exit `0`, **sem nenhum flaky**.

## Critérios de aceite

- [ ] O vermelho original foi registrado antes da correção, com exit code.
- [ ] `playwright test -g "one paced command" --retries=0 --repeat-each=10` sai `0` com `10 passed`.
- [ ] Existe teste unitário de `InputMap` que falha se o comportamento voltar a ser level-triggered,
      provado por mutação.
- [ ] O d-pad tem o mesmo invariante provado por pointer real.
- [ ] `hunt:check` e `simulation:check` saem `0` com digests inalterados.
- [ ] `corepack pnpm verify` sai `0` e o relatório do Playwright não lista **nenhum** flaky.
- [ ] O limiar de hold está congelado como constante nomeada e documentado na spec.

## Condições de parada

Pare se corrigir o input mover qualquer digest de `hunt:check`. Isso significa que o caminho de
comando mudou semântica, o que é decisão de supervisor e não pode ser absorvido por esta task.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna effort xhigh, ou Claude Opus 5 como
fallback. Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-04\tasks\PB-04-FIX-02-tornar-o-toque-um-passo.md

Leia antes o §8 D1 de docs/playbooks/PB-04/artifacts/acceptance-report.md. Crie branch e worktree
isoladas e rode "corepack pnpm install --prefer-offline" dentro dela.

O defeito: InputMap.drain() e level-triggered, entao um toque curto vira um ou dois passos conforme
a fase do tick. Comece REPRODUZINDO o vermelho:
corepack pnpm exec playwright test tests/e2e/hunt-play.spec.ts -g "one paced command" --retries=0 --repeat-each=10
Registre o exit code. Depois torne o primeiro passo edge-triggered, preservando a cadencia de hold e
o cooldown de 10 ticks, e cubra tambem o d-pad por pointer real.

NAO afrouxe a assercao do teste: ela esta certa. NAO toque em packages/simulation, em fixture, em
golden nem em playwright.config.ts. Se qualquer digest de hunt:check se mover, PARE e reporte.

Prove por mutacao que o teste novo pega a regressao. Finalize com corepack pnpm verify exit 0 e sem
nenhum flaky no relatorio do Playwright.

Nao inicie nenhum trabalho de PB-05.
```
