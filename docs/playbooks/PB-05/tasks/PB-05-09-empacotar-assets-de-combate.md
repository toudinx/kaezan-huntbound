# PB-05-09 — Empacotar os assets de combate

**Status inicial:** pending

**Classe da tarefa:** implementação bem especificada de pipeline de assets

**Modelo sugerido:** GPT-5.6 Luna `xhigh` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** sim, com toda a trilha de kernel, após PB-05-01. Esta task toca
`packages/assets/**`, `tools/asset-packer/**` e `packages/test-fixtures/assets/**`.

## Objetivo

Levar ao pack da hunt as chaves visuais que o combate precisa — efeito de golpe, efeito de cada
spell, sangue e o corpo da criatura — respeitando os tetos, os profiles e a recusa de mídia pessoal
no `product`.

## Resultado esperado

O pack `pb-04-venore-rotworm-cave` passa a resolver as chaves de combate declaradas em
`docs/content/PB-05-SELECTION.md`, com o profile `test` usando mídia sintética e o `product`
recusando `cipsoft-personal`. Chave faltante falha em validação única, listando todas de uma vez.

## Dependências

- PB-05-01 `done` e integrada: a lista de efeitos, sangue e corpo já está congelada.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/STATE.md`;
3. `docs/content/PB-05-SELECTION.md`, a seção de assets necessários;
4. `docs/playbooks/PB-04/tasks/PB-04-07-empacotar-assets-da-hunt.md`, o precedente direto;
5. `packages/assets/src/manifest/**` e `packages/assets/src/providers/**`;
6. `packages/assets/catalog/selections/pb-04-venore-rotworm-cave.json`;
7. `tools/asset-packer/**`, em especial `hunt/generateArtifacts.ts` e `hunt/checkHuntPack.ts`;
8. `package.json`, os scripts `assets:*`.

## Decisões congeladas

- Assets são acessados **apenas por manifest key**; nenhum path literal fora do manifesto.
- `effectId` e `missileId` têm adapters próprios, já entregues por PB-02. Esta task usa, não redesenha.
- O profile `product` recusa `licenseClass: "cipsoft-personal"`; o profile `test` usa a fixture
  sintética 1×1 para todas as chaves.
- O profile `personal` **não é gerável neste workspace**: a origem pessoal não exporta os ids desta
  hunt. É condição conhecida, hoje pré-requisito de PB-07, e **não** bloqueia esta task.
- Tetos do pack permanecem: no máximo `512` entradas e `6 MB`.
- Mídia pessoal continua fora do Git.
- Corpo e sangue são decoração de apresentação; aqui só se garante que a chave resolve.

## Escopo permitido

```text
packages/assets/**
packages/test-fixtures/assets/pb04/**        (somente por CLI, para as chaves novas)
tools/asset-packer/**
package.json
docs/playbooks/PB-05/STATE.md
```

## Fora de escopo

- `packages/simulation`, `packages/content`, `apps/game`;
- desenhar, converter ou exportar mídia pessoal;
- animação, TTL de corpo e efeito visual — PB-05-10;
- destravar o profile `personal`, que é pré-requisito de PB-07.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-09-assets -b codex/pb-05-09-combat-assets main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-09-assets install --prefer-offline
```

- [ ] **2. Escrever testes RED da seleção estendida.**

Prove: a seleção passa a exigir as chaves de combate congeladas; uma chave ausente do manifesto de
origem produz **uma** validação listando todas as ausentes, não a primeira; uma chave declarada e não
usada é reportada; os tetos de entradas e bytes continuam verificados.

Atenção à armadilha W8 herdada do PB-04: o índice `0` da palette é marcador de vazio e precisa ser
filtrado antes de qualquer contagem. Um erro de contagem por causa disso já aconteceu neste
repositório.

- [ ] **3. Estender a seleção e gerar o pack pelo CLI; obter GREEN.**

Use `tools/asset-packer`; não edite pack nem fixture `expected/` à mão — o hook bloqueia.

- [ ] **4. Provar os profiles.**

Prove que o profile `test` resolve todas as chaves novas com a mídia sintética, e que o `product`
recusa `cipsoft-personal` tanto no empacotamento quanto em runtime.

- [ ] **5. Registrar o estado do profile `personal`.**

Rode a checagem do profile `personal` e **registre o resultado como condição conhecida**, sem tentar
destravá-la e sem gerar placeholder. Parar sem inventar mídia foi o comportamento correto no PB-04 e
continua sendo.

- [ ] **6. Medir o orçamento.**

Registre entradas e bytes do pack antes e depois, com os números reais, e confirme a folga contra os
tetos.

- [ ] **7. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-09-assets exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-09-assets --filter @huntbound/assets test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-09-assets typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-09-assets assets:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-09-assets architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-09-assets verify
```

Rode `assets:check` **duas vezes seguidas** com a árvore inalterada: o PB-02 já reprovou uma vez por
falta de idempotência nesse gate.

- [ ] **8. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-09-assets add packages tools package.json
git -C C:\Kaezan\kaezan-huntbound-pb05-09-assets commit -m "feat: pack the combat effects, blood and corpse keys"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb-05-09-combat-assets
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-09-assets
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb-05-09-combat-assets
```

Em modo paralelo: remova a worktree limpa após o commit, preserve a branch e deixe a integração para
o responsável designado.

## Verificação

Testes de `@huntbound/assets`, `assets:check` duas vezes, `architecture:check` e `verify` verdes;
`biome check .` em `0`.

## Critérios de aceite

- [ ] Todas as chaves de combate congeladas na seleção resolvem no profile `test`.
- [ ] Chave faltante falha em validação única, listando todas as ausentes.
- [ ] O profile `product` recusa `cipsoft-personal` no empacotamento e em runtime.
- [ ] O estado do profile `personal` está registrado como condição conhecida, sem placeholder.
- [ ] Os tetos de `512` entradas e `6 MB` são respeitados, com números reais registrados.
- [ ] O índice `0` da palette foi filtrado em toda contagem.
- [ ] Nenhum pack ou fixture `expected/` foi editado à mão.
- [ ] Nenhuma mídia pessoal foi versionada.
- [ ] `assets:check` é idempotente em duas execuções.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: alguma chave congelada não existir no manifesto de origem do profile `test`; o pack
estourar algum teto; `assets:check` não for idempotente; ou se destravar alguma chave exigir gerar
mídia — gerar placeholder não é solução, é mascaramento.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, entradas e bytes medidos, estado do profile
`personal`, comandos e exit codes, modelo e effort usados, e a próxima task elegível.

## Commit

`feat: pack the combat effects, blood and corpse keys`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb-05-09-combat-assets`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-09-assets`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, chaves acrescentadas, orçamento medido antes e depois, estado dos três profiles, comandos
com exit code, integração, limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-09-empacotar-assets-de-combate.md

Leia AGENTS.md, o STATE.md do playbook PB-05, docs/content/PB-05-SELECTION.md e apenas os arquivos
indicados pela task. Confirme que PB-05-01 esta done e integrada.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-09-assets com a branch
codex/pb-05-09-combat-assets e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Estenda a selecao do pack da hunt com as chaves de combate congeladas — efeito de
golpe, efeito de cada spell, sangue e corpo — e gere o pack SOMENTE por CLI. Nao edite pack nem
fixture expected a mao: o hook bloqueia.

Chave faltante tem que falhar em validacao unica listando TODAS as ausentes. Filtre o indice 0 da
palette antes de qualquer contagem: ele e marcador de vazio e ja causou erro de contagem aqui.

O profile personal NAO e geravel neste workspace: registre o resultado como condicao conhecida e nao
gere placeholder. O profile test usa midia sintetica 1x1; o product recusa cipsoft-personal.

Rode biome check ., os testes de assets, typecheck, assets:check DUAS vezes com a arvore inalterada,
architecture:check e verify. Atualize o handoff, commite, integre por fast-forward na main,
reverifique e limpe worktree e branch removendo o diretorio antes do prune.

Nao toque em packages/simulation, packages/content nem apps/game. Animacao e TTL de corpo sao
PB-05-10. Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
