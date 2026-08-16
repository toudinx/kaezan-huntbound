# PB-05-08 — Fixture, golden e gate `combat:check`

**Status inicial:** pending

**Classe da tarefa:** fixture determinística e gate de replay — define a evidência que a auditoria vai
reexecutar

**Modelo sugerido:** GPT-5.6 Sol `xhigh` ou Grok 4.6 `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** não. Depende de toda a trilha de kernel e de conteúdo.

## Objetivo

Congelar uma sessão de combate reprodutível byte a byte e transformá-la em gate: `combat:check` entra
em `check` e em `verify`, e a fixture é registrada em `docs/simulation/REPLAY_CONTRACT.md` **no mesmo
commit que a cria**.

Esse registro é critério de aceite, não follow-up: sua ausência para o PB-04 virou o defeito D3 da
auditoria PB-04-10.

## Resultado esperado

`packages/test-fixtures/hunt/pb05/` versionada com cenário, command log, snapshot e journal golden,
mais o script `combat:check`, mais o registro no contrato de replay com hashes gerados dos arquivos
reais.

## Dependências

- PB-05-05, PB-05-06 e PB-05-07 `done` e integradas, com `main` verde.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/STATE.md`;
3. `docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`, seções "Parâmetros
   congelados", "Regressão obrigatória" e "Gates";
4. `docs/simulation/REPLAY_CONTRACT.md` inteiro;
5. `packages/test-fixtures/hunt/pb04/**`, como molde de fixture de hunt;
6. `tools/replay/cli.ts`, `tools/replay/replayArtifacts.ts` e `tools/replay/pb04HuntFixture.test.ts`;
7. `package.json`, os scripts `hunt:check`, `check` e `verify`.

## Decisões congeladas

- Fixture `pb-05-hunt-combat`, seed `2c3d4e5f60718293`, `900` ticks.
- A retomada é provada por **varredura completa** de `0..900`, não por amostragem.
- O command log grava **somente** comandos externos. As decisões de IA são reproduzidas pela seed.
- A sessão precisa exercitar, de fato: golpe do jogador, as três habilidades, dano recebido,
  regeneração, morte de criatura, loot concedido, respawn do assento e — pelo menos uma vez — uma
  recusa de comando por cooldown ou por recurso.
- Todo hash publicado é gerado do artefato real.
- `combat:check` entra em `check` e em `verify`, ao lado de `simulation:check` e `hunt:check`.

## Escopo permitido

```text
packages/test-fixtures/hunt/pb05/**
tools/replay/**
package.json
docs/simulation/REPLAY_CONTRACT.md
docs/playbooks/PB-05/STATE.md
```

## Fora de escopo

- alterar regra de kernel, contrato ou tradução de conteúdo — se a fixture revelar defeito, é
  condição de parada, não conserto de passagem;
- `apps/game` e `packages/assets`;
- screenshots e QA de browser — PB-05-11.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-08-fixture -b codex/pb-05-08-combat-fixture main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-08-fixture install --prefer-offline
```

- [ ] **2. Escrever o command log da sessão.**

Componha os comandos externos que produzem a sessão descrita nas decisões congeladas. Trabalhe pelo
comportamento pretendido, não por tentativa: cada comando deve ter um propósito declarado num
comentário do gerador ou na documentação da fixture.

- [ ] **3. Escrever o teste RED de cobertura da sessão.**

Antes de congelar qualquer golden, prove que o journal produzido contém, ao menos uma vez, cada um
destes eventos: `combat/attacked`, `combat/damaged` com `cause: 'attack'`, `combat/damaged` com
`cause: 'ability'`, `combat/healed`, `ability/cast` para as três habilidades, `combat/target-changed`,
`actor/died`, `loot/granted`, `actor/spawned` por respawn após morte, e `command/rejected` com um
código de combate.

Fixture que não exercita o que promete é fixture decorativa. Este teste é o que impede isso.

- [ ] **4. Gerar os artefatos golden pelo CLI.**

Gere cenário, snapshot e journal por `tools/replay`. Não escreva golden à mão — o hook bloqueia, e
com razão.

- [ ] **5. Provar repetição.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-08-fixture combat:check
git -C C:\Kaezan\kaezan-huntbound-pb05-08-fixture status --porcelain=v1 --untracked-files=all
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-08-fixture combat:check
```

Duas execuções limpas, exit `0` nas duas, árvore inalterada entre elas.

- [ ] **6. Provar retomada em todas as fronteiras.**

Varra `0..900`: para cada fronteira, tire o snapshot, restaure e siga; exija que os eventos drenados
antes, seguidos dos drenados depois, sejam o run inteiro, e que o snapshot final convirja. É a
varredura que pega vida, mana, alvo, cooldowns de habilidade e contadores de regeneração ausentes do
snapshot.

- [ ] **7. Provar sensibilidade.**

Prove que alterar seed, alterar um comando do log ou alterar `rulesVersion` é detectado como
divergência explícita, e não silenciosamente aceito.

- [ ] **8. Acrescentar o gate ao `package.json`.**

