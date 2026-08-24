# PB-08-08 — Nove ações no HUD e no input

**Status inicial:** pending

**Classe da tarefa:** apresentação em `apps/game`; sem kernel, sem conteúdo novo

**Modelo sugerido:** **GPT-5.6 Luna**, effort `xhigh`.

**Validador sugerido:** **marco de revisão frontier.** É a superfície que o usuário julga no aceite, e
agrupar dano e situacional é decisão de leitura — a `docs/08_POLITICA_MODELOS_AGENTES.md` concentra
revisão frontier nos marcos, e este é um.

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** depende de **04, 05, 06 e 07 integradas**. É a última antes do aceite.

## Objetivo

Fazer as nove ações caberem na tela sem que a rotação de dano se confunda com as situacionais.

## O defeito, medido

- `apps/game/src/input/InputMap.ts:53-55` liga **três** teclas: `Digit1`, `Digit2`, `Digit3`.
- `apps/game/src/ui/CombatHud.ts` monta um botão de ataque e uma lista de abilities sem agrupamento.

Nove ações num HUD desenhado para três não é um problema de espaço: é um problema de **leitura**. O
README do PB-08 diz que o valor da rotação é ser divertida de assistir e **fácil de identificar** — e
essa promessa se cumpre ou se quebra aqui.

## São 9 células e 10 palavras

`docs/content/KNIGHT_BANDS.md`, §"Como contar uma ação": a célula de postura contém **duas magias
mutuamente exclusivas**, Blood Rage e Protector. Elas ocupam **uma célula e um botão**, que alterna
entre as duas.

Logo: **nove botões**, não dez. O botão de postura mostra qual das duas está ativa — ou que nenhuma
está, que é estado válido e inicial.

## O que a task precisa entregar

| # | Exigência | Por quê |
|---|---|---|
| 1 | **A rotação de dano é visualmente um bloco**, separada das situacionais | É a promessa do critério 3 do README. Células 1–5 são o que se assiste; 6–9 são situacionais |
| 2 | **Nove atalhos de teclado**, coerentes com a ordem visual | Hoje são três. A ordem do botão e a da tecla não podem divergir |
| 3 | **Estado de postura visível sem ler o texto** | Decisão congelada 7. Três estados: nenhuma, Blood Rage, Protector |
| 4 | **Cooldown por grupo legível** | Challenge e Haste rodam em `support` (**grupo secundário**) e **não** são travadas pelo cooldown de ataque. Se o HUD as escurecer junto com as magias de ataque, ele **mente** sobre a regra do jogo |
| 5 | Cada botão identificável **sem ler o rótulo** | Mesmo critério das ações: se só o texto distingue, a leitura falha |

**A 4 é a mais fácil de errar e a que mais engana.** O contrato v5 tem `primaryCooldownGroup` e
`secondaryCooldownGroup` justamente para isso, e o `CombatViewModel` precisa expor os dois.

## Leitura mínima

1. esta task;
2. `docs/content/KNIGHT_BANDS.md` — Seção 1 (as nove células e a imagem de cada uma) e §"Como contar
   uma ação";
3. `docs/playbooks/PB-08/README.md` — critério 3 e decisão congelada 7;
4. `.cursor/rules/40-game.mdc`;
5. `apps/game/src/ui/CombatHud.ts` e `CombatHud.test.ts`;
6. `apps/game/src/input/InputMap.ts:40-60` e `InputMap.test.ts`;
7. `apps/game/src/hunt/CombatViewModel.ts` — `CombatAbilityView`;
8. `apps/game/src/styles.css`;
9. `docs/assets/BROWSER_ASSET_CONTRACT.md` e os viewports da ADR-001, porque o HUD é responsivo.

## Decisões congeladas desta task

- **Regra de jogo não entra em scene nem em componente de UI.** `.cursor/rules/40-game.mdc`. O HUD
  **projeta** o que o view model diz; ele não decide disponibilidade, custo nem cooldown.
