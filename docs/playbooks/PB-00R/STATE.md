# PB-00R — Estado operacional

**Status geral:** pending

**Próxima onda elegível:** PB-00R-01, PB-00R-03 e PB-00R-04, em worktrees isolados.

**PB-01:** bloqueado até PB-00R-05 aprovar o gate integrado.

## Tasks

| Task | Status | Branch sugerida | Commit | Evidência |
|---|---|---|---|---|
| PB-00R-01 | pending | `codex/pb00r-01-resize` | — | — |
| PB-00R-03 | pending | `codex/pb00r-03-package-tests` | — | — |
| PB-00R-04 | pending | `codex/pb00r-04-clean-build` | — | — |
| PB-00R-02 | pending | `codex/pb00r-02-boot-budget` | — | depende de PB-00R-04 |
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

## Modelos

Registrar por task: implementador, effort, validador e qualquer fallback. A indisponibilidade do
modelo sugerido não reduz verificações.

## Bloqueios

Os quatro achados impedem o fechamento. Nenhum bloqueio externo conhecido impede iniciar a onda 1.

## Regra de atualização

Ao integrar uma task:

1. registrar status, branch, commit e evidência;
2. atualizar próxima task ou onda realmente elegível;
3. registrar modelo/effort e validador;
4. preservar histórico de falhas; não reescrever uma falha como se nunca tivesse ocorrido;
5. não liberar PB-01 antes do commit de PB-00R-05.
