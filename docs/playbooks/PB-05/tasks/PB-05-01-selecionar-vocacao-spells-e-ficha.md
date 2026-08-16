# PB-05-01 — Selecionar e congelar vocação, spells e ficha

**Status inicial:** pending

**Classe da tarefa:** especificação e seleção de conteúdo — decide números que todas as tasks
seguintes tratam como congelados

**Modelo sugerido:** Claude Opus 5, GPT-5.6 Sol `xhigh` ou Grok 4.6 `xhigh`. **Luna está excluída:**
a task decide parâmetros congelados, não implementa especificação pronta.

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:verification-before-completion`. Skills operacionais: `playbook-task`,
`worktree-cycle`, `run-gates`, `hunt-content-pipeline`.

**Paralelismo:** não. É a raiz do playbook.

## Objetivo

Congelar, com evidência do snapshot local, exatamente **quais** IDs de vocação, spell, arma e efeito
o PB-05 usa, e **quais números inteiros** derivam deles. Nenhuma task posterior pode redescobrir ou
renegociar esses valores.

Três conversões precisam sair medidas daqui, não estimadas:

1. `speed` de criatura → `stepCooldownTicks`;
2. `intervalMs` de ataque e `attackSpeedMs` de vocação → `attackCooldownTicks`;
3. fórmula `skillAttack` e fórmula de cura → `minPower`/`maxPower` inteiros para a ficha escolhida.

## Resultado esperado

`docs/content/PB-05-SELECTION.md` congelado, mais um documento de seleção legível por máquina em
`packages/content/src/selections/pb-05-knight-combat.json`, mais um verificador de linha de comando
que confirma no snapshot local que todo ID selecionado existe. O verificador sai `0` sobre o snapshot
real, e a saída vai para o relatório.

## Dependências

- PB-04 fechado por auditoria aprovada (B3 em `STATE.md`).
- Branch de instruções integrada em `main` (B4 em `STATE.md`).
- Snapshot Canary acessível via `HUNTBOUND_CANARY_SOURCE`. A worktree irmã **não** copia
  `references/` (gitignorado). Se a variável estiver vazia, aponte-a para o snapshot do clone
  principal ou para uma das cópias listadas em `AGENTS.md`. Não grave o path no repositório. O
  verificador de IDs usa `--source-root-env` e fica **fora** de `check`/`verify`, no mesmo padrão
  de `hunt:selection:check`. Sem a variável ele não roda — é limitação de ambiente, não bloqueio
  de playbook.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/STATE.md`;
3. `docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`, seções "Direção escolhida",
   "Parâmetros congelados" e "Contratos v4";
4. `docs/content/PB-04-SELECTION.md`, como molde de documento de seleção congelada;
5. `packages/content/src/selections/pb-01-contract-coverage.json`, a slice curada atual;
6. `packages/content/src/generated/pb-01-contract-coverage.json`, valores já importados de Knight,
   Berserk e Rotworm;
7. `packages/content/src/importers/canary/lua/parseSpellLua.ts` e
   `docs/content/CANARY_LUA_MAPPING.md`, seção de spells;
8. `tools/hunt-selection/cli.ts`, o verificador de seleção do PB-04, como molde.

## Decisões congeladas

- Vocação: `vocation:tibia:knight`. Não há segunda vocação no PB-05.
- Spells: `spell:tibia:berserk` (`exori`), `exori ico` e `exura ico`. Nenhuma quarta spell.
- A ficha do personagem é **conteúdo congelado**, não estado persistido, e nasce no maior level entre
  as três spells selecionadas.
- Mitigação é zero: sem armadura, sem resistência, sem bloqueio.
- `TICK_DURATION_MS = 50`. Toda conversão de tempo divide por ele; resto não nulo é erro, e não
  arredondamento silencioso.
- A hunt continua sendo `hunt:tibia:venore-rotworm-cave` e a região **não** é reextraída.

## Escopo permitido

```text
docs/content/PB-05-SELECTION.md
packages/content/src/selections/pb-05-knight-combat.json
tools/hunt-selection/**
package.json
docs/playbooks/PB-05/STATE.md
```

## Fora de escopo

- importar qualquer coisa para o catálogo — é PB-05-02;
- alterar contrato, schema ou kernel;
- alterar a slice `pb-01-contract-coverage` existente;
- reextrair região, spawns ou transições;
- escolher assets de combate além de registrar quais efeitos precisam existir.

