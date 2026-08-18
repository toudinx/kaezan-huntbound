# PB-06-08 — Integrar o save e o inventário no jogo

**Status inicial:** pending

**Classe da tarefa:** implementação bem especificada de composição e UI

**Modelo sugerido:** GPT-5.6 Luna `xhigh` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; QA de browser em PB-06-09

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** serial.

## Objetivo

Ligar o save ao jogo: gravar checkpoints durante a hunt, retomar a sessão no boot, mostrar a bolsa da
run e o estoque persistente no DOM, e oferecer export e import — com falha de persistência visível.

## Resultado esperado

Jogar, fechar a aba, reabrir e continuar de onde parou, com o loot no lugar; concluir a run e ver o
que ela rendeu somar ao estoque, uma vez só.

## Dependências

- PB-06-05 `done` e integrada em `main`.
- PB-06-06 `done` e integrada em `main`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-06/STATE.md`;
3. `docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`, seção "Ciclo de vida da
   sessão";
4. `packages/save/src/session/**` e `packages/save/src/index.ts`;
5. `apps/game/src/main.ts`;
6. `apps/game/src/hunt/RestartableHuntDriver.ts` e `apps/game/src/hunt/CombatViewModel.ts`;
7. `apps/game/src/ui/AppShell.ts` e `apps/game/src/ui/CombatHud.ts`, para o padrão de painel DOM;
8. `apps/game/src/save/SaveProbe.ts`, entregue por PB-06-05.

## Decisões congeladas

- **Regra de jogo não entra em cena Phaser.** A decisão de retomar, consolidar e agendar já está em
  `@huntbound/save`; `apps/game` compõe, não redecide.
- O HUD denso é DOM. A bolsa e o estoque são painel DOM, como o HUD de combate do PB-05.
- A bolsa da run continua sendo `projectRunBag` de `@huntbound/content`, alimentando o
  `CombatViewModel`. O jogo passa o resultado pronto para o save.
- Checkpoints: a cada `200` ticks, no fim da run, no abandono e em `pagehide`.
- O boot chama `decideResume`. `resume` recria o kernel do snapshot persistido; `discard` consolida a
  bolsa e começa run nova; `fresh` começa run nova.
- **Falha de persistência é visível.** Um estado de erro chega ao shell pelo `SceneBridge`. O jogo
  nunca finge ter salvo e nunca trava por causa do save.
- Import é substituição e **exige confirmação explícita** na UI antes de sobrescrever o save atual.
- Export entrega o conteúdo ao usuário pelo caminho já usado pelo shell para conteúdo local. Não
  introduza upload, servidor nem serviço externo: o save nunca sai da máquina.
- `apps/game` não conhece IndexedDB diretamente: só `createIndexedDbSaveDriver`.
- Nenhuma dependência nova.

## Escopo permitido

```text
apps/game/src/save/**
apps/game/src/ui/**
apps/game/src/hunt/**            (somente o gancho de checkpoint e de fim de run)
apps/game/src/main.ts
apps/game/src/styles.css
docs/playbooks/PB-06/STATE.md
```

## Fora de escopo

- alterar `packages/save`, `packages/simulation`, `packages/content` ou `packages/contracts`;
- screenshots e QA nos quatro viewports — PB-06-09;
- equipar, usar item, capacidade e peso;
- menu de mundo e seleção de hunt.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb06-08-ui -b codex/pb06-08-save-ui main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-08-ui install --prefer-offline
```

- [ ] **2. Escrever testes RED do painel.**

Prove: o painel lista a bolsa da run e o estoque separadamente, ordenados por `itemKey`; contagem
atualiza por evento sem reprocessar a run; bolsa vazia e estoque vazio têm estado próprio, não uma
lista em branco; o painel remove seus listeners no `destroy`.

- [ ] **3. Escrever testes RED da composição de boot.**

Prove, com um repositório de teste sobre `MemorySaveDriver`: `resume` recria o kernel no tick
persistido; `discard` consolida a bolsa e começa do tick `0`; `fresh` começa do tick `0` com estoque
preservado; falha de leitura publica estado de erro e ainda assim inicia uma run nova.

- [ ] **4. Escrever testes RED do ciclo de checkpoint.**

Prove: o gancho de tick chama o agendador nas fronteiras; o fim da run consolida uma vez; o
`pagehide` faz `flush`; o `destroy` descarta o agendador sem escrita pendente perdida silenciosamente.

- [ ] **5. Implementar; obter GREEN.**

Reaproveite `RestartableHuntDriver` em vez de criar um segundo caminho de reinício. Se ele não servir,
diga por quê no relatório em vez de duplicar.

- [ ] **6. Construir e olhar.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-08-ui build
```

Playwright serve o `dist`; sem build, você vai depurar um bundle velho.

- [ ] **7. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-08-ui exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-08-ui --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-08-ui typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-08-ui architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-08-ui save:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-08-ui verify
```

- [ ] **8. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb06-08-ui add apps docs
git -C C:\Kaezan\kaezan-huntbound-pb06-08-ui commit -m "feat: resume the run and show the persistent bag in the shell"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb06-08-save-ui
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb06-08-ui
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb06-08-save-ui
```

## Verificação

Testes de `@huntbound/game`, `typecheck`, `architecture:check`, `save:check`, `build` e `verify`
verdes na worktree e no resultado integrado; `biome check .` em `0`. Se `verify` reprovar **somente**
por hunt-budget (B2) ou por screenshots que mudaram pela adição deliberada do painel, registre a
saída real no `STATE.md` — não ajuste teto e não regrave snapshot fora do escopo desta task.

## Critérios de aceite

- [ ] O boot decide entre retomar, descartar e começar novo pela função de `@huntbound/save`.
- [ ] Retomar coloca o jogo no tick persistido, com a bolsa da run visível.
- [ ] Descartar preserva o loot no estoque.
- [ ] Concluir a run soma ao estoque uma única vez.
- [ ] Checkpoints acontecem nas fronteiras, no fim da run e no `pagehide`.
- [ ] Falha de persistência aparece na UI e não derruba a run.
- [ ] Import exige confirmação explícita antes de substituir.
- [ ] O save não sai da máquina: nenhuma requisição de rede nova.
- [ ] Nenhuma regra de jogo nova entrou em cena Phaser.
- [ ] Nenhum pacote sob `packages/` foi alterado.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: a retomada exigir mudar `packages/save` ou `packages/simulation`; o painel exigir campo
novo no save; o `pagehide` não conseguir garantir o `flush` sem escrita síncrona bloqueante; ou se o
export exigir qualquer coisa que saia da máquina.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, contagem de testes, comandos e exit codes, o que o
`verify` reprovou e por quê, modelo e effort usados, e a próxima task elegível.

## Commit

`feat: resume the run and show the persistent bag in the shell`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb06-08-save-ui`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb06-08-ui`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, comportamento observado no boot nas três decisões, integração, limpeza,
desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-06\tasks\PB-06-08-integrar-save-e-inventario-no-jogo.md

Leia AGENTS.md, o STATE.md do playbook PB-06 e apenas os arquivos indicados pela task. Confirme que
PB-06-05 e PB-06-06 estao done e integradas e que main esta verde.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb06-08-ui com a branch codex/pb06-08-save-ui e rode
"corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Ligue o save ao jogo APENAS compondo: a decisao de retomar, consolidar e agendar ja
existe em @huntbound/save e nao pode ser redecidida em apps/game nem entrar em cena Phaser.

Boot: chame decideResume. resume recria o kernel no tick persistido; discard consolida a bolsa e
comeca run nova; fresh comeca nova preservando o estoque; falha de leitura publica estado de erro e
ainda assim inicia uma run.

Durante a run: checkpoint a cada 200 ticks, no fim da run, no abandono e em pagehide. A bolsa vem de
projectRunBag via CombatViewModel; o jogo entrega o resultado pronto ao save.

UI: painel DOM listando bolsa da run e estoque separadamente, ordenados por itemKey, com estado
proprio para vazio, e removendo listeners no destroy. Export e import locais; import EXIGE
confirmacao explicita antes de substituir. O save nunca sai da maquina: nenhuma requisicao de rede
nova.

Falha de persistencia e VISIVEL no shell e nao derruba a run.

Nao altere nada em packages/. Reaproveite RestartableHuntDriver em vez de criar um segundo caminho de
reinicio.

Rode "corepack pnpm build" antes de qualquer verificacao de browser. Rode biome check ., os testes de
game, typecheck, architecture:check, save:check e verify. Se o verify reprovar SOMENTE por hunt-budget
ou por screenshots mudadas pela adicao do painel, registre a saida real no STATE.md; nao ajuste teto e
nao regrave snapshot.

Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe worktree e branch
removendo o diretorio antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
