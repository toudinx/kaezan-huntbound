# PB-10 — Estado operacional

**Playbook:** `docs/playbooks/PB-10/README.md`

**Estado geral:** reescrito em 2026-08-26 como "Catálogo de hunts", em cima do PB-08 integrado
(`80be90b`). Spec congelada em
`docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`. Escada em
`docs/content/HUNT_BANDS.md`. Tasks 01 a 10 fechadas e integradas — a máquina do catálogo está
inteira e as cinco hunts estão na `main`. As hunts autoram em
paralelo, integram em série, e não rodam `verify` ao mesmo tempo (bloqueio B17).

**Última atualização:** 2026-08-27

**Base:** pipeline multi-hunt, índice gerado, tela de hunting places no boot e IA que conjura. Nada
em `apps/game` nem no `package.json` cita uma hunt por nome. Acrescentar hunt é: espécie no catálogo,
selection, **receita de layout**, entrada no `huntRegistry.ts` e pack. As tasks 07 a 10 são de mob
básico mas **sobretudo de mapa** — decisão do usuário em 2026-08-26.

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
| PB-10-07 | done | `codex/pb10-07-orc-fortress` | econômico `xhigh` | Grok 4.6 `xhigh` | `f2f9755` | Orc+Spearman no catálogo; 68/68 XML 13/33/22; 32×32×3; ficha nv 25 HP 440; verify 81/81 |
| PB-10-08 | done | `codex/pb10-08-cyclopolis` | econômico `xhigh` | Grok 4.6 `xhigh` | `3fa4845` | Cyclops 19/19 XML; recorte 24×24×3; ficha nv 45 HP 740; armor 17 inerte; content/assets/hunt/combat/sim verdes; correctness 80/80 |
| PB-10-09 | done | `codex/pb10-09-dragon-lair` | econômico `xhigh` | Grok 4.6 `xhigh` | `91814cb` | Dragon 31/31 XML; Ankrahmun 64×48×3; ficha nv 70 HP 1115; area r=4 fogo entra, onda omitida; content/assets/hunt/combat/sim verdes; correctness 81/81 |
| PB-10-10 | done | `codex/pb10-10-hero-cave` | econômico `xhigh` | Codex GPT-5 `xhigh` | `ae6b4d1` | Hero 24/24; content/assets/hunt/combat/sim verdes; correctness 79/79; budgets 5.338/5.183 s informativo; verify canônico bloqueado por 4173 externo |

## Bloqueios

**B9 — fechado pela PB-10-01.** Spawn vivo endereça por `slotId` de origem Canary, não por
`(groupIndex, slotIndex)`.

**B15 — fechado pela PB-10-02.** Sete espécies congeladas das faixas 1–5 com `lookType` aberto em
`outfits/<id>.png`; nenhuma falta. Hashes em `docs/content/HUNT_BANDS.md` §3.

**B11 e B14 — abertos, herdados do PB-08.** Sondas de frame sensíveis a carga. Último caso:
`combat-play.spec.ts:195` reprovou só no viewport desktop no fechamento das 05/06 e passou 4×
seguidas isolado. `retries` e timeout inflado seguem proibidos.

**B16 — aberto, ambiental, não é código.** Sob CPU alta de aplicativos de desktop os replays do
Vitest estouram timeout, sempre com `Test timed out` e nunca divergência de golden; o teste que
reprova muda a cada rodada. **Não reproduziu no fechamento das 05/06**, com a máquina em ~40–60 %:
`verify` chegou em `build` e `qa:browser` pela primeira vez desde a PB-10-02.

**B17 — aberto por desenho, não é defeito.** As tasks de hunt (07–10) **autoram em paralelo,
integram em série e escalonam o gate**. Integração: cruzam-se em duas fontes
(`pb-01-contract-coverage.json`, `huntRegistry.ts`) e em dois artefatos **gerados**
(`generated/pb-01-contract-coverage.json` e `generated/hunts/index.json`, com sidecars); conflito em
gerado se resolve **regenerando depois do rebase**, nunca mergeando. Isso serializa em qualquer N e
**não impõe teto de 2**. O teto real é a **máquina**: duas sessões simultâneas mediram 91 % de CPU e
reprovaram o `tools/replay` por timeout (B16), e a suíte Playwright leva 8,4 min sozinha com a máquina
livre. Escrever recipe é barato; `verify` é que não pode coincidir.

**B18 — aberto, bloqueia a PB-10-07. Não é código deste repositório.** Outfit de **32×32** do
export pessoal sai cisalhado ~1 px por linha e aparece deitado na diagonal: conferidos os lookTypes
5, 25 e 40 no re-export de 2026-08-30. **Não é universal** — o Hero 73 sai correto nesse mesmo
export e o Hero Cave renderiza limpo; a leitura anterior de que 73 também estava cisalhado era
errada. Os de 64×64 saem certos (Rotworm 26, Cyclops 22, Dragon 34, knight 131, 1.118 no total; o
manifesto tem 79 em 32×32 contra 1.118 em 64×64). O packer copia o PNG byte a byte, então o jogo
desenha o arquivo como ele é. Reproduzido fora do jogo decodificando a folha CIP com a mesma lógica
de header do extractor: o cisalhamento já está na folha, e o header dela é normal (384×384, 32 bpp,
`pixoff` 122, stride 1536). Conserto e re-export vivem no `AssetExtractor`. **Orc é 32×32.**

**B19 — aberto, `main` vermelha desde `3fa4845`.** `tests/e2e/haste-play.spec.ts:171` reprova com
`The player never accepted two consecutive cardinal steps`, na Venore Rotworm Cave. Bisect: passa em
`87e12e0`, reprova em `3fa4845` e em `c551e84`, três vezes seguidas isolada — não é o B11/B14. A
linha de evidência da PB-10-08 registra `correctness 80/80`; o gate hoje dá 79/1. Suspeita a
investigar: ordem de blueprint mudando o consumo do stream de RNG da IA. Junto, o fallback por
vocação em `readHuntCharacter` (`apps/game/src/main.ts:182`) faz hunt sem ficha própria pegar em
silêncio a primeira ficha de knight do catálogo em vez de estourar.

**B4 — aberto, decisão do usuário, herdado.** Cinco branches antigas fora da `main` sem triagem.

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas", e na spec. Task serial ou paralela sempre faz
`git merge --ff-only` na `main`.

## Métricas

`corepack pnpm qa:budgets` não medido neste playbook. Vermelho vira task de performance, nunca
bloqueio.

## Regra de atualização

Só status/branch/commit na tabela; bloqueio e próxima elegível; narrativa no commit, não aqui.
