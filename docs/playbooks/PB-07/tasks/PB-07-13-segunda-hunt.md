# PB-07-13 — Segunda hunt, terreno largo

**Status inicial:** pending

**Classe da tarefa:** conteúdo, extração e prova de pipeline

**Modelo sugerido:** GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6, `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`, `hunt-content-pipeline`.

**Paralelismo:** independente da trilha de combate; depende de PB-07-12 para que a borda da região
nova já nasça tratada.

## Objetivo

Provar que a pipeline de extração serve para **N hunts**, e não só para a que a construiu. E dar ao
jogo um terreno largo, onde lurar e mobar façam sentido — o que a caverna estreita de rotworm não
permite.

## Resultado esperado

Duas hunts extraídas pelo mesmo tool, ambas jogáveis, e nenhum lugar do código onde
`venore-rotworm-cave` esteja escrito como se fosse a única.

## Dependências

- PB-07-12 integrada: a borda já é tratada, então a região nova não vai expor buraco novo.
- PB-07-10 integrada: criaturas com kit tornam uma hunt de nível mais alto interessante.
- PB-07-01: a rotação solo em hunt descreve o que um terreno largo precisa permitir.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md` e `STATE.md`;
3. `.cursor/skills/hunt-content-pipeline/SKILL.md` — **o procedimento completo já existe**; esta task
   o executa, não o reinventa;
4. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`, "Contrato para escolher a primeira hunt" — os
   mesmos critérios valem para a segunda;
5. `.cursor/rules/20-content.mdc` e `.cursor/rules/30-assets.mdc`;
6. `packages/content/src/selections/hunts/venore-rotworm-cave.json` — o formato a espelhar,
   incluindo `region`, `budget` e `expectedSpawn*`;
