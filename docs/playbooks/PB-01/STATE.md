# PB-01 — Estado operacional

**Playbook:** `docs/playbooks/PB-01/README.md`

**Estado geral:** ready

**Última atualização:** 2026-08-11

**Próxima task elegível:** `PB-01-01`

## Tasks

| ID | Status | Branch | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-01-01 | pending | `codex/pb01-01-content-contracts` | — | — |
| PB-01-02 | pending | `codex/pb01-02-sqlite-catalog` | — | — |
| PB-01-03 | pending | `codex/pb01-03-curated-slice` | — | — |
| PB-01-04 | pending | `codex/pb01-04-xml-importers` | — | — |
| PB-01-05 | pending | `codex/pb01-05-lua-importers` | — | — |
| PB-01-06 | pending | `codex/pb01-06-materialize-slice` | — | — |
| PB-01-07 | pending | `codex/pb01-07-integrated-gate` | — | — |

## Baseline congelado

- Branch-base: `main`.
- Commit de autoria do design: `0565f71`.
- Snapshot Canary: `157e6f9e21318bd3033eea553fe9275b429faf72` em
  `C:\Kaezan\kaezan-huntbound\references\canary`.
- Node/pnpm: 24.14.0 / 11.21.0 via Corepack.
- PB-00R: `done`; PB-00R-FIX-01 integrado e W1/W2 resolvidos.
- Working tree esperada ao iniciar PB-01-01: limpa e na `main`.

## Decisões operacionais

- Tasks são seriais por padrão.
- PB-01-04/05 podem formar uma onda paralela somente quando ambas partirem da `main` já contendo
  PB-01-03. Nesse modo, executores preservam branches e PB-01-06 integra ambos serialmente.
- Nenhuma task instala software global ou servidor. Dependências entram com versão exata no lockfile.
- O arquivo SQLite materializado e temporários de importação não são versionados; migrations,
  operações curadas, JSON, docs e hashes são.
- Mudança de fonte, schema ou identidade não coberta pela task bloqueia; não ampliar a migração.

## Handoffs

Nenhuma task executada. PB-01-01 deve começar pelos testes de identidade/schemas e não criar banco,
fixtures Canary ou importers.

## Bloqueios

Nenhum bloqueio conhecido.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos e resultados frescos;
3. registrar decisões duráveis na spec/arquitetura apropriada e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort e validador efetivos;
6. não apagar histórico de falhas ou desvios.

