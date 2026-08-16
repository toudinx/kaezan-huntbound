# PB-05-02 — Importar as spells novas e congelar a ficha no catálogo

**Status inicial:** pending

**Classe da tarefa:** importação de conteúdo com possível extensão de schema de catálogo

**Modelo sugerido:** GPT-5.6 Sol `xhigh` ou Grok 4.6 `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `hunt-content-pipeline`, `run-gates`, `worktree-cycle`.

**Paralelismo:** sim, com PB-05-03, por ativação do supervisor. Paths disjuntos: esta task toca
`packages/content/**` e `packages/contracts/src/content/schemas.ts`; PB-05-03 toca
`packages/contracts/src/simulation/**`.

## Objetivo

Trazer `exori ico` e `exura ico` para o catálogo curado e congelar a ficha do personagem como
conteúdo versionado, sem quebrar a determinística de reimportação que PB-01 provou.

## Resultado esperado

O bundle gerado passa a conter três spells e a ficha do Knight, validados por schema. Reimportar a
mesma slice do mesmo snapshot produz JSON byte-idêntico, e `content:check` sai `0` duas vezes
seguidas com a árvore inalterada.

## Dependências

- PB-05-01 `done` e integrada em `main`.
- Snapshot Canary acessível via `HUNTBOUND_CANARY_SOURCE`. Worktree irmã não copia `references/`;
  se a variável estiver vazia, aponte-a para o snapshot do clone principal ou para uma cópia
  listada em `AGENTS.md`. Não grave o path no repositório.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/STATE.md`;
3. `docs/content/PB-05-SELECTION.md` — a seleção congelada, incluindo a forma exata da fórmula de
   cura registrada por PB-05-01;
4. `docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`, seção "A ficha do personagem
   é conteúdo congelado";
5. `packages/contracts/src/content/schemas.ts`, em especial `SpellFormulaDefinitionSchema`,
   `SpellDefinitionSchema` e `VocationDefinitionSchema`;
6. `packages/content/src/importers/canary/lua/parseSpellLua.ts` e seus testes;
7. `docs/content/CANARY_LUA_MAPPING.md`, seção de spells;
8. `packages/content/src/application/ImportCanarySlice.ts` e `validateAndApply.ts`;
9. `tools/content-catalog/cli.ts`.

## Decisões congeladas

- As três spells e a ficha são exatamente as congeladas em `docs/content/PB-05-SELECTION.md`. Esta
  task **não** reabre a seleção.
- A ficha é conteúdo: um documento validado por schema, versionado, sem persistência e sem save.
- Identidade e proveniência seguem `docs/content/IDENTITY_POLICY.md`; `sourceId` original é
  preservado.
- O runtime não lê Lua, XML nem OTBM. A importação é offline e o resultado é JSON validado.
- Reimportação determinística é requisito, não meta: mesma entrada, mesmos bytes.
- Artefato gerado não se edita à mão. `packages/content/src/generated/**` sai de CLI.

## Escopo permitido

```text
packages/contracts/src/content/schemas.ts
packages/contracts/src/content/schemas.test.ts
packages/content/src/importers/canary/**
packages/content/src/selections/**
packages/content/src/generated/**            (somente por CLI)
packages/content/src/runtime/**
tools/content-catalog/**
docs/content/CANARY_LUA_MAPPING.md
docs/content/generated/PB-01-CATALOG.md
package.json
docs/playbooks/PB-05/STATE.md
```

## Fora de escopo

- `packages/simulation`, `packages/contracts/src/simulation`, `packages/assets`, `apps/game`;
- qualquer regra de combate;
- `buildHuntScenario`, que é PB-05-07;
- reextrair região, spawns ou transições;
- importar criatura, item ou vocação nova além do que a seleção declara.

## Interfaces produzidas

```ts
export type SpellFormulaDefinition =
  | { readonly kind: 'skillAttack'; /* campos atuais */ }
  | { readonly kind: 'skillHeal'; /* forma medida por PB-05-01 */ };

export interface CharacterDefinition {
  readonly stableKey: string;
  readonly vocationKey: string;
  readonly level: number;
  readonly skills: Readonly<Record<string, number>>;
  readonly weaponItemKey: string;
  readonly weaponAttack: number;
  readonly maxHealth: number;
  readonly maxMana: number;
  readonly spellKeys: readonly string[];
}
```

O nome e a forma exata do `kind` de cura vêm da medição de PB-05-01. Se a fórmula medida couber em
`skillAttack` sem distorção semântica, **não crie um `kind` novo**: reutilizar é preferível a
duplicar, e a decisão precisa ficar registrada.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-02-import -b codex/pb-05-02-import-spells-character main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-02-import install --prefer-offline
```

- [ ] **2. Escrever testes RED do schema.**

Em `packages/contracts`: a fórmula de cura é aceita na forma medida e rejeitada em formas próximas
inválidas; `CharacterDefinition` rejeita level negativo, skill negativa, vida ou mana não positiva,
`spellKeys` vazio, chave desconhecida e campo desconhecido; uma spell cujo `allowedVocationFamilies`
não contenha a família do Knight é rejeitada quando referenciada pela ficha.

