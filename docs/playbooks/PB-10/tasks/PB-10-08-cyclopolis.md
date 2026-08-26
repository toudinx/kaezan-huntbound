# PB-10-08 — Cyclopolis, a faixa 3

**Status inicial:** pending

**Classe da tarefa:** **conteúdo** — uma hunt, ponta a ponta, com a máquina que as tasks 01 a 06 já
construíram. Nenhum tool novo, nenhum contrato novo, **nenhum portão de kernel**.

**Modelo sugerido:** camada econômica com effort `xhigh`. É a mais simples das quatro hunts: uma
espécie, nenhuma capacidade nova, tudo congelado pela PB-10-02.

**Validador sugerido:** modelo diferente do implementador.

**Rota:** **sem skill externa.** Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`,
`hunt-content-pipeline`.

**Paralelismo:** **pode rodar em paralelo com a PB-10-07** — mas as duas **integram em série**. Ver
"A regra de integração"; ela não é opcional.

**Spec:** `docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`.
**Fonte da faixa:** `docs/content/HUNT_BANDS.md`, Seção 2, Faixa 3.

## Objetivo

**Cyclopolis**, Edron, andares de cima — faixa 3, nível 45. O primeiro alvo que **sobrevive ao
metrônomo**: com 260 HP ele não cai num swing, e é isso que faz postura e cura passarem a existir.

## Por que este é um degrau, e não "a faixa 2 com HP maior"

A conta está no `HUNT_BANDS.md` e vale repetir, porque é o critério que a task tem de preservar:

| Espécie | HP | Auto-ataques para cair |
|---|---:|---:|
| Rotworm | 65 | 1 |
| Orc | 70 | 1 |
| **Cyclops** | **260** | **4** |

`knightMeleeDamage` dá ≈ 78 no skill ordinário 60 da ficha congelada, então `ceil(260 / 78) = 4`. A
imagem muda: o boneco **troca** com o alvo em vez de limpar o tile num swing.

Se você mexer no recorte de um jeito que faça o jogador enfrentar Cyclops sempre um a um com folga
para curar entre eles, o degrau some. A faixa 3 é sobre **não conseguir despachar o alvo antes que ele
responda**.

## O que está congelado, e não se rediscute

Da PB-10-02, com `sourceFile` e `sha256` em `HUNT_BANDS.md` §2 Faixa 3.

**Caixa:** `33250..33320 × 31680..31740`, z `8, 9, 10` — 71 × 61 × 3, dentro do budget. 36 grupos,
37 slots. **Os andares 14–15 da mesma montanha têm Behemoth (4 000 HP) e estão fora da caixa de
propósito** — não os traga.

**Uma espécie entra:**

| Espécie | Slots | HP | Exp | Dano / alcance | `lookType` | Lua |
|---|---:|---:|---:|---|---:|---|
| Cyclops | 19 | 260 | 150 | melee 0–105 / 2 000 ms, `targetDistance` 1, `armor` 17 | 22 | `giants/cyclops.lua` |

**Loot** (mesma Lua), chance ≥ 1 000 ‰: gold coin 82 000 ‰ (máx. 47), meat 30 070 ‰, short sword
8 000 ‰, cyclops toe 4 930 ‰, plate shield 2 500 ‰, battle shield 1 400 ‰, halberd 1 003 ‰.

**Ficam de fora, com o motivo:**

- **Cyclops Drone** (4 slots) — melee 0–105 **e** pedra 0–80 a `range` 7. Ranged já é a faixa 2;
  aqui ele recicla um degrau que já foi dado.
- **Cyclops Smith** (1 slot) — melee 0–150 e `drunk` 4 000 ms. **`drunk` não existe no kernel.**
- Skeleton, Wereboar, Werebadger e Fire Elemental (13 slots) — ruído.

## O `armor` 17 fica inerte, e isso é esperado

O Lua do Cyclops declara `armor` 17. O kernel **não lê `armor`** — é o portão da faixa 16, e liga no
PB-11 junto do equipamento que responde a ele.

Registre no card da hunt que o número existe e não age. **Não implemente mitigação por armor aqui**;
seria abrir um portão de outro playbook no meio de uma task de conteúdo, e mudaria o balanço de todas
as hunts de uma vez.

## Uma espécie precisa entrar no catálogo

Cyclops **não está** em `packages/content/src/generated/pb-01-contract-coverage.json`. Entra por
importador, acrescentando ao `roots` e ao `sourceFiles` de
`packages/content/src/selections/pb-01-contract-coverage.json` e regenerando. Não edite o bundle
gerado à mão.

É a única espécie desta task — metade do trabalho de catálogo da PB-10-07.

## A entrega principal é o mapa

Decisão do usuário em 2026-08-26: estas tasks são de mob básico, **mas sobretudo de mapa**. A
curadoria acabou na PB-10-02; o que decide se a hunt é boa é **a receita de layout autorada**.

O molde é `packages/content/src/layouts/hunts/venore-rotworm-cave.json`: **3087 linhas** para um
24 × 24 de dois andares — 22 operações `copy-rect`/`copy-cell` recortando o OTBM real, 420 células de
borda, 2 transições e 20 spawns realocados.

**Esta hunt tem um problema de densidade que a 07 não tem.** A Orc Fortress traz 157 slots numa caixa
de 65 × 68; a Cyclopolis traz **37 slots, dos quais 19 são Cyclops**, numa caixa de 71 × 61 × 3.
Transcrever a caixa produz uma hunt **vazia** — o jogador anda muito e encontra pouco.

Então o recorte aqui é mais agressivo: recorte **apertado** em volta de onde os Cyclops realmente
estão, e prefira três andares curtos a um andar grande e vazio. Densidade é a decisão de design desta
hunt, do mesmo jeito que proporção de espécie é a da 07.

`spawnPlacements` carrega a origem Canary de cada slot (`{ source, target }`), e é o que sustenta
"nenhum spawn é inventado". Todo slot tem que ter origem real no XML — realocar é permitido,
inventar não.

## A regra de integração, com a PB-10-07 em paralelo

As duas trabalham em arquivos próprios, mas se cruzam em **quatro**:

| Arquivo | Natureza | Como resolver conflito |
|---|---|---|
| `packages/content/src/selections/pb-01-contract-coverage.json` | fonte | merge normal |
| `tools/asset-packer/hunt/huntRegistry.ts` | fonte | merge normal |
| `packages/content/src/generated/pb-01-contract-coverage.json` + `.sha256` | **gerado** | **regenere**, nunca mergeie |
| `packages/content/src/generated/hunts/index.json` + `.sha256` | **gerado** | **regenere**, nunca mergeie |

Artefato gerado não se edita à mão, e conflito de merge não é exceção. **Integre depois de rebasear na
`main` atual e regenere os dois artefatos depois do rebase, nunca antes.** Rode `content:check` de
novo antes do `--ff-only`.

## Sprites: sem bloqueio

`lookType` 22 foi conferido abrindo `outfits/22.png` no export pessoal na PB-10-02, com hash em
`HUNT_BANDS.md` §3. Se faltar, é regressão do export — pare e reporte.

## Fora de escopo

- **Kernel.** Nenhuma peça. Esta é a única das quatro hunts sem portão nenhum.
- **`armor`, `drunk`, ranged.** Portões de outras faixas e outros playbooks.
- **Behemoth.** Fora da caixa de propósito.
- **Outras hunts.** A 07 é Orc Fortress e não é sua.

## Leitura mínima

1. esta task;
2. `docs/content/HUNT_BANDS.md`, Seção 2 Faixa 3, Seção 3 e Seção 5;
3. `docs/playbooks/PB-10/README.md` e o `STATE.md`;
4. `packages/content/src/selections/hunts/venore-rotworm-cave.json` — a forma de uma selection,
   incluindo `band`;
5. `packages/content/src/layouts/hunts/venore-rotworm-cave.json` — **o molde** da receita;
6. `tools/asset-packer/hunt/huntRegistry.ts`;
7. `docs/content/MAP_REGION_CONTRACT.md` e `docs/content/IDENTITY_POLICY.md`;
8. `.cursor/rules/20-content.mdc` e `.cursor/rules/30-assets.mdc`.

## Passos

1. Importe Cyclops para o catálogo e regenere.
2. Escreva a selection da hunt, com `band: 3` e a caixa congelada.
3. **Autore a receita de layout**, com recorte apertado; valide contra o budget.
4. Acrescente a entrada ao `huntRegistry.ts` e gere os artefatos da hunt.
5. Monte a selection de asset e o pack.
6. Regenere o índice e confira com `--check`.
7. `corepack pnpm build`, abra o jogo, escolha a Cyclopolis e jogue.
8. Atualize a linha PB-10-08 do `STATE.md`.

## Verificações exigidas

Com saída fresca colada no relatório:

- `corepack pnpm verify` — verde;
- `corepack pnpm content:check` e `assets:check`;
- `corepack pnpm hunt:check`, `combat:check` e `simulation:check` — verdes **sem golden regenerado**;
- `corepack pnpm qa:browser`, projeto `correctness`;
- **prova de spawn**: todo slot com origem real no XML, via `spawnPlacements`;
- **`corepack pnpm dev` de pé**, com uma frase dizendo o que olhar.

## Risco conhecido

**A hunt fica vazia.** É o modo de falhar específico desta faixa, e é o oposto do risco da 07: com 19
Cyclops numa caixa de 71 × 61 × 3, um recorte generoso produz corredores longos sem nada dentro. O
jogador não sente um degrau — sente uma caminhada. Recorte apertado, e prefira densidade a área.

O segundo: **implementar `armor` porque o número está no Lua e o Cyclops parece fraco demais sem
ele.** Não. Ele é inerte por decisão, e a faixa foi dimensionada assim — 4 auto-ataques já é o degrau.

## Definition of Done

- [ ] Cyclops no catálogo, por importador, com o bundle regenerado.
- [ ] Selection da hunt com `band: 3` e a caixa congelada da `HUNT_BANDS.md`.
- [ ] Receita de layout autorada, com recorte apertado, dentro do budget.
- [ ] Só Cyclops; Drone, Smith, Skeleton, Wereboar, Werebadger e Fire Elemental fora.
- [ ] `armor` 17 registrado como inerte; nenhuma mitigação implementada.
- [ ] Entrada no `huntRegistry.ts`, pack montado, índice regenerado e conferido.
- [ ] Nenhum golden regenerado.
- [ ] A hunt aparece na tela e é jogável; `verify` e `qa:browser` verdes.
- [ ] Integrada por `git merge --ff-only`, com os artefatos regenerados **depois** do rebase.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com um modelo economico em effort xhigh.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-10\tasks\PB-10-08-cyclopolis.md

Leia AGENTS.md, .cursor/rules/20-content.mdc, .cursor/rules/30-assets.mdc,
docs/playbooks/PB-10/README.md, o STATE.md, a spec
docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md e — a FONTE DESTA FAIXA —
docs/content/HUNT_BANDS.md Secao 2 Faixa 3, Secao 3 e Secao 5.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb10-08-cyclopolis com a branch
<agente>/pb10-08-cyclopolis e rode "corepack pnpm install --prefer-offline" dentro dela.

PODE RODAR EM PARALELO COM A PB-10-07, MAS AS DUAS INTEGRAM EM SERIE.

ENTREGUE CYCLOPOLIS (Edron, andares de cima), faixa 3, nivel 45. E o primeiro alvo que SOBREVIVE AO
METRONOMO: 260 HP nao cai num swing, e e isso que faz postura e cura passarem a existir.

POR QUE E DEGRAU E NAO "A FAIXA 2 COM HP MAIOR": knightMeleeDamage da ~78 no skill ordinario 60 da
ficha congelada. Rotworm 65 HP e Orc 70 HP caem em 1 auto-ataque; Cyclops 260 HP pede
ceil(260/78) = 4. O boneco TROCA com o alvo em vez de limpar o tile num swing. SE O RECORTE FIZER O
JOGADOR ENFRENTAR CYCLOPS SEMPRE UM A UM COM FOLGA PARA CURAR ENTRE ELES, O DEGRAU SOME.

CONGELADO PELA PB-10-02 com sourceFile e sha256. NUMERO QUE NAO ESTA LA NAO ENTRA.

CAIXA: 33250..33320 x 31680..31740, z 8,9,10 (71x61x3), dentro do budget. 36 grupos, 37 slots. OS
ANDARES 14-15 DA MESMA MONTANHA TEM BEHEMOTH (4000 HP) E ESTAO FORA DA CAIXA DE PROPOSITO — nao traga.

UMA ESPECIE ENTRA: Cyclops, 19 slots, 260 HP, 150 exp, melee 0-105 / 2000 ms, targetDistance 1,
armor 17, lookType 22, giants/cyclops.lua.
LOOT (>= 1000 permil): gold coin 82000 (max 47), meat 30070, short sword 8000, cyclops toe 4930,
plate shield 2500, battle shield 1400, halberd 1003.

FICAM DE FORA: Cyclops Drone (4 slots) — melee 0-105 E pedra 0-80 a range 7; ranged JA E A FAIXA 2.
Cyclops Smith (1) — melee 0-150 e drunk 4000 ms; DRUNK NAO EXISTE NO KERNEL. Skeleton, Wereboar,
Werebadger e Fire Elemental (13): ruido.

O ARMOR 17 FICA INERTE E ISSO E ESPERADO. O kernel NAO LE armor — e portao da faixa 16 e liga no
PB-11 junto do equipamento que responde a ele. NAO IMPLEMENTE MITIGACAO POR ARMOR AQUI: seria abrir
portao de outro playbook no meio de uma task de conteudo e mudaria o balanco de todas as hunts.

UMA ESPECIE PRECISA ENTRAR NO CATALOGO: Cyclops NAO ESTA em
packages/content/src/generated/pb-01-contract-coverage.json. Entra por importador, acrescentando ao
roots E ao sourceFiles de packages/content/src/selections/pb-01-contract-coverage.json e regenerando.
NAO EDITE O BUNDLE GERADO.

A ENTREGA PRINCIPAL E O MAPA. Decisao do usuario em 2026-08-26: estas tasks sao de mob basico MAS
SOBRETUDO DE MAPA. O molde e packages/content/src/layouts/hunts/venore-rotworm-cave.json: 3087 LINHAS
para um 24x24 de 2 andares, com 22 copy-rect/copy-cell recortando o OTBM real, 420 celulas de borda,
2 transicoes e 20 spawns realocados.

ESTA HUNT TEM UM PROBLEMA DE DENSIDADE QUE A 07 NAO TEM: a Orc Fortress traz 157 slots numa caixa
65x68; a Cyclopolis traz 37 SLOTS, DOS QUAIS 19 SAO CYCLOPS, numa caixa 71x61x3. TRANSCREVER A CAIXA
PRODUZ UMA HUNT VAZIA — o jogador anda muito e encontra pouco. RECORTE APERTADO em volta de onde os
Cyclops realmente estao, e prefira TRES ANDARES CURTOS a um andar grande e vazio. Densidade e a
decisao de design desta hunt.

spawnPlacements carrega { source, target }: todo slot tem que ter origem real no XML. Realocar e
permitido, inventar nao.

REGRA DE INTEGRACAO — voce e a PB-10-07 se cruzam em QUATRO arquivos:
- packages/content/src/selections/pb-01-contract-coverage.json (fonte, merge normal)
- tools/asset-packer/hunt/huntRegistry.ts (fonte, merge normal)
- packages/content/src/generated/pb-01-contract-coverage.json + .sha256 (GERADO)
- packages/content/src/generated/hunts/index.json + .sha256 (GERADO)
ARTEFATO GERADO NAO SE EDITA A MAO e conflito de merge nao e excecao. INTEGRE DEPOIS DE REBASEAR NA
main ATUAL E REGENERE OS DOIS ARTEFATOS DEPOIS DO REBASE, NUNCA ANTES. Rode content:check de novo
antes do --ff-only.

SPRITES SEM BLOQUEIO: lookType 22 conferido abrindo outfits/22.png na PB-10-02, hash em
HUNT_BANDS.md §3. Se faltar e regressao do export — PARE E REPORTE.

FORA DE ESCOPO: kernel (esta e a unica das quatro hunts sem portao nenhum); armor, drunk e ranged;
Behemoth; outras hunts.

RISCO CENTRAL: A HUNT FICA VAZIA. Com 19 Cyclops numa caixa 71x61x3, recorte generoso produz
corredores longos sem nada dentro, e o jogador sente uma caminhada em vez de um degrau. RECORTE
APERTADO, PREFIRA DENSIDADE A AREA.
SEGUNDO RISCO: implementar armor porque o numero esta no Lua e o Cyclops parece fraco sem ele. NAO.
Ele e inerte por decisao e a faixa foi dimensionada assim — 4 auto-ataques ja e o degrau.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm verify
- corepack pnpm content:check e assets:check
- corepack pnpm hunt:check, combat:check e simulation:check verdes SEM golden regenerado
- corepack pnpm qa:browser (projeto correctness)
- prova de spawn: todo slot com origem real no XML via spawnPlacements
- corepack pnpm dev DE PE, com uma frase dizendo o que olhar

Ao terminar: atualize somente a linha PB-10-08 do STATE.md com o modelo e o effort EFETIVAMENTE
usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com git merge
--ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no relatorio:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
