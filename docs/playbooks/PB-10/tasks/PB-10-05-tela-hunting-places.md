# PB-10-05 — A tela de hunting places

**Status inicial:** pending

**Classe da tarefa:** **apresentação em `apps/game`** — DOM fora do canvas, mais a fiação que faz o
boot deixar de conhecer uma hunt só. Nenhuma regra de jogo entra em scene.

**Modelo sugerido:** camada econômica com effort `xhigh`. O dado já está pronto e congelado; o
trabalho é ligar o índice na tela e a escolha no boot.

**Validador sugerido:** **o usuário jogando.** Esta é a task do playbook cujo aceite não é gate: é
abrir o jogo, ver o catálogo, escolher uma hunt e entrar.

**Rota:** **sem skill externa.** Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** **pode rodar em paralelo com a PB-10-06.** A 05 vive em `apps/game`; a 06 vive no
kernel e em `buildHuntScenario`. Não se cruzam.

**Spec:** `docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`, decisões 2, 3, 4 e 5.

## Objetivo

O jogo abre numa **tela de hunting places**: as hunts do índice com nome, faixa, nível recomendado,
criaturas, exp e loot. Você escolhe uma, ela carrega, e o jogo entra nela.

Depois desta task o playbook tem a máquina inteira: pipeline multi-hunt (03), índice gerado (04) e o
jogo sabendo que existe mais de uma hunt (05). O que falta a partir daí é **conteúdo** — as hunts das
faixas 2 a 5, que são as tasks 07 em diante.

## O que ainda prende o jogo a uma hunt

Três pontos, medidos no workspace em 2026-08-26. São exatamente três, e a task acaba quando os três
saem:

| Onde | O que está fixo |
|---|---|
| `apps/game/src/main.ts:9` | `import huntDefinitionJson from '...generated/hunts/venore-rotworm-cave/hunt.json?raw'` — import **estático** da rotworm |
| `apps/game/src/main.ts:310` | `runtime.characters[0]` — não existe "qual personagem", existe *o* personagem |
| `apps/game/src/assets/AssetProfile.ts:19` | `getHuntAssetCatalogUrl` devolve `/assets/${profile}/pb04/catalog.json` — o diretório da hunt está no literal |

O terceiro é o que costuma passar despercebido, porque o nome da função não menciona hunt nenhuma.
Sem ele, escolher a segunda hunt carrega o pack da primeira.

## O que já está pronto e não se refaz

| Peça | Estado |
|---|---|
| `packages/content/src/generated/hunts/index.json` | **entregue pela PB-10-04**: `huntId`, `displayName`, `band`, `recommendedLevel`, `soloVocation`, `maxLiveActors`, `experiencePerHour`, criaturas com HP/exp/`lookType`/loot |
| `session.huntId` | já serializado no save desde o PB-06, e já sobrevive ao round-trip |
| `HUNT_PIPELINE_REGISTRY` | **PB-10-03**: já sabe o `runtimeDirectory` de cada hunt (hoje `pb04`) |
| Cockpit | fechou na PB-08-09 e **não é tocado** |

## A decisão que esta task precisa congelar

**Como o diretório do pack chega ao jogo.**

`HUNT_PIPELINE_REGISTRY` sabe o `runtimeDirectory`, mas mora em `tools/` — e `apps/game` não importa
de `tools/`. O caminho limpo é o índice, que já é a ponte gerada entre pipeline e jogo: **acrescente
o diretório de pack ao contrato do índice** e faça o gerador da PB-10-04 lê-lo do registro.

Não derive por convenção a partir do `huntId`. `hunt:tibia:venore-rotworm-cave` não produz `pb04` por
nenhuma regra, e uma convenção inventada aqui quebra na primeira hunt cujo pack não siga o padrão.

O resto é seu, na regra do `AGENTS.md`: **a opção mais simples e mais fácil de reverter, registrada
em uma linha no commit.** Em particular, se um save com `huntId` deve pular a tela ou apenas
destacá-la, escolha e siga — não abra ciclo por isso.

