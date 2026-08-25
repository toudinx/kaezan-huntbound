# PB-08-08 — O chassi do cockpit

**Status inicial:** pending

**Classe da tarefa:** apresentação em `apps/game` **e câmera**; sem kernel, sem conteúdo novo, sem
asset novo

**Modelo sugerido:** camada frontier — **GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6**, effort `xhigh`.

Subiu de `Luna` para frontier na reescrita de 2026-08-25 por dois motivos: é a superfície que o
usuário julga no aceite, e deixou de ser só DOM e CSS — arrasta deslocamento de câmera e a reescrita
de um teste derivado de ADR.

**Validador sugerido:** **o usuário jogando.** Agrupamento e leitura não se auditam por texto.

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** depende de **04, 05, 06 e 07 integradas**. Todas estão. Destrava a 09.

**Spec:** `docs/superpowers/specs/2026-08-25-pb-08-cockpit-hud-design.md`. Leia antes desta task; ela
carrega o layout aprovado, as cinco rodadas recusadas e o porquê de cada decisão.

## Objetivo

Trocar cinco caixas ancoradas em cantos por uma moldura, e fazer as nove ações se lerem em grupos sem
que nenhuma delas ganhe rótulo de grupo.

## O defeito, medido

- `apps/game/src/ui/AppShell.ts:102` empilha `header`, `aside`, `controls`, `combatRoot` e
  `inventoryRoot` como irmãos ancorados em cantos absolutos. Não existe layout.
- `apps/game/src/styles.css:204` fixa o HUD em `grid-template-columns: minmax(11rem, 16rem)`.
- `apps/game/src/ui/CombatHud.ts:127` monta as nove abilities num `div` plano, na ordem do índice.

## O que **não** é o defeito, e não deve ser refeito

`InputMap.ts:52-71` **já liga** `Digit1`–`Digit9`, `Numpad1`–`Numpad9`, `Space`, `Enter`, `Tab` e
`Escape`. A versão anterior deste card mandava ligar nove teclas alegando que só três existiam. Era
leitura desatualizada. **Esta task não toca em `InputMap.ts`.**

## A decisão de autoridade que esta task executa

A ADR-001 diz *"centro e lower-middle do playfield permanecem livres"*, e
`tests/e2e/hunt-mobile.spec.ts:95` lê "playfield" como o canvas inteiro.

**O usuário reinterpretou em 2026-08-25:** playfield é a **área de jogo visível**; a moldura define
onde ela termina. Duas consequências, ambas obrigatórias aqui:

1. A câmera desloca para centrar o jogador **na área livre**.
2. `hunt-mobile.spec.ts:95` é **reescrito**, não deletado nem afrouxado. O contrato novo: a área livre
   tem tamanho mínimo declarado, o jogador está centrado nela, e nenhum elemento de HUD a invade.

Afrouxar asserção para fechar gate é defeito pelo `AGENTS.md`. Se o teste novo for mais fraco que o
velho, a task não fecha.

## A armadilha estrutural desta task

**CSS e câmera precisam concordar sobre onde a área livre termina.** Se o CSS disser que a barra tem
`88px` e a câmera assumir `80`, o boneco desalinha e ninguém descobre por teste unitário.

Por isso a área livre **nasce como um módulo TypeScript único**, e o CSS lê dele por custom property.
Dois números escritos em dois lugares é o defeito que esta task existe para não criar.

## Estrutura de arquivos

`CombatHud.ts` tem 270 linhas e ganharia todas as nove células mais os arcos. Ele se divide:

| Arquivo | Responsabilidade |
|---|---|
| **Criar** `apps/game/src/hunt/playfieldViewport.ts` | Fonte única da área livre: dado o tamanho da viewport e as métricas do HUD, devolve o retângulo livre. Consumido pela câmera **e** pelo CSS |
| **Criar** `apps/game/src/ui/cockpit/CockpitLayout.ts` | Monta as regiões e publica as métricas do HUD como custom properties |
| **Criar** `apps/game/src/ui/cockpit/VitalArcs.ts` | Os dois arcos SVG e seus números |
| **Criar** `apps/game/src/ui/cockpit/ActionDeck.ts` | Nove células, o vão, o switch de postura, o cooldown por grupo |
| **Criar** `apps/game/src/ui/cockpit/AbilityGlyph.ts` | O glifo de área de efeito por `abilityId` |
| **Modificar** `apps/game/src/ui/CombatHud.ts` | Passa a orquestrar os módulos acima; mantém alvo, loot e morte como estão até a 09 |
| **Modificar** `apps/game/src/hunt/CombatViewModel.ts` | Expõe `primaryCooldownGroup` e `secondaryCooldownGroup` por ability, e o cooldown restante **por grupo** |
| **Modificar** `apps/game/src/phaser/scenes/HuntScene.ts` | Câmera centra na área livre |
| **Modificar** `apps/game/src/styles.css` | Remove a coluna de 16rem; estiliza as regiões |
| **Reescrever** `tests/e2e/hunt-mobile.spec.ts:95` | Contrato novo de área livre |

## O que a task precisa entregar

| # | Exigência | Por quê |
|---|---|---|
| 1 | **Arcos curvos de vida e mana** flanqueando a área livre, número no pé | São a única forma curva na tela. É o que sustenta o desenho longe de dashboard — barra retangular foi recusada no playtest |
| 2 | **Deck centrado embaixo**, dano e situacional separados por um **vão** | Sem rótulo de grupo e sem cor por botão: as duas coisas foram recusadas. O vão é o separador |
| 3 | **Switch de postura de dois assentos** | Escolher Protector não pode custar uma conjuração de Blood Rage no caminho |
| 4 | **Cooldown por grupo honesto** | `Challenge` e `Haste` rodam em `support` e **não** são travadas pelo cooldown de ataque. HUD que as escurece junto **mente sobre a regra do jogo**. É a exigência mais fácil de errar |
| 5 | **Cada célula identificável sem ler rótulo**, pelo glifo de área de efeito | Berserk é o anel de raio 1; Groundshaker o círculo de raio 3; Whirlwind a linha; Wound Cleansing a cruz no próprio tile; Challenge o anel de vizinhos |
| 6 | **Jogador centrado na área livre** nos quatro viewports | É o que a reinterpretação da ADR compra |

## Decisões congeladas desta task

- **Regra de jogo não entra em scene nem em componente de UI** (`.cursor/rules/40-game.mdc`). O HUD
  **projeta** o que o view model diz; não decide disponibilidade, custo nem cooldown.
- **Nove células.** Cinco de dano (auto-attack, Berserk, Brutal Strike, Groundshaker, Whirlwind
  Throw), três situacionais (Wound Cleansing, Challenge, Haste), uma de postura com dois assentos.
- **O mapa de teclas fica 1:1.** `DigitN` → `abilityIndex N-1`, como já está. A ordem visual diverge
  da ordem do índice porque o catálogo põe Wound Cleansing no índice 2; a saída é **imprimir a tecla
  em cada célula**, não renumerar. Renumerar obrigaria o `InputMap` a conhecer agrupamento visual.
- **Emenda à decisão congelada 7 do card antigo.** "A postura alterna no mesmo botão" foi escrito
  como um botão que cicla. Vira switch de dois assentos: continua uma célula, continua nove.
- **Sem arte do Tibia nesta task.** O atlas de magia é da 09. Aqui os slots fecham com o glifo.
- **Acessibilidade não regride.** `aria-label`, `aria-disabled`, `role="progressbar"` nas barras e
  `data-testid` continuam nos nove controles. O switch usa `role="radiogroup"` com dois `radio`.
- **Quatro viewports.** `shell.spec.ts` já roda mobile, tablet, desktop e desktop-wide.
- **Nenhuma ação nova.** Esta task apresenta o que a 04 a 07 entregaram.

## Ambiguidade conhecida — e a saída

**Quanto a área livre encolhe em mobile.** Arcos e deck num viewport de 390 px comem muito. Há mais
de uma leitura plausível: arco mais fino, deck em duas linhas, ou arcos viram barras retas só no
telefone.

