# PB-07-02 — Alvo e impacto legíveis

**Status inicial:** pending — **bloqueada por B1** (árvore suja de `main`). Ver `STATE.md`.

**Classe da tarefa:** implementação de apresentação, bem especificada

**Modelo sugerido:** Luna `max` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; a validação humana é o aceite do usuário jogando

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** sim, com PB-07-01. Nenhum arquivo em comum.

## Objetivo

Duas correções de leitura visual, ambas confinadas a `apps/game`:

1. O alvo deixa de ser marcado por escurecimento e passa a ter **um anel desenhado na tile**.
2. O tremor de câmera deixa de disparar em todo dano recebido e passa a exigir **magnitude**.

## Resultado esperado

Olhando a tela, dá para dizer em quem se está mirando sem comparar sprites. E fechar um box de oito
criaturas sacode a tela no máximo quando alguma delas realmente machuca, em vez de oito vezes por
rodada de mordidas.

## Dependências

- **B1 precisa estar resolvido.** Hoje `main` tem modificações não commitadas em
  `apps/game/src/hunt/CombatImpulses.ts`, `apps/game/src/phaser/scenes/HuntScene.ts` e
  `apps/game/src/phaser/createGame.ts` — exatamente os arquivos desta task. Uma worktree criada de
  `main` não as enxerga, e a integração por `--ff-only` depois perde ou conflita. Confirme
  `git status --porcelain=v1` limpo nesses três paths antes do passo 1.
