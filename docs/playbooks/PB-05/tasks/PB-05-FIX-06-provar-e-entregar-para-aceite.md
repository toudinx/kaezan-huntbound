# PB-05-FIX-06 — Provar os cues e entregar para o aceite

**Status inicial:** pending

**Classe da tarefa:** teste de browser e fechamento de trilha, bem especificada

**Modelo sugerido:** GPT-5.6 Luna `xhigh` ou Grok 4.6 `high`

**Validador sugerido:** o aceite é o usuário jogando; os gates só habilitam a entrega

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** não. É a última da trilha e depende de todas as anteriores integradas.

## Objetivo

Provar por teste automatizado que golpe, conjuração e cura **planejam** os cues certos, e entregar o
jogo rodando para o usuário aprovar. Este é o fechamento da trilha `PB-05-FIX` e do próprio PB-05.

## Resultado esperado

Uma spec no projeto `correctness` que afirma planejamento, não pixel, e roda estável sem `retries`.
`qa:budgets` medido e registrado como número, não como bloqueio. E uma frase dizendo ao usuário **o
que olhar** e **como reproduzir**.

## Dependências

- PB-05-FIX-05 `done` e integrada. A spec afirma os cues das cinco tasks anteriores de uma vez; rodar
  antes disso só produziria vermelho previsível.

## Leitura mínima

1. esta task;
2. `docs/superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md`, "Direção escolhida" §7 e os
   critérios de aceite;
3. `docs/playbooks/PB-05/STATE.md` e `README.md`, seção "Correções pós-aceite";
4. `AGENTS.md`, "O aceite é o usuário jogando";
5. `apps/game/src/hunt/HuntProbe.ts` — `unresolvedCombatAssetKeys`, `visibleDecorations` e os
   impulsos expostos por FIX-05;
6. `tests/e2e/combat-play.spec.ts` e `tests/e2e/support/combatDriver.ts` — a sessão dirigida que já
   ataca, conjura as três spells e mata;
7. `playwright.config.ts`, projetos `correctness` e `budgets`;
8. `docs/playbooks/PB-05/artifacts/browser-qa.md`;
9. `.cursor/rules/50-tests.mdc`.

## Decisões congeladas

- **A prova não depende de arte.** O gate roda no perfil `test`, onde todo sprite é placeholder 1×1
  e não há nada para olhar. A spec afirma **cue planejado**, lido do `HuntProbe`: contagem, kind,
  posição e ator. **Screenshot não é evidência de animação** e não substitui nenhuma asserção aqui.
- **A sessão dirigida é reaproveitada, não reescrita.** `combatDriver` já sabe atacar, conjurar as
  três habilidades, matar e coletar. Estenda o que ele devolve; não crie um segundo condutor.
- A spec nova entra no projeto **`correctness`**, logo em `qa:browser` e em `verify`. Nada novo entra
  em `budgets`.
- **D1 do PB-04 vale aqui.** A estabilidade é provada com `--retries=0 --repeat-each=10`.
  Reintroduzir `retries` para mascarar instabilidade é defeito, não conserto.
- No perfil `test` todas as chaves de combate resolvem, então
  `unresolvedCombatAssetKeys()` tem que sair **vazio**. Lista não vazia no gate é regressão de
  FIX-01, e falha o teste.
- `qa:budgets` é **camada informativa**. Roda, o número vai para o `STATE.md`, e vermelho vira task
  de performance no backlog — nunca bloqueio desta task.
- Nenhuma alteração em `packages/**`. Nenhum golden regenerado.

## Escopo permitido

```text
tests/e2e/combat-fx.spec.ts
tests/e2e/support/combatDriver.ts
apps/game/src/hunt/HuntProbe.ts
apps/game/src/hunt/HuntProbe.test.ts
apps/game/src/phaser/scenes/HuntScene.ts
docs/playbooks/PB-05/artifacts/browser-qa.md
docs/playbooks/PB-05/STATE.md
docs/playbooks/PB-05/README.md
```

