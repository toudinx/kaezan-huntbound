# PB-05-FIX-08 — Transição alheia não repinta o chão

**Status inicial:** pending

**Classe da tarefa:** implementação de apresentação, bem especificada

**Modelo sugerido:** GPT-5.6 Luna `xhigh`. Fallback: Grok 4.6 `high`.

**Validador sugerido:** gates automatizados. Revisão frontier preferindo Grok 4.6 ou GPT-5.6 Sol —
**não** Claude Opus 5, que produziu o diagnóstico que esta card congela.

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** não com FIX-09. As duas tocam `HuntScene.ts`. Execute FIX-08 primeiro.

## Objetivo

Parar o freeze de ~25 ms que acontece quando **outra criatura** troca de andar, e parar de apagar da
apresentação a criatura que trocou de andar.

## Diagnóstico congelado

Medido em 2026-08-19 com instrumentação temporária em `renderFloor`, sobre `dev:personal`:

```text
DIAG floorRebuild floorChanged=false transitions=2
DIAG renderFloor 25.9ms sprites=637
```

O andar **não mudou** (`floorChanged=false`); um rotworm desceu, e a cena destruiu e recriou os 637
sprites do mapa. Três ocorrências em 45 s. No golden `packages/test-fixtures/hunt/pb04`: 7
`actor/transitioned` em 599 ticks — uma a cada ~4 s, quatro delas nos primeiros 6 s.

Custo contínuo do frame medido: `p50 4,2 ms`, `p90 4,5 ms`, 22 draw calls — igual andando e lutando.
O jogo **não** está sobrecarregado. O que se sente são estes picos isolados.

Duas causas, no mesmo caminho de evento:

1. `isFloorEvent` em `HuntScene.ts` devolve `true` para **qualquer** `actor/transitioned`, e a
   condição de `subscribeEvents` chama `renderFloor()`. A outra metade da condição,
   `floorBefore !== presentation.floor()`, **já** cobre o caso real: `activeFloor` só muda na
   transição do jogador. A cláusula `|| events.some(isFloorEvent)` é dano puro.
2. `HuntPresentation.handle`, no caso `actor/transitioned`, faz `actorsById.delete` para todo ator
   que não é o jogador. O kernel mantém essa criatura viva e continua emitindo `actor/moved` dela,
   o que produz `Move event references unknown actor <id>` por tick, para sempre. Pior: o teste em
   `HuntPresentation.test.ts` prova que a criatura é apagada **mesmo quando desce para o mesmo andar
   do jogador** — ela vira um inimigo invisível que continua atacando.

## Resultado esperado

Um rotworm usar uma escada custa uma atualização de roster, não uma repintura do mapa. Um rotworm
que segue o jogador pelo mesmo buraco continua desenhado e continua clicável.

## Dependências

