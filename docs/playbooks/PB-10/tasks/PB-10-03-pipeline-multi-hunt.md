# PB-10-03 — O pipeline deixa de ser de uma hunt só

**Status inicial:** pending

**Classe da tarefa:** **implementação bem especificada** — refactor de tools e scripts, **sem uma
linha de conteúdo novo**. Nenhum contrato muda, nenhum golden é regenerado, nenhum byte de artefato
gerado muda.

**Modelo sugerido:** camada econômica com effort `xhigh`. Pela `docs/08_POLITICA_MODELOS_AGENTES.md`,
implementação bem especificada não pede frontier. O escopo é fechado e o critério de aceite é
mecânico: os artefatos regenerados têm de sair **byte a byte idênticos**.

**Validador sugerido:** modelo diferente do implementador. A revisão aqui é barata — ela olha o
`git diff` dos `.sha256` e ele tem de estar vazio.

**Rota:** **sem skill externa.** Skills operacionais do repositório: `playbook-task`, `run-gates`,
`worktree-cycle`, `hunt-content-pipeline`.

**Paralelismo:** **serial.** A PB-10-04 escreve um artefato novo dentro de
`packages/content/src/generated/hunts/` e depende do `sidecar-check` que esta task generaliza. Rodar
as duas juntas produz conflito no mesmo diretório e no mesmo bloco de `package.json`.

**Spec:** `docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`.

## Objetivo

Fazer com que **nenhuma ferramenta e nenhum script do pipeline de hunt cite `venore-rotworm-cave` ou
`pb04` por nome**. Depois desta task, acrescentar uma hunt é acrescentar uma *selection* e uma
*linha de registro* — não é editar seis scripts em `package.json` e um path constante dentro de um
tool.

A rotworm continua sendo a única hunt do jogo quando a task fecha. Isso é proposital: é o que torna
o critério de aceite verificável.

## Por que esta task existe

O playbook mexe em conteúdo de hunt cinco vezes. Hoje cada hunt nova exige tocar em pelo menos sete
lugares que só sabem falar de uma. Medido no workspace em 2026-08-26:

| Onde | O que está preso |
|---|---|
| `tools/asset-packer/hunt/generateArtifacts.ts:16` | `regionPath` é uma constante de módulo apontando `packages/content/src/generated/hunts/venore-rotworm-cave/region.json` |
| `package.json:20` | `assets:pb04:artifacts:check` |
| `package.json:21` | `assets:pb04:pack:check` |
| `package.json:22` | `assets:pb04:profile:check` |
| `package.json:23` | `assets:pb04:hunt:check` — `--region .../venore-rotworm-cave/region.json` literal |
| `package.json:24-25` | `assets:pb04:stage:test` e `:stage:product` |
| `package.json:26-27` | `assets:pb04:personal:generate` e `:personal:check` |
| `package.json:55` | `hunt:selection:check` — `--selection .../venore-rotworm-cave.json` literal |
| `package.json:60` | `hunt:extract:sidecar` — `--output .../hunts/venore-rotworm-cave` literal |

`assets:check` (`package.json:33`) e `content:check` (`package.json:54`) encadeiam esses nomes, então
o custo se propaga para os gates.

## O que já é genérico e **não** se reescreve

Isto foi verificado no workspace e é metade da máquina. Reescrever é regressão, não melhoria:

| Peça | Por que já serve |
|---|---|
| `hunt:extract` e `hunt:extract:check` (`package.json:58-59`) | já rodam `build-all --selections packages/content/src/selections/hunts` sobre o **diretório inteiro** |
| `hunt:sources:check` (`package.json:57`) | idem, `sources --selections <dir>` |
| `createHuntAssetSelection` (`tools/asset-packer/hunt/huntSelection.ts`) | a seleção de asset é **derivada da região**, nunca escrita à mão |
| `checkHuntPack.ts` | já recebe `--selection`, `--region` e `--pack` por argumento; o literal está em quem o chama |

Se um tool já aceita o caminho por argumento, o conserto é no `package.json`, não no tool.

## A decisão que esta task congela

**Um registro declarativo de hunts, keyed por `huntId`, e todo script itera sobre ele.**

Uma hunt passa a ser uma entrada com o que o pipeline precisa saber: a selection versionada, a raiz
de fixture de asset, o id do pack. Acrescentar hunt vira acrescentar entrada. O formato exato — TS
exportado de `tools/asset-packer/hunt/`, ou JSON ao lado das selections — é escolha do implementador:
**escolha a mais simples e mais fácil de reverter, registre a escolha em uma linha no commit e siga**
(`AGENTS.md`, "Ambiguidade não é motivo para parar").

Duas consequências que **não** são negociáveis:

1. **Os diretórios de fixture mantêm o nome `pb04`.** `packages/test-fixtures/assets/pb04/**` nomeia
   o *playbook que os criou*, não a hunt. Renomeá-los move `expected/**` e obriga a mexer em
   fixture congelada — custo alto, ganho zero. O que deixa de citar `pb04` são os **scripts**, não os
   diretórios.
