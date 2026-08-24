# MB-01 — Minerador de bordas e tabela de materiais

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada; volumosa e de busca pesada, mecânica

**Modelo sugerido:** GPT-5.6 Luna, `xhigh`

**Validador sugerido:** gates automatizados; camada frontier só por escalonamento

**Rota:** `superpowers:using-git-worktrees` → `superpowers:test-driven-development` →
`superpowers:verification-before-completion`

**Paralelismo:** MB-02 pode correr em paralelo depois que o **formato** da tabela estiver commitado.

## Objetivo

Medir, no `otservbr.otbm` íntegro, qual peça de borda ocupa cada configuração de vizinhança, e
emitir essa medição como tabela commitada e verificável. A tabela substitui julgamento visual por
número observado.

## Resultado esperado

- `tools/map-materials/` com CLI `build`, `--check` e `sidecar-check`, no padrão de `tools/tile-flags`.
- `packages/content/src/generated/material-borders.json` + `material-borders.sha256` commitados.
- Relatório de cobertura: casos observados de 256, ocorrência mínima por caso, ambiguidades.
- `map:materials:check` e `map:materials:sidecar` como scripts da raiz; o sidecar entra em
  `content:check`.

## Dependências e pré-condições

1. `main` limpa e `corepack pnpm verify` verde.
2. `HUNTBOUND_CANARY_SOURCE` resolve para um snapshot com
   `data-otservbr-global/world/otservbr.otbm`. A variável não está setada por padrão nesta máquina;
   defina por sessão de shell.
3. `docs/projects/map-editor/BORDERIZER.md` lido e vigente.

## Leitura mínima

1. `AGENTS.md`;
2. `docs/projects/map-editor/BORDERIZER.md` e `STATE.md`;
3. `.cursor/rules/20-content.mdc` e `.cursor/rules/50-tests.mdc`;
4. `tools/tile-flags/**` — é o molde a copiar, inclusive o sidecar e o `--check`;
5. `tools/map-extractor/otbm.ts` e `otbmTiles.ts` — `readOtbmTiles(bounds)` já existe, não escreva
   parser novo;
6. `packages/content/src/generated/tile-flags.json` — formato de referência do sidecar.

Não carregue os ADRs históricos de Godot/RME; não dirigem esta implementação.

## Contrato congelado

**Assinatura de vizinhança.** Oito vizinhos na ordem `N NE E SE S SW W NW`, cada um classificado em
binário: `1` se pertence ao mesmo material da célula central, `0` caso contrário. Fora dos limites da
janela conta como `0`. Isso produz um inteiro de 0 a 255.

**Material.** Um conjunto nomeado de server ids, declarado na entrada do minerador. Para esta task,
no mínimo: `earth` (`101`, `5711`–`5726`), `cave-floor` (`351`–`355`), `muddy-floor`
(`16280`–`16299`, `17238`), `dirt-wall` (`356`–`367`).

**Saída.** Para cada material e cada assinatura observada: o server id mais frequente e a contagem.
Assinatura não observada fica ausente do arquivo — o consumidor decide o fallback, o minerador não
inventa.

**Ambiguidade reprova.** Se as duas peças mais frequentes de um caso estiverem dentro de 10% uma da
outra e ambas com contagem relevante, o minerador falha com diagnóstico nomeando o caso. Não
desempate.

**Janelas.** Declaradas em arquivo de entrada versionado, com coordenadas e um motivo por janela.
Não varra o mapa inteiro: `readOtbmTree` carregaria 177 MB de árvore na memória.

**Determinismo.** Duas execuções sobre o mesmo OTBM e as mesmas janelas produzem bytes idênticos.
Serialização canônica com chaves ordenadas.

## Escopo permitido

Criar `tools/map-materials/**`, o arquivo de janelas, o gerado e seu sidecar, os scripts da raiz e
os testes. Tocar `package.json` só para adicionar os scripts, e `content:check` só para encadear o
sidecar.

**Fora de escopo:** aplicar borda em mapa algum, mexer em layout, região, pack ou golden.

## Red-green obrigatório

Antes do código de produção, prove pelo menos estes vermelhos:

1. cálculo de assinatura sobre grid sintético conhecido, incluindo bordas da janela;
2. agregação escolhe a peça mais frequente e registra a contagem;
3. empate dentro de 10% reprova com diagnóstico que nomeia material e caso;
4. `--check` reprova quando a tabela commitada diverge da remineração;
5. `sidecar-check` reprova quando o SHA não bate com o conteúdo;
6. duas serializações independentes da mesma entrada são byte-idênticas.