`combat:check` no molde de `hunt:check`, e incluído em `check` e em `verify`.

- [ ] **9. Registrar a fixture no contrato de replay.**

Acrescente a `docs/simulation/REPLAY_CONTRACT.md` a seção do PB-05 com os quatro hashes gerados dos
arquivos reais:

```powershell
Get-FileHash -Algorithm SHA256 C:\Kaezan\kaezan-huntbound-pb05-08-fixture\packages\test-fixtures\hunt\pb05\scenario.json,C:\Kaezan\kaezan-huntbound-pb05-08-fixture\packages\test-fixtures\hunt\pb05\commands.jsonl,C:\Kaezan\kaezan-huntbound-pb05-08-fixture\packages\test-fixtures\hunt\pb05\snapshot.golden.json,C:\Kaezan\kaezan-huntbound-pb05-08-fixture\packages\test-fixtures\hunt\pb05\events.golden.jsonl
```

Copie os hashes da saída real. Publicar hash não verificável é exatamente o defeito D2.

- [ ] **10. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-08-fixture exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-08-fixture exec vitest run --config tools/replay/vitest.config.ts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-08-fixture typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-08-fixture simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-08-fixture hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-08-fixture combat:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-08-fixture verify
```

Rode `verify` **duas vezes seguidas** com a árvore inalterada.

- [ ] **11. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-08-fixture add packages tools package.json docs
git -C C:\Kaezan\kaezan-huntbound-pb05-08-fixture commit -m "test: freeze the PB-05 combat session and gate it"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb-05-08-combat-fixture
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-08-fixture
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb-05-08-combat-fixture
```

## Verificação

`combat:check` verde duas vezes; varredura completa de fronteiras verde; sensibilidade provada;
`verify` verde duas vezes na worktree e uma vez no resultado integrado; `biome check .` em `0`.

## Critérios de aceite

- [ ] A sessão exercita todos os eventos listados no passo 3, provado por teste.
- [ ] Duas execuções limpas produzem snapshot e journal byte-idênticos.
- [ ] A retomada converge em **todas** as fronteiras `0..900`.
- [ ] Seed, comando e `rulesVersion` alterados produzem divergência explícita.
- [ ] O command log contém somente comandos externos.
- [ ] `combat:check` está em `check` e em `verify`.
- [ ] A fixture está registrada em `REPLAY_CONTRACT.md` **neste commit**, com os quatro hashes
      gerados dos arquivos reais.
- [ ] Nenhum golden foi escrito à mão.
- [ ] Os goldens de PB-03 e PB-04 continuam verdes e inalterados.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: a sessão não conseguir exercitar algum dos eventos exigidos sem alterar regra; alguma
fronteira de retomada divergir; a repetição não for byte-idêntica; ou se a fixture revelar defeito de
kernel, contrato ou tradução — nesse caso registre o defeito com o menor caso reprodutor possível e
devolva a decisão, em vez de consertar aqui.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, os quatro hashes reais, comandos e exit codes, modelo
e effort usados, e a próxima task elegível.

## Commit

`test: freeze the PB-05 combat session and gate it`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb-05-08-combat-fixture`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-08-fixture`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, cobertura de eventos da sessão, os quatro hashes com o comando que os gerou, resultado da
varredura de fronteiras, prova de sensibilidade, integração, limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol xhigh ou Grok 4.6 xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-08-fixture-e-gate-de-combate.md

Leia AGENTS.md, o STATE.md do playbook PB-05 e apenas os arquivos indicados pela task. Confirme que
PB-05-05, PB-05-06 e PB-05-07 estao done e integradas e que main esta verde.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-08-fixture com a branch
codex/pb-05-08-combat-fixture e rode "corepack pnpm install --prefer-offline" dentro dela.

Congele a sessao pb-05-hunt-combat, seed 2c3d4e5f60718293, 900 ticks. ANTES de congelar golden,
escreva o teste que prova que o journal contem ao menos uma vez: combat/attacked, combat/damaged com
cause attack, combat/damaged com cause ability, combat/healed, ability/cast das tres habilidades,
combat/target-changed, actor/died, loot/granted, respawn apos morte e um command/rejected de combate.

Gere os artefatos SOMENTE pelo CLI de replay; nao escreva golden a mao. Prove repeticao byte-identica
em duas execucoes limpas, prove retomada varrendo TODAS as fronteiras 0..900, e prove sensibilidade a
seed, comando e rulesVersion.

Acrescente combat:check ao package.json e inclua em check e em verify. REGISTRE a fixture em
docs/simulation/REPLAY_CONTRACT.md NESTE MESMO COMMIT, com os quatro hashes obtidos de Get-FileHash
sobre os arquivos reais. Hash nao verificavel e o defeito D2; fixture fora do contrato e o D3.

Se a fixture revelar defeito de kernel, contrato ou traducao, PARE, registre o menor caso reprodutor e
devolva a decisao — nao conserte aqui.

Rode biome check ., a suite de tools/replay, typecheck, simulation:check, hunt:check, combat:check e
verify duas vezes. Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe
worktree e branch removendo o diretorio antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
