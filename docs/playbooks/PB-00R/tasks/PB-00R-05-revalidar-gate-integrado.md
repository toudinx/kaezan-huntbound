# PB-00R-05 — Revalidar gate integrado

**Status inicial:** pending

**Classe da tarefa:** auditoria e validação crítica

**Modelo sugerido:** GPT-5.6 Sol `xhigh` ou Claude Opus 5

**Validador sugerido:** modelo frontier diferente dos principais implementadores e, preferencialmente,
diferente do usado em PB-00R-02

**Rota:** `game-studio:game-playtest` + `game-studio:web-game-foundations` +
`superpowers:verification-before-completion`

**Paralelismo:** não. É a última task e exige PB-00R-01/02/03/04 integradas.

## Objetivo

Auditar o resultado integrado com evidência fresca e decidir se PB-01 pode voltar a ser elegível.
Esta task não corrige silenciosamente defeitos funcionais.

## Resultado esperado

`acceptance-report.md` termina em `APPROVED`, `APPROVED_WITH_WARNINGS` ou `BLOCKED`. Warning exige
evidência, impacto descrito e follow-up priorizado, mas não impede a próxima iteração. `BLOCKED` é
reservado a risco grave que impeça validar o produto.

## Dependências

- PB-00R-01, PB-00R-02, PB-00R-03 e PB-00R-04 integradas em `main` ou branch de integração.
- `STATE.md` contém commits e modelos usados nas quatro tasks.
- Working tree limpa, porta 4173 livre e nenhum agente concorrente editando o checkout.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-00R/README.md` completo;
3. `docs/playbooks/PB-00R/STATE.md`;
4. `docs/playbooks/PB-00R/artifacts/acceptance-report.md`;
5. as quatro task cards e diffs de seus commits;
6. `docs/08_POLITICA_MODELOS_AGENTES.md`;
7. `package.json`, manifests, Vite e Playwright config;
8. arquivos de teste/runtime alterados pelas quatro tasks.

## Decisões congeladas

- Evidência fresca vence relatos anteriores.
- Só bloqueiam: build ou boot inviável; fluxo essencial inutilizável; crash; corrupção/perda de
  dados; risco de segurança; ou impedimento concreto da próxima iteração.
- Performance, flakiness diagnóstica, polish e dívida técnica sem impacto grave são warnings e não
  podem impedir sozinhos o avanço do produto.
- O alvo saudável de boot permanece em 5.000 ms. Entre 5.000 e 30.000 ms é warning aceito pela
  decisão de produto de 2026-08-11; acima de 30.000 ms ou sem shell acionável bloqueia.
- Retry, throttling, worker e cache não podem ser afrouxados.
- Defeito funcional bloqueia e vira nova task; o fechamento só corrige relatório/estado.
- O aviso de chunk Phaser acima de 500 kB permanece limite conhecido fora de escopo.
- PB-01 só é liberado pelo commit aprovado desta task.

## Escopo permitido

```text
docs/playbooks/PB-00R/README.md
docs/playbooks/PB-00R/STATE.md
docs/playbooks/PB-00R/artifacts/acceptance-report.md
docs/playbooks/PB-00R/tasks/PB-00R-FIX-*.md
docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md
docs/README.md
```

Implementação só pode mudar em task corretiva separada com red-green.

## Fora de escopo

- iniciar PB-01;
- refatorar runtime, testes ou toolchain durante o fechamento;
- code splitting, polish visual, PWA, gameplay ou multi-browser;
- reduzir critérios para obter aprovação.

## Auditoria obrigatória

- [ ] **1. Confirmar histórico, modelos e árvore inicial.**

```text
git status --porcelain=v1 --untracked-files=all
git log --oneline --decorate -15
git diff --check
```

Saída inicial de status deve estar vazia. Confirme os quatro commits, implementadores, efforts e
validadores registrados.

- [ ] **2. Provar instalação e lockfile.**

Registre SHA-256 antes e depois:

```text
Get-FileHash pnpm-lock.yaml -Algorithm SHA256
corepack pnpm install --frozen-lockfile
Get-FileHash pnpm-lock.yaml -Algorithm SHA256
```

Hashes devem ser idênticos.

- [ ] **3. Executar gate canônico completo.**

```text
corepack pnpm verify
```

Registre exit code, quantidade de testes unitários/arquiteturais, quantidade E2E, duração do boot e
warnings. Classifique cada falha pela severidade congelada acima. Falha não grave vira warning com
evidência e follow-up; falha grave bloqueia. Para a assertion conhecida de 5.000 ms, aceite somente
quando o anexo comprovar shell acionável em até 30.000 ms. Execute os demais gates isoladamente para
provar que uma falha anterior não mascarou outro resultado.

- [ ] **4. Revalidar resize visual na mesma sessão.**

Execute o teste `redraws the playfield after in-session viewport changes` sem atualizar snapshots.
Abra `shell-mobile-to-desktop-win32.png` no tamanho original e confirme grade completa, intensidade
uniforme, canvas/overlay únicos e centro livre.

- [ ] **5. Revalidar cinco boots em processos frios.**

```powershell
$bootRuns = 1..5 | ForEach-Object {
  $run = $_
  corepack pnpm exec playwright test tests/e2e/boot-budget.spec.ts --workers=1
  [pscustomobject]@{ Run = $run; ExitCode = $LASTEXITCODE }
}
$bootRuns | Format-Table
```

Registre os cinco marks e paths/nomes dos anexos JSON. Marks até 5.000 ms passam sem ressalva; marks
entre 5.000 e 30.000 ms são warnings aceitos e não encerram a coleta. Acima de 30.000 ms, shell não
acionável, anexo ausente ou qualquer erro diferente da assertion de duração bloqueia a auditoria.
Não conte nova execução do mesmo índice como retry.

- [ ] **6. Revalidar descoberta de testes.**

Inspecione os sete manifests e o teste de configuração. Execute `corepack pnpm test`; confirme que
os 33 testes existentes e todos os scripts de packages são percorridos, sem specs Playwright.

Crie o probe temporário especificado em PB-00R-03, execute novamente e confirme 34 testes; remova o
probe e confirme retorno a 33. O probe não entra no commit.

- [ ] **7. Revalidar limite da limpeza do output.**

Crie sentinela dentro de `dist/game` e sentinela irmã em `dist/`, após resolver ambos os paths
absolutos. Execute build e confirme que somente a interna é removida. Remova a sentinela irmã
específica ao terminar. Confirme ausência do warning de output externo não limpo.

- [ ] **8. Revalidar arquitetura, escopo e tracking.**

```text
corepack pnpm architecture:check
git ls-files
git diff --check
git status --short
```

Confirme ausência de `references/`, `.obsidian/`, secrets, reports, builds e probes rastreados. Busque
gameplay, Canary runtime, IndexedDB, backend, service worker e gacha nos diffs PB-00R.

- [ ] **9. Atualizar decisão documental.**

Se não houver risco grave:

- marque os critérios do `README.md`;
- altere `STATE.md` para `done` e `acceptance-report.md` para `APPROVED` ou
  `APPROVED_WITH_WARNINGS`;
- registre comandos, exits, contagens, cinco marks, screenshot, hash do lockfile, modelos e limites;
- para cada warning, registre evidência, impacto, gatilho de reabertura e follow-up priorizado;
- altere o roteiro e índice para PB-01 elegível, sem iniciar PB-01.

Somente se houver risco grave, preserve `BLOCKED`, crie `PB-00R-FIX-<NN>-<slug>.md` e não libere
PB-01. Não transforme warnings em bloqueios por perfeccionismo de base.

- [ ] **10. Commit de fechamento.**

```text
git diff --check
git status --short
git add docs/playbooks/PB-00R/README.md docs/playbooks/PB-00R/STATE.md docs/playbooks/PB-00R/artifacts/acceptance-report.md docs/playbooks/PB-00R/tasks docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md docs/README.md
git commit -m "docs: close PB-00R foundation repairs"
```

## Critérios de aceite

- [ ] Todos os critérios finais do README possuem evidência fresca e cada desvio está classificado
  como warning ou blocker pela severidade definida nesta task.
- [ ] Instalação e gates não alteram lockfile.
- [ ] Resize pós-boot foi testado e screenshot aberta no tamanho original.
- [ ] Cinco processos frios consecutivos alcançam o shell em até 30.000 ms, com ocorrências acima
  de 5.000 ms registradas como warnings.
- [ ] Probe temporário prova descoberta e é removido.
- [ ] Limpeza remove somente o output interno.
- [ ] Nenhum conteúdo posterior ou artifact temporário está rastreado.
- [ ] Modelo de validação difere dos implementadores quando disponível.
- [ ] PB-01 só é declarado elegível após commit aprovado.

## Condições de parada

Ausência de evidência impede classificar o achado, mas `BLOCKED` exige risco grave reproduzido. O boot
entre 5.000 e 30.000 ms com shell e métricas presentes é warning conhecido. Outros desvios não graves
também podem terminar em `APPROVED_WITH_WARNINGS` quando tiverem impacto e follow-up registrados.
Não implemente correções nesta task e não use retry para transformar falha em aprovação.

## Relatório final

Comece com `APPROVED`, `APPROVED_WITH_WARNINGS` ou `BLOCKED`; liste commits auditados,
modelos/efforts, comandos/exits, contagens, cinco marks, screenshot, lockfile, limites, warnings,
follow-ups, commit final e elegibilidade de PB-01.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound.

Use GPT-5.6 Sol com effort xhigh ou Claude Opus 5. Escolha, quando disponível, o modelo diferente do
usado nas principais implementações e em PB-00R-02. Use obrigatoriamente as skills
game-studio:game-playtest, game-studio:web-game-foundations e
superpowers:verification-before-completion.

Execute integralmente e somente a task:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-00R\tasks\PB-00R-05-revalidar-gate-integrado.md

Antes de começar, confirme que PB-00R-01, PB-00R-02, PB-00R-03 e PB-00R-04 estão integradas, que a
working tree está limpa, que a porta 4173 está livre e que nenhum outro agente edita este checkout.

Esta é uma auditoria independente: não corrija runtime silenciosamente. Execute instalação frozen,
verify, resize visual, cinco processos frios, probe temporário de descoberta, prova limitada de
limpeza, arquitetura, tracking e escopo. Abra a screenshot no tamanho original. Evidência fresca
vence relatos anteriores. Classifique achados por severidade: warnings não impedem evolução;
somente risco grave reproduzido mantém BLOCKED e cria task corretiva separada.

Se tudo passar, atualize README.md, STATE.md, acceptance-report.md, roteiro e índice, libere PB-01 sem
iniciá-lo e crie o commit docs: close PB-00R foundation repairs. Encerre com APPROVED,
APPROVED_WITH_WARNINGS ou BLOCKED, evidências completas, modelo/effort e hash do commit.
```