Os testes de assinatura e agregação usam fixture sintética, não o OTBM — o gate não pode depender de
um arquivo de 177 MB.

## Passos de implementação

1. Crie a worktree e rode `corepack pnpm install --prefer-offline`.
2. Escreva o cálculo de assinatura e a agregação por testes, com fixture sintética.
3. Escreva a CLI com `build`, `--check` e `sidecar-check`, copiando o padrão de `tools/tile-flags`.
4. Declare as janelas. Escolha regiões de caverna íntegras do mapa global e escreva o motivo de cada
   uma no arquivo.
5. Rode a mineração real, inspecione a cobertura e ajuste as janelas até que `dirt-wall` tenha
   ocorrência mínima confortável em todo caso que o mapa realmente usa.
6. Commite o gerado e o sidecar. Encadeie o sidecar em `content:check`.
7. Rode os gates e faça o ciclo Git completo.

## Verificações exigidas

Com saída fresca:

- testes de `tools/map-materials`;
- `corepack pnpm map:materials:check` com `HUNTBOUND_CANARY_SOURCE` setado;
- `corepack pnpm map:materials:sidecar`;
- `corepack pnpm content:check`;
- `corepack pnpm architecture:check`;
- `corepack pnpm verify`.

Registre no commit: janelas usadas, tiles amostrados, casos observados de 256 e ocorrência mínima
por material.

## Critérios de aceite

- [ ] Assinatura, agregação e reprovação por ambiguidade têm teste com fixture sintética.
- [ ] Nenhum teste depende do OTBM estar em disco.
- [ ] Tabela e sidecar commitados; `--check` reproduz byte a byte.
- [ ] `dirt-wall` cobre todo caso que o mapa da hunt realmente usa.
- [ ] O sidecar participa de `content:check`; a remineração fica fora do `verify`.
- [ ] `verify` verde no commit integrado.
- [ ] `STATE.md` atualizado, integração fast-forward e limpeza concluídas.

## Condições de parada

Pare após dois ciclos RED/GREEN com a mesma causa; se a mineração não alcançar cobertura utilizável
para `dirt-wall` mesmo variando janelas; ou se for necessário mudar contrato runtime, golden ou
identidade de asset. Registre a evidência em `STATE.md`, não só no relatório.

## Handoff, commit e integração

- Branch: `codex/mb-01-material-border-mining`
- Worktree: `C:\Kaezan\kaezan-huntbound-mb-01-material-border-mining`
- Commit: `feat: measure the border table from the authored map`
- Base e destino: `main`
- Integração: `git merge --ff-only codex/mb-01-material-border-mining`
- Pós-integração: `corepack pnpm verify`
- Limpeza: remover a worktree validada, `git worktree prune` e
  `git branch -d codex/mb-01-material-border-mining`.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound usando GPT-5.6 Luna com effort xhigh.

Execute integralmente e somente a task:
docs/projects/map-editor/tasks/MB-01-material-border-mining.md

Use, nesta ordem, as skills superpowers:using-git-worktrees,
superpowers:test-driven-development e superpowers:verification-before-completion. Leia o AGENTS.md,
o BORDERIZER.md e o STATE.md do projeto Map Editor, e somente a leitura adicional indicada na task.
Rode git status e git branch --no-merged main antes de qualquer outra coisa.

Copie o padrão de tools/tile-flags: tabela gerada, commitada, com sidecar SHA e --check. Use
readOtbmTiles(bounds) que já existe em tools/map-extractor/otbm.ts; não escreva parser novo e não
carregue o OTBM inteiro na memória. Os testes usam fixture sintética e não podem depender do OTBM.

Não aplique borda em mapa nenhum nesta task. Não toque layout, região, pack ou golden.

Faça red-green, rode todas as verificações da task, registre no commit as janelas, os tiles
amostrados, os casos observados de 256 e a ocorrência mínima por material. Atualize somente a linha
da task no STATE.md. Crie o commit `feat: measure the border table from the authored map`, integre
por fast-forward na main, repita corepack pnpm verify, remova worktree e branch. Não inicie MB-02.
Se uma condição de parada ocorrer, preserve o trabalho, registre o bloqueio e relate a evidência.
```
