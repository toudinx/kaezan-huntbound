# PB-08 — Estado operacional

**Playbook:** `docs/playbooks/PB-08/README.md`

**Estado geral:** reescrito em 2026-08-24 como "O Knight completo". Tasks **08 a 10 reescritas em
2026-08-25** em torno do cockpit, após playtest do usuário; spec em
`docs/superpowers/specs/2026-08-25-pb-08-cockpit-hud-design.md`.
Próxima elegível: **PB-08-09**. O mapa da 02 está vigente.

**Última atualização:** 2026-08-25

**Base:** PB-07 congelado na 05. A máquina de condições, toggle, cooldown secundário, leech e regen
sensível a combate está integrada e **sem conteúdo que a use** — é o que a PB-08-04 a 07 consomem.

## Tasks

Alocação e justificativa vivem no `README.md`, seção "Modelo e effort por task".

| ID | Status | Branch prevista | Modelo previsto | Modelo usado | Commit | Evidência principal |
|---|---|---|---|---|---|---|
| PB-08-01 | done | `claude/pb08-01-cave-density` | — | — | `c23c819` | puxão máximo 4 → 11; tiles com ≥4 pulláveis 3 → 125; **20 slots de rotworm em 13 grupos** (ver B9); goldens PB-04 e PB-05 inalterados |
| PB-08-02 | done | `claude/pb08-02-knight-map` | frontier `xhigh` | Claude Opus 5 `xhigh` | `5bc11ff` | `docs/content/KNIGHT_BANDS.md`: 9 células, 5 de dano; 36 pares conferidos por imagem; Berserk × Groundshaker resolvido por **medição** (8 × 36 tiles no snapshot, 8 × 48 sob o contrato); 3 divergências declaradas (raio Chebyshev, taunt raio 1, Challenge fora da promoção) |
| PB-08-03 | done | `codex/pb08-03-kit-table` | Luna `xhigh` | GPT-5 Codex `xhigh` | `40251cc` | Character kit por faixas com resolução por nível; migração SQLite e round-trip cobertos; `qa:browser` 73/73; `qa:budgets`: boot 5502 ms e hunt 4 long tasks, informativo |
| PB-08-04 | done | `codex/pb08-04-damage-rotation` | Luna `xhigh` | GPT-5 Codex `xhigh` | `5b7664f` | 5 abilities; Groundshaker radius 3 / Whirlwind range 5; scenario diff limited to abilities and player indices; `verify`; browser 73/73 |
| PB-08-05 | done | `codex/pb08-05-stances` | Luna `xhigh` | GPT-5 Codex `xhigh` | `86816a3` | `verify` verde; `qa:browser` 74/74; `qa:budgets` informativo vermelho: boot 15254.2 ms, hunt 4955.7 ms com 5 long tasks |
| PB-08-06 | done | `grok/pb08-06-taunt` | **frontier `xhigh`** | Grok 4.6 `xhigh` | `d88d512` | Challenge raio 1, lock 40 ticks, grupo support 1; `simulation:check`/`hunt:check` inalterados; `scenario.json` `6abc77b2`; commands/snapshot/events iguais; `qa:browser` 77/77 |
| PB-08-07 | done | `grok/pb08-07-haste-feel` | Luna `xhigh` | Grok 4.6 `xhigh` | `fa39c5e` | Haste `speedPermille` 600 → passo 11→6 / 600 t; sprite interpola no cooldown efetivo; Charge fora; `scenario.json` `24d4ad2b`; commands/snapshot/events iguais; `verify` pós-ff `qa:browser` 78/78 |
| PB-08-08 | done | `claude/pb08-08-cockpit-chassis` | **frontier `xhigh`** | Claude Opus 5 `xhigh` | `891410c` | área livre única em `playfieldViewport.ts` (mín. 260×320); câmera centra nela; `hunt-mobile.spec.ts` reescrito — moldura inteira em vez de 2/9, orçamento de 13 px removido; `verify` verde, `qa:browser` 78/78; goldens `pb03`/`pb04`/`pb05` inalterados (`24d4ad2b`); screenshots dos 4 viewports regeradas |
| PB-08-09 | pending | `<agente>/pb08-09-window-rail` | Luna `xhigh` | — | — | — |
| PB-08-10 | pending | `<agente>/pb08-10-acceptance` | frontier `xhigh` | — | — | — |