## O que a tela mostra

Do índice, e **só** do índice. Nenhum número digitado na tela: se ele não está no `index.json`, ou
ele vem de uma task de conteúdo, ou não entra.

Nome, faixa, nível recomendado, criaturas com HP e exp, exp por hora e loot. A faixa 1 é a única com
dado real hoje, e **uma tela com um card é a tela certa** — ela prova a forma. As faixas 2 a 5 entram
sozinhas quando as tasks de conteúdo rodarem, sem tocar nesta tela.

## Onde a tela vive

Fase de shell **antes** da hunt, em DOM fora do canvas — é a ADR-03, "UI densa fora do canvas", e é o
que o `AppShell` já faz para o cockpit. `ShellPhase` hoje é
`'booting' | 'ready' | 'paused' | 'error'` (`apps/game/src/runtime/ShellSnapshot.ts:1`); a escolha de
hunt é um estado novo aí.

Entrar numa hunt sai da tela. **Não há volta para ela nesta task**: sair da hunt depende de fim de
run, que é PB-11. Não invente um botão de sair.

## O personagem sai da hunt escolhida

É a decisão congelada 2 da spec, já emendada na ADR-05 pela PB-10-02, e é **temporária até o PB-09**.
Sem progressão o jogador é fixo em level 35 (`packages/content/src/selections/pb-05-knight-combat.json`),
e com cinco faixas quatro seriam triviais ou letais.

A chave de personagem já embute a hunt (`character:huntbound:knight-venore-rotworm-cave`), então isto
é seleção por chave, não mecânica nova. `runtime.characters[0]` vira "o personagem **desta** hunt", e
some quando o índice tiver mais de uma entrada.

## Fora de escopo, explicitamente

- **Cockpit.** Fechou na PB-08-09. Não é tocado.
- **Troca de hunt no meio da run**, e qualquer coisa que dependa de fim de run. É PB-11.
- **Hunt nova.** Nenhuma. O índice tem uma entrada e a tela mostra uma. Conteúdo é 07+.
- **Progressão e nível conquistado.** PB-09.
- **Regenerar golden.** Esta task não toca em kernel, contrato de simulação nem fixture.

## Armadilhas conhecidas

1. **O Playwright serve o `dist` pré-buildado.** `playwright.config.ts` sobe `vite preview` sobre
   `dist/game`, e **nada na suíte reconstrói**. Toda edição em `apps/game/src/**` é invisível no
   browser até `corepack pnpm build`. `qa:browser` e `verify` buildam antes; `playwright test` direto,
   não. Se o sintoma no browser contradisser o código que você está lendo, **confira a idade do bundle
   antes de teorizar** — é a armadilha 1 do `AGENTS.md` e já custou tempo aqui.
2. **`EPERM ... rename` no `assets:stage:test`** com um `vite` de pé segurando
   `apps/game/public/assets`. Determinístico com servidor de pé, intermitente com antivírus. Derrube o
   listener em 5173/4173, rode os gates, e **suba o servidor de volta no fim** — se era o usuário
   jogando, avise.
3. **Preload da hunt errada.** A escolha acontece **antes** do preload; é isso que torna "um pack por
   hunt" possível (decisão congelada 4). Se o pack for pré-carregado no boot, a decisão morre e a
   segunda hunt fica impossível sem outro refactor.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-10/README.md` e o `STATE.md`;
3. a spec, decisões 2, 3, 4 e 5;
4. `packages/content/src/generated/hunts/index.json` e o contrato dele em
   `packages/contracts/src/hunt/` — **é a fonte da tela**;
5. `apps/game/src/main.ts`, boot inteiro (`bootstrapApp`);
6. `apps/game/src/assets/AssetProfile.ts` e `apps/game/src/hunt/huntRuntime.ts`;
7. `apps/game/src/ui/AppShell.ts` e `apps/game/src/runtime/ShellSnapshot.ts`;
8. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`, "UI densa fora do canvas";
9. `.cursor/rules/40-game.mdc`.

## Passos

