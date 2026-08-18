# PB-06-01 — Definir os contratos do save

**Status inicial:** pending

**Classe da tarefa:** contrato e schema novos, herdados por playbooks posteriores

**Modelo sugerido:** GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6, `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador; gates automatizados como primeiro
validador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** serial. É a raiz do playbook.

## Objetivo

Publicar em `@huntbound/contracts` a forma do save: `GameSave` v1, `ActiveRunState`, `SaveDraft`,
`RunBagEntry` e o schema Zod que os valida — sem escrever uma linha de persistência.

## Resultado esperado

Um schema executável que aceita exatamente os documentos válidos e recusa, com diagnóstico
localizado, os inválidos. `RunBagEntry` passa a morar em `contracts` e `@huntbound/content` a
reimporta sem mudar comportamento.

## Dependências

- PB-05 integrado em `main` no commit `d4490e9`, com `corepack pnpm verify` verde. Não depende de
  auditoria nem de fechamento formal do PB-05.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-06/STATE.md`;
3. `docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`, seções "Contratos" e
   "Parâmetros congelados";
4. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`, seção "Persistência e confiança";
5. `packages/contracts/src/simulation/schemas.ts`, para o schema de snapshot já existente e o padrão
   de diagnóstico;
6. `packages/contracts/src/content/schemas.ts`, para o padrão de chave e de validação cruzada;
7. `packages/content/src/runtime/runBag.ts` e seu teste.

## Decisões congeladas

- `SAVE_SCHEMA_VERSION = 1`.
- A forma de `GameSave`, `ActiveRunState` e `RunBagEntry` é a da spec, sem campo a mais e sem campo a
  menos. Nada de XP, level, equipamento, coleção, moeda, capacidade ou peso.
- `count` é inteiro `>= 1`. Entrada com contagem zero não existe: ausência é ausência.
- `itemKey` é único dentro de `stash` e dentro de `bag`.
- `stash` e `bag` são ordenadas por `itemKey` em code unit UTF-16 crescente. **Ordem errada é
  documento inválido**, não algo a reordenar em silêncio — o documento é canônico, e canônico que se
  autocorrige não é canônico.
- `completedRuns` é inteiro `>= 0`.
- O `snapshot` de `ActiveRunState` é validado **reusando** o schema de snapshot que já existe em
  `packages/contracts/src/simulation/schemas.ts`. Não escreva um segundo validador de snapshot.
- `SaveDraft` é o espelho mutável de `GameSave` via `-readonly`. Não é um tipo escrito à mão em
  paralelo, que sairia de sincronia no primeiro campo novo.
- Zod fica em `@huntbound/contracts` e em nenhum outro pacote.
- `projectRunBag` **não muda de casa**: só o tipo `RunBagEntry` migra.

## Escopo permitido

```text
packages/contracts/src/save/**
packages/contracts/src/index.ts
packages/content/src/runtime/runBag.ts          (somente o import do tipo)
packages/content/src/runtime/runBag.test.ts     (somente o import do tipo)
packages/content/src/index.ts                   (somente reexport, se já existir)
docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md     (a nota do rascunho mutável)
docs/playbooks/PB-06/STATE.md
```

## Fora de escopo

- `SaveRepository`, driver, transação, migração, export/import — PB-06-02 a PB-06-04;
- qualquer arquivo em `packages/save/src/**`;
- qualquer arquivo em `packages/simulation/**`;
- UI, autosave e retomada.

## Interfaces produzidas

```ts
export const SAVE_SCHEMA_VERSION = 1;

export interface RunBagEntry {
  readonly itemKey: string;
  readonly count: number;
}

export interface ActiveRunState {
  readonly huntId: string;
  readonly scenarioId: string;
  readonly scenarioRevision: number;
  readonly seed: Seed;
  readonly snapshot: SimulationSnapshot;
  readonly bag: readonly RunBagEntry[];
}

export interface GameSave {
  readonly schemaVersion: number;
  readonly stash: readonly RunBagEntry[];
  readonly completedRuns: number;
  readonly session: ActiveRunState | null;
}

export type SaveDraft = { -readonly [K in keyof GameSave]: GameSave[K] };

export function parseGameSave(value: unknown): ParseResult<GameSave>;
export function createEmptyGameSave(): GameSave;
```

`parseGameSave` segue o formato de resultado e diagnóstico já usado pelos outros parsers de
`contracts`. Confira o padrão vigente no workspace antes de inventar um novo — se os parsers vizinhos
devolvem `{ ok, value, diagnostics }`, este devolve igual.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb06-01-contracts -b codex/pb06-01-save-contracts main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-01-contracts install --prefer-offline
```

- [ ] **2. Escrever testes RED do documento vazio e do documento cheio.**

Prove: `createEmptyGameSave()` produz `schemaVersion` `1`, `stash` vazio, `completedRuns` `0` e
`session` `null`, e passa por `parseGameSave`; um documento completo com sessão ativa e bolsa passa;
o resultado tipado é `readonly` em todos os níveis.

- [ ] **3. Escrever testes RED da recusa.**

Prove, cada um com o caminho do diagnóstico apontando o campo certo: `count` `0`, negativo ou
fracionário; `itemKey` duplicado em `stash`; `itemKey` duplicado em `bag`; `stash` fora de ordem;
`bag` fora de ordem; `completedRuns` negativo ou fracionário; `schemaVersion` ausente; `session` com
snapshot inválido; campo desconhecido no documento.

O teste de ordem é o que impede o defeito mais provável desta task: um schema que aceita qualquer
ordem e depois produz exports diferentes para o mesmo estado.

- [ ] **4. Implementar `packages/contracts/src/save/**` e exportar; obter GREEN.**

- [ ] **5. Mover `RunBagEntry` e reimportar em `content`.**

Apague a declaração local em `packages/content/src/runtime/runBag.ts` e importe o tipo de
`@huntbound/contracts`. O comportamento e os testes de `projectRunBag` não mudam — se algum teste
precisar mudar, pare: significa que os dois tipos não eram o mesmo.

- [ ] **6. Registrar o desvio na ADR.**

Acrescente à seção "Persistência e confiança" de `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md` uma
nota curta: `transact` recebe `SaveDraft`, o espelho mutável de `GameSave`; a forma, os quatro
métodos e a semântica do contrato continuam os mesmos. Não reescreva a seção.

- [ ] **7. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-01-contracts exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-01-contracts --filter @huntbound/contracts test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-01-contracts --filter @huntbound/content test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-01-contracts typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-01-contracts architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-01-contracts verify
```

- [ ] **8. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb06-01-contracts add packages docs
git -C C:\Kaezan\kaezan-huntbound-pb06-01-contracts commit -m "feat: publish the versioned game save contract"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb06-01-save-contracts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb06-01-contracts
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb06-01-save-contracts
```

## Verificação

Testes de `@huntbound/contracts` e `@huntbound/content`, `typecheck`, `architecture:check` e `verify`
verdes na worktree e no resultado integrado; `biome check .` em `0`.

## Critérios de aceite

- [ ] `SAVE_SCHEMA_VERSION` é `1` e está exportado.
- [ ] `GameSave` tem exatamente quatro campos; nenhum campo antecipa PB-07 ou PB-08.
- [ ] Cada recusa listada no passo 3 tem teste e diagnóstico com caminho correto.
- [ ] Ordem e unicidade são **recusa**, nunca correção silenciosa.
- [ ] O snapshot é validado pelo schema existente, sem duplicação de validador.
- [ ] `SaveDraft` deriva de `GameSave` por mapeamento, não por redeclaração.
- [ ] `RunBagEntry` vive em `contracts`; `projectRunBag` continua em `content` com testes intactos.
- [ ] Zod não aparece fora de `@huntbound/contracts`.
- [ ] A nota do rascunho mutável está na ADR.
- [ ] Nenhum arquivo de `packages/simulation` ou `packages/save` foi tocado.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: o schema de snapshot existente não puder ser reusado sem alterá-lo; `projectRunBag`
precisar mudar de comportamento para compilar; o schema exigir um campo que a spec não previu; ou se
a nota da ADR exigir mudar a forma do `SaveRepository` em vez de apenas o tipo do rascunho.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, contagem de testes, comandos e exit codes, modelo e
effort usados, e a próxima task elegível.

## Commit

`feat: publish the versioned game save contract`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb06-01-save-contracts`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb06-01-contracts`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, lista das recusas cobertas, confirmação de que `content` não mudou de
comportamento, integração, limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-06\tasks\PB-06-01-definir-contratos-do-save.md

Leia AGENTS.md, o STATE.md do playbook PB-06 e apenas os arquivos indicados pela task.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb06-01-contracts com a branch
codex/pb06-01-save-contracts e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Publique em packages/contracts/src/save o contrato GameSave v1 com schemaVersion,
stash, completedRuns e session, mais ActiveRunState, RunBagEntry, SaveDraft e parseGameSave.
SAVE_SCHEMA_VERSION = 1.

Regras que precisam de teste de recusa, com caminho de diagnostico correto: count inteiro >= 1;
itemKey unico em stash e em bag; stash e bag ORDENADAS por itemKey — ordem errada e documento
invalido, nunca reordenacao silenciosa; completedRuns inteiro >= 0; campo desconhecido recusado.
Reuse o schema de snapshot que ja existe em packages/contracts/src/simulation/schemas.ts; NAO
escreva um segundo validador de snapshot.

Mova apenas o TIPO RunBagEntry de packages/content/src/runtime/runBag.ts para contracts e reimporte.
projectRunBag continua em content e seus testes nao podem mudar de comportamento.

Acrescente a docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md, secao "Persistencia e confianca", a nota de
que transact recebe SaveDraft, o espelho mutavel de GameSave.

Nao toque packages/simulation nem packages/save. Nao antecipe repositorio, driver, migracao,
export/import nem UI.

Rode biome check ., os testes de contracts e content, typecheck, architecture:check e verify.
Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe worktree e branch
removendo o diretorio antes do prune.

Se surgir decisao nao coberta, escolha a opcao mais simples e mais facil de reverter, registre a
escolha em uma linha no commit e siga. Pare apenas se precisar mudar contrato publico ja integrado,
schema ou golden. Nao inicie a proxima task.
```
