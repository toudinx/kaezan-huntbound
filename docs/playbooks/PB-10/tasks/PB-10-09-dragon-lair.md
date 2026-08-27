# PB-10-09 — Dragon Lair, a faixa 4

**Status inicial:** pending

**Classe da tarefa:** **conteúdo** — uma hunt, ponta a ponta. Nenhum tool novo, nenhum contrato novo,
**nenhuma peça de kernel nova**.

**Modelo sugerido:** camada econômica com effort `xhigh`. Tudo congelado pela PB-10-02.

**Validador sugerido:** modelo diferente do implementador.

**Rota:** **sem skill externa.** Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`,
`hunt-content-pipeline`.

**Paralelismo:** **a autoria roda em paralelo com as outras hunts; o `verify` não.** Ver "A regra de
integração" e o bloqueio B17.

**Spec:** `docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`.
**Fonte da faixa:** `docs/content/HUNT_BANDS.md`, Seção 2, Faixa 4.

## Objetivo

**Dragon Lair**, em Ankrahmun — faixa 4, nível 70. O degrau é o chão acendendo: **ataque de longe com
área**, e o número é fogo.

## A hunt entra inteira, e um ataque não

Esta é a confusão mais fácil de cometer nesta task, então ela vem antes de tudo.

O Lua do Dragon traz **dois** ataques de fogo:

| Ataque | Forma | Entra? |
|---|---|---|
| fogo −60..−140, `range` 7, **`radius` 4**, chance 15 % | `kind: area` no mapeamento Canary; o contrato já tem `shape: 'area'` | **Sim. É o degrau.** |
| fogo −100..−170, **`length` 8 / `spread` 3**, chance 10 % | onda; `AbilityShape` **não tem `'wave'`** | **Não. Simplesmente não é adicionado.** |

**Isso não remove a hunt nem a criatura — remove um ataque.** O Dragon entra com melee, com o bloco
de fogo de raio 4 e com a cura. A onda fica no portão da faixa 9, mesmo estando no arquivo. Não a
implemente, e não descarte o Dragon por causa dela.

## Ankrahmun, não Darashia

A proposta original dizia Darashia. A PB-10-02 conferiu o arquivo: a caixa de Darashia
(`33200..33290 × 32240..32320`, z 7–9) tem **49 Rotworms e zero Dragons**. O cluster de Dragon que
cabe no budget sem misturar Falcon (Edron) nem Demônios (Pits of Inferno) é **Ankrahmun**.

A hunt continua se chamando "Dragon Lair"; a região que o snapshot entrega é esta. Reordenação
justificada pelo arquivo, não pela memória — não "corrija" de volta para Darashia.

## O que está congelado

Da PB-10-02, com `sourceFile` e `sha256` em `HUNT_BANDS.md` §2 Faixa 4.

**Caixa:** `33002..33070 × 32640..32700`, z `5, 6, 7` — 69 × 61 × 3, dentro do budget. 40 grupos,
46 slots.

**Uma espécie entra:**

| Espécie | Slots | HP | Exp | Dano / alcance | `lookType` | Lua |
|---|---:|---:|---:|---|---:|---|
| Dragon | 31 | 1 000 | 700 | melee 0–120; fogo −60..−140 `range` 7 `radius` 4 chance 15 %; cura 40–70 chance 15 %; imune a fogo e a paralisia | 34 | `dragons/dragon.lua` |

**Loot** (mesma Lua), chance ≥ 2 000 ‰: gold coin 89 920 ‰ (máx. 102), dragon ham 66 270 ‰ (máx. 2),
steel shield 15 650 ‰, dragon's tail 9 680 ‰, crossbow 9 120 ‰, burst arrow id 3449 8 060 ‰
(máx. 10), longsword 3 830 ‰, steel helmet 3 490 ‰, broadsword 2 700 ‰, plate legs 2 029 ‰.

**Ficam de fora, com o motivo:**

- **Dragon Hatchling** (2 slots) — a mesma imagem com número menor (380 HP). Escada.
- **Dragon Lord** (5 slots) — a mesma imagem com número maior (1 900 HP). Substituição futura, não
  soma.
- **Hydra** (8 slots) — 2 350 HP e multi-alvo. Outra faixa.

## Fogo entra cheio; mitigação não

Decisão congelada 8 do PB-10. `attackElement` já participa do dano de saída em
`packages/simulation/src/kernel/combat.ts:517`. `resistances` e `immunities` **não são lidos** para
reduzir o que chega.

Consequência: a **imunidade a fogo do Dragon não faz nada** até o PB-11, e o Knight também não tem
defesa elemental. A assimetria é a mesma dos dois lados, e é deliberada. Registre no card da hunt;
não implemente mitigação aqui.

## A entrega principal é o mapa — e aqui ela decide letalidade

Decisão do usuário em 2026-08-26: estas tasks são de mob básico, **mas sobretudo de mapa**. Nesta
faixa o recorte não decide só o ritmo: **decide se a hunt é jogável**.

O molde é `packages/content/src/layouts/hunts/venore-rotworm-cave.json` — **3087 linhas** para um
24 × 24 de dois andares, com 22 `copy-rect`/`copy-cell`, 420 células de borda, 2 transições e 20
spawns realocados.

**A conta que você precisa fazer antes de posicionar um Dragon.** A ficha do Knight na faixa 4
(`HUNT_BANDS.md` §4): `HP(L) = 185 + 15 × (L − 8)`, então no nível 70 são **1 115 HP**. O bloco de
fogo tira 60–140 e acende num **raio 4 de Chebyshev** — uma área de 9 × 9. Dois Dragons com linha
para o mesmo tile tiram até 280 num ciclo, e **não há nada que reduza isso**.

Então: 31 Dragons cabem na caixa, mas **não os empilhe onde vários alcancem o mesmo tile**. Prefira
câmaras separadas a um salão aberto. Um salão com seis Dragons e raio 4 não é difícil — é morte sem
resposta, e a faixa 4 vira uma parede em vez de um degrau.

`spawnPlacements` carrega a origem Canary de cada slot (`{ source, target }`): realocar é permitido,
inventar não.

## Uma espécie precisa entrar no catálogo

Dragon **não está** em `packages/content/src/generated/pb-01-contract-coverage.json`. Entra por
importador, acrescentando ao `roots` e ao `sourceFiles` de
`packages/content/src/selections/pb-01-contract-coverage.json` e regenerando. Não edite o bundle
gerado à mão.

## A regra de integração

As tasks de hunt se cruzam em **quatro** arquivos:

| Arquivo | Natureza | Como resolver conflito |
|---|---|---|
| `packages/content/src/selections/pb-01-contract-coverage.json` | fonte | merge normal |
| `tools/asset-packer/hunt/huntRegistry.ts` | fonte | merge normal |
| `packages/content/src/generated/pb-01-contract-coverage.json` + `.sha256` | **gerado** | **regenere**, nunca mergeie |
| `packages/content/src/generated/hunts/index.json` + `.sha256` | **gerado** | **regenere**, nunca mergeie |

**Integre depois de rebasear na `main` atual e regenere os dois artefatos depois do rebase, nunca
antes.** Rode `content:check` de novo antes do `--ff-only`.

**E não rode `verify` junto com outra task de hunt.** Medido nesta máquina: duas sessões de agente
simultâneas levaram a CPU a 91 % e fizeram o `tools/replay` estourar timeout — é o B16, e nenhum dos
vermelhos era código. A suíte Playwright sozinha leva 8,4 min com a máquina livre. Autore em
paralelo; escalone o gate.

## Sprites: sem bloqueio

`lookType` 34 foi conferido abrindo `outfits/34.png` no export pessoal na PB-10-02 (87 139 bytes,
hash em `HUNT_BANDS.md` §3). Se faltar, é regressão do export — pare e reporte.

## Fora de escopo

- **A onda `length`/`spread`.** Faixa 9. Ver acima.
- **Mitigação elemental, `resistances`, `immunities`.** PB-11.
- **`armor`, paralisia, invocação.** Portões de outras faixas.
- **Hatchling, Dragon Lord, Hydra.** Fora por decisão congelada.
- **Kernel.** Nenhuma peça. A área de raio já existe no contrato.

## Leitura mínima

1. esta task;
2. `docs/content/HUNT_BANDS.md`, Seção 2 Faixa 4, Seção 3, Seção 4 e Seção 5;
3. `docs/playbooks/PB-10/README.md` e o `STATE.md`;
4. `packages/content/src/selections/hunts/venore-rotworm-cave.json` — a forma de uma selection, com
   `band`;
5. `packages/content/src/layouts/hunts/venore-rotworm-cave.json` — **o molde** da receita;
6. `tools/asset-packer/hunt/huntRegistry.ts`;
7. `docs/content/MAP_REGION_CONTRACT.md` e `docs/content/IDENTITY_POLICY.md`;
8. `.cursor/rules/20-content.mdc` e `.cursor/rules/30-assets.mdc`.

## Passos

1. Importe Dragon para o catálogo e regenere.
2. Escreva a selection da hunt, com `band: 4` e a caixa congelada.
3. **Autore a receita de layout**, com câmaras que evitem sobreposição de raio 4.
4. Acrescente a entrada ao `huntRegistry.ts` e gere os artefatos da hunt.
5. Monte a selection de asset e o pack.
6. Regenere o índice e confira com `--check`.
7. `corepack pnpm build`, abra o jogo, escolha a Dragon Lair e **jogue até tomar um bloco de fogo**.
8. Atualize a linha PB-10-09 do `STATE.md`.

## Verificações exigidas

Com saída fresca colada no relatório:

- `corepack pnpm verify` — verde;
- `corepack pnpm content:check` e `assets:check`;
- `corepack pnpm hunt:check`, `combat:check` e `simulation:check` — verdes **sem golden regenerado**;
- `corepack pnpm qa:browser`, projeto `correctness`;
- **prova de spawn**: todo slot com origem real no XML, via `spawnPlacements`;
- **`corepack pnpm dev` de pé**, com uma frase dizendo o que olhar.

## Risco conhecido

**A faixa vira parede.** É o modo de falhar específico daqui, e é aritmético: sem mitigação, dois
blocos de fogo sobrepostos tiram até 280 de 1 115 HP, e seis Dragons num salão matam antes de o
jogador chegar em qualquer um. Recorte em câmaras. Se você não conseguir jogar a sua própria hunt sem
morrer atravessando, o recorte está errado — não a faixa.

**Implementar a onda porque ela está no Lua.** O dado está lá e é tentador. `AbilityShape` não tem
`'wave'`; é a faixa 9.

**Regenerar golden.** Esta task não toca em kernel. Se `hunt:check` ou `combat:check` mudarem, a
causa é outra.

## Definition of Done

- [ ] Dragon no catálogo, por importador, com o bundle regenerado.
- [ ] Selection com `band: 4` e a caixa **de Ankrahmun** congelada.
- [ ] Receita de layout autorada, em câmaras, sem sobreposição gratuita de raio 4.
- [ ] Só Dragon; Hatchling, Dragon Lord e Hydra fora.
- [ ] O ataque de `range` 7 + `radius` 4 entra; a onda `length`/`spread` **não** é adicionada.
- [ ] Imunidade a fogo registrada como inerte; nenhuma mitigação implementada.
- [ ] Entrada no `huntRegistry.ts`, pack montado, índice regenerado e conferido.
- [ ] Nenhum golden regenerado.
- [ ] A hunt é jogável e atravessável; `verify` e `qa:browser` verdes.
- [ ] Integrada por `git merge --ff-only`, com os artefatos regenerados **depois** do rebase.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com um modelo economico em effort xhigh.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-10\tasks\PB-10-09-dragon-lair.md

Leia AGENTS.md, .cursor/rules/20-content.mdc, .cursor/rules/30-assets.mdc,
docs/playbooks/PB-10/README.md, o STATE.md, a spec
docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md e — a FONTE DESTA FAIXA —
docs/content/HUNT_BANDS.md Secao 2 Faixa 4, Secao 3, Secao 4 e Secao 5.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb10-09-dragon-lair com a branch
<agente>/pb10-09-dragon-lair e rode "corepack pnpm install --prefer-offline" dentro dela.

ENTREGUE DRAGON LAIR (Ankrahmun), faixa 4, nivel 70. O degrau e o chao acendendo: ATAQUE DE LONGE COM
AREA, e o numero e fogo.

A HUNT ENTRA INTEIRA E UM ATAQUE NAO — leia isto antes de tudo. O Lua do Dragon traz DOIS ataques de
fogo:
- fogo -60..-140, range 7, RADIUS 4, chance 15% -> kind area no mapeamento Canary; o contrato ja tem
  shape 'area'. ENTRA. E O DEGRAU.
- fogo -100..-170, LENGTH 8 / SPREAD 3, chance 10% -> onda; AbilityShape NAO TEM 'wave'. NAO ENTRA,
  simplesmente NAO E ADICIONADO.
ISSO NAO REMOVE A HUNT NEM A CRIATURA — REMOVE UM ATAQUE. O Dragon entra com melee, com o bloco de
fogo de raio 4 e com a cura. A onda fica no portao da faixa 9 mesmo estando no arquivo.

ANKRAHMUN, NAO DARASHIA. A proposta original dizia Darashia; a PB-10-02 conferiu o arquivo e a caixa
de Darashia (33200..33290 x 32240..32320, z 7-9) tem 49 ROTWORMS E ZERO DRAGONS. O cluster que cabe no
budget sem misturar Falcon nem Demonios e Ankrahmun. NAO "CORRIJA" DE VOLTA PARA DARASHIA.

CONGELADO PELA PB-10-02 com sourceFile e sha256:
CAIXA 33002..33070 x 32640..32700, z 5,6,7 (69x61x3), dentro do budget. 40 grupos, 46 slots.
DRAGON: 31 slots, 1000 HP, 700 exp, melee 0-120, fogo -60..-140 range 7 radius 4 chance 15%, cura
40-70 chance 15%, imune a fogo e paralisia, lookType 34, dragons/dragon.lua.
LOOT (>= 2000 permil): gold coin 89920 (max 102), dragon ham 66270 (max 2), steel shield 15650,
dragon's tail 9680, crossbow 9120, burst arrow id 3449 8060 (max 10), longsword 3830, steel helmet
3490, broadsword 2700, plate legs 2029.
FORA: Dragon Hatchling (2) e Dragon Lord (5) sao a mesma imagem com numero menor/maior — escada.
Hydra (8), 2350 HP e multi-alvo, outra faixa.

FOGO ENTRA CHEIO, MITIGACAO NAO (decisao congelada 8). attackElement ja participa do dano de saida em
packages/simulation/src/kernel/combat.ts:517; resistances e immunities NAO SAO LIDOS. A IMUNIDADE A
FOGO DO DRAGON NAO FAZ NADA ate o PB-11, e o Knight tambem nao tem defesa elemental. Registre e NAO
IMPLEMENTE MITIGACAO.

A ENTREGA PRINCIPAL E O MAPA, e aqui ela DECIDE LETALIDADE. O molde e
packages/content/src/layouts/hunts/venore-rotworm-cave.json: 3087 LINHAS para um 24x24 de 2 andares,
22 copy-rect/copy-cell, 420 celulas de borda, 2 transicoes, 20 spawns realocados.

FACA ESTA CONTA ANTES DE POSICIONAR UM DRAGON: HP(L) = 185 + 15 x (L - 8), entao no nivel 70 sao
1115 HP. O bloco de fogo tira 60-140 e acende num RAIO 4 DE CHEBYSHEV — area de 9x9. DOIS Dragons com
linha para o mesmo tile tiram ate 280 num ciclo, E NAO HA NADA QUE REDUZA ISSO. 31 Dragons cabem na
caixa mas NAO OS EMPILHE onde varios alcancem o mesmo tile. PREFIRA CAMARAS SEPARADAS A UM SALAO
ABERTO. Salao com seis Dragons e raio 4 nao e dificil — e morte sem resposta, e a faixa vira parede.

spawnPlacements carrega { source, target }: realocar e permitido, inventar nao.

UMA ESPECIE ENTRA NO CATALOGO: Dragon NAO ESTA em
packages/content/src/generated/pb-01-contract-coverage.json. Entra por importador, acrescentando ao
roots E ao sourceFiles de packages/content/src/selections/pb-01-contract-coverage.json e regenerando.
NAO EDITE O BUNDLE GERADO.

REGRA DE INTEGRACAO — as tasks de hunt se cruzam em QUATRO arquivos:
- packages/content/src/selections/pb-01-contract-coverage.json (fonte, merge normal)
- tools/asset-packer/hunt/huntRegistry.ts (fonte, merge normal)
- packages/content/src/generated/pb-01-contract-coverage.json + .sha256 (GERADO)
- packages/content/src/generated/hunts/index.json + .sha256 (GERADO)
INTEGRE DEPOIS DE REBASEAR NA main ATUAL E REGENERE OS DOIS ARTEFATOS DEPOIS DO REBASE, NUNCA ANTES.
content:check de novo antes do --ff-only.

E NAO RODE verify JUNTO COM OUTRA TASK DE HUNT. Medido nesta maquina: duas sessoes de agente
simultaneas levaram a CPU a 91% e fizeram o tools/replay estourar timeout (B16), e nenhum vermelho era
codigo. A suite Playwright sozinha leva 8,4 min com a maquina livre. AUTORE EM PARALELO, ESCALONE O
GATE.

SPRITES SEM BLOQUEIO: lookType 34 conferido abrindo outfits/34.png na PB-10-02 (87139 bytes, hash em
HUNT_BANDS.md §3). Se faltar e regressao do export — PARE E REPORTE.

FORA DE ESCOPO: a onda length/spread (faixa 9); mitigacao elemental (PB-11); armor, paralisia e
invocacao; Hatchling, Dragon Lord e Hydra; kernel (a area de raio ja existe no contrato).

RISCO CENTRAL: A FAIXA VIRA PAREDE. Sem mitigacao, dois blocos de fogo sobrepostos tiram ate 280 de
1115 HP, e seis Dragons num salao matam antes de o jogador chegar em qualquer um. RECORTE EM CAMARAS.
SE VOCE NAO CONSEGUIR JOGAR A SUA PROPRIA HUNT SEM MORRER ATRAVESSANDO, O RECORTE ESTA ERRADO.
SEGUNDO RISCO: implementar a onda porque ela esta no Lua. TERCEIRO: regenerar golden — esta task nao
toca em kernel.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm verify
- corepack pnpm content:check e assets:check
- corepack pnpm hunt:check, combat:check e simulation:check verdes SEM golden regenerado
- corepack pnpm qa:browser (projeto correctness)
- prova de spawn: todo slot com origem real no XML via spawnPlacements
- corepack pnpm dev DE PE, com uma frase dizendo o que olhar

Ao terminar: atualize somente a linha PB-10-09 do STATE.md com o modelo e o effort EFETIVAMENTE
usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com git merge
--ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no relatorio:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
