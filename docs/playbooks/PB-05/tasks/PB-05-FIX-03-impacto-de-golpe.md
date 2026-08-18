# PB-05-FIX-03 — Impacto de todo golpe

**Status inicial:** pending

**Classe da tarefa:** implementação de apresentação, bem especificada

**Modelo sugerido:** GPT-5.6 Luna `xhigh` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; a validação humana é o aceite do PB-05

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** não. Depende de FIX-02 (frame e pool) e da tabela nascer antes de FIX-04 consumi-la.

## Objetivo

Fazer todo golpe básico produzir impacto visível no alvo. A ligação entre domínio e visual passa a
viver numa tabela só dados, sem Phaser, e o planejador deixa de ignorar `combat/attacked` e de tratar
todo `combat/damaged` igual.

## Resultado esperado

Um `combat/attacked` planeja um efeito `hit-area` na posição do alvo. Um `combat/damaged` com
`cause: 'attack'` planeja sangue e número de dano, sem um segundo impacto. Um `combat/damaged` com
`cause: 'ability'` planeja só o número — o visual da habilidade é FIX-04. A tabela já declara as
três habilidades para FIX-04 só consumir.

## Dependências

- PB-05-FIX-02 `done` e integrada (`e81b9d6`). Sem pool e `EffectAnimation`, o impacto nasceria
  congelado no frame 0.

## Leitura mínima

1. esta task;
2. `docs/superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md`, "Direção escolhida" §3 e §4;
3. `docs/playbooks/PB-05/STATE.md`;
4. `apps/game/src/hunt/CombatDecorations.ts` e `CombatDecorations.test.ts`;
5. `apps/game/src/hunt/CombatViewModel.ts`, `DEFAULT_COMBAT_ABILITIES` — os três `abilityId` estáveis;
6. `packages/assets/src/hunt/HuntPack.ts`, as chaves `HUNT_PACK_*_EFFECT_KEY`;
7. `packages/contracts/src/simulation/types.ts`, `CombatCause` e os payloads `combat/attacked` e
   `combat/damaged`;
8. `.cursor/rules/40-game.mdc`.

## Decisões congeladas

- **Uma tabela, zero Phaser.** `CombatFxTable.ts` só dados: `abilityId` e `CombatCause` → receita
  visual. Sem import de cena, sem `Date.now()`, sem `Math.random()`.
- A chave de habilidade é **`abilityId`**, string estável de conteúdo, não `abilityIndex`.
- **Partição dos eventos de golpe básico**, para não desenhar `hit-area` duas vezes no mesmo tick:
  - `combat/attacked` → impacto (`effect:tibia:hit-area`) na posição de `targetEntityId`;
  - `combat/damaged` com `cause: 'attack'` → sangue (`effect:tibia:draw-blood`) + número de dano;
  - `combat/damaged` com `cause: 'ability'` → só número de dano.
- A tabela já contém as receitas de `brutal-strike` (alvo, `hit-area`, mais forte), `berserk`
  (`magic-blue`, raio 1, stagger por distância) e `wound-cleansing` (`magic-blue`, self, número de
  cura). FIX-03 **não as consome**.
- Habilidade desconhecida devolve `undefined`. A forma da receita não muda quando uma chave nova
  entrar.
- Cadáver e sangue de `actor/died` continuam como hoje. Dois sangues no mesmo tile num golpe letal
  é aceitável; não filtre morte contra dano.
- Nenhuma regra nova na apresentação. Nada aqui lê estado do kernel.
- Offset de sprite e impulsos (flash, hit-stop, shake, lunge) não entram. Stagger do berserk é
  FIX-04; game feel é FIX-05.

## Escopo permitido

```text
apps/game/src/hunt/CombatFxTable.ts
apps/game/src/hunt/CombatFxTable.test.ts
apps/game/src/hunt/CombatDecorations.ts
apps/game/src/hunt/CombatDecorations.test.ts
apps/game/src/phaser/scenes/HuntScene.ts
docs/playbooks/PB-05/STATE.md
docs/playbooks/PB-05/README.md
docs/playbooks/PB-05/tasks/PB-05-FIX-03-impacto-de-golpe.md
docs/playbooks/PB-05/tasks/PB-05-FIX-04-conjuracao-e-cura.md
```

`HuntScene` só se o kind novo `impact` não passar pelo caminho genérico de sprite. Se passar, não
toque na cena.

## Fora de escopo

