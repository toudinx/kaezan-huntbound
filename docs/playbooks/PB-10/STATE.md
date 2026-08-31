# PB-10 — Estado operacional

**Playbook:** `docs/playbooks/PB-10/README.md`

**Estado geral:** reescrito em 2026-08-26 como "Catálogo de hunts", em cima do PB-08 integrado
(`80be90b`). Spec congelada em
`docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`. Escada em
`docs/content/HUNT_BANDS.md`. Tasks 01 a 12 fechadas e integradas — a máquina do catálogo está
inteira e as cinco hunts estão na `main`. O que resta é a correção de mapa (13 a 15): a hunt deixa de
ser um recorte e passa a ocupar a caixa curada, que é onde o circuito está.

**Última atualização:** 2026-08-31 — 13 fechada e corrigida pela PB-10-13-FIX-01 (start do jogador
caía fora da hunt), pela PB-10-13-FIX-02 (pack cobrindo a caixa inteira) e pela PB-10-13-FIX-03
(escadas de subida). 01 a 12 fechadas. Acrescentadas 13 a 15, a correção de mapa: as
hunts são jogadas num recorte de 24×24/32×32 enquanto as caixas curadas pela PB-10-02 têm 65×68 a
71×71, e é o recorte que mata o circuito. Próxima elegível: **PB-10-13**.

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
| PB-10-07 | done | `codex/pb10-07-orc-fortress` | econômico `xhigh` | Grok 4.6 `xhigh` | `760c699` | Orc+Spearman no catálogo; 68/68 XML 13/33/22; 32×32×3; ficha nv 25 HP 440; rebase de 5 hunts em 2026-08-30, gerados regenerados; correctness 81/1 (só B19) |
| PB-10-08 | done | `codex/pb10-08-cyclopolis` | econômico `xhigh` | Grok 4.6 `xhigh` | `3fa4845` | Cyclops 19/19 XML; recorte 24×24×3; ficha nv 45 HP 740; armor 17 inerte; content/assets/hunt/combat/sim verdes; correctness 80/80 |
| PB-10-09 | done | `codex/pb10-09-dragon-lair` | econômico `xhigh` | Grok 4.6 `xhigh` | `c0b9750` | Dragon 31/31 XML; ficha nv 70 HP 1115; area r=4 fogo entra, onda omitida. **Mapa refeito em 2026-08-30**: a receita era caixa fabricada 64×48×3 com `ground: 101` em toda célula; agora 3 `copy-rect` 24×24 do mapa real, paleta 48→200, pack 65→217, andáveis 431/237/235 conectados |
| PB-10-10 | done | `codex/pb10-10-hero-cave` | econômico `xhigh` | Codex GPT-5 `xhigh` | `ae6b4d1` | Hero 24/24; content/assets/hunt/combat/sim verdes; correctness 79/79; budgets 5.338/5.183 s informativo; verify canônico bloqueado por 4173 externo |
| PB-10-11 | done | `main` | frontier `xhigh` | Grok 4.6 `xhigh` | `08cbe85` | hipótese do catálogo derrubada; fallback de ficha removido; relógio da cena resincronizado no create |
| PB-10-12 | done | `main` | econômico `xhigh` | Codex GPT-5 `xhigh` | `d6743ee` | `corpseItemId` no catálogo; registry, packs e decoração por espécie; content/assets/architecture/test/typecheck/build verdes |
| PB-10-13 | done | `main` | frontier `xhigh` | Codex GPT-5 `xhigh` | `76e1050` | Orc na caixa real 65×68×3; 33/68 spawns; 6 transições, 2 dropped; primeiro paint z6: 5.427 comandos / 5.115 sprites resolvidos; map-extractor, content, architecture e format verdes; pack derivado 541>512 fica fora do escopo |
| PB-10-13-FIX-01 | done | `main` | frontier `xhigh` | Claude Opus 5 | `695ea59` | start do jogador por conectividade: componente com mais grupos → andar com mais grupos → célula de menor caminhada. Orc sai de (64,14,z6), lasca de 21 células com 1 grupo, para (37,40,z7): 2.620 células, 19/33 grupos, 6/6 transições. As quatro hunts com receita regeneram byte a byte; map-extractor (139), content, architecture e format verdes |
| PB-10-13-FIX-02 | done | `main` | frontier `xhigh` | Claude Opus 5 | `c2efb02` | pack da caixa inteira: selection derivada da região real (357→541 chaves), teto de entradas 512→1024 com `maxBytes` como guarda de memória (523 mídias / 2,6 MB contra 6 MiB), 119 ids adicionados ao export privado e export re-rodado. 1.235 de 14.376 comandos de desenho sem sprite → 0. `huntArtifacts.test.ts` (7 vermelhos na `main`, contagens anteriores aos 9 ícones de spell) verde; asset-packer (61), `assets:check` e format verdes |
| PB-10-13-FIX-03 | done | `main` | frontier `xhigh` | Claude Opus 5 | `6d6bb64` | escadas de volta: `type="ladder"` entra na tabela de flags (schema 2, 17 ids) e vira transição `moveUpstairs` (um andar acima, um tile ao sul). Orc vai de 6 para 12 transições; z6 sai de 0 para 815 células alcançáveis do start. `expectedDroppedTransitions` 2→3 pela escada de (27,57,z6) para z5, fora dos andares congelados. As quatro com receita reextraem byte a byte; map-extractor (141), tile-flags (81), content, architecture e format verdes |
| PB-10-14 | pending | `main` | econômico `xhigh` | — | — | — |
| PB-10-15 | pending | `main` | econômico `xhigh` | — | — | — |

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
`pixoff` 122, stride 1536). **A geometria do extractor foi reverificada em 2026-08-30 e está
correta**: com grade de 32 px sobre a folha decodificada cada célula traz uma criatura inteira, e
ovelhas e morcegos da mesma folha saem limpos; o atlas exportado também está alinhado célula a
célula. `Locate`/`DecodeSheet` batem com o `spriteappearances.cpp`. Ou seja, não é cisalhamento de
decodificação nem de montagem — a causa continua desconhecida e não vale re-derivar o alinhamento.
**Orc é lookType 5 e sai deitado; Hero 73 sai certo.**

