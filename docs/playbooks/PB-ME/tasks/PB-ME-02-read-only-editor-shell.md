# PB-ME-02 — Editor local read-only

**Status inicial:** not-ready; depende de PB-ME-01 integrada

**Classe da tarefa:** implementação geral bem especificada

**Modelo sugerido:** GPT-5.6 Luna, `max`

**Validador sugerido:** gates automatizados; frontier apenas por escalonamento

**Rota:** `superpowers:using-git-worktrees` → `superpowers:test-driven-development` →
`game-studio:phaser-2d-game` → `game-studio:game-ui-frontend` →
`game-studio:game-playtest` → `superpowers:verification-before-completion`

**Paralelismo:** não. Começa somente após PB-ME-01 integrada e verde.

## Objetivo

Criar a aplicação local isolada que abre a seed autorada da Venore Rotworm Cave, renderiza seus
andares com os assets reais e oferece navegação e inspeção suficientes para validar o contrato antes
de implementar qualquer edição.

## Resultado esperado

`corepack pnpm map:edit -- --map venore-rotworm-cave` abre em `127.0.0.1:5174` uma tela com:

- canvas Phaser central com o mapa fiel ao jogo;
- seletor de andar, pan, zoom, grade opcional e coordenada sob o cursor;
- inspector read-only do SQM com stack ordenado, `clientId`, categoria e flags derivadas;
- paleta DOM pesquisável dos terrenos/objetos do pack local, com thumbnails lazy;
- badges de source, estado `published` e perfil de assets ativo;
- mensagem diagnóstica clara para mapa, manifesto ou sprite ausente.

Nenhuma ferramenta altera estado ou escreve arquivo nesta task.

## Dependências

- PB-ME-01 integrada em `main`, `STATE.md` atualizado e `corepack pnpm verify` verde.
- A seed v2 da Venore cave abre por `map:check`.
- Perfis `test` e `personal` existentes continuam sendo as únicas fontes visuais locais.

## Leitura mínima

1. `AGENTS.md`;
2. esta task e `docs/playbooks/PB-ME/{README,STATE}.md`;
3. APIs públicas reais de `@huntbound/map-authoring` entregues pela PB-ME-01;
4. `apps/game/src` apenas nos loaders/renderização de mapa e assets reutilizáveis;
5. `packages/assets/src` nas APIs públicas de manifesto e pack;
6. `tools/dev/start.ts`, configs Vite e Playwright existentes;
7. `.cursor/rules/10-boundaries.mdc`, `.cursor/rules/30-assets.mdc`,
   `.cursor/rules/40-game.mdc` e `.cursor/rules/50-tests.mdc`.

Não copie regras de jogo para o editor e não importe módulos internos de `apps/game` como atalho.
Extraia componente browser-safe compartilhável somente se houver duplicação real e dentro do escopo.

## Decisões congeladas

- App separado em `apps/map-editor`, não uma rota ou modo de `apps/game`.
- Bind exclusivo em `127.0.0.1`; host público exige mudança explícita futura.
- Phaser 4.2.1 + TypeScript + Vite; painéis densos ficam em DOM/CSS.
- Renderização lê o documento autorado; não lê OTBM/Canary e não lê artefato gerado como fonte.
- Assets são resolvidos por manifesto/profile; nenhum path de sprite entra no domínio.
- A paleta começa com `object`/`clientId`. Criaturas podem aparecer no inspector de spawn em task
  futura; NPC não existe no contrato atual.
- `build:site` continua construindo somente `@huntbound/game`. O editor pode ter build próprio, mas
  não entra em `dist/game` nem no deploy.
- Sem edit, draft, autosave, publish, undo/redo, spawn ou transition tools nesta task.

## Escopo permitido

- `apps/map-editor/**`;
- `packages/map-authoring/**` somente para adapter browser-safe comprovadamente ausente;
- `packages/assets/**` somente para API pública browser-safe comprovadamente ausente;
- `tools/map-authoring/**` para servidor local read-only;
- root scripts/configs e testes de arquitetura/QA estritamente necessários;
- `docs/playbooks/PB-ME/STATE.md` para handoff.

Não modifique a seed, artefatos gerados, packs, gameplay, simulação, save ou golden.

## Red-green obrigatório

Antes da implementação, crie testes que falhem cobrindo:

1. root script `map:edit` ausente e configuração que não permite bind público;
2. loader read-only converte a seed v2 em view model sem mutá-la;
3. floor switching e hit-test de coordenadas para pan/zoom;
4. inspector preserva ordem do stack e associa flags/asset corretos;
5. `build:site` não alcança `@huntbound/map-editor` nem inclui um marcador exclusivo do editor;
6. smoke browser abre o mapa sem erro de console em viewport desktop mínimo.

