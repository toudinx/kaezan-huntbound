# PB-06-02 — Implementar o repositório e o driver em memória

**Status inicial:** pending

**Classe da tarefa:** implementação bem especificada com semântica de transação

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; escalonamento para a camada frontier se a atomicidade ou
a serialização ficarem vermelhas duas vezes pela mesma causa

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** serial. É a base de PB-06-03, PB-06-04 e PB-06-05.

## Objetivo

Tirar `packages/save` do esqueleto: implementar `SaveRepository` sobre a porta `SaveDriver`, com
`MemorySaveDriver` para Node, transação atômica de verdade e fila serial que impede duas operações de
interleavarem leitura e escrita.

## Resultado esperado

`load` e `transact` funcionando e testados sem browser, sem mock de IndexedDB e sem dependência nova.
Uma operação que lança não deixa rastro. Duas operações concorrentes produzem o mesmo resultado que
duas sequenciais.

## Dependências

- PB-06-01 `done` e integrada em `main`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-06/STATE.md`;
3. `docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`, seções "Um documento,
   uma transação", "Núcleo puro, driver na borda" e "Erros";
4. `packages/contracts/src/save/**`, entregue por PB-06-01;
5. `packages/save/package.json` e `packages/save/src/index.ts`;
6. `packages/assets/src/providers/FetchAssetProvider.ts`, apenas para o padrão de classe de erro com
   `code`.

## Decisões congeladas

- A porta é estreita e **opaca**:

```ts
export interface SaveDriver {
  read(): Promise<unknown>;
  runTransaction<T>(operation: (current: unknown) => TransactionOutcome<T>): Promise<T>;
  close(): void;
}

export interface TransactionOutcome<T> {
  readonly document: unknown;
  readonly result: T;
}
```

  `read` devolve `null` quando a chave não existe. O driver **não** conhece `GameSave`, versão nem
  migração: ele move documentos opacos e garante atomicidade. Toda regra vive no repositório.

- `transact<T>(operation: (draft: SaveDraft) => T): Promise<T>`.
- O rascunho entregue à operação é uma cópia; mutá-lo não afeta o documento gravado até o commit.
- **Operação que lança não escreve nada** e o erro sobe para quem chamou.
- **Fila serial:** `transact` encadeia; nunca existem duas transações abertas ao mesmo tempo no mesmo
  repositório. A segunda vê o resultado da primeira.
- O documento é validado por `parseGameSave` **antes** de gravar. Documento inválido produzido pela
  operação é `SAVE_DOCUMENT_INVALID` e aborta a escrita.
- Save ausente resolve para `createEmptyGameSave()` na leitura, **sem** gravar. Um `load` não cria
  arquivo.
- `SaveError` com `code`, no padrão de `AssetProviderError`. Os códigos são os da spec; esta task usa
  `SAVE_DOCUMENT_INVALID` e `SAVE_TRANSACTION_FAILED`, e declara os demais para os drivers.
- `@huntbound/save` não importa Zod, não importa `@huntbound/content` e não importa Phaser.

## Escopo permitido

```text
packages/save/src/index.ts
packages/save/src/repository/**
packages/save/src/drivers/memory.ts
packages/save/src/errors/**
packages/save/package.json          (somente scripts/config de teste, se faltar)
packages/save/vitest.config.ts      (somente se o padrão vizinho exigir)
docs/playbooks/PB-06/STATE.md
```

## Fora de escopo

- migrações — PB-06-03;
- export e import — PB-06-04;
- `IndexedDbSaveDriver` — PB-06-05;
- checkpoint, retomada e consolidação — PB-06-06;
- qualquer arquivo em `packages/simulation`, `packages/content` ou `apps/game`.

## Interfaces produzidas

```ts
export interface SaveRepository {
  load(): Promise<GameSave>;
  transact<T>(operation: (draft: SaveDraft) => T): Promise<T>;
  export(): Promise<string>;
  import(serialized: string): Promise<void>;
}

export function createSaveRepository(driver: SaveDriver): SaveRepository;
export function createMemorySaveDriver(initial?: unknown): SaveDriver;
```

`export` e `import` fazem parte do contrato desde já, mas quem os implementa é PB-06-04. Nesta task
eles podem existir como declaração não implementada **apenas** se a ausência for explícita e testada
— nunca como um `return ''` silencioso que passa despercebido.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb06-02-repository -b codex/pb06-02-save-repository main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-02-repository install --prefer-offline
```

- [ ] **2. Escrever testes RED de leitura.**

Prove: banco vazio faz `load` devolver o documento vazio válido **sem** gravar — verificado
inspecionando o driver; documento existente é devolvido como está; documento inválido no driver vira
`SAVE_DOCUMENT_INVALID`, não um documento vazio silencioso.

- [ ] **3. Escrever testes RED de transação.**

Prove: `transact` que muta o rascunho grava o resultado e devolve o valor da operação; `transact` que
lança **não** grava nada e propaga o erro; `transact` que produz documento inválido não grava e
falha com `SAVE_DOCUMENT_INVALID`; mutar o rascunho depois que `transact` resolveu não altera o
documento gravado.

- [ ] **4. Escrever teste RED de serialização.**

Dispare duas `transact` que incrementam `completedRuns` **sem** aguardar a primeira, e prove que o
resultado final é `2`, não `1`. Prove também que a segunda operação recebeu o rascunho já contendo o
efeito da primeira. Este é o teste que separa uma implementação correta de uma que só parece
correta com um usuário de cada vez.

- [ ] **5. Implementar `MemorySaveDriver`, `SaveRepository` e `SaveError`; obter GREEN.**

O driver em memória guarda o documento como valor estruturalmente clonado, não por referência —
senão ele mente sobre atomicidade e o teste do passo 3 passa por acidente.

- [ ] **6. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-02-repository exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-02-repository --filter @huntbound/save test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-02-repository typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-02-repository architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-02-repository verify
```

- [ ] **7. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb06-02-repository add packages docs
git -C C:\Kaezan\kaezan-huntbound-pb06-02-repository commit -m "feat: implement the transactional save repository"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb06-02-save-repository
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb06-02-repository
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb06-02-save-repository
```

## Verificação

Testes de `@huntbound/save`, `typecheck`, `architecture:check` e `verify` verdes na worktree e no
resultado integrado; `biome check .` em `0`.

## Critérios de aceite

- [ ] `load` de banco vazio não grava.
- [ ] Operação que lança não deixa escrita parcial.
- [ ] Documento inválido produzido pela operação aborta a escrita com código próprio.
- [ ] Duas `transact` concorrentes somam corretamente e não interleavam.
- [ ] O rascunho é cópia; mutá-lo fora da transação não afeta o gravado.
- [ ] O driver é opaco: não há referência a `GameSave`, versão ou migração dentro dele.
- [ ] `@huntbound/save` não importa Zod, `@huntbound/content` nem Phaser, provado por
      `architecture:check`.
- [ ] `export` e `import` não devolvem valor falso: ou estão implementados, ou falham
      explicitamente.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: a atomicidade exigir uma segunda object store; a fila serial exigir dependência nova; o
driver precisar conhecer `GameSave` para funcionar; ou se `parseGameSave` recusar um documento que a
spec considera válido.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, contagem de testes, comandos e exit codes, modelo e
effort usados, e a próxima task elegível.

## Commit

`feat: implement the transactional save repository`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb06-02-save-repository`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb06-02-repository`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, evidência da serialização concorrente, integração, limpeza, desvios e
próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-06\tasks\PB-06-02-implementar-repositorio-e-driver-memoria.md

Leia AGENTS.md, o STATE.md do playbook PB-06 e apenas os arquivos indicados pela task. Confirme que
PB-06-01 esta done e integrada e que main esta verde.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb06-02-repository com a branch
codex/pb06-02-save-repository e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Implemente em packages/save o SaveRepository sobre uma porta SaveDriver OPACA
(read/runTransaction/close, documentos unknown) e um MemorySaveDriver para Node.

Exigencias que precisam de teste: load de banco vazio devolve o documento vazio SEM gravar; documento
invalido no driver vira SAVE_DOCUMENT_INVALID; transact que lanca NAO grava nada; transact que produz
documento invalido NAO grava; o rascunho e copia; e duas transact disparadas sem await somam
corretamente porque a fila e serial.

O driver guarda o documento clonado, nunca por referencia. O driver nao pode conhecer GameSave,
versao nem migracao. packages/save nao importa Zod, nem @huntbound/content, nem Phaser.

NAO implemente migracao, export/import, IndexedDB, checkpoint nem UI: sao PB-06-03 a PB-06-06.
export e import so podem existir se falharem explicitamente; nada de "return ''" silencioso.

Rode biome check ., os testes de save, typecheck, architecture:check e verify. Atualize o handoff,
commite, integre por fast-forward na main, reverifique e limpe worktree e branch removendo o
diretorio antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
