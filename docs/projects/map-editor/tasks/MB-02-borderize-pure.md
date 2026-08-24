# MB-02 — `packages/map-authoring` e o borderize puro

**Status inicial:** not-ready; depende do formato da tabela commitado por MB-01

**Classe da tarefa:** implementação geral bem especificada; contrato congelado pela spec

**Modelo sugerido:** GPT-5.6 Luna, `xhigh`

**Validador sugerido:** gates automatizados; camada frontier só por escalonamento

**Rota:** `superpowers:using-git-worktrees` → `superpowers:test-driven-development` →
`superpowers:verification-before-completion`

**Paralelismo:** pode correr junto com o fim de MB-01, desde que o formato da tabela já esteja
commitado. Não pode correr junto com MB-03.

## Objetivo

Criar o package puro que decide, para cada SQM, qual id de chão entra — massa sólida, variação de
massa ou peça de borda — a partir da tabela medida. Função determinística, sem I/O, chamável tanto
pela CLI quanto pelo editor no browser.

## Resultado esperado

- `packages/map-authoring` publicado como `@huntbound/map-authoring`, dependendo somente de
  `@huntbound/contracts`.
- `borderize(grid, tables, seed)` puro e determinístico.
- Seleção de variação por hash de coordenada, sem `Math.random()`.
- Entrada nova em `tools/architecture/dependency-policy.json` e o `architecture:check` verde.

## Dependências e pré-condições

1. `main` limpa e `corepack pnpm verify` verde.
2. O formato de `material-borders.json` está commitado por MB-01. A tabela **de conteúdo** pode
   ainda estar em ajuste; esta task consome o formato, não os números.
3. `docs/projects/map-editor/BORDERIZER.md` lido e vigente.

## Leitura mínima

1. `AGENTS.md`;
2. `docs/projects/map-editor/BORDERIZER.md`;
3. `.cursor/rules/10-boundaries.mdc` e `.cursor/rules/50-tests.mdc`;
4. `docs/architecture/PACKAGE_BOUNDARIES.md` e `tools/architecture/dependency-policy.json`;
5. `packages/simulation/**` — é o molde de package puro deste repo, inclusive o tratamento de RNG;
6. `packages/contracts/src/hunt/types.ts`;
7. o `material-borders.json` produzido por MB-01.

## Contrato congelado

**Fronteira.** `@huntbound/map-authoring` depende somente de `@huntbound/contracts`. Nada de
`node:*`, DOM, Phaser, filesystem ou dependência externa. A regra existe porque o editor chamará
esta mesma função no browser.

**Sem RNG livre.** `Math.random()` e `Date.now()` são proibidos. A variação de material vem de hash
determinístico de `(layoutId, x, y, z)` indexando a tabela de pesos. Mesma célula, mesmo id, sempre,
independente da ordem em que as células foram processadas.

**Classificação de célula.** Uma célula é *piso* se seu id pertence a um material de piso; *massa* se
pertence a um material de massa; *vazia* se não tem chão. Vazia é o que o borderize preenche.

**Preenchimento.** Célula vazia recebe massa sólida. Célula de massa adjacente a piso recebe a peça
da tabela correspondente à sua assinatura de 8 bits. Assinatura ausente da tabela cai no id
dominante da massa — nunca falha, nunca inventa peça.

**O borderize não decide topologia.** Ele não abre passagem, não conecta salão, não move parede. Só
preenche vazio e escolhe a aparência da fronteira existente.

**Determinismo.** Duas execuções sobre a mesma entrada produzem a mesma saída, e a ordem de
iteração não pode influenciar o resultado. Prove isso com teste, não com inspeção.

## Escopo permitido

Criar `packages/map-authoring/**`, sua entrada em `dependency-policy.json`, e os testes. Tocar
`pnpm-workspace.yaml` e `package.json` só para registrar o package.

**Fora de escopo:** CLI, escrita em disco, aplicação em mapa real, layout, região, pack, golden.
Nada em `apps/`.

