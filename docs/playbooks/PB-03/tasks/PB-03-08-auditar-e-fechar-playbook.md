# PB-03-08 — Auditar e fechar o playbook

**Status inicial:** pending

**Classe da tarefa:** auditoria integrada e fechamento — sem implementação

**Modelo sugerido:** Claude Code/Opus 5; fallback GPT-5.6 Sol `xhigh`

**Validador sugerido:** modelo diferente do auditor quando houver decisão ambígua

**Rota:** `superpowers:using-git-worktrees` + `superpowers:verification-before-completion`.

**Paralelismo:** não. É a última task e exige PB-03-01 a PB-03-07 integradas.

## Objetivo

Executar do zero a matriz de aceite do PB-03 sobre uma árvore limpa, guardar evidências
reproduzíveis, confirmar determinismo, fronteiras e paridade de runtime, e fechar o playbook sem
corrigir código durante a auditoria.

## Resultado esperado

Um relatório versionado mapeia cada critério a comando e evidência. Com tudo verde, README, STATE e
roteiro marcam PB-03 fechado e PB-04 elegível. Qualquer falha de produto abre blocker explícito e
encerra a task sem alteração de implementação.

## Dependências e leitura mínima

1. todas as task cards, `README.md`, `STATE.md` e a spec aprovada;
2. `docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`;
3. commits e relatórios de PB-03-01 a PB-03-07;
4. `package.json`, `tools/replay`, `tools/architecture`, fixtures e E2E integrados;
5. padrão de fechamento em `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

As sete tasks anteriores devem estar integradas em `main`, sem branches em disputa e com workspace
limpo antes do início. O auditor não pode ser quem implementou PB-03-06.

## Decisões congeladas

- Esta task é read-only para código, contratos, fixtures, golden e testes.
- Somente relatório e documentos de estado/índice podem mudar.
- Golden divergente é blocker, nunca motivo para regenerar.
- Determinismo exige duas execuções independentes com bytes idênticos, não apenas hashes iguais
  reportados pela própria ferramenta.
- A prova de retomada usa o snapshot intermediário em `117` e compara o snapshot final e a cauda de
  eventos.
- A prova de sensibilidade altera seed, comando e `rulesVersion` em cópias temporárias, nunca nos
  arquivos versionados.
- A paridade browser × Node é obrigatória; divergência é `REJECTED`.
- Falhas negativas são sucesso apenas quando retornam o código tipado e preservam o estado esperado.
- Warnings só fecham o playbook se forem não-risco, explicados e sem critério pendente.

## Escopo permitido

```text
docs/playbooks/PB-03/artifacts/acceptance-report.md
docs/playbooks/PB-03/README.md
docs/playbooks/PB-03/STATE.md
docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md
docs/README.md
```

## Fora de escopo

- editar código, schema, testes, fixtures ou config para fazer um gate passar;
- regenerar e commitar golden durante a auditoria;
- relaxar comparação, tolerância ou timeout para acomodar divergência;
- ignorar falha por ser “somente local”;
- iniciar PB-04;
- limpar alterações preexistentes do usuário.

## Estrutura obrigatória do relatório

`acceptance-report.md` deve conter:

1. data, commit auditado, SO, Node, pnpm e browser;
2. estado inicial e confirmação de árvore limpa;
3. matriz `critério | comando/prova | resultado | evidência curta`;
4. os quatro SHA-256 da fixture e o hash do snapshot final;
5. resultado das duas execuções independentes do replay;
6. resultado da prova de retomada em `117`;
7. códigos observados em cada prova negativa e de sensibilidade;
8. resultado da paridade browser × Node, com o hash observado no Chromium;
9. prova de que o kernel não referencia relógio, aleatoriedade global, Node, DOM ou Phaser;
10. warnings e blockers;
11. decisão final `APPROVED`, `APPROVED_WITH_WARNINGS` ou `REJECTED`.

Não copiar logs extensos. Registrar comando, exit code, resumo objetivo e hash quando aplicável.

## Plano de execução

### 1. Preparar worktree de auditoria

```powershell
git -C C:\Kaezan\kaezan-huntbound status --short
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate -b codex/pb03-08-integrated-gate main
git -C C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate rev-parse HEAD
git -C C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate status --short
node --version
corepack pnpm --version
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate install --frozen-lockfile
```

Criar o esqueleto do relatório. Se a origem estiver suja, registrar `REJECTED` e parar; não guardar,
apagar ou sobrescrever alterações alheias.

### 2. Provar contratos e testes unitários

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate --filter @huntbound/contracts test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate --filter @huntbound/simulation typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate exec tsc --project tools/replay/tsconfig.json --noEmit
```