`HuntProbe` e `HuntScene` só se faltar exposição para a spec afirmar um cue. Se a exposição já
existir, não toque nos dois.

## Fora de escopo

- Efeito, impulso ou cor novos. Se algo estiver feio, vira task nova; não conserte dentro do teste.
- Screenshot novo por viewport — `combat-play.spec.ts` já cobre os quatro.
- Auditoria independente. Ela roda **depois** do aceite, é opcional, e o que encontrar vira task de
  correção no backlog.
- Abrir PB-06 ou PB-07.
- `packages/**` inteiro.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove -b cursor/pb-05-fix-06-prove-combat-fx main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove install --prefer-offline
```

- [ ] **2. Escrever a spec RED `tests/e2e/combat-fx.spec.ts`.**

Afirme, lendo o `HuntProbe` durante a sessão dirigida:

- atacar produz um cue de impacto na posição do **alvo**, e um cue de sangue quando o dano tem
  `cause: 'attack'`;
- `berserk` produz **um cue por tile** do raio 1 em torno do conjurador, com `createdAtMs` distinto
  por distância;
- `brutal-strike` produz um cue de impacto no alvo e **nenhum** cue de golpe básico;
- `wound-cleansing` produz cue no **próprio** conjurador e um número de cura, distinto do número de
  dano;
- matar produz cadáver, sangue e o arco de autoloot, e os três **avançam de frame** entre duas
  leituras;
- os impulsos de FIX-05 aparecem no ativo e somem depois do TTL;
- `unresolvedCombatAssetKeys()` sai vazio;
- console sem erro, sem `pageerror`, sem request falhada.

Lembre que **o Playwright serve o `dist` pré-buildado**: rode `corepack pnpm build` antes de
qualquer conclusão sobre o browser.

- [ ] **3. Fazer a spec passar.** Se faltar exposição, acrescente ao `HuntProbe` com teste unitário
      próprio; não afrouxe a asserção.

- [ ] **4. Provar estabilidade.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove exec playwright test --project=correctness combat-fx --retries=0 --repeat-each=10
```

Instabilidade é defeito a diagnosticar, não a mascarar com `retries` ou timeout inflado.

- [ ] **5. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove combat:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove verify
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove qa:budgets
```

`EPERM` no `assets:stage:test` é flake de Windows: confirme que não há `vite preview` vivo na 4173 e
rode de novo. `qa:budgets` vermelho **não bloqueia**: registre o número e siga.

- [ ] **6. Registrar a evidência.**

Atualize `artifacts/browser-qa.md` com a spec nova, os cues afirmados, o resultado do
`--repeat-each=10` e os números do `qa:budgets`. Marque os critérios de aceite cumpridos no
`README.md` e feche a tabela da trilha FIX no `STATE.md`.

- [ ] **7. Entregar para o aceite.**

Deixe `corepack pnpm dev:personal` de pé e escreva, no relatório final, **o que olhar** e **como
reproduzir**: qual tecla dispara cada habilidade, o que deve aparecer no alvo, no conjurador e na
câmera, e o que significa cada número na tela. Este é o aceite do PB-05 inteiro — não declare o
playbook fechado; quem fecha é o usuário.

- [ ] **8. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove add apps docs tests
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove commit -m "test: prove planned combat cues in the browser"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only cursor/pb-05-fix-06-prove-combat-fx
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d cursor/pb-05-fix-06-prove-combat-fx
```

## Verificação

`biome check .` em `0`; `typecheck`, `combat:check`, `verify` verdes; `combat-fx` verde em
`--retries=0 --repeat-each=10`; `qa:budgets` executado e registrado.

## Critérios de aceite

- [ ] A spec afirma cue planejado lido do `HuntProbe`, não pixel e não screenshot.
- [ ] Golpe, `berserk`, `brutal-strike`, `wound-cleansing`, morte e autoloot têm cada um sua
      asserção.