2. **`sidecar-check` passa a cobrir todas as hunts geradas**, iterando os subdiretórios de
   `packages/content/src/generated/hunts/`, em ordem determinística. Hoje ele checa uma e a segunda
   hunt entraria sem sidecar conferido — o defeito não apareceria até alguém editar o artefato à mão.

## O critério de aceite, e por que ele é forte

Esta task é um refactor puro, então **o diff de artefato gerado tem de ser vazio**. Concretamente,
depois de rodar a regeneração completa:

```
git status --porcelain packages/content/src/generated packages/test-fixtures/assets
```

não pode listar **nada**. Todo `.sha256` continua com o mesmo valor. Se um byte mudou, ou o refactor
mudou comportamento, ou o artefato estava fora de data antes — descubra qual, por escrito, antes de
seguir.

Isto é mais forte que "os testes passam": um refactor de path que troque a ordem de iteração, o
`JSON.stringify` ou o separador de path do Windows passa em teste e muda o byte.

## Fora de escopo, explicitamente

- **`apps/game/src/main.ts`.** O import estático da rotworm (`main.ts:9`) e `runtime.characters[0]`
  (`main.ts:310`) são a **PB-10-05**. Esta task não toca em `apps/game`.
- **Contrato.** `HuntDefinition` não ganha campo aqui. O índice e o contrato novo são a **PB-10-04**.
- **Conteúdo.** Nenhuma hunt, criatura, selection ou layout novo. São as tasks 07 em diante.
- **Golden.** Nada em `packages/test-fixtures/hunt/**` é regenerado. Se você achou que precisa,
  parou de fazer refactor.

## Armadilhas conhecidas

1. **`EPERM: operation not permitted, rename` no `assets:stage:test`.** Um `vite` de pé segura
   `apps/game/public/assets` e a falha é **determinística**; antivírus segurando o diretório
   recém-criado dá a mesma mensagem e passa na segunda tentativa. Rode de novo antes de teorizar; se
   falhar duas vezes seguidas, procure o listener em 5173/4173 e derrube. `AGENTS.md`, armadilha 5.
2. **Path do Windows dentro de artefato.** `%CD%` aparece em `assets:pb04:pack:check`
   (`package.json:21`). Ao generalizar, não deixe separador de path vazar para dentro de um JSON
   gerado: é exatamente o jeito de quebrar a igualdade byte a byte sem quebrar um teste.
