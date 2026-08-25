# PB-08-09 — A rail de janelas

**Status inicial:** pending

**Classe da tarefa:** apresentação em `apps/game` **e pipeline de asset**; sem kernel, sem contrato
novo

**Modelo sugerido:** **GPT-5.6 Luna**, effort `xhigh`. Três painéis bem especificados sobre dado que
já existe, mais uma extensão de lista de ids no extractor.

**Validador sugerido:** **o usuário jogando**, com screenshot do perfil `personal`. Veja "A armadilha
que faz esta task mentir".

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`, `hunt-content-pipeline`.

**Paralelismo:** depende de **PB-08-08 integrada** — a rail é uma das regiões que o chassi cria.

**Spec:** `docs/superpowers/specs/2026-08-25-pb-08-cockpit-hud-design.md`.

## Objetivo

Encher a coluna direita com três janelas que leem **dado que já existe hoje**: mapa quadrado, alvo, e
a bag da hunt.

## Por que as três, e nenhuma outra

Equipamento saiu do PB-08 na reescrita de 2026-08-25 e foi para o **PB-11**, onde existe stat de item
para mostrar. O efeito: **nenhum painel desta rail é placeholder.** Mapa vem da região, alvo vem do
estado do ator, bag vem do run bag. Se algum painel aqui precisar de dado que não existe, ele saiu do
escopo.

## Painel 1 — mapa quadrado

`MapRegion` (`packages/contracts/src/hunt/types.ts:30`) carrega `width`, `height`, `origin` e, por
andar, `collision` e `ground`. Jogador e criaturas vêm da presentation. Sem asset, sem kernel, sem
contrato.

**Duas camadas, e isto não é otimização prematura:** o terreno vai para um `<canvas>` *offscreen*
redesenhado **só** quando região ou andar mudam; os atores vão para uma camada barata por frame. Um
minimapa que redesenha terreno a 60 Hz é regressão de verdade, e `qa:budgets` é informativo demais
para pegá-la.

O andar corrente aparece no cabeçalho. A hunt tem transição de andar (`hunt-play.spec.ts:536`), então
trocar de andar **tem** que trocar o desenho.

## Painel 2 — alvo, real no que existe e honesto no que falta

| Linha | Fonte | Estado |
|---|---|---|
| imagem do mob | chave de asset do blueprint | existe |
| nome | blueprint | existe |
| vida atual / máxima | estado do ator | existe |
| resistência e fraqueza por elemento | `ElementResistance[]` | **contrato existe, dado vazio** |

`packages/contracts/src/simulation/types.ts:44` declara `resistances` e o schema
(`schemas.ts:153`) já valida ordenação e repetição. Mas o rotworm sai com `"resistances":[]` no
cenário.

**A janela nasce mostrando `—` nas linhas de elemento.** Ela não inventa dado, não esconde a lacuna, e
não é removida "até ter dado" — o layout precisa existir para o PB-11 só preencher. Um teste prova
que resistência ausente renderiza `—` e não `0`, que significaria "sem resistência" e seria mentira.

## Painel 3 — a bag da hunt

Grade de slots com contagem, alimentada por `state.bag` do `CombatViewModel`. Substitui o texto
corrido de `CombatHud.ts:253`.

### O que falta de asset, e o que **não** falta

O pack da hunt carrega **dois** itens: `item:tibia:dead-rotworm` e `item:tibia:small-splash`. As oito
chaves de loot em `CombatViewModel.ts:546-553` — `gold-coin`, `ham`, `legion-helmet`,
`lump-of-dirt`, `mace`, `meat`, `sword`, `worm` — **não têm sprite no pack da hunt**. Só `gold-coin`
existe, e no pack `pb-02-contract-coverage`.

**Isto não exige contrato novo.** Item de loot é categoria `object`, que já está em
`AssetCategorySchema`. O caminho é upstream do packer:

1. os ids entram em `objectIds` no `content-config.json` do `AssetExtractor`
   (`C:\Kaezan\kaezan-arena-fable\tools\AssetExtractor`);
2. o export é regerado para `HUNTBOUND_PERSONAL_ASSET_SOURCE`;
3. `corepack pnpm assets:pb04:personal:generate` resolve;
4. `corepack pnpm assets:pb04:personal:check` prova.

`HUNTBOUND_PERSONAL_ASSET_SOURCE` **não está setada em escopo nenhum desta máquina.** Defina por
sessão de shell; não hardcode path em arquivo versionado — path pessoal absoluto é banido de arquivo
rastreado.

### A armadilha que faz esta task mentir

**O perfil `test` fabrica um placeholder 1×1 para qualquer id pedido.** Uma bag pode fechar com
`verify` verde, `qa:browser` verde e **nenhuma arte no jogo do usuário**.

Por isso: **a prova de aceite da bag é screenshot do perfil `personal`**, não gate verde. Gate verde
aqui prova que o pipeline não quebrou, não que a arte chegou.

### Degradação obrigatória

Ícone quando o sprite resolve; **rótulo textual quando não**. A grade entrega valor mesmo se o export
não for regerado, e um teste cobre o caminho sem sprite. Sem isso a task fica refém de uma máquina
externa.

## Fora do escopo desta task — e por quê

**O atlas de ícones de magia não entra aqui.** A spec o listava nesta task; a inspeção do workspace em
2026-08-25 mostrou que ele é maior do que a spec supunha.

`packages/assets/src/manifest/schemas.ts:77` fecha `AssetCategory` em cinco valores — `outfit`,
`creature`, `object`, `effect`, `missile`. Ícone de magia exige uma **sexta categoria**, um tipo de
identidade `spellId`, suporte no packer e uma lista nova no `content-config.json`. Isso é mudança de
**schema público já integrado**, que o `AGENTS.md` manda parar e reportar em vez de decidir dentro de
uma task.

A arte existe e está mapeada, para quando a decisão vier:
`C:\Kaezan\kaezan\otclient-4.0\data\images\game\spells\spell-icons-32x32.png`, indexada pelo
`spell:id(N)` que o Canary declara — `berserk.lua` diz `spell:id(80)`.

Enquanto isso, **o glifo de área de efeito da PB-08-08 é o ícone**, não um remendo: ele cumpre
sozinho "identificável sem ler o rótulo" e ainda diz onde a magia acerta.

## Decisões congeladas desta task

- **Regra de jogo não entra em componente de UI.** Os três painéis projetam; não decidem.
- **Nenhum painel com dado inexistente.** Se precisar de dado que não existe, saiu do escopo.
- **Resistência ausente renderiza `—`, nunca `0`.**
- **Terreno do mapa não redesenha por frame.**
- **Ícone degrada para texto.**
- **Acessibilidade não regride.** `aria-label` nas três janelas, `role="progressbar"` na vida do alvo,
  `data-testid` em tudo.

## Ambiguidade conhecida — e a saída

**Quantos slots a bag mostra antes de rolar.** A run pode juntar mais itens do que cabe.

**Saída:** grade de tamanho fixo com rolagem interna, tamanho escolhido pelo que cabe no viewport
mobile sem empurrar os outros painéis. Registre o número no commit. **Não construa ordenação nem
filtro** — é helper, e helper é PB-15.

## Passos

1. **Teste primeiro.** Quatro vermelhos:
   1. o mapa desenha o andar corrente e **repinta ao trocar de andar**;
   2. o mapa **não** repinta o terreno quando só um ator se move;
   3. a janela de alvo renderiza `—` para elemento sem dado, e nunca `0`;
   4. a bag renderiza rótulo textual quando o sprite não resolve.
2. `Minimap.ts`, `TargetWindow.ts` e `HuntBag.ts` sob `apps/game/src/ui/cockpit/`; `CombatHud.ts`
   passa a delegar alvo e loot.
3. Acrescente os oito ids de loot em `objectIds`, regenere o export, rode
   `assets:pb04:personal:generate` e `assets:pb04:personal:check`.
4. Rode os gates nos quatro viewports.

## Verificações exigidas

Evidência fresca, colada no relatório:

- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm architecture:check`
- `corepack pnpm assets:check`
- `corepack pnpm assets:pb04:personal:check` — **e diga se rodou com a variável setada.**
- `corepack pnpm build` **antes** de qualquer verificação no browser. Armadilha 1 do `AGENTS.md`.
- `corepack pnpm qa:browser` — nos quatro viewports.
- `corepack pnpm combat:check`, `hunt:check` e `simulation:check` — **inalterados**.
- `corepack pnpm verify` no fechamento.
- **Screenshot do perfil `personal`** com loot na bag. É a única prova que vale para o painel 3.

