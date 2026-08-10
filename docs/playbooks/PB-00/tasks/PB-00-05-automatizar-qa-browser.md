# PB-00-05 — Automatizar QA browser e baselines visuais

**Status inicial:** pending  
**Rota Codex:** `game-studio:game-playtest` + `game-studio:game-ui-frontend` +
`superpowers:test-driven-development` + `superpowers:verification-before-completion`  
**Effort sugerido:** high

## Objetivo

Criar um gate Playwright reproduzível que valide boot, console, canvas/DOM, lifecycle, responsividade,
screenshots e o budget de primeiro estado acionável.

## Resultado esperado

`pnpm qa:browser` testa uma build de produção local em Chromium e `pnpm verify` inclui todos os
checks do PB-00. Falhas visuais, de lifecycle ou de boot produzem evidência acionável.

## Dependências

PB-00-04 concluída, lifecycle testado, build verde e Git limpo.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-00/STATE.md`;
3. `docs/playbooks/PB-00/README.md` — critérios finais;
4. `apps/game/src/main.ts`, `ShellSnapshot.ts`, `AppShell.ts` e `styles.css`;
5. scripts raiz e `apps/game/package.json`.

## Decisões congeladas

- PB-00 automatiza Chromium; matriz completa de browsers pertence a PB-10.
- Screenshots são obrigatórias porque assertions DOM não validam o canvas.
- O teste usa a build de produção servida localmente, não apenas Vite dev.
- Baselines aprovados são versionados; relatórios temporários são ignorados.
- O centro/lower-middle deve continuar visualmente livre.

## Escopo permitido

```text
playwright.config.ts
tests/e2e/shell.spec.ts
tests/e2e/boot-budget.spec.ts
tests/e2e/shell.spec.ts-snapshots/**
apps/game/src/main.ts
apps/game/src/runtime/performance.ts
apps/game/src/runtime/performance.test.ts
apps/game/package.json
package.json
.gitignore
docs/playbooks/PB-00/artifacts/browser-qa.md
docs/playbooks/PB-00/STATE.md
```

O nome exato da pasta de snapshots pode seguir a convenção gerada pela versão Playwright fixada,
mas deve ser documentado e versionado.

## Fora de escopo

- Firefox, WebKit, Safari real e dispositivos físicos;
- gameplay, sprites, assets, áudio e métricas de densidade de atores;
- CI remoto, deploy, PWA ou serviço externo de screenshots;
- alterar visualmente o shell além de corrigir defeito demonstrado pelos testes desta task.

## Matriz obrigatória

```ts
export const shellViewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1366, height: 768 },
  { name: "desktop-wide", width: 1920, height: 1080 }
] as const;
```

Cada viewport deve validar:

- `data-shell-ready="true"`;
- exatamente um canvas e um overlay raiz;
- canvas e overlay com dimensões não zero dentro do viewport;
- ausência de page scroll horizontal/vertical não intencional;
- texto de status legível e sem sobrepor o centro do playfield;
- screenshot estável da página inteira.

## Ciclo de implementação

1. Escreva primeiro o smoke test que espera `data-shell-ready="true"`, canvas/DOM únicos e console
   sem `error`/pageerror. Execute-o antes da configuração completa e confirme falha.
2. Configure Playwright com Chromium fixado, `webServer` apontando para preview da build de produção,
   trace em retry, screenshot em falha e diretórios ignorados pelo Git para relatórios temporários.
3. Parametrize o smoke test com os quatro viewports e adicione assertions de overflow e bounding box.
4. Adicione teste de lifecycle: simule `blur` e `visibilitychange` de forma suportada, valide
   `paused`, restaure e valide `ready` sem canvas/listener duplicado.
5. Gere e revise visualmente os quatro baselines. Não aceite snapshots apenas porque foram gerados:
   confirme canvas dominante, overlay de borda, centro livre, contraste e ausência de clipping.
6. Para o budget, use Chromium CDP com Fast 4G: download 1,6 Mbit/s, upload 750 Kbit/s e latência
   150 ms. Em cache frio, navegue e meça o primeiro mark `huntbound:shell-actionable`; falhe em
   duração superior a 5.000 ms ou ausência do mark.
7. Isole a leitura do performance mark em módulo testável e cubra ausência, duplicidade e duração
   válida antes de ligá-lo ao teste browser.
8. Configure `qa:browser` para build + Playwright e `verify` para executar format check, architecture
   check, typecheck, unit tests, build e QA browser sem ignorar falhas.
9. Registre ambiente, browser, matriz, métricas e paths dos baselines em `browser-qa.md`.
10. Execute a verificação completa, atualize o handoff e commit.

## Verificação obrigatória

```text
corepack pnpm exec playwright install chromium
corepack pnpm qa:browser
corepack pnpm verify
git diff --check
git status --short
```

Revise visualmente todos os screenshots no tamanho original. O relatório deve registrar a duração
observada do boot Fast 4G, não apenas informar `pass`.

## Critérios de aceite

- [ ] QA usa build de produção local e Chromium versionado.
- [ ] Quatro viewports passam assertions funcionais e visuais.
- [ ] Console/pageerror, canvas/DOM únicos, overflow e lifecycle são cobertos.
- [ ] Baselines foram revisados e estão versionados.
- [ ] Cache frio Fast 4G chega ao estado acionável em até 5 s.
- [ ] `pnpm verify` executa todos os gates do PB-00 e termina com exit code 0.

## Condições de parada

Pare se screenshots apresentarem defeito estrutural que exija redesenhar PB-00-03/04, se o mark não
representar o estado realmente acionável ou se o ambiente não puder instalar/executar Chromium.
Registre uma task de correção separada quando o defeito não pertencer ao escopo desta task.

## Handoff e commit

Atualize `STATE.md` com duração de boot, baselines e comandos, depois indique `PB-00-06`. Commit:

```text
test: add browser shell quality gate
```

## Relatório final

Lidere com achados, depois informe matriz, screenshots, métrica de boot, comandos e commit. Não
inicie o fechamento integrado.

