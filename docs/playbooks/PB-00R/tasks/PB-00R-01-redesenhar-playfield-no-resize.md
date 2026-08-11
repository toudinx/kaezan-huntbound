# PB-00R-01 — Redesenhar o playfield no resize

**Status inicial:** pending

**Classe da tarefa:** implementação menor e bem especificada

**Modelo sugerido:** GPT-5.6 Luna, effort `xhigh`

**Validador sugerido:** GPT-5.6 Sol `xhigh` ou Claude Opus 5

**Rota:** `game-studio:phaser-2d-game` + `game-studio:game-playtest` +
`superpowers:test-driven-development` + `superpowers:verification-before-completion`

**Paralelismo:** onda 1; pode executar em paralelo com PB-00R-03 e PB-00R-04, somente em worktree
isolado. Verificações na porta 4173 devem ser serializadas no mesmo host.

## Objetivo

Fazer a geometria de apresentação da `ShellScene` acompanhar resize pós-boot e proteger o
comportamento com regressão visual na mesma sessão do browser.

## Resultado esperado

Após boot em 390×844 e resize para 1366×768, a grade cobre todo o canvas. Resizes repetidos não
escurecem linhas por redraw duplicado, não criam canvas/overlay extras e não deixam listeners após o
shutdown da scene.

## Dependências

- PB-00R criado e commitado.
- Working tree limpa ou worktree isolado na branch `codex/pb00r-01-resize`.
- Nenhuma execução Playwright concorrente na porta 4173.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-00R/STATE.md`;
3. `docs/playbooks/PB-00R/README.md`;
4. `docs/08_POLITICA_MODELOS_AGENTES.md`;
5. `apps/game/src/phaser/scenes/ShellScene.ts`;
6. `tests/e2e/shell.spec.ts`;
7. `playwright.config.ts`.

## Decisões congeladas

- A grade é placeholder de apresentação; não vira gameplay, tilemap ou estado de simulação.
- `SceneBridge`, `ViewportController` e CSS não são redesenhados.
- O evento normativo é `Phaser.Scale.Events.RESIZE`.
- O listener é removido em `Phaser.Scenes.Events.SHUTDOWN`.
- Não adicionar hook de produção apenas para o teste.
- Os quatro baselines existentes não são regenerados sem diferença deliberada.

## Escopo permitido

```text
apps/game/src/phaser/scenes/ShellScene.ts
tests/e2e/shell.spec.ts
tests/e2e/shell.spec.ts-snapshots/shell-mobile-to-desktop-win32.png
docs/playbooks/PB-00R/STATE.md
docs/playbooks/PB-00R/artifacts/acceptance-report.md
```

## Fora de escopo

- mudar spacing, cor, opacidade ou direção visual da grade;
- refatorar bridge, lifecycle, viewport controller ou AppShell;
- touch, orientação mobile completa, gameplay ou câmera;
- alterar budget de boot ou Vite;
- iniciar PB-00R-02.

## Execução red-green

- [ ] **1. Confirmar o defeito manual reproduzível.**

Abra a build em 390×844, redimensione a mesma página para 1366×768 e capture screenshot temporária.
Confirme que a grade termina perto de 390 px enquanto canvas e label reportam 1366×768.

- [ ] **2. Escrever o E2E pós-resize antes da correção.**

Em `tests/e2e/shell.spec.ts`, adicione:

```ts
test('redraws the playfield after in-session viewport changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('[data-shell-ready="true"]')).toHaveCount(1);
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('[data-testid="shell-viewport"]')).toContainText(
    '1366 × 768',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('#game-root canvas')).toHaveCount(1);
  await expect(page.locator('[data-testid="app-shell"]')).toHaveCount(1);
  await expect(page).toHaveScreenshot('shell-mobile-to-desktop.png', {
    fullPage: true,
  });
});
```

- [ ] **3. Executar o novo teste e observar RED.**

```text
corepack pnpm build
corepack pnpm exec playwright test tests/e2e/shell.spec.ts --grep "redraws the playfield"
```

Resultado esperado: falha por baseline ausente ou diferença visual; a imagem recebida mostra a área
sem grade após x≈390. Abra a imagem no tamanho original antes de editar runtime.

- [ ] **4. Implementar redraw mínimo na scene.**

Mantenha uma única instância `Phaser.GameObjects.Graphics`, extraia o desenho para um método que
começa com `clear()`, e faça o handler receber `Phaser.Structs.Size`:

```ts
private grid?: Phaser.GameObjects.Graphics;

