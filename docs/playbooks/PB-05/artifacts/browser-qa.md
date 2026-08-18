# PB-05-11 — QA do combate no browser

**Status:** prova concluída e integrada em `main`. A sessão dirigida fechou `50/50` com
`--retries=0 --repeat-each=10`; a paridade Node/Chromium, as quatro capturas e os quatro testes
específicos de combate continuam verdes após o fast-forward. O `qa:browser` completo permanece
sujeito ao B5 histórico (`hunt-budget`).

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
| `390 × 844` | passou | `958,7 ms` | [combat-mobile-390x844.png](screenshots/combat-mobile-390x844.png) |
| `768 × 1024` | passou | `641,9 ms` | [combat-tablet-768x1024.png](screenshots/combat-tablet-768x1024.png) |
| `1366 × 768` | passou | `710,4 ms` | [combat-desktop-1366x768.png](screenshots/combat-desktop-1366x768.png) |
| `1920 × 1080` | passou | `721,7 ms` | [combat-desktop-wide-1920x1080.png](screenshots/combat-desktop-wide-1920x1080.png) |

Os tempos acima são marcas `huntbound:shell-actionable` da execução de captura, sem throttle. A
comparação de referência do PB-04 continua sendo o teste Fast 4G: na execução desta task ele mediu
`4610,5 ms` e, em outra execução, `5689,7 ms`; o segundo valor excedeu o orçamento histórico de
`5000 ms`.

As quatro imagens mostram o HUD de combate, alvo, barras, controles e números de dano. Hashes
SHA-256 das imagens versionadas:

| Arquivo | SHA-256 |
|---|---|
| `combat-mobile-390x844.png` | `e5fc855306bc8372471291a9508cc68e39405982731f10ef991112a21fa53b7d` |
| `combat-tablet-768x1024.png` | `c09d446771b5d5638cd540566013c778389a0dfec22a4e2ced202b9179480ab8` |
| `combat-desktop-1366x768.png` | `c0b593a5c9047e17345aab1ad08b23bedf7e7008053a8f51ad8489aadc9d7244` |
| `combat-desktop-wide-1920x1080.png` | `6f8780320dea50a80ff243d5e7c2fd2a1a6cb968984170676d7545f964a16bc9` |

Nos casos concluídos, o watcher da spec não observou erros de console, `pageerror`, request
failed ou resposta HTTP `>= 400`. As falhas abaixo foram falhas da sessão/driver antes das
asserções finais.

## Paridade de replay

Fixture `pb-05-hunt-combat`:

- cenário: `c34813d1e1a278c9e6fd0b7869e5e55f06cf0c5c8e4b530b04b332f38b1cb8cf`;
- comandos: `356eee11220f96aea4d3f5cc0f0673deb614cd893c1d7f2060414a4fbc7a1e7b`;
- eventos: `92515975046756dc2aeafb53d811cb016903ff653f08d9a89e9be2ec8d361394`;
- tick final: `2700`;
- total de eventos: `2240`;
- snapshot canônico Node: `44c1812203282bbad6797ede4961c971ff868d7d23905287edcaaf241eb7416a`;
- snapshot canônico Chromium: `44c1812203282bbad6797ede4961c971ff868d7d23905287edcaaf241eb7416a`.

`combat-replay.spec.ts` passou isoladamente e os dez replays também passaram na rodada final de
estabilidade, com os snapshots iguais entre Node e Chromium.

## Comandos e evidências

| Comando | Exit | Resultado |
|---|---:|---|
| `corepack pnpm --dir ... install --prefer-offline` | `0` | dependências instaladas na worktree irmã |
| `corepack pnpm build` | `0` | 254 módulos; warning não bloqueante de chunk `> 500 kB` |
| `corepack pnpm exec playwright test tests/e2e/shell.spec.ts --update-snapshots --retries=0` | `0` | `6 passed`; snapshots atualizados por mudança deliberada do HUD de PB-05-10 |
| `$env:HUNTBOUND_COMBAT_SCREENSHOTS = 'write'; corepack pnpm exec playwright test tests/e2e/combat-play.spec.ts --retries=0 --repeat-each=1 --reporter=line` | `0` | `4 passed`; capturas finais versionadas |
| `corepack pnpm exec playwright test tests/e2e/combat-replay.spec.ts --retries=0` | `0` | `1 passed`; hashes iguais |
| `corepack pnpm exec playwright test tests/e2e/combat-play.spec.ts tests/e2e/combat-replay.spec.ts --retries=0 --repeat-each=10` | `0` | `50 passed` em 23,5 min |
| `corepack pnpm exec biome check .` | `0` | 411 arquivos verificados |
| `corepack pnpm typecheck` | `0` | 7 projetos |
| `corepack pnpm qa:browser` (branch, antes do fast-forward) | `0` | `34 passed` em 3,2 min |
| `corepack pnpm verify` | `1` | gate de testes interrompido por `Permission denied` ao gravar objetos de repositórios Git temporários em `%TEMP%`; 50 passaram, 2 falharam e 2 foram omitidos no config de content-catalog |
| `corepack pnpm exec biome check .` (pós-ff em `main`) | `0` | 414 arquivos verificados |
| `corepack pnpm verify` (pós-ff em `main`) | `1` | 33/34 browser; `tablet` expirou aguardando resposta em `stepAwayFromActors`; teste isolado posterior passou |
| `corepack pnpm exec playwright test tests/e2e/combat-play.spec.ts --grep tablet --retries=0 --repeat-each=1` (pós-ff) | `0` | 1/1 passou |
| `corepack pnpm qa:browser` (pós-ff standalone) | `1` | 33/34; somente B5 `hunt-budget`, `5011,7 ms` para orçamento `5000 ms`; os quatro testes de combate passaram |

