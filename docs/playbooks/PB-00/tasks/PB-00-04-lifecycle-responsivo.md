# PB-00-04 — Implementar lifecycle e shell responsivo

**Status inicial:** pending  
**Rota Codex:** `game-studio:web-game-foundations` + `game-studio:game-ui-frontend` +
`game-studio:phaser-2d-game` + `superpowers:test-driven-development` +
`superpowers:verification-before-completion`  
**Effort sugerido:** high

## Objetivo

Fazer o shell reagir corretamente a resize, densidade de pixel, perda de foco, mudança de
visibilidade, safe areas e preferência de movimento reduzido, sem misturar lifecycle do browser com
regra de jogo.

## Resultado esperado

O shell mantém canvas e DOM alinhados em desktop e mobile. Ocultar/desfocar pausa a apresentação;
retomar só ocorre quando nenhuma causa de pausa permanece ativa. Listeners são removidos no teardown.

## Dependências

PB-00-03 concluída, shell funcional, tests/build verdes e Git limpo.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-00/STATE.md`;
3. `docs/playbooks/PB-00/README.md` — viewports e decisões congeladas;
4. `apps/game/src/bridge/SceneBridge.ts`;
5. `apps/game/src/runtime/ShellSnapshot.ts`;
6. `apps/game/src/main.ts`, `styles.css` e `createGame.ts`.

## Decisões congeladas

- A task adapta portrait e landscape; não bloqueia orientação nem cria touch gameplay.
- Pausa de browser é estado de apresentação do shell, não regra da simulação futura.
- Centro e lower-middle do canvas permanecem livres.
- Elementos informativos ficam nas bordas e são reduzidos antes de cobrir o playfield.
- Reduced motion remove transições não essenciais, mas não altera estado funcional.

## Escopo permitido

```text
apps/game/src/runtime/RuntimeLifecycle.ts
apps/game/src/runtime/RuntimeLifecycle.test.ts
apps/game/src/runtime/ViewportController.ts
apps/game/src/runtime/ViewportController.test.ts
apps/game/src/runtime/ShellSnapshot.ts
apps/game/src/bridge/SceneBridge.ts
apps/game/src/main.ts
apps/game/src/phaser/createGame.ts
apps/game/src/ui/AppShell.ts
apps/game/src/ui/AppShell.test.ts
apps/game/src/styles.css
docs/playbooks/PB-00/STATE.md
```

## Fora de escopo

- controles de movimento, virtual joystick ou gestures;
- menu, inventário, HUD de combate ou acessibilidade completa;
- PWA/offline, assets e gameplay;
- Playwright e baselines visuais, pertencentes a PB-00-05.

## Contratos obrigatórios

O lifecycle deve possuir portas testáveis equivalentes a:

```ts
export type PauseReason = "window-blur" | "document-hidden";

export interface RuntimeLifecyclePort {
  pause(reason: PauseReason): void;
  resume(reason: PauseReason): void;
}

export interface DisposableController {
  start(): () => void;
}
```

O controller mantém um `Set<PauseReason>`. A primeira razão ativa publica `paused`; remover uma razão
não publica `ready` enquanto outra permanecer. Eventos repetidos são idempotentes. O callback de
dispose remove listeners e não pode lançar quando chamado duas vezes.

O viewport controller observa o container, normaliza `width`, `height` e `devicePixelRatio`, ignora
updates idênticos e publica um novo `ShellSnapshot` sem sobrescrever phase/renderer/message atuais.

## Ciclo de implementação

1. Escreva testes de lifecycle para blur/focus, hidden/visible, duas razões simultâneas, eventos
   duplicados e dispose idempotente.
2. Confirme a falha e implemente o controller mínimo por portas injetáveis, sem depender de Phaser
   dentro do módulo testável.
3. Escreva testes do viewport controller para primeira medição, resize, DPR e supressão de update
   idêntico; confirme a falha e implemente.
4. Adapte Phaser em `createGame.ts` para pausar/retomar somente a apresentação solicitada pelo port.
   O bridge continua sendo a projeção consumida pelo DOM.
5. Integre controllers em `main.ts` e inclua seus disposes no teardown já existente.
6. Atualize CSS com `100dvh`, limites do container, `env(safe-area-inset-*)`, layout por bordas,
   `pointer-events` explícitos e media query `prefers-reduced-motion: reduce`.
7. Garanta que zoom/layout não use `window.innerWidth` como única fonte quando o container real tiver
   dimensão diferente.
8. Rode testes e build; faça inspeção manual redimensionando entre os quatro viewports e alternando
   foco/visibilidade antes de atualizar o handoff.

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

Na inspeção manual, exercite 390×844, 768×1024, 1366×768 e 1920×1080, portrait/landscape quando
aplicável, perda/retorno de foco e preferência reduced motion.

## Critérios de aceite

- [ ] Pausa por múltiplas razões é idempotente e só retoma quando todas cessam.
- [ ] Resize/DPR atualiza uma única projeção no bridge.
- [ ] Teardown remove listeners e observers sem duplicação.
- [ ] Canvas e overlay ocupam o container sem overflow crítico nos quatro viewports.
- [ ] Safe areas e reduced motion possuem comportamento explícito.
- [ ] Nenhuma regra de gameplay foi introduzida.

## Condições de parada

Pare se a correção exigir definir orientação de combate, touch controls ou política de simulação;
essas decisões pertencem a playbooks posteriores. Pare também se o shell anterior tiver mais de uma
store de estado, pois PB-00-03 deve ser corrigida antes.

## Handoff e commit

Atualize `STATE.md`, registre a inspeção manual e indique `PB-00-05`. Commit:

```text
feat: add responsive browser lifecycle
```

## Relatório final

Informe cenários de lifecycle, viewports verificados, testes e commit. Não configure Playwright.

