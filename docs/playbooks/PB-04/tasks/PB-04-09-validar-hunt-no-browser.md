# PB-04-09 — Validar a hunt no browser

**Status inicial:** pending

**Classe da tarefa:** verificação de runtime real com evidência versionada

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; escalonamento somente por gatilho objetivo registrado

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** não.

## Objetivo

Provar no browser real que a hunt é jogável, que o replay da sessão produz no Chromium o mesmo
SHA-256 que o Node, e que o carregamento cabe no orçamento da ADR-001. Não alterar regra, cena, input
nem fixture.

## Resultado esperado

Um teste Playwright que dirige a hunt por input sintético, screenshots versionadas nos quatro
viewports obrigatórios, e um relatório de medição com o tempo até o primeiro estado acionável e a
maior long task observada durante a caminhada.

## Dependências

- PB-04-08 `done` e integrada em `main`.
- `hunt:check` verde em `verify`.
- Pack no profile `test` disponível por `assets:stage:test`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-04/STATE.md`;
3. `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`, seção “Gates e scripts”;
4. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`, seção “Performance inicial”;
5. `tests/**` e `playwright.config.ts`;
6. `apps/game/src/simulation/KernelProbe.ts` e o teste `kernel-replay.spec.ts` do PB-03-07;
7. `docs/playbooks/PB-00/artifacts/browser-qa.md` como referência de artefato de QA.

## Decisões congeladas

- Viewports obrigatórios: `390×844`, `768×1024`, `1366×768`, `1920×1080`.
- Orçamento: primeiro estado acionável ≤ 5 s sob perfil Fast 4G após cache frio; nenhuma long task
  recorrente ≥ 50 ms durante a caminhada.
- Zero erro de console, de página, de resposta HTTP e de requisição em qualquer viewport.
- O probe de paridade é o mesmo mecanismo test-only do PB-03-07, estendido para a sessão da hunt.
- O teste dirige o jogo por **input sintético real** (teclado e toque no dpad), não chamando o kernel
  diretamente. Chamar o kernel provaria o kernel, que já está provado; o que falta provar é a
  cadeia input → comando → evento → pixel.
- Screenshots são artefato versionado e entram no repositório; elas não contêm mídia
  `cipsoft-personal`, porque o profile de teste usa a fixture sintética.
- O spike de densidade de 50/150/300 atores **não** é feito aqui: pertence a PB-10.

## Escopo permitido

```text
tests/**
playwright.config.ts
apps/game/src/simulation/KernelProbe.ts
docs/playbooks/PB-04/artifacts/**
package.json
docs/playbooks/PB-04/STATE.md
```

## Fora de escopo

- alterar regra, cena, input, contratos, extração, pack ou fixture;
- corrigir defeito encontrado aqui **fora** do que a própria task consegue provar: um defeito de
  regra vira card novo, não um remendo silencioso nesta task;
- spike de densidade e profiling completo, que pertencem a PB-10.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada, e instalar dependências.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb04-09-hunt-browser-qa main
git worktree add C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa codex/pb04-09-hunt-browser-qa
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa install --prefer-offline
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa exec playwright install --with-deps chromium
```

- [ ] **2. Escrever o teste RED de paridade de replay da hunt.**

Estenda o probe para executar a sessão `pb-04-hunt-session` no browser e devolver snapshot canônico,
SHA-256, contagem de eventos e tick final. Injete `scenario.json` e `commands.jsonl` pelo processo
Node, como o teste do PB-03-07 já faz.

Esperado no RED: falha por sessão desconhecida ou por probe não estendido.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa exec playwright test hunt-replay.spec.ts
```

- [ ] **3. Implementar a extensão do probe; obter GREEN.**

O SHA-256 no Chromium deve ser idêntico ao registrado por PB-04-06. Divergência aqui é defeito real:
pare e reporte, não ajuste o golden.

- [ ] **4. Escrever o teste RED de jogabilidade por input sintético.**

Dirija a hunt por teclado e prove, sem tocar no kernel diretamente:

- o jogador aparece em `playerStart` e a região está desenhada;
- pressionar uma direção move o jogador exatamente um tile;
- caminhar contra parede não move e não lança;
- a câmera acompanha depois que o jogador sai da deadzone;
- alcançar o tile de transição troca o andar desenhado;
- pelo menos um rotworm está visível no andar da caverna;
- caminhar contra um rotworm não move o jogador.