O `verify` passou por format, assets, replay, arquitetura e typecheck antes de chegar ao gate de
testes. A falha do `sourceLock.test.ts` foi reproduzida isoladamente com
`corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts --reporter=verbose`:
o teste de paths inseguros falhou ao criar o commit sintético em `%TEMP%`, com o mesmo
`Permission denied` em `.git/objects`. Nenhum teste ou configuração foi alterado para contornar o
problema. A execução da branch permaneceu verde antes do fast-forward; no
`main` pós-ff, os quatro testes específicos de combate passaram e o gate global
parou apenas no B5 `hunt-budget`.

### Prova de estabilidade

Comando obrigatório, sempre com `--retries=0` e um worker:

```powershell
corepack pnpm exec playwright test tests/e2e/combat-play.spec.ts tests/e2e/combat-replay.spec.ts --retries=0 --repeat-each=10
```

Resultados finais da investigação:

| Rodada | Exit | Resultado |
|---|---:|---|
| implementação original | `1` | `49/50`; uma morte em `desktop-wide` durante o ataque final |
| implementação original, após ajuste intermediário | `1` | `45/50`; cinco mortes durante aproximação/espera de habilidade |
| driver estabilizado | `0` | `50/50`; nenhuma falha, sem retry |

As duas primeiras rodadas são o histórico que motivou a correção. A rodada final foi executada
sem retry e fechou a estabilidade exigida.

## Problemas encontrados e corrigidos no driver

1. O fallback de rota permitia aproximar-se passando por atores adjacentes; sob carga, o jogador
   entrava em aggro e morria antes de concluir o alvo. O driver agora recusa a rota insegura,
   afasta-se de ameaças e só continua quando há caminho seguro. A mudança está exclusivamente em
   `tests/e2e/support/combatDriver.ts`.
2. A injeção manual de `PointerEvent` era menos determinística que o input público. A sessão agora
   usa as teclas documentadas (`Space`, `Digit1`–`Digit3`), preservando o contrato de input do jogo.
3. A observação da cura podia coincidir com dano recebido no mesmo tick. O driver espera a habilidade
   ficar pronta, quebra o aggro antes da conjuração e mantém a asserção estrita de aumento de vida;
   não houve timeout inflado nem asserção enfraquecida.
4. O orçamento histórico `hunt-budget` (B5) continua uma preocupação independente do PB-05-11. A
   execução final de `qa:browser` passou e nenhum código de produção foi alterado para o orçamento.

## Decisão de fechamento

`biome check .`, `typecheck`, build, replay, capturas, estabilidade `50/50` e os quatro testes
específicos de combate estão comprovados. O `verify` pós-ff não é declarado verde: uma execução
teve timeout transitório no tablet e a execução global standalone ficou em `33/34` por B5
(`hunt-budget`). A falha de `sourceLock` na branch também foi reproduzida como limitação ambiental;
nenhum desses resultados tem relação com arquivos de produção da PB-05-11.

A branch foi rebaseada sobre os quatro commits de Sites e integrada por `git merge --ff-only` em
`main` (`54a8acc..d4490e9`). Após o fast-forward, o teste específico de combate no tablet passou
isoladamente e os quatro testes de combate passaram no `qa:browser`; o vermelho global restante é
o B5 histórico. A dependência técnica de PB-05-12 está resolvida, mas a auditoria ainda exige uma
árvore `main` limpa; há alterações locais preexistentes fora do PB-05. Nenhuma auditoria foi
iniciada nesta task.