Confirmar que os vetores golden de RNG, a tabela de custo diagonal e a precedência das causas de
bloqueio existem como teste, e não apenas como documentação.

### 3. Provar isolamento do kernel

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate architecture:check
git -C C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate grep -n -I -E "Date|performance|Math\.random|setTimeout|setInterval|queueMicrotask|crypto|globalThis|process" -- packages/simulation/src
```

O `grep` deve retornar vazio fora de comentário explicativo. Usar os helpers dos próprios testes de
arquitetura para provar, em diretório temporário, que um arquivo do kernel com `Date.now()`, com
`Math.random()` e com import externo faz `simulation-boundaries` falhar, e que o kernel real passa.
Nenhum arquivo tracked pode sobrar dessas provas.

Confirmar também que `packages/simulation/package.json` não declara dependência e que
`tsconfig.json` do pacote não inclui `DOM` em `lib`.

### 4. Provar determinismo por duas execuções independentes

Executar `tools/replay/cli.ts run` para dois diretórios temporários distintos dentro de
`.cache/replay/audit-a` e `audit-b`. Calcular SHA-256 de cada arquivo produzido, ordenar
ordinalmente e comparar as duas listas. Exigir:

- mesmos arquivos relativos;
- mesmos hashes byte a byte;
- igualdade byte a byte com os golden versionados;
- nenhum timestamp, path absoluto ou separador Windows dentro do JSON.

Depois remover somente esses dois diretórios, resolvendo cada path com `Resolve-Path` e confirmando
que ele começa pelo worktree de auditoria e termina exatamente no caminho esperado.

### 5. Provar retomada por snapshot

Executar `0→200` direto e, em seguida, `0→117`, salvar o snapshot intermediário, restaurar e
executar `117→200`. Exigir snapshot final byte-idêntico e cauda de eventos idêntica a partir do tick
117, incluindo `sequence` de evento contínuo. Registrar o hash do snapshot intermediário.

### 6. Executar provas negativas e de sensibilidade

Em cópias temporárias da fixture, nunca nos arquivos versionados:

| Prova | Resultado exigido |
|---|---|
| um bit alterado na seed do header | exit 1 com `SIM_REPLAY_DIVERGED` |
| um comando alterado no log | exit 1 com `SIM_REPLAY_DIVERGED` |
| `rulesVersion` incrementada | exit 1 com `SIM_VERSION_MISMATCH` |
| `scenarioRevision` alterada | exit 1 com `SIM_SCENARIO_MISMATCH` |
| JSON malformado no cenário | exit 2 com `SIM_SCHEMA_INVALID` |
| `sequence` não crescente no log | exit 2 com diagnóstico de log |
| float injetado no snapshot esperado | `SIM_STATE_NOT_INTEGER` |
| comando para entidade inexistente no log | `command/rejected` no journal, estado inalterado |
| comando de `player` com tipo `scenario/*` | `SIM_COMMAND_FORBIDDEN` |

Registrar código observado e preservação de estado em cada caso.

### 7. Provar paridade de runtime

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate --filter @huntbound/game build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate exec playwright test tests/e2e/kernel-replay.spec.ts
```

Exigir snapshot canônico do Chromium byte-idêntico ao golden, mesmo SHA-256, `finalTick` igual a 200
e ausência de erro de console, página ou rede. Confirmar por inspeção que o probe do kernel não é
instalado fora do modo `test`.

### 8. Provar que nenhuma regra vazou para o app

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate grep -n -I -E "stepCooldown|diagonal|nextBelow|TICK_DURATION_MS" -- apps/game/src ':(exclude)**/*.test.ts'
```

Somente o host de simulação pode referenciar `TICK_DURATION_MS`, e ainda assim importando do
contrato. Qualquer constante de regra duplicada ou decisão de movimento em `apps/game` é blocker.

### 9. Executar o gate raiz duas vezes

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate verify
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate verify
git -C C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate diff --check
git -C C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate status --short
```