- Não depende de PB-07-01.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md` e `STATE.md`;
3. `.cursor/rules/40-game.mdc` e `.cursor/rules/50-tests.mdc`;
4. `apps/game/src/hunt/CombatImpulses.ts` e seu teste — a lista pura de impulsos;
5. `apps/game/src/hunt/CombatTargeting.ts` e seu teste — quem é o alvo;
6. `apps/game/src/phaser/scenes/HuntScene.ts`, métodos `renderFloor`, `syncActorRoster`,
   `syncTargetHighlight`, `depthFor` e `anchorFor`;
7. `apps/game/src/hunt/CellAnchor.ts` e `apps/game/src/hunt/TileDepth.ts` — como uma coisa se
   posiciona numa tile e em qual profundidade;
8. `apps/game/src/hunt/HuntProbe.ts` — `HuntProbeState` e `activeImpulses()`, que é como o browser
   prova comportamento sem screenshot;
9. `tests/e2e/support/combatDriver.ts`, para não quebrar o driver existente.

## Decisões congeladas

- **Nenhuma regra de simulação muda.** `packages/simulation`, `packages/contracts` e
  `packages/content` não são tocados. Nenhum golden é regenerado. Se algo aqui exigir mudar
  contrato, **pare**: virou outra task.
- O anel é **apresentação derivada** do alvo que `CombatTargeting` já publica. Não crie uma segunda
  fonte de verdade sobre quem é o alvo.
- O anel fica **abaixo do sprite do ator** em profundidade e ancorado na tile, não no sprite. Um
  anel preso ao sprite herda o lunge e a hit-stop e treme junto — o que se quer é justamente uma
  referência estável.
- `sprite.setTint(0xffd166)` some. O tint volta a ser usado **só** pelo flash de dano.
- `sprite.setData('hunt-targeted', ...)` **permanece**: é contrato observável e o driver de e2e pode
  depender dele.
- A regra de shake vive em `CombatImpulses.ts`, que já é lista pura com TTL em ms e já tem suíte
  própria. **Não** coloque a decisão dentro da cena.
- O limiar é **fração da vida máxima do alvo**, não valor absoluto. Absoluto envelhece no primeiro
  personagem de outro nível.

## Escopo permitido

```text
apps/game/src/hunt/CombatImpulses.ts
apps/game/src/hunt/CombatImpulses.test.ts
apps/game/src/hunt/HuntProbe.ts
apps/game/src/hunt/HuntProbe.test.ts
apps/game/src/phaser/scenes/HuntScene.ts
apps/game/src/hunt/CombatTargeting.ts          (só se o alvo precisar expor posição)
apps/game/src/hunt/CombatTargeting.test.ts
tests/e2e/hunt-play.spec.ts
docs/playbooks/PB-07/STATE.md
```

Um arquivo novo em `apps/game/src/hunt/` para o anel é aceitável e provavelmente melhor que inchar
`HuntScene.ts`, que já tem 1213 linhas.

## Fora de escopo

- borda preta do mapa e câmera limitada — é PB-07-11;
- cor de número de dano, corpo, sangue e efeito de tile — já entregues em PB-05-FIX;
- performance de rasterização de número — é `PB-05-FIX-09`, task própria;
- qualquer arquivo em `packages/**` ou `tools/**`.

## Execução RED/GREEN

- [ ] **1. Confirmar B1 resolvido, criar branch e worktree irmã, instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb07-02-target -b codex/pb07-02-target-and-impact main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-02-target install --prefer-offline
```

- [ ] **2. RED do shake por magnitude, em `CombatImpulses.test.ts`.**

Prove, com a lista pura e sem Phaser:

- dano recebido pelo jogador **abaixo** do limiar não cria impulso `shake` — e continua criando
  `flash`, `lunge` e `hit-stop`, que não mudam;
- dano **no** limiar e acima cria `shake`;
- oito danos pequenos no mesmo tick continuam sem `shake`, e **um** dano grande entre eles cria
  exatamente um;
- dano em criatura nunca cria `shake`, como já é hoje;
- vida máxima ausente ou não finita não derruba o cálculo nem cria `shake` por acidente.

`CombatImpulseInput` precisa da vida máxima do jogador. `combat/damaged` já carrega `amount` e
`remainingHealth`; a máxima não está no evento, então ela entra pela entrada, vinda de quem já a
conhece na cena. Não deduza máxima a partir de `remainingHealth`.

- [ ] **3. GREEN do shake.** Escolha o limiar, deixe-o exportado como constante nomeada ao lado de
      `SHAKE_TTL_MS`, e escreva em uma linha de comentário por que aquele número — o próximo a ler
      precisa saber se é medição ou chute.

- [ ] **4. RED do anel de alvo.**

O anel é objeto de cena, então prove o que dá para provar sem Phaser e deixe o resto para o browser:

- em `HuntProbe`, `HuntProbeState` ganha o anel — alvo, posição em tile e visibilidade — e o teste
  prova que ele acompanha a troca de alvo, some quando o alvo morre e some quando o alvo é limpo;
- em `CombatTargeting.test.ts`, se a interface mudar, os testes existentes continuam passando sem
  alteração de comportamento.

- [ ] **5. GREEN do anel.**

Desenhe na tile, com a profundidade abaixo do ator, reusando `CellAnchor` e `TileDepth` — não
invente uma terceira convenção de posicionamento. **Reaproveite o objeto** entre frames: criar e
destruir a cada frame é o defeito que `PB-05-FIX-09` está corrigindo em outro lugar; não o
reintroduza aqui.

Remova `setTint(0xffd166)` de `syncTargetHighlight` e deixe o método cuidando só do flash.

- [ ] **6. Spec de browser no projeto `correctness`.**

Em `tests/e2e/hunt-play.spec.ts`, afirmando **estado**, não pixel: com um alvo selecionado, o probe
reporta o anel na tile daquele ator; após `clear-target`, não reporta nenhum; e uma troca de alvo
move o anel. Sem `retries`, sem `waitForTimeout` arbitrário.

Para o shake, use `activeImpulses()`: uma sequência de danos pequenos não produz impulso `shake`.

- [ ] **7. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-02-target exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-02-target --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-02-target typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-02-target architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-02-target verify
```

`verify` builda antes do Playwright. **Nunca** rode `playwright test` direto: a suíte serve
`dist/game`, e sem build ela testa o bundle velho.

- [ ] **8. Inspeção humana antes de integrar.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-02-target dev
```

Olhe: o anel aparece sob a criatura mirada e não treme com o golpe; trocar de alvo move o anel;
mordida de rotworm não sacode a tela; um acerto grande sacode.

- [ ] **9. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb07-02-target add apps tests docs
git -C C:\Kaezan\kaezan-huntbound-pb07-02-target commit -m "feat: mark the target with a ring and shake only on heavy hits"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-02-target-and-impact
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb07-02-target
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-02-target-and-impact
```

## Verificação

`biome check .` em `0`; testes de `@huntbound/game` verdes com a contagem registrada; `typecheck`,
`architecture:check` e `verify` verdes na worktree e no resultado integrado; specs de browser
estáveis **sem `retries`**; inspeção do passo 8 feita e descrita.

Se `assets:stage:test` falhar com `EPERM ... rename`, é flake de Windows, não código: confirme que
não há `vite preview` vivo na porta 4173 e rode de novo.

## Critérios de aceite

- [ ] `setTint(0xffd166)` não existe mais no repositório.
- [ ] `sprite.setData('hunt-targeted', ...)` continua existindo e correto.
- [ ] O anel é ancorado na tile, com profundidade abaixo do ator, e não herda lunge nem hit-stop.
- [ ] O objeto do anel é reaproveitado entre frames, não recriado.
- [ ] A decisão de shake mora em `CombatImpulses.ts`, não na cena, e o limiar é constante nomeada e
      exportada, com comentário justificando o número.
- [ ] O limiar é fração da vida máxima, não valor absoluto.
- [ ] `flash`, `lunge` e `hit-stop` continuam com o comportamento de hoje — provado por teste.
- [ ] Existe spec `correctness` afirmando estado do anel e ausência de shake em dano pequeno.
- [ ] Nenhum arquivo de `packages/**` ou `tools/**` foi tocado. Nenhum golden mudou.
- [ ] `corepack pnpm verify` sai `0` depois da integração.

## Condições de parada

**Pare e registre no `STATE.md`** se: o anel exigir mudar `packages/contracts` ou o formato de
`drawCommands`; a vida máxima do jogador não estiver disponível na cena sem atravessar uma fronteira
de pacote; ou se a mesma causa reprovar dois ciclos vermelho/verde seguidos.

**Não pare** por escolha de raio, espessura, cor ou limiar exato. São ambíguos por natureza e
baratos de reverter: escolha, registre em uma linha no commit, e siga — o jogo mostra se ficou ruim.

## Persistência do handoff

Atualize `docs/playbooks/PB-07/STATE.md`: status, branch, commit, contagem de testes, modelo e
effort usados, e a próxima task elegível.

## Commit

`feat: mark the target with a ring and shake only on heavy hits`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-02-target-and-impact`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb07-02-target`; integração por `--ff-only`; verificação pós-integração
por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, limiar escolhido e por quê, contagem de testes, specs de browser adicionadas, o que foi
observado na inspeção do passo 8, integração, limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Luna max ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07\tasks\PB-07-02-alvo-e-impacto-legiveis.md

Leia AGENTS.md, .cursor/rules/40-game.mdc, .cursor/rules/50-tests.mdc,
docs/playbooks/PB-07/README.md, docs/playbooks/PB-07/STATE.md e apenas os arquivos indicados pela
task.

ANTES DE COMECAR: rode git status --porcelain=v1 e confirme que apps/game/src/hunt/CombatImpulses.ts,
apps/game/src/phaser/scenes/HuntScene.ts e apps/game/src/phaser/createGame.ts estao LIMPOS. Se
houver modificacao nao commitada neles, PARE e reporte: e o bloqueio B1 do STATE.md.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb07-02-target com a branch
codex/pb07-02-target-and-impact e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED.

(1) Shake por magnitude. Hoje CombatImpulses cria impulso 'shake' em TODO combat/damaged no jogador.
Passe a exigir que o dano recebido seja uma FRACAO da vida maxima do jogador. O limiar e constante
nomeada e exportada ao lado de SHAKE_TTL_MS, com um comentario dizendo por que aquele numero.
CombatImpulseInput recebe a vida maxima; nao deduza a maxima de remainingHealth. flash, lunge e
hit-stop NAO mudam, e isso precisa de teste. A decisao mora em CombatImpulses.ts, nunca na cena.

(2) Anel de alvo. Remova sprite.setTint(0xffd166) de syncTargetHighlight — tint e multiplicativo e
por isso o alvo hoje so ESCURECE. Desenhe um anel/circulo ancorado NA TILE do alvo, com profundidade
ABAIXO do sprite do ator, reusando CellAnchor e TileDepth. O anel nao pode herdar lunge nem
hit-stop. Reaproveite o objeto entre frames; nao crie e destrua por frame. Mantenha
sprite.setData('hunt-targeted', ...), que e contrato observavel. O alvo continua vindo de
CombatTargeting: nao crie segunda fonte de verdade. Um arquivo novo em apps/game/src/hunt/ e melhor
que inchar HuntScene.ts, que ja tem 1213 linhas.

(3) Exponha o anel em HuntProbeState e escreva spec no projeto correctness em
tests/e2e/hunt-play.spec.ts afirmando ESTADO, nao pixel: anel na tile do alvo, some ao limpar alvo,
move ao trocar. Para o shake use activeImpulses(). Sem retries e sem waitForTimeout arbitrario.

NAO toque packages/** nem tools/**. Nenhum golden pode mudar. Se algo exigir mudar contrato, PARE.

Rode biome check ., os testes de @huntbound/game, typecheck, architecture:check e verify. NUNCA rode
playwright test direto: a suite serve dist/game e sem build testa bundle velho. Se assets:stage:test
falhar com EPERM rename, e flake de Windows: confirme que nao ha vite preview na porta 4173 e rode de
novo.

Antes de integrar, suba "corepack pnpm dev" e confira: anel sob a criatura mirada sem tremer,
troca de alvo move o anel, mordida de rotworm nao sacode a tela, acerto grande sacode.

Atualize o STATE.md, commite, integre por fast-forward na main, reverifique com verify e limpe
worktree e branch removendo o diretorio antes do prune.

Raio, espessura, cor e limiar exato sao ambiguos por natureza: escolha, registre em uma linha no
commit e siga. Nao inicie a proxima task.
```
