# PB-10-10 — Hero Cave, a faixa 5

**Status inicial:** pending

**Classe da tarefa:** **conteúdo** — a última hunt do MVP. Nenhum tool novo, nenhum contrato novo,
**nenhuma peça de kernel nova**.

**Modelo sugerido:** camada econômica com effort `xhigh`. Tudo congelado pela PB-10-02.

**Validador sugerido:** modelo diferente do implementador.

**Rota:** **sem skill externa.** Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`,
`hunt-content-pipeline`.

**Paralelismo:** **a autoria roda em paralelo com as outras hunts; o `verify` não.** Ver "A regra de
integração" e o bloqueio B17.

**Spec:** `docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`.
**Fonte da faixa:** `docs/content/HUNT_BANDS.md`, Seção 2, Faixa 5.

## Objetivo

**Hero Cave**, Edron — faixa 5, nível 130. O teto do que o kit atual aguenta: **o alvo que se cura o
bastante para o metrônomo não bastar**.

Com ela o MVP do PB-10 fecha: cinco faixas, cinco cards no catálogo, e a escada inteira declarada até
os selos de Ferumbras.

## O Hero não traz fogo — a spec errou e o arquivo mandou

A spec do playbook dizia que Dragon e Hero trazem fogo. A PB-10-02 abriu o Lua: **o Hero não tem
fogo.** Melee físico e flecha física, e nada mais.

A divergência está escrita no `HUNT_BANDS.md` e vale aqui: **o teto do kit é o heal 200–250, não o
elemento.** Não acrescente dano elemental para "cumprir a spec" — o arquivo vence, e é regra do
`AGENTS.md`.

## Por que o heal é um degrau, e não o shaman com número maior

A conta está no `HUNT_BANDS.md` §2 Faixa 5 e é o critério que a task tem de preservar:

| | Cura | Chance | Valor esperado |
|---|---|---:|---|
| Orc Shaman (faixa 2) | 27–43 | 60 % / 2 s | ~10,5 HP/s |
| **Hero** | **200–250** | **20 % / 2 s** | **22,5 HP/s** |

O filler do Knight faz ≈ 78 / 2 s no skill 60, ou **39 HP/s**. Contra 22,5 HP/s de cura ele vence —
**por pouco**, e a margem some quando o Hero também atira. O degrau é **obrigar o kit de burst**
(Berserk, Brutal Strike, Groundshaker) a existir: auto-attack sozinho empata ou perde o trade.

Se o recorte deixar o jogador enfrentar Heroes um a um com folga infinita, ele mata no metrônomo e o
degrau some. A faixa 5 é sobre o auto-attack **não bastar**.

## O Hero é melee que também atira, não spearman de novo

`targetDistance` 1 — ele quer encostar. Mas tem flecha física 0–120 a `range` 7, chance 20 %,
`CONST_ANI_ARROW`. Ranged puro já foi a faixa 2; aqui o papel é **dual**, e é o que o torna difícil de
desengajar.

## O que está congelado

Da PB-10-02, com `sourceFile` e `sha256` em `HUNT_BANDS.md` §2 Faixa 5.

**Caixa:** `33270..33340 × 31550..31620`, z `8, 9, 10` — 71 × 71 × 3, dentro do budget. 101 grupos,
**184 slots**.

**Uma espécie entra:**

| Espécie | Slots | HP | Exp | Dano / alcance | `lookType` | Lua |
|---|---:|---:|---:|---|---:|---|
| Hero | 24 | 1 400 | 1 200 | melee 0–240; físico 0–120 `range` 7 chance 20 % `CONST_ANI_ARROW`; cura 200–250 chance 20 % / 2 000 ms; `targetDistance` 1; `armor` 35; imune a paralisia | 73 | `humans/hero.lua` |

**Loot** (mesma Lua), chance ≥ 5 000 ‰: gold coin 59 500 ‰ (máx. 100), scroll id 2815 45 000 ‰,
arrow 26 000 ‰ (máx. 13), red rose 20 450 ‰, grapes 19 850 ‰, bow 13 300 ‰, sniper arrow 11 400 ‰
(máx. 4), meat 8 200 ‰ (máx. 3), green tunic 8 000 ‰, scroll of heroic deeds 5 000 ‰.

**Ficam de fora, e são a maioria da caixa:**

- **Renegade Knight, Vile Grandmaster, Vicious Squire** — **114 slots**, o overlay Edron moderno.
- **Blood Priest, Bonebeast, Undead Gladiator, Necromancer, Lich, Ghoul** — 46 slots, undead e
  condição.

## O problema desta hunt é filtragem, não densidade

Aqui está a diferença que decide o recorte. Das quatro hunts:

| Hunt | Slots na caixa | Slots que entram | Sobrevive |
|---|---:|---:|---:|
| Orc Fortress | 157 | 68 | 43 % |
| Cyclopolis | 37 | 19 | 51 % |
| Dragon Lair | 46 | 31 | 67 % |
| **Hero Cave** | **184** | **24** | **13 %** |

**87 % da caixa é espécie excluída.** Os 24 Heroes estão espalhados entre 160 slots que não entram, e
transcrever a caixa produziria uma hunt onde quase nada é a hunt.

Então o trabalho aqui é **encontrar onde os Heroes realmente estão** e recortar em volta deles,
ignorando o overlay moderno inteiro. É o oposto do problema da Orc Fortress, onde a dificuldade é
preservar proporção entre três espécies que entram.

## A entrega principal é o mapa

Decisão do usuário em 2026-08-26: estas tasks são de mob básico, **mas sobretudo de mapa**. A
curadoria acabou na PB-10-02; o que decide se a hunt é boa é a **receita de layout autorada**.

O molde é `packages/content/src/layouts/hunts/venore-rotworm-cave.json` — **3087 linhas** para um
24 × 24 de dois andares, com 22 `copy-rect`/`copy-cell`, 420 células de borda, 2 transições e 20
spawns realocados.

Com 24 Heroes e um alvo de 1 400 HP que se cura, esta hunt não precisa ser grande: precisa ser
**densa o suficiente para o jogador não descansar entre alvos**, e ter saída para quando o trade der
errado. `spawnPlacements` carrega a origem Canary de cada slot (`{ source, target }`) — realocar é
permitido, inventar não.

## O `armor` 35 fica inerte

Como o do Cyclops na faixa 3. O kernel **não lê `armor`**; liga no PB-11 junto do equipamento. A
imunidade a paralisia também não faz nada — não existe paralisia no kernel, e é o portão da faixa 8.

Registre os dois como declarados e inertes. **Não implemente nenhum dos dois aqui.**

## Uma espécie precisa entrar no catálogo

Hero **não está** em `packages/content/src/generated/pb-01-contract-coverage.json`. Entra por
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
vermelhos era código. A suíte Playwright sozinha leva 8,4 min com a máquina livre. Autore em paralelo;
escalone o gate.

## Sprites: sem bloqueio

`lookType` 73 foi conferido abrindo `outfits/73.png` no export pessoal na PB-10-02 (16 491 bytes,
hash em `HUNT_BANDS.md` §3). Se faltar, é regressão do export — pare e reporte.

## Fora de escopo

- **Fogo no Hero.** O Lua não tem. Ver acima.
- **`armor` e paralisia.** Declarados e inertes; PB-11 e faixa 8.
- **Renegade Knight, Vile Grandmaster, Vicious Squire, e todo o undead.** Fora por decisão congelada.
- **Kernel.** Nenhuma peça. A cura de criatura entrou na PB-10-06.

## Leitura mínima

1. esta task;
2. `docs/content/HUNT_BANDS.md`, Seção 2 Faixa 5, Seção 3, Seção 4 e Seção 5;
3. `docs/playbooks/PB-10/README.md` e o `STATE.md`;
4. `packages/content/src/selections/hunts/venore-rotworm-cave.json` — a forma de uma selection, com
   `band`;
5. `packages/content/src/layouts/hunts/venore-rotworm-cave.json` — **o molde** da receita;
6. `tools/asset-packer/hunt/huntRegistry.ts`;
7. `docs/content/MAP_REGION_CONTRACT.md` e `docs/content/IDENTITY_POLICY.md`;
8. `.cursor/rules/20-content.mdc` e `.cursor/rules/30-assets.mdc`.

## Passos

1. Importe Hero para o catálogo e regenere.
2. Escreva a selection da hunt, com `band: 5` e a caixa congelada.
3. **Ache onde os 24 Heroes estão** dentro dos 184 slots e autore a receita em volta deles.
4. Acrescente a entrada ao `huntRegistry.ts` e gere os artefatos da hunt.
5. Monte a selection de asset e o pack.
6. Regenere o índice e confira com `--check`.
7. `corepack pnpm build`, abra o jogo, escolha a Hero Cave e **jogue até precisar do burst**.
8. Atualize a linha PB-10-10 do `STATE.md`.

## Verificações exigidas

Com saída fresca colada no relatório:

- `corepack pnpm verify` — verde;
- `corepack pnpm content:check` e `assets:check`;
- `corepack pnpm hunt:check`, `combat:check` e `simulation:check` — verdes **sem golden regenerado**;
- `corepack pnpm qa:browser`, projeto `correctness`;
- **prova de spawn**: todo slot com origem real no XML, via `spawnPlacements`;
- **`corepack pnpm dev` de pé**, com uma frase dizendo o que olhar.

Esta é a última hunt do MVP: rode `corepack pnpm qa:budgets`, registre o número no `STATE.md` e siga.
Vermelho ali vira task de performance no backlog, **nunca bloqueio**.

## Risco conhecido

**O degrau some no metrônomo.** Se o recorte der ao jogador espaço para pegar um Hero por vez, curar
entre eles e nunca precisar de burst, a faixa 5 vira a faixa 3 com números maiores. A margem é
apertada de propósito — 39 HP/s de filler contra 22,5 HP/s de cura — e o mapa é o que decide se ela
aperta.

**Acrescentar fogo porque a spec dizia.** O arquivo venceu; está escrito.

**Implementar `armor` ou paralisia** porque o Hero declara os dois e parece fraco sem eles. Não. Os
dois são inertes por decisão, e a faixa foi dimensionada assim.

## Definition of Done

- [ ] Hero no catálogo, por importador, com o bundle regenerado.
- [ ] Selection com `band: 5` e a caixa congelada.
- [ ] Receita de layout autorada em volta de onde os Heroes realmente estão.
- [ ] Só Hero; overlay Edron moderno e todo o undead fora.
- [ ] Nenhum dano elemental acrescentado ao Hero.
- [ ] `armor` 35 e imunidade a paralisia registrados como inertes; nenhum implementado.
- [ ] Entrada no `huntRegistry.ts`, pack montado, índice regenerado e conferido.
- [ ] Nenhum golden regenerado.
- [ ] A hunt é jogável e **exige o burst**; `verify` e `qa:browser` verdes.
- [ ] `qa:budgets` rodado e o número registrado no `STATE.md`.
- [ ] Integrada por `git merge --ff-only`, com os artefatos regenerados **depois** do rebase.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com um modelo economico em effort xhigh.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-10\tasks\PB-10-10-hero-cave.md

Leia AGENTS.md, .cursor/rules/20-content.mdc, .cursor/rules/30-assets.mdc,
docs/playbooks/PB-10/README.md, o STATE.md, a spec
docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md e — a FONTE DESTA FAIXA —
docs/content/HUNT_BANDS.md Secao 2 Faixa 5, Secao 3, Secao 4 e Secao 5.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb10-10-hero-cave com a branch
<agente>/pb10-10-hero-cave e rode "corepack pnpm install --prefer-offline" dentro dela.

ENTREGUE HERO CAVE (Edron), faixa 5, nivel 130 — a ULTIMA HUNT DO MVP. O teto do que o kit atual
aguenta: O ALVO QUE SE CURA O BASTANTE PARA O METRONOMO NAO BASTAR.

O HERO NAO TRAZ FOGO. A spec do playbook dizia que Dragon e Hero trazem fogo; a PB-10-02 ABRIU O LUA e
o Hero NAO TEM. Melee fisico e flecha fisica, nada mais. A divergencia esta escrita no HUNT_BANDS.md:
O TETO DO KIT E O HEAL 200-250, NAO O ELEMENTO. NAO ACRESCENTE DANO ELEMENTAL para "cumprir a spec" —
o arquivo vence.

POR QUE O HEAL E DEGRAU E NAO O SHAMAN COM NUMERO MAIOR: o shaman cura 27-43 a 60%/2s (~10,5 HP/s); o
Hero cura 200-250 a 20%/2s (22,5 HP/s). O filler do Knight faz ~78/2s no skill 60, ou 39 HP/s. Contra
22,5 ele vence POR POUCO, e a margem some quando o Hero tambem atira. O DEGRAU E OBRIGAR O KIT DE
BURST (Berserk, Brutal Strike, Groundshaker) A EXISTIR: auto-attack sozinho empata ou perde o trade.

O HERO E MELEE QUE TAMBEM ATIRA, NAO SPEARMAN DE NOVO: targetDistance 1 (quer encostar) mas flecha
fisica 0-120 a range 7, chance 20%, CONST_ANI_ARROW. Papel DUAL, e e o que o torna dificil de
desengajar.

CONGELADO PELA PB-10-02 com sourceFile e sha256:
CAIXA 33270..33340 x 31550..31620, z 8,9,10 (71x71x3), dentro do budget. 101 grupos, 184 SLOTS.
HERO: 24 slots, 1400 HP, 1200 exp, melee 0-240, fisico 0-120 range 7 chance 20% CONST_ANI_ARROW, cura
200-250 chance 20%/2000ms, targetDistance 1, armor 35, imune a paralisia, lookType 73, humans/hero.lua.
LOOT (>= 5000 permil): gold coin 59500 (max 100), scroll id 2815 45000, arrow 26000 (max 13), red rose
20450, grapes 19850, bow 13300, sniper arrow 11400 (max 4), meat 8200 (max 3), green tunic 8000,
scroll of heroic deeds 5000.
FORA, E SAO A MAIORIA: Renegade Knight, Vile Grandmaster e Vicious Squire (114 SLOTS, overlay Edron
moderno); Blood Priest, Bonebeast, Undead Gladiator, Necromancer, Lich e Ghoul (46, undead/condicao).

O PROBLEMA DESTA HUNT E FILTRAGEM, NAO DENSIDADE. Das quatro hunts: Orc Fortress 68 de 157 (43%),
Cyclopolis 19 de 37 (51%), Dragon Lair 31 de 46 (67%), HERO CAVE 24 DE 184 (13%). 87% DA CAIXA E
ESPECIE EXCLUIDA. Os 24 Heroes estao espalhados entre 160 slots que nao entram. O TRABALHO E ACHAR
ONDE OS HEROES REALMENTE ESTAO e recortar em volta deles, ignorando o overlay moderno inteiro.

A ENTREGA PRINCIPAL E O MAPA. Decisao do usuario em 2026-08-26: mob basico MAS SOBRETUDO MAPA. O molde
e packages/content/src/layouts/hunts/venore-rotworm-cave.json: 3087 LINHAS para um 24x24 de 2 andares,
22 copy-rect/copy-cell, 420 celulas de borda, 2 transicoes, 20 spawns realocados. Com 24 Heroes de
1400 HP que se curam, a hunt nao precisa ser grande: precisa ser DENSA O BASTANTE PARA O JOGADOR NAO
DESCANSAR ENTRE ALVOS, e ter saida para quando o trade der errado. spawnPlacements carrega
{ source, target }: realocar e permitido, inventar nao.

ARMOR 35 E IMUNIDADE A PARALISIA FICAM INERTES. O kernel NAO LE armor (liga no PB-11) e NAO EXISTE
paralisia (portao da faixa 8). Registre os dois como declarados e inertes e NAO IMPLEMENTE NENHUM.

UMA ESPECIE ENTRA NO CATALOGO: Hero NAO ESTA em
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

SPRITES SEM BLOQUEIO: lookType 73 conferido abrindo outfits/73.png na PB-10-02 (16491 bytes, hash em
HUNT_BANDS.md §3). Se faltar e regressao do export — PARE E REPORTE.

FORA DE ESCOPO: fogo no Hero; armor e paralisia; overlay Edron moderno e todo o undead; kernel (a cura
de criatura entrou na PB-10-06).

RISCO CENTRAL: O DEGRAU SOME NO METRONOMO. Se o recorte der espaco para pegar um Hero por vez, curar
entre eles e nunca precisar de burst, a faixa 5 vira a faixa 3 com numeros maiores. A margem e
apertada DE PROPOSITO — 39 HP/s de filler contra 22,5 HP/s de cura — e O MAPA DECIDE SE ELA APERTA.
SEGUNDO RISCO: acrescentar fogo porque a spec dizia. TERCEIRO: implementar armor ou paralisia porque o
Hero declara os dois e parece fraco sem eles.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm verify
- corepack pnpm content:check e assets:check
- corepack pnpm hunt:check, combat:check e simulation:check verdes SEM golden regenerado
- corepack pnpm qa:browser (projeto correctness)
- prova de spawn: todo slot com origem real no XML via spawnPlacements
- corepack pnpm dev DE PE, com uma frase dizendo o que olhar
- ESTA E A ULTIMA HUNT DO MVP: rode corepack pnpm qa:budgets, registre o numero no STATE.md e siga.
  Vermelho ali vira task de performance no backlog, NUNCA bloqueio.

Ao terminar: atualize somente a linha PB-10-10 do STATE.md com o modelo e o effort EFETIVAMENTE
usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com git merge
--ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no relatorio:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
