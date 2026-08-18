# PB-06-07 — Congelar a fixture e criar o gate `save:check`

**Status inicial:** pending

**Classe da tarefa:** golden, gate executável e contrato de verificação

**Modelo sugerido:** GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6, `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador; o próprio gate como evidência

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** serial.

## Objetivo

Provar, com um gate executável e goldens congelados, que **persistir não altera a simulação**:
gravar, exportar, importar e retomar a sessão do PB-05 reproduz o snapshot final golden do PB-05,
byte a byte.

## Resultado esperado

A fixture `pb-06-save-session` congelada, o CLI `tools/save/cli.ts` funcionando, `save:check` dentro
de `check` e `verify`, e o registro em `docs/simulation/REPLAY_CONTRACT.md` no **mesmo commit** que
cria a fixture.

## Dependências

- PB-06-03 `done` e integrada em `main`.
- PB-06-06 `done` e integrada em `main`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-06/STATE.md`;
3. `docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`, seção "O gate
   `save:check`";
4. `docs/simulation/REPLAY_CONTRACT.md` inteiro;
5. `tools/replay/cli.ts` e `tools/replay/vitest.config.ts`, como padrão de CLI e de suíte de tool;
6. `packages/test-fixtures/hunt/pb05/`, incluindo `hashes.md`;
7. `packages/save/src/**`, entregue por PB-06-02 a PB-06-06;
8. `package.json` da raiz, seção `scripts`;
9. `biome.json`, a lista de arquivos ignorados pelo formatador.

## Decisões congeladas

- Fixture `pb-06-save-session`, em `packages/test-fixtures/save/pb06/`.
- Ela **deriva** de `pb-05-hunt-combat`: mesmo cenário, mesmo log, mesma seed. Não crie uma sessão
  nova nem altere a do PB-05.
- Tick do checkpoint congelado: `1400`. Tick final: `2700`.
- Artefatos da fixture:

  | Arquivo | Conteúdo |
  |---|---|
  | `checkpoint.golden.json` | o `GameSave` gravado no tick `1400`, canônico, LF final |
  | `export.golden.txt` | a string devolvida por `export()` sobre esse documento |
  | `legacy.json` | documento sem `schemaVersion`, entrada da migração |
  | `migrated.golden.json` | o resultado v1 da migração de `legacy.json` |
  | `hashes.md` + `.sha256` | sidecar por arquivo e tabela publicada, no padrão das fixtures de replay |

- **Golden não se reescreve para passar.** Diferença é mudança de comportamento: prove que é
  intencional, documente e só então regenere.
- A fixture entra em `biome.json` como ignorada pelo formatador, como as fixtures de replay já são —
  senão o formatador reescreve o JSON canônico e quebra os digests.
- Nenhum arquivo de `packages/test-fixtures/hunt/pb05/`, `pb04/`, `pb04-respawn/` ou
  `simulation/pb03/` pode mudar.
- `save:check` entra em `check` e em `verify` e é registrado em `REPLAY_CONTRACT.md` **no mesmo
  commit**. Fixture sem registro é a dívida D3 do PB-04 e não se repete.
- Todo SHA-256 publicado em `hashes.md`, no `REPLAY_CONTRACT.md` ou no relatório é gerado do
  artefato real na árvore. Hash citado de cabeça é a dívida D2 e é defeito.

## Escopo permitido

```text
packages/test-fixtures/save/pb06/**
tools/save/**
package.json                              (somente os scripts save:check e save:hashes:check)
biome.json                                (somente ignorar a fixture)
docs/simulation/REPLAY_CONTRACT.md
docs/playbooks/PB-06/STATE.md
```

## Fora de escopo

- alterar `packages/save/src/**` para fazer o gate passar — se o gate reprovar, a causa está no
  comportamento, não na fixture;
- UI, autosave e retomada no jogo — PB-06-08;
- QA de browser — PB-06-09;
- qualquer arquivo em `packages/simulation`.

## O que o gate prova, em ordem

