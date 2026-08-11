# PB-00R-03 — Fechar descoberta de testes por package

**Status inicial:** pending

**Classe da tarefa:** implementação menor e bem especificada

**Modelo sugerido:** GPT-5.6 Luna, effort `xhigh`

**Validador sugerido:** GPT-5.6 Sol `xhigh` ou Claude Opus 5

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Game Studio não se aplica porque esta task é mecânica de workspace, sem runtime ou QA de jogo.

**Paralelismo:** onda 1; pode executar em paralelo com PB-00R-01 e PB-00R-04 em worktree isolado.

## Objetivo

Garantir que qualquer teste unitário adicionado a um package do workspace entre automaticamente em
`corepack pnpm test` e `verify`, sem editar o script raiz e sem executar Playwright duas vezes.

## Resultado esperado

Todo package declara script `test` não mascarado. Packages vazios aprovam sem teste, mas um arquivo
`*.test.ts` novo é descoberto pelo Vitest local do package. O gate de configuração impede regressão.

## Dependências

- PB-00R criado e commitado.
- Worktree limpa na branch `codex/pb00r-03-package-tests`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-00R/STATE.md`;
3. `docs/08_POLITICA_MODELOS_AGENTES.md`;
4. `package.json`;
5. `apps/game/package.json`;
6. todos os `packages/*/package.json`;
7. `tests/workspace/workspace-config.test.ts`;
8. `vitest.config.ts`.

## Decisões congeladas

- O script raiz continua agregando com `corepack pnpm --recursive run test`.
- Specs `tests/e2e/*.spec.ts` pertencem somente a `qa:browser`.
- Nenhum teste de gameplay ou conteúdo é criado.
- A versão de Vitest permanece 4.1.10.
- Scripts não podem conter `|| true`, `exit 0` ou filtros que ignorem testes existentes.

## Escopo permitido

```text
packages/assets/package.json
packages/content/package.json
packages/contracts/package.json
packages/save/package.json
packages/simulation/package.json
packages/test-fixtures/package.json
tests/workspace/workspace-config.test.ts
docs/playbooks/PB-00R/STATE.md
docs/playbooks/PB-00R/artifacts/acceptance-report.md
```

## Fora de escopo

- alterar testes ou runtime de `apps/game`;
- mover testes Playwright;
- mudar o script raiz `test`;
- adicionar dependências ou atualizar lockfile;
- criar conteúdo PB-01.

## Execução red-green

- [ ] **1. Reproduzir a omissão atual.**

Execute `corepack pnpm test` e registre 33 testes. Confirme que os seis manifests em `packages/*`
não declaram `scripts.test`.

- [ ] **2. Tornar o contrato de script testável antes de editar manifests.**

Em `tests/workspace/workspace-config.test.ts`, dentro do loop de `workspacePackages`, acrescente:

```ts
const testScript = manifest.scripts?.test;
expect(testScript, `missing test script: ${packagePath}`).toBeTypeOf('string');
expect(testScript?.trim(), `empty test script: ${packagePath}`).not.toBe('');
expect(testScript, `masked test script: ${packagePath}`).not.toContain(
  '|| true',
);
expect(testScript, `masked test script: ${packagePath}`).not.toContain(
  'exit 0',
);
```

- [ ] **3. Executar RED.**

```text
corepack pnpm exec vitest run tests/workspace/workspace-config.test.ts
```

Resultado esperado: falha nomeando `packages/contracts` como primeiro package sem script `test`.

- [ ] **4. Adicionar o script mínimo aos seis packages.**

Em cada `packages/*/package.json`, adicione sem mudar dependências:

```json
"test": "vitest run --passWithNoTests"
```

Preserve `typecheck` e `build`. Não altere `apps/game/package.json`, que já possui script `test`.

- [ ] **5. Executar GREEN do contrato e agregação.**

```text
corepack pnpm exec vitest run tests/workspace/workspace-config.test.ts
corepack pnpm test
```

Resultado esperado: contrato aprovado; contagem funcional permanece 33 e seis packages vazios
reportam ausência de testes sem falhar.

- [ ] **6. Provar descoberta futura sem editar o script raiz.**

Crie temporariamente `packages/contracts/src/gate-probe.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('package test discovery probe', () => {
  it('is collected by the recursive root gate', () => {
    expect(true).toBe(true);
  });
});
```

Execute `corepack pnpm test` e registre 34 testes. Remova somente o probe temporário e execute o
comando novamente; a contagem final deve voltar a 33. O probe não entra no commit.

- [ ] **7. Verificar gate sem Playwright duplicado.**

```text
corepack pnpm typecheck
corepack pnpm test
corepack pnpm architecture:check
corepack pnpm build
```

Confirme na saída que nenhum arquivo `tests/e2e/*.spec.ts` foi coletado.

- [ ] **8. Registrar handoff e commit.**

Atualize PB-00R-03 no `STATE.md` da branch com contagens 33→34→33, modelo/effort e comandos.

```text
git diff --check
git status --short
git add packages/assets/package.json packages/content/package.json packages/contracts/package.json packages/save/package.json packages/simulation/package.json packages/test-fixtures/package.json tests/workspace/workspace-config.test.ts docs/playbooks/PB-00R/STATE.md
git commit -m "build: require tests for every workspace package"
```

## Critérios de aceite

- [ ] O teste de configuração falha antes dos manifests e passa depois.
- [ ] Sete packages de workspace declaram script `test` não mascarado.
- [ ] Probe temporário eleva a contagem de 33 para 34 pelo comando raiz.
- [ ] Probe é removido e não aparece no commit.
- [ ] Playwright não é coletado pelo gate unitário.
- [ ] Lockfile e dependências não mudam.

## Condições de parada

Pare e reporte `BLOCKED` se o Vitest não for resolvido nos packages sem dependência nova, se o script
coletar E2E, ou se qualquer um dos 33 testes existentes falhar.

## Relatório final

Comece com `APPROVED` ou `BLOCKED`; informe RED, scripts finais, contagens 33→34→33, ausência de E2E,
modelo/effort, lockfile, commit e próximo passo. Não execute outra task.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound.

Use GPT-5.6 Luna com effort xhigh. Para validação independente, prefira GPT-5.6 Sol xhigh ou Claude
Opus 5. Use obrigatoriamente as skills superpowers:test-driven-development e
superpowers:verification-before-completion. Não invoque Game Studio nesta task mecânica de workspace.

Execute integralmente e somente a task:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-00R\tasks\PB-00R-03-fechar-descoberta-de-testes-por-package.md

Esta task pertence à onda paralela 1. Antes de editar, confirme working tree limpa e trabalhe em
worktree/branch isolado codex/pb00r-03-package-tests. Não compartilhe o checkout com PB-00R-01 ou
PB-00R-04.

Leia o STATE.md e somente as referências listadas. Preserve decisões congeladas e escopo. Faça
red-green no contrato de scripts test, adicione o script mínimo aos seis packages, prove descoberta
com o probe temporário e remova o probe antes do commit. Execute todas as verificações e confirme que
Playwright não entrou no runner unitário e que o lockfile não mudou.

Atualize o handoff da branch, crie o commit build: require tests for every workspace package e
encerre com APPROVED ou BLOCKED, evidências, modelo/effort e hash do commit. Não inicie outra task.
```
