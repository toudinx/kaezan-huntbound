# PB-05-FIX-09 — Número de dano não re-rasteriza por frame

**Status inicial:** pending

**Classe da tarefa:** implementação de apresentação, bem especificada

**Modelo sugerido:** GPT-5.6 Luna `xhigh`. Fallback: Grok 4.6 `high`.

**Validador sugerido:** gates automatizados. Revisão frontier preferindo Grok 4.6 ou GPT-5.6 Sol —
**não** Claude Opus 5, que produziu o diagnóstico que esta card congela.

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** não. Depende de `PB-05-FIX-08` estar integrada — as duas editam `HuntScene.ts`.

## Objetivo

Parar de re-rasterizar e re-enviar para a GPU a textura de cada número de dano, a cada frame em que
ele existe.

## Diagnóstico congelado

Medido em 2026-08-19, instrumentando `CanvasRenderingContext2D.fillText` e `WebGLRenderingContext`
sobre `dev:personal`, com combate ativo (`Target #3`, vida do jogador caindo de 204 para 100):

```text
fillText   ~87 chamadas/s   |   texImage2D  ~87 chamadas/s   (um para um, continuo)
```

Custo contínuo do frame, andando vs. lutando: `p50 4,2 / 4,5 ms` nos dois; 22 draw calls nos dois.
O que o combate acrescenta são **picos**: frames acima de 33 ms passam de `0` para `4`, e o pior
frame de `26,9 ms` para `60,1 ms`.

A causa: `updateDecorationObject`, em `HuntScene.ts`, chama `.setText(...)` e `.setColor(...)`
**incondicionalmente a cada frame** em todo `damage-number` e `heal-number` vivo. Todo
`Phaser.GameObjects.Text` possui um canvas próprio; `setText` e `setColor` marcam esse canvas como
sujo, o que força `measureText` + `fillText` + `strokeText` e um `texImage2D` completo para a GPU.
O texto nunca muda depois de criado — é sempre a mesma string e a mesma cor.

Agravante: `Text` é a **única** decoração fora do pool. `decorationSpritePool` cobre `Sprite`; o
ramo de texto faz `object.destroy()`, então cada golpe cria um canvas e uma textura novos e joga
fora os anteriores.

Nota honesta de escopo: os picos maiores (100–150 ms) que também aparecem na medição executaram zero
chamadas GL e zero canvas, com a main thread ociosa. **Não são** este defeito e não estão nesta task.
Não os use como critério de aceite aqui.

## Resultado esperado

Um número de dano é rasterizado uma vez, sobe e desaparece movendo apenas transform e alpha. Objetos
de texto são reaproveitados entre golpes em vez de criados e destruídos.

## Dependências