Prefira testar transformações puras fora do Phaser e reservar browser QA para integração visível.

## Passos de implementação

1. Crie `@huntbound/map-editor` com versões já pinadas no workspace.
2. Crie servidor local read-only que resolve somente map IDs conhecidos e paths dentro das raízes
   permitidas; rejeite traversal e host diferente de loopback.
3. Implemente shell, layout responsivo e cena Phaser usando as APIs públicas reais.
4. Carregue floors/cells e assets sob demanda; sprites ausentes recebem diagnóstico, não silêncio.
5. Implemente pan/zoom, seletor de andar, grade, hover e inspector read-only.
6. Implemente paleta DOM com busca e virtualização/lazy thumbnails suficiente para não decodificar o
   pack inteiro no boot.
7. Adicione smoke test e prova executável de isolamento do bundle.
8. Rode gates, faça inspeção visual em browser real e conclua o ciclo Git.

## Verificações exigidas

Com saída fresca:

- testes direcionados de `apps/map-editor` e `tools/map-authoring`;
- `corepack pnpm --filter @huntbound/map-editor typecheck`;
- `corepack pnpm --filter @huntbound/map-editor build`;
- `corepack pnpm map:check -- --map venore-rotworm-cave`;
- `corepack pnpm architecture:check`;
- `corepack pnpm build:site` e o teste de isolamento do editor;
- smoke Playwright do editor nos viewports desktop mínimo e 2560×1305;
- `corepack pnpm verify`.

No browser, capture screenshot da visão geral e de cada andar, confirme zero erro inesperado no
console e compare visualmente ao jogo atual. Pare o servidor/preview que a task subir antes da
limpeza.

## Critérios de aceite

- [ ] Comando local abre somente em loopback e mostra a seed v2 real.
- [ ] Todos os andares, stacks e assets disponíveis são inspecionáveis.
- [ ] Pan, zoom, grade, hover e troca de andar possuem testes e funcionam no browser.
- [ ] Paleta não carrega/decodifica todos os thumbnails no boot.
- [ ] Ausência de mapa/pack/sprite gera diagnóstico acionável.
- [ ] Não existe escrita em disco nem edição de mapa.
- [ ] `build:site` não inclui app, código ou marcador exclusivo do editor.
- [ ] `verify` verde no commit integrado.
- [ ] `STATE.md`, integração fast-forward e limpeza concluídos.

## Condições de parada

Pare após dois ciclos RED/GREEN com a mesma causa ou se a UI exigir mudar o schema v2, expor o
filesystem ao browser, adicionar dependência não pinada ou alterar o renderer do jogo. Registre o
bloqueio; não antecipe PB-ME-03.

## Handoff, commit e integração

- Branch: `codex/pbme-02-editor-shell`
- Worktree: `C:\Kaezan\kaezan-huntbound-pbme-02-editor-shell`
- Commit: `feat: open authored maps in a local editor`
- Base e destino: `main`
- Integração: `git merge --ff-only codex/pbme-02-editor-shell`
- Pós-integração: `corepack pnpm verify`
- Limpeza: remover a worktree validada, `git worktree prune` e
  `git branch -d codex/pbme-02-editor-shell`.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound usando GPT-5.6 Luna com effort max.

Execute integralmente e somente a task:
docs/playbooks/PB-ME/tasks/PB-ME-02-read-only-editor-shell.md

Use, nesta ordem, as skills superpowers:using-git-worktrees,
superpowers:test-driven-development, game-studio:phaser-2d-game,
game-studio:game-ui-frontend, game-studio:game-playtest e
superpowers:verification-before-completion. Leia o AGENTS.md, o README/STATE do PB-ME e apenas a
leitura adicional indicada na task. Confirme que PB-ME-01 está integrada e verde.

Crie somente o app local read-only em apps/map-editor, o servidor loopback, a navegação/inspeção e
os testes previstos. Não implemente edição, draft, publish, undo/redo, spawn tools nem importação do
Canary. Prove por teste e build que o editor não entra no site publicado.

Faça red-green, execute todos os gates e a inspeção browser da task, atualize somente a linha
necessária do STATE.md e crie o commit `feat: open authored maps in a local editor`. Integre por
fast-forward na main, repita `corepack pnpm verify`, pare os processos que subiu e remova worktree e
branch integradas. Não inicie PB-ME-03. Se uma condição de parada ocorrer, preserve o trabalho,
registre o bloqueio e relate a evidência.
```
