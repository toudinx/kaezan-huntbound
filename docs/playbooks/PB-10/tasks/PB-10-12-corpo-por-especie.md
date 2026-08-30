# PB-10-12 — O corpo é da espécie que morreu

**Status inicial:** pending

**Classe da tarefa:** **implementação bem especificada** — a causa já está localizada e o dado já
existe no snapshot. Atravessa importador, contrato, tools e `apps/game`, mas é uma mudança coesa.

**Modelo sugerido:** camada econômica com effort `xhigh`.

**Validador sugerido:** modelo diferente do implementador.

**Rota:** **sem skill externa.** Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`,
`hunt-content-pipeline`.

**Paralelismo:** **roda depois da PB-10-11.** Ela quer uma `main` verde para se provar contra.

**É a task de fechamento do PB-10.** É ela que roda o `verify` completo, conforme a revisão de
processo de 2026-08-30 em `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`.

## Objetivo

Reportado pelo usuário jogando, em 2026-08-30: **mata orc, cyclops, dragon ou hero, e o corpo no chão
é um rotworm morto.**

Ao fim desta task, o corpo é o da espécie que morreu, nas cinco hunts.

## A causa está achada — não reinvestigue

Não é asset errado nem pack quebrado. É **um corpo só, fixo no código, para toda criatura que morre**:

`apps/game/src/hunt/CombatDecorations.ts:155`

```ts
case 'actor/died': {
  add('corpse', createdAtMs, CORPSE_TTL_MS, {
    key: createAssetKey(HUNT_PACK_DEAD_ROTWORM_KEY),
    position,
  });
```

E a cadeia inteira é fixa junto:

| Arquivo | O que está fixo |
|---|---|
| `packages/assets/src/hunt/HuntPack.ts:16` | `HUNT_PACK_DEAD_ROTWORM_KEY = 'item:tibia:dead-rotworm'` |
| `packages/assets/src/hunt/HuntPack.ts` | esse mesmo key está em `HUNT_PACK_COMBAT_KEYS` — **todo pack de hunt carrega o corpo de rotworm, e só ele** |
| `tools/asset-packer/hunt/huntSelection.ts:253` | ramo `if (key === HUNT_PACK_DEAD_ROTWORM_KEY)` resolvendo `clientId: 5967` |

Orc, Cyclops, Dragon e Hero viram rotworm porque **nunca existiu outro corpo dentro do pack**.

## O dado existe no snapshot e é descartado de propósito

Mesmo padrão do `attack`/`armor` de item que o PB-11 vai desfazer. `monster.corpse` está em toda Lua
de monstro, o parser reconhece o campo em `allowedMonsterFields`… **e o lista também em
`ignoredMonsterFields`** — `packages/content/src/importers/canary/lua/parseMonsterLua.ts:73`. Nunca
chega ao catálogo.

## Congelado: os sete corpos

Lidos das Luas do snapshot em 2026-08-30. `sourceFile` é relativo à raiz do snapshot Canary:

| Espécie | `monster.corpse` | `sourceFile` |
|---|---:|---|
| Rotworm | 5967 | `data-otservbr-global/monster/vermins/rotworm.lua` |
| Orc | 5966 | `data-otservbr-global/monster/humanoids/orc.lua` |
| Orc Spearman | 5996 | `data-otservbr-global/monster/humanoids/orc_spearman.lua` |
| Orc Shaman | 5978 | `data-otservbr-global/monster/humanoids/orc_shaman.lua` |
| Cyclops | 5962 | `data-otservbr-global/monster/giants/cyclops.lua` |
| Dragon | 5973 | `data-otservbr-global/monster/dragons/dragon.lua` |
| Hero | 18134 | `data-otservbr-global/monster/humans/hero.lua` |

**Não transcreva esta tabela para o código.** Ela está aqui para você conferir o resultado do
importador. O número tem de chegar ao catálogo **pelo parser**, lendo a Lua — hardcodear sete ids
seria trocar um valor fixo por sete.

## Sprites: sem bloqueio, conferido

Os sete `objects/<clientId>.png` **existem** no export pessoal apontado por
`HUNTBOUND_PERSONAL_ASSET_SOURCE`, verificado em 2026-08-30. Nenhum precisa ser re-exportado, e isto
**não** esbarra no B18 — B18 é cisalhamento de **outfit 32×32**, e corpo é objeto.

Se algum faltar quando você rodar, é regressão do export: **pare e reporte**, não fabrique.

## As camadas, e onde cada uma para

1. **`parseMonsterLua.ts`** — `corpse` sai de `ignoredMonsterFields` e passa a ser emitido.
2. **`@huntbound/contracts`** — campo **aditivo e opcional** na criatura, com default que reproduz o
   comportamento anterior. Nada de bump de `SIMULATION_SCHEMA_VERSION`: isto não é estado de
   simulação, é metadado de conteúdo.
3. **Catálogo regenerado** por `content:generate`. **Diff esperado e grande** — é artefato gerado, e
   regenerar pelo tool é o caminho certo. Não edite à mão.
4. **`tools/asset-packer/hunt/huntSelection.ts`** — o corpo deixa de ser um `if` com `clientId` fixo e
   passa a ser resolvido por hunt, como criatura e loot já são.
5. **`packages/assets/src/hunt/HuntPack.ts`** — `HUNT_PACK_DEAD_ROTWORM_KEY` **sai de
   `HUNT_PACK_COMBAT_KEYS`**. Corpo passa a ser chave dinâmica por hunt, não chave de combate global.
6. **`tools/asset-packer/hunt/huntRegistry.ts`** — cada entrada declara o corpo de cada espécie dela.
7. **`apps/game/src/hunt/CombatDecorations.ts`** — o `actor/died` resolve o corpo pelo `blueprintId`
   de quem morreu.

### A forma sugerida: o corpo anda com a criatura

`HuntPackAssetConfig` já tem `creature` e `extraCreatures` — a Orc Fortress tem três espécies e usa os
dois. O corpo pertence à criatura que o deixa:

```ts
export type HuntPackCreatureAsset = {
  readonly key: string;
  readonly lookType: number;
  readonly corpse: { readonly key: string; readonly clientId: number };
};
```

Assim uma hunt com três espécies ganha três corpos sem nenhum caso especial, e o `huntPackExtraKeys`
os inclui pelo mesmo caminho que já inclui `creature.key`.

No jogo, o `CombatViewModel` já monta `targetDetailsByBlueprint` com `assetKey: creature.stableKey`
por blueprint (`apps/game/src/hunt/CombatViewModel.ts:1052`). **Esse é o caminho a reusar** para levar
o corpo até o `CombatDecorations` — não invente um segundo mecanismo de resolução por espécie.

### Espécie sem corpo declarado: nada no chão, e um diagnóstico

Decisão desta task, escolhida por ser a mais simples e a mais fácil de reverter: se o blueprint que
morreu não resolver um corpo, **não desenhe corpo nenhum** e registre no
`createUnresolvedHuntAssetTracker`, que existe exatamente para isto
(`apps/game/src/hunt/UnresolvedHuntAssets.ts`).

**Nunca caia no corpo de outra espécie.** Corpo ausente é um buraco visível que alguém conserta;
corpo errado é este bug de novo, e ele sobreviveu quatro hunts sem ninguém notar no código.

## O sangue tem o mesmo vício — e fica de fora

`race` também está em `ignoredMonsterFields`, e o `actor/died` sempre solta `draw-blood`, seja o que
for que morreu. **Não conserte aqui.** A encanação que esta task constrói torna isso um seguimento de
poucas linhas; vira task própria se o usuário quiser.

## Fora de escopo

- **Sangue por `race`.** Acima.
- **Corpo que persiste, corpo saqueável, corpo que bloqueia passagem.** `CORPSE_TTL_MS` é 900 ms e
  `blocksMovement` é `false`; os dois continuam como estão.
- **`attack`, `armor`, `slot`, `weaponType` de item.** É o PB-11.
- **Qualquer coisa de kernel.** Corpo é decoração de apresentação e não existe na simulação.
- **B19** — é a PB-10-11, e esta task depende dela estar fechada.

## Leitura mínima

1. esta task;
2. `apps/game/src/hunt/CombatDecorations.ts` e `UnresolvedHuntAssets.ts`;
3. `apps/game/src/hunt/CombatViewModel.ts`, em volta da linha 1052;
4. `packages/assets/src/hunt/HuntPack.ts`;
5. `tools/asset-packer/hunt/huntSelection.ts` e `huntRegistry.ts`;
6. `packages/content/src/importers/canary/lua/parseMonsterLua.ts`;
7. `docs/content/CANARY_LUA_MAPPING.md`;
8. `.cursor/rules/20-content.mdc` e `.cursor/rules/30-assets.mdc`.

## Passos

1. Faça o parser parar de descartar `corpse` e prove com teste de importador.
2. Acrescente o campo aditivo ao contrato e regenere o catálogo pelo tool.
3. Leve o corpo para o `HuntPackCreatureAsset` e para as seis entradas do `huntRegistry.ts`.
4. Tire `HUNT_PACK_DEAD_ROTWORM_KEY` de `HUNT_PACK_COMBAT_KEYS` e o ramo fixo do `huntSelection.ts`.
5. Regenere os packs e confira o **orçamento**: cada pack ganha entrada, e `budget.maxEntries` /
   `maxBytes` são conferidos por `assets:check`. Se estourar, ajuste o orçamento da hunt e diga no
   commit.
6. Resolva o corpo por `blueprintId` no `CombatDecorations`.
7. `corepack pnpm build`, abra o jogo e **mate uma criatura de cada hunt**.
8. Atualize a linha PB-10-12 do `STATE.md`.

## Verificações exigidas

Com saída fresca colada no relatório. **Esta é a task de fechamento do PB-10:**

- `corepack pnpm verify` — verde, completo;
- `corepack pnpm content:check` e `assets:check`;
- `corepack pnpm hunt:check`, `combat:check` e `simulation:check` — verdes **sem golden regenerado**;
- `corepack pnpm qa:budgets` — informativo, número registrado no `STATE.md`, vermelho vira task de
  performance e **nunca bloqueio**;
- **`corepack pnpm dev` de pé**, com uma frase dizendo o que olhar em cada hunt.

## Risco conhecido

**Hardcodear sete ids** em vez de fazer o importador ler o campo. Troca um valor fixo por sete, e a
sexta hunt volta a errar.

**Regenerar golden porque o catálogo mudou.** O catálogo é artefato gerado e vai diferir; **golden de
replay não pode diferir**, porque corpo não existe na simulação. Se um golden divergir, você mexeu em
algo que não devia — pare e reporte.

**Editar o catálogo gerado à mão** para acrescentar `corpseItemId`. Regra inviolável do `AGENTS.md`.

**Cair no corpo de rotworm quando a espécie não resolver.** É o bug. Prefira nenhum corpo.

## Definition of Done

- [ ] `corpse` sai de `ignoredMonsterFields` e chega ao catálogo pelo importador, com teste.
- [ ] Campo aditivo no contrato, com default que reproduz o comportamento anterior.
- [ ] Catálogo regenerado pelo tool; nenhum artefato gerado editado à mão.
- [ ] Corpo declarado por espécie no `huntRegistry.ts`, nas seis entradas.
- [ ] `HUNT_PACK_DEAD_ROTWORM_KEY` fora de `HUNT_PACK_COMBAT_KEYS`; ramo fixo do `clientId` 5967
      removido.
- [ ] `CombatDecorations` resolve o corpo pelo `blueprintId` de quem morreu, reusando o caminho do
      `targetDetailsByBlueprint`.
- [ ] Espécie sem corpo → nenhum corpo + diagnóstico; nunca o corpo de outra espécie.
- [ ] Orçamento de pack conferido depois da entrada nova.
- [ ] Nenhum golden regenerado.
- [ ] **Jogado**: uma morte em cada uma das cinco hunts, com o corpo certo no chão.
- [ ] `verify` completo verde; `qa:budgets` rodado e registrado.
- [ ] Integrada por `git merge --ff-only`, worktree e branch removidas.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com um modelo economico em effort xhigh.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-10\tasks\PB-10-12-corpo-por-especie.md

Leia AGENTS.md, .cursor/rules/20-content.mdc, .cursor/rules/30-assets.mdc, .cursor/rules/40-game.mdc,
docs/playbooks/PB-10/README.md e o STATE.md.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb10-12-corpo-por-especie com a branch
<agente>/pb10-12-corpo-por-especie e rode "corepack pnpm install --prefer-offline" dentro dela.

REPORTADO PELO USUARIO JOGANDO em 2026-08-30: mata orc, cyclops, dragon ou hero, e O CORPO NO CHAO E
UM ROTWORM MORTO.

A CAUSA JA ESTA ACHADA, NAO REINVESTIGUE. Nao e asset errado: e UM CORPO SO, FIXO NO CODIGO, PARA TODA
CRIATURA QUE MORRE.
- apps/game/src/hunt/CombatDecorations.ts:155 — o case 'actor/died' usa sempre
  createAssetKey(HUNT_PACK_DEAD_ROTWORM_KEY)
- packages/assets/src/hunt/HuntPack.ts:16 — HUNT_PACK_DEAD_ROTWORM_KEY = 'item:tibia:dead-rotworm'
- esse key esta em HUNT_PACK_COMBAT_KEYS: TODO PACK DE HUNT CARREGA O CORPO DE ROTWORM E SO ELE
- tools/asset-packer/hunt/huntSelection.ts:253 — ramo if (key === HUNT_PACK_DEAD_ROTWORM_KEY) com
  clientId 5967 fixo

O DADO EXISTE E E DESCARTADO DE PROPOSITO: monster.corpse esta em toda Lua de monstro; o parser
reconhece 'corpse' em allowedMonsterFields E TAMBEM O LISTA EM ignoredMonsterFields
(packages/content/src/importers/canary/lua/parseMonsterLua.ts:73). Nunca chega ao catalogo.

CONGELADO, lido das Luas em 2026-08-30 (rotworm 5967, orc 5966, orc_spearman 5996, orc_shaman 5978,
cyclops 5962, dragon 5973, hero 18134). NAO TRANSCREVA ESSES IDS PARA O CODIGO — eles estao aqui para
voce CONFERIR a saida do importador. O numero tem de chegar ao catalogo PELO PARSER, lendo a Lua;
hardcodear sete ids e trocar um valor fixo por sete.

SPRITES SEM BLOQUEIO, CONFERIDO: os sete objects/<clientId>.png EXISTEM no export pessoal apontado por
HUNTBOUND_PERSONAL_ASSET_SOURCE, verificado em 2026-08-30. Isto NAO esbarra no B18 (B18 e cisalhamento
de OUTFIT 32x32; corpo e objeto). Se algum faltar, e regressao do export: PARE E REPORTE.

AS CAMADAS:
1. parseMonsterLua.ts — 'corpse' sai de ignoredMonsterFields e passa a ser emitido
2. @huntbound/contracts — campo ADITIVO E OPCIONAL na criatura, com default que reproduz o
   comportamento anterior. NADA de bump de SIMULATION_SCHEMA_VERSION: isto e metadado de conteudo,
   nao estado de simulacao
3. catalogo regenerado por content:generate — DIFF ESPERADO E GRANDE, e artefato gerado; NAO EDITE A
   MAO
4. huntSelection.ts — o corpo deixa de ser if com clientId fixo e passa a ser resolvido por hunt,
   como criatura e loot ja sao
5. HuntPack.ts — HUNT_PACK_DEAD_ROTWORM_KEY SAI DE HUNT_PACK_COMBAT_KEYS; corpo vira chave dinamica
   por hunt
6. huntRegistry.ts — cada entrada declara o corpo de cada especie dela
7. CombatDecorations.ts — o actor/died resolve o corpo pelo blueprintId de quem morreu

FORMA SUGERIDA — O CORPO ANDA COM A CRIATURA: HuntPackAssetConfig ja tem creature e extraCreatures (a
Orc Fortress tem tres especies e usa os dois). Acrescente corpse a HuntPackCreatureAsset:
  { key: string; lookType: number; corpse: { key: string; clientId: number } }
Assim tres especies ganham tres corpos sem caso especial, e huntPackExtraKeys os inclui pelo mesmo
caminho de creature.key. No jogo, CombatViewModel ja monta targetDetailsByBlueprint com
assetKey: creature.stableKey por blueprint (apps/game/src/hunt/CombatViewModel.ts:1052) — REUSE ESSE
CAMINHO, nao invente um segundo mecanismo de resolucao por especie.

ESPECIE SEM CORPO DECLARADO: NAO DESENHE CORPO NENHUM e registre no createUnresolvedHuntAssetTracker
(apps/game/src/hunt/UnresolvedHuntAssets.ts), que existe para isto. NUNCA CAIA NO CORPO DE OUTRA
ESPECIE — corpo ausente e um buraco visivel que alguem conserta; corpo errado e este bug de novo, e
ele sobreviveu quatro hunts sem ninguem notar.

O SANGUE TEM O MESMO VICIO E FICA DE FORA: race tambem esta em ignoredMonsterFields e o actor/died
sempre solta draw-blood. NAO CONSERTE AQUI.

FORA DE ESCOPO: sangue por race; corpo persistente, saqueavel ou que bloqueia passagem (CORPSE_TTL_MS
900 ms e blocksMovement false ficam como estao); attack/armor/slot/weaponType de item (e o PB-11);
qualquer coisa de kernel (corpo e decoracao e nao existe na simulacao); B19 (e a PB-10-11, e esta task
depende dela fechada).

RISCOS: hardcodear os sete ids em vez de fazer o importador ler o campo; regenerar golden porque o
catalogo mudou (o catalogo VAI diferir, GOLDEN DE REPLAY NAO PODE — se divergir, voce mexeu em algo
que nao devia: PARE E REPORTE); editar o catalogo gerado a mao; cair no corpo de rotworm quando a
especie nao resolver.

ESTA E A TASK DE FECHAMENTO DO PB-10 — e ela que roda o verify completo, conforme a revisao de
processo de 2026-08-30 em docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm verify VERDE E COMPLETO
- corepack pnpm content:check e assets:check
- corepack pnpm hunt:check, combat:check e simulation:check verdes SEM golden regenerado
- orcamento de pack conferido depois da entrada nova (budget.maxEntries / maxBytes); se estourar,
  ajuste o orcamento da hunt e diga no commit
- corepack pnpm qa:budgets, numero registrado no STATE.md, informativo, vermelho NUNCA e bloqueio
- corepack pnpm dev DE PE, e MATE UMA CRIATURA DE CADA UMA DAS CINCO HUNTS conferindo o corpo

Ao terminar: atualize somente a linha PB-10-12 do STATE.md com o modelo e o effort EFETIVAMENTE
usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com git merge
--ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no relatorio:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
