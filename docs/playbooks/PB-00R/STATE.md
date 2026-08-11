# PB-00R — Estado operacional

**Status geral:** pending

**Próxima onda elegível:** PB-00R-01 e PB-00R-03, em worktrees isolados. PB-00R-02 está
`blocked` por stall intermitente na entrega dos subrecursos sob a rede emulada.

**PB-01:** bloqueado até PB-00R-05 aprovar o gate integrado.

## Tasks

| Task | Status | Branch sugerida | Commit | Evidência |
|---|---|---|---|---|
| PB-00R-01 | pending | `codex/pb00r-01-resize` | — | — |
| PB-00R-03 | pending | `codex/pb00r-03-package-tests` | — | — |
| PB-00R-04 | done | `codex/pb00r-04-clean-build` | `c4dc64c` | RED/GREEN, sentinelas e gates registrados abaixo |
| PB-00R-02 | blocked | `codex/pb00r-02-boot-budget` | este handoff | 5 passes seguidos; nova sequência falhou em 12.377,9 ms |
| PB-00R-05 | pending | `codex/pb00r-05-final-gate` | — | depende de PB-00R-01/02/03/04 |

## Baseline da auditoria

- Árvore auditada: `e93a7c43f6df1a8c46ea04e8452733fedd8c47f1`.
- `corepack pnpm verify` passou em uma execução, com 33 testes unitários/arquiteturais e 6 E2E.
- Repetição do budget: duas aprovações e uma falha com mark de `12.328,8 ms`.
- Resize 390×844 → 1366×768: canvas e DOM atualizaram; grade permaneceu com 390 px de largura.
- Seis packages em `packages/*` não declaram script `test`.
- Build alerta que `dist/game`, externo à raiz Vite, não será esvaziado automaticamente.
- Hash do lockfile observado: `0DFE3DE417C77E90F0FAFA5883A2C29FEBF7214900F7444BE45639476A636651`.

## Protocolo de integração paralela

1. Cada executor da onda 1 trabalha em worktree/branch isolado.
2. Cada executor registra modelo, effort, comandos e resultados no commit de sua task.
3. Um integrador único incorpora os commits e atualiza esta tabela serialmente.
4. Playwright/porta 4173 não executa simultaneamente no mesmo host.
5. PB-00R-02 começa somente após PB-00R-04 integrado.
6. PB-00R-05 começa somente após as quatro correções integradas e árvore limpa.

## Handoff PB-00R-04

- Implementador: GPT-5 no runtime Codex; modelo sugerido pela task: GPT-5.6 Luna, effort `xhigh`.
  O effort efetivo não é exposto por este ambiente. Validação independente Sol/Opus permanece para o gate final.
- Branch/commit: `codex/pb00r-04-clean-build` / `c4dc64cff7c885f83cc4a519418cf38e1d664670`.
- RED: `corepack pnpm exec vitest run tests/workspace/vite-build-config.test.ts` falhou com `emptyOutDir` recebido como `undefined`.
- GREEN: o mesmo comando passou após adicionar somente `emptyOutDir: true` e preservar `outDir: '../../dist/game'`.
- Prova de limite: `C:\Kaezan\kaezan-huntbound-pb00r-04-clean-build\dist\game\pb00r-game-sentinel.txt` foi removida pelo build; `C:\Kaezan\kaezan-huntbound-pb00r-04-clean-build\dist\pb00r-parent-sentinel.txt` permaneceu durante a prova e foi removida especificamente depois.
- Build: `corepack pnpm --filter @huntbound/game build` e `corepack pnpm build` passaram com exit 0. O warning de `outDir` externo desapareceu; permanece apenas o warning conhecido de chunk Phaser acima de 500 kB.
- Gates: `corepack pnpm test` passou com 34 testes no gate raiz, `corepack pnpm typecheck` passou, `git diff --check` passou e o lockfile não mudou.
- Integração: `c4dc64c` e `acc8318` foram incorporados em `main` por fast-forward. PB-00R-02 está elegível; não iniciar PB-00R-02 neste chat.

## Handoff PB-00R-02

- Veredito: `BLOCKED`. O gate não foi afrouxado e nenhuma produção foi alterada.
- Branch: `codex/pb00r-02-boot-budget`; o hash será registrado pelo integrador após este handoff.
- Instrumentação: toda execução coleta um único mark acionável, navegação, todos os recursos e os
  cinco recursos mais lentos; o JSON é anexado antes das validações de navegação, mark e budget.
- Helper RED/GREEN: o teste falhou por `./bootMetrics` ausente e passou após a implementação pura de
  `criticalResources`, que ordena sem mutar a entrada e limita o resultado a cinco itens.
- Primeira sequência: cinco processos separados passaram com marks `2.531,2`, `2.509,0`, `2.554,6`,
  `2.523,8` e `2.537,5 ms`; `responseEnd` ficou entre `176,9` e `186,2 ms` e o JavaScript entre
  `1.983,7` e `2.004,6 ms`.
- Reprodução diagnóstica: três processos passaram em `2.487,5`, `2.464,2` e `2.513,4 ms`; o quarto
  falhou em `12.377,9 ms` e encerrou a sequência sem retry.
- Causa de fase comprovada: na falha, `responseEnd=174,4 ms`, mas o JavaScript levou `11.846,3 ms`
  e o CSS de 959 bytes levou `10.179,0 ms`. Nos passes, os mesmos recursos levaram cerca de
  `1.966–2.000 ms` e `170–184 ms`. O stall ocorre na entrega dos subrecursos sob o throttling, antes
  de parse/Phaser; o tamanho transferido não mudou.
- Condição de parada: a variação pertence ao host/browser/CDP e não há correção controlável nos paths
  permitidos. Code splitting, retry, aquecimento e mudança de throttling permanecem proibidos.
- Gates antes da reprodução final: helper `1/1`, app `21/21`, typecheck e build passaram; o
  `qa:browser` passou `6/6` com mark de `2.626,7 ms`. A reprodução posterior do budget falhou e
  prevalece sobre esses passes.
- RED/GREEN do runner: `qa:browser` inicialmente tentou coletar o teste Vitest em `support`; passou
  `6/6` após `testIgnore: '**/support/**/*.test.ts'`, sem excluir nenhum `*.spec.ts`.
- Implementador: GPT-5 no runtime Codex; effort efetivo não exposto. Validador solicitado:
  GPT-5.6 Sol, effort `xhigh`; revisão somente leitura confirmou que budget, retry, workers, cache e
  throttling não foram enfraquecidos.

## Modelos

Registrar por task: implementador, effort, validador e qualquer fallback. A indisponibilidade do
modelo sugerido não reduz verificações.

## Bloqueios

PB-00R-02 está bloqueada pelo stall intermitente de subrecursos no host/browser/CDP sob a rede
emulada. Os demais achados ainda impedem o fechamento do playbook.

## Regra de atualização

Ao integrar uma task:

1. registrar status, branch, commit e evidência;
2. atualizar próxima task ou onda realmente elegível;
3. registrar modelo/effort e validador;
4. preservar histórico de falhas; não reescrever uma falha como se nunca tivesse ocorrido;
5. não liberar PB-01 antes do commit de PB-00R-05.
