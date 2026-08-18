# PB-06-03 — Implementar as migrações do save

**Status inicial:** pending

**Classe da tarefa:** implementação bem especificada com política de versão

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** pode executar em paralelo com PB-06-05 depois de PB-06-02. Toca
`packages/save/src/migrations/**`, disjunto de `drivers/**`.

## Objetivo

Deixar a máquina de migração pronta e **usada**: aplicar a cadeia em ordem até a versão corrente,
migrar o documento sem `schemaVersion` para v1, e recusar versão futura desconhecida em vez de
rebaixar em silêncio.

## Resultado esperado

Qualquer documento lido pelo repositório passa pela cadeia antes da validação. PB-07 e PB-08 podem
acrescentar `v1 → v2` sem redesenhar nada.

## Dependências

- PB-06-01 `done` e integrada em `main`.
- PB-06-02 `done` e integrada em `main`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-06/STATE.md`;
3. `docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`, seção "A migração é
   provada por um caso real";
4. `packages/contracts/src/save/**`;
5. `packages/save/src/repository/**` e `packages/save/src/errors/**`.

## Decisões congeladas

- `SAVE_SCHEMA_VERSION = 1`.
- A cadeia tem **uma** entrada real: documento **sem** `schemaVersion` → v1. Não invente uma "v0
  histórica" que nunca existiu para dar aparência de cobertura.
- A migração do documento sem versão preenche os campos ausentes com o padrão vazio e **preserva**
  o que existir e for reconhecível: um `stash` presente e bem formado sobrevive à migração.
- `schemaVersion` maior que `SAVE_SCHEMA_VERSION` é `SAVE_VERSION_UNSUPPORTED`. **Nunca** rebaixe,
  trunque campo desconhecido nem tente adivinhar.
- Documento que não corresponde a nenhuma forma conhecida é `SAVE_DOCUMENT_INVALID`. Falhar alto,
  não devolver documento vazio.
- Migração é **função pura**: recebe um documento opaco, devolve um documento opaco. Não abre
  transação, não conhece driver.
- A validação por `parseGameSave` acontece **depois** da cadeia, sempre.
- Migrar um documento já na versão corrente é identidade: mesma referência estrutural, sem cópia
  gratuita, sem reordenação.

## Escopo permitido

```text
packages/save/src/migrations/**
packages/save/src/repository/**      (somente o ponto de entrada da cadeia)
packages/save/src/index.ts
docs/playbooks/PB-06/STATE.md
```

## Fora de escopo

- export e import — PB-06-04;
- `IndexedDbSaveDriver` — PB-06-05;
- os goldens de migração da fixture — PB-06-07 é quem os congela;
- qualquer campo de PB-07 ou PB-08.

## Interfaces produzidas

```ts
export interface SaveMigration {
  readonly from: number | null;   // null = documento sem schemaVersion
  readonly to: number;
  migrate(document: unknown): unknown;
}

export function migrateSaveDocument(document: unknown): unknown;
```

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb06-03-migrations -b codex/pb06-03-save-migrations main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-03-migrations install --prefer-offline
```

- [ ] **2. Escrever testes RED da migração real.**

Prove: documento sem `schemaVersion` e sem mais nada vira o documento vazio v1; documento sem
`schemaVersion` **com** `stash` bem formado preserva o `stash` e chega em v1; documento sem
`schemaVersion` com `stash` malformado é `SAVE_DOCUMENT_INVALID`, não um `stash` vazio silencioso.

- [ ] **3. Escrever testes RED da política de versão.**

Prove: `schemaVersion` `1` é identidade; `schemaVersion` `2` — futuro — é `SAVE_VERSION_UNSUPPORTED`
com a versão citada na mensagem; `schemaVersion` não inteiro, negativo ou string é
`SAVE_DOCUMENT_INVALID`; `null`, array e primitivo são `SAVE_DOCUMENT_INVALID`.

- [ ] **4. Escrever teste RED da cadeia.**

Registre duas migrações **de mentira** no teste — não em produção — e prove que a cadeia as aplica em
ordem crescente, que para na versão corrente e que uma lacuna na cadeia falha alto em vez de pular.
Este teste é o que prova a máquina; a entrada real sozinha não prova.

- [ ] **5. Implementar `migrateSaveDocument` e o registro; obter GREEN.**

- [ ] **6. Ligar a cadeia ao repositório.**

`load`, e depois `import`, passam o documento pela cadeia antes de `parseGameSave`. Os testes de
PB-06-02 continuam verdes sem alteração — se algum precisar mudar, pare e entenda por quê.

- [ ] **7. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-03-migrations exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-03-migrations --filter @huntbound/save test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-03-migrations typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-03-migrations architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-03-migrations verify
```

- [ ] **8. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb06-03-migrations add packages docs
git -C C:\Kaezan\kaezan-huntbound-pb06-03-migrations commit -m "feat: migrate unversioned save documents to schema v1"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb06-03-save-migrations
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb06-03-migrations
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb06-03-save-migrations
```

Em modo paralelo com PB-06-05: remova a worktree limpa, preserve a branch e deixe a integração para o
responsável designado.

## Verificação

Testes de `@huntbound/save`, `typecheck`, `architecture:check` e `verify` verdes na worktree e no
resultado integrado; `biome check .` em `0`.

## Critérios de aceite

- [ ] Documento sem `schemaVersion` migra para v1 e preserva `stash` bem formado.
- [ ] Versão futura é recusada com código próprio e a versão aparece na mensagem.
- [ ] Documento irreconhecível falha alto; nunca devolve documento vazio.
- [ ] A cadeia é aplicada em ordem e para na versão corrente, provado com migrações de teste.
- [ ] Lacuna na cadeia falha alto em vez de pular.
- [ ] Migrar documento já corrente é identidade.
- [ ] A migração é pura e não conhece driver nem transação.
- [ ] A validação acontece depois da cadeia, sempre.
- [ ] Os testes de PB-06-02 continuam verdes sem alteração.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: a migração precisar de I/O; a política de versão futura exigir rebaixamento para algum
caso real; ou se preservar o `stash` de um documento sem versão exigir mudar o schema de PB-06-01.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, contagem de testes, comandos e exit codes, modelo e
effort usados, e a próxima task elegível.

## Commit

`feat: migrate unversioned save documents to schema v1`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb06-03-save-migrations`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb06-03-migrations`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, lista dos casos de recusa cobertos, integração, limpeza, desvios e
próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-06\tasks\PB-06-03-implementar-migracoes-do-save.md

Leia AGENTS.md, o STATE.md do playbook PB-06 e apenas os arquivos indicados pela task. Confirme que
PB-06-01 e PB-06-02 estao done e integradas e que main esta verde.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb06-03-migrations com a branch
codex/pb06-03-save-migrations e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Implemente migrateSaveDocument como FUNCAO PURA sobre documento opaco, com um
registro de migracoes aplicado em ordem crescente ate SAVE_SCHEMA_VERSION = 1.

A unica entrada real da cadeia e: documento SEM schemaVersion -> v1, preservando stash bem formado.
NAO invente uma v0 historica. Prove a maquina com migracoes de mentira DENTRO DO TESTE: ordem
crescente, parada na versao corrente e lacuna falhando alto.

Politica de versao: schemaVersion maior que o corrente e SAVE_VERSION_UNSUPPORTED com a versao na
mensagem, NUNCA rebaixamento. Documento irreconhecivel e SAVE_DOCUMENT_INVALID, nunca documento
vazio silencioso. Migrar documento ja corrente e identidade.

Ligue a cadeia ao repositorio: load passa o documento pela cadeia ANTES de parseGameSave. Os testes
de PB-06-02 precisam continuar verdes sem alteracao.

Nao implemente export/import, IndexedDB, checkpoint nem UI. Nao congele golden de migracao: isso e
PB-06-07.

Rode biome check ., os testes de save, typecheck, architecture:check e verify. Atualize o handoff,
commite, integre por fast-forward na main, reverifique e limpe worktree e branch removendo o
diretorio antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
