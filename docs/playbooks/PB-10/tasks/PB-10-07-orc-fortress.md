# PB-10-07 — Orc Fortress, a faixa 2

**Status inicial:** pending

**Classe da tarefa:** **conteúdo** — uma hunt, ponta a ponta, com a máquina que as tasks 01 a 06 já
construíram. Nenhum tool novo, nenhum contrato novo, nenhuma peça de kernel nova.

**Modelo sugerido:** camada econômica com effort `xhigh`. O que decidir já foi decidido: a
PB-10-02 congelou caixa, espécies, números, loot e `lookType` com `sha256`. Aqui é execução.

**Validador sugerido:** modelo diferente do implementador.

**Rota:** **sem skill externa.** Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`,
`hunt-content-pipeline`.

**Paralelismo:** **pode rodar em paralelo com a PB-10-08** — mas as duas **integram em série**. Ver
"A regra de integração" abaixo; ela não é opcional.

**Spec:** `docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`.
**Fonte da faixa:** `docs/content/HUNT_BANDS.md`, Seção 2, Faixa 2.

## Objetivo

A segunda hunt do jogo: **Orc Fortress**, Ulderek's Rock, faixa 2, nível 25. É o degrau que faz o
catálogo deixar de ter um card só, e é o degrau que **consome a PB-10-06**: pela primeira vez uma
criatura machuca sem estar encostada, e outra gasta um ciclo em algo que não é o auto-attack.

## Por que esta hunt, e por que agora

Era o PB-10 antigo inteiro. O diagnóstico de que a caverna de rotworm tem 20 slots e uma espécie
melee — deixando metade do kit do Knight como botão morto — continua certo; o que mudou foi o
enquadramento. Orc, Orc Spearman e Orc Shaman não são remendo na rotworm: **são o conteúdo da
segunda hunt**.

Ela também é a primeira prova de que a máquina toda funciona: registro (03), índice (04), tela (05) e
IA que conjura (06) só ficam demonstrados quando existe uma segunda hunt para escolher.

## O que está congelado, e não se rediscute

Tudo abaixo saiu do snapshot na PB-10-02, com `sourceFile` e `sha256` em `HUNT_BANDS.md` §2 Faixa 2.
**Número que não está lá não entra**; número que está lá não se recalcula.

**Caixa:** `32896..32960 × 31713..31780`, z `6, 7, 8` — 65 × 68 × 3, dentro do budget de
`MAP_REGION_CONTRACT.md`. 61 grupos, 157 slots no XML.

**Três espécies entram, e só três:**

| Espécie | Slots | HP | Exp | Dano / alcance | `lookType` |
|---|---:|---:|---:|---|---:|
| Orc | 13 | 70 | 25 | melee 0–35, `targetDistance` 1 | 5 |
| Orc Spearman | 33 | 105 | 38 | melee 0–25; físico 0–30, `range` 7, chance 20 % | 50 |
| Orc Shaman | 22 | 115 | 110 | melee 0–15; energia −20..−31 `range` 7 chance 15 %; fogo −5..−43 `range` 7 `radius` 1 chance 5 %; cura 27–43 chance 60 % / 2 000 ms | 6 |

**Ficam de fora, e o motivo importa:** Orc Warrior (24 slots), Berserker (36), Leader (9) e Warlord
(4) estão na caixa e são **a mesma imagem melee com outro HP** — é o princípio de design do PB-08
aplicado a espécie. Pig, Wolf, Chicken, War Wolf, Orc Rider, Cyclops e Bonelord são fauna ou ruído.

Reduzir 157 slots para os das três espécies congeladas é curadoria já decidida, não escolha sua.

## Duas espécies precisam entrar no catálogo

O Orc Shaman **já está** em `packages/content/src/generated/pb-01-contract-coverage.json`. **Orc e
Orc Spearman não** — hoje aparecem em `excludedCreatures` da selection da rotworm, com a razão
"absent from the PB-01 catalog selection".

Entram por importador, acrescentando ao `roots` e ao `sourceFiles` de
`packages/content/src/selections/pb-01-contract-coverage.json` e regenerando o catálogo. Não edite o
bundle gerado à mão.

## O `summon` do shaman não entra

O Orc Shaman declara `summons` de Snake, chance 2000 basis points, count 3, e **o dado já está no
catálogo gerado**. A PB-10-06 deliberadamente não implementou invocação: é o portão das faixas 10–11.

Consequência prática para esta task: **Snake não entra no catálogo desta hunt nem nos spawns.** O
campo fica declarado e inerte, exatamente como está hoje. Não force nada.

## A regra de integração, com a PB-10-08 em paralelo

As duas tasks trabalham em arquivos próprios, mas se cruzam em **quatro**:

| Arquivo | Natureza | Como resolver conflito |
|---|---|---|
| `packages/content/src/selections/pb-01-contract-coverage.json` | fonte | merge normal — cada uma acrescenta suas espécies |
| `tools/asset-packer/hunt/huntRegistry.ts` | fonte | merge normal — cada uma acrescenta sua entrada |
| `packages/content/src/generated/pb-01-contract-coverage.json` + `.sha256` | **gerado** | **regenere**, nunca mergeie |
| `packages/content/src/generated/hunts/index.json` + `.sha256` | **gerado** | **regenere**, nunca mergeie |

Artefato gerado não se edita à mão — é regra inviolável do `AGENTS.md`, e conflito de merge não é
exceção. Então: **integre depois de rebasear na `main` atual, e regenere os dois artefatos depois do
rebase, nunca antes.** Rode `content:check` de novo antes de fazer o `--ff-only`.

Se a PB-10-08 integrar primeiro, o índice já terá duas entradas quando você regenerar, e a sua vira a
terceira. Isso é esperado e correto.

## A entrega principal é o mapa

Decisão do usuário em 2026-08-26: estas tasks são de mob básico, **mas sobretudo de mapa**. A
curadoria acabou na PB-10-02 — caixa, espécies, números, loot e `lookType` estão congelados com
`sha256`. O que sobra, e o que decide se a hunt é boa, é **a receita de layout autorada**.

A da rotworm dá a escala: `packages/content/src/layouts/hunts/venore-rotworm-cave.json` tem **3087
linhas** para um 24 × 24 de dois andares — 22 operações `copy-rect`/`copy-cell` recortando o OTBM
real, 420 células de borda, 2 transições e 20 spawns realocados.

**A região jogável é um recorte seu.** A caixa da Orc Fortress é 65 × 68 × 3 no XML, mas a rotworm
tem caixa de 29 × 33 e recorte de 24 × 24. Não transcreva a caixa: recorte o que faz uma hunt boa —
corredores que obriguem a decidir para onde ir, espaço para o Spearman ter linha de tiro, e andar que
valha a transição.

Trate isto como o trabalho principal da task, não como a papelada depois de escolher os bichos. Uma
hunt com as três espécies certas e um mapa ruim falha o degrau; um mapa bom com a proporção certa
entrega a faixa 2 inteira.

`spawnPlacements` carrega a origem Canary de cada slot (`{ source, target }`), e é o que sustenta a
regra "nenhum spawn é inventado". Todo slot que você colocar tem que ter origem real no XML.

## Sprites: sem bloqueio

`lookType` 5, 50 e 6 foram **conferidos abrindo `outfits/<id>.png`** no export pessoal na PB-10-02,
com hash em `HUNT_BANDS.md` §3. O B15 está fechado para esta hunt. Se algum faltar, é regressão do
export, não descoberta — pare e reporte.

## Fora de escopo

- **Kernel.** Nada. A 06 entregou ranged e caster; se você precisa de peça nova, leia de novo o que
  está congelado.
- **Invocação, onda, mitigação elemental, paralisia, armor.** Portões de faixas posteriores.
- **Outras hunts.** A 08 é Cyclopolis e não é sua.
- **A tela.** Fechou na 05. Ela lê o índice; a hunt nova aparece sozinha.

## Leitura mínima

1. esta task;
2. `docs/content/HUNT_BANDS.md`, Seção 2 Faixa 2, Seção 3 e Seção 5;
3. `docs/playbooks/PB-10/README.md` e o `STATE.md`;
4. `packages/content/src/selections/hunts/venore-rotworm-cave.json` — a forma de uma selection,
   incluindo `band`;
5. `packages/content/src/layouts/hunts/venore-rotworm-cave.json` — **o molde** da receita;
6. `tools/asset-packer/hunt/huntRegistry.ts`;
7. `docs/content/MAP_REGION_CONTRACT.md` e `docs/content/IDENTITY_POLICY.md`;
8. `.cursor/rules/20-content.mdc` e `.cursor/rules/30-assets.mdc`.

## Passos

1. Importe Orc e Orc Spearman para o catálogo e regenere.
2. Escreva a selection da hunt, com `band: 2` e a caixa congelada.
3. Autore a receita de layout e valide contra o budget.
4. Acrescente a entrada ao `huntRegistry.ts` e gere os artefatos da hunt.
5. Monte a selection de asset e o pack.
6. Regenere o índice e confira com `--check`.
7. `corepack pnpm build`, abra o jogo, escolha a Orc Fortress e jogue.
8. Atualize a linha PB-10-07 do `STATE.md`.

## Verificações exigidas

Com saída fresca colada no relatório:

- `corepack pnpm verify` — verde;
- `corepack pnpm content:check` e `assets:check` — os dois que esta task mais mexe;
- `corepack pnpm hunt:check`, `combat:check` e `simulation:check` — verdes **sem golden regenerado**;
- `corepack pnpm qa:browser`, projeto `correctness`;
- **prova de spawn**: todo slot com origem real no XML, via `spawnPlacements`;
- **`corepack pnpm dev` de pé**, com uma frase dizendo o que olhar.

## Risco conhecido

**A hunt fica jogável e o degrau não aparece.** É o modo de falhar desta faixa: se o recorte puser o
Spearman e o Shaman longe do caminho, ou em minoria esmagada por Orcs, o jogador atravessa a hunt
sem nunca tomar um projétil nem ver uma barra de vida inimiga subir — e a faixa 2 vira "a faixa 1 com
mais bicho". A proporção do XML (33 Spearman, 22 Shaman, 13 Orc) já favorece o degrau; **preserve-a
no recorte** em vez de encher de Orc porque é o mais barato de posicionar.

O segundo é o de sempre em task de conteúdo: **regenerar um golden porque ele ficou vermelho.** Se
`hunt:check` ou `combat:check` mudarem, a causa é outra — esta task não toca em kernel.

## Definition of Done

- [ ] Orc e Orc Spearman no catálogo, por importador, com o bundle regenerado.
- [ ] Selection da hunt com `band: 2` e a caixa congelada da `HUNT_BANDS.md`.
- [ ] Receita de layout autorada, dentro do budget, com `spawnPlacements` de origem real.
- [ ] Só as três espécies congeladas; Warrior, Berserker, Leader, Warlord e fauna fora.
- [ ] Snake **não** entra; `summons` segue inerte.
- [ ] Entrada no `huntRegistry.ts`, pack montado, índice regenerado e conferido.
- [ ] Nenhum golden regenerado; `packages/test-fixtures` sem diff de kernel.
- [ ] A hunt aparece na tela e é jogável; `verify` e `qa:browser` verdes.
- [ ] Integrada por `git merge --ff-only`, com os artefatos regenerados **depois** do rebase.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com um modelo economico em effort xhigh.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-10\tasks\PB-10-07-orc-fortress.md

Leia AGENTS.md, .cursor/rules/20-content.mdc, .cursor/rules/30-assets.mdc,
docs/playbooks/PB-10/README.md, o STATE.md, a spec
docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md e — a FONTE DESTA FAIXA —
docs/content/HUNT_BANDS.md Secao 2 Faixa 2, Secao 3 e Secao 5.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb10-07-orc-fortress com a branch
<agente>/pb10-07-orc-fortress e rode "corepack pnpm install --prefer-offline" dentro dela.

PODE RODAR EM PARALELO COM A PB-10-08, MAS AS DUAS INTEGRAM EM SERIE. Ver a regra de integracao.

ENTREGUE a segunda hunt do jogo: ORC FORTRESS (Ulderek's Rock), faixa 2, nivel 25. E o degrau que
CONSOME A PB-10-06: pela primeira vez uma criatura machuca sem estar encostada, e outra gasta um
ciclo em algo que nao e o auto-attack.

TUDO ABAIXO ESTA CONGELADO PELA PB-10-02 com sourceFile e sha256. NUMERO QUE NAO ESTA LA NAO ENTRA,
NUMERO QUE ESTA LA NAO SE RECALCULA.

CAIXA: 32896..32960 x 31713..31780, z 6,7,8 (65x68x3), dentro do budget. 61 grupos, 157 slots.

TRES ESPECIES ENTRAM E SO TRES:
- Orc: 13 slots, 70 HP, 25 exp, melee 0-35, targetDistance 1, lookType 5
- Orc Spearman: 33 slots, 105 HP, 38 exp, melee 0-25 + fisico 0-30 range 7 chance 20%, lookType 50
- Orc Shaman: 22 slots, 115 HP, 110 exp, energia -20..-31 range 7 chance 15%, fogo -5..-43 range 7
  radius 1 chance 5%, cura 27-43 chance 60%/2000ms, lookType 6

FICAM DE FORA: Orc Warrior (24), Berserker (36), Leader (9) e Warlord (4) — estao na caixa e sao A
MESMA IMAGEM MELEE COM OUTRO HP, e o principio de design do PB-08 aplicado a especie. Pig, Wolf,
Chicken, War Wolf, Orc Rider, Cyclops e Bonelord: fauna ou ruido.

DUAS ESPECIES PRECISAM ENTRAR NO CATALOGO: o Orc Shaman JA ESTA em
packages/content/src/generated/pb-01-contract-coverage.json. Orc e Orc Spearman NAO — hoje estao em
excludedCreatures da selection da rotworm como "absent from the PB-01 catalog selection". Entram por
importador, acrescentando ao roots E ao sourceFiles de
packages/content/src/selections/pb-01-contract-coverage.json e regenerando. NAO EDITE O BUNDLE GERADO.

O SUMMON DO SHAMAN NAO ENTRA: ele declara summons de Snake (2000 basis points, count 3) e o dado JA
ESTA no catalogo gerado. A PB-10-06 deliberadamente nao implementou invocacao — e o portao das faixas
10-11. SNAKE NAO ENTRA no catalogo desta hunt nem nos spawns. O campo fica declarado e inerte.

REGRA DE INTEGRACAO — voce e a PB-10-08 se cruzam em QUATRO arquivos:
- packages/content/src/selections/pb-01-contract-coverage.json (fonte, merge normal)
- tools/asset-packer/hunt/huntRegistry.ts (fonte, merge normal)
- packages/content/src/generated/pb-01-contract-coverage.json + .sha256 (GERADO)
- packages/content/src/generated/hunts/index.json + .sha256 (GERADO)
ARTEFATO GERADO NAO SE EDITA A MAO, e conflito de merge nao e excecao. INTEGRE DEPOIS DE REBASEAR NA
main ATUAL E REGENERE OS DOIS ARTEFATOS DEPOIS DO REBASE, NUNCA ANTES. Rode content:check de novo
antes do --ff-only. Se a 08 integrar primeiro, o indice ja tera duas entradas e a sua vira a terceira
— isso e esperado.

A ENTREGA PRINCIPAL E O MAPA. Decisao do usuario em 2026-08-26: estas tasks sao de mob basico MAS
SOBRETUDO DE MAPA. A curadoria acabou na PB-10-02; o que decide se a hunt e boa e A RECEITA DE LAYOUT
AUTORADA. packages/content/src/layouts/hunts/venore-rotworm-cave.json tem 3087 LINHAS para um 24x24 de
2 andares: 22 copy-rect/copy-cell recortando o OTBM real, 420 celulas de borda, 2 transicoes e 20
spawns realocados.

A REGIAO JOGAVEL E UM RECORTE SEU. A caixa da Orc Fortress e 65x68x3 no XML, mas a rotworm tem caixa
29x33 e recorte 24x24. NAO TRANSCREVA A CAIXA: recorte o que faz uma hunt boa — corredores que
obriguem a decidir para onde ir, espaco para o Spearman ter linha de tiro, e andar que valha a
transicao. Trate isto como O TRABALHO PRINCIPAL, nao como papelada depois de escolher os bichos. Tres
especies certas com mapa ruim falham o degrau.

spawnPlacements carrega { source, target } e sustenta "nenhum spawn e inventado": todo slot tem que
ter origem real no XML.

SPRITES SEM BLOQUEIO: lookType 5, 50 e 6 foram conferidos ABRINDO outfits/<id>.png na PB-10-02, com
hash em HUNT_BANDS.md §3. B15 fechado para esta hunt. Se algum faltar e regressao do export — PARE E
REPORTE.

FORA DE ESCOPO: kernel (a 06 entregou ranged e caster); invocacao, onda, mitigacao elemental,
paralisia e armor (portoes posteriores); outras hunts; a tela (fechou na 05 e le o indice, a hunt nova
aparece sozinha).

RISCO CENTRAL: A HUNT FICA JOGAVEL E O DEGRAU NAO APARECE. Se o recorte puser Spearman e Shaman longe
do caminho ou em minoria esmagada por Orcs, o jogador atravessa sem tomar projetil nem ver barra de
vida inimiga subir, e a faixa 2 vira "a faixa 1 com mais bicho". A proporcao do XML (33 Spearman, 22
Shaman, 13 Orc) JA FAVORECE O DEGRAU — PRESERVE-A no recorte em vez de encher de Orc porque e mais
barato de posicionar.

SEGUNDO RISCO: regenerar golden porque ficou vermelho. Se hunt:check ou combat:check mudarem, a causa
e outra — esta task NAO TOCA EM KERNEL.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm verify
- corepack pnpm content:check e assets:check
- corepack pnpm hunt:check, combat:check e simulation:check verdes SEM golden regenerado
- corepack pnpm qa:browser (projeto correctness)
- prova de spawn: todo slot com origem real no XML via spawnPlacements
- corepack pnpm dev DE PE, com uma frase dizendo o que olhar

Ao terminar: atualize somente a linha PB-10-07 do STATE.md com o modelo e o effort EFETIVAMENTE
usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com git merge
--ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no relatorio:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
