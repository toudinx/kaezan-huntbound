# Catálogo de hunts — spec do PB-10

**Data:** 2026-08-26
**Escopo:** reescrita inteira do PB-10, que deixa de ser "Novas criaturas" e passa a ser
"Catálogo de hunts".
**Origem:** pedido do usuário em 2026-08-26, com o *Hunting Places* do TibiaRoute como referência de
forma, e a lista de hunts desejadas dada por ele na mesma conversa.

## O problema, medido

O jogo tem **uma** hunt, e ela não é escolhida — ela é compilada.

- `apps/game/src/main.ts:9` importa
  `packages/content/src/generated/hunts/venore-rotworm-cave/hunt.json?raw` estaticamente. O boot entra
  nessa hunt e não existe outro caminho.
- `apps/game/src/main.ts:310` lê `runtime.characters[0]`. Não existe "qual personagem" — existe *o*
  personagem.
- `HuntDefinition` (`packages/contracts/src/hunt/types.ts:71`) tem região, transições, spawns,
  blueprints e ponto de início. **Não tem um único campo de apresentação**: nem nome, nem faixa, nem
  exp, nem loot. Um card de catálogo não teria de onde ler.
- `session.huntId` existe no save desde o PB-06 (`packages/contracts/src/save/types.ts:12`) e **nunca
  teve mais de um valor possível**.

## O que já é multi-hunt, e não deve ser reescrito

Verificado no workspace em 2026-08-26. Metade da máquina já nasceu genérica:

| Peça | Estado real |
|---|---|
| Extração de região | `hunt:extract` já roda `build-all --selections packages/content/src/selections/hunts` sobre o **diretório inteiro**. Basta a selection existir |
| Seleção de asset da hunt | **derivada da região** por `createHuntAssetSelection` (`tools/asset-packer/hunt/huntSelection.ts`). Não é escrita à mão |
| Save | `session.huntId` já é serializado e já sobrevive ao round-trip |
| Faixas de nível | `CharacterKitBandSchema` e `characterKitBandAtLevel` existem em `packages/contracts/src/content/schemas.ts:545` e `:704`, com bandas contíguas e última aberta validadas. Hoje só **uma** banda é declarada |
| Personagem por hunt | a chave já embute a hunt: `character:huntbound:knight-venore-rotworm-cave` |

## O que está preso em uma hunt só

| Onde | O que está fixo |
|---|---|
| `apps/game/src/main.ts:9` | import estático da rotworm |
| `apps/game/src/main.ts:310` | `runtime.characters[0]` |
| `tools/asset-packer/hunt/generateArtifacts.ts:17` | `regionPath` hardcoded na rotworm |
| `package.json` | família `assets:pb04:*` inteira nomeada por hunt |
| `package.json` | `hunt:extract:sidecar` e `hunt:selection:check` apontam um único path |
| `HuntDefinition` | sem metadado de apresentação |

## O custo real de uma hunt nova

Não é a extração. É o resto, e é isto que decide o tamanho do playbook:

1. **Recipe de layout à mão.** `packages/content/src/layouts/hunts/venore-rotworm-cave.json` tem
   24×24, 2 andares, 22 `copy-rect`, 420 células de borda, 20 spawns realocados — 3087 linhas.
2. **Espécies no catálogo.** A seleção PB-01 tem 9 roots. Espécie nova entra por importador.
3. **Sprites no export pessoal.** Cada espécie precisa de `lookType` disponível em
   `HUNTBOUND_PERSONAL_ASSET_SOURCE`. É o item que pode **bloquear uma hunt por falta de arte**.
4. **Goldens.** Conteúdo de hunt mexido invalida save e replay — é o bloqueio B9.

## Decisões congeladas

### 1. O índice de hunts é artefato gerado, e os números são derivados do snapshot

Novo `packages/content/src/generated/hunts/index.json`, com sidecar `.sha256` e `--check`, produzido
a partir das selections, do catálogo gerado e dos `spawns.json` de cada hunt. Por hunt: `huntId`,
`displayName`, `band`, `recommendedLevel`, criaturas com HP e exp, e **exp e loot derivados** de
(slots x exp) / respawn e da loot table do catálogo. Contrato novo em `@huntbound/contracts`.

**Nenhum número é copiado do TibiaRoute.** O `sourceUrl` da selection registra a curadoria — de onde
veio a *escolha* da hunt —, e nada mais. É o que o `AGENTS.md` exige: TibiaRoute não é raspado em
runtime; ele escolhe a hunt, e o Canary fornece IDs, regras e mapa. Um número derivado localmente
também é o único que descreve o **balanço do Kaezan** em vez do Tibia real.

### 2. A hunt resolve o personagem, até o PB-09 existir

Sem progressão, o jogador é fixo em level 35
(`packages/content/src/selections/pb-05-knight-combat.json`). Com cinco faixas, quatro delas seriam
triviais ou letais.

Então **escolher a hunt escolhe a faixa**: cada hunt declara seu personagem recomendado, resolvido
pelas bandas que `characterKitBandAtLevel` já implementa. A chave de personagem já embute a hunt, o
que torna isto curadoria de conteúdo, não mecânica nova.

Quando o PB-09 chegar, o nível passa a ser **conquistado** e essa resolução vira o piso da faixa, não
a fonte dela. Esta decisão é explicitamente temporária e está escrita para ser revogada.

