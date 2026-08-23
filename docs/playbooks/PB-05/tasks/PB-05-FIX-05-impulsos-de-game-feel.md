# PB-05-FIX-05 — Impulsos de game feel

**Status inicial:** pending

**Classe da tarefa:** implementação de apresentação, bem especificada

**Modelo sugerido:** GPT-5.6 Luna `xhigh` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; a validação humana é o aceite do PB-05

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** não. Toca os mesmos arquivos de cena que FIX-04 acabou de mexer.

## Objetivo

Fazer o golpe **pesar**. Efeito na tile já existe desde FIX-03 e FIX-04; falta o que gruda em ator e
câmera: flash no atingido, hit-stop, shake, lunge do atacante e cor de número por causa.

## Resultado esperado

Bater e apanhar deixam de ser a mesma imagem com números diferentes. O passe de game feel sai numa
segunda lista, pura e com TTL em ms, e a cena consome as duas — decorações e impulsos.

## Dependências

- PB-05-FIX-04 `done` e integrada. Sem `heal-number` e sem o visual por habilidade, cor por causa
  não tem o que colorir.

## Leitura mínima

1. esta task;
2. `docs/superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md`, "Direção escolhida" §5 e §6;
3. `docs/playbooks/PB-05/STATE.md`;
4. `docs/playbooks/PB-05/tasks/PB-05-FIX-03-impacto-de-golpe.md`, decisões congeladas da tabela;
5. `apps/game/src/hunt/CombatDecorations.ts` — o modelo de lista pura com TTL a espelhar;
6. `apps/game/src/hunt/CombatFxTable.ts`;
7. `apps/game/src/hunt/ActorMotion.ts` — a interpolação com que o lunge não pode brigar;
8. `apps/game/src/hunt/CameraController.ts` e o uso de `setScroll` em `HuntScene`;
9. `apps/game/src/hunt/HuntProbe.ts`, `visibleDecorations`;
10. `.cursor/rules/40-game.mdc`.

## Decisões congeladas

- **Impulso não é decoração.** Ele anexa a **ator** ou à **câmera** e não tem posição no grid.
  Enfiá-lo em `CombatDecoration` produziria um tipo com metade dos campos sempre ausentes. Sai em
  `apps/game/src/hunt/CombatImpulses.ts`, lista própria, mesma disciplina: puro, TTL em ms,
  `createdAtMs` derivado de `event.tick * TICK_DURATION_MS`, sem Phaser e sem `Date.now()`.
- **Shake não usa `camera.shake()` do Phaser**, pela mesma razão que FIX-02 recusou `anims`: seria
  uma segunda fonte de tempo na apresentação. O módulo devolve um **offset** de scroll e a cena o
  soma depois de `setScroll`. `CameraController` não muda.
- **Shake só quando o jogador apanha.** Numa hunt com vários rotworms trocando golpes, shake por
  dano de qualquer ator vira tremor contínuo e ilegível.
- **Hit-stop é da apresentação, nunca do kernel.** Ele congela por poucos milissegundos a
  interpolação de `ActorMotion` do atingido e do atacante. Não pausa o driver, não pula tick, não
  altera a aritmética de `renderClock` e não toca `RestartableHuntDriver`. Teto de `60 ms`; acima
  disso a caminhada engasga.
- **Lunge é offset de sprite**, aplicado por cima da posição interpolada, com ida e volta dentro do
  TTL. Não muda posição de grid, não muda facing e termina exatamente onde começou.
- **Flash é tint temporário** no sprite do atingido, e tem que voltar ao estado anterior. O tint de
  alvo selecionado (`0xffd166`, já em `HuntScene`) não pode ser apagado pelo flash: quem estava
  destacado continua destacado depois que o flash expira.
- **Cor de número por causa** é o **único** campo novo permitido em `CombatFxTable`. Placement,
  chaves, `stronger` e stagger ficam como FIX-03 os congelou. Três cores: dano de ataque, dano de
  habilidade e cura.
- **Sem `Math.random()`.** Fase e sinal do shake e do lunge derivam de `entityId` e `tick`, para que
  o mesmo replay produza os mesmos impulsos.