- `ability/cast`, `combat/healed`, área do berserk, self da cura — PB-05-FIX-04.
- Flash, hit-stop, shake, lunge, cor de número — PB-05-FIX-05.
- Spec Playwright e `HuntProbe` de cues planejados — PB-05-FIX-06.
- `packages/**` inteiro. Golden que mexer é bug, não descoberta.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-fix-03-fx -b cursor/pb-05-fix-03-combat-fx-table main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-03-fx install --prefer-offline
```

- [ ] **2. Congelar as duas próximas task cards.**

Escreva esta card e `PB-05-FIX-04-conjuracao-e-cura.md`. No `README.md`, FIX-01 e FIX-02 passam a
`done`, FIX-03 e FIX-04 viram links, FIX-05 e FIX-06 continuam bullets.

- [ ] **3. Escrever os testes RED de `CombatFxTable`.**

Prove: `cause: 'attack'` devolve impacto `hit-area`, sangue `draw-blood`, placement `target`;
`cause: 'ability'` não devolve impacto nem sangue — o visual da habilidade é por `abilityId`;
`brutal-strike` é alvo + `hit-area` + `stronger`; `berserk` é `radius-1` + `magic-blue` + stagger;
`wound-cleansing` é `self` + `magic-blue` + número de cura; `abilityId` desconhecido devolve
`undefined`.

- [ ] **4. Escrever os testes RED do planejador.**

Prove: `combat/attacked` cria um `impact` na posição do alvo com a chave da tabela e TTL próprio;
`combat/damaged` `cause: 'attack'` cria sangue e número, **sem** segundo impacto; os dois eventos no
mesmo lote produzem exatamente um impacto, um sangue e um número; `combat/damaged` `cause: 'ability'`
cria só o número; alvo ausente de `actorPositions` não cria impacto; `actor/died` continua gerando
cadáver e sangue.

- [ ] **5. Implementar a tabela e o consumo em `CombatDecorations`; obter GREEN.**

Kind novo: `impact`. Se o caminho genérico de sprite em `HuntScene` já o desenha, a cena não muda.

- [ ] **6. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-03-fx exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-03-fx --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-03-fx typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-03-fx combat:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-03-fx build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-03-fx verify
```

`combat:check` tem que sair `0` e byte-idêntico. Se um golden mexeu, alguma regra vazou para a
apresentação: **pare e investigue**, não regenere.

- [ ] **7. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-03-fx add apps docs
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-03-fx commit -m "feat: plan hit-area impact for every basic attack"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only cursor/pb-05-fix-03-combat-fx-table
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-fix-03-fx
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d cursor/pb-05-fix-03-combat-fx-table
```

## Verificação

Testes de `@huntbound/game`, `typecheck`, `combat:check`, `build` e `verify` verdes; `biome check .`
em `0`.

## Critérios de aceite

- [ ] `CombatFxTable` é puro, sem Phaser, e cobre `CombatCause` e os três `abilityId`.
- [ ] `combat/attacked` planeja impacto `hit-area` no alvo.
- [ ] `combat/damaged` `cause: 'attack'` planeja sangue e número, sem segundo impacto.
- [ ] `combat/damaged` `cause: 'ability'` planeja só o número.
- [ ] Cadáver e sangue de morte continuam.
- [ ] `combat:check` sai `0` e byte-idêntico.
- [ ] Nenhuma alteração em `packages/**`.
- [ ] Nenhuma dependência externa nova entrou.

## Condições de parada

**Pare** se: o payload de `combat/attacked` não trouxer informação para achar o alvo; for preciso
mudar contrato, schema ou golden; ou `combat:check` mudar.

## Persistência do handoff

Atualize **só a linha da task** na tabela do `STATE.md`, a próxima elegível e os bloqueios. Modelo e
effort efetivos, comandos e a partição attacked/damaged vão na mensagem de commit.

## Commit

`feat: plan hit-area impact for every basic attack`

## Ciclo de conclusão

Branch-base `main`; branch `cursor/pb-05-fix-03-combat-fx-table`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-fix-03-fx`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, partição attacked/damaged, comandos com exit code, integração, limpeza,
desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-FIX-03-impacto-de-golpe.md

Leia AGENTS.md, o STATE.md do PB-05, a spec
docs/superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md e apenas os arquivos indicados pela
task. Confirme que PB-05-FIX-02 esta done e integrada.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-fix-03-fx com a branch
cursor/pb-05-fix-03-combat-fx-table e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Entregue CombatFxTable.ts como modulo so dados, sem Phaser: CombatCause e abilityId
viram receita visual. cause attack = hit-area + sangue no alvo. cause ability nao traz impacto —
o visual da habilidade e por abilityId. A tabela ja declara brutal-strike, berserk e
wound-cleansing; esta task nao as consome.

CombatDecorations trata combat/attacked (impacto hit-area no alvo) e distingue combat/damaged:
cause attack = sangue + numero, sem segundo impacto; cause ability = so numero. actor/died continua
igual. Sem Math.random, sem ability/cast, sem cura, sem impulsos.

Rode biome check ., testes de @huntbound/game, typecheck, combat:check, build e verify.
combat:check tem que sair 0 e byte-identico: se um golden mexeu, uma regra vazou para a apresentacao.
PARE e investigue, nunca regenere golden para passar.

Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe worktree e branch
removendo o diretorio antes do prune.

Nao trate ability/cast nem combat/healed. Isso e PB-05-FIX-04. Nao inicie a proxima task.
```
