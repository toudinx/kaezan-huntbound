# MB-03 — Camada `cells`, aplicação e aceite jogando

**Status inicial:** not-ready; depende de MB-01 e MB-02 integradas

**Classe da tarefa:** implementação geral bem especificada

**Modelo sugerido:** GPT-5.6 Luna, `xhigh`

**Validador sugerido:** o usuário, jogando. Gates automatizados antes disso.

**Rota:** `superpowers:using-git-worktrees` → `superpowers:test-driven-development` →
`superpowers:verification-before-completion`

**Paralelismo:** não.

## Objetivo

Aplicar o borderize à Venore Rotworm Cave, materializar o resultado como camada explícita no layout,
regenerar os artefatos e entregar a caverna sem ponto cinza ou preto dentro da área jogável.

Esta é a task que resolve o problema que originou o projeto.

## Resultado esperado

- Camada `cells` no schema de layout, aplicada depois das operações de colagem.
- `packages/content/src/layouts/hunts/venore-rotworm-cave.json` com as células de preenchimento
  commitadas e legíveis em diff.
- Artefatos gerados regenerados por CLI.
- `HUNT_EMPTY_TILE` reporta zero dentro da área jogável e vira erro em vez de diagnóstico.
- O usuário roda o jogo e aprova.

## Dependências e pré-condições

1. `main` limpa e `corepack pnpm verify` verde.
2. MB-01 e MB-02 integradas na `main`.
3. `docs/projects/map-editor/BORDERIZER.md` lido e vigente.

## Leitura mínima

1. `AGENTS.md`;
2. `docs/projects/map-editor/BORDERIZER.md`;
3. `.cursor/rules/20-content.mdc`, `.cursor/rules/40-game.mdc` e `.cursor/rules/50-tests.mdc`;
4. `tools/map-extractor/{layout,region,topology,cli}.ts` e testes próximos;
5. `apps/game/src/hunt/GroundCompositor.ts` — é ele que pinta o cinza e o preto hoje;
6. `packages/assets/src/hunt/HuntPack.ts`, função `deriveHuntPackKeys`;
7. `packages/content/src/layouts/hunts/venore-rotworm-cave.json`.

## Contrato congelado

**Camada `cells`.** Lista de `{ x, y, z, ground }` aplicada **depois** de todas as operações de
colagem do andar. Coordenada duplicada é erro de schema, não última-escrita-vence.

Ela recebe duas classes de célula, e confundi-las é o erro fácil aqui: as 353 células vazias que
ganham massa sólida, **e** as células de massa já existentes na fronteira com piso, cujo id é trocado
pela peça de borda. A segunda classe é maior que a primeira e não aparece na contagem de buracos.
As doze peças `356`–`367` são `blocking=true` e `ground=true`, iguais à `earth`, então a troca
preserva a colisão.

**Default de preenchimento: massa sólida.** Toda célula vazia da região vira massa. Nenhuma costura
vira passagem nesta task. Abrir salão é decisão do usuário, tomada depois, vendo o mapa.

**Nenhum id novo na paleta.** O preenchimento usa somente ids já presentes: `101`, `5711`–`5726` e
`356`–`367`. Se o borderize pedir um id fora desse conjunto, **pare** — significa que a tabela ou a
classificação de material saiu do previsto, e um id novo exigiria sprite novo no export pessoal.

**Colisão preservada.** Os 353 SQMs sem chão já estão fora da colisão hoje. Depois da aplicação, o
array `collision` de `region.json` deve ser **idêntico** ao da base. Prove com comparação, não com
inspeção.

**Goldens de replay intactos.** PB-04 e PB-05 leem colisão, não aparência. Se `hunt:check` ou
`combat:check` reprovarem, a causa não é aparência — investigue, não regenere.

**`region.sha256` e `hunt.sha256` mudam.** Isso é esperado: `palette` e `ground` mudaram. É
regeneração por CLI, não reescrita de golden. Registre os hashes antes e depois no commit.

## Escopo permitido

Schema de layout (camada `cells`), aplicação no `tools/map-extractor`, o layout da hunt, os artefatos
regenerados e a promoção de `HUNT_EMPTY_TILE` a erro.

**Fora de escopo:** editor, novo app, mudança no runtime, novo id de asset, alterar spawns,
transições ou player start.

## Red-green obrigatório

Antes do código de produção, prove pelo menos estes vermelhos:

1. schema rejeita coordenada duplicada em `cells`;
2. `cells` é aplicada depois das colagens e sobrescreve o que veio delas;
3. um layout sintético com buraco produz região sem célula vazia depois da aplicação;
4. `HUNT_EMPTY_TILE` reprova enquanto sobrar SQM vazio na área jogável;
5. comparação prova que `collision` não mudou entre base e resultado;
6. id fora do vocabulário previsto faz a aplicação parar com diagnóstico.

