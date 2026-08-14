# PB-04-08 — Renderizar a hunt e receber input

**Status inicial:** pending

**Classe da tarefa:** composição de apresentação sobre contratos já congelados

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; escalonamento somente por gatilho objetivo registrado

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** não. Ela integra PB-04-06 e PB-04-07 e consolida o handoff se aquelas rodaram em
paralelo.

## Objetivo

Tornar a hunt visível e jogável: cena Phaser que desenha as camadas da região, sprites de ator,
câmera que segue o jogador com deadzone, interpolação de apresentação entre ticks, e um mapa de input
teclado/dpad que produz comandos do kernel. Não escrever regra de jogo em `apps/game`.

## Resultado esperado

Abrir o app mostra a caverna, o Knight no `playerStart` e rotworms nascidos pela tabela. Teclas e
dpad movem o jogador um passo por comando; a câmera acompanha; trocar de andar redesenha as camadas
do andar novo.

## Dependências

- PB-04-06 e PB-04-07 `done` e integradas em `main`.
- Fixture `pb-04-hunt-session` verde e `hunt:check` em `verify`.
- Pack `pb-04-venore-rotworm-cave` disponível no profile `test`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-04/STATE.md`;
3. `docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`, seção “Input e câmera”;
4. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`, seções “UI” e “Performance inicial”;
5. `apps/game/src/**` inteiro, com atenção a `SimulationHost.ts`, `SceneBridge.ts`,
   `createAssetRuntime.ts` e `phaser/scenes/**`;
6. `docs/assets/BROWSER_ASSET_CONTRACT.md`;
7. `docs/simulation/KERNEL_CONTRACT.md`, seções de eventos e de loop de tick.

## Decisões congeladas

- **Nenhuma regra de jogo em `apps/game`.** Colisão, custo de passo, cooldown, transição e spawn
  vivem no kernel. A cena reage a eventos e desenha.
- A cena consome `SimulationEvent` pelo `SceneBridge`; ela **não** lê o estado interno do kernel.
- Ordem de desenho por tile: `ground` → `objectsBelow` → atores → `objectsAbove`.
- Só o andar atual do jogador é desenhado. Trocar de andar troca o conjunto de camadas inteiro.
- Câmera segue o jogador com deadzone retangular. A deadzone é presentacional e nunca realimenta o
  kernel.
- Interpolação usa o alpha do acumulador de `SimulationHost`; ela é puramente visual e nunca vira
  entrada do kernel. Um ator que teve o passo bloqueado não interpola.
- Input: `WASD` e setas para as oito direções; dpad DOM sobre o canvas para touch. Uma tecla
  pressionada produz **um** comando por tick disponível, nunca uma rajada por frame.
- **Não existe click-to-move.** Ele exigiria pathfinding, que está fora de escopo.
- Nenhum path literal de asset em `apps/game/src`; tudo por stable key.
- Centro e lower-middle do playfield permanecem livres, conforme ADR-001.

## Escopo permitido

```text
apps/game/src/phaser/scenes/HuntScene.ts
apps/game/src/phaser/scenes/**
apps/game/src/input/**
apps/game/src/bridge/SceneBridge.ts
apps/game/src/hunt/**
apps/game/src/main.ts
apps/game/src/styles.css
apps/game/src/ui/**
docs/playbooks/PB-04/STATE.md
```

## Fora de escopo

- `packages/simulation`, `packages/contracts`, `packages/content`, `packages/assets` e `tools/**`;
- Playwright, screenshots e medição de orçamento, que pertencem a PB-04-09;
- combate, HUD de vida, inventário, minimapa e menus;
- pathfinding, click-to-move e câmera livre.

## Interfaces produzidas

```ts
export type InputAction =
  | { readonly kind: 'step'; readonly direction: Direction }
  | { readonly kind: 'face'; readonly direction: Direction };

export interface InputMap {
  attach(target: HTMLElement): void;
  detach(): void;
  drain(): readonly InputAction[];
}

export function createInputMap(): InputMap;

export interface CameraTarget {
  readonly x: number;
  readonly y: number;
}

export interface CameraController {
  follow(target: CameraTarget): void;
  readonly scrollX: number;
  readonly scrollY: number;
}

export function createCameraController(options: {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly deadzoneWidth: number;
  readonly deadzoneHeight: number;
}): CameraController;

export function interpolate(from: number, to: number, alpha: number): number;
```

`drain()` devolve as ações acumuladas e esvazia a fila, no mesmo padrão do buffer de comandos do
kernel.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada, e instalar dependências.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb04-08-hunt-scene main
git worktree add C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene codex/pb04-08-hunt-scene
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene install --prefer-offline
```

Se PB-04-06 e PB-04-07 rodaram em paralelo, integre as duas branches serialmente antes de começar e
rode `verify` no conjunto.

- [ ] **2. Escrever testes RED do `InputMap`.**

Sem Phaser e sem canvas; use um elemento DOM de teste. Prove: `KeyW` produz `step` `n`; `ArrowRight`
produz `step` `e`; `KeyW` + `KeyD` simultâneos produzem `step` `ne`, uma única ação e não duas;
segurar a tecla por vários frames produz uma ação por `drain`, não uma por evento de repetição do
teclado; soltar a tecla para de produzir; `drain` esvazia a fila; `detach` para de receber eventos;
tecla não mapeada é ignorada sem erro.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene --filter @huntbound/game test
```

Esperado: RED por módulo ausente.

- [ ] **3. Implementar `createInputMap`; obter GREEN.**

- [ ] **4. Escrever testes RED da câmera e da interpolação.**

