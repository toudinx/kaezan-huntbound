# PB-05-FIX-04 — Conjuração e cura visíveis

**Status inicial:** pending

**Classe da tarefa:** implementação de apresentação, bem especificada

**Modelo sugerido:** GPT-5.6 Luna `xhigh` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; a validação humana é o aceite do PB-05

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** não. Consome a tabela nascida em PB-05-FIX-03.

## Objetivo

Dar forma visual própria a cada uma das três habilidades: área, alvo e self. Cura deixa de parecer
dano.

## Resultado esperado

`ability/cast` de `berserk` planeja `magic-blue` em cada tile do raio 1, com stagger por distância.
`brutal-strike` planeja `hit-area` mais forte no alvo. `wound-cleansing` planeja `magic-blue` no
próprio conjurador. `combat/healed` planeja um número de cura distinto do de dano. Nada disso
reabre a tabela: só consome `combatFxForAbility`.

## Dependências

- PB-05-FIX-03 `done` e integrada. Sem `CombatFxTable` não há receita por `abilityId`.

## Leitura mínima

1. esta task;
2. `docs/superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md`, tabela da §3 e determinismo da
   §6;
3. `docs/playbooks/PB-05/STATE.md`;
4. `docs/playbooks/PB-05/tasks/PB-05-FIX-03-impacto-de-golpe.md`, decisões congeladas da tabela;
5. `apps/game/src/hunt/CombatFxTable.ts` e `CombatDecorations.ts`;
6. `apps/game/src/hunt/CombatViewModel.ts`, `DEFAULT_COMBAT_ABILITIES` — índice → `abilityId`;
7. `packages/contracts/src/simulation/types.ts`, payloads `ability/cast` e `combat/healed`;
8. `.cursor/rules/40-game.mdc`.

## Decisões congeladas

- A tabela **não se redesenha**. `combatFxForAbility(abilityId)` já devolve placement, chave,
  `stronger`, stagger e `healNumber`. O planejador só aplica.
- `ability/cast` traz `abilityIndex`, não `abilityId`. O planejador recebe as habilidades do
  cenário (as mesmas que o HUD já usa) e resolve o id. Não invente um segundo catálogo.
- **berserk:** um efeito por tile do raio 1 em torno do conjurador, inclusive o tile próprio.
  Stagger de `createdAtMs` deriva de distância Chebyshev × constante pequena × (e, se precisar de
  desempate, `entityId` e `tick`). Sem `Math.random()`.
- **brutal-strike:** um impacto `hit-area` no alvo, com escala maior (`stronger`). Não some com o
  impacto de `combat/attacked` — habilidade emite `ability/cast` + `combat/damaged` `cause:
  'ability'`, nunca `combat/attacked`.
- **wound-cleansing:** `magic-blue` no próprio. `combat/healed` gera kind novo `heal-number`, texto
  distinto do `damage-number` (sinal `+`, não `-`). Cor por causa é FIX-05; aqui basta o kind e o
  sinal.
- Habilidade desconhecida: nenhum efeito. Não caia em `hit-area` genérico.
- TTL e `blocksMovement: false` continuam o modelo atual.
- Nenhuma regra nova na apresentação. Nada lê estado do kernel.

## Escopo permitido

```text
apps/game/src/hunt/CombatDecorations.ts
apps/game/src/hunt/CombatDecorations.test.ts
apps/game/src/phaser/scenes/HuntScene.ts
docs/playbooks/PB-05/STATE.md
```

`CombatFxTable` só se um teste da tabela nasceu incompleto em FIX-03 — não mude a forma da receita.
`HuntScene` só para desenhar `heal-number` e, se `stronger` exigir, escala do sprite de impacto.

## Fora de escopo

