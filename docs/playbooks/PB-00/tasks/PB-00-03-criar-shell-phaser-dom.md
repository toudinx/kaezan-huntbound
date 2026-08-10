# PB-00-03 — Criar shell Phaser, DOM e SceneBridge

**Status inicial:** pending  
**Rota Codex:** `game-studio:phaser-2d-game` + `game-studio:game-ui-frontend` +
`superpowers:test-driven-development` + `superpowers:verification-before-completion`  
**Effort sugerido:** high

## Objetivo

Criar o primeiro estado acionável do browser: canvas Phaser dominante, overlay DOM mínimo e um
`SceneBridge` tipado como única fonte compartilhada de estado de apresentação.

## Resultado esperado

`pnpm dev` abre um shell sem gameplay. Boot e Shell scenes publicam estado pelo bridge; o DOM apenas
assina a projeção e exibe status/viewport sem manter uma segunda fonte de verdade.

## Dependências

PB-00-02 concluída, gates arquiteturais verdes e Git limpo.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-00/STATE.md`;
3. `docs/playbooks/PB-00/README.md`;
4. `docs/architecture/PACKAGE_BOUNDARIES.md`;
5. `apps/game/package.json`, tsconfigs e scripts raiz.

## Decisões congeladas

- Phaser não possui regras de gameplay.
- O shell usa DOM sem React/Angular/Vue.
- A apresentação é funcional e deliberadamente não final: fundo escuro, grid discreto e poucos
  elementos de borda; não criar dashboard, lore ou identidade visual definitiva.
- O centro e o lower-middle ficam livres.
- Não carregar imagens, fontes remotas ou assets Canary.

## Escopo permitido

```text
apps/game/index.html
apps/game/vite.config.ts
apps/game/src/main.ts
apps/game/src/styles.css
apps/game/src/bridge/SceneBridge.ts
apps/game/src/bridge/SceneBridge.test.ts
apps/game/src/phaser/createGame.ts
apps/game/src/phaser/scenes/BootScene.ts
apps/game/src/phaser/scenes/ShellScene.ts
apps/game/src/runtime/ShellSnapshot.ts
apps/game/src/ui/AppShell.ts
apps/game/src/ui/AppShell.test.ts
apps/game/src/test/setup.ts
apps/game/package.json
package.json
docs/playbooks/PB-00/STATE.md
```

## Fora de escopo

- entidades, movimento, tilemaps, câmera de gameplay, combate ou save;
- input mappings além do necessário para o shell;
- assets, áudio, menus ou HUD definitivo;
- focus/visibility, safe areas detalhadas e screenshots multi-viewport, tratados nas próximas tasks.

## Contrato obrigatório

Implemente tipos equivalentes a:

```ts
export type ShellPhase = "booting" | "ready" | "paused" | "error";
export type RendererKind = "webgl" | "canvas" | "unavailable";

export interface ShellSnapshot {
  readonly phase: ShellPhase;
  readonly renderer: RendererKind;
  readonly viewport: {
    readonly width: number;
    readonly height: number;
    readonly devicePixelRatio: number;
  };
  readonly message: string;
}

export interface SceneBridge {
  getSnapshot(): ShellSnapshot;
  publish(next: ShellSnapshot): void;
  subscribe(listener: (snapshot: ShellSnapshot) => void): () => void;
}
```

`subscribe` notifica imediatamente com o snapshot atual, mantém listeners sem duplicatas e retorna
unsubscribe idempotente. Phaser publica; DOM lê e assina. Nenhum módulo cria uma segunda store.

## Ciclo de implementação

1. Escreva testes de `SceneBridge` para snapshot inicial, publicação, assinatura imediata,
   unsubscribe idempotente e ausência de notificação após unsubscribe.
2. Execute os testes e confirme que falham antes da implementação.
3. Implemente o bridge mínimo e faça seus testes passarem.
4. Escreva testes DOM de `AppShell` para estados `booting`, `ready`, `paused` e `error`, incluindo
   atualização após `publish` e cleanup de listener.
5. Confirme a falha, implemente `AppShell` com elementos semânticos e `data-testid` estáveis e faça
   os testes passarem.
6. Configure Vite e Phaser. `BootScene` publica `booting`; `ShellScene` publica `ready` com o renderer
   efetivamente usado. O canvas desenha apenas um grid/prova visual gerado por código.
7. Use `Phaser.Scale.RESIZE` e um único container que empilha canvas e DOM. Não use dimensões
   hard-coded como fonte do layout.
8. Em `main.ts`, crie bridge, DOM shell e Phaser game nessa ordem. Marque
   `huntbound:shell-actionable` via Performance API quando o estado chegar a `ready` e exponha no DOM
   `data-shell-ready="true"` para QA.
9. Garanta teardown seguro para hot reload: destruir Phaser, UI e listeners antes de recriar.
10. Execute testes, architecture gate, build e inspeção manual local; depois atualize handoff e
    commit.

## Verificação obrigatória

```text
corepack pnpm --filter @huntbound/game test
corepack pnpm architecture:check
corepack pnpm typecheck
corepack pnpm build
corepack pnpm check
git diff --check
git status --short
```

Também abra a aplicação local e confirme no browser: um único canvas, um único overlay DOM, estado
`ready`, ausência de erros no console e centro do playfield livre.

## Critérios de aceite

- [ ] Bridge cumpre todos os testes e é a única store do shell.
- [ ] BootScene e ShellScene permanecem finas e sem regra de jogo.
- [ ] DOM reage ao bridge e não consulta objetos Phaser diretamente.
- [ ] Shell produz um estado acionável e performance mark.
- [ ] HMR/teardown não duplica canvas nem listeners.
- [ ] Build e todos os gates existentes passam.

## Condições de parada

Pare se Phaser 4 exigir API diferente da versão documentada pelo baseline, se o renderer não puder
inicializar no ambiente de teste ou se implementar o shell exigir mudar uma fronteira aprovada.

## Handoff e commit

Atualize `STATE.md` com comandos e inspeção manual, depois indique `PB-00-04`. Commit:

```text
feat: add Phaser DOM browser shell
```

## Relatório final

Resuma bridge, scenes, DOM, prova visual, testes e commit. Não implemente lifecycle responsivo ou
Playwright nesta task.

