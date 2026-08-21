# PB-07 — Estado operacional

**Playbook:** `docs/playbooks/PB-07/README.md`

**Estado geral:** em execução. **PB-07-01 integrada.** PB-07-02 implementada na branch, mas
permanece bloqueada para integração pelo B2. PB-07-03 é a próxima elegível após o desbloqueio.
PB-07-12 e PB-07-13 são independentes.

**Última atualização:** 2026-08-21

**Base:** PB-06 integrado em `main`. PB-06-09 bloqueada não impede PB-07.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-07-01 | done | `codex/pb07-01-rotations-reference` | (este commit) | `docs/content/PB-07-ROTATIONS.md` — seis slots confirmados |
| PB-07-02 | blocked | `codex/pb07-02-target-and-impact` | — | 223 testes game; hunt-play 13/13; verify bloqueado por B2; GPT-5 Codex / esforço padrão |
| PB-07-03 | pending | `<agente>/pb07-03-combat-contract-v5` | — | lê a tabela de slots e o buraco de contrato |
| PB-07-04 | pending | `<agente>/pb07-04-sustain` | — | — |
| PB-07-05 | pending | `<agente>/pb07-05-conditions` | — | — |
| PB-07-06 | pending | `<agente>/pb07-06-generic-skills` | — | `exori vis` é `range(3)`, não cinco tiles |
| PB-07-07 | pending | `<agente>/pb07-07-paladin` | — | — |
| PB-07-08 | pending | `<agente>/pb07-08-sorcerer` | — | — |
| PB-07-09 | pending | `<agente>/pb07-09-elements` | — | — |
| PB-07-10 | pending | `<agente>/pb07-10-creature-kit` | — | — |
| PB-07-11 | pending | `<agente>/pb07-11-charges` | — | — |
| PB-07-12 | pending | `<agente>/pb07-12-world-edge` | — | — |
| PB-07-13 | pending | `<agente>/pb07-13-second-hunt` | — | — |
| PB-07-14 | pending | `<agente>/pb07-14-acceptance` | — | — |

Cards 03–14 relidas. Contradição: PB-07-06 exemplifica `exori vis` a cinco tiles; o snapshot é
`range(3)`. A card já aponta `PB-07-ROTATIONS.md` para o número — não foi editada (fora do escopo
de commit da 01; arquivo ainda untracked na `main`). Sem divergência PB-05 que invalide a seleção.

## Bloqueios

**B1 — resolvido em 2026-08-21.** Os três paths que colidiam com PB-07-02 foram preservados
em `c98e1c7`; a worktree desta task parte desse commit.

**B2 — aberto em 2026-08-21.** `corepack pnpm verify` não ficou verde por falhas fora do escopo
da PB-07-02: quatro casos de `save-persistence` esperam `SAVE_VERSION_UNSUPPORTED`, mas a UI
exibe a mensagem textual, e cinco snapshots de `shell` divergem. A task não altera save,
snapshots ou as causas dessas falhas; a integração fica pendente até o gate externo ser tratado.

## Decisões congeladas

Vivem no `README.md`. PB-07-01 confirmou os seis slots; Magic Shield não é sétimo slot.

## Métricas

`corepack pnpm qa:budgets` ainda não medido. Vermelho vira task de performance, nunca bloqueio.

## Regra de atualização

Só status/branch/commit na tabela; bloqueio e próxima elegível; narrativa no commit, não aqui.
