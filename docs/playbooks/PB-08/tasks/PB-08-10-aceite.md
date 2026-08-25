# PB-08-10 — Aceite

**Status inicial:** pending

**Classe da tarefa:** gate final e entrega para aceite de produto

**Modelo sugerido:** camada frontier — **GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6**, effort `xhigh`.
A `docs/08_POLITICA_MODELOS_AGENTES.md` manda camada frontier para gates finais **mesmo quando o diff
esperado é pequeno**, porque o risco está no julgamento.

**Validador sugerido:** **o usuário jogando.** Não há validador de agente para esta task.

**Rota:** `superpowers:verification-before-completion`. Skills operacionais: `playbook-task`,
`run-gates`.

**Paralelismo:** depende de **todas as anteriores integradas**. É a última.

**Spec:** `docs/superpowers/specs/2026-08-25-pb-08-cockpit-hud-design.md`.

## Objetivo

Entregar o PB-08 jogável e dizer, em uma página, **o que olhar** e **como reproduzir**.

O `AGENTS.md` é explícito: *"o aceite é o usuário jogando. Playbook não fecha por veredito de
auditoria."* O papel desta task é deixar o jogo de pé e a verificação fácil — não emitir parecer.

## O que mudou nesta reescrita

O aceite anterior julgava **mecânica**: as nove ações existem, o cooldown roda, a postura aplica
modificador. Tudo isso é verdade desde a PB-08-07, e o playtest de 2026-08-25 mostrou que **não é o
que estava faltando**. O que faltava era leitura.

Então o roteiro de aceite passa a julgar **leitura antes de mecânica**, e a primeira pergunta é a que
o usuário fez com essas palavras: *isso parece jogo, ou parece planilha?*

## O que esta task NÃO é

- **Não é auditoria.** Auditoria independente roda **depois** do aceite, é opcional, e o que ela
  encontra vira task de correção no backlog — nunca portão para o playbook seguinte.
- **Não é conserto.** Se algo estiver quebrado, é defeito de uma task anterior. Registre no
  `STATE.md`, abra a correção como task própria e **diga no relatório**. Consertar dentro do aceite
  esconde de qual task veio o defeito.
- **Não inicia o PB-09.** Nenhum playbook espera o fechamento formal de outro; o que o PB-09 espera é
  código integrado na `main` e verde.

## As três entregas

### 1. Gates verdes, com evidência fresca

- `corepack pnpm verify` — **exit 0**, saída colada no relatório.
- `corepack pnpm qa:budgets` — **medido e registrado como número** no `STATE.md`.

**`qa:budgets` é camada informativa e não bloqueia merge.** Vermelho vira task de performance no
backlog. Mas **rodar não é opcional** — o que é opcional é bloquear.

Esta é a primeira vez que o minimapa entra na medição. Se o boot ou a hunt regredirem contra a
medição anterior, **diga o número dos dois lados** em vez de só reportar vermelho: o painel novo é o
suspeito óbvio e o card da 09 exige terreno em camada *offscreen* justamente por isso.

**Antes de teorizar sobre performance, liste o que está rodando.** O B7 do PB-08 original documentou
um `qa:browser` órfão que fez `tools/replay` reprovar por timeout — 642 s contra 73 s com a máquina
livre:

```
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like '*kaezan-huntbound*' }
```

Vale também para sessões paralelas: em 2026-08-25 duas sessões dividindo a porta 4173 com
`--strictPort` derrubaram um `verify` inteiro e produziram dois vermelhos que não eram defeito de
código.

### 2. `corepack pnpm dev` de pé

E, se você subir servidor, **derrube o que subiu ao terminar** — ou avise que deixou de pé, de
propósito, para o usuário jogar. Um `vite` de pé segura `apps/game/public/assets` e faz
`assets:stage:test` falhar com `EPERM ... rename` de forma determinística.

### 3. O roteiro de aceite

Uma página no relatório, e é o entregável que importa. Para **cada** critério da spec, uma linha
dizendo **o que olhar** e **como reproduzir em menos de um minuto**:

| # | Critério | O que olhar |
|---|---|---|
| 1 | Não parece planilha | Os arcos dominam a tela, existe vazio, nenhum painel tem rótulo de grupo |
| 2 | Dano se distingue de situacional **sem ler rótulo** | O vão na barra separa os dois blocos |
| 3 | Postura se lê como modo | O switch tem dois assentos e não parece botão de magia; três estados |
| 4 | Cooldown de grupo é honesto | Conjure Berserk e confira que Challenge e Haste **continuam claras** |
| 5 | Jogador centrado na área livre | Nos quatro viewports, e nada de HUD invade a área |
| 6 | O mapa mostra onde você está | Ande e veja o ponto mover; desça de andar e veja o desenho trocar |
| 7 | Alvo é honesto no que falta | Vida real; linhas de elemento dizem `—`, nunca `0` |
| 8 | Bag mostra o que caiu | **No perfil `personal`**, com ícone |

**O critério 8 não se julga com o perfil `test`.** Ele fabrica placeholder 1×1 para qualquer id, e a
bag passa verde sem arte. Se o roteiro de aceite mandar o usuário olhar a bag num build `test`, o
roteiro está errado.

## Definition of Done

- [ ] `verify` verde, saída colada.
- [ ] `qa:budgets` medido, número no `STATE.md`, comparado com a medição anterior.
- [ ] Jogo de pé, ou instrução de como subir em uma linha.
- [ ] Roteiro de aceite escrito, um item por critério, com o que olhar e como reproduzir.
- [ ] Defeitos encontrados viraram task no backlog, **não** conserto aqui.
- [ ] `STATE.md` só na linha da task.
- [ ] `git status --porcelain && git branch --no-merged main && git worktree list` colado, vazio.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com modelo frontier em xhigh.
Use obrigatoriamente superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-08\tasks\PB-08-10-aceite.md

Leia antes: AGENTS.md, o STATE.md do PB-08 e
docs/superpowers/specs/2026-08-25-pb-08-cockpit-hud-design.md.

Esta task NAO CONSERTA e NAO AUDITA. Se algo estiver quebrado, e defeito de uma task anterior:
registre no STATE.md, abra a correcao como task propria e DIGA NO RELATORIO. Consertar dentro do
aceite esconde de qual task veio o defeito.

TRES ENTREGAS:
1. corepack pnpm verify -> exit 0, saida colada. E corepack pnpm qa:budgets MEDIDO, numero no
   STATE.md, COMPARADO com a medicao anterior — o minimapa entra na medicao pela primeira vez e e o
   suspeito obvio se algo regredir. qa:budgets NAO BLOQUEIA merge, mas RODAR NAO E OPCIONAL.
   Antes de teorizar sobre performance, liste o que esta rodando:
   Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like '*kaezan-huntbound*' }
   Vale para sessoes paralelas: em 2026-08-25 duas sessoes dividindo a porta 4173 com --strictPort
   derrubaram um verify inteiro e produziram dois vermelhos que NAO eram defeito de codigo.
2. corepack pnpm dev de pe. Se subir servidor, DERRUBE ao terminar ou avise que deixou de proposito.
   Um vite de pe segura apps/game/public/assets e faz assets:stage:test falhar com EPERM rename.
3. O ROTEIRO DE ACEITE: uma pagina, um item por criterio, dizendo O QUE OLHAR e COMO REPRODUZIR EM
   MENOS DE UM MINUTO. Os oito criterios estao no card. LEITURA ANTES DE MECANICA: a primeira
   pergunta e a que o usuario fez com essas palavras — isso parece jogo, ou parece planilha?

O CRITERIO DA BAG NAO SE JULGA NO PERFIL "test". Ele fabrica placeholder 1x1 para qualquer id e a bag
passa verde sem arte. O roteiro tem que mandar olhar no perfil PERSONAL.

Ao terminar: atualize somente a linha PB-08-10 do STATE.md. Commit, integre na main com
git merge --ff-only, e cole no relatorio a saida de:
git status --porcelain && git branch --no-merged main && git worktree list

NAO inicie o PB-09.
```
