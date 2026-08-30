# PB-10-11 — A `main` volta a ficar verde

**Status inicial:** pending

**Classe da tarefa:** **investigação e correção** — a `main` está vermelha desde `3fa4845`. Não é
conteúdo novo, não é feature. É achar por que uma hunt quebrou quando outra entrou.

**Modelo sugerido:** camada frontier com effort `xhigh`. É diagnóstico com hipótese aberta, não
implementação especificada.

**Validador sugerido:** modelo diferente do implementador.

**Rota:** **sem skill externa.** Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** **roda sozinha.** Ela conserta o gate que as outras usam para se provar.

## Objetivo

`tests/e2e/haste-play.spec.ts:171` reprova com `The player never accepted two consecutive cardinal
steps.`, na **Venore Rotworm Cave** — a hunt da faixa 1, que ninguém tocou. O gate `correctness` dá
79/1 hoje; a linha de evidência da PB-10-08 registrou 80/80 no dia em que foi escrita.

A entrega é a `main` verde **pela causa**, não pelo sintoma.

## O que já está medido — não refaça

Bisect registrado no `STATE.md` como B19: **passa em `87e12e0`, reprova em `3fa4845` e `c551e84`**,
três vezes seguidas isolada. Não é o B11/B14, que são sondas de frame sensíveis a carga e passam
quando repetidas.

`3fa4845` é `feat: add Cyclopolis as a dense band-three hunt`. Em 2026-08-30 foi conferido o que ele
mudou, e o resultado **estreita muito** o campo:

| Conferido | Resultado |
|---|---|
| `git diff --stat 87e12e0 3fa4845 -- packages/content/src/generated/hunts/venore-rotworm-cave/` | **vazio** — região, spawns e transições da rotworm são byte a byte os mesmos |
| `packages/content/src/generated/pb-01-contract-coverage.json` | **+344 linhas** — o Cyclops entrou no catálogo, que é **global e compartilhado por todas as hunts** |
| `tools/map-extractor/spawns.ts` | mudou a admissão de grupo (centro dentro **ou** slot selecionado dentro) — mas **sem efeito nos artefatos da rotworm**, ver linha 1 |
| `tests/e2e/support/huntDriver.ts` | `selectHunt` ganhou um ramo por display name; o caminho do `DEFAULT_HUNT_ID` ficou igual |

Ou seja: **o mapa da rotworm não mudou, o spawn da rotworm não mudou, e o driver do teste não mudou.
O que mudou foi o catálogo compartilhado.**

## A hipótese, e por que ela importa muito mais que este teste

`buildHuntScenario` monta os blueprints a partir do catálogo. Se acrescentar uma criatura para *outra*
hunt desloca a ordem ou os ids de blueprint da rotworm, o consumo do stream de RNG da IA anda junto —
e a hunt inteira passa a se comportar de outro jeito sem que uma linha dela tenha sido tocada.

Isso casa com o único sintoma que sobra: o jogador não consegue dois passos cardinais seguidos. Ele
está sendo bloqueado ou interrompido por um comportamento de IA que mudou de fase.

E casa com o fato de os goldens estarem **verdes**: `hunt:check`, `combat:check` e `simulation:check`
replayam **fixtures com cenário próprio**, não o catálogo vivo. Por construção eles não veem isso. Só
o browser vê.

**Se a hipótese se confirmar, o defeito não é este teste.** É que **cada hunt nova quebra todas as
anteriores**, em silêncio, e o PB-10 acabou de acrescentar quatro. O conserto tem de tornar a
construção do cenário independente da ordem do catálogo — não fazer este spec passar.

Confirme ou derrube a hipótese antes de consertar. Se ela cair, o campo restante é pequeno e está na
tabela acima.

## O segundo defeito, mesma origem

`readHuntCharacter` em `apps/game/src/main.ts:186`:

```ts
const character =
  characters.find((candidate) => candidate.stableKey === characterKey) ??
  characters.find((candidate) => candidate.vocationKey === hunt.soloVocation);
```

Uma hunt sem ficha própria pega **em silêncio** a primeira ficha de knight do catálogo — que hoje é a
da faixa 1, nível 35 — em vez de estourar. Numa faixa 5 isso é o jogador entrar na Hero Cave com a
ficha do rotworm e não ter como saber. É a mesma família do B19: estado global do catálogo decidindo
por uma hunt que não pediu.

**O fallback sai.** Ficha ausente vira erro com o `characterKey` na mensagem.