- [ ] **5. Implementar o que faltar para o GREEN.**

Se algo faltar em `apps/game`, corrija **apenas** o necessário para o teste passar e declare o desvio
no relatório. Se a correção exigir mudar regra do kernel, pare: vira card novo.

- [ ] **6. Escrever o teste RED de dpad no viewport móvel.**

Em `390×844`, prove que o dpad DOM aparece, que o toque produz o mesmo passo que a tecla, e que o
centro e o lower-middle do playfield continuam livres, conforme ADR-001.

- [ ] **7. Capturar screenshots nos quatro viewports.**

Grave em `docs/playbooks/PB-04/artifacts/screenshots/` uma imagem por viewport, com nome estável.
Confirme que nenhuma contém mídia pessoal: o profile de teste usa PNG sintético.

- [ ] **8. Medir o orçamento de carregamento.**

Com cache frio e perfil Fast 4G, meça o tempo até o primeiro estado acionável e a maior long task
durante 10 segundos de caminhada contínua. Registre os números em
`docs/playbooks/PB-04/artifacts/browser-qa.md`.

Se estourar o orçamento, **registre a medição e reporte**; otimizar é decisão de supervisor e
provavelmente pertence a PB-10. Não reduza a região nem desligue camada por conta própria.

- [ ] **9. Confirmar ausência de erro em todos os viewports.**

Colete erros de console, de página, respostas HTTP com status ≥ 400 e requisições falhadas. Qualquer
ocorrência é falha da task.

- [ ] **10. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa exec playwright test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa format:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa verify
git -C C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa diff --check
```

- [ ] **11. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa add tests apps/game docs playwright.config.ts package.json
git -C C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa commit -m "test: prove the first hunt in the browser"
```

- [ ] **12. Integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb04-09-hunt-browser-qa
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb04-09-hunt-browser-qa
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb04-09-hunt-browser-qa
```

## Critérios de aceite

- [ ] O Chromium produz o mesmo SHA-256 do snapshot canônico que o Node.
- [ ] A jogabilidade é provada por input sintético, não por chamada direta ao kernel.
- [ ] Passo, parede, criatura, câmera e transição têm asserção própria.
- [ ] O dpad funciona em `390×844` e o playfield central permanece livre.
- [ ] Existem quatro screenshots versionadas, uma por viewport obrigatório, sem mídia pessoal.
- [ ] Tempo até o primeiro estado acionável e maior long task estão medidos e registrados.
- [ ] Zero erro de console, página, HTTP ou requisição em todos os viewports.
- [ ] `corepack pnpm verify` passa antes e depois da integração.

## Condições de parada

Pare se o SHA-256 do browser divergir do Node; se a jogabilidade exigir mudança de regra do kernel;
se o orçamento estourar e a correção exigir reduzir a região; ou se algum viewport apresentar erro
que só se resolva mudando contrato já congelado.

## Persistência e relatório final

Registre o SHA-256 do browser, contagem de eventos e tick final, os números de orçamento medidos, a
lista de screenshots, comandos/exit codes, modelo/effort, modo de conclusão e a próxima task
elegível. Qualquer defeito fora de escopo vira card novo, nomeado no relatório.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-04\tasks\PB-04-09-validar-hunt-no-browser.md

Leia o STATE.md do playbook PB-04 e apenas os arquivos indicados pela task. Crie a branch/worktree
indicada, rode "corepack pnpm install --prefer-offline" e instale o Chromium do Playwright.

Comece por RED. Prove a paridade de SHA-256 entre Chromium e Node para a sessao pb-04-hunt-session, e
prove a jogabilidade por INPUT SINTETICO real (teclado e dpad), nunca chamando o kernel diretamente.
Capture screenshots nos quatro viewports obrigatorios e meca tempo ate o primeiro estado acionavel e
a maior long task durante a caminhada.

Se o SHA-256 divergir, PARE: e defeito real, nao ajuste o golden. Se o orcamento estourar, registre a
medicao e reporte em vez de reduzir a regiao. Defeito de regra vira card novo, nao remendo aqui.

Execute os gates, atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe
worktree/branch removendo o diretorio antes do prune.

Não faça spike de densidade: ele pertence a PB-10. Se surgir decisão não coberta, pare e registre o
bloqueio. Não inicie a próxima task.
```