1. Acrescente o diretório de pack ao índice e ao contrato, e regenere com `--check`.
2. Faça `getHuntAssetCatalogUrl` receber a hunt.
3. Carregue a definição da hunt escolhida em vez do import estático.
4. Resolva o personagem pela hunt.
5. Monte a tela em DOM fora do canvas, lendo o índice.
6. `corepack pnpm build` e olhe no browser. **Sempre buildar antes de olhar.**
7. Atualize a linha PB-10-05 do `STATE.md`.

## Verificações exigidas

Com saída fresca colada no relatório:

- `corepack pnpm verify` — verde;
- `corepack pnpm qa:browser`, projeto `correctness`;
- `corepack pnpm content:check` — o índice regenerado continua conferindo;
- `corepack pnpm hunt:check` e `combat:check` verdes **sem** golden regenerado;
- **`corepack pnpm dev` de pé**, e uma frase dizendo **o que olhar** e **como reproduzir**.

O último item não é formalidade: o aceite deste playbook é o usuário jogando, e esta é a task em que
isso acontece.

## Risco conhecido

**A tela funciona e a hunt carrega o pack errado.** É o modo de falhar específico desta task, e ele é
silencioso: com uma hunt só, `pb04` hardcoded e `pb04` derivado do índice dão o mesmo resultado, e o
defeito só aparece na primeira hunt da task 07. A defesa é um teste que resolve a URL a partir de uma
entrada de índice **fabricada** com outro diretório, e prova que a URL muda junto.

## Definition of Done

- [ ] `apps/game/src/main.ts` não importa `hunt.json` estaticamente.
- [ ] `runtime.characters[0]` não existe mais; o personagem sai da hunt.
- [ ] `getHuntAssetCatalogUrl` não cita `pb04`; a URL sai do índice.
- [ ] Teste que prova a URL mudando com uma entrada de índice fabricada.
- [ ] Tela em DOM fora do canvas, lendo **só** o índice, mostrando faixa, nível, criaturas, exp e loot.
- [ ] Escolha acontece antes do preload; um pack por hunt continua possível.
- [ ] Cockpit intacto; nenhum golden regenerado.
- [ ] `verify` e `qa:browser` verdes, `dev` de pé, e a frase de "o que olhar".
- [ ] Branch integrada por `git merge --ff-only`.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com um modelo economico em effort xhigh.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-10\tasks\PB-10-05-tela-hunting-places.md

Leia AGENTS.md, .cursor/rules/40-game.mdc, docs/playbooks/PB-10/README.md, o STATE.md, a spec
docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md (decisoes 2, 3, 4 e 5) e a secao
"UI densa fora do canvas" de docs/03_ADR_PHASER4_BROWSER_FIRST.md.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb10-05-tela com a branch
<agente>/pb10-05-tela-hunting-places e rode "corepack pnpm install --prefer-offline" dentro dela.

Esta task PODE rodar em paralelo com a PB-10-06: a 05 vive em apps/game, a 06 no kernel.

OBJETIVO: o jogo abre numa TELA DE HUNTING PLACES — as hunts do indice com nome, faixa, nivel
recomendado, criaturas, exp e loot. Voce escolhe uma, ela carrega, e o jogo entra nela.

TRES PONTOS PRENDEM O JOGO A UMA HUNT, e a task acaba quando os tres saem:
1. apps/game/src/main.ts:9 — import ESTATICO de .../hunts/venore-rotworm-cave/hunt.json?raw
2. apps/game/src/main.ts:310 — runtime.characters[0]
3. apps/game/src/assets/AssetProfile.ts:19 — getHuntAssetCatalogUrl devolve
   /assets/${profile}/pb04/catalog.json, com o diretorio da hunt no literal
O TERCEIRO PASSA DESPERCEBIDO porque o nome da funcao nao menciona hunt. Sem ele, escolher a segunda
hunt carrega o pack da primeira.