- [ ] **3. Implementar o schema; obter GREEN.**

- [ ] **4. Escrever testes RED do parser.**

Com fixtures Lua mínimas em `packages/test-fixtures/canary/`, prove que `parseSpellLua` extrai
`words`, `level`, `mana`, `cooldown`, `groupCooldown`, vocações e a fórmula das duas spells novas, e
que uma forma de `onGetFormulaValues` não reconhecida produz diagnóstico, nunca silêncio.

- [ ] **5. Implementar o parser; obter GREEN.**

- [ ] **6. Estender a slice curada e reimportar pelo CLI.**

Acrescente as duas spells e a ficha à seleção. Regenere o bundle **somente** por
`corepack pnpm content:generate` e valide com `content:generate:check`. Não edite
`packages/content/src/generated/**` à mão — o hook bloqueia, e com razão.

- [ ] **7. Provar determinismo de reimportação.**

Rode a importação duas vezes e prove bytes idênticos:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-02-import content:check
git -C C:\Kaezan\kaezan-huntbound-pb05-02-import status --porcelain=v1 --untracked-files=all
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-02-import content:check
```

A segunda execução precisa sair `0` com a árvore inalterada entre elas.

- [ ] **8. Registrar o hash novo do bundle.**

Gere o SHA-256 do bundle regenerado a partir do arquivo real e registre-o no `STATE.md` e em
`docs/content/generated/PB-01-CATALOG.md`. Hash inventado é o defeito D2 do PB-04.

- [ ] **9. Documentar o mapeamento.**

Atualize `docs/content/CANARY_LUA_MAPPING.md` com os campos novos de spell e a decisão sobre a
fórmula de cura.

- [ ] **10. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-02-import exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-02-import --filter @huntbound/contracts test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-02-import --filter @huntbound/content test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-02-import typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-02-import content:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-02-import architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-02-import verify
```

- [ ] **11. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-02-import add packages tools docs package.json
git -C C:\Kaezan\kaezan-huntbound-pb05-02-import commit -m "feat: import the knight combat spells and freeze the character sheet"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb-05-02-import-spells-character
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-02-import
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb-05-02-import-spells-character
```

Em modo paralelo com PB-05-03: remova a worktree limpa após o commit, preserve a branch e não edite
`STATE.md`; deixe a task dependente consolidar o handoff.

## Verificação

`content:check` verde duas vezes com a árvore inalterada; testes de contrato e de conteúdo verdes;
`verify` verde na worktree e no resultado integrado; `biome check .` sai `0`.

## Critérios de aceite

- [ ] O bundle contém exatamente as três spells da seleção e a ficha congelada.
- [ ] A fórmula de cura é validada por schema, com a decisão de reutilizar ou criar `kind` registrada.
- [ ] Forma de fórmula não reconhecida produz diagnóstico, nunca aceitação silenciosa.
- [ ] Reimportação produz JSON byte-idêntico.
- [ ] Nenhum arquivo de `generated/` foi editado à mão.
- [ ] O hash novo do bundle foi gerado do arquivo real e registrado.
- [ ] Nenhuma criatura, item ou vocação fora da seleção entrou no catálogo.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: a fórmula de cura exigir um conceito que o schema de catálogo não consegue representar
sem decidir contrato novo; a reimportação não for determinística; a slice exigir uma dependência não
declarada em `PB-05-SELECTION.md`; ou se o bundle regenerado alterar entidades que a seleção não
tocou.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, hash do bundle, comandos e exit codes, modelo e
effort usados, e a próxima task elegível. Em modo paralelo, deixe o handoff para a task dependente.

## Commit

`feat: import the knight combat spells and freeze the character sheet`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb-05-02-import-spells-character`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-02-import`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes por pacote, decisão sobre a fórmula de cura, hash do bundle antes e
depois, comandos com exit code, integração, limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol xhigh ou Grok 4.6 xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-02-importar-spells-e-ficha.md

Leia AGENTS.md, o STATE.md do playbook PB-05, docs/content/PB-05-SELECTION.md e apenas os arquivos
indicados pela task. Confirme que PB-05-01 esta done e integrada antes de comecar.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-02-import com a branch
codex/pb-05-02-import-spells-character e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Traga exori ico e exura ico para o catalogo curado e congele a ficha do personagem
como conteudo validado por schema. Se a formula de cura couber em skillAttack sem distorcer a
semantica, reutilize em vez de criar um kind novo, e registre a decisao.

Regenere o bundle SOMENTE por CLI (content:generate) e valide com content:generate:check. Nao edite
packages/content/src/generated a mao: o hook bloqueia. Rode content:check duas vezes seguidas com a
arvore inalterada e prove bytes identicos. Gere o SHA-256 do bundle a partir do arquivo real antes
de publica-lo em qualquer documento.

Rode biome check ., os testes de contracts e content, typecheck, content:check, architecture:check e
verify. Atualize o handoff conforme o modo declarado, commite, integre por fast-forward na main,
reverifique e limpe worktree e branch removendo o diretorio antes do prune.

Nao toque em packages/simulation, packages/assets nem apps/game. Nao implemente regra de combate.
Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