- Impulso expirado não deixa resíduo: tint, offset e escala voltam ao valor de base.
- `HuntProbe` expõe os impulsos ativos, para o teste afirmar game feel sem olhar pixel. A spec
  Playwright que consome isso é FIX-06.
- Nenhuma regra nova na apresentação. Nada aqui lê estado do kernel.

## Escopo permitido

```text
apps/game/src/hunt/CombatImpulses.ts
apps/game/src/hunt/CombatImpulses.test.ts
apps/game/src/hunt/CombatFxTable.ts
apps/game/src/hunt/CombatFxTable.test.ts
apps/game/src/hunt/HuntProbe.ts
apps/game/src/hunt/HuntProbe.test.ts
apps/game/src/phaser/scenes/HuntScene.ts
docs/playbooks/PB-05/STATE.md
```

`CombatFxTable` só para a cor. `HuntScene` para consumir a segunda lista, aplicar tint, offset e
shake, e para colorir o texto.

## Fora de escopo

- Spec Playwright, `qa:budgets` e a entrega para o aceite — PB-05-FIX-06.
- Partícula autoral, shader, glow, trilha — fora de toda a trilha FIX.
- Rebalancear dano, cooldown, IA ou loot.
- `CombatDecorations` mudar de forma. Se um impulso parecer querer virar decoração, **pare**.
- `packages/**` inteiro.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-fix-05-feel -b cursor/pb-05-fix-05-combat-impulses main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-05-feel install --prefer-offline
```

- [ ] **2. Escrever os testes RED de `CombatImpulses`.**

Prove: `combat/damaged` produz flash no `entityId` atingido e lunge no `sourceEntityId`; dano no
jogador produz shake e dano em rotworm **não**; o offset de shake decai a zero até o TTL e é o mesmo
para o mesmo par `entityId`/`tick` em duas execuções; o lunge sai e volta, valendo zero no primeiro e
no último instante; hit-stop nunca passa de `60 ms`; dois danos no mesmo ator no mesmo tick não
empilham dois flashes indefinidos; `advance` remove impulso expirado; `reset` esvazia tudo.

- [ ] **3. Implementar `CombatImpulses`; obter GREEN.**

- [ ] **4. Escrever o teste RED do consumo na cena e da cor por causa.**

Prove: sprite com flash expirado volta ao tint anterior, e o alvo selecionado continua destacado;
offset de lunge não altera a posição de grid reportada pelo `HuntProbe`; número de dano de ataque, de
habilidade e de cura saem em três cores distintas, lidas da tabela; `HuntProbe` expõe os impulsos
ativos com tipo, `entityId` e tempo restante.

- [ ] **5. Implementar o consumo em `HuntScene` e a cor na tabela; obter GREEN.**

- [ ] **6. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-05-feel exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-05-feel --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-05-feel typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-05-feel combat:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-05-feel build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-05-feel verify
```

`combat:check` tem que sair `0` e byte-idêntico. Golden que mexer: **pare**, não regenere.

- [ ] **7. Confirmar na tela.**

`corepack pnpm dev:personal`. Bata num rotworm e apanhe dele. Confirme: o atingido pisca, o atacante
avança e volta, a câmera treme **só** quando você apanha, e a caminhada continua sem engasgo. Este é
o passe que mais pede iteração no olho: se o hit-stop atrapalhar o movimento, reduza a constante,
registre o valor no commit e siga.

