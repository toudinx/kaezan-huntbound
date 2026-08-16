# PB-05-10 — Renderizar o combate e entregar o HUD

**Status inicial:** pending

**Classe da tarefa:** implementação de apresentação e input, bem especificada

**Modelo sugerido:** GPT-5.6 Luna `xhigh` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; a validação humana acontece em PB-05-11

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** não. Depende da fixture e do pack.

## Objetivo

Tornar o combate jogável e legível: input de ataque e conjuração por teclado e por toque, barras de
vida e mana, alvo destacado, números de dano, corpo e sangue no chão, o arco de autoloot, o log de
loot e o overlay de morte com reinício.

## Resultado esperado

A hunt é caçável de fato no browser, com toda a decisão de regra vindo de eventos do kernel e nenhuma
regra nova nascendo na apresentação.

## Dependências

- PB-05-08 `done` e integrada: kernel, conteúdo e fixture prontos.
- PB-05-09 `done` e integrada: chaves de combate resolvendo no pack.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/STATE.md`;
3. `docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`, seções "Autoloot: o corpo é
   decoração" e "Eventos";
4. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`, a fronteira entre canvas e DOM;
5. `apps/game/src/hunt/**` inteiro;
6. `apps/game/src/input/InputMap.ts` e `TickInputGate.ts`;
7. `apps/game/src/ui/AppShell.ts` e `Dpad.ts`;
8. `apps/game/src/bridge/SceneBridge.ts`;
9. `.cursor/rules/40-game.mdc`.

## Decisões congeladas

- **Phaser não decide regra.** Dano, cura, morte, loot e cooldown chegam por evento; a apresentação
  só interpreta. Nenhuma regra nova em cena.
- UI densa é **DOM**: barras, alvo, botões de habilidade com cooldown, log de loot e overlay de morte.
  Sobre o canvas ficam apenas elementos ancorados no mundo: números de dano, corpo, sangue e o arco.
- Corpo e sangue são decoração com TTL visual, sem estado no kernel e sem bloquear tile.
- O arco de autoloot é animação; a bolsa exibida vem de `projectRunBag`, entregue por PB-05-06.
- Uma ação por tick continua valendo: o input passa por `TickInputGate`, e o toque curto continua
  gerando **um** comando, como PB-04-FIX-02 corrigiu.
- Morte do jogador mostra overlay e oferece reinício; reiniciar recria o kernel com o **mesmo**
  cenário e a **mesma** seed. Não há respawn no kernel.
- Asset só por manifest key; nenhum path literal.
- Nenhuma dependência externa nova.

## Escopo permitido

```text
apps/game/src/hunt/**
apps/game/src/ui/**
apps/game/src/input/**
apps/game/src/bridge/**
apps/game/src/phaser/scenes/HuntScene.ts
apps/game/src/styles.css
docs/playbooks/PB-05/STATE.md
```

## Fora de escopo

- `packages/simulation`, `packages/contracts`, `packages/content`, `packages/assets`;
- screenshots, viewports e QA — PB-05-11;
- persistir a bolsa — PB-06;
- rebalancear combate.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-10-hud -b codex/pb-05-10-combat-hud main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-10-hud install --prefer-offline
```

- [ ] **2. Escrever testes RED do input de combate.**

Prove: a tecla de ataque emite **um** `actor/attack` por pressionada, com alvo corrente; as teclas de
habilidade emitem `actor/cast-ability` com o índice certo; segurar a tecla não enfileira uma
enxurrada de comandos; o botão de toque gera exatamente um comando por toque curto; ataque sem alvo
não emite comando; o gate de tick continua permitindo **uma** ação por tick.

O caso do toque curto é regressão direta do defeito D1: prove com evento de ponteiro real, não com
chamada direta ao handler.

- [ ] **3. Implementar o input; obter GREEN.**

- [ ] **4. Escrever testes RED da seleção de alvo.**

Prove: o alvo é escolhido por clique/toque na criatura e por tecla de ciclo; o alvo morto é limpo ao
chegar `actor/died`; o alvo fora de alcance continua selecionado, mas o ataque é recusado pelo kernel
e a recusa aparece no HUD; `combat/target-changed` do kernel atualiza o destaque.

- [ ] **5. Implementar a seleção de alvo; obter GREEN.**

- [ ] **6. Escrever testes RED do view model do HUD.**

Prove: `combat/damaged` e `combat/healed` atualizam as barras da vítima; a barra do alvo reflete
`remainingHealth`; a mana reflete o gasto de `ability/cast`; o cooldown de cada botão deriva do tick
corrente e do estado de cooldown; `loot/granted` alimenta o log e a bolsa por `projectRunBag`;
`actor/died` do jogador liga o overlay.

Teste o view model como função pura sobre eventos, sem DOM. É o que torna o HUD verificável sem
browser.

- [ ] **7. Implementar o HUD em DOM; obter GREEN.**

- [ ] **8. Escrever testes RED da decoração.**

Prove: `actor/died` cria corpo e sangue na posição do evento; ambos desaparecem após o TTL declarado;
não bloqueiam passagem; o arco de autoloot parte da posição da morte e termina no jogador; nada disso
consulta estado do kernel além do evento.

- [ ] **9. Implementar a decoração e os números de dano; obter GREEN.**

- [ ] **10. Implementar morte e reinício.**

Overlay ao morrer, com reinício que recria o kernel do mesmo cenário e mesma seed. Prove que o
reinício devolve o mundo ao estado inicial e não acumula listeners nem sprites.

- [ ] **11. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-10-hud exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-10-hud --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-10-hud typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-10-hud architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-10-hud build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-10-hud verify
```

