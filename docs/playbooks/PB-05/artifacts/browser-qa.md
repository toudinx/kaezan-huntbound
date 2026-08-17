# PB-05-11 — QA do combate no browser

**Status:** bloqueada pela prova de estabilidade. A cobertura, a paridade de replay, as quatro
capturas e os gates estáticos foram executados; a sessão dirigida ainda falha de forma intermitente
sob `--retries=0 --repeat-each=10`.

## Ambiente

- Windows, worktree `C:\Kaezan\kaezan-huntbound-pb05-11-qa`.
- Branch `codex/pb-05-11-combat-browser-qa`, baseada em `main`.
- Node `24.14.0`; pnpm `11.21.0`; Playwright `1.62.1` com Chromium do pacote.
- `playwright.config.ts`: um worker e `retries: 0`.
- Build servido pelo `vite preview` a partir de `dist/game`.

Arquivos adicionados:

- `tests/e2e/combat-play.spec.ts`: sessão dirigida nos quatro viewports.
- `tests/e2e/combat-replay.spec.ts`: replay da fixture no Chromium e comparação com o Node.
- `tests/e2e/support/combatDriver.ts` e `combatSession.ts`: driver observável e preparação da
  fixture.

Nenhum arquivo em `packages/**` ou `apps/game/src/**` foi alterado.

## Sessão e cobertura

A sessão seleciona um rotworm, aproxima-se com input real, ataca, conjura Berserk, Brutal Strike e
Wound Cleansing, mata o alvo, confirma loot na bolsa, aproxima-se de outro rotworm e confirma o
overlay de morte. As asserções observam redução de barras, cura com consumo de mana, loot/bag e
morte; não verificam apenas a existência dos controles.

| Viewport | Sessão isolada | Boot acionável na captura | Screenshot |
|---|---:|---:|---|
| `390 × 844` | passou | `990,1 ms` | [combat-mobile-390x844.png](screenshots/combat-mobile-390x844.png) |
| `768 × 1024` | passou | `1178,0 ms` | [combat-tablet-768x1024.png](screenshots/combat-tablet-768x1024.png) |
| `1366 × 768` | passou | `932,9 ms` | [combat-desktop-1366x768.png](screenshots/combat-desktop-1366x768.png) |
| `1920 × 1080` | passou | `1034,1 ms` | [combat-desktop-wide-1920x1080.png](screenshots/combat-desktop-wide-1920x1080.png) |

Os tempos acima são marcas `huntbound:shell-actionable` da execução de captura, sem throttle. A
comparação de referência do PB-04 continua sendo o teste Fast 4G: na execução desta task ele mediu
`4610,5 ms` e, em outra execução, `5689,7 ms`; o segundo valor excedeu o orçamento histórico de
`5000 ms`.

As quatro imagens mostram o HUD de combate, alvo, barras, controles e números de dano. Hashes
SHA-256 das imagens versionadas:

| Arquivo | SHA-256 |
|---|---|
| `combat-mobile-390x844.png` | `d1d59c06bc7913f34c1b59e095c7ef0efdc79331711d4bf3562451e42d7c1811` |
| `combat-tablet-768x1024.png` | `55878029754aba02e5510d7af6be177c4f438f3018159d46c115ee6aa32fdced` |
| `combat-desktop-1366x768.png` | `98a8d48354a71c4192a251640222c70e7b3be80ed07d649976b2b6b2112f140c` |
| `combat-desktop-wide-1920x1080.png` | `e17f2e17e7c6b2e7facb98631d896cf0b25c37d71a5bcfff8e6a388912bc32ab` |

Nos casos concluídos, o watcher da spec não observou erros de console, `pageerror`, request
failed ou resposta HTTP `>= 400`. As falhas abaixo foram falhas da sessão/driver antes das
asserções finais.

## Paridade de replay

Fixture `pb-05-hunt-combat`:

- cenário: `c34813d1e1a278c9e6fd0b7869e5e55f06cf0c5c8e4b530b04b332f38b1cb8cf`;
- comandos: `356eee11220f96aea4d3f5cc0f0673deb614cd893c1d7f2060414a4fbc7a1e7b`;
- eventos: `92515975046756dc2aeafb53d811cb016903ff653f08d9a89e9be2ec8d361394`;
- ticks finais: `2700`;
- eventos: `2240`;
- snapshot canônico Node: `44c1812203282bbad6797ede4961c971ff868d7d23905287edcaaf241eb7416a`;
- snapshot canônico Chromium: `44c1812203282bbad6797ede4961c971ff868d7d23905287edcaaf241eb7416a`.