7. `packages/content/src/layouts/hunts/venore-rotworm-cave.json`;
8. `tools/map-extractor/**`, em especial `cli.ts`, `region.ts`, `spawns.ts` e `topology.ts`;
9. `AGENTS.md`, "Fontes externas" — o snapshot **não tem o mapa global**; ele está em
   `C:\Kaezan\kaezan\canary-3.4.1\`, `C:\Kaezan\kaezan - world\canary-3.4.1\` ou
   `C:\Users\toudi\Downloads\otservbr.otbm`.

## Decisões congeladas

- **TibiaRoute é fonte de descoberta e seleção, nunca de runtime nem de stats.** Registre a URL e a
  metadata da escolha; os IDs, regras e mapa vêm do snapshot.
- **A hunt nova é aberta e mobável.** É o motivo da task. Uma segunda caverna estreita não prova
  nada que a primeira já não provou.
- **Extraia com margem.** A janela inclui chão além da área jogável, para que a borda não termine no
  limite exato do caminhável. O budget permite 96×96.
- **A primeira hunt não muda.** `venore-rotworm-cave` continua byte-idêntica: seus artefatos gerados
  e seus sidecars não podem mudar. Se mudarem, o extrator regrediu.
- **Nada de path literal.** Se algum lugar do código ou dos scripts assumir a hunt de rotworm por
  nome, essa é a dívida que a task existe para pagar. `hunt:extract:sidecar` hoje aponta um diretório
  fixo — generalize.
- **Asset pessoal não entra no Git.** Os tiles novos entram por manifesto e profile.
- **Uma hunt, não um catálogo.** Escolha uma; seleção de hunt como tela de menu é bullet, não escopo.

## Escopo permitido

```text
packages/content/src/selections/hunts/<nova-hunt>.json
packages/content/src/layouts/hunts/<nova-hunt>.json
packages/content/src/generated/hunts/<nova-hunt>/**   (gerado por CLI)
packages/content/catalog/**                            (operação versionada, pelo CLI)
packages/assets/catalog/selections/**
package.json                                           (generalizar scripts de hunt)
tools/map-extractor/**                                 (só se a segunda hunt revelar defeito)
tests/e2e/**
docs/playbooks/PB-07/STATE.md
```

## Fora de escopo

- terceira hunt;
- tela de seleção de hunt;
- viagem entre hunts;
- boss novo — PB-07-10 já entregou um.

## Execução

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb07-13-hunt2 -b codex/pb07-13-second-hunt main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-13-hunt2 install --prefer-offline
```

- [ ] **2. Escolher a hunt e registrar a escolha.**

Critérios: aberta e larga o bastante para lurar; nível compatível com o personagem do V0; criaturas
que já estejam no catálogo ou que sejam importáveis sem abrir frente nova; e presente no mapa que
você consegue abrir. Registre a URL do TibiaRoute, a região em coordenadas e o porquê.

- [ ] **3. Conferir a fonte do mapa antes de escrever a seleção.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-13-hunt2 hunt:sources:check
```

O snapshot **não tem o mapa global**. Antes de concluir que um arquivo não existe, procure nos três
caminhos listados em `AGENTS.md`. Nada precisa ser baixado.

- [ ] **4. Escrever seleção e layout**, espelhando os da primeira hunt, com `expectedSpawnGroups`,
      `expectedSpawnSlots` e `expectedDroppedTransitions` preenchidos com o que você **espera** — é
      isso que transforma a extração em teste.

- [ ] **5. Extrair e validar.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-13-hunt2 hunt:extract
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-13-hunt2 hunt:extract:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-13-hunt2 content:check
```

Se um `expected*` não bater, **investigue antes de ajustar o número**. Divergência é informação sobre
a região ou sobre o extrator; ajustar o esperado para caber é reescrever golden para passar.

- [ ] **6. Generalizar os scripts.**

`hunt:extract:sidecar` aponta um diretório fixo. `hunt:selection:check` aponta uma seleção fixa. Faça
os dois cobrirem todas as hunts. Este é o passo que efetivamente prova que a pipeline serve para N —
sem ele, a segunda hunt é só mais um diretório.

- [ ] **7. Confirmar a primeira hunt intacta.**

`git status` não pode mostrar mudança em `packages/content/src/generated/hunts/venore-rotworm-cave/`.
Se mostrar, pare: o extrator regrediu, e isso é mais importante que a hunt nova.

- [ ] **8. Assets da região nova**, pelo fluxo de manifesto e profile. Nada de path literal.

- [ ] **9. Jogar a hunt nova.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-13-hunt2 dev
```

Lure um grupo, mobe, e mate com a AoE do Sorcerer. Se o terreno não permitir isso, a hunt escolhida
não cumpriu o objetivo da task — troque e registre.

- [ ] **10. Gates, integração e limpeza.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-13-hunt2 verify
git -C C:\Kaezan\kaezan-huntbound-pb07-13-hunt2 add packages tools tests docs package.json
git -C C:\Kaezan\kaezan-huntbound-pb07-13-hunt2 commit -m "feat: extract a second, open hunt through the same pipeline"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-13-second-hunt
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb07-13-hunt2
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-13-second-hunt
```

## Verificação

`verify` verde na worktree e no integrado. `hunt:extract:check`, `hunt:sources:check` e
`content:check` verdes **para as duas hunts**. Diff vazio nos artefatos da primeira. Screenshot da
hunt nova com um grupo de criaturas mobado.

## Critérios de aceite

- [ ] Existe uma segunda hunt, aberta e mobável, com seleção, layout e artefatos gerados.
- [ ] A URL do TibiaRoute e o motivo da escolha estão registrados.
- [ ] `expectedSpawnGroups`, `expectedSpawnSlots` e `expectedDroppedTransitions` foram preenchidos
      antes da extração e bateram — ou a divergência foi investigada e explicada.
- [ ] A região tem margem de chão além da área jogável.
- [ ] `venore-rotworm-cave` está byte-idêntica.
- [ ] `hunt:extract:sidecar` e `hunt:selection:check` cobrem todas as hunts, sem diretório fixo.
- [ ] Nenhum path literal de hunt sobrou no código.
- [ ] Nenhum asset pessoal entrou no Git.
- [ ] Foi possível lurar e mobar, provado por screenshot.
- [ ] `corepack pnpm verify` sai `0` depois da integração.

## Condições de parada

**Pare** se: o mapa da região escolhida não estiver em nenhuma das três origens conhecidas; a
extração mudar artefato da primeira hunt; ou se a hunt exigir mecânica de mapa que o extrator não
suporta — nesse caso troque de hunt em vez de estender o extrator.

## Persistência do handoff

`STATE.md`: status, branch, commit, hunt escolhida com URL e coordenadas, números de spawn esperados
e obtidos, modelo e effort, próxima task elegível.

## Commit

`feat: extract a second, open hunt through the same pipeline`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-13-second-hunt`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb07-13-hunt2`; integração por `--ff-only`; verificação pós-integração
por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Hunt escolhida e por quê, coordenadas, esperado versus obtido na extração, o que foi generalizado nos
scripts, confirmação de que a primeira hunt não mudou, screenshot do mob, desvios e próxima task.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion. Siga tambem a skill hunt-content-pipeline: o
procedimento ja existe e esta task o EXECUTA, nao o reinventa.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07\tasks\PB-07-13-segunda-hunt.md

Leia AGENTS.md (secao "Fontes externas"), .cursor/skills/hunt-content-pipeline/SKILL.md,
.cursor/rules/20-content.mdc, .cursor/rules/30-assets.mdc, docs/playbooks/PB-07/README.md, o STATE.md,
docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md secao "Contrato para escolher a primeira hunt", e apenas
os arquivos indicados pela task.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb07-13-hunt2 com a branch codex/pb07-13-second-hunt
e rode "corepack pnpm install --prefer-offline" dentro dela.

Escolha UMA hunt do TibiaRoute que seja ABERTA E LARGA o bastante para lurar e mobar — esse e o
objetivo da task; uma segunda caverna estreita nao prova nada. Registre URL, coordenadas e o motivo.
TibiaRoute e fonte de DESCOBERTA: IDs, regras e mapa vem do snapshot.

O snapshot NAO tem o mapa global. Antes de concluir que um arquivo nao existe, procure em
C:\Kaezan\kaezan\canary-3.4.1\, C:\Kaezan\kaezan - world\canary-3.4.1\ e
C:\Users\toudi\Downloads\otservbr.otbm. Nada precisa ser baixado. Rode hunt:sources:check.

Escreva selecao e layout espelhando venore-rotworm-cave, com expectedSpawnGroups, expectedSpawnSlots
e expectedDroppedTransitions PREENCHIDOS ANTES da extracao — e isso que transforma a extracao em
teste. EXTRAIA COM MARGEM de chao alem da area jogavel; o budget permite 96x96.

Rode hunt:extract, hunt:extract:check e content:check. Se um expected* nao bater, INVESTIGUE antes de
ajustar o numero: ajustar o esperado para caber e reescrever golden para passar.

GENERALIZE os scripts: hunt:extract:sidecar aponta um diretorio fixo e hunt:selection:check aponta uma
selecao fixa. Faca os dois cobrirem TODAS as hunts. Sem esse passo, a segunda hunt e so mais um
diretorio e a pipeline nao foi provada.

CONFIRME QUE A PRIMEIRA HUNT ESTA INTACTA: git status nao pode mostrar mudanca em
packages/content/src/generated/hunts/venore-rotworm-cave/. Se mostrar, PARE: o extrator regrediu.

Assets da regiao nova pelo fluxo de manifesto e profile. Nenhum asset pessoal no Git. Nenhum path
literal de hunt no codigo.

Rode verify. Suba corepack pnpm dev, lure um grupo, mobe e mate com a AoE do Sorcerer; tire
screenshot. Se o terreno nao permitir, a hunt escolhida nao cumpriu o objetivo: troque e registre.
Commite, integre por fast-forward, reverifique e limpe worktree e branch removendo o diretorio antes
do prune.

Pare se o mapa nao estiver em nenhuma das tres origens, se a extracao mudar artefato da primeira
hunt, ou se a hunt exigir mecanica que o extrator nao suporta — nesse caso troque de hunt em vez de
estender o extrator. Nao inicie a proxima task.
```