## O que é proibido aqui

Regra do `AGENTS.md`, e ela já reprovou um playbook neste repositório:

- **`retries` de Playwright.** Não.
- **`test.skip`, `test.fixme`, timeout inflado, asserção enfraquecida.** Não.
- **Mexer no laço de tentativas do `stepUntilMoved`** para dar mais chances ao jogador. Ele já tenta
  4 vezes por tecla e varre as quatro direções; se isso não basta, o jogador está travado, e é
  exatamente o que o teste existe para dizer.
- **Regenerar golden.** Se algum golden divergir, **pare e reporte**: significa que a causa é kernel
  e a conversa é outra.

## Fora de escopo

- **Corpo por espécie** — é a PB-10-12.
- **Dificuldade das hunts, mitigação, `armor`, fim de run** — é o PB-11.
- **B11 e B14** — as sondas de frame sensíveis a carga continuam abertas e não são isto.
- **B18** — o cisalhamento de outfit 32×32 não é código deste repositório.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-10/STATE.md`, bloqueio **B19**;
3. `tests/e2e/haste-play.spec.ts` — em especial `measureStepInterval` e `stepUntilMoved`;
4. `apps/game/src/main.ts`, `readHuntCharacter` e o boot da hunt;
5. `buildHuntScenario` e como ele deriva blueprint do catálogo;
6. `docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`;
7. `AGENTS.md`, seção "Regras invioláveis".

## Passos

1. Reproduza vermelho na `main` atual, isolado, com o bundle fresco. **Confira a idade do `dist`
   antes de teorizar** — `playwright test` direto não builda (armadilha 1 do `AGENTS.md`).
2. Confirme ou derrube a hipótese do catálogo: o blueprint da rotworm mudou de id ou de ordem entre
   `87e12e0` e `3fa4845`?
3. Se confirmou: conserte a **construção do cenário**, para que a ordem do catálogo não mude o
   comportamento de hunt nenhuma. Se derrubou: siga pelo campo restante da tabela.
4. Remova o fallback silencioso de `readHuntCharacter`.
5. Rode o `correctness` inteiro e prove o verde.
6. Atualize a linha PB-10-11 do `STATE.md` e **feche o B19** com a causa em uma linha.

## Verificações exigidas

Com saída fresca colada no relatório:

- `corepack pnpm qa:browser`, projeto `correctness` — **verde, sem `retries`**;
- `corepack pnpm hunt:check`, `combat:check` e `simulation:check` — verdes **sem golden regenerado**;
- `corepack pnpm typecheck` e `biome check .`;
- **`corepack pnpm dev` de pé**, com uma frase dizendo o que olhar.

`verify` completo **não é exigido aqui** — ele fecha na PB-10-12, conforme a revisão de processo de
2026-08-30 em `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`.

## Risco conhecido

**Consertar o sintoma.** Qualquer mudança que faça o jogador andar sem explicar por que ele parou de
andar deixa o defeito real na `main` e ele volta na próxima hunt.

**Concluir cedo demais que é flake.** O B16 e o B11/B14 existem e são reais, mas este reprova
isolado, três vezes, com a máquina livre, e tem bisect limpo. Se ele passar numa rodada, rode de novo
antes de declarar vitória.

**Descobrir que a causa é kernel.** Aí um golden diverge. Isso não é permissão para regenerar: é
motivo para parar e reportar.

## Definition of Done

- [ ] Causa do B19 escrita em uma linha, com a evidência que a prova.
- [ ] Conserto na causa, não no teste.
- [ ] Nenhum `retries`, `skip`, timeout inflado ou asserção enfraquecida.
- [ ] Fallback silencioso de `readHuntCharacter` removido; ficha ausente estoura com o `characterKey`.
- [ ] Nenhum golden regenerado.
- [ ] `qa:browser` projeto `correctness` verde.
- [ ] B19 fechado no `STATE.md`.
- [ ] Integrada por `git merge --ff-only`, worktree e branch removidas.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com um modelo frontier em effort xhigh.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-10\tasks\PB-10-11-main-verde.md

Leia AGENTS.md, .cursor/rules/50-tests.mdc, docs/playbooks/PB-10/README.md e o STATE.md (bloqueio
B19).

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb10-11-main-verde com a branch
<agente>/pb10-11-main-verde e rode "corepack pnpm install --prefer-offline" dentro dela.

A MAIN ESTA VERMELHA. tests/e2e/haste-play.spec.ts:171 reprova com "The player never accepted two
consecutive cardinal steps.", na VENORE ROTWORM CAVE — a hunt da faixa 1, que NINGUEM TOCOU. O gate
correctness da 79/1.

JA MEDIDO, NAO REFACA. Bisect: passa em 87e12e0, reprova em 3fa4845 e c551e84, tres vezes isolada.
Nao e o B11/B14. 3fa4845 e "feat: add Cyclopolis as a dense band-three hunt", e em 2026-08-30 foi
conferido o que ele mudou:
- os artefatos gerados da venore-rotworm-cave sao BYTE A BYTE OS MESMOS (git diff --stat vazio);
- packages/content/src/generated/pb-01-contract-coverage.json cresceu 344 LINHAS: o Cyclops entrou no
  CATALOGO, que e GLOBAL E COMPARTILHADO POR TODAS AS HUNTS;
- tools/map-extractor/spawns.ts mudou a admissao de grupo, SEM EFEITO nos artefatos da rotworm;
- tests/e2e/support/huntDriver.ts ganhou um ramo por display name, e o caminho do DEFAULT_HUNT_ID
  ficou igual.
Ou seja: O MAPA NAO MUDOU, O SPAWN NAO MUDOU, O DRIVER NAO MUDOU. MUDOU O CATALOGO COMPARTILHADO.

HIPOTESE A CONFIRMAR OU DERRUBAR ANTES DE CONSERTAR: buildHuntScenario monta blueprints a partir do
catalogo; acrescentar criatura para OUTRA hunt desloca ordem ou ids de blueprint da rotworm, e o
consumo do stream de RNG da IA anda junto. Casa com o sintoma (o jogador nao consegue dois passos
cardinais seguidos) e casa com os goldens verdes: hunt:check, combat:check e simulation:check
replayam FIXTURES COM CENARIO PROPRIO, nao o catalogo vivo — por construcao eles nao veem isso.

SE A HIPOTESE SE CONFIRMAR, O DEFEITO NAO E ESTE TESTE: e que CADA HUNT NOVA QUEBRA TODAS AS
ANTERIORES em silencio, e o PB-10 acabou de acrescentar quatro. O CONSERTO TEM DE TORNAR A CONSTRUCAO
DO CENARIO INDEPENDENTE DA ORDEM DO CATALOGO, nao fazer o spec passar.

SEGUNDO DEFEITO, MESMA ORIGEM: readHuntCharacter em apps/game/src/main.ts:186 tem fallback
"characters.find(c => c.vocationKey === hunt.soloVocation)" que faz hunt sem ficha propria pegar EM
SILENCIO a primeira ficha de knight do catalogo (hoje a da faixa 1, nivel 35). O FALLBACK SAI: ficha
ausente estoura com o characterKey na mensagem.

PROIBIDO, e ja reprovou playbook neste repositorio: retries de Playwright; test.skip; test.fixme;
timeout inflado; asserção enfraquecida; mexer no laco de tentativas do stepUntilMoved para dar mais
chances ao jogador (ele ja tenta 4 vezes por tecla nas quatro direcoes — se isso nao basta, o jogador
esta travado, que e o que o teste existe para dizer). REGENERAR GOLDEN: se algum divergir, PARE E
REPORTE, porque significa que a causa e kernel.

ATENCAO A ARMADILHA 1 DO AGENTS.md: playwright test direto NAO BUILDA e serve o dist velho. Confira a
idade do bundle antes de teorizar.

FORA DE ESCOPO: corpo por especie (e a PB-10-12); dificuldade, mitigacao, armor e fim de run (e o
PB-11); B11 e B14; B18.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm qa:browser projeto correctness VERDE, SEM retries
- corepack pnpm hunt:check, combat:check e simulation:check verdes SEM golden regenerado
- corepack pnpm typecheck e biome check .
- corepack pnpm dev DE PE, com uma frase dizendo o que olhar
verify completo NAO e exigido aqui: ele fecha na PB-10-12, conforme a revisao de processo de
2026-08-30 em docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md.

Ao terminar: atualize somente a linha PB-10-11 do STATE.md com o modelo e o effort EFETIVAMENTE
usados, e FECHE O B19 com a causa em uma linha. Commit com mensagem que explique o PORQUE. Integre
voce mesmo na main com git merge --ff-only, rode a verificacao pos-integracao, remova a worktree e a
branch, e cole no relatorio:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