## Bloqueios

**B13 — desbloqueado pelo usuário em 2026-08-25, vira task própria.** Ele autorizou a **sexta
categoria de asset** (`spell`) em `packages/assets/src/manifest/schemas.ts:77`, com identidade
`clientId` e suporte no packer. Duas coisas foram medidas antes de escrever isto e mudam a task:
o atlas é indexado pelo **`clientId` do OTClient**, não pelo `spell:id` do Canary — a premissa
anterior estava errada e a coluna 80 entrega uma runa no lugar do Berserk; e o packer **copia PNG
inteiro, não fatia atlas**, então o custo real é recortar `spell-icons-32x32.png` em
`spells/<clientId>.png` dentro do export privado, com source-lock. Tabela verificada das nove magias
e derivação em `docs/assets/SPELL_ICON_INDEX.md`. **Não é PB-08-09.** Até lá o glifo de área de
efeito segue no lugar.

**B4 — aberto, decisão do usuário.** Dez worktrees antigas em `git worktree list`, de PB-02 a
PB-07, e **cinco branches fora da `main`** com trabalho real: `claude/pb05-fixture-drift`,
`claude/render-resolution-cap`, `codex/fix-dead-run-resume`, `codex/pb00r-01-resize` e
`codex/pb00r-03-package-tests`. Nenhuma verificada contra a `main` atual; as de PB-00R podem ter
sido superadas por commits posteriores. Triagem pendente.

**B9 — aberto, herdado do PB-08 original.** O snapshot de save referencia spawn por
**(índice de grupo, índice de slot)**, então **toda mudança de conteúdo na hunt invalida todo save
existente**. Custou 8 testes vermelhos e um ciclo de conserto na PB-08-01. Endereçar spawn por
identidade estável remove a classe inteira de quebra. **Não é trabalho do PB-08 reescrito** — foi
para o PB-10, que é o playbook que mexe em conteúdo de hunt.

**B11 — aberto, independente do PB-08.** `hunt-play.spec.ts:504` ("short d-pad tap into one paced
command") é sensível a carga: reprovou no `verify` pós-integração da PB-08-02 com 2 comandos (ticks
15 e 17) em vez de 1, com **código byte-idêntico** ao da rodada verde anterior — o diff entre elas
era uma linha de markdown. Passa 14/14 isolada. Vale a regra do AGENTS.md: não mascarar com `retries`
nem timeout inflado; a correção é tornar o tap determinístico. Vira task quando alguém tocar em input.

**B14 — aberto, mesma família do B11.** Sondas que **amostram decoração transitória por frame**
reprovam de forma intermitente **só dentro da suíte cheia**, nunca isoladas. Observado 4× em
2026-08-25, em teste **diferente a cada vez**: `combat-fx.spec.ts:101` (3×) e `combat-play.spec.ts:195`
(`firstSeen.length > 1`, números de dano distintos amostrados ao longo do tempo). A causa comum é
frame perdido sob carga — a pista some antes da sonda chegar. Passa 7/7 isolada, inclusive com o
`vite` de desenvolvimento de pé, o que descarta o servidor como culpado. Reduzir a escrita por frame
do deck (`cd4ddac`) **não** eliminou. A correção é tornar a amostragem independente de frame; `retries`
e timeout inflado são proibidos pelo `AGENTS.md`. Vira task quando alguém tocar em decoração ou sonda.

**B1–B3, B5–B8, B10 e B12 — fechados** entre 2026-08-23 e 2026-08-24. Narrativa no Git.

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas". Task serial ou paralela sempre faz
`git merge --ff-only` na `main`.

## Métricas

`corepack pnpm qa:budgets` não medido neste playbook. Vermelho vira task de performance, nunca bloqueio.

## Regra de atualização

Só status/branch/commit na tabela; bloqueio e próxima elegível; narrativa no commit, não aqui.