3. **Ordem de iteração.** `readdir` não garante ordem entre plataformas. Ordene por `huntId` antes de
   emitir qualquer coisa que vire artefato ou saída de `--check`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-10/README.md` e o `STATE.md`;
3. a spec congelada, seções "O que já é multi-hunt, e não deve ser reescrito" e "O que está preso em
   uma hunt só";
4. `package.json`, blocos `assets:*`, `content:*` e `hunt:*`;
5. `tools/asset-packer/hunt/generateArtifacts.ts` e `huntSelection.ts`;
6. `tools/map-extractor/cli.ts`, comando `sidecar-check`;
7. `packages/content/src/selections/hunts/venore-rotworm-cave.json` — a forma de uma selection;
8. `.cursor/rules/20-content.mdc` e `.cursor/rules/30-assets.mdc`.

## Passos

1. Rode a regeneração completa **antes de editar** e confirme que a árvore fica limpa. É a sua linha
   de base; sem ela você não sabe se um byte que mudou é seu.
2. Escreva o registro de hunts com a rotworm como única entrada.
3. Faça `generateArtifacts.ts` receber a hunt em vez de constante de módulo.
4. Generalize `sidecar-check` para iterar os subdiretórios gerados, em ordem determinística.
5. Reescreva os scripts de `package.json` para derivar do registro; mantenha os nomes de fixture.
6. Regenere tudo e prove que **nada** mudou.
7. Atualize a linha PB-10-03 do `STATE.md`.

## Verificações exigidas

Com saída fresca colada no relatório:

- `corepack pnpm verify` — verde;
- `git status --porcelain packages/content/src/generated packages/test-fixtures/assets` — **vazio**
  depois da regeneração;
- `corepack pnpm content:check` e `corepack pnpm assets:check` isolados, porque são os dois que esta
  task reescreve;
- `corepack pnpm hunt:check` — o golden de hunt continua verde sem ser regenerado.

## Risco conhecido

**Refactor que "passa" porque o `--check` deixou de checar.** O modo de falhar aqui é generalizar um
gate e, no caminho, fazê-lo iterar uma lista vazia ou pular o arquivo — verde por não ter olhado.
Antes de fechar, quebre um artefato de propósito (mude um byte, rode o `--check`, veja **vermelho**,
desfaça). Um gate que não sabe reprovar não é gate.

## Definition of Done

- [ ] Nenhum script de `package.json` cita `venore-rotworm-cave` ou uma hunt por nome.
- [ ] `generateArtifacts.ts` não tem path de hunt como constante de módulo.
- [ ] `sidecar-check` cobre todas as hunts geradas, em ordem determinística.
- [ ] Registro de hunts existe, com a rotworm como única entrada, e a escolha de formato está
      justificada em uma linha no commit.
- [ ] Regeneração completa deixa `packages/content/src/generated` e `packages/test-fixtures/assets`
      sem diff.
- [ ] Prova de que o `--check` sabe reprovar, colada no relatório.
- [ ] `verify` verde e branch integrada por `git merge --ff-only`.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com um modelo economico em effort xhigh.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-10\tasks\PB-10-03-pipeline-multi-hunt.md

Leia AGENTS.md, .cursor/rules/20-content.mdc, .cursor/rules/30-assets.mdc,
docs/playbooks/PB-10/README.md, o STATE.md e a spec
docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb10-03-pipeline com a branch
<agente>/pb10-03-pipeline-multi-hunt e rode "corepack pnpm install --prefer-offline" dentro dela.

OBJETIVO: nenhuma ferramenta e nenhum script do pipeline de hunt pode citar venore-rotworm-cave ou
pb04 por nome. Acrescentar uma hunt tem que virar acrescentar uma selection e uma linha de registro.

ESTA TASK NAO ACRESCENTA CONTEUDO. A rotworm continua sendo a unica hunt quando ela fecha. Nenhum
contrato muda, nenhum golden e regenerado, NENHUM BYTE DE ARTEFATO GERADO MUDA.

O que esta preso, medido no workspace: tools/asset-packer/hunt/generateArtifacts.ts:16 tem regionPath
como constante de modulo apontando a rotworm; package.json linhas 20 a 27 sao a familia assets:pb04:*
inteira; package.json:23 tem --region .../venore-rotworm-cave/region.json literal; package.json:55
hunt:selection:check aponta uma selection so; package.json:60 hunt:extract:sidecar aponta um output so.

O QUE JA E GENERICO E NAO SE REESCREVE: hunt:extract, hunt:extract:check e hunt:sources:check ja
rodam sobre o DIRETORIO INTEIRO de selections; createHuntAssetSelection em
tools/asset-packer/hunt/huntSelection.ts ja DERIVA a selecao de asset da regiao; checkHuntPack.ts ja
recebe tudo por argumento. Se um tool ja aceita o caminho por argumento, o conserto e no package.json.

DECISAO CONGELADA: um registro declarativo de hunts keyed por huntId, e todo script itera sobre ele.
O formato exato (TS exportado ou JSON) e sua escolha: pegue a mais simples e mais facil de reverter e
registre a escolha em uma linha no commit.

DUAS CONSEQUENCIAS NAO NEGOCIAVEIS:
1. Os diretorios packages/test-fixtures/assets/pb04/** MANTEM o nome pb04 — eles nomeiam o playbook
   que os criou, nao a hunt. Renomear move expected/** e mexe em fixture congelada. O que deixa de
   citar pb04 sao os SCRIPTS, nao os diretorios.
2. sidecar-check passa a cobrir TODAS as hunts geradas, iterando os subdiretorios de
   packages/content/src/generated/hunts/ em ordem determinística.

CRITERIO DE ACEITE: depois da regeneracao completa,
git status --porcelain packages/content/src/generated packages/test-fixtures/assets
TEM QUE VIR VAZIO. Todo .sha256 com o mesmo valor. Isso e mais forte que "os testes passam": um
refactor que troque ordem de iteracao, JSON.stringify ou separador de path do Windows passa em teste
e muda o byte. Rode a regeneracao ANTES DE EDITAR para ter a linha de base.

FORA DE ESCOPO: apps/game (o import estatico em main.ts:9 e runtime.characters[0] em main.ts:310 sao
a PB-10-05); contrato novo e o indice (PB-10-04); conteudo novo (07+); qualquer golden em
packages/test-fixtures/hunt/**.

ARMADILHAS: %CD% aparece em package.json:21 — nao deixe separador de path do Windows vazar para
dentro de JSON gerado. readdir nao garante ordem entre plataformas: ordene por huntId antes de emitir
qualquer coisa. EPERM ... rename no assets:stage:test e vite de pe (deterministico) ou antivirus
(passa na segunda); rode de novo antes de teorizar.

RISCO CENTRAL: generalizar um gate e no caminho faze-lo iterar lista vazia — verde por nao ter
olhado. ANTES DE FECHAR, quebre um artefato de proposito, rode o --check, veja VERMELHO, desfaca, e
cole isso no relatorio. Um gate que nao sabe reprovar nao e gate.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm verify
- git status --porcelain packages/content/src/generated packages/test-fixtures/assets (vazio)
- corepack pnpm content:check e corepack pnpm assets:check isolados
- corepack pnpm hunt:check verde sem regenerar golden
- a prova de que o --check sabe reprovar

Ao terminar: atualize somente a linha PB-10-03 do STATE.md com o modelo e o effort EFETIVAMENTE
usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com git merge
--ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no relatorio:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