- Flash, hit-stop, shake, lunge, cor de número por causa — PB-05-FIX-05.
- Spec Playwright e exposição de cues no `HuntProbe` — PB-05-FIX-06.
- Míssil, efeito Canary novo, rebalanceamento.
- `packages/**` inteiro.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-fix-04-cast -b cursor/pb-05-fix-04-cast-and-heal main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-04-cast install --prefer-offline
```

- [ ] **2. Escrever os testes RED.**

Prove: `ability/cast` de `berserk` produz um efeito por tile do raio 1, com `createdAtMs` diferente
por distância; `brutal-strike` produz um impacto `stronger` na posição do alvo; `wound-cleansing`
produz efeito no conjurador; `abilityIndex` fora do catálogo não produz nada; `combat/healed` produz
`heal-number` com `amount` positivo, distinto de `damage-number`; o mesmo lote `ability/cast` +
`combat/damaged` `cause: 'ability'` não inventa sangue de golpe básico.

O planejador precisa das habilidades do cenário para resolver `abilityIndex` → `abilityId`. Passe
essa lista na construção ou no `handle` — escolha o menor diff e registre em uma linha no commit.

- [ ] **3. Implementar o consumo das receitas; obter GREEN.**

`HuntScene`: `heal-number` não pode reutilizar o prefixo `-` do dano. `stronger` vira escala, não um
segundo sprite.

- [ ] **4. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-04-cast exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-04-cast --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-04-cast typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-04-cast combat:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-04-cast build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-04-cast verify
```

`combat:check` tem que sair `0` e byte-idêntico. Golden que mexer: **pare**, não regenere.

- [ ] **5. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-04-cast add apps docs
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-04-cast commit -m "feat: plan ability-shaped combat effects and heal numbers"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only cursor/pb-05-fix-04-cast-and-heal
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-fix-04-cast
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d cursor/pb-05-fix-04-cast-and-heal
```

## Verificação

Testes de `@huntbound/game`, `typecheck`, `combat:check`, `build` e `verify` verdes; `biome check .`
em `0`.

## Critérios de aceite

- [ ] `berserk` planeja um efeito por tile do raio 1, com stagger determinístico por distância.
- [ ] `brutal-strike` planeja impacto mais forte no alvo.
- [ ] `wound-cleansing` planeja efeito no próprio.
- [ ] `combat/healed` planeja número de cura distinto do de dano.
- [ ] Habilidade desconhecida não produz efeito.
- [ ] `CombatFxTable` não muda de forma.
- [ ] `combat:check` sai `0` e byte-idêntico.
- [ ] Nenhuma alteração em `packages/**`.
- [ ] Nenhuma dependência externa nova entrou.

## Condições de parada

**Pare** se: a receita da tabela não cobrir placement ou stagger e for preciso mudá-la de forma;
`ability/cast` não der para resolver `abilityId` sem ler o kernel; ou `combat:check` mudar.

## Persistência do handoff

Atualize **só a linha da task** na tabela do `STATE.md`, a próxima elegível e os bloqueios. Como o
índice virou id, e a constante do stagger, vão na mensagem de commit.

## Commit

`feat: plan ability-shaped combat effects and heal numbers`

## Ciclo de conclusão

Branch-base `main`; branch `cursor/pb-05-fix-04-cast-and-heal`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-fix-04-cast`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, como `abilityIndex` resolve `abilityId`, constante do stagger, comandos
com exit code, integração, limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-FIX-04-conjuracao-e-cura.md

Leia AGENTS.md, o STATE.md do PB-05, a spec
docs/superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md, a task FIX-03 e apenas os arquivos
indicados. Confirme que PB-05-FIX-03 esta done e integrada.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-fix-04-cast com a branch
cursor/pb-05-fix-04-cast-and-heal e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. CombatDecorations passa a tratar ability/cast e combat/healed consumindo
combatFxForAbility. berserk = magic-blue em cada tile do raio 1 com stagger por distancia Chebyshev;
brutal-strike = hit-area stronger no alvo; wound-cleansing = magic-blue no proprio; combat/healed =
heal-number com sinal +, nao o damage-number. abilityIndex resolve via as habilidades do cenario,
nao por um segundo catalogo. Sem Math.random. Nao redesenhe a tabela.

Rode biome check ., testes de @huntbound/game, typecheck, combat:check, build e verify.
combat:check tem que sair 0 e byte-identico. PARE se um golden mexer.

Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe worktree e branch
removendo o diretorio antes do prune.

Nao crie CombatImpulses, nao mude cor de numero, nao escreva spec Playwright. Isso e FIX-05 e
FIX-06. Nao inicie a proxima task.
```
