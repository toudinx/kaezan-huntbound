# PB-02-FIX-02 — Tornar o gate `verify` idempotente

**Status inicial:** pending

**Classe da tarefa:** correção de gate, bem especificada

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** GPT-5.6 Sol `xhigh` ou Claude Code/Opus 5

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion` +
`superpowers:using-git-worktrees`

**Branch-base:** `main`

**Branch temporária:** `codex/pb02-fix-02-verify-idempotence`

**Worktree temporária:** `C:\Kaezan\kaezan-huntbound-pb02-fix-02-verify-idempotence`

**Integração:** `git merge --ff-only`; verificação completa em `main`; remoção da worktree e da
branch após sucesso.

**Paralelismo:** não. Depende de PB-02-FIX-01 integrada, porque as duas tocam `STATE.md` e o
`acceptance-report.md`.

**Origem:** BLOCKER-2 da auditoria PB-02-07, registrado em
`docs/playbooks/PB-02/artifacts/acceptance-report.md`.

## Objetivo

Fazer `corepack pnpm verify` produzir o mesmo resultado em execuções consecutivas, sem afrouxar
nenhuma regra do Biome e sem esconder erro de formatação real.

## Contexto medido em 2026-08-13

`biome.json` exclui `apps/game/public/assets/personal` e
`packages/test-fixtures/assets/pb02/expected`, mas **não** exclui
`apps/game/public/assets/test` nem `apps/game/public/assets/product`.

`pnpm test` e `pnpm build` executam `assets:stage:test`, e `format:check` é o **primeiro** passo de
`verify`. Então a primeira execução passa sobre uma árvore sem saídas staged, cria essas saídas, e a
segunda execução encontra o JSON canônico gerado e reprova.

Prova fresca, sem nenhuma alteração de fonte entre as duas execuções:

```text
[saídas staged removidas]
pnpm verify (execução 1) -> exit 0
pnpm verify (execução 2) -> exit 1
  apps/game/public/assets/test/catalog.json                            format ×
  apps/game/public/assets/test/packs/pb-02-contract-coverage/pack.json format ×
  Found 4 errors   (com product staged também)
```

Os arquivos reprovados são saída gerada pelo packer em JSON canônico — ordenação determinística,
UTF-8, LF, uma linha. Não são fonte, não são versionados e são reconstruíveis. O `personal` e o
golden `expected`, que são exatamente a mesma classe de artefato, já estão excluídos.

Os handoffs de PB-02-05 e PB-02-06 registram `verify` exit 0 porque cada um rodou o gate uma única
vez sobre uma árvore em que essas saídas ainda não existiam.

## Decisão congelada

Excluir `apps/game/public/assets/test` e `apps/game/public/assets/product` de `files.includes` no
`biome.json`, ficando consistente com `personal` e `expected`.

Isto **não** é afrouxar regra para esconder erro real. O critério é: o Biome não formata saída
gerada por ferramenta. As quatro entradas passam a formar uma política única e explicável, em vez de
duas exclusões arbitrárias e duas omissões.

A alternativa — mandar o packer emitir JSON no estilo do Biome — foi descartada: o formato canônico é
contrato de determinismo do pack, entra no cálculo de `pack.sha256` e mudá-lo invalidaria o golden
versionado e os hashes congelados em toda a documentação do PB-02.

## Resultado esperado

`corepack pnpm verify` termina em exit 0 duas vezes seguidas, sem limpeza manual entre as execuções,
tanto em checkout novo quanto em árvore já usada.

## Escopo permitido

```text
biome.json
docs/playbooks/PB-02/STATE.md
docs/playbooks/PB-02/artifacts/acceptance-report.md
```

## Fora de escopo

- alterar regras, severidades ou `files.maxSize` do Biome;
- excluir do Biome qualquer path que contenha fonte versionada;
- alterar o formato canônico do packer, o golden ou qualquer hash congelado;
- alterar scripts de `package.json`, runtime, testes ou `playwright.config.ts`;
- fechar PB-02 ou declarar PB-03 elegível.

## Passos

- [ ] **0. Criar a worktree isolada,** com a raiz principal limpa, em `main`, e com PB-02-FIX-01 já
  integrada.

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb02-fix-02-verify-idempotence -b codex/pb02-fix-02-verify-idempotence main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-fix-02-verify-idempotence install --frozen-lockfile
```

- [ ] **1. RED.** Com as saídas staged removidas, rodar `verify` duas vezes e registrar exit 0 depois
  exit 1, com a lista exata dos arquivos reprovados. As duas execuções não podem ter nenhuma
  alteração de fonte entre si.

- [ ] **2. Confirmar a classe dos arquivos reprovados.** Provar que cada um é saída gerada e
  ignorada, não fonte:

```powershell
git -C <worktree> ls-files apps/game/public/assets
git -C <worktree> status --short --ignored -- apps/game/public/assets
```

  O primeiro deve sair vazio. Se algum arquivo reprovado for versionado, **pare**: aí é defeito de
  formatação real e esta task não se aplica.

- [ ] **3. GREEN.** Acrescentar as duas exclusões a `files.includes` em `biome.json`, mantendo a
  ordem e o estilo das entradas existentes.

