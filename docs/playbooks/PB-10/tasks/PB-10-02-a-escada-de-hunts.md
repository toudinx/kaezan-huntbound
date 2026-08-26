# PB-10-02 — A escada de hunts

**Status inicial:** pending

**Classe da tarefa:** **especificação e curadoria** — nenhuma linha de código de produção; entrega um
documento congelado e uma emenda à ADR-05

**Modelo sugerido:** camada frontier — **GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6** —, effort `xhigh`.
Pela `docs/08_POLITICA_MODELOS_AGENTES.md`, especificação é frontier. O trabalho é ler o snapshot e
decidir, e uma escolha errada aqui custa quatro tasks de conteúdo depois.

**Validador sugerido:** modelo frontier **diferente** do implementador.

**Rota:** **sem skill externa.** Nada afirmado sem evidência do arquivo é regra do `AGENTS.md`.
Skills operacionais: `playbook-task`, `hunt-content-pipeline`.

**Paralelismo:** **pode rodar em paralelo com a PB-10-01.** Não toca em código, não toca em golden,
não toca em contrato. É a única task do playbook que pode.

**Spec:** `docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`.

## Objetivo

Entregar `docs/content/HUNT_BANDS.md`: a escada de hunts do Kaezan, do rotworm aos selos de
Ferumbras, com o **portão** de cada degrau escrito ao lado — e os **cinco primeiros degraus
congelados com evidência local**, prontos para virar task de conteúdo sem pesquisa adicional.

A partir da entrega, este documento é a fonte da escada e vence a tabela "As cinco faixas do MVP" do
`README.md`, que é a proposta e não o resultado.

## Por que esta task existe

Ela impede as duas descobertas caras, e as duas já têm nome:

1. **Faltar sprite na quarta hunt.** Uma espécie sem `lookType` disponível em
   `HUNTBOUND_PERSONAL_ASSET_SOURCE` bloqueia a hunt inteira por arte. É o bloqueio **B15**. Se
   aparecer no meio de uma task de conteúdo, custa o ciclo inteiro.
2. **Escrever uma hunt cujo comportamento o kernel não sabe executar.** Da faixa 6 em diante o portão
   quase nunca é arte: `resistances`, `immunities` e `attackElement` estão em `ActorBlueprint` e
   **não são lidos em nenhum arquivo** de `packages/simulation/src/kernel`; não existe paralisia; não
   existe criatura que invoca criatura; não existe boss com fase.

Nenhuma das duas é descoberta lendo o TibiaRoute. As duas são descobertas lendo o snapshot.

## A escada, como o usuário a pediu

Lista dada por ele em 2026-08-26, e ela vai **inteira** para o documento. Ordená-la e nomear o portão
de cada degrau é o trabalho; descartar item não é.

Rotworm Cave, Orc Fortress, Cyclopolis, Dragon Lair, Hero Cave, começo de Oramond, Asura Palace,
Medusa Tower, Deeper Banuta, Roshamuul, livrarias, War Zones 1, 2 e 3, Cobra Bastion, Falcon, selos
de Ferumbras.

A proposta de agrupamento está no `README.md`, seção "A escada completa". Você pode reordenar, e deve
justificar por escrito cada reordenação — mas **cada degrau precisa acrescentar um comportamento que
nenhum anterior tem**. É o princípio de design do PB-08 aplicado a hunt: "a anterior com números
maiores" não é degrau.

## Os cinco primeiros, congelados com evidência

Para as faixas 1 a 5 o documento não pode ser uma opinião. Cada linha carrega, como o
`KNIGHT_BANDS.md` carrega para magia:

| Campo | De onde sai |
|---|---|
| Espécies da hunt | `otservbr-monster.xml`, com **contagem real de spawn** na região |
| HP, exp, dano, alcance | o Lua do monstro em `references/canary/data-otservbr-global/monster/**` |
| Loot | a loot table do mesmo Lua |
| Região existe e cabe | o `.otbm`, dentro do budget de `MAP_REGION_CONTRACT.md` |
| `lookType` de cada espécie | **conferido no export pessoal**, não presumido |
| Nível recomendado | derivado dos números acima, não copiado do TibiaRoute |