## Red-green obrigatório

Antes do código de produção, prove pelo menos estes vermelhos:

1. célula vazia cercada de massa recebe massa sólida;
2. célula de massa com piso ao norte recebe a peça que a tabela indica para aquela assinatura;
3. assinatura ausente da tabela cai no id dominante em vez de lançar;
4. a mesma coordenada produz o mesmo id de variação em duas execuções, e coordenadas diferentes
   produzem distribuição compatível com os pesos;
5. embaralhar a ordem de iteração das células não muda a saída;
6. `architecture:check` reprova se o package importar `node:*`.

## Passos de implementação

1. Crie a worktree e rode `corepack pnpm install --prefer-offline`.
2. Registre o package e sua fronteira **antes** de escrever lógica; confirme que
   `architecture:check` já cobre.
3. Implemente classificação, assinatura e hash de variação por testes.
4. Implemente `borderize` por testes, sobre grids sintéticos pequenos e legíveis.
5. Prove independência de ordem e determinismo.
6. Rode os gates e faça o ciclo Git completo.

## Verificações exigidas

Com saída fresca:

- testes de `packages/map-authoring`;
- `corepack pnpm typecheck`;
- `corepack pnpm architecture:check`;
- `corepack pnpm test`;
- `corepack pnpm verify`.

## Critérios de aceite

- [ ] O package não importa Phaser, DOM, `node:*`, filesystem nem dependência externa.
- [ ] Nenhuma ocorrência de `Math.random()` ou `Date.now()` no package.
- [ ] Determinismo e independência de ordem provados por teste.
- [ ] Assinatura ausente cai no fallback sem lançar.
- [ ] `borderize` não altera célula que já tem chão de piso.
- [ ] `verify` verde no commit integrado.
- [ ] `STATE.md` atualizado, integração fast-forward e limpeza concluídas.

## Condições de parada

Pare após dois ciclos RED/GREEN com a mesma causa, ou se a fronteira do package exigir mudar
`dependency-policy.json` além da entrada nova. Registre a evidência em `STATE.md`.

## Handoff, commit e integração

- Branch: `codex/mb-02-borderize-pure`
- Worktree: `C:\Kaezan\kaezan-huntbound-mb-02-borderize-pure`
- Commit: `feat: decide map borders from the measured table`
- Base e destino: `main`
- Integração: `git merge --ff-only codex/mb-02-borderize-pure`
- Pós-integração: `corepack pnpm verify`
- Limpeza: remover a worktree validada, `git worktree prune` e
  `git branch -d codex/mb-02-borderize-pure`.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound usando GPT-5.6 Luna com effort xhigh.

Execute integralmente e somente a task:
docs/projects/map-editor/tasks/MB-02-borderize-pure.md

Use, nesta ordem, as skills superpowers:using-git-worktrees,
superpowers:test-driven-development e superpowers:verification-before-completion. Leia o AGENTS.md,
o BORDERIZER.md e o STATE.md do projeto Map Editor, e somente a leitura adicional indicada na task.
Rode git status e git branch --no-merged main antes de qualquer outra coisa.

packages/simulation e o molde: package puro, sem node:*, sem DOM, sem Phaser, sem dependencia
externa, sem Math.random() e sem Date.now(). Registre a fronteira em dependency-policy.json ANTES de
escrever logica. A variacao de material vem de hash de (layoutId, x, y, z), nunca de RNG livre.

Nao escreva CLI, nao toque disco, nao aplique borda em mapa real, nao toque layout, regiao, pack,
golden nem apps/. Isso e MB-03.

Faça red-green com grids sinteticos pequenos, prove determinismo e independencia de ordem de
iteracao, rode todas as verificações da task, atualize somente a linha da task no STATE.md. Crie o
commit `feat: decide map borders from the measured table`, integre por fast-forward na main, repita
corepack pnpm verify, remova worktree e branch. Não inicie MB-03. Se uma condição de parada ocorrer,
preserve o trabalho, registre o bloqueio e relate a evidência.
```