- [ ] **8. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-05-feel add apps docs
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-05-feel commit -m "feat: add deterministic combat impulses for hit feedback"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only cursor/pb-05-fix-05-combat-impulses
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-fix-05-feel
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d cursor/pb-05-fix-05-combat-impulses
```

## Verificação

Testes de `@huntbound/game`, `typecheck`, `combat:check`, `build` e `verify` verdes; `biome check .`
em `0`.

## Critérios de aceite

- [ ] `CombatImpulses` é puro, com TTL em ms e `createdAtMs` derivado do tick; sem Phaser, sem
      `Date.now()` e sem `Math.random()`.
- [ ] Flash, lunge, hit-stop e shake existem e expiram sem deixar resíduo visual.
- [ ] Shake só ocorre quando o jogador apanha.
- [ ] Hit-stop não pausa o driver, não pula tick e não passa de `60 ms`.
- [ ] Alvo selecionado continua destacado depois que o flash do mesmo ator expira.
- [ ] Número de dano de ataque, de habilidade e de cura têm cores distintas, lidas de
      `CombatFxTable`.
- [ ] `CombatFxTable` só ganhou cor; placement, chaves, `stronger` e stagger inalterados.
- [ ] `HuntProbe` expõe os impulsos ativos.
- [ ] `combat:check` sai `0` e byte-idêntico.
- [ ] Nenhuma alteração em `packages/**`.
- [ ] Nenhuma dependência externa nova entrou.

## Condições de parada

**Pare** se: o hit-stop só for implementável mexendo em `RestartableHuntDriver` ou na contagem de
tick — pausar o kernel por efeito visual é mudança de arquitetura, não de apresentação; o lunge não
compuser com `ActorMotion` sem reescrever a interpolação; a cor exigir campo novo em
`AbilityDefinition` ou em qualquer contrato; ou `combat:check` mudar.

## Persistência do handoff

Atualize **só a linha da task** na tabela do `STATE.md`, a próxima elegível e os bloqueios. As
constantes escolhidas — duração do hit-stop, amplitude do shake, distância do lunge e os três valores
de cor — vão na mensagem de commit.

## Commit

`feat: add deterministic combat impulses for hit feedback`

## Ciclo de conclusão

Branch-base `main`; branch `cursor/pb-05-fix-05-combat-impulses`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-fix-05-feel`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, as constantes escolhidas e por quê, comandos com exit code, o que foi
visto na tela, integração, limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-FIX-05-impulsos-de-game-feel.md

Leia AGENTS.md, o STATE.md do PB-05, a spec
docs/superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md, as tasks FIX-03 e FIX-04 e apenas os
arquivos indicados. Confirme que PB-05-FIX-04 esta done e integrada.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-fix-05-feel com a branch
cursor/pb-05-fix-05-combat-impulses e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. CombatImpulses.ts e uma SEGUNDA lista, irma de CombatDecorations: pura, TTL em ms,
createdAtMs derivado de event.tick * TICK_DURATION_MS, sem Phaser, sem Date.now, sem Math.random.
Impulso anexa a ator ou a camera e nao tem posicao no grid.

Entregue flash no atingido, lunge no atacante, hit-stop de no maximo 60ms e shake SO quando o
jogador apanha. Shake e offset de scroll calculado pelo modulo e somado depois do setScroll da cena:
camera.shake() do Phaser esta proibido, pela mesma razao que FIX-02 recusou anims. Hit-stop congela
apenas a interpolacao de ActorMotion: nao pausa o driver, nao pula tick, nao mexe no renderClock. Se
so der para implementar mexendo no driver, PARE.

Flash tem que voltar ao tint anterior sem apagar o destaque de alvo selecionado. Lunge sai e volta e
nao muda posicao de grid.

Acrescente cor de numero por causa em CombatFxTable — ataque, habilidade e cura em tres cores. Esse e
o UNICO campo novo permitido na tabela; placement, chaves, stronger e stagger ficam como FIX-03 os
congelou.

Exponha os impulsos ativos no HuntProbe. A spec Playwright que consome isso e FIX-06, nao escreva
spec aqui.

Rode biome check ., testes de @huntbound/game, typecheck, combat:check, build e verify.
combat:check tem que sair 0 e byte-identico. PARE se um golden mexer.

Suba dev:personal, bata e apanhe, e confirme que a caminhada nao engasga com o hit-stop. Se
engasgar, reduza a constante e registre o valor no commit.

Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe worktree e branch
removendo o diretorio antes do prune.

Nao escreva spec Playwright, nao rode qa:budgets, nao toque em packages/**. Isso e FIX-06. Nao inicie
a proxima task.
```