```text
node --no-warnings --experimental-transform-types tools/save/cli.ts verify --dir packages/test-fixtures/save/pb06
node --no-warnings --experimental-transform-types tools/save/cli.ts check-hashes --dir packages/test-fixtures/save/pb06
```

1. rodar o cenário e o log do PB-05 do tick `0` ao `1400`, gravar o save pelo `MemorySaveDriver` e
   comparar com `checkpoint.golden.json` **byte a byte**;
2. `export()` bater com `export.golden.txt` byte a byte, e duas exportações seguidas serem idênticas;
3. `import()` do golden num repositório limpo e `load()` devolver o mesmo documento;
4. retomar o kernel a partir do snapshot **importado**, aplicar os comandos de `1400` a `2700`, e
   obter snapshot final byte-idêntico a `packages/test-fixtures/hunt/pb05/snapshot.golden.json`, com
   o mesmo SHA-256 do sidecar do PB-05;
5. migrar `legacy.json` e obter `migrated.golden.json` byte a byte;
6. `check-hashes` conferir cada arquivo contra seu sidecar `.sha256` **e** contra a tabela de
   `hashes.md`.

O passo 4 é o coração do playbook. Se o save mexer em uma única casa do snapshot, o SHA-256 do PB-05
denuncia.

## Exit codes

Siga o padrão de `tools/replay/cli.ts`: divergência sai `1`; tabela ausente, malformada ou incompleta
sai `2`. Não invente uma terceira convenção.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb06-07-gate -b codex/pb06-07-save-gate main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-07-gate install --prefer-offline
```

- [ ] **2. Escrever a suíte RED do tool.**

Antes de gerar qualquer golden, escreva os testes de `tools/save` que provam cada um dos seis passos
contra artefatos construídos no próprio teste. O CLI precisa reprovar quando deve reprovar: mude um
byte do checkpoint, um item da bolsa, um caractere do export e a versão do documento legado, e exija
exit `1` em cada caso.

- [ ] **3. Implementar o CLI; obter GREEN.**

- [ ] **4. Gerar a fixture e congelar.**

Gere `checkpoint.golden.json`, `export.golden.txt` e `migrated.golden.json` pelo próprio CLI, escreva
`legacy.json` à mão — é entrada, não artefato gerado — e produza os sidecars e a tabela.

- [ ] **5. Provar reprodutibilidade.**

Gere duas vezes em árvore limpa e compare byte a byte. Diferença entre duas gerações significa fonte
de não determinismo no save; pare e encontre a fonte em vez de escolher uma das saídas.

- [ ] **6. Ligar aos scripts e ao contrato.**

Acrescente `save:check` e `save:hashes:check` ao `package.json`, insira `save:check` em `check` e em
`verify` na posição coerente com os demais `*:check`, ignore a fixture no `biome.json` e escreva a
seção do PB-06 em `docs/simulation/REPLAY_CONTRACT.md` com os hashes reais gerados agora.

- [ ] **7. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-07-gate exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-07-gate save:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-07-gate save:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-07-gate simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-07-gate hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-07-gate combat:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-07-gate test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-07-gate typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-07-gate verify
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb06-07-gate verify
```

`save:check` e `verify` aparecem duas vezes de propósito: a segunda execução com a árvore inalterada
prova idempotência. Uma segunda execução vermelha já reprovou um playbook aqui.

