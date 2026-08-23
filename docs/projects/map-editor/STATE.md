# Map Editor — Estado

**Status geral:** ready, aguardando `main` com `corepack pnpm verify` verde

**Próxima elegível:** ME-01

**Branch base:** `main`

| Task | Status | Branch | Commit | Modelo/effort efetivo |
|---|---|---|---|---|
| ME-01 | pending | `codex/map-editor-01-authoring-contract` | — | — |
| ME-02 | not-ready; depende de 01 | `codex/map-editor-02-editor-shell` | — | — |
| ME-03 | not-written | — | — | — |
| ME-04 | not-written | — | — | — |
| ME-05 | not-written | — | — | — |
| ME-06 | not-written | — | — | — |
| ME-07 | not-written | — | — | — |
| ME-08 | not-written | — | — | — |
| ME-09 | not-written | — | — | — |

## Bloqueios

- `main` tem `verify` vermelho por drift de save/spawn já registrado em PB-08. O Map Editor não
  depende do fechamento de PB-08, mas ME-01 não começa sobre uma linha de base vermelha.
- O gate fresco desta criação também reproduziu dois timeouts de 5 s em `apps/game/src/main.test.ts`,
  inclusive com a suíte isolada; é falha preexistente e não será mascarada por timeout maior.
- PB-08-01 já está integrada em `c23c819`; esse layout é a base que ME-01 deve materializar.

## Decisões congeladas

Vivem em `README.md`: mesmo monorepo; editor local-only; seed inicial decidida por agente de IA; sem
importador automático; fonte canônica autorada; saída runtime gerada; NPC fora do MVP.

## Regra de atualização

Atualize somente status/branch/commit/modelo na tabela e bloqueios abertos. Narrativa pertence ao
commit. O arquivo deve permanecer abaixo de 60 linhas.
