# PB-10 — Estado operacional

**Playbook:** `docs/playbooks/PB-10/README.md`

**Estado geral:** reescrito em 2026-08-26 como "Catálogo de hunts", em cima do PB-08 integrado
(`80be90b`). Spec congelada em
`docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`. Escada em
`docs/content/HUNT_BANDS.md`. Tasks 01 a 04 e 06 fechadas e integradas. Próxima elegível: **PB-10-05**,
escrita. A 05 ainda pode rodar: vive em `apps/game`, a 06 já entregou o kernel.

**Última atualização:** 2026-08-26

**Base:** o pipeline já é multi-hunt e o índice de catálogo já é artefato gerado
(`packages/content/src/generated/hunts/index.json`). O que ainda prende o jogo a uma hunt é
`apps/game`: o import estático em `apps/game/src/main.ts:9` e `runtime.characters[0]` em `:310` —
é exatamente o que a 05 desfaz.

## Tasks

Alocação e justificativa vivem no `README.md`, seção "Modelo e effort por task".

| ID | Status | Branch prevista | Modelo previsto | Modelo usado | Commit | Evidência principal |
|---|---|---|---|---|---|---|
| PB-10-01 | done | `cursor/pb10-01-spawn-identity` | frontier `xhigh` | Grok 4.6 `xhigh` | `6089d58` | `slotId` Canary; S7 inalterado; save 1→2 descarta `spawnSlots`; pb03 intacto |
| PB-10-02 | done | `cursor/pb10-02-escada-de-hunts` | frontier `xhigh` | Grok 4.6 `xhigh` | `9af0675` | `docs/content/HUNT_BANDS.md`, escada inteira + faixas 1–5 congeladas |
| PB-10-03 | done | `codex/pb10-03-pipeline-multi-hunt` | econômico `xhigh` | Codex GPT-5 `xhigh` | `ecff360` | registro declarativo; sidecar multi-hunt; artefatos sem diff; `verify` verde |
| PB-10-04 | done | `codex/pb10-04-indice-de-hunts` | econômico `xhigh` | Codex GPT-5 `xhigh` | `1acfccf` | índice gerado + sidecar determinísticos; content, architecture e hunt checks verdes; verify bloqueado apenas pela falha ambiental B16 em `apps/game` |
| PB-10-05 | done | `codex/pb10-05-tela-hunting-places` | econômico `xhigh` | Codex GPT-5 `xhigh` | `2795b68` | tela DOM; boot por índice; `verify` e `qa:browser` verdes; orçamento informativo em 5,269/5,284 ms |
| PB-10-06 | done | `cursor/pb10-06-criatura-conjura` | frontier `xhigh` | Grok 4.6 `xhigh` | `790f91f` | IA guarda `abilityIndices.length > 0`; shaman ranged/área/cura; goldens intactos |
| PB-10-07+ | não escrita | — | econômico `xhigh` | — | — | — |

## Bloqueios

**B9 — fechado pela PB-10-01.** Spawn vivo endereça por `slotId` de origem Canary, não por
`(groupIndex, slotIndex)`.

**B15 — fechado pela PB-10-02.** Sete espécies congeladas das faixas 1–5 com `lookType` aberto em
`outfits/<id>.png`; nenhuma falta. Hashes em `docs/content/HUNT_BANDS.md` §3.

**B11 e B14 — abertos, herdados do PB-08.** Sondas de frame sensíveis a carga da máquina.
`haste-play.spec.ts:167` falhou 3× isolado na PB-10-02; `hunt-play.spec.ts:405` passou. `retries` e
timeout inflado seguem proibidos. Não bloquearam a integração da PB-10-02, que é docs-only.

**B16 — aberto, ambiental, não é código. Reprova o `verify` inteiro.** Sob 87–94 % de CPU de
aplicativos de desktop, os fixtures de replay estouram o timeout do Vitest: `pb04HuntFixture` 78,9 s e
`pb05CombatFixture` 380,5 s, ambos com `Test timed out`, nunca divergência de golden. O teste que
reprova **muda a cada rodada** (`ContentCatalogApplication`, `pb04HuntFixture`, `pb05CombatFixture`),
que é assinatura de carga: defeito real reprova sempre o mesmo. Os mesmos goldens passam verdes pelo
CLI na mesma execução (`simulation:check`, `hunt:check`, `combat:check`, hashes conferidos).
**Consequência:** `verify` para no `test` e nunca chega em `build` nem `qa:browser`, então essas duas
camadas seguem não medidas desde a PB-10-02. `retries` e timeout inflado seguem proibidos; a correção
é rodar com a máquina livre.

**B4 — aberto, decisão do usuário, herdado.** Cinco branches antigas fora da `main` sem triagem.

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas", e na spec. Task serial ou paralela sempre faz
`git merge --ff-only` na `main`.

## Métricas

`corepack pnpm qa:budgets` não medido neste playbook. Vermelho vira task de performance, nunca
bloqueio.

## Regra de atualização

Só status/branch/commit na tabela; bloqueio e próxima elegível; narrativa no commit, não aqui.
