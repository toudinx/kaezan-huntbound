# PB-06-05 — Implementar o driver IndexedDB

**Status inicial:** pending

**Classe da tarefa:** implementação bem especificada em API de browser, provada no browser

**Modelo sugerido:** GPT-5.6 Luna `xhigh` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados, com o gate de browser como evidência primária

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** pode executar em paralelo com PB-06-03 e PB-06-04 depois de PB-06-02. Toca
`packages/save/src/drivers/**` e `apps/game/src/save/SaveProbe.ts`, disjuntos de `migrations/**` e
`serialization/**`.

## Objetivo

Implementar `IndexedDbSaveDriver` — o único lugar do playbook que fala com o browser — e prová-lo
onde ele roda, com um probe e uma spec Playwright focada no driver.

## Resultado esperado

Persistência real: abrir o banco versionado, gravar e ler numa transação `readwrite` atômica, e
traduzir cada falha de IndexedDB no código de `SaveError` correspondente.

## Dependências

- PB-06-02 `done` e integrada em `main`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-06/STATE.md`;
3. `docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`, seções "Núcleo puro,
   driver na borda" e "Erros";
4. `packages/save/src/repository/**` e `packages/save/src/drivers/memory.ts`;
5. `apps/game/src/simulation/KernelProbe.ts` e `apps/game/src/assets/AssetRuntimeProbe.ts`, para o
   padrão de probe instalado só no profile `test`;
6. `playwright.config.ts` e uma spec existente em `tests/e2e/`, para o padrão de spec.

## Decisões congeladas

- Banco `huntbound-save`, versão `1`, object store `save`, chave explícita `'default'`.
- A store é criada em `onupgradeneeded` e em nenhum outro lugar.
- `runTransaction` abre **uma** transação `readwrite`, lê, chama a operação e grava dentro dela. Não
  existe leitura numa transação e escrita em outra: isso é exatamente a corrida que o playbook
  precisa impedir.
- A promessa só resolve quando a transação **completa**, não quando a `put` tem sucesso. Resolver na
  `put` mente sobre durabilidade.
- Mapeamento de erro, sem exceção:

  | Situação | Código |
  |---|---|
  | `indexedDB` ausente ou `open` rejeitado | `SAVE_UNAVAILABLE` |
  | `QuotaExceededError` | `SAVE_QUOTA_EXCEEDED` |
  | evento `blocked` no upgrade | `SAVE_UPGRADE_BLOCKED` |
  | transação abortada por outra causa | `SAVE_TRANSACTION_FAILED` |

- O driver **não** conhece `GameSave`, versão de save nem migração. Continua opaco.
- **Nenhuma dependência nova.** Nada de `idb`, `dexie`, `localforage` ou `fake-indexeddb`.
- O probe é instalado **somente** no profile `test`, como `KernelProbe` e `AssetRuntimeProbe`.
- A spec limpa o banco antes e depois. IndexedDB sobrevive entre specs, e um teste que depende da
  ordem de execução é um teste quebrado que ainda não falhou.

## Escopo permitido

```text
packages/save/src/drivers/indexeddb.ts
packages/save/src/drivers/index.ts
packages/save/src/index.ts
apps/game/src/save/SaveProbe.ts
apps/game/src/index.ts                (somente o reexport do probe)
apps/game/src/main.ts                 (somente a instalação do probe no profile test)
tests/e2e/save-driver.spec.ts
docs/playbooks/PB-06/STATE.md
```

## Fora de escopo

- autosave, retomada da run e painel de inventário — PB-06-08;
- QA completo de persistência nos quatro viewports — PB-06-09;
- migração e export/import — PB-06-03 e PB-06-04;
- qualquer arquivo em `packages/simulation`.

## Interfaces produzidas

```ts
export function createIndexedDbSaveDriver(options?: {
  readonly databaseName?: string;
  readonly indexedDB?: IDBFactory;
}): SaveDriver;
```

`databaseName` existe para que a spec possa isolar bancos entre casos, não para configurar o jogo. O
jogo usa o padrão congelado.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb06-05-idb -b codex/pb06-05-indexeddb-driver main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-05-idb install --prefer-offline
```

- [ ] **2. Escrever testes RED que **não** precisam de IndexedDB.**

Prove em Vitest, com um `IDBFactory` injetado que apenas rejeita: `indexedDB` ausente vira
`SAVE_UNAVAILABLE`. Este é o único caso do driver que Node consegue exercitar honestamente; não
tente simular o resto com um mock caseiro que reimplementa IndexedDB — o mock passaria a ser o
código testado.

- [ ] **3. Escrever a spec RED de browser.**

`tests/e2e/save-driver.spec.ts`, pelo probe, prova: `read` de banco vazio devolve `null`; escrever e
ler devolve o mesmo documento; a promessa só resolve depois de `complete`, verificado relendo numa
nova conexão; operação que lança dentro de `runTransaction` aborta e **não** grava; duas
`runTransaction` concorrentes não perdem escrita; recarregar a página preserva o documento.

Antes e depois de cada caso, apague o banco.

- [ ] **4. Implementar `createIndexedDbSaveDriver` e o `SaveProbe`; obter GREEN.**

Lembre-se de que Playwright serve o `dist` pré-buildado: rode `corepack pnpm build` antes de rodar a
spec, ou você vai depurar um bundle velho.

- [ ] **5. Provar estabilidade.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-05-idb build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-05-idb exec playwright test tests/e2e/save-driver.spec.ts --retries=0 --repeat-each=10
```

Dez execuções verdes sem `retries`. Instabilidade aqui é defeito, não ruído; não a mascare.

- [ ] **6. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-05-idb exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-05-idb --filter @huntbound/save test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-05-idb --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-05-idb typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-05-idb architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-05-idb verify
```

- [ ] **7. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb06-05-idb add packages apps tests docs
git -C C:\Kaezan\kaezan-huntbound-pb06-05-idb commit -m "feat: persist the save through an atomic indexeddb driver"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb06-05-indexeddb-driver
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb06-05-idb
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb06-05-indexeddb-driver
```

Em modo paralelo com PB-06-03 ou PB-06-04: remova a worktree limpa, preserve a branch e deixe a
integração para o responsável designado.

## Verificação

Testes de `@huntbound/save` e `@huntbound/game`, `typecheck`, `architecture:check`, a spec do driver
com `--retries=0 --repeat-each=10` e `verify` verdes na worktree e no resultado integrado;
`biome check .` em `0`.

## Critérios de aceite

- [ ] Banco, versão, store e chave são os congelados.
- [ ] A store é criada apenas em `onupgradeneeded`.
- [ ] Leitura e escrita acontecem na **mesma** transação.
- [ ] A promessa resolve em `complete`, provado relendo numa conexão nova.
- [ ] Operação que lança aborta a transação e não grava.
- [ ] Cada situação da tabela de erros tem código próprio.
- [ ] O driver continua opaco: sem `GameSave`, sem versão de save, sem migração.
- [ ] Nenhuma dependência nova entrou em nenhum `package.json`.
- [ ] O probe só é instalado no profile `test`.
- [ ] A spec limpa o banco antes e depois e passa dez vezes sem `retries`.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: a atomicidade exigir wrapper externo; o `blocked` do upgrade não puder ser distinguido de
falha comum; o probe precisar existir fora do profile `test` para a spec passar; ou se a spec só
ficar estável com `retries`.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, contagem de testes, saída das dez execuções da spec,
comandos e exit codes, modelo e effort usados, e a próxima task elegível.

## Commit

`feat: persist the save through an atomic indexeddb driver`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb06-05-indexeddb-driver`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb06-05-idb`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, resultado das dez execuções, mapeamento de erros efetivamente coberto,
integração, limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-06\tasks\PB-06-05-implementar-driver-indexeddb.md

Leia AGENTS.md, o STATE.md do playbook PB-06 e apenas os arquivos indicados pela task. Confirme que
PB-06-02 esta done e integrada e que main esta verde.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb06-05-idb com a branch
codex/pb06-05-indexeddb-driver e rode "corepack pnpm install --prefer-offline" dentro dela.

Implemente createIndexedDbSaveDriver: banco huntbound-save versao 1, store save, chave 'default',
store criada apenas em onupgradeneeded. runTransaction abre UMA transacao readwrite e faz leitura e
escrita dentro dela; a promessa so resolve no evento complete, nunca no sucesso do put.

Mapeie erros: indexedDB ausente ou open rejeitado -> SAVE_UNAVAILABLE; QuotaExceededError ->
SAVE_QUOTA_EXCEEDED; blocked no upgrade -> SAVE_UPGRADE_BLOCKED; abort por outra causa ->
SAVE_TRANSACTION_FAILED. O driver continua OPACO: sem GameSave, sem versao, sem migracao.

NAO adicione dependencia: nada de idb, dexie, localforage ou fake-indexeddb. Nao invente um mock
caseiro de IndexedDB em Node — prove o driver no browser.

Crie apps/game/src/save/SaveProbe.ts instalado SOMENTE no profile test, no padrao de KernelProbe e
AssetRuntimeProbe, e a spec tests/e2e/save-driver.spec.ts que apaga o banco antes e depois de cada
caso e prova: read vazio devolve null; escrita e leitura casam; resolucao apos complete verificada em
conexao nova; operacao que lanca aborta sem gravar; duas transacoes concorrentes nao perdem escrita;
reload preserva o documento.

Rode "corepack pnpm build" antes de qualquer playwright: a suite serve o dist pre-buildado. Prove
estabilidade com --retries=0 --repeat-each=10.

Nao implemente autosave, retomada da run nem painel de inventario: isso e PB-06-08.

Rode biome check ., os testes de save e game, typecheck, architecture:check e verify. Atualize o
handoff, commite, integre por fast-forward na main, reverifique e limpe worktree e branch removendo o
diretorio antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
