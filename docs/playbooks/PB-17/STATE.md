# PB-17 — Estado operacional

**Playbook:** `docs/playbooks/PB-17/README.md`

**Estado geral:** criado em 2026-08-30 a pedido do usuário — "melhorar o que já temos", com o
cockpit in-game como alvo: mochila, minimapa e cooldowns com ícone do Tibia. Elegível. Nenhuma task
iniciada.

**Última atualização:** 2026-08-31 — `PB-17-FIX-02` aberta a partir do playtest.

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
| PB-17-05 | pending | `main` | frontier `xhigh` | — | — | — |
| PB-17-FIX-02 | done | `main` | econômico `xhigh` | Codex GPT-5 `xhigh` | `95c6e41` | recorte CSS responsivo do frame 0 nos painéis alvo, mochila e deck; biome/typecheck/test do game verdes |

## Bloqueios

**B19 — aberto, achado durante a PB-17-04, não bloqueia task.** `tools/asset-packer/vitest.config.ts`
não é invocado por nenhum script do `package.json`, então `huntArtifacts.test.ts` ficou vermelho desde
a PB-17-01 sem ninguém ver: as contagens fixas (147/109/217) não somaram os nove ícones de magia, e
`sourceLock.files.every(byteLength === 68)` deixou de valer para os recortes de `spell`. As contagens
são mecânicas; a asserção de byteLength exige decidir o que a fixture sintética deve afirmar sobre
magia. Vira `PB-17-FIX-01`, junto com ligar essa config ao script de teste.

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