Prove: alvo dentro da deadzone não move o scroll; alvo saindo pela direita move o scroll exatamente
o necessário para recolocá-lo na borda, sem overshoot; o mesmo nas quatro direções; o scroll é
clampado nas bordas do mapa e nunca mostra fora da região; `interpolate` com `alpha` `0` devolve
`from`, com `1` devolve `to`, e é monotônica no meio; `alpha` fora de `[0, 1]` é clampado.

- [ ] **5. Implementar `createCameraController` e `interpolate`; obter GREEN.**

- [ ] **6. Escrever testes RED da montagem de camadas.**

Com uma `MapRegion` sintética, prove: a ordem de desenho é `ground` → `objectsBelow` → atores →
`objectsAbove`; só o andar atual entra; trocar de andar substitui o conjunto inteiro e não acumula;
um tile sem chão não desenha nada e não quebra; toda chave usada é `tile:tibia:<clientId>` e nenhum
path literal aparece.

Teste a montagem como dado — uma lista de instruções de desenho — e não pelo canvas. Assim ela é
verificável sem Phaser.

- [ ] **7. Implementar a montagem de camadas; obter GREEN.**

- [ ] **8. Escrever testes RED da ligação evento → apresentação.**

Prove: `actor/spawned` cria sprite; `actor/moved` atualiza a posição alvo e inicia interpolação;
`actor/move-blocked` **não** move nem interpola; `actor/faced` troca a direção sem mover;
`actor/transitioned` troca o andar desenhado quando o ator for o jogador, e apenas remove o sprite
quando for outro ator; `actor/despawned` remove o sprite; evento de ator desconhecido é ignorado com
diagnóstico e não lança.

- [ ] **9. Implementar `HuntScene` e a ligação; obter GREEN.**

- [ ] **10. Compor a cena no app.**

Ligue `main.ts` à hunt: carregar `HuntDefinition`, construir o cenário, criar o kernel pelo
`SimulationHost`, carregar o pack pela stable key e iniciar `HuntScene`. Mantenha o probe test-only
do PB-03 funcionando; ele é a prova de paridade e não pode regredir.

- [ ] **11. Provar que nenhuma regra vazou.**

```powershell
rg -n -e 'blockedTiles|stepCooldown|diagonal|respawn|nextBelow|Math\.random|floorChange|unpass|serverId' apps/game/src -g '!**/*.test.ts'
```

Esperado: nenhuma ocorrência de regra. Constantes de apresentação e nomes de stable key são
aceitáveis e devem ser justificados um a um no relatório. Este scan replica o que PB-03-07 fez e é
critério de aceite.

- [ ] **12. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene --filter @huntbound/game typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene --filter @huntbound/game build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene format:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene verify
git -C C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene diff --check
```

- [ ] **13. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene add apps/game docs
git -C C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene commit -m "feat: render and drive the first hunt"
```

Consolide em `STATE.md` os handoffs de PB-04-06 e PB-04-07 se elas rodaram em paralelo.

- [ ] **14. Integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb04-08-hunt-scene
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb04-08-hunt-scene
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb04-08-hunt-scene
```

## Critérios de aceite

- [ ] Oito direções por teclado, diagonal por duas teclas, uma ação por tick e não por evento de
      repetição.
- [ ] Dpad DOM funciona no viewport móvel e usa o mesmo mapa de ações.
- [ ] Deadzone não move a câmera dentro dela, recoloca sem overshoot fora dela e é clampada nas
      bordas.
- [ ] A ordem de desenho é `ground` → `objectsBelow` → atores → `objectsAbove`, provada como dado.
- [ ] Só o andar atual é desenhado; trocar de andar substitui o conjunto inteiro.
- [ ] `actor/move-blocked` não move nem interpola.
- [ ] Nenhum path literal de asset existe em `apps/game/src`.
- [ ] O scan de regras não encontra regra vazada; cada ocorrência restante está justificada.
- [ ] O probe test-only do PB-03 continua funcionando.
- [ ] `corepack pnpm verify` passa antes e depois da integração.

## Condições de parada

Pare se a apresentação exigir uma decisão de regra que o kernel não expõe por evento; se a
interpolação precisar realimentar o kernel para ficar suave; se a ordem de desenho não puder ser
decidida pelos dados da região; ou se o input exigir pathfinding para ser utilizável.

## Persistência e relatório final

Registre contagem de testes, resultado do scan de regras com justificativa por ocorrência,
comandos/exit codes, modelo/effort, modo de conclusão e a próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-04\tasks\PB-04-08-renderizar-hunt-e-input.md

Leia o STATE.md do playbook PB-04 e apenas os arquivos indicados pela task. Se PB-04-06 e PB-04-07
rodaram em paralelo, integre as duas branches serialmente e rode verify no conjunto antes de comecar.
Crie a branch/worktree indicada e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Teste InputMap, camera, interpolacao e montagem de camadas como dado, sem canvas e
sem Phaser; so depois componha a HuntScene. Nenhuma regra de jogo entra em apps/game: colisao, custo,
cooldown, transicao e spawn ficam no kernel, e a cena so reage a eventos do SceneBridge.

Nao implemente click-to-move. Rode o scan de regras indicado na task e justifique cada ocorrencia
restante. Mantenha o probe test-only do PB-03 funcionando.

Execute os gates, atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe
worktree/branch removendo o diretorio antes do prune.

Não toque em packages/** nem em tools/**, e não escreva testes Playwright: eles pertencem a PB-04-09.
Se surgir decisão não coberta, pare e registre o bloqueio. Não inicie a próxima task.
```