Toda linha leva `sourceFile` e `sha256`, no molde do `KNIGHT_BANDS.md`. Número que você não leu de um
arquivo não entra.

**A proposta a verificar** — derrube qualquer uma por escrito se o snapshot discordar:

| Faixa | Nível | Hunt | O comportamento novo |
|---|---|---|---|
| 1 | 8 | Venore Rotworm Cave | já existe |
| 2 | ~25 | Orc Fortress | **ranged** e **caster** |
| 3 | ~45 | Cyclopolis | melee que não morre em dois golpes |
| 4 | ~70 | Dragon Lair | ataque de longe **com área**, e fogo |
| 5 | ~130 | Hero Cave | o teto do que o kit atual aguenta |

A faixa 2 é a que menos pode mudar: orc spearman liga o `attackRangeTiles` que existe em
`packages/simulation/src/kernel/kernel.ts:249` e que **nenhuma criatura usa**, e orc shaman força a IA
que conjura — hoje `buildHuntScenario.ts:284` dá `abilityIndices: []` a toda criatura. As duas
capacidades são a PB-10-06, e a faixa 2 é quem as consome.

## A emenda à ADR-05

Decisão vinculante 1 da `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`: toda mecânica do V0 existe no
Canary/Tibia ou está listada como extensão Huntbound.

"UI/UX para browser, touch e acessibilidade" já cobre a tela de seleção. **"Personagem resolvido pela
hunt escolhida"** não. Esta task acrescenta esse item à seção "Extensões Huntbound permitidas", em
uma linha, dizendo o que é e que é **temporário até o PB-09**.

É barato agora e caro depois: o PB-12 já está bloqueado por não ter feito isso na hora.

## Onde procurar, e o que não baixar

`references/canary` é clone parcial em `157e6f9e` e **não tem o mapa global**. Antes de concluir que
uma região não existe, procure em `C:\Kaezan\kaezan\canary-3.4.1\`,
`C:\Kaezan\kaezan - world\canary-3.4.1\` e `C:\Users\toudi\Downloads\otservbr.otbm`. **Nada precisa
ser baixado, e nada é raspado da web.**

3.4.1 e `157e6f9e` são versões diferentes: compare a região relevante antes de parear arquivos entre
elas, e registre a equivalência no documento.

Para o `lookType`: use o mesmo caminho que a PB-04 usou para a rotworm — `lookType 26` em
`packages/assets/catalog/selections/pb-04-venore-rotworm-cave.json` — e confira contra o export
apontado por `HUNTBOUND_PERSONAL_ASSET_SOURCE`. **Conferir é abrir; presumir não vale.**

## Condição de parada

Uma só: se **nenhuma** hunt de uma faixa passar no teste de sprite, a faixa não pode ser congelada.
Registre bloqueio no `STATE.md` com a lista do que falta, proponha a hunt alternativa mais próxima, e
**congele as outras faixas normalmente**. Uma faixa bloqueada não bloqueia as demais.

## Leitura mínima

1. esta task;
2. a spec do playbook e o `README.md` deste playbook;
3. `docs/content/KNIGHT_BANDS.md` — **o molde**: é assim que uma tabela congelada com proveniência se
   parece neste repositório;
4. `docs/content/MAP_REGION_CONTRACT.md` e `docs/content/IDENTITY_POLICY.md`;
5. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`, seção "Extensões Huntbound permitidas";
6. `packages/content/src/selections/hunts/venore-rotworm-cave.json` — a forma de uma selection;
7. `docs/research/tibia/01_hunts_progression.md` — R1, R4 e §10;
8. `.cursor/rules/20-content.mdc`.

## Passos