## Instruções de execução

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-01-selection -b claude/pb-05-01-vocation-spell-selection main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-01-selection install --prefer-offline
```

A forma irmã é deliberada: worktree aninhada em `.worktrees` derruba `format:check` pelo defeito de
`biome.json` aninhado (W17).

Confirme `HUNTBOUND_CANARY_SOURCE` **depois** do `install`, nesta sessão da worktree. Se estiver
vazio, defina-o apontando para o snapshot local (não commite o valor). Sem isso o passo 8 não
consegue provar existência de ID.

- [ ] **2. Localizar as duas spells novas no snapshot e registrar os arquivos-fonte.**

Encontre os Lua de `exori ico` e `exura ico` sob `data/scripts/spells/` no snapshot apontado por
`HUNTBOUND_CANARY_SOURCE`. Registre path relativo, `spell:id`, `words`, `level`, `mana`, `cooldown`,
`groupCooldown`, vocações permitidas e a forma exata de `onGetFormulaValues`.

Se o snapshot apontado não tiver o arquivo, consulte as cópias locais completas listadas em
`AGENTS.md` antes de concluir que não existe.

- [ ] **3. Medir a conversão de `speed` para `stepCooldownTicks`.**

Derive a regra do próprio snapshot — velocidade de criatura, velocidade base de ground e a fórmula
que o servidor usa — e registre a expressão exata, os valores de entrada e o resultado para Rotworm
(`speed 58`) e para a vocação Knight (`baseSpeed 110`).

**Compare com o que está em uso hoje:** `player` `10` ticks e `rotworm` `20`, valores que PB-04-FIX-01
ajustou por sensação e que a auditoria aprovou como jogáveis. Se a derivação fiel produzir um ritmo
muito diferente, **não escolha sozinho**: registre as duas opções, o impacto em jogabilidade e a
recomendação, e trate a divergência como decisão a confirmar no relatório final. Retunar em silêncio
é o defeito, em qualquer das direções.

- [ ] **4. Medir a conversão de intervalo de ataque.**

`intervalMs / 50` para o ataque melee do Rotworm (`2000 ms`) e para `attackSpeedMs` do Knight
(`2000 ms`). Prove a divisibilidade exata; resto não nulo é condição de parada.

- [ ] **5. Escolher a ficha e resolver as fórmulas em inteiros.**

Defina level, skills, arma e vida/mana máximas. Para cada uma das três spells, calcule `minPower` e
`maxPower` inteiros com a fórmula do snapshot e a ficha escolhida, mostrando a conta. Faça o mesmo
para o golpe físico do Knight com a arma escolhida.

Registre explicitamente o risco já declarado na spec: a ficha nasce em level `35` por causa de
Berserk, e isso trivializa uma hunt de level 8. Se preferir a alternativa — baixar o level e remover
Berserk —, ela precisa ser decidida **aqui** e congelada, não descoberta em PB-05-07.

- [ ] **6. Listar os assets de combate necessários.**

Efeitos de golpe, de cada spell, sangue e o item de corpo do Rotworm. Para cada um, registre o ID no
snapshot e confirme que ele existe. A seleção do pack é PB-05-09; esta task só congela **o que**
precisa existir.

- [ ] **7. Escrever o documento de seleção e o JSON legível por máquina.**

`docs/content/PB-05-SELECTION.md` no molde de `PB-04-SELECTION.md`: IDs, arquivos-fonte com hash,
conversões medidas com a conta, ficha, fórmulas resolvidas, assets necessários e as decisões abertas
que foram fechadas.

- [ ] **8. Escrever o verificador e rodá-lo contra o snapshot.**

Estenda `tools/hunt-selection` ou crie o comando equivalente para validar que todo ID da seleção
existe no snapshot local, com diagnóstico único listando **todos** os ausentes de uma vez. Acrescente
o script ao `package.json`.

- [ ] **9. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-01-selection exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-01-selection typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-01-selection test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-01-selection content:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-01-selection verify
git -C C:\Kaezan\kaezan-huntbound-pb05-01-selection diff --check
```

