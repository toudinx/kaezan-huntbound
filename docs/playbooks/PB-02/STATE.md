# PB-02 — Estado operacional

**Playbook:** `docs/playbooks/PB-02/README.md`

**Estado geral:** ready

**Última atualização:** 2026-08-13

**Próxima task elegível:** PB-02-01

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-02-01 | pending | `codex/pb02-01-asset-contracts` | — | — |
| PB-02-02 | pending | `codex/pb02-02-source-selection` | — | — |
| PB-02-03 | pending | `codex/pb02-03-deterministic-packer` | — | — |
| PB-02-04 | pending | `codex/pb02-04-asset-runtime` | — | — |
| PB-02-05 | pending | `codex/pb02-05-profile-guards` | — | — |
| PB-02-06 | pending | `codex/pb02-06-browser-contract` | — | — |
| PB-02-07 | pending | `codex/pb02-07-integrated-gate` | — | — |

## Baseline congelado

- Branch-base: `main`.
- Commit do design aprovado: `0f2e10907e959a87985662a2da9e6bfc24e0c136`.
- Node/pnpm: 24.14.0 / 11.21.0 via Corepack.
- PB-01: `done`; PB-02 elegível.
- Export Arena Fable: commit histórico `1b14dee3b22f6970333bef76031b473c7bcf917e`.
- Hash do manifesto externo: `edf07a6edfc7c68128d8d0c712fbf0f2f66839e17399da62d9531598b3a05a94`.
- Fixture: Knight 131, Rotworm 26, gold coin 3031, energy hit 12, energy ball 36.
- Dependências previstas: somente `zod@4.4.3` em `@huntbound/assets`; Vitest já está fixado no
  workspace.
- Gate raiz conhecido: `corepack pnpm verify` verde no aceite PB-01.

## Decisões operacionais

- Tasks 01–04 e 06 usam GPT-5.6 Luna `xhigh` por padrão; gatilhos de escalonamento seguem a política.
- PB-02-05 usa GPT-5.6 Sol `xhigh` por cruzar build, licença e boundaries.
- PB-02-07 usa Claude Code/Opus 5, com fallback GPT-5.6 Sol `xhigh`, e prefere validador diferente.
- Fluxo padrão é serial com fast-forward automático e limpeza.
- PB-02-03/04 só entram em paralelo por ativação explícita do supervisor. Nesse modo não editam o
  handoff compartilhado; PB-02-05 é o integrador único.
- A raiz do export externo chega por `HUNTBOUND_PERSONAL_ASSET_SOURCE`; nenhum valor absoluto é
  persistido.
- Fixture sintética e golden pack são rastreados; pack real pessoal, staging e caches são ignorados.
- Divergência do source lock real bloqueia. Não atualizar hashes automaticamente para “fazer passar”.
- Qualquer mídia `cipsoft-personal` rastreada é falha bloqueante.

## Handoffs

Nenhuma task executada. O design aprovado está em
`docs/superpowers/specs/2026-08-13-pb-02-asset-packs-design.md`.

PB-02-01 deve começar pelos contratos e schemas em `@huntbound/assets`; não deve ler a origem real,
criar fixtures, implementar packer/provider ou tocar o app.

## Bloqueios

Nenhum bloqueio conhecido. A origem pessoal foi medida durante o planejamento e corresponde aos
hashes registrados no README; a execução ainda precisa verificá-la novamente.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar PB-02-05 consolidar o handoff compartilhado.