## Definition of Done

- [ ] Mapa quadrado desenha o andar corrente e repinta na transição.
- [ ] Terreno do mapa não repinta quando só um ator se move, provado por teste.
- [ ] Janela de alvo com imagem, nome e vida reais, e `—` no que não existe.
- [ ] Bag em grade, com contagem, e rótulo textual quando o sprite não resolve.
- [ ] Oito ids de loot no `objectIds`; `assets:pb04:personal:check` verde.
- [ ] Nenhum painel da rail é placeholder.
- [ ] `combat:check`, `hunt:check` e `simulation:check` inalterados.
- [ ] `verify` verde.
- [ ] Screenshot do perfil `personal` anexada.
- [ ] `STATE.md` só na linha da task.
- [ ] Branch integrada por `git merge --ff-only` e worktree removida.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-08\tasks\PB-08-09-a-rail-de-janelas.md

Leia antes: AGENTS.md, .cursor/rules/{20-content,30-assets,40-game}.mdc, o STATE.md do PB-08 e
docs/superpowers/specs/2026-08-25-pb-08-cockpit-hud-design.md.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb08-09-window-rail com a branch
<agente>/pb08-09-window-rail e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Encha a coluna direita que a PB-08-08 criou com TRES janelas que leem dado QUE JA
EXISTE: mapa quadrado, alvo, bag da hunt. NENHUM PAINEL AQUI E PLACEHOLDER. Equipamento saiu do PB-08
e foi para o PB-11.