private readonly redrawGrid = (gameSize: Phaser.Structs.Size) => {
  const grid = this.grid;
  if (!grid) {
    return;
  }
  const { width, height } = gameSize;
  grid.clear();
  grid.lineStyle(1, 0x5d81b7, 0.14);
  for (let x = 0; x <= width; x += 48) {
    grid.lineBetween(x, 0, x, height);
  }
  for (let y = 0; y <= height; y += 48) {
    grid.lineBetween(0, y, width, y);
  }
};
```

Em `create()`, desenhe com `this.scale.gameSize`, registre `this.scale.on(Phaser.Scale.Events.RESIZE,
this.redrawGrid)` e remova exatamente esse listener no primeiro `SHUTDOWN`.

- [ ] **5. Gerar apenas o novo baseline e revisá-lo.**

```text
corepack pnpm exec playwright test tests/e2e/shell.spec.ts --grep "redraws the playfield" --update-snapshots
```

Abra `shell-mobile-to-desktop-win32.png` no tamanho original. A grade deve cobrir 1366×768, manter a
mesma intensidade dos baselines existentes e deixar centro/lower-middle livres de DOM.

- [ ] **6. Executar GREEN sem atualizar snapshots.**

```text
corepack pnpm exec playwright test tests/e2e/shell.spec.ts --workers=1
corepack pnpm --filter @huntbound/game test
corepack pnpm typecheck
corepack pnpm build
```

- [ ] **7. Registrar handoff e commit.**

Atualize PB-00R-01 no `STATE.md` da branch com modelo, effort, comandos, resultado e screenshot. Não
marque PB-00R-02 elegível; a integração serial decide a próxima onda.

```text
git diff --check
git status --short
git add apps/game/src/phaser/scenes/ShellScene.ts tests/e2e/shell.spec.ts tests/e2e/shell.spec.ts-snapshots/shell-mobile-to-desktop-win32.png docs/playbooks/PB-00R/STATE.md
git commit -m "fix: redraw Phaser shell after resize"
```

## Critérios de aceite

- [ ] O teste falha antes da correção e passa depois.
- [ ] Grade cobre toda a imagem 1366×768 após boot 390×844.
- [ ] Dois ciclos de resize não alteram intensidade nem duplicam elementos.
- [ ] Listener é removido no shutdown.
- [ ] Baselines antigos continuam aprovados sem regeneração.
- [ ] Testes do app, typecheck e build passam.

## Condições de parada

Pare e reporte `BLOCKED` se Phaser 4.2.1 não expuser os eventos/tipos congelados, se o teste exigir
hook de produção ou dependência nova, ou se a correção exigir mudar `SceneBridge`/simulation.

## Relatório final

Comece com `APPROVED` ou `BLOCKED`; informe RED observado, implementação, screenshot revisada,
comandos/exit codes, modelo/effort, commit e próximo passo. Não execute outra task.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound.

Use GPT-5.6 Luna com effort xhigh. Para validação independente, prefira GPT-5.6 Sol xhigh ou Claude
Opus 5. Use obrigatoriamente as skills game-studio:phaser-2d-game, game-studio:game-playtest,
superpowers:test-driven-development e superpowers:verification-before-completion.

Execute integralmente e somente a task:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-00R\tasks\PB-00R-01-redesenhar-playfield-no-resize.md

Esta task pertence à onda paralela 1. Antes de editar, confirme working tree limpa e trabalhe em
worktree/branch isolado codex/pb00r-01-resize. Não compartilhe o checkout com PB-00R-03 ou PB-00R-04.
Não execute Playwright se outro processo estiver usando a porta 4173.

Leia o STATE.md e somente as referências listadas na task. Preserve as decisões congeladas e o
escopo permitido. Faça red-green: reproduza o resize quebrado, adicione primeiro o teste Playwright
pós-boot, confirme a falha, implemente o redraw mínimo, gere apenas o novo baseline, abra-o no tamanho
original e execute todas as verificações obrigatórias.

Atualize o handoff da branch, crie o commit fix: redraw Phaser shell after resize e encerre com
APPROVED ou BLOCKED, evidências, modelo/effort e hash do commit. Não inicie outra task neste chat.
```