### 3. Emenda de uma linha à ADR-05

"UI/UX para browser, touch e acessibilidade" já cobre a tela de seleção. **"Personagem resolvido pela
hunt escolhida"** não está coberto e vai listado em "Extensões Huntbound permitidas" antes da
primeira task que dependa dele. Custo baixo, e evita a task bloqueada que o PB-12 já herdou por não
ter feito isso na hora.

### 4. Um pack de asset por hunt

Mantém a forma atual, mantém `checkHuntPack` validando pack contra **uma** região, e deixa o boot
carregar só o pack da hunt escolhida. A tela de seleção é justamente o que torna isso possível: a
escolha acontece antes do preload.

### 5. A tela vive no boot, e o cockpit não é tocado

O cockpit fechou na PB-08-09. A tela de hunting places é uma fase de shell **antes** da hunt, em DOM
fora do canvas (ADR-03, "UI densa fora do canvas"). Entrar numa hunt sai da tela; sair da hunt volta
para ela. Não há troca de hunt no meio da run — isso depende do fim de run, que é PB-11.

### 6. A escada inteira é declarada; o playbook entrega os cinco primeiros degraus

A lista do usuário — dragon lair, hero cave, Asura Palace, Medusa Tower, Banuta, Roshamuul, começo de
Oramond, war zones 1 a 3, Cobra Bastion, Falcon, selos de Ferumbras, livrarias — vai **inteira** para
`docs/content/HUNT_BANDS.md` como escada ordenada. Ela é o backlog, e cada degrau vira **uma task**
depois que a máquina existir.

O MVP são os cinco primeiros, e incluem os dois que o usuário marcou como obrigatórios:

| Faixa | Nível | Hunt | Por que este degrau |
|---|---|---|---|
| 1 | 8 | Venore Rotworm Cave | já existe |
| 2 | ~25 | Orc Fortress | orc, orc spearman e orc shaman: melee, **ranged** e **caster** |
| 3 | ~45 | Cyclopolis | melee pesado; quebra o "tudo morre em dois golpes" |
| 4 | ~70 | Dragon Lair | primeira criatura que ataca **de longe com área** |
| 5 | ~130 | Hero Cave | alvo duro e caro; o teto do que o kit atual aguenta |

A faixa 2 é o argumento estrutural da reescrita: **as criaturas que o PB-10 antigo queria importar
são o conteúdo da segunda hunt.** Orc Spearman liga o `attackRangeTiles` que existe no kernel
(`packages/simulation/src/kernel/kernel.ts:249`) e que **nenhuma criatura usa**; Orc Shaman força a IA
que conjura, que hoje não existe — `buildHuntScenario.ts:284` dá `abilityIndices: []` a toda criatura.

### 7. A escada tem portão de capacidade, não só de arte

É isto que decide o que fica fora do MVP. Da faixa 6 em diante, cada degrau exige uma peça de kernel
que **não existe hoje**:

| Degrau | Hunts | O que falta no kernel |
|---|---|---|
| 6-7 | começo de Oramond, Asura Palace | mitigação elemental — `resistances`, `immunities` e `attackElement` estão em `ActorBlueprint` e **não são lidos em nenhum arquivo** de `packages/simulation/src/kernel`. É o **PB-11** |
| 8-9 | Medusa Tower, Deeper Banuta | condição que trava o jogador (paralisia) e onda de área com forma |
| 10-11 | Roshamuul, livrarias | criatura que **invoca** criatura |
| 12-14 | War Zones 1 a 3, Cobra Bastion, Falcon | boss com fase, e a economia de fim de run do PB-11 |
| 15 | selos de Ferumbras | tudo acima junto |

Escrever essas hunts antes das peças produz conteúdo que o jogo não sabe rodar. Elas entram na escada
com o portão nomeado ao lado: nenhuma some, e nenhuma é escrita cedo demais.

### 8. Dano elemental entra cheio; mitigação não

Herdado do PB-10 original e mantido: Dragon e Hero trazem fogo. O elemento é **registrado** e o dano
entra cheio; a mitigação liga no PB-11 junto do equipamento que resiste a ela. O Knight não tem
defesa elemental hoje, então resistência só deixaria a criatura mais dura de um jeito sem resposta.

## O que esta spec **não** decide

- **Progressão.** Continua sendo PB-09, e continua começando por design doc.
- **Fim de run e economia.** PB-11.
- **Level sync e modulação de faixa antiga.** PB-12, e continua exigindo emenda à ADR-05.
- **Qual layout cada hunt tem.** É trabalho da task de cada hunt, contra o `.otbm` real.

## Invariantes herdados, que valem em toda task

- **Nenhum spawn é inventado.** Toda criatura sai do catálogo e todo spawn tem origem real em
  `otservbr-monster.xml`, declarada em `spawnPlacements`.
- **Espécies não são escada.** O princípio de design do PB-08 vale para criatura: cada uma entra
  porque se comporta de um jeito visível e distinto. "Rotworm com mais HP" não entra.
- **Artefato gerado não se edita à mão**, e **golden não se reescreve para passar**.
- `tibia/01` R4, currículo de inimigos: **pack, depois ranged, depois caster**. A ordem das faixas o
  respeita.
