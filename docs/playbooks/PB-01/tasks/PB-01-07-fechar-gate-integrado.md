# PB-01-07 — Auditar e fechar o gate integrado do PB-01

**Status inicial:** pending

**Classe da tarefa:** auditoria e validação final

**Modelo sugerido:** Claude Opus 5; fallback GPT-5.6 Sol `xhigh`

**Validador sugerido:** modelo frontier diferente do executor

**Rota:** `game-studio:web-game-foundations` + `superpowers:verification-before-completion`.

**Paralelismo:** não. Última task serial.

## Objetivo

Revalidar o PB-01 integrado com evidência fresca, provas controladas e revisão do catálogo gerado.
Fechar somente se curadoria, identidade, integridade, determinismo, isolamento e gate raiz estiverem
comprovados; liberar PB-02 sem implementar assets.

## Resultado esperado

`artifacts/acceptance-report.md` mapeia cada critério a comando/artefato. `STATE.md` e o roteiro
registram PB-01 `done` e PB-02 elegível somente quando o veredito for `APPROVED` ou
`APPROVED_WITH_WARNINGS` sem risco concreto para PB-02.

## Dependências e leitura mínima

1. esta task, `README.md` e `STATE.md`;
2. spec PB-01;
3. mappings, selection, identity policy e catálogo gerado;
4. manifests, migrations, operações e source lock;
5. testes/CLI PB-01;
6. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`.

PB-01-01 a PB-01-06 devem estar integradas na `main`, com árvore limpa.

## Decisões congeladas

- Auditoria não redesenha schema nem amplia conteúdo.
- Falha de source lock, FK, rollback, órfão, idempotência, byte identity, runtime boundary ou
  `verify` é bloqueante até causa/resolução explícita.
- Warning só é aceitável se não comprometer PB-02, possuir evidência, impacto, owner e gatilho de
  reabertura.
- Evidência histórica não substitui comandos desta task.
- Nenhum arquivo Canary real entra no commit de fechamento.

## Escopo permitido

```text
docs/playbooks/PB-01/artifacts/acceptance-report.md
docs/playbooks/PB-01/README.md
docs/playbooks/PB-01/STATE.md
docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md
```

Código só pode mudar por uma task `PB-01-FIX-01` separada se a auditoria encontrar defeito; esta
task registra e para, não absorve correção funcional.

## Execução da auditoria

- [ ] **1. Criar branch `codex/pb01-07-integrated-gate` e worktree
  `C:\Kaezan\kaezan-huntbound-pb01-07-integrated-gate` a partir da `main`.**
- [ ] **2. Confirmar baseline.** Registre `git status`, log PB-01, versões Node/pnpm, hash do lockfile,
  commit Canary, source paths e ausência de processos que disputem porta 4173.
- [ ] **3. Instalação congelada e reconstrução limpa.** Remova somente a cache específica
  `.cache/content-catalog` após validar o path dentro da worktree. Execute:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm content:canary:check
corepack pnpm content:catalog:rebuild
corepack pnpm content:catalog:validate
corepack pnpm content:generate:check
```

- [ ] **4. Provar determinismo.** Copie os bytes/hash gerados para diretório temporário, remova a
  cache específica, reconstrua e compare SHA-256 e bytes. A segunda geração deixa Git sem diff.
- [ ] **5. Provas controladas sem editar fontes reais.** Em temporários, demonstre e reverta:
  - hash de source lock alterado falha;
  - sexta raiz no slice falha;
  - loot sem item falha por FK/diagnóstico;
  - entidade sem slice falha como órfã;
  - nó Lua não allowlisted falha com linha/coluna;
  - segunda aplicação da mesma operação mantém row counts/hashes.
- [ ] **6. Auditar catálogo/documentação.** Confirme roots Knight/Berserk/Rotworm/Amazon/Orc Shaman,
  Snake como dependência, todos os itens alcançáveis, zero extras/órfãos, GUIDs/stable keys únicos e
  documentação alinhada ao JSON por query/gerador.
- [ ] **7. Auditar licença e boundaries.** Execute:

```powershell
git ls-files references
git check-ignore references/canary/data/XML/vocations.xml
rg -n "references/canary|\.lua|\.xml|better-sqlite3|node:fs" apps/game packages/simulation packages/content/src/runtime
corepack pnpm architecture:check
```

Primeiro comando e busca em runtime não retornam violações; `git check-ignore` confirma exclusão.

- [ ] **8. Executar gate raiz completo.** Reserve a porta 4173 e rode uma vez:

```powershell
corepack pnpm verify
git diff --check
git status --short
```

- [ ] **9. Produzir relatório.** Para cada critério do README, registre evidência, exit code,
  contagens, hash e veredito. Inclua modelos/effort, divergências e riscos remanescentes.
- [ ] **10. Fechar somente se permitido.** Em `APPROVED`, marque todos os critérios, `STATE done`,
  PB-02 elegível e transforme a linha PB-01 do roteiro em link/status fechado. Em bloqueio, deixe
  PB-01 aberto, crie apenas a referência da task FIX necessária e registre dados para executá-la.
- [ ] **11. Commit, integração e limpeza.** Commit aprovado:
  `docs: close PB-01 curated content gate`. Faça fast-forward na `main`, reexecute
  `content:catalog:rebuild`, `content:catalog:validate`, `content:generate:check`, `architecture:check` e
  `verify`; depois remova worktree/branch e prune. Em bloqueio, não integre fechamento falso.

## Critérios de aceite

- [ ] Todos os gates e provas têm evidência fresca e reproduzível.
- [ ] Catálogo contém somente conteúdo curado e dependências alcançáveis.
- [ ] Banco reconstrói sem Canary; import check compara com Canary explicitamente.
- [ ] Idempotência, rollback, FK, órfãos e byte identity foram demonstrados.
- [ ] Zero código/fonte Canary rastreado e zero vazamento para runtime/simulation.
- [ ] Relatório final não contradiz README/STATE/roteiro.
- [ ] Integração e limpeza concluídas somente após reverificação.

## Condições de parada

Pare e abra correção separada para qualquer falha funcional. Pare se o modelo executor for o mesmo
revisor sem registrar indisponibilidade, se o snapshot divergir, se porta 4173 estiver ocupada ou se
a árvore não estiver limpa. Não rebaixe falha bloqueante a warning para liberar PB-02.

## Relatório final

Informe veredito, comandos/exit codes, row/entity counts, golden hash, provas negativas, warnings,
commit integrado, limpeza e elegibilidade real de PB-02.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound.
Use Claude Opus 5 para auditoria; fallback GPT-5.6 Sol xhigh com desvio registrado. Use
game-studio:web-game-foundations e superpowers:verification-before-completion.
Execute somente C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-01\tasks\PB-01-07-fechar-gate-integrado.md.
Faça auditoria independente com evidência fresca, provas controladas, rebuilds determinísticos e
verify completo. Não altere código nem amplie conteúdo. Feche e libere PB-02 somente se os critérios
permitirem; caso contrário registre uma FIX e pare. Se aprovado, commite, integre por fast-forward,
reverifique e limpe worktree/branch. Não inicie PB-02.
```