1. Levante a escada inteira e ordene-a, com o portão de cada degrau nomeado.
2. Para as faixas 1 a 5, leia os arquivos e preencha a tabela com `sourceFile` e `sha256`.
3. Confira `lookType` de cada espécie no export pessoal. Registre o resultado, inclusive as faltas.
4. Derive o nível recomendado dos números lidos e escreva a derivação.
5. Escreva `docs/content/HUNT_BANDS.md`.
6. Acrescente a linha à ADR-05.
7. Atualize a linha da task no `STATE.md` e o B15.

## Verificações exigidas

Esta task não muda código, então o gate é diferente — e continua sendo evidência, não formalidade:

- `biome check .` — o documento novo passa no lint de formatação;
- `corepack pnpm hunt:sources:check` — as fontes exigidas pelas selections existentes continuam
  existindo;
- **prova de leitura**: cada número da tabela das faixas 1 a 5 tem `sourceFile` e `sha256`;
- **prova de sprite**: a conferência de `lookType` está escrita, espécie por espécie;
- `corepack pnpm verify` no fechamento, porque a árvore tem que fechar verde de qualquer forma.

## Risco conhecido

**Congelar uma faixa com evidência de segunda mão.** O modo de falhar desta task é escrever um número
que veio da memória do Tibia em vez do arquivo — e ele só aparece três tasks depois, quando a hunt não
bate com o card. `KNIGHT_BANDS.md` resolveu isso exigindo `sha256` por linha; aqui é igual.

## Definition of Done

- [ ] `docs/content/HUNT_BANDS.md` existe, com a escada **inteira** e o portão de cada degrau.
- [ ] Faixas 1 a 5 congeladas, com espécies, números, região e nível recomendado.
- [ ] Toda linha das faixas 1 a 5 tem `sourceFile` e `sha256`.
- [ ] `lookType` conferido no export pessoal, espécie por espécie, com as faltas registradas.
- [ ] Cada degrau acrescenta um comportamento que nenhum anterior tem, justificado em uma linha.
- [ ] ADR-05 emendada com "personagem resolvido pela hunt escolhida", marcada como temporária.
- [ ] `STATE.md` atualizado na linha da task, e o B15 fechado ou reduzido ao que faltou.
- [ ] `verify` verde e branch integrada por `git merge --ff-only`.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-10\tasks\PB-10-02-a-escada-de-hunts.md

Leia AGENTS.md, .cursor/rules/20-content.mdc, docs/playbooks/PB-10/README.md, o STATE.md, a spec
docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md, docs/content/KNIGHT_BANDS.md
(que e O MOLDE de tabela congelada com proveniencia neste repositorio),
docs/content/MAP_REGION_CONTRACT.md, docs/content/IDENTITY_POLICY.md e a secao "Extensoes Huntbound
permitidas" de docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb10-02-escada com a branch
<agente>/pb10-02-escada-de-hunts e rode "corepack pnpm install --prefer-offline" dentro dela.

Esta task PODE rodar em paralelo com a PB-10-01: nao toca em codigo, golden nem contrato.

ENTREGUE docs/content/HUNT_BANDS.md: a escada de hunts do Kaezan, do rotworm aos selos de Ferumbras.

A lista do usuario, dada em 2026-08-26, vai INTEIRA para o documento — ordenar e nomear o portao de
cada degrau e o trabalho; descartar item nao e. Rotworm Cave, Orc Fortress, Cyclopolis, Dragon Lair,
Hero Cave, comeco de Oramond, Asura Palace, Medusa Tower, Deeper Banuta, Roshamuul, livrarias,
War Zones 1, 2 e 3, Cobra Bastion, Falcon, selos de Ferumbras.

CADA DEGRAU PRECISA ACRESCENTAR UM COMPORTAMENTO QUE NENHUM ANTERIOR TEM. "A anterior com numeros
maiores" nao e degrau. E o principio de design do PB-08 aplicado a hunt.

O PORTAO de cada degrau, da faixa 6 em diante, quase nunca e arte — e kernel que nao existe:
mitigacao elemental (resistances, immunities e attackElement estao em ActorBlueprint e NAO SAO LIDOS
em nenhum arquivo de packages/simulation/src/kernel — e PB-11); paralisia; criatura que invoca
criatura; boss com fase. Nomeie o portao ao lado de cada degrau.

