# AGENTS.md — Kaezan Huntbound

Instrução compartilhada por todo agente que escreve neste repositório: Cursor, Codex, Claude Code ou
outro. Cursor e Codex leem este arquivo direto; Claude Code chega por `CLAUDE.md`, que só reexporta.
Regras por diretório vivem em `.cursor/rules/*.mdc` e valem para qualquer agente, mesmo os que não as
carregam sozinhos.

## O projeto em uma linha

RPG single-player browser-first em **Phaser 4 + TypeScript + Vite**, top-down tile-based inspirado em
Tibia, com V0 pessoal e local-first baseado no snapshot Canary, simulação determinística isolada do
renderer e gacha exclusivamente cosmético de outfits.

## A regra que governa todas as outras

**O custo do processo é proporcional ao raio do diff.** Renomear uma constante e reescrever o kernel
não pagam a mesma conta. O default é *nenhuma* cerimônia: você edita, roda o gate do que o playtest
não vê, e commita na `main`. Cada peça a mais — branch, worktree, `verify`, teste novo — precisa ser
puxada por um risco concreto naquele diff, não pelo fato de existir uma task.

Isto é um piloto. O aceite é o usuário abrindo o jogo e apontando o que está errado. Não existe
primeira integração 100%: um ou dois bugs no playtest são o ciclo normal e viram `PB-NN-FIX-MM`.
Uma hora de suíte numa feature é falha do processo, não qualidade.

## Autoridade documental

Em conflito, esta ordem vence (é a de `docs/README.md`):

1. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md` — produto, fontes de verdade, escopo do V0.
2. `docs/03_ADR_PHASER4_BROWSER_FIRST.md` — stack e arquitetura web.
3. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md` — formato de playbook e task card.
4. `docs/08_POLITICA_MODELOS_AGENTES.md` — modelo e effort.
5. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md` — ordem dos playbooks.
6. `docs/BASE_CONTEXTO_KAEZAN_HUNTBOUND(1).md` — contexto mestre.

**Não são direção vigente.** `docs/00`, `docs/02`, `docs/04`, `docs/C03`–`docs/C06` e
`docs/research/**` são evidência histórica; vários recomendam **Godot** ou **Angular/C#**, premissas
já substituídas. Fatos e medições continuam úteis; recomendações de stack não.

O playbook em execução e seu estado estão em `docs/playbooks/<PB-ID>/STATE.md`.

## Toolchain

- Node **24.14.0** (`.node-version`), pnpm **11.21.0** via **corepack**.
- Sempre `corepack pnpm <script>`. Nunca `npm`, `yarn` ou `pnpm` avulso.
- Workspace: `apps/*` e `packages/*`. `tools/*` roda por `node --experimental-transform-types`.
- `save-exact=true`: versões são pinadas de propósito. Não faça bump sem pedido.
- Windows/PowerShell. Prefira o script pnpm existente a montar a linha na mão.

## Gates

Pare no primeiro vermelho. Não empilhe. A skill `run-gates` escolhe a linha; ela é esta tabela.

| Raio do diff | O playtest é cego a | Gate |
|---|---|---|
| doc, nome, string, config, comentário | formatação | `biome check .` |
| `apps/game`, HUD, mapa, hunt nova | **nada que o usuário não veja jogando** | `biome check .` + `typecheck` se a assinatura mudou. `dev` de pé e uma frase do que olhar. **Sem Playwright.** |
| import ou manifesto | dependência ilegal | `architecture:check` |
| `packages/simulation`, `packages/contracts` | replay divergente no tick 400 | o golden que esse diff pode mover (`simulation:check` / `hunt:check` / `combat:check`) + `architecture:check` |
| `packages/content` ou gerador | artefato gerado diferente da fonte | `content:check` |
| `packages/assets` ou packer | pack/sidecar divergente | `assets:check` |
| última task do playbook | crash antes de o usuário sentar | `corepack pnpm verify` **uma vez** |

Um diff que cruza duas linhas roda as duas. Um diff mecânico que cruza 200 arquivos sem mudar
comportamento (rename, mover módulo) é provado por `typecheck` — é exatamente para isso que ele
existe, e nenhuma suíte acrescenta informação sobre ele.

`biome check .` sempre antes de commitar. `verify` **já inclui** `biome`, `check` e `qa:browser`:
nunca liste `verify` junto de um subconjunto dele, e nunca rode um subconjunto depois dele.

### O que não é gate

- **Nunca rode um gate para produzir prova.** Rode para saber se quebrou. Vermelho: conserte.
  Verde: commite. Colar saída fresca no relatório não é entrega, é trabalho inventado.
- `corepack pnpm qa:budgets` é **informativo**. Roda no fechamento do playbook, o número vai para o
  `STATE.md`, vermelho vira task de performance no backlog e **nunca** bloqueia merge. B5 do PB-05
  estourou `5000 ms` em `11,7 ms` e travou um playbook inteiro.
- Auditoria independente roda **depois** do aceite do usuário, é opcional, endereça um commit por
  hash e gera task de backlog — nunca portão.

Nenhum resultado de gate se afirma sem a saída fresca do comando.

## Branch, worktree e integração

**O default é trabalhar na `main` e commitar nela.** Uma task por chat, em sequência: não há com o
que colidir, e branch temporária só existe para ser apagada.

Branch e worktree só entram quando o `README.md` do playbook declara **duas tasks genuinamente
paralelas**, em paths disjuntos, rodando ao mesmo tempo. Nesse caso, e só nesse:

```bash
git worktree add .worktrees/<slug> -b <agente>/<slug> main
```

Depois: `corepack pnpm install --prefer-offline` dentro dela (worktree nova não tem `node_modules` e
todo gate falha sem ele), gates rodados **de dentro** dela (worktree aninhada carrega `biome.json`
próprio e derruba `format:check` na raiz), `git merge --ff-only` na `main`, e limpeza com
`rm -rf .worktrees/<slug>` + `git worktree prune` + `git branch -d`. `git worktree remove` falha com
*"Directory not empty"* por causa de `node_modules`; não insista nele.

Fast-forward do **mesmo commit** já gated não roda gate de novo. Rebase ou artefato regenerado: só o
`--check` da área.

Nenhuma branch além da `main` sobrevive ao fim de uma sessão. Se algo genuinamente não pode ser
integrado, commite numa branch **e** diga no relatório o que falta; se nem isso, registre bloqueio no
`STATE.md`. "Deixei como WIP" não é uma saída.

## Como implementar

O tempo da task vai para **arquitetura, padrão do arquivo vizinho e a funcionalidade jogável**.

- **A task card diz o quê e onde, nunca como.** Se ela trouxer um desenho pronto, ele é sugestão; o
  código real vence. Card que prescreve sete camadas e uma assinatura de tipo implementou a task duas
  vezes — uma na spec e outra no editor — e você paga as duas.
- **TDD só no kernel e em contrato.** HUD, layout, mapa e conteúdo não pedem teste vermelho primeiro:
  o usuário vê em dois minutos. Teste automático existe para o que a sessão de jogo **não vê** —
  determinismo do kernel, fronteira de pacote, identidade de artefato gerado.
- **Não polir até zero bug.** É o playtest que aponta. Rodar a suíte de novo para caçar o que o
  usuário acharia jogando é exatamente o gasto que este processo existe para eliminar.
- Correção pequena necessária ao aceite fica na task. Problema independente vira linha no `STATE.md`
  ou task nova — nunca expansão silenciosa.
- Preserve decisões congeladas: contrato, schema, política de identidade e escopo não se redesenham
  dentro de uma task de implementação.

### Ambiguidade não é motivo para parar

Escolha a opção mais simples e mais fácil de reverter, registre em **uma linha** no commit e siga.

Pare e registre bloqueio no `STATE.md` só quando: for destruir ou migrar dado salvo sem rollback;
precisar mudar contrato público, schema ou golden já integrado; ou a mesma causa bloquear dois ciclos
vermelho/verde.

## Fronteiras de pacote

`tools/architecture/dependency-policy.json` é a fonte executável; `docs/architecture/PACKAGE_BOUNDARIES.md`
explica.

| Pacote | Pode depender de | Nunca |
|---|---|---|
| `@huntbound/contracts` | nada | qualquer pacote Huntbound |
| `@huntbound/simulation` | `contracts` | Phaser, DOM, `node:*`, **qualquer dependência externa** |
| `@huntbound/content` | `contracts` | mutar simulação, Phaser |
| `@huntbound/assets` | `contracts` (+ `zod`) | Phaser, `node:*`, estado de simulação |
| `@huntbound/save` | `contracts`, `simulation` | Phaser, importadores de conteúdo |
| `@huntbound/test-fixtures` | `contracts`, `simulation` | Phaser, DOM, estado de runtime |
| `@huntbound/game` | todos exceto fixtures | regra de jogo em scene, path de asset direto em domínio |

## Regras invioláveis

- **Artefato gerado não se edita à mão.** `packages/content/src/generated/**`,
  `packages/test-fixtures/**/expected/**` e os packs sob `apps/game/public/assets/**` são saída de
  CLI. Mude a entrada, regenere pelo tool, valide com o `--check`.
- **Golden não se reescreve para passar.** Golden diferente é mudança de comportamento: prove que é
  intencional, registre e só então regenere.
- **Asset pessoal não entra no Git.** `apps/game/public/assets/{personal,product,test}` e
  `assets/personal/` são ignorados. O profile `product` recusa `licenseClass: "cipsoft-personal"`.
- **Simulação não conhece apresentação.** Nada de DOM, Phaser, `node:*`, `Date.now()` ou
  `Math.random()` em `packages/simulation`. Tick fixo, RNG seedado, grid inteiro, eventos ordenados.
- **Asset é acessado por manifesto**, nunca por path literal dentro de simulação ou domínio.
- **TibiaRoute não é raspado em runtime.** Ele escolhe a hunt; o Canary fornece IDs, regras e mapa.
- Retry, `skip`, timeout inflado, warning suprimido, catch vazio ou asserção enfraquecida para fechar
  um gate são defeitos. `retries: 1` mascarando teste instável já reprovou um playbook aqui.

## Fontes externas

- `references/canary` é clone parcial em `157e6f9e` e **não tem o mapa global**. Antes de concluir
  que um arquivo não existe, procure em `C:\Kaezan\kaezan\canary-3.4.1\`,
  `C:\Kaezan\kaezan - world\canary-3.4.1\` e `C:\Users\toudi\Downloads\otservbr.otbm`. Nada precisa
  ser baixado.
- 3.4.1 e `157e6f9e` são versões diferentes: compare a região relevante antes de parear arquivos.
- `HUNTBOUND_CANARY_SOURCE` aponta o snapshot; `HUNTBOUND_PERSONAL_ASSET_SOURCE`, a origem dos assets
  pessoais. Não hardcode paths.
- `references/` é ignorado pelo Git e pelo Biome. Não indexe nem edite nada lá.

## Armadilhas que já custaram tempo

1. **Playwright serve o `dist` pré-buildado.** `playwright.config.ts` sobe `vite preview`, que serve
   `dist/game`; nada na suíte reconstrói. Edição em `apps/game/src/**` é invisível para o browser até
   `corepack pnpm build`. `qa:browser` e `verify` buildam; `playwright test` direto, não. Quando o
   sintoma no browser contradisser o código que você lê, confira a idade do bundle antes de teorizar.
2. **`EPERM: operation not permitted, rename` no `assets:stage:test`.** Nunca é código. Duas causas,
   distinguidas pela repetição: **determinística** — um `vite` de pé na 5173/4173 segurando
   `apps/game/public/assets`; ache com `Get-NetTCPConnection -LocalPort 5173,4173 -State Listen`,
   derrube, rode, **suba de volta** e avise se era o usuário jogando. **Intermitente** — antivírus ou
   indexador; passa na segunda tentativa. Rode de novo antes de teorizar.
3. **Um Playwright por host.** Dois saturam CPU e disputam a preview. Porta ocupada por outra sessão:
   `PLAYWRIGHT_PREVIEW_PORT`. Specs de budget usam `baseURL`; não hardcode `http://127.0.0.1:4173`.
4. **Gate lento é sintoma de máquina ocupada antes de ser sintoma de código lento.** Uma sessão
   abandonada deixou `qa:browser` vivo por horas e `tools/replay` reprovou por timeout — 642 s contra
   73 s com a máquina livre. Liste o que está rodando antes de teorizar, e derrube o que você subiu:

   ```bash
   Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like '*kaezan-huntbound*' }
   ```

## Hooks de guarda

Uma implementação para os três agentes:

| Camada | Arquivo |
|---|---|
| Regras puras e testadas | `tools/agent-hooks/rules.ts` (testes em `tests/workspace/agent-hooks.test.ts`) |
| Sonda de filesystem | `tools/agent-hooks/workspace.ts` |
| Adaptador Cursor | `tools/agent-hooks/cursor.ts` ← `.cursor/hooks.json` |
| Adaptador Claude Code e Codex | `tools/agent-hooks/claude-codex.ts` ← `.claude/settings.json`, `.codex/hooks.json` |
| Guarda no commit | `tools/git-hooks/pre-commit` |

Bloqueado: `npm`/`yarn`/`pnpm` fora do corepack; `--no-verify`; force push; `git add -f` de asset
pessoal; edição manual de artefato gerado, fixture `expected/` ou golden; `playwright test` direto
com `dist/game` mais velho que `apps/game/src`. Pede confirmação: `reset --hard`, `clean -f`,
`branch -D`, `git worktree remove`.

**Silêncio significa "sem opinião"** — só `deny` e `ask` produzem saída, e o hook nunca amplia o que
você já autorizou. Falha interna sai `0`: guard quebrado não trava o agente. Para mudar uma regra,
edite `rules.ts` e seu teste; adaptadores só traduzem protocolo.

Ative o hook de Git uma vez por clone:

```bash
git config core.hooksPath tools/git-hooks
```

## Protocolo de execução

Uma task = um chat. O formato está em `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`; o essencial:

0. `git status` antes de qualquer coisa. Árvore suja ou branch fora da `main` é **sua primeira
   tarefa** — leia o diff, rode o gate, commite. Integrar já é autorização normal da task que gerou
   aquilo; não peça permissão e não descarte sem ordem explícita nesta conversa.
1. Leia a task card, o `STATE.md` do playbook e **apenas** o que a card listar. Não carregue skills
   de plugin (Superpowers e afins) a menos que a card as nomeie.
2. Implemente. Arquitetura, padrão do vizinho, funcionalidade jogável.
3. Rode **só o gate do raio do seu diff**.
4. Commite na `main`. A narrativa do que foi feito vai na mensagem de commit — o Git já guarda, data
   e associa ao diff.
5. Atualize **só a linha da task** no `STATE.md`.
6. Relate em um parágrafo: o que mudou, o gate que rodou, o que olhar no jogo. Depois pare — não
   inicie a próxima task.

Uma task só terminou quando estas três linhas respondem vazio:

```bash
git status --porcelain && git branch --no-merged main && git worktree list
```

## Modelos

`docs/08_POLITICA_MODELOS_AGENTES.md` é normativo. Em resumo: implementação bem especificada em
modelo econômico com effort alto; implementação complexa, especificação e auditoria em modelo
frontier; revisão prefere modelo **diferente** do implementador.

## Estilo

Biome 2.5 com preset recomendado: indentação por espaço, aspas simples, ponto e vírgula sempre.
Código, identificadores e commits em inglês; documentação e task cards em português. Siga o padrão do
arquivo vizinho antes de introduzir um novo.
