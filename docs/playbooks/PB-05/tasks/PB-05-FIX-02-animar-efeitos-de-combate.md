# PB-05-FIX-02 — Animar os efeitos de combate

**Status inicial:** pending

**Classe da tarefa:** implementação de apresentação, bem especificada

**Modelo sugerido:** GPT-5.6 Luna `xhigh` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; a validação humana é o aceite do PB-05

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** não. Depende dos frames medidos em PB-05-FIX-01.

## Objetivo

Fazer sprite de efeito animar de verdade, tocando o timing que veio do `.dat`, em vez de congelar no
frame 0.

## Resultado esperado

Sangue, cadáver e o efeito azul deixam de ser uma estampa parada. O módulo que decide o frame é puro
e testável, e serve de base para todo efeito que PB-05-FIX-03 e FIX-04 vão acrescentar.

## Dependências

- PB-05-FIX-01 `done` e integrada. Sem o pack pessoal regenerado não há efeito com mais de um frame
  para animar, e o número de frames de cada efeito é resultado daquela task.

## Leitura mínima

1. esta task;
2. `docs/superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md`, "Direção escolhida" §2;
3. `docs/playbooks/PB-05/STATE.md`, incluindo os frames registrados por PB-05-FIX-01;
4. `apps/game/src/hunt/ActorFrame.ts` e `ActorFrame.test.ts` — o padrão a espelhar;
5. `apps/game/src/hunt/CombatDecorations.ts`;
6. `apps/game/src/phaser/scenes/HuntScene.ts`, `renderCombatDecorations`,
   `createDecorationObject` e `updateDecorationObject`;
7. `packages/assets/src/manifest/schemas.ts`, `AssetAnimationGroupSchema`;
8. `packages/assets/src/providers/types.ts`, `ResolvedAsset`;
9. `.cursor/rules/40-game.mdc`.

## Decisões congeladas

- **`anims` do Phaser não é usado.** A cena já roda num relógio de render derivado do tick
  (`renderClock * TICK_DURATION_MS`). O relógio interno do Phaser seria uma segunda fonte de tempo na
  apresentação, e a divergência apareceria como efeito fora de sincronia com o dano.
- `EffectAnimation` é **função pura**: recebe `AssetAnimationGroup` e tempo decorrido, devolve índice
  de frame. Sem Phaser, sem asset, sem estado.
- `frameCount === 1` devolve `0`. Não é guarda defensiva: é o perfil `test` inteiro.
- Tempo decorrido é sempre medido a partir do `createdAtMs` da decoração, que já vem de
  `event.tick * TICK_DURATION_MS`. Nada de `Date.now()`.
- O efeito **toca uma vez** e some no TTL. Nada de loop: efeito em loop vira poluição visual numa
  hunt com vários rotworms.
- Sprites de efeito passam a vir de um **pool**. Hoje `renderCombatDecorations` faz `destroy()` a
  cada expiração e `add.sprite` a cada criação; com um efeito por golpe isso vira churn de
  GameObject no laço de render.
- Nenhuma regra nova na apresentação. Nada aqui lê estado do kernel.

## Escopo permitido

```text
apps/game/src/hunt/EffectAnimation.ts
apps/game/src/hunt/EffectAnimation.test.ts
apps/game/src/hunt/CombatDecorations.ts
apps/game/src/hunt/CombatDecorations.test.ts
apps/game/src/hunt/HuntProbe.ts
apps/game/src/hunt/HuntProbe.test.ts
apps/game/src/phaser/scenes/HuntScene.ts
docs/playbooks/PB-05/STATE.md
```

## Fora de escopo

- Tabela de FX, ataque, conjuração, cura — PB-05-FIX-03 e FIX-04.
- Flash, hit-stop, shake, lunge — PB-05-FIX-05.
- Spec Playwright — PB-05-FIX-06.
- `packages/**` inteiro. Se `ResolvedAsset` parecer faltar campo, **pare**: mudar contrato de asset
  não é escopo desta task.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-fix-02-anim -b codex/pb-05-fix-02-animate-effects main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-02-anim install --prefer-offline
```

- [ ] **2. Escrever os testes RED de `EffectAnimation`.**

Prove: com `frameCount` 1, qualquer tempo devolve `0`; com N frames e fases uniformes, o índice
avança na fronteira de cada fase e nunca ultrapassa `startFrame + frameCount - 1`; fases de duração
diferente respeitam a duração declarada, não a média; tempo antes de `createdAtMs` devolve o
primeiro frame em vez de índice negativo; tempo além da soma das fases fica no último frame, porque
o efeito não faz loop; `startFrame` deslocado é respeitado.

`phaseDurationsMs` é um par `[min, max]` por fase — decida como um único número sai desse par,
registre a escolha em uma linha no commit e seja consistente. Determinismo importa mais que
fidelidade ao jitter do cliente.

Dois casos reais que o schema permite e que precisam de teste, não de suposição:
`phaseDurationsMs` **vazio** — `AssetAnimationGroupSchema` não exige mínimo, e o grupo `idle` do
outfit no pack pessoal já vem assim — e `frameCount` maior que o número de fases declaradas. Escolha
o comportamento, prove-o, e não deixe nenhum dos dois cair em divisão por zero ou índice `NaN`.

- [ ] **3. Implementar `EffectAnimation`; obter GREEN.**

- [ ] **4. Escrever o teste RED do pool de sprites.**

Prove: decorações que expiram e são substituídas não aumentam a contagem de GameObjects criados; um
sprite reaproveitado não carrega frame, alpha, rotação nem escala da decoração anterior; o
`HuntProbe` expõe o frame corrente de cada decoração visível, para que o teste afirme animação sem
olhar pixel.

- [ ] **5. Implementar o pool e o consumo de `EffectAnimation` em `HuntScene`; obter GREEN.**

Sprite de efeito passa a receber `setFrame` pelo índice calculado. O cadáver usa o mesmo caminho.

- [ ] **6. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-02-anim exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-02-anim --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-02-anim typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-02-anim combat:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-02-anim build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-02-anim verify
```

