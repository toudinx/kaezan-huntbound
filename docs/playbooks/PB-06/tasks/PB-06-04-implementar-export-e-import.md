# PB-06-04 — Implementar export e import

**Status inicial:** pending

**Classe da tarefa:** implementação bem especificada com artefato canônico

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** pode executar em paralelo com PB-06-05 depois de PB-06-03. Precisa da cadeia de
migração integrada antes de fechar.

## Objetivo

Fechar os dois métodos que faltam do `SaveRepository`: `export` produz JSON canônico estável, e
`import` valida, migra e **substitui** o documento inteiro numa transação única.

## Resultado esperado

Backup e restauração manuais funcionando, com a mesma codificação canônica que os goldens da árvore
já usam, sem checksum e sem fusão.

## Dependências

- PB-06-02 `done` e integrada em `main`.
- PB-06-03 `done` e integrada em `main`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-06/STATE.md`;
3. `docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`, seções "Export e
   import" e "Sem checksum no export";
4. `docs/simulation/REPLAY_CONTRACT.md`, seção "Formato canônico";
5. `packages/simulation/src/state/canonicalJson.ts`;
6. `packages/save/src/repository/**` e `packages/save/src/migrations/**`.

## Decisões congeladas

- O export é `encodeCanonicalJson(document)` mais **um** LF final. O valor codificado não termina em
  newline; o arquivo termina. É a mesma regra dos artefatos de replay.
- **Não existe checksum, assinatura ou HMAC.** A ADR diz que o dono editar o próprio save não é
  ameaça; um checksum bloquearia o uso sancionado de editar um save à mão e não pegaria nada que a
  validação de schema já não pegue. Não reintroduza.
- Duas chamadas de `export` sobre o mesmo documento devolvem a **mesma string**.
- `import` faz, nesta ordem: `JSON.parse` → leitura de `schemaVersion` → cadeia de migração →
  `parseGameSave` → substituição em transação única.
- `JSON.parse` que falha é `SAVE_DOCUMENT_INVALID`. Versão futura é `SAVE_VERSION_UNSUPPORTED`.
  Reprovação de schema é `SAVE_DOCUMENT_INVALID`. Os três são distinguíveis pelo `code`.
- **Import é substituição, não fusão.** Fundir dois saves exigiria política de conflito por item que
  ninguém pediu e que não tem resposta única.
- Import que falha **não altera** o documento existente.
- O export usa o codificador canônico já existente. Não escreva um segundo.
- `@huntbound/save` continua sem Zod e sem `@huntbound/content`.

## Escopo permitido

```text
packages/save/src/serialization/**
packages/save/src/repository/**
packages/save/src/index.ts
docs/playbooks/PB-06/STATE.md
```

## Fora de escopo

- `IndexedDbSaveDriver` — PB-06-05;
- checkpoint, retomada e consolidação — PB-06-06;
- o golden de export da fixture — PB-06-07 é quem o congela;
- botões, file input e download — PB-06-08.

## Interfaces produzidas

```ts
export function encodeSaveDocument(document: GameSave): string;
export function decodeSaveDocument(serialized: string): GameSave;
```

`export()` e `import()` do repositório são construídos sobre essas duas funções puras, para que o
gate de PB-06-07 possa exercitá-las sem repositório e o browser possa compará-las com o Node.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb06-04-serialization -b codex/pb06-04-save-export-import main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-04-serialization install --prefer-offline
```

- [ ] **2. Escrever testes RED do export.**

Prove: a saída tem chaves ordenadas por code unit UTF-16, sem espaço supérfluo, e termina em
exatamente um LF; duas chamadas com o mesmo documento produzem a mesma string; documentos com a mesma
informação em ordem de inserção diferente produzem a **mesma** string; um documento com sessão ativa
exporta o snapshot inteiro.

- [ ] **3. Escrever testes RED do import.**

Prove: round-trip `export` → `import` → `export` devolve a mesma string; JSON quebrado é
`SAVE_DOCUMENT_INVALID`; `schemaVersion` futuro é `SAVE_VERSION_UNSUPPORTED`; documento sem
`schemaVersion` é migrado e aceito; documento fora do schema é `SAVE_DOCUMENT_INVALID`; import que
falha **não** altera o documento existente, verificado lendo o repositório depois da falha.

- [ ] **4. Escrever teste RED da substituição.**

Prove que importar sobre um save cheio **substitui**: o `stash` anterior não sobrevive, não é somado
e não é fundido.

- [ ] **5. Implementar `encodeSaveDocument`, `decodeSaveDocument`, `export` e `import`; obter
      GREEN.**

- [ ] **6. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-04-serialization exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-04-serialization --filter @huntbound/save test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-04-serialization typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-04-serialization architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-04-serialization verify
```

- [ ] **7. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb06-04-serialization add packages docs
git -C C:\Kaezan\kaezan-huntbound-pb06-04-serialization commit -m "feat: export and import the save as canonical json"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb06-04-save-export-import
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb06-04-serialization
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb06-04-save-export-import
```

Em modo paralelo com PB-06-05: remova a worktree limpa, preserve a branch e deixe a integração para o
responsável designado.

## Verificação

Testes de `@huntbound/save`, `typecheck`, `architecture:check` e `verify` verdes na worktree e no
resultado integrado; `biome check .` em `0`.

## Critérios de aceite

- [ ] O export é canônico, com exatamente um LF final.
- [ ] Duas exportações do mesmo documento são a mesma string.
- [ ] Ordem de inserção diferente não muda a saída.
- [ ] Round-trip devolve a mesma string.
- [ ] Os três modos de falha do import têm códigos distintos.
- [ ] Import que falha não altera o documento existente.
- [ ] Import substitui; não funde nem soma.
- [ ] Não há checksum, assinatura nem HMAC no artefato.
- [ ] O codificador canônico existente foi reusado; nenhum segundo codificador entrou na árvore.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: o codificador canônico recusar algum campo do save — isso significa que o schema de
PB-06-01 admite um valor que o formato canônico não admite, e é decisão de contrato, não de
serialização; ou se o round-trip só fechar com normalização extra, o que indicaria que o schema
aceita mais de uma representação do mesmo estado.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, contagem de testes, comandos e exit codes, modelo e
effort usados, e a próxima task elegível.

## Commit

`feat: export and import the save as canonical json`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb06-04-save-export-import`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb06-04-serialization`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, confirmação de estabilidade do export, integração, limpeza, desvios e
próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-06\tasks\PB-06-04-implementar-export-e-import.md

Leia AGENTS.md, o STATE.md do playbook PB-06 e apenas os arquivos indicados pela task. Confirme que
PB-06-02 e PB-06-03 estao done e integradas e que main esta verde.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb06-04-serialization com a branch
codex/pb06-04-save-export-import e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Implemente encodeSaveDocument e decodeSaveDocument como funcoes puras e construa
export() e import() do repositorio sobre elas.

O export e encodeCanonicalJson do documento mais UM LF final — reuse o codificador que ja existe em
packages/simulation/src/state/canonicalJson.ts, NAO escreva um segundo. NAO existe checksum,
assinatura nem HMAC: e decisao explicita da ADR, nao esquecimento.

O import faz, nesta ordem: JSON.parse, leitura de schemaVersion, cadeia de migracao, parseGameSave e
SUBSTITUICAO do documento inteiro em transacao unica. Parse quebrado e SAVE_DOCUMENT_INVALID; versao
futura e SAVE_VERSION_UNSUPPORTED; schema reprovado e SAVE_DOCUMENT_INVALID. Import que falha nao
altera o documento existente. Import SUBSTITUI: nao funde e nao soma.

Prove estabilidade: duas exportacoes iguais, ordem de insercao irrelevante, round-trip identico.

Nao implemente IndexedDB, checkpoint, UI nem golden de fixture.

Rode biome check ., os testes de save, typecheck, architecture:check e verify. Atualize o handoff,
commite, integre por fast-forward na main, reverifique e limpe worktree e branch removendo o
diretorio antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
