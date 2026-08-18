# PB-05-FIX — Efeitos de combate visíveis

**Status:** aprovado
**Data:** 2026-08-18
**Playbook:** `docs/playbooks/PB-05/README.md`
**Fontes normativas:** `AGENTS.md`, `docs/03_ADR_PHASER4_BROWSER_FIRST.md`,
`docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md` (seção "Fechamento de playbook"),
`docs/architecture/PACKAGE_BOUNDARIES.md`,
`docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`, `.cursor/rules/40-game.mdc`.

## Contexto

PB-05 entregou combate jogável e integrado em `d4490e9`, com `verify` verde. O aceite normativo é o
usuário jogar e aprovar. Ele jogou em 2026-08-18 e apontou: a caminhada funciona, mas **ataque,
magia e spell não têm animação nenhuma — só aparecem números na tela**.

Isso não é preferência estética. Animação de combate é a razão declarada de o projeto ter migrado
para Phaser. Estas correções têm prioridade sobre PB-06 e PB-07.

Este documento é a spec das tasks `PB-05-FIX-MM`, no formato que `docs/07` define para aceite
apontado. PB-05 permanece aberto até elas passarem e o usuário aprovar.

## Diagnóstico

Cinco achados, todos verificados na árvore em `73bb49c`.

### D1 — O pack pessoal está defasado

`packages/assets/catalog/selections/pb-04-venore-rotworm-cave.json` declara 140 chaves de hunt.
`apps/game/public/assets/personal/pb04/packs/pb-04-venore-rotworm-cave/pack.json` tem **134**.
Faltam exatamente as seis chaves de combate que PB-05-09 acrescentou:

```text
effect:tibia:draw-blood     effect:tibia:hit-area      effect:tibia:magic-blue
missile:tibia:weapon-type   item:tibia:small-splash    item:tibia:dead-rotworm
```

O pack em disco é de 15/08; a seleção que acrescentou as chaves é de 16/08. `HUNT_PACK_COMBAT_KEYS`
existe em `packages/assets/src/hunt/HuntPack.ts` e `validateHuntPack` reprovaria esse pack com
`HUNT_ASSET_KEY_MISSING` — mas nada roda essa validação sobre o perfil `personal`.

### D2 — Asset ausente falha em silêncio

Em `apps/game/src/phaser/scenes/HuntScene.ts`, `createDecorationObject` devolve `undefined` quando a
chave não resolve, e `renderCombatDecorations` faz `continue`. Nenhum diagnóstico, nenhum log.

Consequência direta: cadáver, sangue e o arco de autoloot — entregues e marcados `done` em
PB-05-10 — **nunca chegaram à tela do usuário**. O número de dano é a única decoração que não
depende de asset, e por isso é a única que sobreviveu. O sintoma relatado é inteiramente explicado
por D1 + D2.

### D3 — Nenhum gate cobre o perfil que o usuário joga

`assets:check` valida `packages/test-fixtures/assets/**` nos perfis `test` e `product`. O perfil
`personal` só é verificado por `assets:pb04:personal:check`, que não está em `check` nem em
`verify` — corretamente, porque depende de `HUNTBOUND_PERSONAL_ASSET_SOURCE` e de arte que não
entra no Git. O resultado é que `verify` sai verde com o jogo sem efeito algum.

### D4 — Efeito não anima

`HuntScene` não usa `anims` do Phaser em lugar nenhum. Sprites de ator são posicionados por
`setFrame` via `actorFrameAtTick` (`apps/game/src/hunt/ActorFrame.ts`); decorações são desenhadas
sempre no frame 0. As entradas do pack carregam `animations[]` com `startFrame`, `frameCount` e
`phaseDurationsMs` extraídos do `.dat` — o timing real do cliente está no repositório e é ignorado.

### D5 — Ataque e conjuração não têm visual

`combat/attacked`, `ability/cast` e `combat/healed` caem em `break` vazio tanto em
`apps/game/src/hunt/HuntPresentation.ts` quanto no `switch` de `HuntScene`. Só `combat/damaged` e
`actor/died` viram algo.

D1, D2 e D3 são defeitos de PB-05. D4 e D5 são falta de implementação. Vão juntos porque, isolada,
nenhuma das duas metades devolve o jogo que o usuário esperava.

