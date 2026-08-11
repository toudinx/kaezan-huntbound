# PB-00R-FIX-01 — Normalizar fim de linha do checkout

**Status inicial:** pending

**Classe da tarefa:** implementação menor e bem especificada

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** GPT-5.6 Sol `xhigh` ou Claude Opus 5

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`

**Paralelismo:** sim. Não bloqueia PB-01 e não depende de nenhuma task de gameplay.

**Origem:** warning W1 de PB-00R-05, registrado em
`docs/playbooks/PB-00R/artifacts/acceptance-report.md`.

## Objetivo

Fazer `corepack pnpm verify` passar ponta a ponta, eliminando a reprovação de `format:check` causada
por fim de linha da working tree — sem afrouxar nenhuma regra do Biome.

## Contexto medido em 2026-08-11

- `corepack pnpm format:check` termina em exit 1 com `Found 12 errors. Found 1 warning.`
- Os 12 arquivos com erro são exatamente os 12 arquivos rastreados que `git ls-files --eol` reporta
  como `i/lf w/crlf`.
- `core.autocrlf` está em `true` e o repositório **não** tem `.gitattributes`.
- O conteúdo commitado desses arquivos, extraído com LF para um diretório temporário, passa em
  `biome format` com **exit 0**. Não existe defeito de formatação versionado.
- O warning de 1,3 MiB vem de `apps/game/dist/assets/index-BAWoqgt4.js`, saída de build obsoleta e
  não rastreada. Sozinho ele termina em exit 0 e não causa a reprovação.

## Resultado esperado

`corepack pnpm verify` termina em exit 0 em um checkout Windows com `core.autocrlf=true`, e o
resultado é estável entre clone novo e checkout existente.

## Escopo permitido

```text
.gitattributes
biome.json
docs/playbooks/PB-00R/STATE.md
docs/playbooks/PB-00R/artifacts/acceptance-report.md
```

A renormalização pode reescrever bytes de arquivos existentes, mas **não** pode alterar nenhuma
linha de lógica. O diff resultante deve ser exclusivamente de fim de linha.

## Fora de escopo

- alterar regras, severidades ou `files.includes` do Biome para esconder erros reais;
- reformatar código por motivo estético;
- tocar runtime, testes, `playwright.config.ts` ou `vitest.config.ts`;
- alterar budget, retry, workers, cache ou throttling;
- iniciar ou modificar qualquer playbook de gameplay.

## Passos

- [ ] **1. RED.** Registrar `corepack pnpm format:check` em exit 1 e capturar a lista dos 12
  arquivos, junto com `git ls-files --eol | Select-String 'w/crlf'`. As duas listas devem coincidir.

- [ ] **2. Adicionar `.gitattributes`** na raiz com, no mínimo:

```text
* text=auto eol=lf
*.png binary
```

- [ ] **3. Renormalizar** o checkout:

```text
git add --renormalize .
git status --short
```

- [ ] **4. Provar que o diff é só de fim de linha.**

```text
git diff --cached --stat
git diff --cached --ignore-all-space --ignore-blank-lines
```

O segundo comando deve sair **vazio**. Se sair qualquer linha, pare: houve mudança de conteúdo.

- [ ] **5. GREEN.** `corepack pnpm format:check` em exit 0.

- [ ] **6. Gate completo.** `corepack pnpm verify` em exit 0, com os seis gates passando em
  sequência. Registrar contagens: testes unitários/arquiteturais e E2E.

- [ ] **7. Limpar a saída obsoleta (warning W2).** Remover `apps/game/dist` localmente e confirmar
  que o warning de `maxSize` desaparece. Se ele voltar por regeneração, aí sim acrescentar o padrão
  de output a `files.includes` do `biome.json`, nunca aumentar `files.maxSize`.

- [ ] **8. Verificar que o lockfile não mudou** e que nada novo foi rastreado.

- [ ] **9. Atualizar** `STATE.md` e a seção de warnings do `acceptance-report.md`, marcando W1 e W2
  como resolvidos com evidência fresca.

## Critérios de aceite

- [ ] `.gitattributes` existe e fixa `eol=lf` para arquivos de texto.
- [ ] `git diff --cached --ignore-all-space --ignore-blank-lines` sai vazio na renormalização.
- [ ] `corepack pnpm format:check` passa em exit 0.
- [ ] `corepack pnpm verify` passa ponta a ponta em exit 0.
- [ ] Nenhuma regra do Biome foi afrouxada e `files.maxSize` não foi aumentado.
- [ ] Lockfile inalterado e nenhum artefato novo rastreado.
- [ ] Budget, retry, workers, cache e throttling inalterados.

## Condições de parada

Se a renormalização produzir qualquer diferença que não seja de fim de linha, pare e reporte em vez
de commitar. Se `verify` continuar vermelho depois do GREEN de `format:check`, o achado é outro e
merece task própria — não afrouxe o gate para fechar esta.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound.

Use GPT-5.6 Luna com effort xhigh. Use obrigatoriamente as skills
superpowers:test-driven-development e superpowers:verification-before-completion.

Execute integralmente e somente a task:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-00R\tasks\PB-00R-FIX-01-normalizar-fim-de-linha-do-checkout.md

Contexto: `corepack pnpm verify` reprova no primeiro gate, `format:check`, com 12 erros. Os 12
arquivos são exatamente os 12 arquivos rastreados que estão `i/lf` no índice e `w/crlf` na working
tree, porque `core.autocrlf=true` e não existe `.gitattributes`. O conteúdo commitado já passa em
`biome format` com exit 0 — não há defeito de formatação versionado.

Comece registrando o RED. Adicione `.gitattributes` com `* text=auto eol=lf`, renormalize com
`git add --renormalize .` e prove que o diff é exclusivamente de fim de linha: o comando
`git diff --cached --ignore-all-space --ignore-blank-lines` deve sair vazio. Se sair qualquer linha,
pare e reporte.

Não afrouxe nenhuma regra do Biome, não aumente `files.maxSize`, não toque runtime, testes,
playwright.config.ts nem vitest.config.ts, e não altere budget, retry, workers, cache ou throttling.

Termine com `corepack pnpm verify` em exit 0, atualize STATE.md e a seção de warnings do
acceptance-report.md marcando W1 e W2 como resolvidos, e crie o commit
`build: normalize checkout line endings`. Não inicie PB-01 nem nenhuma outra task.
```