**B19 — fechado pela PB-10-11.** A ordem do catálogo **não** desloca blueprint nem RNG da rotworm:
`buildHuntScenario` só compõe `hunt.blueprints` (já ordenados por `blueprintId`) e criatura extra no
catálogo deixa o cenário idêntico. O spawn do jogador em `(21,7,8)` é um beco (N/E parede; o único
par cardinal livre é oeste, com rotworm em `(19,7)`); o `update` da cena usava o `time` do Phaser,
que inclui o preload, e despejava o orçamento de catch-up como ticks de hunt. O fallback por vocação
em `readHuntCharacter` saiu — ficha ausente estoura com o `characterKey`. `haste-play.spec.ts:171`
passou 2× isolado no bundle fresco.

**B20 — aberto, reportado pelo usuário jogando em 2026-08-30. Endereçado pela PB-10-12.** O corpo de
qualquer criatura morta é um rotworm morto: `CombatDecorations.ts:155` usa sempre
`HUNT_PACK_DEAD_ROTWORM_KEY`, que está em `HUNT_PACK_COMBAT_KEYS` e resolve `clientId` 5967 fixo em
`huntSelection.ts:253` — nenhum pack carrega outro corpo. `monster.corpse` existe em toda Lua e é
descartado por `ignoredMonsterFields` em `parseMonsterLua.ts:73`. Os sete `objects/<id>.png` já
existem no export pessoal; não é B18.

**B21 — aberto, sem task escrita.** As faixas 2 a 5 não são concluíveis: `finish('completed')` não é
chamado em nenhum ponto do código de produção — só `finish('abandoned')` no `pagehide`
(`apps/game/src/main.ts:482`) — e a mitigação está desligada por decisão congelada 6 (`armor`
inerte, `resistances` não lidos, sem poção). **É o escopo do PB-11**, não deste playbook. Registrado
aqui porque foi descoberto no aceite do PB-10.

