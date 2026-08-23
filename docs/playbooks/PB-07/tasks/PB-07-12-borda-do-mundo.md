# PB-07-12 — Borda do mundo

**Status inicial:** pending

**Classe da tarefa:** apresentação, bem especificada

**Modelo sugerido:** Luna `max` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; a validação humana é o usuário olhando

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** independente de toda a trilha de combate. Pode ser puxada para frente a qualquer
momento se o mapa incomodar mais que o combate. Não paralelize com PB-07-02, que também mexe em
`HuntScene.ts`.

## Objetivo

Parar de mostrar buraco. Onde a região extraída não tem chão, hoje aparece o `backgroundColor` do
canvas — um preto que contrasta com o verde do mapa e faz a borda parecer defeito.

## Resultado esperado

A borda do mundo lê como borda: o mapa termina, e não parece que o jogo falhou em carregar alguma
coisa. A câmera não passeia por região vazia.

## Dependências

- Nenhuma da trilha de combate.
- **Não** rode junto com PB-07-02: as duas editam `HuntScene.ts`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md`, "O problema, medido", linha 6, e `STATE.md`;
3. `.cursor/rules/40-game.mdc`;
4. `apps/game/src/hunt/GroundCompositor.ts` — `resolveGroundSample` e `groundCompositionStats`, que
   já são o único lugar que decide se uma célula tem chão;
5. `apps/game/src/hunt/CameraFraming.ts` e `CameraController.ts`;
6. `apps/game/src/phaser/scenes/HuntScene.ts`, `renderFloor` e `depthFor`;
7. `apps/game/src/phaser/createGame.ts`, `backgroundColor: '#060b16'`;
8. `apps/game/src/hunt/HuntProbe.ts` — `drawn.unresolvedGroundCells`, que **já é medido** e é como
   o teste vai afirmar estado;
9. `packages/content/src/generated/hunts/venore-rotworm-cave/region.json`, para ver a forma real da
   região.

## Decisões congeladas

- **Nada de simulação muda.** Célula sem chão continua sendo o que é para o kernel; isto é
  exclusivamente apresentação. Não use esta task para mexer em colisão.
- **`resolveGroundSample` continua o ponto único** que decide se uma célula tem chão. O tratamento
  novo consome a resposta dele; não duplica a decisão.
- **Não reextraia a região.** Aumentar a janela é PB-07-13. Esta task trata o que já existe — e
  precisa continuar funcionando quando a janela crescer.
- **A câmera não mostra o que não existe.** Limite o enquadramento à área com chão. Se a região for
  menor que o viewport, a sobra é tratada, não ignorada.
- **O jogador não pode ficar preso** por causa do clamp de câmera. Se o clamp esconder o personagem,
  o clamp está errado.
- **Escolha visual é sua.** Tile de void, vinheta, escurecimento gradual — decida, registre em uma
  linha no commit e siga. É barato de reverter e o jogo mostra.

## Escopo permitido

```text
apps/game/src/hunt/GroundCompositor.ts
apps/game/src/hunt/GroundCompositor.test.ts
apps/game/src/hunt/CameraFraming.ts
apps/game/src/hunt/CameraFraming.test.ts
apps/game/src/hunt/CameraController.ts
apps/game/src/phaser/scenes/HuntScene.ts
apps/game/src/phaser/createGame.ts
apps/game/src/hunt/HuntProbe.ts
tests/e2e/**
docs/playbooks/PB-07/STATE.md
```

## Fora de escopo

- reextração e janela maior — PB-07-13;
- `packages/content`, `packages/simulation`, `tools/map-extractor`;
- anel de alvo e shake — PB-07-02.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb07-12-edges -b codex/pb07-12-world-edge main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-12-edges install --prefer-offline
```

- [ ] **2. Medir antes.**

`groundCompositionStats` já conta células resolvidas e não resolvidas. Registre os números dos dois
andares da hunt atual — é a baseline do relatório e o que diz se o tratamento cobriu tudo.

- [ ] **3. RED do tratamento de célula sem chão.**

Toda célula que `resolveGroundSample` não resolve recebe tratamento; nenhuma fica com o background
do canvas exposto; o tratamento fica **abaixo** de tudo em profundidade; uma célula com chão não é
tratada.

- [ ] **4. RED do clamp de câmera.**

O enquadramento não sai da área com chão; com região menor que o viewport, o comportamento é
definido e testado; o jogador permanece visível em qualquer posição válida, **inclusive nas quatro
quinas** — é lá que o clamp quebra.

- [ ] **5. GREEN**, reaproveitando o pool de objetos que a cena já usa para decoração. Célula tratada
      não pode virar sprite criado e destruído por frame.

- [ ] **6. Spec de browser no projeto `correctness`.**

Afirmando estado: em cada um dos quatro viewports, o probe reporta que nenhuma célula visível ficou
sem tratamento, e o jogador está dentro do enquadramento nas quinas do mapa.

- [ ] **7. Gates, olhar, integrar e limpar.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-12-edges verify
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-12-edges dev
git -C C:\Kaezan\kaezan-huntbound-pb07-12-edges add apps tests docs
git -C C:\Kaezan\kaezan-huntbound-pb07-12-edges commit -m "feat: stop the world edge from reading as a hole"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-12-world-edge
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb07-12-edges
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-12-world-edge
```

Ande até as quatro bordas e até os dois andares. Screenshot de cada uma no relatório.

## Verificação

`verify` verde na worktree e no integrado. Specs de browser estáveis **sem `retries`**. Números de
`groundCompositionStats` antes e depois. Screenshots das quatro bordas.

Se as baselines de screenshot do shell mudarem, revise-as no tamanho original antes de aceitar — foi
o que aconteceu no PB-06-08 e é esperado quando a apresentação muda de verdade.

## Critérios de aceite

- [ ] Nenhuma célula visível sem chão mostra o `backgroundColor` do canvas.
- [ ] O tratamento fica abaixo de tudo em profundidade.
- [ ] `resolveGroundSample` continua o ponto único da decisão.
- [ ] O objeto do tratamento é reaproveitado entre frames, não recriado.
- [ ] A câmera não enquadra área sem chão, e o jogador continua visível nas quatro quinas.
- [ ] Nada de `packages/**` ou `tools/**` foi tocado.
- [ ] A escolha visual está registrada em uma linha no commit.
- [ ] `corepack pnpm verify` sai `0` depois da integração.

## Condições de parada

**Pare** se: o clamp de câmera não puder manter o jogador visível sem esconder a borda; ou se o
tratamento exigir mudar `region.json` ou o extrator — isso é PB-07-13.

## Persistência do handoff

`STATE.md`: status, branch, commit, escolha visual, números de composição antes e depois, modelo e
effort, próxima task elegível.

## Commit

`feat: stop the world edge from reading as a hole`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-12-world-edge`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb07-12-edges`; integração por `--ff-only`; verificação pós-integração
por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Escolha visual e por quê, números antes e depois, screenshots das quatro bordas e dos dois andares,
desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Luna max ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07\tasks\PB-07-12-borda-do-mundo.md

Leia AGENTS.md, .cursor/rules/40-game.mdc, docs/playbooks/PB-07/README.md, o STATE.md e apenas os
arquivos indicados pela task.

NAO rode esta task junto com PB-07-02: as duas editam HuntScene.ts.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb07-12-edges com a branch codex/pb07-12-world-edge e
rode "corepack pnpm install --prefer-offline" dentro dela.

MEÇA ANTES: groundCompositionStats ja conta celulas resolvidas e nao resolvidas. Registre os numeros
dos dois andares — e a baseline do relatorio.

Comece por RED.

(1) Toda celula que resolveGroundSample nao resolve recebe tratamento visual; nenhuma fica mostrando
o backgroundColor '#060b16' do canvas; o tratamento fica ABAIXO de tudo em profundidade; celula com
chao NAO e tratada. resolveGroundSample continua o PONTO UNICO da decisao: consuma a resposta dele,
nao duplique.

(2) A camera nao enquadra area sem chao. Com regiao menor que o viewport, o comportamento e definido
e testado. O jogador continua VISIVEL em qualquer posicao valida, INCLUSIVE NAS QUATRO QUINAS — e la
que o clamp quebra. Se o clamp esconder o personagem, o clamp esta errado.

Reaproveite o pool de objetos que a cena ja usa para decoracao. Celula tratada nao pode virar sprite
criado e destruido por frame.

NAO reextraia a regiao nem toque em packages/** ou tools/**. Aumentar a janela e PB-07-13; o seu
tratamento precisa continuar funcionando quando ela crescer.

Escolha visual e sua — tile de void, vinheta, escurecimento gradual. Decida, registre em uma linha no
commit e siga.

Escreva spec no projeto correctness afirmando ESTADO nos quatro viewports: nenhuma celula visivel sem
tratamento, jogador dentro do enquadramento nas quinas. Sem retries.

Rode verify. NUNCA rode playwright test direto. Suba corepack pnpm dev, ande ate as quatro bordas e
os dois andares, e tire screenshot de cada. Se as baselines de screenshot do shell mudarem, revise no
tamanho original antes de aceitar. Commite, integre por fast-forward, reverifique e limpe worktree e
branch removendo o diretorio antes do prune.

Pare se o clamp nao puder manter o jogador visivel sem esconder a borda. Nao inicie a proxima task.
```