- `PB-05-FIX-07` `done` e integrada (está).

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/STATE.md`;
3. `apps/game/src/phaser/scenes/HuntScene.ts` — `isFloorEvent`, `isRosterEvent`, o `subscribeEvents`
   de `create()`, `renderFloor`, `syncActorRoster`, `syncActorSprites`;
4. `apps/game/src/hunt/HuntPresentation.ts` — `handle`, caso `actor/transitioned`; `actors`;
   `buildFloorDrawCommands`;
5. `apps/game/src/hunt/HuntPresentation.test.ts`;
6. `apps/game/src/hunt/HuntProbe.ts`;
7. `.cursor/rules/40-game.mdc`.

## Decisões congeladas

- **Só a transição do jogador repinta o chão.** A condição correta é exatamente
  `floorBefore !== presentation.floor()`. Não invente uma checagem de `playerEntityId` dentro de
  `isFloorEvent`: a comparação de andar já é a fonte de verdade e não duplica estado.
- **`actor/transitioned` é evento de roster.** Ele passa a contar em `isRosterEvent`, junto de
  `spawned`, `despawned` e `died`. Sem isso, a criatura que sai do andar deixa um sprite fantasma na
  tela, porque nada dispara `syncActorRoster`.
- **A apresentação para de apagar o ator que transiciona.** Ela atualiza `position`, `previous`,
  `target` e limpa `motion`, exatamente como já faz para o jogador, e deixa o filtro de andar decidir
  o que é desenhado. Esse filtro **já existe** em dois lugares e não precisa ser escrito:
  `buildFloorDrawCommands` só emite ator com `position.z === z`, e `syncActorSprites` pula ator com
  `position.z !== presentation.floor()`.
- **`activeFloor` continua mudando só pelo jogador.** Atualizar a posição de um ator alheio não pode
  mexer no andar ativo.
- **O teste de transição em `HuntPresentation.test.ts` muda de propósito.** Hoje ele afirma
  `toHaveLength(1)` depois de o jogador **e** o rotworm descerem para `z: 8`. Esse número passa a ser
  `2`, e `drawCommands()` passa a conter os dois. Isso é correção de comportamento provado, não
  enfraquecimento de asserção: justifique no commit. Todo o resto do arquivo continua valendo.
- **`HuntProbe` ganha `floorRebuilds`**, um contador monotônico de execuções de `renderFloor`. É o
  que torna o aceite mensurável em vez de subjetivo. É leitura pura, como todo o resto do probe.
- Nada de kernel, contrato, golden ou `packages/**`. Isto é apresentação.

## Escopo permitido

```text
apps/game/src/phaser/scenes/HuntScene.ts
apps/game/src/hunt/HuntPresentation.ts
apps/game/src/hunt/HuntPresentation.test.ts
apps/game/src/hunt/HuntProbe.ts
apps/game/src/hunt/HuntProbe.test.ts
tests/e2e/hunt-play.spec.ts
docs/playbooks/PB-05/STATE.md
```

## Fora de escopo

- Números de dano, `Text`, pooling de decoração — **PB-05-FIX-09**.
- Atlas de tiles e redução dos 326 texture binds por frame — task própria, ainda não escrita.
- O acumulador de `SimulationHost.advanceTo` que não descarta o excesso — task própria.
- Qualquer alteração em `packages/**`, no kernel, em contrato ou em golden.
- Otimizar `renderFloor` em si. Esta task reduz a **frequência** dele, não o custo unitário.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-fix-08-floor -b cursor/pb-05-fix-08-transition-keeps-floor main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-08-floor install --prefer-offline
```

- [ ] **2. RED em `HuntPresentation`.**

Prove: um ator não-jogador que transiciona **continua** em `actors()`, com `position`, `previous` e
`target` no destino e sem `motion` residual; a transição dele **não** muda `floor()`; ele aparece em
`drawCommands()` quando o destino é o andar ativo e **não** aparece quando não é; um `actor/moved`
dele depois da transição **não** emite diagnóstico. Ajuste o teste existente de transição para o
comportamento novo (`toHaveLength(2)`), mantendo as demais asserções.

- [ ] **3. GREEN em `HuntPresentation`.**

- [ ] **4. RED na cena.**

Prove, pelo `HuntProbe`: uma transição de ator não-jogador **não** incrementa `floorRebuilds`; uma
transição do jogador **incrementa**; depois da transição alheia o ator que saiu do andar não deixa
sprite visível; e o ator que desce para o mesmo andar do jogador continua com sprite visível.

- [ ] **5. GREEN na cena.** Faça `isRosterEvent` cobrir `actor/transitioned`, apague a cláusula
      `|| events.some(isFloorEvent)` e remova `isFloorEvent` se ele ficar sem uso. Atualize o
      comentário de bloco acima dele: ele descreve o defeito antigo e passaria a mentir.

- [ ] **6. Gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-08-floor exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-08-floor --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-08-floor typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-08-floor hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-08-floor combat:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-08-floor verify
```

`hunt:check` e `combat:check` têm que sair `0` e byte-idênticos: esta task não toca o kernel. Golden
que mexer significa que você saiu do escopo — **pare**.

- [ ] **7. Medir, não achar.**

Suba `corepack pnpm dev:personal`, jogue **60 segundos** deixando os rotworms circularem, e colete o
frame no console do browser:

```js
(async () => { const f=[]; let l=performance.now();
  await new Promise(r=>{let n=0;const t=()=>{const w=performance.now();f.push(w-l);l=w;
    if(++n<3600)requestAnimationFrame(t);else r();};requestAnimationFrame(t);});
  const s=[...f].sort((a,b)=>a-b);
  console.log({p50:s[s.length>>1], p99:s[Math.floor(s.length*0.99)], max:s[s.length-1],
    over33:s.filter(x=>x>33).length, over50:s.filter(x=>x>50).length}); })()
```

Registre os números **antes** e **depois** na mensagem de commit. Alvo objetivo: `over50 === 0` numa
sessão de 60 s andando sem combate. Picos durante combate são FIX-09 e podem sobrar aqui.

- [ ] **8. Handoff, commit, integração e limpeza.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-08-floor add apps docs tests
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-08-floor commit -m "fix: keep the floor painted when another creature takes the stairs"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only cursor/pb-05-fix-08-transition-keeps-floor
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-fix-08-floor
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d cursor/pb-05-fix-08-transition-keeps-floor
```

## Verificação

`biome check .` em `0`; testes de `@huntbound/game`, `typecheck`, `hunt:check`, `combat:check` e
`verify` verdes; medição de frame registrada antes e depois.

## Critérios de aceite

- [ ] Transição de ator não-jogador **não** dispara `renderFloor`, provado por `floorRebuilds` no
      `HuntProbe`.
- [ ] Transição do jogador **continua** disparando `renderFloor`.
- [ ] Ator que transiciona permanece em `actors()` com a posição de destino e sem `motion` residual.
- [ ] Criatura que desce para o andar do jogador continua desenhada e clicável.
- [ ] Criatura que sai do andar do jogador não deixa sprite fantasma.
- [ ] Nenhum `Move event references unknown actor` no console durante 60 s de jogo.
- [ ] `hunt:check` e `combat:check` saem `0` e byte-idênticos.
- [ ] Medição de frame antes/depois registrada no commit, com `over50 === 0` sem combate.
- [ ] Nenhuma alteração em `packages/**`.

## Condições de parada

**Pare e registre bloqueio no `STATE.md`** se: manter o ator transicionado na apresentação exigir
mudar `SimulationEvent` ou qualquer contrato; `activeFloor` só puder ficar correto lendo
`playerEntityId` dentro de `isFloorEvent`; algum golden mudar; ou a mesma causa reprovar dois ciclos
RED/GREEN seguidos. Nesse último caso, escale para **Claude Opus 5 `xhigh`** com a evidência.

## Persistência do handoff

Só a linha da task na tabela do `STATE.md`, a próxima elegível e os bloqueios. Os números medidos e a
justificativa da mudança do teste de transição vão na mensagem de commit.

## Commit

`fix: keep the floor painted when another creature takes the stairs`

## Ciclo de conclusão

Branch-base `main`; branch `cursor/pb-05-fix-08-transition-keeps-floor`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-fix-08-floor`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, medição de frame antes e depois, comandos com exit code, integração,
limpeza, desvios e próxima task elegível (`PB-05-FIX-09`).

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh (fallback Grok 4.6 high).
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-FIX-08-transicao-nao-repinta-o-chao.md

Leia AGENTS.md, o STATE.md do PB-05 e apenas os arquivos listados na task.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-fix-08-floor com a branch
cursor/pb-05-fix-08-transition-keeps-floor e rode "corepack pnpm install --prefer-offline" dentro
dela.

O defeito esta medido e congelado na task, nao reinvestigue: qualquer actor/transitioned faz
HuntScene chamar renderFloor e recriar os 637 sprites do mapa, 25,9 ms de freeze, mesmo quando o
andar nao mudou. E HuntPresentation apaga da apresentacao todo ator nao-jogador que transiciona, o
que gera "Move event references unknown actor" por tick e transforma em inimigo invisivel a criatura
que desce a mesma escada que o jogador.

Comece por RED em HuntPresentation: o ator que transiciona CONTINUA em actors(), com position,
previous e target no destino e sem motion residual; a transicao dele nao muda floor(); ele aparece em
drawCommands() so quando o destino e o andar ativo; um actor/moved dele depois disso nao emite
diagnostico. O teste existente de transicao afirma toHaveLength(1) e passa a afirmar 2 — isso e
correcao de comportamento provado, justifique no commit e nao mexa nas demais assercoes.

Depois RED na cena, pelo HuntProbe: adicione floorRebuilds, contador monotonico de renderFloor.
Transicao de ator nao-jogador nao incrementa; transicao do jogador incrementa; criatura que sai do
andar nao deixa sprite fantasma; criatura que desce para o andar do jogador continua visivel.

No GREEN: a condicao correta e exatamente floorBefore !== presentation.floor(). Apague a clausula
"|| events.some(isFloorEvent)", faca isRosterEvent cobrir actor/transitioned e remova isFloorEvent se
ficar sem uso. Atualize o comentario de bloco acima dele, que descreve o defeito antigo. Nao
introduza checagem de playerEntityId dentro de isFloorEvent.

Rode biome check ., testes de @huntbound/game, typecheck, hunt:check, combat:check, build e verify.
hunt:check e combat:check tem que sair 0 e byte-identicos. PARE se um golden mexer.

Meca antes e depois: suba dev:personal, jogue 60 segundos sem combate e colete p50, p99, max, over33
e over50 do frame com o snippet de requestAnimationFrame que esta na task. Alvo: over50 === 0.
Registre os numeros no commit. Nao afirme melhora sem os dois numeros.

Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe worktree e branch
removendo o diretorio antes do prune.

Nao toque em numeros de dano, Text, pooling de decoracao, atlas de tiles nem SimulationHost — sao
outras tasks. Nao toque em packages/**. Nao inicie a proxima task.
```