- [ ] **8. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb06-07-gate status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound-pb06-07-gate add packages tools docs package.json biome.json
git -C C:\Kaezan\kaezan-huntbound-pb06-07-gate commit -m "feat: gate that persisting the run cannot change the simulation"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb06-07-save-gate
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb06-07-gate
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb06-07-save-gate
```

## Verificação

Suíte de `tools/save`, `save:check` duas vezes, `simulation:check`, `hunt:check`, `combat:check`,
`test`, `typecheck` e `verify` duas vezes, verdes na worktree e no resultado integrado;
`biome check .` em `0`.

## Critérios de aceite

- [ ] A fixture deriva de `pb-05-hunt-combat` sem alterá-la.
- [ ] Os quatro artefatos e seus sidecars existem, e `hashes.md` publica os hashes reais.
- [ ] Duas gerações em árvore limpa são byte-idênticas.
- [ ] O gate reprova ao mudar um byte do checkpoint, um item da bolsa, um caractere do export e a
      versão do documento legado.
- [ ] O passo 4 reproduz o snapshot final golden do PB-05 e o SHA-256 do sidecar do PB-05.
- [ ] Exit `1` para divergência e `2` para tabela ausente, malformada ou incompleta.
- [ ] `save:check` está em `check` e em `verify`.
- [ ] A fixture está ignorada pelo formatador em `biome.json`.
- [ ] O registro no `REPLAY_CONTRACT.md` está no **mesmo commit** que a fixture.
- [ ] Nenhum golden de PB-03, PB-04 ou PB-05 mudou.
- [ ] `packages/simulation` não teve uma linha alterada.
- [ ] `verify` passa duas vezes seguidas com a árvore inalterada.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: o passo 4 divergir — isso significa que persistir alterou a simulação, e é bloqueio de
produto, não algo a acomodar regenerando golden; duas gerações diferirem; a fixture só fechar
alterando `packages/test-fixtures/hunt/pb05/`; ou se `verify` só passar na primeira execução.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, os hashes reais gerados, comandos e exit codes das
duas execuções de `save:check` e `verify`, modelo e effort usados, e a próxima task elegível.

## Commit

`feat: gate that persisting the run cannot change the simulation`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb06-07-save-gate`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb06-07-gate`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, hashes gerados, resultado dos seis passos, prova de idempotência, confirmação de que
nenhum golden anterior mudou, integração, limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-06\tasks\PB-06-07-fixture-e-gate-de-save.md

Leia AGENTS.md, o STATE.md do playbook PB-06 e apenas os arquivos indicados pela task. Confirme que
PB-06-03 e PB-06-06 estao done e integradas e que main esta verde.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb06-07-gate com a branch codex/pb06-07-save-gate e
rode "corepack pnpm install --prefer-offline" dentro dela.

Comece pela suite RED de tools/save. O CLI "verify --dir packages/test-fixtures/save/pb06" prova, em
ordem: (1) rodar o cenario e o log do PB-05 de 0 a 1400 e gravar o save bate byte a byte com
checkpoint.golden.json; (2) export bate com export.golden.txt e duas exportacoes sao identicas;
(3) import num repositorio limpo devolve o mesmo documento; (4) retomar do snapshot IMPORTADO e rodar
de 1400 a 2700 reproduz packages/test-fixtures/hunt/pb05/snapshot.golden.json byte a byte, com o
mesmo SHA-256 do sidecar do PB-05; (5) migrar legacy.json produz migrated.golden.json; (6)
check-hashes confere cada arquivo contra o sidecar .sha256 E contra a tabela de hashes.md.

Exit 1 para divergencia, exit 2 para tabela ausente/malformada/incompleta, no padrao de
tools/replay/cli.ts.

A fixture DERIVA de pb-05-hunt-combat: mesmo cenario, mesmo log, mesma seed. NAO altere nada em
packages/test-fixtures/hunt/pb05. legacy.json e escrito a mao; os demais goldens sao gerados pelo
CLI. Gere duas vezes em arvore limpa e compare byte a byte.

Acrescente save:check e save:hashes:check ao package.json, coloque save:check em check E em verify,
ignore a fixture no biome.json e registre a fixture com os hashes REAIS em
docs/simulation/REPLAY_CONTRACT.md NO MESMO COMMIT. Hash citado de cabeca e defeito.

Se o passo 4 divergir, PARE: persistir alterou a simulacao, e isso e bloqueio, nao motivo para
regenerar golden.

Rode biome check ., save:check duas vezes, simulation:check, hunt:check, combat:check, test,
typecheck e verify DUAS vezes. Atualize o handoff, commite, integre por fast-forward na main,
reverifique e limpe worktree e branch removendo o diretorio antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