`build` antes de qualquer conclusão sobre o browser: o Playwright serve o `dist` pré-buildado, e
julgar pelo bundle velho já custou tempo aqui.

- [ ] **12. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-10-hud add apps docs
git -C C:\Kaezan\kaezan-huntbound-pb05-10-hud commit -m "feat: render combat, damage, autoloot and the combat HUD"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb-05-10-combat-hud
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-10-hud
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb-05-10-combat-hud
```

Se o `Remove-Item` falhar com recurso ocupado, mate o listener do vite antes de apagar, conforme
`AGENTS.md`.

## Verificação

Testes de `@huntbound/game`, `typecheck`, `architecture:check`, `build` e `verify` verdes; `biome
check .` em `0`.

## Critérios de aceite

- [ ] Um toque curto gera exatamente um comando, provado com evento de ponteiro real.
- [ ] Uma ação por tick continua valendo, pelo `TickInputGate`.
- [ ] Ataque e as três habilidades são acionáveis por teclado e por toque.
- [ ] O alvo é selecionável, destacado, limpo na morte e sincronizado com
      `combat/target-changed`.
- [ ] Barras, cooldowns, log de loot e bolsa derivam **apenas** de eventos.
- [ ] Nenhuma regra de dano, cura, morte ou loot nasce na apresentação.
- [ ] Corpo, sangue e arco de autoloot aparecem, respeitam TTL e não bloqueiam passagem.
- [ ] A morte do jogador mostra overlay e o reinício recria o mundo com a mesma seed, sem vazar
      listeners nem sprites.
- [ ] Todo asset é acessado por manifest key.
- [ ] Nenhuma dependência externa nova entrou.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: alguma informação do HUD não puder ser derivada de evento sem ler estado interno do
kernel; o input não conseguir garantir uma ação por tick; o reinício não devolver o mundo ao estado
inicial; ou se corpo/sangue exigirem estado no kernel para funcionar.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, testes, comandos e exit codes, modelo e effort usados,
e a próxima task elegível.

## Commit

`feat: render combat, damage, autoloot and the combat HUD`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb-05-10-combat-hud`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-10-hud`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, o que é DOM e o que é canvas, TTL escolhido para corpo e sangue,
comandos com exit code, integração, limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-10-renderizar-combate-e-hud.md

Leia AGENTS.md, o STATE.md do playbook PB-05 e apenas os arquivos indicados pela task. Confirme que
PB-05-08 e PB-05-09 estao done e integradas.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-10-hud com a branch codex/pb-05-10-combat-hud e
rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Entregue input de ataque e das tres habilidades por teclado e por toque, selecao e
destaque de alvo, barras de vida e mana, cooldowns, numeros de dano, corpo e sangue com TTL, o arco de
autoloot, o log de loot e o overlay de morte com reinicio.

Regra nenhuma nasce na apresentacao: tudo vem de evento do kernel. UI densa em DOM; sobre o canvas so
o que e ancorado no mundo. Teste o view model como funcao pura sobre eventos, sem DOM.

Prove que um toque curto gera exatamente UM comando, usando evento de ponteiro real e nao chamada
direta ao handler — e a regressao do defeito D1. O TickInputGate continua permitindo uma acao por
tick.

O reinicio recria o kernel com o mesmo cenario e a mesma seed; prove que nao vazam listeners nem
sprites.

Rode biome check ., os testes de @huntbound/game, typecheck, architecture:check, build e verify.
Sempre builde antes de concluir qualquer coisa sobre o browser: o Playwright serve o dist pre-buildado.

Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe worktree e branch
removendo o diretorio antes do prune; se o remove falhar por recurso ocupado, mate o listener do vite
antes.

Nao toque em packages/**. Screenshots e viewports sao PB-05-11. Se surgir decisao nao coberta, pare e
registre o bloqueio. Nao inicie a proxima task.
```