AS FAIXAS 1 A 5 SAO CONGELADAS COM EVIDENCIA LOCAL, no molde do KNIGHT_BANDS.md: toda linha leva
sourceFile e sha256. Especies e contagem real de spawn saem de otservbr-monster.xml; HP, exp, dano e
alcance saem do Lua em references/canary/data-otservbr-global/monster/**; loot sai da mesma loot
table; a regiao tem que existir no .otbm e caber no budget de MAP_REGION_CONTRACT.md; e o nivel
recomendado e DERIVADO desses numeros, nunca copiado do TibiaRoute. NUMERO QUE VOCE NAO LEU DE UM
ARQUIVO NAO ENTRA.

A proposta a verificar, derrubavel por escrito se o snapshot discordar: faixa 1 nivel 8 Venore
Rotworm Cave (ja existe); faixa 2 nivel ~25 Orc Fortress (ranged e caster); faixa 3 nivel ~45
Cyclopolis (melee que nao morre em dois golpes); faixa 4 nivel ~70 Dragon Lair (ataque de longe COM
AREA, e fogo); faixa 5 nivel ~130 Hero Cave. A faixa 2 e a que menos pode mudar: orc spearman liga o
attackRangeTiles que existe em kernel.ts:249 e que NENHUMA criatura usa, e orc shaman forca a IA que
conjura, que hoje nao existe porque buildHuntScenario.ts:284 da abilityIndices: [] a toda criatura.

CONFIRA lookType DE CADA ESPECIE no export apontado por HUNTBOUND_PERSONAL_ASSET_SOURCE. Use o mesmo
caminho da PB-04 (lookType 26 da rotworm em
packages/assets/catalog/selections/pb-04-venore-rotworm-cave.json). CONFERIR E ABRIR; PRESUMIR NAO
VALE. Falta de sprite e o unico item que bloqueia uma hunt por arte, e e o bloqueio B15.

references/canary e clone parcial em 157e6f9e e NAO TEM O MAPA GLOBAL. Antes de concluir que uma
regiao nao existe, procure em C:\Kaezan\kaezan\canary-3.4.1\, "C:\Kaezan\kaezan - world\canary-3.4.1\"
e C:\Users\toudi\Downloads\otservbr.otbm. NADA PRECISA SER BAIXADO E NADA E RASPADO DA WEB. 3.4.1 e
157e6f9e sao versoes diferentes: compare a regiao antes de parear arquivos e registre a equivalencia.

EMENDE A ADR-05: acrescente "personagem resolvido pela hunt escolhida" a secao "Extensoes Huntbound
permitidas", em uma linha, marcado como TEMPORARIO ate o PB-09. "UI/UX para browser" ja cobre a tela
de selecao; isto nao. E barato agora e caro depois — o PB-12 ja esta bloqueado por nao ter feito isso
na hora.

CONDICAO DE PARADA, uma so: se NENHUMA hunt de uma faixa passar no teste de sprite, nao congele
aquela faixa. Registre bloqueio no STATE.md com a lista do que falta, proponha a alternativa mais
proxima, e CONGELE AS OUTRAS NORMALMENTE. Faixa bloqueada nao bloqueia as demais.

RISCO CENTRAL: congelar uma faixa com evidencia de segunda mao — um numero que veio da memoria do
Tibia em vez do arquivo. Ele so aparece tres tasks depois, quando a hunt nao bate com o card.

Verificacao exigida, com saida fresca colada no relatorio:
- biome check .
- corepack pnpm hunt:sources:check
- prova de leitura: cada numero das faixas 1 a 5 com sourceFile e sha256
- prova de sprite: conferencia de lookType escrita, especie por especie
- corepack pnpm verify no fechamento

Ao terminar: atualize somente a linha PB-10-02 do STATE.md com o modelo e o effort EFETIVAMENTE
usados, e feche ou reduza o B15. Commit com mensagem que explique o PORQUE. Integre voce mesmo na
main com git merge --ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole
no relatorio a saida de:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