- **Nove botões, não dez.** A postura alterna no mesmo botão.
- **Acessibilidade não regride.** Os controles atuais carregam `aria-label`, `aria-disabled`,
  `role="progressbar"` nas barras e `data-testid`. Nove ações não podem custar isso.
- **Quatro viewports.** `shell.spec.ts` já roda mobile, tablet, desktop e desktop-wide. Nove ações
  cabendo no desktop e estourando no mobile é falha, não trade-off.
- **Nenhuma ação nova.** Esta task não acrescenta comportamento; ela apresenta o que 04 a 07
  entregaram.

## Ambiguidade conhecida — e a saída

**Como agrupar visualmente sem virar dois HUDs.** Há mais de uma leitura plausível: duas linhas, duas
cores, um separador, ou ordem mais espaçamento.

**Saída:** escolha a mais simples e mais fácil de reverter — a que exige menos CSS novo e nenhum
componente novo —, e registre a escolha em uma linha no commit. Se o usuário disser no aceite que não
está legível, trocar espaçamento por cor custa uma linha. **Não construa uma barra de atalhos
configurável**: isso é helper, e helper é PB-15.

**Teclas para nove ações.** `Digit1`–`Digit9` é o caminho óbvio e casa com a referência do LoL que o
README adota. Se algum dígito já estiver tomado por outra função, **declare o conflito e resolva a
favor da ação de combate**, registrando no commit.

## Passos

1. **Teste primeiro.** Quatro vermelhos: o HUD renderiza nove controles; a rotação de dano está
   agrupada e separada; o botão de postura mostra os três estados; e uma ação de `support` em
   cooldown **não** escurece as de ataque, nem o contrário.
2. Estenda `CombatViewModel` para expor grupo de cooldown e estado de toggle.
3. Estenda `InputMap` para `Digit1`–`Digit9`.
4. Reorganize o `CombatHud` e o CSS.
5. Rode os gates nos quatro viewports.

## Verificações exigidas

Evidência fresca, colada no relatório:

- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm architecture:check` — regra de jogo não pode ter vazado para a UI.
- `corepack pnpm build` **antes** de qualquer verificação no browser. `playwright.config.ts` sobe
  `vite preview` sobre `dist/game`, e **nada na suíte reconstrói**: toda edição em `apps/game/src/**`
  é invisível para o browser até o build. É a armadilha 1 do `AGENTS.md`.
- `corepack pnpm qa:browser` — nos quatro viewports.
- `corepack pnpm combat:check`, `hunt:check` e `simulation:check` — **inalterados**. Esta task não
  toca simulação; se algum mover, ela saiu do escopo.
- `corepack pnpm verify` no fechamento.
- **Screenshot dos quatro viewports** anexada ao relatório. É a única task do playbook cujo resultado
  não dá para julgar por texto.

## Definition of Done

- [ ] Nove controles no HUD, com a rotação de dano visualmente agrupada e separada das situacionais.
- [ ] `Digit1`–`Digit9` ligados, na mesma ordem dos botões.
- [ ] Botão de postura mostra nenhuma / Blood Rage / Protector.
- [ ] Cooldown de `support` **não** escurece ações de ataque, e vice-versa, provado por teste.
- [ ] `aria-label`, `aria-disabled` e `data-testid` preservados nos nove.
- [ ] Passa nos quatro viewports; screenshots anexadas.
- [ ] `combat:check`, `hunt:check` e `simulation:check` inalterados.
- [ ] `verify` verde.
- [ ] `STATE.md` só na linha da task, com modelo e effort efetivamente usados.
- [ ] Branch integrada por `git merge --ff-only` e worktree limpa.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-08\tasks\PB-08-08-nove-acoes-no-hud.md

Leia AGENTS.md, .cursor/rules/40-game.mdc, docs/playbooks/PB-08/README.md (criterio 3 e decisao
congelada 7), o STATE.md, e docs/content/KNIGHT_BANDS.md secao 1 e "Como contar uma acao".

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb08-08-nine-action-hud com a branch
<agente>/pb08-08-nine-action-hud e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Faca as NOVE acoes caberem na tela sem que a rotacao de dano se confunda com as
situacionais. Hoje apps/game/src/input/InputMap.ts:53-55 liga TRES teclas (Digit1..3) e
apps/game/src/ui/CombatHud.ts monta um botao de ataque e uma lista sem agrupamento.

SAO 9 CELULAS E 10 PALAVRAS: a celula de postura contem DUAS magias mutuamente exclusivas (Blood Rage
e Protector) que ocupam UM BOTAO, alternando. Logo NOVE BOTOES, nao dez. O botao mostra qual das duas
esta ativa — ou que NENHUMA esta, que e estado valido e inicial.

Cinco exigencias:
1. A ROTACAO DE DANO E VISUALMENTE UM BLOCO, separada das situacionais. Celulas 1-5 sao o que se
   assiste; 6-9 sao situacionais.
2. NOVE ATALHOS DE TECLADO coerentes com a ordem visual. Digit1..Digit9 e o caminho obvio e casa com
   a referencia do LoL que o README adota. Se algum digito ja estiver tomado, DECLARE o conflito e
   resolva a favor da acao de combate.
3. ESTADO DE POSTURA VISIVEL SEM LER O TEXTO. Tres estados.
4. COOLDOWN POR GRUPO LEGIVEL. Challenge e Haste rodam em "support" (GRUPO SECUNDARIO) e NAO sao
   travadas pelo cooldown de ataque. Se o HUD as escurecer junto com as magias de ataque, ele MENTE
   sobre a regra do jogo. Esta e a exigencia mais facil de errar. O contrato v5 tem
   primaryCooldownGroup e secondaryCooldownGroup para isso; o CombatViewModel precisa expor os dois.
5. Cada botao identificavel SEM LER O ROTULO.

REGRA DE JOGO NAO ENTRA EM SCENE NEM EM COMPONENTE DE UI (.cursor/rules/40-game.mdc). O HUD PROJETA o
que o view model diz; nao decide disponibilidade, custo nem cooldown.

ACESSIBILIDADE NAO REGRIDE: aria-label, aria-disabled, role=progressbar nas barras e data-testid
continuam nos nove.

QUATRO VIEWPORTS. shell.spec.ts ja roda mobile, tablet, desktop e desktop-wide. Nove acoes cabendo no
desktop e estourando no mobile e FALHA, nao trade-off.

NENHUMA ACAO NOVA. Esta task apresenta o que as tasks 04 a 07 entregaram.

AMBIGUIDADE: como agrupar visualmente sem virar dois HUDs. Escolha a opcao mais simples e mais facil
de reverter — a que exige menos CSS novo e NENHUM componente novo — e registre em uma linha no
commit. NAO CONSTRUA UMA BARRA DE ATALHOS CONFIGURAVEL: isso e helper, e helper e PB-15.

ARMADILHA 1 DO AGENTS.md: playwright.config.ts sobe "vite preview" sobre dist/game e NADA NA SUITE
RECONSTROI. Toda edicao em apps/game/src/** e INVISIVEL para o browser ate "corepack pnpm build".
Rode o build antes de qualquer verificacao no browser.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm typecheck
- corepack pnpm test
- corepack pnpm architecture:check   (regra de jogo nao pode ter vazado para a UI)
- corepack pnpm build
- corepack pnpm qa:browser   nos QUATRO viewports
- corepack pnpm combat:check, hunt:check e simulation:check -> INALTERADOS
- corepack pnpm verify no fechamento
- SCREENSHOT DOS QUATRO VIEWPORTS anexada ao relatorio. E a unica task do playbook cujo resultado nao
  da para julgar por texto.

Ao terminar: atualize somente a linha PB-08-08 do STATE.md, registrando o modelo e o effort
EFETIVAMENTE usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com
git merge --ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no
relatorio a saida de:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