PAINEL 1 - MAPA. MapRegion (packages/contracts/src/hunt/types.ts:30) tem width, height, origin e por
andar collision e ground. DUAS CAMADAS: terreno num canvas OFFSCREEN redesenhado SO quando regiao ou
andar mudam; atores numa camada barata por frame. Minimapa que redesenha terreno a 60 Hz e regressao
de verdade e qa:budgets nao vai pegar. A hunt tem transicao de andar: trocar de andar TEM que trocar
o desenho.

PAINEL 2 - ALVO. Imagem, nome e vida saem do estado do ator. Resistencia NAO: o contrato tem
ElementResistance[] em packages/contracts/src/simulation/types.ts:44 e o schema valida ordenacao, mas
o rotworm sai com "resistances":[]. A janela NASCE mostrando "—" nas linhas de elemento. NUNCA "0" —
zero significa "sem resistencia" e seria mentira. Teste cobre isso. NAO remova a linha "ate ter
dado": o layout precisa existir para o PB-11 so preencher.

PAINEL 3 - BAG. Grade de slots com contagem, alimentada por state.bag. Substitui o texto corrido de
CombatHud.ts:253.
O pack da hunt tem DOIS itens: item:tibia:dead-rotworm e item:tibia:small-splash. As oito chaves de
loot em CombatViewModel.ts:546-553 (gold-coin, ham, legion-helmet, lump-of-dirt, mace, meat, sword,
worm) NAO TEM SPRITE no pack. ISSO NAO EXIGE CONTRATO NOVO: item de loot e categoria "object", que ja
esta em AssetCategorySchema. Caminho:
 1. ids entram em objectIds no content-config.json do AssetExtractor
    (C:\Kaezan\kaezan-arena-fable\tools\AssetExtractor);
 2. regere o export para HUNTBOUND_PERSONAL_ASSET_SOURCE;
 3. corepack pnpm assets:pb04:personal:generate
 4. corepack pnpm assets:pb04:personal:check
HUNTBOUND_PERSONAL_ASSET_SOURCE NAO ESTA SETADA nesta maquina. Defina por sessao de shell. NAO
hardcode path pessoal em arquivo versionado.

A ARMADILHA QUE FAZ ESTA TASK MENTIR: o perfil "test" FABRICA UM PLACEHOLDER 1x1 PARA QUALQUER ID
PEDIDO. A bag pode fechar com verify verde, qa:browser verde e NENHUMA ARTE no jogo do usuario. Por
isso a prova de aceite da bag e SCREENSHOT DO PERFIL PERSONAL, nao gate verde.
DEGRADACAO OBRIGATORIA: icone quando o sprite resolve, ROTULO TEXTUAL quando nao, com teste cobrindo
o caminho sem sprite.

FORA DE ESCOPO: o atlas de icones de magia. packages/assets/src/manifest/schemas.ts:77 fecha
AssetCategory em cinco valores; icone de magia exige uma SEXTA categoria, identidade spellId e
suporte no packer — mudanca de SCHEMA PUBLICO JA INTEGRADO, que o AGENTS.md manda parar e reportar.
Ate la o glifo de area de efeito da PB-08-08 E o icone, e nao um remendo.

AMBIGUIDADE: quantos slots a bag mostra antes de rolar. Grade fixa com rolagem interna, dimensionada
pelo que cabe no mobile sem empurrar os outros paineis. Registre o numero no commit. NAO construa
ordenacao nem filtro: e helper, e helper e PB-15.

ARMADILHA 1 DO AGENTS.md: rode "corepack pnpm build" antes de qualquer verificacao no browser.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm typecheck
- corepack pnpm test
- corepack pnpm architecture:check
- corepack pnpm assets:check
- corepack pnpm assets:pb04:personal:check  (diga se rodou com a variavel setada)
- corepack pnpm build
- corepack pnpm qa:browser   nos QUATRO viewports
- corepack pnpm combat:check, hunt:check e simulation:check -> INALTERADOS
- corepack pnpm verify no fechamento
- SCREENSHOT DO PERFIL PERSONAL com loot na bag.

Ao terminar: atualize somente a linha PB-08-09 do STATE.md com o modelo e o effort EFETIVAMENTE
usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com git merge --ff-only,
rode a verificacao pos-integracao, remova a worktree e a branch, e cole no relatorio a saida de:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