**B22 — aberto, ambiental, não é código. Família do B11/B14/B16.** O worker do Playwright cai com
`code=3221225477` (`0xC0000005`, access violation) em `save-driver.spec.ts:213`, derrubando os 7
specs seguintes do arquivo: 74 passed / 1 failed / 7 did not run. **Nenhuma asserção reprova** — é o
processo que morre. Reproduziu em 2 de 3 rodadas de `qa:browser` em 2026-08-30, sempre na posição 75
de 82, depois de ~4,5 min de Chromium. **Não reproduz isolado:** o arquivo passa 8/8 três vezes
seguidas em ~4,4 s. Sinal de instabilidade de processo em corrida longa, não de defeito do spec —
por isso vira linha aqui e **não** task de correção: um agente atrás disso caçaria um bug que não
reproduz. Vale reabrir como task se passar a reproduzir isolado ou a atingir outro arquivo. Mesmo
dia, `assets:check` saiu com exit 139 numa execução e verde em 7,6 s na seguinte, o que inclina para
a máquina.

**B23 — aberto, endereçado pelas PB-10-13 a 15.** A hunt é jogada num sub-retângulo da caixa que a
PB-10-02 curou: 32×32 na Orc Fortress contra 65×68 congelados, 24×24 nas outras quatro contra 64×96 a
71×71. Com aggro de 11 tiles o tabuleiro recortado é um box só, então não há spot para rotacionar e a
hunt circular do Tibia não acontece — embora o respawn por slot (`respawnTicks` do `spawntime` real,
S7 do kernel) já a sustente. O extractor já tem o caminho `layout === undefined` que extrai a caixa
inteira, deriva travessia de floorchange real e escolhe `playerStart`; quem o proíbe é
`tools/map-extractor/cli.ts:313`.

**B25 — aberto, não é da PB-10.** `tools/asset-packer/vitest.config.ts` não está em nenhum script:
o `test` da raiz lista replay, tile-flags, map-extractor, map-materials, hunt-selection,
content-catalog, hunt-index e save, e os 15 arquivos de teste do asset-packer não rodam em lugar
nenhum. Por isso `huntArtifacts.test.ts` ficou 7 vermelhos sem ninguém ver — congelava contagens de
chave anteriores aos 9 ícones de spell. Consertado pela PB-10-13-FIX-02, mas **o config continua
órfão**: pendurá-lo no `test` é task própria. Mesmo padrão em `tools/map-extractor/tsconfig.json`,
que não compila na `main` e também não está em gate nenhum.

**B24 — fechado pela PB-10-13-FIX-03.** A caixa não tinha uma única transição de subida porque
`floorchange` no Canary só desce — os 8 itens da caixa são buracos, 2 deles caindo em z9. A volta é a
escada, que é `type="ladder"` em `items.xml` e sobe por ação (`ladder_up.lua`), não por estado de
tile. A tabela de flags passou a carregá-la e o extractor emite a geometria do
`Position:moveUpstairs`: um andar acima e um tile ao sul, porque o tile logo acima da escada é o
buraco de onde o jogador caiu.

**B26 — aberto, decisão de conteúdo, não é defeito.** 22 dos 68 slots da Orc Fortress (14 dos 33
grupos) ficam num componente de 1.324 células em z7 — o campo **fora da muralha**, separado do forte
por parede de pedra real, conferida item a item. O forte de Tibia se entra por cima, e a rampa que
sobe o morro não está dentro do retângulo congelado. Consequência no kernel: `S7` conta o teto
`maxLiveActors: 64` sobre **todos** os atores vivos, então esses 22 orcs inalcançáveis seguram um
terço do teto para sempre e 4 slots alcançáveis nunca chegam a nascer. Opções: descartar na extração
o grupo inalcançável a partir do `playerStart` (mexe em `expectedSpawnGroups: 33` e
`expectedSpawnSlots: 68`, congelados na selection) ou aceitar como cenário. **Do usuário.**

**B4 — fechado em 2026-08-30.** `git branch -a` traz só `main` e os remotos dela; as cinco branches
antigas não existem mais.

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas", e na spec. Task serial ou paralela sempre faz
`git merge --ff-only` na `main`.

## Métricas

`corepack pnpm qa:budgets` não medido neste playbook. Vermelho vira task de performance, nunca
bloqueio.

## Regra de atualização

Só status/branch/commit na tabela; bloqueio e próxima elegível; narrativa no commit, não aqui.
