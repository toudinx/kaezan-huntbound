# PB-17 — Estado operacional

> **Fila encerrada em 2026-09-07:** registro histórico. Implementações e commits abaixo
> permanecem válidos; pendências não são executáveis por esta fila. Destino no
> [roteiro vigente](../../06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md). Status antigos abaixo são históricos.


**Playbook:** `docs/playbooks/PB-17/README.md`

**Estado geral:** criado em 2026-08-30 a pedido do usuário — "melhorar o que já temos", com o
cockpit in-game como alvo: mochila, minimapa e cooldowns com ícone do Tibia. Fila encerrada: 01 a 04
e os dois FIX estão integrados, e a 05 saiu para o PB-14.

**Última atualização:** 2026-09-09 — revisão dos playbooks 15, 17 e 18: B19 fechado (a config do
asset-packer entrou no script `test`) e a PB-17-05 movida para `PB-14-07`. Nada mais desta fila está
pendente.

**Base:** o chassi do PB-08-08/09 (`CockpitLayout`, bandas, rail com minimapa/alvo/bag) e as cinco
hunts do PB-10. Nada aqui reescreve chassi.

## Tasks

Alocação e justificativa vivem no `README.md`, seção "Modelo e effort por task".

| ID | Status | Branch prevista | Modelo previsto | Modelo usado | Commit | Evidência principal |
|---|---|---|---|---|---|---|
| PB-17-01 | done | `main` | econômico `xhigh` | Codex GPT-5 `xhigh` | `f59d400` | categoria `spell`, nove recortes por `clientId`, source-locks e packs das cinco hunts; assets/content/architecture/test verdes |
| PB-17-02 | done | `main` | econômico `xhigh` | Codex GPT-5 `xhigh` | `57dd213` | ícone spell por chave do pack, varredura CSS de cooldown e distinção entre grupo, habilidade e mana; biome/typecheck/test focado verdes |
| PB-17-03 | done | `main` | econômico `xhigh` | Codex GPT-5 `xhigh` | `7298724` | nome no hover/foco/toque, badge de stack, animação de loot e grid com scroll interno; biome/test verdes |
| PB-17-04 | done | `main` | frontier `xhigh` | Claude Opus 5 `xhigh` | `d3a9ec6` | cor de chão derivada da média dos pixels do tile real, seta com facing, chevrons de transição, ring de entrada e readout de andar; biome/typecheck/suíte de `apps/game` verdes |
| PB-17-05 | movida | `main` | frontier `xhigh` | — | — | vira `PB-14-07` em 2026-09-09; ver Bloqueios |
| PB-17-FIX-02 | done | `main` | econômico `xhigh` | Codex GPT-5 `xhigh` | `95c6e41` | recorte CSS responsivo do frame 0 nos painéis alvo, mochila e deck; biome/typecheck/test do game verdes |
| PB-17-FIX-03 | done | `main` | frontier `xhigh` | Claude Opus 5 `xhigh` | `281b8eb` | recorte das nove magias no export privado e seleções `personal` regeneradas: os packs das cinco hunts não tinham nenhuma chave `spell:` desde a PB-17-01; `assets:check` verde |

## Bloqueios

**B30 — fechado em 2026-09-09 pela revisão dos playbooks 15, 17 e 18.** A PB-17-05, o log de
combate, era a única pendência viva desta fila e **não** havia sido absorvida: o roteiro dizia que a
pendência de feedback foi para PB-13-09 e PB-14-06, mas o que a PB-13-09 entregou foi o *feed do
helper* (`apps/game/src/ui/cockpit/HelperPanel.ts`), que narra o que o helper fez — não dano, cura,
leech, regen, loot, morte nem recusa de comando. `combat/leeched`, `combat/regenerated` e
`command/rejected` continuam sem ninguém dizer na tela. Virou `PB-14-07`, onde faz par com o ajuste
de leitura das três vocações. A card original permanece em `tasks/PB-17-05-o-log-de-combate.md` como
proveniência; não executar por esta fila.

**B19 — fechado em 2026-09-09, sem task.** Achado durante a PB-17-04.
`tools/asset-packer/vitest.config.ts` já **é** invocado pelo script `test` (`package.json:18`) e o
PB-13 fechou em 2026-09-08 com a suíte inteira verde. O relato histórico: ele ficou fora do script,
então `huntArtifacts.test.ts` esteve vermelho desde a PB-17-01 sem ninguém ver — as contagens fixas
(147/109/217) não somaram os nove ícones de magia, e `sourceLock.files.every(byteLength === 68)`
deixou de valer para os recortes de `spell`. A `PB-17-FIX-01` prevista nunca foi aberta porque o
conserto veio junto com outro diff.

**B13 — desbloqueado pelo usuário em 2026-08-25, é a PB-17-01.** Sexta categoria de asset (`spell`)
autorizada, com identidade `clientId` e suporte no packer. O índice das nove magias está medido em
`docs/assets/SPELL_ICON_INDEX.md`; o custo real é o recorte de `spell-icons-32x32.png` em
`spells/<clientId>.png` dentro do export privado, com source-lock.

**B18 — aberto, herdado do PB-10, e não atinge este playbook.** O cisalhamento de ~1 px por linha é
de outfits de 32 × 32 vindos da folha CIP decodificada pelo extractor. O atlas de magia é um PNG
comum em `data/images/game/spells/` do OTClient, não passa pelo decodificador de folha, e portanto
não corre esse risco. Confirmar por imagem no primeiro recorte, não assumir.

**B11 e B14 — abertos, herdados do PB-08.** Sondas de frame sensíveis a carga reprovam de forma
intermitente na suíte cheia de browser. `retries`, `skip` e timeout inflado seguem proibidos. A
suíte de browser é do usuário; um vermelho ali vira `PB-17-NN-FIX-MM` e não bloqueia task.

**B16 — aberto, ambiental, não é código.** Sob CPU alta os replays do Vitest estouram timeout, sempre
com `Test timed out` e nunca divergência de golden. Liste processos antes de teorizar.