JA PRONTO, NAO SE REFAZ: packages/content/src/generated/hunts/index.json (PB-10-04) com huntId,
displayName, band, recommendedLevel, soloVocation, maxLiveActors, experiencePerHour e criaturas com
HP/exp/lookType/loot; session.huntId ja serializado desde o PB-06; HUNT_PIPELINE_REGISTRY (PB-10-03)
ja sabe o runtimeDirectory de cada hunt; o cockpit fechou na PB-08-09 e NAO E TOCADO.

DECISAO A CONGELAR — como o diretorio do pack chega ao jogo: HUNT_PIPELINE_REGISTRY sabe o
runtimeDirectory mas mora em tools/, e apps/game NAO IMPORTA DE tools/. ACRESCENTE O DIRETORIO DE PACK
AO CONTRATO DO INDICE e faca o gerador da PB-10-04 le-lo do registro. NAO derive por convencao a
partir do huntId: "hunt:tibia:venore-rotworm-cave" nao produz "pb04" por regra nenhuma.

A TELA MOSTRA SO O QUE ESTA NO INDICE. Nenhum numero digitado. A faixa 1 e a unica com dado real hoje,
e UMA TELA COM UM CARD E A TELA CERTA — ela prova a forma; as faixas 2 a 5 entram sozinhas quando as
tasks de conteudo rodarem, sem tocar nesta tela.

ONDE A TELA VIVE: fase de shell ANTES da hunt, em DOM fora do canvas. ShellPhase hoje e
'booting'|'ready'|'paused'|'error' em apps/game/src/runtime/ShellSnapshot.ts:1. Entrar numa hunt sai
da tela; NAO HA VOLTA nesta task, porque sair da hunt depende de fim de run, que e PB-11. NAO INVENTE
UM BOTAO DE SAIR.

O PERSONAGEM SAI DA HUNT ESCOLHIDA — decisao congelada 2, ja emendada na ADR-05, TEMPORARIA ate o
PB-09. A chave ja embute a hunt (character:huntbound:knight-venore-rotworm-cave), entao e selecao por
chave, nao mecanica nova.

FORA DE ESCOPO: cockpit; troca de hunt no meio da run e qualquer coisa que dependa de fim de run
(PB-11); hunt nova (07+); progressao (PB-09); regenerar golden.

ARMADILHAS:
- O PLAYWRIGHT SERVE O dist PRE-BUILDADO. playwright.config.ts sobe vite preview sobre dist/game e
  NADA NA SUITE RECONSTROI. Toda edicao em apps/game/src/** e invisivel no browser ate
  "corepack pnpm build". Se o sintoma no browser contradisser o codigo, CONFIRA A IDADE DO BUNDLE
  ANTES DE TEORIZAR.
- EPERM ... rename no assets:stage:test com vite de pe segurando apps/game/public/assets. Derrube o
  listener em 5173/4173, rode os gates, e SUBA O SERVIDOR DE VOLTA NO FIM; se era o usuario jogando,
  avise.
- A ESCOLHA ACONTECE ANTES DO PRELOAD. E isso que torna "um pack por hunt" possivel. Pack
  pre-carregado no boot mata a decisao congelada 4.

RISCO CENTRAL: a tela funciona e a hunt carrega o PACK ERRADO. Com uma hunt so, pb04 hardcoded e pb04
vindo do indice dao o mesmo resultado, e o defeito so aparece na primeira hunt da task 07. DEFESA: um
teste que resolve a URL a partir de uma entrada de indice FABRICADA com outro diretorio e prova que a
URL muda junto.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm verify
- corepack pnpm qa:browser (projeto correctness)
- corepack pnpm content:check
- corepack pnpm hunt:check e combat:check verdes SEM golden regenerado
- corepack pnpm dev DE PE, e uma frase dizendo O QUE OLHAR e COMO REPRODUZIR

O ACEITE DESTE PLAYBOOK E O USUARIO JOGANDO, e esta e a task em que isso acontece. A ultima linha nao
e formalidade.

Ao terminar: atualize somente a linha PB-10-05 do STATE.md com o modelo e o effort EFETIVAMENTE
usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com git merge
--ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no relatorio:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