- [ ] **10. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-01-selection add docs packages tools package.json
git -C C:\Kaezan\kaezan-huntbound-pb05-01-selection commit -m "docs: freeze the PB-05 vocation, spell and character selection"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only claude/pb-05-01-vocation-spell-selection
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-01-selection
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d claude/pb-05-01-vocation-spell-selection
```

## Verificação

O verificador de seleção sai `0` sobre o snapshot real, e a saída completa vai para o relatório.
`biome check .`, `typecheck`, `test`, `content:check` e `verify` verdes na worktree e no resultado
integrado.

## Critérios de aceite

- [ ] Todo ID de vocação, spell, item e efeito da seleção existe no snapshot, provado por CLI.
- [ ] As três conversões estão medidas, com a conta mostrada, e não estimadas.
- [ ] A divisibilidade de `intervalMs` por `50` está provada para todos os intervalos usados.
- [ ] A ficha está congelada, com level, skills, arma, vida e mana máximas.
- [ ] `minPower`/`maxPower` inteiros estão calculados para as três spells e para o golpe físico.
- [ ] A decisão sobre o ritmo de passo — derivação fiel contra os valores jogáveis atuais — está
      explícita e resolvida, não adiada.
- [ ] Todo hash citado no documento foi gerado do arquivo real.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: uma das duas spells novas não existir no snapshot; algum `intervalMs` não dividir
exatamente por `50`; a fórmula de cura tiver forma que o schema atual não consegue representar sem
decisão de contrato — nesse caso registre a forma exata e deixe a decisão para PB-05-02 e PB-05-03;
ou se a derivação de `speed` produzir ritmo que você não consiga justificar contra os valores
jogáveis atuais sem escolher por conta própria.

## Persistência do handoff

Atualize `docs/playbooks/PB-05/STATE.md`: status, branch, commit, evidência, comandos com exit code,
modelo e effort realmente usados, decisões fechadas e onde foram documentadas, e a próxima task
elegível.

## Commit

`docs: freeze the PB-05 vocation, spell and character selection`

## Ciclo de conclusão

Branch-base `main`; branch temporária `claude/pb-05-01-vocation-spell-selection`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-01-selection`; integração serial por `git merge --ff-only`;
verificação pós-integração por `corepack pnpm verify`; limpeza removendo o diretório antes de
`git worktree prune` e `git branch -d`.

## Relatório final

Resumo de mudanças, verificações com comando e exit code, as três conversões medidas, a ficha
escolhida com justificativa, a decisão sobre ritmo de passo, integração, limpeza, desvios e a próxima
task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Claude Opus 5, GPT-5.6 Sol xhigh ou Grok 4.6 xhigh.
Nao use Luna nesta task: ela decide parametros congelados.
Use obrigatoriamente superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-01-selecionar-vocacao-spells-e-ficha.md

Leia AGENTS.md, o STATE.md do playbook PB-05 e apenas os arquivos indicados pela task. Antes de
comecar, confirme no STATE.md que os bloqueios B3 (PB-04 fechado) e B4 (branch de instrucoes
integrada em main) estao resolvidos. Se algum continuar aberto, PARE e reporte.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-01-selection com a branch
claude/pb-05-01-vocation-spell-selection e rode "corepack pnpm install --prefer-offline" dentro dela
antes de qualquer gate. Nao use worktree aninhada: ela derruba format:check.

Worktree irma nao traz references/ (gitignorado). Se HUNTBOUND_CANARY_SOURCE estiver vazio, aponte-o
para o snapshot local — o do clone principal ou uma copia listada em AGENTS.md. Nao grave o path no
repositorio. O verificador de IDs fica fora de check/verify.

Congele a selecao de vocacao, das tres spells, da ficha e dos assets necessarios. MEÇA as conversoes
de speed para stepCooldownTicks, de intervalMs para attackCooldownTicks e das formulas para minPower
e maxPower inteiros, mostrando a conta. Nao estime. Prove que todo intervalo divide exatamente por
50; resto nao nulo e condicao de parada.

Compare o ritmo derivado com os valores jogaveis atuais (player 10 ticks, rotworm 20). Se divergirem
muito, registre as duas opcoes com impacto e recomendacao e resolva a decisao no relatorio; nao
retune em silencio.

Escreva docs/content/PB-05-SELECTION.md e o JSON de selecao, escreva o verificador de CLI e rode-o
contra o snapshot real ate sair 0. Todo hash publicado tem que vir do arquivo real.

Rode biome check ., typecheck, test, content:check e verify. Atualize o STATE.md, commite, integre
por fast-forward na main, reverifique e limpe worktree e branch removendo o diretorio antes do prune.

Nao importe nada para o catalogo, nao toque em contratos nem no kernel, e nao reextraia a regiao.
Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