- [ ] **4. Provar a idempotência.** Sem limpeza manual entre as execuções:

```powershell
corepack pnpm --dir <worktree> verify
corepack pnpm --dir <worktree> verify
```

  Ambas em exit 0. Registrar as contagens de testes das duas.

- [ ] **5. Provar em checkout limpo.** Remover as saídas geradas allowlisted, validando o path
  absoluto antes de qualquer remoção, e repetir a dupla execução. O resultado deve ser idêntico.

- [ ] **6. Provar que nenhuma fonte saiu do alcance do Biome.** Confirmar que as exclusões cobrem
  somente saída gerada:

```powershell
corepack pnpm --dir <worktree> exec biome check .
```

  Comparar a contagem de arquivos checados antes e depois da mudança e explicar a diferença — ela
  deve corresponder exatamente aos arquivos gerados, e a nenhum arquivo versionado.

- [ ] **7. Atualizar `STATE.md`** e a seção de blockers do `acceptance-report.md`, marcando
  BLOCKER-2 como resolvido com evidência fresca. Não altere a decisão `REJECTED` do relatório: ela é
  o registro histórico daquela auditoria.

- [ ] **8. Commit.**

```powershell
git -C <worktree> add biome.json docs/playbooks/PB-02/STATE.md docs/playbooks/PB-02/artifacts/acceptance-report.md
git -C <worktree> diff --cached --check
git -C <worktree> commit -m "build: exclude generated asset profiles from format check"
```

- [ ] **9. Integrar, verificar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb02-fix-02-verify-idempotence
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
git -C C:\Kaezan\kaezan-huntbound merge-base --is-ancestor codex/pb02-fix-02-verify-idempotence main
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb02-fix-02-verify-idempotence
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb02-fix-02-verify-idempotence
```

  As **duas** execuções de `verify` em `main` devem terminar em exit 0.

## Critérios de aceite

- [ ] O RED está registrado: `verify` exit 0 seguido de exit 1, sem alteração de fonte.
- [ ] Todo arquivo reprovado foi provado como saída gerada e não rastreada.
- [ ] `corepack pnpm verify` passa duas vezes seguidas sem limpeza manual.
- [ ] O mesmo resultado vale a partir de saídas geradas removidas.
- [ ] Nenhuma regra, severidade ou `files.maxSize` do Biome foi alterada.
- [ ] Nenhum path com fonte versionada foi excluído do Biome.
- [ ] O formato canônico do packer, o golden e os hashes congelados estão inalterados.
- [ ] O diff contém somente o escopo permitido.
- [ ] Integrado em `main` por fast-forward, com `verify` verde **duas vezes** no resultado integrado.

## Condições de parada

Se algum arquivo reprovado por `format:check` for versionado, pare: o achado é defeito de formatação
real e não se resolve por exclusão. Se `verify` continuar não idempotente depois da mudança, a causa
é outra — investigue e reporte em vez de acrescentar exclusões até o gate ficar verde. Não feche o
playbook.

## Handoff

Ao concluir, com PB-02-FIX-01 e PB-02-FIX-02 integradas, a próxima etapa é **reexecutar integralmente
a matriz do PB-02-07** em worktree nova a partir de `main` limpa. PB-02 continua **aberto** e PB-03
**não** elegível até que essa reauditoria decida `APPROVED` ou `APPROVED_WITH_WARNINGS`. O corretor
não fecha o playbook que ele mesmo corrigiu.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound.

Use GPT-5.6 Luna com effort xhigh. Use obrigatoriamente superpowers:test-driven-development,
superpowers:using-git-worktrees e superpowers:verification-before-completion.

Execute integralmente e somente a task:
docs/playbooks/PB-02/tasks/PB-02-FIX-02-tornar-o-gate-verify-idempotente.md

Contexto: corepack pnpm verify não é idempotente. biome.json exclui
apps/game/public/assets/personal e packages/test-fixtures/assets/pb02/expected, mas não exclui
apps/game/public/assets/test nem apps/game/public/assets/product. Como pnpm test e pnpm build fazem
stage dessas saídas e format:check é o primeiro passo de verify, a primeira execução passa e a
segunda reprova nos JSON canônicos gerados. Provado: execução 1 exit 0, execução 2 exit 1.

Comece pelo RED: remova as saídas staged, rode verify duas vezes e registre exit 0 depois exit 1 com
a lista exata dos arquivos. Antes de mudar qualquer coisa, prove que todo arquivo reprovado é saída
gerada e não rastreada com git ls-files. Se algum for versionado, pare e reporte.

A correção é acrescentar as duas exclusões em files.includes do biome.json. Não altere regras,
severidades nem files.maxSize, não exclua nenhum path que contenha fonte versionada, e não mexa no
formato canônico do packer, no golden nem em qualquer hash congelado.

Termine com verify em exit 0 duas vezes seguidas sem limpeza manual, STATE.md e a seção de blockers
do acceptance-report.md atualizados marcando BLOCKER-2 resolvido, e o commit
"build: exclude generated asset profiles from format check". Depois integre por git merge --ff-only,
rode verify DUAS vezes em main e só então remova worktree e branch.

Não feche PB-02 e não declare PB-03 elegível: isso exige uma reexecução completa da matriz PB-02-07.
```
