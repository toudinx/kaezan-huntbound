# PB-05-11 — Validar o combate no browser

**Status inicial:** pending

**Classe da tarefa:** verificação de comportamento observável em runtime real

**Modelo sugerido:** GPT-5.6 Luna `xhigh` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; a auditoria independente é PB-05-12

**Rota:** `superpowers:verification-before-completion`. Skills operacionais: `playbook-task`,
`run-gates`, `worktree-cycle`.

**Paralelismo:** não.

## Objetivo

Provar, no Chromium real, que a caçada funciona nos quatro viewports obrigatórios, que o browser
reproduz o mesmo SHA-256 que o Node, e que as specs novas são **estáveis sem depender de `retries`**.

## Resultado esperado

`docs/playbooks/PB-05/artifacts/browser-qa.md` com medições frescas, quatro screenshots versionadas e
a prova de estabilidade que a auditoria do PB-04 exigiu depois do defeito D1.

## Dependências

- PB-05-10 `done` e integrada, com `main` verde.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/STATE.md`;
3. `docs/playbooks/PB-04/artifacts/browser-qa.md`, o precedente e o formato;
4. `docs/playbooks/PB-04/artifacts/acceptance-report.md`, seção do defeito D1;
5. `tests/e2e/**` inteiro;
6. `playwright.config.ts`;
7. `apps/game/src/simulation/KernelProbe.ts` e `apps/game/src/hunt/HuntProbe.ts`.

## Decisões congeladas

- Viewports obrigatórios: `390 × 844`, `768 × 1024`, `1366 × 768` e `1920 × 1080`.
- **Toda spec nova é provada com `--retries=0 --repeat-each=10`.** Verde só com `retries: 1` é
  vermelho: foi exatamente o defeito D1.
- O `dist` precisa ser reconstruído antes de qualquer conclusão. `playwright test` direto serve
  bundle velho.
- Paridade de replay: `KernelProbe` no Chromium precisa produzir o mesmo SHA-256 do snapshot canônico
  que `tools/replay` produz no Node, para a fixture `pb-05-hunt-combat`.
- Console sem erro em todos os viewports.
- Screenshots versionadas em `docs/playbooks/PB-05/artifacts/screenshots/`.
- Esta task **não** conserta defeito de gameplay: ela mede e reporta.

## Escopo permitido

```text
tests/e2e/**
docs/playbooks/PB-05/artifacts/**
playwright.config.ts                        (somente se a mudança for justificada e não mascarar falha)
docs/playbooks/PB-05/STATE.md
```

## Fora de escopo

- `packages/**` e `apps/game/src/**` — defeito encontrado vira registro, não conserto de passagem;
- rebalancear combate;
- a auditoria integrada — PB-05-12.

## Execução

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-11-qa -b codex/pb-05-11-combat-browser-qa main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-11-qa install --prefer-offline
```

- [ ] **2. Escrever as specs de combate.**

Uma sessão dirigida que ataca, conjura as três habilidades, mata um rotworm, recebe loot e morre de
propósito. Cada asserção precisa observar comportamento, não a existência de elemento: barra que
desce, número que aparece, item que entra na bolsa, overlay que liga.

- [ ] **3. Buildar e rodar a suíte inteira.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-11-qa build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-11-qa exec playwright test
```

- [ ] **4. Provar estabilidade sem `retries`.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-11-qa exec playwright test --retries=0 --repeat-each=10
```

Uma única falha em `10` execuções é instabilidade, não azar. Se aparecer, **pare**: investigue a causa
e registre; não aumente timeout, não reintroduza retry, não afrouxe asserção.

- [ ] **5. Medir a paridade de replay.**

Rode a fixture `pb-05-hunt-combat` no Node e no Chromium e compare os SHA-256. Registre os dois
valores obtidos da execução real.

- [ ] **6. Capturar as screenshots nos quatro viewports.**

Uma por viewport, com combate visível — alvo destacado, barras e ao menos um número de dano ou corpo
no chão. Screenshot de tela parada sem combate não prova o que esta task existe para provar.

- [ ] **7. Medir orçamento de boot e console.**

Registre tempo de boot por viewport e confirme console sem erro. Compare com os números do PB-04 e
registre a variação.

- [ ] **8. Escrever o relatório de QA.**

`docs/playbooks/PB-05/artifacts/browser-qa.md`: ambiente, comandos com exit code, tabela por viewport,
paridade de hashes, resultado do `--repeat-each=10`, screenshots referenciadas, e uma seção explícita
de problemas encontrados e **não** corrigidos aqui.

- [ ] **9. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-11-qa exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-11-qa typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-11-qa qa:browser
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-11-qa verify
```

- [ ] **10. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-11-qa add tests docs
git -C C:\Kaezan\kaezan-huntbound-pb05-11-qa commit -m "test: prove combat in the browser"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb-05-11-combat-browser-qa
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-11-qa
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb-05-11-combat-browser-qa
```

## Verificação

Suíte verde; `--retries=0 --repeat-each=10` verde; paridade de hash confirmada; `qa:browser` e
`verify` verdes; `biome check .` em `0`.

## Critérios de aceite

- [ ] A sessão dirigida ataca, conjura as três habilidades, mata, recebe loot e morre — nos quatro
      viewports.
- [ ] As specs novas passam `10/10` com `--retries=0`.
- [ ] O Chromium reproduz o mesmo SHA-256 do Node para `pb-05-hunt-combat`, com os dois valores
      registrados da execução real.
- [ ] Console sem erro em todos os viewports.
- [ ] Quatro screenshots versionadas, todas com combate visível.
- [ ] Orçamento de boot medido e comparado com o PB-04.
- [ ] Problemas encontrados estão registrados, não corrigidos de passagem.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: alguma spec falhar em qualquer das `10` execuções; o hash do browser divergir do Node;
o console emitir erro; ou se passar exigir mexer em `packages/**` ou `apps/game/src/**` — nesse caso o
defeito pertence à task que o introduziu.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, resultados por viewport, hashes reais, comandos e exit
codes, modelo e effort usados, problemas registrados e a próxima task elegível.

## Commit

`test: prove combat in the browser`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb-05-11-combat-browser-qa`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-11-qa`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Ambiente, comandos com exit code, tabela por viewport, paridade de hashes, resultado do
`--repeat-each=10`, screenshots, problemas registrados, integração, limpeza e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh ou Grok 4.6 high.
Use obrigatoriamente superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-11-validar-combate-no-browser.md

Leia AGENTS.md, o STATE.md do playbook PB-05 e apenas os arquivos indicados pela task. Confirme que
PB-05-10 esta done e integrada e que main esta verde.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-11-qa com a branch
codex/pb-05-11-combat-browser-qa e rode "corepack pnpm install --prefer-offline" dentro dela.

Escreva specs de uma sessao dirigida que ataca, conjura as tres habilidades, mata um rotworm, recebe
loot e morre de proposito, nos viewports 390x844, 768x1024, 1366x768 e 1920x1080. Asserte
comportamento, nao existencia de elemento.

SEMPRE builde antes de rodar: o Playwright serve o dist pre-buildado.

Prove estabilidade com "playwright test --retries=0 --repeat-each=10". Uma falha em 10 e instabilidade:
PARE e registre. Nao aumente timeout, nao reintroduza retry, nao afrouxe assercao — foi assim que
nasceu o defeito D1 do PB-04.

Meça a paridade de replay: o Chromium tem que reproduzir o mesmo SHA-256 de pb-05-hunt-combat que o
Node. Registre os dois valores obtidos da execucao real.

Capture quatro screenshots com combate visivel, meça boot e console, e escreva
docs/playbooks/PB-05/artifacts/browser-qa.md com comandos, exit codes e uma secao explicita de
problemas encontrados e NAO corrigidos aqui.

Nao conserte defeito em packages/** nem apps/game/src/**: registre e devolva.

Rode biome check ., typecheck, qa:browser e verify. Atualize o handoff, commite, integre por
fast-forward na main, reverifique e limpe worktree e branch removendo o diretorio antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
