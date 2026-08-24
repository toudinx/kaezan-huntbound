# Map Editor — Estado

**Status geral:** ready. Trilha MB (borderizer) precede a trilha ME (editor).

**Próxima elegível:** MB-01

**Branch base:** `main`

| Task | Status | Branch | Commit | Modelo/effort efetivo |
|---|---|---|---|---|
| MB-01 | pending | `codex/mb-01-material-border-mining` | — | — |
| MB-02 | not-ready; depende do formato de MB-01 | `codex/mb-02-borderize-pure` | — | — |
| MB-03 | not-ready; depende de MB-01 e MB-02 | `codex/mb-03-apply-and-play` | — | — |
| ME-01 | pending | `codex/map-editor-01-authoring-contract` | — | — |
| ME-02 | not-ready; depende de 01 | `codex/map-editor-02-editor-shell` | — | — |
| ME-03 | not-written | — | — | — |
| ME-04 | not-written | — | — | — |
| ME-05 | not-written | — | — | — |
| ME-06 | não será escrita | — | — | absorvida pela trilha MB |
| ME-07 | not-written | — | — | — |
| ME-08 | not-written | — | — | — |
| ME-09 | not-written | — | — | — |

## Bloqueios

**B1 — aberto, informativo.** `assets:check` não roda o profile `personal`, e os fixtures `test` e
`product` fabricam placeholder 1×1 para qualquer id pedido. `verify` pode ficar verde com arte
pessoal faltando — o mesmo sintoma visual que a trilha MB conserta. Não afeta MB-01..03, que não
introduzem id novo. Vira task de backlog antes da próxima hunt.

**B2 — aberto, herdado do PB-08.** Onze worktrees antigas e branches fora da `main` com trabalho
real. Triagem é decisão do usuário. Não bloqueia a trilha MB.

## Decisões congeladas

A spec do borderizer está em `BORDERIZER.md`: tabela de bordas **medida** do OTBM em vez de copiada
do RME; assinatura de vizinhança de 8 bits com 256 casos; variação por hash de coordenada, sem RNG
livre; `packages/map-authoring` puro e browser-safe; camada `cells` materializada no layout;
preenchimento default em massa sólida, preservando colisão e goldens.

As decisões do editor vivem em `PLAN.md`: mesmo monorepo; editor local-only; seed inicial decidida
por agente de IA; sem importador automático; fonte canônica autorada; saída runtime gerada; NPC fora
do MVP.

## Regra de atualização

Atualize somente status/branch/commit/modelo na tabela e bloqueios abertos. Narrativa pertence ao
commit. O arquivo deve permanecer abaixo de 60 linhas.