- `PB-05-FIX-08` `done` e integrada.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/STATE.md`;
3. `apps/game/src/phaser/scenes/HuntScene.ts` — `renderCombatDecorations`, `createDecorationObject`,
   `updateDecorationObject`, `destroyCombatDecorations`, `decorationSpritePool`,
   `combatNumberColors`;
4. `apps/game/src/hunt/CombatDecorations.ts` — `createDecorationObjectPool` e o contrato de `reset`;
5. `apps/game/src/hunt/CombatFxTable.ts`;
6. `apps/game/src/hunt/HuntProbe.ts`;
7. `.cursor/rules/40-game.mdc`.

## Decisões congeladas

- **Posição, profundidade e alpha continuam sendo escritos a cada frame.** O número flutua e
  desvanece; essa animação é o efeito e não pode sumir. `setPosition`, `setDepth` e `setAlpha` são
  transform e não sujam o canvas do `Text`. **Só** `setText` e `setColor` viram condicionais.
- **Condicional por valor, não por flag de tempo.** Guarde por `decoration.id` o último texto e a
  última cor efetivamente aplicados e escreva apenas quando o valor mudar. Nada de "escreva a cada N
  frames": isso troca um defeito por um bug de cor errada.
- **`Text` entra em pool, como `Sprite`.** Use `createDecorationObjectPool` — ele já existe e já é
  genérico. O `reset` do pool de texto tem que devolver o objeto a um estado neutro: invisível,
  `alpha` 1, `rotation` 0, `scale` 1, e limpar o texto e a cor memorizados, para que o objeto
  reaproveitado não herde o valor do golpe anterior.
- **`destroyCombatDecorations` drena os dois pools.** Hoje ele drena só o de sprites; um pool de
  texto não drenado vaza objetos entre `scene.restart()`.
- **`combatNumberColors` continua sendo a fonte da cor**, com o fallback
  `combatFxForCause('attack').numberColor` já existente. Esta task não muda nenhuma cor, nem
  `CombatFxTable`.
- **`HuntProbe` ganha `decorationTextWrites`**, contador monotônico de escritas de texto ou cor
  efetivamente aplicadas. É o que torna o aceite mensurável.
- Nada de kernel, contrato, golden ou `packages/**`.

## Escopo permitido

```text
apps/game/src/phaser/scenes/HuntScene.ts
apps/game/src/hunt/CombatDecorations.ts
apps/game/src/hunt/CombatDecorations.test.ts
apps/game/src/hunt/HuntProbe.ts
apps/game/src/hunt/HuntProbe.test.ts
tests/e2e/combat-play.spec.ts
docs/playbooks/PB-05/STATE.md
```

`CombatDecorations.ts` **somente** se o pool genérico precisar de ajuste para servir `Text`. Se ele
já servir como está, não toque no arquivo.

## Fora de escopo

- Trocar `Phaser.GameObjects.Text` por bitmap font, atlas de dígitos ou sprite de número. É a
  evolução natural depois desta, e é outra task: muda a aparência e precisa de aceite visual.
- Atlas de tiles e os 326 texture binds por frame — task própria.
- O acumulador de `SimulationHost.advanceTo` — task própria.
- Os picos de 100–150 ms sem trabalho GL — não diagnosticados, não são desta task.
- Mudar cor, duração, placement, stagger ou qualquer valor de `CombatFxTable`.
- `packages/**`, kernel, contrato, golden.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-fix-09-text -b cursor/pb-05-fix-09-damage-number-text main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-09-text install --prefer-offline
```

- [ ] **2. RED.**

Prove, pelo `HuntProbe`: um número de dano vivo por vários frames produz **no máximo uma** escrita de
texto e **uma** de cor — `decorationTextWrites` não cresce com a contagem de frames; a posição e o
alpha do número **continuam** mudando entre frames; um segundo golpe com valor diferente **produz**
uma escrita nova; um objeto de texto liberado e readquirido não exibe o valor do golpe anterior; e
`decorationTextWrites` não cresce enquanto não há número na tela.

- [ ] **3. GREEN.**

- [ ] **4. RED do pool.**

Prove: golpes sucessivos não aumentam indefinidamente a contagem de objetos de texto criados —
objeto expirado volta ao pool e é reaproveitado; e `scene.restart()` não deixa objeto de texto vivo.

- [ ] **5. GREEN do pool**, drenando os dois pools em `destroyCombatDecorations`.

- [ ] **6. Gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-09-text exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-09-text --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-09-text typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-09-text combat:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-09-text verify
```

`combat:check` tem que sair `0` e byte-idêntico. Golden que mexer: **pare**.

- [ ] **7. Medir, não achar.**

Suba `corepack pnpm dev:personal`, engaje combate e mantenha por **30 segundos**. Colete no console:

```js
(() => { let n=0; const p=CanvasRenderingContext2D.prototype;
  const f=p.fillText; p.fillText=function(...a){n++;return f.apply(this,a);};
  const t0=performance.now();
  setTimeout(()=>{ p.fillText=f;
    console.log('fillText/s =', (n/((performance.now()-t0)/1000)).toFixed(1)); }, 30000); })()
```

A medição de referência **antes** da correção é `~87 fillText/s` com combate ativo. Registre o número
antes e depois na mensagem de commit. Alvo: cair pelo menos uma ordem de grandeza. Confirme na tela
que o número ainda sobe, desvanece e tem a cor certa por causa — se a animação sumir, você
condicionou o transform junto com o texto e a correção está errada.

- [ ] **8. Handoff, commit, integração e limpeza.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-09-text add apps docs tests
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-09-text commit -m "perf: rasterize each combat number once instead of every frame"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only cursor/pb-05-fix-09-damage-number-text
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-fix-09-text
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d cursor/pb-05-fix-09-damage-number-text
```

## Verificação

`biome check .` em `0`; testes de `@huntbound/game`, `typecheck`, `combat:check` e `verify` verdes;
`fillText/s` medido antes e depois.

## Critérios de aceite

- [ ] `setText` e `setColor` só são chamados quando o valor muda, provado por `decorationTextWrites`
      no `HuntProbe`.
- [ ] Posição, profundidade e alpha do número **continuam** sendo atualizados a cada frame; o número
      ainda sobe e desvanece na tela.
- [ ] As três cores por causa continuam corretas; `CombatFxTable` inalterado.
- [ ] Objetos de texto são reaproveitados por pool e não exibem valor herdado.
- [ ] `destroyCombatDecorations` drena o pool de texto e o de sprites.
- [ ] `fillText/s` com combate ativo cai pelo menos uma ordem de grandeza contra a referência de
      `~87/s`, com os dois números no commit.
- [ ] `combat:check` sai `0` e byte-idêntico.
- [ ] Nenhuma alteração em `packages/**`.

## Condições de parada

**Pare e registre bloqueio no `STATE.md`** se: `Phaser.GameObjects.Text` não permitir reuso limpo e a
única saída for bitmap font — isso muda aparência e exige aceite visual, é outra task; o pool genérico
exigir mudar o contrato de `CombatDecorations` além do `reset`; algum golden mudar; ou a mesma causa
reprovar dois ciclos RED/GREEN seguidos. Nesse último caso, escale para **Claude Opus 5 `xhigh`** com
a evidência.

## Persistência do handoff

Só a linha da task na tabela do `STATE.md`, a próxima elegível e os bloqueios. Os dois números de
`fillText/s` vão na mensagem de commit.

## Commit

`perf: rasterize each combat number once instead of every frame`

## Ciclo de conclusão

Branch-base `main`; branch `cursor/pb-05-fix-09-damage-number-text`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-fix-09-text`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, `fillText/s` antes e depois, o que foi visto na tela, comandos com exit
code, integração, limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh (fallback Grok 4.6 high).
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-FIX-09-numero-de-dano-nao-rerasteriza.md

Leia AGENTS.md, o STATE.md do PB-05 e apenas os arquivos listados na task. Confirme que
PB-05-FIX-08 esta done e integrada antes de comecar.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-fix-09-text com a branch
cursor/pb-05-fix-09-damage-number-text e rode "corepack pnpm install --prefer-offline" dentro dela.

O defeito esta medido e congelado na task, nao reinvestigue: updateDecorationObject chama setText e
setColor incondicionalmente a cada frame em todo damage-number e heal-number vivo. Cada
Phaser.GameObjects.Text tem canvas proprio, entao isso forca measureText + fillText + strokeText e um
texImage2D completo por frame. Medido: ~87 fillText/s e ~87 texImage2D/s, um para um, com combate
ativo. Alem disso Text e a unica decoracao fora do pool: o ramo de texto faz destroy().

ATENCAO ao erro obvio: setPosition, setDepth e setAlpha CONTINUAM sendo chamados a cada frame. O
numero flutua e desvanece, essa animacao e o efeito. SO setText e setColor viram condicionais, por
comparacao de valor guardado por decoration.id. Nada de "escreva a cada N frames".

Comece por RED, pelo HuntProbe: adicione decorationTextWrites, contador monotonico de escritas de
texto ou cor efetivamente aplicadas. Um numero vivo por varios frames produz no maximo uma escrita de
texto e uma de cor; posicao e alpha continuam mudando entre frames; um golpe com valor diferente
produz escrita nova; objeto reaproveitado do pool nao exibe o valor anterior.

Depois RED do pool: Text entra em createDecorationObjectPool, que ja existe e ja e generico. O reset
tem que limpar texto e cor memorizados. destroyCombatDecorations passa a drenar os DOIS pools, senao
vaza objeto entre scene.restart().

Nao mude cor, duracao, placement, stagger nem CombatFxTable. Nao troque Text por bitmap font — isso
muda aparencia e e outra task; se for a unica saida, PARE.

Rode biome check ., testes de @huntbound/game, typecheck, combat:check, build e verify. combat:check
tem que sair 0 e byte-identico. PARE se um golden mexer.

Meca antes e depois: suba dev:personal, engaje combate por 30 segundos e conte fillText/s com o
snippet que esta na task. Referencia antes da correcao: ~87/s. Alvo: cair pelo menos uma ordem de
grandeza. Registre os dois numeros no commit e confirme na tela que o numero ainda sobe, desvanece e
tem a cor certa. Nao afirme melhora sem os dois numeros.

Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe worktree e branch
removendo o diretorio antes do prune.

Nao toque em atlas de tiles nem em SimulationHost — sao outras tasks. Nao toque em packages/**. Nao
inicie a proxima task.
```