## Passos de implementação

1. Capture os hashes dos quatro artefatos gerados vigentes e o `collision` de cada andar.
2. Crie a worktree e rode `corepack pnpm install --prefer-offline`.
3. Implemente a camada `cells` no schema e na aplicação, por testes.
4. Rode o borderize sobre a hunt, inspecione o resultado e commite as células.
5. Regenere os artefatos pelo CLI. Compare `collision` com a base.
6. Promova `HUNT_EMPTY_TILE` a erro.
7. Rode os gates, suba `corepack pnpm dev` e olhe a caverna antes de declarar pronto.
8. Faça o ciclo Git completo.

## Verificações exigidas

Com saída fresca:

- testes de `tools/map-extractor` e `packages/map-authoring`;
- `corepack pnpm hunt:extract:check` e `corepack pnpm hunt:extract:sidecar`;
- `corepack pnpm content:check`;
- `corepack pnpm assets:pb04:hunt:check`;
- `corepack pnpm hunt:check` e `corepack pnpm combat:check`;
- `corepack pnpm verify`;
- `corepack pnpm qa:budgets`. Vermelho aqui é task de performance no backlog, nunca bloqueio.

Registre no commit: hashes antes e depois, contagem de células por classe e por andar, o número do
`qa:budgets`, e a prova de que `collision` não mudou. O `STATE.md` recebe só a linha da task.

## Critérios de aceite

- [ ] Zero SQM vazio dentro da área jogável nos dois andares.
- [ ] `collision` idêntico à base, provado por comparação.
- [ ] Nenhum id novo na paleta; `deriveHuntPackKeys` produz o mesmo conjunto.
- [ ] Goldens de PB-04 e PB-05 passam sem regeneração.
- [ ] `HUNT_EMPTY_TILE` é erro e reporta zero.
- [ ] `cells` é legível em diff e apagá-la devolve o mapa anterior.
- [ ] `verify` verde no commit integrado.
- [ ] **O usuário rodou o jogo e aprovou.**
- [ ] `STATE.md` atualizado, integração fast-forward e limpeza concluídas.

## Condições de parada

Pare e registre em `STATE.md` se o borderize pedir id fora do vocabulário previsto; se `collision`
mudar; se um golden de replay reprovar; ou após dois ciclos RED/GREEN com a mesma causa. Nenhuma
dessas se resolve regenerando golden.

## Handoff, commit e integração

- Branch: `codex/mb-03-apply-and-play`
- Worktree: `C:\Kaezan\kaezan-huntbound-mb-03-apply-and-play`
- Commit: `feat: close the holes the cave collage left behind`
- Base e destino: `main`
- Integração: `git merge --ff-only codex/mb-03-apply-and-play`
- Pós-integração: `corepack pnpm verify`
- Limpeza: remover a worktree validada, `git worktree prune` e
  `git branch -d codex/mb-03-apply-and-play`.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound usando GPT-5.6 Luna com effort xhigh.

Execute integralmente e somente a task:
docs/projects/map-editor/tasks/MB-03-apply-and-play.md

Use, nesta ordem, as skills superpowers:using-git-worktrees,
superpowers:test-driven-development e superpowers:verification-before-completion. Leia o AGENTS.md,
o BORDERIZER.md e o STATE.md do projeto Map Editor, e somente a leitura adicional indicada na task.
Rode git status e git branch --no-merged main antes de qualquer outra coisa. Confirme que MB-01 e
MB-02 estao integradas.

Antes de editar, capture os hashes dos quatro artefatos gerados e o array collision de cada andar.
Depois de aplicar, prove que collision ficou IDENTICO. Se mudar, pare e registre — nao regenere
golden. Se o borderize pedir um id fora de 101, 5711-5726 e 356-367, pare tambem: id novo exigiria
sprite novo no export pessoal, e assets:check nao cobre o profile personal.

Preencha toda celula vazia com massa solida. Nao abra passagem, nao una salao, nao mexa em spawn,
transicao nem player start.

Faça red-green, rode todas as verificações da task, suba corepack pnpm dev e OLHE a caverna antes de
declarar pronto. Registre no commit os hashes antes e depois e a contagem de celulas por andar.
Atualize somente a linha da task no STATE.md. Crie o commit `feat: close the holes the cave collage
left behind`, integre por fast-forward na main, repita corepack pnpm verify, remova worktree e
branch.

No relatorio final, diga ao usuario o que olhar e como reproduzir: o aceite e ele jogando.
```
