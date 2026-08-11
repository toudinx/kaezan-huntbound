# PB-00R — Relatório final de aceite

**BLOCKED**

**Data de abertura:** 2026-08-11

**Decisão atual:** os quatro achados da auditoria permanecem reproduzíveis ou estruturalmente
presentes. PB-01 não está elegível.

## Evidência inicial

| Critério | Baseline | Estado |
|---|---|---|
| Resize pós-boot | grade limitada à largura inicial após 390×844 → 1366×768 | failing |
| Boot Fast 4G | uma de três repetições falhou com 12.328,8 ms | flaky |
| Testes por package | seis manifests sem script `test` | failing |
| Output limpo | Vite informa que `dist/game` não será esvaziado | failing no baseline; corrigido em `c4dc64c` |

## Evidência de fechamento

### PB-00R-04 — evidência da branch

- Commit funcional: `c4dc64cff7c885f83cc4a519418cf38e1d664670` (`build: clean game output before Vite build`).
- RED: o contrato falhou porque `gameViteConfig.build?.emptyOutDir` era `undefined`.
- GREEN: o contrato passou com `outDir` inalterado e `emptyOutDir: true`.
- Paths absolutos validados: `C:\Kaezan\kaezan-huntbound-pb00r-04-clean-build\dist` e `C:\Kaezan\kaezan-huntbound-pb00r-04-clean-build\dist\game`.
- Sentinela interna removida pelo build: `C:\Kaezan\kaezan-huntbound-pb00r-04-clean-build\dist\game\pb00r-game-sentinel.txt`.
- Sentinela irmã preservada durante a prova: `C:\Kaezan\kaezan-huntbound-pb00r-04-clean-build\dist\pb00r-parent-sentinel.txt`; removida especificamente após a verificação.
- `corepack pnpm --filter @huntbound/game build` terminou com exit 0 sem o warning de output externo. O warning de chunk Phaser acima de 500 kB permanece aceito e fora de escopo.
- Implementador: GPT-5 no runtime Codex; modelo sugerido GPT-5.6 Luna, effort `xhigh`; effort efetivo não exposto. Validação independente Sol/Opus permanece para PB-00R-05.
- `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm build` e `git diff --check` passaram; o lockfile permaneceu inalterado.

PB-00R-05 preencherá o restante desta seção com os commits integrados, modelos/efforts, comandos,
exit codes, contagens, timings, screenshot pós-resize, hash do lockfile e decisão final. O estado
geral permanece `BLOCKED` até a integração e validação das demais tasks.