`combat:check` tem que sair `0` e byte-idêntico. Se um golden mexeu, alguma regra vazou para a
apresentação: **pare e investigue**, não regenere.

- [ ] **7. Confirmar na tela.**

`corepack pnpm dev:personal`, mate um rotworm, confirme que o sangue percorre seus frames em vez de
piscar uma estampa parada.

- [ ] **8. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-02-anim add apps docs
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-02-anim commit -m "feat: play packed effect animations on the fixed render clock"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb-05-fix-02-animate-effects
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-fix-02-anim
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb-05-fix-02-animate-effects
```

## Verificação

Testes de `@huntbound/game`, `typecheck`, `combat:check`, `build` e `verify` verdes; `biome check .`
em `0`.

## Critérios de aceite

- [ ] `EffectAnimation` é puro, sem Phaser e sem relógio próprio, com teste para `frameCount === 1`.
- [ ] O índice de frame respeita a duração declarada de cada fase e nunca sai do intervalo.
- [ ] O efeito toca uma vez e para no último frame; não faz loop.
- [ ] Sangue, cadáver e efeito azul animam com `dev:personal`.
- [ ] Sprites de efeito vêm de pool; nada de `destroy()` por expiração no laço de render.
- [ ] Sprite reaproveitado não herda estado visual do anterior.
- [ ] `HuntProbe` expõe o frame corrente das decorações visíveis.
- [ ] `combat:check` sai `0` e byte-idêntico.
- [ ] Nenhuma alteração em `packages/**`.
- [ ] Nenhuma dependência externa nova entrou.

## Condições de parada

**Pare** se: `ResolvedAsset` não trouxer informação suficiente para escolher o frame; os efeitos
regenerados em FIX-01 tiverem apenas um frame — nesse caso a premissa da task caiu e o caminho é
empacotar efeito com animação, o que é decisão de escopo, não de implementação; algum efeito vier
com `patternX`, `patternY` ou `patternZ` maior que `1`, porque aí o índice de frame deixa de ser
função só do tempo e vira layout de atlas, que é outro problema; ou `combat:check` mudar.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, testes, comandos e exit codes, modelo e effort
usados, a regra escolhida para reduzir `phaseDurationsMs` a um número, e a próxima task elegível.

## Commit

`feat: play packed effect animations on the fixed render clock`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb-05-fix-02-animate-effects`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-fix-02-anim`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, regra de redução das fases, contagem de GameObjects antes e depois,
comandos com exit code, o que foi visto na tela, integração, limpeza, desvios e próxima task
elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-FIX-02-animar-efeitos-de-combate.md

Leia AGENTS.md, o STATE.md do PB-05, a spec
docs/superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md e apenas os arquivos indicados pela
task. Confirme que PB-05-FIX-01 esta done e integrada e leia no STATE.md os frames medidos de
draw-blood, hit-area e magic-blue.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-fix-02-anim com a branch
codex/pb-05-fix-02-animate-effects e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Entregue EffectAnimation.ts como funcao PURA: recebe AssetAnimationGroup e tempo
decorrido desde createdAtMs, devolve indice de frame. Sem Phaser, sem anims, sem Date.now, sem loop.
frameCount 1 devolve 0 — o perfil test inteiro e assim. Tempo alem da soma das fases fica no ultimo
frame.

phaseDurationsMs e um par [min, max] por fase: decida como reduzir a um numero, registre a escolha em
uma linha no commit e seja consistente. Determinismo vale mais que jitter fiel.

Depois troque o ciclo destroy/add de sprites de decoracao por um pool, e prove que sprite
reaproveitado nao herda frame, alpha, rotacao nem escala do anterior. Exponha o frame corrente das
decoracoes visiveis no HuntProbe, para o teste afirmar animacao sem olhar pixel.

Rode biome check ., testes de @huntbound/game, typecheck, combat:check, build e verify.
combat:check tem que sair 0 e byte-identico: se um golden mexeu, uma regra vazou para a apresentacao.
PARE e investigue, nunca regenere golden para passar.

Suba dev:personal, mate um rotworm e confirme que o sangue percorre seus frames.

Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe worktree e branch
removendo o diretorio antes do prune.

Nao crie tabela de FX, nao trate combat/attacked nem ability/cast, nao toque em packages/**. Isso e
PB-05-FIX-03 em diante. Nao inicie a proxima task.
```