## Objetivos

1. Todo golpe, toda conjuração e toda cura produzem efeito visível e animado na tela.
2. Cadáver, sangue e arco de autoloot voltam a aparecer — e animam.
3. Asset declarado e ausente nunca mais some em silêncio.
4. Nada disso altera `packages/simulation`, o snapshot ou os goldens: `combat:check` sai idêntico.
5. O usuário joga e aprova, fechando o PB-05.

## Fora de escopo

- Míssil e ataque à distância. As três habilidades atuais têm `rangeTiles` 0 ou 1 e o ataque básico
  é adjacente; `missile:tibia:weapon-type` fica empacotado e não usado até existir ataque ranged.
- Empacotar efeitos novos do Canary, por `effectId` real de cada spell. Só se usa o que a seleção
  já declara. A tabela de mapeamento nasce preparada para receber chaves novas sem mudar de forma.
- Partículas autorais, shaders, glow, trilhas.
- Rebalancear combate, mexer em dano, cooldown, IA ou loot.
- Persistência, HUD novo, segunda hunt.
- Qualquer alteração em `packages/simulation`, `packages/contracts` ou nos goldens.

## Direção escolhida

### 1. A falha silenciosa vira diagnóstico, não exceção

Asset pessoal é opcional por decisão de produto: o jogo tem que rodar no perfil `test` com
placeholders. Então chave ausente **não** pode derrubar a cena. Mas também não pode sumir.

`HuntScene` passa a emitir um diagnóstico, uma vez por chave, pelo canal que a cena já usa, e
`HuntProbe` passa a expor a lista de chaves de combate não resolvidas. Isso torna D1 detectável por
teste automatizado e visível no console de quem está jogando.

A alternativa — lançar erro — foi rejeitada: transformaria um perfil legítimo em crash.

### 2. `EffectAnimation` é irmão de `ActorFrame`, não uma segunda invenção

`apps/game/src/hunt/ActorFrame.ts` já resolve "dado tempo e metadados de animação, qual frame". O
módulo novo `apps/game/src/hunt/EffectAnimation.ts` faz o mesmo para efeitos: recebe o
`AssetAnimationGroup` da entrada e o tempo decorrido desde `createdAtMs`, devolve o índice de frame,
e trata `frameCount === 1` devolvendo `0` sem tocar em nada.

Esse caso não é hipotético: o perfil `test` empacota placeholders 1×1 com `frameCount: 1`. E o
número real de frames dos efeitos `1`, `10` e `13` **só é conhecido depois** que FIX-01 regenerar o
pack pessoal — por isso FIX-02 depende de FIX-01, e não o contrário.

Phaser `anims` não é usado. A cena já roda num render clock fixo derivado do tick
(`renderClock * TICK_DURATION_MS`) e misturar o relógio interno do Phaser criaria uma segunda fonte
de tempo na apresentação. Frame calculado, como já se faz para atores.

### 3. Uma única tabela liga domínio a visual

`AbilityDefinition` é contrato de simulação e não pode conhecer apresentação —
`docs/architecture/PACKAGE_BOUNDARIES.md`. O mapeamento vive em
`apps/game/src/hunt/CombatFxTable.ts`, só dados, sem Phaser e sem import de cena:

| Gatilho | Visual |
|---|---|
| `combat/damaged` com `cause: 'attack'` | `effect:tibia:hit-area` no alvo + sangue |
| habilidade `brutal-strike` | `effect:tibia:hit-area` no alvo, mais forte |
| habilidade `berserk` | `effect:tibia:magic-blue` em cada tile do raio 1, com stagger por distância |
| habilidade `wound-cleansing` | `effect:tibia:magic-blue` no próprio + número de cura |
| `actor/died` | cadáver + sangue, como hoje |

A chave é `abilityId`, string estável de conteúdo, não `abilityIndex`, que é posicional no cenário.

### 4. `CombatDecorations` vira o planejador único

Em vez de um segundo módulo iterando os mesmos eventos, `apps/game/src/hunt/CombatDecorations.ts`
passa a tratar `combat/attacked`, `ability/cast` e `combat/healed`, e ganha os kinds novos. Ele já
tem exatamente o modelo certo: `createdAtMs`/`expiresAtMs` derivados de
`event.tick * TICK_DURATION_MS`, TTL, `blocksMovement: false`, cópia defensiva de posição.

