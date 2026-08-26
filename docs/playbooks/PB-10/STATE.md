# PB-10 — Estado operacional

**Playbook:** `docs/playbooks/PB-10/README.md`

**Estado geral:** reescrito em 2026-08-26 como "Catálogo de hunts", em cima do PB-08 integrado
(`80be90b`). Spec congelada em
`docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`. Próxima elegível:
**PB-10-01**. Só as tasks 01 e 02 estão escritas; o resto é bullet no `README.md`.

**Última atualização:** 2026-08-26

**Base:** o jogo tem uma hunt, compilada em `apps/game/src/main.ts:9`. A extração já roda sobre o
diretório de selections e a seleção de asset já é derivada da região — é o que a 03 aproveita.

## Tasks

Alocação e justificativa vivem no `README.md`, seção "Modelo e effort por task".

| ID | Status | Branch prevista | Modelo previsto | Modelo usado | Commit | Evidência principal |
|---|---|---|---|---|---|---|
| PB-10-01 | pending | `<agente>/pb10-01-spawn-identity` | frontier `xhigh` | — | — | — |
| PB-10-02 | pending | `<agente>/pb10-02-escada-de-hunts` | frontier `xhigh` | — | — | — |
| PB-10-03 | não escrita | — | econômico `xhigh` | — | — | — |
| PB-10-04 | não escrita | — | econômico `xhigh` | — | — | — |
| PB-10-05 | não escrita | — | econômico `xhigh` | — | — | — |
| PB-10-06 | não escrita | — | frontier `xhigh` | — | — | — |
| PB-10-07+ | não escrita | — | econômico `xhigh` | — | — | — |

## Bloqueios

**B9 — herdado do PB-08, e é a PB-10-01.** O snapshot de save referencia spawn por
`(groupIndex, slotIndex)` em `SpawnSlotStateSchema`
(`packages/contracts/src/simulation/schemas.ts:1268`), com ordenação por `compareSpawnSlots` e os
mesmos índices em `spawn/deferred` e `spawn/capped`. Toda mudança de conteúdo de hunt invalida todo
save existente: custou 8 testes vermelhos na PB-08-01 com **uma** mudança. Este playbook mexe em
conteúdo **cinco vezes**. Deixa de ser bloqueio quando a 01 integrar.

**B15 — aberto, resolvido pela PB-10-02.** Nenhuma hunt além da rotworm teve `lookType` conferido
contra o export pessoal (`HUNTBOUND_PERSONAL_ASSET_SOURCE`). Falta de sprite é o único item que
bloqueia uma hunt por arte, e descobrir isso no meio de uma task de conteúdo custa o ciclo inteiro.

**B11 e B14 — abertos, herdados do PB-08 e independentes deste playbook.** Sondas sensíveis a carga
da máquina. Passam isoladas; rode `verify` de novo antes de teorizar. `retries` e timeout inflado
seguem proibidos.

**B4 — aberto, decisão do usuário, herdado.** Cinco branches antigas fora da `main` sem triagem.

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas", e na spec. Task serial ou paralela sempre faz
`git merge --ff-only` na `main`.

## Métricas

`corepack pnpm qa:budgets` não medido neste playbook. Vermelho vira task de performance, nunca
bloqueio.

## Regra de atualização

Só status/branch/commit na tabela; bloqueio e próxima elegível; narrativa no commit, não aqui.
