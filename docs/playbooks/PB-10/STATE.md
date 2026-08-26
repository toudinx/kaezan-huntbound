# PB-10 — Estado operacional

**Playbook:** `docs/playbooks/PB-10/README.md`

**Estado geral:** reescrito em 2026-08-26 como "Catálogo de hunts", em cima do PB-08 integrado
(`80be90b`). Spec congelada em
`docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`. Escada em
`docs/content/HUNT_BANDS.md`. Tasks 01 e 02 fechadas e integradas. Próxima elegível: **PB-10-03**.
As tasks 03 e 04 estão escritas; da 05 em diante é bullet no `README.md`.

**Última atualização:** 2026-08-26

**Base:** o jogo tem uma hunt, compilada em `apps/game/src/main.ts:9`. A extração já roda sobre o
diretório de selections e a seleção de asset já é derivada da região — é o que a 03 aproveita.

## Tasks

Alocação e justificativa vivem no `README.md`, seção "Modelo e effort por task".

| ID | Status | Branch prevista | Modelo previsto | Modelo usado | Commit | Evidência principal |
|---|---|---|---|---|---|---|
| PB-10-01 | done | `cursor/pb10-01-spawn-identity` | frontier `xhigh` | Grok 4.6 `xhigh` | `6089d58` | `slotId` Canary; S7 inalterado; save 1→2 descarta `spawnSlots`; pb03 intacto |
| PB-10-02 | done | `cursor/pb10-02-escada-de-hunts` | frontier `xhigh` | Grok 4.6 `xhigh` | `9af0675` | `docs/content/HUNT_BANDS.md`, escada inteira + faixas 1–5 congeladas |
| PB-10-03 | pending | `<agente>/pb10-03-pipeline-multi-hunt` | econômico `xhigh` | — | — | — |
| PB-10-04 | pending | `<agente>/pb10-04-indice-de-hunts` | econômico `xhigh` | — | — | — |
| PB-10-05 | não escrita | — | econômico `xhigh` | — | — | — |
| PB-10-06 | não escrita | — | frontier `xhigh` | — | — | — |
| PB-10-07+ | não escrita | — | econômico `xhigh` | — | — | — |

## Bloqueios

**B9 — fechado pela PB-10-01.** Spawn vivo endereça por `slotId` de origem Canary, não por
`(groupIndex, slotIndex)`.

**B15 — fechado pela PB-10-02.** Sete espécies congeladas das faixas 1–5 com `lookType` aberto em
`outfits/<id>.png`; nenhuma falta. Hashes em `docs/content/HUNT_BANDS.md` §3.

**B11 e B14 — abertos, herdados do PB-08.** Sondas de frame sensíveis a carga da máquina.
`haste-play.spec.ts:167` falhou 3× isolado na PB-10-02; `hunt-play.spec.ts:405` passou. `retries` e
timeout inflado seguem proibidos. Não bloquearam a integração da PB-10-02, que é docs-only.

**B4 — aberto, decisão do usuário, herdado.** Cinco branches antigas fora da `main` sem triagem.

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas", e na spec. Task serial ou paralela sempre faz
`git merge --ff-only` na `main`.

## Métricas

`corepack pnpm qa:budgets` não medido neste playbook. Vermelho vira task de performance, nunca
bloqueio.

## Regra de atualização

Só status/branch/commit na tabela; bloqueio e próxima elegível; narrativa no commit, não aqui.