- [ ] Cadáver, sangue e arco avançam de frame entre duas leituras.
- [ ] `unresolvedCombatAssetKeys()` sai vazio no perfil `test`.
- [ ] A spec entra no projeto `correctness` e, por ele, em `qa:browser` e `verify`.
- [ ] `--retries=0 --repeat-each=10` verde; nenhum `retries`, `skip` ou timeout inflado entrou.
- [ ] Console sem erro nos quatro viewports.
- [ ] `qa:budgets` rodado e o número registrado no `STATE.md`.
- [ ] `artifacts/browser-qa.md` atualizado.
- [ ] `combat:check` sai `0` e byte-idêntico.
- [ ] Nenhuma alteração em `packages/**`.
- [ ] O relatório final diz o que olhar e como reproduzir, e deixa o aceite com o usuário.

## Condições de parada

**Pare** se: um cue esperado não existir — isso é defeito de FIX-03, FIX-04 ou FIX-05 e vira task de
correção, não asserção afrouxada aqui; a spec só ficar verde com `retries` ou timeout inflado; o
`HuntProbe` precisar de dado que só o kernel tem; ou `combat:check` mudar.

## Persistência do handoff

Atualize **só a linha da task** na tabela do `STATE.md`, os números do `qa:budgets` e o estado geral
do playbook para "aguardando aceite do usuário". Não marque PB-05 como fechado.

## Commit

`test: prove planned combat cues in the browser`

## Ciclo de conclusão

Branch-base `main`; branch `cursor/pb-05-fix-06-prove-combat-fx`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, cues afirmados, resultado do `--repeat-each=10`, números do `qa:budgets`, comandos com exit
code, integração, limpeza, desvios — e, por último e em destaque, **o que o usuário deve olhar e como
reproduzir** para dar o aceite do PB-05.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-FIX-06-provar-e-entregar-para-aceite.md

Leia AGENTS.md, o STATE.md e o README do PB-05, a spec
docs/superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md e apenas os arquivos indicados.
Confirme que FIX-01 a FIX-05 estao done e integradas.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-fix-06-prove com a branch
cursor/pb-05-fix-06-prove-combat-fx e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Escreva tests/e2e/combat-fx.spec.ts no projeto correctness, reaproveitando a sessao
dirigida de tests/e2e/support/combatDriver.ts. A spec afirma CUE PLANEJADO lido do HuntProbe, nunca
pixel: o gate roda no perfil test, onde todo sprite e placeholder 1x1. Screenshot nao e evidencia de
animacao.

Afirme: ataque = impacto no alvo + sangue; berserk = um cue por tile do raio 1 com createdAtMs
distinto por distancia; brutal-strike = impacto no alvo e nenhum cue de golpe basico;
wound-cleansing = cue no proprio + numero de cura distinto do de dano; morte = cadaver, sangue e arco
de autoloot avancando de frame entre duas leituras; impulsos de FIX-05 aparecem e somem no TTL;
unresolvedCombatAssetKeys vazio; console sem erro.

O Playwright serve o dist pre-buildado: rode "corepack pnpm build" antes de qualquer conclusao sobre
o browser.

Prove estabilidade com --retries=0 --repeat-each=10. Nao introduza retries, skip nem timeout inflado:
isso e defeito, nao conserto. Se um cue esperado nao existir, PARE e registre como task de correcao.

Rode biome check ., typecheck, combat:check, verify e qa:budgets. combat:check tem que sair 0 e
byte-identico. qa:budgets e informativo: registre o numero no STATE.md e siga mesmo se vermelho.

Atualize artifacts/browser-qa.md, marque os criterios no README e feche a tabela da trilha FIX no
STATE.md com o estado "aguardando aceite do usuario". NAO declare o PB-05 fechado: quem fecha e o
usuario jogando.

Deixe dev:personal de pe e termine o relatorio dizendo, em destaque, O QUE OLHAR e COMO REPRODUZIR.

Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe worktree e branch
removendo o diretorio antes do prune. Nao abra PB-06 nem PB-07.
```