Uma lista, um dono de TTL, um lugar que lê evento.

### 5. Impulsos são outra lista, porque não são objetos do mundo

Flash no sprite atingido, hit-stop, shake de câmera e lunge do atacante anexam a **ator ou câmera**,
não a tile, e não têm posição no grid. Forçá-los no mesmo tipo de `CombatDecoration` produziria um
tipo com metade dos campos sempre ausentes. Eles saem em
`apps/game/src/hunt/CombatImpulses.ts`, com a mesma disciplina: puro, TTL em ms, derivado de evento.
`HuntScene` consome as duas listas.

### 6. Determinismo da apresentação

Nada de `Math.random()` no planejador. Onde houver variação — offset do sprite de impacto, stagger
dos tiles do berserk — ela deriva de `entityId` e `tick`, para que o mesmo replay produza os mesmos
efeitos. Isso não é exigência de gate; é o que torna o browser QA reprodutível sem `retries`.

### 7. A prova não depende de arte

O aceite final é o usuário jogando com `dev:personal`. Mas o gate automatizado roda no perfil
`test`, onde todo sprite é 1×1 e não há nada para olhar. Por isso `HuntProbe` expõe os cues
planejados, e a spec Playwright afirma **planejamento**, não pixel: atacar produz um cue de impacto
no alvo; `berserk` produz um cue por tile do raio; `wound-cleansing` produz cue no próprio e número
de cura. Screenshot não é evidência de animação.

## Fatiamento

| ID | Escopo |
|---|---|
| `PB-05-FIX-01` | Regenerar o pack pessoal; diagnóstico de chave ausente; `HuntProbe` expõe as não resolvidas; documentar `assets:pb04:personal:check` no fluxo de `dev:personal`. |
| `PB-05-FIX-02` | `EffectAnimation.ts` e o consumo dele em `HuntScene`. Sangue, cadáver e magic-blue animam. Pool de sprites em vez de destruir e recriar por expiração. |
| `PB-05-FIX-03` | `CombatFxTable.ts` + `combat/attacked` e `combat/damaged` por `cause`: todo golpe tem impacto. |
| `PB-05-FIX-04` | `ability/cast` e `combat/healed`: área do berserk, alvo do brutal-strike, self do wound-cleansing, número de cura. |
| `PB-05-FIX-05` | `CombatImpulses.ts`: flash, hit-stop, shake, lunge, cor de número por causa. |
| `PB-05-FIX-06` | Probe, spec Playwright em `correctness`, `qa:budgets` registrado, entrega jogável para o aceite. |

Conforme `AGENTS.md`, só FIX-01 e FIX-02 nascem como task card. FIX-03 a FIX-06 ficam como bullets
no README do PB-05 até chegar a vez.

## Armadilhas

1. **O Playwright serve o `dist` pré-buildado.** Toda conclusão sobre o browser exige
   `corepack pnpm build` antes. Já custou tempo neste repositório.
2. **`EPERM` no `assets:stage:test`** é flake de Windows, não código. Confirme que não há
   `vite preview` vivo na 4173 e rode de novo.
3. **`combat:check` mudar é bug, não descoberta.** FX é derivado de evento; se um golden mexeu,
   alguma regra vazou para a apresentação.
4. **`frameCount: 1` é caso real**, não defensivo. O perfil `test` inteiro é assim.

## Critérios de aceite

- [ ] O pack pessoal resolve as seis chaves de combate; `assets:pb04:personal:check` sai `0`.
- [ ] Chave declarada e não resolvida produz diagnóstico observável, nunca silêncio.
- [ ] Cadáver, sangue e arco de autoloot aparecem e animam.
- [ ] Todo golpe produz efeito de impacto no alvo.
- [ ] Cada uma das três habilidades tem visual próprio, com a forma certa: área, alvo e self.
- [ ] Cura mostra número distinto do dano.
- [ ] `combat:check`, `hunt:check` e `simulation:check` saem `0` e byte-idênticos.
- [ ] Nenhuma alteração em `packages/simulation` ou `packages/contracts`.
- [ ] Nenhuma dependência externa nova.
- [ ] Browser QA estável sem `retries`.
- [ ] O usuário joga com `dev:personal` e aprova.