**Saída:** escolha a mais simples e mais fácil de reverter, garanta o mínimo de área livre que o teste
novo declara, e registre a escolha em uma linha no commit. **Não invente um segundo layout** — se o
mobile precisar de mais que ajuste de medida, isso é sinal de que a área livre mínima está errada, e
o número é que se corrige.

## Passos

1. **Teste primeiro.** Cinco vermelhos, nesta ordem:
   1. `playfieldViewport` devolve um retângulo livre que exclui deck e rail, e respeita o mínimo;
   2. o deck renderiza nove células com o vão entre o quinto e o sexto controle;
   3. o switch de postura reporta os três estados e não conjura o assento não escolhido;
   4. uma ability de `support` em cooldown **não** desabilita nenhuma de ataque, e vice-versa;
   5. o jogador está centrado na área livre, não no canvas.
2. Estenda `CombatViewModel` para expor os dois grupos de cooldown e o restante por grupo.
3. Crie `playfieldViewport.ts` e faça a câmera do `HuntScene` consumi-lo.
4. Monte `CockpitLayout`, `VitalArcs`, `ActionDeck` e `AbilityGlyph`; reduza o `CombatHud` a
   orquestrador.
5. Reescreva `hunt-mobile.spec.ts:95` para o contrato novo.
6. Rode os gates nos quatro viewports.

## Verificações exigidas

Evidência fresca, colada no relatório:

- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm architecture:check` — regra de jogo não pode ter vazado para a UI.
- `corepack pnpm build` **antes** de qualquer verificação no browser. `playwright.config.ts` sobe
  `vite preview` sobre `dist/game` e **nada na suíte reconstrói**. Armadilha 1 do `AGENTS.md`.
- `corepack pnpm qa:browser` — nos quatro viewports.
- `corepack pnpm combat:check`, `hunt:check` e `simulation:check` — **inalterados**. Esta task não
  toca simulação; se algum mover, ela saiu do escopo.
- `corepack pnpm verify` no fechamento.
- **Screenshot dos quatro viewports** anexada ao relatório.

## Definition of Done

- [ ] Arcos de vida e mana flanqueando a área livre, com número.
- [ ] Nove células, dano e situacional separados por vão, sem rótulo de grupo e sem cor por botão.
- [ ] Switch de postura com três estados e dois assentos clicáveis.
- [ ] Cooldown de `support` **não** escurece ações de ataque, e vice-versa, provado por teste.
- [ ] Cada célula distinguível pelo glifo de área de efeito, sem ler rótulo.
- [ ] `playfieldViewport.ts` é a **única** fonte da área livre; o CSS lê dele.
- [ ] Jogador centrado na área livre nos quatro viewports.
- [ ] `hunt-mobile.spec.ts:95` reescrito e **mais forte** que a versão anterior.
- [ ] `aria-label`, `aria-disabled` e `data-testid` preservados.
- [ ] `combat:check`, `hunt:check` e `simulation:check` inalterados.
- [ ] `verify` verde.
- [ ] `STATE.md` só na linha da task, com modelo e effort efetivamente usados.
- [ ] Branch integrada por `git merge --ff-only` e worktree removida.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com modelo frontier em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-08\tasks\PB-08-08-o-chassi-do-cockpit.md

Leia antes: AGENTS.md, .cursor/rules/40-game.mdc, o STATE.md do PB-08 e
docs/superpowers/specs/2026-08-25-pb-08-cockpit-hud-design.md, que carrega o layout aprovado.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb08-08-cockpit-chassis com a branch
<agente>/pb08-08-cockpit-chassis e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED.

NAO TOQUE EM InputMap.ts. Digit1-Digit9 e Numpad1-Numpad9 JA ESTAO LIGADAS em InputMap.ts:52-71.
A versao antiga do card dizia que so tres teclas existiam; era leitura desatualizada.

O QUE ENTREGAR:
1. ARCOS CURVOS de vida e mana flanqueando a area livre, numero no pe. Barra retangular foi RECUSADA
   no playtest. Os arcos sao a unica forma curva da tela e e o que segura o desenho longe de planilha.
2. DECK CENTRADO embaixo, dano e situacional separados por um VAO. SEM rotulo de grupo e SEM cor por
   botao: as duas coisas foram recusadas. O vao e o separador.
3. SWITCH DE POSTURA DE DOIS ASSENTOS (Blood Rage | Protector), tres estados. Escolher Protector nao
   pode custar uma conjuracao de Blood Rage no caminho.
4. COOLDOWN POR GRUPO HONESTO. Challenge e Haste rodam em secondaryCooldownGroup "support" e NAO sao
   travadas pelo cooldown de ataque. Se o HUD as escurecer junto, ele MENTE sobre a regra do jogo.
   Esta e a exigencia mais facil de errar. O CombatViewModel precisa expor os dois grupos.
5. CADA CELULA IDENTIFICAVEL SEM LER ROTULO, pelo glifo da propria area de efeito: Berserk anel de
   raio 1, Groundshaker circulo de raio 3, Whirlwind a linha, Wound Cleansing a cruz no proprio tile,
   Challenge o anel de vizinhos. NAO use arte do Tibia aqui: o atlas de magia e da PB-08-09.

A DECISAO DE ADR QUE VOCE EXECUTA:
A ADR-001 diz "centro e lower-middle do playfield permanecem livres" e hunt-mobile.spec.ts:95 le
"playfield" como o canvas inteiro. O USUARIO REINTERPRETOU em 2026-08-25: playfield e a AREA DE JOGO
VISIVEL, e a moldura define onde ela termina. Entao:
- a camera DESLOCA para centrar o jogador NA AREA LIVRE, nao no meio do canvas;
- hunt-mobile.spec.ts:95 e REESCRITO, nao deletado nem afrouxado. O contrato novo: area livre com
  tamanho minimo declarado, jogador centrado NELA, nenhum elemento de HUD invadindo. SE O TESTE NOVO
  FICAR MAIS FRACO QUE O VELHO, A TASK NAO FECHA.

A ARMADILHA ESTRUTURAL:
CSS e camera TEM que concordar sobre onde a area livre termina. Crie
apps/game/src/hunt/playfieldViewport.ts como FONTE UNICA do retangulo livre, consumido pela camera E
pelo CSS via custom property. Dois numeros em dois lugares e exatamente o defeito a evitar.

ESTRUTURA: CombatHud.ts tem 270 linhas e ganharia tudo. Divida em
ui/cockpit/{CockpitLayout,VitalArcs,ActionDeck,AbilityGlyph}.ts e deixe CombatHud como orquestrador.
Alvo, loot e morte ficam como estao ate a PB-08-09.

REGRA DE JOGO NAO ENTRA EM SCENE NEM EM COMPONENTE DE UI (.cursor/rules/40-game.mdc).
ACESSIBILIDADE NAO REGRIDE: aria-label, aria-disabled, role=progressbar, data-testid. O switch usa
role=radiogroup com dois radio.
QUATRO VIEWPORTS. Nove acoes cabendo no desktop e estourando no mobile e FALHA, nao trade-off.
NENHUMA ACAO NOVA.

AMBIGUIDADE: quanto a area livre encolhe em mobile. Escolha a opcao mais simples e mais facil de
reverter, garanta o minimo que o teste novo declara, registre em uma linha no commit. NAO INVENTE UM
SEGUNDO LAYOUT.

ARMADILHA 1 DO AGENTS.md: playwright.config.ts sobe "vite preview" sobre dist/game e NADA NA SUITE
RECONSTROI. Rode "corepack pnpm build" antes de qualquer verificacao no browser.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm typecheck
- corepack pnpm test
- corepack pnpm architecture:check
- corepack pnpm build
- corepack pnpm qa:browser   nos QUATRO viewports
- corepack pnpm combat:check, hunt:check e simulation:check -> INALTERADOS
- corepack pnpm verify no fechamento
- SCREENSHOT DOS QUATRO VIEWPORTS anexada ao relatorio.

Ao terminar: atualize somente a linha PB-08-08 do STATE.md com o modelo e o effort EFETIVAMENTE
usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com git merge --ff-only,
rode a verificacao pos-integracao, remova a worktree e a branch, e cole no relatorio a saida de:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