`combat-replay.spec.ts` passou isoladamente e os dez replays também passaram nas duas rodadas de
estabilidade; a falha é somente na sessão interativa.

## Comandos e evidências

| Comando | Exit | Resultado |
|---|---:|---|
| `corepack pnpm --dir ... install --prefer-offline` | `0` | dependências instaladas na worktree irmã |
| `corepack pnpm build` | `0` | 254 módulos; warning não bloqueante de chunk `> 500 kB` |
| `corepack pnpm exec playwright test tests/e2e/shell.spec.ts --update-snapshots --retries=0` | `0` | `6 passed`; snapshots atualizados por mudança deliberada do HUD de PB-05-10 |
| `corepack pnpm exec playwright test tests/e2e/combat-play.spec.ts --retries=0` | `0` | `4 passed`; capturas versionadas |
| `corepack pnpm exec playwright test tests/e2e/combat-replay.spec.ts --retries=0` | `0` | `1 passed`; hashes iguais |
| `corepack pnpm exec biome check .` | `0` | 411 arquivos verificados |
| `corepack pnpm typecheck` | `0` | 7 projetos |

O primeiro `qa:browser` terminou `1`: `29 passed`, com cinco snapshots de shell antigos. A diferença
foi comprovada como intencional — o esperado ainda era a tela preta anterior ao HUD — e os cinco
snapshots foram regenerados pelo Playwright. O segundo `qa:browser` terminou `1`: `32 passed` e duas
falhas, uma no combate `desktop-wide` e uma no orçamento histórico `hunt-budget` (`5689,7 ms`, 113
long tasks). Não houve alteração em código de produção para contornar esses resultados.

### Prova de estabilidade

Comando obrigatório, sempre com `--retries=0` e um worker:

```powershell
corepack pnpm exec playwright test tests/e2e/combat-play.spec.ts tests/e2e/combat-replay.spec.ts --retries=0 --repeat-each=10
```

Resultados finais da investigação:

| Rodada | Exit | Resultado |
|---|---:|---|
| após o fluxo de loot/morte | `1` | `49 passed`; `desktop-wide` falhou uma vez, com alvo `2/65` e morte antes do ataque final |
| após sincronizar ataque ao tick de cooldown | `1` | `45 passed`; cinco sessões falharam (`desktop`, `desktop-wide`), com mortes durante aproximação/espera de habilidade e alvo ainda vivo |

As duas rodadas são vermelhas sem retry. A task manda parar nesse ponto; a estabilidade exigida
`50/50` não foi declarada.

## Problemas encontrados e não corrigidos aqui

1. A sessão observável é sensível ao aggro/timing do cenário: em execuções lentas, o jogador pode
   morrer durante a aproximação ou enquanto aguarda cooldown, antes de concluir o primeiro
   rotworm. O HUD capturou `Health: 0/185` com alvos entre `3/65` e `65/65`. O driver foi ajustado
   para curar mais cedo, reduzir seleção extra e respeitar os 40 ticks de cooldown, mas a prova
   `50/50` continuou vermelha. A causa remanescente pertence ao comportamento da hunt/combate ou a
   uma decisão de estratégia de teste; não foi mascarada nem corrigida em `apps/game/src/**`.
2. O orçamento Fast 4G `hunt-budget` continua historicamente instável (B5), com uma execução acima
   de `5000 ms` e long tasks recorrentes. Não foi alterado nesta task.
3. Os cinco snapshots de shell foram atualizados porque PB-05-10 adicionou o HUD deliberadamente e
   o esperado versionado ainda representava a tela preta anterior. Essa é uma atualização de
   fixture visual, não uma alteração de gameplay.

## Decisão de fechamento

`biome check .`, `typecheck`, build, replay e capturas estão comprovados. `qa:browser` e `verify` não
foram declarados verdes: após a falha obrigatória de estabilidade, a execução foi interrompida antes
de integrar a branch. A próxima ação elegível é continuar a investigação da estratégia de
combate/aggro ou auditar formalmente este bloqueio; não há fast-forward seguro para `main`.