As duas execuções devem sair em 0 e a árvore deve permanecer limpa, conforme a idempotência exigida
desde PB-02-FIX-02. Se qualquer gate falhar, finalizar o relatório como `REJECTED`, registrar o
próximo ID `PB-03-FIX-01`, não alterar código e não fechar o playbook.

### 10. Fechar documentação somente após aprovação

Se todos os critérios estiverem satisfeitos:

- concluir `acceptance-report.md` com `APPROVED` ou `APPROVED_WITH_WARNINGS`;
- marcar as oito tasks `done` em `STATE.md` e PB-03 `closed`;
- atualizar o README com commit auditado e link do relatório;
- marcar PB-03 fechado e PB-04 elegível no roteiro/índice;
- verificar que o diff contém somente o escopo permitido.

Então commitar:

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate add docs/playbooks/PB-03/artifacts/acceptance-report.md docs/playbooks/PB-03/README.md docs/playbooks/PB-03/STATE.md docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md docs/README.md
git -C C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate commit -m "docs: close PB-03 deterministic kernel gate"
```

### 11. Integrar e reconfirmar em `main`

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb03-08-integrated-gate
corepack pnpm --dir C:\Kaezan\kaezan-huntbound simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
git -C C:\Kaezan\kaezan-huntbound status --short
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb03-08-integrated-gate
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb03-08-integrated-gate
```

Se a reconfirmação falhar, reverter apenas o fechamento documental por commit explícito ou abrir
`PB-03-FIX-01`; não declarar PB-04 elegível.

## Critérios de aceite

- [ ] A auditoria começou de `main` limpo e commit identificado.
- [ ] Contratos, RNG, grid, comandos, tick e replay passam com evidência fresca.
- [ ] `simulation-boundaries` falha para relógio, aleatoriedade global e import externo, e o kernel
      real passa.
- [ ] Duas execuções independentes do replay produzem bytes idênticos e batem com o golden.
- [ ] A retomada em `117` converge para o mesmo snapshot final e a mesma cauda de eventos.
- [ ] Todas as provas negativas e de sensibilidade retornam o código esperado.
- [ ] O Chromium produz o mesmo snapshot canônico e o mesmo SHA-256 que o Node.
- [ ] Nenhuma regra de simulação existe em `apps/game`.
- [ ] `verify` passa duas vezes seguidas no worktree e novamente em `main` após a integração.
- [ ] O relatório mapeia todos os critérios a evidências.
- [ ] O fechamento altera somente documentação permitida.

## Handoff final

O relatório final deve informar decisão, commit auditado, commit de fechamento, gates, warnings,
blockers e elegibilidade de PB-04. `PB-04` só fica elegível com `APPROVED` ou
`APPROVED_WITH_WARNINGS` sem risco de produto; `REJECTED` mantém PB-03 aberto e aponta a primeira
task corretiva.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Claude Code/Opus 5; se indisponível, use GPT-5.6 Sol
xhigh e registre o desvio. Leia integralmente
docs/playbooks/PB-03/tasks/PB-03-08-auditar-e-fechar-playbook.md, todas as cards, README, STATE, a
spec e os documentos em docs/simulation. Use superpowers:using-git-worktrees e
superpowers:verification-before-completion.

Execute somente a auditoria PB-03-08 no worktree e branch exatos codex/pb03-08-integrated-gate
criados a partir de main limpa. Não altere implementação, schemas, fixtures, golden, testes ou
config. Execute a matriz completa: contratos, isolamento do kernel, duas execuções independentes do
replay, retomada por snapshot em 117, provas negativas e de sensibilidade, paridade browser × Node,
ausência de regra em apps/game e verify duas vezes seguidas.

Produza docs/playbooks/PB-03/artifacts/acceptance-report.md. Se algum critério falhar, marque
REJECTED, registre PB-03-FIX-01 e pare sem fechar o playbook. Se tudo passar, atualize somente os
cinco paths documentais permitidos, crie o commit "docs: close PB-03 deterministic kernel gate",
integre por git merge --ff-only, reexecute os gates pós-integração e só então remova worktree/branch
e declare PB-04 elegível. Não inicie PB-04.
```
